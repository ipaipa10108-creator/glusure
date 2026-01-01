import { useMemo, useRef, useState } from 'react';
import { HealthRecord, TimeRange, HealthThresholds } from '../types';
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
    auxiliaryLineMode?: 'y' | 'x';
}

type ChartType = 'weight' | 'bp' | 'glucose';

export const ChartSection: React.FC<ChartSectionProps> = ({
    records,
    timeRange: globalTimeRange,
    onDataClick,
    referenceDate,
    thresholds,
    showThresholds = true,
    showAuxiliaryLines = true,
    auxiliaryLineMode = 'y'
}) => {
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

    const activeThresholds = thresholds || { weightHigh: 0, weightLow: 0, systolicHigh: 140, diastolicHigh: 90, fastingHigh: 100, postMealHigh: 140 };

    // --- Auxiliary Line Logic ---
    // If mode is 'x', we draw ticks on line segments. If isolated, fallback to bar.
    // We will prepare data for a custom plugin to handle the 'x' mode drawing.
    // But for simplicity and robustness with React-Chartjs-2, we can generate:
    // 1. A Bar dataset (Background) - ONLY for 'y' mode or 'x' mode fallback.
    // 2. A Custom Plugin to draw the 'x' mode ticks.



    // Easier approach without complex Plugin:
    // 'x' mode = We draw a 'bar' dataset but very thin (a line) and positioned between points?
    // Chart.js Bar chart is centered on the point.
    // We want it BETWEEN points.
    // Let's stick to strict logic:
    // If 'y' mode: Full Bar on the point.
    // If 'x' mode:
    //    If has neighbor: Do NOT draw Bar. (The plugin or advanced logic would handle it, but for MVP let's just make it a thinner Bar on the point? No, user explicitly said "between points").
    //    If isolated: Draw Full Bar.

    // Implementation constraint: Custom drawing between points is hard without Plugin.
    // Let's try a simpler interpretation of 'X-axis mode' for now that is robust:
    // "Market on the line connecting points" -> coloring the line segment?
    // Let's go with the Plugin idea but keep it simple.
    // Actually, to avoid "plugin hell", let's use the provided `auxiliaryLineMode` to toggle `barThickness`.
    // IF 'x' mode AND connected -> `barThickness: 2` (thin line)? But it's still ON the point, not between.

    // Accurate Interpretation:
    // User wants to distinguish "Area/Region" (Y-axis filling) vs "Event/Marker" (X-axis tick).
    // Let's implement:
    // Mode 'y': backgroundColor fills the column (barThickness: 'flex' or huge).
    // Mode 'x': Thinner bar?
    // Let's look at `createAuxBar`: currently `barThickness: 2` (already thin!). AND `data` is `yMax`.
    // It looks like a vertical line already.
    // Maybe previous implementation was ALREADY "X-axis style"?
    // "Y軸表示和現在呈現的是一致的方式" -> User thinks current is Y-axis?
    // Current `createAuxBar` uses `barThickness: 2`. This is a thin line.
    // Wait, the user might see it as "Y-axis" because it goes from 0 to yMax.
    // "X軸表示則是將現段呈現在數據中點跟點連接的線段上呈現"

    // Let's stick to this:
    // Mode 'y': Existing implementation (Vertical Line / Bar).
    // Mode 'x': Modification -> Only draw if isolated. If connected, we assume the user wants a marker ON THE LINE SEGMENT.
    // I will use a Plugin to draw a small tick mark on the line segment between i and i+1.

    // Revised `createAuxBar`:
    // Returns `null` if mode is 'x' and record is connected (handled by plugin).
    // Returns `bar` if mode is 'y' OR (mode is 'x' and record is isolated).



    const createAuxBar = (label: string, color: string, condition: (r: HealthRecord) => boolean, yMax: number) => {
        if (!showAuxiliaryLines) return null;
        // In 'x' mode, we never use bars. We use the plugin to draw overlays on the line.
        if (auxiliaryLineMode === 'x') return null;

        return {
            label: label,
            data: filteredRecords.map((r) => {
                const match = condition(r);
                return match ? yMax : null;
            }),
            backgroundColor: color,
            type: 'bar',
            barThickness: 2,
            order: 1000
        };
    };

    // Plugin for X-Mode: Overlays color on the line segments
    const xModePlugin = {
        id: 'xModePlugin',
        afterDatasetsDraw(chart: any) {
            if (auxiliaryLineMode !== 'x' || !showAuxiliaryLines) return;
            const { ctx } = chart;

            // Find the main line dataset
            // We look for a line dataset that is not an auxiliary line
            const datasetIndex = chart.data.datasets.findIndex((d: any) =>
                d.type === 'line' && d.label !== '輔助線' && !d.label?.includes('警示')
            );

            if (datasetIndex === -1) return;

            const meta = chart.getDatasetMeta(datasetIndex);

            const drawOverlay = (i: number, color: string) => {
                const point = meta.data[i];
                const nextPoint = meta.data[i + 1];

                if (!point || point.skip) return;

                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 4; // Slightly thicker than the main line
                ctx.lineCap = 'round';

                if (nextPoint && !nextPoint.skip) {
                    // Draw line segment
                    ctx.beginPath();
                    ctx.moveTo(point.x, point.y);
                    ctx.lineTo(nextPoint.x, nextPoint.y);
                    ctx.stroke();
                } else {
                    // Isolated point: draw a halo/ring
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            };

            filteredRecords.forEach((r, i) => {
                // Determine color based on priority
                let color = null;

                if (r.noteContent) {
                    if (r.noteContent.includes('"type":"resistance"')) color = 'rgba(239, 68, 68, 1)'; // Red
                    else if (r.noteContent.includes('"type":"cycling"')) color = 'rgba(249, 115, 22, 1)'; // Orange
                    else if (r.noteContent.includes('"type":"walking"') || r.noteContent.includes('"type":"other"')) color = 'rgba(16, 185, 129, 1)'; // Green
                    else if (r.noteContent.includes('"bigMeal"')) color = 'rgba(239, 68, 68, 1)';
                    else if (r.noteContent.includes('"dieting"')) color = 'rgba(16, 185, 129, 1)';
                    else if (r.noteContent.includes('"fasting"')) color = 'rgba(139, 92, 246, 1)';
                }

                if (!color) {
                    if (r.weather === 'hot') color = 'rgba(239, 68, 68, 1)';
                    else if (r.weather === 'cold') color = 'rgba(59, 130, 246, 1)';
                }

                if (color) {
                    drawOverlay(i, color);
                }
            });
        }
    };

    // Construct Datasets
    const weightData = {
        labels,
        datasets: [
            {
                label: '體重 (kg)',
                data: filteredRecords.map(r => r.weight),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                yAxisID: 'y',
                spanGaps: true,
            },
            createThresholdLine(activeThresholds.weightHigh, '體重上限', 'rgba(255, 99, 132, 0.8)'),
            createThresholdLine(activeThresholds.weightLow, '體重下限', 'rgba(54, 162, 235, 0.8)'),
            // Auxiliary Bars (Exercise, etc.) - Pass yMax as a large number roughly covering the chart range
            createAuxBar('無氧運動', 'rgba(239, 68, 68, 0.2)', r => !!r.noteContent?.includes('"type":"resistance"'), 200),
            createAuxBar('有氧運動', 'rgba(249, 115, 22, 0.2)', r => !!r.noteContent?.includes('"type":"cycling"'), 200),
            createAuxBar('活動', 'rgba(16, 185, 129, 0.2)', r => !!(r.noteContent?.includes('"type":"walking"') || r.noteContent?.includes('"type":"other"')), 200),
            createAuxBar('大餐', 'rgba(239, 68, 68, 0.2)', r => !!r.noteContent?.includes('"bigMeal"'), 200),
            createAuxBar('節食', 'rgba(16, 185, 129, 0.2)', r => !!r.noteContent?.includes('"dieting"'), 200),
            createAuxBar('斷食', 'rgba(139, 92, 246, 0.2)', r => !!r.noteContent?.includes('"fasting"'), 200),
            createAuxBar('天氣熱', 'rgba(239, 68, 68, 0.1)', r => r.weather === 'hot', 200),
            createAuxBar('天氣冷', 'rgba(59, 130, 246, 0.1)', r => r.weather === 'cold', 200),
        ].filter(Boolean) as any[]
    };

    const bpData = {
        labels,
        datasets: [
            {
                label: '收縮壓 (mmHg)',
                data: filteredRecords.map(r => r.systolic),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y',
                spanGaps: true,
            },
            {
                label: '舒張壓 (mmHg)',
                data: filteredRecords.map(r => r.diastolic),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                yAxisID: 'y',
                spanGaps: true,
            },
            createThresholdLine(activeThresholds.systolicHigh, '收縮壓上限', 'rgba(255, 99, 132, 0.8)'),
            createThresholdLine(activeThresholds.diastolicHigh, '舒張壓上限', 'rgba(53, 162, 235, 0.8)'),
            // Aux Bars
            createAuxBar('無氧運動', 'rgba(239, 68, 68, 0.2)', r => !!r.noteContent?.includes('"type":"resistance"'), 200),
            createAuxBar('有氧運動', 'rgba(249, 115, 22, 0.2)', r => !!r.noteContent?.includes('"type":"cycling"'), 200),
            createAuxBar('活動', 'rgba(16, 185, 129, 0.2)', r => !!(r.noteContent?.includes('"type":"walking"') || r.noteContent?.includes('"type":"other"')), 200),
            createAuxBar('大餐', 'rgba(239, 68, 68, 0.2)', r => !!r.noteContent?.includes('"bigMeal"'), 200),
            createAuxBar('節食', 'rgba(16, 185, 129, 0.2)', r => !!r.noteContent?.includes('"dieting"'), 200),
            createAuxBar('斷食', 'rgba(139, 92, 246, 0.2)', r => !!r.noteContent?.includes('"fasting"'), 200),
            createAuxBar('天氣熱', 'rgba(239, 68, 68, 0.1)', r => r.weather === 'hot', 200),
            createAuxBar('天氣冷', 'rgba(59, 130, 246, 0.1)', r => r.weather === 'cold', 200),
        ].filter(Boolean) as any[]
    };

    const glucoseData = {
        labels,
        datasets: [
            {
                label: '血糖 (mg/dL)',
                data: filteredRecords.map(r => r.glucoseFasting ?? r.glucosePostMeal ?? r.glucoseRandom ?? null),
                borderColor: 'rgb(255, 206, 86)',
                backgroundColor: 'rgba(255, 206, 86, 0.5)',
                yAxisID: 'y',
                spanGaps: true,
            },
            createThresholdLine(activeThresholds.fastingHigh, '空腹血糖上限', 'rgba(255, 159, 64, 0.8)'),
            createThresholdLine(activeThresholds.postMealHigh, '飯後血糖上限', 'rgba(153, 102, 255, 0.8)'),
            // Aux Bars
            createAuxBar('無氧運動', 'rgba(239, 68, 68, 0.2)', r => !!r.noteContent?.includes('"type":"resistance"'), 500),
            createAuxBar('有氧運動', 'rgba(249, 115, 22, 0.2)', r => !!r.noteContent?.includes('"type":"cycling"'), 500),
            createAuxBar('活動', 'rgba(16, 185, 129, 0.2)', r => !!(r.noteContent?.includes('"type":"walking"') || r.noteContent?.includes('"type":"other"')), 500),
            createAuxBar('大餐', 'rgba(239, 68, 68, 0.2)', r => !!r.noteContent?.includes('"bigMeal"'), 500),
            createAuxBar('節食', 'rgba(16, 185, 129, 0.2)', r => !!r.noteContent?.includes('"dieting"'), 500),
            createAuxBar('斷食', 'rgba(139, 92, 246, 0.2)', r => !!r.noteContent?.includes('"fasting"'), 500),
            createAuxBar('天氣熱', 'rgba(239, 68, 68, 0.1)', r => r.weather === 'hot', 500),
            createAuxBar('天氣冷', 'rgba(59, 130, 246, 0.1)', r => r.weather === 'cold', 500),
        ].filter(Boolean) as any[]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: !fullscreenChart,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: { legend: { position: 'top' as const } },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                beginAtZero: false
            }
        },
    };

    const plugins = [xModePlugin];

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
                    <Line ref={chartRefWeight} data={weightData} options={options} plugins={plugins} {...bindClick(chartRefWeight)} />
                </div>
                <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-teal-200 transition">
                    <ExpandButton type="bp" />
                    <h4 className="text-md font-medium text-gray-700 mb-4">血壓變化 (點擊數值編輯)</h4>
                    <Line ref={chartRefBP} data={bpData} options={options} plugins={plugins} {...bindClick(chartRefBP)} />
                </div>
                <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:col-span-2 cursor-pointer hover:border-teal-200 transition">
                    <ExpandButton type="glucose" />
                    <h4 className="text-md font-medium text-gray-700 mb-4">血糖紀錄 (點擊數值編輯)</h4>
                    <Line ref={chartRefGlucose} data={glucoseData} options={options} plugins={plugins} {...bindClick(chartRefGlucose)} />
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
                        <Line data={getChartData(fullscreenChart)} options={{ ...options, maintainAspectRatio: false }} plugins={plugins} />
                    </div>
                </div>
            )}
        </>
    );
};
