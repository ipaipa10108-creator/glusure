import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { PhysicianView } from './components/PhysicianView';
import { RecordList } from './components/RecordList';
import { RecordForm } from './components/RecordForm';
import { HealthRecord, UserSettings } from './types';
import { getRecords, saveRecord, updateRecord, deleteRecord } from './utils/api';
import { Activity, Edit3, Stethoscope } from 'lucide-react';

type ViewMode = 'dashboard' | 'list' | 'physician';

function App() {
    const [user, setUser] = useState<UserSettings | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

    // Load Records
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getRecords();
        setRecords(data);
    };

    const handleLogin = (settings: UserSettings) => {
        setUser(settings);
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('glusure_user');
    };

    const handleSubmitRecord = async (record: HealthRecord) => {
        if (record.id) {
            await updateRecord(record);
        } else {
            await saveRecord(record);
        }
        await loadData();
        setEditingRecord(null);
    };

    const handleEditRecord = (record: HealthRecord) => {
        setEditingRecord(record);
        setIsFormOpen(true);
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm('確定要刪除這筆紀錄嗎？')) {
            await deleteRecord(id);
            await loadData();
        }
    };

    if (!user) {
        return <LoginForm onLogin={handleLogin} />;
    }

    return (
        <Layout userName={user.name} onLogout={handleLogout}>
            {/* View Switcher */}
            <div className="flex justify-center mb-6 space-x-4">
                <button
                    onClick={() => setViewMode('dashboard')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Activity className="w-4 h-4 mr-2" />
                    健康儀表板
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Edit3 className="w-4 h-4 mr-2" />
                    編輯紀錄
                </button>
                <button
                    onClick={() => setViewMode('physician')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'physician' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Stethoscope className="w-4 h-4 mr-2" />
                    醫師模式
                </button>
            </div>

            {/* Main Content */}
            <div className="animate-fade-in">
                {viewMode === 'dashboard' && (
                    <Dashboard
                        records={records}
                        onAddRecord={() => {
                            setEditingRecord(null);
                            setIsFormOpen(true);
                        }}
                        onEditRecord={handleEditRecord}
                    />
                )}

                {viewMode === 'list' && (
                    <RecordList
                        records={records}
                        onEdit={handleEditRecord}
                        onDelete={handleDeleteRecord}
                    />
                )}

                {viewMode === 'physician' && (
                    <PhysicianView records={records} />
                )}
            </div>

            {/* Record Form Modal */}
            <RecordForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingRecord(null);
                }}
                onSubmit={handleSubmitRecord}
                initialData={editingRecord}
                userName={user.name}
            />
        </Layout>
    );
}

export default App;
