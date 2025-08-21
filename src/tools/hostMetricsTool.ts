import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class HostMetricsTool {
  constructor(private mackerelClient: MackerelClient) {}

  static GetHostMetricsToolInput = z.object({
    hostId: z.string().describe("Host ID"),
    name: z.string().describe("Metric name（loadavg5, etc.)"),
    from: z
      .number()
      .describe(
        "The start of the time period you want metrics for (unix time)",
      ),
    to: z
      .number()
      .describe("The end of the time period you want metrics for (unix time)"),
  });

  getHostMetrics = async ({
    hostId,
    name,
    from,
    to,
  }: z.infer<typeof HostMetricsTool.GetHostMetricsToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.getHostMetrics(hostId, name, from, to),
    );
  };
}
