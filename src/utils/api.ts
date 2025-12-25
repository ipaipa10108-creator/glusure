import { HealthRecord, GlucoseReading } from '../types';
import { isSameDay, parseISO } from 'date-fns';

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
        return rawData.map((item: any) => ({
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
            details: item.details,
            note: item.note
        }));
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

    const currentRecords = await getRecords();
    const recordDate = parseISO(record.timestamp);
    const existingRecord = currentRecords.find(r => isSameDay(parseISO(r.timestamp), recordDate) && r.name === record.name);

    let payload: any = { action: 'save', record: record };

    if (existingRecord) {
        // Merge Logic
        let details: GlucoseReading[] = [];
        try {
            details = existingRecord.details ? JSON.parse(existingRecord.details) : [];
        } catch (e) { console.error(e); }

        if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
        if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
        if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

        const updatedRecord: HealthRecord = {
            ...existingRecord,
            weight: record.weight > 0 ? record.weight : existingRecord.weight,
            systolic: record.systolic > 0 ? record.systolic : existingRecord.systolic,
            diastolic: record.diastolic > 0 ? record.diastolic : existingRecord.diastolic,
            heartRate: record.heartRate && record.heartRate > 0 ? record.heartRate : existingRecord.heartRate,
            glucoseFasting: record.glucoseFasting || existingRecord.glucoseFasting,
            glucosePostMeal: record.glucosePostMeal || existingRecord.glucosePostMeal,
            glucoseRandom: record.glucoseRandom || existingRecord.glucoseRandom,
            details: JSON.stringify(details),
        };
        payload.record = updatedRecord;
    } else {
        // Create Logic
        const details: GlucoseReading[] = [];
        if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
        if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
        if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

        payload.record = {
            ...record,
            id: record.id || Date.now().toString(),
            details: JSON.stringify(details)
        };
    }

    await callGasApi(payload);
};

export const updateRecord = async (record: HealthRecord): Promise<void> => {
    await callGasApi({ action: 'save', record });
};

export const deleteRecord = async (id: string): Promise<void> => {
    // Force ID to string to match simple logic
    await callGasApi({ action: 'delete', id: String(id) });
};

async function callGasApi(payload: any) {
    if (!API_URL) return;
    try {
        // Use text/plain to avoid preflight OPTIONS request which GAS doesn't handle
        // GAS doPost(e) can parse contents independent of Content-Type
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            // Do NOT set Content-Type to application/json, it triggers preflight
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('GAS API Call failed:', e);
    }
}
