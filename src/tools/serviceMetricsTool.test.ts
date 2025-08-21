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
});
