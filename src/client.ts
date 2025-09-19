import { z } from "zod";
import { DashboardTool } from "./tools/dashboardTool.js";
import { applyPagination } from "./tools/util.js";

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class MackerelClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly cacheMap: Map<string, CacheEntry> = new Map();
  private readonly cacheTTL: number;

  constructor(baseUrl: string, apiKey: string, cacheTTL: number = 300) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.cacheTTL = cacheTTL * 1000; // Convert seconds to milliseconds
  }

  private getCacheKey(
    method: string,
    path: string,
    searchParams?: URLSearchParams,
  ): string {
    const paramsString = searchParams ? searchParams.toString() : "";
    return `${method}:${path}:${paramsString}`;
  }

  private getFromCache<T>(cacheKey: string): T | null {
    const entry = this.cacheMap.get(cacheKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.cacheTTL) {
      this.cacheMap.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  private setCache(cacheKey: string, data: any): void {
    this.cacheMap.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  public clearCache(): void {
    this.cacheMap.clear();
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
    // Only cache GET requests
    if (method === "GET") {
      const cacheKey = this.getCacheKey(method, path, searchParams);
      const cachedResult = this.getFromCache<T>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

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

    const result = (await response.json()) as T;

    // Cache GET requests only
    if (method === "GET") {
      const cacheKey = this.getCacheKey(method, path, searchParams);
      this.setCache(cacheKey, result);
    }

    return result;
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
  async getDashboards(
    limit?: number,
    offset?: number,
  ): Promise<{
    dashboards: any[];
    pageInfo: { hasNextPage: boolean; hasPrevPage: boolean };
  }> {
    const response = await this.request<{ dashboards: any[] }>(
      "GET",
      "/api/v0/dashboards",
    );

    const effectiveLimit = limit || 20;
    const effectiveOffset = offset || 0;
    const totalDashboards = response.dashboards.length;

    const paginatedDashboards = applyPagination(response.dashboards, {
      limit: effectiveLimit,
      offset: effectiveOffset,
    });

    const pageInfo = {
      hasPrevPage: effectiveOffset > 0,
      hasNextPage: effectiveOffset + effectiveLimit < totalDashboards,
    };

    return {
      dashboards: paginatedDashboards,
      pageInfo,
    };
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

  // GET /api/v0/hosts
  async getHosts(
    service: string | undefined,
    role: string[] | undefined,
    name: string | undefined,
    status: string[] | undefined,
    customIdentifier: string | undefined,
    limit?: number,
    offset?: number,
  ): Promise<{
    hosts: any[];
    pageInfo: { hasNextPage: boolean; hasPrevPage: boolean };
  }> {
    const searchParams = new URLSearchParams();
    if (service) {
      searchParams.append("service", service);
    }
    if (role) {
      for (const r of role) {
        searchParams.append("role", r);
      }
    }
    if (name) {
      searchParams.append("name", name);
    }
    if (status) {
      for (const s of status) {
        searchParams.append("status", s);
      }
    }
    if (customIdentifier) {
      searchParams.append("customIdentifier", customIdentifier);
    }

    const response = await this.request<{ hosts: any[] }>(
      "GET",
      "/api/v0/hosts",
      {
        searchParams,
      },
    );

    // Apply client-side pagination since Mackerel API doesn't support it natively
    const effectiveLimit = limit || 20;
    const effectiveOffset = offset || 0;
    const totalHosts = response.hosts.length;

    const paginatedHosts = applyPagination(response.hosts, {
      limit: effectiveLimit,
      offset: effectiveOffset,
    });

    const pageInfo = {
      hasPrevPage: effectiveOffset > 0,
      hasNextPage: effectiveOffset + effectiveLimit < totalHosts,
    };

    return {
      hosts: paginatedHosts,
      pageInfo,
    };
  }

  // GET /api/v0/hosts/{hostId}/metrics
  async getHostMetrics(
    hostId: string,
    name: string,
    from: number,
    to: number,
  ): Promise<{ metrics: Array<{ time: number; value: number }> }> {
    const searchParams = new URLSearchParams();
    searchParams.append("name", name);
    searchParams.append("from", from.toString());
    searchParams.append("to", to.toString());

    return this.request<{ metrics: Array<{ time: number; value: number }> }>(
      "GET",
      `/api/v0/hosts/${hostId}/metrics`,
      { searchParams },
    );
  }

  // GET /api/v0/services
  async getServices(): Promise<{ services: any[] }> {
    return this.request<{ services: any[] }>("GET", "/api/v0/services");
  }

  // GET /api/v0/services/{serviceName}/metrics
  async getServiceMetrics(
    serviceName: string,
    name: string,
    from: number,
    to: number,
  ): Promise<{ metrics: Array<{ time: number; value: number }> }> {
    const searchParams = new URLSearchParams();
    searchParams.append("name", name);
    searchParams.append("from", from.toString());
    searchParams.append("to", to.toString());

    return this.request<{ metrics: Array<{ time: number; value: number }> }>(
      "GET",
      `/api/v0/services/${serviceName}/metrics`,
      { searchParams },
    );
  }

  // GET /api/v0/monitors
  async getMonitors(): Promise<{ monitors: any[] }> {
    return this.request<{ monitors: any[] }>("GET", "/api/v0/monitors");
  }

  // GET /api/v0/monitors/{monitorId}
  async getMonitor(monitorId: string) {
    return this.request<{ monitor: any }>(
      "GET",
      `/api/v0/monitors/${monitorId}`,
    );
  }

  // GET /api/v0/traces/{traceId}
  async getTrace(traceId: string): Promise<{ spans: any[] }> {
    return this.request<{ spans: any[] }>("GET", `/api/v0/traces/${traceId}`);
  }
}
