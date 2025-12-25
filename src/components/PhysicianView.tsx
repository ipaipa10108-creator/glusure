import React, { useState, useMemo } from 'react';
import { HealthRecord, GlucoseReading, TimeRange } from '../types';
import { format, parseISO, differenceInMinutes, subDays, subMonths, subYears, isAfter, addDays, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getGlucoseColor, getGlucoseStatus } from '../utils/helpers';
import clsx from 'clsx';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Activity } from 'lucide-react';

interface PhysicianViewProps {
    records: HealthRecord[];
}

export const PhysicianView: React.FC<PhysicianViewProps> = ({ records }) => {
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [timeRange, setTimeRange] = useState<TimeRange>('week');

    const filteredAndSortedRecords = useMemo(() => {
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

        const filtered = records.filter(r => isAfter(parseISO(r.timestamp), startDate));

        return filtered.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
    }, [records, sortOrder, timeRange]);

    // Helper to find next day weight abnormality
    const getNextDayWeightDiff = (record: HealthRecord) => {
        const recordDate = parseISO(record.timestamp);
        const nextDay = addDays(recordDate, 1);
        const nextDayRecord = records.find(r => isSameDay(parseISO(r.timestamp), nextDay));

        if (nextDayRecord) {
            const diff = nextDayRecord.weight - record.weight;
            if (diff >= 2) return { isAbnormal: true, diff };
        }
        return { isAbnormal: false, diff: 0 };
    };

    const renderGlucoseDetails = (record: HealthRecord) => {
        let details: GlucoseReading[] = [];
        try {
            if (record.details) {
                details = JSON.parse(record.details);
            }
        } catch (e) {
            console.error('Failed to parse details', e);
        }

        // Fallback if no details but old fields exist (compatibility)
        if (details.length === 0) {
            if (record.glucoseFasting) details.push({ type: 'fasting', value: record.glucoseFasting, timestamp: record.timestamp });
            if (record.glucosePostMeal) details.push({ type: 'postMeal', value: record.glucosePostMeal, timestamp: record.timestamp });
        }

        // Sort details by timestamp if available
        details.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Grouping/Pairing logic for display
        // e.g., Find Fasting then next PostMeal
        const elements = [];
        for (let i = 0; i < details.length; i++) {
            const item = details[i];
            const status = getGlucoseStatus(item.value, item.type);
            const colorClass = getGlucoseColor(status);
            const typeLabel = item.type === 'fasting' ? '空腹' : item.type === 'postMeal' ? '飯後' : '臨時';

            elements.push(
                <span key={i} className={clsx("px-2 py-0.5 rounded text-xs w-fit mr-1 mb-1", colorClass)}>
                    {typeLabel}: {item.value}
                </span>
            );

            // Check for interval to next item if it forms a pair (Fasting -> PostMeal)
            if (item.type === 'fasting' && i + 1 < details.length) {
                const nextItem = details[i + 1];
                if (nextItem.type === 'postMeal') {
                    const diffMins = differenceInMinutes(parseISO(nextItem.timestamp), parseISO(item.timestamp));
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    elements.push(
                        <span key={`diff-${i}`} className="text-xs text-gray-400 mx-1 mb-1">
                            (相隔 {hours}小時{mins}分) →
                        </span>
                    );
                }
            }
        }
        return <div className="flex flex-wrap items-center">{elements}</div>;
    };

    const ranges: { value: TimeRange; label: string }[] = [
        { value: 'week', label: '近一週' },
        { value: '2week', label: '近雙週' },
        { value: 'month', label: '近一月' },
        { value: 'quarter', label: '一季' },
        { value: 'halfYear', label: '半年' },
        { value: 'year', label: '一年' },
        { value: 'all', label: '全部' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            {/* Header & Controls */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-teal-600" />
                    醫師檢視模式
                </h3>

                <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                        {ranges.map(r => (
                            <button
                                key={r.value}
                                onClick={() => setTimeRange(r.value)}
                                className={clsx(
                                    "px-3 py-1 text-xs rounded transition-colors whitespace-nowrap",
                                    timeRange === r.value ? "bg-teal-100 text-teal-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600"
                        title="切換排序"
                    >
                        {sortOrder === 'desc' ? <ArrowDownWideNarrow size={18} /> : <ArrowUpNarrowWide size={18} />}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">體重 (未來24小時變化)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">血壓 (mmHg) / 心跳 (bpm)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">血糖監測 (mg/dL)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedRecords.map((record) => {
                            const { isAbnormal: weightAbnormal, diff: weightDiff } = getNextDayWeightDiff(record);

                            return (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium align-top">
                                        {format(parseISO(record.timestamp), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                        <span className={clsx(weightAbnormal ? "text-red-600 font-bold" : "text-gray-700")}>
                                            {record.weight}
                                        </span>
                                        {weightAbnormal && (
                                            <div className="text-xs text-red-500 mt-1">
                                                ⚠️ 24h後 +{weightDiff.toFixed(1)}kg
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-top">
                                        <div>BP: {record.systolic} / {record.diastolic}</div>
                                        {record.heartRate && (
                                            <div className="text-gray-500 text-xs mt-1">HR: {record.heartRate}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm align-top">
                                        {renderGlucoseDetails(record)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
