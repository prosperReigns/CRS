import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { canAccessCellMinistry, canAccessFirstTimers, canAccessPartnership, hasAnyStaffResponsibility } from "../utils/access";

function Sidebar({ isOpen, onToggle }) {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const canManageReports = ["admin", "pastor", "fellowship_leader"].includes(user.role) || canAccessCellMinistry(user);
  const canViewDashboard =
    ["admin", "pastor"].includes(user.role) || (user.role === "staff" ? hasAnyStaffResponsibility(user) : false);
  const canViewSettings = ["admin", "pastor", "staff", "fellowship_leader", "cell_leader"].includes(user.role);
  const canManageMembers = ["admin", "pastor", "staff", "fellowship_leader", "cell_leader"].includes(user.role);
  const canManageStructure = ["admin", "pastor", "fellowship_leader"].includes(user.role) || canAccessCellMinistry(user);
  const canAssignCellLeaders = ["admin", "pastor"].includes(user.role) || user.role === "fellowship_leader" || canAccessCellMinistry(user);
  const canAssignFellowshipLeaders = ["admin", "pastor"].includes(user.role) || canAccessCellMinistry(user);
  const canMessage = ["admin", "pastor", "staff", "fellowship_leader", "cell_leader", "teacher", "member"].includes(
    user.role
  );
  const isFrozen = Boolean(user.is_frozen);
  const baseLinkClass =
    "block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white";
  const activeLinkClass = "bg-brand-600 text-white";
  const navClassName = ({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ""}`;

  return (
    <div className="shrink-0 bg-slate-900 text-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="app-sidebar-navigation"
        className="m-4 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        {isOpen ? "Hide Sidebar" : "Show Sidebar"}
      </button>

      {isOpen && (
        <aside id="app-sidebar-navigation" className="w-64 p-4 pt-0">
      <h3 className="mb-5 text-lg font-bold tracking-wide">ChurchSys</h3>

      {canViewDashboard && !isFrozen && (
        <NavLink className={navClassName} to="/dashboard">
          Dashboard
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

      {canAccessFirstTimers(user) && !isFrozen && (
        <NavLink className={navClassName} to="/first-timers">
          First Timers
        </NavLink>
      )}

      {canAccessPartnership(user) && !isFrozen && (
        <NavLink className={navClassName} to="/partnership">
          Partnership
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
          {canAssignCellLeaders && (
            <NavLink className={navClassName} to="/members/assign-cell-leader">
              Assign Cell Leader
            </NavLink>
          )}
          {canAssignFellowshipLeaders && (
            <NavLink className={navClassName} to="/members/assign-fellowship-leader">
              Assign Fellowship Leader
            </NavLink>
          )}
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

      {canViewSettings && (
        <NavLink className={navClassName} to="/settings">
          Settings
        </NavLink>
      )}
        </aside>
      )}
    </div>
  );
}

export default Sidebar;
