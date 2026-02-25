import { useSettings } from "../contexts/SettingsContext";
import type {
  BooksPerLoad,
  SortOrder,
  TextSize,
} from "../contexts/SettingsContext";

const ACCENT_COLORS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0891b2" },
  { label: "Slate", value: "#374151" },
];

const LANGUAGE_OPTIONS = [
  { label: "English", code: "eng" },
  { label: "Norwegian", code: "nor" },
  { label: "French", code: "fre" },
  { label: "German", code: "ger" },
  { label: "Spanish", code: "spa" },
  { label: "Italian", code: "ita" },
  { label: "Dutch", code: "dut" },
  { label: "Swedish", code: "swe" },
];

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const {
    darkMode,
    booksPerLoad,
    sortOrder,
    languages,
    showPublishYear,
    accentColor,
    textSize,
    toggleDarkMode,
    setBooksPerLoad,
    setSortOrder,
    toggleLanguage,
    clearLanguages,
    toggleShowPublishYear,
    setAccentColor,
    setTextSize,
  } = useSettings();

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <div className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>

          <div className="settings-row">
            <div>
              <div className="settings-label">Dark Mode</div>
              <div className="settings-hint">
                Switch between light and dark theme
              </div>
            </div>
            <button
              className={`toggle ${darkMode ? "on" : ""}`}
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-label">Text Size</div>
            <div className="segmented">
              {(
                [
                  { label: "S", value: "sm" },
                  { label: "M", value: "md" },
                  { label: "L", value: "lg" },
                  { label: "XL", value: "xl" },
                ] as { label: string; value: TextSize }[]
              ).map((s) => (
                <button
                  key={s.value}
                  className={`seg-btn ${textSize === s.value ? "active" : ""}`}
                  onClick={() => setTextSize(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row-col">
            <div className="settings-label">Accent Color</div>
            <div className="accent-swatches">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`accent-swatch ${accentColor === c.value ? "active" : ""}`}
                  style={{ background: c.value }}
                  onClick={() => setAccentColor(c.value)}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Library ──────────────────────────────────────────────────────── */}
        <div className="settings-section">
          <h3 className="settings-section-title">Library</h3>

          <div className="settings-row">
            <div>
              <div className="settings-label">Show Publish Year</div>
              <div className="settings-hint">
                Display the first publish year on book cards
              </div>
            </div>
            <button
              className={`toggle ${showPublishYear ? "on" : ""}`}
              onClick={toggleShowPublishYear}
              aria-label="Toggle publish year"
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <div className="settings-section">
          <h3 className="settings-section-title">Search</h3>

          <div className="settings-row">
            <div className="settings-label">Sort Results</div>
            <div className="segmented">
              {(
                [
                  { label: "Relevance", value: "relevance" },
                  { label: "Newest", value: "new" },
                  { label: "Oldest", value: "old" },
                ] as { label: string; value: SortOrder }[]
              ).map((s) => (
                <button
                  key={s.value}
                  className={`seg-btn ${sortOrder === s.value ? "active" : ""}`}
                  onClick={() => setSortOrder(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row-col">
            <div className="settings-row-col-header">
              <div className="settings-label">Language</div>
              {languages.length > 0 && (
                <button className="settings-clear-btn" onClick={clearLanguages}>
                  Clear
                </button>
              )}
            </div>
            <div className="settings-hint" style={{ marginBottom: "0.4rem" }}>
              Any language when none selected
            </div>
            <div className="lang-pills">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`lang-pill ${languages.includes(l.code) ? "active" : ""}`}
                  onClick={() => toggleLanguage(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-label">Books per load</div>
            <div className="segmented">
              {([10, 20, 40, 60] as BooksPerLoad[]).map((n) => (
                <button
                  key={n}
                  className={`seg-btn ${booksPerLoad === n ? "active" : ""}`}
                  onClick={() => setBooksPerLoad(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <div className="settings-section">
          <h3 className="settings-section-title">About</h3>
          <div className="settings-row">
            <div className="settings-label">Data source</div>
            <a
              href="https://openlibrary.org"
              target="_blank"
              rel="noopener noreferrer"
              className="settings-link"
            >
              Open Library (openlibrary.org)
            </a>
          </div>
          <div className="settings-row">
            <div className="settings-label">Storage</div>
            <div className="settings-hint">SQLite (local)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
