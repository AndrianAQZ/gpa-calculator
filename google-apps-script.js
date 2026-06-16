// Google Apps Script to save GPA data to Google Drive
// Deploy this as a Web App with "Execute as: Me" and "Who has access: Anyone"

// Root folder for all GPA records. Each year level gets its own subfolder.
const ROOT_FOLDER_NAME = 'GPA Calculator Records';

function getOrCreateRootFolder() {
  const existing = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (existing.hasNext()) return existing.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function getOrCreateYearFolder(yearLevel) {
  const root = getOrCreateRootFolder();
  const folderName = `${yearLevel}`;
  const matches = root.getFoldersByName(folderName);
  if (matches.hasNext()) return matches.next();
  return root.createFolder(folderName);
}

// Content moderation function
function isInappropriateName(name) {
  // Convert to lowercase for case-insensitive checking
  const lowerName = name.toLowerCase().trim();
  
  // List of inappropriate words/patterns (matched as whole words only to avoid
  // false positives like "Yassin" containing "ass")
  const inappropriateWords = [
    'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'fag',
    'faggot', 'penis', 'vagina', 'porn', 'hitler', 'nazi', 'kkk',
    'pussy', 'whore', 'slut', 'bastard', 'rape', 'terrorist', 'kys'
  ];

  // Check if name contains any inappropriate whole words
  const tokens = lowerName.split(/[^a-z]+/).filter(Boolean)
  for (let word of inappropriateWords) {
    if (tokens.includes(word)) {
      return true;
    }
  }
  
  // Check for excessive special characters or numbers (likely fake names)
  const specialCharCount = (lowerName.match(/[^a-z\s\-']/g) || []).length;
  if (specialCharCount > 3) {
    return true;
  }
  
  // Check if name is too short (less than 2 characters)
  if (lowerName.replace(/\s/g, '').length < 2) {
    return true;
  }
  
  // Check for repeated characters (like "aaaaaaa" or "111111")
  const hasExcessiveRepetition = /(.)\1{4,}/.test(lowerName);
  if (hasExcessiveRepetition) {
    return true;
  }
  
  return false;
}

function doPost(e) {
  try {
    // Parse the incoming data - handle both JSON and form data
    let data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        // If not JSON, try parsing as form data
        data = JSON.parse(e.parameter.data || e.parameters.data[0]);
      }
    } else if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      throw new Error('No data received');
    }
    
    // Validate student name
    if (!data.studentName || !data.studentName.trim()) {
      throw new Error('Student name is required');
    }
    
    if (isInappropriateName(data.studentName)) {
      throw new Error('The name provided appears to be inappropriate or invalid. Please use your real name.');
    }
    
    // Pick the year folder - data is organized by year level
    const yearLevel = data.yearLevel || 'Unknown Year';
    const yearFolder = getOrCreateYearFolder(yearLevel);

    // Create a per-save Google Doc in the year folder
    const currentTerm = data.currentTerm || 'Unknown Term';
    const timestamp = new Date(data.timestamp);
    const stampLabel = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const fileName = `${data.studentName} - ${yearLevel} ${currentTerm} - ${stampLabel}`;
    const doc = DocumentApp.create(fileName);
    const body = doc.getBody();
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(yearFolder);

    // Format the data
    const timestampLabel = timestamp.toLocaleString();
    const completedSubjects = Number(data.completedSubjects || 0);
    const totalSubjects = Number(data.totalSubjects || (data.subjects || []).length);
    const subjectsText = data.subjects
      .map(s => `${s.subject}: ${s.finalGrade || 'Incomplete'}`)
      .join(', ');

    body.appendParagraph(`${data.studentName} - ${yearLevel} ${currentTerm}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(`Saved at: ${timestampLabel}`);
    body.appendParagraph(`GPA: ${data.gpa || data.currentGpa || 'N/A'} out of 15.00`);
    body.appendParagraph(`Subjects counted: ${completedSubjects}/${totalSubjects}`);
    body.appendParagraph('');
    body.appendParagraph('Subjects').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(subjectsText);

    // Save the document
    doc.saveAndClose();

    // Return success response. The web app posts with no-cors, so the browser
    // does not need custom response headers from Apps Script.
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: `Successfully saved ${data.studentName}'s ${yearLevel} ${currentTerm} GPA (${data.gpa || data.currentGpa}) to Google Docs!`,
        docUrl: docFile.getUrl()
      })
    )
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response. The browser may not be able to read this in
    // no-cors mode, but direct script testing still gets useful JSON.
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: `Error: ${error.message}`
      })
    )
    .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle preflight OPTIONS requests for CORS
function doOptions(e) {
  return ContentService.createTextOutput('');
}
