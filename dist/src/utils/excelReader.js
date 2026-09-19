"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelReader = void 0;
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const constants_1 = require("../config/constants");
class ExcelReader {
    static workbook;
    static getTestCases(module, subModule) {
        return this.getRows(constants_1.SHEETS.apiTestCases).filter((row) => {
            const moduleMatches = !module || String(row.Module).trim() === module;
            const subModuleMatches = !subModule || String(row.SubModule).trim() === subModule;
            return moduleMatches && subModuleMatches;
        });
    }
    static getEnabledTestCases(module, subModule) {
        return this.getTestCases(module, subModule).filter((row) => this.isEnabled(row.Enabled));
    }
    static getAuthCredentials() {
        return this.getRows(constants_1.SHEETS.authCredentials);
    }
    static getAuthCredential(authRef) {
        if (!authRef)
            return undefined;
        return this.getAuthCredentials().find((row) => String(row.AuthRef).trim() === authRef.trim());
    }
    static getOAuth2Config(configId) {
        if (!configId)
            return undefined;
        return this.getRows(constants_1.SHEETS.oauth2Config).find((row) => String(row.OAuth2ConfigID).trim() === configId.trim());
    }
    static getConfigValue(keyOrValue) {
        if (!keyOrValue)
            return '';
        const raw = keyOrValue.trim();
        if (/^https?:\/\//i.test(raw))
            return raw.replace(/\/+$/, '');
        const config = this.getRows(constants_1.SHEETS.testConfig).find((row) => String(row.ConfigKey).trim() === raw);
        return String(config?.ConfigValue ?? raw).replace(/\/+$/, '');
    }
    static getModuleSubModulePairs() {
        const seen = new Set();
        const pairs = [];
        for (const testCase of this.getEnabledTestCases()) {
            const module = String(testCase.Module || 'General').trim();
            const subModule = String(testCase.SubModule || 'API').trim();
            const key = `${module}::${subModule}`;
            if (!seen.has(key)) {
                seen.add(key);
                pairs.push({ module, subModule });
            }
        }
        return pairs;
    }
    static getRows(sheetName) {
        const worksheet = this.getWorkbook().Sheets[sheetName];
        if (!worksheet) {
            throw new Error(`Missing required sheet: ${sheetName}`);
        }
        return xlsx_1.default.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false
        });
    }
    static getWorkbook() {
        if (!fs_1.default.existsSync(constants_1.TEST_DATA_FILE)) {
            throw new Error(`Excel test data file not found: ${constants_1.TEST_DATA_FILE}`);
        }
        this.workbook ??= xlsx_1.default.readFile(constants_1.TEST_DATA_FILE, { cellDates: true });
        return this.workbook;
    }
    static isEnabled(value) {
        if (value === undefined || value === null || value === '')
            return true;
        return !['false', 'no', '0', 'disabled'].includes(String(value).trim().toLowerCase());
    }
}
exports.ExcelReader = ExcelReader;
