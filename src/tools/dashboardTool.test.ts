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

  it("listDashboards with default summary", async () => {
    const dashboards = [
      {
        id: "dashboard1",
        title: "My Dashboard",
        memo: "Dashboard for monitoring",
        urlPath: "my-dashboard",
        widgets: [
          {
            type: "graph",
            title: "CPU Usage",
            layout: { x: 0, y: 0, width: 6, height: 6 },
          },
        ],
        createdAt: 1600000000,
        updatedAt: 1600000060,
      },
      {
        id: "dashboard2",
        title: "Another Dashboard",
        memo: "Another dashboard",
        urlPath: "another-dashboard",
        widgets: [
          {
            type: "value",
            title: "Memory Usage",
            layout: { x: 0, y: 0, width: 3, height: 3 },
          },
        ],
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
      { inputSchema: DashboardTool.ListDashboardsToolInput.shape },
      dashboardTool.listDashboards,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_dashboards",
      arguments: {},
    });

    const expectedSummaryDashboards = [
      {
        id: "dashboard1",
        title: "My Dashboard",
        memo: "Dashboard for monitoring",
        urlPath: "my-dashboard",
        createdAt: 1600000000,
        updatedAt: 1600000060,
        widgetCount: 1,
      },
      {
        id: "dashboard2",
        title: "Another Dashboard",
        memo: "Another dashboard",
        urlPath: "another-dashboard",
        createdAt: 1600000120,
        updatedAt: 1600000180,
        widgetCount: 1,
      },
    ];

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            dashboards: expectedSummaryDashboards,
            pageInfo: { hasPrevPage: false, hasNextPage: false },
          }),
        },
      ],
    });
  });

  it("listDashboards with summary=false", async () => {
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
      { inputSchema: DashboardTool.ListDashboardsToolInput.shape },
      dashboardTool.listDashboards,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_dashboards",
      arguments: { summary: false },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            dashboards,
            pageInfo: { hasPrevPage: false, hasNextPage: false },
          }),
        },
      ],
    });
  });

  it("listDashboards with pagination", async () => {
    const dashboards = Array.from({ length: 25 }, (_, i) => ({
      id: `dashboard${i + 1}`,
      title: `Dashboard ${i + 1}`,
      memo: `Dashboard ${i + 1} memo`,
      urlPath: `dashboard-${i + 1}`,
      widgets: [],
      createdAt: 1600000000 + i * 60,
      updatedAt: 1600000060 + i * 60,
    }));

    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/dashboards", () => {
        return HttpResponse.json({
          dashboards,
        });
      }),
    );

    const server = setupServer(
      "list_dashboards",
      { inputSchema: DashboardTool.ListDashboardsToolInput.shape },
      dashboardTool.listDashboards,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_dashboards",
      arguments: { limit: 10, offset: 5 },
    });

    const resultData = JSON.parse(
      (result.content![0] as { text: string }).text,
    );

    expect(resultData.dashboards).toHaveLength(10);
    expect(resultData.dashboards[0].id).toBe("dashboard6");
    expect(resultData.pageInfo).toEqual({
      hasPrevPage: true,
      hasNextPage: true,
    });
  });

  it("getDashboard", async () => {
    const dashboard = {
      id: "dashboard1",
      title: "My Dashboard",
      memo: "Dashboard for monitoring",
      urlPath: "my-dashboard",
      widgets: [],
      createdAt: 1600000000,
      updatedAt: 1600000060,
    };
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/dashboards/dashboard1", () => {
        return HttpResponse.json(dashboard);
      }),
    );

    const server = setupServer(
      "get_dashboard",
      { inputSchema: DashboardTool.GetDashboardToolInput.shape },
      dashboardTool.getDashboard,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_dashboard",
      arguments: { dashboardId: "dashboard1" },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(dashboard),
        },
      ],
    });
  });

  it("updateDashboard", async () => {
    const updatedDashboard = {
      id: "dashboard1",
      title: "Updated Dashboard",
      memo: "Updated description",
      urlPath: "updated-path",
      widgets: [],
      createdAt: 1600000000,
      updatedAt: 1600000240,
    };
    mswServer.use(
      http.put(MACKEREL_BASE_URL + "/api/v0/dashboards/dashboard1", () => {
        return HttpResponse.json(updatedDashboard);
      }),
    );

    const server = setupServer(
      "update_dashboard",
      { inputSchema: DashboardTool.UpdateDashboardToolInput.shape },
      dashboardTool.updateDashboard,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "update_dashboard",
      arguments: {
        dashboardId: "dashboard1",
        title: "Updated Dashboard",
        memo: "Updated description",
        urlPath: "updated-path",
        widgets: [],
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(updatedDashboard),
        },
      ],
    });
  });
});
