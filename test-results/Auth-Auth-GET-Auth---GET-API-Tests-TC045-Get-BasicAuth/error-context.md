# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Auth\Auth-GET.spec.ts >> Auth - GET API Tests >> [TC045] Get_BasicAuth
- Location: src\generator\dynamicTestRunner.ts:11:11

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  1   | import { APIResponse, expect } from '@playwright/test';
  2   | import { Logger } from './logger';
  3   | import { readJsonPath } from './jsonPath';
  4   | import { ApiTestCase } from './types';
  5   | import { VariableStore } from './variableStore';
  6   | 
  7   | export class AssertionEngine {
  8   |   static async assertResponse(response: APIResponse, tc: ApiTestCase): Promise<void> {
  9   |     await this.assertStatus(response, tc);
  10  |     await this.assertExpectedFormat(response, tc);
  11  |     await this.assertCustomRules(response, tc);
  12  |   }
  13  | 
  14  |   private static async assertStatus(response: APIResponse, tc: ApiTestCase): Promise<void> {
  15  |     const expected = Number(tc.ExpectedStatus);
  16  |     if (!Number.isFinite(expected)) return;
  17  | 
  18  |     const actual = response.status();
  19  |     Logger.logAssertion('Status Code', actual === expected, `expected ${expected}, actual ${actual}`);
> 20  |     expect(actual).toBe(expected);
      |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  21  |   }
  22  | 
  23  |   private static async assertExpectedFormat(response: APIResponse, tc: ApiTestCase): Promise<void> {
  24  |     const format = String(tc.ExpectedResponseFormat || '').trim().toLowerCase();
  25  |     if (!format || format === 'n/a') return;
  26  | 
  27  |     if (format === 'json') {
  28  |       await response.json();
  29  |       Logger.logAssertion('Response Format', true, 'valid JSON');
  30  |     }
  31  |   }
  32  | 
  33  |   private static async assertCustomRules(response: APIResponse, tc: ApiTestCase): Promise<void> {
  34  |     const raw = String(tc.Assertions || '').trim();
  35  |     if (!raw) return;
  36  | 
  37  |     const body = await parseBody(response);
  38  |     const headers = response.headers();
  39  | 
  40  |     for (const rule of raw.split(/[;\n]/).map((part) => part.trim()).filter(Boolean)) {
  41  |       const result = evaluateRule(rule, body, headers);
  42  |       Logger.logAssertion(rule, result.passed, result.detail);
  43  |       expect(result.passed, result.detail).toBeTruthy();
  44  |     }
  45  |   }
  46  | }
  47  | 
  48  | async function parseBody(response: APIResponse): Promise<unknown> {
  49  |   const text = await response.text();
  50  |   if (!text) return undefined;
  51  | 
  52  |   try {
  53  |     return JSON.parse(text);
  54  |   } catch {
  55  |     return text;
  56  |   }
  57  | }
  58  | 
  59  | function evaluateRule(rule: string, body: unknown, headers: Record<string, string>): { passed: boolean; detail: string } {
  60  |   const dslMatch = rule.match(/^(.+?)=(equals|contains|matchesRegex|startsWith|endsWith|lessThan|greaterThan|typeIs|lengthEquals|exists|notExists):?(.*)$/i);
  61  |   if (dslMatch) {
  62  |     const [, selector, operator, expectedRaw = ''] = dslMatch;
  63  |     return evaluate(selector.trim(), operator, expectedRaw.trim(), body, headers);
  64  |   }
  65  | 
  66  |   const symbolicMatch = rule.match(/(.+?)(==|!=|>=|<=|>|<)(.+)/i);
  67  |   if (symbolicMatch) {
  68  |     const [, selector, operator, expectedRaw = ''] = symbolicMatch;
  69  |     const mappedOperator: Record<string, string> = {
  70  |       '==': 'equals',
  71  |       '!=': 'notEquals',
  72  |       '>': 'greaterThan',
  73  |       '>=': 'greaterThanOrEqual',
  74  |       '<': 'lessThan',
  75  |       '<=': 'lessThanOrEqual'
  76  |     };
  77  |     return evaluate(selector.trim(), mappedOperator[operator], expectedRaw.trim(), body, headers);
  78  |   }
  79  | 
  80  |   const simpleEqualsMatch = rule.match(/^(.+?)=(.+)$/);
  81  |   if (simpleEqualsMatch) {
  82  |     const [, selector, expectedRaw] = simpleEqualsMatch;
  83  |     return evaluate(selector.trim(), 'equals', expectedRaw.trim(), body, headers);
  84  |   }
  85  | 
  86  |   const existsMatch = rule.match(/^(.+?)\s+exists$/i);
  87  |   if (existsMatch) {
  88  |     const actual = resolveAssertionValue(existsMatch[1].trim(), body, headers);
  89  |     return { passed: actual !== undefined && actual !== null && actual !== '', detail: `actual ${JSON.stringify(actual)}` };
  90  |   }
  91  | 
  92  |   const actual = resolveAssertionValue(rule, body, headers);
  93  |   return { passed: actual !== undefined && actual !== null && actual !== '', detail: `actual ${JSON.stringify(actual)}` };
  94  | }
  95  | 
  96  | function evaluate(
  97  |   selector: string,
  98  |   operatorRaw: string,
  99  |   expectedRaw: string,
  100 |   body: unknown,
  101 |   headers: Record<string, string>
  102 | ): { passed: boolean; detail: string } {
  103 |   const operator = operatorRaw.trim().toLowerCase();
  104 |   const actual = resolveAssertionValue(selector, body, headers);
  105 |   const expected = coerceExpected(String(VariableStore.resolve(expectedRaw)));
  106 | 
  107 |   switch (operator) {
  108 |     case 'equals':
  109 |       return { passed: String(actual) === String(expected), detail: `expected ${expected}, actual ${actual}` };
  110 |     case 'notequals':
  111 |       return { passed: String(actual) !== String(expected), detail: `not expected ${expected}, actual ${actual}` };
  112 |     case 'greaterthan':
  113 |     case 'greaterthanorequal':
  114 |     case 'lessthan':
  115 |     case 'lessthanorequal':
  116 |       return compareNumbers(operator, actual, expected);
  117 |     case 'contains':
  118 |       return {
  119 |         passed: String(actual ?? '').includes(String(expected)),
  120 |         detail: `expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`
```