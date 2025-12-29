import React, { useState } from 'react';
import { ExerciseRecord, HealthRecord, NoteContent } from '../types';
import { X, Clock, Dumbbell, Bike, Footprints, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

interface ExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: HealthRecord) => Promise<void>;
    userName: string;
}

export const ExerciseModal: React.FC<ExerciseModalProps> = ({ isOpen, onClose, onSave, userName }) => {
    const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [duration, setDuration] = useState<number | ''>('');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [customName, setCustomName] = useState('');
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!selectedType && !note) {
            alert('請至少選擇一項運動或輸入備註');
            return;
        }

        if (selectedType && !duration) {
            alert('請輸入運動時間');
            return;
        }

        setIsSaving(true);

        const exercises: ExerciseRecord[] = [];
        if (selectedType) {
            exercises.push({
                type: selectedType as any,
                durationMinutes: Number(duration),
                customName: selectedType === 'other' ? customName : undefined
            });
        }

        const noteContent: NoteContent = {
            exercises: exercises.length > 0 ? exercises : undefined,
            otherNote: note || undefined
        };

        const newRecord: HealthRecord = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
            timestamp: new Date(date).toISOString(),
            name: userName,
            weight: 0,
            systolic: 0,
            diastolic: 0,
            noteContent: JSON.stringify(noteContent)
        };

        try {
            await onSave(newRecord);
            onClose();
            // Reset form
            setDate(new Date().toISOString().slice(0, 16));
            setDuration('');
            setSelectedType(null);
            setCustomName('');
            setNote('');
        } catch (error) {
            console.error('Save failed', error);
            alert('儲存失敗，請重試');
        } finally {
            setIsSaving(false);
        }
    };

    const exerciseOptions = [
        { id: 'walking', label: '健走', icon: <Footprints className="w-5 h-5 text-teal-600" /> },
        { id: 'cycling', label: '腳踏車', icon: <Bike className="w-5 h-5 text-blue-600" /> },
        { id: 'resistance', label: '阻力訓練', icon: <Dumbbell className="w-5 h-5 text-orange-600" /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-teal-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                        運動紀錄
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* Time Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            時間
                        </label>
                        <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-gray-700 bg-gray-50/50"
                        />
                    </div>

                    {/* Exercise Duration */}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">運動時間 (分)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            placeholder="例如: 30"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none placeholder:text-gray-300"
                        />
                    </div>

                    {/* Exercise Type Selection */}
                    <div className="grid grid-cols-3 gap-3">
                        {exerciseOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setSelectedType(selectedType === opt.id ? null : opt.id)}
                                className={clsx(
                                    "flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all text-sm font-medium",
                                    selectedType === opt.id
                                        ? "bg-teal-50 border-teal-500 text-teal-800 shadow-sm ring-1 ring-teal-500"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                )}
                            >
                                {opt.icon}
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Exercise Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="自訂項目名稱"
                            value={customName}
                            onChange={(e) => {
                                setCustomName(e.target.value);
                                if (e.target.value) setSelectedType('other');
                            }}
                            className={clsx(
                                "flex-1 px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all",
                                selectedType === 'other'
                                    ? "border-teal-500 ring-teal-100 bg-white"
                                    : "border-gray-200 focus:border-teal-500 focus:ring-teal-100 bg-gray-50/30"
                            )}
                        />
                        <button
                            onClick={() => setSelectedType('other')}
                            className={clsx(
                                "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                                selectedType === 'other'
                                    ? "bg-teal-600 border-teal-600 text-white"
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            新增
                        </button>
                    </div>

                    {/* Other Note */}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                        <label className="text-sm font-medium text-teal-800 flex items-center gap-1 border-l-4 border-blue-500 pl-2">
                            其他隨手記
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="還有什麼想紀錄的嗎？"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none resize-none placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <ClipboardList className="w-5 h-5" />
                                完成備註
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
