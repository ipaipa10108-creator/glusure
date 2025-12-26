import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { PhysicianView } from './components/PhysicianView';
import { SettingsView } from './components/SettingsView';
import { RecordList } from './components/RecordList';
import { RecordForm } from './components/RecordForm';
import { HealthRecord, UserSettings } from './types';
import { getRecords, saveRecord, updateRecord, deleteRecord } from './utils/api';
import { Activity, Edit3, Stethoscope } from 'lucide-react';

type ViewMode = 'dashboard' | 'list' | 'physician' | 'settings';

function App() {
    const [user, setUser] = useState<UserSettings | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

    // Load Records
    useEffect(() => {
        if (user) {
            loadData(user.name);
        }
    }, [user]);

    const loadData = async (currentUserName?: string) => {
        const targetUser = currentUserName || user?.name;
        if (!targetUser) return;

        let data = await getRecords();

        // Filter by user
        let userRecords = data.filter(r => r.name === targetUser);

        // Inject Dummy Data for TestUser123 if empty
        if (targetUser === 'TestUser123' && userRecords.length === 0) {
            console.log('Generating dummy data for TestUser123...');
            const dummyData = await import('./utils/dummyGenerator').then(m => m.generateDummyData(targetUser));
            userRecords = dummyData;
        }

        setRecords(userRecords);
    };

    const handleLogin = (settings: UserSettings) => {
        setUser(settings);
    };

    const handleLogout = () => {
        setUser(null);
        setRecords([]);
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
        <Layout userName={user.name} onLogout={handleLogout} onSettings={() => setViewMode('settings')}>
            {/* View Switcher */}
            <div className="flex justify-center mb-6 space-x-2 sm:space-x-4">
                <button
                    onClick={() => setViewMode('dashboard')}
                    className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Activity className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">健康</span>儀表板
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Edit3 className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">編輯</span>紀錄
                </button>
                <button
                    onClick={() => setViewMode('physician')}
                    className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'physician' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Stethoscope className="w-4 h-4 mr-1 sm:mr-2" />
                    醫師模式
                </button>
            </div>


            {/* Main Content */}
            <div className="animate-fade-in">
                {viewMode === 'dashboard' && (
                    <Dashboard
                        records={records}
                        userSettings={user}
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
                        thresholds={user.thresholds}
                    />
                )}

                {viewMode === 'physician' && (
                    <PhysicianView records={records} userSettings={user} />
                )}

                {viewMode === 'settings' && (
                    <SettingsView
                        user={user}
                        onBack={() => setViewMode('dashboard')}
                        onUpdate={(newSettings) => setUser(newSettings)}
                    />
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
