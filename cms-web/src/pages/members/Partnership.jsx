import { useEffect, useMemo, useState } from "react";
import { getPartners, updatePartnerProfile } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

const partnershipLevels = ["bronze", "silver", "gold", "platinum"];
const financialStorageKey = "crs.partnership.financial-documents.v1";
const defaultDocumentHeaders = {
  memberName: "Member",
  cellName: "Cell",
  amount: "Amount",
  category: "Category",
  note: "Note",
};

const createRowId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const sanitizeFilename = (value) => {
  const sanitized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "_");
  return sanitized || "financial-document";
};

const normalizeDocuments = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((doc) => {
      if (!doc || typeof doc !== "object") return null;
      const headers = Object.keys(defaultDocumentHeaders).reduce((acc, key) => {
        const nextValue = String(doc.headers?.[key] || "").trim();
        acc[key] = nextValue || defaultDocumentHeaders[key];
        return acc;
      }, {});
      const rows = Array.isArray(doc.rows)
        ? doc.rows.map((row) => ({
            id: typeof row?.id === "string" ? row.id : createRowId(),
            memberProfileId: row?.memberProfileId ?? null,
            memberName: String(row?.memberName || ""),
            cellName: String(row?.cellName || ""),
            amount: String(row?.amount || ""),
            category: String(row?.category || ""),
            note: String(row?.note || ""),
          }))
        : [];

      return {
        id: typeof doc.id === "string" ? doc.id : createRowId(),
        name: String(doc.name || "Financial Document"),
        createdAt: typeof doc.createdAt === "string" ? doc.createdAt : new Date().toISOString(),
        headers,
        rows,
      };
    })
    .filter(Boolean);
};

const createRowFromPartner = (partner) => ({
  id: createRowId(),
  memberProfileId: partner?.id ?? null,
  memberName:
    [partner?.user?.first_name, partner?.user?.last_name].filter(Boolean).join(" ") || partner?.user?.username || "",
  cellName: partner?.cell_name || "",
  amount: "",
  category: "",
  note: "",
});

const createDocument = (name, partners) => ({
  id: createRowId(),
  name,
  createdAt: new Date().toISOString(),
  headers: { ...defaultDocumentHeaders },
  rows: partners.map(createRowFromPartner),
});

const readStoredDocuments = () => {
  try {
    const raw = localStorage.getItem(financialStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeDocuments(parsed);
  } catch (storageError) {
    console.warn("Unable to load stored financial documents due to a parsing/storage error.", storageError);
    return [];
  }
};

function Partnership() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [financialDocuments, setFinancialDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [newDocumentName, setNewDocumentName] = useState("");

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

  useEffect(() => {
    const docs = readStoredDocuments();
    setFinancialDocuments(docs);
    setActiveDocumentId(docs[0]?.id || null);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(financialStorageKey, JSON.stringify(financialDocuments));
    }, 150);
    return () => window.clearTimeout(timeoutId);
  }, [financialDocuments]);

  const activeDocument = useMemo(
    () => financialDocuments.find((doc) => doc.id === activeDocumentId) || null,
    [financialDocuments, activeDocumentId]
  );

  const editablePartners = useMemo(() => partners.filter((partner) => partner?.user?.role === "member"), [partners]);

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

  const handleCreateDocument = () => {
    const nextName = newDocumentName.trim() || `Financial Document ${financialDocuments.length + 1}`;
    const sourcePartners = editablePartners.length > 0 ? editablePartners : partners;
    const nextDocument = createDocument(nextName, sourcePartners);
    setFinancialDocuments((prev) => [...prev, nextDocument]);
    setActiveDocumentId(nextDocument.id);
    setNewDocumentName("");
  };

  const handleDeleteDocument = () => {
    if (!activeDocument) return;
    if (!window.confirm(`Delete ${activeDocument.name}?`)) return;

    setFinancialDocuments((prev) => {
      const next = prev.filter((doc) => doc.id !== activeDocument.id);
      setActiveDocumentId(next[0]?.id || null);
      return next;
    });
  };

  const handleDownloadDocument = () => {
    if (!activeDocument) return;

    const headers = Object.values(activeDocument.headers || defaultDocumentHeaders);
    const rows = activeDocument.rows.map((row) =>
      [row.memberName, row.cellName, row.amount, row.category, row.note].map(escapeCsvValue).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(activeDocument.name)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const updateDocumentCell = (rowId, field, value) => {
    if (!activeDocument) return;
    setFinancialDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocument.id
          ? {
              ...doc,
              rows: doc.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
            }
          : doc
      )
    );
  };

  const addDocumentRow = () => {
    if (!activeDocument) return;
    setFinancialDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocument.id
          ? {
              ...doc,
              rows: [
                ...doc.rows,
                {
                  id: createRowId(),
                  memberProfileId: null,
                  memberName: "",
                  cellName: "",
                  amount: "",
                  category: "",
                  note: "",
                },
              ],
            }
          : doc
      )
    );
  };

  const deleteDocumentRow = (rowId) => {
    if (!activeDocument) return;
    setFinancialDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocument.id
          ? {
              ...doc,
              rows: doc.rows.filter((row) => row.id !== rowId),
            }
          : doc
      )
    );
  };

  const updateDocumentHeader = (field, value) => {
    if (!activeDocument) return;
    setFinancialDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocument.id
          ? {
              ...doc,
              headers: {
                ...(doc.headers || defaultDocumentHeaders),
                [field]: value,
              },
            }
          : doc
      )
    );
  };

  if (loading) return <LoadingState label="Loading partnership members..." />;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Partnership</h2>
        {error && <ErrorState error={error} />}

        {partners.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No partnership members found.
          </p>
        ) : (
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
                    className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
                  >
                    {savingId === partner.id ? "Saving..." : "Save Partnership"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Financial Documents</h3>
            <p className="text-sm text-slate-600">
              Members added by cell leaders are loaded into new financial sheets automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newDocumentName}
              onChange={(event) => setNewDocumentName(event.target.value)}
              placeholder="Document name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateDocument}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={handleDeleteDocument}
              disabled={!activeDocument}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleDownloadDocument}
              disabled={!activeDocument}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Download
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            {financialDocuments.length === 0 ? (
              <p className="p-2 text-sm text-slate-600">No documents yet.</p>
            ) : (
              financialDocuments.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveDocumentId(doc.id)}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                    doc.id === activeDocumentId
                      ? "bg-slate-700 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="font-medium">{doc.name}</p>
                  <p className={`text-xs ${doc.id === activeDocumentId ? "text-slate-200" : "text-slate-500"}`}>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3">
            {!activeDocument ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Create or open a document to edit financial entries.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={activeDocument.name}
                    onChange={(event) =>
                      setFinancialDocuments((prev) =>
                        prev.map((doc) =>
                          doc.id === activeDocument.id ? { ...doc, name: event.target.value } : doc
                        )
                      )
                    }
                    aria-label="Document title"
                    className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900"
                    placeholder="Document title"
                  />
                  <button
                    type="button"
                    onClick={addDocumentRow}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">
                          <input
                            type="text"
                            value={activeDocument.headers?.memberName || defaultDocumentHeaders.memberName}
                            onChange={(event) => updateDocumentHeader("memberName", event.target.value)}
                            aria-label="Edit member column header"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          <input
                            type="text"
                            value={activeDocument.headers?.cellName || defaultDocumentHeaders.cellName}
                            onChange={(event) => updateDocumentHeader("cellName", event.target.value)}
                            aria-label="Edit cell column header"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          <input
                            type="text"
                            value={activeDocument.headers?.amount || defaultDocumentHeaders.amount}
                            onChange={(event) => updateDocumentHeader("amount", event.target.value)}
                            aria-label="Edit amount column header"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          <input
                            type="text"
                            value={activeDocument.headers?.category || defaultDocumentHeaders.category}
                            onChange={(event) => updateDocumentHeader("category", event.target.value)}
                            aria-label="Edit category column header"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          <input
                            type="text"
                            value={activeDocument.headers?.note || defaultDocumentHeaders.note}
                            onChange={(event) => updateDocumentHeader("note", event.target.value)}
                            aria-label="Edit note column header"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {activeDocument.rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                            No rows yet.
                          </td>
                        </tr>
                      ) : (
                        activeDocument.rows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.memberName}
                                onChange={(event) => updateDocumentCell(row.id, "memberName", event.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.cellName}
                                onChange={(event) => updateDocumentCell(row.id, "cellName", event.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.amount}
                                onChange={(event) => updateDocumentCell(row.id, "amount", event.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.category}
                                onChange={(event) => updateDocumentCell(row.id, "category", event.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.note}
                                onChange={(event) => updateDocumentCell(row.id, "note", event.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => deleteDocumentRow(row.id)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Partnership;
