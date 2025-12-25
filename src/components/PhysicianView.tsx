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

    const groupedRecords = useMemo(() => {
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

        // Group by Day
        const groups: { [key: string]: HealthRecord[] } = {};
        filtered.forEach(r => {
            const dayKey = format(parseISO(r.timestamp), 'yyyy-MM-dd');
            if (!groups[dayKey]) groups[dayKey] = [];
            groups[dayKey].push(r);
        });

        // Convert to array and sort
        const groupArray = Object.keys(groups).map(date => {
            return {
                date,
                records: groups[date].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            };
        });

        return groupArray.sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
    }, [records, sortOrder, timeRange]);

    // Helper to find next day weight abnormality
    const getNextDayWeightDiff = (currentDateStr: string, currentDayRecords: HealthRecord[]) => {
        // Average weight for the day? Or latest? Let's use latest.
        const latestWeight = currentDayRecords.filter(r => r.weight > 0).pop()?.weight;
        if (!latestWeight) return { isAbnormal: false, diff: 0 };

        const currentDate = parseISO(currentDateStr);
        const nextDay = addDays(currentDate, 1);

        // Find next day records
        const nextDayRecords = records.filter(r => isSameDay(parseISO(r.timestamp), nextDay) && r.weight > 0);
        const nextDayWeight = nextDayRecords.length > 0 ? nextDayRecords[nextDayRecords.length - 1].weight : null;

        if (nextDayWeight) {
            const diff = nextDayWeight - latestWeight;
            if (Math.abs(diff) >= 2) return { isAbnormal: true, diff };
        }
        return { isAbnormal: false, diff: 0 };
    };

    const renderGlucoseDetailsForDay = (dayRecords: HealthRecord[]) => {
        // Aggregate all glucose readings for the day
        let allReadings: GlucoseReading[] = [];

        dayRecords.forEach(r => {
            try {
                if (r.details) {
                    const details: GlucoseReading[] = JSON.parse(r.details);
                    allReadings = [...allReadings, ...details];
                } else {
                    // Fallback using independent fields
                    if (r.glucoseFasting) allReadings.push({ type: 'fasting', value: r.glucoseFasting, timestamp: r.timestamp });
                    if (r.glucosePostMeal) allReadings.push({ type: 'postMeal', value: r.glucosePostMeal, timestamp: r.timestamp });
                    if (r.glucoseRandom) allReadings.push({ type: 'random', value: r.glucoseRandom, timestamp: r.timestamp });
                }
            } catch (e) { }
        });

        // Deduplicate based on timestamp and type (optional but good for safety)
        const uniqueReadings = allReadings.filter((v, i, a) => a.findIndex(t => t.timestamp === v.timestamp && t.type === v.type) === i);

        // Sort by timestamp
        uniqueReadings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Sort to prioritize Fasting -> PostMeal for display if timestamps are close or just for layout?
        // User wants: Fasting first, then PostMeal.
        // If we strictly follow time, usually Fasting IS before PostMeal. 
        // But if there are multiple pairs, we show them in time order.

        const elements: JSX.Element[] = [];

        // Logic to pair Fasting with NEXT PostMeal
        const processedIndices = new Set<number>();

        for (let i = 0; i < uniqueReadings.length; i++) {
            if (processedIndices.has(i)) continue;

            const current = uniqueReadings[i];

            // Render Current
            const status = getGlucoseStatus(current.value, current.type);
            const colorClass = getGlucoseColor(status);
            const typeLabel = current.type === 'fasting' ? '空腹' : current.type === 'postMeal' ? '飯後' : '臨時';
            const timeStr = format(parseISO(current.timestamp), 'HH:mm');

            elements.push(
                <span key={`item-${i}`} className={clsx("px-2 py-1 rounded text-xs w-fit mr-1 mb-1 flex items-center gap-1", colorClass)}>
                    <span className="opacity-75 text-[10px]">{timeStr}</span>
                    <span className="font-bold">{typeLabel}: {current.value}</span>
                </span>
            );

            processedIndices.add(i);

            // If Fasting, look for next PostMeal that hasn't been processed
            if (current.type === 'fasting') {
                // Find next postMeal
                let pairIndex = -1;
                for (let j = i + 1; j < uniqueReadings.length; j++) {
                    if (!processedIndices.has(j) && uniqueReadings[j].type === 'postMeal') {
                        pairIndex = j;
                        break;
                    }
                }

                if (pairIndex !== -1) {
                    const pair = uniqueReadings[pairIndex];
                    const diffMins = differenceInMinutes(parseISO(pair.timestamp), parseISO(current.timestamp));
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;

                    elements.push(
                        <span key={`diff-${i}`} className="text-xs text-slate-400 mx-1 mb-1 flex items-center">
                            → ({hours}h {mins}m) →
                        </span>
                    );

                    // Render Pair
                    const pairStatus = getGlucoseStatus(pair.value, pair.type);
                    const pairColor = getGlucoseColor(pairStatus);
                    const pairTimeStr = format(parseISO(pair.timestamp), 'HH:mm');

                    elements.push(
                        <span key={`item-${pairIndex}`} className={clsx("px-2 py-1 rounded text-xs w-fit mr-1 mb-1 flex items-center gap-1", pairColor)}>
                            <span className="opacity-75 text-[10px]">{pairTimeStr}</span>
                            <span className="font-bold">飯後: {pair.value}</span>
                        </span>
                    );

                    processedIndices.add(pairIndex);
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
            {/* Header & Controls - unchanged mostly */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-teal-600" />
                    醫師檢視模式 (每日彙整)
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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">體重 (最新/變化)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">血壓 (最新)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">血糖監測 (時間軸)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {groupedRecords.map(({ date, records: dayRecords }) => {
                            const { isAbnormal: weightAbnormal, diff: weightDiff } = getNextDayWeightDiff(date, dayRecords);

                            // Get latest metrics for the day
                            const latestWeight = dayRecords.filter(r => r.weight > 0).pop()?.weight;
                            const latestBPRecord = dayRecords.filter(r => r.systolic > 0).pop();

                            return (
                                <tr key={date} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium align-top">
                                        {format(parseISO(date), 'yyyy/MM/dd (eee)', { locale: zhTW })}
                                        <div className="text-xs text-gray-400 font-normal mt-1">{dayRecords.length} 筆紀錄</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                        {latestWeight ? (
                                            <>
                                                <span className={clsx(weightAbnormal ? "text-red-600 font-bold" : "text-gray-700")}>
                                                    {latestWeight} kg
                                                </span>
                                                {weightAbnormal && (
                                                    <div className="text-xs text-red-500 mt-1">
                                                        ⚠️ 隔日 +{weightDiff.toFixed(1)}kg
                                                    </div>
                                                )}
                                            </>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-top">
                                        {latestBPRecord ? (
                                            <>
                                                <div>BP: {latestBPRecord.systolic} / {latestBPRecord.diastolic}</div>
                                                {latestBPRecord.heartRate ? (
                                                    <div className="text-gray-500 text-xs mt-1">HR: {latestBPRecord.heartRate}</div>
                                                ) : null}
                                            </>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm align-top">
                                        {renderGlucoseDetailsForDay(dayRecords)}
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
