import React, { useState } from 'react';
import { useBotConfig } from '../hooks/useBotData';
import { Save, Loader2 } from 'lucide-react';

export const ConfigFormNew: React.FC = () => {
  const { config, updateConfig } = useBotConfig();
  const [localConfig, setLocalConfig] = useState(config);

  React.useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localConfig) return;

    try {
      await updateConfig.mutateAsync(localConfig);
      alert('Configuration saved successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  if (!localConfig) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Bot Configuration</h3>
        <div className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold text-white">Bot Configuration</h3>

      <div className="form-group">
        <label htmlFor="name" className="form-label">
          Configuration Name:
        </label>
        <input
          type="text"
          id="name"
          className="input"
          value={localConfig.name}
          onChange={(e) => setLocalConfig({ ...localConfig, name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="tradeAmount" className="form-label">
          Trade Amount (per transaction):
        </label>
        <input
          type="number"
          id="tradeAmount"
          className="input"
          min="0.0001"
          step="0.0001"
          value={localConfig.trade_amount}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, trade_amount: parseFloat(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="slippage" className="form-label">
          Slippage Tolerance (%):
        </label>
        <input
          type="number"
          id="slippage"
          className="input"
          min="0.1"
          max="100"
          step="0.1"
          value={localConfig.slippage_tolerance}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, slippage_tolerance: parseFloat(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="stopLoss" className="form-label">
          Stop Loss (%):
        </label>
        <input
          type="number"
          id="stopLoss"
          className="input"
          min="0"
          max="100"
          step="0.1"
          value={localConfig.stop_loss}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, stop_loss: parseFloat(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="takeProfit" className="form-label">
          Take Profit (%):
        </label>
        <input
          type="number"
          id="takeProfit"
          className="input"
          min="0"
          max="1000"
          step="0.1"
          value={localConfig.take_profit}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, take_profit: parseFloat(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="maxTrades" className="form-label">
          Max Trades Per Day:
        </label>
        <input
          type="number"
          id="maxTrades"
          className="input"
          min="1"
          max="1000"
          value={localConfig.max_trades_per_day}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, max_trades_per_day: parseInt(e.target.value) })
          }
        />
      </div>

      <button
        type="submit"
        disabled={updateConfig.isPending}
        className="btn btn-primary w-full flex items-center justify-center gap-2"
      >
        {updateConfig.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Configuration
          </>
        )}
      </button>
    </form>
  );
};
