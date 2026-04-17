import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Sidebar() {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const canManageReports = ["pastor", "staff", "fellowship_leader"].includes(user.role);
  const canViewDashboard = ["pastor", "staff"].includes(user.role);
  const canViewSettings = ["pastor", "staff", "fellowship_leader", "cell_leader"].includes(user.role);
  const canManageMembers = ["pastor", "staff", "fellowship_leader", "cell_leader"].includes(user.role);
  const canManageStructure = ["pastor", "staff", "fellowship_leader"].includes(user.role);
  const canMessage = ["pastor", "staff", "fellowship_leader", "cell_leader", "teacher", "member"].includes(
    user.role
  );
  const isFrozen = Boolean(user.is_frozen);
  const baseLinkClass =
    "block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white";
  const activeLinkClass = "bg-brand-600 text-white";
  const navClassName = ({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ""}`;

  return (
    <aside className="w-64 bg-slate-900 p-4 text-white">
      <h3 className="mb-5 text-lg font-bold tracking-wide">ChurchSys</h3>

      {canViewDashboard && !isFrozen && (
        <NavLink className={navClassName} to="/dashboard">
          Dashboard
        </NavLink>
      )}

      {canViewSettings && (
        <NavLink className={navClassName} to="/settings">
          Settings
        </NavLink>
      )}

      {user.role === "cell_leader" && (
        <div className="space-y-1">
          <NavLink className={navClassName} to="/reports/submit">
            Submit Report
          </NavLink>
          {!isFrozen && (
            <NavLink className={navClassName} to="/reports/my">
              My Reports
            </NavLink>
          )}
        </div>
      )}

      {canManageReports && !isFrozen && (
        <NavLink className={navClassName} to="/reports/manage">
          {user.role === "fellowship_leader" ? "Review Reports" : "Manage Reports"}
        </NavLink>
      )}

      {canManageMembers && !isFrozen && (
        <div className="space-y-1">
          {canManageStructure && (
            <NavLink className={navClassName} to="/structure">
              Structure
            </NavLink>
          )}
          <NavLink className={navClassName} to="/members">
            Members
          </NavLink>
          <NavLink className={navClassName} to="/attendance">
            Attendance
          </NavLink>
        </div>
      )}

      {canMessage && !isFrozen && (
        <NavLink className={navClassName} to="/messages">
          Messages
        </NavLink>
      )}
    </aside>
  );
}

export default Sidebar;
