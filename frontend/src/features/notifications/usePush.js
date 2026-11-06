import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function usePush() {
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupported()) { setState('unsupported'); return; }
    api('/push/public-key')
      .then((r) => {
        if (!r.enabled) { setState('disabled'); return; }
        navigator.serviceWorker.register('/sw.js')
          .then(async (reg) => {
            const sub = await reg.pushManager.getSubscription();
            if (sub) setState('subscribed');
            else if (Notification.permission === 'denied') setState('denied');
            else setState('ready');
          })
          .catch(() => setState('unsupported'));
      })
      .catch(() => setState('unsupported'));
  }, []);

  const subscribe = async () => {
    setError(null);
    try {
      const { key, enabled } = await api('/push/public-key');
      if (!enabled || !key) { setState('disabled'); return; }
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setState('subscribed');
    } catch (err) {
      setError(err.message);
    }
  };

  const unsubscribe = async () => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState('ready');
    } catch (err) {
      setError(err.message);
    }
  };

  return { state, error, subscribe, unsubscribe };
}