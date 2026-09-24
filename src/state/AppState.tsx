import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Design, PhotoInput } from '../api';
import type { StyleId } from '../data/catalog';
import type { CartItem, NewCartItem } from '../lib/cart';

const KEYS = { deviceId: 'dyp.deviceId', cart: 'dyp.cart', orders: 'dyp.orderIds' };

type AppState = {
  ready: boolean;
  /** Random ID for this install; not linked to a name. See the privacy policy. */
  deviceId: string | null;
  photo: PhotoInput | null;
  styleId: StyleId;
  text: string;
  /** The design shown on the result, product and bundle screens. */
  activeDesign: Design | null;
  cart: CartItem[];
  orderIds: string[];
  setPhoto: (photo: PhotoInput | null) => void;
  setStyleId: (id: StyleId) => void;
  setText: (text: string) => void;
  setActiveDesign: (design: Design | null) => void;
  /** Uploads the chosen photo (once). Throws ApiError UPLOAD_FAILED. */
  uploadPhoto: () => Promise<void>;
  /** Uploads the photo if needed and starts a design. Throws ApiError. */
  startDesign: () => Promise<string>;
  addToCart: (item: NewCartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addOrder: (orderId: string) => void;
};

const Ctx = createContext<AppState | null>(null);

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [photo, setPhotoState] = useState<PhotoInput | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<StyleId>('stamp');
  const [text, setText] = useState('');
  const [activeDesign, setActiveDesign] = useState<Design | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderIds, setOrderIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      let id = await AsyncStorage.getItem(KEYS.deviceId).catch(() => null);
      if (!id) {
        id = Crypto.randomUUID();
        await AsyncStorage.setItem(KEYS.deviceId, id).catch(() => undefined);
      }
      setDeviceId(id);
      setCart(await loadJson<CartItem[]>(KEYS.cart, []));
      setOrderIds(await loadJson<string[]>(KEYS.orders, []));
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEYS.cart, JSON.stringify(cart)).catch(() => undefined);
  }, [cart, ready]);
  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEYS.orders, JSON.stringify(orderIds)).catch(() => undefined);
  }, [orderIds, ready]);

  const setPhoto = useCallback((p: PhotoInput | null) => {
    setPhotoState(p);
    setPhotoId(null);
  }, []);

  const ensureUploaded = useCallback(async () => {
    if (!deviceId || !photo) throw new Error('No photo');
    if (photoId) return photoId;
    const id = (await api.uploadPhoto(deviceId, photo)).photoId;
    setPhotoId(id);
    return id;
  }, [deviceId, photo, photoId]);

  const startDesign = useCallback(async () => {
    if (!deviceId) throw new Error('No device ID');
    const id = await ensureUploaded();
    const trimmed = text.trim();
    const { designId } = await api.createDesign(deviceId, { photoId: id, styleId, text: trimmed || undefined });
    return designId;
  }, [deviceId, ensureUploaded, styleId, text]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      deviceId,
      photo,
      styleId,
      text,
      activeDesign,
      cart,
      orderIds,
      setPhoto,
      setStyleId,
      setText,
      setActiveDesign,
      uploadPhoto: async () => {
        await ensureUploaded();
      },
      startDesign,
      addToCart: (item) => setCart((c) => [...c, { ...item, id: Crypto.randomUUID() } as CartItem]),
      updateQuantity: (id, quantity) =>
        setCart((c) => c.map((i) => (i.id === id && i.kind === 'single' ? { ...i, quantity: Math.max(1, Math.min(10, quantity)) } : i))),
      removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
      clearCart: () => setCart([]),
      addOrder: (orderId) => setOrderIds((o) => (o.includes(orderId) ? o : [orderId, ...o])),
    }),
    [ready, deviceId, photo, styleId, text, activeDesign, cart, orderIds, setPhoto, ensureUploaded, startDesign],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
