import { HealthRecord, GlucoseReading, UserSettings } from '../types';


const API_URL = import.meta.env.VITE_API_URL;

export const getRecords = async (): Promise<HealthRecord[]> => {
    if (!API_URL) {
        console.warn('VITE_API_URL is not defined, using localStorage fallback');
        const data = localStorage.getItem('glusure_data');
        return data ? JSON.parse(data) : [];
    }

    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();

        if (!Array.isArray(rawData)) return [];

        // Map snake_case from Sheet to camelCase for App
        // And ensure details is parsed or constructed if missing
        return rawData.map((item: any) => {
            // Construct details from individual fields if details is empty (backward compatibility or new independent records)
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
                heartRate: Number(item.heart_rate) || 0,
                glucoseFasting: Number(item.glucose_fasting) || 0,
                glucosePostMeal: Number(item.glucose_post_meal) || 0,
                glucoseRandom: Number(item.glucose_random) || 0,
                details: details,
                note: item.note,
                weather: item.weather,
                noteContent: item.note_content
            };
        });
    } catch (e) {
        console.error('Failed to fetch records from GAS:', e);
        return [];
    }
};

export const saveRecord = async (record: HealthRecord): Promise<void> => {
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
        details: JSON.stringify(details)
    };

    await callGasApi(payload);
};

export const updateRecord = async (record: HealthRecord): Promise<void> => {
    await saveRecord(record);
};

export const deleteRecord = async (id: string): Promise<void> => {
    await callGasApi({ action: 'delete', id: String(id) });
};

export const login = async (name: string, password?: string): Promise<UserSettings | null> => {
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

