import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { changePassword, getUserSettings, updateUserSettings } from "../../api/settings";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;

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
    gender: "",
    email: "",
    phone: "",
    bio: "",
    cell_meeting_venue: "",
    cell_name: "",
    fellowship_name: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const shouldShowCellNameField = useMemo(
    () => ["cell_leader", "fellowship_leader"].includes(user?.role) || Boolean(form.cell_name),
    [form.cell_name, user?.role]
  );
  const shouldShowFellowshipNameField = useMemo(
    () => user?.role === "fellowship_leader" || Boolean(form.fellowship_name),
    [form.fellowship_name, user?.role]
  );

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const settings = await getUserSettings();
      setForm({
        first_name: settings.first_name || "",
        last_name: settings.last_name || "",
        gender: settings.gender || "",
        email: settings.email || "",
        phone: settings.phone || "",
        bio: settings.bio || "",
        cell_meeting_venue: settings.cell_meeting_venue || "",
        cell_name: settings.cell_name || "",
        fellowship_name: settings.fellowship_name || "",
      });
    } catch (err) {
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
      setSelectedPicture(null);
      setSuccess("Settings updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setSelectedPicture(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image file.");
      setSelectedPicture(null);
      return;
    }
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      setError("Profile picture size must not exceed 5MB.");
      setSelectedPicture(null);
      return;
    }
    setError("");
    setSelectedPicture(file);
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

        <input
          type="file"
          accept="image/*"
          onChange={handleProfilePictureChange}
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
          <select
            value={form.gender}
            onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Gender (Not specified)</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer Not To Say</option>
          </select>
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

        {shouldShowCellNameField && (
          <input
            value={form.cell_name}
            onChange={(event) => setForm((prev) => ({ ...prev, cell_name: event.target.value }))}
            placeholder="Cell name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}

        {shouldShowFellowshipNameField && (
          <input
            value={form.fellowship_name}
            onChange={(event) => setForm((prev) => ({ ...prev, fellowship_name: event.target.value }))}
            placeholder="Fellowship name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}

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
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={passwordForm.confirm_password}
          onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
          placeholder="Confirm new password"
          required
          minLength={MIN_PASSWORD_LENGTH}
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
