import React, { useState } from 'react';
import { HealthRecord, TimeRange, UserSettings } from '../types';
import { ChartSection } from './ChartSection';
import { isWeightAbnormal } from '../utils/helpers';
import { DEFAULT_THRESHOLDS } from '../types';
import { AlertCircle, Plus } from 'lucide-react';

interface DashboardProps {
    records: HealthRecord[];
    userSettings: UserSettings | null;
    onAddRecord: () => void;
    onEditRecord: (record: HealthRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    records,
    userSettings,
    onAddRecord,
    onEditRecord
}) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    // Check for alerts
    const thresholds = userSettings?.thresholds || DEFAULT_THRESHOLDS;
    const latestRecord = records[records.length - 1];
    const hasWeightAlert = latestRecord && (
        isWeightAbnormal(latestRecord, records, thresholds) ||
        (thresholds.weightHigh > 0 && latestRecord.weight > thresholds.weightHigh) ||
        (thresholds.weightLow > 0 && latestRecord.weight < thresholds.weightLow && latestRecord.weight > 0)
    );

    const ranges: { value: TimeRange; label: string }[] = [
        { value: 'week', label: '一週' },
        { value: '2week', label: '雙週' },
        { value: 'month', label: '一個月' },
        { value: 'quarter', label: '一季' },
        { value: 'halfYear', label: '半年' },
        { value: 'year', label: '一年' },
        { value: 'all', label: '全部' },
    ];

    return (
        <div className="space-y-6">
            {/* Alert Section */}
            {hasWeightAlert && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                <span className="font-bold">注意：</span> 最近 24 小時內體重變化超過 2 公斤，或超出設定範圍，請多加留意身體狀況。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                    {ranges.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all ${timeRange === range.value
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onAddRecord}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform hover:scale-105 transition-all"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    新增紀錄
                </button>
            </div>

            {/* Charts */}
            <ChartSection records={records} timeRange={timeRange} onDataClick={onEditRecord} />
        </div>
    );
};
