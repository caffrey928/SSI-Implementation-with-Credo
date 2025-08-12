// Shared CSS class constants for consistent styling
export const STYLES = {
  // Card containers
  CARD: 'bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20',
  CARD_SHADOW: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  
  // Buttons
  BUTTON_BASE: 'px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-md border text-white transition-all duration-300',
  BUTTON_PRIMARY: 'border-white/50 hover:bg-white/10',
  BUTTON_DISABLED: 'disabled:opacity-50 disabled:cursor-not-allowed',
  
  // Loading spinners
  SPINNER_SMALL: 'animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent',
  SPINNER_LARGE: 'animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-white/80 border-r-blue-400/60',
  
  // Status badges
  STATUS_SUCCESS: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30',
  STATUS_PENDING: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  
  // Table styles
  TABLE_HEADER: 'text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider',
  TABLE_ROW_HOVER: 'hover:bg-white/5 transition-colors',
  TABLE_BORDER: 'border-b border-white/10',
  TABLE_DIVIDER: 'divide-y divide-white/10',
} as const;