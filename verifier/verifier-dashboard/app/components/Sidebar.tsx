import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { label: 'Verify Credentials', id: 'verify', icon: '🔍' }
  ];

  return (
    <div className="w-72 bg-white/8 backdrop-blur-xl shadow-2xl flex flex-col py-8 border-r border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
      {/* Header */}
      <div className="px-8 mb-12">
        <h1 className="text-2xl font-bold text-white mb-2">SSI Verifier</h1>
        <div className="w-12 h-1 rounded-full" style={{background: 'linear-gradient(90deg, rgba(158, 202, 214, 0.8), rgba(116, 141, 174, 0.8))'}}></div>
        <p className="text-slate-300 text-sm mt-2">Credential Verification Portal</p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-6">
        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full text-left px-6 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden flex items-center space-x-3 ${
                  currentPage === item.id
                    ? 'bg-white/20 backdrop-blur-md text-white font-semibold transform scale-[1.02]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm'
                }`}
                style={currentPage === item.id ? {boxShadow: '0 0 25px rgba(158, 202, 214, 0.4), 0 0 50px rgba(158, 202, 214, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'} : {}}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 transform transition-transform duration-300 ${
                  currentPage === item.id ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0'
                }`}></div>
                <span className="relative z-10 text-xl">{item.icon}</span>
                <span className="relative z-10 font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;