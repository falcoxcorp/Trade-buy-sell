import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ParticleBackground } from './components/ParticleBackground';
import { AIAssistant } from './components/AIAssistant';
import { Auth } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBotStore } from './store/botStore';
import { LogOut } from 'lucide-react';

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const { initializeStore, resetStore, initialized } = useBotStore();

  useEffect(() => {
    if (user && !initialized) {
      initializeStore(user.id);
    } else if (!user && initialized) {
      resetStore();
    }
  }, [user, initialized, initializeStore, resetStore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <ParticleBackground />
      <div className="min-h-screen bg-transparent p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            <Sidebar />
            <Dashboard />
          </div>
        </div>
      </div>
      <AIAssistant />
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;