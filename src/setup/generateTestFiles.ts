import fs from 'fs';
import path from 'path';
import { TESTS_DIR } from '../config/constants';
import { ExcelReader } from '../utils/excelReader';

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function relativeImportPath(specDir: string): string {
  const relative = path.relative(specDir, path.join(process.cwd(), 'src', 'generator', 'dynamicTestRunner'));
  return relative.replace(/\\/g, '/').replace(/^(?!\.)/, './');
}

function main(): void {
  fs.mkdirSync(TESTS_DIR, { recursive: true });

  for (const { module, subModule } of ExcelReader.getModuleSubModulePairs()) {
    const moduleDir = path.join(TESTS_DIR, sanitizeSegment(module));
    fs.mkdirSync(moduleDir, { recursive: true });

    const fileName = `${sanitizeSegment(module)}-${sanitizeSegment(subModule)}.spec.ts`;
    const filePath = path.join(moduleDir, fileName);
    const importPath = relativeImportPath(moduleDir);

    const contents = `import { registerApiTests } from '${importPath}';\n\nregisterApiTests(${JSON.stringify(module)}, ${JSON.stringify(subModule)});\n`;
    fs.writeFileSync(filePath, contents, 'utf8');
    console.log(`Generated ${path.relative(process.cwd(), filePath)}`);
  }
}

main();
