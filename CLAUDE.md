# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A freestyle (non-Fiori-Elements) SAPUI5 application scaffolded from the SAP Fiori tools "Basic" template, now built out into a match-schedule app: `webapp/view/Schedule.view.xml` renders a CSSGrid-based schedule from `webapp/model/matches.json` (see the parent `match-schedule/` directory). There is no backend service wired in (`sap.app` service type is "None"); `webapp/model/models.js` only supplies the standard `device` JSON model.

Not a git repository. No ESLint config, no TypeScript, no `.cursor`/Copilot rules.

## Commands

Run from the project root (the directory containing `package.json`).

| Task | Command |
| --- | --- |
| Run app in Fiori launchpad sandbox (UI5 from `ui5.sap.com`) | `npm start` |
| Run app with the local framework config (`ui5-local.yaml`, pinned SAPUI5) | `npm run start-local` |
| Run app standalone, no FLP shell | `npm run start-noflp` |
| Unit tests (opens QUnit page in browser) | `npm run unit-test` |
| OPA5 integration tests (opens QUnit page in browser) | `npm run int-test` |
| Production build to `dist/` | `npm run build` |
| Validate deployment config | `npm run deploy` |

`fiori run` serves on `http://localhost:8080`. `test/flp.html` and `preview.html` referenced by the scripts are generated on the fly by `@sap/ux-ui5-tooling` middleware, not files on disk.

### Running a single test

Tests execute in the browser via QUnit — there is no Node test runner. Start the test server (`npm run unit-test` or `npm run int-test`) and narrow scope with QUnit URL params on the opened page, e.g. `...unitTests.qunit.html?module=<module name>` or `?filter=<substring>`, or click a single test in the QUnit UI. Test wiring is aggregated in `webapp/test/unit/AllTests.js` and `webapp/test/integration/AllJourneys.js` — new suites/journeys must be added there to be picked up.

## Architecture

- **Bootstrap:** `webapp/index.html` loads `sap-ui-core.js` and uses `data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"`; the component is instantiated declaratively from the `data-sap-ui-component` div. `resourceroots` maps the `match-schedule` namespace to `./`.
- **Component:** `webapp/Component.js` extends `UIComponent` with `manifest: "json"` and the `IAsyncContentCreation` interface. `init()` sets the `device` model and calls `getRouter().initialize()`.
- **Descriptor-driven:** `webapp/manifest.json` (`sap.ui5`) is the source of truth for models, routing, dependencies (`minUI5Version` 1.152.0, `sap.m` + `sap.ui.core`), and the `i18n` ResourceModel (`match-schedule.i18n.i18n`).
- **Routing:** root view is `match-schedule.view.App` (an `sap.m.App` with id `app`); the router targets `controlId: "app"`, `controlAggregation: "pages"`. One route `RouteSchedule` (pattern `""`) → target `TargetSchedule` → `match-schedule.view.Schedule`. Add new screens by registering a view under `webapp/view/`, a controller under `webapp/controller/`, then a `targets` + `routes` entry in the manifest, and navigate via `this.getOwnerComponent().getRouter().navTo(...)`.
- **Controllers** extend `sap/ui/core/mvc/Controller` directly — there is no shared BaseController yet. If common navigation/i18n helpers are needed, introduce `webapp/controller/BaseController.js` and re-point the existing controllers.
- **i18n:** all user-facing strings go through `webapp/i18n/i18n.properties` and are bound as `{i18n>key}`.

### UI5 version note

Three files disagree on the framework version: `README.md` says 1.152.0, `manifest.json` `minUI5Version` is 1.152.0, and `ui5-local.yaml` pins SAPUI5 **1.135.0**. `npm start` proxies to `https://ui5.sap.com` (latest); `npm run start-local` uses the 1.135.0 pin. Keep `minUI5Version` and the `ui5-local.yaml` version in sync when changing target versions.

## Conventions

- Use AMD `sap.ui.define` with arrow-function factories and `"use strict"`, matching the existing files.
- Keep logic out of `manifest.json` consumers — configure models, routes, and dependencies in the manifest rather than in `Component.js`.
- The `ui5` best-practices skills and the `ui5-mcp-server` MCP (API reference, `run_ui5_linter`) are available; prefer them for UI5 API questions and for linting new code (there is no local lint script).
