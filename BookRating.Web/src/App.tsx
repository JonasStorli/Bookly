import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { ProfileProvider, useProfile } from "./contexts/ProfileContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ProfileModal from "./components/ProfileModal";
import SettingsModal from "./components/SettingsModal";
import SearchPage from "./pages/SearchPage";
import BookDetailPage from "./pages/BookDetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import RatedPage from "./pages/RatedPage";
import "./App.css";

function Header() {
  const { profile } = useProfile();
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="app-header">
        <NavLink to="/" className="app-logo">
          📚 BookRating
        </NavLink>
        <nav>
          <NavLink to="/">Search</NavLink>
          <NavLink to="/favorites">Favorites</NavLink>
          <NavLink to="/rated">Rated</NavLink>
        </nav>
        <div className="header-actions">
          <button
            className="icon-btn"
            title="Settings"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
          <button
            className="icon-btn profile-icon-btn"
            title="Profile"
            onClick={() => setShowProfile(true)}
          >
            {profile ? (
              <span
                className="header-avatar"
                style={{ background: profile.avatarColor }}
              >
                {profile.avatarEmoji}
              </span>
            ) : (
              "👤"
            )}
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/books/:workId" element={<BookDetailPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/rated" element={<RatedPage />} />
            </Routes>
          </main>
        </BrowserRouter>
      </ProfileProvider>
    </SettingsProvider>
  );
}
