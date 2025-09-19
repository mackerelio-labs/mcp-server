import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

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
    maxSpans: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .default(100)
      .describe(
        "Maximum number of spans to return. Default is 100 to manage response size",
      ),
    filterByDuration: z
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

    if (includeAttributes && span.attributes) {
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
    if (span.status && span.status.code !== "OK") {
      return true;
    }

    if (span.events) {
      return span.events.some(
        (event) =>
          event.name.toLowerCase().includes("error") ||
          event.name.toLowerCase().includes("exception"),
      );
    }

    return false;
  }

  private filterSpans(
    spans: OptimizedSpan[],
    maxSpans: number,
    filterByDuration?: number,
    errorSpansOnly?: boolean,
  ): OptimizedSpan[] {
    let filtered = spans;

    if (errorSpansOnly) {
      filtered = filtered.filter((span) => span.hasError);
    }

    if (filterByDuration !== undefined) {
      filtered = filtered.filter((span) => span.duration >= filterByDuration);
    }

    filtered.sort((a, b) => {
      if (a.hasError && !b.hasError) return -1;
      if (!a.hasError && b.hasError) return 1;
      return b.duration - a.duration;
    });

    return filtered.slice(0, maxSpans);
  }

  getTrace = async ({
    traceId,
    includeAttributes = false,
    includeEvents = true,
    maxSpans = 100,
    filterByDuration,
    errorSpansOnly = false,
  }: z.infer<typeof TraceTool.GetTraceToolInput>) => {
    return await buildToolResponse(async () => {
      const response = await this.mackerelClient.getTrace(traceId);

      const optimizedSpans = response.spans.map((span: TraceSpan) =>
        this.optimizeSpan(span, includeAttributes, includeEvents),
      );

      const filteredSpans = this.filterSpans(
        optimizedSpans,
        maxSpans,
        filterByDuration,
        errorSpansOnly,
      );

      const totalSpans = response.spans.length;
      const returnedSpans = filteredSpans.length;
      const hasErrors = filteredSpans.some((span) => span.hasError);

      const traceStartTime = Math.min(...filteredSpans.map((s) => s.startTime));
      const traceEndTime = Math.max(...filteredSpans.map((s) => s.endTime));
      const totalDuration = traceEndTime - traceStartTime;

      return {
        traceId,
        summary: {
          totalSpans,
          returnedSpans,
          hasErrors,
          totalDuration,
          filters: {
            includeAttributes,
            includeEvents,
            maxSpans,
            filterByDuration,
            errorSpansOnly,
          },
        },
        spans: filteredSpans,
      };
    });
  };
}
