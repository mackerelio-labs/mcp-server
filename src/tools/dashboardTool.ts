import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class DashboardTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListDashboardsToolInput = z.object({});

  listDashboards = async ({}: z.infer<
    typeof DashboardTool.ListDashboardsToolInput
  >) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getDashboards(),
    );
  };

  static GetDashboardToolInput = z.object({
    dashboardId: z.string().describe("The ID of the dashboard to retrieve"),
  });

  getDashboard = async ({
    dashboardId,
  }: z.infer<typeof DashboardTool.GetDashboardToolInput>) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getDashboard(dashboardId),
    );
  };

  static LayoutSchema = z.object({
    x: z.number().describe("X coordinate of widget"),
    y: z.number().describe("Y coordinate of widget"),
    width: z.number().describe("Width of widget"),
    height: z.number().describe("Height of widget"),
  });

  static RangeSchema = z.union([
    z.object({
      type: z.literal("relative").describe("Relative time range"),
      period: z.number().describe("Length of the period (in seconds)"),
      offset: z
        .number()
        .describe("Difference from the current time (in seconds)"),
    }),
    z.object({
      type: z.literal("absolute").describe("Absolute time range"),
      start: z.number().describe("Start time (in epoch seconds)"),
      end: z.number().describe("End time (in epoch seconds)"),
    }),
    z.object({
      min: z.number().optional().describe("Minimum value on vertical axis"),
      max: z.number().optional().describe("Maximum value on vertical axis"),
    }),
  ]);

  static ValueRangeSchema = z.object({
    min: z.number().optional().describe("Minimum value on vertical axis"),
    max: z.number().optional().describe("Maximum value on vertical axis"),
  });

  static GraphSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("host").describe("Host graph"),
      hostId: z.string().describe("Host ID"),
      name: z.string().describe("Graph name (e.g., loadavg, cpu)"),
    }),
    z.object({
      type: z.literal("role").describe("Role graph"),
      roleFullname: z
        .string()
        .describe("The service name and role name linked with `:`"),
      name: z.string().describe("Graph name"),
      isStacked: z
        .boolean()
        .optional()
        .describe("Whether the graph is stacked or line graph"),
    }),
    z.object({
      type: z.literal("service").describe("Service graph"),
      serviceName: z.string().describe("Service name"),
      name: z.string().describe("Graph name"),
    }),
    z.object({
      type: z.literal("expression").describe("Expression graph"),
      expression: z.string().describe("Expression representing a graph"),
    }),
    z.object({
      type: z.literal("query").describe("Query graph"),
      query: z.string().describe("PromQL-style queries"),
      legend: z
        .string()
        .optional()
        .describe(
          'Query legend. by specifiying the label key  in `{{ }}`, it can be expanded to the value of the label. e.g. if you have a label `{ http.method: "GET" }` and you specify `method: {{http.method}}` in the `legend`, it will expand to `method: GET`.',
        ),
    }),
    z.object({
      type: z.literal("unknown").describe("Unknown graph"),
    }),
  ]);

  static ReferenceLineSchema = z.object({
    label: z.string().describe("Label of the reference line"),
    value: z.number().describe("Value of the reference line"),
  });

  static MetricSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("host").describe("Host metric"),
      hostId: z.string().describe("Host ID"),
      name: z.string().describe("The name of the metric (`loadavg5` etc)"),
    }),
    z.object({
      type: z.literal("service").describe("Service metric"),
      serviceName: z.string().describe("The name of the service"),
      name: z.string().describe("The name of the metric"),
    }),
    z.object({
      type: z.literal("expression").describe("Expression metric"),
      expression: z.string().describe("An expression that represents a metric"),
    }),
    z.object({
      type: z.literal("query").describe("Query metric"),
      query: z.string().describe("PromQL-style queries"),
      legend: z
        .string()
        .describe(
          'Query legend. by specifying the label key  in `{{ }}`, it can be expanded to the value of the label. e.g. if you have a label `{ http.method: "GET" }` and you specify `method: {{http.method}}` in the `legend`, it will expand to `method: GET`',
        ),
    }),
    z.object({
      type: z
        .literal("unknown")
        .describe("Unknown metric type (fallback when source is deleted)"),
    }),
  ]);

  static FormatRuleSchema = z.object({
    name: z.string().optional().describe("Name of the format rule"),
    threshold: z.number().describe("Base value of the conditional expression"),
    operator: z
      .enum([">", "<"])
      .describe(
        "Specify the conditions under which the emphasized style will be applied.",
      ),
  });

  static WidgetSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("graph").describe("Graph widget"),
      title: z.string().describe("The title of the widget"),
      graph: DashboardTool.GraphSchema.describe("Object representing a graph"),
      range: DashboardTool.RangeSchema.optional().describe(
        "Object representing the graph display range",
      ),
      valueRange: DashboardTool.ValueRangeSchema.optional().describe(
        "Object representing the value range of vertical axis",
      ),
      referenceLines: z
        .array(DashboardTool.ReferenceLineSchema)
        .optional()
        .describe(
          "Array of objects representing the reference line. If you want to remove the reference line setting, specify an empty array. If reference line is not set when get dashboards, an empty array is returned. Cannot specify more than one element in an array.",
        ),
      layout: DashboardTool.LayoutSchema.describe(
        "Object representing the layout",
      ),
    }),
    z.object({
      type: z.literal("value").describe("Value widget"),
      title: z.string().describe("The title of the widget"),
      metric: DashboardTool.MetricSchema.describe(
        "Object representing a metric",
      ),
      fractionSize: z
        .number()
        .optional()
        .describe("Decimal places displayed on the widget (0–16)"),
      suffix: z
        .string()
        .optional()
        .describe("The units to be displayed after the value"),
      formatRules: z
        .array(DashboardTool.FormatRuleSchema)
        .optional()
        .describe(
          "Array of objects representing the format rule. If you want to remove the format rule setting, specify an empty array. If format rule is not set when get dashboards, an empty array is returned. Cannot specify more than one element in an array.",
        ),
      layout: DashboardTool.LayoutSchema.describe(
        "Object representing the layout",
      ),
    }),
    z.object({
      type: z.literal("markdown").describe("Markdown widget"),
      title: z.string().describe("The title of the widget"),
      markdown: z.string().describe("A character string in Markdown format"),
      layout: DashboardTool.LayoutSchema.describe(
        "Object representing the layout",
      ),
    }),
    z.object({
      type: z.literal("alertStatus").describe("Alert status widget"),
      title: z.string().describe("The title of the widget"),
      roleFullname: z
        .string()
        .describe(
          "The service name and role name linked by `:`.However, if the relevant role or service has been deleted when the dashboard is retrieved, `roleFullname` will be set as `null`. ",
        ),
      layout: DashboardTool.LayoutSchema.describe(
        "Object representing the layout",
      ),
    }),
  ]);

  static UpdateDashboardToolInput = z.object({
    dashboardId: z.string().describe("The ID of the dashboard to update"),
    title: z.string().describe("Dashboard name"),
    memo: z.string().describe("Dashboard notes"),
    urlPath: z.string().describe("Dashboard URL path"),
    widgets: z
      .array(DashboardTool.WidgetSchema)
      .describe("List of widget objects"),
  });

  updateDashboard = async ({
    dashboardId,
    title,
    memo,
    urlPath,
    widgets,
  }: z.infer<typeof DashboardTool.UpdateDashboardToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.updateDashboard(dashboardId, {
          title,
          memo,
          urlPath,
          widgets,
        }),
    );
  };
}
