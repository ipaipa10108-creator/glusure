import { HealthRecord, HealthThresholds, DEFAULT_THRESHOLDS } from '../types';
import { differenceInHours, parseISO } from 'date-fns';

export const isWeightAbnormal = (current: HealthRecord, history: HealthRecord[], thresholds: HealthThresholds = DEFAULT_THRESHOLDS): boolean => {
    // Check target thresholds first
    if (thresholds.weightHigh > 0 && current.weight > thresholds.weightHigh) return true;
    if (thresholds.weightLow > 0 && current.weight < thresholds.weightLow && current.weight > 0) return true;

    // Daily fluctuate check
    // 找出 24 小時內的所有紀錄 (包含自己)
    const currentTime = parseISO(current.timestamp);
    const recentRecords = history.filter(r => {
        if (r.weight <= 0) return false; // 排除沒有體重數值的紀錄
        const rTime = parseISO(r.timestamp);
        const diff = Math.abs(differenceInHours(currentTime, rTime));
        return diff <= 24;
    });

    if (recentRecords.length >= 2) {
        const weights = recentRecords.map(r => r.weight);
        const maxWeight = Math.max(...weights);
        const minWeight = Math.min(...weights);
        if ((maxWeight - minWeight) >= 2) {
            return true;
        }
    }

    return false;
};

export const getGlucoseStatus = (value: number, type: 'fasting' | 'postMeal' | 'random', thresholds: HealthThresholds = DEFAULT_THRESHOLDS): 'normal' | 'high' | 'very-high' => {
    if (type === 'fasting') {
        if (value > thresholds.fastingHigh * 1.2) return 'very-high';
        if (value > thresholds.fastingHigh) return 'high';
        return 'normal';
    }
    if (type === 'postMeal' || type === 'random') {
        if (value > thresholds.postMealHigh * 1.4) return 'very-high';
        if (value > thresholds.postMealHigh) return 'high';
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
