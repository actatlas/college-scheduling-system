import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { CardGridSkeleton } from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import { SearchableSelect, type SearchableOption } from "../components/common/SearchableSelect";
import { isTimeOverlapping } from "../utils/scheduling";
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
  GraduationCap,
  Layers,
  Building2,
  ChevronRight,
  Copy,
} from "lucide-react";
import { api } from "../data/apiClient";
import { useProgramContext } from "../contexts/ProgramContext";
import { useAcademicPeriod } from "../contexts/AcademicPeriodContext";
import type {
  ExamScheduleItem,
  ExamTerm,
  BuildingType,
  SectionItem,
  RoomItem,
  FacultyMember,
  SubjectItem,
  ClassScheduleItem,
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

export function ExamSchedulesPage() {
  const [exams, setExams] = useState<ExamScheduleItem[]>([]);
  const [sectionsList, setSectionsList] = useState<SectionItem[]>([]);
  const [roomsList, setRoomsList] = useState<RoomItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectItem[]>([]);
  const [classSchedules, setClassSchedules] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [examToDelete, setExamToDelete] = useState<ExamScheduleItem | null>(null);
  const [searchParams] = useSearchParams();
  const initialTermParam = searchParams.get("term");
  const [termFilter, setTermFilter] = useState(
    initialTermParam && ["Prelim", "Midterm", "Semi-Final", "Final"].includes(initialTermParam)
      ? initialTermParam
      : "All"
  );
  const [isOpen, setIsOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [editingExam, setEditingExam] = useState<ExamScheduleItem | null>(null);
  const [isAddingToExistingSession, setIsAddingToExistingSession] = useState(false);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canManage = role === "super_admin" || role === "admin" || role === "program_head";

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
      const [sRes, rRes, fRes, subRes, cRes] = await Promise.all([
        api.get("/sections").catch(() => ({ data: { data: [] } })),
        api.get("/rooms").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
        api.get("/schedules").catch(() => ({ data: { data: [] } })),
      ]);
      setSectionsList(sRes.data?.data || []);
      setRoomsList(rRes.data?.data || []);
      setFacultyList(fRes.data?.data || []);
      setSubjectsList(subRes.data?.data || []);
      setClassSchedules(cRes.data?.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchExams();
    fetchDependencies();
  }, []);

  useEffect(() => {
    const tParam = searchParams.get("term");
    if (tParam && ["Prelim", "Midterm", "Semi-Final", "Final"].includes(tParam)) {
      setTermFilter(tParam);
      setForm((prev) => ({ ...prev, term: tParam as ExamTerm }));
    }
  }, [searchParams]);

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

  // Subject Selection in Step 1
  const handleSubjectSelect = (code: string) => {
    const sub = availableSubjects.find((s) => s.code === code) || subjectsList.find((s) => s.code === code);
    if (!sub) return;

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      program: sub.program || prev.program,
    }));
  };

  // Sections taking this subject (Excludes sections with conflicting exams on other subjects)
  const availableSectionsForCurrentExam = useMemo(() => {
    const selectedSub = subjectsList.find((s) => s.code === form.subjectCode);

    return availableSections.filter((sec) => {
      // If subject is a Major with specific program, filter relevant sections
      if (selectedSub && selectedSub.program && selectedSub.isMajor === true) {
        const secProg = String(sec.program || sec.course || "").toUpperCase();
        const subProg = String(selectedSub.program).toUpperCase();
        if (!secProg.includes(subProg) && !subProg.includes(secProg)) {
          return false;
        }
      }

      // Check if section has another exam scheduled at this date & overlapping time
      // (Do not clash with other assignments belonging to the exact same examination session!)
      if (form.examDate && form.time) {
        const hasSectionClash = exams.some((e) => {
          if (editingExam && String(e.id) === String(editingExam.id)) return false;
          // If this exam record belongs to the same subject, date, and time, it is part of this examination session
          if (e.subjectCode === form.subjectCode && e.examDate === form.examDate && e.time === form.time) {
            return false;
          }
          if (!e.examDate || e.examDate !== form.examDate) return false;
          const assigned = e.synchronizedSections || [];
          const matchesSec = assigned.some(
            (s) =>
              s.toLowerCase().trim() === sec.section.toLowerCase().trim() ||
              (sec.course && s.toLowerCase().includes(sec.section.toLowerCase().trim()))
          );
          if (!matchesSec) return false;
          return isTimeOverlapping(e.time, form.time);
        });
        if (hasSectionClash) return false;
      }

      return true;
    });
  }, [availableSections, subjectsList, form.subjectCode, form.examDate, form.time, exams, editingExam]);

  // Group sections by Program for intuitive cohort selection (e.g. CRIM, ITP, HMP, EDUC, BSBA)
  const sectionsGroupedByProgram = useMemo(() => {
    const map = new Map<string, SectionItem[]>();
    for (const sec of availableSectionsForCurrentExam) {
      const prog = String(sec.course || sec.program || "General").toUpperCase().trim();
      if (!map.has(prog)) {
        map.set(prog, []);
      }
      map.get(prog)!.push(sec);
    }
    return Array.from(map.entries()).map(([prog, secList]) => ({
      program: prog,
      sections: secList,
    }));
  }, [availableSectionsForCurrentExam]);

  const handleAssignAllProgramSections = (assignIdx: number, program: string, programSections: SectionItem[]) => {
    setForm((prev) => {
      const nextAssignments = [...prev.assignments];
      const target = { ...nextAssignments[assignIdx] };

      // Collect section labels for this program that are not assigned in other assignments
      const otherAssigned = nextAssignments
        .filter((_, idx) => idx !== assignIdx)
        .flatMap((a) => a.sections);

      const toAdd = programSections
        .map((s) => (s.course && s.section ? `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() : s.section))
        .filter((secLabel) => !otherAssigned.includes(secLabel));

      target.sections = Array.from(new Set([...target.sections, ...toAdd]));
      target.program = program;

      nextAssignments[assignIdx] = target;
      return { ...prev, assignments: nextAssignments };
    });
  };

  // Helper to get available proctors for a specific assignment index
  const getAvailableProctorsForAssignment = (assignIdx: number) => {
    if (!form.examDate || !form.time) return availableFaculty;

    // Collect proctor IDs/names already chosen in OTHER assignments in this modal form
    const otherChosenProctors = form.assignments
      .filter((_, idx) => idx !== assignIdx)
      .map((a) => a.proctorId || a.proctor)
      .filter(Boolean);

    return availableFaculty.filter((f) => {
      // Exclude if already selected in another assignment in this form
      if (otherChosenProctors.includes(f.id) || otherChosenProctors.includes(f.name)) {
        return false;
      }

      // Exclude if already assigned to another exam in database at this date & overlapping time
      const hasExamClash = exams.some((e) => {
        if (editingExam && String(e.id) === String(editingExam.id)) return false;
        if (!e.examDate || e.examDate !== form.examDate) return false;
        const isSameProctor =
          (e.proctorId && f.id && String(e.proctorId) === String(f.id)) ||
          (e.proctor && f.name && e.proctor.toLowerCase().trim() === f.name.toLowerCase().trim());
        if (!isSameProctor) return false;
        return isTimeOverlapping(e.time, form.time);
      });

      return !hasExamClash;
    });
  };

  // Helper to get available rooms for a specific assignment index
  const getAvailableRoomsForAssignment = (assignIdx: number) => {
    if (!form.examDate || !form.time) return roomsList;

    // Collect rooms already chosen in OTHER assignments in this modal form
    const otherChosenRooms = form.assignments
      .filter((_, idx) => idx !== assignIdx)
      .map((a) => a.room)
      .filter(Boolean);

    return roomsList.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      if (status === "maintenance" || status === "closed" || status === "inactive") return false;

      // Exclude if already selected in another assignment in this form
      if (otherChosenRooms.includes(r.number)) {
        return false;
      }

      // Exclude if already booked for an exam in database at this date & overlapping time
      const hasRoomClash = exams.some((e) => {
        if (editingExam && String(e.id) === String(editingExam.id)) return false;
        if (!e.examDate || e.examDate !== form.examDate) return false;
        if (!e.room || String(e.room).toLowerCase().trim() !== String(r.number).toLowerCase().trim()) return false;
        return isTimeOverlapping(e.time, form.time);
      });

      return !hasRoomClash;
    });
  };

  // Step 1 Proactive Resource Availability Checks
  const availableProctorsForStep1 = useMemo(() => {
    if (!form.examDate || !form.time) return availableFaculty;
    return availableFaculty.filter((f) => {
      const hasClash = exams.some((e) => {
        if (editingExam && String(e.id) === String(editingExam.id)) return false;
        if (!e.examDate || e.examDate !== form.examDate) return false;
        const isSame =
          (e.proctorId && f.id && String(e.proctorId) === String(f.id)) ||
          (e.proctor && f.name && e.proctor.toLowerCase().trim() === f.name.toLowerCase().trim());
        if (!isSame) return false;
        return isTimeOverlapping(e.time, form.time);
      });
      return !hasClash;
    });
  }, [availableFaculty, form.examDate, form.time, exams, editingExam]);

  const availableRoomsForStep1 = useMemo(() => {
    if (!form.examDate || !form.time) return roomsList;
    return roomsList.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      if (status === "maintenance" || status === "closed" || status === "inactive") return false;
      const hasClash = exams.some((e) => {
        if (editingExam && String(e.id) === String(editingExam.id)) return false;
        if (!e.examDate || e.examDate !== form.examDate) return false;
        if (!e.room || String(e.room).toLowerCase().trim() !== String(r.number).toLowerCase().trim()) return false;
        return isTimeOverlapping(e.time, form.time);
      });
      return !hasClash;
    });
  }, [roomsList, form.examDate, form.time, exams, editingExam]);

  const isExamStep1ResourcesAvailable = useMemo(() => {
    if (!form.subjectCode || !form.examDate || !form.time) return false;
    const hasProctors = availableProctorsForStep1.length > 0;
    const hasRooms = availableRoomsForStep1.length > 0;
    const hasSections = availableSectionsForCurrentExam.length > 0;
    return hasProctors && hasRooms && hasSections;
  }, [form.subjectCode, form.examDate, form.time, availableProctorsForStep1, availableRoomsForStep1, availableSectionsForCurrentExam]);

  // Copy / Template Examination Schedule State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyModalSession, setCopyModalSession] = useState<ExamSessionDisplay | null>(null);
  const [copyForm, setCopyForm] = useState<{
    targetTerm: ExamTerm;
    targetExamDate: string;
    targetTime: string;
  }>({
    targetTerm: "Final",
    targetExamDate: "2026-11-20",
    targetTime: "09:00 AM - 10:00 AM",
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

  const handleOpenCopyModal = (session: ExamSessionDisplay) => {
    if (!canManage) return;
    setCopyModalSession(session);
    const nextTerm: ExamTerm =
      session.term === "Prelim"
        ? "Midterm"
        : session.term === "Midterm"
          ? "Semi-Final"
          : "Final";
    setCopyForm({
      targetTerm: nextTerm,
      targetExamDate: session.examDate || "2026-11-20",
      targetTime: session.time || "09:00 AM - 10:00 AM",
    });
    setCopyAssignments(
      session.assignments.map((a) => ({
        id: a.id,
        program: a.program,
        room: a.room,
        building: (a.building as BuildingType) || "College Building",
        proctor: a.proctor,
        proctorId: a.proctorId,
        sections: [...a.sections],
      }))
    );
    setIsCopyModalOpen(true);
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

      // Check if proctor is occupied in database
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

      // Check if room is occupied in database
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

      // Check duplicate examination for sections
      const hasDuplicate = exams.some(
        (e) =>
          e.subjectCode === copyModalSession.subjectCode &&
          e.term === copyForm.targetTerm &&
          e.synchronizedSections?.some((sec) => a.sections.includes(sec))
      );
      if (hasDuplicate) {
        toast.push(
          `${copyModalSession.subjectCode} ${copyForm.targetTerm} already has an examination schedule for section(s).`,
          "error"
        );
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
          color: copyModalSession.color || "#8b5cf6",
        });
      }

      toast.push(
        `Successfully copied ${copyModalSession.subjectCode} schedule to ${copyForm.targetTerm} (${copyAssignments.length} assignments created)`,
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

  // Modal Workflow Handlers
  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setIsAddingToExistingSession(false);
    const firstSub = availableSubjects[0] || subjectsList[0];
    setForm({
      term: "Midterm",
      examDate: "2026-10-15",
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
    // Skip Step 1 and open directly at Step 2 for this session!
    setModalStep(2);
    setIsOpen(true);
  };

  const handleEditAssignment = (rawExam: ExamScheduleItem) => {
    if (!canManage) return;
    setEditingExam(rawExam);
    setIsAddingToExistingSession(false);
    setForm({
      term: rawExam.term,
      examDate: rawExam.examDate,
      time: rawExam.time,
      subjectCode: rawExam.subjectCode,
      subject: rawExam.subject,
      program: rawExam.program || selectedProgram.key || "BSIT",
      assignments: [
        {
          id: rawExam.id,
          program: rawExam.program || "",
          room: rawExam.room,
          building: (rawExam.building as BuildingType) || "College Building",
          proctor: rawExam.proctor,
          proctorId: rawExam.proctorId || "",
          sections: rawExam.synchronizedSections || [],
        },
      ],
    });
    setModalStep(2);
    setIsOpen(true);
  };

  const handleContinueToStep2 = () => {
    if (!form.subjectCode) {
      toast.push("Please select an Academic Subject to continue", "error");
      return;
    }
    if (!form.examDate || !form.time) {
      toast.push("Please provide Examination Date and Time slot", "error");
      return;
    }

    // Strict Proactive Availability Check before Step 2
    if (availableSectionsForCurrentExam.length === 0) {
      toast.push(`No available sections taking ${form.subjectCode} at this time.`, "error");
      return;
    }

    if (availableProctorsForStep1.length === 0) {
      toast.push("No available faculty/proctors for this examination schedule.", "error");
      return;
    }

    if (availableRoomsForStep1.length === 0) {
      toast.push("No available rooms for this examination schedule.", "error");
      return;
    }

    setModalStep(2);
  };

  const handleAddAssignmentRow = () => {
    setForm((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          program: "",
          room: "",
          building: "College Building" as BuildingType,
          proctor: "",
          proctorId: "",
          sections: [],
        },
      ],
    }));
  };

  const handleRemoveAssignmentRow = (idx: number) => {
    if (form.assignments.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((_, i) => i !== idx),
    }));
  };

  const handleToggleSectionInAssignment = (assignIdx: number, secVal: string, secCourse?: string) => {
    setForm((prev) => {
      const nextAssignments = [...prev.assignments];
      const target = { ...nextAssignments[assignIdx] };
      const exists = target.sections.includes(secVal);
      target.sections = exists
        ? target.sections.filter((s) => s !== secVal)
        : [...target.sections, secVal];

      // Auto-set program tag if currently empty and course is available
      if (!target.program && secCourse) {
        target.program = secCourse;
      }
      nextAssignments[assignIdx] = target;
      return { ...prev, assignments: nextAssignments };
    });
  };

  const handleAssignmentRoomChange = (assignIdx: number, roomNumber: string) => {
    const selectedRoom = roomsList.find((r) => r.number === roomNumber);
    setForm((prev) => {
      const nextAssignments = [...prev.assignments];
      nextAssignments[assignIdx] = {
        ...nextAssignments[assignIdx],
        room: roomNumber,
        building: (selectedRoom?.building as BuildingType) || nextAssignments[assignIdx].building,
      };
      return { ...prev, assignments: nextAssignments };
    });
  };

  const handleAssignmentProctorChange = (assignIdx: number, proctorId: string) => {
    const fac = availableFaculty.find((f) => f.id === proctorId);
    setForm((prev) => {
      const nextAssignments = [...prev.assignments];
      nextAssignments[assignIdx] = {
        ...nextAssignments[assignIdx],
        proctorId: proctorId,
        proctor: fac ? fac.name : "",
      };
      return { ...prev, assignments: nextAssignments };
    });
  };

  const handleSave = async () => {
    if (!form.subjectCode || !form.examDate || !form.time) {
      toast.push("Please complete required basic exam details (Subject, Date, Time)", "error");
      return;
    }

    // Validate each assignment
    for (let i = 0; i < form.assignments.length; i++) {
      const a = form.assignments[i];
      if (!a.room) {
        toast.push(`Please select an available room for Assignment #${i + 1}`, "error");
        return;
      }
      if (!a.proctor) {
        toast.push(`Please select a proctor for Assignment #${i + 1}`, "error");
        return;
      }
      if (!a.sections || a.sections.length === 0) {
        toast.push(`Please assign at least one student section for Assignment #${i + 1}`, "error");
        return;
      }
    }

    setLoading(true);
    try {
      if (editingExam) {
        // Update single assignment
        const a = form.assignments[0];
        const payload = {
          term: form.term,
          examDate: form.examDate,
          time: form.time,
          subjectCode: form.subjectCode,
          subject: form.subject,
          sections: a.sections,
          synchronizedSections: a.sections,
          room: a.room,
          building: a.building,
          proctor: a.proctor,
          proctorId: a.proctorId,
          program: a.program || form.program,
          color:
            form.subjectCode.startsWith("IT")
              ? "#0284c7"
              : form.subjectCode.startsWith("BA")
                ? "#8b5cf6"
                : "#f59e0b",
        };
        await api.put(`/exams/${encodeURIComponent(editingExam.id)}`, payload);
        toast.push("Examination assignment updated", "success");
      } else {
        // Create all assignments for this examination session
        await Promise.all(
          form.assignments.map((a) => {
            const payload = {
              term: form.term,
              examDate: form.examDate,
              time: form.time,
              subjectCode: form.subjectCode,
              subject: form.subject,
              sections: a.sections,
              synchronizedSections: a.sections,
              room: a.room,
              building: a.building,
              proctor: a.proctor,
              proctorId: a.proctorId,
              program: a.program || form.program,
              color:
                form.subjectCode.startsWith("IT")
                  ? "#0284c7"
                  : form.subjectCode.startsWith("BA")
                    ? "#8b5cf6"
                    : "#f59e0b",
            };
            return api.post("/exams", payload);
          })
        );
        toast.push(
          `Examination scheduled with ${form.assignments.length} assignment${form.assignments.length > 1 ? "s" : ""}`,
          "success"
        );
      }

      setIsOpen(false);
      setEditingExam(null);
      setIsAddingToExistingSession(false);
      setModalStep(1);
      fetchExams();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save examination schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!canManage || !examToDelete) return;
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

  const storedTeacherId = window.localStorage.getItem("teacherId") || "";
  const userName = window.localStorage.getItem("userName") || "";
  const [assignedFilter, setAssignedFilter] = useState<"All" | "Mine">("All");

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

  // Requirement: ONE examination subject containing MULTIPLE examination assignments
  const groupedExamsBySubject = useMemo(() => {
    const subjectMap = new Map<string, GroupedSubjectDisplay>();

    for (const exam of filteredExams) {
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

      // Group by Term + ExamDate + Time (the shared examination schedule)
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
  }, [filteredExams]);

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
        title="Examination Schedules"
        description="Plan institutional examination sessions, manage room assignments across campus buildings, and assign faculty proctors."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Exams</strong>
          </>
        }
        helpText="Manage examination sessions across College, SHS, and JHS rooms with automated proctor and venue conflict prevention."
        actions={
          canManage ? (
            <button
              className="action-button"
              type="button"
              onClick={handleOpenCreateModal}
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
            <p className="eyebrow">Institutional Examination Timetable</p>
            <h3>Active Examination Schedules by Subject</h3>
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
                placeholder="Search subject, section, room, proctor..."
              />
            </label>
          </div>
        </div>

        {fetching ? (
          <CardGridSkeleton count={6} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
            {groupedExamsBySubject.length === 0 ? (
              <div className="empty-state" style={{ padding: "36px 16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No examination schedules found matching your filters.</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                  Try adjusting your search terms or selecting "All Terms".
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
                    Clear Search &amp; Filters
                  </button>
                )}
              </div>
            ) : (
              /* Requirement 8, 9 & 10: Render ONE main examination per subject with individual assignments */
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
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--srcb-text)" }}>
                                <Clock size={15} color="var(--srcb-navy)" />
                                <strong>{session.time}</strong>
                              </div>
                            </div>

                            {/* Actions: + Add Assignment & Copy Schedule */}
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
                                    {/* Tree branch glyph */}
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

                                    {/* Assignment Card */}
                                    <div
                                      style={{
                                        flex: 1,
                                        background: "#ffffff",
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

                                      {/* Assigned Section(s) for this specific Assignment */}
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
      </section>

      {/* ===================================================
          TWO-STEP MANUAL EXAMINATION SCHEDULING MODAL
          =================================================== */}
      <Modal
        isOpen={isOpen && canManage}
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
            : "Assign a dedicated proctor, examination room, and section(s) for each student cohort."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingExam(null);
          setIsAddingToExistingSession(false);
          setModalStep(1);
        }}
      >
        {/* Step Indicator (Only shown during full create flow) */}
        {!isAddingToExistingSession && !editingExam && (
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
              <span>1. Basic Exam Details (Shared Date &amp; Time)</span>
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
              <span>2. Resource Assignment (Proctor, Room, Sections)</span>
            </div>
          </div>
        )}

        {/* STEP 1: Basic Schedule Information (WHAT & WHEN) */}
        {modalStep === 1 && (
          <div className="form-grid">
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
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

            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="examTime">
                Time Slot <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="examTime"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="e.g. 09:00 AM - 10:00 AM"
                required
                aria-required="true"
              />
            </div>

            {/* Proactive Availability Assessment (Real-time pre-check) */}
            {form.subjectCode && form.examDate && form.time && (
              <div
                style={{
                  gridColumn: "1 / -1",
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
                    Proactive Examination Resource Availability:
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                    Analyzed for {form.examDate} • {form.time}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Proctor Badge */}
                  <span
                    className={`pill ${availableProctorsForStep1.length > 0 ? "pill--emerald" : "pill--danger"}`}
                    style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {availableProctorsForStep1.length > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {availableProctorsForStep1.length} Proctors Available
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        No available faculty/proctors for this schedule.
                      </>
                    )}
                  </span>

                  {/* Room Badge */}
                  <span
                    className={`pill ${availableRoomsForStep1.length > 0 ? "pill--emerald" : "pill--danger"}`}
                    style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {availableRoomsForStep1.length > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {availableRoomsForStep1.length} Rooms Available
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
                    className={`pill ${availableSectionsForCurrentExam.length > 0 ? "pill--emerald" : "pill--danger"}`}
                    style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {availableSectionsForCurrentExam.length > 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        {availableSectionsForCurrentExam.length} Section(s) Taking {form.subjectCode} Available
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
                {!isExamStep1ResourcesAvailable && (
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
                      {availableSectionsForCurrentExam.length === 0 && (
                        <div>No available sections taking {form.subjectCode} at this time. All matching sections have overlapping schedules.</div>
                      )}
                      {availableProctorsForStep1.length === 0 && (
                        <div>No available proctors for this schedule. All qualified faculty are assigned to other examinations at this time.</div>
                      )}
                      {availableRoomsForStep1.length === 0 && (
                        <div>No available rooms for this schedule. All classrooms/labs are occupied for exams at {form.examDate} {form.time}.</div>
                      )}
                      <div style={{ fontSize: "0.74rem", fontWeight: 400, marginTop: 4, color: "var(--srcb-text-muted)" }}>
                        Please adjust the Examination Date or Time Slot to proceed to resource assignment.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="table-actions" style={{ gridColumn: "1 / -1", marginTop: 20 }}>
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
                    ? "Cannot continue: Required resources (Proctors, Rooms, or Sections) are unavailable for this slot."
                    : "Proceed to assign Proctors, Rooms, and Sections"
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
            {/* Context Summary Bar (Read-only summary of Step 1) */}
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
                <strong>Date &amp; Time:</strong> <span>{form.examDate} • {form.time}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={14} color="var(--srcb-navy)" />
                <strong>Term:</strong> <span>{form.term} Exam</span>
              </div>
            </div>

            {/* List of Resource Assignments */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {form.assignments.map((assignment, idx) => {
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

                return (
                  <div
                    key={idx}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid var(--srcb-border)",
                      background: "var(--srcb-surface)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* Assignment Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="pill pill--navy" style={{ fontWeight: 700 }}>
                          Assignment #{idx + 1}
                        </span>
                        {assignment.program && (
                          <span className="pill" style={{ fontWeight: 600 }}>
                            {assignment.program}
                          </span>
                        )}
                        <span style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                          ({assignment.sections.length} section{assignment.sections.length !== 1 ? "s" : ""} selected)
                        </span>
                      </div>
                      {form.assignments.length > 1 && !editingExam && (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 8px", fontSize: "0.74rem", color: "#dc2626" }}
                          onClick={() => handleRemoveAssignmentRow(idx)}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Section Selection for this Assignment */}
                    <div className="field-group">
                      <label style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>
                          Available Sections for this Assignment <span style={{ color: "#dc2626" }}>*</span>
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)" }}>
                          Select sections (e.g. CRIM, ITP, HMP, EDUC, BSBA)
                        </span>
                      </label>

                      {availableSectionsForCurrentExam.length === 0 ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            background: "rgba(239, 68, 68, 0.08)",
                            borderRadius: 6,
                            color: "#dc2626",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          <AlertTriangle size={14} />
                          <span>No available sections taking {form.subjectCode} at this time.</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            background: "#ffffff",
                            padding: 12,
                            borderRadius: 6,
                            border: "1px solid var(--srcb-border)",
                            maxHeight: 240,
                            overflowY: "auto",
                          }}
                        >
                          {sectionsGroupedByProgram.map(({ program, sections }) => (
                            <div key={program} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  background: "var(--srcb-surface)",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                }}
                              >
                                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                                  {program} Cohort
                                </span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  style={{ padding: "2px 8px", fontSize: "0.68rem", fontWeight: 600 }}
                                  onClick={() => handleAssignAllProgramSections(idx, program, sections)}
                                >
                                  + Assign All {program} Sections
                                </button>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 6 }}>
                                {sections.map((sec) => {
                                  const secLabel =
                                    sec.course && sec.section
                                      ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim()
                                      : sec.section;
                                  const isChecked =
                                    assignment.sections.includes(sec.section) ||
                                    assignment.sections.includes(secLabel);

                                  const assignedInOtherIdx = form.assignments.findIndex(
                                    (a, aIdx) =>
                                      aIdx !== idx &&
                                      (a.sections.includes(sec.section) || a.sections.includes(secLabel))
                                  );
                                  const isAssignedInOther = assignedInOtherIdx !== -1;

                                  return (
                                    <label
                                      key={sec.id || sec.section}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "6px 8px",
                                        borderRadius: 4,
                                        background: isChecked
                                          ? "rgba(2, 132, 199, 0.1)"
                                          : isAssignedInOther
                                            ? "rgba(148, 163, 184, 0.1)"
                                            : "var(--srcb-surface)",
                                        border: `1px solid ${isChecked ? "var(--srcb-navy)" : "var(--srcb-border)"}`,
                                        cursor: isAssignedInOther ? "not-allowed" : "pointer",
                                        opacity: isAssignedInOther ? 0.5 : 1,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isAssignedInOther}
                                        onChange={() =>
                                          handleToggleSectionInAssignment(
                                            idx,
                                            secLabel,
                                            sec.course || sec.program
                                          )
                                        }
                                      />
                                      <div style={{ fontSize: "0.78rem" }}>
                                        <strong>{secLabel}</strong>
                                        <span style={{ display: "block", fontSize: "0.7rem", color: "var(--srcb-text-muted)" }}>
                                          {sec.students || 30} students
                                          {isAssignedInOther && ` (In Assignment #${assignedInOtherIdx + 1})`}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Room and Proctor Inputs for this Assignment */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                      {/* Proctor */}
                      <div className="field-group">
                        <label htmlFor={`assign-proctor-${idx}`}>
                          Teacher / Exam Proctor <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        {availableProctors.length === 0 ? (
                          <div
                            style={{
                              padding: "8px 12px",
                              background: "rgba(239, 68, 68, 0.08)",
                              borderRadius: 6,
                              color: "#dc2626",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            No available proctor for this slot.
                          </div>
                        ) : (
                          <SearchableSelect
                            id={`assign-proctor-${idx}`}
                            value={assignment.proctorId}
                            onChange={(val) => handleAssignmentProctorChange(idx, val)}
                            options={proctorOptions}
                            placeholder="Select available proctor..."
                            searchPlaceholder="Search faculty by name..."
                            emptyText="No matching proctors found"
                          />
                        )}
                      </div>

                      {/* Room */}
                      <div className="field-group">
                        <label htmlFor={`assign-room-${idx}`}>
                          Assigned Room &amp; Venue <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        {availableRooms.length === 0 ? (
                          <div
                            style={{
                              padding: "8px 12px",
                              background: "rgba(239, 68, 68, 0.08)",
                              borderRadius: 6,
                              color: "#dc2626",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            No available room for this slot.
                          </div>
                        ) : (
                          <>
                            <SearchableSelect
                              id={`assign-room-${idx}`}
                              value={assignment.room}
                              onChange={(val) => handleAssignmentRoomChange(idx, val)}
                              options={roomOptions}
                              placeholder="Select available room..."
                              searchPlaceholder="Search room by number..."
                              emptyText="No matching rooms found"
                            />
                            {(() => {
                              const totalStudentsInAssignment = assignment.sections.reduce((sum, secName) => {
                                const sObj = sectionsList.find((s) => s.section === secName || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === secName) || secName.includes(s.section));
                                return sum + Number(sObj?.students || 35);
                              }, 0);
                              const assignedRoomObj = roomsList.find((r) => r.number === assignment.room);
                              const isTooSmall = Boolean(assignment.room && assignedRoomObj && totalStudentsInAssignment > 0 && Number(assignedRoomObj.capacity) < totalStudentsInAssignment);

                              if (!isTooSmall) return null;
                              return (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 10px",
                                    background: "rgba(239, 68, 68, 0.08)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    borderRadius: 6,
                                    color: "#dc2626",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                    marginTop: 4,
                                  }}
                                >
                                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                                  <span>
                                    ⚠ Room {assignment.room} capacity ({assignedRoomObj?.capacity}) is smaller than assigned sections headcount ({totalStudentsInAssignment}).
                                  </span>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action to add another assignment in Step 2 */}
            {!editingExam && (
              <button
                type="button"
                className="secondary-button"
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  borderColor: "var(--srcb-navy)",
                  color: "var(--srcb-navy)",
                }}
                onClick={handleAddAssignmentRow}
              >
                <Plus size={15} />
                <span>+ Add Another Program / Room Assignment (Different Room &amp; Proctor)</span>
              </button>
            )}

            {/* Modal Actions */}
            <div className="table-actions" style={{ marginTop: 20 }}>
              {!isAddingToExistingSession && !editingExam && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalStep(1)}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Exam Details</span>
                </button>
              )}
              <button
                type="button"
                className="secondary-button"
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
                disabled={
                  loading ||
                  form.assignments.some((a) => {
                    if (!a.room || !a.proctor || a.sections.length === 0) return true;
                    const totalStudentsInAssignment = a.sections.reduce((sum, secName) => {
                      const sObj = sectionsList.find((s) => s.section === secName || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === secName) || secName.includes(s.section));
                      return sum + Number(sObj?.students || 35);
                    }, 0);
                    const assignedRoomObj = roomsList.find((r) => r.number === a.room);
                    return Boolean(assignedRoomObj && totalStudentsInAssignment > 0 && Number(assignedRoomObj.capacity) < totalStudentsInAssignment);
                  })
                }
                onClick={handleSave}
              >
                <CheckCircle2 size={16} />
                <span>
                  {loading
                    ? "Saving…"
                    : editingExam
                      ? "Update Assignment"
                      : isAddingToExistingSession
                        ? "Add Assignment to Exam"
                        : form.assignments.length > 1
                          ? `Save All ${form.assignments.length} Assignments`
                          : "Save Examination Schedule"}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================================================
          COPY EXAMINATION SCHEDULE TEMPLATE MODAL
          =================================================== */}
      <Modal
        isOpen={isCopyModalOpen && canManage && Boolean(copyModalSession)}
        title={`Copy ${copyModalSession?.subjectCode} Schedule (Template Revalidation)`}
        description="Reuse the examination assignments from this schedule for another term. All proctors, rooms, and sections will be proactively revalidated for the new timeslot."
        onClose={() => {
          setIsCopyModalOpen(false);
          setCopyModalSession(null);
        }}
      >
        {copyModalSession && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Source Context Summary */}
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
                <strong>Source Exam:</strong> {copyModalSession.subjectCode} ({copyModalSession.term})
              </div>
              <div>
                <strong>Assignments to Copy:</strong> {copyAssignments.length} program cohort(s)
              </div>
            </div>

            {/* Target Settings */}
            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="copyTargetTerm">Copy to Examination Term <span style={{ color: "#dc2626" }}>*</span></label>
                <select
                  id="copyTargetTerm"
                  value={copyForm.targetTerm}
                  onChange={(e) => setCopyForm({ ...copyForm, targetTerm: e.target.value as ExamTerm })}
                >
                  <option value="Prelim">Prelim</option>
                  <option value="Midterm">Midterm</option>
                  <option value="Semi-Final">Semi-Final</option>
                  <option value="Final">Final</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="copyTargetDate">Target Exam Date <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  id="copyTargetDate"
                  type="date"
                  value={copyForm.targetExamDate}
                  onChange={(e) => setCopyForm({ ...copyForm, targetExamDate: e.target.value })}
                  required
                />
              </div>

              <div className="field-group" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="copyTargetTime">Target Time Slot <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  id="copyTargetTime"
                  value={copyForm.targetTime}
                  onChange={(e) => setCopyForm({ ...copyForm, targetTime: e.target.value })}
                  placeholder="e.g. 09:00 AM - 10:00 AM"
                  required
                />
              </div>
            </div>

            {/* Assignments Revalidation Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                Copied Program Assignments &amp; Resource Availability Check:
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

                const isDuplicateSection = exams.some(
                  (e) =>
                    e.subjectCode === copyModalSession.subjectCode &&
                    e.term === copyForm.targetTerm &&
                    e.synchronizedSections?.some((sec) => a.sections.includes(sec))
                );

                // Available proctors for this copy assignment
                const availableProctorsForThis = availableFaculty.filter((f) => {
                  const clash = exams.some(
                    (e) =>
                      e.examDate === copyForm.targetExamDate &&
                      isTimeOverlapping(e.time, copyForm.targetTime) &&
                      ((e.proctorId && e.proctorId === f.id) || (e.proctor && e.proctor === f.name))
                  );
                  return !clash;
                });

                // Available rooms for this copy assignment
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
                      border: `1px solid ${isProctorOccupied || isRoomOccupied || isDuplicateSection ? "#dc2626" : "var(--srcb-border)"}`,
                      borderRadius: 8,
                      padding: 12,
                      background: isProctorOccupied || isRoomOccupied || isDuplicateSection ? "rgba(239, 68, 68, 0.03)" : "var(--srcb-surface)",
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
                        {!isProctorOccupied && !isRoomOccupied && !isDuplicateSection ? (
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

                    {/* Conflict Warnings */}
                    {isDuplicateSection && (
                      <div style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
                        ⚠ {copyModalSession.subjectCode} {copyForm.targetTerm} already has an examination schedule for this section.
                      </div>
                    )}
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

                    {/* Quick Manual Override Selectors if needed */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="field-group">
                        <label style={{ fontSize: "0.74rem" }}>Proctor Assignment</label>
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
                        <label style={{ fontSize: "0.74rem" }}>Room Assignment</label>
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

            {/* Actions */}
            <div className="table-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="secondary-button"
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
                disabled={loading}
              >
                {loading ? "Copying..." : "Confirm & Create Copied Examination"}
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
