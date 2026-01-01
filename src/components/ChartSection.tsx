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

        return {
            label: label,
            data: filteredRecords.map((r, i) => {
                const match = condition(r);
                if (!match) return null;

                if (auxiliaryLineMode === 'x') {
                    // Check connections
                    const hasPrev = i > 0;
                    const hasNext = i < filteredRecords.length - 1;
                    // If connected to either, we prefer the "X-axis" style (marker on segment).
                    // So we hide this bar.
                    // The Plugin will handle drawing the marker.
                    // "若紀錄的輔助線尚未有點跟點的連線... 暫時由 Y軸... 直到有點跟點..."
                    // So if isolated (no prev, no next), show bar.
                    if (hasPrev || hasNext) return null;
                }

                return yMax;
            }),
            backgroundColor: color,
            type: 'bar',
            barThickness: 2,
            order: 1000
        };
    };

    // Plugin for X-Mode Ticks
    const xModePlugin = {
        id: 'xModePlugin',
        afterDatasetsDraw(chart: any) {
            if (auxiliaryLineMode !== 'x' || !showAuxiliaryLines) return;
            const { ctx, scales: { x, y } } = chart;

            // Find the main line dataset to position the ticks on the line
            const lineDataset = chart.data.datasets.find((d: any) => d.type === 'line' && d.label !== '輔助線' && !d.label?.includes('警示'));

            const drawTick = (i: number, color: string) => {
                const x1 = x.getPixelForValue(i);
                const x2 = x.getPixelForValue(i + 1);
                const xMid = (x1 + x2) / 2;

                let yMid = (y.top + y.bottom) / 2;

                // Try to interpolate Y position if line dataset exists
                if (lineDataset) {
                    const v1 = lineDataset.data[i];
                    const v2 = lineDataset.data[i + 1];
                    if (typeof v1 === 'number' && typeof v2 === 'number') {
                        const y1 = y.getPixelForValue(v1);
                        const y2 = y.getPixelForValue(v2);
                        yMid = (y1 + y2) / 2;
                    }
                }

                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                // Draw a distinct vertical tick
                ctx.moveTo(xMid, yMid - 8);
                ctx.lineTo(xMid, yMid + 8);
                ctx.stroke();

                // Add a small dot for visibility
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(xMid, yMid, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            };

            filteredRecords.forEach((r, i) => {
                if (i >= filteredRecords.length - 1) return; // No next point

                // Check conditions
                // Weight/Diet/Exercise
                if (r.noteContent) {
                    if (r.noteContent.includes('"type":"resistance"')) drawTick(i, 'rgba(239, 68, 68, 1)');
                    else if (r.noteContent.includes('"type":"cycling"')) drawTick(i, 'rgba(249, 115, 22, 1)');
                    else if ((r.noteContent.includes('"type":"walking"') || r.noteContent.includes('"type":"other"'))) drawTick(i, 'rgba(16, 185, 129, 1)');
                    else if (r.noteContent.includes('"bigMeal"')) drawTick(i, 'rgba(239, 68, 68, 1)');
                    else if (r.noteContent.includes('"dieting"')) drawTick(i, 'rgba(16, 185, 129, 1)');
                    else if (r.noteContent.includes('"fasting"')) drawTick(i, 'rgba(139, 92, 246, 1)');
                }
                // Weather
                if (r.weather === 'hot') drawTick(i, 'rgba(239, 68, 68, 1)');
                else if (r.weather === 'cold') drawTick(i, 'rgba(59, 130, 246, 1)');
            });
        }
    };

    // ... existing code ...

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
