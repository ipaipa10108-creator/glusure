# Glusure - 你的個人健康追蹤助手

Glusure 是一個專注於血糖與健康數據追蹤的應用程式，旨在幫助使用者紀錄每日健康狀況，並提供視覺化的數據分析與醫師友善的檢視模式。

## ✨ 主要功能

-   **全方位健康紀錄**：支援體重、血壓（收縮壓/舒張壓）、心率及各時段血糖（空腹/飯後/隨機）紀錄。
-   **智慧資料合併**：同一天的多筆紀錄會自動合併，並保留完整的血糖測量細節。
-   **視覺化儀表板**：提供直觀的圖表分析，協助您掌握健康趨勢。
-   **醫師檢視模式**：專為醫療諮詢設計的列表視角，方便醫師快速檢視您的歷史紀錄。
-   **資料安全**：支援 Google Sheets 作為後端資料庫，數據完全掌握在您手中。

## 🚀 快速開始

### 1. 建立 Google Sheets 資料庫

本專案使用 Google Sheets 與 Google Apps Script (GAS) 作為後端 API。請依照以下格式設定您的 Google Sheet：

**工作表名稱**：`HealthRecords`

| 欄位名稱 (Header) | 說明 | 對應 App 欄位 | 備註 |
| :--- | :--- | :--- | :--- |
| `id` | 唯一識別碼 | `id` | 由 App 自動生成 |
| `timestamp` | ISO 8601 時間戳記 | `timestamp` | 紀錄日期 |
| `name` | 使用者名稱 | `name` | |
| `weight` | 體重 (kg) | `weight` | |
| `systolic` | 收縮壓 (mmHg) | `systolic` | |
| `diastolic` | 舒張壓 (mmHg) | `diastolic` | |
| `heart_rate` | 心率 (bpm) | `heartRate` | |
| `glucose_fasting` | 空腹血糖 (mg/dL) | `glucoseFasting` | 最新一筆數值 |
| `glucose_post_meal` | 飯後血糖 (mg/dL) | `glucosePostMeal` | 最新一筆數值 |
| `glucose_random` | 隨機血糖 (mg/dL) | `glucoseRandom` | 最新一筆數值 |
| `note` | 備註 | `note` | |
| `details_json` | 詳細血糖紀錄 (JSON) | `details` | 儲存單日所有測量細節 |
| `updated_at` | 最後更新時間 | - | 建議在 GAS 中自動寫入 |

### 2. 設定 Google Apps Script (GAS)

1. 在您的 Google Sheet 中點選 `擴充功能` > `Apps Script`。
2. 將以下程式碼複製貼上至編輯器中（取代預設程式碼）：

```javascript
const SHEET_NAME = 'HealthRecords';

function doGet(e) {
  return handleResponse(() => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // 將陣列轉換為物件陣列
    const records = rows.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        // 還原 details_json 為 details 字串 (App 端會再 parse)
        if (header === 'details_json') {
           record['details'] = row[index];
        } else {
           record[header] = row[index];
        }
      });
      // 轉換欄位名稱以符合 frontend type (若 Sheet header 與 Type 不同需在此轉換，目前假設一致或前端處理)
      // 這裡簡單回傳 Sheet 的欄位值
      return record;
    });

    return records;
  });
}

function doPost(e) {
  return handleResponse(() => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const params = JSON.parse(e.postData.contents);
    const action = params.action; // 'save' or 'delete'
    const record = params.record; // record data

    if (action === 'delete') {
      const idToDelete = params.id;
      const data = sheet.getDataRange().getValues();
      // 假設 ID 在第一欄 (index 0)
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == idToDelete) {
          sheet.deleteRow(i + 1);
          return { status: 'success', message: 'Deleted' };
        }
      }
      return { status: 'error', message: 'Record not found' };
    }
    
    // Save or Update
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // Check if record exists (Update)
    if (record.id) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == record.id) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    // Prepare row data
    const rowData = headers.map(header => {
      if (header === 'updated_at') return new Date();
      if (header === 'details_json') return record.details || ''; // App 傳來的是 details 字串
      // 對應前端 camelCase 到 Sheet snake_case (如果欄位名完全一致可省略 mapping)
      // 這裡做簡單的 mapping 示範，或確保 Sheet header 與前端一致
      // 假設 Sheet header 使用 snake_case，前端傳來的是 camelCase
      switch(header) {
        case 'heart_rate': return record.heartRate;
        case 'glucose_fasting': return record.glucoseFasting;
        case 'glucose_post_meal': return record.glucosePostMeal;
        case 'glucose_random': return record.glucoseRandom;
        default: return record[header] || '';
      }
    });

    if (rowIndex > 0) {
      // Update existing row
       sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new row
      sheet.appendRow(rowData);
    }
    
    return { status: 'success', message: 'Saved' };
  });
}

// 處理 CORS 與回應格式
function handleResponse(callback) {
  try {
    const result = callback();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 點選 `部署` > `新增部署` > 類型選擇 `網頁應用程式`。
4. 存取權限設定為 `任何人 (Any one)`（**注意：這是為了讓 App 能跨網域存取，請確保您的 API URL 不外流**）。
5. 複製取得的 **Web App URL**。

### 3. 環境變數設定

複製 `.env.example` 為 `.env` (本地開發用) 或在 GitHub Secrets 設定 (部署用)：

```bash
VITE_API_URL=https://script.google.com/macros/s/您的SCRIPT_ID/exec
```

### 4. 本地開發

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev
```

## 📦 自動部署 (GitHub Pages)

本專案已設定 GitHub Actions，當您 Push 程式碼到 `main` 分支時，會自動建置並部署至 GitHub Pages。

**設定步驟：**

1. 將程式碼 Push 到 GitHub Repository。
2. 在 GitHub Repo 頁面，進入 `Settings` > `Pages`，確認 Source 設定為 `GitHub Actions`。
3. 進入 `Settings` > `Secrets and variables` > `Actions`。
4. 點選 `New repository secret`，新增：
    - Name: `VITE_API_URL`
    - Value: `您的 Google Apps Script Web App URL`
5. 下次 Push `main` 分支時，Actions 將會自動執行並部署。
