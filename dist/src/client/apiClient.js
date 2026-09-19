"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const excelReader_1 = require("../utils/excelReader");
const logger_1 = require("../utils/logger");
const parser_1 = require("../utils/parser");
const assertionEngine_1 = require("../utils/assertionEngine");
const authResolver_1 = require("../utils/authResolver");
const jsonPath_1 = require("../utils/jsonPath");
const variableStore_1 = require("../utils/variableStore");
class ApiClient {
    request;
    constructor(request) {
        this.request = request;
    }
    async executeTestCase(tc) {
        const built = await this.buildRequest(tc);
        logger_1.Logger.logPayload(built.data);
        const startedAt = Date.now();
        const response = await this.request.fetch(built.url, {
            method: built.method,
            headers: built.headers,
            data: built.data
        });
        const durationMs = Date.now() - startedAt;
        variableStore_1.VariableStore.set('ResponseTime', durationMs);
        variableStore_1.VariableStore.set('Status', response.status());
        await logger_1.Logger.logResponse(response, durationMs);
        return response;
    }
    async assertResponse(response, tc) {
        await assertionEngine_1.AssertionEngine.assertResponse(response, tc);
    }
    async extractVariables(response, tc) {
        const mappings = String(tc.ExtractVariables || '').trim();
        if (!mappings)
            return;
        const bodyText = await response.text();
        const jsonBody = bodyText ? tryJson(bodyText) : undefined;
        const headers = response.headers();
        for (const mapping of mappings.split(/[;\n]/).map((part) => part.trim()).filter(Boolean)) {
            const [sourceRaw, targetRaw] = mapping.split('->').map((part) => part?.trim());
            if (!sourceRaw || !targetRaw)
                continue;
            const value = sourceRaw.toLowerCase().startsWith('header:')
                ? headers[sourceRaw.slice('header:'.length).trim().toLowerCase()]
                : (0, jsonPath_1.readJsonPath)(jsonBody, sourceRaw);
            variableStore_1.VariableStore.set(targetRaw, value);
            logger_1.Logger.logExtraction(sourceRaw, targetRaw, value);
        }
    }
    async buildRequest(tc) {
        const method = String(tc.Method || 'GET').toUpperCase();
        const baseUrl = excelReader_1.ExcelReader.getConfigValue(String(tc.BaseURL || ''));
        const endpoint = (0, parser_1.applyPathParams)(String(tc.Endpoint || ''), tc.PathParams);
        const url = new URL(endpoint, `${baseUrl}/`);
        (0, parser_1.appendQueryParams)(url, tc.QueryParams);
        const headers = {
            ...(0, parser_1.parseKeyValueList)(tc.Headers),
            ...parseCookieHeader(tc.Cookies)
        };
        const auth = await authResolver_1.AuthResolver.resolve(String(tc.AuthRef || 'AUTH_NONE'), this.request);
        const mergedHeaders = { ...headers, ...auth.headers };
        const data = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? (0, parser_1.parseRequestBody)(tc.RequestBody) : undefined;
        logger_1.Logger.logRequest(method, url.toString(), mergedHeaders, auth.authType);
        return {
            method,
            url: url.toString(),
            headers: mergedHeaders,
            data
        };
    }
}
exports.ApiClient = ApiClient;
function parseCookieHeader(input) {
    const cookies = (0, parser_1.parseKeyValueList)(input);
    if (Object.keys(cookies).length === 0)
        return {};
    return {
        Cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
    };
}
function tryJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
