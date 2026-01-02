# Glusure - 你的個人健康追蹤助手

Glusure 是一個專為長期健康追蹤設計的網頁應用程式 (PWA)，支援體重、血壓、心率及血糖的詳細紀錄，並透過視覺化圖表與個人化警示，協助使用者與醫師掌握健康趨勢。

---

## ✨ 核心功能

### 📊 健康儀表板
| 功能 | 說明 |
|------|------|
| **視覺化趨勢圖** | 體重、血壓、血糖三大核心圖表，支援縮放與時間範圍切換（週/雙週/月/季/半年/年/全部） |
| **全螢幕模式** | 圖表可放大至全螢幕，提供更清晰的檢視空間與獨立的時間軸控制 |
| **個人化警示線** | 根據設定的個人閾值，在圖表上繪製高/低標虛線 |
| **時間基準日** | 可設定「基準日」，快速回顧特定日期的歷史數據 |
| **快速運動紀錄** | 儀表板上的「💪 運動」按鈕，快速新增運動紀錄 |

#### 視覺輔助對照
圖表上會以顏色標示運動、天氣、飲食等資訊，幫助分析數值波動：
- **體重圖**：阻力訓練(深紅)、腳踏車(橘)、健走/其他(綠)
- **血壓圖**：天氣炎熱(紅)、天氣寒冷(藍)
- **血糖圖**：大餐(紅)、節食(綠)、斷食(紫)

> 可在設定中選擇 **Y軸模式 (垂直色塊)** 或 **X軸模式 (線段變色)**，並自訂各類別的顏色。

---

### 📝 紀錄管理 (Record Management)

#### 支援的健康數據
- 體重 (kg)
- 血壓：收縮壓、舒張壓、心率
- 血糖：空腹、飯後、隨機

#### 結構化備註
| 類型 | 選項 |
|------|------|
| 飲食 | 大餐、一般、節食、斷食 |
| 運動 | 健走、腳踏車、阻力訓練、其他（支援自訂名稱與時長） |
| 天氣 | 炎熱、舒適、寒冷 |
| 隨手記 | 自由輸入，可選擇標記顏色 |

#### 列表功能
- 基準日篩選：跳轉至特定日期
- 排序切換：新→舊 / 舊→新
- 異常標示：超過閾值以紅字提示
- 刪除回饋：刪除成功時顯示紅色「刪除成功」提示

---

### 👨‍⚕️ 醫師瀏覽模式
| 功能 | 說明 |
|------|------|
| **日曆式彙整** | 每日數據濃縮為單一列，便於長期追蹤 |
| **簡易/詳細切換** | 簡易模式顯示平均數據；詳細模式展開所有紀錄 |
| **分時段血壓** | 自動拆分為「白天 (<16:00)」與「傍晚 (≥16:00)」區塊 |
| **基準日篩選** | 與紀錄列表共用的日期跳轉功能 |

---

### ⚙️ 個人化設定

#### 帳號管理
- 密碼與 Email 修改

#### 顯示偏好
| 設定項目 | 說明 |
|---------|------|
| 預設顯示警示線 | 圖表上是否顯示高/低標虛線 |
| 預設顯示輔助線 | 圖表上是否顯示視覺輔助色塊 |
| 輔助線呈現方式 | Y軸 (垂直色塊) 或 X軸 (線段變色) |
| 輔助線顏色設定 | 自訂各類別的顏色，含「恢復預設顏色」按鈕 |
| 左右滑動切換頁面 | 啟用後可滑動切換儀表板/紀錄/醫師模式 |

#### 警示閾值自訂
- 血壓：收縮壓高標、舒張壓高標
- 血糖：空腹高標、飯後高標
- 體重：體重高標、體重低標

---

## 🛠️ 部署設定

本專案使用 Google Sheets 作為資料庫，透過 Google Apps Script (GAS) 提供 API 服務。

### 1. 建立 Google Sheets

#### 工作表 1: `HealthRecords`
第一列 (Header) 請依序填入：
```
id | timestamp | name | weight | systolic | diastolic | heart_rate | glucose_fasting | glucose_post_meal | glucose_random | note | weather | note_content | details_json | updated_at
```

#### 工作表 2: `UserSettings`
第一列 (Header) 請依序填入：
```
name | password | email | thresholds | updated_at
```

### 2. 部署 Google Apps Script

1. 在試算表中點選「擴充功能」→「Apps Script」
2. 貼上以下程式碼並儲存：

```javascript
const RECORDS_SHEET = 'HealthRecords';
const SETTINGS_SHEET = 'UserSettings';

function doPost(e) {
  return handleResponse(() => {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'register') {
      const sheet = ss.getSheetByName(SETTINGS_SHEET);
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.name) throw new Error('使用者名稱已存在');
      }
      sheet.appendRow([params.name, params.password || "1234", params.email || "", "", new Date()]);
      return { status: 'success' };
    }

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
      throw new Error('找不到使用者');
    }

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
   - 點選「部署」→「新增部署作業」
   - 類型：網頁應用程式
   - 執行身分：我 (Me)
   - 存取權限：所有人 (Anyone)
   - 複製產生的網址

### 3. 本地環境設定

建立 `.env` 檔案：
```bash
VITE_API_URL=https://script.google.com/macros/s/您的部署ID/exec
```

啟動專案：
```bash
npm install
npm run dev
```

---

## 🚀 更新與維護

```bash
# 1. 取得最新程式碼
git pull origin main

# 2. 安裝依賴 (若有新增套件)
npm install

# 3. 建置專案
npm run build

# 4. 部署：將 dist 資料夾上傳至網頁伺服器或 GitHub Pages
```

---

## 📅 更新紀錄

### 2026-01-02
- **脈壓差警示**：收縮壓與舒張壓差距超出設定範圍時，圖表上顯示紅色警示點與放大標記
- **超過警示點顏色**：可自訂超過閾值的資料點顏色（預設紅色）
- **醫師模式脈壓異常標示**：日/夜血壓區塊脈壓差異常時顯示紅色邊框
- **使用說明功能**：設定頁面新增「? 說明」按鈕，點擊查看完整功能指引
- **脈壓差閾值設定**：可自訂脈壓差高標（預設 > 60 警示）與低標（預設 < 30 警示）

### 2026-01-01
- **輔助線顏色自訂**：可在設定中自訂各輔助線顏色，並支援「恢復預設顏色」
- **X軸輔助線模式**：新增線段變色顯示方式，圖例標籤保持可見
- **紀錄成功/刪除回饋**：新增淡出提示訊息
- **儲存狀態優化**：按鈕顯示「儲存中...」直到資料寫入完成
- **手勢導航**：啟用後可左右滑動切換頁面

### 2025-12-29
- **快速運動紀錄**：儀表板「💪 運動」快捷按鈕
- **紀錄管理增強**：基準日篩選、排序切換
- **備註提示擴展**：顏色標記擴展至血壓與血糖圖表

### 2025-12-28
- **視覺化輔助**：運動/天氣/飲食輔助對照線
- **自訂顏色標記**：隨手記可選擇代表色

### 2025-12-26
- **醫師檢視優化**：分時段血壓、簡易/詳細模式
- **紀錄列表優化**：備註 Emoji 顯示
