import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { CardGridSkeleton, TimetableSkeleton } from "../components/common/Skeleton";
import { SubjectPalette } from "../components/schedule/SubjectPalette";
import { useToast } from "../components/common/Toast";
import { Tooltip } from "../components/common/Tooltip";
import { SearchableSelect, type SearchableOption } from "../components/common/SearchableSelect";
import { isTimeOverlapping, isGeneralSubject } from "../utils/scheduling";
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
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Layers,
  ChevronRight,
  ChevronLeft,
  Copy,
  CalendarDays,
  ListFilter,
  Settings,
  Lock,
  Check,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Loader2,
} from "lucide-react";
import { api } from "../data/apiClient";
import { useProgramContext } from "../contexts/ProgramContext";
import type {
  ExamScheduleItem,
  ExamTerm,
  BuildingType,
  SectionItem,
  RoomItem,
  FacultyMember,
  SubjectItem,
} from "../types";

export interface ExamAssignmentInput {
  id?: string;
  program: string;
  room: string;
  building: BuildingType;
  proctor: string;
  proctorId: string;
  sections: string[];
}

export interface ExamAssignmentDisplay {
  id: string;
  program: string;
  room: string;
  building: string;
  proctor: string;
  proctorId?: string;
  sections: string[];
  rawExam: ExamScheduleItem;
}

export interface ExamSessionDisplay {
  sessionKey: string;
  term: ExamTerm;
  examDate: string;
  time: string;
  subjectCode: string;
  subjectName: string;
  program: string;
  assignments: ExamAssignmentDisplay[];
}

export interface GroupedSubjectDisplay {
  subjectCode: string;
  subjectName: string;
  color: string;
  sessions: ExamSessionDisplay[];
}

const EXAM_TIME_SLOTS = [
  "08:00-10:00",
  "10:00-12:00",
  "01:00-03:00",
  "03:00-05:00",
  "05:00-07:00",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const [searchParams] = useSearchParams();

  // Official Examination Period Dates configured by Admin
  const [officialExamDates, setOfficialExamDates] = useState<{
    Prelim: string;
    Midterm: string;
    "Semi-Final": string;
    Final: string;
  }>({
    Prelim: "2026-08-19",
    Midterm: "2026-10-15",
    "Semi-Final": "2026-12-10",
    Final: "2027-03-05",
  });

  const [isPeriodSettingsModalOpen, setIsPeriodSettingsModalOpen] = useState(false);
  const [periodSettingsForm, setPeriodSettingsForm] = useState({
    Prelim: "2026-08-19",
    Midterm: "2026-10-15",
    "Semi-Final": "2026-12-10",
    Final: "2027-03-05",
  });

  const initialTermParam = searchParams.get("term");

  const [termFilter, setTermFilter] = useState(
    initialTermParam && ["Prelim", "Midterm", "Semi-Final", "Final"].includes(initialTermParam)
      ? initialTermParam
      : "All"
  );

  // View mode: default to "grid" for the unified calendar experience
  const [viewMode, setViewMode] = useState<"grid" | "grouped" | "list">("grid");

  // Perspective matrix filter
  const [perspectiveMode, setPerspectiveMode] = useState<"all" | "section" | "faculty" | "room">("all");
  const [selectedPerspectiveEntity, setSelectedPerspectiveEntity] = useState("All");
  const [selectedFacultyFilter] = useState("All");

  // Week / Date navigation state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date("2026-10-14T00:00:00"));

  // Modals state
  const [isOpen, setIsOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [editingExam, setEditingExam] = useState<ExamScheduleItem | null>(null);
  const [isAddingToExistingSession, setIsAddingToExistingSession] = useState(false);

  // Drag-to-schedule state on the timetable grid
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayDate: string; slotIdx: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dayDate: string; slotIdx: number } | null>(null);
  const [isSubjectPaletteOpen, setIsSubjectPaletteOpen] = useState(true);
  const [dropTarget, setDropTarget] = useState<{ dateStr: string; slot: string } | null>(null);

  // Selected session for detailed view inspection
  const [inspectedSession, setInspectedSession] = useState<ExamSessionDisplay | null>(null);

  // Universal Template Copy Modal
  const [isUniversalCopyModalOpen, setIsUniversalCopyModalOpen] = useState(false);
  const [universalCopySourceTerm, setUniversalCopySourceTerm] = useState<ExamTerm>("Prelim");
  const [universalCopyTargetTerm, setUniversalCopyTargetTerm] = useState<ExamTerm>("Midterm");
  const [universalCopyTargetDate, setUniversalCopyTargetDate] = useState("2026-10-15");

  // Single Session Copy Modal
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyModalSession, setCopyModalSession] = useState<ExamSessionDisplay | null>(null);
  const [copyForm, setCopyForm] = useState<{
    targetTerm: ExamTerm;
    targetExamDate: string;
    targetTime: string;
  }>({
    targetTerm: "Final",
    targetExamDate: "2027-03-05",
    targetTime: "08:00 AM - 10:00 AM",
  });
  const [copyAssignments, setCopyAssignments] = useState<
    {
      id: string;
      program: string;
      room: string;
      building: BuildingType;
      proctor: string;
      proctorId: string;
      sections: string[];
    }[]
  >([]);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canManage = role === "super_admin" || role === "admin" || role === "program_head";
  const canEditOfficialDates = role === "super_admin" || role === "admin";
  const isProgramHead = role === "program_head";

  const storedTeacherId = window.localStorage.getItem("teacherId") || "";
  const userName = window.localStorage.getItem("userName") || "";
  const [assignedFilter, setAssignedFilter] = useState<"All" | "Mine">("All");

  const [form, setForm] = useState({
    subject: "",
    subjectCode: "",
    examDate: "2026-10-15",
    time: "08:00 AM - 10:00 AM",
    term: (initialTermParam && ["Prelim", "Midterm", "Semi-Final", "Final"].includes(initialTermParam)
      ? initialTermParam
      : "Midterm") as ExamTerm,
    program: selectedProgram.key || "BSIT",
    assignments: [
      {
        program: "",
        room: "",
        building: "College Building" as BuildingType,
        proctor: "",
        proctorId: "",
        sections: [] as string[],
      },
    ] as ExamAssignmentInput[],
  });

  const [activeAssignmentIdx, setActiveAssignmentIdx] = useState(0);

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

  const fetchOfficialDates = async () => {
    try {
      const res = await api.get("/exams/period-settings");
      if (res.data?.data) {
        setOfficialExamDates(res.data.data);
        setPeriodSettingsForm(res.data.data);
      }
    } catch {
      // Use fallback defaults
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
      // silently handle
    }
  };

  useEffect(() => {
    fetchExams();
    fetchOfficialDates();
    fetchDependencies();
  }, []);

  // Sync URL query params
  useEffect(() => {
    const tParam = searchParams.get("term");
    if (tParam && ["Prelim", "Midterm", "Semi-Final", "Final"].includes(tParam)) {
      setTermFilter(tParam);
      const official = officialExamDates[tParam as ExamTerm] || "2026-10-15";
      setForm((prev) => ({ ...prev, term: tParam as ExamTerm, examDate: official }));
      const d = new Date(`${official}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
      }
    }
    const copyFrom = searchParams.get("copyFrom");
    if (copyFrom && ["Prelim", "Midterm", "Semi-Final", "Final"].includes(copyFrom)) {
      setUniversalCopySourceTerm(copyFrom as ExamTerm);
      if (tParam) {
        setUniversalCopyTargetTerm(tParam as ExamTerm);
        setUniversalCopyTargetDate(officialExamDates[tParam as ExamTerm] || "2026-10-15");
      }
      setIsUniversalCopyModalOpen(true);
    }
  }, [searchParams, officialExamDates]);

  // Calculate Week Dates for Weekly Matrix Navigation
  const weekDates = useMemo(() => {
    const current = new Date(currentDate);
    const day = current.getDay(); // 0: Sun, 1: Mon, ...
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    const result = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dt = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dt}`;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      result.push({
        dayName: DAYS[i],
        dateStr,
        label,
        isToday: new Date().toISOString().split("T")[0] === dateStr,
      });
    }
    return result;
  }, [currentDate]);

  const weekRangeLabel = useMemo(() => {
    if (weekDates.length === 0) return "";
    const start = weekDates[0].label;
    const end = weekDates[weekDates.length - 1].label;
    const year = new Date(currentDate).getFullYear();
    return `${start} – ${end}, ${year}`;
  }, [weekDates, currentDate]);

  const handlePrevWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    if (termFilter !== "All" && officialExamDates[termFilter as ExamTerm]) {
      const d = new Date(`${officialExamDates[termFilter as ExamTerm]}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
        return;
      }
    }
    if (exams.length > 0 && exams[0].examDate) {
      setCurrentDate(new Date(`${exams[0].examDate}T00:00:00`));
    } else {
      setCurrentDate(new Date());
    }
  };

  const handleTermFilterChange = (selectedTerm: string) => {
    setTermFilter(selectedTerm);
    if (selectedTerm !== "All" && officialExamDates[selectedTerm as ExamTerm]) {
      const d = new Date(`${officialExamDates[selectedTerm as ExamTerm]}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
      }
    }
  };

  // Program & Department scoped items
  const availableFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const status = String(f.status || "").toLowerCase();
      if (status === "inactive" || status === "suspended") return false;
      return true;
    });
  }, [facultyList]);

  const availableSubjects = useMemo(() => {
    return subjectsList.filter((s) => {
      const status = String(s.status || "").toLowerCase();
      if (status === "inactive" || status === "archived") return false;
      if (selectedProgram.key === "ALL") return true;
      if (s.isGeneralEducation || s.classification === "General Education" || s.program === "ALL") return true;
      return matchesProgram(s.program || s.department);
    });
  }, [subjectsList, selectedProgram.key, matchesProgram]);

  const availableSections = useMemo(() => {
    return sectionsList.filter((sec) => {
      const status = String(sec.status || "").toLowerCase();
      if (status === "inactive" || status === "archived") return false;
      if (selectedProgram.key === "ALL") return true;
      return matchesProgram(sec.course || sec.program);
    });
  }, [sectionsList, selectedProgram.key, matchesProgram]);

  // Filtered raw exams list
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
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
        (storedTeacherId && String(e.proctorId) === storedTeacherId) ||
        (userName && e.proctor && e.proctor.toLowerCase().includes(userName.toLowerCase()));

      const matchesAssignment = assignedFilter === "All" || (assignedFilter === "Mine" ? isMine : true);

      return matchesSearch && matchesTerm && matchesProg && matchesAssignment;
    });
  }, [exams, query, termFilter, role, matchesProgram, selectedProgram.shortLabel, storedTeacherId, userName, assignedFilter]);

  // Perspective & Instructor Matrix Filtered Exams
  const visibleExams = useMemo(() => {
    return filteredExams.filter((e) => {
      // Perspective filter
      if (perspectiveMode === "section" && selectedPerspectiveEntity !== "All") {
        const secMatch = e.synchronizedSections?.some(
          (s) => s.includes(selectedPerspectiveEntity) || selectedPerspectiveEntity.includes(s)
        );
        if (!secMatch) return false;
      }
      if (perspectiveMode === "faculty" && selectedPerspectiveEntity !== "All") {
        if (e.proctor !== selectedPerspectiveEntity && String(e.proctorId) !== selectedPerspectiveEntity) {
          return false;
        }
      }
      if (perspectiveMode === "room" && selectedPerspectiveEntity !== "All") {
        if (e.room !== selectedPerspectiveEntity) return false;
      }

      // Instructor filter
      if (selectedFacultyFilter !== "All") {
        if (e.proctor !== selectedFacultyFilter && String(e.proctorId) !== selectedFacultyFilter) {
          return false;
        }
      }

      return true;
    });
  }, [filteredExams, perspectiveMode, selectedPerspectiveEntity, selectedFacultyFilter]);

  // Grouped examination subjects
  const groupedExamsBySubject = useMemo(() => {
    const subjectMap = new Map<string, GroupedSubjectDisplay>();

    for (const exam of visibleExams) {
      const subCode = (exam.subjectCode || "GENERAL").toUpperCase();
      if (!subjectMap.has(subCode)) {
        subjectMap.set(subCode, {
          subjectCode: exam.subjectCode || subCode,
          subjectName: exam.subject || subCode,
          color: exam.color || "#0284c7",
          sessions: [],
        });
      }

      const entry = subjectMap.get(subCode)!;

      // Group by Term + ExamDate + Time
      const sessionKey = `${exam.term}::${exam.examDate}::${exam.time}`;
      let session = entry.sessions.find((s) => s.sessionKey === sessionKey);

      if (!session) {
        session = {
          sessionKey,
          term: exam.term,
          examDate: exam.examDate,
          time: exam.time,
          subjectCode: exam.subjectCode || subCode,
          subjectName: exam.subject || subCode,
          program: exam.program || "BSIT",
          assignments: [],
        };
        entry.sessions.push(session);
      }

      const examSections = exam.synchronizedSections || [];
      session.assignments.push({
        id: exam.id,
        program: exam.program || "",
        room: exam.room,
        building: String(exam.building || "College Building"),
        proctor: exam.proctor || "Unassigned",
        proctorId: exam.proctorId,
        sections: [...examSections],
        rawExam: exam,
      });
    }

    return Array.from(subjectMap.values());
  }, [visibleExams]);

  const scheduledExamSubjectCodes = useMemo(() => {
    return new Set(
      visibleExams.map((e) => (e.subjectCode || "").toUpperCase()).filter(Boolean)
    );
  }, [visibleExams]);

  // Available Terms with active exams for template copy
  const termsWithExams = useMemo(() => {
    const termSet = new Set<ExamTerm>();
    exams.forEach((e) => {
      if (e.term) termSet.add(e.term);
    });
    return Array.from(termSet);
  }, [exams]);

  // Official Date Check for Active Term in Modal
  const isOfficialDateConfiguredForTerm = useMemo(() => {
    return Boolean(officialExamDates[form.term]);
  }, [officialExamDates, form.term]);

  const isFormDateMatchingOfficial = useMemo(() => {
    if (!isProgramHead) return true;
    const official = officialExamDates[form.term];
    return official && form.examDate === official;
  }, [isProgramHead, officialExamDates, form.term, form.examDate]);

  // Check if active subject is a universal General Subject
  const isCurrentSubjectGeneral = useMemo(() => {
    if (!form.subjectCode) return false;
    const subObj = availableSubjects.find((s) => s.code === form.subjectCode) || subjectsList.find((s) => s.code === form.subjectCode);
    return isGeneralSubject(subObj || form.subjectCode);
  }, [form.subjectCode, availableSubjects, subjectsList]);

  // Check if an existing exam session already exists for this General Subject in this term
  const existingGeneralExamSession = useMemo(() => {
    if (!isCurrentSubjectGeneral || !form.subjectCode || !form.term) return null;
    return (
      exams.find(
        (e) =>
          e.id !== editingExam?.id &&
          e.term === form.term &&
          (e.subjectCode?.toUpperCase().trim() === form.subjectCode.toUpperCase().trim() ||
            e.subject?.toUpperCase().trim() === form.subject?.toUpperCase().trim())
      ) || null
    );
  }, [isCurrentSubjectGeneral, form.subjectCode, form.term, form.subject, exams, editingExam]);

  // Time slot mismatch detector for General Subjects
  const isGeneralSubjectTimeMismatched = useMemo(() => {
    if (!isCurrentSubjectGeneral || !existingGeneralExamSession) return false;
    const normFormTime = form.time.replace(/\s+/g, "").toUpperCase();
    const normExistTime = existingGeneralExamSession.time.replace(/\s+/g, "").toUpperCase();
    return form.examDate !== existingGeneralExamSession.examDate || normFormTime !== normExistTime;
  }, [isCurrentSubjectGeneral, existingGeneralExamSession, form.examDate, form.time]);

  // Proactive Step 1 Resource Checking
  const availableSectionsForCurrentExam = useMemo(() => {
    if (!form.subjectCode) return [];
    // If it's a general subject, ALL collegiate sections across all programs are eligible!
    const sourceSections = isCurrentSubjectGeneral
      ? sectionsList.filter((sec) => {
        const status = String(sec.status || "").toLowerCase();
        return status !== "inactive" && status !== "archived";
      })
      : availableSections;

    return sourceSections.filter((sec) => {
      const secName = sec.section || `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim();
      const hasClashInOtherExams = exams.some(
        (e) =>
          e.examDate === form.examDate &&
          isTimeOverlapping(e.time, form.time) &&
          e.id !== editingExam?.id &&
          e.synchronizedSections?.some((s) => s === secName || s.includes(sec.section))
      );
      return !hasClashInOtherExams;
    });
  }, [availableSections, sectionsList, isCurrentSubjectGeneral, form.subjectCode, form.examDate, form.time, exams, editingExam]);

  const sectionsGroupedByProgram = useMemo(() => {
    const groups: { [prog: string]: SectionItem[] } = {};
    availableSectionsForCurrentExam.forEach((sec) => {
      const prog = sec.course || sec.program || "GENERAL";
      if (!groups[prog]) groups[prog] = [];
      groups[prog].push(sec);
    });
    return Object.keys(groups).map((prog) => ({
      program: prog,
      sections: groups[prog],
    }));
  }, [availableSectionsForCurrentExam]);

  const availableProctorsForStep1 = useMemo(() => {
    if (!form.examDate || !form.time) return availableFaculty;
    return availableFaculty.filter((fac) => {
      const isOccupiedInExams = exams.some(
        (e) =>
          e.examDate === form.examDate &&
          isTimeOverlapping(e.time, form.time) &&
          e.id !== editingExam?.id &&
          ((e.proctorId && e.proctorId === fac.id) || (e.proctor && e.proctor === fac.name))
      );
      return !isOccupiedInExams;
    });
  }, [availableFaculty, form.examDate, form.time, exams, editingExam]);

  const availableRoomsForStep1 = useMemo(() => {
    if (!form.examDate || !form.time) return roomsList;
    return roomsList.filter((room) => {
      const status = String(room.status || "").toLowerCase();
      if (status === "maintenance" || status === "closed" || status === "inactive") return false;
      const isOccupiedInExams = exams.some(
        (e) =>
          e.examDate === form.examDate &&
          isTimeOverlapping(e.time, form.time) &&
          e.id !== editingExam?.id &&
          e.room === room.number
      );
      return !isOccupiedInExams;
    });
  }, [roomsList, form.examDate, form.time, exams, editingExam]);

  const isExamStep1ResourcesAvailable = useMemo(() => {
    if (!form.subjectCode || !form.examDate || !form.time) return false;
    if (isProgramHead && !isFormDateMatchingOfficial) return false;
    if (isGeneralSubjectTimeMismatched) return false;
    return (
      availableProctorsForStep1.length > 0 &&
      availableRoomsForStep1.length > 0 &&
      availableSectionsForCurrentExam.length > 0
    );
  }, [
    form.subjectCode,
    form.examDate,
    form.time,
    isProgramHead,
    isFormDateMatchingOfficial,
    isGeneralSubjectTimeMismatched,
    availableProctorsForStep1,
    availableRoomsForStep1,
    availableSectionsForCurrentExam,
  ]);

  // Available proctors / rooms per assignment in Step 2
  const getAvailableProctorsForAssignment = useCallback(
    (assignmentIndex: number) => {
      return availableFaculty.filter((fac) => {
        const assignedInOtherIndex = form.assignments.findIndex(
          (a, idx) => idx !== assignmentIndex && a.proctorId === fac.id
        );
        if (assignedInOtherIndex !== -1) return false;
        const isOccupiedInExams = exams.some(
          (e) =>
            e.examDate === form.examDate &&
            isTimeOverlapping(e.time, form.time) &&
            e.id !== editingExam?.id &&
            ((e.proctorId && e.proctorId === fac.id) || (e.proctor && e.proctor === fac.name))
        );
        return !isOccupiedInExams;
      });
    },
    [availableFaculty, form.assignments, exams, form.examDate, form.time, editingExam]
  );

  const getAvailableRoomsForAssignment = useCallback(
    (assignmentIndex: number) => {
      return roomsList.filter((room) => {
        const status = String(room.status || "").toLowerCase();
        if (status === "maintenance" || status === "closed" || status === "inactive") return false;
        const assignedInOtherIndex = form.assignments.findIndex(
          (a, idx) => idx !== assignmentIndex && a.room === room.number
        );
        if (assignedInOtherIndex !== -1) return false;
        const isOccupiedInExams = exams.some(
          (e) =>
            e.examDate === form.examDate &&
            isTimeOverlapping(e.time, form.time) &&
            e.id !== editingExam?.id &&
            e.room === room.number
        );
        return !isOccupiedInExams;
      });
    },
    [roomsList, form.assignments, exams, form.examDate, form.time, editingExam]
  );

  // Modal Step 1 & 2 Handlers
  const handleSubjectSelect = (subCode: string) => {
    const selectedSub = availableSubjects.find((s) => s.code === subCode) || subjectsList.find((s) => s.code === subCode);
    if (!selectedSub) return;
    const isGen = isGeneralSubject(selectedSub || subCode);

    // If an exam session already exists for this general subject in this term, sync to that session's time slot!
    const existing = exams.find(
      (e) =>
        e.id !== editingExam?.id &&
        e.term === form.term &&
        (e.subjectCode?.toUpperCase().trim() === subCode.toUpperCase().trim() ||
          e.subject?.toUpperCase().trim() === selectedSub.name.toUpperCase().trim())
    );

    setForm((prev) => ({
      ...prev,
      subjectCode: selectedSub.code,
      subject: selectedSub.name,
      program: selectedSub.program || selectedProgram.key || "BSIT",
      ...(isGen && existing ? { examDate: existing.examDate, time: existing.time } : {}),
    }));
  };

  const handleFormTermChange = (newTerm: ExamTerm) => {
    const officialDate = officialExamDates[newTerm] || "";
    const isGen = isGeneralSubject(form.subjectCode);

    const existing = isGen
      ? exams.find(
        (e) =>
          e.id !== editingExam?.id &&
          e.term === newTerm &&
          (e.subjectCode?.toUpperCase().trim() === form.subjectCode.toUpperCase().trim() ||
            e.subject?.toUpperCase().trim() === form.subject.toUpperCase().trim())
      )
      : null;

    setForm((prev) => ({
      ...prev,
      term: newTerm,
      examDate: existing ? existing.examDate : (officialDate || prev.examDate),
      ...(existing ? { time: existing.time } : {}),
    }));
  };

  const handleContinueToStep2 = () => {
    if (!form.subjectCode) {
      toast.push("Please select an academic subject", "error");
      return;
    }
    if (!form.examDate) {
      toast.push("Please select the examination date", "error");
      return;
    }
    if (isProgramHead && !isOfficialDateConfiguredForTerm) {
      toast.push(`${form.term} examination date has not yet been configured by the Admin.`, "error");
      return;
    }
    if (isProgramHead && !isFormDateMatchingOfficial) {
      toast.push(`${form.term} examinations are officially scheduled for ${officialExamDates[form.term]}.`, "error");
      return;
    }
    if (!form.time) {
      toast.push("Please enter a valid time slot", "error");
      return;
    }
    if (isGeneralSubjectTimeMismatched && existingGeneralExamSession) {
      toast.push(
        `Anti-Answer-Sharing Policy: All sections taking general subject ${form.subjectCode} must take the exam in the same time slot (${existingGeneralExamSession.time} on ${existingGeneralExamSession.examDate}).`,
        "error"
      );
      return;
    }
    if (!isExamStep1ResourcesAvailable) {
      toast.push("Required resources (proctors, rooms, or sections) are unavailable for this slot", "error");
      return;
    }
    setModalStep(2);
  };

  const handleAutoDistributeSections = () => {
    if (availableSectionsForCurrentExam.length === 0) {
      toast.push("No eligible sections available to schedule for this time slot.", "error");
      return;
    }

    const alreadyAssignedSecs = new Set(form.assignments.flatMap((a) => a.sections));
    const unassigned = availableSectionsForCurrentExam.filter((s) => {
      const secName = s.section || `${s.course} ${s.yearLevel || ""}-${s.section}`.trim();
      return !alreadyAssignedSecs.has(secName) && !alreadyAssignedSecs.has(s.section);
    });

    const targetSections = unassigned.length > 0 ? unassigned : availableSectionsForCurrentExam;

    const freeRooms = roomsList.filter((room) => {
      const status = String(room.status || "").toLowerCase();
      if (status === "maintenance" || status === "closed" || status === "inactive") return false;
      const clash = exams.some(
        (e) =>
          e.examDate === form.examDate &&
          isTimeOverlapping(e.time, form.time) &&
          e.id !== editingExam?.id &&
          e.room === room.number
      );
      return !clash;
    });

    const freeProctors = availableFaculty.filter((fac) => {
      const clash = exams.some(
        (e) =>
          e.examDate === form.examDate &&
          isTimeOverlapping(e.time, form.time) &&
          e.id !== editingExam?.id &&
          ((e.proctorId && e.proctorId === fac.id) || (e.proctor && e.proctor === fac.name))
      );
      return !clash;
    });

    if (freeRooms.length === 0 || freeProctors.length === 0) {
      toast.push("Not enough conflict-free classrooms or proctors free at this time slot.", "error");
      return;
    }

    const newAssignments: ExamAssignmentInput[] = [];
    let roomIdx = 0;
    let proctorIdx = 0;
    let currentRoomSections: string[] = [];
    let currentRoomStudents = 0;
    let currentRoom = freeRooms[roomIdx];
    let currentProctor = freeProctors[proctorIdx];

    for (const sec of targetSections) {
      const secName = sec.section || `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim();
      const studentCount = Number(sec.students || 35);
      const roomCapacity = Number(currentRoom?.capacity || 40);

      if (
        currentRoomSections.length > 0 &&
        currentRoomStudents + studentCount > roomCapacity &&
        roomIdx + 1 < freeRooms.length &&
        proctorIdx + 1 < freeProctors.length
      ) {
        newAssignments.push({
          program: currentRoomSections[0]?.split(" ")[0] || form.program,
          room: currentRoom.number,
          building: (currentRoom.building as BuildingType) || "College Building",
          proctor: currentProctor.name,
          proctorId: currentProctor.id,
          sections: currentRoomSections,
        });

        roomIdx++;
        proctorIdx++;
        currentRoom = freeRooms[roomIdx];
        currentProctor = freeProctors[proctorIdx];
        currentRoomSections = [secName];
        currentRoomStudents = studentCount;
      } else {
        currentRoomSections.push(secName);
        currentRoomStudents += studentCount;
      }
    }

    if (currentRoomSections.length > 0 && currentRoom && currentProctor) {
      newAssignments.push({
        program: currentRoomSections[0]?.split(" ")[0] || form.program,
        room: currentRoom.number,
        building: (currentRoom.building as BuildingType) || "College Building",
        proctor: currentProctor.name,
        proctorId: currentProctor.id,
        sections: currentRoomSections,
      });
    }

    if (newAssignments.length > 0) {
      setForm((prev) => {
        const keepExisting = unassigned.length > 0 && prev.assignments.some((a) => a.sections.length > 0);
        return {
          ...prev,
          assignments: keepExisting ? [...prev.assignments, ...newAssignments] : newAssignments,
        };
      });
      toast.push(
        `⚡ Auto-distributed ${targetSections.length} section(s) across ${newAssignments.length} room(s) for ${form.time}!`,
        "success"
      );
    }
  };

  const handleAddAssignmentRow = () => {
    setForm((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          program: "",
          room: "",
          building: "College Building",
          proctor: "",
          proctorId: "",
          sections: [],
        },
      ],
    }));
  };

  const handleRemoveAssignmentRow = (index: number) => {
    if (form.assignments.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((_, idx) => idx !== index),
    }));
  };

  const handleAssignmentProctorChange = (assignmentIndex: number, proctorId: string) => {
    const fac = availableFaculty.find((f) => f.id === proctorId);
    setForm((prev) => {
      const next = [...prev.assignments];
      next[assignmentIndex] = {
        ...next[assignmentIndex],
        proctorId,
        proctor: fac ? fac.name : "",
      };
      return { ...prev, assignments: next };
    });
  };

  const handleAssignmentRoomChange = (assignmentIndex: number, roomNumber: string) => {
    const rm = roomsList.find((r) => r.number === roomNumber);
    setForm((prev) => {
      const next = [...prev.assignments];
      next[assignmentIndex] = {
        ...next[assignmentIndex],
        room: roomNumber,
        building: (rm?.building as BuildingType) || "College Building",
      };
      return { ...prev, assignments: next };
    });
  };

  const handleToggleSectionInAssignment = (assignmentIndex: number, sectionName: string, programName?: string) => {
    setForm((prev) => {
      const next = [...prev.assignments];
      const curAssignment = next[assignmentIndex];
      const exists = curAssignment.sections.includes(sectionName);
      const updatedSections = exists
        ? curAssignment.sections.filter((s) => s !== sectionName)
        : [...curAssignment.sections, sectionName];

      let updatedProg = curAssignment.program;
      if (!exists && programName && !updatedProg) {
        updatedProg = programName;
      }

      next[assignmentIndex] = {
        ...curAssignment,
        sections: updatedSections,
        program: updatedProg,
      };
      return { ...prev, assignments: next };
    });
  };

  const handleAssignAllProgramSections = (assignmentIndex: number, programName: string, sections: SectionItem[]) => {
    const sectionNames = sections.map((s) => s.section || `${s.course} ${s.yearLevel || ""}-${s.section}`.trim());
    setForm((prev) => {
      const next = [...prev.assignments];
      const curAssignment = next[assignmentIndex];
      const merged = Array.from(new Set([...curAssignment.sections, ...sectionNames]));
      next[assignmentIndex] = {
        ...curAssignment,
        program: curAssignment.program || programName,
        sections: merged,
      };
      return { ...prev, assignments: next };
    });
  };

  // Cell interaction: click empty cell or drag range to schedule
  const handleClickEmptyCell = (dateStr: string, slot: string) => {
    if (!canManage) return;
    const activeTerm = (termFilter !== "All" ? termFilter : "Midterm") as ExamTerm;
    const officialDate = officialExamDates[activeTerm] || dateStr;

    if (isProgramHead && !officialExamDates[activeTerm]) {
      toast.push(`${activeTerm} examination date has not yet been configured by the Admin.`, "error");
      return;
    }

    setEditingExam(null);
    setIsAddingToExistingSession(false);
    const firstSub = availableSubjects[0] || subjectsList[0];
    const [st, et] = slot.split("-");
    const formattedTime = `${st.trim()} - ${et.trim()}`;

    setForm({
      term: activeTerm,
      examDate: isProgramHead ? officialDate : dateStr,
      time: formattedTime,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      program: selectedProgram.key || "BSIT",
      assignments: [
        {
          program: "",
          room: "",
          building: "College Building" as BuildingType,
          proctor: "",
          proctorId: "",
          sections: [],
        },
      ],
    });
    setModalStep(1);
    setIsOpen(true);
  };

  const handleMouseDownCell = (dayDate: string, slotIdx: number) => {
    if (!canManage) return;
    setIsDraggingGrid(true);
    setDragStart({ dayDate, slotIdx });
    setDragEnd({ dayDate, slotIdx });
  };

  const handleMouseEnterCell = (dayDate: string, slotIdx: number) => {
    if (isDraggingGrid && dragStart && dragStart.dayDate === dayDate) {
      setDragEnd({ dayDate, slotIdx });
    }
  };

  const handleMouseUpCell = () => {
    if (isDraggingGrid && dragStart && dragEnd && dragStart.dayDate === dragEnd.dayDate) {
      const startIdx = Math.min(dragStart.slotIdx, dragEnd.slotIdx);
      const endIdx = Math.max(dragStart.slotIdx, dragEnd.slotIdx);
      const startSlot = EXAM_TIME_SLOTS[startIdx].split("-")[0];
      const endSlot = EXAM_TIME_SLOTS[endIdx].split("-")[1];
      const finalTime = `${startSlot} - ${endSlot}`;

      handleClickEmptyCell(dragStart.dayDate, finalTime);
    }
    setIsDraggingGrid(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleDropOnExamCell = (dateStr: string, slot: string, dataStr: string) => {
    setDropTarget(null);
    if (!canManage || !dataStr) return;
    try {
      const payload = JSON.parse(dataStr);
      if (payload.type === "new_subject") {
        const sub = payload.subject;
        const activeTerm = (termFilter !== "All" ? termFilter : "Midterm") as ExamTerm;
        const officialDate = officialExamDates[activeTerm] || dateStr;

        if (isProgramHead && !officialExamDates[activeTerm]) {
          toast.push(`${activeTerm} examination date has not yet been configured by the Admin.`, "error");
          return;
        }

        setEditingExam(null);
        setIsAddingToExistingSession(false);
        const [st, et] = slot.split("-");
        const formattedTime = `${st.trim()} - ${et.trim()}`;

        const defProg = sub.program || selectedProgram.key || "BSIT";
        const defSec = sectionsList.find((s) => s.program === defProg) || sectionsList[0];
        const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "";

        setForm({
          term: activeTerm,
          examDate: isProgramHead ? officialDate : dateStr,
          time: formattedTime,
          subjectCode: sub.code || "",
          subject: sub.name || "",
          program: defProg,
          assignments: [
            {
              program: defProg,
              room: roomsList[0]?.number || "COL-101",
              building: (roomsList[0]?.building as BuildingType) || "College Building",
              proctor: "",
              proctorId: "",
              sections: defSecVal ? [defSecVal] : [],
            },
          ],
        });
        setModalStep(2);
        setIsOpen(true);
      }
    } catch (err: any) {
      toast.push(err?.message || "Failed to drop subject on exam slot", "error");
    }
  };

  const handleScheduleExamForSubject = (sub: SubjectItem | any) => {
    if (!canManage) return;
    setEditingExam(null);
    setIsAddingToExistingSession(false);
    const activeTerm = (termFilter !== "All" ? termFilter : "Midterm") as ExamTerm;
    const officialDate = officialExamDates[activeTerm] || "2026-10-15";
    const defProg = sub.program || selectedProgram.key || "BSIT";

    setForm({
      term: activeTerm,
      examDate: officialDate,
      time: "08:00 AM - 10:00 AM",
      subjectCode: sub.code || "",
      subject: sub.name || "",
      program: defProg,
      assignments: [
        {
          program: defProg,
          room: roomsList[0]?.number || "COL-101",
          building: (roomsList[0]?.building as BuildingType) || "College Building",
          proctor: "",
          proctorId: "",
          sections: [],
        },
      ],
    });
    setModalStep(2);
    setIsOpen(true);
  };

  // Open Create / Add Modal
  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setIsAddingToExistingSession(false);
    const activeTerm = (termFilter !== "All" ? termFilter : "Midterm") as ExamTerm;
    const officialDate = officialExamDates[activeTerm] || "2026-10-15";

    const firstSub = availableSubjects[0] || subjectsList[0];
    setForm({
      term: activeTerm,
      examDate: officialDate,
      time: "08:00 AM - 10:00 AM",
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      program: selectedProgram.key || "BSIT",
      assignments: [
        {
          program: "",
          room: "",
          building: "College Building" as BuildingType,
          proctor: "",
          proctorId: "",
          sections: [],
        },
      ],
    });
    setModalStep(1);
    setIsOpen(true);
  };

  const handleOpenAddAssignmentToSession = (session: ExamSessionDisplay) => {
    setEditingExam(null);
    setIsAddingToExistingSession(true);
    setForm({
      term: session.term,
      examDate: session.examDate,
      time: session.time,
      subjectCode: session.subjectCode,
      subject: session.subjectName,
      program: session.program || selectedProgram.key || "BSIT",
      assignments: [
        {
          program: "",
          room: "",
          building: "College Building" as BuildingType,
          proctor: "",
          proctorId: "",
          sections: [],
        },
      ],
    });
    setModalStep(2);
    setIsOpen(true);
  };

  const handleEditAssignment = (rawExam: ExamScheduleItem) => {
    setEditingExam(rawExam);
    setIsAddingToExistingSession(false);
    setForm({
      term: rawExam.term,
      examDate: rawExam.examDate,
      time: rawExam.time,
      subjectCode: rawExam.subjectCode,
      subject: rawExam.subject,
      program: rawExam.program || "BSIT",
      assignments: [
        {
          id: rawExam.id,
          program: rawExam.program || "",
          room: rawExam.room,
          building: (rawExam.building as BuildingType) || "College Building",
          proctor: rawExam.proctor || "",
          proctorId: rawExam.proctorId || "",
          sections: [...(rawExam.synchronizedSections || [])],
        },
      ],
    });
    setModalStep(2);
    setIsOpen(true);
  };

  // Save Examination Schedule
  const handleSave = async () => {
    if (!form.subjectCode || !form.examDate || !form.time) {
      toast.push("Please fill in all basic examination details in Step 1", "error");
      return;
    }

    if (isProgramHead && !isFormDateMatchingOfficial) {
      toast.push(`${form.term} examinations are officially scheduled for ${officialExamDates[form.term]}.`, "error");
      return;
    }

    for (let i = 0; i < form.assignments.length; i++) {
      const a = form.assignments[i];
      if (!a.room || !a.proctor || a.sections.length === 0) {
        toast.push(`Please assign Room, Proctor, and at least 1 Section for Assignment #${i + 1}`, "error");
        return;
      }
      const totalStudents = a.sections.reduce((sum, secName) => {
        const sObj = sectionsList.find((s) => s.section === secName || (s.course && `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() === secName) || secName.includes(s.section));
        return sum + Number(sObj?.students || 35);
      }, 0);
      const assignedRoomObj = roomsList.find((r) => r.number === a.room);
      if (assignedRoomObj && totalStudents > 0 && Number(assignedRoomObj.capacity) < totalStudents) {
        toast.push(
          `Cannot schedule: Room ${a.room} capacity (${assignedRoomObj.capacity}) is smaller than assigned sections (${totalStudents} students).`,
          "error"
        );
        return;
      }
    }

    // Anti-Answer-Sharing Enforcement for General Education Subjects:
    if (isCurrentSubjectGeneral) {
      const conflicting = exams.find(
        (e) =>
          e.id !== editingExam?.id &&
          e.term === form.term &&
          (e.subjectCode?.toUpperCase().trim() === form.subjectCode.toUpperCase().trim() ||
            e.subject?.toUpperCase().trim() === form.subject.toUpperCase().trim()) &&
          (e.examDate !== form.examDate || e.time.replace(/\s+/g, "").toUpperCase() !== form.time.replace(/\s+/g, "").toUpperCase())
      );
      if (conflicting) {
        toast.push(
          `Security Policy: All sections taking general subject ${form.subjectCode} must take the exam in the same time slot (${conflicting.time} on ${conflicting.examDate}) to avoid answer sharing between sections.`,
          "error"
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (editingExam) {
        const singleAssign = form.assignments[0];
        const payload = {
          term: form.term,
          examDate: form.examDate,
          time: form.time,
          subjectCode: form.subjectCode,
          subject: form.subject,
          program: singleAssign.program || form.program,
          sections: singleAssign.sections,
          synchronizedSections: singleAssign.sections,
          room: singleAssign.room,
          building: singleAssign.building,
          proctor: singleAssign.proctor,
          proctorId: singleAssign.proctorId,
        };
        await api.put(`/exams/${encodeURIComponent(editingExam.id)}`, payload);
        toast.push("Examination assignment updated successfully", "success");
      } else {
        const promises = form.assignments.map((assign) => {
          const payload = {
            term: form.term,
            examDate: form.examDate,
            time: form.time,
            subjectCode: form.subjectCode,
            subject: form.subject,
            program: assign.program || form.program,
            sections: assign.sections,
            synchronizedSections: assign.sections,
            room: assign.room,
            building: assign.building,
            proctor: assign.proctor,
            proctorId: assign.proctorId,
          };
          return api.post("/exams", payload);
        });

        await Promise.all(promises);
        toast.push(
          `Successfully saved ${form.assignments.length} examination assignment(s) for ${form.subjectCode}`,
          "success"
        );
      }

      setIsOpen(false);
      setEditingExam(null);
      setIsAddingToExistingSession(false);
      setModalStep(1);
      fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to save examination schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!examToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/exams/${encodeURIComponent(examToDelete.id)}`);
      toast.push("Examination assignment removed successfully", "success");
      fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to remove examination assignment", "error");
    } finally {
      setLoading(false);
      setExamToDelete(null);
    }
  };

  // Save Official Examination Period Dates (ADMIN ONLY)
  const handleSavePeriodSettings = async () => {
    if (!canEditOfficialDates) return;
    setLoading(true);
    try {
      const res = await api.put("/exams/period-settings", periodSettingsForm);
      if (res.data?.data) {
        setOfficialExamDates(res.data.data);
        toast.push("Official Examination Period Dates updated successfully!", "success");
        setIsPeriodSettingsModalOpen(false);
        const activeOfficial = res.data.data[termFilter !== "All" ? (termFilter as ExamTerm) : "Midterm"];
        if (activeOfficial) {
          const d = new Date(`${activeOfficial}T00:00:00`);
          if (!isNaN(d.getTime())) setCurrentDate(d);
        }
      }
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save examination period dates", "error");
    } finally {
      setLoading(false);
    }
  };

  // Single Session Copy Modal Handlers
  const handleOpenCopyModal = (session: ExamSessionDisplay) => {
    if (!canManage) return;
    setCopyModalSession(session);
    const nextTerm: ExamTerm =
      session.term === "Prelim"
        ? "Midterm"
        : session.term === "Midterm"
          ? "Semi-Final"
          : "Final";
    const officialTargetDate = officialExamDates[nextTerm] || "2026-10-15";

    setCopyForm({
      targetTerm: nextTerm,
      targetExamDate: officialTargetDate,
      targetTime: session.time || "08:00 AM - 10:00 AM",
    });
    setCopyAssignments(
      session.assignments.map((a) => ({
        id: a.id,
        program: a.program,
        room: a.room,
        building: (a.building as BuildingType) || "College Building",
        proctor: a.proctor,
        proctorId: a.proctorId || "",
        sections: [...a.sections],
      }))
    );
    setIsCopyModalOpen(true);
  };

  const handleCopyTargetTermChange = (targetTerm: ExamTerm) => {
    const officialDate = officialExamDates[targetTerm] || "";
    setCopyForm((prev) => ({
      ...prev,
      targetTerm,
      targetExamDate: officialDate || prev.targetExamDate,
    }));
  };

  const handleCopyAssignmentProctorChange = (idx: number, proctorId: string) => {
    const fac = availableFaculty.find((f) => f.id === proctorId);
    setCopyAssignments((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        proctorId,
        proctor: fac ? fac.name : "",
      };
      return next;
    });
  };

  const handleCopyAssignmentRoomChange = (idx: number, roomNumber: string) => {
    const rm = roomsList.find((r) => r.number === roomNumber);
    setCopyAssignments((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        room: roomNumber,
        building: (rm?.building as BuildingType) || next[idx].building,
      };
      return next;
    });
  };

  const handleSaveCopiedExam = async () => {
    if (!copyModalSession) return;
    if (!copyForm.targetExamDate || !copyForm.targetTime) {
      toast.push("Please specify the target Examination Date and Time", "error");
      return;
    }

    // Proactive validation across all copied assignments
    for (let i = 0; i < copyAssignments.length; i++) {
      const a = copyAssignments[i];
      if (!a.proctor || !a.proctorId) {
        toast.push(`Please choose an available proctor for assignment #${i + 1} (${a.program})`, "error");
        return;
      }
      if (!a.room) {
        toast.push(`Please choose an available room for assignment #${i + 1} (${a.program})`, "error");
        return;
      }

      const hasProctorClash = exams.some(
        (e) =>
          e.examDate === copyForm.targetExamDate &&
          isTimeOverlapping(e.time, copyForm.targetTime) &&
          ((e.proctorId && e.proctorId === a.proctorId) || (e.proctor && e.proctor === a.proctor))
      );
      if (hasProctorClash) {
        toast.push(`Teacher ${a.proctor} is unavailable for this schedule. Please select another proctor.`, "error");
        return;
      }

      const hasRoomClash = exams.some(
        (e) =>
          e.examDate === copyForm.targetExamDate &&
          isTimeOverlapping(e.time, copyForm.targetTime) &&
          e.room === a.room
      );
      if (hasRoomClash) {
        toast.push(`Room ${a.room} is unavailable for this schedule. Please select another room.`, "error");
        return;
      }
    }

    setLoading(true);
    try {
      for (const a of copyAssignments) {
        await api.post("/exams", {
          term: copyForm.targetTerm,
          examDate: copyForm.targetExamDate,
          time: copyForm.targetTime,
          subjectCode: copyModalSession.subjectCode,
          subject: copyModalSession.subjectName,
          program: a.program,
          sections: a.sections,
          synchronizedSections: a.sections,
          room: a.room,
          building: a.building,
          proctor: a.proctor,
          proctorId: a.proctorId,
          color: (copyModalSession as any).color || "#8b5cf6",
        });
      }

      toast.push(
        `Successfully copied ${copyModalSession.subjectCode} schedule to ${copyForm.targetTerm} on official date ${copyForm.targetExamDate} (${copyAssignments.length} assignments created)`,
        "success"
      );
      setIsCopyModalOpen(false);
      setCopyModalSession(null);
      await fetchExams();
    } catch (err: any) {
      toast.push(err.message || "Failed to copy examination schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  // Universal Bulk Copy Template Handler
  const sourceTermExams = useMemo(() => {
    return exams.filter((e) => e.term === universalCopySourceTerm);
  }, [exams, universalCopySourceTerm]);

  const handleUniversalCopyTargetTermChange = (term: ExamTerm) => {
    setUniversalCopyTargetTerm(term);
    const official = officialExamDates[term] || "";
    if (official) setUniversalCopyTargetDate(official);
  };

  const handleApplyUniversalCopy = async () => {
    if (sourceTermExams.length === 0) {
      toast.push(`No examination schedules found in source term ${universalCopySourceTerm} to copy.`, "error");
      return;
    }
    if (!universalCopyTargetDate) {
      toast.push("Please provide a valid target examination date.", "error");
      return;
    }

    setLoading(true);
    let createdCount = 0;
    try {
      for (const src of sourceTermExams) {
        await api.post("/exams", {
          term: universalCopyTargetTerm,
          examDate: universalCopyTargetDate,
          time: src.time,
          subjectCode: src.subjectCode,
          subject: src.subject,
          program: src.program,
          sections: src.synchronizedSections || [],
          synchronizedSections: src.synchronizedSections || [],
          room: src.room,
          building: src.building,
          proctor: src.proctor,
          proctorId: src.proctorId,
          color: src.color || "#0284c7",
        });
        createdCount++;
      }

      toast.push(
        `Successfully copied ${createdCount} exam assignment(s) from ${universalCopySourceTerm} to ${universalCopyTargetTerm} under official date ${universalCopyTargetDate}!`,
        "success"
      );
      setIsUniversalCopyModalOpen(false);
      await fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to apply template copy", "error");
    } finally {
      setLoading(false);
    }
  };

  // Subject options for SearchableSelect
  const subjectSearchOptions: SearchableOption[] = useMemo(() => {
    return availableSubjects.map((sub) => ({
      value: sub.code,
      label: `${sub.code} - ${sub.name}`,
      sublabel: `${sub.department || sub.program || "Academic Program"} • ${sub.units || 3} Units`,
      badge: sub.isMajor ? "Major" : "Gen Ed",
      badgeTone: sub.isMajor ? "blue" : "amber",
      searchKeywords: [sub.code, sub.name, sub.department || "", sub.program || ""],
    }));
  }, [availableSubjects]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={
          role === "teacher"
            ? "Faculty Examination Duties & Timetable"
            : role === "program_head"
              ? "Academic Program Examination Schedules"
              : "Institutional Examination Schedules"
        }
        description={
          role === "teacher"
            ? "View your assigned proctoring duties alongside institutional examination timetables."
            : "Plan institutional examination sessions, manage room assignments across campus buildings, and assign faculty proctors."
        }
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Exams</strong>
          </>
        }
        helpText="Manage examination sessions across College, SHS, and JHS rooms with automated proctor and venue conflict prevention."
        actions={
          canManage ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {canEditOfficialDates && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsPeriodSettingsModalOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                  title="Configure official examination dates for Prelim, Midterm, Semi-Final, and Final (Admin Only)"
                >
                  <Settings size={15} />
                  <span>Official Exam Dates</span>
                </button>
              )}

              {exams.length > 0 && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setUniversalCopyTargetDate(officialExamDates[universalCopyTargetTerm] || "2026-10-15");
                    setIsUniversalCopyModalOpen(true);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                  title="Copy an existing examination schedule (Prelim/Midterm) as a reusable template"
                >
                  <Copy size={15} />
                  <span>Use Previous Schedule</span>
                </button>
              )}

              <button
                className="action-button"
                type="button"
                onClick={handleOpenCreateModal}
              >
                <Plus size={16} />
                Schedule Exam
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Proactive Banner for Unconfigured Official Exam Dates */}
      {(() => {
        const activeTerm = termFilter !== "All" ? (termFilter as ExamTerm) : "Midterm";
        const hasDate = Boolean(officialExamDates[activeTerm]);
        if (hasDate) return null;

        return (
          <div
            style={{
              marginBottom: 16,
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
                  {canEditOfficialDates
                    ? `${activeTerm} examination date has not been set.`
                    : `${activeTerm} examination date has not yet been configured by the Admin.`}
                </strong>
                <div style={{ fontSize: "0.78rem", color: "var(--srcb-text)", marginTop: 2 }}>
                  {canEditOfficialDates
                    ? "Please configure the official examination date for this period to allow Program Heads and Coordinators to schedule."
                    : "Examination schedules cannot be created until the official date is set by the Administrator."}
                </div>
              </div>
            </div>

            {canEditOfficialDates && (
              <button
                type="button"
                className="action-button"
                style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                onClick={() => setIsPeriodSettingsModalOpen(true)}
              >
                <Settings size={14} />
                <span>Set Official Exam Date</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* Control Bar - Unified UX Matching Class Scheduling */}
      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Institutional Examination Timetable</p>
            <h3>
              {viewMode === "grid"
                ? `Weekly Examination Calendar (${visibleExams.length} Assignments)`
                : viewMode === "grouped"
                  ? `Active Examination Subjects (${groupedExamsBySubject.length})`
                  : `Scheduled Exam Sessions (${visibleExams.length})`}
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* View Mode Switcher */}
            <div
              style={{
                display: "flex",
                background: "var(--srcb-surface-alt, #e2e8f0)",
                borderRadius: 8,
                padding: 2,
                border: "1px solid var(--srcb-border)",
              }}
            >
              <Tooltip content="Weekly Timetable Grid">
                <button
                  type="button"
                  aria-label="Weekly Examination Grid View"
                  onClick={() => setViewMode("grid")}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CalendarDays size={14} />
                  <span>Weekly Grid</span>
                </button>
              </Tooltip>

              <Tooltip content="Grouped by Academic Subject">
                <button
                  type="button"
                  aria-label="Grouped by Subject View"
                  onClick={() => setViewMode("grouped")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "grouped" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "grouped" ? "var(--srcb-navy, #0d5499)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "grouped" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Layers size={14} />
                  <span>By Subject</span>
                </button>
              </Tooltip>

              <Tooltip content="List View of Exam Sessions">
                <button
                  type="button"
                  aria-label="List View of Exam Sessions"
                  onClick={() => setViewMode("list")}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ListFilter size={14} />
                  <span>List View</span>
                </button>
              </Tooltip>
            </div>

            {/* Multi-Perspective Matrix View Selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--srcb-surface-alt, #f8fafc)",
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid var(--srcb-border)",
              }}
            >
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                Perspective:
              </label>
              <select
                value={perspectiveMode}
                onChange={(e) => {
                  setPerspectiveMode(e.target.value as any);
                  setSelectedPerspectiveEntity("All");
                }}
                style={{
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--srcb-border)",
                  background: "var(--srcb-surface)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                }}
              >
                <option value="all">All Timetables</option>
                <option value="section">By Section / Block</option>
                <option value="faculty">By Proctor / Faculty</option>
                <option value="room">By Room / Facility</option>
              </select>

              {perspectiveMode === "section" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    background: "var(--srcb-surface)",
                    fontSize: "0.84rem",
                    maxWidth: 170,
                  }}
                >
                  <option value="All">All Sections</option>
                  {availableSections.map((sec) => {
                    const label =
                      sec.section ||
                      (sec.course ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim() : `Section ${sec.id}`);
                    return <option key={sec.id || label} value={label}>{label}</option>;
                  })}
                </select>
              )}

              {perspectiveMode === "faculty" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    background: "var(--srcb-surface)",
                    fontSize: "0.84rem",
                    maxWidth: 170,
                  }}
                >
                  <option value="All">All Proctors</option>
                  {availableFaculty.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} ({f.status})</option>
                  ))}
                </select>
              )}

              {perspectiveMode === "room" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    background: "var(--srcb-surface)",
                    fontSize: "0.84rem",
                    maxWidth: 170,
                  }}
                >
                  <option value="All">All Rooms &amp; Labs</option>
                  {roomsList.map((r) => (
                    <option key={r.number} value={r.number}>{r.number} - {r.building}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Term Filter with Official Date Auto-Focus */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Term:
              <select
                value={termFilter}
                onChange={(e) => handleTermFilterChange(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="All">All Terms</option>
                <option value="Prelim">Prelim ({officialExamDates.Prelim || "Date not set"})</option>
                <option value="Midterm">Midterm ({officialExamDates.Midterm || "Date not set"})</option>
                <option value="Semi-Final">Semi-Final ({officialExamDates["Semi-Final"] || "Date not set"})</option>
                <option value="Final">Final ({officialExamDates.Final || "Date not set"})</option>
              </select>
            </label>

            {/* Teacher Duties Filter */}
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

            {/* Search Input */}
            <label className="topbar__search" aria-label="Search exams">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subject, section, room, proctor..."
              />
            </label>
          </div>
        </div>

        {/* Date / Week Navigation Bar for Calendar Mode */}
        {viewMode === "grid" && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 16px",
              background: "var(--srcb-surface-alt, #f8fafc)",
              borderRadius: 8,
              border: "1px solid var(--srcb-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handlePrevWeek}
                  style={{ padding: "4px 8px" }}
                  aria-label="Previous Week"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleToday}
                  style={{ padding: "4px 12px", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  Official Term Week
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleNextWeek}
                  style={{ padding: "4px 8px" }}
                  aria-label="Next Week"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <strong style={{ fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                {weekRangeLabel}
              </strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
              <span className="pill pill--royal" style={{ fontSize: "0.72rem" }}>
                {termFilter === "All"
                  ? "All Examination Periods"
                  : `Official ${termFilter} Date: ${officialExamDates[termFilter as ExamTerm] || "Pending"}`}
              </span>
              <span>• Click any empty slot on the official date to schedule an exam</span>
            </div>
          </div>
        )}

        {/* Content Views */}
        {fetching ? (
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
            {/* ===================================================
                VIEW MODE 1: WEEKLY TIMETABLE GRID (CALENDAR)
                =================================================== */}
            {viewMode === "grid" && (
              <div className="timetable-workspace">
                <div className="timetable-workspace-main">
                  <div className="table-wrap timetable-calendar-container" style={{ marginTop: 0 }}>
                    <table className="data-table timetable-calendar-grid" style={{ textAlign: "center" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Time Slot</th>
                      {weekDates.map((w) => (
                        <th key={w.dateStr} style={{ minWidth: 160 }}>
                          <div style={{ fontWeight: 700 }}>{w.dayName}</div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: w.isToday ? "var(--srcb-gold)" : "var(--srcb-text-muted)",
                            }}
                          >
                            {w.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    onMouseLeave={() => {
                      if (isDraggingGrid) {
                        setIsDraggingGrid(false);
                        setDragStart(null);
                        setDragEnd(null);
                      }
                    }}
                  >
                    {EXAM_TIME_SLOTS.map((slot, slotIdx) => (
                      <tr key={slot}>
                        <td style={{ fontWeight: 600, fontSize: "0.82rem", background: "var(--srcb-surface)" }}>
                          {slot}
                        </td>
                        {weekDates.map((w) => {
                          const cellExams = visibleExams.filter((e) => {
                            if (e.examDate !== w.dateStr) return false;
                            return isTimeOverlapping(e.time, slot);
                          });

                          const cellSessionsMap = new Map<string, ExamSessionDisplay>();
                          for (const ex of cellExams) {
                            const key = `${ex.term}::${ex.subjectCode}::${ex.time}`;
                            if (!cellSessionsMap.has(key)) {
                              cellSessionsMap.set(key, {
                                sessionKey: key,
                                term: ex.term,
                                examDate: ex.examDate,
                                time: ex.time,
                                subjectCode: ex.subjectCode,
                                subjectName: ex.subject,
                                program: ex.program || "",
                                assignments: [],
                              });
                            }
                            cellSessionsMap.get(key)!.assignments.push({
                              id: ex.id,
                              program: ex.program || "",
                              room: ex.room,
                              building: String(ex.building || "College Building"),
                              proctor: ex.proctor || "Unassigned",
                              proctorId: ex.proctorId,
                              sections: [...(ex.synchronizedSections || [])],
                              rawExam: ex,
                            });
                          }

                          const cellSessions = Array.from(cellSessionsMap.values());
                          const isDragTarget =
                            isDraggingGrid &&
                            dragStart &&
                            dragEnd &&
                            dragStart.dayDate === w.dateStr &&
                            slotIdx >= Math.min(dragStart.slotIdx, dragEnd.slotIdx) &&
                            slotIdx <= Math.max(dragStart.slotIdx, dragEnd.slotIdx);
                          const isDropHover = dropTarget?.dateStr === w.dateStr && dropTarget?.slot === slot;

                          return (
                            <td
                              key={w.dateStr}
                              onMouseDown={() => handleMouseDownCell(w.dateStr, slotIdx)}
                              onMouseEnter={() => handleMouseEnterCell(w.dateStr, slotIdx)}
                              onMouseUp={handleMouseUpCell}
                              onDragOver={(e) => {
                                if (!canManage) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "copy";
                                if (dropTarget?.dateStr !== w.dateStr || dropTarget?.slot !== slot) {
                                  setDropTarget({ dateStr: w.dateStr, slot });
                                }
                              }}
                              onDragLeave={() => {
                                if (dropTarget?.dateStr === w.dateStr && dropTarget?.slot === slot) {
                                  setDropTarget(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const dataStr = e.dataTransfer.getData("application/json");
                                handleDropOnExamCell(w.dateStr, slot, dataStr);
                              }}
                              className={`schedule-grid-cell ${isDragTarget ? "drag-hover" : ""} ${isDropHover ? "drag-target-hover" : ""}`}
                              style={{
                                verticalAlign: "top",
                                padding: 6,
                                background: isDropHover
                                  ? "rgba(37, 99, 235, 0.14)"
                                  : isDragTarget
                                    ? "rgba(14, 116, 144, 0.12)"
                                    : cellSessions.length > 0
                                      ? "var(--srcb-surface)"
                                      : "transparent",
                                cursor: canManage ? "pointer" : "default",
                                transition: "background 0.15s ease",
                                minHeight: 90,
                              }}
                            >
                              {cellSessions.length === 0 ? (
                                <div
                                  style={{
                                    height: "100%",
                                    minHeight: 64,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: isDropHover ? "var(--srcb-royal)" : "var(--srcb-text-muted)",
                                    fontSize: "0.72rem",
                                    fontWeight: isDropHover ? 700 : 500,
                                    opacity: isDropHover ? 1 : 0.4,
                                    borderRadius: 6,
                                    border: isDropHover
                                      ? "2px dashed var(--srcb-royal)"
                                      : isDragTarget
                                        ? "2px dashed var(--srcb-navy)"
                                        : "1px dashed transparent",
                                  }}
                                >
                                  {isDropHover ? "Drop to assign exam" : canManage ? "+ Schedule" : "—"}
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {cellSessions.map((session) => {
                                    const totalAssignments = session.assignments.length;
                                    const totalSections = session.assignments.reduce(
                                      (acc, a) => acc + (a.sections?.length || 0),
                                      0
                                    );

                                    return (
                                      <div
                                        key={session.sessionKey}
                                        onClick={() => setInspectedSession(session)}
                                        className="card"
                                        style={{
                                          padding: 8,
                                          borderLeft: "4px solid var(--srcb-royal)",
                                          display: "flex",
                                          flexDirection: "column",
                                          justifyContent: "space-between",
                                          background: "var(--srcb-surface-elevated)",
                                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                          cursor: "pointer",
                                        }}
                                        title="Click to view examination session details & proctor assignments"
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                                          <span className="pill pill--royal" style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                                            {session.term}
                                          </span>
                                          <span style={{ fontSize: "0.7rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                                            {session.time}
                                          </span>
                                        </div>

                                        <div style={{ marginTop: 4 }}>
                                          <strong style={{ fontSize: "0.82rem", color: "var(--srcb-navy)", display: "block" }}>
                                            {session.subjectCode}
                                          </strong>
                                          <span
                                            style={{
                                              fontSize: "0.72rem",
                                              color: "var(--srcb-text)",
                                              display: "-webkit-box",
                                              WebkitLineClamp: 1,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                            }}
                                          >
                                            {session.subjectName}
                                          </span>
                                        </div>

                                        <div
                                          style={{
                                            marginTop: 6,
                                            paddingTop: 4,
                                            borderTop: "1px dashed var(--srcb-border)",
                                            fontSize: "0.7rem",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            color: "var(--srcb-text-muted)",
                                          }}
                                        >
                                          <span>
                                            {totalAssignments} Room{totalAssignments > 1 ? "s" : ""}
                                          </span>
                                          <span>
                                            {totalSections} Sec{totalSections > 1 ? "s" : ""}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <SubjectPalette
              subjects={availableSubjects}
              scheduledSubjectCodes={scheduledExamSubjectCodes}
              canSchedule={canManage}
              onSelectSubject={(sub) => handleScheduleExamForSubject(sub)}
              isExamMode={true}
              isOpen={isSubjectPaletteOpen}
              onToggleOpen={() => setIsSubjectPaletteOpen(!isSubjectPaletteOpen)}
              title="Exam Subject Palette"
              selectedProgramKey={selectedProgram.key}
              side="right"
            />
          </div>
        )}

            {/* ===================================================
                VIEW MODE 2: GROUPED BY SUBJECT (EXPANDED)
                =================================================== */}
            {viewMode === "grouped" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
                {groupedExamsBySubject.length === 0 ? (
                  <div className="empty-state" style={{ padding: "36px 16px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>
                      No examination schedules found matching your filters.
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                      Try adjusting your search terms, selecting "All Terms", or copying a previous schedule as a template.
                    </p>
                    {canManage && (
                      <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setQuery("");
                            setTermFilter("All");
                            setAssignedFilter("All");
                          }}
                          style={{ fontSize: "0.8rem" }}
                        >
                          Clear Search &amp; Filters
                        </button>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => setIsUniversalCopyModalOpen(true)}
                          style={{ fontSize: "0.8rem" }}
                        >
                          <Copy size={14} />
                          <span>Use Previous Schedule</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  groupedExamsBySubject.map((group) => {
                    const totalAssignments = group.sessions.reduce((acc, s) => acc + s.assignments.length, 0);
                    const totalSections = group.sessions.reduce(
                      (acc, s) => acc + s.assignments.reduce((a2, assign) => a2 + assign.sections.length, 0),
                      0
                    );

                    return (
                      <article
                        className="card"
                        key={group.subjectCode}
                        style={{
                          borderLeft: `5px solid ${group.color}`,
                          padding: "22px 24px",
                        }}
                      >
                        {/* Main Subject Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 12,
                            borderBottom: "1px solid var(--srcb-border)",
                            paddingBottom: 14,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span className="pill pill--navy" style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                              {group.subjectCode}
                            </span>
                            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--srcb-text)" }}>
                              {group.subjectName}
                            </h3>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="pill pill--royal" style={{ fontSize: "0.76rem" }}>
                              {group.sessions.length} Exam Session{group.sessions.length === 1 ? "" : "s"}
                            </span>
                            <span className="pill" style={{ fontSize: "0.76rem" }}>
                              {totalAssignments} Room Assignment{totalAssignments === 1 ? "" : "s"}
                            </span>
                            <span className="pill" style={{ fontSize: "0.76rem" }}>
                              {totalSections} Section{totalSections === 1 ? "" : "s"} Taking Exam
                            </span>
                          </div>
                        </div>

                        {/* Examination Sessions under this Subject */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 16 }}>
                          {group.sessions.map((session) => (
                            <div
                              key={session.sessionKey}
                              style={{
                                background: "var(--srcb-surface)",
                                border: "1px solid var(--srcb-border)",
                                borderRadius: 10,
                                padding: "16px 20px",
                              }}
                            >
                              {/* Session Shared Date & Time Bar */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 10,
                                  paddingBottom: 14,
                                  borderBottom: "1px solid var(--srcb-border)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                                  <span className="pill pill--royal" style={{ fontWeight: 700 }}>
                                    {session.term} Examination
                                  </span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--srcb-text)" }}>
                                    <Calendar size={15} color="var(--srcb-navy)" />
                                    <strong>{session.examDate}</strong>
                                    {officialExamDates[session.term] === session.examDate && (
                                      <span className="pill pill--emerald" style={{ fontSize: "0.68rem" }}>
                                        Official Date
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--srcb-text)" }}>
                                    <Clock size={15} color="var(--srcb-navy)" />
                                    <strong>{session.time}</strong>
                                  </div>
                                </div>

                                {canManage && (
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      style={{
                                        padding: "6px 12px",
                                        fontSize: "0.78rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                      onClick={() => handleOpenCopyModal(session)}
                                      title="Copy this examination schedule as a template to Midterm/Semi-Final/Final"
                                    >
                                      <Copy size={13} />
                                      <span>Copy Schedule</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-button"
                                      style={{
                                        padding: "6px 14px",
                                        fontSize: "0.78rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                      onClick={() => handleOpenAddAssignmentToSession(session)}
                                    >
                                      <Plus size={14} />
                                      <span>+ Add Assignment</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Individual Assignments under this Shared Exam */}
                              <div style={{ marginTop: 14 }}>
                                <div
                                  style={{
                                    fontSize: "0.76rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    color: "var(--srcb-text-muted)",
                                    marginBottom: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>
                                    Assignments ({session.assignments.length} room{session.assignments.length > 1 ? "s" : ""} &amp; proctor{session.assignments.length > 1 ? "s" : ""})
                                  </span>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 500, textTransform: "none" }}>
                                    Same Subject • Same Date &amp; Time • Separate Rooms &amp; Proctors
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  {session.assignments.map((assignment, aIdx) => {
                                    const isLast = aIdx === session.assignments.length - 1;
                                    const isAssignedToUser =
                                      (storedTeacherId && String(assignment.proctorId) === storedTeacherId) ||
                                      (userName && assignment.proctor && assignment.proctor.toLowerCase().includes(userName.toLowerCase()));

                                    return (
                                      <div
                                        key={assignment.id}
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          gap: 12,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: "monospace",
                                            fontSize: "1.15rem",
                                            color: "var(--srcb-text-muted)",
                                            lineHeight: "36px",
                                            userSelect: "none",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {isLast ? "└──" : "├──"}
                                        </span>

                                        <div
                                          style={{
                                            flex: 1,
                                            background: "var(--srcb-surface-elevated, #ffffff)",
                                            border: "1px solid var(--srcb-border)",
                                            borderRadius: 8,
                                            padding: "12px 16px",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              flexWrap: "wrap",
                                              gap: 10,
                                            }}
                                          >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                              {assignment.program && (
                                                <span
                                                  className="pill pill--navy"
                                                  style={{ fontSize: "0.78rem", fontWeight: 700 }}
                                                >
                                                  {assignment.program}
                                                </span>
                                              )}
                                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                                                <Users size={15} color="var(--srcb-navy)" />
                                                <span>
                                                  Proctor: <strong>{assignment.proctor}</strong>
                                                </span>
                                                {isAssignedToUser && (
                                                  <span className="pill pill--emerald" style={{ fontSize: "0.68rem" }}>
                                                    You
                                                  </span>
                                                )}
                                              </div>
                                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                                                <DoorOpen size={15} color="var(--srcb-navy)" />
                                                <span>
                                                  Room: <strong>{assignment.room}</strong>{" "}
                                                  <span style={{ color: "var(--srcb-text-muted)", fontSize: "0.78rem" }}>
                                                    ({assignment.building})
                                                  </span>
                                                </span>
                                              </div>
                                            </div>

                                            {canManage && (
                                              <div style={{ display: "flex", gap: 6 }}>
                                                <button
                                                  type="button"
                                                  className="icon-button"
                                                  title="Edit this Assignment"
                                                  aria-label={`Edit assignment for ${assignment.program || assignment.room}`}
                                                  onClick={() => handleEditAssignment(assignment.rawExam)}
                                                >
                                                  <Edit2 size={14} />
                                                </button>
                                                <button
                                                  type="button"
                                                  className="icon-button icon-button--danger"
                                                  title="Remove this Assignment"
                                                  aria-label={`Remove assignment for ${assignment.program || assignment.room}`}
                                                  onClick={() => setExamToDelete(assignment.rawExam)}
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          <div
                                            style={{
                                              marginTop: 10,
                                              paddingTop: 8,
                                              borderTop: "1px dashed var(--srcb-border)",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              flexWrap: "wrap",
                                            }}
                                          >
                                            <span style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                                              Sections:
                                            </span>
                                            {assignment.sections.length === 0 ? (
                                              <span style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)", fontStyle: "italic" }}>
                                                No sections assigned
                                              </span>
                                            ) : (
                                              assignment.sections.map((secName) => {
                                                const secObj = sectionsList.find(
                                                  (s) =>
                                                    s.section === secName ||
                                                    (s.course && `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() === secName)
                                                );
                                                const studentCount = secObj?.students || 30;

                                                return (
                                                  <span
                                                    key={secName}
                                                    className="pill"
                                                    style={{
                                                      fontSize: "0.74rem",
                                                      background: "rgba(2, 132, 199, 0.08)",
                                                      border: "1px solid rgba(2, 132, 199, 0.2)",
                                                      color: "var(--srcb-navy)",
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {secName} ({studentCount} students)
                                                  </span>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* ===================================================
                VIEW MODE 3: CARD LIST VIEW
                =================================================== */}
            {viewMode === "list" && (
              <div className="card-grid" style={{ marginTop: 16 }}>
                {visibleExams.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: "1 / -1", padding: "36px 16px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>
                      No examination schedules found matching your filters.
                    </p>
                  </div>
                ) : (
                  visibleExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="card"
                      style={{
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        borderLeft: `4px solid ${exam.color || "#0284c7"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="pill pill--royal" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                          {exam.term}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                          {exam.examDate}
                        </span>
                      </div>

                      <div>
                        <strong style={{ fontSize: "0.9rem", color: "var(--srcb-navy)", display: "block" }}>
                          {exam.subjectCode} - {exam.subject}
                        </strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                          Time: <strong>{exam.time}</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem" }}>
                        <div>
                          Room: <strong>{exam.room}</strong> ({exam.building})
                        </div>
                        <div>
                          Proctor: <strong>{exam.proctor || "Unassigned"}</strong>
                        </div>
                        <div>
                          Sections: <strong>{exam.synchronizedSections?.join(", ") || "None"}</strong>
                        </div>
                      </div>

                      {canManage && (
                        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", gap: 6, paddingTop: 8, borderTop: "1px solid var(--srcb-border)" }}>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                            onClick={() => handleEditAssignment(exam)}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: "0.74rem", color: "#dc2626" }}
                            onClick={() => setExamToDelete(exam)}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ===================================================
          OFFICIAL EXAMINATION PERIOD SETTINGS MODAL (ADMIN ONLY)
          =================================================== */}
      {/* ===================================================
          OFFICIAL EXAMINATION PERIOD SETTINGS MODAL (ADMIN ONLY)
          =================================================== */}
      <Modal
        isOpen={isPeriodSettingsModalOpen && canEditOfficialDates}
        size="md"
        icon={<CalendarDays size={20} />}
        eyebrow="Academic Term Settings"
        title="Official Examination Period Settings"
        description="Set the official calendar dates for Prelim, Midterm, Semi-Final, and Final examination periods. Program Heads and Coordinators will follow these dates."
        onClose={() => setIsPeriodSettingsModalOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              backgroundColor: "rgba(22, 50, 105, 0.05)",
              border: "1px solid rgba(22, 50, 105, 0.12)",
              borderRadius: 8,
              fontSize: "0.85rem",
              color: "var(--srcb-navy)",
            }}
          >
            <Lock size={15} />
            <span>Only Administrators can modify these institutional examination dates.</span>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="settingPrelimDate">
                <CalendarDays size={13} /> Prelim Official Exam Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="settingPrelimDate"
                type="date"
                value={periodSettingsForm.Prelim}
                onChange={(e) => setPeriodSettingsForm({ ...periodSettingsForm, Prelim: e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="settingMidtermDate">
                <CalendarDays size={13} /> Midterm Official Exam Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="settingMidtermDate"
                type="date"
                value={periodSettingsForm.Midterm}
                onChange={(e) => setPeriodSettingsForm({ ...periodSettingsForm, Midterm: e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="settingSemiFinalDate">
                <CalendarDays size={13} /> Semi-Final Official Exam Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="settingSemiFinalDate"
                type="date"
                value={periodSettingsForm["Semi-Final"]}
                onChange={(e) => setPeriodSettingsForm({ ...periodSettingsForm, "Semi-Final": e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="settingFinalDate">
                <CalendarDays size={13} /> Final Official Exam Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="settingFinalDate"
                type="date"
                value={periodSettingsForm.Final}
                onChange={(e) => setPeriodSettingsForm({ ...periodSettingsForm, Final: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="cancel-button"
              onClick={() => setIsPeriodSettingsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="action-button"
              disabled={loading}
              onClick={handleSavePeriodSettings}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Dates…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Save Official Exam Dates</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================================================
          SESSION DETAIL INSPECTION MODAL
          =================================================== */}
      <Modal
        isOpen={Boolean(inspectedSession)}
        size="lg"
        icon={<BookOpen size={20} />}
        title={inspectedSession ? `${inspectedSession.subjectCode} - ${inspectedSession.subjectName}` : "Exam Session"}
        description={
          inspectedSession
            ? `${inspectedSession.term} Examination • ${inspectedSession.examDate} • ${inspectedSession.time}`
            : ""
        }
        onClose={() => setInspectedSession(null)}
      >
        {inspectedSession && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                background: "var(--srcb-surface)",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--srcb-border)",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <strong>Date &amp; Time:</strong> {inspectedSession.examDate} • {inspectedSession.time}
              </div>
              <div>
                <strong>Term:</strong> {inspectedSession.term} Exam
              </div>
              <div>
                <strong>Total Venues:</strong> {inspectedSession.assignments.length} Classroom(s)
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <strong style={{ fontSize: "0.85rem", color: "var(--srcb-navy)" }}>
                Room &amp; Proctor Assignments:
              </strong>
              {inspectedSession.assignments.map((assign, idx) => (
                <div
                  key={assign.id || idx}
                  style={{
                    background: "var(--srcb-surface-elevated, #ffffff)",
                    border: "1px solid var(--srcb-border)",
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="pill pill--navy" style={{ fontWeight: 700, fontSize: "0.78rem" }}>
                        {assign.program || `Venue #${idx + 1}`}
                      </span>
                      <strong>Room: {assign.room}</strong>
                      <span style={{ color: "var(--srcb-text-muted)", fontSize: "0.78rem" }}>
                        ({assign.building})
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                      Proctor: <strong>{assign.proctor}</strong>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)", marginTop: 2 }}>
                      Sections: {assign.sections.join(", ") || "No sections"}
                    </div>
                  </div>

                  {canManage && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => {
                          setInspectedSession(null);
                          handleEditAssignment(assign.rawExam);
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#dc2626" }}
                        onClick={() => {
                          setInspectedSession(null);
                          setExamToDelete(assign.rawExam);
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 20, justifyContent: canManage ? "space-between" : "flex-end" }}>
              {canManage && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const sess = inspectedSession;
                    setInspectedSession(null);
                    handleOpenCopyModal(sess);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Copy size={14} />
                  <span>Copy as Template</span>
                </button>
              )}
              <button
                type="button"
                className="action-button"
                onClick={() => setInspectedSession(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================================================
          TWO-STEP MANUAL EXAMINATION SCHEDULING MODAL (PRESERVED)
          =================================================== */}
      <Modal
        isOpen={isOpen && canManage}
        icon={<Calendar size={20} />}
        size="xl"
        eyebrow="Examination Timetable"
        title={
          modalStep === 1
            ? "Create Examination - Step 1: Basic Information"
            : editingExam
              ? "Edit Examination Assignment"
              : isAddingToExistingSession
                ? `Add Assignment to ${form.subjectCode}`
                : "Create Examination - Step 2: Resource Assignment"
        }
        description={
          modalStep === 1
            ? "Define the common academic subject, examination term, date, and shared time slot."
            : "Assign dedicated proctors, examination rooms, and sections for all student cohorts in this synchronized slot."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingExam(null);
          setIsAddingToExistingSession(false);
          setModalStep(1);
        }}
      >
        {/* Modern Stepper Header */}
        {!isAddingToExistingSession && !editingExam && (
          <div className="sched-wizard-stepper">
            <button
              type="button"
              className={`sched-step-btn ${modalStep === 1 ? "is-active" : "is-completed"}`}
              onClick={() => setModalStep(1)}
            >
              <div className="sched-step-circle">
                {modalStep > 1 ? <Check size={16} /> : <span>1</span>}
              </div>
              <div className="sched-step-info">
                <span className="sched-step-label">Step 1</span>
                <span className="sched-step-title">Exam Date &amp; Time</span>
              </div>
            </button>

            <div className={`sched-step-divider ${modalStep === 2 ? "is-active" : ""}`} />

            <button
              type="button"
              className={`sched-step-btn ${modalStep === 2 ? "is-active" : ""}`}
              onClick={() => {
                if (isExamStep1ResourcesAvailable) {
                  handleContinueToStep2();
                }
              }}
              disabled={modalStep === 1 && !isExamStep1ResourcesAvailable}
              title={!isExamStep1ResourcesAvailable ? "Please complete Step 1 details first" : "Jump to Step 2"}
            >
              <div className="sched-step-circle">
                <span>2</span>
              </div>
              <div className="sched-step-info">
                <span className="sched-step-label">Step 2</span>
                <span className="sched-step-title">Resource Assignment</span>
              </div>
            </button>
          </div>
        )}

        {/* STEP 1: Basic Schedule Information (Ergonomic 2-Column Grid) */}
        {modalStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="exam-modal-step1-grid">
              {/* LEFT COLUMN: Subject & Period Selection */}
              <div className="exam-modal-step1-col">
                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="examSubject">
                    Academic Subject <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <SearchableSelect
                    id="examSubject"
                    value={form.subjectCode}
                    onChange={(val) => handleSubjectSelect(val)}
                    options={subjectSearchOptions}
                    placeholder="Search & select academic subject..."
                    searchPlaceholder="Search by subject code, title, department..."
                    emptyText="No matching subjects found"
                  />
                </div>

                {isCurrentSubjectGeneral && (
                  <div className="exam-sync-security-badge">
                    <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Universal General Subject (Synchronized Exam):</strong> All collegiate sections must take this exam simultaneously in the same time slot to avoid exam answer leaks across cohorts.
                    </div>
                  </div>
                )}

                <div className="modal-grid-2col" style={{ gap: 10 }}>
                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="examTerm">Examination Term</label>
                    <select
                      id="examTerm"
                      value={form.term}
                      onChange={(e) => handleFormTermChange(e.target.value as ExamTerm)}
                    >
                      <option value="Prelim">Prelim</option>
                      <option value="Midterm">Midterm</option>
                      <option value="Semi-Final">Semi-Final</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="examDate">
                      Official Exam Date <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    {canEditOfficialDates ? (
                      <input
                        id="examDate"
                        type="date"
                        value={form.examDate}
                        onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                        required
                        aria-required="true"
                      />
                    ) : (
                      <div>
                        <input
                          id="examDate"
                          type="date"
                          value={form.examDate}
                          readOnly
                          disabled
                          style={{ background: "var(--srcb-surface-alt, #f1f5f9)", cursor: "not-allowed", opacity: 0.9 }}
                        />
                        <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--srcb-navy)", fontWeight: 600 }}>
                          <Lock size={11} />
                          <span>Official: {officialExamDates[form.term] || "Not configured"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Time Slot & Proactive Readiness */}
              <div className="exam-modal-step1-col">
                <div className="field-group" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="examTime" style={{ margin: 0 }}>
                      Examination Time Slot <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    {isCurrentSubjectGeneral && existingGeneralExamSession && (
                      <span className="pill pill--blue" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                        🔒 Locked to Existing Session
                      </span>
                    )}
                  </div>
                  <input
                    id="examTime"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    placeholder="e.g. 08:00 AM - 10:00 AM"
                    required
                    aria-required="true"
                    disabled={Boolean(isCurrentSubjectGeneral && existingGeneralExamSession)}
                    style={isCurrentSubjectGeneral && existingGeneralExamSession ? { background: "var(--srcb-surface-alt)", cursor: "not-allowed" } : {}}
                  />
                  {!existingGeneralExamSession && (
                    <div className="exam-time-presets">
                      {EXAM_TIME_SLOTS.map((slot) => {
                        const [s1, s2] = slot.split("-");
                        const label = `${s1.trim()} - ${s2.trim()}`;
                        const isSelected = form.time.includes(s1.trim()) || form.time === label;
                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`exam-time-preset-btn ${isSelected ? "is-active" : ""}`}
                            onClick={() => setForm({ ...form, time: label })}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Existing General Session Lock Notice */}
                {isCurrentSubjectGeneral && existingGeneralExamSession && (
                  <div className="exam-sync-lock-notice">
                    <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Synchronized Session Active:</strong> An examination for {form.subjectCode} is scheduled on {existingGeneralExamSession.examDate} at {existingGeneralExamSession.time}. All sections must take the exam in this same time slot to prevent sharing of answers.
                    </div>
                  </div>
                )}

                {/* Proactive Availability Assessment */}
                {form.subjectCode && form.examDate && form.time && (
                  <div className="sched-readiness-box" style={{ margin: 0, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.78rem", color: "var(--srcb-navy)" }}>
                        <Sparkles size={14} color="var(--srcb-royal)" />
                        <span>Resource Availability Check</span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--srcb-text-muted)" }}>
                        {form.examDate} • {form.time}
                      </span>
                    </div>

                    <div className="sched-readiness-grid" style={{ gap: 8 }}>
                      <div className={`sched-readiness-pill ${availableProctorsForStep1.length > 0 ? "is-ok" : "is-warning"}`} style={{ padding: "6px 8px" }}>
                        {availableProctorsForStep1.length > 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>Proctors</div>
                          <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>
                            {availableProctorsForStep1.length > 0 ? `${availableProctorsForStep1.length} Free` : "None free"}
                          </div>
                        </div>
                      </div>

                      <div className={`sched-readiness-pill ${availableRoomsForStep1.length > 0 ? "is-ok" : "is-warning"}`} style={{ padding: "6px 8px" }}>
                        {availableRoomsForStep1.length > 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>Rooms</div>
                          <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>
                            {availableRoomsForStep1.length > 0 ? `${availableRoomsForStep1.length} Free` : "None free"}
                          </div>
                        </div>
                      </div>

                      <div className={`sched-readiness-pill ${availableSectionsForCurrentExam.length > 0 ? "is-ok" : "is-warning"}`} style={{ padding: "6px 8px" }}>
                        {availableSectionsForCurrentExam.length > 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>Sections</div>
                          <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>
                            {availableSectionsForCurrentExam.length > 0 ? `${availableSectionsForCurrentExam.length} Eligible` : "None free"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isExamStep1ResourcesAvailable && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 6,
                          padding: "6px 10px",
                          marginTop: 6,
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: 6,
                          color: "#dc2626",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {isGeneralSubjectTimeMismatched && existingGeneralExamSession && (
                            <div>• Must match existing general subject slot: {existingGeneralExamSession.examDate} at {existingGeneralExamSession.time}.</div>
                          )}
                          {isProgramHead && !isOfficialDateConfiguredForTerm && (
                            <div>• {form.term} date not yet set by Admin.</div>
                          )}
                          {isProgramHead && isOfficialDateConfiguredForTerm && !isFormDateMatchingOfficial && (
                            <div>• {form.term} exams must be on {officialExamDates[form.term]}.</div>
                          )}
                          {availableSectionsForCurrentExam.length === 0 && (
                            <div>• No free sections taking {form.subjectCode} at this time.</div>
                          )}
                          {availableProctorsForStep1.length === 0 && (
                            <div>• No proctors free for this slot.</div>
                          )}
                          {availableRoomsForStep1.length === 0 && (
                            <div>• No classrooms free for this slot.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="table-actions" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsOpen(false);
                  setEditingExam(null);
                  setModalStep(1);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button"
                disabled={!isExamStep1ResourcesAvailable}
                style={{
                  opacity: isExamStep1ResourcesAvailable ? 1 : 0.5,
                  cursor: isExamStep1ResourcesAvailable ? "pointer" : "not-allowed",
                }}
                onClick={handleContinueToStep2}
                title={
                  !isExamStep1ResourcesAvailable
                    ? "Cannot continue: Required resources or official examination date is unavailable for this slot."
                    : "Proceed to assign Proctors, Rooms, and Sections"
                }
              >
                <span>Continue to Resource Assignment</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Enhanced Resource Assignment (Zero-Scroll Split-Pane Layout) */}
        {modalStep === 2 && (() => {
          const allAssignedSectionNames = Array.from(new Set(form.assignments.flatMap((a) => a.sections)));
          const assignedSectionsCount = availableSectionsForCurrentExam.filter((sec) => {
            const secLabel = sec.course && sec.section ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim() : sec.section;
            return allAssignedSectionNames.includes(secLabel) || allAssignedSectionNames.includes(sec.section);
          }).length;
          const unassignedCount = Math.max(0, availableSectionsForCurrentExam.length - assignedSectionsCount);

          const safeActiveIdx = Math.min(activeAssignmentIdx, Math.max(0, form.assignments.length - 1));
          const currentActiveAssignment = form.assignments[safeActiveIdx] || form.assignments[0];

          // Validation issues across assignments
          const assignmentValidationErrors: string[] = [];
          form.assignments.forEach((a, aIdx) => {
            const rowNum = aIdx + 1;
            if (!a.room) assignmentValidationErrors.push(`Assignment #${rowNum}: Please select an Examination Room.`);
            if (!a.proctorId && !a.proctor) assignmentValidationErrors.push(`Assignment #${rowNum}: Please select a Proctor.`);
            if (a.sections.length === 0) assignmentValidationErrors.push(`Assignment #${rowNum}: Please select at least one student section.`);

            const studentsCount = a.sections.reduce((sum, secName) => {
              const sObj = sectionsList.find((s) => s.section === secName || (s.course && `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() === secName) || secName.includes(s.section));
              return sum + Number(sObj?.students || 35);
            }, 0);
            const assignedRoom = roomsList.find((r) => r.number === a.room);
            if (assignedRoom && studentsCount > 0 && Number(assignedRoom.capacity) < studentsCount) {
              assignmentValidationErrors.push(
                `Assignment #${rowNum}: Room ${a.room} capacity (${assignedRoom.capacity}) is smaller than headcount (${studentsCount} students).`
              );
            }
          });

          const isAllAssignmentsValid = assignmentValidationErrors.length === 0 && form.assignments.length > 0;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Context Summary Banner */}
              <div className="sched-context-banner" style={{ padding: "8px 14px" }}>
                <div className="sched-context-tags">
                  <div className="sched-context-item">
                    <BookOpen size={14} color="var(--srcb-royal)" />
                    <strong>Subject:</strong> <span>{form.subjectCode} — {form.subject}</span>
                  </div>
                  <div className="sched-context-item">
                    <Calendar size={14} color="var(--srcb-royal)" />
                    <strong>Slot:</strong> <span>{form.examDate} • {form.time}</span>
                  </div>
                  <span className="pill pill--royal" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                    {form.term}
                  </span>
                  {isCurrentSubjectGeneral && (
                    <span className="pill pill--blue" style={{ fontSize: "0.72rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <ShieldCheck size={12} />
                      <span>Synchronized General Subject ({form.time})</span>
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!editingExam && (
                    <button
                      type="button"
                      className="exam-auto-distribute-btn"
                      onClick={handleAutoDistributeSections}
                      title="Automatically allocate all unassigned sections into conflict-free rooms in this time slot"
                    >
                      <Sparkles size={13} />
                      <span>⚡ Auto-Distribute Sections</span>
                    </button>
                  )}
                  {!isAddingToExistingSession && !editingExam && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setModalStep(1)}
                      style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                    >
                      <Edit2 size={12} />
                      <span>Edit Slot</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ZERO-SCROLL SPLIT-PANE 2-COLUMN LAYOUT */}
              <div className="exam-modal-step2-split">
                {/* LEFT PANE: Rooms & Proctors Configuration */}
                <div className="exam-modal-pane">
                  <div className="exam-modal-pane-header">
                    <div className="exam-modal-pane-title">
                      <DoorOpen size={15} color="var(--srcb-royal)" />
                      <span>Assigned Classrooms &amp; Proctors ({form.assignments.length})</span>
                    </div>
                    {!editingExam && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ padding: "3px 8px", fontSize: "0.72rem", fontWeight: 700 }}
                        onClick={() => {
                          handleAddAssignmentRow();
                          setActiveAssignmentIdx(form.assignments.length);
                        }}
                      >
                        <Plus size={13} />
                        <span>Add Room</span>
                      </button>
                    )}
                  </div>

                  <div className="exam-modal-pane-scroll">
                    {form.assignments.map((assignment, idx) => {
                      const isActiveRoom = safeActiveIdx === idx;
                      const availableProctors = getAvailableProctorsForAssignment(idx);
                      const availableRooms = getAvailableRoomsForAssignment(idx);

                      const proctorOptions: SearchableOption[] = availableProctors.map((f) => ({
                        value: f.id,
                        label: f.name,
                        sublabel: `${f.department || "Academic Faculty"} • ${f.status}`,
                        badge: f.status,
                        badgeTone: f.status === "Full-Time" ? "emerald" : "amber",
                        searchKeywords: [f.name, f.department || "", f.status || "", f.id],
                      }));

                      const roomOptions: SearchableOption[] = availableRooms.map((r) => ({
                        value: r.number,
                        label: `${r.number} - ${r.building}`,
                        sublabel: `${r.type} • Capacity: ${r.capacity} seats`,
                        badge: `Cap: ${r.capacity}`,
                        badgeTone: "slate",
                        searchKeywords: [r.number, r.building, r.type],
                      }));

                      const totalStudentsInAssignment = assignment.sections.reduce((sum, secName) => {
                        const sObj = sectionsList.find(
                          (s) =>
                            s.section === secName ||
                            (s.course && `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() === secName) ||
                            secName.includes(s.section)
                        );
                        return sum + Number(sObj?.students || 35);
                      }, 0);

                      const assignedRoomObj = roomsList.find((r) => r.number === assignment.room);
                      const roomCapacity = Number(assignedRoomObj?.capacity || 0);
                      const isTooSmall = Boolean(assignment.room && assignedRoomObj && totalStudentsInAssignment > 0 && roomCapacity < totalStudentsInAssignment);
                      const remainingSeats = roomCapacity - totalStudentsInAssignment;
                      const capacityPercent = roomCapacity > 0 ? Math.min(100, Math.round((totalStudentsInAssignment / roomCapacity) * 100)) : 0;

                      return (
                        <div
                          key={idx}
                          className="exam-assignment-compact-card"
                          style={{
                            borderColor: isActiveRoom ? "var(--srcb-royal, #2563eb)" : undefined,
                            boxShadow: isActiveRoom ? "0 0 0 1px var(--srcb-royal, #2563eb)" : undefined,
                          }}
                          onClick={() => setActiveAssignmentIdx(idx)}
                        >
                          <div className="exam-assignment-compact-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                className={`pill ${isActiveRoom ? "pill--royal" : "pill--navy"}`}
                                style={{ fontWeight: 800, fontSize: "0.72rem" }}
                              >
                                {isActiveRoom ? "▶ " : ""}Room #{idx + 1}
                              </span>
                              {assignment.room ? (
                                <span className="pill pill--blue" style={{ fontSize: "0.72rem" }}>
                                  {assignment.room}
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                                  No room selected
                                </span>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {assignedRoomObj && (
                                <span
                                  className={`pill ${isTooSmall ? "pill--danger" : "pill--emerald"}`}
                                  style={{ fontSize: "0.7rem", fontWeight: 700 }}
                                >
                                  {isTooSmall
                                    ? `⚠ ${totalStudentsInAssignment}/${roomCapacity} seats`
                                    : `${totalStudentsInAssignment}/${roomCapacity} seats (${remainingSeats} free)`}
                                </span>
                              )}
                              {form.assignments.length > 1 && !editingExam && (
                                <button
                                  type="button"
                                  className="secondary-button"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", color: "#dc2626" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAssignmentRow(idx);
                                    setActiveAssignmentIdx((prev) => Math.max(0, Math.min(prev, form.assignments.length - 2)));
                                  }}
                                  title="Remove this room assignment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div className="field-group" style={{ margin: 0 }}>
                              <label style={{ fontSize: "0.72rem", margin: 0, fontWeight: 600 }}>
                                Room &amp; Venue <span style={{ color: "#dc2626" }}>*</span>
                              </label>
                              <SearchableSelect
                                id={`assign-room-${idx}`}
                                value={assignment.room}
                                onChange={(val) => handleAssignmentRoomChange(idx, val)}
                                options={roomOptions}
                                placeholder="Select room..."
                                searchPlaceholder="Search room..."
                                emptyText="No rooms found"
                              />
                            </div>

                            <div className="field-group" style={{ margin: 0 }}>
                              <label style={{ fontSize: "0.72rem", margin: 0, fontWeight: 600 }}>
                                Teacher / Proctor <span style={{ color: "#dc2626" }}>*</span>
                              </label>
                              <SearchableSelect
                                id={`assign-proctor-${idx}`}
                                value={assignment.proctorId}
                                onChange={(val) => handleAssignmentProctorChange(idx, val)}
                                options={proctorOptions}
                                placeholder="Select proctor..."
                                searchPlaceholder="Search proctor..."
                                emptyText="No proctors found"
                              />
                            </div>
                          </div>

                          {assignedRoomObj && (
                            <div className="exam-capacity-bar-track" style={{ height: 4, marginTop: 2 }}>
                              <div
                                className="exam-capacity-bar-fill"
                                style={{
                                  width: `${Math.min(100, capacityPercent)}%`,
                                  background: isTooSmall ? "#ef4444" : capacityPercent > 85 ? "#f59e0b" : "#10b981",
                                }}
                              />
                            </div>
                          )}

                          {/* Assigned Sections in this Room */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--srcb-text-muted)" }}>
                              Sections ({assignment.sections.length}):
                            </span>
                            {assignment.sections.length === 0 ? (
                              <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontStyle: "italic" }}>
                                Select cohorts from right pane
                              </span>
                            ) : (
                              assignment.sections.map((secName) => (
                                <span
                                  key={secName}
                                  className="pill pill--navy"
                                  style={{ fontSize: "0.68rem", padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 3 }}
                                >
                                  <span>{secName}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSectionInAssignment(idx, secName);
                                    }}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "inherit", opacity: 0.8 }}
                                    title={`Remove ${secName} from Room #${idx + 1}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT PANE: Section Cohort Matrix */}
                <div className="exam-modal-pane">
                  <div className="exam-modal-pane-header">
                    <div className="exam-modal-pane-title">
                      <Users size={15} color="var(--srcb-royal)" />
                      <span>Section Allocation ({assignedSectionsCount}/{availableSectionsForCurrentExam.length} Allocated)</span>
                    </div>
                    <span
                      className={`pill ${unassignedCount === 0 ? "pill--emerald" : "pill--amber"}`}
                      style={{ fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      {unassignedCount === 0 ? "✓ All Allocated" : `${unassignedCount} Remaining`}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", padding: "2px 4px" }}>
                    Clicking a section adds/removes it from <strong>Room #{safeActiveIdx + 1} ({currentActiveAssignment?.room || "Unassigned"})</strong>.
                  </div>

                  <div className="exam-modal-pane-scroll">
                    {sectionsGroupedByProgram.map(({ program, sections }) => (
                      <div key={program} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--srcb-surface)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--srcb-border)",
                          }}
                        >
                          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                            {program} Cohort
                          </span>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "2px 6px", fontSize: "0.68rem", fontWeight: 600 }}
                            onClick={() => handleAssignAllProgramSections(safeActiveIdx, program, sections)}
                          >
                            + Assign All {program} to Room #{safeActiveIdx + 1}
                          </button>
                        </div>

                        <div className="exam-section-chip-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6 }}>
                          {sections.map((sec) => {
                            const secLabel =
                              sec.course && sec.section
                                ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim()
                                : sec.section;

                            const isCheckedInActive =
                              currentActiveAssignment.sections.includes(sec.section) ||
                              currentActiveAssignment.sections.includes(secLabel);

                            const assignedInOtherIdx = form.assignments.findIndex(
                              (a, aIdx) =>
                                aIdx !== safeActiveIdx &&
                                (a.sections.includes(sec.section) || a.sections.includes(secLabel))
                            );
                            const isAssignedInOther = assignedInOtherIdx !== -1;
                            const otherAssignment = isAssignedInOther ? form.assignments[assignedInOtherIdx] : null;

                            return (
                              <div
                                key={sec.id || sec.section}
                                className={`exam-section-chip ${isCheckedInActive ? "is-selected" : ""}`}
                                onClick={() => {
                                  if (isAssignedInOther) {
                                    // Move from other assignment to active assignment
                                    handleToggleSectionInAssignment(assignedInOtherIdx, secLabel);
                                    handleToggleSectionInAssignment(safeActiveIdx, secLabel, sec.course || sec.program);
                                  } else {
                                    handleToggleSectionInAssignment(safeActiveIdx, secLabel, sec.course || sec.program);
                                  }
                                }}
                                style={{ padding: "6px 8px", fontSize: "0.76rem" }}
                                title={
                                  isAssignedInOther
                                    ? `Currently in Room ${otherAssignment?.room || `#${assignedInOtherIdx + 1}`}. Click to move to Room #${safeActiveIdx + 1}.`
                                    : `Click to ${isCheckedInActive ? "remove" : "assign"} ${secLabel} to Room #${safeActiveIdx + 1}`
                                }
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={isCheckedInActive}
                                    readOnly
                                    style={{ cursor: "pointer", width: 14, height: 14 }}
                                  />
                                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                                    <div style={{ fontSize: "0.76rem", fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                      {secLabel}
                                    </div>
                                    <div style={{ fontSize: "0.66rem", color: "var(--srcb-text-muted)" }}>
                                      {isAssignedInOther
                                        ? `In Room ${otherAssignment?.room || `#${assignedInOtherIdx + 1}`}`
                                        : `${sec.students || 35} students`}
                                    </div>
                                  </div>
                                </div>
                                <span className="pill pill--blue" style={{ fontSize: "0.64rem", padding: "0px 5px" }}>
                                  {sec.students || 35}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compact Validation / Conflict-Free Status Bar */}
              <div>
                {isAllAssignmentsValid ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "rgba(16, 185, 129, 0.08)",
                      borderRadius: 6,
                      border: "1px solid rgba(16, 185, 129, 0.28)",
                      color: "#059669",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                    <span>
                      All {form.assignments.length} examination room assignment(s) are conflict-free, verified within capacity, and synchronized to {form.time}.
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "6px 10px",
                      background: "rgba(239, 68, 68, 0.08)",
                      borderRadius: 6,
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderLeft: "3px solid #dc2626",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#dc2626", fontSize: "0.78rem" }}>
                      <AlertTriangle size={14} />
                      <span>{assignmentValidationErrors[0] || "Please resolve assignment issues before saving"}</span>
                    </div>
                  </div>
                )}
              </div>

                {/* Sticky Modal Actions */}
              <div className="modal-actions" style={{ marginTop: 14, justifyContent: "space-between" }}>
                {!isAddingToExistingSession && !editingExam && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setModalStep(1)}
                  >
                    <ArrowLeft size={15} />
                    <span>Back to Exam Details</span>
                  </button>
                )}
                <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setIsOpen(false);
                      setEditingExam(null);
                      setIsAddingToExistingSession(false);
                      setModalStep(1);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    disabled={loading || !isAllAssignmentsValid}
                    style={{
                      opacity: isAllAssignmentsValid ? 1 : 0.5,
                      cursor: isAllAssignmentsValid ? "pointer" : "not-allowed",
                    }}
                    onClick={handleSave}
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    <span>
                      {loading
                        ? "Saving…"
                        : editingExam
                          ? "Update Assignment"
                          : isAddingToExistingSession
                            ? "Add Assignment to Exam"
                            : form.assignments.length > 1
                              ? `Save All ${form.assignments.length} Rooms`
                              : "Save Examination Schedule"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ===================================================
          UNIVERSAL PREVIOUS EXAMINATION SCHEDULE (TEMPLATE COPY)
          =================================================== */}
      <Modal
        isOpen={isUniversalCopyModalOpen && canManage}
        size="lg"
        eyebrow="Template Replication"
        icon={<Copy size={20} />}
        title="Use Previous Examination Schedule (Template Copy)"
        description="Copy a completed examination schedule period (e.g. Prelim or Midterm) into a new period as a reusable template. Resources will be placed under the official target date."
        onClose={() => setIsUniversalCopyModalOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="uniCopySource" className="modal-field-label">
                <CalendarDays size={14} />
                <span>Source Examination Period (Template)</span>
                <span className="required-asterisk">*</span>
              </label>
              <select
                id="uniCopySource"
                value={universalCopySourceTerm}
                onChange={(e) => setUniversalCopySourceTerm(e.target.value as ExamTerm)}
              >
                {termsWithExams.length === 0 ? (
                  <option value="Prelim">Prelim (No exams saved yet)</option>
                ) : (
                  termsWithExams.map((t) => (
                    <option key={t} value={t}>
                      {t} Period ({exams.filter((e) => e.term === t).length} assignments)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="uniCopyTarget" className="modal-field-label">
                <CalendarDays size={14} />
                <span>Target Examination Period</span>
                <span className="required-asterisk">*</span>
              </label>
              <select
                id="uniCopyTarget"
                value={universalCopyTargetTerm}
                onChange={(e) => handleUniversalCopyTargetTermChange(e.target.value as ExamTerm)}
              >
                <option value="Midterm">Midterm</option>
                <option value="Semi-Final">Semi-Final</option>
                <option value="Final">Final</option>
              </select>
            </div>

            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="uniCopyDate" className="modal-field-label">
                <Calendar size={14} />
                <span>Target Official Examination Date</span>
                <span className="required-asterisk">*</span>
              </label>
              {canEditOfficialDates ? (
                <input
                  id="uniCopyDate"
                  type="date"
                  value={universalCopyTargetDate}
                  onChange={(e) => setUniversalCopyTargetDate(e.target.value)}
                  required
                />
              ) : (
                <div>
                  <input
                    id="uniCopyDate"
                    type="date"
                    value={universalCopyTargetDate}
                    readOnly
                    disabled
                    style={{ background: "var(--srcb-surface-alt, #f1f5f9)", cursor: "not-allowed" }}
                  />
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", color: "var(--srcb-navy)", fontWeight: 600 }}>
                    <Lock size={12} />
                    <span>Official Schedule: {officialExamDates[universalCopyTargetTerm] || "Not configured by Admin"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Template Review Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
              Examination Templates to be Created under Official Date ({sourceTermExams.length} items):
            </span>

            {sourceTermExams.length === 0 ? (
              <div style={{ padding: 16, background: "var(--srcb-surface)", borderRadius: 6, textAlign: "center", fontSize: "0.82rem", color: "var(--srcb-text-muted)" }}>
                No examination schedules available in {universalCopySourceTerm}.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--srcb-surface)",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid var(--srcb-border)",
                }}
              >
                {sourceTermExams.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      background: "var(--srcb-surface-elevated, #ffffff)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--srcb-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div>
                      <strong>{e.subjectCode}</strong> ({e.program}) • Room: {e.room} • Proctor: {e.proctor}
                    </div>
                    <span className="pill pill--royal" style={{ fontSize: "0.72rem" }}>
                      {e.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="cancel-button"
              disabled={loading}
              onClick={() => setIsUniversalCopyModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="action-button"
              disabled={loading || sourceTermExams.length === 0}
              onClick={handleApplyUniversalCopy}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>
                {loading ? "Applying Template..." : `Confirm & Apply ${sourceTermExams.length} Templates to ${universalCopyTargetTerm}`}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================================================
          SINGLE SESSION COPY MODAL (TEMPLATE REVALIDATION)
          =================================================== */}
      <Modal
        isOpen={isCopyModalOpen && canManage && Boolean(copyModalSession)}
        size="lg"
        eyebrow="Session Duplication"
        icon={<Copy size={20} />}
        title={`Copy ${copyModalSession?.subjectCode} Schedule (Template Revalidation)`}
        description="Reuse the examination assignments from this schedule for another term. Proctors, rooms, and sections will be automatically positioned under the new official examination date."
        onClose={() => {
          setIsCopyModalOpen(false);
          setCopyModalSession(null);
        }}
      >
        {copyModalSession && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "var(--srcb-surface)",
                border: "1px solid var(--srcb-border)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.82rem",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>Source Exam:</strong> {copyModalSession.subjectCode} ({copyModalSession.term} • {copyModalSession.examDate})
              </div>
              <div>
                <strong>Assignments to Copy:</strong> {copyAssignments.length} program cohort(s)
              </div>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="copyTargetTerm" className="modal-field-label">
                  <CalendarDays size={14} />
                  <span>Copy to Examination Term</span>
                  <span className="required-asterisk">*</span>
                </label>
                <select
                  id="copyTargetTerm"
                  value={copyForm.targetTerm}
                  onChange={(e) => handleCopyTargetTermChange(e.target.value as ExamTerm)}
                >
                  <option value="Prelim">Prelim</option>
                  <option value="Midterm">Midterm</option>
                  <option value="Semi-Final">Semi-Final</option>
                  <option value="Final">Final</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="copyTargetDate" className="modal-field-label">
                  <Calendar size={14} />
                  <span>Target Official Exam Date</span>
                  <span className="required-asterisk">*</span>
                </label>
                {canEditOfficialDates ? (
                  <input
                    id="copyTargetDate"
                    type="date"
                    value={copyForm.targetExamDate}
                    onChange={(e) => setCopyForm({ ...copyForm, targetExamDate: e.target.value })}
                    required
                  />
                ) : (
                  <div>
                    <input
                      id="copyTargetDate"
                      type="date"
                      value={copyForm.targetExamDate}
                      readOnly
                      disabled
                      style={{ background: "var(--srcb-surface-alt, #f1f5f9)", cursor: "not-allowed" }}
                    />
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", color: "var(--srcb-navy)", fontWeight: 600 }}>
                      <Lock size={12} />
                      <span>Official Schedule: {officialExamDates[copyForm.targetTerm] || "Not configured by Admin"}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="field-group" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="copyTargetTime" className="modal-field-label">
                  <Clock size={14} />
                  <span>Target Time Slot</span>
                  <span className="required-asterisk">*</span>
                </label>
                <input
                  id="copyTargetTime"
                  value={copyForm.targetTime}
                  onChange={(e) => setCopyForm({ ...copyForm, targetTime: e.target.value })}
                  placeholder="e.g. 08:00 AM - 10:00 AM"
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                Copied Program Assignments &amp; Resource Availability Check on {copyForm.targetExamDate}:
              </span>

              {copyAssignments.map((a, idx) => {
                const isProctorOccupied = exams.some(
                  (e) =>
                    e.examDate === copyForm.targetExamDate &&
                    isTimeOverlapping(e.time, copyForm.targetTime) &&
                    ((e.proctorId && e.proctorId === a.proctorId) || (e.proctor && e.proctor === a.proctor))
                );

                const isRoomOccupied = exams.some(
                  (e) =>
                    e.examDate === copyForm.targetExamDate &&
                    isTimeOverlapping(e.time, copyForm.targetTime) &&
                    e.room === a.room
                );

                const availableProctorsForThis = availableFaculty.filter((f) => {
                  const clash = exams.some(
                    (e) =>
                      e.examDate === copyForm.targetExamDate &&
                      isTimeOverlapping(e.time, copyForm.targetTime) &&
                      ((e.proctorId && e.proctorId === f.id) || (e.proctor && e.proctor === f.name))
                  );
                  return !clash;
                });

                const availableRoomsForThis = roomsList.filter((r) => {
                  const status = String(r.status || "").toLowerCase();
                  if (status === "maintenance" || status === "closed" || status === "inactive") return false;
                  const clash = exams.some(
                    (e) =>
                      e.examDate === copyForm.targetExamDate &&
                      isTimeOverlapping(e.time, copyForm.targetTime) &&
                      e.room === r.number
                  );
                  return !clash;
                });

                return (
                  <div
                    key={a.id || idx}
                    style={{
                      border: `1px solid ${isProctorOccupied || isRoomOccupied ? "#dc2626" : "var(--srcb-border)"}`,
                      borderRadius: 8,
                      padding: 12,
                      background: isProctorOccupied || isRoomOccupied ? "rgba(239, 68, 68, 0.03)" : "var(--srcb-surface)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="pill pill--navy" style={{ fontWeight: 700 }}>
                          {a.program || `Cohort #${idx + 1}`}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                          Sections: {a.sections.join(", ")}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!isProctorOccupied && !isRoomOccupied ? (
                          <span className="pill pill--emerald" style={{ fontSize: "0.72rem" }}>
                            <CheckCircle2 size={11} /> Ready to Copy
                          </span>
                        ) : (
                          <span className="pill pill--danger" style={{ fontSize: "0.72rem" }}>
                            <AlertTriangle size={11} /> Needs Resolution
                          </span>
                        )}
                      </div>
                    </div>

                    {isProctorOccupied && (
                      <div style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
                        ⚠ Teacher {a.proctor} is unavailable for this schedule. Please select another proctor below:
                      </div>
                    )}
                    {isRoomOccupied && (
                      <div style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
                        ⚠ Room {a.room} is unavailable for this schedule. Please select another room below:
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="field-group">
                        <label className="modal-field-label" style={{ fontSize: "0.74rem" }}>
                          <UserCheck size={13} />
                          <span>Proctor Assignment</span>
                        </label>
                        <select
                          value={a.proctorId}
                          onChange={(e) => handleCopyAssignmentProctorChange(idx, e.target.value)}
                          style={{ fontSize: "0.78rem", padding: "6px 8px" }}
                        >
                          <option value={a.proctorId}>{a.proctor} {isProctorOccupied ? "(Unavailable)" : "(Assigned)"}</option>
                          {availableProctorsForThis
                            .filter((f) => f.id !== a.proctorId)
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.department || "Faculty"})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label className="modal-field-label" style={{ fontSize: "0.74rem" }}>
                          <DoorOpen size={13} />
                          <span>Room Assignment</span>
                        </label>
                        <select
                          value={a.room}
                          onChange={(e) => handleCopyAssignmentRoomChange(idx, e.target.value)}
                          style={{ fontSize: "0.78rem", padding: "6px 8px" }}
                        >
                          <option value={a.room}>{a.room} {isRoomOccupied ? "(Occupied)" : "(Assigned)"}</option>
                          {availableRoomsForThis
                            .filter((r) => r.number !== a.room)
                            .map((r) => (
                              <option key={r.number} value={r.number}>
                                {r.number} - {r.building} (Cap: {r.capacity})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="cancel-button"
                disabled={loading}
                onClick={() => {
                  setIsCopyModalOpen(false);
                  setCopyModalSession(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button"
                onClick={handleSaveCopiedExam}
                disabled={loading || !copyForm.targetExamDate.trim() || !copyForm.targetTime.trim()}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                <span>{loading ? "Copying..." : "Confirm & Create Copied Examination"}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(examToDelete)}
        title="Remove Examination Assignment"
        variant="danger"
        confirmLabel="Remove Assignment"
        loading={loading}
        onCancel={() => setExamToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to remove the examination assignment for{" "}
            <strong>{examToDelete?.subjectCode}</strong> in room <strong>{examToDelete?.room}</strong> with proctor{" "}
            <strong>{examToDelete?.proctor}</strong>?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> The examination venue and proctor slot will be immediately freed up.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
