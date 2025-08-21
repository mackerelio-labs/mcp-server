import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class MonitorTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListMonitorsToolInput = z.object({});

  listMonitors = async ({}: z.infer<
    typeof MonitorTool.ListMonitorsToolInput
  >) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getMonitors(),
    );
  };

  static GetMonitorToolInput = z.object({
    monitorId: z.string().describe("Monitor ID"),
  });

  getMonitor = async ({
    monitorId,
  }: z.infer<typeof MonitorTool.GetMonitorToolInput>) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getMonitor(monitorId),
    );
  };
}
