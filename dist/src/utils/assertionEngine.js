"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssertionEngine = void 0;
const test_1 = require("@playwright/test");
const logger_1 = require("./logger");
const jsonPath_1 = require("./jsonPath");
const variableStore_1 = require("./variableStore");
class AssertionEngine {
    static async assertResponse(response, tc) {
        await this.assertStatus(response, tc);
        await this.assertExpectedFormat(response, tc);
        await this.assertCustomRules(response, tc);
    }
    static async assertStatus(response, tc) {
        const expected = Number(tc.ExpectedStatus);
        if (!Number.isFinite(expected))
            return;
        const actual = response.status();
        logger_1.Logger.logAssertion('Status Code', actual === expected, `expected ${expected}, actual ${actual}`);
        (0, test_1.expect)(actual).toBe(expected);
    }
    static async assertExpectedFormat(response, tc) {
        const format = String(tc.ExpectedResponseFormat || '').trim().toLowerCase();
        if (!format || format === 'n/a')
            return;
        if (format === 'json') {
            await response.json();
            logger_1.Logger.logAssertion('Response Format', true, 'valid JSON');
        }
    }
    static async assertCustomRules(response, tc) {
        const raw = String(tc.Assertions || '').trim();
        if (!raw)
            return;
        const body = await parseBody(response);
        const headers = response.headers();
        for (const rule of raw.split(/[;\n]/).map((part) => part.trim()).filter(Boolean)) {
            const result = evaluateRule(rule, body, headers);
            logger_1.Logger.logAssertion(rule, result.passed, result.detail);
            (0, test_1.expect)(result.passed, result.detail).toBeTruthy();
        }
    }
}
exports.AssertionEngine = AssertionEngine;
async function parseBody(response) {
    const text = await response.text();
    if (!text)
        return undefined;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function evaluateRule(rule, body, headers) {
    const dslMatch = rule.match(/^(.+?)=(equals|contains|matchesRegex|startsWith|endsWith|lessThan|greaterThan|typeIs|lengthEquals|exists|notExists):?(.*)$/i);
    if (dslMatch) {
        const [, selector, operator, expectedRaw = ''] = dslMatch;
        return evaluate(selector.trim(), operator, expectedRaw.trim(), body, headers);
    }
    const symbolicMatch = rule.match(/(.+?)(==|!=|>=|<=|>|<)(.+)/i);
    if (symbolicMatch) {
        const [, selector, operator, expectedRaw = ''] = symbolicMatch;
        const mappedOperator = {
            '==': 'equals',
            '!=': 'notEquals',
            '>': 'greaterThan',
            '>=': 'greaterThanOrEqual',
            '<': 'lessThan',
            '<=': 'lessThanOrEqual'
        };
        return evaluate(selector.trim(), mappedOperator[operator], expectedRaw.trim(), body, headers);
    }
    const simpleEqualsMatch = rule.match(/^(.+?)=(.+)$/);
    if (simpleEqualsMatch) {
        const [, selector, expectedRaw] = simpleEqualsMatch;
        return evaluate(selector.trim(), 'equals', expectedRaw.trim(), body, headers);
    }
    const existsMatch = rule.match(/^(.+?)\s+exists$/i);
    if (existsMatch) {
        const actual = resolveAssertionValue(existsMatch[1].trim(), body, headers);
        return { passed: actual !== undefined && actual !== null && actual !== '', detail: `actual ${JSON.stringify(actual)}` };
    }
    const actual = resolveAssertionValue(rule, body, headers);
    return { passed: actual !== undefined && actual !== null && actual !== '', detail: `actual ${JSON.stringify(actual)}` };
}
function evaluate(selector, operatorRaw, expectedRaw, body, headers) {
    const operator = operatorRaw.trim().toLowerCase();
    const actual = resolveAssertionValue(selector, body, headers);
    const expected = coerceExpected(String(variableStore_1.VariableStore.resolve(expectedRaw)));
    switch (operator) {
        case 'equals':
            return { passed: String(actual) === String(expected), detail: `expected ${expected}, actual ${actual}` };
        case 'notequals':
            return { passed: String(actual) !== String(expected), detail: `not expected ${expected}, actual ${actual}` };
        case 'greaterthan':
        case 'greaterthanorequal':
        case 'lessthan':
        case 'lessthanorequal':
            return compareNumbers(operator, actual, expected);
        case 'contains':
            return {
                passed: String(actual ?? '').includes(String(expected)),
                detail: `expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`
            };
        case 'matchesregex':
            return {
                passed: new RegExp(String(expected)).test(String(actual ?? '')),
                detail: `expected ${JSON.stringify(actual)} to match /${expected}/`
            };
        case 'startswith':
            return {
                passed: String(actual ?? '').startsWith(String(expected)),
                detail: `expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expected)}`
            };
        case 'endswith':
            return {
                passed: String(actual ?? '').endsWith(String(expected)),
                detail: `expected ${JSON.stringify(actual)} to end with ${JSON.stringify(expected)}`
            };
        case 'typeis':
            return assertType(actual, String(expected));
        case 'lengthequals':
            return {
                passed: getLength(actual) === Number(expected),
                detail: `expected length ${expected}, actual ${getLength(actual)}`
            };
        case 'exists':
            return { passed: actual !== undefined && actual !== null && actual !== '', detail: `actual ${JSON.stringify(actual)}` };
        case 'notexists':
            return { passed: actual === undefined || actual === null || actual === '', detail: `actual ${JSON.stringify(actual)}` };
        default:
            return { passed: false, detail: `Unsupported assertion operator: ${operator}` };
    }
}
function resolveAssertionValue(selector, body, headers) {
    if (selector.toLowerCase().startsWith('header:')) {
        const headerName = selector.slice('header:'.length).trim().toLowerCase();
        return headers[headerName];
    }
    if (selector.startsWith('//') && typeof body === 'string') {
        return readXmlishValue(body, selector);
    }
    if (selector.startsWith('$'))
        return (0, jsonPath_1.readJsonPath)(body, selector);
    if (['ResponseTime', 'Status', 'CloseCode'].includes(selector))
        return variableStore_1.VariableStore.get(selector);
    return selector;
}
function coerceExpected(value) {
    if (/^-?\d+(\.\d+)?$/.test(value))
        return Number(value);
    if (/^(true|false)$/i.test(value))
        return value.toLowerCase() === 'true';
    return value.replace(/^['"]|['"]$/g, '');
}
function compareNumbers(operator, actual, expected) {
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    const comparisons = {
        greaterthan: actualNumber > expectedNumber,
        greaterthanorequal: actualNumber >= expectedNumber,
        lessthan: actualNumber < expectedNumber,
        lessthanorequal: actualNumber <= expectedNumber
    };
    return {
        passed: Number.isFinite(actualNumber) && Number.isFinite(expectedNumber) && comparisons[operator],
        detail: `expected actual ${operator} ${expectedNumber}, actual ${actualNumber}`
    };
}
function assertType(actual, expectedType) {
    const normalized = expectedType.toLowerCase();
    const actualType = Array.isArray(actual) ? 'array' : actual === null ? 'null' : typeof actual;
    return {
        passed: actualType === normalized,
        detail: `expected type ${normalized}, actual type ${actualType}`
    };
}
function getLength(actual) {
    if (Array.isArray(actual) || typeof actual === 'string')
        return actual.length;
    return undefined;
}
function readXmlishValue(xml, selector) {
    const tagName = selector.replace(/^\/\//, '').split('/').filter(Boolean).pop();
    if (!tagName)
        return undefined;
    const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match?.[1]?.trim();
}
