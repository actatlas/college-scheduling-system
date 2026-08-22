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

function slotToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  let [h, m = "0"] = timeStr.trim().split(":").map(Number);
  // Convert 12-hour afternoon times if needed (01:00 - 07:00 pm in college schedules)
  if (h >= 1 && h <= 7) h += 12;
  return h * 60 + m;
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

export function SchedulesPage() {
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; slotIdx: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: string; slotIdx: number } | null>(null);

  const toast = useToast();
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
    setIsOpen(true);
  };

  const buildingOptions = useMemo(() => {
    const defaults = ["College Building", "SHS Building", "JHS Building"];
    const roomBuildings = roomsList.map((r) => r.building).filter(Boolean);
    return Array.from(new Set([...defaults, ...roomBuildings]));
  }, [roomsList]);

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
        setIsOpen(true);
      }
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to update schedule location", "error");
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
    fetchSchedules();
    api.get("/faculty").then((res: any) => setFacultyList(res.data?.data || [])).catch(() => setFacultyList([]));
    api.get("/subjects").then((res: any) => setSubjectsList(res.data?.data || [])).catch(() => setSubjectsList([]));
    api.get("/rooms").then((res: any) => setRoomsList(res.data?.data || [])).catch(() => setRoomsList([]));
    api.get("/sections").then((res: any) => setSectionsList(res.data?.data || [])).catch(() => setSectionsList([]));
  }, []);

  const availableSubjects = useMemo(() => {
    if (role === "program_head") {
      return subjectsList.filter((s) => matchesProgram(s.program || s.department));
    }
    return subjectsList;
  }, [role, subjectsList, selectedProgram.key, matchesProgram]);

  const handleSubjectChange = (code: string) => {
    const sub = subjectsList.find((s) => s.code === code);
    if (!sub) return;

    const defInstructor = facultyList.find((f) => f.id === sub.instructorId || f.name === sub.instructor);
    const matchingSection = sectionsList.find((sec) => !sub.program || sec.program === sub.program || sec.course === sub.program) || sectionsList[0];
    const secVal = matchingSection ? (matchingSection.course && matchingSection.section ? `${matchingSection.course} ${matchingSection.yearLevel || ''}-${matchingSection.section}`.trim() : matchingSection.section) : "BSIT 1-A";

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      isMajor: Boolean(sub.isMajor),
      program: sub.program || prev.program,
      facultyId: defInstructor ? defInstructor.id : prev.facultyId,
      faculty: defInstructor ? defInstructor.name : prev.faculty,
      section: secVal,
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
        room: form.modality === "Online" ? (form.room || "Virtual Room") : (form.room || roomsList[0]?.number || "R-101"),
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
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save schedule";
      toast.push(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const visibleSchedules = useMemo(() => {
    return scheduleItems.filter((item) => {
      // If a specific instructor filter is chosen, filter by that instructor
      if (selectedFacultyFilter !== "All") {
        const isMatch =
          item.facultyId === selectedFacultyFilter ||
          item.faculty.toLowerCase() === selectedFacultyFilter.toLowerCase();
        if (!isMatch) return false;
      }

      if (role === "program_head") {
        if (!matchesProgram(item.program || selectedProgram.shortLabel)) {
          return false;
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
  }, [scheduleItems, role, selectedFacultyFilter, selectedDayFilter, query, selectedProgram.key, matchesProgram]);

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
                const firstSub = availableSubjects[0] || subjectsList[0];
                const defFac = facultyList.find((f) => f.id === firstSub?.instructorId) || facultyList[0];
                const defSec = sectionsList.find((s) => s.program === firstSub?.program) || sectionsList[0];
                const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
                const defRoom = roomsList[0]?.number || "room 101";
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
                  building: defBuilding,
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

            {/* Faculty / Teacher Filter */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Instructor:
              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", maxWidth: 180 }}
              >
                <option value="All">All Faculty Members</option>
                {role === "teacher" && currentUserName && (
                  <option value={currentTeacherId || currentUserName}>
                    ⭐ My Schedule ({currentUserName})
                  </option>
                )}
                {facultyList
                  .filter((f) => !currentUserName || f.name !== currentUserName)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department})
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
                      <td style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--srcb-navy)", background: "#f8fafc" }}>
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
                                    <span className="schedule-drag-hint">📥 Drop to assign here</span>
                                  ) : inRange && dragStart && dragCurrent ? (
                                    <span className="schedule-drag-hint">
                                      🎯 {TIME_SLOTS[Math.min(dragStart.slotIdx, dragCurrent.slotIdx)].split("-")[0]} -{" "}
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
                                title={canCreate ? "Drag to reschedule to another slot" : ""}
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
                                }}
                              >
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                                    <span style={{ fontWeight: 800, fontSize: "0.86rem", color: "#0f172a" }}>
                                      {item.subjectCode}
                                    </span>
                                    <span
                                      className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                                      style={{ fontSize: "0.68rem", padding: "2px 6px" }}
                                    >
                                      {item.modality}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.8rem", color: "#1e293b", marginTop: 3, fontWeight: 600 }}>
                                    {item.subject}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                                    <strong>🕒 Time:</strong> {item.time}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    <strong>👥 Sec:</strong> {item.section}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    <strong>📍 Room:</strong> {item.room} ({item.building.split(" ")[0]})
                                  </div>
                                  <div style={{ fontSize: "0.76rem", color: "#0d5499", fontWeight: 700, marginTop: 2 }}>
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
                                        fontWeight: 600,
                                      }}
                                    >
                                      <ExternalLink size={12} /> Join Class
                                    </a>
                                  )}
                                </div>

                                {canCreate && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8, paddingTop: 4, borderTop: "1px dashed #cbd5e1" }}>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(item)}
                                      title="Edit Class Block"
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "2px 4px" }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item.id)}
                                      disabled={deletingId === item.id}
                                      title="Delete Class Block"
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "2px 4px" }}
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
              <div className="empty-state" style={{ padding: "32px 16px", background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
                No scheduled classes found.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {visibleSchedules.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: item.modality === "Online" ? "#f0fdf4" : "#ffffff",
                      border: "1.5px solid #e2e8f0",
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
                      <h4 style={{ fontSize: "0.9rem", color: "#1e293b", margin: "0 0 8px 0", fontWeight: 600, lineHeight: 1.3 }}>
                        {item.subject}
                      </h4>

                      {/* Metadata Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: "0.8rem", color: "#475569", background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                        <div>
                          <strong style={{ color: "#0f172a" }}>📅 Day:</strong> {item.day}
                        </div>
                        <div>
                          <strong style={{ color: "#0f172a" }}>⏰ Time:</strong> {item.time}
                        </div>
                        <div>
                          <strong style={{ color: "#0f172a" }}>👥 Section:</strong> {item.section}
                        </div>
                        <div>
                          <strong style={{ color: "#0f172a" }}>📍 Room:</strong> {item.room}
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: "0.82rem", color: "#0d5499", fontWeight: 600 }}>
                        👨‍🏫 {item.faculty}
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
                    {canCreate && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleEdit(item)}
                          style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          style={{ padding: "5px 10px", fontSize: "0.78rem", color: "#dc2626", borderColor: "#fca5a5", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              {sectionsList.map((sec, idx) => {
                const secLabel = sec.section ? (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : sec.section) : `Section ${idx + 1}`;
                const secValue = sec.section ? (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : sec.section) : secLabel;
                return (
                  <option key={sec.id || idx} value={secValue}>
                    {secLabel} ({sec.students || 30} students)
                  </option>
                );
              })}
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
              {buildingOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
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
                {(() => {
                  const filtered = roomsList.filter((r) =>
                    r.building && form.building && r.building.toLowerCase().includes(form.building.split(" ")[0].toLowerCase())
                  );
                  const roomsToDisplay = filtered.length > 0 ? filtered : roomsList;
                  return roomsToDisplay.map((r) => (
                    <option key={r.number} value={r.number}>
                      {r.number} - {r.building || "Campus"} ({r.type || "Room"} · Capacity: {r.capacity})
                    </option>
                  ));
                })()}
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
