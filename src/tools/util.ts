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

function getAvailableHostMetrics(): string {
  return `
## Available Host Metrics:
- **loadavg**: loadavg1, loadavg5, loadavg15
- **cpu**: cpu.user.percentage, cpu.system.percentage, cpu.idle.percentage, cpu.iowait.percentage, cpu.nice.percentage, cpu.irq.percentage, cpu.softirq.percentage, cpu.steal.percentage, cpu.guest.percentage
- **memory**: memory.used, memory.available, memory.total, memory.swap_used, memory.swap_cached, memory.swap_total (Kernel 3.14+)
  - For older Linux: memory.free, memory.buffers, memory.cached, memory.used, memory.total, memory.swap_used, memory.swap_cached, memory.swap_total
- **disk**: disk.*.reads.delta, disk.*.writes.delta (replace * with device name)
- **interface**: interface.*.rxBytes.delta, interface.*.txBytes.delta (replace * with interface name)
- **filesystem**: filesystem.*.size, filesystem.*.used (replace * with mount point)`;
}

function getAvailableServiceMetrics(): string {
  return `
## Available Service Metrics:
- Custom metrics posted to your service via mackerel-agent or API
- Check your service configuration for available metric names
- Common patterns: response_time, throughput, error_rate, custom.metric_name`;
}

function getHostMetrics404ErrorMessage(originalError: string): string {
  const lowerError = originalError.toLowerCase();

  if (lowerError.includes("host not found")) {
    return `## Host Not Found

Your request failed because the specified hostId does not exist in your Mackerel organization.

## Error Summary
${originalError}

## Possible Causes
- The hostId does not exist in your Mackerel organization
- The host may have been deleted or decommissioned
- There may be a typo in the hostId

## Resolving Host Issues
- Use the list_hosts tool to find valid host IDs
- Check for typos in the hostId
- Verify the host hasn't been deleted from your organization
- Ensure you have the correct permissions to access this host`;
  }

  if (lowerError.includes("metric not found")) {
    return `## Metric Not Found

Your request failed because the specified metric name is invalid or not available for this host.

## Error Summary
${originalError}

## Possible Causes
- The metric name contains typos or incorrect format
- The metric may not be available on this host
- The metric collection may not be enabled

## Resolving Metric Issues
- Check for typos in the metric name
- Verify the metric is available on this host type

${getAvailableHostMetrics()}

## Valid Metric Name Examples
- loadavg5, cpu.user.percentage, memory.used, disk.sda.reads.delta`;
  }

  // Generic 404 message for other cases
  return `## Resource Not Found: Invalid Host or Metric

Your request failed because the specified hostId does not exist or the metric name is invalid.

## Error Summary
${originalError}

## Possible Causes
- The hostId does not exist in your Mackerel organization
- The metric name contains typos or incorrect format
- The host may have been deleted or renamed

## Resolving Host Issues
- Verify the hostId exists by listing all hosts first
- Check for typos in the hostId
- Use the list_hosts tool to find valid host IDs

${getAvailableHostMetrics()}

## Valid Metric Name Examples
- loadavg5, cpu.user.percentage, memory.used, disk.sda.reads.delta`;
}

function getServiceMetrics404ErrorMessage(originalError: string): string {
  const lowerError = originalError.toLowerCase();

  if (lowerError.includes("service not found")) {
    return `## Service Not Found

Your request failed because the specified serviceName does not exist in your Mackerel organization.

## Error Summary
${originalError}

## Possible Causes
- The serviceName does not exist in your Mackerel organization
- The service may have been deleted or renamed
- There may be a typo in the serviceName

## Resolving Service Issues
- Use the list_services tool to find valid service names
- Check for typos in the serviceName
- Verify the service hasn't been deleted from your organization
- Ensure you have the correct permissions to access this service`;
  }

  if (lowerError.includes("metric not found")) {
    return `## Metric Not Found

Your request failed because the specified metric name is invalid or not available for this service.

## Error Summary
${originalError}

## Possible Causes
- The metric name contains typos or incorrect format
- The metric may not be posted to this service
- The metric collection may not be configured

## Resolving Metric Issues
- Check for typos in the metric name
- Verify the metric is being posted to this service
- Configure metric collection if needed

${getAvailableServiceMetrics()}

## Valid Metric Name Examples
- response_time, custom.my_metric, throughput`;
  }

  // Generic 404 message for other cases
  return `## Resource Not Found: Invalid Service or Metric

Your request failed because the specified serviceName does not exist or the metric name is invalid.

## Error Summary
${originalError}

## Possible Causes
- The serviceName does not exist in your Mackerel organization
- The metric name contains typos or incorrect format
- The service may have been deleted or renamed

## Resolving Service Issues
- Verify the serviceName exists by listing all services first
- Check for typos in the serviceName
- Use the list_services tool to find valid service names

${getAvailableServiceMetrics()}

## Valid Metric Name Examples
- response_time, custom.my_metric, throughput`;
}

export async function buildToolResponse(
  fn: () => Promise<unknown>,
  toolName?: string,
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

    // Check if this is a 404 error and we have tool name for specialized error message
    if (
      toolName &&
      errorMessage.includes("404") &&
      (toolName === "get_host_metrics" || toolName === "get_service_metrics")
    ) {
      let detailedError: string;
      if (toolName === "get_host_metrics") {
        detailedError = getHostMetrics404ErrorMessage(errorMessage);
      } else {
        detailedError = getServiceMetrics404ErrorMessage(errorMessage);
      }

      return {
        content: [
          {
            type: "text",
            text: detailedError,
          },
        ],
        isError: true,
      };
    }

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
