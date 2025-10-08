import React from 'react';
import { useActivityLogs } from '../hooks/useBotData';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export const ActivityLog: React.FC = () => {
  const { logs, isLoading } = useActivityLogs();

  if (isLoading) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Recent Activity</h3>
        <div className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Recent Activity</h3>
      <div className="max-h-[200px] overflow-y-auto space-y-2">
        {logs.length === 0 && (
          <div className="text-center text-gray-500 py-4">No activity yet</div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className={`p-3 rounded-lg ${
              log.level === 'error'
                ? 'bg-red-50 border-l-4 border-red-500'
                : log.level === 'warning'
                ? 'bg-yellow-50 border-l-4 border-yellow-500'
                : 'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium text-gray-900">{log.message}</span>
              <span className="text-xs text-gray-500">
                {format(new Date(log.created_at), 'HH:mm:ss')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};