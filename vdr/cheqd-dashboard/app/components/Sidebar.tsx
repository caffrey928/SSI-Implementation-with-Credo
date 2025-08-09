import React from 'react';

interface NavItem {
  label: string;
}

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const navItems: NavItem[] = [
    { label: 'Dashboard' },
    { label: 'DID' },
    { label: 'Schema+Definition' },
    { label: 'Transaction' }
  ];

  return (
    <div className="w-72 bg-white/8 backdrop-blur-xl shadow-2xl flex flex-col py-8 border-r border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
      {/* Header */}
      <div className="px-8 mb-12">
        <h1 className="text-2xl font-bold text-white mb-2">Cheqd Network</h1>
        <div className="w-12 h-1 rounded-full" style={{background: 'linear-gradient(90deg, rgba(158, 202, 214, 0.8), rgba(116, 141, 174, 0.8))'}}></div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-6">
        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onPageChange(item.label)}
                className={`w-full text-left px-6 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  currentPage === item.label
                    ? 'bg-white/20 backdrop-blur-md text-white font-semibold transform scale-[1.02]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm'
                }`}
                style={currentPage === item.label ? {boxShadow: '0 0 25px rgba(158, 202, 214, 0.4), 0 0 50px rgba(158, 202, 214, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'} : {}}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 transform transition-transform duration-300 ${
                  currentPage === item.label ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0'
                }`}></div>
                <span className="relative z-10 font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-8 mt-8 pt-6 border-t border-white/10">
        <div className="text-slate-300 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Network Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;