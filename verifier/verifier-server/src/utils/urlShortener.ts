import { CleanupManager } from './cleanupManager';

interface UrlMapping {
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

export class UrlShortener {
  private urlMappings = new Map<string, UrlMapping>();
  private cleanupManager: CleanupManager;

  constructor() {
    this.cleanupManager = new CleanupManager(
      () => this.cleanupExpiredUrls(),
      5000,
      'URL Shortener'
    );
    this.cleanupManager.start();
  }

  /**
   * Create a short URL for a long invitation URL
   * @param originalUrl The long invitation URL
   * @param baseUrl The base URL for the short link (e.g., 'http://localhost:4003')
   * @param expiryMinutes How long the short URL should be valid (default: 1 minutes)
   * @returns The shortened URL
   */
  shortenUrl(originalUrl: string, baseUrl: string, expiryMinutes: number = 1): string {
    // Generate a short, random ID
    const shortId = this.generateShortId();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
    
    this.urlMappings.set(shortId, {
      originalUrl,
      createdAt: now,
      expiresAt
    });
    
    
    return `${baseUrl}/verify/${shortId}`;
  }

  /**
   * Get the original URL from a short ID
   * @param shortId The short ID
   * @returns The original URL or null if not found/expired
   */
  getOriginalUrl(shortId: string): string | null {
    const mapping = this.urlMappings.get(shortId);
    
    if (!mapping) {
      return null;
    }
    
    // Check if expired
    if (new Date() > mapping.expiresAt) {
      this.urlMappings.delete(shortId);
      return null;
    }
    
    return mapping.originalUrl;
  }

  /**
   * Generate a random short ID
   */
  private generateShortId(): string {
    // Generate 6 character random string using base62 (alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // If this ID already exists, try again
    if (this.urlMappings.has(result)) {
      return this.generateShortId();
    }
    
    return result;
  }


  /**
   * Remove expired URL mappings
   */
  private cleanupExpiredUrls() {
    const now = new Date();
    const expiredIds: string[] = [];
    
    for (const [id, mapping] of this.urlMappings.entries()) {
      if (now > mapping.expiresAt) {
        expiredIds.push(id);
      }
    }
    
    expiredIds.forEach(id => {
      this.urlMappings.delete(id);
    });
    
  }

  /**
   * Get stats about current URL mappings
   */
  getStats() {
    return {
      totalMappings: this.urlMappings.size,
      activeMappings: Array.from(this.urlMappings.values()).filter(
        mapping => new Date() <= mapping.expiresAt
      ).length
    };
  }

  /**
   * Stop the cleanup timer
   */
  stop() {
    this.cleanupManager.stop();
  }
}