# Glusure - 你的個人健康追蹤助手

Glusure 是一個專注於血糖與健康數據追蹤的應用程式，旨在幫助使用者紀錄每日健康狀況，並提供視覺化的數據分析與醫師友善的檢視模式。

## ✨ 主要功能

-   **使用者註冊與認證**：支援新使用者註冊（名稱、密碼、Email），舊使用者預設密碼為 `1234`。
-   **個人化警示設定**：使用者可自定義血糖、血壓、體重的異常警示門檻，且設定會自動同步至雲端。
-   **使用者隔離與私隱**：資料依使用者名稱區隔，確保資料隱私。
-   **全方位健康紀錄**：支援體重、血壓、心率及各時段血糖（空腹/飯後/隨機）紀錄。
-   **脈壓警示**：醫師模式自動計算脈壓，若異常則以淡紅背景標示。
-   **智慧資料合併**：同一天的多筆紀錄會自動合併，並保留完整的血糖測量細節。
-   **資料安全**：支援 Google Sheets 作為後端資料庫。

## 🧪 測試帳號

如果您想快速了解系統呈現樣貌，可以使用以下帳號登入：
-   **名稱**：`TestUser123`
-   **密碼**：`1234`
-   **特性**：登入後若無資料，系統會自動產生過去三個月的模擬數據。

## 🚀 快速開始

### 1. 建立 Google Sheets 資料庫

請在您的試算表中建立兩個工作表：

#### **工作表 1：`HealthRecords`**

| 欄位名稱 | 說明 |
| :--- | :--- |
| `id` | 唯一識別碼 |
| `timestamp` | ISO 時間戳記 |
| `name` | 使用者名稱 |
| `weight` | 體重 (kg) |
| `systolic` | 收縮壓 (mmHg) |
| `diastolic` | 舒張壓 (mmHg) |
| `heart_rate` | 心率 (bpm) |
| `glucose_fasting` | 空腹血糖 |
| `glucose_post_meal` | 飯後血糖 |
| `glucose_random` | 隨機血糖 |
| `note` | 備註 |
| `details_json` | 詳細血糖紀錄 (JSON) |
| `updated_at` | 更新時間 |

#### **工作表 2：`UserSettings`**

| 欄位名稱 | 說明 |
| :--- | :--- |
| `name` | 使用者名稱 |
| `password` | 密碼 (預設 1234) |
| `email` | 電子郵件 |
| `thresholds` | 門檻值 (JSON) |
| `updated_at` | 更新時間 |

### 2. 設定 Google Apps Script (GAS)

1. 在試算表中點選 `擴充功能` > `Apps Script`。
2. 複製以下程式碼：

```javascript
const RECORDS_SHEET = 'HealthRecords';
const SETTINGS_SHEET = 'UserSettings';

function doPost(e) {
  return handleResponse(() => {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- 註冊 (Register) ---
    if (action === 'register') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const name = params.name;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === name) throw new Error('使用者名稱已存在');
      }
      sheet.appendRow([name, params.password || "1234", params.email || "", "", new Date()]);
      return { status: 'success' };
    }

    // --- 登入 (Login) ---
    if (action === 'login') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const name = params.name;
      const password = String(params.password || "1234");
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === name) {
          const storedPassword = String(data[i][1] || "1234");
          if (storedPassword === password) {
            return { 
              status: 'success', 
              settings: { name: name, email: data[i][2] || "", thresholds: data[i][3] || "" } 
            };
          } else {
            throw new Error('密碼錯誤');
          }
        }
      }
      // 既有舊使用者自動相容邏輯
      if (name === "TestUser123") {
         sheet.appendRow([name, "1234", "", "", new Date()]);
         return { status: 'success', settings: { name: name, email: "", thresholds: "" } };
      }
      throw new Error('找不到使用者');
    }

    // --- 更新設定 (Update Settings) ---
    if (action === 'updateSettings') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const settings = params.settings;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === settings.name) {
          sheet.getRange(i + 1, 2).setValue(settings.password);
          sheet.getRange(i + 1, 3).setValue(settings.email || "");
          sheet.getRange(i + 1, 4).setValue(settings.thresholds);
          sheet.getRange(i + 1, 5).setValue(new Date());
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'User not found' };
    }

    // --- 刪除紀錄 (Delete) ---
    if (action === 'delete') {
      const sheet = ss.getSheetByName(RECORDS_SHEET);
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == params.id) {
          sheet.deleteRow(i + 1);
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'Record not found' };
    }

    // --- 儲存紀錄 (Save) ---
    const sheet = ss.getSheetByName(RECORDS_SHEET);
    const record = params.record;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    if (record.id) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == record.id) { rowIndex = i + 1; break; }
      }
    }
    const rowData = headers.map(header => {
      switch(header) {
        case 'id': return record.id || Utilities.getUuid();
        case 'updated_at': return new Date();
        case 'details_json': return record.details || '[]';
        case 'heart_rate': return record.heartRate;
        case 'glucose_fasting': return record.glucoseFasting;
        case 'glucose_post_meal': return record.glucosePostMeal;
        case 'glucose_random': return record.glucoseRandom;
        default: return record[header] || '';
      }
    });
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success' };
  });
}

function doGet(e) {
  return handleResponse(() => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RECORDS_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    return rows.map(row => {
      const record = {};
      headers.forEach((h, i) => record[h === 'details_json' ? 'details' : h] = row[i]);
      return record;
    });
  });
}

function handleResponse(callback) {
  try {
    const result = callback();
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```
