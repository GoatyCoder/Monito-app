import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './services/store';
import { CalibrationColumn } from './components/CalibrationColumn';
import { ProcessColumn } from './components/ProcessColumn';
import { PalletColumn } from './components/PalletColumn';
import { RegistryManager } from './components/RegistryManager';
import { LayoutGrid, Database } from 'lucide-react';
import { ToastContainer } from './components/ui/Toast';

const DashboardContent = () => {
  const { toasts, removeToast } = useData();
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'REGISTRIES'>('DASHBOARD');

  // Navigation State
  const [selectedCalibrationId, setSelectedCalibrationId] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  // Mobile View State ('CALIBRATIONS' | 'PROCESSES' | 'PALLETS')
  const [mobileView, setMobileView] = useState<'CALIBRATIONS' | 'PROCESSES' | 'PALLETS'>('CALIBRATIONS');
  
  // Responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers
  const handleSelectCalibration = (id: string) => {
    setSelectedCalibrationId(id);
    setSelectedProcessId(null); // Reset process when calibration changes
    if (isMobile) setMobileView('PROCESSES');
  };

  const handleSelectProcess = (id: string) => {
    setSelectedProcessId(id);
    if (isMobile) setMobileView('PALLETS');
  };

  const handleBackToCalibrations = () => {
    setMobileView('CALIBRATIONS');
  };

  const handleBackToProcesses = () => {
    setMobileView('PROCESSES');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white p-3 flex items-center justify-between shadow-md z-20 shrink-0">
        <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Monito <span className="text-slate-400 font-normal text-sm hidden sm:inline">| Production Control</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
            <nav className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setCurrentView('DASHBOARD')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 ${currentView === 'DASHBOARD' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-3.5 h-3.5" /> Produzione
                </button>
                <button 
                    onClick={() => setCurrentView('REGISTRIES')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 ${currentView === 'REGISTRIES' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Database className="w-3.5 h-3.5" /> Anagrafiche
                </button>
            </nav>
            <div className="text-xs text-slate-400 hidden md:block">
                {new Date().toLocaleDateString()}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'REGISTRIES' ? (
            <RegistryManager />
        ) : (
            // DASHBOARD VIEW
            isMobile ? (
            // Mobile Stacked View
            <div className="h-full w-full">
                {mobileView === 'CALIBRATIONS' && (
                <CalibrationColumn 
                    selectedId={selectedCalibrationId} 
                    onSelect={handleSelectCalibration} 
                />
                )}
                {mobileView === 'PROCESSES' && (
                <ProcessColumn 
                    calibrationId={selectedCalibrationId}
                    selectedId={selectedProcessId}
                    onSelect={handleSelectProcess}
                    onBack={handleBackToCalibrations}
                />
                )}
                {mobileView === 'PALLETS' && (
                <PalletColumn 
                    processId={selectedProcessId}
                    onBack={handleBackToProcesses}
                />
                )}
            </div>
            ) : (
            // Desktop 3-Column Grid
            <div className="grid grid-cols-12 h-full divide-x divide-slate-200">
                {/* Col 1: Calibrations */}
                <div className="col-span-3 h-full overflow-hidden">
                <CalibrationColumn 
                    selectedId={selectedCalibrationId} 
                    onSelect={handleSelectCalibration} 
                />
                </div>

                {/* Col 2: Processes */}
                <div className="col-span-4 h-full overflow-hidden bg-slate-50">
                <ProcessColumn 
                    calibrationId={selectedCalibrationId}
                    selectedId={selectedProcessId}
                    onSelect={handleSelectProcess}
                />
                </div>

                {/* Col 3: Pallets */}
                <div className="col-span-5 h-full overflow-hidden bg-slate-100 border-l border-slate-200 shadow-inner">
                <PalletColumn 
                    processId={selectedProcessId} 
                />
                </div>
            </div>
            )
        )}
      </main>
      
      {/* Global Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

const App = () => {
  return (
    <DataProvider>
      <DashboardContent />
    </DataProvider>
  );
};

export default App;
