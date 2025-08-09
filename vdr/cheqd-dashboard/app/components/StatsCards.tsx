import React from "react";
import { NetworkStats, ActiveValidator } from "../../lib/types/dashboard";

interface StatsCardsProps {
  stats?: NetworkStats;
  activeValidators?: ActiveValidator[];
  onCardClick?: (cardType: string) => void;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, activeValidators, onCardClick }) => {
  const [showValidatorModal, setShowValidatorModal] = React.useState(false);
  
  if (!stats) return null;

  // Only show modal if we have real validator data
  const validators = activeValidators || [];

  const cards = [
    {
      title: "Active Validators",
      value: stats.activeValidators.toString(),
      subtitle: ``,
      bgColor: "backdrop-blur-xl border",
      bgStyle: {backgroundColor: 'rgba(35, 45, 65, 0.4)', borderColor: 'rgba(34, 197, 94, 1)', backgroundImage: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(35, 45, 65, 0.4))'},
      textColor: "text-white",
      accentColor: "text-white",
      clickable: true,
      isModal: true
    },
    {
      title: "Total DIDs",
      value: stats.totalDids.toLocaleString(),
      bgColor: "backdrop-blur-xl border",
      bgStyle: {backgroundColor: 'rgba(35, 45, 65, 0.4)', borderColor: 'rgba(34, 211, 238, 1)', backgroundImage: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(35, 45, 65, 0.4))'},
      textColor: "text-white",
      accentColor: "text-white",
      clickable: true,
      pageTarget: "DID"
    },
    {
      title: "Total Schemas",
      value: stats.totalSchemas.toLocaleString(),
      bgColor: "backdrop-blur-xl border",
      bgStyle: {backgroundColor: 'rgba(35, 45, 65, 0.4)', borderColor: 'rgba(251, 146, 60, 1)', backgroundImage: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(35, 45, 65, 0.4))'},
      textColor: "text-white",
      accentColor: "text-white",
      clickable: true,
      pageTarget: "Schema+Definition"
    },
    {
      title: "Total Definitions",
      value: stats.totalDefinitions.toLocaleString(),
      bgColor: "backdrop-blur-xl border",
      bgStyle: {backgroundColor: 'rgba(35, 45, 65, 0.4)', borderColor: 'rgba(245, 203, 203, 1)', backgroundImage: 'linear-gradient(135deg, rgba(245, 203, 203, 0.15), rgba(35, 45, 65, 0.4))'},
      textColor: "text-white",
      accentColor: "text-white",
      clickable: true,
      pageTarget: "Schema+Definition"
    },
  ];

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`${card.bgColor} rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden ${card.clickable ? 'cursor-pointer' : ''}`}
          style={{
            ...card.bgStyle,
            boxShadow: `0 0 15px ${card.bgStyle.borderColor.replace('1)', '0.4)')}, 0 0 30px ${card.bgStyle.borderColor.replace('1)', '0.2)')}, inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px ${card.bgStyle.borderColor}`
          }}
          onClick={() => {
            if (card.clickable) {
              if (card.isModal) {
                setShowValidatorModal(true);
              } else {
                onCardClick?.(card.pageTarget!);
              }
            }
          }}
        >
          {/* Background Animation with Enhanced Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-30"></div>
          
          {/* Action Icon */}
          <div className="absolute top-3 right-3 z-20">
            {card.isModal ? (
              <svg className="w-4 h-4 opacity-60" style={{color: card.bgStyle.borderColor}} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 opacity-60" style={{color: card.bgStyle.borderColor}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            )}
          </div>
          
          {/* Content */}
          <div className={`${card.textColor} relative z-10`}>
            <p className="text-xs font-semibold opacity-90 mb-1 tracking-wide uppercase">{card.title}</p>
            <h3 className={`text-2xl font-bold mb-1 leading-tight ${card.accentColor}`}>{card.value}</h3>
            {card.subtitle && (
              <p className="text-xs opacity-80">{card.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Validator Modal */}
    {showValidatorModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowValidatorModal(false)}>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-2xl w-full mx-4" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'}} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Active Validators</h2>
            <button 
              onClick={() => setShowValidatorModal(false)}
              className="text-slate-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {validators.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>Loading validator data...</p>
              </div>
            ) : (
              validators.map((validator, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                <div className="grid gap-4 text-sm" style={{gridTemplateColumns: '2fr 1fr 1fr'}}>
                  <div>
                    <p className="text-slate-300 font-medium mb-1">{validator.name}</p>
                    <p className="text-cyan-400 font-mono text-xs">{validator.address}</p>
                  </div>
                  <div>
                    <p className="text-slate-300 mb-1 ml-7">Status</p>
                    <div className="flex items-center space-x-2 ml-7">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-medium">{validator.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-300 mb-1">Voting Power</p>
                    <p className="text-orange-400 font-semibold">{validator.votingPower}</p>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default StatsCards;
