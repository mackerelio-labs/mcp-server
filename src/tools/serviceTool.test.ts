import { describe, it, expect } from "vitest";
import { setupClient } from "../__tests__/setupClient.js";
import { setupServer } from "../__tests__/setupServer.js";
import { ServiceTool } from "./serviceTool.js";
import { mswServer } from "../mocks/server.js";
import { HttpResponse, http } from "msw";
import { MackerelClient } from "../client.js";
import { MACKEREL_BASE_URL } from "../__tests__/mackerelClient.js";

describe("Service Tool", () => {
  const mackerelClient = new MackerelClient(MACKEREL_BASE_URL, "test-api");
  const serviceTool = new ServiceTool(mackerelClient);

  it("listServices", async () => {
    const services = [
      {
        name: "web",
        memo: "Web application service",
        roles: ["app", "frontend"],
      },
      {
        name: "database",
        memo: "Database service",
        roles: ["primary", "replica"],
      },
    ];

    mswServer.use(
      http.get(MACKEREL_BASE_URL + "/api/v0/services", () => {
        return HttpResponse.json({
          services,
        });
      }),
    );

    const server = setupServer(
      "list_services",
      { inputSchema: ServiceTool.ListServicesToolInput.shape },
      serviceTool.listServices,
    );
    const { client } = await setupClient(server);

    const result = await client.callTool({
      name: "list_services",
      arguments: {},
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ services }),
        },
      ],
    });
  });
});
