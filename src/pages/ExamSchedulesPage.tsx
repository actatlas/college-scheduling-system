import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Calendar, Clock, DoorOpen, Users, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import type { ExamScheduleItem, ExamTerm, BuildingType } from "../types";

export function ExamSchedulesPage() {
  const [exams, setExams] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [termFilter, setTermFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamScheduleItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canManage = role === "super_admin" || role === "admin" || role === "program_head";

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

  const [form, setForm] = useState({
    term: "Midterm" as ExamTerm,
    examDate: "2026-10-15",
    time: "08:00-10:00",
    subjectCode: "",
    subject: "",
    synchronizedSections: [] as string[],
    room: "",
    building: "College Building" as BuildingType,
    proctor: "",
    proctorId: "",
    program: selectedProgram.key || "BSIT",
  });

  const toast = useToast();

  const fetchExams = async () => {
    try {
      const res = await api.get("/exams");
      setExams(res.data?.data || []);
    } catch {
      setExams([]);
    }
  };

  useEffect(() => {
    fetchExams();
    api.get("/faculty").then((res: any) => setFacultyList(res.data?.data || [])).catch(() => setFacultyList([]));
    api.get("/subjects").then((res: any) => setSubjectsList(res.data?.data || [])).catch(() => setSubjectsList([]));
    api.get("/rooms").then((res: any) => setRoomsList(res.data?.data || [])).catch(() => setRoomsList([]));
    api.get("/sections").then((res: any) => setSectionsList(res.data?.data || [])).catch(() => setSectionsList([]));
  }, []);

  const handleSubjectSelect = (code: string) => {
    const sub = subjectsList.find((s) => s.code === code);
    if (!sub) return;
    // Auto-discover all sections associated with this subject / program
    const matchingSections = sectionsList
      .filter((sec) => !sub.program || sec.program === sub.program || sec.course === sub.program)
      .map((sec) => sec.section);

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      program: sub.program || prev.program,
      synchronizedSections: matchingSections.length > 0 ? matchingSections : prev.synchronizedSections,
    }));
  };

  const handleToggleSection = (secName: string) => {
    setForm((prev) => {
      const exists = prev.synchronizedSections.includes(secName);
      const next = exists
        ? prev.synchronizedSections.filter((s) => s !== secName)
        : [...prev.synchronizedSections, secName];
      return { ...prev, synchronizedSections: next };
    });
  };

  const handleEdit = (item: ExamScheduleItem) => {
    if (!canManage) return;
    setEditingExam(item);
    setForm({
      term: item.term,
      examDate: item.examDate,
      time: item.time,
      subjectCode: item.subjectCode,
      subject: item.subject,
      synchronizedSections: item.synchronizedSections || [],
      room: item.room,
      building: item.building as BuildingType,
      proctor: item.proctor,
      proctorId: item.proctorId || "",
      program: item.program || selectedProgram.key || "BSIT",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm("Delete this examination schedule?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/exams/${encodeURIComponent(id)}`);
      toast.push("Examination schedule removed", "success");
      fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to remove examination schedule", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!form.subjectCode || !form.examDate || !form.time || !form.room) {
      toast.push("Please complete required exam fields (Subject, Date, Time, Room)", "error");
      return;
    }
    if (form.synchronizedSections.length === 0) {
      toast.push("Select at least one section taking this synchronized examination", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        color:
          form.subjectCode.startsWith("IT")
            ? "#0284c7"
            : form.subjectCode.startsWith("BA")
              ? "#8b5cf6"
              : "#f59e0b",
      };

      if (editingExam) {
        await api.put(`/exams/${encodeURIComponent(editingExam.id)}`, payload);
        toast.push("Examination schedule updated", "success");
      } else {
        await api.post("/exams", payload);
        toast.push("Synchronized exam schedule created", "success");
      }

      setIsOpen(false);
      setEditingExam(null);
      fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save examination schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch = [
      e.subject,
      e.subjectCode,
      e.room,
      e.building,
      e.proctor,
      e.term,
      ...(e.synchronizedSections || []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesTerm = termFilter === "All" || e.term === termFilter;
    const matchesProg = matchesProgram(e.program || selectedProgram.shortLabel);

    return matchesSearch && matchesTerm && matchesProg;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Examination Schedules"
        description="Plan and synchronize institutional examination sessions where multiple student cohorts taking the same subject share the same exam day and time."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Exams</strong>
          </>
        }
        helpText="Students taking the same subject across sections can be assigned simultaneous exam slots across College, SHS, and JHS rooms."
        actions={
          canManage ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingExam(null);
                setForm({
                  term: "Midterm",
                  examDate: "2026-10-15",
                  time: "08:00-10:00",
                  subjectCode: subjectsList[0]?.code || "",
                  subject: subjectsList[0]?.name || "",
                  synchronizedSections: [sectionsList[0]?.section || "BSIT 1-A"],
                  room: roomsList[0]?.number || "COL-101",
                  building: (roomsList[0]?.building as BuildingType) || "College Building",
                  proctor: facultyList[0]?.name || "Mr. Juan Dela Cruz",
                  proctorId: facultyList[0]?.id || "FAC-001",
                  program: selectedProgram.key || "BSIT",
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Schedule Exam
            </button>
          ) : undefined
        }
      />

      {/* Overview & Filters */}
      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="eyebrow">Synchronized Examination Schedule</p>
            <h3>Active Examination Timetable</h3>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Term:
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="All">All Terms</option>
                <option value="Prelim">Prelim</option>
                <option value="Midterm">Midterm</option>
                <option value="Semi-Final">Semi-Final</option>
                <option value="Final">Final</option>
              </select>
            </label>
            <label className="topbar__search" aria-label="Search exams">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subject, section, room..."
              />
            </label>
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: 12 }}>
          {filteredExams.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              No examination schedules recorded matching your filters.
            </div>
          ) : (
            filteredExams.map((exam) => (
              <article
                className="card"
                key={exam.id}
                style={{
                  position: "relative",
                  borderLeft: `4px solid ${exam.color || "#0d5499"}`,
                }}
              >
                {canManage && (
                  <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      title="Edit Exam"
                      onClick={() => handleEdit(exam)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      title="Delete Exam"
                      onClick={() => handleDelete(exam.id)}
                      disabled={deletingId === exam.id}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="pill pill--royal">{exam.term} Exam</span>
                  <span className="pill">{exam.subjectCode}</span>
                </div>

                <h3 style={{ marginTop: 8, fontSize: "1.1rem" }}>{exam.subject}</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                    <Calendar size={15} color="#0d5499" />
                    <strong>Date:</strong> {exam.examDate}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                    <Clock size={15} color="#0d5499" />
                    <strong>Time:</strong> {exam.time}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                    <DoorOpen size={15} color="#0d5499" />
                    <strong>Venue:</strong> {exam.room} ({exam.building})
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                    <Users size={15} color="#0d5499" />
                    <strong>Proctor:</strong> {exam.proctor}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                    Synchronized Cohorts:
                  </p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {(exam.synchronizedSections || []).map((sec) => (
                      <span key={sec} className="pill pill--navy" style={{ fontSize: "0.75rem" }}>
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Schedule Exam Modal */}
      <Modal
        isOpen={isOpen && canManage}
        title={editingExam ? "Edit Examination Schedule" : "Create Synchronized Exam"}
        description="Synchronize multiple class sections taking the same subject on the same examination date and timeslot."
        onClose={() => {
          setIsOpen(false);
          setEditingExam(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="examTerm">Exam Term</label>
            <select
              id="examTerm"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value as ExamTerm })}
            >
              <option value="Prelim">Prelim</option>
              <option value="Midterm">Midterm</option>
              <option value="Semi-Final">Semi-Final</option>
              <option value="Final">Final</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="examSubject">Subject</label>
            <select
              id="examSubject"
              value={form.subjectCode}
              onChange={(e) => handleSubjectSelect(e.target.value)}
            >
              <option value="">Select subject</option>
              {subjectsList.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} - {sub.name} ({sub.department})
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="examDate">Exam Date</label>
            <input
              id="examDate"
              type="date"
              value={form.examDate}
              onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="examTime">Time Slot</label>
            <select
              id="examTime"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            >
              <option value="08:00-10:00">08:00 AM - 10:00 AM</option>
              <option value="10:30-12:30">10:30 AM - 12:30 PM</option>
              <option value="01:00-03:00">01:00 PM - 03:00 PM</option>
              <option value="03:30-05:30">03:30 PM - 05:30 PM</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="examBuilding">Building</label>
            <select
              id="examBuilding"
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value as BuildingType })}
            >
              <option value="College Building">College Building</option>
              <option value="SHS Building">Senior High School (SHS) Building</option>
              <option value="JHS Building">Junior High School (JHS) Building</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="examRoom">Room / Hall</label>
            <input
              id="examRoom"
              placeholder="e.g. COMLAB-1 & COMLAB-2, COL-AVR"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
          </div>

          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="examProctor">Faculty Proctor</label>
            <select
              id="examProctor"
              value={form.proctorId}
              onChange={(e) => {
                const fac = facultyList.find((f) => f.id === e.target.value);
                setForm({
                  ...form,
                  proctorId: e.target.value,
                  proctor: fac ? fac.name : "",
                });
              }}
            >
              <option value="">Select proctor</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.department} - {f.status})
                </option>
              ))}
            </select>
          </div>

          {/* Synchronized Sections Selection */}
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label style={{ marginBottom: 6, display: "block" }}>
              Synchronized Student Sections (Taking Exam Together):
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8,
                background: "#f8fafc",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              {sectionsList.map((sec) => {
                const checked = form.synchronizedSections.includes(sec.section);
                return (
                  <label
                    key={sec.section}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      padding: "4px 8px",
                      background: checked ? "#e0f2fe" : "#ffffff",
                      borderRadius: 6,
                      border: `1px solid ${checked ? "#0284c7" : "#cbd5e1"}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleSection(sec.section)}
                    />
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                      {sec.section} ({sec.students} sts)
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="table-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsOpen(false);
              setEditingExam(null);
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
            <CheckCircle2 size={16} />
            {loading ? "Saving…" : "Save Exam Schedule"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
