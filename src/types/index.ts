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
    note?: string; // Legacy simple note

    // New Fields
    weather?: 'hot' | 'moderate' | 'cold';
    noteContent?: string; // JSON string of NoteContent
}

export type WeatherType = 'hot' | 'moderate' | 'cold';
export type DietType = 'bigMeal' | 'normal' | 'dieting' | 'fasting';
export type ExerciseType = 'walking' | 'cycling' | 'resistance' | 'other';

export interface ExerciseRecord {
    type: ExerciseType;
    durationMinutes?: number;
    customName?: string; // if type is 'other'
}

export interface NoteContent {
    diets?: DietType[];
    exercises?: ExerciseRecord[];
    otherNote?: string;
    otherNoteColor?: string; // Hex color code
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
    email?: string;
    rememberMe: boolean;
    rememberPassword?: boolean;
    thresholds?: HealthThresholds;
    showAlertLines?: boolean;
    showAuxiliaryLines?: boolean;
    enableSwipeNav?: boolean;
    auxiliaryLineMode?: 'y-axis' | 'x-axis';
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
