import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { LogTool } from "./logTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Log Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const logTool = new LogTool(mackerelClient);

  describe("findLogs", () => {
    const mockFindLogsData = {
      results: [
        {
          cursor: "eyJ0cyI6MTIzfQ",
          timestamp: "2026-09-01T00:12:34.567Z",
          effectiveTimestamp: "2026-09-01T00:12:34.567Z",
          severity: "ERROR",
          severityText: "Error",
          severityNumber: 17,
          body: "connection timeout",
          traceId: "550e8400e29b41d4a716446655440000",
          spanId: "051581bf3cb55c13",
          serviceName: "my-service",
          serviceNamespace: "production",
          attributes: [{ key: "http.method", value: "GET" }],
          resourceAttributes: [{ key: "host.name", value: "web01" }],
          scopeAttributes: [],
        },
      ],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: "eyJ0cyI6MTIzfQ",
        endCursor: "eyJ0cyI6NDU2fQ",
      },
    };

    it("should retrieve logs with required parameters", async () => {
      mswServer.use(
        http.post(MACKEREL_BASE_URL + "/api/v0/logs", async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          expect(body.serviceName).toBe("my-service");
          expect(body.from).toBe(new Date(1700000000 * 1000).toISOString());
          expect(body.to).toBe(new Date(1700001800 * 1000).toISOString());
          return HttpResponse.json(mockFindLogsData);
        }),
      );

      const server = setupServer(
        "find_logs",
        { inputSchema: LogTool.FindLogsToolInput.shape },
        logTool.findLogs,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "find_logs",
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
            text: JSON.stringify(mockFindLogsData),
          },
        ],
      });
    });

    it("should work with optional parameters", async () => {
      mswServer.use(
        http.post(MACKEREL_BASE_URL + "/api/v0/logs", async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          expect(body.serviceName).toBe("my-service");
          expect(body.serviceNamespace).toBe("production");
          expect(body.keywords).toEqual(["timeout"]);
          expect(body.severities).toEqual(["ERROR", "FATAL"]);
          expect(body.traceId).toBe("550e8400e29b41d4a716446655440000");
          expect(body.order).toEqual({
            column: "TIMESTAMP",
            direction: "ASC",
          });
          expect(body.first).toBe(50);
          expect(body.after).toBe("eyJ0cyI6MTIzfQ");
          expect(body.attributes).toEqual([
            {
              key: "http.status_code",
              valueInt: { valueInt: 500, operator: "GTE" },
            },
          ]);
          return HttpResponse.json(mockFindLogsData);
        }),
      );

      const server = setupServer(
        "find_logs",
        { inputSchema: LogTool.FindLogsToolInput.shape },
        logTool.findLogs,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "find_logs",
        arguments: {
          serviceName: "my-service",
          from: 1700000000,
          to: 1700001800,
          serviceNamespace: "production",
          keywords: ["timeout"],
          severities: ["ERROR", "FATAL"],
          traceId: "550e8400e29b41d4a716446655440000",
          order: { column: "TIMESTAMP", direction: "ASC" },
          first: 50,
          after: "eyJ0cyI6MTIzfQ",
          attributes: [
            {
              key: "http.status_code",
              valueInt: { valueInt: 500, operator: "GTE" },
            },
          ],
        },
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockFindLogsData),
          },
        ],
      });
    });

    it("should return an error response when the API returns an error", async () => {
      mswServer.use(
        http.post(MACKEREL_BASE_URL + "/api/v0/logs", () => {
          return new HttpResponse("Internal Server Error", { status: 500 });
        }),
      );

      const server = setupServer(
        "find_logs",
        { inputSchema: LogTool.FindLogsToolInput.shape },
        logTool.findLogs,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "find_logs",
        arguments: {
          serviceName: "my-service",
          from: 1700000000,
          to: 1700001800,
        },
      });

      expect(result.isError).toBe(true);
    });

    it("should reject an attribute with no comparison value set", async () => {
      const server = setupServer(
        "find_logs",
        { inputSchema: LogTool.FindLogsToolInput.shape },
        logTool.findLogs,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "find_logs",
        arguments: {
          serviceName: "my-service",
          from: 1700000000,
          to: 1700001800,
          attributes: [{ key: "http.status_code" }],
        },
      });

      expect(result.isError).toBe(true);
      expect((result.content as any[])[0].text).toContain(
        "Exactly one of value, valueInt, valueDouble, or valueBool must be set",
      );
    });

    it("should reject an attribute with more than one comparison value set", async () => {
      const server = setupServer(
        "find_logs",
        { inputSchema: LogTool.FindLogsToolInput.shape },
        logTool.findLogs,
      );
      const { client } = await setupClient(server);

      const result = await client.callTool({
        name: "find_logs",
        arguments: {
          serviceName: "my-service",
          from: 1700000000,
          to: 1700001800,
          attributes: [
            {
              key: "http.status_code",
              value: { value: "500", operator: "EQ" },
              valueInt: { valueInt: 500, operator: "EQ" },
            },
          ],
        },
      });

      expect(result.isError).toBe(true);
      expect((result.content as any[])[0].text).toContain(
        "Exactly one of value, valueInt, valueDouble, or valueBool must be set",
      );
    });
  });
});
