"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerApiTests = registerApiTests;
const test_1 = require("@playwright/test");
const apiClient_1 = require("../client/apiClient");
const excelReader_1 = require("../utils/excelReader");
const logger_1 = require("../utils/logger");
function registerApiTests(module, subModule) {
    test_1.test.describe(`${module} - ${subModule} API Tests`, () => {
        const testCases = excelReader_1.ExcelReader.getEnabledTestCases(module, subModule);
        for (const tc of testCases) {
            (0, test_1.test)(`[${tc.TestCaseID}] ${tc.TestCaseName}`, async ({ request }) => {
                logger_1.Logger.logTestStart(tc);
                const apiClient = new apiClient_1.ApiClient(request);
                const response = await apiClient.executeTestCase(tc);
                await apiClient.assertResponse(response, tc);
                await apiClient.extractVariables(response, tc);
                logger_1.Logger.logTestEnd(tc.TestCaseID);
            });
        }
    });
}
