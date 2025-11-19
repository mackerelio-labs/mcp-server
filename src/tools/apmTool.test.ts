import { describe, it, expect, beforeEach } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { ApmTool } from "./apmTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Apm Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const apmTool = new ApmTool(mackerelClient);

  beforeEach(() => {
    mackerelClient.clearCache();
  });

  describe("listDbQueryStats", () => {
    const mockDbQueryStatsData = {
      results: [
        {
          query: "SELECT * FROM users WHERE id = ?",
          executionCount: 1250,
          totalMillis: 5000,
          averageMillis: 4,
          approxP95Millis: 8,
        },
        {
          query: "SELECT * FROM orders WHERE user_id = ?",
          executionCount: 800,
          totalMillis: 12000,
          averageMillis: 15,
          approxP95Millis: 25,
        },
        {
          query: "UPDATE products SET stock = stock - 1 WHERE id = ?",
          executionCount: 500,
          totalMillis: 3000,
          averageMillis: 6,
          approxP95Millis: 10,
        },
      ],
      hasNextPage: false,
    };

    it("should retrieve database query statistics", async () => {
      mswServer.use(
        http.get(
          MACKEREL_BASE_URL + "/api/v0/apm/db-query-stats",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("serviceName")).toBe("my-service");
            expect(url.searchParams.get("from")).toBe("1700000000");
            expect(url.searchParams.get("to")).toBe("1700001800");
            return HttpResponse.json(mockDbQueryStatsData);
          },
        ),
      );

      const server = setupServer(
        "list_db_query_stats",
        { inputSchema: ApmTool.ListDbQueryStatsToolInput.shape },
        apmTool.listDbQueryStats,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "list_db_query_stats",
        arguments: {
          serviceName: "my-service",
          from: 1700000000,
          to: 1700001800,
        },
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockDbQueryStatsData),
          },
        ],
      });
    });

    it("should work with optional parameters", async () => {
      mswServer.use(
        http.get(
          MACKEREL_BASE_URL + "/api/v0/apm/db-query-stats",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("serviceName")).toBe("my-service");
            expect(url.searchParams.get("serviceNamespace")).toBe("production");
            expect(url.searchParams.get("environment")).toBe("prod");
            expect(url.searchParams.get("version")).toBe("v1.2.3");
            expect(url.searchParams.get("query")).toBe("SELECT");
            expect(url.searchParams.get("orderColumn")).toBe("P95");
            expect(url.searchParams.get("orderDirection")).toBe("DESC");
            expect(url.searchParams.get("page")).toBe("2");
            expect(url.searchParams.get("perPage")).toBe("50");
            return HttpResponse.json(mockDbQueryStatsData);
          },
        ),
      );

      const server = setupServer(
        "list_db_query_stats",
        { inputSchema: ApmTool.ListDbQueryStatsToolInput.shape },
        apmTool.listDbQueryStats,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "list_db_query_stats",
        arguments: {
          serviceName: "my-service",
          from: 1700000000,
          to: 1700001800,
          serviceNamespace: "production",
          environment: "prod",
          version: "v1.2.3",
          query: "SELECT",
          orderColumn: "P95",
          orderDirection: "DESC",
          page: 2,
          perPage: 50,
        },
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockDbQueryStatsData),
          },
        ],
      });
    });
  });
});
