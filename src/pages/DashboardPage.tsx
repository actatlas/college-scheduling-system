import {
  CalendarClock,
  Users,
  BookOpen,
  CalendarRange,
  ChevronRight,
  AlertTriangle,
  LayoutGrid,
  Clock,
  Eye,
  CalendarCheck,
  GraduationCap,
  UserX,
  CheckCircle2,
  Lock,
  Copy,
} from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "../components/common/StatCard";
import { StatCardSkeleton } from "../components/common/Skeleton";
import { api } from "../data/apiClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import { Modal } from "../components/common/Modal";
import { ScheduleDetailsModal } from "../components/schedule/ScheduleDetailsModal";
import { getProgramLogo } from "../utils/programLogos";
import type { UserRole, ClassScheduleItem } from "../types";

function parseTimeToMinutes(tStr: string): number {
  if (!tStr) return 0;
  const clean = tStr.trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const raw = clean.replace(/am|pm/i, "").trim();
  const parts = raw.split(":");
  let h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (!isPM && !isAM && h >= 1 && h <= 6) h += 12;
  return h * 60 + m;
}

function getStartAndEndMinutes(timeStr: string): { start: number; end: number } {
  if (!timeStr) return { start: 0, end: 0 };
  const clean = timeStr.replace(/–/g, "-");
  const parts = clean.split("-").map((p) => p.trim());
  const start = parseTimeToMinutes(parts[0] || "");
  const end = parts.length > 1 ? parseTimeToMinutes(parts[1]) : start + 90;
  return { start, end };
}

export function DashboardPage() {
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { selectedProgram, matchesProgram } = useProgramContext();

  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;
  const userName = window.localStorage.getItem("userName") || "User";

  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [allExamsList, setAllExamsList] = useState<any[]>([]);
  const [headTeachingSchedules, setHeadTeachingSchedules] = useState<ClassScheduleItem[]>([]);
  const [suspendedUsersList, setSuspendedUsersList] = useState<any[]>([]);
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

  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    try {
      const [facRes, subRes, rmRes, secRes, schedRes, confRes, usrRes, exmRes]: any[] = await Promise.all([
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/faculty").catch(() => ({ data: { data: [] } })),
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/subjects").catch(() => ({ data: { data: [] } })),
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/rooms").catch(() => ({ data: { data: [] } })),
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/sections").catch(() => ({ data: { data: [] } })),
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/schedules").catch(() => ({ data: { data: [] } })),
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/conflicts").catch(() => ({ data: { data: [] } })),
        role === "super_admin"
          ? api.get("/users").catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        role === "super_admin" ? Promise.resolve({ data: { data: [] } }) : api.get("/exams").catch(() => ({ data: { data: [] } })),
      ]);

      const facs = facRes.data?.data || [];
      const subs = subRes.data?.data || [];
      const rms = rmRes.data?.data || [];
      const secs = secRes.data?.data || [];
      const scheds = schedRes.data?.data || [];
      const confs = confRes.data?.data || [];
      const usrs = usrRes.data?.data || [];
      const exms = exmRes.data?.data || [];

      setSubjectsList(subs);
      setAllExamsList(exms);

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
            (normalizedHeadName && s.faculty && s.faculty.toLowerCase().includes(normalizedHeadName))
        );

        setHeadTeachingSchedules(myHeadClasses);
      }
    } catch {
      // fallback gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData(true);
    window.addEventListener("scheduling_storage_update", handleUpdate);
    return () => window.removeEventListener("scheduling_storage_update", handleUpdate);
  }, [role, selectedProgram.key, userName]);

  const targetSubjects = subjectsList.filter((s: any) => matchesProgram(s.program || s.department));

  const scheduledSubjectCodes = new Set(
    schedules.map((s: any) => (s.subjectCode || "").toUpperCase()).filter(Boolean)
  );
  const unscheduledSubjects = targetSubjects.filter(
    (s: any) =>
      !scheduledSubjectCodes.has((s.code || "").toUpperCase()) &&
      !schedules.some((sc: any) => (sc.subject || "").toLowerCase() === (s.name || "").toLowerCase())
  );
  const unscheduledCount = unscheduledSubjects.length;

  // Today's Date Information
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNames[now.getDay()];
  const formattedTodayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  // Scoped Program Schedules & Today's Chronological Classes
  const programSchedules = schedules.filter((s: any) =>
    matchesProgram(s.program || s.department)
  );

  const todayNameLower = currentDayName.toLowerCase();
  const todayClasses = programSchedules
    .filter((s: any) => {
      const day = String(s.day || "").toLowerCase().trim();
      return day === todayNameLower || day.startsWith(todayNameLower.slice(0, 3));
    })
    .sort((a: any, b: any) => {
      const aMin = getStartAndEndMinutes(a.time || a.schedule || "").start;
      const bMin = getStartAndEndMinutes(b.time || b.schedule || "").start;
      return aMin - bMin;
    });

  // Currently Ongoing Classes
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();
  const ongoingClasses = todayClasses.filter((s: any) => {
    const { start, end } = getStartAndEndMinutes(s.time || s.schedule || "");
    return start <= currentMinutesNow && currentMinutesNow < end;
  });

  // Room collisions among today's classes
  const roomCollisionItems: { code: string; reason: string; path: string }[] = [];
  for (let i = 0; i < todayClasses.length; i++) {
    for (let j = i + 1; j < todayClasses.length; j++) {
      const c1 = todayClasses[i];
      const c2 = todayClasses[j];
      if (
        c1.room &&
        c2.room &&
        c1.room.trim().toLowerCase() === c2.room.trim().toLowerCase() &&
        !c1.room.toLowerCase().includes("tba")
      ) {
        const t1 = getStartAndEndMinutes(c1.time || (c1 as any).schedule || "");
        const t2 = getStartAndEndMinutes(c2.time || (c2 as any).schedule || "");
        if (Math.max(t1.start, t2.start) < Math.min(t1.end, t2.end)) {
          roomCollisionItems.push({
            code: `Room Collision Today: ${c1.room}`,
            reason: `Overlapping ${c1.subjectCode || c1.subject} & ${c2.subjectCode || c2.subject} (${c1.time || "scheduled slot"})`,
            path: "/schedules?filter=conflict",
          });
        }
      }
    }
  }

  // Unassigned rooms among today's classes
  const unassignedRoomClasses = todayClasses.filter(
    (s: any) =>
      !s.room ||
      s.room.trim() === "" ||
      s.room.toLowerCase().includes("tba") ||
      s.room.toLowerCase().includes("unassigned")
  );

  // Unassigned teachers among today's classes
  const unassignedFacultyClasses = todayClasses.filter(
    (s: any) =>
      !s.faculty ||
      s.faculty.trim() === "" ||
      s.faculty.toLowerCase().includes("tba") ||
      s.faculty.toLowerCase().includes("unassigned")
  );

  // Immediate Attention alerts for today + urgent conflicts
  const dailyAttentionItems: { code: string; reason: string; path: string }[] = [];

  roomCollisionItems.forEach((item) => dailyAttentionItems.push(item));

  if (unassignedRoomClasses.length > 0) {
    dailyAttentionItems.push({
      code: `${unassignedRoomClasses.length} Class${unassignedRoomClasses.length > 1 ? "es" : ""} Missing Room Today`,
      reason: `Venue unassigned for: ${unassignedRoomClasses
        .map((s: any) => s.subjectCode || s.subject)
        .slice(0, 2)
        .join(", ")}${unassignedRoomClasses.length > 2 ? ` (+${unassignedRoomClasses.length - 2} more)` : ""}`,
      path: "/schedules",
    });
  }

  if (unassignedFacultyClasses.length > 0) {
    dailyAttentionItems.push({
      code: `${unassignedFacultyClasses.length} Class${unassignedFacultyClasses.length > 1 ? "es" : ""} Missing Instructor Today`,
      reason: `Teacher pending for: ${unassignedFacultyClasses
        .map((s: any) => s.subjectCode || s.subject)
        .slice(0, 2)
        .join(", ")}${unassignedFacultyClasses.length > 2 ? ` (+${unassignedFacultyClasses.length - 2} more)` : ""}`,
      path: "/schedules",
    });
  }

  if (Number(metrics.conflicts) > 0 && roomCollisionItems.length === 0) {
    dailyAttentionItems.push({
      code: `${metrics.conflicts} Timetable Conflict${Number(metrics.conflicts) === 1 ? "" : "s"} Detected`,
      reason: "Action Required: Resolve room, faculty, or time overlapping",
      path: "/schedules?filter=conflict",
    });
  }

  if (unscheduledCount > 0) {
    dailyAttentionItems.push({
      code: `${unscheduledCount} Unscheduled Major Subject${unscheduledCount === 1 ? "" : "s"}`,
      reason: "Action Required: Allocate Timetable Blocks",
      path: "/schedules?view=unscheduled",
    });
  }

  const todayActionCount =
    roomCollisionItems.length +
    unassignedRoomClasses.length +
    unassignedFacultyClasses.length +
    Number(metrics.conflicts);

  // Proactive Examination Period Status & Sequence Tracking (Prelim -> Midterm -> Semi-Final -> Final)
  const examPeriodStatus = (() => {
    const terms = ["Prelim", "Midterm", "Semi-Final", "Final"] as const;
    const termStats = terms.map((term) => {
      const examsForTerm = allExamsList.filter(
        (e: any) => String(e.term || "").toLowerCase() === term.toLowerCase()
      );
      const isScheduled = examsForTerm.length > 0;
      return {
        term,
        isScheduled,
        count: examsForTerm.length,
        firstDate: examsForTerm[0]?.examDate || null,
      };
    });

    const nextUnscheduled = termStats.find((t) => !t.isScheduled);

    return {
      termStats,
      nextUnscheduled: nextUnscheduled || null,
      allScheduled: termStats.every((t) => t.isScheduled),
    };
  })();

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

      {/* -------------------- ADMIN & PROGRAM HEAD VIEW (DAILY OPERATIONS MONITOR) -------------------- */}
      {(role === "admin" || role === "program_head") && (
        <>
          {/* Hero / Header Summary with Dynamic Date Banner */}
          <div className="daily-hero-banner">
            <div className="daily-hero-left">
              <button
                type="button"
                title="Click to view enlarged logo"
                onClick={() => setIsLogoModalOpen(true)}
                className="daily-logo-btn"
              >
                <img
                  src={getProgramLogo(selectedProgram.key || selectedProgram.label)}
                  alt="Program Logo"
                  className="daily-logo-img"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                />
              </button>
              <div className="daily-hero-text">
                <div className="daily-date-chip">
                  <CalendarClock size={15} />
                  <span>Today's Schedule — {formattedTodayDate}</span>
                </div>
                <h1>
                  {role === "program_head"
                    ? `Program Operations • ${selectedProgram.label}`
                    : "College Academic Scheduling Dashboard"}
                </h1>
                <p>
                  {role === "program_head"
                    ? `Assigned Program: ${selectedProgram.label} (${selectedProgram.key || "ITP"}) · Real-Time Daily Operations Focus`
                    : `Active Program Focus: ${selectedProgram.label} (${selectedProgram.shortLabel || "Collegiate Scope"}) · Daily Timetable Operations`}
                </p>
              </div>
            </div>
            <div className="daily-hero-actions">
              <button
                type="button"
                className="action-button"
                onClick={() => navigate("/schedules")}
              >
                <CalendarRange size={16} />
                <span>Full Timetable</span>
              </button>
            </div>
          </div>

          {/* 3 Compact Status Badges */}
          <div className="daily-status-strip">
            {/* 1. Total Classes Today */}
            <div
              className="daily-stat-badge royal"
              onClick={() => navigate("/schedules")}
              style={{ cursor: "pointer" }}
              title="Click to view all schedules in the Timetable Workspace"
            >
              <div className="daily-stat-info">
                <span className="daily-stat-label">Total Classes Today</span>
                <div className="daily-stat-val-row">
                  <span className="daily-stat-value">{todayClasses.length}</span>
                  <span className="daily-stat-subtext">
                    {todayClasses.length === 1 ? "Class Scheduled" : "Classes Scheduled"}
                  </span>
                </div>
              </div>
              <div className="daily-stat-icon-wrap royal">
                <BookOpen size={22} />
              </div>
            </div>

            {/* 2. Currently Ongoing */}
            <div
              className="daily-stat-badge emerald"
              title="Classes currently in session based on system clock"
            >
              <div className="daily-stat-info">
                <span className="daily-stat-label">Currently Ongoing</span>
                <div className="daily-stat-val-row">
                  <span className="daily-stat-value">{ongoingClasses.length}</span>
                  <span className="daily-stat-subtext">
                    {ongoingClasses.length > 0 ? "Active in Session" : "None Ongoing Now"}
                  </span>
                </div>
              </div>
              <div className="daily-stat-icon-wrap emerald">
                {ongoingClasses.length > 0 ? (
                  <span className="pulse-dot" style={{ width: 12, height: 12 }} />
                ) : (
                  <Clock size={22} />
                )}
              </div>
            </div>

            {/* 3. Action Required */}
            <div
              className={`daily-stat-badge ${todayActionCount > 0 ? "danger" : "emerald"}`}
              onClick={() => {
                if (todayActionCount > 0) {
                  navigate(dailyAttentionItems[0]?.path || "/schedules");
                }
              }}
              style={{ cursor: todayActionCount > 0 ? "pointer" : "default" }}
              title={todayActionCount > 0 ? "Click to resolve urgent daily items" : "All systems clear"}
            >
              <div className="daily-stat-info">
                <span className="daily-stat-label">Action Required</span>
                <div className="daily-stat-val-row">
                  <span className="daily-stat-value">{todayActionCount}</span>
                  <span className="daily-stat-subtext">
                    {todayActionCount > 0
                      ? "Room Collisions & Unassigned"
                      : "All Clear for Today"}
                  </span>
                </div>
              </div>
              <div className={`daily-stat-icon-wrap ${todayActionCount > 0 ? "danger" : "emerald"}`}>
                {todayActionCount > 0 ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
              </div>
            </div>
          </div>

          {/* Primary Area (70% width) vs Secondary Aside (30% width) */}
          <div className="daily-ops-layout">
            {/* Primary Area: Today's Schedule (70% width) */}
            <section className="daily-ops-main">
              <article className="card daily-today-card">
                <div className="card__header" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="daily-section-icon">
                      <CalendarRange size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--srcb-navy)" }}>
                        Today's Schedule
                      </h3>
                      <span style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                        {currentDayName} Timetable · Chronological Order · {selectedProgram.label}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="pill pill--royal" style={{ fontSize: "0.74rem" }}>
                      {todayClasses.length} {todayClasses.length === 1 ? "Class" : "Classes"} Today
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: "0.76rem", padding: "5px 10px" }}
                      onClick={() => navigate("/schedules")}
                      title="Open Full Schedules Workspace"
                    >
                      <span>Manage Timetables</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* List of Today's Scheduled Classes */}
                {todayClasses.length === 0 ? (
                  <div className="today-empty-state">
                    <div className="today-empty-icon">
                      <CalendarCheck size={28} />
                    </div>
                    <p className="today-empty-title">No classes scheduled for today</p>
                    <p className="today-empty-desc">
                      There are no class sessions scheduled for {selectedProgram.label} on {currentDayName}. You can view or add classes in the full schedules workspace.
                    </p>
                    <button
                      type="button"
                      className="action-button"
                      style={{ marginTop: 14, fontSize: "0.82rem", padding: "6px 14px" }}
                      onClick={() => navigate("/schedules")}
                    >
                      <CalendarRange size={14} />
                      <span>Open Schedules Workspace</span>
                    </button>
                  </div>
                ) : (
                  <div className="today-schedule-list">
                    {todayClasses.map((item: any, idx: number) => {
                      const isOngoing = ongoingClasses.some((og: any) => og.id === item.id);
                      const mod = String(item.modality || "Face-to-Face");
                      let pillClass = "pill--f2f";
                      if (mod.toLowerCase().includes("online")) pillClass = "pill--online";
                      else if (mod.toLowerCase().includes("hybrid")) pillClass = "pill--hybrid";
                      else if (mod.toLowerCase().includes("conflict")) pillClass = "pill--conflict";

                      const isFacultyMissing =
                        !item.faculty ||
                        item.faculty.trim() === "" ||
                        item.faculty.toLowerCase().includes("unassigned") ||
                        item.faculty.toLowerCase().includes("tba");

                      const isRoomMissing =
                        !item.room ||
                        item.room.trim() === "" ||
                        item.room.toLowerCase().includes("tba") ||
                        item.room.toLowerCase().includes("unassigned");

                      return (
                        <div
                          key={item.id || idx}
                          className={`today-schedule-row ${isOngoing ? "is-ongoing" : ""}`}
                          onClick={() => setViewingSchedule(item)}
                          role="button"
                          tabIndex={0}
                          title="Click to view schedule details"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setViewingSchedule(item);
                            }
                          }}
                        >
                          {/* Time Column */}
                          <div className="today-sched-time-col">
                            <div className="today-sched-time-badge">
                              <Clock size={13} />
                              <span>{item.time || item.schedule || "TBA"}</span>
                            </div>
                            {isOngoing && (
                              <span className="today-live-tag">
                                <span className="pulse-dot" /> LIVE NOW
                              </span>
                            )}
                          </div>

                          {/* Main Subject & Meta Column */}
                          <div className="today-sched-main-col">
                            <div className="today-sched-subject-row">
                              <div
                                className="today-sched-color-dot"
                                style={{ backgroundColor: item.color || "var(--srcb-navy)" }}
                              />
                              <strong className="today-sched-code">
                                {item.subjectCode || item.code || "Subject"}
                              </strong>
                              <span className="today-sched-dash">—</span>
                              <span className="today-sched-name">
                                {item.subject || item.subjectName || item.name || "Academic Subject"}
                              </span>
                            </div>

                            <div className="today-sched-meta-row">
                              <span className="today-meta-chip section">
                                <GraduationCap size={12} />
                                <span>{item.section || "Unassigned"}</span>
                              </span>

                              <span
                                className={`today-meta-chip ${
                                  isFacultyMissing ? "unassigned" : "faculty"
                                }`}
                              >
                                <Users size={12} />
                                <span>
                                  {isFacultyMissing ? "Unassigned Faculty" : item.faculty}
                                </span>
                              </span>

                              <span
                                className={`today-meta-chip ${
                                  isRoomMissing ? "unassigned" : "room"
                                }`}
                              >
                                <LayoutGrid size={12} />
                                <span>
                                  {isRoomMissing
                                    ? "Unassigned Room"
                                    : `${item.room}${item.building ? ` (${item.building})` : ""}`}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Right Modality & View Column */}
                          <div className="today-sched-right-col">
                            <span className={`pill ${pillClass}`}>
                              {mod}
                            </span>
                            <button
                              type="button"
                              className="secondary-button today-sched-view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingSchedule(item);
                              }}
                            >
                              <Eye size={12} />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>

            {/* Secondary Aside: Immediate Attention (30% width) */}
            <aside className="daily-ops-aside">
              <article className="card attention-card">
                <div className="attention-header">
                  <AlertTriangle size={18} />
                  <span>Immediate Attention</span>
                  {dailyAttentionItems.length > 0 && (
                    <span
                      className="pill pill--danger"
                      style={{ fontSize: "0.7rem", marginLeft: "auto" }}
                    >
                      {dailyAttentionItems.length} Urgent
                    </span>
                  )}
                </div>

                <div className="attention-items-list">
                  {dailyAttentionItems.length === 0 ? (
                    <div className="attention-empty-state">
                      <CheckCircle2 size={26} color="#10b981" />
                      <p className="attention-empty-title">All Systems Nominal</p>
                      <p className="attention-empty-desc">
                        No active room collisions, unassigned venues, or immediate timetable conflicts for today.
                      </p>
                    </div>
                  ) : (
                    dailyAttentionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="attention-item-box"
                        onClick={() => navigate(item.path)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(item.path);
                          }
                        }}
                      >
                        <div className="attention-item-left">
                          <p className="attention-item-title">{item.code}</p>
                          <p className="attention-item-desc">{item.reason}</p>
                        </div>
                        <ChevronRight size={16} className="attention-item-chevron" />
                      </div>
                    ))
                  )}
                </div>
              </article>

              {/* Quick Operations Shortcuts Card */}
              <article className="card" style={{ padding: "16px 18px" }}>
                <div className="card__header" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: "0.92rem", margin: 0, color: "var(--srcb-navy)" }}>
                    Quick Operations Shortcuts
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.8rem",
                    }}
                    onClick={() => navigate("/schedules")}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CalendarRange size={14} color="var(--srcb-navy)" />
                      <span>Manage Timetables</span>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.8rem",
                    }}
                    onClick={() => navigate("/rooms")}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <LayoutGrid size={14} color="var(--srcb-navy)" />
                      <span>Room Availability</span>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.8rem",
                    }}
                    onClick={() => navigate("/faculty")}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Users size={14} color="var(--srcb-navy)" />
                      <span>Faculty Directory</span>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </article>
            </aside>
          </div>

          {/* Program Head: Dedicated My Teaching Schedule (Personal Instructor Timetable) */}
          {role === "program_head" && (
            <div style={{ marginTop: 24 }}>
              <article
                className="card"
                style={{
                  padding: "22px 26px",
                  border: "1px solid var(--srcb-border)",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div className="card__header" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: "rgba(13, 84, 153, 0.12)",
                        color: "var(--srcb-navy)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "1.12rem", color: "var(--srcb-navy)", fontWeight: 700 }}>
                          My Teaching Schedule
                        </h3>
                        <span className="pill pill--royal" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                          {headTeachingSchedules.length} Assigned {headTeachingSchedules.length === 1 ? "Class" : "Classes"}
                        </span>
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: "0.83rem", color: "var(--srcb-text-muted)" }}>
                        Personal instructor timetable • Classes directly assigned to {userName} as course instructor (separate from program management)
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: "0.8rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
                      onClick={() => navigate("/schedules")}
                    >
                      <CalendarRange size={14} />
                      <span>Manage Timetable</span>
                    </button>
                  </div>
                </div>

                {headTeachingSchedules.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", background: "var(--srcb-surface-alt, #f8fafc)", borderRadius: "10px", border: "1px dashed var(--srcb-border)" }}>
                    <div style={{ display: "inline-flex", padding: 10, borderRadius: "50%", background: "rgba(13, 84, 153, 0.08)", color: "var(--srcb-navy)", marginBottom: 8 }}>
                      <BookOpen size={24} />
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                      No direct teaching classes assigned yet for {userName}.
                    </p>
                    <p style={{ margin: "4px auto 0", fontSize: "0.83rem", color: "var(--srcb-text-muted)", maxWidth: 520 }}>
                      When you or the Administrator assign yourself as an instructor to major or collegiate subjects (e.g. Capstone, Advanced Programming, 3rd/4th Year modules), your personal timetable will appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {headTeachingSchedules.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        style={{
                          padding: "16px 18px",
                          borderRadius: "10px",
                          border: "1px solid var(--srcb-border)",
                          background: "var(--srcb-surface-elevated, #ffffff)",
                          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <span className="pill pill--royal" style={{ fontSize: "0.74rem", fontWeight: 700 }}>
                              {item.subjectCode || "Unspecified"}
                            </span>
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
                          <h4 style={{ margin: "8px 0 4px", fontSize: "0.98rem", color: "var(--srcb-navy)", lineHeight: 1.3 }}>
                            {item.subject || "Assigned Subject"}
                          </h4>
                        </div>

                        <div style={{ fontSize: "0.82rem", color: "var(--srcb-text)", display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px solid var(--srcb-border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--srcb-text-muted)", minWidth: 65 }}>Section:</span>
                            <strong>{item.section || "Unassigned"}</strong>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--srcb-text-muted)", minWidth: 65 }}>Schedule:</span>
                            <span style={{ fontWeight: 600 }}>{item.day ? `${item.day} · ${item.time || "TBA"}` : (item.time || "TBA")}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--srcb-text-muted)", minWidth: 65 }}>Facility:</span>
                            <span>{item.room || "TBA"}{item.building ? ` (${item.building})` : ""}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}

          {/* Proactive Examination Period Status & Sequence Tracking Card */}
          <div style={{ marginTop: 24 }}>
            <article
              className="card"
              style={{
                padding: "20px 24px",
                border: "1px solid var(--srcb-border)",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div className="card__header" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: 8, borderRadius: 8, background: "rgba(13, 84, 153, 0.1)", color: "var(--srcb-navy)" }}>
                    <CalendarCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--srcb-navy)", fontWeight: 700 }}>
                      Examination Schedule Period Tracking
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                      Proactive examination period progression and scheduling status across academic terms
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  onClick={() => navigate("/exams")}
                >
                  <span>Open Exam Hub</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* 4 Term Indicators (Prelim, Midterm, Semi-Final, Final) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {examPeriodStatus.termStats.map((item) => {
                  const isNext = examPeriodStatus.nextUnscheduled?.term === item.term;
                  return (
                    <div
                      key={item.term}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 8,
                        border: `1px solid ${
                          item.isScheduled
                            ? "rgba(16, 185, 129, 0.3)"
                            : isNext
                              ? "rgba(245, 158, 11, 0.4)"
                              : "var(--srcb-border)"
                        }`,
                        background: item.isScheduled
                          ? "rgba(16, 185, 129, 0.04)"
                          : isNext
                            ? "rgba(245, 158, 11, 0.05)"
                            : "var(--srcb-surface)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                          {item.term}
                        </span>
                        {item.isScheduled ? (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "#059669",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "rgba(16, 185, 129, 0.12)",
                              padding: "2px 8px",
                              borderRadius: 12,
                            }}
                          >
                            <CheckCircle2 size={12} /> Scheduled
                          </span>
                        ) : isNext ? (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "#d97706",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "rgba(245, 158, 11, 0.12)",
                              padding: "2px 8px",
                              borderRadius: 12,
                            }}
                          >
                            <AlertTriangle size={12} /> Schedule Not Set
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: "var(--srcb-text-muted)",
                              background: "rgba(148, 163, 184, 0.1)",
                              padding: "2px 8px",
                              borderRadius: 12,
                            }}
                          >
                            Upcoming
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                        {item.isScheduled
                          ? `${item.count} scheduled session${item.count > 1 ? "s" : ""}${item.firstDate ? ` • ${item.firstDate}` : ""}`
                          : isNext
                            ? "Pending proctor & room assignments"
                            : "Scheduled in academic progression"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Proactive Reminder Banner if Next Term is Not Scheduled */}
              {examPeriodStatus.nextUnscheduled && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "#b45309" }}>
                        Action Reminder: {examPeriodStatus.nextUnscheduled.term} examination schedule has not been set yet.
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--srcb-text)", marginTop: 2 }}>
                        Please prepare examination dates, proctors, and multi-program room assignments for {examPeriodStatus.nextUnscheduled.term}.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="action-button"
                      style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                      onClick={() => navigate(`/exams?term=${examPeriodStatus.nextUnscheduled?.term}`)}
                    >
                      <CalendarRange size={14} />
                      <span>Set {examPeriodStatus.nextUnscheduled.term} Schedule</span>
                    </button>
                    {examPeriodStatus.termStats.some((t) => t.isScheduled) && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: "0.8rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() =>
                          navigate(
                            `/exams?term=${examPeriodStatus.nextUnscheduled?.term}&copyFrom=${
                              examPeriodStatus.termStats.find((t) => t.isScheduled)?.term || "Prelim"
                            }`
                          )
                        }
                      >
                        <Copy size={14} />
                        <span>
                          Copy {examPeriodStatus.termStats.find((t) => t.isScheduled)?.term || "Prelim"} as Template
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          </div>
        </>
      )}

      {/* Schedule Details Modal */}
      <ScheduleDetailsModal
        isOpen={Boolean(viewingSchedule)}
        onClose={() => setViewingSchedule(null)}
        schedule={viewingSchedule}
      />

      {/* Enlarged Program Logo Modal */}
      <Modal
        isOpen={isLogoModalOpen}
        size="sm"
        eyebrow="Academic Program Seal"
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
            padding: "10px 10px 0",
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
              marginBottom: "16px",
            }}
          >
            <img
              src={getProgramLogo(selectedProgram.key || selectedProgram.label)}
              alt="Enlarged Logo"
              style={{
                width: "200px",
                height: "200px",
                objectFit: "contain",
                filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))",
              }}
            />
          </div>

          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--srcb-navy)",
              margin: "0 0 6px",
            }}
          >
            {selectedProgram.label}
          </h3>

          <p
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#0284c7",
              margin: "0 0 16px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {selectedProgram.shortLabel || selectedProgram.key} Academic Scope
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="action-button"
              onClick={() => setIsLogoModalOpen(false)}
              style={{ minWidth: "140px" }}
            >
              Close Preview
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

