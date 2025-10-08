import React, { useState } from 'react';
import { useBotConfig, useBotExecution } from '../hooks/useBotData';
import { Play, Square, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export const BotControlsNew: React.FC = () => {
  const { config, updateConfig } = useBotConfig();
  const { executeBot, botStatus } = useBotExecution();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleBot = async () => {
    if (!config) return;

    try {
      await updateConfig.mutateAsync({ is_active: !config.is_active });
      setMessage({
        type: 'success',
        text: config.is_active ? 'Bot deactivated successfully' : 'Bot activated successfully',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to toggle bot',
      });
    }
  };

  const handleManualExecution = async () => {
    try {
      setMessage({ type: 'success', text: 'Executing bot manually...' });
      const result = await executeBot.mutateAsync();
      setMessage({
        type: 'success',
        text: `Bot executed successfully. Trades: ${result.tradesExecuted || 0}`,
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to execute bot',
      });
    }
  };

  if (!config) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
        <div className="flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Bot Controls</h3>

      {message && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/50'
              : 'bg-red-500/10 border-red-500/50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </div>
        </div>
      )}

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-300">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              config.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {config.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {config.is_active && (
          <div className="mt-3 text-sm text-gray-400">
            <p>
              The bot is running autonomously in the cloud and will execute trades based on your
              configuration.
            </p>
          </div>
        )}
      </div>

      {botStatus && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-gray-300 mb-2">Today's Activity</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Trades Today</p>
              <p className="text-lg font-bold text-white">{botStatus.todayTradesCount || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Daily Limit</p>
              <p className="text-lg font-bold text-white">{config.max_trades_per_day}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleToggleBot}
          disabled={updateConfig.isPending}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
            config.is_active
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {updateConfig.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : config.is_active ? (
            <>
              <Square className="w-5 h-5" />
              Deactivate Bot
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Activate Bot
            </>
          )}
        </button>
      </div>

      <button
        onClick={handleManualExecution}
        disabled={executeBot.isPending}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {executeBot.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Executing...
          </>
        ) : (
          'Execute Bot Now'
        )}
      </button>

      <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg">
        <p className="text-sm text-blue-400">
          💡 <strong>Note:</strong> When activated, the bot runs automatically every few minutes in
          the cloud. You don't need to keep this page open!
        </p>
      </div>
    </div>
  );
};
