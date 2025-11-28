import { z } from "zod";
import { MackerelClient } from "../client.js";
import {
  buildToolResponse,
  applyPagination,
  PaginationOptions,
} from "./util.js";

interface TraceSpan {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  endTime: number;
  duration?: number;
  attributes?: Record<string, any>;
  events?: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
  status?: {
    code: string;
    message?: string;
  };
  resource?: Record<string, any>;
  scope?: Record<string, any>;
}

interface OptimizedSpan {
  spanId: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  attributes?: Record<string, any>;
  events?: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
  status?: {
    code: string;
    message?: string;
  };
  hasError?: boolean;
}

const AttributeFilterSchema = z.object({
  key: z.string().describe("Attribute key"),
  value: z.string().describe("Attribute value as a string"),
  type: z
    .enum(["string", "int", "double", "bool"])
    .describe("Value data type: string, int, double, or bool"),
  operator: z
    .enum(["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "STARTS_WITH"])
    .describe(
      "Comparison operator. Available operators depend on type: string supports EQ, NEQ, STARTS_WITH; int/double support EQ, GT, GTE, LT, LTE; bool supports EQ, NEQ",
    ),
});

export class TraceTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListTracesToolInput = z.object({
    serviceName: z
      .string()
      .describe(
        "Service name. Corresponds to `service.name` in OpenTelemetry semantic conventions",
      ),
    from: z
      .number()
      .int()
      .positive()
      .describe("Start time for trace search (Unix epoch seconds)"),
    to: z
      .number()
      .int()
      .positive()
      .describe("End time for trace search (Unix epoch seconds)"),
    serviceNamespace: z
      .string()
      .optional()
      .describe(
        "Service namespace. Corresponds to `service.namespace` in OpenTelemetry semantic conventions",
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "Environment name. Corresponds to `deployment.environment` or `deployment.environment.name` in OpenTelemetry semantic conventions",
      ),
    traceId: z
      .string()
      .optional()
      .describe("Filter by trace ID (32-digit hexadecimal string)"),
    spanName: z.string().optional().describe("Filter by span name"),
    version: z
      .string()
      .optional()
      .describe(
        "Version. Corresponds to `service.version` in OpenTelemetry semantic conventions",
      ),
    issueFingerprint: z
      .string()
      .optional()
      .describe("Filter by issue fingerprint"),
    minLatencyMillis: z
      .number()
      .min(0)
      .optional()
      .describe("Minimum latency in milliseconds"),
    maxLatencyMillis: z
      .number()
      .min(0)
      .optional()
      .describe("Maximum latency in milliseconds"),
    attributes: z
      .array(AttributeFilterSchema)
      .optional()
      .describe("Custom attribute filter conditions"),
    resourceAttributes: z
      .array(AttributeFilterSchema)
      .optional()
      .describe("Resource-level attribute filters"),
    page: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Page number (starting from 1). Default is 1"),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of items per page (1-100). Default is 20"),
    order: z
      .object({
        column: z
          .enum(["LATENCY", "START_AT"])
          .describe(
            "Sort column. One of `LATENCY` (trace latency) or `START_AT` (trace timestamp)",
          ),
        direction: z
          .enum(["ASC", "DESC"])
          .describe(
            "Sort order. Either `ASC` (ascending) or `DESC` (descending)",
          ),
      })
      .optional()
      .describe(
        "Sort preferences. Default is { column: 'START_AT', direction: 'DESC' }",
      ),
  });

  listTraces = async ({
    serviceName,
    from,
    to,
    serviceNamespace,
    environment,
    traceId,
    spanName,
    version,
    issueFingerprint,
    minLatencyMillis,
    maxLatencyMillis,
    attributes,
    resourceAttributes,
    page,
    perPage,
    order,
  }: z.infer<typeof TraceTool.ListTracesToolInput>) => {
    return await buildToolResponse(async () => {
      return await this.mackerelClient.listTraces({
        serviceName,
        from,
        to,
        serviceNamespace,
        environment,
        traceId,
        spanName,
        version,
        issueFingerprint,
        minLatencyMillis,
        maxLatencyMillis,
        attributes,
        resourceAttributes,
        page,
        perPage,
        order,
      });
    });
  };

  static GetTraceToolInput = z.object({
    traceId: z.string().describe("The ID of the trace to retrieve"),
    includeAttributes: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to include span attributes. Default is false to reduce response size",
      ),
    includeEvents: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Whether to include span events. Default is true as events contain important error information",
      ),
    limit: z
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .default(20)
      .describe(
        "Maximum number of spans to return per page (default: 20, max: 100)",
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe("Number of spans to skip (default: 0)"),
    duration: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Only return spans with duration (in milliseconds) equal to or greater than this value. Useful for identifying bottlenecks",
      ),
    errorSpansOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If true, only return spans that have errors or status code indicating failure",
      ),
  });

  private optimizeSpan(
    span: TraceSpan,
    includeAttributes: boolean,
    includeEvents: boolean,
  ): OptimizedSpan {
    const duration = span.endTime - span.startTime;
    const hasError = this.hasSpanError(span);

    const optimized: OptimizedSpan = {
      spanId: span.spanId,
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime,
      duration,
      hasError,
    };

    if (includeAttributes) {
      optimized.attributes = span.attributes;
    }

    if (includeEvents) {
      optimized.events = span.events;
    }

    if (span.status && span.status.code.toLowerCase() === "error") {
      optimized.status = span.status;
    }

    return optimized;
  }

  private hasSpanError(span: TraceSpan): boolean {
    if (span.status && span.status.code.toLowerCase() === "error") {
      return true;
    }

    if (span.events) {
      return span.events.some((event) =>
        event.name.toLowerCase().includes("exception"),
      );
    }

    return false;
  }

  private filterAndSortSpans(
    spans: OptimizedSpan[],
    duration?: number,
    errorSpansOnly?: boolean,
  ): OptimizedSpan[] {
    let filtered = spans;

    if (errorSpansOnly) {
      filtered = filtered.filter((span) => span.hasError);
    }

    if (duration !== undefined) {
      filtered = filtered.filter((span) => span.duration >= duration);
    }

    // Sort spans by priority: error spans first, then by duration (longest first)
    // This ensures critical issues (errors) and performance bottlenecks (slow spans) are surfaced at the top
    filtered.sort((a, b) => {
      if (a.hasError && !b.hasError) return -1;
      if (!a.hasError && b.hasError) return 1;
      return b.duration - a.duration;
    });

    return filtered;
  }

  private createPageInfo(
    totalItems: number,
    limit: number,
    offset: number,
  ): {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    currentPage: number;
    totalPages: number;
  } {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      hasNextPage: offset + limit < totalItems,
      hasPrevPage: offset > 0,
      currentPage,
      totalPages,
    };
  }

  getTrace = async ({
    traceId,
    includeAttributes = false,
    includeEvents = true,
    limit = 20,
    offset = 0,
    duration,
    errorSpansOnly = false,
  }: z.infer<typeof TraceTool.GetTraceToolInput>) => {
    return await buildToolResponse(async () => {
      const response = await this.mackerelClient.getTrace(traceId);

      const optimizedSpans = response.spans.map((span: TraceSpan) =>
        this.optimizeSpan(span, includeAttributes, includeEvents),
      );

      const filteredSpans = this.filterAndSortSpans(
        optimizedSpans,
        duration,
        errorSpansOnly,
      );

      const paginatedSpans = applyPagination(filteredSpans, { limit, offset });
      const pageInfo = this.createPageInfo(filteredSpans.length, limit, offset);

      const totalSpans = response.spans.length;
      const hasErrors = paginatedSpans.some(
        (span: OptimizedSpan) => span.hasError,
      );

      let totalDuration = 0;

      if (optimizedSpans.length > 0) {
        const traceStartTime = Math.min(
          ...optimizedSpans.map((s) => s.startTime),
        );
        const traceEndTime = Math.max(...optimizedSpans.map((s) => s.endTime));
        totalDuration = traceEndTime - traceStartTime;
      }

      return {
        traceId,
        summary: {
          totalSpans,
          hasErrors,
          totalDuration,
          pageInfo,
        },
        spans: paginatedSpans,
      };
    });
  };
}
