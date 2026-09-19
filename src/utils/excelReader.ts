import fs from 'fs';
import xlsx from 'xlsx';
import { SHEETS, TEST_DATA_FILE } from '../config/constants';
import { AuthCredential, ApiTestCase, OAuth2Config } from './types';

type Row = Record<string, unknown>;

export class ExcelReader {
  private static workbook: xlsx.WorkBook | undefined;

  static getTestCases(module?: string, subModule?: string): ApiTestCase[] {
    return this.getRows<ApiTestCase>(SHEETS.apiTestCases).filter((row) => {
      const moduleMatches = !module || String(row.Module).trim() === module;
      const subModuleMatches = !subModule || String(row.SubModule).trim() === subModule;
      return moduleMatches && subModuleMatches;
    });
  }

  static getEnabledTestCases(module?: string, subModule?: string): ApiTestCase[] {
    return this.getTestCases(module, subModule).filter((row) => this.isEnabled(row.Enabled));
  }

  static getAuthCredentials(): AuthCredential[] {
    return this.getRows<AuthCredential>(SHEETS.authCredentials);
  }

  static getAuthCredential(authRef?: string): AuthCredential | undefined {
    if (!authRef) return undefined;
    return this.getAuthCredentials().find((row) => String(row.AuthRef).trim() === authRef.trim());
  }

  static getOAuth2Config(configId?: string): OAuth2Config | undefined {
    if (!configId) return undefined;
    return this.getRows<OAuth2Config>(SHEETS.oauth2Config).find(
      (row) => String(row.OAuth2ConfigID).trim() === configId.trim()
    );
  }

  static getConfigValue(keyOrValue?: string): string {
    if (!keyOrValue) return '';

    const raw = keyOrValue.trim();
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');

    const config = this.getRows<Row>(SHEETS.testConfig).find((row) => String(row.ConfigKey).trim() === raw);
    return String(config?.ConfigValue ?? raw).replace(/\/+$/, '');
  }

  static getModuleSubModulePairs(): Array<{ module: string; subModule: string }> {
    const seen = new Set<string>();
    const pairs: Array<{ module: string; subModule: string }> = [];

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

  private static getRows<T extends Row>(sheetName: string): T[] {
    const worksheet = this.getWorkbook().Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Missing required sheet: ${sheetName}`);
    }

    return xlsx.utils.sheet_to_json<T>(worksheet, {
      defval: '',
      raw: false
    });
  }

  private static getWorkbook(): xlsx.WorkBook {
    if (!fs.existsSync(TEST_DATA_FILE)) {
      throw new Error(`Excel test data file not found: ${TEST_DATA_FILE}`);
    }

    this.workbook ??= xlsx.readFile(TEST_DATA_FILE, { cellDates: true });
    return this.workbook;
  }

  private static isEnabled(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return true;
    return !['false', 'no', '0', 'disabled'].includes(String(value).trim().toLowerCase());
  }
}
