import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useEngineStore } from './store/useEngineStore';
import Sidebar              from './Components/layout/Sidebar';
import TopBar               from './Components/layout/TopBar';
import RunSimulationDrawer  from './Components/simulate/RunSimulationDrawer';
import AppRouter            from './router';

const Layout = () => {
  const connectWebSocket = useEngineStore(s => s.connectWebSocket);
  useEffect(() => { connectWebSocket(); }, [connectWebSocket]);

  return (
    <div className="flex h-screen bg-cream overflow-hidden font-sans">
      {/* Floating sidebar rail */}
      <div className="p-3 h-full shrink-0 z-30">
        <Sidebar />
      </div>

      {/* Main content column */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Persistent top bar */}
        <div className="px-6 pt-5 pb-3 shrink-0">
          <TopBar />
        </div>

        {/* Page content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <AppRouter />
        </div>
      </main>

      {/* Global slide-over drawer — renders above everything */}
      <RunSimulationDrawer />
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Layout />
  </BrowserRouter>
);

export default App;