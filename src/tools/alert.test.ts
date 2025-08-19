import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { listAlertsTool, getAlertTool, GetAlertToolInput } from "./alert.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { BASE_URL } from "../client.js";

describe("Alert Tool", () => {
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
      http.get(BASE_URL + "/api/v0/alerts", () => {
        return HttpResponse.json({
          alerts,
        });
      }),
    );

    const server = setupServer("list_alerts", {}, listAlertsTool);
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

  it("getAlertTool", async () => {
    const alert = {
      id: "alert1",
      status: "CRITICAL",
      monitorId: "monitor1",
      type: "host",
      openedAt: 1600000000,
    };
    mswServer.use(
      http.get(BASE_URL + "/api/v0/alerts/alert1", () => {
        return HttpResponse.json(alert);
      }),
    );

    const server = setupServer(
      "get_alert",
      { inputSchema: GetAlertToolInput },
      getAlertTool,
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
});
