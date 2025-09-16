import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";
import { ServiceMetricsTool } from "./serviceMetricsTool.js";

describe("ServiceMetrics Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const serviceTool = new ServiceMetricsTool(mackerelClient);

  it("getServiceMetrics", async () => {
    const metrics = [
      {
        time: 1609459200,
        value: 150.5,
      },
      {
        time: 1609459260,
        value: 142.3,
      },
    ];

    mswServer.use(
      http.get(
        MACKEREL_BASE_URL + "/api/v0/services/web/metrics",
        ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("name")).toBe("response_time");
          expect(url.searchParams.get("from")).toBe("1609459200");
          expect(url.searchParams.get("to")).toBe("1609462800");
          return HttpResponse.json({
            metrics,
          });
        },
      ),
    );

    const server = setupServer(
      "get_service_metrics",
      { inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape },
      serviceTool.getServiceMetrics,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_service_metrics",
      arguments: {
        serviceName: "web",
        name: "response_time",
        from: 1609459200,
        to: 1609462800,
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ metrics }),
        },
      ],
    });
  });

  it("getServiceMetrics returns detailed error for 404", async () => {
    mswServer.use(
      http.get(
        MACKEREL_BASE_URL + "/api/v0/services/invalid-service/metrics",
        () => {
          return new HttpResponse(null, {
            status: 404,
            statusText: "Not Found",
          });
        },
      ),
    );

    const server = setupServer(
      "get_service_metrics",
      { inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape },
      serviceTool.getServiceMetrics,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_service_metrics",
      arguments: {
        serviceName: "invalid-service",
        name: "response_time",
        from: 1609459200,
        to: 1609462800,
      },
    });

    expect(result.isError).toBe(true);
    const errorText = result.content[0].text;
    expect(errorText).toContain(
      "## Resource Not Found: Invalid Service or Metric",
    );
    expect(errorText).toContain("## Available Service Metrics:");
    expect(errorText).toContain("Custom metrics posted to your service");
    expect(errorText).toContain("response_time, throughput, error_rate");
    expect(errorText).toContain(
      "Use the list_services tool to find valid service names",
    );
  });

  it("getServiceMetrics returns service not found error", async () => {
    mswServer.use(
      http.get(
        MACKEREL_BASE_URL + "/api/v0/services/invalid-service/metrics",
        () => {
          return new HttpResponse("Service not found", {
            status: 404,
            statusText: "Not Found",
          });
        },
      ),
    );

    const server = setupServer(
      "get_service_metrics",
      { inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape },
      serviceTool.getServiceMetrics,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_service_metrics",
      arguments: {
        serviceName: "invalid-service",
        name: "response_time",
        from: 1609459200,
        to: 1609462800,
      },
    });

    expect(result.isError).toBe(true);
    const errorText = result.content[0].text;
    expect(errorText).toContain("## Service Not Found");
    expect(errorText).toContain(
      "Use the list_services tool to find valid service names",
    );
    expect(errorText).not.toContain("## Available Service Metrics:");
  });

  it("getServiceMetrics returns metric not found error", async () => {
    mswServer.use(
      http.get(
        MACKEREL_BASE_URL + "/api/v0/services/valid-service/metrics",
        () => {
          return new HttpResponse("Metric not found", {
            status: 404,
            statusText: "Not Found",
          });
        },
      ),
    );

    const server = setupServer(
      "get_service_metrics",
      { inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape },
      serviceTool.getServiceMetrics,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_service_metrics",
      arguments: {
        serviceName: "valid-service",
        name: "invalid-metric",
        from: 1609459200,
        to: 1609462800,
      },
    });

    expect(result.isError).toBe(true);
    const errorText = result.content[0].text;
    expect(errorText).toContain("## Metric Not Found");
    expect(errorText).toContain("## Available Service Metrics:");
    expect(errorText).toContain("Custom metrics posted to your service");
    expect(errorText).toContain("Check for typos in the metric name");
  });
});
