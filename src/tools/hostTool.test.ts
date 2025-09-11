import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { HostTool } from "./hostTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Host Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const hostTool = new HostTool(mackerelClient);

  it("listHosts", async () => {
    const hosts = [
      {
        id: "host1",
        name: "web-01",
        displayName: "Web Server 1",
        status: "working",
        roles: {
          service1: ["role1", "role2"],
        },
      },
      {
        id: "host2",
        name: "db-01",
        displayName: "Database Server 1",
        status: "standby",
        roles: {
          service2: ["db"],
        },
      },
    ];

    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/hosts", () => {
        return HttpResponse.json({
          hosts,
        });
      })
    );

    const server = setupServer(
      "list_hosts",
      { inputSchema: HostTool.ListHostsToolInput.shape },
      hostTool.listHosts
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_hosts",
      arguments: {},
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ hosts }),
        },
      ],
    });
  });

  it("listHosts with filters", async () => {
    const hosts = [
      {
        id: "host1",
        name: "web-01",
        displayName: "Web Server 1",
        status: "working",
        roles: {
          web: ["app"],
        },
      },
    ];

    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/hosts", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("service")).toBe("web");
        expect(url.searchParams.get("status")).toBe("working");
        return HttpResponse.json({
          hosts,
        });
      })
    );

    const server = setupServer(
      "list_hosts",
      { inputSchema: HostTool.ListHostsToolInput.shape },
      hostTool.listHosts
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_hosts",
      arguments: {
        service: "web",
        status: ["working"],
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ hosts }),
        },
      ],
    });
  });

  it("listHosts with pagination", async () => {
    const allHosts = Array.from({ length: 25 }, (_, i) => ({
      id: `host${i}`,
      name: `host-${i.toString().padStart(2, "0")}`,
      displayName: `Host ${i}`,
      status: "working",
      roles: {},
    }));

    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/hosts", () => {
        return HttpResponse.json({
          hosts: allHosts,
        });
      })
    );

    const server = setupServer(
      "list_hosts",
      { inputSchema: HostTool.ListHostsToolInput.shape },
      hostTool.listHosts
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_hosts",
      arguments: {
        limit: 10,
        offset: 0,
      },
    });

    const expectedHosts = allHosts.slice(0, 10);
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ hosts: expectedHosts }),
        },
      ],
    });
  });
});
