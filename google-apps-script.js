// Google Apps Script to save GPA data to Google Doc
// Deploy this as a Web App with "Execute as: Me" and "Who has access: Anyone"

const GOOGLE_DOC_ID = '1ICuIvuBC-uTpdKCgQWYNKqAfPfnOzOQPIyLYMoXhqvo';

// Content moderation function
function isInappropriateName(name) {
  // Convert to lowercase for case-insensitive checking
  const lowerName = name.toLowerCase().trim();
  
  // List of inappropriate words/patterns
  const inappropriateWords = [
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'crap', 'piss', 'dick', 'cock', 
    'pussy', 'cunt', 'bastard', 'whore', 'slut', 'nigger', 'nigga', 'fag', 
    'faggot', 'retard', 'penis', 'vagina', 'sex', 'porn', 'xxx', 'kill', 
    'die', 'death', 'hitler', 'nazi', 'kkk', 'terrorist', 'bomb', 'rape',
    'idiot', 'stupid', 'dumb', 'moron', 'loser', 'hate', 'kys'
  ];
  
  // Check if name contains any inappropriate words
  for (let word of inappropriateWords) {
    if (lowerName.includes(word)) {
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
    
    // Open the Google Doc
    const doc = DocumentApp.openById(GOOGLE_DOC_ID);
    const body = doc.getBody();

    const yearLevel = data.yearLevel || 'Year 8';
    const currentTerm = data.currentTerm || 'Unknown Term';
    let table = null;

    if (body.getNumChildren() === 0 || body.getText().trim() === '') {
      body.appendParagraph('GPA Records').setHeading(DocumentApp.ParagraphHeading.HEADING1);
      body.appendParagraph('Use this table to compare saved GPA snapshots by year level and term.');
      body.appendParagraph('');
    }

    const tables = body.getTables();
    for (let i = 0; i < tables.length; i++) {
      const candidate = tables[i];
      if (candidate.getNumRows() > 0 && candidate.getRow(0).getNumCells() >= 7) {
        const firstCellText = candidate.getRow(0).getCell(0).getText();
        if (firstCellText === 'Saved At') {
          table = candidate;
          break;
        }
      }
    }

    if (!table) {
      body.appendParagraph('Comparison Table').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      table = body.appendTable();
      const headerRow = table.appendTableRow();
      headerRow.appendTableCell('Saved At');
      headerRow.appendTableCell('Year Level');
      headerRow.appendTableCell('Term');
      headerRow.appendTableCell('Student Name');
      headerRow.appendTableCell('GPA');
      headerRow.appendTableCell('Completed');
      headerRow.appendTableCell('Subjects');

      for (let i = 0; i < headerRow.getNumCells(); i++) {
        const cell = headerRow.getCell(i);
        cell.setBackgroundColor('#2563EB');
        cell.getChild(0).asText().setForegroundColor('#FFFFFF').setBold(true);
        cell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(8).setPaddingRight(8);
      }
    }

    // Format the data
    const timestamp = new Date(data.timestamp).toLocaleString();
    const completedSubjects = Number(data.completedSubjects || 0);
    const totalSubjects = Number(data.totalSubjects || (data.subjects || []).length);
    const subjectsText = data.subjects
      .map(s => `${s.subject}: ${s.finalGrade || 'Incomplete'}`)
      .join('\n');

    // Add new row
    const newRow = table.appendTableRow();
    newRow.appendTableCell(timestamp);
    newRow.appendTableCell(yearLevel);
    newRow.appendTableCell(currentTerm);
    newRow.appendTableCell(data.studentName);
    newRow.appendTableCell(String(data.gpa || data.currentGpa || 'N/A'));
    newRow.appendTableCell(`${completedSubjects}/${totalSubjects}`);
    newRow.appendTableCell(subjectsText);

    // Style the new row
    for (let i = 0; i < newRow.getNumCells(); i++) {
      const cell = newRow.getCell(i);
      cell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(8).setPaddingRight(8);
      if (table.getNumRows() % 2 === 0) {
        cell.setBackgroundColor('#F3F4F6');
      }
      cell.getChild(0).asText().setForegroundColor('#000000');
    }
    
    // Save the document
    doc.saveAndClose();
    
    // Return success response. The web app posts with no-cors, so the browser
    // does not need custom response headers from Apps Script.
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: `Successfully added ${data.studentName}'s ${yearLevel} ${currentTerm} GPA (${data.gpa || data.currentGpa}) to the comparison table!`,
        docUrl: `https://docs.google.com/document/d/${GOOGLE_DOC_ID}/edit`
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
