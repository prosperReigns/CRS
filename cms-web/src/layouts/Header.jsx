import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {user?.username} ({user?.role})
        </span>
      {user?.is_frozen && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-700">
          Your account is temporarily restricted. Please submit your pending report.
        </span>
      )}
        <button
          onClick={logout}
          className="ml-auto rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
        Logout
      </button>
      </div>
    </header>
  );
}

export default Header;
