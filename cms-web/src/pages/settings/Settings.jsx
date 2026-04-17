import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { changePassword, getUserSettings, updateUserSettings } from "../../api/settings";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

function Settings() {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [selectedPicture, setSelectedPicture] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: "",
    cell_meeting_venue: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  const picturePreview = useMemo(() => {
    if (selectedPicture) {
      return URL.createObjectURL(selectedPicture);
    }
    return profilePictureUrl;
  }, [selectedPicture, profilePictureUrl]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (picturePreview && selectedPicture) {
        URL.revokeObjectURL(picturePreview);
      }
    };
  }, [picturePreview, selectedPicture]);

  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const settings = await getUserSettings();
      setForm({
        first_name: settings.first_name || "",
        last_name: settings.last_name || "",
        email: settings.email || "",
        phone: settings.phone || "",
        bio: settings.bio || "",
        cell_meeting_venue: settings.cell_meeting_venue || "",
      });
      setProfilePictureUrl(settings.profile_picture || "");
    } catch (err) {
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSuccess("");
    setError("");
    setSaving(true);

    try {
      const payload = {
        ...form,
      };
      if (selectedPicture) {
        payload.profile_picture = selectedPicture;
      }

      const updated = await updateUserSettings(payload);
      const nextUser = { ...user, ...updated };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      setProfilePictureUrl(updated.profile_picture || "");
      setSelectedPicture(null);
      setSuccess("Settings updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setSavingPassword(true);
    try {
      const message = await changePassword(passwordForm);
      setPasswordSuccess(message);
      setPasswordForm({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingState label="Loading settings..." />;
  if (error && !success) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
      {error && <ErrorState error={error} />}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Profile</h3>

        {picturePreview && (
          <img src={picturePreview} alt="Profile preview" className="h-24 w-24 rounded-full border border-slate-200 object-cover" />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(event) => setSelectedPicture(event.target.files?.[0] || null)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.first_name}
            onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            placeholder="First name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.last_name}
            onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            placeholder="Last name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <textarea
          value={form.bio}
          onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
          placeholder="Bio"
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <textarea
          value={form.cell_meeting_venue}
          onChange={(event) => setForm((prev) => ({ ...prev, cell_meeting_venue: event.target.value }))}
          placeholder="Cell meeting venue"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
        {passwordError && <ErrorState error={passwordError} />}
        {passwordSuccess && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{passwordSuccess}</p>
        )}
        <input
          type="password"
          value={passwordForm.old_password}
          onChange={(event) => setPasswordForm((prev) => ({ ...prev, old_password: event.target.value }))}
          placeholder="Current password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={passwordForm.new_password}
          onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
          placeholder="New password"
          required
          minLength={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={passwordForm.confirm_password}
          onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
          placeholder="Confirm new password"
          required
          minLength={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={savingPassword}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {savingPassword ? "Updating..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

export default Settings;
