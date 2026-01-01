import React, { useState } from 'react';
import { HealthRecord, TimeRange, UserSettings } from '../types';
import { ChartSection } from './ChartSection';
import { isWeightAbnormal } from '../utils/helpers';
import { DEFAULT_THRESHOLDS } from '../types';
import { AlertCircle } from 'lucide-react';
import { ExerciseModal } from './ExerciseModal';

interface DashboardProps {
    records: HealthRecord[];
    userSettings: UserSettings | null;
    onAddRecord: () => void;
    onEditRecord: (record: HealthRecord) => void;
    onSaveRecord: (record: HealthRecord) => Promise<void>;
    onUpdateSettings: (settings: Partial<UserSettings>) => Promise<void>;
    onSaveRecord,
    onUpdateSettings
}) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

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

    const [showThresholds, setShowThresholds] = useState<boolean>(false);
    const [showAuxiliaryLines, setShowAuxiliaryLines] = useState<boolean>(false);

    // Initialize from user settings
    React.useEffect(() => {
        if (userSettings) {
            if (userSettings.showAlertLines !== undefined) setShowThresholds(userSettings.showAlertLines);
            if (userSettings.showAuxiliaryLines !== undefined) setShowAuxiliaryLines(userSettings.showAuxiliaryLines);
        }
    }, [userSettings]);

    return (
        <div className="space-y-6 relative">
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
            <div className="flex flex-col xl:flex-row items-center gap-4">
                {/* Left Side: Time Range & Reference Date */}
                <div className="flex-1 w-full xl:w-auto flex justify-center xl:justify-start">
                    <div className="flex flex-wrap sm:flex-nowrap bg-gray-100 p-1 rounded-lg items-center justify-center gap-y-2">
                        <div className="flex overflow-x-auto max-w-full no-scrollbar items-center">
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
                        <div className="hidden sm:block h-4 w-px bg-gray-300 mx-2" />
                        <div className="flex items-center px-2 w-full sm:w-auto justify-center">
                            <span className="text-sm text-gray-500 mr-2 whitespace-nowrap">基準日:</span>
                            <input
                                type="date"
                                value={referenceDate ? referenceDate.toISOString().split('T')[0] : ''}
                                onChange={handleDateChange}
                                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 w-auto max-w-[130px]"
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
                </div>

                {/* Center: Add Record Buttons */}
                <div className="flex-shrink-0 mx-auto flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                    <button
                        onClick={onAddRecord}
                        className="inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-lg text-base font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform hover:scale-105 transition-all whitespace-nowrap"
                    >
                        ➕ 紀錄
                    </button>

                    <button
                        onClick={() => setIsExerciseModalOpen(true)}
                        className="inline-flex items-center px-5 py-3 border border-transparent rounded-full shadow-lg text-base font-medium text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105 transition-all whitespace-nowrap"
                        title="新增運動紀錄"
                    >
                        💪 運動
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                        <button
                            onClick={() => {
                                const newValue = !showThresholds;
                                setShowThresholds(newValue);
                                onUpdateSettings({ showAlertLines: newValue });
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${showThresholds ? 'bg-white border-teal-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-75'}`}
                            title="顯示異常警示線"
                        >
                            <div className={`w-2.5 h-2.5 rounded-full transition-colors shadow-sm ${showThresholds ? 'bg-green-500 shadow-green-400/50' : 'bg-gray-300'}`} />
                            <span className="text-sm text-gray-600 font-medium">警示線</span>
                        </button>
                        <button
                            onClick={() => {
                                const newValue = !showAuxiliaryLines;
                                setShowAuxiliaryLines(newValue);
                                onUpdateSettings({ showAuxiliaryLines: newValue });
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${showAuxiliaryLines ? 'bg-white border-teal-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-75'}`}
                            title="顯示輔助對照線"
                        >
                            <div className={`w-2.5 h-2.5 rounded-full transition-colors shadow-sm ${showAuxiliaryLines ? 'bg-green-500 shadow-green-400/50' : 'bg-gray-300'}`} />
                            <span className="text-sm text-gray-600 font-medium">輔助線</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Spacer to balance layout if needed, or just empty */}
                <div className="flex-1 hidden xl:block"></div>
            </div>

            {/* Charts */}
            <ChartSection
                records={records}
                timeRange={timeRange}
                onDataClick={onEditRecord}
                referenceDate={referenceDate || undefined}
                thresholds={userSettings?.thresholds}
                showThresholds={showThresholds}
                showAuxiliaryLines={showAuxiliaryLines}
                auxiliaryLineMode={userSettings?.auxiliaryLineMode}
            />

            {/* Exercise Modal */}
            <ExerciseModal
                isOpen={isExerciseModalOpen}
                onClose={() => setIsExerciseModalOpen(false)}
                onSave={onSaveRecord}
                userName={userSettings?.name || ''}
            />
        </div>
    );
};
