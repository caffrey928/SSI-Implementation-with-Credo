/**
 * Shared utility functions for formatting data across the application
 */

/**
 * Get color classes for different content types
 */
export const getTypeColor = (contentType: 'DID' | 'Schema' | 'Definition') => {
  switch (contentType) {
    case 'DID':
      return 'bg-blue-500 text-white';
    case 'Schema':
      return 'bg-green-500 text-white';
    case 'Definition':
      return 'bg-purple-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

/**
 * Get background and border styles for different content types
 */
export const getTypeStyle = (contentType: 'DID' | 'Schema' | 'Definition') => {
  switch (contentType) {
    case 'DID':
      return {
        backgroundColor: 'rgba(34, 211, 238, 0.6)',
        borderColor: 'rgba(34, 211, 238, 1)',
      };
    case 'Schema':
      return {
        backgroundColor: 'rgba(251, 146, 60, 0.6)',
        borderColor: 'rgba(251, 146, 60, 1)',
      };
    case 'Definition':
      return {
        backgroundColor: 'rgba(245, 203, 203, 0.6)',
        borderColor: 'rgba(245, 203, 203, 1)',
      };
    default:
      return {
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgba(156, 163, 175, 1)',
      };
  }
};

/**
 * Format hash strings by truncating them
 */
export const formatHash = (hash: string, startLength: number = 6, endLength: number = 4): string => {
  if (hash.length <= startLength + endLength) return hash;
  return `${hash.substring(0, startLength)}...${hash.substring(hash.length - endLength)}`;
};

/**
 * Format DID strings by truncating them
 */
export const formatDid = (did: string, startLength: number = 20, endLength: number = 20): string => {
  if (did.length <= startLength + endLength) return did;
  return `${did.substring(0, startLength)}...${did.substring(did.length - endLength)}`;
};

/**
 * Format timestamp to relative time (e.g., "2s ago", "5m ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid time';

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Handle future timestamps
    if (diffSeconds < 0) return 'Just now';

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  } catch (error) {
    console.warn('Failed to format timestamp:', timestamp, error);
    return 'Unknown';
  }
};

