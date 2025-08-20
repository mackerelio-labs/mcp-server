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
}
