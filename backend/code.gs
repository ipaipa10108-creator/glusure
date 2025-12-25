// Google Apps Script Code for Glusure Backend
// Updated to support HeartRate and Details

const SHEET_NAME = 'Records';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = getSheet();
    
    // Parse action
    let action = 'GET';
    let data = {};
    
    if (e.parameter.action) {
      action = e.parameter.action;
    }
    
    if (e.postData && e.postData.contents) {
      const postData = JSON.parse(e.postData.contents);
      if (postData.action) action = postData.action;
      if (postData.data) data = postData.data;
    }

    let result;
    switch (action) {
      case 'GET':
        result = getRecords(sheet);
        break;
      case 'SAVE':
        result = saveRecord(sheet, data);
        break;
      case 'UPDATE':
        result = updateRecord(sheet, data);
        break;
      case 'DELETE':
        result = deleteRecord(sheet, data.id);
        break;
      default:
        throw new Error('Invalid action');
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = doc.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = doc.insertSheet(SHEET_NAME);
    // Updated Headers: Added HeartRate (9), Details (10)
    sheet.appendRow(['ID', 'Date', 'Name', 'Weight', 'Systolic', 'Diastolic', 'GlucoseFasting', 'GlucosePostMeal', 'GlucoseRandom', 'HeartRate', 'Details']);
  }
  return sheet;
}

function getRecords(sheet) {
  const rows = sheet.getDataRange().getValues();
  // const headers = rows[0]; 
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record = {
      id: row[0],
      timestamp: row[1],
      name: row[2],
      weight: row[3],
      systolic: row[4],
      diastolic: row[5],
      glucoseFasting: row[6],
      glucosePostMeal: row[7],
      glucoseRandom: row[8],
      heartRate: row[9],
      details: row[10]
    };
    data.push(record);
  }
  return data;
}

function saveRecord(sheet, data) {
  // Check if updating existing by ID or creating new is handled by frontend logic
  // But strictly 'SAVE' appends new usually. 
  // However, for Glusure merging, we might use UPDATE from frontend if ID exists.
  // This function is basic append. 
  
  const newRow = [
    data.id || Utilities.getUuid(),
    data.timestamp,
    data.name,
    data.weight,
    data.systolic,
    data.diastolic,
    data.glucoseFasting || '',
    data.glucosePostMeal || '',
    data.glucoseRandom || '',
    data.heartRate || '',
    data.details || ''
  ];
  sheet.appendRow(newRow);
  return { id: newRow[0] };
}

function updateRecord(sheet, data) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
       // Update row
       const rowNum = i + 1;
       const range = sheet.getRange(rowNum, 1, 1, 11); // Expanded to 11 columns
       range.setValues([[
         data.id,
         data.timestamp,
         data.name,
         data.weight,
         data.systolic,
         data.diastolic,
         data.glucoseFasting || '',
         data.glucosePostMeal || '',
         data.glucoseRandom || '',
         data.heartRate || '',
         data.details || ''
       ]]);
       return { updated: true };
    }
  }
  throw new Error('Record not found');
}

function deleteRecord(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { deleted: true };
    }
  }
  throw new Error('Record not found');
}
