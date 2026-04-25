export const dash = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number" && v === 0) return "—";
  return v;
};
