import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2, Clock, CheckSquare, Square } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import type { FacultyMember } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = [
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "01:00-02:00",
  "02:00-03:00",
  "03:00-04:00",
  "04:00-05:00",
];

export function FacultyPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [selectedFacultyForAvail, setSelectedFacultyForAvail] = useState<FacultyMember | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});

  const { matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = role === "super_admin" || role === "admin";
  const canEdit = isAdmin;

  const [form, setForm] = useState({
    id: "",
    name: "",
    department: "Information Technology",
    email: "",
    phone: "",
    status: "Full-Time" as "Full-Time" | "Part-Time",
    maxLoadHours: 24,
    availability: "Monday-Friday: 08:00-17:00",
    programs: ["BSIT"],
  });

  const toast = useToast();

  const fetchFaculty = async () => {
    try {
      const res = await api.get("/faculty");
      setFaculty(res.data?.data || []);
    } catch {
      setFaculty([]);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleEdit = (f: FacultyMember) => {
    setEditingFaculty(f);
    setForm({
      id: f.id,
      name: f.name,
      department: f.department,
      email: f.email,
      phone: f.phone,
      status: f.status,
      maxLoadHours: f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24),
      availability: f.availability || "",
      programs: f.programs || ["BSIT"],
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this faculty record? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/faculty/${encodeURIComponent(id)}`);
      toast.push("Faculty member deleted successfully", "success");
      fetchFaculty();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete faculty member", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const openAvailabilityModal = (f: FacultyMember) => {
    setSelectedFacultyForAvail(f);
    const slotsMap: Record<string, string[]> = {};
    if (f.availability) {
      const entries = f.availability.split("|").map((e) => e.trim()).filter(Boolean);
      for (const entry of entries) {
        const [day, ...rest] = entry.split(":");
        const dayKey = day.trim();
        const slots = rest.join(":").split(",").map((s) => s.trim()).filter(Boolean);
        slotsMap[dayKey] = slots;
      }
    }
    setSelectedSlots(slotsMap);
    setAvailabilityModalOpen(true);
  };

  const handleSlotToggle = (day: string, slot: string) => {
    setSelectedSlots((prev) => {
      const current = prev[day] || [];
      const next = current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot];
      return { ...prev, [day]: next };
    });
  };

  const saveAvailabilityFromModal = async () => {
    if (!selectedFacultyForAvail) return;
    const formatted = Object.entries(selectedSlots)
      .filter(([_, slots]) => slots.length > 0)
      .map(([day, slots]) => `${day}: ${slots.join(", ")}`)
      .join(" | ");

    try {
      await api.put(`/faculty/${encodeURIComponent(selectedFacultyForAvail.id)}`, {
        ...selectedFacultyForAvail,
        availability: formatted || "Monday-Friday: 08:00-17:00",
      });
      toast.push(`Updated availability for ${selectedFacultyForAvail.name}`, "success");
      setAvailabilityModalOpen(false);
      fetchFaculty();
    } catch {
      toast.push("Failed to update availability", "error");
    }
  };

  const handleSave = async () => {
    if (!form.id || !form.name) {
      toast.push("Employee ID and Name are required", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingFaculty) {
        await api.put(`/faculty/${encodeURIComponent(editingFaculty.id)}`, form);
        toast.push("Faculty updated successfully", "success");
      } else {
        await api.post("/faculty", form);
        toast.push("Faculty member added successfully", "success");
      }
      fetchFaculty();
      setIsOpen(false);
      setEditingFaculty(null);
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save faculty", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = faculty.filter((entry) => {
    const matchesQuery = [
      entry.name,
      entry.department,
      entry.status,
      entry.availability,
      entry.id,
      entry.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesStatus = statusFilter === "All" || entry.status === statusFilter;
    const matchesProg = role === "program_head"
      ? matchesProgram(entry.programs || entry.department)
      : true;

    return matchesQuery && matchesStatus && matchesProg;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Faculty & Availability Management"
        description="Maintain instructor profiles, full-time / part-time status, teaching load limits, and weekly availability schedules."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Faculty</strong>
          </>
        }
        helpText="Part-time faculty availability is checked in real-time during manual class scheduling to prevent scheduling clashes."
        actions={
          canEdit ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingFaculty(null);
                setForm({
                  id: `FAC-00${faculty.length + 1}`,
                  name: "",
                  department: "Information Technology",
                  email: "",
                  phone: "",
                  status: "Full-Time",
                  maxLoadHours: 24,
                  availability: "Monday-Friday: 08:00-17:00",
                  programs: ["BSIT"],
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Add Faculty
            </button>
          ) : undefined
        }
      />

      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Academic Roster</p>
            <h3>Faculty Members ({filteredFaculty.length})</h3>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Status:
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="All">All Statuses</option>
                <option value="Full-Time">Full-Time Only</option>
                <option value="Part-Time">Part-Time Only</option>
              </select>
            </label>
            <label className="topbar__search" aria-label="Search faculty">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, ID, department..."
              />
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Instructor Name</th>
                <th>Department / Programs</th>
                <th>Status</th>
                <th>Max Load</th>
                <th>Teaching Availability</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No faculty records matched your search.</div>
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <code>{f.id}</code>
                    </td>
                    <td>
                      <strong>{f.name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.email}</div>
                    </td>
                    <td>{f.department}</td>
                    <td>
                      <span
                        className={`pill ${f.status === "Full-Time" ? "pill--royal" : "pill--navy"}`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td>{f.maxLoadHours || 24} hrs/wk</td>
                    <td>
                      <div style={{ maxWidth: 300, fontSize: "0.8rem", color: "#334155" }}>
                        {f.availability || "Standard Hours"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Manage Weekly Availability"
                          onClick={() => openAvailabilityModal(f)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7" }}
                        >
                          <Clock size={16} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="icon-button"
                              title="Edit Faculty"
                              onClick={() => handleEdit(f)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Delete Faculty"
                              onClick={() => handleDelete(f.id)}
                              disabled={deletingId === f.id}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isOpen && canEdit}
        title={editingFaculty ? "Edit Faculty Profile" : "Register Faculty Member"}
        description="Configure employee details, department, employment status, and weekly limits."
        onClose={() => {
          setIsOpen(false);
          setEditingFaculty(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="facultyId">Employee ID</label>
            <input
              id="facultyId"
              value={form.id}
              disabled={!!editingFaculty}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyName">Full Name</label>
            <input
              id="facultyName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Prof. Alan Turing"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyEmail">Email Address</label>
            <input
              id="facultyEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="faculty@srcb.edu.ph"
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyPhone">Phone Contact</label>
            <input
              id="facultyPhone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0917XXXXXXX"
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyDept">Department</label>
            <input
              id="facultyDept"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyStatus">Employment Status</label>
            <select
              id="facultyStatus"
              value={form.status}
              onChange={(e) => {
                const status = e.target.value as "Full-Time" | "Part-Time";
                setForm({
                  ...form,
                  status,
                  maxLoadHours: status === "Part-Time" ? 12 : 24,
                });
              }}
            >
              <option value="Full-Time">Full-Time Faculty</option>
              <option value="Part-Time">Part-Time Faculty</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="facultyMaxLoad">Max Weekly Load (Hours)</label>
            <input
              id="facultyMaxLoad"
              type="number"
              value={form.maxLoadHours}
              onChange={(e) => setForm({ ...form, maxLoadHours: Number(e.target.value) })}
            />
          </div>

          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="facultyAvailability">Availability Notes / Schedule</label>
            <textarea
              id="facultyAvailability"
              rows={2}
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              placeholder="e.g. Monday: 08:00-12:00 | Wednesday: 13:00-17:00"
            />
          </div>
        </div>

        <div className="table-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsOpen(false);
              setEditingFaculty(null);
            }}
          >
            Cancel
          </button>
          <button type="button" className="action-button" disabled={loading} onClick={handleSave}>
            {loading ? "Saving…" : "Save Faculty"}
          </button>
        </div>
      </Modal>

      {/* Interactive Availability Matrix Modal */}
      <Modal
        isOpen={availabilityModalOpen}
        title={`Availability Grid - ${selectedFacultyForAvail?.name}`}
        description="Review or customize teaching day & timeslot preferences for class schedule alignment."
        onClose={() => setAvailabilityModalOpen(false)}
      >
        <div style={{ marginTop: 12 }}>
          <div className="table-wrap">
            <table className="data-table" style={{ textAlign: "center" }}>
              <thead>
                <tr>
                  <th>Time Slot</th>
                  {DAYS.map((d) => (
                    <th key={d}>{d.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{slot}</td>
                    {DAYS.map((day) => {
                      const checked = (selectedSlots[day] || []).includes(slot);
                      return (
                        <td key={`${day}-${slot}`}>
                          <button
                            type="button"
                            onClick={() => handleSlotToggle(day, slot)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: checked ? "#0284c7" : "#cbd5e1",
                              padding: 4,
                            }}
                          >
                            {checked ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-actions" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setAvailabilityModalOpen(false)}
            >
              Close
            </button>
            <button type="button" className="action-button" onClick={saveAvailabilityFromModal}>
              Save Availability Preferences
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
