---
name: "Oh My OpenCode Slim - Standard Network"
version: "1.0.0"
defaults:
  temperature: 0.1
providers:
  antigravity:
    high: "google/claude-opus-4-5-thinking"
    medium: "google/gemini-3-flash"
    low: "google/gemini-3-flash"
  openai:
    high: "openai/gpt-5.2-codex"
    medium: "openai/gpt-5.1-codex-mini"
    low: "openai/gpt-5.1-codex-mini"
  zen-free:
    high: "opencode/glm-4.7-free"
    medium: "opencode/grok-code"
    low: "opencode/grok-code"
---

# Oh My OpenCode Slim - Agent Network

This network implements a software engineering team structure optimized for AI-assisted coding.

## Network Architecture

The **Orchestrator** is the primary agent that coordinates all work. It delegates to specialized **Subagents** based on task requirements:

- **Research Agents**: Explorer, Librarian - gather information
- **Implementation Agents**: Fixer, Designer - write code
- **Quality Agents**: Oracle, Analyst, Prober - review and validate
- **Support Agents**: Archivist, Scribe - version control and documentation

## Delegation Philosophy

Each specialist delivers 10x better results in their domain. The orchestrator should delegate early and often, using file paths and context rather than copying content.
