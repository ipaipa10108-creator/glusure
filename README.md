# Glusure - 你的個人健康追蹤助手

Glusure 是一個專為長期健康追蹤設計的網頁應用程式 (PWA)，支援體重、血壓、心率及血糖的詳細紀錄，並透過視覺化圖表與個人化警示，協助使用者與醫師掌握健康趨勢。

## ✨ 核心功能 (Key Features)

### 📊 儀表板 (Dashboard)
- **視覺化趨勢圖**：提供體重、血壓、血糖的三大核心圖表，支援縮放與時間範圍切換（週/月/季/年）。
- **全螢幕模式**：圖表可放大至全螢幕，提供更清晰的檢視空間與獨立的時間軸控制。
- **個人化警示線**：根據設定的個人閾值，在圖表上繪製高/低標虛線，一眼識別異常。
- **視覺輔助對照 (Visual Aids)**：
  - **體重**：紅色(阻力訓練)、橘色(腳踏車)、綠色(健走/其他)。
  - **血壓**：紅色(高溫)、藍色(低溫)。
  - **血糖**：紅色(大餐)、綠色(節食)、紫色(斷食)。
- **時間基準日**：可設定觀察的「基準日」，快速回顧特定日期的歷史數據。

### 📝 紀錄管理 (Record Management)
- **詳細健康數據**：支援輸入體重、收縮壓、舒張壓、心率，以及空腹/飯後/隨機血糖。
- **結構化備註**：
  - **飲食**：大餐、一般、節食、斷食。
  - **運動**：健走、腳踏車、阻力訓練、其他（支援自訂名稱與時長）。
  - **天氣**：炎熱、舒適、寒冷（輔助分析血壓波動）。
  - **隨手記**：支援自訂標記顏色，並會在圖表上以對應顏色顯示數據點。
- **清單管理具備**：
  - **基準日篩選**：跳轉至特定日期查看前後區間紀錄。
  - **排序切換**：支援「新→舊」或「舊→新」排序。
  - **異常標示**：數值超過個人設定門檻時以紅字醒目提示。

### 👨‍⚕️ 醫師瀏覽模式 (Physician View)
- **日曆式彙整**：將每日數據濃縮為單一列，便於長期追蹤。
- **簡易/詳細切換**：
  - **簡易模式**：顯示當日平均數據、運動符號與備註摘要。
  - **詳細模式**：展開當日所有量測紀錄，無所遁形。
- **分時段血壓**：自動將血壓分為「白天」與「傍晚」區塊，輔助判斷日夜波動。

### ⚙️ 個人化設定 (Settings)
- **帳號安全**：支援密碼與 Email 修改。
- **自訂閾值**：可針對收縮壓、舒張壓、空腹/飯後血糖、體重高低標設定個人化門檻，超過即視為異常。
- **顯示偏好**：可自訂是否預設開啟「警示線」與「輔助視覺」，設定值會雲端同步。
- **資料快取**：採用使用者專屬的本地快取機制，提升載入速度並確保隱私。

---

## 🛠️ 部署設定 (Deployment)

本專案使用 Google Sheets 作為資料庫，透過 Google Apps Script (GAS) 提供 API 服務。

### 1. 建立 Google Sheets
請建立一個新的 Google Sheet，並新增以下兩個工作表（Sheet）：

#### 工作表 1: `HealthRecords` (儲存健康數據)
第一列 (Header) 請依序填入以下欄位：
`id` | `timestamp` | `name` | `weight` | `systolic` | `diastolic` | `heart_rate` | `glucose_fasting` | `glucose_post_meal` | `glucose_random` | `note` | `weather` | `note_content` | `details_json` | `updated_at`

#### 工作表 2: `UserSettings` (儲存使用者設定)
第一列 (Header) 請依序填入以下欄位：
`name` | `password` | `email` | `thresholds` | `updated_at` | `auxiliaryLineMode` (Optional)

### 2. 部署 Google Apps Script
1. 在試算表中點選「擴充功能」→「Apps Script」。
2. 將下方程式碼完整複製貼上並儲存。

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
          // 儲存 auxiliaryLineMode (如果有的話)
          if(s.auxiliaryLineMode) {
             // 假設 auxiliaryLineMode 存於第 6 欄 (需手動在 Google Sheet 新增標題)
             // 若不想更動 Sheet 結構，可將此設定合併入 thresholds JSON 字串中
             // 此處示範忽略或需使用者自行擴充欄位
          }
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

    // --- 儲存/更新紀錄 ---
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

3. 部署為網頁應用程式：
    - 點選右上角「部署」->「新增部署作業」。
    - 類型選擇「網頁應用程式」。
    - 執行身分：**我 (Me)**。
    - 存取權限：**所有人 (Anyone)**。
    - 複製產生的 **網頁應用程式網址**。

### 3. 本地環境設定
於專案根目錄建立 `.env` 檔案，並填入您的 GAS 部署網址：
```bash
VITE_API_URL=https://script.google.com/macros/s/您的部署ID/exec
```

啟動專案：
```bash
npm install
npm run dev
```

---

## 🚀 更新與維護 (Update & Maintenance)

若您是開發者或需要更新本專案：

1. **取得最新程式碼**：
   ```bash
   git pull origin main
   ```
2. **安裝依賴** (若有新增套件)：
   ```bash
   npm install
   ```
3. **建置專案**：
   ```bash
   npm run build
   ```
4. **部署**：
   將 `dist` 資料夾內的檔案上傳至您的網頁伺服器或 GitHub Pages。

---

## 📅 更新紀錄 (Update Log)

### 2026-01-01
- **紀錄成功回饋 (New)**：新增紀錄後，畫面中央會顯示淡出的「紀錄成功」提示，隨後自動返回儀表板，確認資料已送出。
- **紀錄刪除回饋 (New)**：刪除紀錄時，會顯示紅色淡出「刪除成功」提示，提供更明確的操作反饋。
- **儲存狀態優化 (New)**：
  - 新增紀錄或運動時，按鈕會顯示「儲存中...」並鎖定介面，直到資料成功寫入後才關閉視窗，防止使用者誤以為已儲存而提前離開。
- **手勢導航 (New)**：
  - 設定中新增「左右滑動切換頁面」開關（預設關閉）。
  - 開啟後，可在主畫面透過左右滑動快速在「儀表板 / 紀錄列表 / 醫師模式」間切換，提供類 App 的流暢體驗。
- **圖表輔助線模式 (New)**：
  - 在設定中可選擇輔助線的呈現方式：
    - **Y軸 (預設)**：以垂直色塊顯示，視覺效果最強烈。
    - **X軸 (New)**：將折線圖的線段染色顯示 (例如阻力訓練變紅色)。若資料點孤立無連線，則自動切換回 Y軸模式確保可見性。

### 2025-12-29
- **紀錄管理增強**：新增「基準日」篩選功能，與「排序切換」（新→舊/舊→新）按鈕。
- **設定持久化修復**：修復顯示偏好（警示線/輔助線）無法儲存的問題，現在會正確同步至雲端。
- **穩定性提升**：修復圖表控制器遺失導致的白畫面問題。
- **醫師檢視修復**：修正切換日期範圍 (如近一週) 時，上午時段資料會被錯誤過濾的問題，並加入「基準日」篩選功能。
- **快速運動紀錄 (New)**：
  - 儀表板新增「💪 運動」快捷按鈕，開啟專屬運動紀錄視窗。
  - 支援快速選擇健走、腳踏車、阻力訓練，或自訂運動項目。
  - 可輸入運動時間與備註，自動整合至每日紀錄中。
- **介面優化**：
  - 列表排序按鈕改為直覺的箭頭圖示。
  - 運動紀錄預設時間修正為本地時間。
  - 新使用者預設關閉警示線與輔助線，保持畫面簡潔。
  - **細節精修**：優化儀表板版面配置，解決手機版擁擠問題；圖表控制開關改為更具質感的燈號顯示 (🟢亮燈=開啟)。
  - **備註提示擴展**：「其他隨手記」的顏色提示現已擴展至血壓 (心跳) 與血糖圖表，讓只量血壓或血糖的使用者也能看到備註提示。

### 2025-12-28
- **視覺化輔助 (New)**：
  - **輔助對照線**：圖表自動顯示運動（紅/橘/綠）、天氣（紅/藍）、飲食（紅/綠/紫）的垂直色塊，幫助分析數值波動。
  - **自訂顏色標記**：新增紀錄時可為「其他隨手記」選擇代表色，該點將在體重圖表中以選定顏色凸顯。
  - **顯示控制**：可在儀表板與設定中隨時開啟/關閉這些輔助視覺效果。
- **資料快取優化**：實作使用者專屬的本地 localStorage 快取。
- **醫師檢視優化**：修復體重欄位在行動版隱藏的問題，確保資料完整顯示。

### 2025-12-26
- **醫師檢視優化 (New)**：
  - **分時段血壓顯示**：血壓欄位自動拆分為「白天 (<16:00)」與「傍晚 (>=16:00)」。
  - **簡易/詳細模式**：新增切換開關，詳細模式可列出單日所有紀錄。
- **紀錄列表優化 (New)**：
  - **備註圖示顯示**：列表直接顯示備註 Emoji (🥩, 🚶)，點擊可查看詳情。
- **儀表板顯示優化**: 新增「警示線」開關。
