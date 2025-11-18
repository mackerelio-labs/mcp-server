import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class ApmTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListHttpServerStatsToolInput = z.object({
    serviceName: z
      .string()
      .describe(
        "Service name. Corresponds to `service.name` in OpenTelemetry semantic conventions",
      ),
    from: z
      .number()
      .int()
      .positive()
      .describe(
        "Start time for retrieving statistics (Unix epoch seconds). The range between `to` is limited to 30 minutes",
      ),
    to: z
      .number()
      .int()
      .positive()
      .describe(
        "End time for retrieving statistics (Unix epoch seconds). The range between `from` is limited to 30 minutes",
      ),
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
    version: z
      .string()
      .optional()
      .describe(
        "Version. Corresponds to `service.version` in OpenTelemetry semantic conventions",
      ),
    method: z
      .string()
      .optional()
      .describe(
        "Filter by HTTP method. Corresponds to `http.request.method` or `http.method` in OpenTelemetry semantic conventions. `http.request.method` is preferred",
      ),
    route: z
      .string()
      .optional()
      .describe(
        "Filter by route (partial match). Corresponds to `http.route`, `url.path`, `http.target`, or `http.url` in OpenTelemetry semantic conventions. Preferred in this order",
      ),
    orderColumn: z
      .enum(["SUM", "AVERAGE", "P95", "ERROR_RATE", "REQUEST_COUNT"])
      .optional()
      .describe(
        "Sort column. One of `SUM` (total latency), `AVERAGE` (average latency), `P95` (95th percentile latency), `ERROR_RATE` (error rate percentage), or `REQUEST_COUNT` (request count). Default is `P95`",
      ),
    orderDirection: z
      .enum(["ASC", "DESC"])
      .optional()
      .describe(
        "Sort order. Either `ASC` (ascending) or `DESC` (descending). Default is `DESC`",
      ),
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
  });

  listHttpServerStats = async ({
    serviceName,
    from,
    to,
    serviceNamespace,
    environment,
    version,
    method,
    route,
    orderColumn,
    orderDirection,
    page,
    perPage,
  }: z.infer<typeof ApmTool.ListHttpServerStatsToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.getHttpServerStats(
          serviceName,
          from,
          to,
          serviceNamespace,
          environment,
          version,
          method,
          route,
          orderColumn,
          orderDirection,
          page,
          perPage,
        ),
    );
  };

  static ListDbQueryStatsToolInput = z.object({
    serviceName: z
      .string()
      .describe(
        "Service name. Corresponds to `service.name` in OpenTelemetry semantic conventions.",
      ),
    from: z
      .number()
      .int()
      .positive()
      .describe(
        "Start time for retrieving statistics (Unix epoch seconds). The range between `to` is limited to 30 minutes",
      ),
    to: z
      .number()
      .int()
      .positive()
      .describe(
        "End time for retrieving statistics (Unix epoch seconds). The range between `from` is limited to 30 minutes",
      ),
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
    version: z
      .string()
      .optional()
      .describe(
        "Version. Corresponds to `service.version` in OpenTelemetry semantic conventions",
      ),
    query: z
      .string()
      .optional()
      .describe(
        "Filter by SQL query (partial match). Corresponds to `db.query.text` or `db.statement` in OpenTelemetry semantic conventions. db.query.text is preferred",
      ),
    orderColumn: z
      .enum(["SUM", "AVERAGE", "P95", "EXECUTION_COUNT"])
      .optional()
      .describe(
        "Sort column. One of `SUM` (total latency), `AVERAGE` (average latency), `P95` (95th percentile latency), or `EXECUTION_COUNT` (execution count). Default is `P95`.",
      ),
    orderDirection: z
      .enum(["ASC", "DESC"])
      .optional()
      .describe(
        "Sort order. Either `ASC` (ascending) or `DESC` (descending). Default is `DESC`",
      ),
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
  });

  listDbQueryStats = async ({
    serviceName,
    from,
    to,
    serviceNamespace,
    environment,
    version,
    query,
    orderColumn,
    orderDirection,
    page,
    perPage,
  }: z.infer<typeof ApmTool.ListDbQueryStatsToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.getDbQueryStats(
          serviceName,
          from,
          to,
          serviceNamespace,
          environment,
          version,
          query,
          orderColumn,
          orderDirection,
          page,
          perPage,
        ),
    );
  };
}
