import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { DashboardTool } from "./dashboardTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Dashboard Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const dashboardTool = new DashboardTool(mackerelClient);

  it("listDashboards", async () => {
    const dashboards = [
      {
        id: "dashboard1",
        title: "My Dashboard",
        memo: "Dashboard for monitoring",
        urlPath: "my-dashboard",
        widgets: [],
        createdAt: 1600000000,
        updatedAt: 1600000060,
      },
      {
        id: "dashboard2",
        title: "Another Dashboard",
        memo: "Another dashboard",
        urlPath: "another-dashboard",
        widgets: [],
        createdAt: 1600000120,
        updatedAt: 1600000180,
      },
    ];
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/dashboards", () => {
        return HttpResponse.json({
          dashboards,
        });
      }),
    );

    const server = setupServer(
      "list_dashboards",
      {},
      dashboardTool.listDashboards,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_dashboards",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ dashboards }),
        },
      ],
    });
  });
});
