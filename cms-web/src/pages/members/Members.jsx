import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMembers } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const roleLabelMap = {
  admin: "Admin",
  pastor: "Pastor",
  staff: "Staff",
  fellowship_leader: "Fellowship Leader",
  cell_leader: "Cell Leader",
  teacher: "Teacher",
  member: "Member",
};

const roleBadgeClassMap = {
  admin: "bg-purple-100 text-purple-700",
  pastor: "bg-violet-100 text-violet-700",
  staff: "bg-blue-100 text-blue-700",
  fellowship_leader: "bg-emerald-100 text-emerald-700",
  cell_leader: "bg-amber-100 text-amber-700",
  teacher: "bg-cyan-100 text-cyan-700",
  member: "bg-slate-100 text-slate-700",
};

const membershipLabelMap = {
  member: "Member",
  first_timer: "First Timer",
  visitor: "Visitor",
  regular: "Regular",
};

const membershipBadgeClassMap = {
  member: "bg-emerald-100 text-emerald-700",
  first_timer: "bg-amber-100 text-amber-700",
  visitor: "bg-slate-200 text-slate-700",
  regular: "bg-blue-100 text-blue-700",
};

const getTopLinesForRole = ({ role, fullName, cellName, fellowshipName }) => {
  const topLines = [{ key: "name", label: fullName }];
  if (role === "fellowship_leader") {
    topLines.push({ key: "cell", label: `Cell: ${cellName || "-"}` });
  }
  if (role === "pastor" || role === "staff") {
    topLines.push({ key: "fellowship", label: `Fellowship: ${fellowshipName || "-"}` });
    topLines.push({ key: "cell", label: `Cell: ${cellName || "-"}` });
  }
  return topLines;
};

function Members() {
  const [members, setMembers] = useState([]);
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (err) {
      setError(err.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading members..." />;
  if (error) return <ErrorState error={error} />;
  if (members.length === 0) return <EmptyState label="No members found." />;

  const filteredMembers =
    membershipFilter === "all"
      ? members
      : members.filter((member) => member.membership_status === membershipFilter);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Members</h2>
      <select
        value={membershipFilter}
        onChange={(event) => setMembershipFilter(event.target.value)}
        className="max-w-xs rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500 focus:ring-2"
      >
        <option value="all">All Statuses</option>
        <option value="member">Members</option>
        <option value="first_timer">First Timers</option>
        <option value="visitor">Visitors</option>
        <option value="regular">Regular Attenders</option>
      </select>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredMembers.map((m) => {
          const fullName =
            [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
            m.user?.username ||
            "-";
          const initialsSource = [m.user?.first_name, m.user?.last_name].filter(Boolean);
          const initials = initialsSource.length
            ? initialsSource.map((name) => name[0]).join("").slice(0, 2).toUpperCase()
            : fullName === "-"
              ? "?"
              : fullName.slice(0, 1).toUpperCase();
          const topLines = getTopLinesForRole({
            role: m.user?.role,
            fullName,
            cellName: m.cell_name,
            fellowshipName: m.fellowship_name,
          });
          return (
            <Link
              key={m.id}
              to={`/members/${m.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {m.user?.profile_picture ? (
                    <img
                      src={m.user.profile_picture}
                      alt={`${fullName} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {topLines.map((line) => (
                    <p key={line.key} className="truncate text-base font-bold text-slate-900">
                      {line.label}
                    </p>
                  ))}
                  <p className="text-sm text-slate-600">Gender: {m.user?.gender || "-"}</p>
                </div>
              </div>
            <div className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleBadgeClassMap[m.user?.role] || roleBadgeClassMap.member}`}
              >
                {roleLabelMap[m.user?.role] || "Member"}
              </span>
              <span
                className={`ml-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${membershipBadgeClassMap[m.membership_status] || membershipBadgeClassMap.visitor}`}
              >
                {membershipLabelMap[m.membership_status] || "Visitor"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Username: {m.user?.username || "-"}
            </p>
            <p className="text-sm text-slate-600">
              Status:{" "}
              {m.user?.is_frozen
                ? "Frozen"
                : m.user?.is_active
                  ? "Active"
                  : "Inactive"}
            </p>
            <p className="text-sm text-slate-600">Cell: {m.cell_name || "-"}</p>
            <p className="text-sm text-slate-600">
              Baptised: {m.is_baptised ? "Yes" : "No"}
            </p>
            <p className="text-sm text-slate-600">
              Foundation: {m.foundation_completed ? "Yes" : "No"}
            </p>
            <p className="text-sm text-slate-600">Souls Won: {m.souls_won}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Members;
