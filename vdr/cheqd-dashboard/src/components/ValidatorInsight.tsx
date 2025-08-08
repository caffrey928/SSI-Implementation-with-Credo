import React from 'react';
import { ValidatorInfo } from '../types/dashboard';

interface ValidatorInsightProps {
  validators?: ValidatorInfo[];
}

const ValidatorInsight: React.FC<ValidatorInsightProps> = ({ validators }) => {
  const defaultValidators: ValidatorInfo[] = [
    {
      moniker: "cheqd-validator-0",
      operatorAddress: "cheqd1validator0...",
      votingPower: 25,
      commission: 0.05,
      status: "bonded"
    },
    {
      moniker: "cheqd-validator-1",
      operatorAddress: "cheqd1validator1...",
      votingPower: 25,
      commission: 0.05,
      status: "bonded"
    },
    {
      moniker: "cheqd-validator-2",
      operatorAddress: "cheqd1validator2...",
      votingPower: 25,
      commission: 0.05,
      status: "bonded"
    },
    {
      moniker: "cheqd-validator-3",
      operatorAddress: "cheqd1validator3...",
      votingPower: 25,
      commission: 0.05,
      status: "bonded"
    }
  ];

  const data = validators || defaultValidators;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Validators</h2>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {data.map((validator, index) => (
          <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{validator.moniker}</h4>
                <p className="text-xs text-gray-500 font-mono">{validator.operatorAddress}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  validator.status === 'bonded' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {validator.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {validator.votingPower}% voting power
              </p>
              <p className="text-xs text-gray-500">
                {(validator.commission * 100).toFixed(1)}% commission
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidatorInsight;