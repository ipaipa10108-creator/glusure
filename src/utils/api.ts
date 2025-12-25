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
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Failed to fetch records from GAS:', e);
        return [];
    }
};

export const saveRecord = async (record: HealthRecord): Promise<void> => {
    if (!API_URL) {
        // Fallback to local storage logic if needed, but for now we focus on GAS
        console.error('VITE_API_URL is not defined');
        return;
    }

    const currentRecords = await getRecords();
    const recordDate = parseISO(record.timestamp);
    const existingRecord = currentRecords.find(r => isSameDay(parseISO(r.timestamp), recordDate) && r.name === record.name);

    let payload: any = { action: 'save', record: record };

    if (existingRecord) {
        // Prepare merged record logic similar to before, but sent to GAS
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
        // New record logic
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
    await callGasApi({ action: 'delete', id });
};

async function callGasApi(payload: any) {
    if (!API_URL) return;
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // GAS web app requires no-cors for simple POST or it redirects
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('GAS API Call failed:', e);
    }
}

