/**
 * Network Loader
 *
 * Parses and validates markdown files from the network directory.
 * Uses the same YAML front matter parsing approach as the existing agents/frontmatter.ts
 * but validates against Zod schemas.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import {
  ManifestFrontMatterSchema,
  AgentFrontMatterSchema,
  SkillFrontMatterSchema,
  type ParsedManifest,
  type ParsedAgent,
  type ParsedSkill,
  type ManifestFrontMatter,
  type AgentFrontMatter,
  type SkillFrontMatter,
} from "./schema";

/**
 * Parse error with context.
 */
export class ParseError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: string,
    public readonly details?: unknown
  ) {
    super(`Failed to parse ${filePath}: ${reason}`);
    this.name = "ParseError";
  }
}

/**
 * Parse YAML front matter from a markdown file.
 * Returns the parsed YAML object and the remaining content.
 */
function parseFrontMatter(content: string): { yaml: Record<string, unknown>; body: string } {
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    throw new Error("Missing front matter delimiters (---)");
  }

  const [, yamlContent, markdownContent] = match;
  const yaml = parseYaml(yamlContent);

  return {
    yaml,
    body: markdownContent.trim(),
  };
}

/**
 * Simple YAML parser for the subset we need.
 * Handles: strings, numbers, booleans, arrays, and nested objects (up to 3 levels).
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const lines = yaml.split("\n");
  
  // Stack-based parser for nested structures
  const root: Record<string, unknown> = {};
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: root, indent: -1 }];
  
  // Track potential arrays (key -> array items)
  let pendingArrayKey: string | null = null;
  let pendingArray: unknown[] = [];
  let pendingArrayIndent = -1;
  let pendingArrayParent: Record<string, unknown> | null = null;

  function flushPendingArray() {
    if (pendingArrayKey !== null && pendingArrayParent !== null) {
      // If we collected array items, replace the object with the array
      if (pendingArray.length > 0) {
        pendingArrayParent[pendingArrayKey] = pendingArray;
      }
      // If no items, keep as empty array
      else if (pendingArrayParent[pendingArrayKey] !== undefined && 
               typeof pendingArrayParent[pendingArrayKey] === "object" &&
               Object.keys(pendingArrayParent[pendingArrayKey] as object).length === 0) {
        pendingArrayParent[pendingArrayKey] = [];
      }
    }
    pendingArrayKey = null;
    pendingArray = [];
    pendingArrayIndent = -1;
    pendingArrayParent = null;
  }

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    // Calculate indentation (number of leading spaces)
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Check for array item (starts with "- ")
    if (trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim();
      if (pendingArrayKey !== null && indent > pendingArrayIndent) {
        pendingArray.push(parseScalar(value));
      }
      continue;
    }

    // Check for inline array: key: [item1, item2, ...]
    const inlineArrayMatch = trimmed.match(/^([\w-]+):\s*\[([^\]]*)\]$/);
    if (inlineArrayMatch) {
      // Flush any pending array
      flushPendingArray();

      const [, key, items] = inlineArrayMatch;
      const arrayItems = items
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => parseScalar(s.replace(/^["']|["']$/g, "")));
      
      // Pop stack to find correct parent based on indent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      stack[stack.length - 1].obj[key] = arrayItems;
      continue;
    }

    // Check for key-value pair
    const kvMatch = trimmed.match(/^([\w-]+):\s*(.*)$/);
    if (kvMatch) {
      // Flush pending array if we're at same or lower indent
      if (pendingArrayKey !== null && indent <= pendingArrayIndent) {
        flushPendingArray();
      }

      const [, key, value] = kvMatch;

      // Pop stack to find correct parent based on indent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      if (value.trim() === "") {
        // Start of a nested structure (object or array - we'll determine which based on next lines)
        const newObj: Record<string, unknown> = {};
        parent[key] = newObj;
        stack.push({ obj: newObj, indent });
        
        // Prepare for possible array
        pendingArrayKey = key;
        pendingArray = [];
        pendingArrayIndent = indent;
        pendingArrayParent = parent;
      } else {
        // Scalar value
        parent[key] = parseScalar(value.trim());
      }
    }
  }

  // Flush any remaining pending array
  flushPendingArray();

  return root;
}

/**
 * Parse a scalar YAML value (string, number, or boolean).
 */
function parseScalar(value: string): string | number | boolean {
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== "") {
    return num;
  }

  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Load and parse the network manifest.
 */
export function loadManifest(networkDir: string): ParsedManifest {
  const manifestPath = join(networkDir, "manifest.md");
  
  if (!existsSync(manifestPath)) {
    throw new ParseError(manifestPath, "Manifest file not found");
  }

  const content = readFileSync(manifestPath, "utf-8");
  
  try {
    const { yaml, body } = parseFrontMatter(content);
    const frontMatter = ManifestFrontMatterSchema.parse(yaml);
    
    return {
      frontMatter,
      content: body,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      throw new ParseError(manifestPath, "Schema validation failed", err);
    }
    throw new ParseError(manifestPath, err instanceof Error ? err.message : String(err));
  }
}

/**
 * Load and parse all agent files from the network/agents directory.
 */
export function loadAgents(networkDir: string): Map<string, ParsedAgent> {
  const agentsDir = join(networkDir, "agents");
  const agents = new Map<string, ParsedAgent>();

  if (!existsSync(agentsDir)) {
    throw new ParseError(agentsDir, "Agents directory not found");
  }

  const files = readdirSync(agentsDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = join(agentsDir, file);
    const content = readFileSync(filePath, "utf-8");

    try {
      const { yaml, body } = parseFrontMatter(content);
      const result = AgentFrontMatterSchema.safeParse(yaml);
      
      if (!result.success) {
        throw new ParseError(filePath, `Schema validation failed: ${JSON.stringify(result.error.issues)}`, result.error);
      }
      
      const frontMatter = result.data;

      agents.set(frontMatter.name, {
        frontMatter,
        content: body,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "ZodError") {
        throw new ParseError(filePath, "Schema validation failed", err);
      }
      throw new ParseError(filePath, err instanceof Error ? err.message : String(err));
    }
  }

  return agents;
}

/**
 * Load and parse all skill files from the network/skills directory.
 */
export function loadSkills(networkDir: string): Map<string, ParsedSkill> {
  const skillsDir = join(networkDir, "skills");
  const skills = new Map<string, ParsedSkill>();

  if (!existsSync(skillsDir)) {
    // Skills directory is optional
    return skills;
  }

  const files = readdirSync(skillsDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = join(skillsDir, file);
    const content = readFileSync(filePath, "utf-8");

    try {
      const { yaml, body } = parseFrontMatter(content);
      const frontMatter = SkillFrontMatterSchema.parse(yaml);

      skills.set(frontMatter.name, {
        frontMatter,
        content: body,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "ZodError") {
        throw new ParseError(filePath, "Schema validation failed", err);
      }
      throw new ParseError(filePath, err instanceof Error ? err.message : String(err));
    }
  }

  return skills;
}

/**
 * Load the entire network from a directory.
 * This is the main entry point for loading network configuration.
 */
export function loadNetwork(networkDir: string): {
  manifest: ParsedManifest;
  agents: Map<string, ParsedAgent>;
  skills: Map<string, ParsedSkill>;
} {
  const manifest = loadManifest(networkDir);
  const agents = loadAgents(networkDir);
  const skills = loadSkills(networkDir);

  return { manifest, agents, skills };
}
