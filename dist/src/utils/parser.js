"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKeyValueList = parseKeyValueList;
exports.parseRequestBody = parseRequestBody;
exports.appendQueryParams = appendQueryParams;
exports.applyPathParams = applyPathParams;
const variableStore_1 = require("./variableStore");
function parseKeyValueList(input) {
    const raw = String(input ?? '').trim();
    if (!raw)
        return {};
    return raw.split(/[;\n]/).reduce((acc, part) => {
        const item = part.trim();
        if (!item)
            return acc;
        const separator = item.includes('=') ? '=' : ':';
        const index = item.indexOf(separator);
        if (index < 0)
            return acc;
        const key = item.slice(0, index).trim();
        const value = item.slice(index + 1).trim();
        if (key)
            acc[key] = String(variableStore_1.VariableStore.resolve(value));
        return acc;
    }, {});
}
function parseRequestBody(input) {
    const raw = String(input ?? '').trim();
    if (!raw)
        return undefined;
    const resolved = String(variableStore_1.VariableStore.resolve(raw));
    try {
        return JSON.parse(resolved);
    }
    catch {
        return resolved;
    }
}
function appendQueryParams(url, queryParams) {
    const params = parseKeyValueList(queryParams);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
}
function applyPathParams(endpoint, pathParams) {
    const params = parseKeyValueList(pathParams);
    let resolvedEndpoint = String(variableStore_1.VariableStore.resolve(endpoint));
    for (const [key, value] of Object.entries(params)) {
        resolvedEndpoint = resolvedEndpoint
            .replace(new RegExp(`:${escapeRegExp(key)}\\b`, 'g'), encodeURIComponent(value))
            .replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), encodeURIComponent(value));
    }
    return resolvedEndpoint;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
