import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export const ListAlertsToolInput = {
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
};

export const listAlertsTool: ToolCallback<typeof ListAlertsToolInput> = async ({
  withClosed,
  nextId,
  limit,
}) => {
  const searchParams = new URLSearchParams();
  if (withClosed !== undefined) {
    searchParams.append("withClosed", withClosed.toString());
  }
  if (nextId) {
    searchParams.append("nextId", nextId);
  }
  if (limit !== undefined) {
    searchParams.append("limit", limit.toString());
  }

  return await buildToolResponse(
    async () => await mackerelClient.getAlerts(searchParams),
  );
};
