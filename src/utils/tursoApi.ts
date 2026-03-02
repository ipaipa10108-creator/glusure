import { createClient } from "@libsql/client/web";
import { HealthRecord, GlucoseReading, UserSettings } from '../types';

const VITE_TURSO_DB_URL = import.meta.env.VITE_TURSO_DATABASE_URL || "";
const VITE_TURSO_AUTH_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || "";

export const isTursoConfigured = !!VITE_TURSO_DB_URL && !!VITE_TURSO_AUTH_TOKEN;

export const tursoClient = isTursoConfigured ? createClient({
    url: VITE_TURSO_DB_URL,
    authToken: VITE_TURSO_AUTH_TOKEN,
}) : null;

// 初始化資料庫 (若表格不存在則建立)
export const initTursoDb = async () => {
    if (!tursoClient) return;
    try {
        await tursoClient.batch([
            `CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                name TEXT NOT NULL,
                weight REAL,
                systolic REAL,
                diastolic REAL,
                heart_rate REAL,
                glucose_fasting REAL,
                glucose_post_meal REAL,
                glucose_random REAL,
                details TEXT,
                note TEXT,
                weather TEXT,
                note_content TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS users (
                name TEXT PRIMARY KEY,
                email TEXT,
                password TEXT,
                settings TEXT
            )`
        ], "write");
        console.log("Turso DB verified/initialized.");
    } catch (e) {
        console.error("Failed to initialize Turso DB:", e);
        throw e;
    }
};

export const getRecordsFromTurso = async (): Promise<HealthRecord[]> => {
    if (!tursoClient) return [];
    try {
        const result = await tursoClient.execute("SELECT * FROM records ORDER BY timestamp DESC");
        return result.rows.map((row: any) => ({
            id: String(row.id),
            timestamp: String(row.timestamp),
            name: String(row.name),
            weight: Number(row.weight) || 0,
            systolic: Number(row.systolic) || 0,
            diastolic: Number(row.diastolic) || 0,
            heartRate: row.heart_rate !== null ? Number(row.heart_rate) : undefined,
            glucoseFasting: row.glucose_fasting !== null ? Number(row.glucose_fasting) : undefined,
            glucosePostMeal: row.glucose_post_meal !== null ? Number(row.glucose_post_meal) : undefined,
            glucoseRandom: row.glucose_random !== null ? Number(row.glucose_random) : undefined,
            details: row.details ? String(row.details) : undefined,
            note: row.note ? String(row.note) : undefined,
            weather: row.weather ? (String(row.weather) as any) : undefined,
            noteContent: row.note_content ? String(row.note_content) : undefined,
        }));
    } catch (e: any) {
        console.error("Failed to fetch records from Turso:", e);
        // 如果是表格不存在導致的錯誤，嘗試先建表再回傳空陣列
        if (e && e.message && String(e.message).includes("no such table")) {
            console.log("Tables missing, attempting to initialize...");
            await initTursoDb().catch(console.error);
        }
        throw e;
    }
};

export const saveRecordToTurso = async (record: HealthRecord): Promise<void> => {
    if (!tursoClient) return;

    // Prepare details JSON for the single record
    const details: GlucoseReading[] = [];
    if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
    if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
    if (record.glucoseRandom) details.push({ type: 'random', value: record.glucoseRandom, timestamp: record.timestamp });

    try {
        await tursoClient.execute({
            sql: `INSERT INTO records 
            (id, timestamp, name, weight, systolic, diastolic, heart_rate, glucose_fasting, glucose_post_meal, glucose_random, details, note, weather, note_content) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
                timestamp=excluded.timestamp,
                name=excluded.name,
                weight=excluded.weight,
                systolic=excluded.systolic,
                diastolic=excluded.diastolic,
                heart_rate=excluded.heart_rate,
                glucose_fasting=excluded.glucose_fasting,
                glucose_post_meal=excluded.glucose_post_meal,
                glucose_random=excluded.glucose_random,
                details=excluded.details,
                note=excluded.note,
                weather=excluded.weather,
                note_content=excluded.note_content
            `,
            args: [
                record.id || Date.now().toString(),
                record.timestamp,
                record.name,
                record.weight || 0,
                record.systolic || 0,
                record.diastolic || 0,
                record.heartRate ?? null,
                record.glucoseFasting ?? null,
                record.glucosePostMeal ?? null,
                record.glucoseRandom ?? null,
                JSON.stringify(details),
                record.note ?? null,
                record.weather ?? null,
                record.noteContent ?? null
            ]
        });
    } catch (e) {
        console.error("Failed to save record to Turso:", e);
        throw e;
    }
};

export const deleteRecordFromTurso = async (id: string): Promise<void> => {
    if (!tursoClient) return;
    try {
        await tursoClient.execute({
            sql: "DELETE FROM records WHERE id = ?",
            args: [id]
        });
    } catch (e) {
        console.error("Failed to delete record from Turso:", e);
        throw e;
    }
};

export const loginTurso = async (name: string, password?: string): Promise<UserSettings | null> => {
    if (!tursoClient) return null;
    try {
        const result = await tursoClient.execute({
            sql: "SELECT * FROM users WHERE name = ?",
            args: [name]
        });

        if (result.rows.length === 0) {
            return null; // User not found
        }

        const userRow = result.rows[0];
        // In a real app we should check hashed password. For personal app, simplest ok.
        if (password && userRow.password !== password && userRow.password !== "") {
            console.error("Invalid password");
            return null;
        }

        let settingsObj: Partial<UserSettings> = {};
        if (userRow.settings) {
            try {
                settingsObj = JSON.parse(String(userRow.settings));
            } catch (e) { }
        }

        return {
            name: String(userRow.name),
            email: userRow.email ? String(userRow.email) : undefined,
            rememberMe: true,
            ...settingsObj
        } as UserSettings;

    } catch (e) {
        console.error("Turso login failed:", e);
        return null;
    }
};

export const registerUserTurso = async (name: string, password?: string, email?: string): Promise<{ success: boolean; message?: string }> => {
    if (!tursoClient) return { success: false, message: 'Turso not configured' };
    try {
        const check = await tursoClient.execute({
            sql: "SELECT name FROM users WHERE name = ?",
            args: [name]
        });

        if (check.rows.length > 0) {
            return { success: false, message: '使用者已存在' };
        }

        await tursoClient.execute({
            sql: "INSERT INTO users (name, password, email, settings) VALUES (?, ?, ?, ?)",
            args: [name, password || "", email || "", JSON.stringify({})]
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e?.message || '註冊失敗' };
    }
};

export const updateUserSettingsTurso = async (settings: UserSettings): Promise<boolean> => {
    if (!tursoClient) return false;
    try {
        const { name, email, password, rememberMe, ...restSettings } = settings;

        await tursoClient.execute({
            sql: "UPDATE users SET settings = ? WHERE name = ?",
            args: [JSON.stringify(restSettings), name]
        });
        return true;
    } catch (e) {
        console.error("Failed to update Turso settings:", e);
        return false;
    }
};
