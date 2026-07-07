# Changelog

## [2.1.7](https://github.com/chrischall/ioffice-mcp/compare/v2.1.6...v2.1.7) (2026-07-07)


### Bug Fixes

* bump @chrischall/mcp-utils to 0.12.0 ([#75](https://github.com/chrischall/ioffice-mcp/issues/75)) ([a8e21cc](https://github.com/chrischall/ioffice-mcp/commit/a8e21ccb69e0bcb0677c90f025ad13c4ca5033c2))
* confirm-gate iOffice write tools ([#73](https://github.com/chrischall/ioffice-mcp/issues/73)) ([09c63b7](https://github.com/chrischall/ioffice-mcp/commit/09c63b7ba702cfe0312219451525b0b79965c25a))


### Documentation

* document first-party dependency-bump label exception ([#76](https://github.com/chrischall/ioffice-mcp/issues/76)) ([f5451ca](https://github.com/chrischall/ioffice-mcp/commit/f5451ca53f524694140fcc31114979bf65584fe8))

## [2.1.6](https://github.com/chrischall/ioffice-mcp/compare/v2.1.5...v2.1.6) (2026-07-05)


### Documentation

* refresh CLAUDE.md for mcp-utils refactor + auto-review follow-up convention ([#62](https://github.com/chrischall/ioffice-mcp/issues/62)) ([78eb324](https://github.com/chrischall/ioffice-mcp/commit/78eb32485bf027f156699e4fe48afa3e72d764e7))
* require Conventional Commit PR titles for release-please ([#58](https://github.com/chrischall/ioffice-mcp/issues/58)) ([8584012](https://github.com/chrischall/ioffice-mcp/commit/8584012c740e136eda5eaefda00a09d4c541c905))

## [2.1.5](https://github.com/chrischall/ioffice-mcp/compare/v2.1.4...v2.1.5) (2026-06-13)


### Bug Fixes

* bot PRs bypass the CI gate unconditionally (upstream curtaincall[#86](https://github.com/chrischall/ioffice-mcp/issues/86) review) ([#53](https://github.com/chrischall/ioffice-mcp/issues/53)) ([dac7fa8](https://github.com/chrischall/ioffice-mcp/commit/dac7fa825eebcd7798d9b099aac804c8a4d825d5))


### Documentation

* correct release flow to describe release-please ([#49](https://github.com/chrischall/ioffice-mcp/issues/49)) ([0592f69](https://github.com/chrischall/ioffice-mcp/commit/0592f6928681848f11764f032da0e4e28aa67eb2))
* declare MIT license and add README badges ([#54](https://github.com/chrischall/ioffice-mcp/issues/54)) ([714e87c](https://github.com/chrischall/ioffice-mcp/commit/714e87c73aad631ee6663ceafa426fd83fc59a17))

## [2.1.4](https://github.com/chrischall/ioffice-mcp/compare/v2.1.3...v2.1.4) (2026-05-29)


### Bug Fixes

* **ci:** auto-merge arm guards ([#33](https://github.com/chrischall/ioffice-mcp/issues/33)) ([df14f7d](https://github.com/chrischall/ioffice-mcp/commit/df14f7d6b24fc1772b5df941ebe61c8747cdcac9))

## [2.1.3](https://github.com/chrischall/ioffice-mcp/compare/v2.1.2...v2.1.3) (2026-05-26)


### Bug Fixes

* **ci:** substitute repo name in publish workflow ([#30](https://github.com/chrischall/ioffice-mcp/issues/30)) ([e5a54f4](https://github.com/chrischall/ioffice-mcp/commit/e5a54f4ab03885c17e3e88220d87faa3f9d5b8ad))

## [2.1.2](https://github.com/chrischall/ioffice-mcp/compare/v2.1.1...v2.1.2) (2026-05-26)


### Documentation

* **claude:** warn against opening PRs before the feature is done ([#28](https://github.com/chrischall/ioffice-mcp/issues/28)) ([564c53e](https://github.com/chrischall/ioffice-mcp/commit/564c53efba6850914c8af6dd723364ed6b06f8e8))

## [2.1.1](https://github.com/chrischall/ioffice-mcp/compare/v2.1.0...v2.1.1) (2026-05-25)


### Bug Fixes

* **ci:** prevent labeled event from cancelling auto-review ([#26](https://github.com/chrischall/ioffice-mcp/issues/26)) ([fffab9a](https://github.com/chrischall/ioffice-mcp/commit/fffab9a054a206b4425c2ba937ef57b40a08bce0))

## [2.1.0](https://github.com/chrischall/ioffice-mcp/compare/v2.0.2...v2.1.0) (2026-05-24)


### Features

* add .mcpb bundle support ([4eda910](https://github.com/chrischall/ioffice-mcp/commit/4eda910041df5791ffffd984de5fa0f85b8d6172))
* add Claude Code plugin files and CLAUDE.md ([e0d8f98](https://github.com/chrischall/ioffice-mcp/commit/e0d8f983f44219f0a1f2918ae2a211f25a7e3ff4))
* **deploy:** registry listings for MCP Registry, Claude plugins, ClawHub, PulseMCP, mcpservers.org ([34ed72f](https://github.com/chrischall/ioffice-mcp/commit/34ed72f173eff5d76e768cd3bac004e9e193d397))
* initial ioffice-mcp implementation ([eb18fce](https://github.com/chrischall/ioffice-mcp/commit/eb18fce528412aaebd8bd5da75de71b0d147ca92))


### Bug Fixes

* **client:** silence dotenv v17 stdout banner (breaks JSON-RPC over stdio) ([0cb1621](https://github.com/chrischall/ioffice-mcp/commit/0cb1621f5b49ffdda147ec78727877e24887e5af))
* **deploy:** shorten server.json description to ≤100 chars for MCP Registry ([cd783ed](https://github.com/chrischall/ioffice-mcp/commit/cd783ed74b9a01036897dbc8dcfdffb16e45a16e))
* don't crash at install when env vars are missing; trim .mcpb ([9cfea44](https://github.com/chrischall/ioffice-mcp/commit/9cfea44cbeba05257eb41ca28080678c86d2d97b))
* don't crash at install when env vars are missing; trim .mcpb ([cb3eecf](https://github.com/chrischall/ioffice-mcp/commit/cb3eecfeabeb977c232d9794a2a63a57409dbc14))


### Documentation

* add Acknowledgement of Terms section to SKILL.md ([#20](https://github.com/chrischall/ioffice-mcp/issues/20)) ([e13de80](https://github.com/chrischall/ioffice-mcp/commit/e13de80eda6d74f012940a4c24a967e3415835b1))
* canonical auto-merge guidance ([#23](https://github.com/chrischall/ioffice-mcp/issues/23)) ([1634dd7](https://github.com/chrischall/ioffice-mcp/commit/1634dd7c8bf1c19e01c87aa2ca8bbf177138afda))
* **claude-md:** call out 100-char limit on server.json description ([8ab982e](https://github.com/chrischall/ioffice-mcp/commit/8ab982e055b92661c030148b727b03eb50b39f2b))
* **claude-md:** call out 100-char limit on server.json description ([9fd5043](https://github.com/chrischall/ioffice-mcp/commit/9fd5043cc8ffd37a9a8287ebff66a9615901a108))
* correct release-please PR handling in merge guidance ([#24](https://github.com/chrischall/ioffice-mcp/issues/24)) ([5491e64](https://github.com/chrischall/ioffice-mcp/commit/5491e64116efc20e50c17c3d886eb7c3e3ac4a9b))
* ensure CLAUDE.md is current and complete ([b55d4ee](https://github.com/chrischall/ioffice-mcp/commit/b55d4ee7cfae055921581d997d7dad217fbda6ef))
* ensure CLAUDE.md is current and complete ([9ad3b37](https://github.com/chrischall/ioffice-mcp/commit/9ad3b37138c5c3c738430e9b5e79f92935d4f236))
