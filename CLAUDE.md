# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mackerel MCP (Model Context Protocol) server that provides tools for interacting with the Mackerel API. The server exposes Mackerel functionality as MCP tools that can be used by AI assistants.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run the server directly via stdio transport  
- `npm run test` - Run tests with Vitest
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Architecture

```
src/
├── index.ts              # Main MCP server entry point - registers tools and starts stdio transport
├── tools/                # MCP tool implementations
├── mocks/                # MSW mock server setup for testing
└── __tests__/            # Test utilities and setup
```

- **src/index.ts** - Main server entry point that registers tools and starts stdio transport
- **src/tools/** - Individual MCP tool implementations following a consistent pattern
- **src/mocks/** - MSW mock server setup for testing API interactions
- **src/__tests__/** - Shared test utilities and setup helpers

### Tool Development Pattern

Each tool follows this structure:
1. Refer https://mackerel.io/api-docs/ for API documentation
2. Define Zod schema for input validation that includes ALL documented parameters
3. Implement tool callback that builds URLSearchParams for API calls
4. Use `buildToolResponse()` utility for consistent response formatting and error handling
5. Tools are registered in `src/index.ts`
6. Tests are written next to the tool implementation

Notes:
* About API Documentation Reference:
  When viewing API documentation, first visit https://mackerel.io/api-docs/ and follow the endpoint links listed there to check the detailed specifications for the target endpoint.

### Testing

Tests use Vitest with MSW for API mocking. Test setup in `vitest.setup.ts` starts/stops the mock server.
