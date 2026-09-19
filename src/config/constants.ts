import path from 'path';

export const FRAMEWORK_ROOT = process.cwd();
export const TEST_DATA_FILE = path.join(FRAMEWORK_ROOT, 'TestData', 'APITestData_Golden_Working_All_API_Types.xlsx');
export const TESTS_DIR = path.join(FRAMEWORK_ROOT, 'Tests');

export const SHEETS = {
  apiTestCases: 'APITestCases',
  authCredentials: 'AuthCredentials',
  testConfig: 'TestConfig',
  chains: 'Chains',
  oauth2Config: 'OAuth2Config'
} as const;
