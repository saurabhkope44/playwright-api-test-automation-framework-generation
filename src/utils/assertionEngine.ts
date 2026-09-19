import { APIResponse, expect } from '@playwright/test';
import { Logger } from './logger';
import { readJsonPath } from './jsonPath';
import { ApiTestCase } from './types';
import { VariableStore } from './variableStore';

export class AssertionEngine {
  static async assertResponse(response: APIResponse, tc: ApiTestCase): Promise<void> {
    await this.assertStatus(response, tc);
    await this.assertExpectedFormat(response, tc);
    await this.assertCustomRules(response, tc);
  }

  private static async assertStatus(response: APIResponse, tc: ApiTestCase): Promise<void> {
    const expected = Number(tc.ExpectedStatus);
    if (!Number.isFinite(expected)) return;

    const actual = response.status();
    Logger.logAssertion('Status Code', actual === expected, `expected ${expected}, actual ${actual}`);
    expect(actual).toBe(expected);
  }

  private static async assertExpectedFormat(response: APIResponse, tc: ApiTestCase): Promise<void> {
    const format = String(tc.ExpectedResponseFormat || '').trim().toLowerCase();
    if (!format || format === 'n/a') return;

    if (format === 'json') {
      await response.json();
      Logger.logAssertion('Response Format', true, 'valid JSON');
    }
  }

  private static async assertCustomRules(response: APIResponse, tc: ApiTestCase): Promise<void> {
    const raw = String(tc.Assertions || '').trim();
    if (!raw) return;

    const body = await parseBody(response);
    const headers = response.headers();

    for (const rule of raw.split(/[;\n]/).map((part) => part.trim()).filter(Boolean)) {
      const result = evaluateRule(rule, body, headers);
      Logger.logAssertion(rule, result.passed, result.detail);
      expect(result.passed, result.detail).toBeTruthy();
    }
  }
}

async function parseBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function evaluateRule(rule: string, body: unknown, headers: Record<string, string>): { passed: boolean; detail: string } {
  const dslMatch = rule.match(/^(.+?)=(equals|contains|matchesRegex|startsWith|endsWith|lessThan|greaterThan|typeIs|lengthEquals|exists|notExists):?(.*)$/i);
  if (dslMatch) {
    const [, selector, operator, expectedRaw = ''] = dslMatch;
    return evaluate(selector.trim(), operator, expectedRaw.trim(), body, headers);
  }

  const symbolicMatch = rule.match(/(.+?)(==|!=|>=|<=|>|<)(.+)/i);
  if (symbolicMatch) {
    const [, selector, operator, expectedRaw = ''] = symbolicMatch;
    const mappedOperator: Record<string, string> = {
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

function evaluate(
  selector: string,
  operatorRaw: string,
  expectedRaw: string,
  body: unknown,
  headers: Record<string, string>
): { passed: boolean; detail: string } {
  const operator = operatorRaw.trim().toLowerCase();
  const actual = resolveAssertionValue(selector, body, headers);
  const expected = coerceExpected(String(VariableStore.resolve(expectedRaw)));

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

function resolveAssertionValue(selector: string, body: unknown, headers: Record<string, string>): unknown {
  if (selector.toLowerCase().startsWith('header:')) {
    const headerName = selector.slice('header:'.length).trim().toLowerCase();
    return headers[headerName];
  }

  if (selector.startsWith('//') && typeof body === 'string') {
    return readXmlishValue(body, selector);
  }

  if (selector.startsWith('$')) return readJsonPath(body, selector);
  if (['ResponseTime', 'Status', 'CloseCode'].includes(selector)) return VariableStore.get(selector);
  return selector;
}

function coerceExpected(value: string): string | number | boolean {
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  return value.replace(/^['"]|['"]$/g, '');
}

function compareNumbers(operator: string, actual: unknown, expected: unknown): { passed: boolean; detail: string } {
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  const comparisons: Record<string, boolean> = {
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

function assertType(actual: unknown, expectedType: string): { passed: boolean; detail: string } {
  const normalized = expectedType.toLowerCase();
  const actualType = Array.isArray(actual) ? 'array' : actual === null ? 'null' : typeof actual;
  return {
    passed: actualType === normalized,
    detail: `expected type ${normalized}, actual type ${actualType}`
  };
}

function getLength(actual: unknown): number | undefined {
  if (Array.isArray(actual) || typeof actual === 'string') return actual.length;
  return undefined;
}

function readXmlishValue(xml: string, selector: string): string | undefined {
  const tagName = selector.replace(/^\/\//, '').split('/').filter(Boolean).pop();
  if (!tagName) return undefined;

  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match?.[1]?.trim();
}
