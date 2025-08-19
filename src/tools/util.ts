import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function buildToolResponse(
  fn: () => Promise<unknown>,
): Promise<Awaited<ReturnType<ToolCallback>>> {
  try {
    const result = await fn();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error occurred: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
