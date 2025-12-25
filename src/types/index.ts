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

export interface UserSettings {
    name: string;
    rememberMe: boolean;
}

export type TimeRange = 'week' | '2week' | 'month' | 'quarter' | 'halfYear' | 'year' | 'all';
