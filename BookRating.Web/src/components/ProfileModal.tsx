import { useEffect, useRef, useState } from "react";
import {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  verifyPin,
} from "../api";
import { useProfile } from "../contexts/ProfileContext";
import type { ProfileDto } from "../types";

const AVATARS = [
  "📖",
  "🦁",
  "🐺",
  "🦊",
  "🐻",
  "🦋",
  "🌙",
  "⭐",
  "🎭",
  "🎨",
  "🎸",
  "🚀",
  "🌊",
  "🌺",
  "🦄",
  "🐉",
  "🧙",
  "🎯",
  "🏄",
  "🎃",
  "🦉",
  "🐬",
  "🌈",
  "🍀",
];
const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#374151",
  "#92400e",
  "#4f46e5",
];

type View = "list" | "create" | "edit" | "pin-entry";

interface Props {
  onClose: () => void;
}

const AvatarBubble = ({
  p,
  size = 48,
}: {
  p: { avatarEmoji: string; avatarColor: string };
  size?: number;
}) => (
  <div
    className="avatar-bubble"
    style={{
      background: p.avatarColor,
      width: size,
      height: size,
      fontSize: size * 0.45,
    }}
  >
    {p.avatarEmoji}
  </div>
);

// ── PIN dots display ──────────────────────────────────────────────────────────
const PinDots = ({ value }: { value: string }) => (
  <div className="pin-dots">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className={`pin-dot ${i < value.length ? "filled" : ""}`} />
    ))}
  </div>
);

export default function ProfileModal({ onClose }: Props) {
  const { profile, setProfile, logout } = useProfile();
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<ProfileDto | null>(null);
  const [pendingLogin, setPendingLogin] = useState<ProfileDto | null>(null);

  // create / edit form
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📖");
  const [color, setColor] = useState("#2563eb");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState(""); // for edit: new PIN field
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  // PIN entry
  const [pinEntry, setPinEntry] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Name input ref — focused via useEffect, not autoFocus, to avoid re-focus on every render
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch(() => {});
  }, []);

  // Focus pin input when entering PIN view
  useEffect(() => {
    if (view === "pin-entry") {
      setPinEntry("");
      setPinErr("");
      pinInputRef.current?.focus();
    }
  }, [view]);

  // Focus name input only when the view transitions to create/edit — not on every re-render
  useEffect(() => {
    if (view === "create" || view === "edit") {
      // rAF ensures the input is mounted before we try to focus
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [view]);

  // ── navigation helpers ────────────────────────────────────────────────────
  const openCreate = () => {
    setName("");
    setEmoji("📖");
    setColor("#2563eb");
    setPin("");
    setFormErr("");
    setView("create");
  };
  const openEdit = (p: ProfileDto) => {
    setEditing(p);
    setName(p.name);
    setEmoji(p.avatarEmoji);
    setColor(p.avatarColor);
    setPin("");
    setNewPin("");
    setFormErr("");
    setView("edit");
  };

  const handleSelectProfile = (p: ProfileDto) => {
    if (p.hasPin) {
      setPendingLogin(p);
      setPinEntry("");
      setPinErr("");
      setView("pin-entry");
    } else {
      setProfile(p);
      onClose();
    }
  };

  // ── PIN entry submit ──────────────────────────────────────────────────────
  const handlePinEntry = async (value: string) => {
    if (value.length < 4) return;
    if (!pendingLogin) return;
    setVerifying(true);
    const ok = await verifyPin(pendingLogin.id, value);
    setVerifying(false);
    if (ok) {
      setProfile(pendingLogin);
      onClose();
    } else {
      setPinErr("Wrong PIN. Try again.");
      setPinShake(true);
      setTimeout(() => {
        setPinShake(false);
        setPinEntry("");
      }, 600);
    }
  };

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPinEntry(v);
    setPinErr("");
    if (v.length === 4) handlePinEntry(v);
  };

  // ── create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!name.trim()) {
      setFormErr("Name is required");
      return;
    }
    if (pin.length !== 4) {
      setFormErr("PIN must be exactly 4 digits");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      const p = await createProfile(name.trim(), emoji, color, pin);
      setProfile(p);
      onClose();
    } catch {
      setFormErr("Could not create profile.");
    } finally {
      setSaving(false);
    }
  };

  // ── edit ──────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editing) return;
    if (!name.trim()) {
      setFormErr("Name is required");
      return;
    }
    if (newPin && newPin.length !== 4) {
      setFormErr("New PIN must be exactly 4 digits");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      const updated = await updateProfile(
        editing.id,
        name.trim(),
        emoji,
        color,
        newPin || undefined,
      );
      if (profile?.id === updated.id) setProfile(updated);
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setView("list");
    } catch {
      setFormErr("Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (p: ProfileDto) => {
    if (
      !confirm(
        `Delete profile "${p.name}"? All ratings and favorites will be lost.`,
      )
    )
      return;
    await deleteProfile(p.id);
    if (profile?.id === p.id) logout();
    setProfiles((prev) => prev.filter((x) => x.id !== p.id));
  };

  // ── form view (create + edit) ─────────────────────────────────────────────
  // Defined outside JSX return so it doesn't get a new component identity each render.
  const renderForm = (onSave: () => void, isEdit?: boolean) => (
    <div className="profile-form">
      <div className="form-preview">
        <AvatarBubble
          p={{ avatarEmoji: emoji, avatarColor: color }}
          size={72}
        />
        <span className="preview-name">{name || "Your Name"}</span>
      </div>

      <label className="form-label">Name</label>
      {/* No autoFocus — focus is handled via nameInputRef + useEffect */}
      <input
        ref={nameInputRef}
        className="form-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        maxLength={30}
      />

      <label className="form-label">Avatar</label>
      <div className="emoji-grid">
        {AVATARS.map((e) => (
          <button
            key={e}
            type="button"
            className={`emoji-btn ${emoji === e ? "active" : ""}`}
            onClick={() => setEmoji(e)}
          >
            {e}
          </button>
        ))}
      </div>

      <label className="form-label">Color</label>
      <div className="color-swatches">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-swatch ${color === c ? "active" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      {isEdit ? (
        <>
          <label className="form-label">
            New PIN{" "}
            <span className="form-hint">(leave blank to keep current)</span>
          </label>
          <input
            className="form-input pin-input"
            value={newPin}
            onChange={(e) =>
              setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="New 4-digit PIN"
            inputMode="numeric"
            maxLength={4}
          />
        </>
      ) : (
        <>
          <label className="form-label">
            PIN <span className="form-hint">(4 digits, required)</span>
          </label>
          <input
            className="form-input pin-input"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="4-digit PIN"
            inputMode="numeric"
            maxLength={4}
            type="password"
          />
        </>
      )}

      {formErr && <p className="form-error">{formErr}</p>}
      <div className="modal-actions">
        <button
          className="btn-secondary"
          onClick={() => setView("list")}
          disabled={saving}
        >
          Back
        </button>
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>
            {view === "list"
              ? "Profiles"
              : view === "create"
                ? "New Profile"
                : view === "edit"
                  ? "Edit Profile"
                  : `Enter PIN — ${pendingLogin?.name}`}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ── Profile list ──────────────────────────────────────────────── */}
        {view === "list" && (
          <>
            {profile && (
              <div className="active-profile-bar">
                <AvatarBubble p={profile} size={40} />
                <div>
                  <div className="active-name">{profile.name}</div>
                  <div className="active-label">Active profile</div>
                </div>
                <div className="active-actions">
                  <button
                    className="btn-ghost"
                    onClick={() => openEdit(profile)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-ghost danger"
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}

            <div className="profile-list">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`profile-row ${profile?.id === p.id ? "active" : ""}`}
                >
                  <button
                    className="profile-select"
                    onClick={() => handleSelectProfile(p)}
                  >
                    <AvatarBubble p={p} size={44} />
                    <div className="profile-select-info">
                      <span className="profile-row-name">{p.name}</span>
                      {p.hasPin && <span className="pin-badge">🔒</span>}
                    </div>
                  </button>
                  <div className="profile-row-actions">
                    <button className="btn-ghost" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button
                      className="btn-ghost danger"
                      onClick={() => handleDelete(p)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-primary new-profile-btn"
              onClick={openCreate}
            >
              + New Profile
            </button>
          </>
        )}

        {/* ── PIN entry ─────────────────────────────────────────────────── */}
        {view === "pin-entry" && pendingLogin && (
          <div className="pin-entry-view">
            <AvatarBubble p={pendingLogin} size={72} />
            <p className="pin-prompt">Enter your 4-digit PIN</p>

            <div className={`pin-dots-wrap ${pinShake ? "shake" : ""}`}>
              <PinDots value={pinEntry} />
            </div>

            {/* Hidden input captures keyboard input */}
            <input
              ref={pinInputRef}
              className="pin-hidden-input"
              value={pinEntry}
              onChange={handlePinInput}
              inputMode="numeric"
              maxLength={4}
              type="password"
              disabled={verifying}
            />

            {pinErr && <p className="form-error">{pinErr}</p>}
            {verifying && <p className="pin-verifying">Checking…</p>}

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setPendingLogin(null);
                  setView("list");
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {view === "create" && renderForm(handleCreate)}
        {view === "edit" && renderForm(handleUpdate, true)}
      </div>
    </div>
  );
}
