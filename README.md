# Playwright API Test Automation Framework

This project is an enterprise-style, data-driven API test framework built with Playwright and TypeScript. Test definitions are read from `TestData/API_TestData.xlsx`, while sensitive values are resolved from `.env` at runtime.

## Setup

```bash
npm install
cp .env.example .env
npm run generate-tests
npm run test:api
npm run report
```

On Windows PowerShell, create the local env file with:

```powershell
Copy-Item .env.example .env
```

## Data Flow

`APITestCases` drives execution. Enabled rows are grouped by `Module` and `SubModule`, then generated into `Tests/{Module}/{Module}-{SubModule}.spec.ts`.

`AuthCredentials`, `OAuth2Config`, and `TestConfig` provide authentication and environment mappings. Secret placeholders such as `${CLIENT_SECRET}` and bare env keys such as `AUTH_PASS_BASIC` are resolved by `src/config/env.config.ts`.

## Excel Sheets

- `APITestCases`: test id, module, method, base URL, endpoint, params, headers, body, auth ref, assertions, variable extraction, tags, and enabled flag.
- `AuthCredentials`: maps `AuthRef` values to auth strategies.
- `TestConfig`: maps named base URL keys to concrete environment URLs.
- `Chains`: documents chained test order and variable usage.
- `OAuth2Config`: stores OAuth2 flow settings and secret placeholders.

## Supported Auth

- None
- Basic
- Bearer
- API Key
- OAuth2 client credentials token fetch when an OAuth2 config reference is provided
- HMAC placeholder behavior via API key header, ready for project-specific signing logic

## Assertion Syntax

The framework always checks `ExpectedStatus` when present. Optional `Assertions` entries can be separated by semicolons or new lines.

Examples:

```text
$.id == 1
$.name contains Leanne
Header:content-type contains application/json
$.data[0].id exists
```

## Variable Extraction

Use `source->TARGET_NAME` syntax in `ExtractVariables`.

Examples:

```text
$.id->USER_ID
Header:Set-Cookie->SESSION_ID
```

Later cells can use extracted values with `{{USER_ID}}`. Environment values can be referenced with `${CLIENT_SECRET}`.

## Console Logging

Every test prints:

- `[STEP 1]` initialization details
- `[STEP 2]` method, full URL, headers, and auth type
- `[STEP 3]` payload
- `[STEP 4]` status, execution time, response headers, and response body
- `[STEP 5]` assertion result lines
- `[STEP 6]` extracted variables

## Important Files

- `playwright.config.ts`: Playwright API execution config and HTML reporter output.
- `src/utils/excelReader.ts`: Excel parser.
- `src/client/apiClient.ts`: request builder and executor.
- `src/utils/authResolver.ts`: auth strategy resolver.
- `src/utils/assertionEngine.ts`: dynamic assertion evaluator.
- `src/utils/variableStore.ts`: cross-step variable storage.
- `src/setup/generateTestFiles.ts`: physical spec generation.
