import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { AlertTool } from "./alertTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Alert Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const alertTool = new AlertTool(mackerelClient);

  it("listAlertsTool", async () => {
    const alerts = [
      {
        id: "alert1",
        status: "CRITICAL",
        monitorId: "monitor1",
        type: "host",
        openedAt: 1600000000,
      },
      {
        id: "alert2",
        status: "WARNING",
        monitorId: "monitor2",
        type: "service",
        openedAt: 1600000060,
      },
    ];
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/alerts", () => {
        return HttpResponse.json({
          alerts,
        });
      }),
    );

    const server = setupServer("list_alerts", {}, alertTool.listAlerts);
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_alerts",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ alerts }),
        },
      ],
    });
  });

  it("getAlert", async () => {
    const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
    const alertTool = new AlertTool(mackerelClient);

    const alert = {
      id: "alert1",
      status: "CRITICAL",
      monitorId: "monitor1",
      type: "host",
      openedAt: 1600000000,
    };
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/alerts/alert1", () => {
        return HttpResponse.json(alert);
      }),
    );

    const server = setupServer(
      "get_alert",
      { inputSchema: AlertTool.GetAlertToolInput.shape },
      alertTool.getAlert,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_alert",
      arguments: {
        alertId: "alert1",
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(alert),
        },
      ],
    });
  });

  it("getAlertLogs", async () => {
    const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
    const alertTool = new AlertTool(mackerelClient);

    const logs = [
      {
        id: "log1",
        status: "CRITICAL",
        trigger: "monitoring",
        monitorId: "monitor1",
        createdAt: 1600000000,
      },
      {
        id: "log2",
        status: "OK",
        trigger: "manual",
        monitorId: "monitor1",
        createdAt: 1600000060,
      },
    ];
    const nextId = "next-id";
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/alerts/alert1/logs", () => {
        return HttpResponse.json({ logs, nextId });
      }),
    );

    const server = setupServer(
      "get_alert_logs",
      { inputSchema: AlertTool.GetAlertLogsToolInput.shape },
      alertTool.getAlertLogs,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_alert_logs",
      arguments: {
        alertId: "alert1",
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ logs, nextId }),
        },
      ],
    });
  });
});
