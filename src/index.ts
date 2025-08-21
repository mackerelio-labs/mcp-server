import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlertTool } from "./tools/alertTool.js";
import { DashboardTool } from "./tools/dashboardTool.js";
import { HostTool } from "./tools/hostTool.js";
import { ServiceTool } from "./tools/serviceTool.js";
import { MackerelClient } from "./client.js";
import { ServiceMetricsTool } from "./tools/serviceMetricsTool.js";
import { HostMetricsTool } from "./tools/hostMetricsTool.js";

const BASE_URL = "https://api.mackerelio.com";

async function main() {
  const mackerelClient = new MackerelClient(BASE_URL, getApiKey());
  const alertTool = new AlertTool(mackerelClient);
  const dashboardTool = new DashboardTool(mackerelClient);
  const hostTool = new HostTool(mackerelClient);
  const hostMetricsTool = new HostMetricsTool(mackerelClient);
  const serviceTool = new ServiceTool(mackerelClient);
  const serviceMetricsTool = new ServiceMetricsTool(mackerelClient);

  // Create an MCP server
  const server = new McpServer({
    name: "mackerel-mcp",
    version: "0.0.1",
  });

  server.registerTool(
    "list_alerts",
    {
      title: "List Alerts",
      description: `Retrieve alerts from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Check currently active alerts
- Get a list of alerts including closed alerts

<examples>
### Get opening alerts
\`\`\`
list_alerts()
\`\`\`

### Get all alerts
\`\`\`
list_alerts(withClosed=true)
\`\`\`
</examples>
`,
      inputSchema: AlertTool.ListAlertsToolInput.shape,
    },
    alertTool.listAlerts,
  );

  server.registerTool(
    "get_alert",
    {
      title: "Get Alert",
      description: `Retrieve a specific alert by ID from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Investigate a particular alert

<examples>
### Get alert by ID
\`\`\`
get_alert(alertId=3Yr)
\`\`\`
</example>
`,
      inputSchema: AlertTool.GetAlertToolInput.shape,
    },
    alertTool.getAlert,
  );

  server.registerTool(
    "get_alert_logs",
    {
      title: "Get Alert Logs",
      description: `Retrieve logs for a specific alert by ID from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- View status change history for a specific alert
- Investigate alert transitions and their reasons

<examples>
### Get alert logs for the alert
\`\`\`
get_alert_logs(alertId=3Yr)
\`\`\`
</example>
`,
      inputSchema: AlertTool.GetAlertLogsToolInput.shape,
    },
    alertTool.getAlertLogs,
  );

  server.registerTool(
    "list_dashboards",
    {
      title: "List Dashboards",
      description: `Retrieve all dashboards from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get a list of dashboards
- Get ID and title of each dashboard

<examples>
### Get all dashboards
\`\`\`
list_dashboards()
\`\`\`
</example>
`,
      inputSchema: DashboardTool.ListDashboardsToolInput.shape,
    },
    dashboardTool.listDashboards,
  );

  server.registerTool(
    "list_hosts",
    {
      title: "List Hosts",
      description: `Retrieve hosts from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get a list of hosts
- Filter hosts by various criteria (service, role, name, etc.)
- Check host status and information

<examples>
### Get all hosts
\`\`\`
list_hosts()
\`\`\`

### Get hosts for a specific role
\`\`\`
list_hosts(service="web",role=["app"])
\`\`\`

### Get hosts by status
\`\`\`
list_hosts(status=["working","standby"])
\`\`\`
</examples>
`,
      inputSchema: HostTool.ListHostsToolInput.shape,
    },
    hostTool.listHosts,
  );

  server.registerTool(
    "get_host_metrics",
    {
      title: "Get Host Metrics",
      description: `Retrieve metrics data for a specific host from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get metrics data for a specific host
- Analyze host performance over time

<examples>
### Get all metrics for a host
\`\`\`
get_host_metrics(hostId="host123", name="loadavg5", from=1609459200, to=1609462800)
\`\`\`
</examples>
`,
      inputSchema: HostMetricsTool.GetHostMetricsToolInput.shape,
    },
    hostMetricsTool.getHostMetrics,
  );

  server.registerTool(
    "list_services",
    {
      title: "List Services",
      description: `Retrieve all services from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get a list of services
- View service names, memos, and roles

<examples>
### Get all services
\`\`\`
list_services()
\`\`\`
</examples>
`,
      inputSchema: ServiceTool.ListServicesToolInput.shape,
    },
    serviceTool.listServices,
  );

  server.registerTool(
    "get_service_metrics",
    {
      title: "Get Service Metrics",
      description: `Retrieve metrics data for a specific service from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get metrics data for a specific service

<examples>
### Get service metrics
\`\`\`
get_service_metrics(serviceName="web", name="response_time", from=1609459200, to=1609462800)
\`\`\`
</examples>
`,
      inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape,
    },
    serviceMetricsTool.getServiceMetrics,
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
