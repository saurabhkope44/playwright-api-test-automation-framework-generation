import { test } from '@playwright/test';
import { ApiClient } from '../client/apiClient';
import { ExcelReader } from '../utils/excelReader';
import { Logger } from '../utils/logger';

export function registerApiTests(module: string, subModule: string): void {
  test.describe(`${module} - ${subModule} API Tests`, () => {
    const testCases = ExcelReader.getEnabledTestCases(module, subModule);

    for (const tc of testCases) {
      test(`[${tc.TestCaseID}] ${tc.TestCaseName}`, async ({ request }) => {
        Logger.logTestStart(tc);

        const apiClient = new ApiClient(request);
        const response = await apiClient.executeTestCase(tc);
        await apiClient.assertResponse(response, tc);
        await apiClient.extractVariables(response, tc);

        Logger.logTestEnd(tc.TestCaseID);
      });
    }
  });
}
