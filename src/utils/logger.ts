import { APIResponse } from '@playwright/test';
import { ApiTestCase } from './types';

export class Logger {
  static logTestStart(tc: ApiTestCase): void {
    console.log(`\n[STEP 1] Initialization`);
    console.log(`Test ID: ${tc.TestCaseID}`);
    console.log(`Test Name: ${tc.TestCaseName}`);
    console.log(`Module/SubModule: ${tc.Module}/${tc.SubModule}`);
  }

  static logRequest(method: string, url: string, headers: Record<string, string>, authType: string): void {
    console.log(`[STEP 2] Request Details`);
    console.log(`Method: ${method}`);
    console.log(`Full URL: ${url}`);
    console.log(`Headers: ${JSON.stringify(this.mask(headers), null, 2)}`);
    console.log(`Auth Type: ${authType}`);
  }

  static logPayload(payload: unknown): void {
    console.log(`[STEP 3] Payload`);
    console.log(payload === undefined || payload === '' ? 'No request body' : JSON.stringify(payload, null, 2));
  }

  static async logResponse(response: APIResponse, durationMs: number): Promise<void> {
    const body = await this.safeBody(response);
    console.log(`[STEP 4] Response`);
    console.log(`HTTP Status Code: ${response.status()}`);
    console.log(`Execution Time: ${durationMs} ms`);
    console.log(`Response Headers: ${JSON.stringify(response.headers(), null, 2)}`);
    console.log(`Response Body: ${body}`);
  }

  static logAssertion(name: string, passed: boolean, detail: string): void {
    console.log(`[STEP 5] Assertions: ${passed ? 'PASS' : 'FAIL'} - ${name} - ${detail}`);
  }

  static logExtraction(source: string, target: string, value: unknown): void {
    console.log(`[STEP 6] Variable Extraction: ${source} -> ${target} = ${JSON.stringify(value)}`);
  }

  static logTestEnd(testCaseId: string): void {
    console.log(`Completed test case: ${testCaseId}\n`);
  }

  private static async safeBody(response: APIResponse): Promise<string> {
    try {
      const text = await response.text();
      if (!text) return '';
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        return text;
      }
    } catch (error) {
      return `Unable to read response body: ${(error as Error).message}`;
    }
  }

  private static mask(headers: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        /authorization|token|secret|key|password/i.test(key) ? '***MASKED***' : value
      ])
    );
  }
}
