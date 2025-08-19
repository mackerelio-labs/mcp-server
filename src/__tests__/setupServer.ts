import {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodRawShape } from "zod";

export function setupServer<InputArgs extends ZodRawShape>(
  name: string,
  config: {
    title?: string;
    description?: string;
    inputSchema?: InputArgs;
  },
  cb: ToolCallback<InputArgs>,
): McpServer {
  const server = new McpServer({
    name: "mackerel",
    version: "0.0.1",
  });
  server.registerTool(name, config, cb);

  return server;
}
