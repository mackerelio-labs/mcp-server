import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

const LogSeveritySchema = z.enum([
  "UNSPECIFIED",
  "TRACE",
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "FATAL",
]);

const LogAttributeComparisonSchema = z
  .object({
    key: z.string().describe("Attribute key"),
    value: z
      .object({
        value: z.string().describe("String value to compare"),
        operator: z
          .enum(["EQ", "NEQ", "PREFIX"])
          .describe("Comparison operator for string values"),
      })
      .optional()
      .describe("String comparison condition"),
    valueInt: z
      .object({
        valueInt: z.number().int().describe("Integer value to compare"),
        operator: z
          .enum(["EQ", "GT", "GTE", "LT", "LTE"])
          .describe("Comparison operator for integer values"),
      })
      .optional()
      .describe("Integer comparison condition"),
    valueDouble: z
      .object({
        valueDouble: z.number().describe("Double value to compare"),
        operator: z
          .enum(["EQ", "GT", "GTE", "LT", "LTE"])
          .describe("Comparison operator for double values"),
      })
      .optional()
      .describe("Double comparison condition"),
    valueBool: z
      .object({
        valueBool: z.boolean().describe("Boolean value to compare"),
        operator: z
          .enum(["EQ", "NEQ"])
          .describe("Comparison operator for boolean values"),
      })
      .optional()
      .describe("Boolean comparison condition"),
  })
  .refine(
    (attr) =>
      [attr.value, attr.valueInt, attr.valueDouble, attr.valueBool].filter(
        (v) => v !== undefined,
      ).length === 1,
    {
      message:
        "Exactly one of value, valueInt, valueDouble, or valueBool must be set",
    },
  );

export class LogTool {
  constructor(private mackerelClient: MackerelClient) {}

  static FindLogsToolInput = z.object({
    serviceName: z
      .string()
      .describe(
        "Service name. Corresponds to `service.name` in OpenTelemetry semantic conventions",
      ),
    from: z
      .number()
      .int()
      .positive()
      .describe("Start time for log search (Unix epoch seconds)"),
    to: z
      .number()
      .int()
      .positive()
      .describe("End time for log search (Unix epoch seconds)"),
    serviceNamespace: z
      .string()
      .optional()
      .describe(
        "Service namespace. Corresponds to `service.namespace` in OpenTelemetry semantic conventions",
      ),
    keywords: z
      .array(z.string())
      .optional()
      .describe(
        "Keywords to search for in the log body. When multiple keywords are given, logs must match all of them (AND condition)",
      ),
    severities: z
      .array(LogSeveritySchema)
      .optional()
      .describe("Filter logs by severity"),
    attributes: z
      .array(LogAttributeComparisonSchema)
      .optional()
      .describe(
        "Custom attribute filter conditions. Each entry must set exactly one of value, valueInt, valueDouble, or valueBool",
      ),
    traceId: z
      .string()
      .optional()
      .describe("Filter by trace ID (32-digit hexadecimal string)"),
    order: z
      .object({
        column: z
          .enum(["TIMESTAMP"])
          .describe("Sort column. Currently only `TIMESTAMP` is supported"),
        direction: z
          .enum(["ASC", "DESC"])
          .describe(
            "Sort order. Either `ASC` (ascending) or `DESC` (descending)",
          ),
      })
      .optional()
      .describe(
        "Sort preferences. Default is { column: 'TIMESTAMP', direction: 'DESC' }",
      ),
    first: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Number of logs to fetch from the beginning. Cannot be used together with `last`/`before`. Default is 50",
      ),
    after: z
      .string()
      .optional()
      .describe(
        "Cursor to fetch logs after (for forward pagination together with `first`)",
      ),
    last: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Number of logs to fetch from the end. Cannot be used together with `first`/`after`",
      ),
    before: z
      .string()
      .optional()
      .describe(
        "Cursor to fetch logs before (for backward pagination together with `last`)",
      ),
  });

  findLogs = async ({
    serviceName,
    from,
    to,
    serviceNamespace,
    keywords,
    severities,
    attributes,
    traceId,
    order,
    first,
    after,
    last,
    before,
  }: z.infer<typeof LogTool.FindLogsToolInput>) => {
    return await buildToolResponse(async () => {
      return await this.mackerelClient.findLogs({
        serviceName,
        from,
        to,
        serviceNamespace,
        keywords,
        severities,
        attributes,
        traceId,
        order,
        first,
        after,
        last,
        before,
      });
    });
  };
}
