import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getMemberProfile, updateMemberProfile } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

function MemberProfile() {
  const { memberId } = useParams();
  const { user } = useContext(AuthContext);
  const [member, setMember] = useState(null);
  const [trackingForm, setTrackingForm] = useState({
    is_baptised: false,
    foundation_completed: false,
    souls_won: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEditTracking = ["cell_leader", "fellowship_leader", "staff", "pastor", "admin"].includes(user?.role || "");

  useEffect(() => {
    if (!memberId) return;
    fetchMember();
  }, [memberId]);

  const fetchMember = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await getMemberProfile(Number(memberId));
      setMember(data);
      setTrackingForm({
        is_baptised: Boolean(data.is_baptised),
        foundation_completed: Boolean(data.foundation_completed),
        souls_won: Number(data.souls_won || 0),
      });
    } catch (err) {
      setError(err.message || "Failed to load member profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingSubmit = async (event) => {
    event.preventDefault();
    if (!member) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateMemberProfile(member.id, {
        is_baptised: trackingForm.is_baptised,
        foundation_completed: trackingForm.foundation_completed,
        souls_won: Math.max(0, Number(trackingForm.souls_won || 0)),
      });
      setMember(updated);
      setTrackingForm({
        is_baptised: Boolean(updated.is_baptised),
        foundation_completed: Boolean(updated.foundation_completed),
        souls_won: Number(updated.souls_won || 0),
      });
      setSuccess("Member tracking updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update member tracking.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading member profile..." />;
  if (error && !member) return <ErrorState error={error} />;
  if (!member) return <ErrorState error="Member profile not found." />;

  const fullName = [member.user?.first_name, member.user?.last_name].filter(Boolean).join(" ") || member.user?.username || "-";
  const profilePicture = member.user?.profile_picture;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Member Profile</h2>
      {error && <ErrorState error={error} />}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Profile Details</h3>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="h-28 w-28 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {profilePicture ? (
              <img src={profilePicture} alt={`${fullName} profile`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-500">
                {fullName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="grid flex-1 gap-3 md:grid-cols-2">
            <input value={member.user?.first_name || ""} readOnly placeholder="First Name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
            <input value={member.user?.last_name || ""} readOnly placeholder="Surname" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
            <input value={member.user?.phone || ""} readOnly placeholder="Phone No" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
            <input value={member.user?.email || ""} readOnly placeholder="Email" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
            <textarea
              value={member.user?.home_address || ""}
              readOnly
              rows={2}
              placeholder="Home Address"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm md:col-span-2"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Spiritual Growth Tracking</h3>
        <form onSubmit={handleTrackingSubmit} className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-2 font-semibold">Baptised</th>
                  <th className="px-3 py-2 font-semibold">Foundation School</th>
                  <th className="px-3 py-2 font-semibold">Souls Won</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <select
                      value={trackingForm.is_baptised ? "yes" : "no"}
                      onChange={(event) =>
                        setTrackingForm((prev) => ({ ...prev, is_baptised: event.target.value === "yes" }))
                      }
                      disabled={!canEditTracking || saving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={trackingForm.foundation_completed ? "yes" : "no"}
                      onChange={(event) =>
                        setTrackingForm((prev) => ({ ...prev, foundation_completed: event.target.value === "yes" }))
                      }
                      disabled={!canEditTracking || saving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min={0}
                      value={trackingForm.souls_won}
                      onChange={(event) =>
                        setTrackingForm((prev) => ({ ...prev, souls_won: event.target.value }))
                      }
                      disabled={!canEditTracking || saving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {canEditTracking && (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {saving ? "Updating..." : "Update Tracking"}
            </button>
          )}
        </form>
      </section>
    </div>
  );
}

export default MemberProfile;
