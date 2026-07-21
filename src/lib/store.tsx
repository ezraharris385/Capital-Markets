import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { AppData } from "../data/types";
import { makeSeedData } from "../data/seed";

const DATA_KEY = "meridian.data.v3";
const SETTINGS_KEY = "meridian.settings.v1";

export interface Settings {
  theme: "dark" | "light";
  anthropicKey: string;
  model: string;
  fredKey: string;
  brokerName: string;
  firmName: string;
}

const defaultSettings: Settings = {
  theme: "dark",
  anthropicKey: "",
  model: "claude-sonnet-5",
  fredKey: "",
  brokerName: "You",
  firmName: "CBRE",
};

interface Toast { id: number; msg: string; tone: "ok" | "warn" | "err" }

interface StoreCtx {
  data: AppData;
  setData: (updater: (d: AppData) => AppData) => void;
  replaceData: (d: AppData) => void;
  resetData: () => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  toasts: Toast[];
  toast: (msg: string, tone?: Toast["tone"]) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.deals && parsed.markets) {
        // Defensive: ensure collections added in later versions always exist.
        if (!parsed.projects) parsed.projects = [];
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return makeSeedData();
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<AppData>(loadData);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch { /* quota */ }
  }, [data]);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* */ }
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings]);

  const setData = useCallback((updater: (d: AppData) => AppData) => {
    setDataState((d) => updater(d));
  }, []);

  const replaceData = useCallback((d: AppData) => setDataState(d), []);
  const resetData = useCallback(() => setDataState(makeSeedData()), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const toast = useCallback((msg: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const value = useMemo(
    () => ({ data, setData, replaceData, resetData, settings, updateSettings, toasts, toast }),
    [data, setData, replaceData, resetData, settings, updateSettings, toasts, toast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
