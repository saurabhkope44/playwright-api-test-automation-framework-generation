"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHEETS = exports.TESTS_DIR = exports.TEST_DATA_FILE = exports.FRAMEWORK_ROOT = void 0;
const path_1 = __importDefault(require("path"));
exports.FRAMEWORK_ROOT = process.cwd();
exports.TEST_DATA_FILE = path_1.default.join(exports.FRAMEWORK_ROOT, 'TestData', 'APITestData_Golden_Working_All_API_Types.xlsx');
exports.TESTS_DIR = path_1.default.join(exports.FRAMEWORK_ROOT, 'Tests');
exports.SHEETS = {
    apiTestCases: 'APITestCases',
    authCredentials: 'AuthCredentials',
    testConfig: 'TestConfig',
    chains: 'Chains',
    oauth2Config: 'OAuth2Config'
};
