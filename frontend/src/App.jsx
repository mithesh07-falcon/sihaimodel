import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useEngineStore } from './store/useEngineStore';
import Sidebar   from './Components/layout/Sidebar';
import AppRouter from './router';

const Layout = () => {
  const connectWebSocket = useEngineStore(s => s.connectWebSocket);
  useEffect(() => { connectWebSocket(); }, [connectWebSocket]);

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: '#050B14' }}>
      {/* Floating sidebar rail */}
      <div className="p-2 h-full shrink-0 z-30">
        <Sidebar />
      </div>

      {/* Page content — each page manages its own background/padding */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">
          <AppRouter />
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Layout />
  </BrowserRouter>
);

export default App;