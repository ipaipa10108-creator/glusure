import { HealthRecord, GlucoseReading, UserSettings } from '../types';
import {
    isTursoConfigured,
    initTursoDb,
    getRecordsFromTurso,
    saveRecordToTurso,
    deleteRecordFromTurso,
    loginTurso,
    registerUserTurso,
    updateUserSettingsTurso
} from './tursoApi';


const API_URL = import.meta.env.VITE_API_URL;

// On load, init Turso if configured
if (isTursoConfigured) {
    initTursoDb();
}

export const fetchRecordsFromGoogleSheets = async (): Promise<HealthRecord[]> => {
    const parseOptionalNumber = (val: any) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    };

    if (!API_URL) return [];

    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();
        if (!Array.isArray(rawData)) return [];

        return rawData.map((item: any) => {
            let details = item.details;
            if (!details || details === '[]') {
                const generatedDetails: GlucoseReading[] = [];
                if (item.glucose_fasting) generatedDetails.push({ type: 'fasting', value: Number(item.glucose_fasting), timestamp: item.timestamp });
                if (item.glucose_post_meal) generatedDetails.push({ type: 'postMeal', value: Number(item.glucose_post_meal), timestamp: item.timestamp });
                if (item.glucose_random) generatedDetails.push({ type: 'random', value: Number(item.glucose_random), timestamp: item.timestamp });
                details = JSON.stringify(generatedDetails);
            }

            return {
                id: String(item.id),
                timestamp: item.timestamp,
                name: item.name,
                weight: Number(item.weight) || 0,
                systolic: Number(item.systolic) || 0,
                diastolic: Number(item.diastolic) || 0,
                heartRate: parseOptionalNumber(item.heart_rate),
                glucoseFasting: parseOptionalNumber(item.glucose_fasting),
                glucosePostMeal: parseOptionalNumber(item.glucose_post_meal),
                glucoseRandom: parseOptionalNumber(item.glucose_random),
                details: details,
                note: item.note,
                weather: item.weather ? (String(item.weather) as any) : undefined,
                noteContent: item.note_content
            };
        });
    } catch (e) {
        console.error('Failed to fetch from GAS:', e);
        return [];
    }
};

// 儲存狀態旗標，用來防止重複執行背景匯入
let hasTriggeredBackgroundSync = false;

export const getRecords = async (): Promise<HealthRecord[]> => {
    if (isTursoConfigured) {
        try {
            const tursoRecords = await getRecordsFromTurso();

            // Background Initialization Sync: 若 Turso 為空，且還沒觸發過同步，嘗試從 Google Sheets 補齊
            if (tursoRecords.length === 0 && !hasTriggeredBackgroundSync && API_URL) {
                hasTriggeredBackgroundSync = true;
                console.log("Turso is empty. Triggering background sync from Google Sheets...");
                // Fire and forget
                fetchRecordsFromGoogleSheets().then(async (sheetsRecords) => {
                    if (sheetsRecords.length > 0) {
                        let count = 0;
                        for (const record of sheetsRecords) {
                            await saveRecordToTurso(record);
                            count++;
                        }
                        console.log(`Background sync completed. Migrated ${count} records to Turso. Refresh app to see them if they haven't appeared.`);
                    }
                }).catch(e => console.error("Background sync failed:", e));
            }

            return tursoRecords;
        } catch (e) {
            console.error('Turso primary fetch failed, falling back to Google Sheets:', e);
            // Fallback to Google Sheets
        }
    }

    if (!API_URL) {
        console.warn('VITE_API_URL is not defined, using localStorage fallback');
        const data = localStorage.getItem('glusure_data');
        return data ? JSON.parse(data) : [];
    }

    return await fetchRecordsFromGoogleSheets();
};

export const migrateDataToTurso = async (userName: string): Promise<{ success: boolean; message: string }> => {
    if (!isTursoConfigured) return { success: false, message: "尚未設定 Turso，請先在 .env 加入連線資訊" };
    if (!API_URL) return { success: false, message: "尚未設定 Google Sheets API 網址，無法取得舊資料" };

    try {
        const sheetsRecords = await fetchRecordsFromGoogleSheets();
        const userRecords = sheetsRecords.filter(r => r.name === userName);

        if (userRecords.length === 0) {
            return { success: false, message: "在 Google Sheets 中找不到該使用者的資料" };
        }

        let migratedCount = 0;
        for (const record of userRecords) {
            await saveRecordToTurso(record);
            migratedCount++;
        }

        return { success: true, message: `成功將 ${migratedCount} 筆資料轉移至 Turso！` };
    } catch (e: any) {
        return { success: false, message: `轉移失敗：${e.message}` };
    }
};

export const saveRecord = async (record: HealthRecord): Promise<void> => {
    // 1. 若配置了 Turso，先寫入 Turso（提供快速的 UX 回饋）
    if (isTursoConfigured) {
        try {
            await saveRecordToTurso(record);
        } catch (e) {
            console.error('Turso save failed, will try Google Sheets as fallback:', e);
            // 本次 Turso 寫入失敗，但會繼續往下寫入 Sheets 作為備援
        }
    }

    // 2. 背景備援：將資料也寫入 Google Sheets (Fire-and-forget or await depending on fallback need)
    // 為了保證一致性，我們對 Sheets 也是 await，但它的失敗不該阻止前端更新，若 Turso 成功的話。
    if (API_URL) {
        let payload: any = { action: 'save' };
        const details: GlucoseReading[] = [];
        if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
        if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
        if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

        payload.record = {
            ...record,
            id: record.id || Date.now().toString(),
            heartRate: record.heartRate === undefined ? '' : record.heartRate,
            details: JSON.stringify(details)
        };

        // If Turso is configured, make GAS call a background task to keep UI fast
        if (isTursoConfigured) {
            callGasApi(payload).catch(e => console.error('Background Sheets save failed:', e));
        } else {
            await callGasApi(payload);
        }
    } else if (!isTursoConfigured) {
        console.error('Neither VITE_API_URL nor VITE_TURSO_DATABASE_URL is defined');
    }
};

export const updateRecord = async (record: HealthRecord): Promise<void> => {
    await saveRecord(record);
};

export const deleteRecord = async (id: string): Promise<void> => {
    // 1. 若配置了 Turso，先刪除 Turso
    if (isTursoConfigured) {
        try {
            await deleteRecordFromTurso(id);
        } catch (e) {
            console.error('Turso delete failed, falling back:', e);
        }
    }

    // 2. 背景刪除 Google Sheets
    if (API_URL) {
        if (isTursoConfigured) {
            callGasApi({ action: 'delete', id: String(id) }).catch(e => console.error('Background Sheets delete failed:', e));
        } else {
            await callGasApi({ action: 'delete', id: String(id) });
        }
    }
};

export const login = async (name: string, password?: string): Promise<UserSettings | null> => {
    if (isTursoConfigured) {
        return await loginTurso(name, password);
    }
    if (!API_URL) {
        // Mock login for local dev if no API
        if (name === 'TestUser123') return { name, rememberMe: true, thresholds: undefined };
        return null;
    }

    const result = await callGasApi({ action: 'login', name, password });
    if (result && result.status === 'success') {
        let thresholds = undefined;
        let showAlertLines = undefined;
        let showAuxiliaryLines = undefined;

        if (result.settings.thresholds) {
            try {
                const parsed = JSON.parse(result.settings.thresholds);
                // Extract display preferences if they exist in the stored JSON
                // Using 'in' operator check or property access
                if (parsed.showAlertLines !== undefined) showAlertLines = parsed.showAlertLines;
                if (parsed.showAuxiliaryLines !== undefined) showAuxiliaryLines = parsed.showAuxiliaryLines;

                thresholds = parsed;
            } catch (e) {
                console.error('Failed to parse thresholds JSON', e);
            }
        }

        return {
            name: result.settings.name,
            email: result.settings.email,
            rememberMe: true,
            thresholds: thresholds,
            showAlertLines: showAlertLines,
            showAuxiliaryLines: showAuxiliaryLines
        };
    }
    return null;
};

export const registerUser = async (name: string, password?: string, email?: string): Promise<{ success: boolean; message?: string }> => {
    if (isTursoConfigured) {
        return await registerUserTurso(name, password, email);
    }
    if (!API_URL) return { success: true };
    try {
        const result = await callGasApi({ action: 'register', name, password, email });
        if (result && result.status === 'success') {
            return { success: true };
        }
        return {
            success: false,
            message: result?.message || '註冊失敗，請稍後再試或檢查 GAS 腳本是否已更新'
        };
    } catch (e: any) {
        return { success: false, message: e?.message || '網路錯誤' };
    }
};

export const updateUserSettings = async (settings: UserSettings): Promise<boolean> => {
    if (isTursoConfigured) {
        return await updateUserSettingsTurso(settings);
    }
    // Pack boolean preferences into thresholds JSON for storage
    const thresholdsToSave = {
        ...settings.thresholds,
        showAlertLines: settings.showAlertLines,
        showAuxiliaryLines: settings.showAuxiliaryLines
    };

    const payload = {
        action: 'updateSettings',
        settings: {
            ...settings,
            thresholds: JSON.stringify(thresholdsToSave)
        }
    };
    const result = await callGasApi(payload);
    return result?.status === 'success';
};

async function callGasApi(payload: any) {
    if (!API_URL) return null;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            console.error('GAS returned non-JSON:', text);
            return { status: 'error', message: 'GAS 回傳格式錯誤，請確認腳本已更新' };
        }
    } catch (e) {
        console.error('GAS API Call failed:', e);
        return null;
    }
}

