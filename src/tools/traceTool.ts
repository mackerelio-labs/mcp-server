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

export class TraceTool {
  constructor(private mackerelClient: MackerelClient) {}

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

    if (includeEvents && span.events && span.events.length > 0) {
      optimized.events = span.events;
    }

    if (span.status && (span.status.code !== "OK" || span.status.message)) {
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

      let traceStartTime = 0;
      let traceEndTime = 0;
      let totalDuration = 0;

      if (paginatedSpans.length > 0) {
        traceStartTime = Math.min(...paginatedSpans.map((s) => s.startTime));
        traceEndTime = Math.max(...paginatedSpans.map((s) => s.endTime));
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
