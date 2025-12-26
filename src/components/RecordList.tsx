import { useState, useMemo } from 'react';
import { HealthRecord, TimeRange } from '../types';
import { format, parseISO, subMonths, subYears, isAfter } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';

interface RecordListProps {
    records: HealthRecord[];
    onEdit: (record: HealthRecord) => void;
    onDelete: (id: string) => void;
}

export const RecordList: React.FC<RecordListProps> = ({ records, onEdit, onDelete }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    const filteredAndSortedRecords = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
            case 'month': startDate = subMonths(now, 1); break;
            case 'quarter': startDate = subMonths(now, 3); break;
            case 'halfYear': startDate = subMonths(now, 6); break;
            case 'year': startDate = subYears(now, 1); break;
            case 'all': default: startDate = new Date(0); break;
        }

        return [...records]
            .filter(r => isAfter(parseISO(r.timestamp), startDate))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [records, timeRange]);

    const ranges: { value: TimeRange; label: string }[] = [
        { value: 'month', label: '近一月' },
        { value: 'quarter', label: '一季' },
        { value: 'halfYear', label: '半年' },
        { value: 'year', label: '一年' },
        { value: 'all', label: '全部' },
    ];

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">紀錄管理</h3>
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
            </div>
            <ul className="divide-y divide-gray-200">
                {filteredAndSortedRecords.map((record) => (
                    <li key={record.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-teal-600 truncate">
                                    {format(parseISO(record.timestamp), 'yyyy/MM/dd HH:mm')}
                                </p>
                                <div className="mt-2 flex items-center text-sm text-gray-500 gap-4 flex-wrap">
                                    <span>體重: {record.weight}kg</span>
                                    <span>血壓: {record.systolic}/{record.diastolic}</span>
                                    {record.heartRate && <span>心跳: {record.heartRate}</span>}
                                    {(record.glucoseFasting || record.glucosePostMeal) && (
                                        <span>血糖: {record.glucoseFasting ? `空${record.glucoseFasting} ` : ''}{record.glucosePostMeal ? `飯${record.glucosePostMeal}` : ''}</span>
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
                ))}
            </ul>
        </div>
    );
};
