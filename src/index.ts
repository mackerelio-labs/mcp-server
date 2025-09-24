import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlertTool } from "./tools/alertTool.js";
import { DashboardTool } from "./tools/dashboardTool.js";
import { MonitorTool } from "./tools/monitorTool.js";
import { HostTool } from "./tools/hostTool.js";
import { ServiceTool } from "./tools/serviceTool.js";
import { TraceTool } from "./tools/traceTool.js";
import { MackerelClient } from "./client.js";
import { ServiceMetricsTool } from "./tools/serviceMetricsTool.js";
import { HostMetricsTool } from "./tools/hostMetricsTool.js";

const BASE_URL = "https://api.mackerelio.com";

async function main() {
  const mackerelClient = new MackerelClient(BASE_URL, getApiKey());
  const alertTool = new AlertTool(mackerelClient);
  const dashboardTool = new DashboardTool(mackerelClient);
  const monitorTool = new MonitorTool(mackerelClient);
  const hostTool = new HostTool(mackerelClient);
  const hostMetricsTool = new HostMetricsTool(mackerelClient);
  const serviceTool = new ServiceTool(mackerelClient);
  const serviceMetricsTool = new ServiceMetricsTool(mackerelClient);
  const traceTool = new TraceTool(mackerelClient);

  // Create an MCP server
  const server = new McpServer({
    name: "@mackerel/mcp-server",
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
### Get all hosts (first 20)
\`\`\`
list_hosts()
\`\`\`

### Get hosts for a specific role
\`\`\`
list_hosts(service="web",role=["app"])
\`\`\`

### Get hosts by status with pagination
\`\`\`
list_hosts(status=["working","standby"], limit=10, offset=0)
\`\`\`

### Get hosts in summary format (reduced response size)
\`\`\`
list_hosts(summary=true)
\`\`\`

### Get next page of hosts
\`\`\`
list_hosts(limit=20, offset=20)
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

📊 AVAILABLE METRIC NAMES:
- **Standard metrics (mackerel-agent)**: loadavg5, cpu.user, memory.used, disk.sda1.reads, network.eth0.rxBytes, etc.
- **Custom metrics**: custom.myapp.* (user-defined metrics)
- **AWS integration**: ec2.cpu.used, rds.database_connections.used, etc.
- **Azure integration**: azure.virtual_machine.cpu.percent, azure.sql_database.cpu.percent, etc.
- **GCP integration**: gce.instance.cpu.used, etc.

<examples>
### Get CPU load average for a host
\`\`\`
get_host_metrics(hostId="host123", name="loadavg5", from=1609459200, to=1609462800)
\`\`\`

### Get custom metric
\`\`\`
get_host_metrics(hostId="host123", name="custom.myapp.response_time", from=1609459200, to=1609462800)
\`\`\`

### Get AWS EC2 CPU utilization
\`\`\`
get_host_metrics(hostId="host123", name="ec2.cpu.used", from=1609459200, to=1609462800)
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
- "Service metrics" are metrics that correspond to a service that consists of multiple hosts and their collective roles
- The following can be visualized and monitored.
  - The total number of registered users in a service
  - The number of PVs for a website
  - Business related KPIs such as sales or the number of orders received from EC sites

📊 AVAILABLE METRIC NAMES:
- **Custom metrics**: http.response_time, sales.count, analytics.page_view, etc.


<examples>
### Get service response time
\`\`\`
get_service_metrics(serviceName="web", name="__externalhttp.responsetime.<monitorId>", from=1609459200, to=1609462800)
\`\`\`

### Get service page views
\`\`\`
get_service_metrics(serviceName="web", name="analytics.page_view", from=1609459200, to=1609462800)
\`\`\`

</examples>`,
      inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape,
    },
    serviceMetricsTool.getServiceMetrics,
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

  server.registerTool(
    "get_trace",
    {
      title: "Get Trace",
      description: `Retrieve trace data by trace ID from Mackerel for distributed tracing analysis.

🔍 USE THIS TOOL WHEN USERS:
- Analyze performance bottlenecks in distributed systems
- Investigate error propagation across microservices
- Understand request flow and service dependencies
- Debug latency issues and identify slow operations
- Generate documentation of system architecture from trace data

<examples>
### Basic trace retrieval (first page)
\`\`\`
get_trace(traceId="abc123def456")
\`\`\`

### Focus on errors only
\`\`\`
get_trace(traceId="abc123def456", errorSpansOnly=true)
\`\`\`

### Filter spans with duration over 100ms
\`\`\`
get_trace(traceId="abc123def456", duration=100)
\`\`\`

### Detailed analysis with attributes
\`\`\`
get_trace(traceId="abc123def456", includeAttributes=true, limit=50)
\`\`\`

### Minimal view for overview
\`\`\`
get_trace(traceId="abc123def456", includeEvents=false, limit=10)
\`\`\`

### Pagination through large traces
\`\`\`
get_trace(traceId="abc123def456", limit=20, offset=0)  # First page
get_trace(traceId="abc123def456", limit=20, offset=20) # Second page
\`\`\`

### Combined filtering and pagination
\`\`\`
get_trace(traceId="abc123def456", errorSpansOnly=true, limit=10, offset=0)
\`\`\`
</examples>
`,
      inputSchema: TraceTool.GetTraceToolInput.shape,
    },
    traceTool.getTrace,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mackerel MCP Server running on stdio");
}

function getApiKey(): string {
  let apiKey = process.env.MACKEREL_APIKEY;
  if (!apiKey) {
    throw new Error("MACKEREL_APIKEY environment variable is not set.");
  }

  return apiKey;
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
