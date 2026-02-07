# IBI WebFOCUS MCP Server Extension

This VS Code extension provides an integrated [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI agents to interact with your IBI WebFOCUS instance.

## Features

- **Integrated MCP Server**: Hosts a standard MCP server accessible via Stdio.
- **WebFOCUS Integration**: Connects to WebFOCUS using OSLO APIs.
- **Antigravity Support**: Automatically registers with the Antigravity IDE for seamless AI interaction.
- **Connection Testing**: Built-in command to verify your WebFOCUS credentials.

## Installation

1. Download the latest `.vsix` file.
2. Open VS Code.
3. Go to the Extensions view (`Ctrl+Shift+X`).
4. Click the "..." (Views and More Actions) menu and select **Install from VSIX...**.
5. Select the downloaded file.

## Configuration

Set your WebFOCUS credentials in Settings (`Cmd+,` or `Ctrl+,`):

- `webfocus.baseUrl`: The URL of your WebFOCUS instance (e.g., `http://localhost:8080/webfocus`).
- `webfocus.username`: Your WebFOCUS username.
- `webfocus.password`: Your WebFOCUS password.

## Usage

### In Antigravity
The extension is pre-configured to automatically register itself with Antigravity. Once installed and configured, you should see **IBI WebFOCUS MCP Server** in your MCP tools list.

### Manual Operation
You can manually start and stop the server using the command palette:
- `IBI WebFOCUS: Start MCP Server`
- `IBI WebFOCUS: Stop MCP Server`
- `IBI WebFOCUS: Test Connection` (Checks if the configured credentials work)

## Available MCP Tools

Once connected, the following tools become available to your AI agent:

| Tool Name | Description |
|-----------|-------------|
| `get_system_info` | Retrieves WebFOCUS system and version information. |
| `get_schedules` | Lists all active report schedules. |
| `get_domains` | Retrieves a list of available domains. |
| `get_myworkspace` | Shows domains in the user's workspace. |
| `get_recents` | Lists recently accessed items. |
| `get_rcaster_status` | Checks the health of the ReportCaster service. |
| `get_messaging_profiles` | Lists messaging delivery profiles. |
| `get_user_group_lists` | Retrieves user group lists. |
| `get_access_lists` | Lists access control lists. |
| `get_feature_list` | Shows enabled system features. |

## Development

To build the extension from source:

```bash
cd vscode-extension
npm install
npm run compile
```

To run in debug mode:
1. Open the project folder in VS Code.
2. Press `F5` to start a new "Extension Development Host" window.


Mannual entry of MCP server in Antigravity IDE:

```json
{
    "ai": {
        "mcpServers": [
            {
                "id": "ibi-webfocus",
                "name": "IBI WebFOCUS MCP Server",
                "command": "node",
                "args": [
                    "${extensionPath}/dist/server.js"
                ],
                "env": {
                    "OSLO_BASE_URL": "http://localhost:8080/webfocus",
                    "OSLO_USERNAME": "admin",
                    "OSLO_PASSWORD": "[PASSWORD]"
                }
            }
        ]
    }
}


# VS Code MCP server entry

{
	"servers": {
		"ibi-webfocus-mcp-server": {
			"type": "stdio",
			"command": "node",
			"args": [
				"${env:USERPROFILE}\\.vscode\\extensions\\ramanuj-kumar.ibi-webfocus-mcp-extension-0.0.1\\dist\\server.js"
			],
			"env": {
				"OSLO_BASE_URL": "http://localhost:8080/webfocus",
				"OSLO_USERNAME": "admin",
				"OSLO_PASSWORD": "admin"
			}
		}
	},
	"inputs": []
}
```