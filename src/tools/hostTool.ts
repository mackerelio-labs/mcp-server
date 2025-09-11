import { z } from "zod";
import { MackerelClient } from "../client.js";
import { buildToolResponse } from "./util.js";

export class HostTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListHostsToolInput = z.object({
    service: z.string().optional().describe("Service name"),
    role: z
      .array(z.string())
      .optional()
      .describe(
        "Role names in the service, multiple assignments possible (result will be a unit of the hosts that belong to each role) if service has not been assigned it will be ignored.",
      ),
    name: z.string().optional().describe("Host name"),
    status: z
      .array(z.string())
      .optional()
      .describe(
        "Filters the host status. multiple specifications are possible. defaults are `working` and `standby`.",
      ),
    customIdentifier: z
      .string()
      .optional()
      .describe(
        "An identifier for the host that is user-specific and unique to the organization (registered at Register Host Information or Update Host Information API)",
      ),
    limit: z
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .describe("Maximum number of hosts to return (default: 20, max: 100)"),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Number of hosts to skip (default: 0)"),
  });

  listHosts = async ({
    service,
    role,
    name,
    status,
    customIdentifier,
    limit = 20,
    offset = 0,
  }: z.infer<typeof HostTool.ListHostsToolInput>) => {
    return await buildToolResponse(async () => {
      const result = await this.mackerelClient.getHosts(
        service,
        role,
        name,
        status,
        customIdentifier,
        limit,
        offset,
      );

      return result;
    });
  };
}
