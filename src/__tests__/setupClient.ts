import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Set up test client and server
 */
export async function setupClient(server: McpServer) {
  const client = new Client({
    name: "test client",
    version: "0.1.0",
  });
  // Create in-memory communication channel
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  // Connect client and server
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return { client };
}
