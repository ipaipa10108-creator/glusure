import { useState, useMemo } from 'react';
import { HealthRecord, TimeRange, DEFAULT_THRESHOLDS, HealthThresholds } from '../types';
import { format, parseISO, subMonths, subYears, isAfter } from 'date-fns';
import { Edit2, Trash2, Activity } from 'lucide-react';
import clsx from 'clsx';

interface RecordListProps {
    records: HealthRecord[];
    onEdit: (record: HealthRecord) => void;
    onDelete: (id: string) => void;
    thresholds?: HealthThresholds;
}

export const RecordList: React.FC<RecordListProps> = ({ records, onEdit, onDelete, thresholds = DEFAULT_THRESHOLDS }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [referenceDate, setReferenceDate] = useState<Date | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedNoteRecord, setSelectedNoteRecord] = useState<HealthRecord | null>(null);

    const filteredAndSortedRecords = useMemo(() => {
        let now: Date;
        if (referenceDate) {
            now = new Date(referenceDate);
            now.setHours(23, 59, 59, 999);
        } else {
            now = new Date();
        }

        let startDate: Date;

        switch (timeRange) {
            case 'month': startDate = subMonths(now, 1); break;
            case 'quarter': startDate = subMonths(now, 3); break;
            case 'halfYear': startDate = subMonths(now, 6); break;
            case 'year': startDate = subYears(now, 1); break;
            case 'all': default: startDate = new Date(0); break;
        }

        return [...records]
            .filter(r => {
                const recordDate = parseISO(r.timestamp);
                return isAfter(recordDate, startDate) && (referenceDate ? recordDate <= now : true);
            })
            .sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
            });
    }, [records, timeRange, referenceDate, sortOrder]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setReferenceDate(new Date(e.target.value));
        } else {
            setReferenceDate(null);
        }
    };

    const resetDate = () => setReferenceDate(null);

    const ranges: { value: TimeRange; label: string }[] = [
        { value: 'month', label: '近一月' },
        { value: 'quarter', label: '一季' },
        { value: 'halfYear', label: '半年' },
        { value: 'year', label: '一年' },
        { value: 'all', label: '全部' },
    ];

    const isBPAbnormal = (sys: number, dia: number) => sys > thresholds.systolicHigh || dia > thresholds.diastolicHigh;
    const isGlucoseAbnormal = (fasting?: number, postMeal?: number) =>
        (fasting && fasting > thresholds.fastingHigh) || (postMeal && postMeal > thresholds.postMealHigh);

    const renderNoteIcons = (record: HealthRecord) => {
        if (!record.noteContent) return null;
        let note: any = {};
        try {
            note = JSON.parse(record.noteContent);
        } catch { return null; }

        const diets = note.diets || [];
        const exercises = note.exercises || [];
        const hasOther = !!note.otherNote;

        if (diets.length === 0 && exercises.length === 0 && !hasOther) return null;

        const dietIcons: Record<string, string> = { bigMeal: '🥩', normal: '🍱', dieting: '🥗', fasting: '💧' };
        const exerciseIcons: Record<string, string> = { walking: '🚶', cycling: '🚴', resistance: '🏋️', other: '📝' };

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNoteRecord(record);
                }}
                className="ml-2 inline-flex items-center gap-0.5 p-0.5 hover:bg-gray-100 rounded transition-colors text-sm"
                title="查看備註詳情"
            >
                {diets.map((d: string) => <span key={d}>{dietIcons[d] || ''}</span>)}
                {exercises.map((e: any, idx: number) => <span key={idx}>{exerciseIcons[e.type] || '📝'}</span>)}
                {hasOther && !exercises.some((e: any) => e.type === 'other') && <span>📝</span>}
            </button>
        );
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-center gap-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 w-full xl:w-auto text-center xl:text-left">紀錄管理</h3>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center justify-center">
                    <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                        {ranges.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => setTimeRange(range.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${timeRange === range.value
                                    ? 'bg-white text-teal-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-2 bg-gray-50 rounded-lg border border-gray-200 py-1">
                            <span className="text-xs text-gray-500 mr-2 whitespace-nowrap">基準日:</span>
                            <input
                                type="date"
                                value={referenceDate ? referenceDate.toISOString().split('T')[0] : ''}
                                onChange={handleDateChange}
                                className="text-xs border-transparent bg-transparent focus:border-transparent focus:ring-0 p-0 text-gray-700 w-24"
                            />
                            {referenceDate && (
                                <button
                                    onClick={resetDate}
                                    className="ml-2 text-xs text-teal-600 hover:text-teal-800 underline whitespace-nowrap px-1"
                                >
                                    回今天
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="p-1.5 text-gray-500 hover:text-teal-600 bg-gray-50 hover:bg-teal-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1"
                            title={sortOrder === 'desc' ? "目前：新→舊" : "目前：舊→新"}
                        >
                            <span className="text-xs font-medium">{sortOrder === 'desc' ? '新→舊' : '舊→新'}</span>
                        </button>
                    </div>
                </div>
            </div>
            <ul className="divide-y divide-gray-200">
                {filteredAndSortedRecords.map((record) => {
                    const hasWeight = record.weight > 0;
                    const hasBP = record.systolic > 0 && record.diastolic > 0;
                    const hasHR = (record.heartRate ?? 0) > 0;
                    const hasGlucose = (record.glucoseFasting ?? 0) > 0 || (record.glucosePostMeal ?? 0) > 0;

                    return (
                        <li key={record.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-teal-600 truncate">
                                            {format(parseISO(record.timestamp), 'yyyy/MM/dd HH:mm')}
                                        </p>
                                        {renderNoteIcons(record)}
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 gap-4 flex-wrap">
                                        {hasWeight && <span>體重: {record.weight}kg</span>}
                                        {hasBP && (
                                            <span className={clsx(isBPAbnormal(record.systolic, record.diastolic) && "text-red-600 font-bold")}>
                                                血壓: {record.systolic}/{record.diastolic}
                                            </span>
                                        )}
                                        {hasHR && (
                                            <span className={clsx((record.heartRate! > 90 || record.heartRate! < 60) && "text-red-600 font-bold")}>
                                                心跳: {record.heartRate}
                                            </span>
                                        )}
                                        {hasGlucose && (
                                            <span className={clsx(isGlucoseAbnormal(record.glucoseFasting, record.glucosePostMeal) && "text-red-600 font-bold")}>
                                                血糖: {record.glucoseFasting ? `空${record.glucoseFasting} ` : ''}{record.glucosePostMeal ? `飯${record.glucosePostMeal}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onEdit(record)}
                                        className="p-2 text-gray-400 hover:text-teal-600 rounded-full hover:bg-teal-50 transition"
                                        title="編輯"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => record.id && onDelete(record.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition"
                                        title="刪除"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Note Detail Modal */}
            {selectedNoteRecord && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedNoteRecord(null)}></div>
                    <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
                            <h4 className="font-medium text-teal-800">
                                {format(parseISO(selectedNoteRecord.timestamp), 'yyyy/MM/dd HH:mm')} 備註
                            </h4>
                            <button onClick={() => setSelectedNoteRecord(null)} className="text-teal-600 hover:text-teal-800">
                                <Activity className="w-4 h-4 rotate-45" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {(() => {
                                let content: any = {};
                                try { content = JSON.parse(selectedNoteRecord.noteContent || '{}'); } catch (e) { return null; }
                                return (
                                    <>
                                        {/* Diet */}
                                        {content.diets && content.diets.length > 0 && (
                                            <div>
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">飲食內容</h5>
                                                <div className="flex flex-wrap gap-1">
                                                    {content.diets.map((d: string) => (
                                                        <span key={d} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                                                            {d === 'bigMeal' ? '🥩 大餐' : d === 'normal' ? '🍱 一般' : d === 'dieting' ? '🥗 節食' : '💧 斷食'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Exercise */}
                                        {content.exercises && content.exercises.length > 0 && (
                                            <div>
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">運動紀錄</h5>
                                                <ul className="space-y-1">
                                                    {content.exercises.map((e: any, idx: number) => (
                                                        <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0"></span>
                                                            {e.type === 'walking' && '🚶 健走'}
                                                            {e.type === 'cycling' && '🚴 腳踏車'}
                                                            {e.type === 'resistance' && '🏋️ 阻力訓練'}
                                                            {e.type === 'other' && `📝 ${e.customName || '其他'}`}
                                                            {e.durationMinutes && <span className="text-gray-400 text-xs">({e.durationMinutes} min)</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Other */}
                                        {content.otherNote && (
                                            <div>
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">其他備註</h5>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                                    {content.otherNote}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
