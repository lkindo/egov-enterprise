# Task: Install mjojo/PowerShellEX MCP Server

## Status
- [x] Create directory `C:\Users\sanle\.gemini\antigravity\mcp_servers`
- [x] Clone `mjojo/PowerShellEX` repository
- [x] Install dependencies and build
- [x] Update `mcp_config.json`
- [x] Install `PSScriptAnalyzer` PowerShell module
- [x] Verify server startup

## Details
- Repository: `https://github.com/mjojo/PowerShellEX`
- Install Path: `C:\Users\sanle\.gemini\antigravity\mcp_servers\powershell-ex`
- Config: Added `powershell` server to `mcp_config.json`

## Evidence
- `npm run build` completed with exit code 0.
- `node dist/index.js` showed "PowerShell MCP Server running".
