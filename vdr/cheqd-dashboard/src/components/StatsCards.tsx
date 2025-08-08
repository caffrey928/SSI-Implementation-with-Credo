import React from 'react';
import { NetworkStats } from '../types/dashboard';

interface StatsCardsProps {
  stats?: NetworkStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Active Validators',
      value: stats.activeValidators
    },
    {
      title: 'Total DIDs',
      value: stats.totalDids
    },
    {
      title: 'Resources',
      value: stats.totalResources
    },
    {
      title: 'Transaction Volume',
      value: stats.transactionVolume
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              {card.value.toLocaleString()}
            </h3>
            <p className="text-sm text-gray-600">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;