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

    const [referenceDate, setReferenceDate] = useState<Date | null>(null);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setReferenceDate(new Date(e.target.value));
        } else {
            setReferenceDate(null);
        }
    };

    const resetDate = () => setReferenceDate(null);

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
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center space-y-4 xl:space-y-0 gap-4">
                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar items-center">
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
                    <div className="h-4 w-px bg-gray-300 mx-2" />
                     <div className="flex items-center px-2">
                        <span className="text-sm text-gray-500 mr-2 whitespace-nowrap">基準日:</span>
                        <input
                            type="date"
                            value={referenceDate ? referenceDate.toISOString().split('T')[0] : ''}
                            onChange={handleDateChange}
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500"
                        />
                        {referenceDate && (
                            <button
                                onClick={resetDate}
                                className="ml-2 text-xs text-teal-600 hover:text-teal-800 underline whitespace-nowrap"
                            >
                                回今天
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={onAddRecord}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    新增紀錄
                </button>
            </div>

            {/* Charts */}
            <ChartSection records={records} timeRange={timeRange} onDataClick={onEditRecord} referenceDate={referenceDate || undefined} />
        </div>
    );
};
