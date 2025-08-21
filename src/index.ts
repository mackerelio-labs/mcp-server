import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlertTool } from "./tools/alertTool.js";
import { DashboardTool } from "./tools/dashboardTool.js";
import { MonitorTool } from "./tools/monitorTool.js";
import { HostTool } from "./tools/hostTool.js";
import { ServiceTool } from "./tools/serviceTool.js";
import { MackerelClient } from "./client.js";

const BASE_URL = "https://api.mackerelio.com";

async function main() {
  const mackerelClient = new MackerelClient(BASE_URL, getApiKey());
  const alertTool = new AlertTool(mackerelClient);
  const dashboardTool = new DashboardTool(mackerelClient);
  const monitorTool = new MonitorTool(mackerelClient);
  const hostTool = new HostTool(mackerelClient);
  const serviceTool = new ServiceTool(mackerelClient);

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
    "get_dashboard",
    {
      title: "Get Dashboard",
      description: `Retrieve a specific dashboard by ID from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get details of a specific dashboard
- View dashboard configuration and widgets

<examples>
### Get dashboard by ID
\`\`\`
get_dashboard(dashboardId="3Yr")
\`\`\`
</examples>
`,
      inputSchema: DashboardTool.GetDashboardToolInput.shape,
    },
    dashboardTool.getDashboard,
  );

  server.registerTool(
    "update_dashboard",
    {
      title: "Update Dashboard",
      description: `Update a specific dashboard by ID in Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Modify dashboard title, memo, or URL path
- Update dashboard widgets configuration

<examples>
### Update dashboard
\`\`\`
update_dashboard(
  dashboardId="3Yr",
  title="Updated Dashboard",
  memo="Updated memo",
  urlPath="updated path",
  widgets=[{
    type="markdown",
    markdown="## Updated Markdown Widget",
    title="Updated Title",
    layout: { x: 0, y: 0, width: 6, height: 4 },
  }]
)
\`\`\`
</examples>
`,
      inputSchema: DashboardTool.UpdateDashboardToolInput.shape,
    },
    dashboardTool.updateDashboard,
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
    "list_monitors",
    {
      title: "List Monitors",
      description: `Retrieve all monitor configurations from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get a list of all monitors
- View monitor configurations

<examples>
### Get all monitors
\`\`\`
list_monitors()
\`\`\`
</examples>
`,
      inputSchema: MonitorTool.ListMonitorsToolInput.shape,
    },
    monitorTool.listMonitors,
  );

  server.registerTool(
    "get_monitor",
    {
      title: "Get Monitor",
      description: `Retrieve a specific monitor configuration by ID from Mackerel.

🔍 USE THIS TOOL WHEN USERS:
- Get details of a specific monitor

<examples>
### Get monitor by ID
\`\`\`
get_monitor(monitorId="2cSZzK3XfmB")
\`\`\`
</examples>
`,
      inputSchema: MonitorTool.GetMonitorToolInput.shape,
    },
    monitorTool.getMonitor,
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
