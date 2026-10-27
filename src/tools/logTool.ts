import { z } from "zod";
import {
  MackerelClient,
  LogAttribute,
  LogRecord,
  LogPagination,
} from "../client.js";
import { buildToolResponse } from "./util.js";

const SEVERITIES = [
  "UNSPECIFIED",
  "TRACE",
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "FATAL",
] as const;

function flattenAttributes(attributes: LogAttribute[]): Record<string, string> {
  return Object.fromEntries(
    attributes.map(({ key, value }) => [key, value.stringValue]),
  );
}

const LOG_FIELDS = {
  timestamp: (log: LogRecord) => log.timestamp,
  severity: (log: LogRecord) => log.severity,
  severityNumber: (log: LogRecord) => log.severityNumber,
  body: (log: LogRecord) => log.body,
  traceId: (log: LogRecord) => log.traceId,
  spanId: (log: LogRecord) => log.spanId,
  serviceName: (log: LogRecord) => log.serviceName,
  serviceNamespace: (log: LogRecord) => log.serviceNamespace,
  attributes: (log: LogRecord) => flattenAttributes(log.attributes),
  resourceAttributes: (log: LogRecord) =>
    flattenAttributes(log.resourceAttributes),
  scopeAttributes: (log: LogRecord) => flattenAttributes(log.scopeAttributes),
} satisfies Record<string, (log: LogRecord) => unknown>;

type LogField = keyof typeof LOG_FIELDS;

const LOG_FIELD_NAMES = Object.keys(LOG_FIELDS) as [LogField, ...LogField[]];

const DEFAULT_FIELDS: LogField[] = [
  "timestamp",
  "severity",
  "body",
  "traceId",
  "spanId",
];

const MAX_LOOKBACK_MINUTES = 30 * 24 * 60;

function toTimeRange(from: number, to: number) {
  return {
    from,
    to,
    fromTime: new Date(from * 1000).toISOString(),
    toTime: new Date(to * 1000).toISOString(),
  };
}

const PageCursorSchema = z.object({
  direction: z
    .enum(["NEXT", "PREVIOUS"])
    .describe(
      "NEXT returns logs after the cursor in sort order, PREVIOUS returns logs before it",
    ),
  cursor: z.string().describe("Cursor string returned by a previous call"),
  from: z
    .number()
    .int()
    .positive()
    .describe("Start time of the search the cursor belongs to"),
  to: z
    .number()
    .int()
    .positive()
    .describe("End time of the search the cursor belongs to"),
});

const bodyAttributeFilter = <T extends string, O extends [string, ...string[]]>(
  type: T,
  operators: O,
) =>
  z.object({
    keyPath: z
      .array(z.string())
      .min(1)
      .describe(
        'Path to the field in a JSON log body, e.g. ["req", "method"] for {"req": {"method": "GET"}}',
      ),
    value: z.string().describe("Value to compare, always given as a string"),
    type: z.literal(type).describe("Value data type"),
    operator: z
      .enum(operators)
      .describe(`Comparison operator for ${type}: ${operators.join(", ")}`),
  });

const BodyAttributeFilterSchema = z.discriminatedUnion("type", [
  bodyAttributeFilter("string", ["EQ", "NEQ", "STARTS_WITH"]),
  bodyAttributeFilter("int", ["EQ", "GT", "GTE", "LT", "LTE"]),
  bodyAttributeFilter("double", ["EQ", "GT", "GTE", "LT", "LTE"]),
  bodyAttributeFilter("bool", ["EQ", "NEQ"]),
]);

const ERROR_HINTS: Record<number, string> = {
  400: "Check that `to` is not earlier than `from`, the range is 30 days or less, and `traceId` / `bodyAttributes` are well-formed (e.g. operator is supported for the type).",
  403: "Logs may not be enabled for this organization, or the API key lacks read permission.",
  429: "Rate limit is 1 request per second. Wait for the Retry-After period before calling again, and avoid fetching pages in rapid succession.",
};

function withErrorHint(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const status = Number(message.match(/Mackerel API error: (\d{3})/)?.[1]);
  const hint = ERROR_HINTS[status];
  return new Error(hint ? `${message}\nHint: ${hint}` : message);
}

function toPageCursor(
  direction: "NEXT" | "PREVIOUS",
  available: boolean,
  cursor: string | null,
  timeRange: { from: number; to: number },
) {
  return available && cursor
    ? { direction, cursor, from: timeRange.from, to: timeRange.to }
    : null;
}

export class LogTool {
  constructor(private mackerelClient: MackerelClient) {}

  static SearchLogsToolInput = z.object({
    serviceName: z.string().describe("Service name"),
    serviceNamespace: z.string().optional().describe("Service namespace"),
    from: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Start time (Unix epoch seconds, inclusive). Defaults to `lookbackMinutes` before `to`",
      ),
    to: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "End time (Unix epoch seconds, exclusive). Defaults to the current time. The range from `from` must be 30 days or less",
      ),
    lookbackMinutes: z
      .number()
      .int()
      .min(1)
      .max(MAX_LOOKBACK_MINUTES)
      .optional()
      .default(60)
      .describe(
        "When `from` is omitted, search this many minutes before `to` (default 60). Use this for relative ranges such as 'the last 15 minutes' without knowing the current time",
      ),
    keywords: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe(
        "Keywords that must all appear in the log body (partial match, AND)",
      ),
    severities: z
      .array(z.enum(SEVERITIES))
      .min(1)
      .optional()
      .describe("Severities to include (OR)"),
    traceId: z
      .string()
      .optional()
      .describe("Only logs associated with this trace ID (32-digit hex)"),
    bodyAttributes: z
      .array(BodyAttributeFilterSchema)
      .min(1)
      .optional()
      .describe(
        "Filters on fields of JSON log bodies (AND). Logs whose body is not JSON never match",
      ),
    order: z
      .enum(["ASC", "DESC"])
      .optional()
      .describe("Sort order by timestamp. Default is DESC (newest first)"),
    pageCursor: PageCursorSchema.optional().describe(
      "Pass `pagination.nextPageCursor` or `pagination.previousPageCursor` from a previous response as-is. The cursor carries the time range, so `from`, `to` and `lookbackMinutes` are ignored. Keep the filters and `order` unchanged between pages",
    ),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .default(20)
      .describe("Number of logs per page (1-1000). Default is 20"),
    fields: z
      .array(z.enum(LOG_FIELD_NAMES))
      .min(1)
      .optional()
      .describe(
        `Fields to include for each log. Default is ${JSON.stringify(DEFAULT_FIELDS)}. Attribute fields are returned as {key: value} objects`,
      ),
    maxBodyLength: z
      .number()
      .int()
      .positive()
      .optional()
      .default(1000)
      .describe(
        "Truncate each log body to this many characters (default 1000). Truncated logs have `bodyTruncated: true`",
      ),
  });

  searchLogs = async ({
    serviceName,
    serviceNamespace,
    from,
    to = Math.floor(Date.now() / 1000),
    lookbackMinutes = 60,
    keywords,
    severities,
    traceId,
    bodyAttributes,
    order,
    pageCursor,
    perPage = 20,
    fields = DEFAULT_FIELDS,
    maxBodyLength = 1000,
  }: z.infer<typeof LogTool.SearchLogsToolInput>) => {
    const timeRange = pageCursor
      ? toTimeRange(pageCursor.from, pageCursor.to)
      : toTimeRange(from ?? to - lookbackMinutes * 60, to);
    return await buildToolResponse(async () => {
      const response = await this.mackerelClient
        .searchLogs({
          serviceName,
          serviceNamespace,
          from: timeRange.from,
          to: timeRange.to,
          keywords,
          severities,
          traceId,
          bodyAttributes,
          order: order ? { column: "TIMESTAMP", direction: order } : undefined,
          pageCursor: pageCursor && {
            direction: pageCursor.direction,
            cursor: pageCursor.cursor,
          },
          perPage,
        })
        .catch((error) => {
          throw withErrorHint(error);
        });

      return {
        timeRange,
        logs: response.results.map((log) =>
          this.projectLog(log, fields, maxBodyLength),
        ),
        pagination: this.buildPagination(response.pagination, timeRange),
      };
    }, "search_logs");
  };

  private projectLog(
    log: LogRecord,
    fields: LogField[],
    maxBodyLength: number,
  ): Record<string, unknown> {
    const projected: Record<string, unknown> = Object.fromEntries(
      fields.map((field) => [field, LOG_FIELDS[field](log)]),
    );
    if (fields.includes("body") && log.body.length > maxBodyLength) {
      projected.body = log.body.slice(0, maxBodyLength);
      projected.bodyTruncated = true;
    }
    return projected;
  }

  private buildPagination(
    pagination: LogPagination,
    timeRange: { from: number; to: number },
  ) {
    return {
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
      nextPageCursor: toPageCursor(
        "NEXT",
        pagination.hasNextPage,
        pagination.endCursor,
        timeRange,
      ),
      previousPageCursor: toPageCursor(
        "PREVIOUS",
        pagination.hasPreviousPage,
        pagination.startCursor,
        timeRange,
      ),
    };
  }
}
