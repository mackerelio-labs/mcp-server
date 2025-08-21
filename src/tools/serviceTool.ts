import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class ServiceTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListServicesToolInput = z.object({});

  listServices = async (
    _: z.infer<typeof ServiceTool.ListServicesToolInput>,
  ) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getServices(),
    );
  };
}
