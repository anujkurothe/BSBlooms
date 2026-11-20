import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_STORE_SETTINGS, SEED_FLOWERS } from '../data/seedFlowers.ts';
import type { Flower, FlowerDraft, StoreSettings } from '../types/flower.ts';
import { sortFlowersByOrder } from '../utils/catalog.ts';

const ADMIN_TOKEN_STORAGE_KEY = 'bsb_admin_token';

export interface CatalogState {
  flowers: Flower[];
  loading: boolean;
  storeSettings: StoreSettings;
  authReady: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  saveFlower: (draft: FlowerDraft) => Promise<void>;
  removeFlower: (flowerId: string) => Promise<void>;
  reorderFlower: (index: number, direction: 'up' | 'down') => Promise<void>;
  saveStoreSettings: (settings: StoreSettings) => Promise<void>;
  seedInitialCatalog: () => Promise<void>;
}

function getStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function buildAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function useFlowerCatalog(): CatalogState {
  const [flowers, setFlowers] = useState<Flower[]>(SEED_FLOWERS);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [realtimeMode, setRealtimeMode] = useState<'none' | 'sse' | 'poll'>('none');

  const applyCatalog = useCallback(
    (payload: { flowers?: Flower[]; storeSettings?: StoreSettings }) => {
      if (Array.isArray(payload.flowers)) {
        setFlowers(sortFlowersByOrder(payload.flowers));
      }
      if (payload.storeSettings) {
        setStoreSettings(payload.storeSettings);
      }
    },
    [],
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const response = await fetch('/api/catalog', { credentials: 'include' });
      if (!response.ok) return;
      const data = await parseJsonSafe<{
        flowers?: Flower[];
        storeSettings?: StoreSettings;
        realtime?: 'sse' | 'poll';
      }>(response);
      if (!data) return;
      applyCatalog(data);
      setRealtimeMode(data.realtime === 'sse' ? 'sse' : 'poll');
    } catch {
      // Keep seed catalog if API is temporarily unavailable
    } finally {
      setLoading(false);
    }
  }, [applyCatalog]);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/session', {
        credentials: 'include',
        headers: buildAuthHeaders(),
      });
      if (response.ok) {
        const data = await parseJsonSafe<{ authenticated?: boolean }>(response);
        const authed = Boolean(data?.authenticated);
        setIsAuthenticated(authed);
        if (!authed) {
          setStoredToken(null);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
    void checkSession();

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('bsblooms-catalog');
      channel.onmessage = () => {
        void refreshCatalog();
      };
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshCatalog();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      channel?.close();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkSession, refreshCatalog]);

  useEffect(() => {
    if (realtimeMode !== 'sse') return;
    const eventSource = new EventSource('/api/events');
    const onCatalogEvent = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as {
          flowers?: Flower[];
          storeSettings?: StoreSettings;
        };
        applyCatalog(parsed);
      } catch {
        // Ignore malformed SSE message
      }
    };
    eventSource.addEventListener('catalog', onCatalogEvent as EventListener);
    return () => {
      eventSource.removeEventListener('catalog', onCatalogEvent as EventListener);
      eventSource.close();
    };
  }, [applyCatalog, realtimeMode]);

  const notifyBroadcast = () => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('bsblooms-catalog');
      channel.postMessage({ type: 'updated' });
      channel.close();
    }
  };

  async function login(password: string): Promise<void> {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await parseJsonSafe<{ authenticated?: boolean; token?: string; error?: string }>(
      response,
    );
    if (!data) {
      throw new Error(
        'Admin API is unavailable on this host. Ensure PHP (api.php + .htaccess) or Node.js is enabled on Hostinger.',
      );
    }
    if (!response.ok || !data.authenticated) {
      throw new Error(data.error || 'Incorrect password.');
    }
    if (data.token) {
      setStoredToken(data.token);
    }
    setIsAuthenticated(true);
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders(),
      });
    } finally {
      setStoredToken(null);
      setIsAuthenticated(false);
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await parseJsonSafe<{ ok?: boolean; token?: string; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || 'Unable to change password.');
    }
    if (data.token) {
      setStoredToken(data.token);
    }
  }

  async function saveFlower(draft: FlowerDraft): Promise<void> {
    const response = await fetch('/api/admin/flowers', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify(draft),
    });
    const data = await parseJsonSafe<{
      catalog?: { flowers?: Flower[]; storeSettings?: StoreSettings };
      error?: string;
    }>(response);
    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
        setIsAuthenticated(false);
      }
      throw new Error(data?.error || 'Failed to save flower variety.');
    }
    if (data?.catalog) {
      applyCatalog(data.catalog);
    } else {
      await refreshCatalog();
    }
    notifyBroadcast();
  }

  async function removeFlower(flowerId: string): Promise<void> {
    const response = await fetch(`/api/admin/flowers/${encodeURIComponent(flowerId)}/delete`, {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(),
    });
    const data = await parseJsonSafe<{
      catalog?: { flowers?: Flower[]; storeSettings?: StoreSettings };
      error?: string;
    }>(response);
    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
        setIsAuthenticated(false);
      }
      throw new Error(data?.error || 'Failed to remove flower variety.');
    }
    if (data?.catalog) {
      applyCatalog(data.catalog);
    } else {
      await refreshCatalog();
    }
    notifyBroadcast();
  }

  async function reorderFlower(index: number, direction: 'up' | 'down'): Promise<void> {
    const response = await fetch('/api/admin/flowers/reorder', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify({ index, direction }),
    });
    const data = await parseJsonSafe<{
      catalog?: { flowers?: Flower[]; storeSettings?: StoreSettings };
      error?: string;
    }>(response);
    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
        setIsAuthenticated(false);
      }
      throw new Error(data?.error || 'Failed to reorder varieties.');
    }
    if (data?.catalog) {
      applyCatalog(data.catalog);
    } else {
      await refreshCatalog();
    }
    notifyBroadcast();
  }

  async function saveStoreSettings(nextSettings: StoreSettings): Promise<void> {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify(nextSettings),
    });
    const data = await parseJsonSafe<{
      catalog?: { flowers?: Flower[]; storeSettings?: StoreSettings };
      error?: string;
    }>(response);
    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
        setIsAuthenticated(false);
      }
      throw new Error(data?.error || 'Failed to update contact settings.');
    }
    if (data?.catalog) {
      applyCatalog(data.catalog);
    } else {
      await refreshCatalog();
    }
    notifyBroadcast();
  }

  async function seedInitialCatalog(): Promise<void> {
    const response = await fetch('/api/admin/flowers/seed', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(),
    });
    const data = await parseJsonSafe<{
      catalog?: { flowers?: Flower[]; storeSettings?: StoreSettings };
      error?: string;
    }>(response);
    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
        setIsAuthenticated(false);
      }
      throw new Error(data?.error || 'Failed to restore curated varieties.');
    }
    if (data?.catalog) {
      applyCatalog(data.catalog);
    } else {
      await refreshCatalog();
    }
    notifyBroadcast();
  }

  return {
    flowers,
    loading,
    storeSettings,
    authReady,
    isAuthenticated,
    login,
    logout,
    changePassword,
    saveFlower,
    removeFlower,
    reorderFlower,
    saveStoreSettings,
    seedInitialCatalog,
  };
}
