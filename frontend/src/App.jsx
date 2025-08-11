import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { api } from "./api.js";

function BellSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getBellSchedule()
      .then(setSchedules)
      .catch(e => setErr(e.message || "Failed to load schedule"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading bell schedule…</div>;
  if (err) return <div className="card error">{err}</div>;

  return (
    <>
      <h2>Bell Schedule</h2>
      {schedules.map((sch, idx) => (
        <div className="card" key={idx}>
          <h3>{sch.day}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Block</th><th>Start</th><th>End</th>
              </tr>
            </thead>
            <tbody>
              {sch.blocks.map((b, i) => (
                <tr key={i}>
                  <td>{b.name}</td>
                  <td>{b.start}</td>
                  <td>{b.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnnouncements()
      .then(setItems)
      .catch(e => setErr(e.message || "Failed to load announcements"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading announcements…</div>;
  if (err) return <div className="card error">{err}</div>;

  return (
    <>
      <h2>Announcements</h2>
      {items.length === 0 && <div className="card">No active announcements.</div>}
      <div className="grid">
        {items.map(a => (
          <div className="card" key={a.id}>
            <div className="row space-between">
              <h3>{a.title}</h3>
              <span className="badge">Priority {a.priority}</span>
            </div>
            <p>{a.message}</p>
            <div className="meta">
              <span>From: {new Date(a.startDate).toLocaleString()}</span>
              <span>To: {new Date(a.endDate).toLocaleString()}</span>
              {a.createdBy && <span>By: {a.createdBy}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminPage() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    startDate: "",
    endDate: "",
    notifyAt: "",
    priority: 10,
    active: true,
    createdBy: ""
  });
  const [token, setToken] = useState(import.meta.env.VITE_ADMIN_TOKEN || "");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // convert datetime-local input -> ISO string (UTC) or null
  const toISO = (v) => (v ? new Date(v).toISOString() : null);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        message: form.message,
        startDate: toISO(form.startDate),
        endDate: toISO(form.endDate),
        notifyAt: toISO(form.notifyAt),
        priority: Number(form.priority),
        active: !!form.active,
        createdBy: form.createdBy || null
      };

      const res = await api.createAnnouncement(payload, token);
      setStatus(`✅ Created announcement #${res.id}`);
      setForm({
        title: "",
        message: "",
        startDate: "",
        endDate: "",
        notifyAt: "",
        priority: 10,
        active: true,
        createdBy: ""
      });
    } catch (err) {
      setStatus("❌ " + (err.message || "Failed to create"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2>Admin: New Announcement</h2>
      <form className="card form" onSubmit={onSubmit}>
        <label>
          Admin Token
          <input
            type="password"
            placeholder="Enter admin token"
            value={token}
            onChange={e => setToken(e.target.value)}
            required
          />
        </label>

        <div className="grid-2">
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required maxLength={120}/>
          </label>
          <label>
            Priority (1–100)
            <input name="priority" type="number" min="1" max="100" value={form.priority} onChange={onChange}/>
          </label>
        </div>

        <label>
          Message
          <textarea name="message" rows="6" value={form.message} onChange={onChange} required></textarea>
        </label>

        <div className="grid-3">
          <label>
            Start Date/Time
            <input type="datetime-local" name="startDate" value={form.startDate} onChange={onChange} required/>
          </label>
          <label>
            End Date/Time
            <input type="datetime-local" name="endDate" value={form.endDate} onChange={onChange} required/>
          </label>
          <label>
            Notify At (optional)
            <input type="datetime-local" name="notifyAt" value={form.notifyAt} onChange={onChange}/>
          </label>
        </div>

        <div className="row gap">
          <label className="row gap">
            <input type="checkbox" name="active" checked={form.active} onChange={onChange}/>
            Active
          </label>
          <label>
            Created By (optional)
            <input name="createdBy" value={form.createdBy} onChange={onChange} placeholder="Name"/>
          </label>
        </div>

        <button className="btn" disabled={submitting}>{submitting ? "Submitting…" : "Create"}</button>
        {status && <div className="status">{status}</div>}
      </form>
      <div className="tip card">
        <strong>Tip:</strong> The server expects the header <code>X-Admin-Token</code>. If you’re testing via <code>curl</code>,
        include <code>-H "X-Admin-Token: &lt;your-token&gt;"</code>.
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BellSchedulePage />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}