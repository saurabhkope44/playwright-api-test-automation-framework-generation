"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.default = (0, test_1.defineConfig)({
    testDir: './Tests',
    timeout: 45000,
    retries: 0,
    workers: 1,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'Reports/html-report', open: 'never' }]
    ],
    use: {
        extraHTTPHeaders: {
            'Content-Type': 'application/json'
        },
        ignoreHTTPSErrors: true
    }
});
