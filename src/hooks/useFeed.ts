'use client';

import { useState, useEffect } from 'react';
import { FeedService } from '@/lib/feedService';
import { Feed, FeedFilters } from '@/types/feed';

export function useFeed(filters?: FeedFilters, limit: number = 20) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFeeds = async () => {
      try {
        setLoading(true);
        const data = await FeedService.getFeeds(filters, limit);
        setFeeds(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load feeds'));
      } finally {
        setLoading(false);
      }
    };

    loadFeeds();
  }, [filters, limit]);

  const addFeed = async (feed: Omit<Feed, 'timestamp'>) => {
    try {
      await FeedService.addFeed(feed);
      // Refresh feeds after adding new one
      const updatedFeeds = await FeedService.getFeeds(filters, limit);
      setFeeds(updatedFeeds);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add feed'));
    }
  };

  return {
    feeds,
    loading,
    error,
    addFeed,
  };
} 