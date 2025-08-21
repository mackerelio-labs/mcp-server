import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";
import { HostMetricsTool } from "./hostMetricsTool.js";

describe("HostMetrics Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const hostMetricsTool = new HostMetricsTool(mackerelClient);

  it("getHostMetrics", async () => {
    const metrics = [
      {
        time: 1609459200,
        value: 1.25,
      },
    ];

    mswServer.use(
      http.get(
        MACKEREL_BASE_URL + "/api/v0/hosts/host123/metrics",
        ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("name")).toBe("loadavg5");
          expect(url.searchParams.get("from")).toBe("1609459200");
          expect(url.searchParams.get("to")).toBe("1609462800");
          return HttpResponse.json({
            metrics,
          });
        },
      ),
    );

    const server = setupServer(
      "get_host_metrics",
      { inputSchema: HostMetricsTool.GetHostMetricsToolInput.shape },
      hostMetricsTool.getHostMetrics,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_host_metrics",
      arguments: {
        hostId: "host123",
        name: "loadavg5",
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
