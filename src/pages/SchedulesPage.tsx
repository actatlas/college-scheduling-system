import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { storage } from "../data/storage";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import {
  Plus,
  Search,
  CalendarDays,
  ListFilter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { validateScheduleSlot } from "../utils/scheduling";
import type { ClassScheduleItem, ClassModality, BuildingType } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  "08:00-09:30",
  "09:30-11:00",
  "10:00-11:30",
  "11:00-12:30",
  "01:00-02:30",
  "02:30-04:00",
  "04:00-05:30",
  "05:30-07:00",
];

export function SchedulesPage() {
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);

  const toast = useToast();
  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const currentUserName = localStorage.getItem("userName") || "";
  const currentTeacherId = localStorage.getItem("teacherId") || "";

  const canCreate = role === "super_admin" || role === "admin" || role === "program_head";

  const facultyList = useMemo(() => storage.getFaculty(), []);
  const subjectsList = useMemo(() => storage.getSubjects(), []);
  const roomsList = useMemo(() => storage.getRooms(), []);
  const sectionsList = useMemo(() => storage.getSections(), []);

  const [form, setForm] = useState({
    day: "Monday",
    time: "08:00-09:30",
    subjectCode: "",
    subject: "",
    section: "",
    facultyId: "",
    faculty: "",
    room: "COL-101",
    building: "College Building" as BuildingType,
    modality: "Face-to-Face" as ClassModality,
    onlineLink: "",
    isMajor: true,
    program: selectedProgram.key || "BSIT",
  });

  const [validationFeedback, setValidationFeedback] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>({ valid: true, errors: [], warnings: [] });

  const fetchSchedules = async () => {
    try {
      const res = await api.get("/schedules");
      setScheduleItems(res.data?.data || []);
    } catch {
      setScheduleItems([]);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Filter subjects for current user scope (Program Heads schedule major subjects for their program)
  const availableSubjects = useMemo(() => {
    if (role === "program_head") {
      return subjectsList.filter((s) => matchesProgram(s.program || s.department));
    }
    return subjectsList;
  }, [role, subjectsList, selectedProgram.key, matchesProgram]);

  // When subject changes in form, auto-fill major tag, default instructor, and program
  const handleSubjectChange = (code: string) => {
    const sub = subjectsList.find((s) => s.code === code);
    if (!sub) return;

    const defInstructor = facultyList.find((f) => f.id === sub.instructorId || f.name === sub.instructor);
    const matchingSection = sectionsList.find((sec) => !sub.program || sec.program === sub.program || sec.course === sub.program);

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      isMajor: Boolean(sub.isMajor),
      program: sub.program || prev.program,
      facultyId: defInstructor ? defInstructor.id : prev.facultyId,
      faculty: defInstructor ? defInstructor.name : prev.faculty,
      section: matchingSection ? matchingSection.section : prev.section,
    }));
  };

  // Real-time conflict validation when editing form fields
  useEffect(() => {
    if (!isOpen) return;
    const result = validateScheduleSlot({
      id: editingSchedule?.id,
      day: form.day,
      time: form.time,
      room: form.room,
      building: form.building,
      faculty: form.faculty,
      facultyId: form.facultyId,
      section: form.section,
      modality: form.modality,
    });
    setValidationFeedback(result);
  }, [form.day, form.time, form.room, form.building, form.faculty, form.facultyId, form.section, form.modality, isOpen, editingSchedule]);

  const handleEdit = (item: ClassScheduleItem) => {
    if (!canCreate) return;
    setEditingSchedule(item);
    setForm({
      day: item.day,
      time: item.time,
      subjectCode: item.subjectCode || "",
      subject: item.subject,
      section: item.section,
      facultyId: item.facultyId || "",
      faculty: item.faculty,
      room: item.room,
      building: item.building as BuildingType,
      modality: item.modality || "Face-to-Face",
      onlineLink: item.onlineLink || "",
      isMajor: Boolean(item.isMajor),
      program: item.program || selectedProgram.key || "BSIT",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canCreate) return;
    if (!window.confirm("Remove this scheduled class block?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/schedules/${encodeURIComponent(id)}`);
      toast.push("Class schedule removed", "success");
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete schedule", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!form.subjectCode || !form.section || !form.faculty) {
      toast.push("Please select Subject, Section, and Faculty", "error");
      return;
    }

    if (!validationFeedback.valid && validationFeedback.errors.length > 0) {
      toast.push(validationFeedback.errors[0], "error");
      return;
    }

    setLoading(true);
    try {
      const payload: Omit<ClassScheduleItem, "id"> & { id?: string } = {
        id: editingSchedule?.id,
        day: form.day,
        time: form.time,
        subjectCode: form.subjectCode,
        subject: form.subject,
        section: form.section,
        faculty: form.faculty,
        facultyId: form.facultyId,
        room: form.modality === "Online" ? (form.room || "Virtual Room") : form.room,
        building: form.building,
        modality: form.modality,
        onlineLink: form.onlineLink,
        isMajor: form.isMajor,
        program: form.program,
        color:
          form.modality === "Online"
            ? "#059669"
            : form.isMajor
              ? "#0284c7"
              : "#f59e0b",
        status: "Confirmed",
      };

      if (editingSchedule) {
        await api.put(`/schedules/${encodeURIComponent(editingSchedule.id)}`, payload);
        toast.push("Class schedule updated", "success");
      } else {
        await api.post("/schedules", payload);
        toast.push("Class schedule created successfully", "success");
      }

      setIsOpen(false);
      setEditingSchedule(null);
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter schedules based on role and active search/filters
  const visibleSchedules = useMemo(() => {
    return scheduleItems.filter((item) => {
      // Role filtering
      if (role === "teacher") {
        const isMatch =
          (currentTeacherId && item.facultyId === currentTeacherId) ||
          item.faculty.toLowerCase().includes(currentUserName.toLowerCase());
        if (!isMatch) return false;
      } else if (role === "program_head") {
        if (!matchesProgram(item.program || selectedProgram.shortLabel)) {
          return false;
        }
      }

      // Day filter
      if (selectedDayFilter !== "All" && item.day !== selectedDayFilter) {
        return false;
      }

      // Search query
      if (query.trim()) {
        const str = [
          item.subject,
          item.subjectCode,
          item.faculty,
          item.room,
          item.building,
          item.section,
          item.modality,
        ]
          .join(" ")
          .toLowerCase();
        if (!str.includes(query.toLowerCase())) return false;
      }

      return true;
    });
  }, [scheduleItems, role, currentTeacherId, currentUserName, selectedDayFilter, query, selectedProgram.key, matchesProgram]);

  // Selected faculty info for part-time availability view in modal
  const selectedFacultyMember = useMemo(() => {
    return facultyList.find((f) => f.id === form.facultyId);
  }, [facultyList, form.facultyId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={
          role === "teacher"
            ? "My Assigned Class Schedules"
            : role === "program_head"
              ? "Major Subjects Class Scheduling"
              : "Institutional Class Schedules"
        }
        description={
          role === "teacher"
            ? "View your assigned face-to-face and online teaching blocks across campus buildings."
            : "Manually schedule, monitor, and adjust classes with real-time faculty availability and room clash prevention."
        }
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Schedules</strong>
          </>
        }
        helpText="Supports Face-to-Face and Online classes, College/SHS/JHS room assignments, and part-time availability checking."
        actions={
          canCreate ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSchedule(null);
                const firstSub = availableSubjects[0] || subjectsList[0];
                const defFac = facultyList.find((f) => f.id === firstSub?.instructorId) || facultyList[0];
                const defSec = sectionsList.find((s) => s.program === firstSub?.program) || sectionsList[0];
                setForm({
                  day: "Monday",
                  time: "08:00-09:30",
                  subjectCode: firstSub?.code || "",
                  subject: firstSub?.name || "",
                  section: defSec?.section || "BSIT 1-A",
                  facultyId: defFac?.id || "",
                  faculty: defFac?.name || "",
                  room: "COL-101",
                  building: "College Building",
                  modality: "Face-to-Face",
                  onlineLink: "",
                  isMajor: Boolean(firstSub?.isMajor),
                  program: firstSub?.program || selectedProgram.key || "BSIT",
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Manual Schedule Entry
            </button>
          ) : undefined
        }
      />

      {/* Control Bar */}
      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Class Timetable</p>
            <h3>Scheduled Classes ({visibleSchedules.length})</h3>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* View Mode Switcher */}
            <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 8, padding: 2 }}>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "grid" ? "#ffffff" : "transparent",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  color: viewMode === "grid" ? "#0d5499" : "#64748b",
                  boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <CalendarDays size={14} style={{ display: "inline", marginRight: 4 }} />
                Weekly Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "list" ? "#ffffff" : "transparent",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  color: viewMode === "list" ? "#0d5499" : "#64748b",
                  boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <ListFilter size={14} style={{ display: "inline", marginRight: 4 }} />
                List View
              </button>
            </div>

            {/* Day Filter */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Day:
              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="All">All Days (Mon-Sat)</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            {/* Search Input */}
            <label className="topbar__search" aria-label="Search schedules">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subject, faculty, room, section..."
              />
            </label>
          </div>
        </div>

        {/* View Mode: Weekly Matrix Grid */}
        {viewMode === "grid" && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table" style={{ textAlign: "center" }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Time Slot</th>
                  {DAYS.map((d) => (
                    <th key={d} style={{ minWidth: 150 }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td style={{ fontWeight: 600, fontSize: "0.8rem", color: "#1e293b", background: "#f8fafc" }}>
                      {slot}
                    </td>
                    {DAYS.map((day) => {
                      const matched = visibleSchedules.filter(
                        (item) => item.day === day && item.time === slot
                      );
                      return (
                        <td key={`${day}-${slot}`} style={{ verticalAlign: "top", padding: 6 }}>
                          {matched.length === 0 ? (
                            <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>—</span>
                          ) : (
                            matched.map((item) => (
                              <div
                                key={item.id}
                                style={{
                                  background: item.modality === "Online" ? "#ecfdf5" : "#f0f9ff",
                                  borderLeft: `4px solid ${item.color || "#0284c7"}`,
                                  borderRadius: 6,
                                  padding: "6px 8px",
                                  marginBottom: 6,
                                  textAlign: "left",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                                    {item.subjectCode}
                                  </span>
                                  <span
                                    className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                                  >
                                    {item.modality}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#334155", marginTop: 2, fontWeight: 500 }}>
                                  {item.subject}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                                  <strong>Sec:</strong> {item.section}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  <strong>Room:</strong> {item.room} ({item.building.split(" ")[0]})
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#0d5499", fontWeight: 600 }}>
                                  👨‍🏫 {item.faculty}
                                </div>

                                {item.modality === "Online" && item.onlineLink && (
                                  <a
                                    href={item.onlineLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#059669",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                      marginTop: 4,
                                      textDecoration: "underline",
                                    }}
                                  >
                                    <ExternalLink size={12} /> Join Class
                                  </a>
                                )}

                                {canCreate && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(item)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item.id)}
                                      disabled={deletingId === item.id}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode: Filterable List View */}
        {viewMode === "list" && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day & Time</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Instructor</th>
                  <th>Modality & Venue</th>
                  <th>Classification</th>
                  {canCreate && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={canCreate ? 7 : 6}>
                      <div className="empty-state">No scheduled classes found.</div>
                    </td>
                  </tr>
                ) : (
                  visibleSchedules.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.day}</strong>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.time}</div>
                      </td>
                      <td>
                        <strong>{item.subject}</strong>
                        <div style={{ fontSize: "0.75rem", color: "#0284c7" }}>{item.subjectCode}</div>
                      </td>
                      <td>
                        <span className="pill pill--navy">{item.section}</span>
                      </td>
                      <td>{item.faculty}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span
                            className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--slate"}`}
                            style={{ alignSelf: "flex-start" }}
                          >
                            {item.modality}
                          </span>
                          <span style={{ fontSize: "0.8rem" }}>
                            {item.room} ({item.building})
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${item.isMajor ? "pill--royal" : "pill--slate"}`}>
                          {item.isMajor ? "Major" : "Gen Ed"}
                        </span>
                      </td>
                      {canCreate && (
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button
                              type="button"
                              className="icon-button"
                              title="Edit Class"
                              onClick={() => handleEdit(item)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Delete Class"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual Class Schedule Modal */}
      <Modal
        isOpen={isOpen && canCreate}
        title={editingSchedule ? "Edit Class Schedule Block" : "Manual Class Schedule Entry"}
        description="Allocate day, time, subject, section, room, instructor, and modality (Face-to-Face vs Online)."
        onClose={() => {
          setIsOpen(false);
          setEditingSchedule(null);
        }}
      >
        <div className="form-grid">
          {/* Day & Time */}
          <div className="field-group">
            <label htmlFor="schedDay">Teaching Day</label>
            <select
              id="schedDay"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="schedTime">Time Slot</label>
            <select
              id="schedTime"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="schedSubject">Academic Subject</label>
            <select
              id="schedSubject"
              value={form.subjectCode}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="">Select subject</option>
              {availableSubjects.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} - {sub.name} ({sub.isMajor ? "Major" : "Gen Ed"} · {sub.program || sub.department})
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="field-group">
            <label htmlFor="schedSection">Student Section</label>
            <select
              id="schedSection"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              <option value="">Select section</option>
              {sectionsList.map((sec) => (
                <option key={sec.section} value={sec.section}>
                  {sec.section} ({sec.students} students)
                </option>
              ))}
            </select>
          </div>

          {/* Faculty / Instructor */}
          <div className="field-group">
            <label htmlFor="schedFaculty">Instructor</label>
            <select
              id="schedFaculty"
              value={form.facultyId}
              onChange={(e) => {
                const fac = facultyList.find((f) => f.id === e.target.value);
                setForm({
                  ...form,
                  facultyId: e.target.value,
                  faculty: fac ? fac.name : "",
                });
              }}
            >
              <option value="">Select instructor</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.status} · {f.department})
                </option>
              ))}
            </select>
          </div>

          {/* Modality: Face-to-Face vs Online */}
          <div className="field-group">
            <label htmlFor="schedModality">Teaching Modality</label>
            <select
              id="schedModality"
              value={form.modality}
              onChange={(e) => setForm({ ...form, modality: e.target.value as ClassModality })}
            >
              <option value="Face-to-Face">🏫 Face-to-Face (On-Campus Room)</option>
              <option value="Online">🌐 Online (Virtual Room / Meet Link)</option>
            </select>
          </div>

          {/* Campus Building & Room (College / SHS / JHS) */}
          <div className="field-group">
            <label htmlFor="schedBuilding">Campus Building</label>
            <select
              id="schedBuilding"
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value as BuildingType })}
            >
              <option value="College Building">College Building</option>
              <option value="SHS Building">Senior High School (SHS) Building</option>
              <option value="JHS Building">Junior High School (JHS) Building</option>
            </select>
          </div>

          {form.modality === "Face-to-Face" ? (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="schedRoom">Assigned Classroom / Lab</label>
              <select
                id="schedRoom"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
              >
                {roomsList
                  .filter((r) => r.building.toLowerCase().includes(form.building.split(" ")[0].toLowerCase()))
                  .map((r) => (
                    <option key={r.number} value={r.number}>
                      {r.number} - {r.type} (Capacity: {r.capacity})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="schedOnlineLink">Virtual Meeting Link / Room Info</label>
              <input
                id="schedOnlineLink"
                placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom Link"
                value={form.onlineLink}
                onChange={(e) => setForm({ ...form, onlineLink: e.target.value })}
              />
            </div>
          )}

          {/* Part-Time Instructor Availability Feedback */}
          {selectedFacultyMember && selectedFacultyMember.status === "Part-Time" && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 12,
                background: "#fef3c7",
                borderRadius: 8,
                border: "1px solid #fde68a",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#92400e" }}>
                <Clock size={16} />
                <span>Part-Time Instructor Availability Registered:</span>
              </div>
              <p style={{ marginTop: 4, color: "#78350f" }}>
                {selectedFacultyMember.availability || "No specific hours set."}
              </p>
            </div>
          )}

          {/* Real-time Conflict Diagnostics */}
          {validationFeedback.errors.length > 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 12,
                background: "#fee2e2",
                borderRadius: 8,
                border: "1px solid #fecaca",
                fontSize: "0.85rem",
                color: "#991b1b",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <AlertTriangle size={16} />
                <span>Schedule Conflict Detected:</span>
              </div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {validationFeedback.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validationFeedback.warnings.length > 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 12,
                background: "#fffbeb",
                borderRadius: 8,
                border: "1px solid #fde68a",
                fontSize: "0.85rem",
                color: "#b45309",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <AlertTriangle size={16} />
                <span>Advisory Notice:</span>
              </div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {validationFeedback.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="table-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsOpen(false);
              setEditingSchedule(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading || (!validationFeedback.valid && validationFeedback.errors.length > 0)}
            onClick={handleSave}
          >
            <CheckCircle2 size={16} />
            {loading ? "Saving…" : "Confirm Schedule Block"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
