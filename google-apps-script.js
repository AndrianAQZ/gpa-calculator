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

    if (body.getNumChildren() === 0 || body.getText().trim() === '') {
      body.appendParagraph('GPA Records').setHeading(DocumentApp.ParagraphHeading.HEADING1);
      body.appendParagraph('Saved GPA snapshots from the GPA Calculator.');
      body.appendParagraph('');
    }

    // Format the data
    const timestamp = new Date(data.timestamp).toLocaleString();
    const completedSubjects = Number(data.completedSubjects || 0);
    const totalSubjects = Number(data.totalSubjects || (data.subjects || []).length);
    const subjectsText = data.subjects
      .map(s => `${s.subject}: ${s.finalGrade || 'Incomplete'}`)
      .join(', ');

    body.appendParagraph('');
    body.appendParagraph(`${data.studentName} - ${yearLevel} ${currentTerm}`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(`Saved at: ${timestamp}`);
    body.appendParagraph(`GPA: ${data.gpa || data.currentGpa || 'N/A'} out of 15.00`);
    body.appendParagraph(`Subjects counted: ${completedSubjects}/${totalSubjects}`);
    body.appendParagraph(`Subjects: ${subjectsText}`);
    
    // Save the document
    doc.saveAndClose();
    
    // Return success response. The web app posts with no-cors, so the browser
    // does not need custom response headers from Apps Script.
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: `Successfully saved ${data.studentName}'s ${yearLevel} ${currentTerm} GPA (${data.gpa || data.currentGpa}) to Google Docs!`,
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
