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

  // GET /api/v0/hosts
  async getHosts(
    service: string | undefined,
    role: string[] | undefined,
    name: string | undefined,
    status: string[] | undefined,
    customIdentifier: string | undefined,
  ): Promise<{ hosts: any[] }> {
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

    return this.request<{ hosts: any[] }>("GET", "/api/v0/hosts", {
      searchParams,
    });
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
}
