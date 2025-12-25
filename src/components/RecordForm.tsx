import React, { useState, useEffect } from 'react';
import { HealthRecord, GlucoseReading } from '../types';
import { X, Save, Trash2, List } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getGlucoseStatus, getGlucoseColor } from '../utils/helpers';
import clsx from 'clsx';

interface RecordFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (record: HealthRecord) => void;
    initialData?: HealthRecord | null;
    userName: string;
}

export const RecordForm: React.FC<RecordFormProps> = ({ isOpen, onClose, onSubmit, initialData, userName }) => {
    const [formData, setFormData] = useState<Partial<HealthRecord>>({
        weight: 0,
        systolic: 0,
        diastolic: 0,
        heartRate: 0,
        glucoseFasting: undefined,
        glucosePostMeal: undefined,
        glucoseRandom: undefined,
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });

    const [details, setDetails] = useState<GlucoseReading[]>([]);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                timestamp: initialData.timestamp.slice(0, 16)
            });
            if (initialData.details) {
                try {
                    setDetails(JSON.parse(initialData.details));
                } catch (e) { setDetails([]); }
            } else {
                setDetails([]);
            }
        } else {
            setFormData({
                weight: 0,
                systolic: 0,
                diastolic: 0,
                heartRate: 0,
                glucoseFasting: undefined,
                glucosePostMeal: undefined,
                glucoseRandom: undefined,
                timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            });
            setDetails([]);
        }
        setShowDetails(false);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Re-serialize details
        const finalizedDetails = JSON.stringify(details);

        onSubmit({
            id: initialData?.id,
            name: userName,
            timestamp: new Date(formData.timestamp!).toISOString(),
            weight: Number(formData.weight),
            systolic: Number(formData.systolic),
            diastolic: Number(formData.diastolic),
            heartRate: Number(formData.heartRate),
            // If user modified inputs, these take precedence. 
            // Merging logic in 'api.ts' handles adding NEW items to details,
            // but if we are editing an EXISTING combined record, we might want to update details?
            // For now, this form mainly adds new data or simple edits. 
            // If deleting from details list, that is handled by passing 'details' string below.
            glucoseFasting: formData.glucoseFasting ? Number(formData.glucoseFasting) : undefined,
            glucosePostMeal: formData.glucosePostMeal ? Number(formData.glucosePostMeal) : undefined,
            glucoseRandom: formData.glucoseRandom ? Number(formData.glucoseRandom) : undefined,
            details: finalizedDetails // Send back modified details if any
        });
        onClose();
    };

    const handleRemoveDetail = (index: number) => {
        if (confirm('確定要移除此筆詳細紀錄嗎？')) {
            const newDetails = [...details];
            newDetails.splice(index, 1);
            setDetails(newDetails);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {initialData ? '編輯紀錄' : '新增紀錄'}
                            </h3>
                            <div className="flex items-center space-x-2">
                                {initialData && (
                                    <button
                                        onClick={() => setShowDetails(!showDetails)}
                                        className="p-1 text-teal-600 hover:text-teal-800 text-sm flex items-center"
                                        title="顯示詳細合併項目"
                                    >
                                        <List className="h-5 w-5 mr-1" />
                                        {showDetails ? '隱藏詳細' : '顯示詳細'}
                                    </button>
                                )}
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {showDetails && details.length > 0 && (
                            <div className="mb-6 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">已合併的血糖項目</h4>
                                <ul className="space-y-2">
                                    {details.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm">
                                            <div>
                                                <span className={clsx("font-medium mr-2", getGlucoseColor(getGlucoseStatus(item.value, item.type)))}>
                                                    {item.type === 'fasting' ? '空腹' : item.type === 'postMeal' ? '飯後' : '臨時'}: {item.value}
                                                </span>
                                                <span className="text-gray-400 text-xs">
                                                    {format(parseISO(item.timestamp), 'HH:mm')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDetail(idx)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">日期時間</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                    value={formData.timestamp}
                                    onChange={e => setFormData({ ...formData, timestamp: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">體重 (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        value={formData.weight || ''}
                                        onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">收縮壓</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        value={formData.systolic || ''}
                                        onChange={e => setFormData({ ...formData, systolic: Number(e.target.value) })}
                                        placeholder="mmHg"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">舒張壓</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        value={formData.diastolic || ''}
                                        onChange={e => setFormData({ ...formData, diastolic: Number(e.target.value) })}
                                        placeholder="mmHg"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">心跳</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        value={formData.heartRate || ''}
                                        onChange={e => setFormData({ ...formData, heartRate: Number(e.target.value) })}
                                        placeholder="bpm"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">血糖 (mg/dL)</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4 items-center">
                                        <label className="text-sm text-gray-500">空腹血糖</label>
                                        <input
                                            type="number"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                            value={formData.glucoseFasting || ''}
                                            onChange={e => setFormData({ ...formData, glucoseFasting: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 items-center">
                                        <label className="text-sm text-gray-500">飯後血糖</label>
                                        <input
                                            type="number"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                            value={formData.glucosePostMeal || ''}
                                            onChange={e => setFormData({ ...formData, glucosePostMeal: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 items-center">
                                        <label className="text-sm text-gray-500">臨時測量</label>
                                        <input
                                            type="number"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                            value={formData.glucoseRandom || ''}
                                            onChange={e => setFormData({ ...formData, glucoseRandom: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="submit"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:col-start-2 sm:text-sm"
                                >
                                    <Save className="h-5 w-5 mr-2" />
                                    儲存
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                    onClick={onClose}
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
