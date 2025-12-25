import { HealthRecord } from '../types';
import { differenceInHours, parseISO } from 'date-fns';

export const isWeightAbnormal = (current: HealthRecord, history: HealthRecord[]): boolean => {
    // Find records within 24 hours
    const currentTime = parseISO(current.timestamp);
    const recentRecord = history.find(r => {
        const rTime = parseISO(r.timestamp);
        const diff = Math.abs(differenceInHours(currentTime, rTime));
        return diff <= 24 && r.id !== current.id;
    });

    if (recentRecord) {
        const weightDiff = Math.abs(current.weight - recentRecord.weight);
        return weightDiff >= 2;
    }
    return false;
};

export const getGlucoseStatus = (value: number, type: 'fasting' | 'postMeal' | 'random'): 'normal' | 'high' | 'very-high' => {
    if (type === 'fasting') {
        if (value > 126) return 'very-high'; // Diabetes range
        if (value > 100) return 'high'; // Pre-diabetes
        return 'normal';
    }
    if (type === 'postMeal' || type === 'random') {
        if (value > 200) return 'very-high';
        if (value > 140) return 'high';
        return 'normal';
    }
    return 'normal';
};

export const getGlucoseColor = (status: 'normal' | 'high' | 'very-high'): string => {
    switch (status) {
        case 'very-high': return 'bg-red-200 text-red-900 font-bold'; // Deep warning
        case 'high': return 'bg-red-50 text-red-700'; // Warning
        default: return 'text-gray-700';
    }
};
