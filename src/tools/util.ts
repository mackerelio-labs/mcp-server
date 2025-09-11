import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SummaryOptions {
  summary?: boolean;
}

export function applyPagination<T extends any[]>(
  items: T,
  options: PaginationOptions,
): T {
  const { limit = 20, offset = 0 } = options;
  return items.slice(offset, offset + limit) as T;
}

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
