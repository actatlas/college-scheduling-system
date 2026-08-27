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
  Eye,
  CalendarCheck,
  GraduationCap,
  UserX,
  CheckCircle2,
  Lock,
  Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "../components/common/StatCard";
import { StatCardSkeleton } from "../components/common/Skeleton";
import { api } from "../data/apiClient";
import { useEffect, useState } from "react";
import { useToast } from "../components/common/Toast";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import { ScheduleDetailsModal } from "../components/schedule/ScheduleDetailsModal";
import { Modal } from "../components/common/Modal";
import { getProgramLogo } from "../utils/programLogos";
import type { UserRole, ClassScheduleItem, ExamScheduleItem } from "../types";

const AVAILABILITY_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
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
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const { selectedProgram, matchesProgram } = useProgramContext();

  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;
  const userName = window.localStorage.getItem("userName") || "User";

  const [teacherStatus, setTeacherStatus] = useState<string>("Full-Time");
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [teacherExams, setTeacherExams] = useState<ExamScheduleItem[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [headTeachingSchedules, setHeadTeachingSchedules] = useState<ClassScheduleItem[]>([]);
  const [suspendedUsersList, setSuspendedUsersList] = useState<any[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});
  const [viewingSchedule, setViewingSchedule] = useState<ClassScheduleItem | null>(null);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);

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
    setIsLoading(true);
    try {
      const [facRes, subRes, rmRes, secRes, schedRes, confRes, usrRes, exmRes]: any[] = await Promise.all([
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
        api.get("/rooms").catch(() => ({ data: { data: [] } })),
        api.get("/sections").catch(() => ({ data: { data: [] } })),
        api.get("/schedules").catch(() => ({ data: { data: [] } })),
        api.get("/conflicts").catch(() => ({ data: { data: [] } })),
        role === "super_admin"
          ? api.get("/users").catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
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
      setSubjectsList(subs);

      const suspended = usrs.filter(
        (u: any) => String(u.status || "").trim().toLowerCase() === "suspended"
      );
      setSuspendedUsersList(suspended);

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
        const normalizedUserName = userName.trim().toLowerCase();
        const normalizedTeacherName = (currentTeacher?.name || "").trim().toLowerCase();

        const myScheds = scheds.filter(
          (s: any) =>
            (activeTeacherId && String(s.facultyId) === String(activeTeacherId)) ||
            (s.faculty && s.faculty.toLowerCase().includes(normalizedUserName)) ||
            (normalizedTeacherName && s.faculty && s.faculty.toLowerCase().includes(normalizedTeacherName))
        );
        setSchedules(myScheds);

        const myExams = exms.filter((e: any) => {
          const pId = String(e.proctorId || "").trim().toLowerCase();
          const pName = String(e.proctor || e.proctorName || "").trim().toLowerCase();
          const activeId = String(activeTeacherId || "").trim().toLowerCase();

          const matchId = Boolean(activeId && (pId === activeId || String(e.proctorId) === activeId));
          const matchName = Boolean(
            (normalizedUserName && (pName.includes(normalizedUserName) || normalizedUserName.includes(pName))) ||
            (normalizedTeacherName && (pName.includes(normalizedTeacherName) || normalizedTeacherName.includes(pName)))
          );

          const examSub = subs.find((s: any) => s.code === e.subjectCode);
          const matchSubjectInstructor = Boolean(
            examSub && (
              (activeId && String(examSub.instructorId) === activeId) ||
              (normalizedUserName && examSub.instructor && examSub.instructor.toLowerCase().includes(normalizedUserName)) ||
              (normalizedTeacherName && examSub.instructor && examSub.instructor.toLowerCase().includes(normalizedTeacherName))
            )
          );

          return matchId || matchName || matchSubjectInstructor;
        });
        setTeacherExams(myExams);
      } else {
        const progScheds = scheds.filter(
          (s: any) => matchesProgram(s.program || s.department)
        );
        setSchedules(progScheds);

        if (role === "program_head") {
          const storedTeacherId = window.localStorage.getItem("teacherId");
          const currentHeadFaculty = facs.find(
            (f: any) =>
              (storedTeacherId && String(f.id) === String(storedTeacherId)) ||
              (f.name && f.name.toLowerCase().includes(userName.toLowerCase())) ||
              (f.email && f.email.toLowerCase().includes("programhead@"))
          );
          const headFacultyId = currentHeadFaculty?.id || storedTeacherId || "FAC-003";
          const normalizedUserName = userName.trim().toLowerCase();
          const normalizedHeadName = (currentHeadFaculty?.name || "").trim().toLowerCase();

          const myHeadClasses = scheds.filter(
            (s: any) =>
              (headFacultyId && String(s.facultyId) === String(headFacultyId)) ||
              (s.faculty && s.faculty.toLowerCase().includes(normalizedUserName)) ||
              (normalizedHeadName && s.faculty && s.faculty.toLowerCase().includes(normalizedHeadName)) ||
              (s.faculty && (s.faculty.toLowerCase().includes("alan turing") || s.faculty.toLowerCase().includes("dr. reyes") || s.faculty.toLowerCase().includes("program head")))
          );
          setHeadTeachingSchedules(myHeadClasses);
        }
      }
    } catch {
      // fallback gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();
    window.addEventListener("scheduling_storage_update", handleUpdate);
    return () => window.removeEventListener("scheduling_storage_update", handleUpdate);
  }, [role, selectedProgram.key, userName]);

  useEffect(() => {
    if (!availabilityMessage) return;
    const parsed = availabilityMessage
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const initialMap: Record<string, string[]> = {};
    for (const item of parsed) {
      const [day, slotsPart] = item.split(":");
      if (day && slotsPart) {
        const dayKey = day.trim();
        const slots = slotsPart
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        initialMap[dayKey] = slots;
      }
    }
    setSelectedSlots(initialMap);
  }, [availabilityMessage]);

  const handleCheckboxChange = (day: string, slot: string, checked: boolean) => {
    if (role === "teacher" && teacherStatus === "Full-Time") return;

    setSelectedSlots((prev) => {
      const daySlots = prev[day] || [];
      const nextSlots = checked
        ? (daySlots.includes(slot) ? daySlots : [...daySlots, slot])
        : daySlots.filter((s) => s !== slot);
      return {
        ...prev,
        [day]: nextSlots,
      };
    });
  };

  const handleMouseUpSlots = () => {
    setIsDraggingAvail(false);
  };

  const handleSaveAvailability = async () => {
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

  const targetSubjects = subjectsList.filter((s: any) => matchesProgram(s.program || s.department));

  const totalSubjectsCount = Math.max(targetSubjects.length, 1);
  const scheduledSubjectCodes = new Set(
    schedules.map((s: any) => (s.subjectCode || "").toUpperCase()).filter(Boolean)
  );
  const unscheduledSubjects = targetSubjects.filter(
    (s: any) =>
      !scheduledSubjectCodes.has((s.code || "").toUpperCase()) &&
      !schedules.some((sc: any) => (sc.subject || "").toLowerCase() === (s.name || "").toLowerCase())
  );
  const unscheduledCount = unscheduledSubjects.length;
  const scheduledCount = Math.max(0, targetSubjects.length - unscheduledCount);
  const completionRate = targetSubjects.length > 0 ? Math.min(100, Math.round((scheduledCount / targetSubjects.length) * 100)) : 100;

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
      code: `${unscheduledCount} Unscheduled Subject${unscheduledCount === 1 ? "" : "s"}`,
      reason: "Action Required: Allocate Timetable Blocks",
      path: "/schedules?view=unscheduled",
    },
  ];

  const scopedFaculty = facultyList.filter((f: any) => matchesProgram(f.programs || f.department));

  const displayFaculty = scopedFaculty.length > 0 ? scopedFaculty.slice(0, 4) : [
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
                className="action-button"
                onClick={() => navigate("/users")}
              >
                <Users size={16} /> Manage User Accounts
              </button>
            </div>
          </div>

          {/* ICT Governance Notice / Sign for Suspended Accounts */}
          {suspendedUsersList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: 20,
                padding: "16px 20px",
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(255, 251, 235, 0.95) 100%)",
                border: "1px solid rgba(220, 38, 38, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 14,
                boxShadow: "0 2px 10px rgba(220, 38, 38, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    background: "rgba(220, 38, 38, 0.15)",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserX size={24} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: "1rem", color: "#991b1b", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={16} /> ICT Governance Sign: {suspendedUsersList.length} Account{suspendedUsersList.length === 1 ? "" : "s"} Suspended
                    </strong>
                    <span className="pill pill--danger" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                      Access Blocked
                    </span>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: "0.84rem", color: "#7f1d1d" }}>
                    Suspended users:{" "}
                    <strong>
                      {suspendedUsersList.map((u: any) => u.name || u.email).slice(0, 4).join(", ")}
                      {suspendedUsersList.length > 4 ? ` and ${suspendedUsersList.length - 4} more` : ""}
                    </strong>
                    . Sign-in is restricted; all assigned teaching loads and records remain intact.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="action-button"
                style={{
                  background: "#dc2626",
                  borderColor: "#b91c1c",
                  fontSize: "0.82rem",
                  padding: "8px 16px",
                }}
                onClick={() => navigate("/users?status=Suspended")}
              >
                <span>Review & Unsuspend Accounts</span>
                <ChevronRight size={14} />
              </button>
            </motion.div>
          )}

          {isLoading ? (
            <StatCardSkeleton count={3} />
          ) : (
            <section className="stats-grid" style={{ marginBottom: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <StatCard
                label="Registered Users"
                value={metrics.users}
                detail="Super Admins, Admins, Heads, Teachers"
                icon={<Users size={20} />}
                tone="royal"
                onClick={() => navigate("/users")}
              />
              <StatCard
                label="Active Accounts"
                value={String(Math.max(0, Number(metrics.users) - suspendedUsersList.length))}
                detail="Permitted to sign in and access SCSMS"
                icon={<CheckCircle2 size={20} />}
                tone="emerald"
                onClick={() => navigate("/users?status=Active")}
              />
              <StatCard
                label="Suspended Accounts"
                value={String(suspendedUsersList.length)}
                detail={suspendedUsersList.length === 0 ? "No accounts currently suspended" : "Sign-in restricted / Locked"}
                icon={<Lock size={20} />}
                tone="danger"
                onClick={() => navigate("/users?status=Suspended")}
              />
            </section>
          )}
        </>
      )}

      {/* -------------------- ADMIN & PROGRAM HEAD VIEW (EDUSCHED 2x2 LAYOUT) -------------------- */}
      {(role === "admin" || role === "program_head") && (
        <>
          {/* Header Title & Actions */}
          <div className="edusched-header">
            <div className="edusched-title-box" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                title="Click to view enlarged logo"
                onClick={() => setIsLogoModalOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "inline-flex",
                  borderRadius: "16px",
                }}
              >
                <img
                  src={getProgramLogo(selectedProgram.key || selectedProgram.label)}
                  alt="Program Logo"
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "16px",
                    objectFit: "contain",
                    background: "#ffffff",
                    padding: "4px",
                    border: "1px solid var(--srcb-border)",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                    transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.08)";
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.16)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.08)";
                  }}
                />
              </button>
              <div>
                <h1>
                  {role === "program_head"
                    ? `Program Head Portal • ${selectedProgram.label}`
                    : "College Academic Scheduling Dashboard"}
                </h1>
                <p>
                  {role === "program_head"
                    ? `Assigned Program: ${selectedProgram.label} (${selectedProgram.key || "ITP"}) • Departmental Management`
                    : `Active Program Focus: ${selectedProgram.label} (${selectedProgram.shortLabel || "Collegiate Scope"})`}
                </p>
              </div>
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
                  <div
                    className="progress-metric-box unscheduled"
                    onClick={() => navigate("/schedules?view=unscheduled")}
                    role="button"
                    tabIndex={0}
                    title="Click to view and schedule remaining subjects"
                    style={{
                      cursor: "pointer",
                      transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate("/schedules?view=unscheduled");
                      }
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="progress-metric-label">Unscheduled</span>
                      <span style={{ fontSize: "0.7rem", color: "#d97706", fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
                        View <ChevronRight size={12} />
                      </span>
                    </div>
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

          {/* Program Head: My Teaching Load & Class Timetable (e.g. 3rd Year Classes) */}
          {role === "program_head" && (
            <div style={{ marginTop: 24 }}>
              <article className="card" style={{ padding: "20px 24px", border: "1px solid rgba(13, 84, 153, 0.2)", background: "linear-gradient(180deg, rgba(13, 84, 153, 0.02) 0%, rgba(255,255,255,1) 100%)" }}>
                <div className="card__header" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(13, 84, 153, 0.1)", color: "var(--srcb-navy)" }}>
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--srcb-navy)" }}>
                        My Teaching Load & Assigned Classes
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                        Direct instructor assignments for major subjects (including 3rd Year and collegiate sections)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => navigate(`/schedules`)}
                  >
                    <span>View All Schedules</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {headTeachingSchedules.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", background: "var(--srcb-surface-alt)", borderRadius: 8 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--srcb-navy)" }}>
                      No direct teaching classes assigned yet for {userName}.
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--srcb-text-muted)" }}>
                      When you or the Registrar schedule major subjects (such as 3rd Year IT301 / Capstone), your classes will appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                    {headTeachingSchedules.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 10,
                          border: "1px solid var(--srcb-border)",
                          background: "#ffffff",
                          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <span className="pill pill--royal" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                              {item.subjectCode || "IT301"}
                            </span>
                            <h4 style={{ margin: "6px 0 0", fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                              {item.subject || "Web Systems & Technologies"}
                            </h4>
                          </div>
                          <span
                            className={`pill ${
                              String(item.modality || "").toLowerCase().includes("online")
                                ? "pill--online"
                                : "pill--f2f"
                            }`}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {item.modality || "Face-to-Face"}
                          </span>
                        </div>

                        <div style={{ fontSize: "0.82rem", color: "var(--srcb-text)", display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--srcb-text-muted)" }}>Section:</span>
                            <strong>{item.section || "BSIT 3-A"}</strong>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--srcb-text-muted)" }}>Schedule:</span>
                            <span>{item.day} · {item.time}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--srcb-text-muted)" }}>Facility:</span>
                            <span>{item.room || "COMLAB-2"} ({item.building || "College Building"})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}
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

          {/* Teacher Overview Metrics Row */}
          {isLoading ? (
            <StatCardSkeleton count={4} />
          ) : (
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

              <div
                className="card"
                style={{ padding: "16px 20px", cursor: "pointer" }}
                onClick={() => {
                  const examSection = document.getElementById("teacher-assigned-exams-card");
                  if (examSection) {
                    examSection.scrollIntoView({ behavior: "smooth" });
                  } else {
                    navigate("/exams");
                  }
                }}
                title="Click to jump to your assigned examination schedules"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className="eyebrow">Exam Proctoring Duties</p>
                    <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", color: "#8b5cf6" }}>
                      {teacherExams.length}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", margin: "2px 0 0" }}>
                      {teacherExams.length === 1 ? "1 Assigned Exam Session" : `${teacherExams.length} Assigned Exam Sessions`}
                    </p>
                  </div>
                  <CalendarCheck size={28} color="#8b5cf6" style={{ opacity: 0.8 }} />
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
                  onMouseLeave={handleMouseUpSlots}
                  onMouseUp={handleMouseUpSlots}
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
                            <td style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--srcb-navy)", background: "var(--srcb-surface-alt, #f8fafc)" }}>
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
                    <span style={{ fontSize: "0.8rem", color: "var(--srcb-text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Lightbulb size={15} /> Tip: Click and drag your mouse across hours and days to select multiple slots simultaneously.
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
                        <th style={{ width: 90, textAlign: "center" }}>Details</th>
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
                          <tr
                            key={slot.id}
                            onClick={() => setViewingSchedule(slot)}
                            style={{ cursor: "pointer" }}
                            title="Click to view assigned class schedule details"
                          >
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
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ display: "inline-block", marginLeft: 6, fontSize: "0.75rem", color: "#2563eb" }}
                                >
                                  Join Link
                                </a>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingSchedule(slot);
                                }}
                                style={{ padding: "4px 8px", fontSize: "0.74rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </article>

            {/* Teacher Assigned Exam Schedules Card */}
            <article id="teacher-assigned-exams-card" className="card" style={{ gridColumn: "1 / -1", marginTop: 12 }}>
              <div className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3>My Assigned Examination Schedules & Proctoring</h3>
                    <span className="pill pill--royal" style={{ fontSize: "0.75rem" }}>
                      {teacherExams.length} {teacherExams.length === 1 ? "Session" : "Sessions"}
                    </span>
                  </div>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                    Official institutional examination duties assigned to you as proctor or subject instructor.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/exams")}
                    style={{ fontSize: "0.78rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    View All Exams <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="table-wrap" style={{ marginTop: 8 }}>
                {teacherExams.length === 0 ? (
                  <div className="empty-state" style={{ padding: "36px 16px", textAlign: "center" }}>
                    <CalendarCheck size={38} style={{ color: "var(--srcb-text-muted)", marginBottom: 8, opacity: 0.6 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No examination schedules assigned yet.</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                      When administrators schedule synchronized exams and assign you as proctor, your assigned sessions will appear here.
                    </p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Term</th>
                        <th>Exam Date & Time</th>
                        <th>Venue & Building</th>
                        <th>Synchronized Sections</th>
                        <th>Role / Assignment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherExams.map((exam) => (
                        <tr key={exam.id || `${exam.subjectCode}-${exam.examDate}-${exam.time}`}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  backgroundColor: exam.color || "#8b5cf6",
                                }}
                              />
                              <div>
                                <strong style={{ color: "var(--srcb-navy)" }}>{exam.subjectCode || exam.subject}</strong>
                                {exam.subject && exam.subjectCode && exam.subject !== exam.subjectCode && (
                                  <span style={{ display: "block", fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                                    {exam.subject}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="pill pill--royal" style={{ fontSize: "0.75rem" }}>
                              {exam.term || "Midterm"}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{exam.examDate}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>{exam.time}</div>
                          </td>
                          <td>
                            <strong>{exam.room}</strong>
                            <div style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                              {exam.building || "College Building"}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {(exam.synchronizedSections || []).map((sec: string) => (
                                <span key={sec} className="pill pill--navy" style={{ fontSize: "0.72rem" }}>
                                  {sec}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className="pill pill--emerald" style={{ fontSize: "0.74rem" }}>
                              Assigned Proctor
                            </span>
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

      {/* Read-Only Assigned Schedule Details Modal */}
      <ScheduleDetailsModal
        isOpen={Boolean(viewingSchedule)}
        onClose={() => setViewingSchedule(null)}
        schedule={viewingSchedule}
      />

      {/* Enlarged Program Logo Modal */}
      <Modal
        isOpen={isLogoModalOpen}
        title={selectedProgram.label || "Academic Program"}
        description="Official Academic Program Seal · St. Rita's College of Balingasag"
        onClose={() => setIsLogoModalOpen(false)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 10px 10px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
              borderRadius: "24px",
              border: "1px solid var(--srcb-border)",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <img
              src={getProgramLogo(selectedProgram.key || selectedProgram.label)}
              alt="Enlarged Logo"
              style={{
                width: "240px",
                height: "240px",
                objectFit: "contain",
                filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))",
              }}
            />
          </div>

          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "var(--srcb-navy)",
              margin: "0 0 6px",
            }}
          >
            {selectedProgram.label}
          </h3>

          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#0284c7",
              margin: "0 0 20px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {selectedProgram.shortLabel || selectedProgram.key} Academic Scope
          </p>

          <button
            type="button"
            className="action-button"
            onClick={() => setIsLogoModalOpen(false)}
            style={{ minWidth: "140px" }}
          >
            Close Preview
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}

