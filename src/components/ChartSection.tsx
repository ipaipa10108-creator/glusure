import { useMemo, useRef, useState } from 'react';
import { HealthRecord, TimeRange } from '../types';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
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
    Title,
    Tooltip,
    Legend,
    TimeScale
);

interface ChartSectionProps {
    records: HealthRecord[];
    timeRange: TimeRange;
    onDataClick?: (record: HealthRecord) => void;
}

type ChartType = 'weight' | 'bp' | 'glucose';

export const ChartSection: React.FC<ChartSectionProps> = ({ records, timeRange: globalTimeRange, onDataClick }) => {
    const chartRefWeight = useRef<any>(null);
    const chartRefBP = useRef<any>(null);
    const chartRefGlucose = useRef<any>(null);

    const [fullscreenChart, setFullscreenChart] = useState<ChartType | null>(null);
    const [fsTimeRange, setFsTimeRange] = useState<TimeRange>(globalTimeRange);

    const currentTimeRange = fullscreenChart ? fsTimeRange : globalTimeRange;

    const filteredRecords = useMemo(() => {
        const now = new Date();
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
            .filter(r => isAfter(parseISO(r.timestamp), startDate))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [records, currentTimeRange]);

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

    const weightData = {
        labels,
        datasets: [{
            label: '體重 (kg)',
            data: filteredRecords.map(r => r.weight > 0 ? r.weight : null),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.2)',
            fill: true,
            spanGaps: true,
            tension: 0.4,
        }],
    };

    const bpData = {
        labels,
        datasets: [
            { label: '收縮壓', data: filteredRecords.map(r => r.systolic > 0 ? r.systolic : null), borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', spanGaps: true },
            { label: '舒張壓', data: filteredRecords.map(r => r.diastolic > 0 ? r.diastolic : null), borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', spanGaps: true },
            { label: '心跳', data: filteredRecords.map(r => (r.heartRate ?? 0) > 0 ? r.heartRate : null), borderColor: 'rgb(153, 102, 255)', backgroundColor: 'rgba(153, 102, 255, 0.5)', spanGaps: true, borderDash: [5, 5] },
        ],
    };

    const glucoseData = {
        labels,
        datasets: [
            { label: '空腹血糖', data: filteredRecords.map(r => (r.glucoseFasting ?? 0) > 0 ? r.glucoseFasting : null), borderColor: 'rgb(255, 159, 64)', backgroundColor: 'rgba(255, 159, 64, 0.5)', spanGaps: true },
            { label: '飯後血糖', data: filteredRecords.map(r => (r.glucosePostMeal ?? 0) > 0 ? r.glucosePostMeal : null), borderColor: 'rgb(153, 102, 255)', backgroundColor: 'rgba(153, 102, 255, 0.5)', spanGaps: true },
            { label: '臨時血糖', data: filteredRecords.map(r => (r.glucoseRandom ?? 0) > 0 ? r.glucoseRandom : null), borderColor: 'rgb(201, 203, 207)', backgroundColor: 'rgba(201, 203, 207, 0.5)', spanGaps: true },
        ],
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
                    <Line ref={chartRefBP} data={bpData} options={options} {...bindClick(chartRefBP)} />
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
