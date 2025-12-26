# Glusure - 你的個人健康追蹤助手

Glusure 是一個專注於血糖與健康數據追蹤的應用程式，旨在幫助使用者紀錄每日健康狀況，並提供視覺化的數據分析與醫師友善的檢視模式。

## ✨ 主要功能

-   **使用者隔離與私隱**：系統以使用者名稱為 Key 區隔資料，使用者僅能瀏覽與管轄自己的健康紀錄，確保資料私隱。
-   **全方位健康紀錄**：支援體重、血壓（收縮壓/舒張壓）、心率及各時段血糖（空腹/飯後/隨機）紀錄。
-   **心跳追蹤與警示**：血壓圖表整合心跳趨勢，醫師模式中若偵測到異常心跳（>90 或 <60 bpm）會自動以紅色標示警示。
-   **智慧資料合併**：同一天的多筆紀錄會自動合併，並保留完整的血糖測量細節。
-   **視覺化儀表板**：提供直觀的圖表分析，協助您掌握健康趨勢。
-   **進階醫師檢視模式**：
    -   專為醫療諮詢設計的每日彙整列表。
    -   **自動排序**：預設由舊到新排序，方便醫師按時間軸查看病情演進。
    -   **介面優化**：針對手機版面進行優化，緊湊呈現「日期、血壓、血糖、體重」四大核心數據。
    -   **週末標記**：週六、週日紀錄以橘色背景突顯，方便辨識生活作息差異對數值的影響。
-   **資料安全**：支援 Google Sheets 作為後端資料庫，數據完全掌握在您手中。

## 🧪 測試帳號

如果您想快速了解系統呈現樣貌，可以使用以下帳號登入：
-   **名稱**：`TestUser123`
-   **特性**：登入後若無資料，系統會自動產生**過去三個月**的模擬健康數據（包含血糖變化、血壓心跳與體重趨勢），讓您即刻體驗完整的儀表板與醫師模式功能。

## 🚀 快速開始

### 1. 建立 Google Sheets 資料庫

本專案使用 Google Sheets 與 Google Apps Script (GAS) 作為後端 API。請在您的試算表中建立兩個工作表：

#### **工作表 1：`HealthRecords`**

| 欄位名稱 (Header) | 說明 |
| :--- | :--- |
| `id` | 唯一識別碼 |
| `timestamp` | ISO 8601 時間戳記 |
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
| `updated_at` | 最後更新時間 |

#### **工作表 2：`UserSettings`**

| 欄位名稱 (Header) | 說明 |
| :--- | :--- |
| `name` | 使用者名稱 (唯一識別) |
| `password` | 登入密碼 (預設建議 1234) |
| `thresholds` | JSON 格式的警示閾值設定 |
| `updated_at` | 最後更新時間 |

### 2. 設定 Google Apps Script (GAS)

1. 在試算表中點選 `擴充功能` > `Apps Script`。
2. 複製以下程式碼（處理登入、紀錄儲存與設定更新）：

```javascript
const RECORDS_SHEET = 'HealthRecords';
const SETTINGS_SHEET = 'UserSettings';

function doPost(e) {
  return handleResponse(() => {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- 使用者登入 (Login) ---
    if (action === 'login') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const name = params.name;
      const password = String(params.password || "1234");
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === name) {
          if (String(data[i][1]) === password) {
            return { status: 'success', settings: { name: name, thresholds: data[i][2] } };
          } else {
            throw new Error('密碼錯誤');
          }
        }
      }
      // 若找不到使用者，自動建立預設帳號
      sheet.appendRow([name, "1234", "", new Date()]);
      return { status: 'success', settings: { name: name, thresholds: "" } };
    }

    // --- 更新個人設定 (Update Settings) ---
    if (action === 'updateSettings') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const settings = params.settings;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === settings.name) {
          sheet.getRange(i + 1, 2).setValue(settings.password);
          sheet.getRange(i + 1, 3).setValue(settings.thresholds);
          sheet.getRange(i + 1, 4).setValue(new Date());
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'User not found' };
    }

    // --- 刪除紀錄 (Delete) ---
    if (action === 'delete') {
      const sheet = ss.getSheetByName(RECORDS_SHEET);
      const idToDelete = params.id;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == idToDelete) {
          sheet.deleteRow(i + 1);
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'Record not found' };
    }

    // --- 儲存或更新紀錄 (Save Record) ---
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
        case 'details_json': return record.details || '';
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
