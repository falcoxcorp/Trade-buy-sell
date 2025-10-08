import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ParticleBackground } from './components/ParticleBackground';
import { AIAssistant } from './components/AIAssistant';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ParticleBackground />
      <div className="min-h-screen bg-transparent p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <Sidebar />
          <Dashboard />
        </div>
      </div>
      <AIAssistant />
    </QueryClientProvider>
  );
}

export default App;