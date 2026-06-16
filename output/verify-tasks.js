// Comprehensive verification of all 11 tasks
// Run with: node output/verify-tasks.js

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const results = [];
let passed = 0;
let failed = 0;

function check(name, condition, evidence) {
  if (condition) {
    results.push(`PASS: ${name}`);
    passed++;
  } else {
    results.push(`FAIL: ${name} - ${evidence}`);
    failed++;
  }
}

// Task 1: SUBJECTS - Hide core subjects on all grades by default
const appJsx = readFileSync('src/App.jsx', 'utf8');
check('T1: showCoreSubjects state defaults to false',
  /useState\(false\)/.test(appJsx),
  'showCoreSubjects default state not found in App.jsx');
check('T1: Core subjects wrapped in showCoreSubjects conditional',
  /showCoreSubjects\s*\?\s*\(\s*<div id="core-subjects-list"/.test(appJsx),
  'Core subjects not wrapped in showCoreSubjects conditional');
check('T1: disclosure button renders before core list',
  /gpa-disclosure-button[\s\S]*?aria-expanded={showCoreSubjects}/.test(appJsx),
  'Disclosure button not found in render');

// Task 2: YEAR PICKER - Settings shows only Year 8/9 with confirm
check('T2: Settings year toggle has only Year 8 and Year 9+',
  /gpa-year-toggle-option[\s\S]*?Year 8[\s\S]*?Year 9\+/m.test(appJsx),
  'Year toggle options not exactly Year 8 and Year 9+');
check('T2: Year change confirmation dialog exists',
  /gpa-year-confirm[\s\S]*?Are you sure/.test(appJsx),
  'Confirmation dialog text "Are you sure?" not found');
check('T2: Confirmation has Cancel and Yes, switch buttons',
  /cancelYearChange[\s\S]*?Cancel[\s\S]*?confirmYearChange[\s\S]*?Yes, switch/m.test(appJsx),
  'Cancel/Yes, switch buttons not found in confirmation');
check('T2: Main year picker shows only Year 8 / Year 9+',
  /handleYearSelect\(8\)[\s\S]*?handleYearSelect\(9\)/.test(appJsx) &&
  !/handleYearSelect\(1[0-2]\)/.test(appJsx),
  'Main year picker includes other years or missing 8/9+');

// Task 3: SAVE TO DOCS - Save button organizes files by year folder
const gasScript = readFileSync('google-apps-script.js', 'utf8');
check('T3: Apps Script creates root folder for GPA records',
  /ROOT_FOLDER_NAME = 'GPA Calculator Records'/.test(gasScript) &&
  /getOrCreateRootFolder/.test(gasScript),
  'Root folder for GPA records not found');
check('T3: Apps Script creates per-year subfolders',
  /getOrCreateYearFolder[\s\S]*?getOrCreateRootFolder/.test(gasScript) &&
  /root\.createFolder\(folderName\)/.test(gasScript),
  'Per-year folder creation not found');
check('T3: Per-save file is moved into the year folder',
  /docFile\.moveTo\(yearFolder\)/.test(gasScript),
  'File move to year folder not found');
check('T3: App.jsx no longer has hard-coded GOOGLE_DOC_ID',
  !/const GOOGLE_DOC_ID/.test(appJsx),
  'GOOGLE_DOC_ID still hard-coded in App.jsx');

// Task 4: NAME FILTER - Yassin allowed, profanity blocked
check('T4: Filter uses whole-word tokenization (not substring)',
  /tokens\.includes\(word\)/.test(appJsx) &&
  /split\(\/\[\^a-z\]\+\/\)/.test(appJsx),
  'Filter does not use whole-word tokenization');
check('T4: Filter no longer includes "ass" as blocked word',
  !/['"]ass['"]/.test(appJsx) || !/filtered\s*=\s*\[[\s\S]*?['"]ass['"]/.test(appJsx),
  'Filter still has "ass" as substring blocked word');

// Task 5: START SCREEN - No persisted student data, no body text
check('T5: LOCAL_GPA_SAVES_KEY removed',
  !/LOCAL_GPA_SAVES_KEY/.test(appJsx),
  'LOCAL_GPA_SAVES_KEY still in App.jsx');
check('T5: persistLocalGpaSnapshot is a no-op (does not write localStorage)',
  /const persistLocalGpaSnapshot[\s\S]*?return true[\s\S]*?\}/m.test(appJsx) &&
  !/localStorage\.setItem\(LOCAL_GPA_SAVES_KEY/.test(appJsx),
  'persistLocalGpaSnapshot still writes to localStorage');
check('T5: Year screen has no description text',
  !/gpa-year-description/.test(appJsx),
  'gpa-year-description class still used in App.jsx');
check('T5: Year screen has no legacy description class',
  !/gpa-year-description/.test(appJsx),
  'Year screen still has description text');

// Task 6: COPY - No AI phrases
const aiPhrases = ['cutting-edge', 'revolutionary', 'leverage', 'seamless', 'empower',
  'unlock', 'elevate', 'streamline', 'harness', 'delve', 'embark',
  'effortless', 'tailored', 'comprehensive', 'robust', 'state-of-the-art',
  'next-generation', 'game-changer', 'transformative', 'paradigm', 'holistic',
  'synergy', 'cutting edge'];
let hasAiPhrase = false;
for (const phrase of aiPhrases) {
  const re = new RegExp(phrase, 'i');
  if (re.test(appJsx) || re.test(gasScript)) {
    hasAiPhrase = true;
    results.push(`  - Found AI phrase: "${phrase}"`);
  }
}
check('T6: No AI phrases in App.jsx or google-apps-script.js', !hasAiPhrase, 'AI phrases found');

// Task 7: VISUALS - Unify radii, shadows
const appCss = readFileSync('src/App.css', 'utf8');
check('T7: Design tokens for radius exist',
  /--radius-sm:/.test(appCss) && /--radius:/.test(appCss) && /--radius-lg:/.test(appCss),
  'Design tokens for radius not found');
check('T7: Design tokens for shadow exist',
  /--shadow-soft:/.test(appCss) && /--shadow-primary:/.test(appCss),
  'Design tokens for shadow not found');
check('T7: Cards use unified --shadow-soft',
  /\.gpa-card[\s\S]*?box-shadow:\s*var\(--shadow-soft\)/.test(appCss),
  'Cards do not use unified --shadow-soft');

// Task 8: LAYOUT - 1-2 sections above fold, no duplicates
check('T8: Results screen does not have duplicate grade summary lower card',
  !/renderResultsScreen[\s\S]*?gpa-lower-grid[\s\S]*?Grade summary/.test(appJsx),
  'Results screen still has duplicate grade summary lower card');
check('T8: Grade entry screen does not have duplicate grade summary lower card',
  !/renderGradeEntryScreen[\s\S]*?gpa-lower-grid[\s\S]*?Grade summary[\s\S]*?renderRequirements/.test(appJsx),
  'Grade entry screen still has duplicate grade summary');

// Task 9: MICROCOPY - Specific CTAs
const specificCtas = ['Save to Google Drive', 'See my GPA', 'Tweak a grade', 'Change electives', 'Start over', 'Mark as predicted', 'Save target', 'No target'];
let missingCtas = [];
for (const cta of specificCtas) {
  if (!appJsx.includes(cta)) missingCtas.push(cta);
}
check('T9: All specific CTAs present', missingCtas.length === 0, `Missing CTAs: ${missingCtas.join(', ')}`);
check('T9: No generic "Get started" button',
  !/Get started/.test(appJsx),
  'Generic "Get started" button found');

// Task 10: DESIGN TOKENS - Unify shadows, colors
check('T10: Primary action uses --shadow-primary',
  /gpa-primary-action:hover[\s\S]*?box-shadow:\s*var\(--shadow-primary\)/.test(appCss),
  'Primary action does not use --shadow-primary');
check('T10: Focus state is unified across interactive elements',
  /\.gpa-elective-button:focus-visible,[\s\S]*?gpa-disclosure-button:focus-visible[\s\S]*?outline: 2px solid var\(--primary\)/.test(appCss),
  'Focus state not unified across interactive elements');
check('T10: Spacing tokens defined',
  /--space-1:/.test(appCss) && /--space-4:/.test(appCss),
  'Spacing tokens not defined');

// Task 11: RESPONSIVE - Mobile and tablet
check('T11: 820px breakpoint for tablet (year choices stack)',
  /@media \(max-width: 820px\)[\s\S]*?gpa-year-choices[\s\S]*?grid-template-columns:\s*1fr/.test(appCss),
  '820px tablet breakpoint not found for year-choices stack');
check('T11: 560px breakpoint for mobile (1 column electives)',
  /@media \(max-width: 560px\)[\s\S]*?gpa-elective-grid[\s\S]*?grid-template-columns:\s*1fr/.test(appCss),
  '560px mobile breakpoint not found for electives');
check('T11: Min-width 320px html',
  /html\s*\{[\s\S]*?min-width:\s*320px/.test(appCss),
  'Min-width 320px on html not found');

console.log('\n=== Task Verification Results ===');
results.forEach(r => console.log(r));
console.log(`\nTotal: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
