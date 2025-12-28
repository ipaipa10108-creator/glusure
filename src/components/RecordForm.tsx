import React, { useState, useEffect } from 'react';
import { HealthRecord, GlucoseReading, NoteContent, WeatherType, DietType, ExerciseType, ExerciseRecord } from '../types';
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
        weather: undefined,
        noteContent: undefined
    });

    const [details, setDetails] = useState<GlucoseReading[]>([]);
    const [showDetails, setShowDetails] = useState(false);

    // Note Modal State
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteDraft, setNoteDraft] = useState<NoteContent>({});
    const [exerciseDuration, setExerciseDuration] = useState<string>('');
    const [customExercise, setCustomExercise] = useState<string>('');

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
            if (initialData.noteContent) {
                try {
                    setNoteDraft(JSON.parse(initialData.noteContent));
                } catch (e) { setNoteDraft({}); }
            } else {
                setNoteDraft({});
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
                weather: undefined,
                noteContent: undefined
            });
            setDetails([]);
            setNoteDraft({});
        }
        setShowDetails(false);
        setShowNoteModal(false);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Re-serialize details
        const finalizedDetails = JSON.stringify(details);

        // Serialize Note Content if not empty
        const finalizedNoteContent = (noteDraft.diets?.length || noteDraft.exercises?.length || noteDraft.otherNote)
            ? JSON.stringify(noteDraft)
            : undefined;

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
            details: finalizedDetails, // Send back modified details if any,
            weather: formData.weather,
            noteContent: finalizedNoteContent
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

    // Note Helpers
    const toggleDiet = (type: DietType) => {
        setNoteDraft(prev => {
            const current = prev.diets || [];
            if (current.includes(type)) {
                return { ...prev, diets: current.filter(t => t !== type) };
            } else {
                return { ...prev, diets: [...current, type] };
            }
        });
    };

    const addExercise = (type: ExerciseType) => {
        const duration = parseInt(exerciseDuration) || 0;
        const record: ExerciseRecord = { type, durationMinutes: duration };
        if (type === 'other' && customExercise) {
            record.customName = customExercise;
        }
        setNoteDraft(prev => ({
            ...prev,
            exercises: [...(prev.exercises || []), record]
        }));
        // Reset inputs
        setExerciseDuration('');
        setCustomExercise('');
    };

    const removeExercise = (index: number) => {
        setNoteDraft(prev => {
            const current = prev.exercises || [];
            const next = [...current];
            next.splice(index, 1);
            return { ...prev, exercises: next };
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    {/* Note Modal Overlay */}
                    {showNoteModal && (
                        <div className="absolute inset-0 z-10 bg-white flex flex-col">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">詳細備註與紀錄</h3>
                                <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Diet Section */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                                        <span className="w-1 h-4 bg-orange-400 rounded mr-2"></span>飲食紀錄
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'bigMeal', label: '大餐', icon: '🥩' },
                                            { id: 'normal', label: '一般', icon: '🍱' },
                                            { id: 'dieting', label: '節食', icon: '🥗' },
                                            { id: 'fasting', label: '斷食', icon: '💧' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => toggleDiet(opt.id as DietType)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1",
                                                    noteDraft.diets?.includes(opt.id as DietType)
                                                        ? "bg-orange-100 border-orange-300 text-orange-700"
                                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                )}
                                            >
                                                <span>{opt.icon}</span>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Exercise Section */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                                        <span className="w-1 h-4 bg-teal-400 rounded mr-2"></span>運動紀錄
                                    </h4>

                                    {/* Existing Exercises List */}
                                    {noteDraft.exercises && noteDraft.exercises.length > 0 && (
                                        <div className="mb-3 space-y-2">
                                            {noteDraft.exercises.map((ex, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded text-sm">
                                                    <span className="flex items-center gap-1">
                                                        {ex.type === 'walking' && '🚶 健走'}
                                                        {ex.type === 'cycling' && '🚴 腳踏車'}
                                                        {ex.type === 'resistance' && '🏋️ 阻力訓練'}
                                                        {ex.type === 'other' && `📝 ${ex.customName || '其他'}`}
                                                        {ex.durationMinutes ? ` (${ex.durationMinutes} 分鐘)` : ''}
                                                    </span>
                                                    <button onClick={() => removeExercise(idx)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add New Exercise */}
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
                                        <input
                                            type="number"
                                            placeholder="運動時間 (分)"
                                            className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded focus:ring-teal-500 focus:border-teal-500"
                                            value={exerciseDuration}
                                            onChange={e => setExerciseDuration(e.target.value)}
                                        />

                                        <div className="flex flex-wrap gap-2 items-center">
                                            {[
                                                { id: 'walking', label: '健走', icon: '🚶' },
                                                { id: 'cycling', label: '腳踏車', icon: '🚴' },
                                                { id: 'resistance', label: '阻力訓練', icon: '🏋️' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => addExercise(opt.id as ExerciseType)}
                                                    className="px-3 py-1.5 rounded-md text-sm bg-white border border-gray-200 hover:border-teal-300 hover:text-teal-600 flex items-center gap-1 transition-colors whitespace-nowrap"
                                                >
                                                    <span>{opt.icon}</span>
                                                    {opt.label}
                                                </button>
                                            ))}

                                            {/* Custom Exercise Input replacing "+ Other" */}
                                            <div className="flex-1 min-w-[120px] flex gap-1">
                                                <input
                                                    type="text"
                                                    placeholder="自訂項目名稱"
                                                    className="flex-1 min-w-0 text-sm px-2 py-1.5 border border-gray-200 rounded focus:ring-teal-500 focus:border-teal-500"
                                                    value={customExercise}
                                                    onChange={e => setCustomExercise(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addExercise('other');
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => addExercise('other')}
                                                    disabled={!customExercise}
                                                    className={clsx(
                                                        "px-3 py-1.5 rounded-md text-sm border transition-colors whitespace-nowrap",
                                                        customExercise
                                                            ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                                                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                                    )}
                                                >
                                                    新增
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Other Notes */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                                        <span className="w-1 h-4 bg-blue-400 rounded mr-2"></span>其他隨手記
                                    </h4>
                                    <textarea
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                                        placeholder="還有什麼想紀錄的嗎？"
                                        value={noteDraft.otherNote || ''}
                                        onChange={e => setNoteDraft(prev => ({ ...prev, otherNote: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-200">
                                <button
                                    onClick={() => setShowNoteModal(false)}
                                    className="w-full py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
                                >
                                    完成備註
                                </button>
                            </div>
                        </div>
                    )}

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

                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 sm:col-span-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">體重 (kg)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                            value={formData.weight || ''}
                                            onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNoteModal(true)}
                                            className={clsx(
                                                "shrink-0 px-3 py-2 rounded-md border text-sm transition-colors flex items-center gap-1",
                                                (noteDraft.diets?.length || noteDraft.exercises?.length || noteDraft.otherNote)
                                                    ? "bg-teal-50 border-teal-200 text-teal-700"
                                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                            )}
                                        >
                                            備註
                                            {(noteDraft.diets?.length || noteDraft.exercises?.length || noteDraft.otherNote) ? <div className="w-2 h-2 rounded-full bg-red-400 ml-1" /> : null}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {[
                                            { id: 'hot', icon: '☀️', label: '熱' },
                                            { id: 'moderate', icon: '🌤️', label: '適' },
                                            { id: 'cold', icon: '❄️', label: '冷' },
                                        ].map(w => (
                                            <button
                                                key={w.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, weather: w.id as WeatherType })}
                                                className={clsx(
                                                    "flex-1 py-1 text-xs rounded border transition-all",
                                                    formData.weather === w.id
                                                        ? "bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-sm"
                                                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                                )}
                                            >
                                                {w.icon} {w.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-6 flex flex-col justify-end pb-1">
                                    {/* Weather Indicator for BP/Glucose Reference */}
                                    {formData.weather && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded self-start sm:self-end w-full sm:w-auto">
                                            <span>當日天氣註記:</span>
                                            <span className="font-medium text-gray-800">
                                                {formData.weather === 'hot' && '☀️ 熱'}
                                                {formData.weather === 'moderate' && '🌤️ 適中'}
                                                {formData.weather === 'cold' && '❄️ 冷'}
                                            </span>
                                        </div>
                                    )}
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
