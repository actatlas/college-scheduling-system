import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  CalendarDays,
  ListFilter,
  CalendarRange,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Download,
  Calendar,
  GraduationCap,
  DoorOpen,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { validateScheduleSlot, formatGroupedAvailability, isTimeOverlapping, parseTeacherAvailability, parseTimeToMinutes } from "../utils/scheduling";
import { ScheduleDetailsModal } from "../components/schedule/ScheduleDetailsModal";
import { TimetableSkeleton, CardGridSkeleton } from "../components/common/Skeleton";
import { Tooltip } from "../components/common/Tooltip";
import { SearchableSelect, type SearchableOption } from "../components/common/SearchableSelect";
import { useNotifications } from "../contexts/NotificationContext";
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

function slotToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  return parseTimeToMinutes(timeStr);
}

function isScheduleInSlot(scheduleTime: string, gridSlot: string) {
  if (!scheduleTime || !gridSlot) return false;
  if (scheduleTime.trim().toLowerCase() === gridSlot.trim().toLowerCase()) return true;

  const [sStartStr, sEndStr] = scheduleTime.split("-");
  const [gStartStr, gEndStr] = gridSlot.split("-");
  if (!sStartStr || !gStartStr) return false;

  const sStart = slotToMinutes(sStartStr);
  const sEnd = sEndStr ? slotToMinutes(sEndStr) : sStart + 90;
  const gStart = slotToMinutes(gStartStr);
  const gEnd = gEndStr ? slotToMinutes(gEndStr) : gStart + 90;

  return sStart < gEnd && gStart < sEnd;
}

// Determines the first matching slot row index for a schedule item
function getScheduleStartSlotIdx(scheduleTime: string) {
  if (!scheduleTime) return -1;
  const [sStartStr] = scheduleTime.split("-");
  const sStart = slotToMinutes(sStartStr);

  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const [gStartStr] = TIME_SLOTS[i].split("-");
    const gStart = slotToMinutes(gStartStr);
    if (sStart <= gStart || isScheduleInSlot(scheduleTime, TIME_SLOTS[i])) {
      return i;
    }
  }
  return 0;
}

// Calculates how many consecutive slot rows this schedule spans
function getScheduleRowSpan(scheduleTime: string) {
  if (!scheduleTime) return 1;
  let matchingCount = 0;
  for (let i = 0; i < TIME_SLOTS.length; i++) {
    if (isScheduleInSlot(scheduleTime, TIME_SLOTS[i])) {
      matchingCount++;
    }
  }
  return Math.max(1, matchingCount);
}

const PROGRAM_COURSE_MAP: Record<string, string[]> = {
  CJEP: ["CJEP", "BSCRIM", "CRIM", "CRIMINOLOGY"],
  BSCRIM: ["CJEP", "BSCRIM", "CRIM", "CRIMINOLOGY"],
  CRIM: ["CJEP", "BSCRIM", "CRIM", "CRIMINOLOGY"],
  ITP: ["ITP", "BSIT", "BSCS", "IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE"],
  BSIT: ["ITP", "BSIT", "BSCS", "IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE"],
  BSCS: ["ITP", "BSIT", "BSCS", "IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE"],
  BSA: ["BSA", "BSBA", "BA", "BUSINESS ADMINISTRATION"],
  BSBA: ["BSA", "BSBA", "BA", "BUSINESS ADMINISTRATION"],
  HMP: ["HMP", "BSHM", "HM", "HOSPITALITY MANAGEMENT"],
  BSHM: ["HMP", "BSHM", "HM", "HOSPITALITY MANAGEMENT"],
  TEP: ["TEP", "BSED", "BEED", "EDUC", "EDUCATION", "TEACHER EDUCATION"],
  BSED: ["TEP", "BSED", "BEED", "EDUC", "EDUCATION", "TEACHER EDUCATION"],
  BEED: ["TEP", "BSED", "BEED", "EDUC", "EDUCATION", "TEACHER EDUCATION"],
};

function isSubjectMatchingSection(sub: any, sec: any): boolean {
  if (!sec || !sub) return true;

  const secCourse = String(sec.course || sec.course_code || "").trim().toUpperCase();
  const secProg = String(sec.program || sec.department || "").trim().toUpperCase();
  const secYearStr = String(sec.yearLevel || sec.year_level || sec.year || "").replace(/\D/g, "");
  const secLabel = String(sec.section || sec.section_label || "").trim().toUpperCase();

  const subProg = String(sub.program || sub.programCode || sub.department || sub.courseCode || "").trim().toUpperCase();
  const subYearStr = String(sub.yearLevel || sub.year || "").replace(/\D/g, "");
  const isMajor = Boolean(sub.isMajor);

  const getAliases = (key: string) => {
    if (!key) return [];
    const direct = PROGRAM_COURSE_MAP[key] || [key];
    return Array.from(new Set([key, ...direct]));
  };

  const secAliases = [
    ...getAliases(secCourse),
    ...getAliases(secProg),
  ];

  for (const k of Object.keys(PROGRAM_COURSE_MAP)) {
    if (secLabel.includes(k) || secLabel.startsWith(k)) {
      secAliases.push(...getAliases(k));
    }
  }

  const subAliases = getAliases(subProg);

  let programMatches = false;
  if (!subProg || subProg === "ALL" || subProg === "GEN ED" || subProg === "GENERAL EDUCATION") {
    programMatches = true;
  } else if (secAliases.some((sa) => subAliases.some((sb) => sa === sb || sa.includes(sb) || sb.includes(sa)))) {
    programMatches = true;
  }

  let yearMatches = true;
  if (secYearStr && subYearStr) {
    yearMatches = secYearStr === subYearStr;
  }

  if (isMajor) {
    return programMatches && yearMatches;
  }

  return (programMatches || (!sub.isMajor && subProg === "GEN ED")) && yearMatches;
}

export function SchedulesPage() {
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("view") || searchParams.get("filter") || "grid") as "grid" | "list" | "unscheduled";
  const [viewMode, setViewMode] = useState<"grid" | "list" | "unscheduled">(
    initialView === "unscheduled" ? "unscheduled" : initialView === "list" ? "list" : "grid"
  );

  useEffect(() => {
    const v = searchParams.get("view") || searchParams.get("filter");
    if (v === "unscheduled") {
      setViewMode("unscheduled");
    } else if (v === "list") {
      setViewMode("list");
    } else if (v === "grid") {
      setViewMode("grid");
    }
  }, [searchParams]);

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ClassScheduleItem | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassScheduleItem | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; slotIdx: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: string; slotIdx: number } | null>(null);

  // Multi-Perspective Timetable State (Section vs Faculty vs Room)
  const [perspectiveMode, setPerspectiveMode] = useState<"all" | "section" | "faculty" | "room">("all");
  const [selectedPerspectiveEntity, setSelectedPerspectiveEntity] = useState<string>("All");

  const toast = useToast();
  const { addNotification } = useNotifications();
  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const currentUserName = localStorage.getItem("userName") || "";
  const currentTeacherId = localStorage.getItem("teacherId") || "";

  const canCreate = role === "super_admin" || role === "admin" || role === "program_head";

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

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

  const handleMouseDownCell = (day: string, slotIdx: number) => {
    if (!canCreate) return;
    setIsDraggingGrid(true);
    setDragStart({ day, slotIdx });
    setDragCurrent({ day, slotIdx });
  };

  const handleMouseEnterCell = (day: string, slotIdx: number) => {
    if (isDraggingGrid && dragStart && dragStart.day === day) {
      setDragCurrent({ day, slotIdx });
    }
  };

  const handleMouseUpGrid = () => {
    if (!isDraggingGrid || !dragStart || !dragCurrent) {
      setIsDraggingGrid(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const minIdx = Math.min(dragStart.slotIdx, dragCurrent.slotIdx);
    const maxIdx = Math.max(dragStart.slotIdx, dragCurrent.slotIdx);
    const startSlotStr = TIME_SLOTS[minIdx].split("-")[0];
    const endSlotStr = TIME_SLOTS[maxIdx].split("-")[1];
    const calculatedTime = `${startSlotStr}-${endSlotStr}`;
    const day = dragStart.day;

    const firstSub = availableSubjects[0] || subjectsList[0];
    const defFac = facultyList.find((f) => f.id === firstSub?.instructorId) || facultyList[0];
    const defSec = sectionsList.find((s) => s.program === firstSub?.program) || sectionsList[0];
    const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
    const defRoom = roomsList[0]?.number || "room 101";
    const defBuilding = roomsList[0]?.building || "College Building";

    setEditingSchedule(null);
    setForm({
      day,
      time: calculatedTime,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      section: defSecVal,
      facultyId: defFac?.id || "",
      faculty: defFac?.name || "",
      room: defRoom,
      building: defBuilding,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: Boolean(firstSub?.isMajor),
      program: firstSub?.program || selectedProgram.key || "BSIT",
    });

    setIsDraggingGrid(false);
    setDragStart(null);
    setDragCurrent(null);
    setModalStep(1);
    setIsOpen(true);
  };

  const buildingOptions = useMemo(() => {
    const roomBuildings = roomsList.map((r) => r.building).filter(Boolean);
    const defaults = ["Main Building", "College Building", "Annex", "Science Block", "SHS Building", "JHS Building"];
    return Array.from(new Set([...roomBuildings, ...defaults]));
  }, [roomsList]);

  const availableRoomsForBuilding = useMemo(() => {
    if (!form.building) return roomsList;
    const matchingRooms = roomsList.filter(
      (r) =>
        r.building &&
        (r.building.toLowerCase().trim() === form.building.toLowerCase().trim() ||
          r.building.toLowerCase().includes(form.building.split(" ")[0].toLowerCase()))
    );
    return matchingRooms.length > 0 ? matchingRooms : roomsList;
  }, [roomsList, form.building]);

  const isSlotInDragRange = (day: string, slotIdx: number) => {
    if (!isDraggingGrid || !dragStart || !dragCurrent || dragStart.day !== day) return false;
    const minIdx = Math.min(dragStart.slotIdx, dragCurrent.slotIdx);
    const maxIdx = Math.max(dragStart.slotIdx, dragCurrent.slotIdx);
    return slotIdx >= minIdx && slotIdx <= maxIdx;
  };

  const [dropTarget, setDropTarget] = useState<{ day: string; slot: string } | null>(null);

  const handleDropOnCell = async (day: string, slot: string, dataStr: string) => {
    setDropTarget(null);
    if (!canCreate || !dataStr) return;

    try {
      const payload = JSON.parse(dataStr);

      if (payload.type === "move_schedule") {
        const item: ClassScheduleItem = payload.item;
        const updatedItem = { ...item, day, time: slot };
        await api.put(`/schedules/${encodeURIComponent(item.id)}`, updatedItem);
        toast.push(`Moved class to ${day} at ${slot}`, "success");
        fetchSchedules();
      } else if (payload.type === "new_subject") {
        const sub = payload.subject;
        const defFac = facultyList.find((f) => f.id === sub.instructorId) || facultyList[0];
        const defSec = sectionsList.find((s) => s.program === sub.program) || sectionsList[0];
        const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
        const defRoom = roomsList[0]?.number || "room 101";
        const defBuilding = roomsList[0]?.building || "College Building";

        setEditingSchedule(null);
        setForm({
          day,
          time: slot,
          subjectCode: sub.code || "",
          subject: sub.name || "",
          section: defSecVal,
          facultyId: defFac?.id || "",
          faculty: defFac?.name || "",
          room: defRoom,
          building: defBuilding,
          modality: "Face-to-Face",
          onlineLink: "",
          isMajor: Boolean(sub.isMajor),
          program: sub.program || selectedProgram.key || "BSIT",
        });
        setModalStep(1);
        setIsOpen(true);
      }
    } catch (err: any) {
      toast.push(err?.message || err?.response?.data?.error || "Failed to update schedule location", "error");
      fetchSchedules();
    }
  };

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
    setIsFetching(true);
    Promise.all([
      fetchSchedules(),
      api.get("/faculty").then((res: any) => setFacultyList(res.data?.data || [])).catch(() => setFacultyList([])),
      api.get("/subjects").then((res: any) => setSubjectsList(res.data?.data || [])).catch(() => setSubjectsList([])),
      api.get("/rooms").then((res: any) => setRoomsList(res.data?.data || [])).catch(() => setRoomsList([])),
      api.get("/sections").then((res: any) => setSectionsList(res.data?.data || [])).catch(() => setSectionsList([])),
    ]).finally(() => {
      setIsFetching(false);
    });
  }, []);

  const availableSubjects = useMemo(() => {
    if (role === "program_head") {
      return subjectsList.filter((s) => matchesProgram(s.program || s.department));
    }
    return subjectsList;
  }, [role, subjectsList, selectedProgram.key, matchesProgram]);

  const availableSections = useMemo(() => {
    if (role === "program_head") {
      return sectionsList.filter((s) => matchesProgram(s.program || s.course));
    }
    return sectionsList;
  }, [role, sectionsList, selectedProgram.key, matchesProgram]);

  const availableFaculty = useMemo(() => {
    if (role === "program_head") {
      return facultyList.filter((f) => matchesProgram(f.programs || f.department));
    }
    return facultyList;
  }, [role, facultyList, selectedProgram.key, matchesProgram]);

  const scheduledSubjectCodes = useMemo(() => {
    return new Set(
      scheduleItems.map((s) => (s.subjectCode || "").toUpperCase()).filter(Boolean)
    );
  }, [scheduleItems]);

  const unscheduledSubjects = useMemo(() => {
    return availableSubjects.filter((sub) => {
      const codeMatches = scheduledSubjectCodes.has((sub.code || "").toUpperCase());
      const nameMatches = scheduleItems.some(
        (sc) => (sc.subject || "").toLowerCase() === (sub.name || "").toLowerCase()
      );
      return !codeMatches && !nameMatches;
    });
  }, [availableSubjects, scheduledSubjectCodes, scheduleItems]);

  const filteredUnscheduled = useMemo(() => {
    if (!query.trim()) return unscheduledSubjects;
    const q = query.toLowerCase();
    return unscheduledSubjects.filter(
      (sub) =>
        (sub.code && sub.code.toLowerCase().includes(q)) ||
        (sub.name && sub.name.toLowerCase().includes(q)) ||
        (sub.department && sub.department.toLowerCase().includes(q)) ||
        (sub.program && sub.program.toLowerCase().includes(q))
    );
  }, [unscheduledSubjects, query]);

  // Step 1: Subject options (filtered by Program Head if applicable)
  const subjectOptionsForStep1: SearchableOption[] = useMemo(() => {
    return availableSubjects.map((sub) => {
      const isMajor = Boolean(sub.isMajor);
      const isLab = Number(sub.labHours || 0) > 0;
      const units = sub.units || 3;
      return {
        value: sub.code,
        label: `${sub.code} - ${sub.name}`,
        sublabel: `${isMajor ? "Major Subject" : "General Education"} · ${units} Units · ${sub.program || sub.department || "Curriculum"} ${isLab ? "(Laboratory Required)" : "(Lecture)"}`,
        badge: isMajor ? "Major" : "Gen Ed",
        badgeTone: isMajor ? "blue" : "amber",
        searchKeywords: [
          sub.code,
          sub.name,
          sub.program || "",
          sub.department || "",
          isMajor ? "major" : "gen ed general education",
          isLab ? "lab laboratory" : "lecture",
        ],
      };
    });
  }, [availableSubjects]);

  // Requirement 4 & 11: Step 2 - Available Faculty for selected Day & Time
  const availableFacultyForSlot = useMemo(() => {
    if (!form.day || !form.time) return availableFaculty;

    return availableFaculty.filter((fac) => {
      // 1. Exclude if teacher already has another class scheduled on this day at overlapping time
      const hasClash = scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        const isSameTeacher =
          (s.facultyId && fac.id && String(s.facultyId) === String(fac.id)) ||
          (s.faculty && fac.name && s.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
        if (!isSameTeacher) return false;
        return isTimeOverlapping(s.time, form.time);
      });
      if (hasClash) return false;

      // 2. Check Part-Time and registered availability rules
      if (fac.status === "Part-Time" && fac.availability) {
        const parsedAvail = parseTeacherAvailability(fac.availability);
        const dayEntry = parsedAvail.find((d) => d.day.toLowerCase() === form.day.toLowerCase());
        if (!dayEntry || !dayEntry.slots || dayEntry.slots.length === 0) return false;

        const [candStart] = form.time.split("-").map((t) => t.trim());
        const isSlotListed = dayEntry.slots.some((slot) => {
          const [sStart] = slot.split("-").map((t) => t.trim());
          return (
            slot.includes(form.time) ||
            form.time.includes(slot) ||
            (sStart && candStart && sStart.slice(0, 2) === candStart.slice(0, 2))
          );
        });
        if (!isSlotListed) return false;
      }

      return true;
    });
  }, [availableFaculty, scheduleItems, form.day, form.time, editingSchedule]);

  // Requirement 5 & 11: Step 2 - Available Rooms for selected Day & Time
  const availableRoomsForSlot = useMemo(() => {
    if (form.modality === "Online") return [];
    if (!form.day || !form.time) return roomsList;

    const subObj = subjectsList.find((s) => s.code === form.subjectCode);
    const requiresLab = subObj ? Number(subObj.labHours || 0) > 0 : false;

    return roomsList.filter((rm) => {
      // Exclude rooms under maintenance or inactive
      const status = String(rm.status || "").toLowerCase();
      if (status === "maintenance" || status === "closed" || status === "inactive") return false;

      // Exclude if room is already occupied by a Face-to-Face class on this day at overlapping time
      const hasClash = scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.modality === "Online") return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        if (!s.room || String(s.room).toLowerCase().trim() !== String(rm.number).toLowerCase().trim()) return false;
        return isTimeOverlapping(s.time, form.time);
      });
      if (hasClash) return false;

      // Room type rules: laboratory subjects require lab room
      if (requiresLab) {
        const isLab = /lab/i.test(rm.type || "") || /lab/i.test(rm.building || "");
        if (!isLab) return false;
      }

      return true;
    });
  }, [roomsList, scheduleItems, form.day, form.time, form.modality, form.subjectCode, subjectsList, editingSchedule]);

  // Requirement 6 & 11: Step 2 - Available Sections for selected Subject, Day & Time
  const availableSectionsForSlot = useMemo(() => {
    const subObj = subjectsList.find((s) => s.code === form.subjectCode);

    return availableSections.filter((sec) => {
      // 1. Check curriculum match (section must match subject's program / course & year level)
      if (subObj && !isSubjectMatchingSection(subObj, sec)) {
        return false;
      }

      // 2. Exclude if section already has another class scheduled on this day at overlapping time
      if (form.day && form.time) {
        const hasClash = scheduleItems.some((s) => {
          if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
          if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
          const secLabel = sec.section ? (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : sec.section) : '';
          const sSec = s.section || '';
          const isSameSection =
            sSec.toLowerCase().trim() === sec.section.toLowerCase().trim() ||
            (secLabel && sSec.toLowerCase().trim() === secLabel.toLowerCase().trim()) ||
            sSec.toLowerCase().includes(sec.section.toLowerCase().trim());
          if (!isSameSection) return false;
          return isTimeOverlapping(s.time, form.time);
        });
        if (hasClash) return false;
      }

      return true;
    });
  }, [availableSections, subjectsList, form.subjectCode, form.day, form.time, scheduleItems, editingSchedule]);

  // Searchable Select Mappers for Step 2
  const facultyOptionsForStep2: SearchableOption[] = useMemo(() => {
    return availableFacultyForSlot.map((f) => {
      const isFullTime = f.status === "Full-Time";
      return {
        value: f.id,
        label: f.name,
        sublabel: `${f.department || "Academic Faculty"} · Max Load: ${f.maxLoadHours || 24} hrs/wk`,
        badge: f.status || "Full-Time",
        badgeTone: isFullTime ? "emerald" : "amber",
        searchKeywords: [f.name, f.department || "", f.status || "", f.id],
      };
    });
  }, [availableFacultyForSlot]);

  // Selected Section Headcount for Proactive Room Capacity Verification
  const selectedSectionHeadcount = useMemo(() => {
    if (!form.section) return 0;
    const sec = availableSections.find(
      (s) =>
        s.section === form.section ||
        (s.course && `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() === form.section) ||
        form.section.includes(s.section)
    );
    return Number(sec?.students || 35);
  }, [form.section, availableSections]);

  const selectedRoomObj = useMemo(() => {
    if (!form.room) return null;
    return roomsList.find((r) => String(r.number).toLowerCase().trim() === String(form.room).toLowerCase().trim()) || null;
  }, [form.room, roomsList]);

  const isRoomTooSmall = useMemo(() => {
    if (form.modality === "Online" || !selectedRoomObj || !selectedSectionHeadcount) return false;
    return Number(selectedRoomObj.capacity) < selectedSectionHeadcount;
  }, [form.modality, selectedRoomObj, selectedSectionHeadcount]);

  const roomOptionsForStep2: SearchableOption[] = useMemo(() => {
    return availableRoomsForSlot.map((r) => {
      const isLab = /lab/i.test(r.type || "") || /lab/i.test(r.building || "");
      const isTooSmall = selectedSectionHeadcount > 0 && Number(r.capacity) < selectedSectionHeadcount;
      return {
        value: r.number,
        label: `${r.number} - ${r.building || "Campus"}`,
        sublabel: isTooSmall
          ? `⚠ Capacity: ${r.capacity} — Section requires ${selectedSectionHeadcount} seats`
          : `${r.type || "Classroom"} · Capacity: ${r.capacity} students · Status: Suitable & Available`,
        badge: isTooSmall ? `Too Small (${r.capacity} seats)` : isLab ? "Lab" : `Cap: ${r.capacity}`,
        badgeTone: isTooSmall ? "danger" : isLab ? "purple" : "slate",
        searchKeywords: [r.number, r.building || "", r.type || "", String(r.capacity)],
      };
    });
  }, [availableRoomsForSlot, selectedSectionHeadcount]);

  const sectionOptionsForStep2: SearchableOption[] = useMemo(() => {
    return availableSectionsForSlot.map((sec, idx) => {
      const secLabel = sec.section
        ? sec.course
          ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim()
          : sec.section
        : `Section ${idx + 1}`;
      const studentCount = sec.students || 30;
      return {
        value: secLabel,
        label: secLabel,
        sublabel: `${sec.course || sec.program || "Academic Program"} · Year Level ${sec.yearLevel || "1"} · ${studentCount} enrolled students`,
        badge: `${studentCount} Students`,
        badgeTone: "blue",
        searchKeywords: [sec.course || "", sec.program || "", sec.section || "", `Year ${sec.yearLevel}`],
      };
    });
  }, [availableSectionsForSlot]);

  const isStep1ResourcesAvailable = useMemo(() => {
    if (!form.subjectCode || !form.day || !form.time) return false;
    const hasFaculty = availableFacultyForSlot.length > 0;
    const hasRoom = form.modality === "Online" || availableRoomsForSlot.length > 0;
    const hasSection = availableSectionsForSlot.length > 0;
    return hasFaculty && hasRoom && hasSection;
  }, [form.subjectCode, form.day, form.time, form.modality, availableFacultyForSlot, availableRoomsForSlot, availableSectionsForSlot]);

  const selectedFacultyMember = useMemo(() => {
    return (
      availableFaculty.find(
        (f) => f.id === form.facultyId || (form.faculty && f.name.toLowerCase() === form.faculty.toLowerCase())
      ) || null
    );
  }, [form.facultyId, form.faculty, availableFaculty]);

  const handleContinueToStep2 = () => {
    if (!form.subjectCode) {
      toast.push("Please select an Academic Subject to continue", "error");
      return;
    }
    if (!form.day || !form.time) {
      toast.push("Please select Teaching Day and Time Slot to continue", "error");
      return;
    }

    // Strict Proactive Availability Verification before advancing to Step 2
    if (availableSectionsForSlot.length === 0) {
      toast.push(`No available sections taking ${form.subjectCode} at this time.`, "error");
      return;
    }

    if (availableFacultyForSlot.length === 0) {
      toast.push("No available faculty for this schedule.", "error");
      return;
    }

    if (form.modality === "Face-to-Face" && availableRoomsForSlot.length === 0) {
      toast.push("No available rooms for this schedule.", "error");
      return;
    }

    // Adapt / validate faculty selection for the new slot
    if (!availableFacultyForSlot.some((f) => f.id === form.facultyId || f.name === form.faculty)) {
      const firstFac = availableFacultyForSlot[0];
      if (firstFac) {
        setForm((prev) => ({ ...prev, facultyId: firstFac.id, faculty: firstFac.name }));
      } else {
        setForm((prev) => ({ ...prev, facultyId: "", faculty: "" }));
      }
    }

    // Adapt / validate room selection for the new slot
    if (form.modality === "Face-to-Face") {
      if (!availableRoomsForSlot.some((r) => r.number === form.room)) {
        const firstRoom = availableRoomsForSlot[0];
        if (firstRoom) {
          setForm((prev) => ({ ...prev, room: firstRoom.number, building: (firstRoom.building as BuildingType) || prev.building }));
        } else {
          setForm((prev) => ({ ...prev, room: "" }));
        }
      }
    }

    // Adapt / validate section selection for the new slot & subject
    if (!availableSectionsForSlot.some((s) => s.section === form.section || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === form.section))) {
      const firstSec = availableSectionsForSlot[0];
      if (firstSec) {
        const secVal = firstSec.course ? `${firstSec.course} ${firstSec.yearLevel || ''}-${firstSec.section}`.trim() : firstSec.section;
        setForm((prev) => ({ ...prev, section: secVal }));
      } else {
        setForm((prev) => ({ ...prev, section: "" }));
      }
    }

    setModalStep(2);
  };

  const handleScheduleUnscheduledSubject = (sub: any) => {
    if (!canCreate) return;
    setEditingSchedule(null);
    setForm({
      day: "Monday",
      time: "08:00-09:30",
      subjectCode: sub.code || "",
      subject: sub.name || "",
      section: "",
      facultyId: "",
      faculty: "",
      room: "COL-101",
      building: "College Building" as BuildingType,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: Boolean(sub.isMajor),
      program: sub.program || selectedProgram.key || "BSIT",
    });
    setModalStep(1);
    setIsOpen(true);
  };

  const handleSubjectChange = (code: string) => {
    const sub = subjectsList.find((s) => s.code === code);
    if (!sub) return;

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      isMajor: Boolean(sub.isMajor),
      program: sub.program || prev.program,
    }));
  };

  const handleBuildingChange = (newBuilding: BuildingType) => {
    const matchingRooms = roomsList.filter(
      (r) =>
        r.building &&
        newBuilding &&
        (r.building.toLowerCase().trim() === newBuilding.toLowerCase().trim() ||
          r.building.toLowerCase().includes(newBuilding.split(" ")[0].toLowerCase()))
    );
    const isCurrentValid = matchingRooms.some((r) => r.number === form.room);
    const nextRoom = isCurrentValid
      ? form.room
      : matchingRooms[0]?.number || roomsList[0]?.number || "";

    setForm((prev) => ({
      ...prev,
      building: newBuilding,
      room: nextRoom,
    }));
  };

  const handleRoomChange = (roomNumber: string) => {
    const selectedRoomObj = roomsList.find((r) => r.number === roomNumber);
    setForm((prev) => ({
      ...prev,
      room: roomNumber,
      building: (selectedRoomObj?.building as BuildingType) || prev.building,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    const result = validateScheduleSlot(
      {
        id: editingSchedule?.id,
        day: form.day,
        time: form.time,
        room: form.room,
        building: form.building,
        faculty: form.faculty,
        facultyId: form.facultyId,
        section: form.section,
        modality: form.modality,
      },
      scheduleItems,
      facultyList
    );
    setValidationFeedback(result);
  }, [form.day, form.time, form.room, form.building, form.faculty, form.facultyId, form.section, form.modality, isOpen, editingSchedule, scheduleItems, facultyList]);

  const handleEdit = (item: ClassScheduleItem) => {
    if (!canCreate) {
      setViewingSchedule(item);
      return;
    }
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
    setModalStep(1);
    setIsOpen(true);
  };

  const executeDelete = async () => {
    if (!canCreate || !scheduleToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/schedules/${encodeURIComponent(scheduleToDelete.id)}`);
      toast.push("Class schedule removed successfully", "success");
      addNotification({
        title: "Class Schedule Removed",
        message: `Schedule session for ${scheduleToDelete.subjectCode} (${scheduleToDelete.section}) was removed.`,
        type: "warning",
        link: "/schedules",
        targetRole: "admin,program_head,teacher",
        targetProgram: scheduleToDelete.program,
        targetTeacherId: scheduleToDelete.facultyId,
      });
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.message || err?.response?.data?.error || "Failed to delete schedule", "error");
    } finally {
      setLoading(false);
      setScheduleToDelete(null);
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
      const isRoomInFiltered = availableRoomsForBuilding.some((r) => r.number === form.room);
      const resolvedRoom =
        form.modality === "Online"
          ? "Virtual Room"
          : isRoomInFiltered
            ? form.room
            : (availableRoomsForBuilding[0]?.number || form.room || roomsList[0]?.number || "R-101");

      const resolvedBuilding =
        form.modality === "Online"
          ? "Virtual Classroom"
          : (roomsList.find((r) => r.number === resolvedRoom)?.building as BuildingType) || form.building;

      const payload: Omit<ClassScheduleItem, "id"> & { id?: string } = {
        id: editingSchedule?.id,
        day: form.day,
        time: form.time,
        subjectCode: form.subjectCode,
        subject: form.subject,
        section: form.section,
        faculty: form.faculty,
        facultyId: form.facultyId,
        room: resolvedRoom,
        building: resolvedBuilding,
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
        addNotification({
          title: "Class Schedule Updated",
          message: `${form.subjectCode} for ${form.section} (${form.day} ${form.time}) updated.`,
          type: "success",
          link: "/schedules",
          targetRole: "admin,program_head,teacher",
          targetProgram: form.program,
          targetTeacherId: form.facultyId,
        });
      } else {
        await api.post("/schedules", payload);
        toast.push("Class schedule created successfully", "success");
        addNotification({
          title: "New Class Scheduled",
          message: `${form.subjectCode} assigned to ${form.faculty} on ${form.day} ${form.time}.`,
          type: "success",
          link: "/schedules",
          targetRole: "admin,program_head,teacher",
          targetProgram: form.program,
          targetTeacherId: form.facultyId,
        });
      }

      setIsOpen(false);
      setEditingSchedule(null);
      setModalStep(1);
      fetchSchedules();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save schedule";
      toast.push(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const visibleSchedules = useMemo(() => {
    return scheduleItems.filter((item) => {
      // Perspective filter: By Section, By Faculty, or By Room
      if (perspectiveMode === "section" && selectedPerspectiveEntity !== "All") {
        if (!item.section || !item.section.toLowerCase().includes(selectedPerspectiveEntity.toLowerCase())) {
          return false;
        }
      } else if (perspectiveMode === "faculty" && selectedPerspectiveEntity !== "All") {
        if (!item.faculty || !item.faculty.toLowerCase().includes(selectedPerspectiveEntity.toLowerCase())) {
          return false;
        }
      } else if (perspectiveMode === "room" && selectedPerspectiveEntity !== "All") {
        if (!item.room || !item.room.toLowerCase().includes(selectedPerspectiveEntity.toLowerCase())) {
          return false;
        }
      }

      // If a specific instructor filter is chosen, filter by that instructor
      if (selectedFacultyFilter !== "All") {
        const isMatch =
          item.facultyId === selectedFacultyFilter ||
          item.faculty.toLowerCase() === selectedFacultyFilter.toLowerCase();
        if (!isMatch) return false;
      }

      if (role === "program_head" || (selectedProgram.key && selectedProgram.key !== "ALL")) {
        const itemProg = String(item.program || "").toUpperCase().trim();
        if (itemProg !== "ALL" && itemProg !== "UNIVERSAL" && !itemProg.includes("GENERAL EDUCATION")) {
          if (!matchesProgram(item.program || selectedProgram.shortLabel)) {
            return false;
          }
        }
      }

      if (selectedDayFilter !== "All" && item.day !== selectedDayFilter) {
        return false;
      }

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
  }, [
    scheduleItems,
    perspectiveMode,
    selectedPerspectiveEntity,
    selectedFacultyFilter,
    selectedDayFilter,
    selectedProgram,
    role,
    matchesProgram,
    query,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={
          role === "teacher"
            ? "Faculty Timetable & Class Schedules"
            : role === "program_head"
              ? "Academic Program Class Schedules"
              : "Institutional Class Schedules"
        }
        description={
          role === "teacher"
            ? "View your assigned classes alongside all departmental and institutional teaching schedules."
            : "Manually schedule, monitor, and adjust classes with real-time faculty availability and room clash prevention."
        }
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Schedules</strong>
          </>
        }
        helpText={
          role === "teacher"
            ? "Browse your schedule or view other instructors' timetables to coordinate class times and room availability."
            : "Supports Face-to-Face and Online classes, College/SHS/JHS room assignments, and part-time availability checking."
        }
        actions={
          canCreate ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSchedule(null);
                const firstSec = availableSections[0] || sectionsList[0];
                const defSecVal = firstSec ? (firstSec.course && firstSec.section ? `${firstSec.course} ${firstSec.yearLevel || ''}-${firstSec.section}`.trim() : firstSec.section) : "BSIT 1-A";
                const filteredSubs = availableSubjects.filter((s) => isSubjectMatchingSection(s, firstSec));
                const firstSub = filteredSubs[0] || availableSubjects[0] || subjectsList[0];
                const defFac = availableFaculty.find((f) => f.id === firstSub?.instructorId || f.name === firstSub?.instructor) || availableFaculty[0] || facultyList[0];
                const isLab = Number(firstSub?.labHours || 0) > 0;
                const defRoom = roomsList.find((r) => isLab ? (/lab/i.test(r.type || '') || /lab/i.test(r.building || '')) : true)?.number || roomsList[0]?.number || "COL-101";
                const defBuilding = roomsList[0]?.building || "College Building";
                setForm({
                  day: "Monday",
                  time: "08:00-09:30",
                  subjectCode: firstSub?.code || "",
                  subject: firstSub?.name || "",
                  section: defSecVal,
                  facultyId: defFac?.id || "",
                  faculty: defFac?.name || "",
                  room: defRoom,
                  building: defBuilding as BuildingType,
                  modality: "Face-to-Face",
                  onlineLink: "",
                  isMajor: Boolean(firstSub?.isMajor),
                  program: firstSub?.program || firstSec?.program || selectedProgram.key || "BSIT",
                });
                setModalStep(1);
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Schedule Class
            </button>
          ) : undefined
        }
      />

      {/* Control Bar */}
      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Class Timetable</p>
            <h3>
              {viewMode === "unscheduled"
                ? `Unscheduled Curriculum Subjects (${filteredUnscheduled.length})`
                : `Scheduled Classes (${visibleSchedules.length})`}
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* View Mode Switcher */}
            <div style={{ display: "flex", background: "var(--srcb-surface-alt, #e2e8f0)", borderRadius: 8, padding: 2, border: "1px solid var(--srcb-border)" }}>
              <Tooltip content="Weekly Timetable Grid">
                <button
                  type="button"
                  aria-label="Weekly Timetable Grid View"
                  onClick={() => {
                    setViewMode("grid");
                    setSearchParams({});
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "grid" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "grid" ? "var(--srcb-navy, #0d5499)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "grid" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                  }}
                >
                  <CalendarDays size={14} style={{ display: "inline", marginRight: 4 }} />
                  Weekly Grid
                </button>
              </Tooltip>

              <Tooltip content="List View of Class Sessions">
                <button
                  type="button"
                  aria-label="List View of Class Sessions"
                  onClick={() => {
                    setViewMode("list");
                    setSearchParams({});
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "list" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "list" ? "var(--srcb-navy, #0d5499)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "list" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                  }}
                >
                  <ListFilter size={14} style={{ display: "inline", marginRight: 4 }} />
                  List View
                </button>
              </Tooltip>

              <Tooltip content="Unscheduled Curriculum Subjects">
                <button
                  type="button"
                  aria-label="Unscheduled Curriculum Subjects"
                  onClick={() => {
                    setViewMode("unscheduled");
                    setSearchParams({ view: "unscheduled" });
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "unscheduled" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "unscheduled" ? "var(--srcb-gold, #d97706)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "unscheduled" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CalendarRange size={14} />
                  <span>Unscheduled</span>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 10,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: viewMode === "unscheduled" ? "var(--srcb-gold-soft, #fef3c7)" : "var(--srcb-surface-alt, rgba(148, 163, 184, 0.3))",
                      color: viewMode === "unscheduled" ? "var(--srcb-gold, #92400e)" : "var(--srcb-text-muted, #475569)",
                    }}
                  >
                    {unscheduledSubjects.length}
                  </span>
                </button>
              </Tooltip>
            </div>

            {/* Multi-Perspective Matrix View Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--srcb-surface-alt, #f8fafc)", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                Perspective:
              </label>
              <select
                value={perspectiveMode}
                onChange={(e) => {
                  setPerspectiveMode(e.target.value as any);
                  setSelectedPerspectiveEntity("All");
                }}
                style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.84rem", fontWeight: 600 }}
              >
                <option value="all">All Timetables</option>
                <option value="section">By Section / Block</option>
                <option value="faculty">By Faculty Member</option>
                <option value="room">By Room / Facility</option>
              </select>

              {perspectiveMode === "section" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.84rem", maxWidth: 170 }}
                >
                  <option value="All">All Sections</option>
                  {availableSections.map((sec) => {
                    const label = sec.section || (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : `Section ${sec.id}`);
                    return <option key={sec.id || label} value={label}>{label}</option>;
                  })}
                </select>
              )}

              {perspectiveMode === "faculty" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.84rem", maxWidth: 170 }}
                >
                  <option value="All">All Instructors</option>
                  {availableFaculty.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} ({f.status})</option>
                  ))}
                </select>
              )}

              {perspectiveMode === "room" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.84rem", maxWidth: 170 }}
                >
                  <option value="All">All Rooms & Labs</option>
                  {roomsList.map((r) => (
                    <option key={r.number} value={r.number}>{r.number} - {r.building}</option>
                  ))}
                </select>
              )}
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

            {/* Faculty / Teacher / Program Head Filter */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Instructor:
              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", maxWidth: 190 }}
              >
                <option value="All">All Faculty Members</option>
                {(role === "teacher" || role === "program_head") && currentUserName && (
                  <option value={currentTeacherId || currentUserName}>
                    {role === "program_head" ? `My Classes (${currentUserName})` : `My Schedule (${currentUserName})`}
                  </option>
                )}
                {facultyList
                  .filter((f) => !currentUserName || (f.name !== currentUserName && String(f.id) !== String(currentTeacherId)))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department || "Academic"})
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

        {/* Schedules Content Views */}
        {isFetching ? (
          viewMode === "grid" ? (
            <div style={{ marginTop: 16 }}>
              <TimetableSkeleton />
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <CardGridSkeleton count={6} />
            </div>
          )
        ) : (
          <>
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
              <tbody
                onMouseLeave={() => {
                  if (isDraggingGrid) {
                    setIsDraggingGrid(false);
                    setDragStart(null);
                    setDragCurrent(null);
                  }
                }}
                onMouseUp={handleMouseUpGrid}
              >
                {(() => {
                  // Track occupied (day, slotIdx) slots that are covered by an earlier rowSpan
                  const coveredCells = new Set<string>();

                  return TIME_SLOTS.map((slot, slotIdx) => (
                    <tr key={slot}>
                      <td style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--srcb-navy)", background: "var(--srcb-surface-alt, #f8fafc)" }}>
                        {slot}
                      </td>
                      {DAYS.map((day) => {
                        const cellKey = `${day.toLowerCase()}-${slotIdx}`;
                        if (coveredCells.has(cellKey)) {
                          // This cell is part of an ongoing multi-slot block from an earlier row
                          return null;
                        }

                        // Find any schedule that starts at this slot (or is matching this slot if start not detected)
                        const startingSchedules = visibleSchedules.filter((item) => {
                          if (item.day.toLowerCase() !== day.toLowerCase()) return false;
                          const startIdx = getScheduleStartSlotIdx(item.time);
                          return startIdx === slotIdx;
                        });

                        const inRange = isSlotInDragRange(day, slotIdx);
                        const isDropHover = dropTarget?.day === day && dropTarget?.slot === slot;

                        if (startingSchedules.length === 0) {
                          // Check if there are any orphaned matched schedules that didn't match start index
                          const anyMatched = visibleSchedules.filter(
                            (item) => item.day.toLowerCase() === day.toLowerCase() && isScheduleInSlot(item.time, slot)
                          );

                          if (anyMatched.length === 0) {
                            return (
                              <td
                                key={`${day}-${slot}`}
                                className={`schedule-grid-cell ${inRange ? "drag-hover" : ""} ${isDropHover ? "drag-target-hover" : ""}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (!dropTarget || dropTarget.day !== day || dropTarget.slot !== slot) {
                                    setDropTarget({ day, slot });
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dropTarget?.day === day && dropTarget?.slot === slot) {
                                    setDropTarget(null);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const dataStr = e.dataTransfer.getData("application/json");
                                  handleDropOnCell(day, slot, dataStr);
                                }}
                                onMouseDown={(e) => {
                                  if (e.button === 0) {
                                    handleMouseDownCell(day, slotIdx);
                                  }
                                }}
                                onMouseEnter={() => handleMouseEnterCell(day, slotIdx)}
                              >
                                <div className="schedule-empty-slot">
                                  {isDropHover ? (
                                    <span className="schedule-drag-hint" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                      <Download size={13} style={{ flexShrink: 0 }} /> Drop to assign here
                                    </span>
                                  ) : inRange && dragStart && dragCurrent ? (
                                    <span className="schedule-drag-hint" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                      <Clock size={13} style={{ flexShrink: 0 }} /> {TIME_SLOTS[Math.min(dragStart.slotIdx, dragCurrent.slotIdx)].split("-")[0]} -{" "}
                                      {TIME_SLOTS[Math.max(dragStart.slotIdx, dragCurrent.slotIdx)].split("-")[1]}
                                    </span>
                                  ) : canCreate ? (
                                    <span style={{ fontSize: "0.74rem", opacity: 0.8 }}>+ Click or Drag Range</span>
                                  ) : (
                                    <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>—</span>
                                  )}
                                </div>
                              </td>
                            );
                          }
                        }

                        // Determine the maximum span among starting items for this cell
                        const schedulesToRender = startingSchedules.length > 0 ? startingSchedules : visibleSchedules.filter(
                          (item) => item.day.toLowerCase() === day.toLowerCase() && isScheduleInSlot(item.time, slot)
                        );
                        const maxSpan = Math.max(...schedulesToRender.map((s) => getScheduleRowSpan(s.time)), 1);

                        // Mark subsequent slots as covered
                        for (let offset = 1; offset < maxSpan; offset++) {
                          if (slotIdx + offset < TIME_SLOTS.length) {
                            coveredCells.add(`${day.toLowerCase()}-${slotIdx + offset}`);
                          }
                        }

                        return (
                          <td
                            key={`${day}-${slot}`}
                            rowSpan={maxSpan > 1 ? maxSpan : undefined}
                            className={`schedule-grid-cell ${inRange ? "drag-hover" : ""} ${isDropHover ? "drag-target-hover" : ""}`}
                            style={{ height: maxSpan > 1 ? `${maxSpan * 64}px` : undefined }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!dropTarget || dropTarget.day !== day || dropTarget.slot !== slot) {
                                setDropTarget({ day, slot });
                              }
                            }}
                            onDragLeave={() => {
                              if (dropTarget?.day === day && dropTarget?.slot === slot) {
                                setDropTarget(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const dataStr = e.dataTransfer.getData("application/json");
                              handleDropOnCell(day, slot, dataStr);
                            }}
                          >
                            {schedulesToRender.map((item) => (
                              <div
                                key={item.id}
                                className="schedule-card-draggable"
                                draggable={canCreate}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    "application/json",
                                    JSON.stringify({ type: "move_schedule", item })
                                  );
                                }}
                                onClick={() => {
                                  if (!canCreate) {
                                    setViewingSchedule(item);
                                  }
                                }}
                                title={canCreate ? "Drag to reschedule to another slot" : "Click to view official assigned schedule details"}
                                style={{
                                  background: item.modality === "Online" ? "#f0fdf4" : "#eff6ff",
                                  borderLeft: `5px solid ${item.color || (item.modality === "Online" ? "#10b981" : "#2563eb")}`,
                                  borderTop: "1px solid #e2e8f0",
                                  borderRight: "1px solid #e2e8f0",
                                  borderBottom: "1px solid #e2e8f0",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  marginBottom: 6,
                                  height: "calc(100% - 6px)",
                                  minHeight: maxSpan > 1 ? `${maxSpan * 54}px` : "54px",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                  textAlign: "left",
                                  boxShadow: "0 2px 5px rgba(15, 23, 42, 0.06)",
                                  cursor: canCreate ? "grab" : "pointer",
                                }}
                              >
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                                    <span style={{ fontWeight: 800, fontSize: "0.86rem", color: "var(--srcb-text)" }}>
                                      {item.subjectCode}
                                    </span>
                                    <span
                                      className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                                      style={{ fontSize: "0.68rem", padding: "2px 6px" }}
                                    >
                                      {item.modality}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.8rem", color: "var(--srcb-text)", marginTop: 3, fontWeight: 600 }}>
                                    {item.subject}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                                    <Clock size={12} style={{ flexShrink: 0 }} /> <strong>Time:</strong> {item.time}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                                    <GraduationCap size={12} style={{ flexShrink: 0 }} /> <strong>Sec:</strong> {item.section}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                                    <DoorOpen size={12} style={{ flexShrink: 0 }} /> <strong>Room:</strong> {item.room} ({item.building.split(" ")[0]})
                                  </div>
                                  <div style={{ fontSize: "0.76rem", color: "var(--srcb-navy)", fontWeight: 700, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                                    <UserCheck size={13} style={{ flexShrink: 0 }} /> {item.faculty}
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
                                        fontWeight: 600,
                                      }}
                                    >
                                      <ExternalLink size={12} /> Join Class
                                    </a>
                                  )}
                                </div>

                                {canCreate && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8, paddingTop: 6, borderTop: "1px dashed var(--srcb-border, #cbd5e1)" }}>
                                    <button
                                      type="button"
                                      className="icon-button icon-button--sm"
                                      onClick={() => handleEdit(item)}
                                      title="Edit Class Block"
                                      aria-label={`Edit class block ${item.subjectCode}`}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-button icon-button--sm icon-button--danger"
                                      onClick={() => setScheduleToDelete(item)}
                                      title="Delete Class Block"
                                      aria-label={`Delete class block ${item.subjectCode}`}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode: Filterable List View */}
        {viewMode === "list" && (
          <div style={{ marginTop: 16 }}>
            {visibleSchedules.length === 0 ? (
              <div className="empty-state" style={{ padding: "36px 16px", background: "var(--srcb-surface-alt, #f8fafc)", borderRadius: 8, textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No scheduled classes found matching your filters.</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                  Try changing your Day or Instructor filter, or adjusting your search keywords.
                </p>
                {(query || selectedDayFilter !== "All" || selectedFacultyFilter !== "All") && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setQuery("");
                      setSelectedDayFilter("All");
                      setSelectedFacultyFilter("All");
                    }}
                    style={{ marginTop: 12, fontSize: "0.8rem" }}
                  >
                    Clear Search & Filters
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {visibleSchedules.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: item.modality === "Online" ? "rgba(52, 211, 153, 0.12)" : "var(--srcb-surface-elevated, #ffffff)",
                      border: "1px solid var(--srcb-border)",
                      borderLeft: `5px solid ${item.color || (item.modality === "Online" ? "#10b981" : "#2563eb")}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                      boxShadow: "0 2px 6px rgba(15, 23, 42, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 150ms ease, box-shadow 150ms ease",
                    }}
                  >
                    <div>
                      {/* Card Header: Code & Modality */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                          {item.subjectCode}
                        </span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span
                            className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                            style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                          >
                            {item.modality}
                          </span>
                          <span className={`pill ${item.isMajor ? "pill--royal" : "pill--slate"}`} style={{ fontSize: "0.7rem" }}>
                            {item.isMajor ? "Major" : "Gen Ed"}
                          </span>
                        </div>
                      </div>

                      {/* Subject Name */}
                      <h4 style={{ fontSize: "0.9rem", color: "var(--srcb-text)", margin: "0 0 8px 0", fontWeight: 600, lineHeight: 1.3 }}>
                        {item.subject}
                      </h4>

                      {/* Metadata Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: "0.8rem", color: "var(--srcb-text-muted)", background: "var(--srcb-surface-alt)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Day:</strong> {item.day}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Time:</strong> {item.time}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <GraduationCap size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Section:</strong> {item.section}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <DoorOpen size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Room:</strong> {item.room}
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--srcb-navy)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        <UserCheck size={13} style={{ flexShrink: 0 }} /> {item.faculty}
                      </div>

                      {item.modality === "Online" && item.onlineLink && (
                        <div style={{ marginTop: 6 }}>
                          <a
                            href={item.onlineLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: "0.76rem",
                              color: "#059669",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              textDecoration: "underline",
                              fontWeight: 600,
                            }}
                          >
                            <ExternalLink size={13} /> Open Virtual Meeting Link
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    {canCreate ? (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleEdit(item)}
                          aria-label={`Edit schedule for ${item.subjectCode}`}
                          style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setScheduleToDelete(item)}
                          aria-label={`Remove schedule for ${item.subjectCode}`}
                          style={{ padding: "5px 10px", fontSize: "0.78rem", color: "#dc2626", borderColor: "#fca5a5", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setViewingSchedule(item)}
                          style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unscheduled Subjects View */}
        {viewMode === "unscheduled" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--srcb-text)" }}>
                  Curriculum Subjects Awaiting Class Schedule ({filteredUnscheduled.length})
                </h4>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.84rem" }}>
                  These subjects are active in the institutional catalog but do not currently have an assigned timetable block.
                </p>
              </div>
              <span className="pill pill--amber">
                {filteredUnscheduled.length} Unscheduled
              </span>
            </div>

            {filteredUnscheduled.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                <CheckCircle2 size={40} color="#10b981" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ margin: 0, color: "var(--srcb-text)" }}>All Academic Subjects Scheduled</h3>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
                  Every active curriculum subject in the institutional database has been allocated a timetable schedule.
                </p>
              </div>
            ) : (
              <div className="grid-3" style={{ gap: 16 }}>
                {filteredUnscheduled.map((sub) => (
                  <div
                    key={sub.code || sub.id}
                    className="card"
                    style={{
                      borderLeft: "4px solid #f59e0b",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: 16,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                          {sub.code}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span className={`pill ${sub.isMajor ? "pill--royal" : "pill--slate"}`} style={{ fontSize: "0.7rem" }}>
                            {sub.isMajor ? "Major" : "Gen Ed"}
                          </span>
                          <span className="pill pill--amber" style={{ fontSize: "0.7rem" }}>
                            Unscheduled
                          </span>
                        </div>
                      </div>

                      <h4 style={{ fontSize: "0.92rem", color: "var(--srcb-text)", margin: "0 0 8px 0", fontWeight: 600, lineHeight: 1.3 }}>
                        {sub.name}
                      </h4>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: "0.8rem", color: "var(--srcb-text-muted)", background: "var(--srcb-surface-alt, rgba(148, 163, 184, 0.08))", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)" }}>
                        <div>
                          <strong>Department:</strong> {sub.program || sub.department || "Academic"}
                        </div>
                        <div>
                          <strong>Units:</strong> {sub.units || 3} Units
                        </div>
                        <div>
                          <strong>Lec Hours:</strong> {sub.lecHours || sub.lectureHours || 3} hrs
                        </div>
                        <div>
                          <strong>Lab Hours:</strong> {sub.labHours || 0} hrs
                        </div>
                      </div>
                    </div>

                    {canCreate && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--srcb-border)" }}>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => handleScheduleUnscheduledSubject(sub)}
                          style={{ padding: "6px 14px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <CalendarRange size={14} /> Schedule Now
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </section>

      {/* ===================================================
          TWO-STEP MANUAL CLASS SCHEDULE MODAL
          =================================================== */}
      <Modal
        isOpen={isOpen && canCreate}
        title={
          modalStep === 1
            ? (editingSchedule ? "Edit Class Schedule - Step 1: Basic Information" : "Create Class Schedule - Step 1: Basic Information")
            : (editingSchedule ? "Edit Class Schedule - Step 2: Resource Assignment" : "Create Class Schedule - Step 2: Resource Assignment")
        }
        description={
          modalStep === 1
            ? "Define the academic subject, teaching day, time slot, and instructional delivery mode."
            : "Assign an available instructor, room, and student section for this schedule slot."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingSchedule(null);
          setModalStep(1);
        }}
      >
        {/* Step Indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              background: modalStep === 1 ? "var(--srcb-navy)" : "rgba(148, 163, 184, 0.15)",
              color: modalStep === 1 ? "#ffffff" : "var(--srcb-text-muted)",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>1. Basic Schedule Information</span>
          </div>
          <div
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              background: modalStep === 2 ? "var(--srcb-navy)" : "rgba(148, 163, 184, 0.15)",
              color: modalStep === 2 ? "#ffffff" : "var(--srcb-text-muted)",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>2. Resource Assignment</span>
          </div>
        </div>

        {/* STEP 1: Basic Schedule Information (WHAT & WHEN) */}
        {modalStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field-group">
              <label htmlFor="schedSubject">
                Academic Subject <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <SearchableSelect
                id="schedSubject"
                value={form.subjectCode}
                onChange={(val) => handleSubjectChange(val)}
                options={subjectOptionsForStep1}
                placeholder="Search & select curriculum subject..."
                searchPlaceholder="Search by subject code, title, program..."
                emptyText="No matching academic subjects found"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div className="field-group">
                <label htmlFor="schedDay">
                  Teaching Day <span style={{ color: "#dc2626" }}>*</span>
                </label>
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
                <label htmlFor="schedTime">
                  Time Slot <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  id="schedTime"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                >
                  {!TIME_SLOTS.includes(form.time) && form.time && (
                    <option value={form.time}>
                      {form.time} (Selected Range)
                    </option>
                  )}
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div className="field-group">
                <label htmlFor="schedModality">Teaching Modality</label>
                <select
                  id="schedModality"
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value as ClassModality })}
                >
                  <option value="Face-to-Face">Face-to-Face (On-Campus)</option>
                  <option value="Online">Online (Virtual Meet)</option>
                </select>
              </div>

              {form.modality === "Online" ? (
                <div className="field-group">
                  <label htmlFor="schedOnlineLink">Virtual Meeting Link</label>
                  <input
                    id="schedOnlineLink"
                    placeholder="https://meet.google.com/xxx or Zoom"
                    value={form.onlineLink}
                    onChange={(e) => setForm({ ...form, onlineLink: e.target.value })}
                  />
                </div>
              ) : (
                <div className="field-group">
                  <label htmlFor="schedBuilding">Preferred Campus Building</label>
                  <select
                    id="schedBuilding"
                    value={form.building}
                    onChange={(e) => handleBuildingChange(e.target.value as BuildingType)}
                  >
                    {buildingOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Proactive Availability Assessment (Real-time pre-check) */}
            {form.subjectCode && form.day && form.time && (
              <div
                style={{
                  background: "var(--srcb-surface)",
                  border: "1px solid var(--srcb-border)",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                    Proactive Resource Availability Assessment:
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                    Analyzed for {form.day} • {form.time}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Faculty Badge */}
                  <span
                    className={`pill ${availableFacultyForSlot.length > 0 ? "pill--emerald" : "pill--danger"}`}
                    style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {availableFacultyForSlot.length > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {availableFacultyForSlot.length} Faculty Available
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        No available faculty for this schedule.
                      </>
                    )}
                  </span>

                  {/* Room Badge */}
                  <span
                    className={`pill ${
                      form.modality === "Online" || availableRoomsForSlot.length > 0 ? "pill--emerald" : "pill--danger"
                    }`}
                    style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {form.modality === "Online" ? (
                      <>
                        <CheckCircle2 size={12} />
                        Online Virtual Room
                      </>
                    ) : availableRoomsForSlot.length > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {availableRoomsForSlot.length} Rooms Available
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        No available rooms for this schedule.
                      </>
                    )}
                  </span>

                  {/* Section Badge */}
                  <span
                    className={`pill ${availableSectionsForSlot.length > 0 ? "pill--emerald" : "pill--danger"}`}
                    style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {availableSectionsForSlot.length > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {availableSectionsForSlot.length} Section(s) Taking {form.subjectCode} Available
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        No available sections taking {form.subjectCode} at this time.
                      </>
                    )}
                  </span>
                </div>

                {/* Explicit Proactive Problem Warning if blocked */}
                {!isStep1ResourcesAvailable && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 12px",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: 6,
                      color: "#dc2626",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      {availableSectionsForSlot.length === 0 && (
                        <div>No available sections taking {form.subjectCode} at this time. All matching sections have overlapping schedules.</div>
                      )}
                      {availableFacultyForSlot.length === 0 && (
                        <div>No available faculty for this schedule. All qualified instructors are occupied or outside their availability.</div>
                      )}
                      {form.modality === "Face-to-Face" && availableRoomsForSlot.length === 0 && (
                        <div>No available rooms for this schedule. All classrooms/labs are currently occupied at {form.day} {form.time}.</div>
                      )}
                      <div style={{ fontSize: "0.74rem", fontWeight: 400, marginTop: 4, color: "var(--srcb-text-muted)" }}>
                        Please adjust the Teaching Day or Time Slot to proceed to resource assignment.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="table-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsOpen(false);
                  setEditingSchedule(null);
                  setModalStep(1);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button"
                disabled={!isStep1ResourcesAvailable}
                style={{
                  opacity: isStep1ResourcesAvailable ? 1 : 0.5,
                  cursor: isStep1ResourcesAvailable ? "pointer" : "not-allowed",
                }}
                onClick={handleContinueToStep2}
                title={
                  !isStep1ResourcesAvailable
                    ? "Cannot continue: Required resources (Faculty, Room, or Sections) are unavailable for this slot."
                    : "Proceed to assign Faculty, Room, and Section"
                }
              >
                <span>Continue to Resource Assignment</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Resource Assignment ONLY (WHO, WHERE, FOR WHOM) */}
        {modalStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Step 1 Context Summary Bar (Read-only summary of Step 1) */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                background: "var(--srcb-surface)",
                border: "1px solid var(--srcb-border)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.82rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BookOpen size={14} color="var(--srcb-navy)" />
                <strong>Subject:</strong> <span>{form.subjectCode} - {form.subject}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} color="var(--srcb-navy)" />
                <strong>Slot:</strong> <span>{form.day} • {form.time}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DoorOpen size={14} color="var(--srcb-navy)" />
                <strong>Modality:</strong> <span>{form.modality}</span>
              </div>
            </div>

            {/* Resource 1: Available Faculty */}
            <div className="field-group">
              <label htmlFor="schedFaculty">
                Available Faculty / Instructor <span style={{ color: "#dc2626" }}>*</span>
              </label>
              {availableFacultyForSlot.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>No available faculty for this time.</span>
                </div>
              ) : (
                <SearchableSelect
                  id="schedFaculty"
                  value={form.facultyId}
                  onChange={(val) => {
                    const fac = availableFaculty.find((f) => f.id === val);
                    setForm({
                      ...form,
                      facultyId: val,
                      faculty: fac ? fac.name : "",
                    });
                  }}
                  options={facultyOptionsForStep2}
                  placeholder="Search & select available instructor..."
                  searchPlaceholder="Search instructors by name, department, status..."
                  emptyText="No matching available instructors found"
                />
              )}
            </div>

            {/* Resource 2: Available Room */}
            <div className="field-group">
              <label htmlFor="schedRoom">
                Available Room / Classroom <span style={{ color: "#dc2626" }}>*</span>
              </label>
              {form.modality === "Online" ? (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: 6,
                    color: "#059669",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                  }}
                >
                  Virtual Classroom (Online Mode - No physical room required)
                </div>
              ) : availableRoomsForSlot.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>No available rooms for this time.</span>
                </div>
              ) : (
                <>
                  <SearchableSelect
                    id="schedRoom"
                    value={form.room}
                    onChange={(val) => handleRoomChange(val)}
                    options={roomOptionsForStep2}
                    placeholder="Search & select available classroom or lab..."
                    searchPlaceholder="Search rooms by number, building, type..."
                    emptyText="No matching available rooms found"
                  />
                  {isRoomTooSmall && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 6,
                        color: "#dc2626",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        marginTop: 6,
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>
                        ⚠ Room {form.room} capacity ({selectedRoomObj?.capacity}) is smaller than the section student headcount ({selectedSectionHeadcount}). Please select a room with at least {selectedSectionHeadcount} seats.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Resource 3: Available Section(s) */}
            <div className="field-group">
              <label htmlFor="schedSection">
                Available Student Section <span style={{ color: "#dc2626" }}>*</span>
              </label>
              {availableSectionsForSlot.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>No available sections for this time.</span>
                </div>
              ) : (
                <SearchableSelect
                  id="schedSection"
                  value={form.section}
                  onChange={(val) => {
                    const sec = availableSections.find((s) => s.section === val || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === val));
                    setForm({
                      ...form,
                      section: val,
                      program: sec?.program || sec?.course || form.program,
                    });
                  }}
                  options={sectionOptionsForStep2}
                  placeholder="Search & select available student section..."
                  searchPlaceholder="Search sections (e.g. BSIT 1-A, Year 1)..."
                  emptyText="No matching available student sections found"
                />
              )}
            </div>

            {/* Diagnostics and Conflict Warnings Box */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {/* Part-Time Instructor Availability Window */}
              {selectedFacultyMember && selectedFacultyMember.status === "Part-Time" && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--srcb-surface)",
                    borderRadius: 8,
                    border: "1px solid var(--srcb-border)",
                    borderLeft: "4px solid #f59e0b",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#d97706", fontSize: "0.82rem" }}>
                      <Clock size={14} />
                      <span>Part-Time Instructor Confirmed Availability:</span>
                    </div>
                    <span className="pill pill--online" style={{ fontSize: "0.7rem" }}>Part-Time</span>
                  </div>
                  {(() => {
                    const grouped = formatGroupedAvailability(selectedFacultyMember.availability);
                    if (grouped.length === 0) {
                      return <p style={{ margin: 0, color: "var(--srcb-text-muted)", fontSize: "0.78rem" }}>Standard working hours.</p>;
                    }
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                        {grouped.map(({ day, formattedRange }) => {
                          const isMatchingDay = day.toLowerCase() === form.day.toLowerCase();
                          return (
                            <div
                              key={day}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "4px 8px",
                                background: isMatchingDay ? "rgba(245, 158, 11, 0.15)" : "rgba(148, 163, 184, 0.08)",
                                border: `1px solid ${isMatchingDay ? "rgba(245, 158, 11, 0.4)" : "var(--srcb-border)"}`,
                                borderRadius: 6,
                                fontSize: "0.76rem",
                              }}
                            >
                              <strong style={{ color: isMatchingDay ? "#d97706" : "var(--srcb-text)" }}>{day}:</strong>
                              <span style={{ color: isMatchingDay ? "var(--srcb-text)" : "var(--srcb-text-muted)" }}>{formattedRange}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Conflict Errors Box */}
              {validationFeedback.errors.length > 0 && (
                <div
                  style={{
                    padding: 12,
                    background: "rgba(239, 68, 68, 0.08)",
                    borderRadius: 8,
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderLeft: "4px solid #dc2626",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#dc2626", fontSize: "0.85rem" }}>
                    <AlertTriangle size={16} />
                    <span>Scheduling Conflicts Detected ({validationFeedback.errors.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    {validationFeedback.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: "0.78rem", color: "var(--srcb-text)" }}>
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflict-Free Notice */}
              {validationFeedback.valid && validationFeedback.errors.length === 0 && form.subjectCode && form.section && form.faculty && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "rgba(52, 211, 153, 0.1)",
                    borderRadius: 6,
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    fontSize: "0.8rem",
                    color: "#059669",
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Selected timetable slot, room, section, and instructor are conflict-free.</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="table-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Back to Basic Info</span>
              </button>
              <button
                type="button"
                className="action-button"
                disabled={
                  loading ||
                  !form.subjectCode ||
                  !form.section ||
                  !form.faculty ||
                  (form.modality === "Face-to-Face" && (!form.room || isRoomTooSmall)) ||
                  (!validationFeedback.valid && validationFeedback.errors.length > 0)
                }
                onClick={handleSave}
              >
                <CheckCircle2 size={16} />
                <span>{loading ? "Saving…" : "Confirm Schedule Block"}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Read-Only Assigned Schedule Details Modal */}
      <ScheduleDetailsModal
        isOpen={Boolean(viewingSchedule)}
        onClose={() => setViewingSchedule(null)}
        schedule={viewingSchedule}
      />

      {/* Delete Schedule Block Confirmation Modal (Heuristic 3 & 5) */}
      <ConfirmModal
        isOpen={Boolean(scheduleToDelete)}
        title="Remove Scheduled Class Block"
        variant="danger"
        confirmLabel="Delete Class Block"
        loading={loading}
        onCancel={() => setScheduleToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to remove the scheduled block for <strong>{scheduleToDelete?.subjectCode}</strong> ({scheduleToDelete?.day} {scheduleToDelete?.time}) in room <strong>{scheduleToDelete?.room}</strong>?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> The room, instructor timeslot, and section cohort will be immediately freed up.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
