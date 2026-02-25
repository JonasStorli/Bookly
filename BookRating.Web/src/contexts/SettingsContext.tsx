import { createContext, useContext, useEffect, useState } from "react";

export type BooksPerLoad = 10 | 20 | 40 | 60;
export type SortOrder = "relevance" | "new" | "old";
export type TextSize = "sm" | "md" | "lg" | "xl";

const TEXT_SIZE_MAP: Record<TextSize, string> = {
  sm: "87.5%",
  md: "100%",
  lg: "112.5%",
  xl: "125%",
};

interface Settings {
  darkMode: boolean;
  booksPerLoad: BooksPerLoad;
  sortOrder: SortOrder;
  languages: string[]; // [] = any language
  showPublishYear: boolean;
  accentColor: string;
  textSize: TextSize;
}

interface SettingsContextValue extends Settings {
  toggleDarkMode: () => void;
  setBooksPerLoad: (n: BooksPerLoad) => void;
  setSortOrder: (s: SortOrder) => void;
  toggleLanguage: (code: string) => void;
  clearLanguages: () => void;
  toggleShowPublishYear: () => void;
  setAccentColor: (c: string) => void;
  setTextSize: (s: TextSize) => void;
}

const defaults: Settings = {
  darkMode: false,
  booksPerLoad: 20,
  sortOrder: "relevance",
  languages: [],
  showPublishYear: true,
  accentColor: "#2563eb",
  textSize: "md",
};

const SettingsContext = createContext<SettingsContextValue>({
  ...defaults,
  toggleDarkMode: () => {},
  setBooksPerLoad: () => {},
  setSortOrder: () => {},
  toggleLanguage: () => {},
  clearLanguages: () => {},
  toggleShowPublishYear: () => {},
  setAccentColor: () => {},
  setTextSize: () => {},
});

function load(): Settings {
  try {
    const s = localStorage.getItem("settings");
    return s ? { ...defaults, ...JSON.parse(s) } : defaults;
  } catch {
    return defaults;
  }
}

function save(s: Settings) {
  localStorage.setItem("settings", JSON.stringify(s));
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SIZE_MAP[settings.textSize];
  }, [settings.textSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent",
      settings.accentColor,
    );
  }, [settings.accentColor]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        toggleDarkMode: () => update({ darkMode: !settings.darkMode }),
        setBooksPerLoad: (booksPerLoad) => update({ booksPerLoad }),
        setSortOrder: (sortOrder) => update({ sortOrder }),
        toggleLanguage: (code) =>
          update({
            languages: settings.languages.includes(code)
              ? settings.languages.filter((l) => l !== code)
              : [...settings.languages, code],
          }),
        clearLanguages: () => update({ languages: [] }),
        toggleShowPublishYear: () =>
          update({ showPublishYear: !settings.showPublishYear }),
        setAccentColor: (accentColor) => update({ accentColor }),
        setTextSize: (textSize) => update({ textSize }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
