import React, { useState, useMemo } from 'react';
import { HealthRecord, GlucoseReading, TimeRange, UserSettings } from '../types';
import { format, parseISO, differenceInMinutes, subDays, subMonths, subYears, isAfter, addDays, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getGlucoseStatus } from '../utils/helpers';
import clsx from 'clsx';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Activity } from 'lucide-react';

import { DEFAULT_THRESHOLDS } from '../types';

interface PhysicianViewProps {
    records: HealthRecord[];
    userSettings: UserSettings;
}

export const PhysicianView: React.FC<PhysicianViewProps> = ({ records, userSettings }) => {
    const thresholds = userSettings.thresholds || DEFAULT_THRESHOLDS;
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc');
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
        const latestWeight = currentDayRecords.filter(r => r.weight > 0).pop()?.weight;
        if (!latestWeight) return { isAbnormal: false, diff: 0 };

        const currentDate = parseISO(currentDateStr);
        const nextDay = addDays(currentDate, 1);

        const nextDayRecords = records.filter(r => isSameDay(parseISO(r.timestamp), nextDay) && r.weight > 0);
        const nextDayWeight = nextDayRecords.length > 0 ? nextDayRecords[nextDayRecords.length - 1].weight : null;

        if (nextDayWeight) {
            const diff = nextDayWeight - latestWeight;
            if (Math.abs(diff) >= 2) return { isAbnormal: true, diff };
        }
        return { isAbnormal: false, diff: 0 };
    };

    const renderGlucoseDetailsForDay = (dayRecords: HealthRecord[]) => {
        let allReadings: GlucoseReading[] = [];

        dayRecords.forEach(r => {
            try {
                if (r.details) {
                    const details: GlucoseReading[] = JSON.parse(r.details);
                    allReadings = [...allReadings, ...details];
                } else {
                    if (r.glucoseFasting) allReadings.push({ type: 'fasting', value: r.glucoseFasting, timestamp: r.timestamp });
                    if (r.glucosePostMeal) allReadings.push({ type: 'postMeal', value: r.glucosePostMeal, timestamp: r.timestamp });
                    if (r.glucoseRandom) allReadings.push({ type: 'random', value: r.glucoseRandom, timestamp: r.timestamp });
                }
            } catch (e) { }
        });

        const uniqueReadings = allReadings.filter((v, i, a) => a.findIndex(t => t.timestamp === v.timestamp && t.type === v.type) === i);
        uniqueReadings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const elements: JSX.Element[] = [];
        const processedIndices = new Set<number>();

        for (let i = 0; i < uniqueReadings.length; i++) {
            if (processedIndices.has(i)) continue;

            const current = uniqueReadings[i];
            const isAbnormal = getGlucoseStatus(current.value, current.type, thresholds) !== 'normal';
            const typeLabel = current.type === 'fasting' ? '空腹' : current.type === 'postMeal' ? '飯後' : '臨時';
            const timeStr = format(parseISO(current.timestamp), 'HH:mm');
            // Fasting: Light Green, PostMeal: Light Yellow, Random: Gray (default)
            const bgColorClass = current.type === 'fasting' ? "bg-green-50" : current.type === 'postMeal' ? "bg-yellow-50" : "bg-gray-50";
            const textColorClass = isAbnormal ? "text-red-600" : (current.type === 'fasting' ? "text-green-700" : current.type === 'postMeal' ? "text-yellow-700" : "text-gray-700");

            elements.push(
                <span key={`item-${i}`} className={clsx("px-1.5 py-0.5 rounded text-[10px] sm:text-xs w-fit mr-1 mb-1 flex items-center gap-1", bgColorClass, textColorClass)}>
                    <span className="opacity-75 text-[9px] sm:text-[10px]">{timeStr}</span>
                    <span className={clsx("font-bold whitespace-nowrap", isAbnormal && "font-black")}>{typeLabel}:{current.value}</span>
                </span>
            );

            processedIndices.add(i);

            if (current.type === 'fasting') {
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
                        <span key={`diff-${i}`} className="text-[10px] text-slate-400 mx-0.5 mb-1 flex items-center">
                            →{hours}h{mins}m→
                        </span>
                    );

                    const pairIsAbnormal = getGlucoseStatus(pair.value, pair.type, thresholds) !== 'normal';
                    const pairBgColor = "bg-yellow-50";
                    const pairTextColor = pairIsAbnormal ? "text-red-600" : "text-yellow-700";
                    const pairTimeStr = format(parseISO(pair.timestamp), 'HH:mm');

                    elements.push(
                        <span key={`item-${pairIndex}`} className={clsx("px-1.5 py-0.5 rounded text-[10px] sm:text-xs w-fit mr-1 mb-1 flex items-center gap-1", pairBgColor, pairTextColor)}>
                            <span className="opacity-75 text-[9px] sm:text-[10px]">{pairTimeStr}</span>
                            <span className={clsx("font-bold whitespace-nowrap", pairIsAbnormal && "font-black")}>飯後:{pair.value}</span>
                        </span>
                    );

                    processedIndices.add(pairIndex);
                }
            }
        }

        return <div className="flex flex-wrap items-center">{elements}</div>;
    };

    const ranges: { value: TimeRange; label: string }[] = [
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
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-teal-600" />
                    醫師檢視模式 (每日彙整)
                </h3>

                <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar">
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1 shrink-0">
                        {ranges.map(r => (
                            <button
                                key={r.value}
                                onClick={() => setTimeRange(r.value)}
                                className={clsx(
                                    "px-2 sm:px-3 py-1 text-xs rounded transition-colors whitespace-nowrap",
                                    timeRange === r.value ? "bg-teal-100 text-teal-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 shrink-0"
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
                            <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">日期</th>
                            <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">血壓 (最新)</th>
                            <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider w-[50%]">血糖監測 (時間軸)</th>
                            <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%] text-right">體重</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {groupedRecords.map(({ date, records: dayRecords }) => {
                            const { isAbnormal: weightAbnormal, diff: weightDiff } = getNextDayWeightDiff(date, dayRecords);

                            const latestWeight = dayRecords.filter(r => r.weight > 0).pop()?.weight;
                            const latestBPRecord = dayRecords.filter(r => r.systolic > 0).pop();

                            // Date Logic
                            const dateObj = parseISO(date);
                            const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                            // HR Logic
                            const hr = latestBPRecord?.heartRate;
                            const isHrAbnormal = hr && (hr > 90 || hr < 60);

                            return (
                                <tr key={date} className="hover:bg-gray-50 transition-colors">
                                    {/* Date */}
                                    <td className={clsx("px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium align-top",
                                        isWeekend ? "bg-orange-50 text-orange-800" : "text-gray-900"
                                    )}>
                                        <div>{format(dateObj, 'MM/dd')}</div>
                                        <div className={clsx("text-[10px]", isWeekend ? "text-orange-600/70" : "text-gray-400")}>
                                            {format(dateObj, 'eee', { locale: zhTW }).replace('週', '')}
                                        </div>
                                    </td>

                                    {/* BP */}
                                    <td className={clsx("px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 align-top",
                                        latestBPRecord && (latestBPRecord.systolic - latestBPRecord.diastolic > 60 || latestBPRecord.systolic - latestBPRecord.diastolic < 30) && "bg-red-50/50"
                                    )}>
                                        {latestBPRecord ? (
                                            <>
                                                <div className={clsx("font-semibold",
                                                    (latestBPRecord.systolic > thresholds.systolicHigh || latestBPRecord.diastolic > thresholds.diastolicHigh) ? "text-red-600 font-black" : "text-gray-800"
                                                )}>
                                                    {latestBPRecord.systolic}/{latestBPRecord.diastolic}
                                                </div>
                                                {hr ? (
                                                    <div className={clsx("text-[10px] sm:text-xs mt-0.5", isHrAbnormal ? "text-red-500 font-bold" : "text-gray-500")}>
                                                        HR: {hr}
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>

                                    {/* Glucose */}
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm align-top">
                                        {renderGlucoseDetailsForDay(dayRecords)}
                                    </td>

                                    {/* Weight */}
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm align-top text-right">
                                        {latestWeight ? (
                                            <>
                                                <span className={clsx("block",
                                                    (weightAbnormal || (thresholds.weightHigh > 0 && latestWeight > thresholds.weightHigh) || (thresholds.weightLow > 0 && latestWeight < thresholds.weightLow)) ? "text-red-600 font-bold" : "text-gray-700"
                                                )}>
                                                    {latestWeight}
                                                </span>
                                                {weightAbnormal && (
                                                    <div className="text-[10px] text-red-500 mt-0.5">
                                                        ⚠️+{weightDiff.toFixed(1)}
                                                    </div>
                                                )}
                                            </>
                                        ) : <span className="text-gray-300">-</span>}
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
