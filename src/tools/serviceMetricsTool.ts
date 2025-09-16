import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class ServiceMetricsTool {
  constructor(private mackerelClient: MackerelClient) {}

  static GetServiceMetricsToolInput = z.object({
    serviceName: z.string().describe("Service name"),
    name: z.string().describe("Metric name"),
    from: z
      .number()
      .describe(
        "The start of the time period you want metrics for (unix time)",
      ),
    to: z
      .number()
      .describe("The end of the time period you want metrics for (unix time)"),
  });

  getServiceMetrics = async ({
    serviceName,
    name,
    from,
    to,
  }: z.infer<typeof ServiceMetricsTool.GetServiceMetricsToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.getServiceMetrics(
          serviceName,
          name,
          from,
          to,
        ),
      "get_service_metrics",
    );
  };
}
