import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import { Tooltip } from "../components/common/Tooltip";
import { useNotifications } from "../contexts/NotificationContext";
import { Plus, Search, Edit2, Trash2, Clock } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { formatSystemId } from "../utils/idFormatter";
import type { FacultyMember } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = [
  "08:00-09:00",
  "08:30-09:30",
  "09:00-10:00",
  "09:30-10:30",
  "10:00-11:00",
  "10:30-11:30",
  "11:00-12:00",
  "11:30-12:30",
  "01:00-02:00",
  "01:30-02:30",
  "02:00-03:00",
  "02:30-03:30",
  "03:00-04:00",
  "04:00-05:00",
];

export function FacultyPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [facultyToDelete, setFacultyToDelete] = useState<FacultyMember | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

  // Form Validation States (Requirements 3 & 4)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [selectedFacultyForAvail, setSelectedFacultyForAvail] = useState<FacultyMember | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});

  const { selectedProgram, matchesProgram } = useProgramContext();
  const { addNotification } = useNotifications();

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = role === "super_admin" || role === "admin";
  const canEdit = isAdmin;
  const isProgramHead = role === "program_head";

  const [form, setForm] = useState({
    id: "",
    department: "Information Technology",
    email: "",
    status: "Full-Time" as "Full-Time" | "Part-Time",
    maxLoadHours: 24,
    availability: "Monday-Friday: 08:00-17:00",
    programs: ["BSIT"],
  });

  const toast = useToast();

  const fetchFaculty = async () => {
    setFetching(true);
    try {
      const res = await api.get("/faculty");
      setFaculty(res.data?.data || []);
    } catch {
      setFaculty([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleEdit = (f: FacultyMember) => {
    setEditingFaculty(f);
    const parts = (f.name || "").trim().split(" ");
    const fName = parts.slice(0, -1).join(" ") || parts[0] || "";
    const lName = parts.length > 1 ? parts[parts.length - 1] : "";
    setFirstName(fName);
    setLastName(lName);
    setPhone(f.phone || "");
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setForm({
      id: f.id,
      department: f.department,
      email: f.email,
      status: f.status,
      maxLoadHours: f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24),
      availability: f.availability || "",
      programs: f.programs || ["BSIT"],
    });
    setIsOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingFaculty(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setForm({
      id: `FAC-00${faculty.length + 1}`,
      department: "Information Technology",
      email: "",
      status: "Full-Time",
      maxLoadHours: 24,
      availability: "Monday-Friday: 08:00-17:00",
      programs: ["BSIT"],
    });
    setIsOpen(true);
  };

  // Requirement 4: First Name and Last Name Validation
  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setFirstNameError("Invalid. Please enter characters only.");
    } else {
      setFirstNameError(null);
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setLastNameError("Invalid. Please enter characters only.");
    } else {
      setLastNameError(null);
    }
  };

  // Requirement 3: Phone Number Validation
  const handlePhoneChange = (val: string) => {
    const filtered = val.replace(/[^0-9+\s\-()]/g, "");
    setPhone(filtered);
    if (val !== filtered) {
      setPhoneError("Invalid phone number. Please enter digits and valid phone characters only.");
    } else {
      setPhoneError(null);
    }
  };

  const executeDelete = async () => {
    if (!facultyToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/faculty/${encodeURIComponent(facultyToDelete.id)}`);
      toast.push("Faculty member deleted successfully", "success");
      addNotification({
        title: "Faculty Profile Removed",
        message: `${facultyToDelete.name} was removed from the academic faculty roster.`,
        type: "warning",
        link: "/faculty",
      });
      fetchFaculty();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete faculty member", "error");
    } finally {
      setLoading(false);
      setFacultyToDelete(null);
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
    if (isProgramHead) return;
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
      addNotification({
        title: "Faculty Availability Updated",
        message: `Teaching availability timesheet updated for ${selectedFacultyForAvail.name}.`,
        type: "info",
        link: "/faculty",
      });
      setAvailabilityModalOpen(false);
      fetchFaculty();
    } catch {
      toast.push("Failed to update availability", "error");
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.push("Only administrators can modify faculty profiles", "error");
      return;
    }
    if (!form.id) {
      toast.push("Employee ID is required", "error");
      return;
    }

    // Requirement 4: First Name & Last Name validation
    if (!firstName.trim()) {
      setFirstNameError("First Name is required");
      toast.push("First Name is required", "error");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(firstName.trim())) {
      setFirstNameError("Invalid. Please enter characters only.");
      toast.push("Invalid First Name. Please enter characters only.", "error");
      return;
    }

    if (!lastName.trim()) {
      setLastNameError("Last Name is required");
      toast.push("Last Name is required", "error");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(lastName.trim())) {
      setLastNameError("Invalid. Please enter characters only.");
      toast.push("Invalid Last Name. Please enter characters only.", "error");
      return;
    }

    // Requirement 3: Phone number validation
    if (phone.trim() && !/^\+?[0-9\s\-()]{7,15}$/.test(phone.trim())) {
      setPhoneError("Invalid phone number. Please enter digits and valid phone characters only.");
      toast.push("Invalid phone number format", "error");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    setLoading(true);
    try {
      const payload = {
        ...form,
        name: fullName,
        phone: phone.trim(),
      };

      if (editingFaculty) {
        await api.put(`/faculty/${encodeURIComponent(editingFaculty.id)}`, payload);
        toast.push("Faculty profile updated successfully", "success");
        addNotification({
          title: "Faculty Profile Updated",
          message: `Faculty record for ${fullName} (${form.department}) updated.`,
          type: "success",
          link: "/faculty",
        });
      } else {
        await api.post("/faculty", payload);
        toast.push("Faculty member added successfully", "success");
        addNotification({
          title: "New Faculty Registered",
          message: `${fullName} registered to ${form.department} faculty roster.`,
          type: "success",
          link: "/faculty",
        });
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
    const matchesProg = matchesProgram(entry.programs || entry.department);

    return matchesQuery && matchesStatus && matchesProg;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={
          isProgramHead
            ? `Program Faculty & Major Subject Instructors • ${selectedProgram.label}`
            : "Faculty & Availability Management"
        }
        description={
          isProgramHead
            ? `View instructors assigned to ${selectedProgram.label} (${selectedProgram.key || "ITP"}) major subjects, and inspect teaching availability for scheduling.`
            : "Maintain instructor profiles, full-time / part-time status, teaching load limits, and weekly availability schedules."
        }
        breadcrumbs={
          isProgramHead ? (
            <>
              <span>Home</span> <span>/</span> <span>{selectedProgram.shortLabel || "Program"}</span> <span>/</span> <strong>Faculty</strong>
            </>
          ) : (
            <>
              <span>Home</span> <span>/</span> <strong>Faculty</strong>
            </>
          )
        }
        actions={
          canEdit ? (
            <button
              className="action-button"
              type="button"
              onClick={handleOpenAdd}
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
                placeholder="Search name, department, ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
        </div>

        {fetching ? (
          <TableSkeleton rows={6} columns={6} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Faculty Name</th>
                  <th>Department / Programs</th>
                  <th>Status</th>
                  <th>Max Load / Availability</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px 16px" }}>
                      <p className="muted" style={{ margin: 0 }}>
                        {isProgramHead
                          ? `No faculty members found for ${selectedProgram.label}.`
                          : "No faculty records match the selected criteria."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--srcb-navy)" }}>
                          {formatSystemId(f.id)}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <strong>{f.name}</strong>
                          {f.email && (
                            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                              {f.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <span>{f.department}</span>
                          {f.programs && f.programs.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                              {f.programs.map((p) => (
                                <span key={p} className="pill" style={{ fontSize: "0.72rem" }}>
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${f.status === "Full-Time" ? "pill--success" : "pill--warning"}`}>
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>
                            {f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24)} hrs/wk
                          </span>
                          <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "var(--srcb-text-muted)" }}>
                            {f.availability
                              ? f.availability.split("|").length > 2
                                ? `${f.availability.split("|").length} Active Days Configured`
                                : f.availability
                              : "Standard Schedule"}
                          </p>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <Tooltip content="Manage Weekly Availability">
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Manage weekly availability for ${f.name}`}
                              onClick={() => openAvailabilityModal(f)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7" }}
                            >
                              <Clock size={16} />
                            </button>
                          </Tooltip>

                          {canEdit && (
                            <>
                              <Tooltip content="Edit Faculty Profile">
                                <button
                                  type="button"
                                  className="icon-button"
                                  aria-label={`Edit profile for ${f.name}`}
                                  onClick={() => handleEdit(f)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                                >
                                  <Edit2 size={16} />
                                </button>
                              </Tooltip>

                              <Tooltip content="Delete Faculty">
                                <button
                                  type="button"
                                  className="icon-button"
                                  aria-label={`Delete profile for ${f.name}`}
                                  onClick={() => setFacultyToDelete(f)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </Tooltip>
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
        )}
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
            <label htmlFor="facultyId">
              Employee ID <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="facultyId"
              value={form.id}
              disabled={!!editingFaculty}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              required
              aria-required="true"
            />
          </div>

          {/* Requirement 4: First Name & Last Name (Characters Only) */}
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field-group">
              <label htmlFor="facultyFirstName">
                First Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="facultyFirstName"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="e.g. Alan"
                required
                aria-required="true"
              />
              {firstNameError && (
                <p className="field-error-msg" role="alert">⚠️ {firstNameError}</p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="facultyLastName">
                Last Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="facultyLastName"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="e.g. Turing"
                required
                aria-required="true"
              />
              {lastNameError && (
                <p className="field-error-msg" role="alert">⚠️ {lastNameError}</p>
              )}
            </div>
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

          {/* Requirement 3: Phone Number Validation */}
          <div className="field-group">
            <label htmlFor="facultyPhone">Phone Contact</label>
            <input
              id="facultyPhone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="09171234567"
            />
            {phoneError && (
              <p className="field-error-msg" role="alert">⚠️ {phoneError}</p>
            )}
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
            <label htmlFor="facultyMaxLoad">Maximum Weekly Load (Hours)</label>
            <input
              id="facultyMaxLoad"
              type="number"
              value={form.maxLoadHours}
              onChange={(e) => setForm({ ...form, maxLoadHours: Number(e.target.value) || 24 })}
              min={1}
              max={40}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="cancel-button"
            onClick={() => {
              setIsOpen(false);
              setEditingFaculty(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Saving..." : editingFaculty ? "Update Profile" : "Register Faculty"}
          </button>
        </div>
      </Modal>

      {/* Availability Timesheet Grid Modal */}
      <Modal
        isOpen={availabilityModalOpen}
        title={selectedFacultyForAvail ? `Teaching Availability • ${selectedFacultyForAvail.name}` : "Teaching Availability"}
        description="Click or drag to toggle available teaching windows. Green blocks represent available teaching slots."
        onClose={() => setAvailabilityModalOpen(false)}
      >
        <div style={{ overflowX: "auto", padding: "8px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 12px", textAlign: "left", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  Time Slot
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    style={{
                      padding: "8px 12px",
                      textAlign: "center",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontWeight: 700,
                    }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot}>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontWeight: 600,
                      color: "var(--srcb-navy)",
                      border: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slot}
                  </td>
                  {DAYS.map((day) => {
                    const isSelected = selectedSlots[day]?.includes(slot);
                    return (
                      <td
                        key={`${day}-${slot}`}
                        onClick={() => handleSlotToggle(day, slot)}
                        style={{
                          padding: 6,
                          textAlign: "center",
                          cursor: isProgramHead ? "default" : "pointer",
                          border: "1px solid #e2e8f0",
                          backgroundColor: isSelected ? "#dcfce7" : "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            backgroundColor: isSelected ? "#16a34a" : "#e2e8f0",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="cancel-button"
            onClick={() => setAvailabilityModalOpen(false)}
          >
            {isProgramHead ? "Close" : "Cancel"}
          </button>
          {!isProgramHead && (
            <button
              type="button"
              className="action-button"
              onClick={saveAvailabilityFromModal}
            >
              Save Availability Schedule
            </button>
          )}
        </div>
      </Modal>

      {/* Delete Faculty Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(facultyToDelete)}
        title="Delete Faculty Profile"
        message={`Are you sure you want to delete ${facultyToDelete?.name} (${facultyToDelete?.id})? Active class schedules assigned to this faculty member will become unassigned.`}
        confirmLabel="Delete Faculty"
        variant="danger"
        loading={loading}
        onConfirm={executeDelete}
        onCancel={() => setFacultyToDelete(null)}
      />
    </motion.div>
  );
}
