import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlertTool } from "./tools/alertTool.js";
import { MackerelClient } from "./client.js";

const BASE_URL = "https://api.mackerelio.com";

async function main() {
  const mackerelClient = new MackerelClient(BASE_URL, getApiKey());
  const alertTool = new AlertTool(mackerelClient);

  // Create an MCP server
  const server = new McpServer({
    name: "mackerel-mcp",
    version: "0.0.1",
  });

  server.registerTool(
    "list_alerts",
    {
      title: "List Alerts",
      // TODO: enhance description
      description: "Retrieve alerts from Mackerel",
      inputSchema: AlertTool.ListAlertsToolInput.shape,
    },
    alertTool.listAlerts,
  );

  server.registerTool(
    "get_alert",
    {
      title: "Get Alert",
      // TODO: enhance description
      description: "Retrieve a specific alert by ID from Mackerel",
      inputSchema: AlertTool.GetAlertToolInput.shape,
    },
    alertTool.getAlert,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mackerel MCP Server running on stdio");
}

function getApiKey(): string {
  let apiKey = process.env.MACKEREL_API_KEY;
  if (!apiKey) {
    throw new Error("MACKEREL_API_KEY environment variable is not set.");
  }

  return apiKey;
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
