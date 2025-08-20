import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class AlertTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListAlertsToolInput = z.object({
    withClosed: z
      .boolean()
      .optional()
      .describe(
        "Whether or not to get resolved alerts. If true, resolved alerts as well as open alerts are retrieved",
      ),
    nextId: z
      .string()
      .optional()
      .describe(
        "If specified, alerts older than the alert with the specified id are retrieved",
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "The maximum number of alerts to retrieve. When omitted, up to 100 cases are retrieved. The most that can be specified is 100",
      ),
  });

  listAlerts = async ({
    withClosed,
    nextId,
    limit,
  }: z.infer<typeof AlertTool.ListAlertsToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.getAlerts(withClosed, nextId, limit),
    );
  };

  static GetAlertToolInput = z.object({
    alertId: z.string().describe("The ID of the alert to retrieve"),
  });

  getAlert = async ({
    alertId,
  }: z.infer<typeof AlertTool.GetAlertToolInput>) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getAlert(alertId),
    );
  };

  static GetAlertLogsToolInput = z.object({
    alertId: z.string().describe("The ID of the alert to retrieve logs for"),
    nextId: z
      .string()
      .optional()
      .describe(
        "If specified, alert logs older than the specified are retrieved",
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "The maximum number of alert logs to retrieve. When omitted, up to 100 logs are retrieved. The most that can be specified is 100",
      ),
  });

  getAlertLogs = async ({
    alertId,
    nextId,
    limit,
  }: z.infer<typeof AlertTool.GetAlertLogsToolInput>) => {
    return await buildToolResponse(
      async () =>
        await this.mackerelClient.getAlertLogs(alertId, nextId, limit),
    );
  };
}
