import { HealthRecord, HealthThresholds, DEFAULT_THRESHOLDS } from '../types';
import { differenceInHours, parseISO } from 'date-fns';

export const hasRecentWeightFluctuation = (current: HealthRecord, history: HealthRecord[]): boolean => {
    // Daily fluctuate check
    // 找出在 current 發生之前的 24 小時內的所有體重紀錄
    const currentTime = parseISO(current.timestamp);
    const recentRecords = history.filter(r => {
        if (r.weight <= 0) return false;
        if (r.id === current.id) return false; // 先排除自己

        const rTime = parseISO(r.timestamp);
        // 只考慮時間在 current 之前，且距離不超過 24 小時的紀錄
        const diffHours = differenceInHours(currentTime, rTime);
        return diffHours >= 0 && diffHours <= 24;
    });

    if (recentRecords.length > 0) {
        const weights = recentRecords.map(r => r.weight);
        const maxHistoryWeight = Math.max(...weights);
        const minHistoryWeight = Math.min(...weights);

        // 如果目前這筆體重與 24H 內的歷史高點或低點落差大於等於 2kg，則發布警示
        if (Math.abs(current.weight - maxHistoryWeight) >= 2 ||
            Math.abs(current.weight - minHistoryWeight) >= 2) {
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
