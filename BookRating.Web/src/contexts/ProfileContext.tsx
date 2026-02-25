import { createContext, useContext, useEffect, useState } from "react";
import type { ProfileDto } from "../types";

interface ProfileContextValue {
  profile: ProfileDto | null;
  setProfile: (p: ProfileDto | null) => void;
  logout: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  setProfile: () => {},
  logout: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileDto | null>(() => {
    try {
      const stored = localStorage.getItem("activeProfile");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setProfile = (p: ProfileDto | null) => {
    setProfileState(p);
    if (p) localStorage.setItem("activeProfile", JSON.stringify(p));
    else localStorage.removeItem("activeProfile");
  };

  const logout = () => setProfile(null);

  // Re-sync from API on mount to catch name/avatar changes
  useEffect(() => {
    const stored = localStorage.getItem("activeProfile");
    if (!stored) return;
    try {
      const parsed: ProfileDto = JSON.parse(stored);
      fetch(`/api/profiles/${parsed.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((fresh) => {
          if (fresh) setProfile(fresh);
        })
        .catch(() => {});
    } catch {
      localStorage.removeItem("activeProfile");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProfileContext.Provider value={{ profile, setProfile, logout }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
