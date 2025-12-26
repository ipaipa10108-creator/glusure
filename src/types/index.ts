export interface GlucoseReading {
    type: 'fasting' | 'postMeal' | 'random';
    value: number;
    timestamp: string; // ISO string of measurement time
}

export interface HealthRecord {
    id?: string;
    timestamp: string; // ISO string - represents the "Date" of the record
    name: string;
    weight: number;
    systolic: number;
    diastolic: number;
    heartRate?: number; // New Field
    glucoseFasting?: number;
    glucosePostMeal?: number;
    glucoseRandom?: number;
    details?: string; // JSON string of GlucoseReading[]
    note?: string;
}

export interface HealthThresholds {
    systolicHigh: number;
    diastolicHigh: number;
    fastingHigh: number;
    postMealHigh: number;
    weightHigh: number;
    weightLow: number;
}

export interface UserSettings {
    name: string;
    password?: string;
    rememberMe: boolean;
    rememberPassword?: boolean;
    thresholds?: HealthThresholds;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
    systolicHigh: 140,
    diastolicHigh: 90,
    fastingHigh: 100,
    postMealHigh: 140,
    weightHigh: 0, // 0 means disable
    weightLow: 0,
};

export type TimeRange = 'week' | '2week' | 'month' | 'quarter' | 'halfYear' | 'year' | 'all';
