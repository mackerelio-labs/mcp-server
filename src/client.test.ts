import { describe, it, expect, beforeEach, vi } from "vitest";
import { MackerelClient } from "./client.js";
import { mswServer } from "./mocks/server.js";
import { HttpResponse, http } from "msw";
import { MACKEREL_BASE_URL } from "./__tests__/mackerelClient.js";

describe("MackerelClient Cache", () => {
  let client: MackerelClient;

  beforeEach(() => {
    client = new MackerelClient(MACKEREL_BASE_URL, "test-api-key", 1); // 1 second TTL for testing
  });

  it("should cache GET requests", async () => {
    const alerts = [
      {
        id: "alert1",
        status: "CRITICAL",
        monitorId: "monitor1",
        type: "host",
        openedAt: 1600000000,
      },
    ];

    let callCount = 0;
    mswServer.use(
      http.get(`${MACKEREL_BASE_URL}/api/v0/alerts`, () => {
        callCount++;
        return HttpResponse.json({ alerts });
      }),
    );

    // First call should make HTTP request
    const result1 = await client.getAlerts(false, undefined, undefined);
    expect(result1.alerts).toEqual(alerts);
    expect(callCount).toBe(1);

    // Second call with same parameters should use cache
    const result2 = await client.getAlerts(false, undefined, undefined);
    expect(result2.alerts).toEqual(alerts);
    expect(callCount).toBe(1); // Still 1, no new HTTP request
  });

  it("should not cache requests with different parameters", async () => {
    const alerts1 = [{ id: "alert1", status: "CRITICAL" }];
    const alerts2 = [{ id: "alert2", status: "WARNING" }];

    let callCount = 0;
    mswServer.use(
      http.get(`${MACKEREL_BASE_URL}/api/v0/alerts`, ({ request }) => {
        callCount++;
        const url = new URL(request.url);
        const withClosed = url.searchParams.get("withClosed");

        if (withClosed === "true") {
          return HttpResponse.json({ alerts: alerts2 });
        }
        return HttpResponse.json({ alerts: alerts1 });
      }),
    );

    // First call
    const result1 = await client.getAlerts(false, undefined, undefined);
    expect(result1.alerts).toEqual(alerts1);
    expect(callCount).toBe(1);

    // Second call with different parameters should make new HTTP request
    const result2 = await client.getAlerts(true, undefined, undefined);
    expect(result2.alerts).toEqual(alerts2);
    expect(callCount).toBe(2);
  });

  it("should expire cache after TTL", async () => {
    const alerts = [{ id: "alert1", status: "CRITICAL" }];

    let callCount = 0;
    mswServer.use(
      http.get(`${MACKEREL_BASE_URL}/api/v0/alerts`, () => {
        callCount++;
        return HttpResponse.json({ alerts });
      }),
    );

    // First call
    await client.getAlerts(false, undefined, undefined);
    expect(callCount).toBe(1);

    // Wait for cache to expire (TTL is 1 second)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Call after TTL should make new HTTP request
    await client.getAlerts(false, undefined, undefined);
    expect(callCount).toBe(2);
  });

  it("should clear cache manually", async () => {
    const alerts = [{ id: "alert1", status: "CRITICAL" }];

    let callCount = 0;
    mswServer.use(
      http.get(`${MACKEREL_BASE_URL}/api/v0/alerts`, () => {
        callCount++;
        return HttpResponse.json({ alerts });
      }),
    );

    // First call
    await client.getAlerts(false, undefined, undefined);
    expect(callCount).toBe(1);

    // Clear cache manually
    client.clearCache();

    // Next call should make new HTTP request
    await client.getAlerts(false, undefined, undefined);
    expect(callCount).toBe(2);
  });

  it("should not cache PUT requests", async () => {
    const dashboard = {
      title: "Test Dashboard",
      memo: "Test memo",
      urlPath: "test-path",
      widgets: [],
    };

    let callCount = 0;
    mswServer.use(
      http.put(`${MACKEREL_BASE_URL}/api/v0/dashboards/test-id`, () => {
        callCount++;
        return HttpResponse.json({ dashboard });
      }),
    );

    // Make two identical PUT requests
    await client.updateDashboard("test-id", dashboard);
    expect(callCount).toBe(1);

    await client.updateDashboard("test-id", dashboard);
    expect(callCount).toBe(2); // Should make new request, not use cache
  });
});
