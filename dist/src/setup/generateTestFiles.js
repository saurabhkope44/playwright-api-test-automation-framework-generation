"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../config/constants");
const excelReader_1 = require("../utils/excelReader");
function sanitizeSegment(value) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function relativeImportPath(specDir) {
    const relative = path_1.default.relative(specDir, path_1.default.join(process.cwd(), 'src', 'generator', 'dynamicTestRunner'));
    return relative.replace(/\\/g, '/').replace(/^(?!\.)/, './');
}
function main() {
    fs_1.default.mkdirSync(constants_1.TESTS_DIR, { recursive: true });
    for (const { module, subModule } of excelReader_1.ExcelReader.getModuleSubModulePairs()) {
        const moduleDir = path_1.default.join(constants_1.TESTS_DIR, sanitizeSegment(module));
        fs_1.default.mkdirSync(moduleDir, { recursive: true });
        const fileName = `${sanitizeSegment(module)}-${sanitizeSegment(subModule)}.spec.ts`;
        const filePath = path_1.default.join(moduleDir, fileName);
        const importPath = relativeImportPath(moduleDir);
        const contents = `import { registerApiTests } from '${importPath}';\n\nregisterApiTests(${JSON.stringify(module)}, ${JSON.stringify(subModule)});\n`;
        fs_1.default.writeFileSync(filePath, contents, 'utf8');
        console.log(`Generated ${path_1.default.relative(process.cwd(), filePath)}`);
    }
}
main();
