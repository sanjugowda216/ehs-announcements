const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function http(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  getBellSchedule: () => http("/bell-schedule"),
  getAnnouncements: () => http("/announcements?active_only=true"),
  createAnnouncement: (payload, adminToken) =>
    http("/announcements", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
      },
    }),
};
