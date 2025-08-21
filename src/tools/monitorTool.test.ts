import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { MonitorTool } from "./monitorTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Monitor Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const monitorTool = new MonitorTool(mackerelClient);

  it("listMonitors", async () => {
    const monitors = [
      {
        id: "monitor1",
        type: "host",
        name: "CPU Usage",
        metric: "cpu.used",
        operator: ">",
        warning: 80,
        critical: 95,
      },
      {
        id: "monitor2",
        type: "service",
        name: "Response Time",
        service: "MyService",
        metric: "response.time_p90",
        operator: ">",
        warning: 1000,
        critical: 2000,
      },
    ];
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/monitors", () => {
        return HttpResponse.json({
          monitors,
        });
      }),
    );

    const server = setupServer("list_monitors", {}, monitorTool.listMonitors);
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_monitors",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ monitors }),
        },
      ],
    });
  });

  it("getMonitor", async () => {
    const monitor = {
      id: "monitor1",
      type: "host",
      name: "CPU Usage",
      metric: "cpu.used",
      operator: ">",
      warning: 80,
      critical: 95,
    };
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/monitors/monitor1", () => {
        return HttpResponse.json({ monitor });
      }),
    );

    const server = setupServer(
      "get_monitor",
      { inputSchema: MonitorTool.GetMonitorToolInput.shape },
      monitorTool.getMonitor,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_monitor",
      arguments: {
        monitorId: "monitor1",
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ monitor }),
        },
      ],
    });
  });
});
