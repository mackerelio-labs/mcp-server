import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SummaryOptions {
  summary?: boolean;
}

const TOKEN_LIMIT = 25000;
const CHARS_PER_TOKEN = 4;

export function applyPagination<T extends any[]>(
  items: T,
  options: PaginationOptions,
): T {
  const { limit = 20, offset = 0 } = options;
  return items.slice(offset, offset + limit) as T;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function createTokenLimitErrorMessage(estimatedTokens: number): string {
  return `Response too large (estimated ${estimatedTokens.toLocaleString()} tokens, limit ${TOKEN_LIMIT.toLocaleString()} tokens). Please resolve this by:
- Using the limit parameter to reduce the number of items returned
- Using offset or nextId parameters for pagination
- Applying more specific filters to narrow down the results`;
}

export async function buildToolResponse(
  fn: () => Promise<unknown>,
): Promise<Awaited<ReturnType<ToolCallback>>> {
  try {
    const result = await fn();
    const jsonText = JSON.stringify(result);
    const estimatedTokens = estimateTokenCount(jsonText);

    if (estimatedTokens > TOKEN_LIMIT) {
      return {
        content: [
          {
            type: "text",
            text: createTokenLimitErrorMessage(estimatedTokens),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: jsonText,
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
