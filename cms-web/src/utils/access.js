export const hasResponsibility = (user, code) => {
  if (!user || user.role !== "staff") return false;
  return Array.isArray(user.responsibilities) && user.responsibilities.includes(code);
};

export const hasAnyStaffResponsibility = (user) => {
  if (!user || user.role !== "staff") return false;
  return Array.isArray(user.responsibilities) && user.responsibilities.length > 0;
};

const hasPastorPrivileges = (user) => ["admin", "pastor"].includes(user?.role);

export const canAccessCellMinistry = (user) => hasPastorPrivileges(user) || hasResponsibility(user, "cell_ministry");

export const canAccessFirstTimers = (user) => hasPastorPrivileges(user) || hasResponsibility(user, "first_timer");

export const canAccessPartnership = (user) => hasPastorPrivileges(user) || hasResponsibility(user, "partnership");
