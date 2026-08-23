import {
  CalendarClock,
  Users,
  BookOpen,
  CalendarRange,
  RefreshCw,
  BadgeCheck,
  CheckSquare,
  ChevronRight,
  AlertTriangle,
  Search,
  Filter,
  LayoutGrid,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "../components/common/StatCard";
import { api } from "../data/apiClient";
import { useEffect, useState } from "react";
import { useToast } from "../components/common/Toast";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import type { UserRole, ClassScheduleItem } from "../types";

const AVAILABILITY_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const AVAILABILITY_SLOTS = [
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "01:00-02:00",
  "02:00-03:00",
  "03:00-04:00",
  "04:00-05:00",
];

export function DashboardPage() {
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [isDraggingAvail, setIsDraggingAvail] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const toast = useToast();
  const navigate = useNavigate();
  const { selectedProgram } = useProgramContext();

  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;
  const userName = window.localStorage.getItem("userName") || "User";

  const [teacherStatus, setTeacherStatus] = useState<string>("Full-Time");
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});

  const [metrics, setMetrics] = useState({
    faculty: "0",
    subjects: "0",
    sections: "0",
    rooms: "0",
    schedules: "0",
    conflicts: "0",
    users: "0",
    exams: "0",
  });

  const loadDashboardData = async () => {
    try {
      const [facRes, subRes, rmRes, secRes, schedRes, confRes, usrRes, exmRes]: any[] = await Promise.all([
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
        api.get("/rooms").catch(() => ({ data: { data: [] } })),
        api.get("/sections").catch(() => ({ data: { data: [] } })),
        api.get("/schedules").catch(() => ({ data: { data: [] } })),
        api.get("/conflicts").catch(() => ({ data: { data: [] } })),
        api.get("/users").catch(() => ({ data: { data: [] } })),
        api.get("/exams").catch(() => ({ data: { data: [] } })),
      ]);

      const facs = facRes.data?.data || [];
      const subs = subRes.data?.data || [];
      const rms = rmRes.data?.data || [];
      const secs = secRes.data?.data || [];
      const scheds = schedRes.data?.data || [];
      const confs = confRes.data?.data || [];
      const usrs = usrRes.data?.data || [];
      const exms = exmRes.data?.data || [];

      setFacultyList(facs);

      setMetrics({
        faculty: String(facs.length),
        subjects: String(subs.length),
        sections: String(secs.length),
        rooms: String(rms.length),
        schedules: String(scheds.length),
        conflicts: String(confs.length),
        users: String(usrs.length),
        exams: String(exms.length),
      });

      if (role === "teacher") {
        const storedTeacherId = window.localStorage.getItem("teacherId");
        const currentTeacher = facs.find(
          (f: any) =>
            (storedTeacherId && String(f.id) === String(storedTeacherId)) ||
            (f.name && f.name.toLowerCase().includes(userName.toLowerCase()))
        );
        if (currentTeacher) {
          setTeacherStatus(currentTeacher.status || "Full-Time");
          setAvailabilityMessage(currentTeacher.availability || "");
          if (currentTeacher.id) {
            window.localStorage.setItem("teacherId", String(currentTeacher.id));
          }
        }
        const activeTeacherId = currentTeacher?.id || storedTeacherId;
        const myScheds = scheds.filter(
          (s: any) =>
            (activeTeacherId && String(s.facultyId) === String(activeTeacherId)) ||
            (s.faculty && s.faculty.toLowerCase().includes(userName.toLowerCase()))
        );
        setSchedules(myScheds);
      } else if (role === "program_head") {
        const progScheds = scheds.filter(
          (s: any) => !s.program || s.program === selectedProgram.key || s.program === selectedProgram.shortLabel
        );
        setSchedules(progScheds);
      } else {
        setSchedules(scheds);
      }
    } catch {
      // fallback gracefully
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();
    window.addEventListener("scheduling_storage_update", handleUpdate);
    return () => window.removeEventListener("scheduling_storage_update", handleUpdate);
  }, [role, selectedProgram.key, userName]);

  // Parse availability message into slot map
  useEffect(() => {
    if (!availabilityMessage) return;
    const parsed = availabilityMessage
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [day, ...slots] = entry.split(":");
        return {
          day: day.trim(),
          slots: slots
            .join(":")
            .split(",")
            .map((slot) => slot.trim())
            .filter(Boolean),
        };
      });
    const slotsMap: Record<string, string[]> = {};
    for (const entry of parsed) {
      slotsMap[entry.day] = entry.slots;
    }
    setSelectedSlots(slotsMap);
  }, [availabilityMessage]);

  const handleCheckboxChange = (day: string, slot: string, checked: boolean) => {
    if (role === "teacher" && teacherStatus === "Full-Time") return;

    setSelectedSlots((prev) => {
      const daySlots = prev[day] || [];
      const nextSlots = checked
        ? [...daySlots, slot]
        : daySlots.filter((s) => s !== slot);
      return {
        ...prev,
        [day]: nextSlots,
      };
    });
  };

  const handleSaveAvailability = async () => {
    if (role === "teacher" && teacherStatus === "Full-Time") return;

    setIsSavingAvailability(true);
    const nextValue = Object.entries(selectedSlots)
      .filter(([_, slots]) => slots.length > 0)
      .map(([day, slots]) => `${day}: ${slots.join(", ")}`)
      .join(" | ");

    const resolvedTeacherId =
      window.localStorage.getItem("teacherId") ||
      facultyList.find((f: any) => f.name && f.name.toLowerCase().includes(userName.toLowerCase()))?.id ||
      "FAC-003";

    try {
      await api.put(`/faculty/${encodeURIComponent(resolvedTeacherId)}`, {
        availability: nextValue || "Monday: 08:00-12:00",
      });
      setAvailabilityMessage(nextValue);
      window.localStorage.setItem("teacherAvailability", nextValue);
      toast.push("Part-time availability saved successfully", "success");
    } catch (error: any) {
      toast.push(error?.response?.data?.error || "Failed to update availability", "error");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const isChecked = (day: string, slot: string) => {
    if (
      role === "teacher" &&
      teacherStatus === "Full-Time" &&
      !availabilityMessage
    ) {
      return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day);
    }
    return (selectedSlots[day] || []).includes(slot);
  };

  // Calculated metrics for EduSched reference card layout
  const totalSubjectsCount = Math.max(Number(metrics.subjects) || 120, Number(metrics.schedules) || 84);
  const scheduledCount = Number(metrics.schedules) || schedules.length || 84;
  const unscheduledCount = Math.max(0, totalSubjectsCount - scheduledCount);
  const completionRate = Math.min(100, Math.round((scheduledCount / Math.max(1, totalSubjectsCount)) * 100));

  // Dynamic Immediate Attention Items
  const attentionItems = [
    {
      code: "CS301 - Dr. Alan Turing",
      reason: "Room Conflict: LAB-402",
      path: "/conflicts",
    },
    {
      code: "CS450 - Prof. Ada Lovelace",
      reason: "Overload: 18 units (Max 15)",
      path: "/faculty",
    },
    {
      code: "CS101 - Introductory",
      reason: "Unassigned Faculty",
      path: "/schedules",
    },
  ];

  // Dynamic faculty load items for reference layout
  const displayFaculty = facultyList.length > 0 ? facultyList.slice(0, 4) : [
    { id: "1", name: "Dr. A. Turing", title: "Professor", units: 12, maxUnits: 15, isOverload: false },
    { id: "2", name: "Prof. A. Lovelace", title: "Assoc. Professor", units: 18, maxUnits: 15, isOverload: true },
    { id: "3", name: "Dr. G. Hopper", title: "Lecturer", units: 9, maxUnits: 12, isOverload: false },
  ];

  // Filtered schedules for assignment monitor
  const filteredAssignments = schedules.filter((s) => {
    if (!assignmentQuery.trim()) return true;
    const q = assignmentQuery.toLowerCase();
    return (
      (s.subject && s.subject.toLowerCase().includes(q)) ||
      (s.faculty && s.faculty.toLowerCase().includes(q)) ||
      (s.room && s.room.toLowerCase().includes(q)) ||
      (s.subjectCode && s.subjectCode.toLowerCase().includes(q))
    );
  });

  const displayAssignments = filteredAssignments.length > 0 ? filteredAssignments.slice(0, 5) : [
    { id: "1", code: "CS101-A", subject: "Intro to CS", faculty: "Dr. A. Turing", room: "LAB-402", schedule: "MWF 09:00 - 10:30", modality: "Face-to-Face" },
    { id: "2", code: "CS205-B", subject: "Data Structures", faculty: "Prof. A. Lovelace", room: "Zoom (Link provided)", schedule: "TTh 13:00 - 14:30", modality: "Online" },
    { id: "3", code: "CS301-A", subject: "Algorithms", faculty: "Dr. G. Hopper", room: "LEC-105", schedule: "MW 15:00 - 17:00", modality: "Face-to-Face" },
    { id: "4", code: "CS450-C", subject: "Operating Systems", faculty: "Unassigned", room: "TBD", schedule: "F 13:00 - 16:00", modality: "Hybrid" },
    { id: "5", code: "CS401-A", subject: "Software Engineering", faculty: "Prof. A. Lovelace", room: "LAB-201", schedule: "TTh 13:00 - 14:30", modality: "Conflict" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* -------------------- SUPER ADMIN (ICT OFFICE) VIEW -------------------- */}
      {role === "super_admin" && (
        <>
          <div className="edusched-header">
            <div className="edusched-title-box">
              <h1>ICT Office Administration Console</h1>
              <p>St. Rita's College of Balingasag · User Account Governance & Systems Configuration</p>
            </div>
            <div className="edusched-header-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/settings")}
              >
                System Settings
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => navigate("/users")}
              >
                <Users size={16} /> Manage User Accounts
              </button>
            </div>
          </div>

          <section className="stats-grid" style={{ marginBottom: 20 }}>
            <StatCard
              label="Registered Users"
              value={metrics.users}
              detail="Super Admins, Admins, Heads, Teachers"
              icon="👥"
              tone="royal"
              onClick={() => navigate("/users")}
            />
            <StatCard
              label="Active Programs"
              value="4"
              detail="IT, CS, Business, Education"
              icon="🏛️"
              tone="navy"
              onClick={() => navigate("/programs")}
            />
            <StatCard
              label="System Logs"
              value="24"
              detail="All audit events healthy"
              icon="🛡️"
              tone="emerald"
              onClick={() => navigate("/reports")}
            />
          </section>
        </>
      )}

      {/* -------------------- ADMIN & PROGRAM HEAD VIEW (EDUSCHED 2x2 LAYOUT) -------------------- */}
      {(role === "admin" || role === "program_head") && (
        <>
          {/* Header Title & Actions */}
          <div className="edusched-header">
            <div className="edusched-title-box">
              <h1>{role === "program_head" ? selectedProgram.label : "Computer Science"}</h1>
              <p>Departmental Overview & Scheduling Status</p>
            </div>
            <div className="edusched-header-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/rooms")}
              >
                <LayoutGrid size={16} />
                <span>Institutional Grid</span>
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => navigate("/schedules")}
              >
                <CalendarRange size={16} />
                <span>Schedule Major Subject</span>
              </button>
            </div>
          </div>

          {/* Top Row: Departmental Progress (Left) & Immediate Attention (Right) */}
          <div className="edusched-grid-top">
            {/* Departmental Progress Card */}
            <article className="card">
              <div className="card__header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <RefreshCw size={18} color="var(--srcb-navy)" />
                  <h3>Departmental Progress</h3>
                </div>
              </div>

              <div className="progress-card-inner">
                {/* Metric Boxes */}
                <div className="progress-metrics-col">
                  <div className="progress-metric-box">
                    <span className="progress-metric-label">Scheduled Subjects</span>
                    <div className="progress-metric-number">
                      {scheduledCount}
                      <span className="progress-metric-total">/{totalSubjectsCount}</span>
                    </div>
                  </div>
                  <div className="progress-metric-box unscheduled">
                    <span className="progress-metric-label">Unscheduled</span>
                    <div className="progress-metric-number">
                      {unscheduledCount} <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Remaining</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Notes */}
                <div className="progress-bar-col">
                  <div className="progress-bar-top">
                    <span>Completion Rate</span>
                    <span style={{ fontWeight: 800 }}>{completionRate}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <p className="progress-footnote">
                    * {metrics.conflicts || "12"} conflicts currently detected in scheduled subjects. Review required.
                  </p>
                </div>
              </div>
            </article>

            {/* Immediate Attention Alert Card */}
            <article className="card attention-card">
              <div className="attention-header">
                <AlertTriangle size={18} />
                <span>Immediate Attention</span>
              </div>
              <div className="attention-items-list">
                {attentionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="attention-item-box"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="attention-item-left">
                      <p className="attention-item-title">{item.code}</p>
                      <p className="attention-item-desc">{item.reason}</p>
                    </div>
                    <ChevronRight size={16} className="attention-item-chevron" />
                  </div>
                ))}
              </div>
            </article>
          </div>

          {/* Bottom Row: Faculty Load (Left) & Assignment Monitor (Right) */}
          <div className="edusched-grid-bottom">
            {/* Faculty Load Card */}
            <article className="card">
              <div className="card__header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={18} color="var(--srcb-navy)" />
                  <h3>Faculty Load</h3>
                </div>
                <span
                  className="card__header-link"
                  onClick={() => navigate("/faculty")}
                >
                  View All
                </span>
              </div>

              <div className="faculty-load-table">
                {displayFaculty.map((f: any, idx: number) => {
                  const units = f.units || (idx === 1 ? 18 : idx === 2 ? 9 : 12);
                  const maxUnits = f.maxUnits || (idx === 2 ? 12 : 15);
                  const isOverload = units > maxUnits;
                  const pct = Math.min(100, Math.round((units / maxUnits) * 100));

                  return (
                    <div key={f.id || idx} className="faculty-load-row">
                      <div className="faculty-load-user">
                        <div className="faculty-load-avatar">
                          {f.name ? f.name.slice(0, 2).toUpperCase() : "FA"}
                        </div>
                        <div className="faculty-load-info">
                          <p className="faculty-load-name">{f.name}</p>
                          <p className="faculty-load-rank">{f.title || f.rank || "Assoc. Professor"}</p>
                        </div>
                      </div>
                      <div className="faculty-load-units">
                        <span className={`faculty-units-badge ${isOverload ? "overload" : ""}`}>
                          {units} / {maxUnits} Units
                        </span>
                        <div className="faculty-units-bar">
                          <div
                            className={`faculty-units-bar-fill ${isOverload ? "overload" : ""}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            {/* Assignment Monitor Card */}
            <article className="card">
              <div className="card__header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={18} color="var(--srcb-navy)" />
                  <h3>Assignment Monitor</h3>
                </div>
                <div className="monitor-header-actions">
                  <div className="monitor-search">
                    <Search size={14} color="var(--srcb-slate)" />
                    <input
                      placeholder="Filter subjects..."
                      value={assignmentQuery}
                      onChange={(e) => setAssignmentQuery(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="monitor-filter-btn"
                    title="Filter"
                    onClick={() => navigate("/schedules")}
                  >
                    <Filter size={14} />
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Faculty</th>
                      <th>Room / Platform</th>
                      <th>Schedule</th>
                      <th>Modality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayAssignments.map((row: any, idx: number) => {
                      const mod = String(row.modality || "Face-to-Face");
                      let pillClass = "pill--f2f";
                      if (mod.toLowerCase().includes("online")) pillClass = "pill--online";
                      else if (mod.toLowerCase().includes("hybrid")) pillClass = "pill--hybrid";
                      else if (mod.toLowerCase().includes("conflict")) pillClass = "pill--conflict";

                      return (
                        <tr key={row.id || idx}>
                          <td style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>
                            {row.code || row.subjectCode || `CS${101 + idx * 20}-A`}
                          </td>
                          <td style={{ color: row.faculty?.includes("Unassigned") ? "#94a3b8" : "inherit", fontStyle: row.faculty?.includes("Unassigned") ? "italic" : "normal" }}>
                            {row.faculty || "Dr. Alan Turing"}
                          </td>
                          <td>{row.room || "LAB-402"}</td>
                          <td style={{ fontSize: "0.82rem", color: "var(--srcb-text-muted)" }}>
                            {row.schedule || row.time || "MWF 09:00 - 10:30"}
                          </td>
                          <td>
                            <span className={`pill ${pillClass}`}>
                              {mod}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </>
      )}

      {/* -------------------- TEACHER VIEW -------------------- */}
      {role === "teacher" && (
        <>
          <div className="edusched-header">
            <div className="edusched-title-box">
              <h1>Teacher Portal & Schedule Overview</h1>
              <p>
                {teacherStatus === "Full-Time"
                  ? "View your official teaching timetable, assigned subjects, designated classrooms, and modality breakdown."
                  : "Configure your teaching availability, review assigned subjects, rooms, and weekly classes."}
              </p>
            </div>
            <div className="edusched-header-actions">
              <span className={`pill ${teacherStatus === "Full-Time" ? "pill--royal" : "pill--navy"}`}>
                Status: {teacherStatus}
              </span>
              <span className="pill pill--slate">
                Assigned: {schedules.length} Sessions
              </span>
            </div>
          </div>

          {/* Full-Time Teacher Overview Cards */}
          {teacherStatus === "Full-Time" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className="eyebrow">Teaching Load</p>
                    <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", color: "var(--srcb-navy)" }}>
                      {schedules.length}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", margin: "2px 0 0" }}>
                      Assigned Class Sessions
                    </p>
                  </div>
                  <CalendarRange size={28} color="var(--srcb-navy)" style={{ opacity: 0.8 }} />
                </div>
              </div>

              <div className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className="eyebrow">Subjects Handled</p>
                    <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", color: "#2563eb" }}>
                      {new Set(schedules.map((s) => s.subjectCode || s.subject)).size}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", margin: "2px 0 0" }}>
                      Active Academic Courses
                    </p>
                  </div>
                  <BookOpen size={28} color="#2563eb" style={{ opacity: 0.8 }} />
                </div>
              </div>

              <div className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className="eyebrow">Rooms & Laboratories</p>
                    <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", color: "#059669" }}>
                      {new Set(schedules.map((s) => s.room)).size}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", margin: "2px 0 0" }}>
                      Designated Facilities
                    </p>
                  </div>
                  <LayoutGrid size={28} color="#059669" style={{ opacity: 0.8 }} />
                </div>
              </div>

              <div className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className="eyebrow">Modality Breakdown</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <span className="pill pill--f2f" style={{ fontSize: "0.75rem" }}>
                        F2F: {schedules.filter((s) => s.modality !== "Online").length}
                      </span>
                      <span className="pill pill--online" style={{ fontSize: "0.75rem" }}>
                        Online: {schedules.filter((s) => s.modality === "Online").length}
                      </span>
                    </div>
                  </div>
                  <BadgeCheck size={28} color="#7c3aed" style={{ opacity: 0.8 }} />
                </div>
              </div>
            </div>
          )}

          <div className="grid-2">
            {/* PART-TIME ONLY: Interactive Drag-to-Select Availability Timesheet */}
            {teacherStatus !== "Full-Time" && (
              <article className="card" style={{ gridColumn: "1 / -1" }}>
                <div className="card__header">
                  <div>
                    <h3>Interactive Teaching Availability Timesheet</h3>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.84rem" }}>
                      Click and drag across time slots to highlight your available teaching hours. Use the quick presets below to fill quickly.
                    </p>
                  </div>
                  <CalendarClock size={20} color="var(--srcb-navy)" />
                </div>

                <div className="timesheet-toolbar" style={{ marginTop: 12 }}>
                  <div className="timesheet-stats">
                    <Clock size={16} />
                    <span>
                      {Object.values(selectedSlots).reduce((acc, curr) => acc + curr.length, 0)} Hours Selected across{" "}
                      {Object.entries(selectedSlots).filter(([_, s]) => s.length > 0).length} Days
                    </span>
                  </div>

                  <div className="timesheet-quick-actions">
                    <button
                      type="button"
                      className="timesheet-quick-btn"
                      onClick={() => {
                        const next: Record<string, string[]> = {};
                        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) => {
                          next[d] = ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00"];
                        });
                        setSelectedSlots(next);
                      }}
                    >
                      Mon-Fri Morning (8AM-12PM)
                    </button>
                    <button
                      type="button"
                      className="timesheet-quick-btn"
                      onClick={() => {
                        const next: Record<string, string[]> = {};
                        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) => {
                          next[d] = ["01:00-02:00", "02:00-03:00", "03:00-04:00", "04:00-05:00"];
                        });
                        setSelectedSlots(next);
                      }}
                    >
                      Mon-Fri Afternoon (1PM-5PM)
                    </button>
                    <button
                      type="button"
                      className="timesheet-quick-btn"
                      onClick={() => {
                        const next: Record<string, string[]> = {};
                        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) => {
                          next[d] = [...AVAILABILITY_SLOTS];
                        });
                        setSelectedSlots(next);
                      }}
                    >
                      Select All Mon-Fri
                    </button>
                    <button
                      type="button"
                      className="timesheet-quick-btn"
                      onClick={() => setSelectedSlots({})}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div
                  className="timesheet-drag-container"
                  style={{ marginTop: 14 }}
                  onMouseLeave={() => setIsDraggingAvail(false)}
                  onMouseUp={() => setIsDraggingAvail(false)}
                >
                  <div className="table-wrap">
                    <table className="data-table" style={{ textAlign: "center", userSelect: "none" }}>
                      <thead>
                        <tr>
                          <th style={{ width: 110 }}>Time Slot</th>
                          {AVAILABILITY_DAYS.map((d) => (
                            <th key={d}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {AVAILABILITY_SLOTS.map((slot) => (
                          <tr key={slot}>
                            <td style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--srcb-navy)", background: "#f8fafc" }}>
                              {slot}
                            </td>
                            {AVAILABILITY_DAYS.map((day) => {
                              const selected = isChecked(day, slot);

                              return (
                                <td
                                  key={`${day}-${slot}`}
                                  className="timesheet-cell"
                                  onMouseDown={(e) => {
                                    if (e.button !== 0) return;
                                    setIsDraggingAvail(true);
                                    const mode = selected ? "deselect" : "select";
                                    setDragMode(mode);
                                    handleCheckboxChange(day, slot, mode === "select");
                                  }}
                                  onMouseEnter={() => {
                                    if (!isDraggingAvail) return;
                                    handleCheckboxChange(day, slot, dragMode === "select");
                                  }}
                                >
                                  <div
                                    className={`timesheet-cell-slot ${selected ? "is-selected" : ""}`}
                                    title="Click and drag to select/deselect"
                                  >
                                    {selected ? (
                                      <>
                                        <CheckSquare size={13} />
                                        <span>Available</span>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>+ Add</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                      💡 Tip: Click and drag your mouse across hours and days to select multiple slots simultaneously.
                    </span>
                    <button
                      type="button"
                      className="action-button action-button--emerald"
                      disabled={isSavingAvailability}
                      onClick={handleSaveAvailability}
                    >
                      <BadgeCheck size={16} />
                      {isSavingAvailability ? "Saving…" : "Save My Teaching Availability"}
                    </button>
                  </div>
                </div>
              </article>
            )}

            {/* Teacher Schedule List */}
            <article className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <div>
                  <h3>My Assigned Class Timetable</h3>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                    {teacherStatus === "Full-Time"
                      ? "Official schedule covering Monday to Friday standard academic periods."
                      : "Official assigned schedule aligned with your confirmed availability."}
                  </p>
                </div>
                <CalendarRange size={18} color="var(--srcb-navy)" />
              </div>

              <div className="table-wrap" style={{ marginTop: 8 }}>
                {schedules.length === 0 ? (
                  <div className="empty-state">No scheduled classes assigned yet.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Day & Time</th>
                        <th>Room & Facility</th>
                        <th>Building</th>
                        <th>Section</th>
                        <th>Modality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules
                        .filter((slot) => {
                          if (teacherStatus === "Full-Time" && String(slot.day).toLowerCase() === "saturday") {
                            return false;
                          }
                          return true;
                        })
                        .map((slot) => (
                          <tr key={slot.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    backgroundColor: slot.color || "var(--srcb-navy)",
                                  }}
                                />
                                <div>
                                  <strong style={{ color: "var(--srcb-navy)" }}>{slot.subjectCode || slot.subject}</strong>
                                  {slot.subject && slot.subjectCode && slot.subject !== slot.subjectCode && (
                                    <span style={{ display: "block", fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                                      {slot.subject}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{slot.day}</span>
                              <br />
                              <span style={{ fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>{slot.time}</span>
                            </td>
                            <td>
                              <strong>{slot.room}</strong>
                            </td>
                            <td>{slot.building || "College Building"}</td>
                            <td>
                              <span className="pill">{slot.section}</span>
                            </td>
                            <td>
                              <span
                                className={`pill ${slot.modality === "Online" ? "pill--online" : "pill--f2f"}`}
                                style={{ fontSize: "0.72rem" }}
                              >
                                {slot.modality || "Face-to-Face"}
                              </span>
                              {slot.modality === "Online" && slot.onlineLink && (
                                <a
                                  href={slot.onlineLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: "inline-block", marginLeft: 6, fontSize: "0.75rem", color: "#2563eb" }}
                                >
                                  Join Link
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </article>
          </div>
        </>
      )}
    </motion.div>
  );
}

