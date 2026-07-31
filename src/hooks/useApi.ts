'use client';

import { useState, useEffect, useCallback } from 'react';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationInfo;
  error?: string;
}

interface UseApiListOptions {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string>;
}

export function useApiList<T>(endpoint: string, options: UseApiListOptions = {}) {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.search) params.set('search', options.search);
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
      }

      const queryStr = params.toString();
      const url = `${endpoint}${queryStr ? `?${queryStr}` : ''}`;
      const res = await fetch(url);
      const json: ApiResponse<T[]> = await res.json();

      if (json.success) {
        setData(json.data);
        if (json.pagination) setPagination(json.pagination);
      } else {
        setError(json.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [endpoint, options.page, options.limit, options.search, JSON.stringify(options.filters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, pagination, loading, error, refetch: fetchData };
}

export function useApiGet<T>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint);
      const json: ApiResponse<T> = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export async function apiPost<T>(endpoint: string, body: any): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function apiPut<T>(endpoint: string, body: any): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function apiDelete(endpoint: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(endpoint, { method: 'DELETE' });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}
