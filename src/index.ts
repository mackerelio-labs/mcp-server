import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { listAlertsTool, ListAlertsToolInput, getAlertTool, GetAlertToolInput } from "./tools/alert.js";

// Create an MCP server
const server = new McpServer({
  name: "mackerel-mcp",
  version: "0.0.1",
});

server.registerTool(
  "list_alerts",
  {
    title: "List Alerts",
    description: "Retrieve alerts from Mackerel",
    inputSchema: ListAlertsToolInput,
  },
  listAlertsTool,
);

server.registerTool(
  "get_alert",
  {
    title: "Get Alert",
    description: "Retrieve a specific alert by ID from Mackerel",
    inputSchema: GetAlertToolInput,
  },
  getAlertTool,
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mackerel MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
