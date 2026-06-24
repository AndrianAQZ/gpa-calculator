// Verify Google Apps Script creates per-year folders
// Read the actual file and check the logic

import { readFileSync } from 'fs';

const gas = readFileSync('google-apps-script.js', 'utf8');

const checks = [
  ['Root folder constant', /const ROOT_FOLDER_NAME = 'GPA Calculator Records'/],
  ['getOrCreateRootFolder function', /function getOrCreateRootFolder\(\)/],
  ['DriveApp.getFoldersByName in root folder lookup', /DriveApp\.getFoldersByName\(ROOT_FOLDER_NAME\)/],
  ['getOrCreateYearFolder function', /function getOrCreateYearFolder\(yearLevel\)/],
  ['Year folder uses yearLevel as name', /const folderName = `\$\{yearLevel\}`/],
  ['DriveApp.createFolder for new year folder', /root\.createFolder\(folderName\)/],
  ['docFile.moveTo(yearFolder) for each save', /docFile\.moveTo\(yearFolder\)/],
  ['DocumentApp.create per save', /DocumentApp\.create\(fileName\)/],
  ['File name includes year', /`\$\{data\.studentName\} - \$\{yearLevel\} \$\{currentTerm\}/],
];

let passed = 0, failed = 0;
for (const [name, re] of checks) {
  const ok = re.test(gas);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
}
console.log(`\nTask 3: ${passed}/${checks.length} checks passed`);
process.exit(failed > 0 ? 1 : 0);
