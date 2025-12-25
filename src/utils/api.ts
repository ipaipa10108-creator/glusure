import { HealthRecord, GlucoseReading } from '../types';
import { isSameDay, parseISO } from 'date-fns';

const STORAGE_KEY = 'glusure_data';

export const getRecords = async (): Promise<HealthRecord[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
};

export const saveRecord = async (record: HealthRecord): Promise<void> => {
    const currentData = await getRecords();
    const recordDate = parseISO(record.timestamp);

    // 1. Check if there is already a record for this day
    const existingRecordIndex = currentData.findIndex(r => isSameDay(parseISO(r.timestamp), recordDate) && r.name === record.name);

    if (existingRecordIndex >= 0) {
        // === MERGE LOGIC ===
        const existing = currentData[existingRecordIndex];
        let details: GlucoseReading[] = [];
        try {
            details = existing.details ? JSON.parse(existing.details) : [];
        } catch (e) { console.error(e); }

        // Add new glucose readings to details with timestamp
        if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
        if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
        if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

        // Update main fields if provided (Last write wins strategy for vitals)
        const updatedRecord: HealthRecord = {
            ...existing,
            weight: record.weight > 0 ? record.weight : existing.weight,
            systolic: record.systolic > 0 ? record.systolic : existing.systolic,
            diastolic: record.diastolic > 0 ? record.diastolic : existing.diastolic,
            heartRate: record.heartRate && record.heartRate > 0 ? record.heartRate : existing.heartRate,
            // Update glucose summary fields only if new values are provided
            glucoseFasting: record.glucoseFasting || existing.glucoseFasting,
            glucosePostMeal: record.glucosePostMeal || existing.glucosePostMeal,
            glucoseRandom: record.glucoseRandom || existing.glucoseRandom,
            details: JSON.stringify(details),
            // Keep original daily timestamp or update? 
            // User says "Daily Record", so keeping the original date makes sense for list sorting by day,
            // but we might want to know when the last update was. For now, keep original ID and timestamp.
        };

        currentData[existingRecordIndex] = updatedRecord;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));

    } else {
        // === CREATE NEW LOGIC ===
        const details: GlucoseReading[] = [];
        if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
        if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
        if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

        const newRecord = {
            ...record,
            id: Date.now().toString(),
            details: JSON.stringify(details)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...currentData, newRecord]));
    }
};

export const updateRecord = async (record: HealthRecord): Promise<void> => {
    // Direct update without merging logic (for Edit button)
    const currentData = await getRecords();
    const updated = currentData.map(r => r.id === record.id ? record : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteRecord = async (id: string): Promise<void> => {
    const currentData = await getRecords();
    const updated = currentData.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
