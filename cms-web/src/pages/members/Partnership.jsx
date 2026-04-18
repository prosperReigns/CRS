import { useEffect, useState } from "react";
import { getPartners, updatePartnerProfile } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const partnershipLevels = ["bronze", "silver", "gold", "platinum"];

function Partnership() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const fetchPartners = async () => {
    try {
      const data = await getPartners();
      setPartners(data);
    } catch (err) {
      setError(err.message || "Failed to load partnership members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const updateField = (id, field, value) => {
    setPartners((prev) => prev.map((partner) => (partner.id === id ? { ...partner, [field]: value } : partner)));
  };

  const savePartner = async (partner) => {
    setSavingId(partner.id);
    setError("");
    try {
      await updatePartnerProfile(partner.id, {
        is_partner: Boolean(partner.is_partner),
        partnership_date: partner.partnership_date || null,
        partnership_level: partner.partnership_level || "",
      });
    } catch (err) {
      setError(err.message || "Failed to update partnership info.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading partnership members..." />;
  if (error) return <ErrorState error={error} />;
  if (partners.length === 0) return <EmptyState label="No partnership members found." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Partnership</h2>

      <div className="grid gap-4 xl:grid-cols-2">
        {partners.map((partner) => (
          <div key={partner.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{partner.user?.username}</p>
            <p className="text-sm text-slate-600">
              Name: {[partner.user?.first_name, partner.user?.last_name].filter(Boolean).join(" ") || "-"}
            </p>
            <div className="mt-3 grid gap-3">
              <label className="text-sm text-slate-700">
                Partnership Date
                <input
                  type="date"
                  value={partner.partnership_date || ""}
                  onChange={(event) => updateField(partner.id, "partnership_date", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Partnership Level
                <select
                  value={partner.partnership_level || ""}
                  onChange={(event) => updateField(partner.id, "partnership_level", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select level</option>
                  {partnershipLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => savePartner(partner)}
                disabled={savingId === partner.id}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
              >
                {savingId === partner.id ? "Saving..." : "Save Partnership"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Partnership;

