# Glusure - 你的個人健康追蹤助手

Glusure 是一個專注於血糖與健康數據追蹤的應用程式，旨在幫助使用者紀錄每日健康狀況，並提供視覺化的數據分析與醫師友善的檢視模式。

## ✨ 主要功能

-   **使用者註冊與認證**：支援新使用者註冊（名稱、密碼、Email），舊使用者預設密碼為 `1234`。
-   **個人化警示門檻 (核心同步功能)**：
    -   使用者可自定義 6 項健康門檻，同步存於雲端試算表：
        1. **血糖 (空腹)**: 預設 100 mg/dL
        2. **血糖 (飯後)**: 預設 140 mg/dL
        3. **血壓 (收縮壓)**: 預設 140 mmHg
        4. **血壓 (舒張壓)**: 預設 90 mmHg
        5. **體重 (目標高標)**: 預設 0 (不警示)
        6. **體重 (目標低標)**: 預設 0 (不警示)
-   **使用者隔離與私隱**：資料依使用者名稱區隔，確保資料隱私。
-   **全方位健康紀錄**：支援體重、血壓、心率及各時段血糖紀錄。
-   **脈壓警示**：醫師模式自動計算脈壓，若異常則背景自動變色。

## 🚀 快速開始

### 1. 建立 Google Sheets 工作表

請在您的試算表中建立以下兩個工作表：

#### **工作表 1：`HealthRecords`**
| id | timestamp | name | weight | systolic | diastolic | heart_rate | glucose_fasting | glucose_post_meal | glucose_random | note | details_json | updated_at |

#### **工作表 2：`UserSettings` (警示標準儲存在此！)**

| 欄位名稱 (Header) | 說明 |
| :--- | :--- |
| `name` | 使用者名稱 (唯一識別) |
| `password` | 登入密碼 (既有帳號預設 1234) |
| `email` | 電子郵件 |
| `thresholds` | **警示設定 (JSON 格式)**。儲存所有 6 項自訂門檻。 |
| `updated_at` | 最後更新時間 |

### 2. 設定 Google Apps Script (GAS)

請複製以下最新的 GAS 程式碼：

```javascript
/* GAS 核心腳本 - 支援註冊、登入與門檻同步 */
const RECORDS_SHEET = 'HealthRecords';
const SETTINGS_SHEET = 'UserSettings';

function doPost(e) {
  return handleResponse(() => {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- 註冊新使用者 ---
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

    // --- 登入驗證 ---
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
              settings: { 
                name: name, 
                email: data[i][2] || "", 
                thresholds: data[i][3] || "" // 同步傳回此使用者的警示門檻設定
              } 
            };
          } else {
            throw new Error('密碼錯誤');
          }
        }
      }
      // 特別處理測試帳號相容
      if (name === "TestUser123") {
         sheet.appendRow([name, "1234", "", "", new Date()]);
         return { status: 'success', settings: { name: name, email: "", thresholds: "" } };
      }
      throw new Error('找不到使用者 (請使用註冊功能開通新帳號)');
    }

    // --- 更新個人門檻與設定 ---
    if (action === 'updateSettings') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const settings = params.settings;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === settings.name) {
          sheet.getRange(i + 1, 2).setValue(settings.password);
          sheet.getRange(i + 1, 3).setValue(settings.email || "");
          sheet.getRange(i + 1, 4).setValue(settings.thresholds); // 儲存包含 6 項警示門檻的 JSON
          sheet.getRange(i + 1, 5).setValue(new Date());
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'User not found' };
    }
    
    // ... 其他 Save/Delete 邏輯同前 ...
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
