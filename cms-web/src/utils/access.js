export const hasResponsibility = (user, code) => {
  if (!user || user.role !== "staff") return false;
  return Array.isArray(user.responsibilities) && user.responsibilities.includes(code);
};

export const hasAnyStaffResponsibility = (user) => {
  if (!user || user.role !== "staff") return false;
  return Array.isArray(user.responsibilities) && user.responsibilities.length > 0;
};

export const canAccessCellMinistry = (user) => user?.role === "pastor" || hasResponsibility(user, "cell_ministry");

export const canAccessFirstTimers = (user) => user?.role === "pastor" || hasResponsibility(user, "first_timer");

export const canAccessPartnership = (user) => user?.role === "pastor" || hasResponsibility(user, "partnership");

