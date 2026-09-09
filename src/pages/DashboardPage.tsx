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
  LayoutGrid,
  Clock,
  Eye,
  CalendarCheck,
  GraduationCap,
  UserX,
  CheckCircle2,
  Lock,
  Lightbulb,
  Copy,
  X,
  RotateCcw,
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
  "05:30-07:00",
  "06:00-08:00",
];

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

function to12HourTime(t: string): string {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  let h = Number(hStr) || 0;
  const m = mStr.slice(0, 2);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatSlotRangeLabel(slot: string): string {
  if (!slot) return "";
  if (slot.includes("-")) {
    const [start, end] = slot.split("-").map((s) => s.trim());
    return `${to12HourTime(start)} – ${to12HourTime(end)}`;
  }
  return to12HourTime(slot);
}

function parseAvailabilityToMap(raw?: string | null): Record<string, string[]> {
  if (!raw) return {};
  const map: Record<string, string[]> = {};
  const entries = raw.split("|").map((e) => e.trim()).filter(Boolean);

  for (const entry of entries) {
    const [dayPart, ...rest] = entry.split(":");
    if (!dayPart || rest.length === 0) continue;
    const day = dayPart.trim();
    const rawSlots = rest.join(":").split(",").map((s) => s.trim()).filter(Boolean);
    const matchedSlots: string[] = [];

    for (const rawSlot of rawSlots) {
      const [startRaw, endRaw] = rawSlot.split("-").map((s) => s.trim());
      if (!startRaw || !endRaw) continue;

      const startMin = parseTimeToMinutes(startRaw);
      const endMin = parseTimeToMinutes(endRaw);

      for (const gridSlot of AVAILABILITY_SLOTS) {
        const [gStart, gEnd] = gridSlot.split("-").map((s) => s.trim());
        const gStartMin = parseTimeToMinutes(gStart);
        const gEndMin = parseTimeToMinutes(gEnd);

        if (gStartMin >= startMin && gEndMin <= endMin) {
          if (!matchedSlots.includes(gridSlot)) matchedSlots.push(gridSlot);
        } else if (rawSlot === gridSlot || rawSlot.includes(gridSlot) || gridSlot.includes(rawSlot)) {
          if (!matchedSlots.includes(gridSlot)) matchedSlots.push(gridSlot);
        }
      }
      if (matchedSlots.length === 0 && AVAILABILITY_SLOTS.includes(rawSlot)) {
        matchedSlots.push(rawSlot);
      }
    }

    if (matchedSlots.length > 0) {
      map[day] = Array.from(new Set([...(map[day] || []), ...matchedSlots]));
    }
  }

  return map;
}

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
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [scheduleYearFilter, setScheduleYearFilter] = useState<string>("all");
  const [scheduleSectionFilter, setScheduleSectionFilter] = useState<string>("all");
  const [scheduleModalityFilter, setScheduleModalityFilter] = useState<string>("all");
  const [scheduleDayFilter, setScheduleDayFilter] = useState<string>("all");
  const [teacherExams, setTeacherExams] = useState<ExamScheduleItem[]>([]);
  const [allExamsList, setAllExamsList] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [headTeachingSchedules, setHeadTeachingSchedules] = useState<ClassScheduleItem[]>([]);
  const [suspendedUsersList, setSuspendedUsersList] = useState<any[]>([]);
  const [savedAvailability, setSavedAvailability] = useState<string>("");
  const [savedSlots, setSavedSlots] = useState<Record<string, string[]>>({});
  const [draftSlots, setDraftSlots] = useState<Record<string, string[]>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmChangeModalOpen, setIsConfirmChangeModalOpen] = useState(false);
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
      setSectionsList(secs);
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

      if (role === "teacher") {
        const storedTeacherId = window.localStorage.getItem("teacherId");
        const currentTeacher = facs.find(
          (f: any) =>
            (storedTeacherId && String(f.id) === String(storedTeacherId)) ||
            (f.name && f.name.toLowerCase().includes(userName.toLowerCase()))
        );
        if (currentTeacher) {
          setTeacherStatus(currentTeacher.status || "Full-Time");
          const rawAvail = currentTeacher.availability || "";
          setSavedAvailability(rawAvail);
          const parsedMap = parseAvailabilityToMap(rawAvail);
          setSavedSlots(parsedMap);
          setDraftSlots(parsedMap);
          const hasExisting = Boolean(rawAvail.trim() && Object.values(parsedMap).some((s) => s.length > 0));
          setIsEditMode(!hasExisting);
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
              (normalizedHeadName && s.faculty && s.faculty.toLowerCase().includes(normalizedHeadName))
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
    const handleUpdate = () => loadDashboardData(true);
    window.addEventListener("scheduling_storage_update", handleUpdate);
    return () => window.removeEventListener("scheduling_storage_update", handleUpdate);
  }, [role, selectedProgram.key, userName]);

  const handleDraftCheckboxChange = (day: string, slot: string, checked: boolean) => {
    if (role === "teacher" && teacherStatus === "Full-Time") return;

    setDraftSlots((prev) => {
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

  const handleCellInteraction = (day: string, slot: string) => {
    if (!isEditMode) {
      setIsConfirmChangeModalOpen(true);
      return;
    }
    const currentlySelected = (draftSlots[day] || []).includes(slot);
    const mode = currentlySelected ? "deselect" : "select";
    setDragMode(mode);
    setIsDraggingAvail(true);
    handleDraftCheckboxChange(day, slot, mode === "select");
  };

  const handleMouseUpSlots = () => {
    setIsDraggingAvail(false);
  };

  const handleCancelEdit = () => {
    setDraftSlots({ ...savedSlots });
    setIsEditMode(false);
    toast.push("Editing cancelled. Your saved availability remains unchanged.", "info");
  };

  const handleSaveAvailability = async () => {
    const totalSlots = Object.values(draftSlots).reduce((acc, curr) => acc + curr.length, 0);
    if (totalSlots === 0) {
      toast.push("Please select at least one available teaching time slot before saving.", "error");
      return;
    }

    setIsSavingAvailability(true);
    const nextValue = Object.entries(draftSlots)
      .filter(([_, slots]) => slots.length > 0)
      .map(([day, slots]) => `${day}: ${slots.join(", ")}`)
      .join(" | ");

    const resolvedTeacherId =
      window.localStorage.getItem("teacherId") ||
      facultyList.find((f: any) => f.name && f.name.toLowerCase().includes(userName.toLowerCase()))?.id ||
      "FAC-003";

    try {
      await api.put(`/faculty/${encodeURIComponent(resolvedTeacherId)}`, {
        availability: nextValue,
      });
      setSavedAvailability(nextValue);
      const parsedMap = parseAvailabilityToMap(nextValue);
      setSavedSlots(parsedMap);
      setDraftSlots(parsedMap);
      setIsEditMode(false);
      window.localStorage.setItem("teacherAvailability", nextValue);
      toast.push("Teaching availability saved and locked successfully.", "success");
    } catch (error: any) {
      toast.push(error?.response?.data?.error || "Failed to update availability", "error");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const isSlotActive = (day: string, slot: string) => {
    if (role === "teacher" && teacherStatus === "Full-Time") {
      return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day);
    }
    const currentMap = isEditMode ? draftSlots : savedSlots;
    return (currentMap[day] || []).includes(slot);
  };

  const targetSubjects = subjectsList.filter((s: any) => matchesProgram(s.program || s.department));

  const scheduledSubjectCodes = new Set(
    schedules.map((s: any) => (s.subjectCode || "").toUpperCase()).filter(Boolean)
  );
  const unscheduledSubjects = targetSubjects.filter(
    (s: any) =>
      !scheduledSubjectCodes.has((s.code || "").toUpperCase()) &&
      !schedules.some((sc: any) => (sc.subject || "").toLowerCase() === (s.name || "").toLowerCase())
  );
  const totalSubjectsCount = targetSubjects.length;
  const unscheduledCount = unscheduledSubjects.length;
  const scheduledCount = Math.max(0, targetSubjects.length - unscheduledCount);
  const completionRate = targetSubjects.length > 0 ? Math.min(100, Math.round((scheduledCount / targetSubjects.length) * 100)) : 0;

  const scopedFaculty = facultyList.filter((f: any) => matchesProgram(f.programs || f.department));

  const attentionItems: { code: string; reason: string; path: string }[] = [];

  if (Number(metrics.conflicts) > 0) {
    attentionItems.push({
      code: `${metrics.conflicts} Schedule Conflict${Number(metrics.conflicts) === 1 ? "" : "s"} Detected`,
      reason: "Action Required: Resolve room, faculty, or time overlapping",
      path: "/schedules?filter=conflict",
    });
  }

  if (unscheduledCount > 0) {
    attentionItems.push({
      code: `${unscheduledCount} Unscheduled Major Subject${unscheduledCount === 1 ? "" : "s"}`,
      reason: "Action Required: Allocate Timetable Blocks",
      path: "/schedules?view=unscheduled",
    });
  }

  const overloadedTeachers = scopedFaculty.filter((f: any) => {
    const facScheds = schedules.filter(
      (s: any) =>
        (s.facultyId && String(s.facultyId) === String(f.id)) ||
        (s.faculty && f.name && s.faculty.toLowerCase().includes(f.name.toLowerCase()))
    );
    const u = facScheds.reduce((acc: number, s: any) => acc + (Number(s.units) || 3), 0);
    const maxU = f.status === "Part-Time" ? 12 : 18;
    return u > maxU;
  });

  for (const ot of overloadedTeachers.slice(0, 2)) {
    attentionItems.push({
      code: `${ot.name} (${ot.status || "Faculty"})`,
      reason: "Faculty Load Alert: Maximum units exceeded",
      path: "/faculty",
    });
  }

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

  const displayFaculty = scopedFaculty.slice(0, 5).map((f: any) => {
    const facScheds = schedules.filter(
      (s: any) =>
        (s.facultyId && String(s.facultyId) === String(f.id)) ||
        (s.faculty && f.name && s.faculty.toLowerCase().includes(f.name.toLowerCase()))
    );
    const units = facScheds.reduce((acc: number, s: any) => acc + (Number(s.units) || 3), 0);
    const maxUnits = f.status === "Part-Time" ? 12 : 18;
    return {
      id: f.id,
      name: f.name,
      title: f.status || "Faculty Member",
      units,
      maxUnits,
      isOverload: units > maxUnits,
    };
  });

  // Scoped Program Schedules
  const programSchedules = schedules.filter((s: any) =>
    matchesProgram(s.program || s.department)
  );

  // Year level extraction helper
  const getScheduleYearNumber = (item: any): string => {
    if (item.yearLevel) {
      const match = String(item.yearLevel).match(/\d+/);
      if (match) return match[0];
    }
    if (item.section) {
      const secStr = String(item.section);
      const match = secStr.match(/\b([1-4])\s*[-_]/) || secStr.match(/\b([1-4])[A-Za-z]/) || secStr.match(/\b([1-4])\b/);
      if (match) return match[1];
    }
    if (item.subjectCode) {
      const codeMatch = String(item.subjectCode).match(/[A-Za-z]+([1-4])\d{2}/);
      if (codeMatch) return codeMatch[1];
    }
    return "";
  };

  const filteredAssignments = programSchedules.filter((s: any) => {
    // 1. Year level filter
    if (scheduleYearFilter !== "all") {
      const yNum = getScheduleYearNumber(s);
      if (yNum !== scheduleYearFilter) return false;
    }

    // 2. Section filter
    if (scheduleSectionFilter !== "all") {
      if (s.section !== scheduleSectionFilter && s.sectionName !== scheduleSectionFilter) {
        return false;
      }
    }

    // 3. Modality filter
    if (scheduleModalityFilter !== "all") {
      const mod = String(s.modality || "Face-to-Face").toLowerCase();
      if (!mod.includes(scheduleModalityFilter.toLowerCase())) return false;
    }

    // 4. Day filter
    if (scheduleDayFilter !== "all") {
      if (String(s.day).toLowerCase() !== scheduleDayFilter.toLowerCase()) return false;
    }

    // 5. Query filter
    if (assignmentQuery.trim()) {
      const q = assignmentQuery.toLowerCase().trim();
      const code = String(s.subjectCode || s.code || "").toLowerCase();
      const title = String(s.subject || s.subjectName || "").toLowerCase();
      const fac = String(s.faculty || "").toLowerCase();
      const rm = String(s.room || "").toLowerCase();
      const sec = String(s.section || "").toLowerCase();
      if (!code.includes(q) && !title.includes(q) && !fac.includes(q) && !rm.includes(q) && !sec.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const availableSectionsForProgram = Array.from(
    new Set([
      ...programSchedules
        .filter((s: any) => {
          if (scheduleYearFilter === "all") return true;
          return getScheduleYearNumber(s) === scheduleYearFilter;
        })
        .map((s: any) => s.section)
        .filter(Boolean),
      ...sectionsList
        .filter((sec: any) => matchesProgram(sec.course || sec.course_code || sec.program))
        .filter((sec: any) => {
          if (scheduleYearFilter === "all") return true;
          return String(sec.yearLevel || sec.year_level || "") === scheduleYearFilter;
        })
        .map((sec: any) => sec.name || `${sec.course_code || sec.course || "BSIT"} ${sec.year_level || sec.yearLevel || "1"}-${sec.section_label || sec.label || "A"}`)
        .filter(Boolean),
    ])
  ).sort();

  const isScheduleFilterActive =
    scheduleYearFilter !== "all" ||
    scheduleSectionFilter !== "all" ||
    scheduleModalityFilter !== "all" ||
    scheduleDayFilter !== "all" ||
    assignmentQuery.trim() !== "";

  const handleResetScheduleFilters = () => {
    setScheduleYearFilter("all");
    setScheduleSectionFilter("all");
    setScheduleModalityFilter("all");
    setScheduleDayFilter("all");
    setAssignmentQuery("");
  };

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
                    {Number(metrics.conflicts) > 0
                      ? `* ${metrics.conflicts} conflict(s) currently detected in scheduled subjects. Review required.`
                      : "* All scheduled subjects are verified. No timetable conflicts detected."}
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
                {attentionItems.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--srcb-text-muted)" }}>
                    <CheckCircle2 size={26} color="#10b981" style={{ margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "var(--srcb-navy)" }}>All Systems Nominal</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>No active timetable conflicts, unscheduled courses, or overload warnings.</p>
                  </div>
                ) : (
                  attentionItems.map((item, idx) => (
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
                  ))
                )}
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
                {displayFaculty.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--srcb-text-muted)" }}>
                    <Users size={28} color="var(--srcb-slate)" style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "var(--srcb-navy)" }}>No Faculty Assigned</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>Add faculty members in the Faculty Directory to view workload allocations.</p>
                  </div>
                ) : (
                  displayFaculty.map((f: any, idx: number) => {
                    const units = Number(f.units) || 0;
                    const maxUnits = Number(f.maxUnits) || 18;
                    const isOverload = Boolean(f.isOverload);
                    const pct = Math.min(100, Math.round((units / maxUnits) * 100));

                    return (
                      <div key={f.id || idx} className="faculty-load-row">
                        <div className="faculty-load-user">
                          <div className="faculty-load-avatar">
                            {f.name ? f.name.slice(0, 2).toUpperCase() : "FA"}
                          </div>
                          <div className="faculty-load-info">
                            <p className="faculty-load-name">{f.name}</p>
                            <p className="faculty-load-rank">{f.title || "Faculty Member"}</p>
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
                  })
                )}
              </div>
            </article>

            {/* Class Schedules & Assignment Monitor Card with Category Filtering */}
            <article className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="card__header" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={18} color="var(--srcb-navy)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--srcb-navy)" }}>
                      Class Schedules & Assignment Monitor
                    </h3>
                    <span style={{ fontSize: "0.76rem", color: "var(--srcb-text-muted)" }}>
                      {selectedProgram.shortLabel || selectedProgram.label} Timetable Scope
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="pill pill--royal" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                    Showing {filteredAssignments.length} {filteredAssignments.length === 1 ? "Schedule" : "Schedules"}
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: "0.76rem", padding: "4px 8px" }}
                    onClick={() => navigate("/schedules")}
                    title="Open Full Schedules Workspace"
                  >
                    <CalendarRange size={13} />
                    <span>Manage</span>
                  </button>
                </div>
              </div>

              {/* Schedule Category Filter Tabs: Year Level */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--srcb-border)" }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--srcb-slate)", marginRight: 2 }}>
                  Year Level:
                </span>
                {[
                  { key: "all", label: "All Schedules" },
                  { key: "1", label: "1st Year" },
                  { key: "2", label: "2nd Year" },
                  { key: "3", label: "3rd Year" },
                  { key: "4", label: "4th Year" },
                ].map((tab) => {
                  const isActive = scheduleYearFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setScheduleYearFilter(tab.key)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "0.76rem",
                        fontWeight: isActive ? 700 : 500,
                        background: isActive ? "var(--srcb-navy)" : "var(--srcb-surface-hover, rgba(0,0,0,0.05))",
                        color: isActive ? "#ffffff" : "var(--srcb-text-muted)",
                        border: `1px solid ${isActive ? "var(--srcb-navy)" : "var(--srcb-border)"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Filter Controls: Section, Modality, Day, Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {/* Section Dropdown */}
                <select
                  value={scheduleSectionFilter}
                  onChange={(e) => setScheduleSectionFilter(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    fontSize: "0.78rem",
                    background: "var(--srcb-surface-elevated, #ffffff)",
                    color: "var(--srcb-text)",
                  }}
                  aria-label="Filter by Section"
                >
                  <option value="all">All Sections</option>
                  {availableSectionsForProgram.map((sec) => (
                    <option key={sec} value={sec}>
                      Section: {sec}
                    </option>
                  ))}
                </select>

                {/* Modality Dropdown */}
                <select
                  value={scheduleModalityFilter}
                  onChange={(e) => setScheduleModalityFilter(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    fontSize: "0.78rem",
                    background: "var(--srcb-surface-elevated, #ffffff)",
                    color: "var(--srcb-text)",
                  }}
                  aria-label="Filter by Modality"
                >
                  <option value="all">All Modalities</option>
                  <option value="Face-to-Face">Face-to-Face</option>
                  <option value="Online">Online</option>
                  <option value="Hybrid">Hybrid</option>
                </select>

                {/* Day Dropdown */}
                <select
                  value={scheduleDayFilter}
                  onChange={(e) => setScheduleDayFilter(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    fontSize: "0.78rem",
                    background: "var(--srcb-surface-elevated, #ffffff)",
                    color: "var(--srcb-text)",
                  }}
                  aria-label="Filter by Day"
                >
                  <option value="all">All Days</option>
                  {AVAILABILITY_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Live Search Input */}
                <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
                  <Search
                    size={13}
                    style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--srcb-slate)" }}
                  />
                  <input
                    placeholder="Search subject, instructor, room..."
                    value={assignmentQuery}
                    onChange={(e) => setAssignmentQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "4px 8px 4px 26px",
                      borderRadius: 6,
                      border: "1px solid var(--srcb-border)",
                      fontSize: "0.78rem",
                      background: "var(--srcb-surface-elevated, #ffffff)",
                      color: "var(--srcb-text)",
                    }}
                  />
                </div>

                {/* Reset Filters Button */}
                {isScheduleFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetScheduleFilters}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--srcb-border)",
                      background: "var(--srcb-surface-hover, #f8fafc)",
                      fontSize: "0.75rem",
                      color: "var(--srcb-text-muted)",
                      cursor: "pointer",
                    }}
                    title="Reset all filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Data Table */}
              <div className="table-wrap" style={{ maxHeight: "320px", overflowY: "auto" }}>
                {filteredAssignments.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", background: "var(--srcb-surface-alt, #f8fafc)", borderRadius: 8 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--srcb-navy)" }}>
                      No schedules match the selected category or filters.
                    </p>
                    {isScheduleFilterActive && (
                      <button
                        type="button"
                        onClick={handleResetScheduleFilters}
                        style={{
                          marginTop: 8,
                          padding: "4px 12px",
                          borderRadius: 6,
                          background: "var(--srcb-navy)",
                          color: "#fff",
                          border: "none",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject Code</th>
                        <th>Section</th>
                        <th>Faculty</th>
                        <th>Room / Platform</th>
                        <th>Schedule</th>
                        <th>Modality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map((row: any, idx: number) => {
                        const mod = String(row.modality || "Face-to-Face");
                        let pillClass = "pill--f2f";
                        if (mod.toLowerCase().includes("online")) pillClass = "pill--online";
                        else if (mod.toLowerCase().includes("hybrid")) pillClass = "pill--hybrid";
                        else if (mod.toLowerCase().includes("conflict")) pillClass = "pill--conflict";

                        return (
                          <tr key={row.id || idx}>
                            <td style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>
                              <div>{row.code || row.subjectCode || "Unspecified"}</div>
                              {row.subject && (
                                <div style={{ fontSize: "0.72rem", fontWeight: 400, color: "var(--srcb-text-muted)" }}>
                                  {row.subject}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="pill pill--slate" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                                {row.section || "Unassigned"}
                              </span>
                            </td>
                            <td style={{ color: !row.faculty || row.faculty.includes("Unassigned") ? "#94a3b8" : "inherit", fontStyle: !row.faculty || row.faculty.includes("Unassigned") ? "italic" : "normal" }}>
                              {row.faculty || "Unassigned"}
                            </td>
                            <td>{row.room || "TBA"}</td>
                            <td style={{ fontSize: "0.82rem", color: "var(--srcb-text-muted)", whiteSpace: "nowrap" }}>
                              {row.day ? `${row.day} · ${row.time || row.schedule || "TBA"}` : (row.schedule || row.time || "TBA")}
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
                )}
              </div>
            </article>
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
                <div className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0 }}>Interactive Teaching Availability Timesheet</h3>
                      {savedAvailability && !isEditMode ? (
                        <span className="pill pill--emerald" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.76rem" }}>
                          <CheckCircle2 size={13} /> Availability Set
                        </span>
                      ) : isEditMode ? (
                        <span className="pill pill--amber" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.76rem" }}>
                          <Lock size={13} /> Editing Mode
                        </span>
                      ) : null}
                    </div>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.84rem" }}>
                      {!isEditMode && savedAvailability
                        ? "Your official teaching availability is confirmed and locked against accidental modification. To update it, click 'Change Teaching Availability'."
                        : isEditMode
                          ? "Editing Mode Active: Configure your weekly availability below using presets or slot selection, then click 'Save My Teaching Availability'."
                          : "Configure your weekly teaching availability using the timesheet grid or quick presets below."}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!isEditMode && savedAvailability && (
                      <button
                        type="button"
                        className="action-button action-button--navy"
                        style={{ fontSize: "0.82rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() => setIsConfirmChangeModalOpen(true)}
                        title="Request to modify your saved availability schedule"
                      >
                        <RefreshCw size={14} />
                        <span>Change Teaching Availability</span>
                      </button>
                    )}
                    <CalendarClock size={22} color="var(--srcb-navy)" />
                  </div>
                </div>

                {/* Confirmed Availability Summary Box (when not in edit mode and availability exists) */}
                {!isEditMode && savedAvailability && (
                  <div style={{ marginTop: 14 }}>
                    <div className="timesheet-banner-confirmed">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircle2 size={18} color="#059669" />
                        <div>
                          <strong>Confirmed Teaching Schedule:</strong>{" "}
                          <span>
                            {Object.values(savedSlots).reduce((acc, curr) => acc + curr.length, 0)} Total Hours Confirmed across{" "}
                            {Object.entries(savedSlots).filter(([_, s]) => s.length > 0).length} Days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="timesheet-summary-container">
                      {AVAILABILITY_DAYS.map((day) => {
                        const slots = savedSlots[day] || [];
                        if (slots.length === 0) return null;
                        return (
                          <div key={day} className="timesheet-summary-card">
                            <div className="timesheet-summary-day">
                              <span>{day}</span>
                              <span style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                                {slots.length} {slots.length === 1 ? "hour" : "hours"}
                              </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                              {slots.map((s) => (
                                <span key={s} className="timesheet-summary-range">
                                  <Clock size={12} /> {formatSlotRangeLabel(s)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Editing Mode Notice Banner */}
                {isEditMode && (
                  <div className="timesheet-banner-editing">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={18} color="#d97706" />
                      <div>
                        <strong>Editing Mode Active:</strong> Select or deselect time slots below. Remember to click <em>"Save My Teaching Availability"</em> to commit your changes.
                      </div>
                    </div>
                    {savedAvailability && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                        onClick={handleCancelEdit}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                )}

                {/* Quick Presets Toolbar (Enabled in edit mode or initial setup) */}
                {isEditMode && (
                  <div className="timesheet-toolbar" style={{ marginTop: 12 }}>
                    <div className="timesheet-stats">
                      <Clock size={16} />
                      <span>
                        {Object.values(draftSlots).reduce((acc, curr) => acc + curr.length, 0)} Hours Selected across{" "}
                        {Object.entries(draftSlots).filter(([_, s]) => s.length > 0).length} Days
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
                          setDraftSlots(next);
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
                          setDraftSlots(next);
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
                            next[d] = ["05:30-07:00", "06:00-08:00"];
                          });
                          setDraftSlots(next);
                        }}
                      >
                        Evening Slots (5:30PM-8PM)
                      </button>
                      <button
                        type="button"
                        className="timesheet-quick-btn"
                        onClick={() => {
                          const next: Record<string, string[]> = {};
                          ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) => {
                            next[d] = [...AVAILABILITY_SLOTS];
                          });
                          setDraftSlots(next);
                        }}
                      >
                        Select All Mon-Fri
                      </button>
                      <button
                        type="button"
                        className="timesheet-quick-btn"
                        onClick={() => setDraftSlots({})}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}

                {/* Timesheet Weekly Grid */}
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
                          <th style={{ width: 120 }}>Time Slot</th>
                          {AVAILABILITY_DAYS.map((d) => (
                            <th key={d}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {AVAILABILITY_SLOTS.map((slot) => (
                          <tr key={slot}>
                            <td style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--srcb-navy)", background: "var(--srcb-surface-alt, #f8fafc)" }}>
                              {formatSlotRangeLabel(slot)}
                            </td>
                            {AVAILABILITY_DAYS.map((day) => {
                              const active = isSlotActive(day, slot);

                              return (
                                <td
                                  key={`${day}-${slot}`}
                                  className="timesheet-cell"
                                  onClick={() => {
                                    if (!isEditMode) {
                                      setIsConfirmChangeModalOpen(true);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    if (e.button !== 0) return;
                                    handleCellInteraction(day, slot);
                                  }}
                                  onMouseEnter={() => {
                                    if (!isDraggingAvail || !isEditMode) return;
                                    handleDraftCheckboxChange(day, slot, dragMode === "select");
                                  }}
                                >
                                  <div
                                    className={`timesheet-cell-slot ${
                                      !isEditMode && savedAvailability && active
                                        ? "is-confirmed"
                                        : active
                                          ? "is-selected"
                                          : ""
                                    }`}
                                    title={
                                      !isEditMode && savedAvailability
                                        ? "Availability is locked. Click to request changes."
                                        : "Click and drag to select/deselect"
                                    }
                                  >
                                    {!isEditMode && savedAvailability && active ? (
                                      <>
                                        <CheckSquare size={13} />
                                        <span>Confirmed</span>
                                      </>
                                    ) : active ? (
                                      <>
                                        <CheckSquare size={13} />
                                        <span>Available</span>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
                                        {isEditMode ? "+ Add" : "—"}
                                      </span>
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

                  {/* Timesheet Action Footer */}
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--srcb-text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Lightbulb size={15} />{" "}
                      {!isEditMode && savedAvailability
                        ? "Teaching availability is locked to prevent accidental modifications during scheduling."
                        : "Tip: Click and drag your mouse across hours and days to highlight multiple time slots simultaneously."}
                    </span>

                    {isEditMode && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {savedAvailability && (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isSavingAvailability}
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        )}
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
                    )}
                  </div>
                </div>
              </article>
            )}

            {/* CONFIRMATION DIALOG: Change Teaching Availability */}
            {isConfirmChangeModalOpen && (
              <div className="modal-overlay" role="presentation" onClick={() => setIsConfirmChangeModalOpen(false)}>
                <div
                  className="modal-card"
                  role="dialog"
                  aria-modal="true"
                  style={{ maxWidth: 480 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-card__header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "rgba(245, 158, 11, 0.15)",
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h3 id="modal-title" style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                          Change Teaching Availability?
                        </h3>
                        <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                          Confirmation Required
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setIsConfirmChangeModalOpen(false)}
                      aria-label="Close dialog"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="modal-card__body" style={{ padding: "20px 24px" }}>
                    <p style={{ margin: "0 0 14px", fontSize: "0.92rem", color: "var(--srcb-text)", lineHeight: 1.5 }}>
                      Your current teaching availability is already saved. Are you sure you want to change it?
                    </p>
                    <div
                      style={{
                        background: "var(--srcb-surface-alt, #f8fafc)",
                        border: "1px solid var(--srcb-border)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        marginBottom: 20,
                        fontSize: "0.84rem",
                        color: "var(--srcb-text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      Entering edit mode will allow you to modify time slots. Your existing saved availability will remain active until you explicitly submit new changes.
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setIsConfirmChangeModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="action-button action-button--emerald"
                        onClick={() => {
                          setIsConfirmChangeModalOpen(false);
                          setDraftSlots({ ...savedSlots });
                          setIsEditMode(true);
                          toast.push("Editing mode enabled. Select your available slots and click Save.", "info");
                        }}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                      When administrators schedule exams and assign you as proctor, your assigned sessions will appear here.
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
                        <th>Assigned Sections</th>
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

