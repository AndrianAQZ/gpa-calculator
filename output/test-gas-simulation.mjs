// Simulate the Google Apps Script folder logic with a mock DriveApp
// This verifies the per-year folder organization works correctly

class MockFolder {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.children = new Map(); // folder name -> MockFolder
    this.files = new Map(); // file name -> MockFile
  }

  getFoldersByName(name) {
    const matches = [];
    for (const folder of this.children.values()) {
      if (folder.name === name) matches.push(folder);
    }
    return {
      hasNext: () => matches.length > 0,
      next: () => matches[0],
    };
  }

  createFolder(name) {
    const folder = new MockFolder(name, this);
    this.children.set(name, folder);
    return folder;
  }

  addFile(file) {
    if (!this.files.has(file.name)) {
      this.files.set(file.name, file);
    }
  }

  removeFile(file) {
    this.files.delete(file.name);
  }

  getId() {
    return `folder-${this.parent?.name || 'root'}-${this.name}`;
  }
}

class MockFile {
  constructor(name) {
    this.name = name;
    this.parents = [];
  }
  moveTo(folder) {
    // Remove from all current parents
    const oldParents = [...this.parents];
    this.parents = [];
    oldParents.forEach(p => p.removeFile(this));
    // Add to new folder
    this.parents = [folder];
    folder.addFile(this);
  }
}

class MockDriveApp {
  constructor() {
    this.root = new MockFolder('My Drive');
    this.folders = new Map(); // For getFoldersByName at top level
    this.files = new Map();
  }
  getFoldersByName(name) {
    const matches = [];
    for (const folder of this.root.children.values()) {
      if (folder.name === name) matches.push(folder);
    }
    return {
      hasNext: () => matches.length > 0,
      next: () => matches[0],
    };
  }
  createFolder(name) {
    const folder = new MockFolder(name, this.root);
    this.root.children.set(name, folder);
    return folder;
  }
  getFileById(id) {
    return this.files.get(id);
  }
}

class MockDocumentApp {
  static nextId = 1;
  static create(name) {
    const id = `doc-${MockDocumentApp.nextId++}`;
    const file = new MockFile(name);
    file.id = id;
    file.body = { appendParagraph: (text) => ({ setHeading: () => ({}), text }) };
    // Add to root by default
    drive.getFileById = ((orig) => function(id) {
      return this.files.get(id) || orig.call(this, id);
    })(drive.getFileById);
    drive.files.set(id, file);
    drive.root.addFile(file);
    return { getId: () => id, getBody: () => file.body, saveAndClose: () => {} };
  }
}

// Set up the Apps Script functions
const drive = new MockDriveApp();

function getOrCreateRootFolder() {
  const existing = drive.getFoldersByName('GPA Calculator Records');
  if (existing.hasNext()) return existing.next();
  return drive.createFolder('GPA Calculator Records');
}

function getOrCreateYearFolder(yearLevel) {
  const root = getOrCreateRootFolder();
  const folderName = `${yearLevel}`;
  const matches = root.getFoldersByName(folderName);
  if (matches.hasNext()) return matches.next();
  return root.createFolder(folderName);
}

function saveForStudent(studentName, yearLevel, currentTerm, gpa) {
  const yearFolder = getOrCreateYearFolder(yearLevel);
  const fileName = `${studentName} - ${yearLevel} ${currentTerm} - 2026-06-16 22:00`;
  const doc = MockDocumentApp.create(fileName);
  const docFile = drive.getFileById(doc.getId());
  docFile.moveTo(yearFolder);
  return { fileName, folderName: yearFolder.name, folderPath: ['GPA Calculator Records', yearFolder.name] };
}

// Tests
const tests = [
  ['Alice saves to Year 8', () => saveForStudent('Alice', 'Year 8', 'Term 1', 14.5)],
  ['Bob saves to Year 8 (reuses folder)', () => saveForStudent('Bob', 'Year 8', 'Term 1', 13.0)],
  ['Charlie saves to Year 11', () => saveForStudent('Charlie', 'Year 11', 'Term 2', 12.0)],
  ['Diana saves to Year 11 (reuses folder)', () => saveForStudent('Diana', 'Year 11', 'Term 2', 11.0)],
  ['Yassin saves to Year 8', () => saveForStudent('Yassin', 'Year 8', 'Term 1', 15.0)],
];

let passed = 0, failed = 0;
for (const [name, fn] of tests) {
  const result = fn();
  const root = drive.getFoldersByName('GPA Calculator Records').next();
  const yearFolder = root.getFoldersByName(result.folderName).next();

  // Verify file's parent is the year folder (correctFolder)
  const file = drive.files.get(result.fileName.split(' - ')[0] === 'Alice' || result.fileName.split(' - ')[0] === 'Bob' || result.fileName.split(' - ')[0] === 'Yassin' ? 1 : (result.fileName.split(' - ')[0] === 'Charlie' || result.fileName.split(' - ')[0] === 'Diana' ? 3 : 1));
  const fileInFolder = yearFolder.files.get(result.fileName);
  const correctFolder = fileInFolder && fileInFolder.parents.length === 1 && fileInFolder.parents[0] === yearFolder;

  if (correctFolder) {
    console.log(`PASS: ${name} -> "${result.fileName}" placed in ${result.folderPath.join('/')}/`);
    passed++;
  } else {
    console.log(`FAIL: ${name} -> file parents: ${fileInFolder?.parents?.map(p => p.name).join(',')}`);
    failed++;
  }
}

// Verify folder structure
const root = drive.getFoldersByName('GPA Calculator Records').next();
console.log(`\nFolder structure:`);
console.log(`  GPA Calculator Records/`);
for (const folder of root.children.values()) {
  console.log(`    ${folder.name}/ (${folder.files.size} files)`);
  for (const file of folder.files.values()) {
    console.log(`      - ${file.name}`);
  }
}

console.log(`\nTask 3 simulation: ${passed}/${tests.length} saves correct`);
process.exit(failed > 0 ? 1 : 0);
