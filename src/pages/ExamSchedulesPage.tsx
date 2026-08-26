import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { CardGridSkeleton } from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  DoorOpen,
  CheckCircle2,
} from "lucide-react";
import { api } from "../data/apiClient";
import { useProgramContext } from "../contexts/ProgramContext";
import type { ExamScheduleItem, ExamTerm, BuildingType, SectionItem, RoomItem, FacultyMember, SubjectItem } from "../types";

export function ExamSchedulesPage() {
  const [exams, setExams] = useState<ExamScheduleItem[]>([]);
  const [sectionsList, setSectionsList] = useState<SectionItem[]>([]);
  const [roomsList, setRoomsList] = useState<RoomItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [examToDelete, setExamToDelete] = useState<ExamScheduleItem | null>(null);
  const [query, setQuery] = useState("");
  const [termFilter, setTermFilter] = useState("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamScheduleItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canManage = role === "super_admin" || role === "admin" || role === "program_head";

  const [form, setForm] = useState({
    subject: "",
    subjectCode: "",
    examDate: "2026-10-15",
    time: "08:00 AM - 10:00 AM",
    synchronizedSections: [] as string[],
    term: "Midterm" as ExamTerm,
    room: "",
    building: "College Building" as BuildingType,
    proctor: "Unassigned",
    proctorId: "",
    program: selectedProgram.key || "BSIT",
  });

  const toast = useToast();

  const fetchExams = async () => {
    setFetching(true);
    try {
      const res = await api.get("/exams");
      setExams(res.data?.data || []);
    } catch {
      setExams([]);
    } finally {
      setFetching(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [sRes, rRes, fRes, subRes] = await Promise.all([
        api.get("/sections").catch(() => ({ data: { data: [] } })),
        api.get("/rooms").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
      ]);
      setSectionsList(sRes.data?.data || []);
      setRoomsList(rRes.data?.data || []);
      setFacultyList(fRes.data?.data || []);
      setSubjectsList(subRes.data?.data || []);
    } catch {
      // ignore
    }
  };

  const availableSubjects = useMemo(() => {
    if (role === "program_head") {
      return subjectsList.filter((s) => matchesProgram(s.program || s.department));
    }
    return subjectsList;
  }, [role, subjectsList, matchesProgram]);

  const availableSections = useMemo(() => {
    if (role === "program_head") {
      return sectionsList.filter((s) => matchesProgram(s.program || s.course));
    }
    return sectionsList;
  }, [role, sectionsList, matchesProgram]);

  const availableFaculty = useMemo(() => {
    if (role === "program_head") {
      return facultyList.filter((f) => matchesProgram(f.programs || f.department));
    }
    return facultyList;
  }, [role, facultyList, matchesProgram]);

  useEffect(() => {
    fetchExams();
    fetchDependencies();
  }, []);

  const handleSubjectSelect = (code: string) => {
    const sub = availableSubjects.find((s) => s.code === code) || subjectsList.find((s) => s.code === code);
    if (!sub) return;
    // Auto-discover all sections associated with this subject / program
    const matchingSections = availableSections
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

  const executeDelete = async () => {
    if (!canManage || !examToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/exams/${encodeURIComponent(examToDelete.id)}`);
      toast.push("Examination schedule removed successfully", "success");
      fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to remove examination schedule", "error");
    } finally {
      setLoading(false);
      setExamToDelete(null);
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

  const storedTeacherId = window.localStorage.getItem("teacherId") || "";
  const userName = window.localStorage.getItem("userName") || "";
  const [assignedFilter, setAssignedFilter] = useState<"All" | "Mine">("All");

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
    const matchesProg = role === "teacher" ? true : matchesProgram(e.program || selectedProgram.shortLabel);

    const isMine =
      (storedTeacherId && (String(e.proctorId) === storedTeacherId)) ||
      (userName && e.proctor && e.proctor.toLowerCase().includes(userName.toLowerCase()));

    const matchesAssignment = assignedFilter === "All" || (assignedFilter === "Mine" ? isMine : true);

    return matchesSearch && matchesTerm && matchesProg && matchesAssignment;
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
                const firstSub = availableSubjects[0] || subjectsList[0];
                const firstSec = availableSections[0] || sectionsList[0];
                const firstFac = availableFaculty[0] || facultyList[0];
                setForm({
                  term: "Midterm",
                  examDate: "2026-10-15",
                  time: "08:00 AM - 10:00 AM",
                  subjectCode: firstSub?.code || "",
                  subject: firstSub?.name || "",
                  synchronizedSections: firstSec?.section ? [firstSec.section] : ["BSIT 1-A"],
                  room: roomsList[0]?.number || "COL-101",
                  building: "College Building",
                  proctor: firstFac?.name || "Mr. Juan Dela Cruz",
                  proctorId: firstFac?.id || "FAC-001",
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
            {role === "teacher" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
                Duties:
                <select
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value as "All" | "Mine")}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                >
                  <option value="All">All Exam Sessions</option>
                  <option value="Mine">My Assigned Duties Only</option>
                </select>
              </label>
            )}
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

        {fetching ? (
          <CardGridSkeleton count={6} />
        ) : (
          <div className="grid-3" style={{ marginTop: 12 }}>
            {filteredExams.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: "1 / -1", padding: "36px 16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No examination schedules found matching your filters.</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                  Try adjusting your search terms or selecting "All Examination Terms".
                </p>
                {(query || termFilter !== "All" || assignedFilter !== "All") && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setQuery("");
                      setTermFilter("All");
                      setAssignedFilter("All");
                    }}
                    style={{ marginTop: 12, fontSize: "0.8rem" }}
                  >
                    Clear Search & Filters
                  </button>
                )}
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
                        className="icon-button"
                        title="Edit Exam"
                        aria-label={`Edit examination schedule for ${exam.subjectCode}`}
                        onClick={() => handleEdit(exam)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Delete Exam"
                        aria-label={`Delete examination schedule for ${exam.subjectCode}`}
                        onClick={() => setExamToDelete(exam)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="pill pill--royal">{exam.term} Exam</span>
                    <span className="pill">{exam.subjectCode}</span>
                    {role === "teacher" &&
                      ((storedTeacherId && String(exam.proctorId) === storedTeacherId) ||
                        (userName && exam.proctor && exam.proctor.toLowerCase().includes(userName.toLowerCase()))) && (
                        <span className="pill pill--emerald" style={{ fontSize: "0.72rem" }}>
                          Assigned to You
                        </span>
                      )}
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
        )}
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
            <label htmlFor="examSubject">
              Subject Code & Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              id="examSubject"
              value={form.subjectCode}
              onChange={(e) => handleSubjectSelect(e.target.value)}
              required
              aria-required="true"
            >
              <option value="">Select subject</option>
              {availableSubjects.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} - {sub.name} ({sub.department})
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="examTerm">Examination Term</label>
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
            <label htmlFor="examDate">
              Exam Date <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="examDate"
              type="date"
              value={form.examDate}
              onChange={(e) => setForm({ ...form, examDate: e.target.value })}
              required
              aria-required="true"
            />
          </div>

          <div className="field-group">
            <label htmlFor="examTime">
              Time Slot <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="examTime"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              placeholder="e.g. 08:00 AM - 10:00 AM"
              required
              aria-required="true"
            />
          </div>

          <div className="field-group">
            <label htmlFor="examRoom">
              Assigned Room & Venue <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="examRoom"
              placeholder="e.g. COMLAB-1, COL-AVR"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="examProctor">Assigned Proctor / Faculty</label>
            <select
              id="examProctor"
              value={form.proctorId}
              onChange={(e) => {
                const fac = availableFaculty.find((f) => f.id === e.target.value);
                setForm({
                  ...form,
                  proctorId: e.target.value,
                  proctor: fac ? fac.name : "",
                });
              }}
            >
              <option value="">Select proctor</option>
              {availableFaculty.map((f) => (
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
                background: "var(--srcb-surface)",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--srcb-border)",
              }}
            >
              {availableSections.map((sec) => {
                const checked = form.synchronizedSections.includes(sec.section);
                return (
                  <label
                    key={sec.section}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      padding: "6px 10px",
                      background: checked ? "rgba(56, 189, 248, 0.12)" : "transparent",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                      fontWeight: checked ? 700 : 500,
                      color: checked ? "#0284c7" : "var(--srcb-text)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleSection(sec.section)}
                    />
                    <span>{sec.section} ({sec.students} sts)</span>
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

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(examToDelete)}
        title="Remove Examination Schedule"
        variant="danger"
        confirmLabel="Delete Exam Schedule"
        loading={loading}
        onCancel={() => setExamToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to remove the <strong>{examToDelete?.term} Examination</strong> schedule for <strong>{examToDelete?.subjectCode} - {examToDelete?.subject}</strong> on {examToDelete?.examDate}?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626" }}>
              ⚠️ Synchronized sections ({examToDelete?.synchronizedSections?.join(", ")}) and the assigned proctor ({examToDelete?.proctor}) will be released.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
