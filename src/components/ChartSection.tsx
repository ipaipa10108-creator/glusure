import React, { useMemo, useRef } from 'react';
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
    InteractionItem,
} from 'chart.js';
import { Line, getElementAtEvent } from 'react-chartjs-2';
import { format, subDays, subMonths, subYears, parseISO, isAfter } from 'date-fns';

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

export const ChartSection: React.FC<ChartSectionProps> = ({ records, timeRange, onDataClick }) => {
    const chartRefWeight = useRef<any>(null);
    const chartRefBP = useRef<any>(null);
    const chartRefGlucose = useRef<any>(null);

    const filteredRecords = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
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
    }, [records, timeRange]);

    const labels = filteredRecords.map(r => format(parseISO(r.timestamp), 'MM/dd HH:mm'));

    const onClickHandler = (event: React.MouseEvent<HTMLCanvasElement>, chartRef: any) => {
        if (!onDataClick || !chartRef.current) return;

        // Note: getElementsAtEvent gives elements near the click.
        // getElementAtEvent gives the nearest single element.
        const elements = getElementAtEvent(chartRef.current, event);

        if (elements.length > 0) {
            const index = elements[0].index;
            const record = filteredRecords[index];
            if (record) {
                onDataClick(record);
            }
        }
    };

    const bindClick = (ref: any) => ({
        onClick: (e: React.MouseEvent<HTMLCanvasElement>) => onClickHandler(e, ref)
    });

    const weightData = {
        labels,
        datasets: [
            {
                label: '體重 (kg)',
                data: filteredRecords.map(r => r.weight),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                yAxisID: 'y',
            },
        ],
    };

    const bpData = {
        labels,
        datasets: [
            {
                label: '收縮壓',
                data: filteredRecords.map(r => r.systolic),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
                label: '舒張壓',
                data: filteredRecords.map(r => r.diastolic),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
        ],
    };

    const glucoseData = {
        labels,
        datasets: [
            {
                label: '空腹血糖',
                data: filteredRecords.map(r => r.glucoseFasting),
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                spanGaps: true,
            },
            {
                label: '飯後血糖',
                data: filteredRecords.map(r => r.glucosePostMeal),
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                spanGaps: true,
            },
            {
                label: '臨時血糖',
                data: filteredRecords.map(r => r.glucoseRandom),
                borderColor: 'rgb(201, 203, 207)',
                backgroundColor: 'rgba(201, 203, 207, 0.5)',
                spanGaps: true,
            },
        ],
    };

    const options = {
        responsive: true,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: { position: 'top' as const },
        },
        scales: {
            y: { type: 'linear' as const, display: true, position: 'left' as const },
        },
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-teal-200 transition">
                <h4 className="text-md font-medium text-gray-700 mb-4">體重趨勢 (點擊數值編輯)</h4>
                <Line ref={chartRefWeight} data={weightData} options={options} {...bindClick(chartRefWeight)} />
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-teal-200 transition">
                <h4 className="text-md font-medium text-gray-700 mb-4">血壓變化 (點擊數值編輯)</h4>
                <Line ref={chartRefBP} data={bpData} options={options} {...bindClick(chartRefBP)} />
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:col-span-2 cursor-pointer hover:border-teal-200 transition">
                <h4 className="text-md font-medium text-gray-700 mb-4">血糖紀錄 (點擊數值編輯)</h4>
                <Line ref={chartRefGlucose} data={glucoseData} options={options} {...bindClick(chartRefGlucose)} />
            </div>
        </div>
    );
};
