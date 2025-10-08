import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useBotStore } from '../store/botStore';
import { Loader2 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Trade {
  timestamp: string;
  priceUsd: string;
  volume: string;
}

export const ActivityChart: React.FC = () => {
  const selectedToken = useBotStore(state => state.tradingStrategy.selectedToken);
  const customTokens = useBotStore(state => state.customTokens);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async () => {
    if (!selectedToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${selectedToken}`);
      const data = await response.json();

      if (!data.pairs || data.pairs.length === 0) {
        setTrades([]);
        return;
      }

      // Get the most active pair
      const pair = data.pairs[0];
      
      // Use empty array as fallback if trades is undefined or null
      const sortedTrades = (pair.trades || [])
        .sort((a: Trade, b: Trade) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .slice(-12); // Get last 12 trades

      setTrades(sortedTrades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch trading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [selectedToken]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Trading Activity - ${customTokens[selectedToken]?.name || 'Token'}`,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number) => `$${value.toFixed(8)}`
        }
      },
      x: {
        ticks: {
          callback: (value: number) => {
            const date = new Date(trades[value]?.timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      }
    },
  };

  const data = {
    labels: trades.map(trade => trade.timestamp),
    datasets: [
      {
        label: 'Price USD',
        data: trades.map(trade => parseFloat(trade.priceUsd)),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Volume',
        data: trades.map(trade => parseFloat(trade.volume)),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      }
    ],
  };

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Trading Activity</h3>
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Trading Activity</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No trading activity available
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Trading Activity</h3>
        <div className="h-[300px] flex items-center justify-center text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Trading Activity</h3>
      <div className="h-[300px]">
        <Line options={options} data={data} />
      </div>
    </div>
  );
};