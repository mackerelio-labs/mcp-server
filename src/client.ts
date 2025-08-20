import { z } from "zod";
import { DashboardTool } from "./tools/dashboardTool.js";

export class MackerelClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    {
      searchParams,
      body,
    }: {
      searchParams?: URLSearchParams;
      body?: any;
    } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}${searchParams ? "?" + searchParams.toString() : ""}`;
    const headers: HeadersInit = {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mackerel API error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as Promise<T>;
  }

  // GET /api/v0/alerts
  async getAlerts(
    withClosed: boolean | undefined,
    nextId: string | undefined,
    limit: number | undefined,
  ): Promise<{ alerts: any[]; nextId?: string }> {
    const searchParams = new URLSearchParams();
    if (withClosed !== undefined) {
      searchParams.append("withClosed", withClosed.toString());
    }
    if (nextId) {
      searchParams.append("nextId", nextId);
    }
    if (limit !== undefined) {
      searchParams.append("limit", limit.toString());
    }

    return this.request<{ alerts: any[]; nextId?: string }>(
      "GET",
      "/api/v0/alerts",
      { searchParams },
    );
  }

  // GET /api/v0/alerts/{alertId}
  async getAlert(alertId: string) {
    return this.request<{ alert: any }>("GET", `/api/v0/alerts/${alertId}`);
  }

  // GET /api/v0/alerts/{alertId}/logs
  async getAlertLogs(
    alertId: string,
    nextId: string | undefined,
    limit: number | undefined,
  ): Promise<{ logs: any[]; nextId?: string }> {
    const searchParams = new URLSearchParams();
    if (nextId) {
      searchParams.append("nextId", nextId);
    }
    if (limit !== undefined) {
      searchParams.append("limit", limit.toString());
    }

    return this.request<{ logs: any[]; nextId?: string }>(
      "GET",
      `/api/v0/alerts/${alertId}/logs`,
      { searchParams },
    );
  }

  // GET /api/v0/dashboards
  async getDashboards(): Promise<{ dashboards: any[] }> {
    return this.request<{ dashboards: any[] }>("GET", "/api/v0/dashboards");
  }

  // GET /api/v0/dashboards/{dashboardId}
  async getDashboard(dashboardId: string) {
    return this.request<any>("GET", `/api/v0/dashboards/${dashboardId}`);
  }

  private static WidgetArray = z.array(DashboardTool.WidgetSchema);

  // PUT /api/v0/dashboards/{dashboardId}
  async updateDashboard(
    dashboardId: string,
    dashboard: {
      title: string;
      memo: string;
      urlPath: string;
      widgets: z.infer<typeof MackerelClient.WidgetArray>;
    },
  ) {
    return this.request<any>("PUT", `/api/v0/dashboards/${dashboardId}`, {
      body: dashboard,
    });
  }
}
