export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString();
};

export const getTimeUntilExpiry = (expiresAt: Date | string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Expired';
  }
  
  const seconds = Math.floor(diff / 1000);
  return `${seconds}s remaining`;
};