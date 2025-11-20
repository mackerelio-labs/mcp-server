# Mackerel MCP Server

A Model Context Protocol server for interacting with [Mackerel](https://mackerel.io).

# Configuration

The MCP server can be run either via Docker or npx.

## Running via Docker

```json
{
  "mcpServers": {
    "mackerel": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "MACKEREL_APIKEY",
        "ghcr.io/mackerelio-labs/mcp-server:latest"
      ],
      "env": {
        "MACKEREL_APIKEY": "${MACKEREL_APIKEY}"
      }
    }
  }
}
```

## Running via npx

```json
{
  "mcpServers": {
    "mackerel": {
      "command": "npx",
      "args": [
        "-y",
        "@mackerel/mcp-server"
      ],
      "env": {
        "MACKEREL_APIKEY": "${MACKEREL_APIKEY}"
      }
    }
  }
}
```

# Available tools

* `list_alerts` - Retrieve alerts.
* `get_alert` - Retrieve a specific alert.
* `get_alert_logs` - Retrieve logs for a specific alert.
* `list_dashboards` - Retrieve dashboards.
* `get_dashboard` - Retrieve a specific dashboard.
* `update_dashboard` - Update a specific dashboard.
* `list_hosts` - Retrieve hosts.
* `get_host_metrics` - Retrieve metrics data for a specific host.
* `list_services` - Retrieve services.
* `get_service_metrics` - Retrieve metrics data for a specific service.
* `list_monitors` - Retrieve monitor configurations.
* `get_monitor` - Retrieve a specific monitor configuration.
* `get_trace` - Retrieve trace data by trace ID for distributed tracing analysis.
* `list_http_server_stats` - Retrieve HTTP server statistics.
* `list_db_query_stats` - Retrieve database query statistics.
