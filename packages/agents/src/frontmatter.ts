/**
 * Simple YAML front matter parser for agent role files.
 *
 * Parses markdown files with YAML front matter delimited by `---`.
 * No external dependencies - handles the subset of YAML needed for agent metadata.
 */

export interface AgentFrontMatter {
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  constraints: string[];
  triggers: string[];
  delegationHints: string[];
  defaultModel: string;
  defaultTemperature: number;
  primary?: boolean;
}

export interface ParsedRole {
  frontMatter: AgentFrontMatter;
  content: string;
}

/**
 * Parse a role file containing YAML front matter and markdown content.
 *
 * @param fileContent - Raw file content with front matter
 * @returns Parsed front matter and content
 * @throws Error if front matter is missing or malformed
 */
export function parseRoleFile(fileContent: string): ParsedRole {
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = fileContent.match(frontMatterRegex);

  if (!match) {
    throw new Error("Invalid role file: missing front matter delimiters (---)");
  }

  const [, yamlContent, markdownContent] = match;
  const frontMatter = parseYaml(yamlContent);

  return {
    frontMatter: validateFrontMatter(frontMatter),
    content: markdownContent.trim(),
  };
}

/**
 * Simple YAML parser for the subset we need.
 * Handles: strings, numbers, and arrays of strings.
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");

  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    // Check for array item (starts with "  - ")
    const arrayItemMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayItemMatch && currentKey && currentArray) {
      currentArray.push(arrayItemMatch[1].trim());
      continue;
    }

    // Check for key-value pair
    const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyValueMatch) {
      // Save previous array if any
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }

      const [, key, value] = keyValueMatch;
      currentKey = key;

      if (value.trim() === "") {
        // Start of an array
        currentArray = [];
      } else {
        // Scalar value
        currentArray = null;
        result[key] = parseScalar(value.trim());
      }
    }
  }

  // Save final array if any
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Parse a scalar YAML value (string or number).
 */
function parseScalar(value: string): string | number {
  // Try to parse as number
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
 * Validate and type-check the parsed front matter.
 */
function validateFrontMatter(data: Record<string, unknown>): AgentFrontMatter {
  const required = ["name", "description", "role", "defaultModel", "defaultTemperature"];

  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required front matter field: ${field}`);
    }
  }

  return {
    name: String(data.name),
    description: String(data.description),
    role: String(data.role),
    capabilities: asStringArray(data.capabilities),
    constraints: asStringArray(data.constraints),
    triggers: asStringArray(data.triggers),
    delegationHints: asStringArray(data.delegationHints),
    defaultModel: String(data.defaultModel),
    defaultTemperature: Number(data.defaultTemperature),
    primary: data.primary === true || data.primary === "true",
  };
}

/**
 * Safely convert a value to a string array.
 */
function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [];
}
