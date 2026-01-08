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
    pulsePressureHigh: number; // 脈壓差高標 (> 此值警示)
    pulsePressureLow: number;  // 脈壓差低標 (< 此值警示)
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
    auxiliaryColors?: AuxiliaryColors;
    alertPointColor?: string; // 超過警示線的資料點顏色
    defaultTimeRange?: TimeRange;
}

// Auxiliary Line Color Settings
export interface AuxiliaryColors {
    // Weight chart - Exercise types
    resistance: string;
    cycling: string;
    walking: string;
    // BP chart - Weather
    weatherHot: string;
    weatherCold: string;
    // Glucose chart - Diet types
    bigMeal: string;
    dieting: string;
    fasting: string;
}

export const DEFAULT_AUXILIARY_COLORS: AuxiliaryColors = {
    resistance: 'rgba(185, 28, 28, 0.8)',   // Darker red
    cycling: 'rgba(249, 115, 22, 0.8)',     // Orange
    walking: 'rgba(16, 185, 129, 0.8)',     // Green
    weatherHot: 'rgba(239, 68, 68, 0.6)',   // Red
    weatherCold: 'rgba(59, 130, 246, 0.6)', // Blue
    bigMeal: 'rgba(239, 68, 68, 0.6)',      // Red
    dieting: 'rgba(16, 185, 129, 0.6)',     // Green
    fasting: 'rgba(139, 92, 246, 0.6)',     // Purple
};

export const DEFAULT_THRESHOLDS: HealthThresholds = {
    systolicHigh: 140,
    diastolicHigh: 90,
    fastingHigh: 100,
    postMealHigh: 140,
    weightHigh: 0, // 0 means disable
    weightLow: 0,
    pulsePressureHigh: 60, // 脈壓差 > 60 警示
    pulsePressureLow: 30,  // 脈壓差 < 30 警示
};

export const DEFAULT_ALERT_POINT_COLOR = '#ef4444'; // 紅色

export type TimeRange = 'week' | '2week' | 'month' | 'quarter' | 'halfYear' | 'year' | 'all';
