import { HealthRecord } from '../types';
import { subDays, addHours } from 'date-fns';

export const generateDummyData = (userName: string = 'TestUser123'): HealthRecord[] => {
    const records: HealthRecord[] = [];
    const now = new Date();
    const daysToGenerate = 90; // 3 months

    for (let i = daysToGenerate; i >= 0; i--) {
        const date = subDays(now, i);
        // Randomly skip some days to make it realistic (10% chance skip)
        if (Math.random() > 0.9) continue;

        // Base values with some nice fluctuation
        const baseWeight = 70 + Math.sin(i * 0.1) * 2;
        const baseSystolic = 120 + Math.random() * 20 - 10;
        const baseDiastolic = 80 + Math.random() * 10 - 5;
        const baseHeartRate = 75 + Math.random() * 15 - 7;

        // Create 1-3 records per day
        const numRecords = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < numRecords; j++) {
            const recordTime = addHours(date, 8 + j * 4 + Math.random() * 2); // 8am, 12pm, 4pm roughly

            const fasting = j === 0 ? Math.floor(90 + Math.random() * 20) : undefined;
            const postMeal = j > 0 ? Math.floor(110 + Math.random() * 40) : undefined;
            const randomGlucose = (!fasting && !postMeal) ? Math.floor(100 + Math.random() * 30) : undefined;

            const record: HealthRecord = {
                id: `dummy_${i}_${j}`,
                timestamp: recordTime.toISOString(),
                name: userName,
                weight: j === 0 ? Number(baseWeight.toFixed(1)) : 0, // Measure weight once a day
                systolic: Math.floor(baseSystolic + Math.random() * 5),
                diastolic: Math.floor(baseDiastolic + Math.random() * 5),
                heartRate: Math.floor(baseHeartRate + Math.random() * 5),
                glucoseFasting: fasting || 0,
                glucosePostMeal: postMeal || 0,
                glucoseRandom: randomGlucose || 0,
                details: JSON.stringify([]), // Simplified for dummy
                note: i % 7 === 0 ? 'Weekly check' : ''
            };

            // Build details
            const details = [];
            if (fasting) details.push({ type: 'fasting', value: fasting, timestamp: record.timestamp });
            if (postMeal) details.push({ type: 'postMeal', value: postMeal, timestamp: record.timestamp });
            if (randomGlucose) details.push({ type: 'random', value: randomGlucose, timestamp: record.timestamp });
            record.details = JSON.stringify(details);

            records.push(record);
        }
    }

    return records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
