export const duration = (n) =>
  `${Math.floor(n / 60)}h ${Math.round(n % 60)
    .toString()
    .padStart(2, "0")}m`;
export const clock = (n) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.round(n % 60)
    .toString()
    .padStart(2, "0")}`;
export const dateLabel = (value) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export const stamp = (n, base) => {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCMinutes(n);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} · ${clock(n % 1440)}`;
};
export const shortPlace = (p) => p.split(",").slice(0, 2).join(",");
export const number = (n) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });
