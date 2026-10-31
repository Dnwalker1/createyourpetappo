import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Design, PhotoInput } from '../api';
import type { StyleId } from '../data/catalog';
import type { CartItem, NewCartItem } from '../lib/cart';

const KEYS = { deviceId: 'dyp.deviceId', cart: 'dyp.cart', photo: 'dyp.photo' };

// THE LAST PHOTO IS REMEMBERED FOR A DAY (31 Oct 2026).
//
// It used to live only in memory. A phone often closes an app sitting in the
// background, and making a design takes a minute, so by the time the customer
// came back to the result, the photo was gone and "Try another style" sent them
// to step one to pick it again. Now the photo (a file on this phone) and its
// upload ID are saved, and forgotten after 24 hours or when they choose a new
// photo. The website keeps the uploaded photo for a day too.
const PHOTO_KEEP_MS = 24 * 60 * 60 * 1000;
type SavedPhoto = { photo: PhotoInput; photoId: string | null; savedAt: number };

type AppState = {
  ready: boolean;
  /** Random ID for this install; not linked to a name. See the privacy policy. */
  deviceId: string | null;
  photo: PhotoInput | null;
  styleId: StyleId;
  text: string;
  /** Draw the people in the photo too. Needs peopleConsent. Resets with a new photo. */
  includePeople: boolean;
  /** "Everyone in this photo is 13 or older, fully clothed, and agreed to be in it…" */
  peopleConsent: boolean;
  /** The design shown on the result, product and bundle screens. */
  activeDesign: Design | null;
  cart: CartItem[];
  setPhoto: (photo: PhotoInput | null) => void;
  setStyleId: (id: StyleId) => void;
  /** The On the Job title picked on the style screen ('' when none). */
  job: string;
  setJob: (job: string) => void;
  setText: (text: string) => void;
  /** Turning it off also unticks the consent. */
  setIncludePeople: (on: boolean) => void;
  setPeopleConsent: (on: boolean) => void;
  setActiveDesign: (design: Design | null) => void;
  /** Uploads the chosen photo (once). Throws ApiError UPLOAD_FAILED. */
  uploadPhoto: () => Promise<void>;
  /** Uploads the photo if needed and starts a design. Throws ApiError. */
  startDesign: () => Promise<string>;
  addToCart: (item: NewCartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
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
  const [job, setJob] = useState('');
  const [text, setText] = useState('');
  const [includePeople, setIncludePeopleState] = useState(false);
  const [peopleConsent, setPeopleConsent] = useState(false);
  const [activeDesign, setActiveDesign] = useState<Design | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    (async () => {
      let id = await AsyncStorage.getItem(KEYS.deviceId).catch(() => null);
      if (!id) {
        id = Crypto.randomUUID();
        await AsyncStorage.setItem(KEYS.deviceId, id).catch(() => undefined);
      }
      setDeviceId(id);
      setCart(await loadJson<CartItem[]>(KEYS.cart, []));
      const saved = await loadJson<SavedPhoto | null>(KEYS.photo, null);
      if (saved?.photo?.uri && Date.now() - saved.savedAt < PHOTO_KEEP_MS) {
        setPhotoState(saved.photo);
        setPhotoId(saved.photoId);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEYS.cart, JSON.stringify(cart)).catch(() => undefined);
  }, [cart, ready]);

  useEffect(() => {
    if (!ready) return;
    if (!photo) {
      AsyncStorage.removeItem(KEYS.photo).catch(() => undefined);
      return;
    }
    const saved: SavedPhoto = { photo, photoId, savedAt: Date.now() };
    AsyncStorage.setItem(KEYS.photo, JSON.stringify(saved)).catch(() => undefined);
  }, [photo, photoId, ready]);

  const setPhoto = useCallback((p: PhotoInput | null) => {
    setPhotoState(p);
    setPhotoId(null);
    setIncludePeopleState(false);
    setPeopleConsent(false);
  }, []);

  const ensureUploaded = useCallback(async () => {
    if (!deviceId || !photo) throw new Error('No photo');
    if (photoId) return photoId;
    const id = (await api.uploadPhoto(deviceId, photo)).photoId;
    setPhotoId(id);
    return id;
  }, [deviceId, photo, photoId]);

  const setIncludePeople = useCallback((on: boolean) => {
    setIncludePeopleState(on);
    if (!on) setPeopleConsent(false);
  }, []);

  const startDesign = useCallback(async () => {
    if (!deviceId) throw new Error('No device ID');
    const id = await ensureUploaded();
    // On the Job sends the picked job title as its text; the other styles
    // send the typed name (only the stamp and poster have anywhere to put it).
    const trimmed = styleId === 'job' ? job : text.trim();
    const { designId } = await api.createDesign(deviceId, {
      photoId: id,
      styleId,
      text: trimmed || undefined,
      includePeople: includePeople && peopleConsent,
    });
    return designId;
  }, [deviceId, ensureUploaded, styleId, job, text, includePeople, peopleConsent]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      deviceId,
      photo,
      styleId,
      text,
      includePeople,
      peopleConsent,
      activeDesign,
      cart,
      setPhoto,
      setStyleId,
      job,
      setJob,
      setText,
      setIncludePeople,
      setPeopleConsent,
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
    }),
    [ready, deviceId, photo, styleId, job, text, includePeople, peopleConsent, activeDesign, cart, setPhoto, setIncludePeople, ensureUploaded, startDesign],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
