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
    <div className="w-64 bg-white shadow-lg flex flex-col py-6">
      {/* Header */}
      <div className="px-6 mb-8">
        <h1 className="text-xl font-bold text-gray-900">Cheqd Network</h1>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onPageChange(item.label)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.label
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;