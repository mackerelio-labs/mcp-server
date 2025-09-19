import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { TraceTool } from "./traceTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Trace Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const traceTool = new TraceTool(mackerelClient);

  const mockTraceData = {
    spans: [
      {
        traceId: "trace123",
        spanId: "span1",
        name: "HTTP GET /api/users",
        startTime: 1600000000000,
        endTime: 1600000000500,
        attributes: {
          "http.method": "GET",
          "http.url": "/api/users",
          "http.status_code": 200,
        },
        events: [
          {
            name: "request.start",
            timestamp: 1600000000100,
            attributes: { user_id: "12345" },
          },
        ],
        status: { code: "OK" },
        resource: { service: "user-service" },
        scope: { name: "http-tracer" },
      },
      {
        traceId: "trace123",
        spanId: "span2",
        name: "Database Query",
        startTime: 1600000000200,
        endTime: 1600000000800,
        attributes: {
          "db.statement": "SELECT * FROM users",
          "db.type": "postgresql",
        },
        events: [
          {
            name: "exception",
            timestamp: 1600000000300,
            attributes: {
              "exception.type": "DatabaseError",
              "exception.message": "Connection timeout",
            },
          },
        ],
        status: { code: "ERROR (2)", message: "Database connection failed" },
        resource: { service: "database-service" },
        scope: { name: "db-tracer" },
      },
      {
        traceId: "trace123",
        spanId: "span3",
        name: "Cache lookup",
        startTime: 1600000000050,
        endTime: 1600000000080,
        attributes: {
          "cache.key": "user:12345",
        },
        events: [],
        status: { code: "OK" },
        resource: { service: "cache-service" },
        scope: { name: "cache-tracer" },
      },
    ],
  };

  it("should retrieve and optimize trace data with default settings", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.traceId).toBe("trace123");
    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.summary.hasErrors).toBe(true);
    expect(responseData.summary.pageInfo.totalPages).toBe(1);
    expect(responseData.summary.pageInfo.currentPage).toBe(1);
    expect(responseData.summary.pageInfo.hasNextPage).toBe(false);
    expect(responseData.summary.pageInfo.hasPrevPage).toBe(false);
    expect(responseData.spans).toHaveLength(3);

    // Check optimization: should include events but not attributes by default
    const spanWithEvents = responseData.spans.find(
      (s: any) => s.spanId === "span2",
    );
    expect(spanWithEvents.events).toBeDefined();
    expect(spanWithEvents.attributes).toBeUndefined();
    expect(spanWithEvents.hasError).toBe(true);
    expect(spanWithEvents.duration).toBe(600);
  });

  it("should filter spans by duration", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        filterByDuration: 400,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.spans).toHaveLength(2);

    // Should include the 500ms and 600ms spans, but not the 30ms cache span
    const spanIds = responseData.spans.map((s: any) => s.spanId);
    expect(spanIds).toContain("span1");
    expect(spanIds).toContain("span2");
    expect(spanIds).not.toContain("span3");
  });

  it("should return only error spans when errorSpansOnly is true", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        errorSpansOnly: true,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.spans).toHaveLength(1);
    expect(responseData.spans[0].spanId).toBe("span2");
    expect(responseData.spans[0].hasError).toBe(true);
  });

  it("should include attributes when requested", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        includeAttributes: true,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    const spanWithAttributes = responseData.spans.find(
      (s: any) => s.spanId === "span1",
    );
    expect(spanWithAttributes.attributes).toBeDefined();
    expect(spanWithAttributes.attributes["http.method"]).toBe("GET");
  });

  it("should exclude events when requested", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        includeEvents: false,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    responseData.spans.forEach((span: any) => {
      expect(span.events).toBeUndefined();
    });
  });

  it("should respect pagination limit", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        limit: 2,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.spans).toHaveLength(2);
    expect(responseData.summary.pageInfo.totalPages).toBe(2);
    expect(responseData.summary.pageInfo.currentPage).toBe(1);
    expect(responseData.summary.pageInfo.hasNextPage).toBe(true);
    expect(responseData.summary.pageInfo.hasPrevPage).toBe(false);

    // Should prioritize error spans and then longest duration
    expect(responseData.spans[0].hasError).toBe(true); // Error span first
    expect(responseData.spans[0].spanId).toBe("span2");
  });

  it("should support pagination with offset", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    // Get second page (offset=1, limit=1)
    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        limit: 1,
        offset: 1,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.spans).toHaveLength(1);
    expect(responseData.summary.pageInfo.totalPages).toBe(3);
    expect(responseData.summary.pageInfo.currentPage).toBe(2);
    expect(responseData.summary.pageInfo.hasNextPage).toBe(true);
    expect(responseData.summary.pageInfo.hasPrevPage).toBe(true);

    // Should get the second span in sorted order (span1 - 500ms duration)
    expect(responseData.spans[0].spanId).toBe("span1");
  });

  it("should handle pagination beyond available spans", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    // Try to get page beyond available data
    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        limit: 10,
        offset: 100,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.spans).toHaveLength(0);
    expect(responseData.summary.pageInfo.totalPages).toBe(1);
    expect(responseData.summary.pageInfo.currentPage).toBe(11);
    expect(responseData.summary.pageInfo.hasNextPage).toBe(false);
    expect(responseData.summary.pageInfo.hasPrevPage).toBe(true);
  });

  it("should combine filtering and pagination correctly", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/trace123", () => {
        return HttpResponse.json(mockTraceData);
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    // Filter by duration >= 400ms and paginate
    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "trace123",
        filterByDuration: 400,
        limit: 1,
        offset: 0,
      },
    });

    const responseData = JSON.parse(result.content[0].text as string);

    expect(responseData.summary.totalSpans).toBe(3);
    expect(responseData.spans).toHaveLength(1);
    expect(responseData.summary.pageInfo.totalPages).toBe(2);
    expect(responseData.summary.pageInfo.currentPage).toBe(1);
    expect(responseData.summary.pageInfo.hasNextPage).toBe(true);
    expect(responseData.summary.pageInfo.hasPrevPage).toBe(false);

    // Should get the error span first (span2 - 600ms duration)
    expect(responseData.spans[0].spanId).toBe("span2");
    expect(responseData.spans[0].hasError).toBe(true);
  });

  it("should handle 404 error", async () => {
    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/traces/nonexistent", () => {
        return HttpResponse.json({ error: "Trace not found" }, { status: 404 });
      }),
    );

    const server = setupServer(
      "get_trace",
      { inputSchema: TraceTool.GetTraceToolInput.shape },
      traceTool.getTrace,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "get_trace",
      arguments: {
        traceId: "nonexistent",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Mackerel API error: 404");
  });
});
