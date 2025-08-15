# Development

## Running with Inspector

Run the MCP Inspector:

```sh
npm run inspector
```

## Running via Stdio

Run the server and send JSON-RPC requests via stdin:

```sh
npm run dev

# OR

docker build . -t mackerel-mcp
docker run --rm -i mackerel-mcp
```

### Input Examples

1. **ping**
    ```json
    {"jsonrpc":"2.0", "id":1, "method":"ping"}
    ```

2. **initialize**
    ```json
    {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{"roots":{"listChanged":true}},"clientInfo":{"name":"local","version":"0.0.1"}}}
    ```

3. **tools/list**
    ```json
    {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
    ```
