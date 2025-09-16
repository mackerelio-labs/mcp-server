import { describe, it, expect } from "vitest";
import { buildToolResponse } from "./util.js";

describe("buildToolResponse", () => {
  it("should return normal response for small data", async () => {
    const smallData = { message: "test" };
    const result = await buildToolResponse(async () => smallData);

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(JSON.stringify(smallData));
  });

  it("should return token limit error for large data", async () => {
    // Create data that exceeds 25,000 tokens (estimated 100,000 characters)
    const largeArray = Array(10000).fill({
      id: "very-long-id-that-takes-up-space",
      name: "very-long-name-that-takes-up-more-space",
      description:
        "this is a very long description that contains a lot of text to make the response very large",
    });

    const result = await buildToolResponse(async () => ({
      items: largeArray,
    }));

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Response too large");
    expect(result.content[0].text).toContain("25,000");
    expect(result.content[0].text).toContain("limit parameter");
    expect(result.content[0].text).toContain("pagination");
  });

  it("should handle errors properly", async () => {
    const errorMessage = "Test error";
    const result = await buildToolResponse(async () => {
      throw new Error(errorMessage);
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(`Error occurred: ${errorMessage}`);
  });

  it("should handle non-Error exceptions", async () => {
    const errorValue = "String error";
    const result = await buildToolResponse(async () => {
      throw errorValue;
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(`Error occurred: ${errorValue}`);
  });
});
