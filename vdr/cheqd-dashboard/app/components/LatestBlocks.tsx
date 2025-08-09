import React from "react";
import { BlockInfo } from "../../lib/types/dashboard";
import { formatRelativeTime } from "../../lib/utils/formatters";

interface LatestBlocksProps {
  recentBlocks?: BlockInfo[];
}

const LatestBlocks: React.FC<LatestBlocksProps> = React.memo(
  ({ recentBlocks }) => {

    // Only use real block data, no fallbacks
    const blocks = recentBlocks || [];


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
            Latest Blocks
          </h2>
        </div>

        {/* Table Header */}
        <div
          className="grid text-sm font-semibold text-slate-300 border-b border-white/20 pb-3 mb-4 px-6"
          style={{ gridTemplateColumns: "80px 140px 100px 50px 80px" }}
        >
          <div className="text-left">Height</div>
          <div className="text-left">Hash</div>
          <div className="text-center">Proposer</div>
          <div className="text-center">Txs</div>
          <div className="text-center">Time</div>
        </div>

        {/* Table Rows */}
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>Loading block data...</p>
            </div>
          ) : (
            blocks.map((block, index) => {
              const displayHash =
                block.hash.length > 16
                  ? `${block.hash.substring(0, 6)}...${block.hash.substring(
                      block.hash.length - 4
                    )}`
                  : block.hash;

              return (
                <div
                  key={index}
                  className="grid text-sm py-3 border-b border-white/10 last:border-b-0 items-center hover:bg-white/5 rounded-lg px-6 transition-all duration-200"
                  style={{
                    gridTemplateColumns: "80px 140px 100px 50px 80px",
                  }}
                >
                  <div className="text-left overflow-hidden">
                    <span className="text-cyan-400 font-mono font-bold text-sm">
                      {block.height.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-left font-mono text-slate-300 text-sm overflow-hidden">
                    {displayHash}
                  </div>
                  <div className="text-center overflow-hidden">
                    <div
                      className="px-2 py-1 rounded-lg font-semibold text-xs backdrop-blur-md border text-white inline-block shadow-md"
                      style={{
                        backgroundColor: "rgba(34, 197, 94, 0.6)",
                        borderColor: "rgba(34, 197, 94, 1)",
                        color: "white",
                      }}
                    >
                      {block.proposer}
                    </div>
                  </div>
                  <div className="text-center text-white font-medium text-sm">
                    {block.txCount}
                  </div>
                  <div className="text-center text-slate-400 text-xs font-medium overflow-hidden">
                    {formatRelativeTime(block.timestamp)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
);

export default LatestBlocks;
