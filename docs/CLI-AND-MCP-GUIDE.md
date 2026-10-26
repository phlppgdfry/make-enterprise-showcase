# Make.com CLI & Model Context Protocol (MCP) Guide

This guide details how to leverage the official Make CLI tools and MCP server to manage scenarios, endpoints, and AI integrations.

---

## 1. Installed Command-Line Tools

The following CLI tools are pre-installed globally in your environment:

1. **`make-cli`** (`@makehq/cli` v1.4.0)
   - Primary management CLI for Make.com.
   - Commands: `scenarios`, `executions`, `connections`, `data-stores`, `data-tables`, `whoami`, `login`.
2. **`make-endpoints-cli`** (`@makehq/endpoints-sdk`)
   - Standalone CLI for calling app actions and endpoints directly.
3. **`mcp-server-make`** (`@makehq/mcp-server` v0.5.0)
   - Model Context Protocol server exposing Make scenarios as tools to AI coding agents (Claude, Gemini CLI, Cursor, Windsurf).

---

## 2. Authentication Configuration

For your organization:
- **Make Zone:** `eu1.make.com`
- **Organization ID:** `9433554`

### Option A: Environment Variables
Add to your `~/.zshrc` or project `.env`:
```bash
export MAKE_API_KEY="your-make-api-token"
export MAKE_ZONE="eu1.make.com"
export MAKE_ORGANIZATION_ID="9433554"
```

### Option B: Interactive Login
```bash
make-cli login
# Select zone: eu1.make.com
# Paste your Make API token
```

---

## 3. Using Make CLI

### List Scenarios in a Team
```bash
make-cli scenarios list --team-id <your-team-id> --zone eu1.make.com --output table
```

### Check Current Authenticated User & Permissions
```bash
make-cli whoami --zone eu1.make.com
```

### Inspect Data Stores
```bash
make-cli data-stores list --team-id <your-team-id> --zone eu1.make.com
```

---

## 4. MCP Server Configuration

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "make": {
      "command": "npx",
      "args": ["-y", "@makehq/mcp-server"],
      "env": {
        "MAKE_API_KEY": "<your-api-key>",
        "MAKE_ZONE": "eu1.make.com"
      }
    }
  }
}
```

### Gemini CLI / Antigravity (`~/.gemini/settings.json`)
```json
{
  "mcpServers": {
    "make": {
      "type": "http",
      "url": "https://mcp.make.com/gemini"
    },
    "make-local": {
      "command": "mcp-server-make",
      "env": {
        "MAKE_ZONE": "eu1.make.com"
      }
    }
  }
}
```
