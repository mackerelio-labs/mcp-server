export const BASE_URL = "https://api.mackerelio.com";
export const API_KEY = process.env.MACKEREL_API_KEY || "";

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
    searchParams?: URLSearchParams,
    body?: any,
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
  async getAlerts(searchParams: URLSearchParams) {
    return this.request<{ alerts: any[]; nextId?: string }>(
      "GET",
      "/api/v0/alerts",
      searchParams,
    );
  }
}

export const mackerelClient = new MackerelClient(BASE_URL, API_KEY);
