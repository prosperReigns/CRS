export const statusLabel = {
  member: "Member",
  first_timer: "First Timer",
  visitor: "Visitor",
};

export const statusBadgeClass = {
  member: "bg-emerald-100 text-emerald-700",
  first_timer: "bg-amber-100 text-amber-700",
  visitor: "bg-slate-100 text-slate-700",
};

export const resolvePersonStatus = (person) => person?.status || person?.membership_status || "visitor";
