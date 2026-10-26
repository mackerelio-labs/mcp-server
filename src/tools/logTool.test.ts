import { describe, it, expect, vi, afterEach } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { LogTool } from "./logTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

const attr = (key: string, value: string) => ({
  key,
  value: { valueType: "string", stringValue: value },
});

const mockLog = {
  cursor: "cursor-1",
  timestamp: "2023-11-14T22:13:20Z",
  severity: "ERROR",
  severityNumber: 17,
  body: "payment failed: timeout",
  traceId: "0af7651916cd43dd8448eb211c80319c",
  spanId: "b7ad6b7169203331",
  serviceName: "my-service",
  serviceNamespace: null,
  attributes: [attr("http.route", "/pay")],
  resourceAttributes: [attr("host.name", "web-1")],
  scopeAttributes: [],
};

describe("Log Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const logTool = new LogTool(mackerelClient);

  const callSearchLogs = async (args: Record<string, unknown>) => {
    const server = setupServer(
      "search_logs",
      { inputSchema: LogTool.SearchLogsToolInput.shape },
      logTool.searchLogs,
    );
    const { client } = await setupClient(server);
    return client.callTool({ name: "search_logs", arguments: args });
  };

  const parse = (result: Awaited<ReturnType<typeof callSearchLogs>>) =>
    JSON.parse((result.content as Array<{ text: string }>)[0].text);

  const baseArgs = {
    serviceName: "my-service",
    from: 1700000000,
    to: 1700003600,
  };

  it("returns compact logs with default fields and ready-to-use cursors", async () => {
    mswServer.use(
      http.post(MACKEREL_BASE_URL + "/api/v0/logs", () =>
        HttpResponse.json({
          results: [mockLog],
          pagination: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "cursor-1",
            endCursor: "cursor-1",
          },
        }),
      ),
    );

    const result = await callSearchLogs(baseArgs);

    expect(parse(result)).toEqual({
      timeRange: {
        from: 1700000000,
        to: 1700003600,
        fromTime: "2023-11-14T22:13:20.000Z",
        toTime: "2023-11-14T23:13:20.000Z",
      },
      logs: [
        {
          timestamp: "2023-11-14T22:13:20Z",
          severity: "ERROR",
          body: "payment failed: timeout",
          traceId: "0af7651916cd43dd8448eb211c80319c",
          spanId: "b7ad6b7169203331",
        },
      ],
      pagination: {
        hasNextPage: true,
        hasPreviousPage: false,
        nextPageCursor: { direction: "NEXT", cursor: "cursor-1" },
        previousPageCursor: null,
      },
    });
  });

  it("forwards filters, order and cursor to the API", async () => {
    let requestBody: Record<string, unknown> | undefined;
    mswServer.use(
      http.post(MACKEREL_BASE_URL + "/api/v0/logs", async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          results: [],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: true,
            startCursor: null,
            endCursor: null,
          },
        });
      }),
    );

    const bodyAttributes = [
      {
        keyPath: ["res", "status"],
        value: "500",
        type: "int",
        operator: "GTE",
      },
    ];
    const pageCursor = { direction: "NEXT", cursor: "cursor-1" };
    const result = await callSearchLogs({
      ...baseArgs,
      keywords: ["timeout"],
      severities: ["ERROR", "FATAL"],
      bodyAttributes,
      order: "ASC",
      pageCursor,
      perPage: 100,
    });

    expect(requestBody).toEqual({
      ...baseArgs,
      keywords: ["timeout"],
      severities: ["ERROR", "FATAL"],
      bodyAttributes,
      order: { column: "TIMESTAMP", direction: "ASC" },
      pageCursor,
      perPage: 100,
    });
    expect(parse(result)).toMatchObject({
      logs: [],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: true,
        nextPageCursor: null,
        previousPageCursor: null,
      },
    });
  });

  describe("relative time range", () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
      [{}, { from: 1700000000 - 3600, to: 1700000000 }],
      [{ lookbackMinutes: 15 }, { from: 1700000000 - 900, to: 1700000000 }],
      [{ to: 1690000000 }, { from: 1690000000 - 3600, to: 1690000000 }],
    ])("searches %j as %j", async (args, expected) => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000 * 1000);
      let requestBody: Record<string, unknown> | undefined;
      mswServer.use(
        http.post(MACKEREL_BASE_URL + "/api/v0/logs", async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            results: [],
            pagination: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          });
        }),
      );

      const result = await callSearchLogs({
        serviceName: "my-service",
        ...args,
      });

      expect(requestBody).toMatchObject(expected);
      expect(parse(result).timeRange).toMatchObject(expected);
    });
  });

  it("returns selected fields with attributes flattened", async () => {
    mswServer.use(
      http.post(MACKEREL_BASE_URL + "/api/v0/logs", () =>
        HttpResponse.json({
          results: [mockLog],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "cursor-1",
            endCursor: "cursor-1",
          },
        }),
      ),
    );

    const result = await callSearchLogs({
      ...baseArgs,
      fields: ["severity", "attributes", "resourceAttributes"],
    });

    expect(parse(result).logs).toEqual([
      {
        severity: "ERROR",
        attributes: { "http.route": "/pay" },
        resourceAttributes: { "host.name": "web-1" },
      },
    ]);
  });

  it("truncates long bodies", async () => {
    mswServer.use(
      http.post(MACKEREL_BASE_URL + "/api/v0/logs", () =>
        HttpResponse.json({
          results: [{ ...mockLog, body: "x".repeat(50) }],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "cursor-1",
            endCursor: "cursor-1",
          },
        }),
      ),
    );

    const result = await callSearchLogs({
      ...baseArgs,
      fields: ["body"],
      maxBodyLength: 10,
    });

    expect(parse(result).logs).toEqual([
      { body: "x".repeat(10), bodyTruncated: true },
    ]);
  });

  it("explains rate limit errors", async () => {
    mswServer.use(
      http.post(
        MACKEREL_BASE_URL + "/api/v0/logs",
        () =>
          new HttpResponse('{"error":{"message":"Too Many Requests"}}', {
            status: 429,
            headers: { "Retry-After": "1" },
          }),
      ),
    );

    const result = await callSearchLogs(baseArgs);
    const text = (result.content as Array<{ text: string }>)[0].text;

    expect(result.isError).toBe(true);
    expect(text).toContain("429");
    expect(text).toContain("Retry-After: 1 seconds");
    expect(text).toContain("1 request per second");
  });
});
