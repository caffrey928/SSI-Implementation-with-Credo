import React from "react";
import { RecentTransaction } from "../../lib/types/dashboard";
import { getTypeStyle, formatRelativeTime } from "../../lib/utils/formatters";

interface LatestTransactionsProps {
  transactions?: RecentTransaction[];
  onSeeMore?: () => void;
}

const LatestTransactions: React.FC<LatestTransactionsProps> = ({
  transactions,
  onSeeMore,
}) => {
  if (!transactions || transactions.length === 0) return null;





  const latestTxs = transactions.slice(0, 5);

  return (
    <div
      className="backdrop-blur-xl rounded-xl p-6 text-white border transition-all duration-300 h-[450px] overflow-hidden"
      style={{
        backgroundColor: "rgba(35, 45, 65, 0.4)",
        borderColor: "rgba(196, 181, 253, 1)",
        boxShadow:
          "0 0 25px rgba(196, 181, 253, 0.6), 0 0 50px rgba(196, 181, 253, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(196, 181, 253, 1)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Latest Transactions
        </h2>
        <button
          onClick={onSeeMore}
          className="text-cyan-400 hover:text-cyan-300 text-sm cursor-pointer font-semibold px-3 py-1 rounded-lg hover:bg-white/10 transition-all duration-200"
        >
          See More
        </button>
      </div>

      {/* Table Header */}
      <div
        className="grid text-sm font-semibold text-slate-300 border-b border-white/20 pb-3 mb-4 px-6"
        style={{ gridTemplateColumns: "80px 140px 100px 50px 80px" }}
      >
        <div className="text-left">Block</div>
        <div className="text-left">Hash</div>
        <div className="text-center">Type</div>
        <div className="text-center">Result</div>
        <div className="text-center">Time</div>
      </div>

      {/* Table Rows */}
      <div className="space-y-3">
        {latestTxs.map((tx) => (
          <div
            key={tx.hash}
            className="grid text-sm py-3 border-b border-white/10 last:border-b-0 items-center hover:bg-white/5 rounded-lg px-6 transition-all duration-200"
            style={{ gridTemplateColumns: "80px 140px 100px 50px 80px" }}
          >
            <div className="text-left overflow-hidden">
              <span className="text-cyan-400 font-mono font-bold text-sm">
                {tx.height.toLocaleString()}
              </span>
            </div>
            <div className="text-left font-mono text-slate-300 text-sm overflow-hidden">
              {tx.hash.substring(0, 6)}...
              {tx.hash.substring(tx.hash.length - 4)}
            </div>
            <div className="text-center overflow-hidden">
              <div
                className="px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-md border text-white inline-block shadow-md"
                style={getTypeStyle(tx.contentType)}
              >
                {tx.contentType}
              </div>
            </div>
            <div className="text-center overflow-hidden">
              {tx.status === "success" ? (
                <span className="text-green-400 text-sm font-bold">✓</span>
              ) : (
                <span className="text-red-400 text-sm font-bold">✗</span>
              )}
            </div>
            <div className="text-center text-slate-400 text-xs font-medium overflow-hidden">
              {formatRelativeTime(tx.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LatestTransactions;
