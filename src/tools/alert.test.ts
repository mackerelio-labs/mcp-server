import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MackerelClient } from "../client.js";
import { AlertTool } from "./alertTool.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Alert Tool", () => {
  it("listAlertsTool", async () => {
    const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
    const alertTool = new AlertTool(mackerelClient);

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

    const server = new McpServer({
      name: "mackerel",
      version: "0.0.1",
    });
    server.registerTool("list_alerts", {}, alertTool.listAlerts);
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
});
