import { useMemo, useRef, useState } from 'react';
import { HealthRecord, TimeRange, HealthThresholds, AuxiliaryColors, DEFAULT_AUXILIARY_COLORS, DEFAULT_ALERT_POINT_COLOR } from '../types';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend,
    TimeScale,
} from 'chart.js';
import { Line, getElementAtEvent } from 'react-chartjs-2';
import { format, subDays, subMonths, subYears, parseISO, isAfter } from 'date-fns';
import { Maximize2, X } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

interface ChartSectionProps {
    records: HealthRecord[];
    timeRange: TimeRange;
    onDataClick?: (record: HealthRecord) => void;
    referenceDate?: Date;
    thresholds?: HealthThresholds;
    showThresholds?: boolean;
    showAuxiliaryLines?: boolean;
    auxiliaryLineMode?: 'y-axis' | 'x-axis';
    auxiliaryColors?: AuxiliaryColors;
    alertPointColor?: string; // 超過警示線的資料點顏色
}

type ChartType = 'weight' | 'bp' | 'glucose';

export const ChartSection: React.FC<ChartSectionProps> = ({ records, timeRange: globalTimeRange, onDataClick, referenceDate, thresholds, showThresholds = true, showAuxiliaryLines = true, auxiliaryLineMode = 'y-axis', auxiliaryColors, alertPointColor }) => {
    const chartRefWeight = useRef<any>(null);
    const chartRefBP = useRef<any>(null);
    const chartRefGlucose = useRef<any>(null);

    const [fullscreenChart, setFullscreenChart] = useState<ChartType | null>(null);
    const [fsTimeRange, setFsTimeRange] = useState<TimeRange>(globalTimeRange);

    const currentTimeRange = fullscreenChart ? fsTimeRange : globalTimeRange;

    const filteredRecords = useMemo(() => {
        // Use provided referenceDate or default to now if not provided
        // Construct 'now' to be the end of the day of the reference date if provided,
        // otherwise just the current moment.
        let now: Date;
        if (referenceDate) {
            now = new Date(referenceDate);
            now.setHours(23, 59, 59, 999);
        } else {
            now = new Date();
        }

        let startDate: Date;

        switch (currentTimeRange) {
            case 'week': startDate = subDays(now, 7); break;
            case '2week': startDate = subDays(now, 14); break;
            case 'month': startDate = subMonths(now, 1); break;
            case 'quarter': startDate = subMonths(now, 3); break;
            case 'halfYear': startDate = subMonths(now, 6); break;
            case 'year': startDate = subYears(now, 1); break;
            case 'all': default: startDate = new Date(0); break;
        }

        return records
            .filter(r => {
                const recordDate = parseISO(r.timestamp);
                // Filter records that are AFTER the start date AND BEFORE/EQUAL to the reference 'now' date
                // However, the original logic only checked isAfter(startDate).
                // If we are looking at the past, we must also exclude future records relative to that past date.
                return isAfter(recordDate, startDate) && (referenceDate ? recordDate <= now : true);
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [records, currentTimeRange, referenceDate]);

    const labels = filteredRecords.map(r => format(parseISO(r.timestamp), 'MM/dd HH:mm'));

    const onClickHandler = (event: React.MouseEvent<HTMLCanvasElement>, chartRef: any) => {
        if (!onDataClick || !chartRef.current) return;
        const elements = getElementAtEvent(chartRef.current, event);
        if (elements.length > 0) {
            const index = elements[0].index;
            const record = filteredRecords[index];
            if (record) onDataClick(record);
        }
    };

    const bindClick = (ref: any) => ({
        onClick: (e: React.MouseEvent<HTMLCanvasElement>) => onClickHandler(e, ref)
    });


    // Helper to create threshold line dataset
    const createThresholdLine = (value: number, label: string, color: string) => {
        if (!showThresholds || value <= 0) return null;
        return {
            label: label,
            data: filteredRecords.map(() => value),
            borderColor: color,
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            order: 999 // Ensure it renders behind or with correct z-index
        };
    };

    const activeThresholds = thresholds || { weightHigh: 0, weightLow: 0, systolicHigh: 140, diastolicHigh: 90, fastingHigh: 100, postMealHigh: 140, pulsePressureHigh: 60, pulsePressureLow: 30 };
    const effectiveAlertColor = alertPointColor || DEFAULT_ALERT_POINT_COLOR;

    // --- Cross-record otherNote color mapping ---
    // 找出所有有 otherNote 的紀錄
    const recordsWithOtherNote = filteredRecords
        .map((r, idx) => {
            if (!r.noteContent) return null;
            try {
                const n = JSON.parse(r.noteContent);
                if (n.otherNote) {
                    return { idx, timestamp: new Date(r.timestamp).getTime(), color: n.otherNoteColor || '#10B981' };
                }
            } catch { }
            return null;
        })
        .filter((x): x is { idx: number; timestamp: number; color: string } => x !== null);

    // 建立索引集合：哪些索引應該變色（針對體重、心跳、血糖分開處理）
    const weightColorMap = new Map<number, string>(); // index -> color
    const hrColorMap = new Map<number, string>();
    const glucoseColorMap = new Map<number, string>();

    for (const note of recordsWithOtherNote) {
        const maxDiffMs = 24 * 60 * 60 * 1000;

        // 找最接近的有體重資料的紀錄
        let nearestWeightIdx = -1;
        let minWeightDiff = Infinity;
        filteredRecords.forEach((r, i) => {
            if ((r.weight ?? 0) > 0) {
                const diff = Math.abs(new Date(r.timestamp).getTime() - note.timestamp);
                if (diff < minWeightDiff && diff <= maxDiffMs) {
                    minWeightDiff = diff;
                    nearestWeightIdx = i;
                }
            }
        });
        if (nearestWeightIdx >= 0) weightColorMap.set(nearestWeightIdx, note.color);

        // 找最接近的有心跳資料的紀錄
        let nearestHrIdx = -1;
        let minHrDiff = Infinity;
        filteredRecords.forEach((r, i) => {
            if ((r.heartRate ?? 0) > 0) {
                const diff = Math.abs(new Date(r.timestamp).getTime() - note.timestamp);
                if (diff < minHrDiff && diff <= maxDiffMs) {
                    minHrDiff = diff;
                    nearestHrIdx = i;
                }
            }
        });
        if (nearestHrIdx >= 0) hrColorMap.set(nearestHrIdx, note.color);

        // 找最接近的有血糖資料的紀錄 (空腹或飯後皆可)
        let nearestGlucoseIdx = -1;
        let minGlucoseDiff = Infinity;
        filteredRecords.forEach((r, i) => {
            const hasGlucose = (r.glucoseFasting ?? 0) > 0 || (r.glucosePostMeal ?? 0) > 0 || (r.glucoseRandom ?? 0) > 0;
            if (hasGlucose) {
                const diff = Math.abs(new Date(r.timestamp).getTime() - note.timestamp);
                if (diff < minGlucoseDiff && diff <= maxDiffMs) {
                    minGlucoseDiff = diff;
                    nearestGlucoseIdx = i;
                }
            }
        });
        if (nearestGlucoseIdx >= 0) glucoseColorMap.set(nearestGlucoseIdx, note.color);
    }

    // --- Weight Chart Logic ---
    const weightYMax = Math.max(...filteredRecords.map(r => r.weight || 0), activeThresholds.weightHigh || 70) + 5;

    // Calculate validity count for fallback logic
    const validWeightCount = filteredRecords.filter(r => (r.weight ?? 0) > 0).length;

    // Get active colors (user-defined or defaults)
    const colors = auxiliaryColors || DEFAULT_AUXILIARY_COLORS;

    // Helper: Determine effective color for a record (Priority: Exercise > Other Note)
    const getWeightColor = (index: number): string | null => {
        const r = filteredRecords[index];
        if (!r.noteContent) return weightColorMap.get(index) || null;
        if (r.noteContent.includes('"type":"resistance"')) return colors.resistance;
        if (r.noteContent.includes('"type":"cycling"')) return colors.cycling;
        if (r.noteContent.includes('"type":"walking"') || r.noteContent.includes('"type":"other"')) return colors.walking;
        return weightColorMap.get(index) || null;
    };

    // Modified Aux Bar Creator: In X-axis mode, still show legend but with hidden data
    const createSmartAuxBar = (label: string, color: string, condition: (r: HealthRecord) => boolean, yMax: number, validCount: number) => {
        if (!showAuxiliaryLines) return null;

        // In X-axis mode with >=2 points: keep legend but hide actual bars
        const isXAxisModeWithLines = auxiliaryLineMode === 'x-axis' && validCount >= 2;

        return {
            label: label,
            // Show data only in Y-axis mode or when isolated
            data: isXAxisModeWithLines
                ? filteredRecords.map(() => null) // No bars but legend visible
                : filteredRecords.map(r => condition(r) ? yMax : null),
            backgroundColor: color,
            type: 'bar' as const,
            barThickness: 2,
            order: 1000,
            // Hide from tooltip in X-axis mode
            hidden: false
        };
    };

    const weightPointColors = filteredRecords.map((r, i) => {
        if ((r.weight ?? 0) <= 0) return 'rgb(53, 162, 235)';
        if ((activeThresholds.weightHigh > 0 && r.weight > activeThresholds.weightHigh) ||
            (activeThresholds.weightLow > 0 && r.weight < activeThresholds.weightLow)) {
            return effectiveAlertColor;
        }
        return weightColorMap.get(i) || 'rgb(53, 162, 235)';
    });

    // Restore weightPointRadii
    const weightPointRadii = filteredRecords.map((r, i) => {
        if ((r.weight ?? 0) <= 0) return 4;
        return weightColorMap.has(i) ? 6 : 4;
    });

    const weightData = {
        labels,
        datasets: [
            createSmartAuxBar('阻力訓練', colors.resistance, (r) => r.noteContent ? r.noteContent.includes('"type":"resistance"') : false, weightYMax, validWeightCount),
            createSmartAuxBar('腳踏車', colors.cycling, (r) => r.noteContent ? r.noteContent.includes('"type":"cycling"') : false, weightYMax, validWeightCount),
            createSmartAuxBar('健走/其他', colors.walking, (r) => r.noteContent ? (r.noteContent.includes('"type":"walking"') || r.noteContent.includes('"type":"other"')) : false, weightYMax, validWeightCount),
            {
                label: '體重 (kg)',
                data: filteredRecords.map(r => r.weight > 0 ? r.weight : null),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.2)',
                pointBackgroundColor: weightPointColors,
                pointRadius: weightPointRadii,
                fill: true,
                spanGaps: true,
                tension: 0.4,
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2, // Thicker line in X-axis mode
                segment: {
                    borderColor: (ctx: any) => {
                        if (auxiliaryLineMode !== 'x-axis') return undefined;
                        const color = getWeightColor(ctx.p0.parsed.x);
                        return color || 'rgb(53, 162, 235)';
                    }
                }
            },
            createThresholdLine(activeThresholds.weightHigh, '體重高標', 'rgba(255, 99, 132, 0.8)'),
            createThresholdLine(activeThresholds.weightLow, '體重低標', 'rgba(255, 159, 64, 0.8)')
        ].filter(Boolean) as any[]
    };

    // --- BP Chart Logic ---
    const bpYMax = Math.max(...filteredRecords.map(r => r.systolic || 0), 160) + 10;
    const validBPCount = filteredRecords.filter(r => (r.systolic ?? 0) > 0).length;

    // Helper: 判斷脈壓差是否超出範圍
    const isPulsePressureAbnormal = (r: HealthRecord): boolean => {
        if (r.systolic <= 0 || r.diastolic <= 0) return false;
        const pulsePressure = r.systolic - r.diastolic;
        return pulsePressure > activeThresholds.pulsePressureHigh || pulsePressure < activeThresholds.pulsePressureLow;
    };

    // 收縮壓點顏色：超過閾值用警示顏色
    const systolicPointColors = filteredRecords.map(r => {
        if (r.systolic <= 0) return 'rgb(255, 99, 132)';
        if (r.systolic > activeThresholds.systolicHigh) return effectiveAlertColor;
        return 'rgb(255, 99, 132)';
    });

    // 舒張壓點顏色：超過閾值用警示顏色
    const diastolicPointColors = filteredRecords.map(r => {
        if (r.diastolic <= 0) return 'rgb(75, 192, 192)';
        if (r.diastolic > activeThresholds.diastolicHigh) return effectiveAlertColor;
        return 'rgb(75, 192, 192)';
    });

    // 脈壓差異常點的半徑 (異常時放大)
    const bpPointRadii = filteredRecords.map(r => {
        if (r.systolic <= 0) return 4;
        if (isPulsePressureAbnormal(r)) return 7;
        if (r.systolic > activeThresholds.systolicHigh || r.diastolic > activeThresholds.diastolicHigh) return 6;
        return 4;
    });

    // Helper: Weather color for BP
    const getBPColor = (index: number): string | null => {
        const r = filteredRecords[index];
        if (r.weather === 'hot') return colors.weatherHot;
        if (r.weather === 'cold') return colors.weatherCold;
        return null;
    };
    // Helper: Heart Rate color (currently only Other Note)
    const getHRColor = (index: number): string | null => hrColorMap.get(index) || null;

    const hrPointColors = filteredRecords.map((r, i) => {
        if ((r.heartRate ?? 0) <= 0) return 'rgb(153, 102, 255)';
        return hrColorMap.get(i) || 'rgb(153, 102, 255)';
    });

    // ... existing radii logic ...
    const hrPointRadii = filteredRecords.map((r, i) => {
        if ((r.heartRate ?? 0) <= 0) return 4;
        return hrColorMap.has(i) ? 6 : 4;
    });

    // 建立脈壓差異常虛線資料集 (只在警示線開啟時顯示)
    // 使用分段 dataset 來繪製垂直虛線連接收縮壓和舒張壓
    // Custom Plugin to draw vertical dashed lines for abnormal pulse pressure
    const pulsePressurePlugin = {
        id: 'pulsePressureLines',
        afterDatasetsDraw(chart: any) {
            if (!showThresholds) return;
            const { ctx, scales: { x, y } } = chart;



            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = effectiveAlertColor;
            ctx.setLineDash([4, 4]);

            filteredRecords.forEach((r, index) => {
                if (isPulsePressureAbnormal(r)) {
                    const xPos = x.getPixelForValue(index);
                    const ySys = y.getPixelForValue(r.systolic);
                    const yDia = y.getPixelForValue(r.diastolic);

                    // Draw vertical line only for lines within chart area
                    if (xPos >= chart.chartArea.left && xPos <= chart.chartArea.right) {
                        ctx.moveTo(xPos, ySys);
                        ctx.lineTo(xPos, yDia);
                    }
                }
            });

            ctx.stroke();
            ctx.restore();
        }
    };

    // 建立脈壓差異常虛線資料集 (僅用於顯示圖例)
    const createPulsePressureAlertDataset = () => {
        if (!showThresholds) return null;

        // 紀錄每個點是否需要繪製虛線
        const hasAbnormal = filteredRecords.some(r => isPulsePressureAbnormal(r));
        if (!hasAbnormal) return null;

        // 建立中點資料集 - 用於圖例顯示
        return {
            label: '脈壓差異常',
            data: [], // 不繪製實際點，由 plugin 繪製
            borderColor: effectiveAlertColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            type: 'line' as const,
            order: 0,
        };
    };

    const bpData = {
        labels,
        datasets: [
            createSmartAuxBar('天氣(熱)', colors.weatherHot, (r) => r.weather === 'hot', bpYMax, validBPCount),
            createSmartAuxBar('天氣(冷)', colors.weatherCold, (r) => r.weather === 'cold', bpYMax, validBPCount),
            {
                label: '收縮壓',
                data: filteredRecords.map(r => r.systolic > 0 ? r.systolic : null),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                pointBackgroundColor: systolicPointColors,
                pointRadius: bpPointRadii,
                spanGaps: true,
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2,
                segment: {
                    borderColor: (ctx: any) => (auxiliaryLineMode === 'x-axis' && getBPColor(ctx.p0.parsed.x)) || 'rgb(255, 99, 132)'
                }
            },
            {
                label: '舒張壓',
                data: filteredRecords.map(r => r.diastolic > 0 ? r.diastolic : null),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                pointBackgroundColor: diastolicPointColors,
                pointRadius: bpPointRadii,
                spanGaps: true,
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2,
                segment: {
                    borderColor: (ctx: any) => (auxiliaryLineMode === 'x-axis' && getBPColor(ctx.p0.parsed.x)) || 'rgb(75, 192, 192)'
                }
            },
            {
                label: '心跳',
                data: filteredRecords.map(r => (r.heartRate ?? 0) > 0 ? r.heartRate : null),
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                pointBackgroundColor: hrPointColors,
                pointRadius: hrPointRadii,
                spanGaps: true,
                borderDash: [5, 5],
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2,
                segment: {
                    borderColor: (ctx: any) => (auxiliaryLineMode === 'x-axis' && getHRColor(ctx.p0.parsed.x)) || 'rgb(153, 102, 255)'
                }
            },
            createThresholdLine(activeThresholds.systolicHigh, '收縮壓警示', 'rgba(255, 99, 132, 0.6)'),
            createThresholdLine(activeThresholds.diastolicHigh, '舒張壓警示', 'rgba(75, 192, 192, 0.6)'),
            createThresholdLine(activeThresholds.diastolicHigh, '舒張壓警示', 'rgba(75, 192, 192, 0.6)'),
            createPulsePressureAlertDataset()
        ].filter(Boolean) as any[]
    };

    // --- Glucose Chart Logic ---
    const glucoseYMax = Math.max(...filteredRecords.map(r => Math.max(r.glucoseFasting || 0, r.glucosePostMeal || 0, r.glucoseRandom || 0)), 200) + 20;
    const validGlucoseCount = filteredRecords.filter(r => (r.glucoseFasting ?? 0) > 0 || (r.glucosePostMeal ?? 0) > 0 || (r.glucoseRandom ?? 0) > 0).length;

    const getGlucoseColorHelper = (index: number): string | null => {
        const r = filteredRecords[index];
        if (!r.noteContent) return glucoseColorMap.get(index) || null;
        if (r.noteContent.includes('"bigMeal"')) return colors.bigMeal;
        if (r.noteContent.includes('"dieting"')) return colors.dieting;
        if (r.noteContent.includes('"fasting"')) return colors.fasting;
        return glucoseColorMap.get(index) || null;
    };

    const glucoseFastingColors = filteredRecords.map((r, i) => {
        if ((r.glucoseFasting ?? 0) <= 0) return 'rgb(255, 159, 64)';
        if (activeThresholds.fastingHigh > 0 && r.glucoseFasting > activeThresholds.fastingHigh) return effectiveAlertColor;
        return glucoseColorMap.get(i) || 'rgb(255, 159, 64)';
    });
    const glucosePostMealColors = filteredRecords.map((r, i) => {
        if ((r.glucosePostMeal ?? 0) <= 0) return 'rgb(153, 102, 255)';
        if (activeThresholds.postMealHigh > 0 && r.glucosePostMeal > activeThresholds.postMealHigh) return effectiveAlertColor;
        return glucoseColorMap.get(i) || 'rgb(153, 102, 255)';
    });
    const glucoseRandomColors = filteredRecords.map((r, i) => {
        if ((r.glucoseRandom ?? 0) <= 0) return 'rgb(201, 203, 207)';
        return glucoseColorMap.get(i) || 'rgb(201, 203, 207)';
    });
    const glucosePointRadii = filteredRecords.map((r, i) => {
        const hasGlucose = (r.glucoseFasting ?? 0) > 0 || (r.glucosePostMeal ?? 0) > 0 || (r.glucoseRandom ?? 0) > 0;
        if (!hasGlucose) return 4;
        return glucoseColorMap.has(i) ? 6 : 4;
    });

    const glucoseData = {
        labels,
        datasets: [
            createSmartAuxBar('大餐', colors.bigMeal, (r) => r.noteContent ? r.noteContent.includes('"bigMeal"') : false, glucoseYMax, validGlucoseCount),
            createSmartAuxBar('節食', colors.dieting, (r) => r.noteContent ? r.noteContent.includes('"dieting"') : false, glucoseYMax, validGlucoseCount),
            createSmartAuxBar('斷食', colors.fasting, (r) => r.noteContent ? r.noteContent.includes('"fasting"') : false, glucoseYMax, validGlucoseCount),
            {
                label: '空腹血糖',
                data: filteredRecords.map(r => (r.glucoseFasting ?? 0) > 0 ? r.glucoseFasting : null),
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                pointBackgroundColor: glucoseFastingColors,
                pointRadius: glucosePointRadii,
                spanGaps: true,
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2,
                segment: {
                    borderColor: (ctx: any) => (auxiliaryLineMode === 'x-axis' && getGlucoseColorHelper(ctx.p0.parsed.x)) || 'rgb(255, 159, 64)'
                }
            },
            {
                label: '飯後血糖',
                data: filteredRecords.map(r => (r.glucosePostMeal ?? 0) > 0 ? r.glucosePostMeal : null),
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                pointBackgroundColor: glucosePostMealColors,
                pointRadius: glucosePointRadii,
                spanGaps: true,
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2,
                segment: {
                    borderColor: (ctx: any) => (auxiliaryLineMode === 'x-axis' && getGlucoseColorHelper(ctx.p0.parsed.x)) || 'rgb(153, 102, 255)'
                }
            },
            {
                label: '臨時血糖',
                data: filteredRecords.map(r => (r.glucoseRandom ?? 0) > 0 ? r.glucoseRandom : null),
                borderColor: 'rgb(201, 203, 207)',
                backgroundColor: 'rgba(201, 203, 207, 0.5)',
                pointBackgroundColor: glucoseRandomColors,
                pointRadius: glucosePointRadii,
                spanGaps: true,
                type: 'line' as const,
                order: 1,
                borderWidth: auxiliaryLineMode === 'x-axis' ? 3 : 2,
                segment: {
                    borderColor: (ctx: any) => (auxiliaryLineMode === 'x-axis' && getGlucoseColorHelper(ctx.p0.parsed.x)) || 'rgb(201, 203, 207)'
                }
            },
            createThresholdLine(activeThresholds.fastingHigh, '空腹高標', 'rgba(255, 159, 64, 0.6)'),
            createThresholdLine(activeThresholds.postMealHigh, '飯後高標', 'rgba(153, 102, 255, 0.6)')
        ].filter(Boolean) as any[]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: !fullscreenChart,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: { legend: { position: 'top' as const } },
        scales: { y: { type: 'linear' as const, display: true, position: 'left' as const } },
    };

    const ranges: { value: TimeRange; label: string }[] = [
        { value: 'week', label: '一週' },
        { value: '2week', label: '雙週' },
        { value: 'month', label: '一個月' },
        { value: 'quarter', label: '一季' },
        { value: 'halfYear', label: '半年' },
        { value: 'year', label: '一年' },
        { value: 'all', label: '全部' },
    ];

    const chartTitles: Record<ChartType, string> = {
        weight: '體重趨勢',
        bp: '血壓變化',
        glucose: '血糖紀錄',
    };

    const getChartData = (type: ChartType) => {
        switch (type) {
            case 'weight': return weightData;
            case 'bp': return bpData;
            case 'glucose': return glucoseData;
        }
    };

    const openFullscreen = (type: ChartType) => {
        setFsTimeRange(globalTimeRange);
        setFullscreenChart(type);
    };

    const ExpandButton = ({ type }: { type: ChartType }) => (
        <button
            onClick={() => openFullscreen(type)}
            className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-teal-100 rounded-full transition-colors text-gray-500 hover:text-teal-600"
            title="放大"
        >
            <Maximize2 className="h-4 w-4" />
        </button>
    );

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-teal-200 transition">
                    <ExpandButton type="weight" />
                    <h4 className="text-md font-medium text-gray-700 mb-4">體重趨勢 (點擊數值編輯)</h4>
                    <Line ref={chartRefWeight} data={weightData} options={options} {...bindClick(chartRefWeight)} />
                </div>
                <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-teal-200 transition">
                    <ExpandButton type="bp" />
                    <h4 className="text-md font-medium text-gray-700 mb-4">血壓變化 (點擊數值編輯)</h4>
                    <Line ref={chartRefBP} data={bpData} options={options} plugins={[pulsePressurePlugin]} {...bindClick(chartRefBP)} />
                </div>
                <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:col-span-2 cursor-pointer hover:border-teal-200 transition">
                    <ExpandButton type="glucose" />
                    <h4 className="text-md font-medium text-gray-700 mb-4">血糖紀錄 (點擊數值編輯)</h4>
                    <Line ref={chartRefGlucose} data={glucoseData} options={options} {...bindClick(chartRefGlucose)} />
                </div>
            </div>

            {/* Fullscreen Modal */}
            {fullscreenChart && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800">{chartTitles[fullscreenChart]}</h2>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                                {ranges.map((range) => (
                                    <button
                                        key={range.value}
                                        onClick={() => setFsTimeRange(range.value)}
                                        className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${fsTimeRange === range.value
                                            ? 'bg-white text-teal-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setFullscreenChart(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-auto">
                        <Line data={getChartData(fullscreenChart)} options={{ ...options, maintainAspectRatio: false }} />
                    </div>
                </div>
            )}
        </>
    );
};
