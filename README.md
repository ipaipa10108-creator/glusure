# Glusure - 你的個人健康追蹤助手

## ✨ 主要功能

- **使用者註冊與認證**：支援新使用者註冊（名稱、密碼、Email）
- **個人化警示門檻**：自訂血糖/血壓/體重門檻，跨裝置同步
- **全方位健康紀錄**：體重、血壓、心率、血糖紀錄
- **圖表全螢幕放大**：點擊放大按鈕進入全螢幕模式，可獨立切換時間範圍
- **異常值著色**：紀錄清單中，超過門檻的數值會以紅色顯示
- **視覺化輔助**：圖表自動標示運動、天氣、飲食狀況，並支援自訂記事顏色

## 🚀 快速開始

### 1. Google Sheets 工作表

#### `HealthRecords`
id | timestamp | name | weight | systolic | diastolic | heart_rate | glucose_fasting | glucose_post_meal | glucose_random | note | weather | note_content | details_json | updated_at

#### `UserSettings` (警示設定存於此)
| 欄位 | 說明 |
|------|------|
| name | 使用者名稱 |
| password | 密碼 (預設 1234) |
| email | 電子郵件 |
| thresholds | JSON 格式的 6 項警示門檻 |
| updated_at | 更新時間 |

### 2. 完整 Google Apps Script

> ⚠️ **重要**：請確保您已部署最新版本的腳本！

```javascript
const RECORDS_SHEET = 'HealthRecords';
const SETTINGS_SHEET = 'UserSettings';

function doPost(e) {
  return handleResponse(() => {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- 註冊 ---
    if (action === 'register') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.name) throw new Error('使用者名稱已存在');
      }
      sheet.appendRow([params.name, params.password || "1234", params.email || "", "", new Date()]);
      return { status: 'success' };
    }

    // --- 登入 ---
    if (action === 'login') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const password = String(params.password || "1234");
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.name) {
          if (String(data[i][1] || "1234") === password) {
            return { 
              status: 'success', 
              settings: { name: params.name, email: data[i][2] || "", thresholds: data[i][3] || "" } 
            };
          }
          throw new Error('密碼錯誤');
        }
      }
      // TestUser123 特例
      if (params.name === "TestUser123") {
        sheet.appendRow([params.name, "1234", "", "", new Date()]);
        return { status: 'success', settings: { name: params.name, email: "", thresholds: "" } };
      }
      throw new Error('找不到使用者');
    }

    // --- 更新設定 ---
    if (action === 'updateSettings') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      const s = params.settings;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === s.name) {
          sheet.getRange(i + 1, 2).setValue(s.password);
          sheet.getRange(i + 1, 3).setValue(s.email || "");
          sheet.getRange(i + 1, 4).setValue(s.thresholds);
          sheet.getRange(i + 1, 5).setValue(new Date());
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'User not found' };
    }
    
    // --- 刪除 ---
    if (action === 'delete') {
      const sheet = ss.getSheetByName(RECORDS_SHEET);
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == params.id) {
          sheet.deleteRow(i + 1);
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'Not found' };
    }

    // --- 儲存 (必須有 record) ---
    if (!params.record) {
      return { status: 'error', message: '未知的動作: ' + action };
    }
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
    const rowData = headers.map(h => {
      if (h === 'id') return record.id || Utilities.getUuid();
      if (h === 'updated_at') return new Date();
      if (h === 'details_json') return record.details || '[]';
      if (h === 'heart_rate') return record.heartRate;
      if (h === 'glucose_fasting') return record.glucoseFasting;
      if (h === 'glucose_post_meal') return record.glucosePostMeal;
      if (h === 'glucose_random') return record.glucoseRandom;
      if (h === 'note_content') return record.noteContent;
      return record[h] || '';
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
    return data.slice(1).map(row => {
      const r = {};
      headers.forEach((h, i) => r[h === 'details_json' ? 'details' : h] = row[i]);
      return r;
    });
  });
}

function handleResponse(cb) {
  try {
    return ContentService.createTextOutput(JSON.stringify(cb())).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3. 部署步驟

1. 開啟您的 Google Sheets 試算表
2. 點選「擴充功能」→「Apps Script」
3. 完整複製上方 GAS 程式碼並貼上
4. 點選「部署」→「新增部署作業」
5. 選擇「網頁應用程式」
6. 存取權限設為「所有人」
7. 點選「部署」並複製部署網址

### 4. 設定環境變數

將部署後的網址填入專案根目錄的 `.env` 檔案中：
```
VITE_API_URL=https://script.google.com/macros/s/您的部署ID/exec
```

### 5. 啟動開發伺服器

```bash
npm install
npm run dev
```

## 🆕 最新更新

- **設定齒輪移至右上角**：導覽列更簡潔，主要標籤有更大空間
- **恢復預設值按鈕**：在個人設定中可快速重設所有警示門檻
- **紀錄清單優化**：
  - 隱藏數值為 0 的欄位
  - 異常值（超過門檻）以紅色粗體顯示
- **圖表全螢幕功能**：每個圖表右上角有放大按鈕，進入全螢幕模式並可獨立切換時間範圍。
- **儀表板警示線 (NEW)**：
  - 體重、血壓、血糖圖表新增個人化「警示門檻線」。
  - 依據設定自動顯示「高標/低標」虛線，視覺化呈現過高或過低趨勢。
- **進階備註與天氣紀錄 (NEW)**：
  - **天氣狀況**：新增「炎熱/舒適/寒冷」天氣紀錄，輔助分析血壓變化。
  - **詳細備註**：全新備註介面，支援結構化紀錄「飲食狀況」（大餐、斷食等）與「運動紀錄」（項目、時長）。
- **醫師檢視優化 (NEW)**：
  - **分時段血壓顯示**：血壓欄位自動拆分為「白天 (<16:00)」與「傍晚 (>=16:00)」兩個區塊，並以暖色/冷色系背景區分，便於觀察日夜血壓變化。
  - **整合天氣與備註**：每日彙整列表整合天氣圖示與備註 Emoji，點擊可查看詳細內容。
- **紀錄列表優化 (NEW)**：
  - **備註圖示顯示**：在「編輯紀錄」列表中的時間欄位旁，直接顯示備註項目 Emoji (🥩, 🚶)，點擊即可快速查看詳細備註內容。
- **儀表板顯示優化**: 新增「警示線」開關，可隱藏圖表上的紅線，避免影響數據可讀性。
- **醫師模式增強**: 新增「簡易/詳細」切換功能。「詳細模式」可依時間順序列出當日所有量測紀錄，方便追蹤細微變化。
- **介面優化**：新增紀錄按鈕置中、優化 RWD 排版。
- **視覺化輔助 (NEW)**：
  - **輔助對照線**: 圖表將根據紀錄內容自動顯示對照色塊（如紅線代表阻力訓練/大餐/熱天），幫助分析數值波動原因。
  - **自訂顏色標記**: 新增紀錄時可為「其他隨手記」選擇代表色，該點將在體重圖表中以選定顏色凸顯。
  - **顯示控制**: 可在儀表板與設定中隨時開啟/關閉這些輔助視覺效果。
