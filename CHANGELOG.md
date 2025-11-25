# Changelog

## [v0.3.1](https://github.com/mackerelio-labs/mcp-server/compare/v0.3.0...v0.3.1) - 2025-11-25
- Fix failure when publishing by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/50

## [v0.3.0](https://github.com/mackerelio-labs/mcp-server/compare/v0.2.1...v0.3.0) - 2025-11-21
- Bump vite from 7.1.5 to 7.1.11 by @dependabot[bot] in https://github.com/mackerelio-labs/mcp-server/pull/45
- Implement `list_db_query_stats` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/47
- Implement list_http_server_stats by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/48
- Add new tools in README by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/49

## [v0.2.1](https://github.com/mackerelio-labs/mcp-server/compare/v0.2.0...v0.2.1) - 2025-10-03
- feat: add readOnlyHint annotation to various tools for improved documentation by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/43

## [v0.2.0](https://github.com/mackerelio-labs/mcp-server/compare/v0.1.0...v0.2.0) - 2025-09-25
- add step to install latest npm version by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/39
- Add repository field to package.json by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/40
- Update README.md with correct Docker image and npx package names by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/41
- implements a new get_trace tool for retrieving distributed tracing data from Mackerel by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/42

## [v0.1.0](https://github.com/mackerelio-labs/mcp-server/compare/v0.0.1...v0.1.0) - 2025-09-18
- MACKEREL_API_KEY -> MACKEREL_APIKEY by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/20
- Enable working npx by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/22
- add GitHub Actions workflow for package publishing by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/21
- chore: setup tagpr for release by @Arthur1 in https://github.com/mackerelio-labs/mcp-server/pull/23
- Push to GHCR on release by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/24
- update GitHub Actions to use specific versions by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/27
- Apply pagination for list hosts by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/28
- implement caching for GET requests in MackerelClient by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/29
- add beforeEach hook to clear cache in Host Tool tests by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/33
- add .prettierrc by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/35
- implement pagination and summary options for listDashboards API by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/30
- Enhanced 404 Error Handling for Metrics Tools by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/31
- implement token limit handling in buildToolResponse by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/32
- Added descriptions of metric names by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/34
- Bump vite from 7.1.2 to 7.1.5 by @dependabot[bot] in https://github.com/mackerelio-labs/mcp-server/pull/26

## [v0.0.1](https://github.com/mackerelio-labs/mcp-server/commits/v0.0.1) - 2025-08-22
- Enable working with `node build/index.js` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/1
- Add Dockerfile by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/2
- Add CODEOWNERS by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/6
- Implement first tool, list_alerts by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/3
- Add CI by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/4
- Fix CODEOWNERS by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/8
- implement `get_alert` with claude by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/5
- Implement get_alert_logs by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/9
- Enhance description for tools by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/10
- Implement `list_dashboards` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/11
- Implement `list_hosts` and `list_services` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/13
- Implement `list_monitors` and `get_monitor` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/15
- Implement `get_dashboards` and `update_dashboard` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/12
- Implement `get_host_metrics` and `get_service_metrics` by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/14
- Add LICENSE and minimum README for preparing to publish by @mrasu in https://github.com/mackerelio-labs/mcp-server/pull/16
- Update package.json to include publishConfig, bugs, homepage, and keywords by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/17
- chore: update build process to use tsdown and add tsdown configuration by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/18
- rename package name to @mackerel/mcp-server by @azukiazusa1 in https://github.com/mackerelio-labs/mcp-server/pull/19
