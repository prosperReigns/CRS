import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { hasResponsibility } from "../utils/access";

function ProtectedRoute({ children, allowedRoles, allowedResponsibilities }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;

  if (user.is_frozen && location.pathname !== "/reports/submit") {
    return <Navigate to="/reports/submit" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  if (
    Array.isArray(allowedResponsibilities) &&
    allowedResponsibilities.length > 0 &&
    user.role === "staff" &&
    !allowedResponsibilities.some((responsibility) => hasResponsibility(user, responsibility))
  ) {
    return <Navigate to="/settings" replace />;
  }

  return children;
}

export default ProtectedRoute;
