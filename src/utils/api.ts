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

export const getRecords = async (): Promise<HealthRecord[]> => {
    if (isTursoConfigured) {
        return await getRecordsFromTurso();
    }
    return await fetchRecordsFromGoogleSheets();
};

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
    if (isTursoConfigured) {
        return await saveRecordToTurso(record);
    }
    if (!API_URL) {
        console.error('VITE_API_URL is not defined');
        return;
    }

    // INDEPENDENT RECORD MODE: No merging. Always create new or update specific ID.
    // If record has ID, it's an update. If not, it's a create.

    let payload: any = { action: 'save' };

    // Prepare details JSON for the single record
    const details: GlucoseReading[] = [];
    if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
    if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
    if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

    payload.record = {
        ...record,
        id: record.id || Date.now().toString(),
        heartRate: record.heartRate === undefined ? '' : record.heartRate, // Explicitly send empty string if undefined to prevent GAS from defaulting to 0
        details: JSON.stringify(details)
    };

    await callGasApi(payload);
};

export const updateRecord = async (record: HealthRecord): Promise<void> => {
    await saveRecord(record);
};

export const deleteRecord = async (id: string): Promise<void> => {
    if (isTursoConfigured) {
        return await deleteRecordFromTurso(id);
    }
    await callGasApi({ action: 'delete', id: String(id) });
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

