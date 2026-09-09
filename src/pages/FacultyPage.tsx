import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import { useNotifications } from "../contexts/NotificationContext";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileSpreadsheet,
  FileCode,
  Printer,
  CheckCircle2,
  Building2,
  AlertCircle,
  Check,
  Sunrise,
  Sunset,
  Sun,
  RotateCcw,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { formatSystemId } from "../utils/idFormatter";
import { parseTimeToMinutes } from "../utils/scheduling";
import type { FacultyMember } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = [
  "07:00 AM - 07:30 AM",
  "07:30 AM - 08:00 AM",
  "08:00 AM - 08:30 AM",
  "08:30 AM - 09:00 AM",
  "09:00 AM - 09:30 AM",
  "09:30 AM - 10:00 AM",
  "10:00 AM - 10:30 AM",
  "10:30 AM - 11:00 AM",
  "11:00 AM - 11:30 AM",
  "11:30 AM - 12:00 PM",
  "12:00 PM - 12:30 PM",
  "12:30 PM - 01:00 PM",
  "01:00 PM - 01:30 PM",
  "01:30 PM - 02:00 PM",
  "02:00 PM - 02:30 PM",
  "02:30 PM - 03:00 PM",
  "03:00 PM - 03:30 PM",
  "03:30 PM - 04:00 PM",
  "04:00 PM - 04:30 PM",
  "04:30 PM - 05:00 PM",
  "05:00 PM - 05:30 PM",
  "05:30 PM - 06:00 PM",
  "06:00 PM - 06:30 PM",
  "06:30 PM - 07:00 PM",
  "07:00 PM - 07:30 PM",
  "07:30 PM - 08:00 PM",
  "08:00 PM - 08:30 PM",
  "08:30 PM - 09:00 PM",
];

function expandAvailabilityToSlots(raw: string, allSlots: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!raw) return result;

  const entries = raw.split("|").map((e) => e.trim()).filter(Boolean);
  for (const entry of entries) {
    const [dayPart, ...rest] = entry.split(":");
    if (!dayPart || rest.length === 0) continue;
    const rawDays = dayPart.trim();
    const slotList = rest.join(":").split(",").map((s) => s.trim()).filter(Boolean);

    let targetDays: string[] = [];
    if (rawDays.toLowerCase().includes("monday-friday")) {
      targetDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    } else if (rawDays.toLowerCase().includes("monday-saturday")) {
      targetDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    } else {
      targetDays = [rawDays];
    }

    for (const day of targetDays) {
      if (!result[day]) result[day] = [];
      for (const rangeStr of slotList) {
        if (allSlots.includes(rangeStr)) {
          if (!result[day].includes(rangeStr)) result[day].push(rangeStr);
          continue;
        }
        const [rStart, rEnd] = rangeStr.split("-").map((s) => s.trim());
        if (rStart && rEnd) {
          const rStartMin = parseTimeToMinutes(rStart);
          const rEndMin = parseTimeToMinutes(rEnd);
          for (const s of allSlots) {
            const [sStart, sEnd] = s.split("-").map((t) => t.trim());
            const sStartMin = parseTimeToMinutes(sStart);
            const sEndMin = parseTimeToMinutes(sEnd);
            if (sStartMin >= rStartMin && sEndMin <= rEndMin) {
              if (!result[day].includes(s)) result[day].push(s);
            }
          }
        }
      }
    }
  }
  return result;
}

function formatSlotsToAvailability(selectedSlots: Record<string, string[]>, _allSlots?: string[]): string {
  const dayEntries: string[] = [];

  for (const day of DAYS) {
    const current = selectedSlots[day] || [];
    if (current.length === 0) continue;

    const sorted = [...current].sort((a, b) => {
      const aStart = parseTimeToMinutes(a.split("-")[0].trim());
      const bStart = parseTimeToMinutes(b.split("-")[0].trim());
      return aStart - bStart;
    });

    const ranges: { start: string; end: string; startMin: number; endMin: number }[] = [];
    for (const slot of sorted) {
      const [sStart, sEnd] = slot.split("-").map((s) => s.trim());
      const sStartMin = parseTimeToMinutes(sStart);
      const sEndMin = parseTimeToMinutes(sEnd);

      if (ranges.length === 0) {
        ranges.push({ start: sStart, end: sEnd, startMin: sStartMin, endMin: sEndMin });
      } else {
        const last = ranges[ranges.length - 1];
        if (last.endMin === sStartMin) {
          last.end = sEnd;
          last.endMin = sEndMin;
        } else {
          ranges.push({ start: sStart, end: sEnd, startMin: sStartMin, endMin: sEndMin });
        }
      }
    }

    const rangeStrings = ranges.map((r) => `${r.start} - ${r.end}`);
    dayEntries.push(`${day}: ${rangeStrings.join(", ")}`);
  }

  return dayEntries.join(" | ");
}

export function FacultyPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [facultyToDelete, setFacultyToDelete] = useState<FacultyMember | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("search") || "");

  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search") || "";
    setQuery(q);
  }, [searchParams]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set("q", val);
      } else {
        next.delete("q");
        next.delete("search");
      }
      return next;
    }, { replace: true });
  };
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openRowActionId, setOpenRowActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

  // Form Validation States (Requirements 3 & 4)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [selectedFacultyForAvail, setSelectedFacultyForAvail] = useState<FacultyMember | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});
  const [dragStart, setDragStart] = useState<{ day: string; slotIdx: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: string; slotIdx: number } | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [dragIntent, setDragIntent] = useState<"add" | "remove">("add");

  const { selectedProgram, matchesProgram } = useProgramContext();
  const { addNotification } = useNotifications();

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = isSuperAdmin || role === "admin";
  const canEdit = isSuperAdmin;
  const canDelete = isSuperAdmin;
  const isProgramHead = role === "program_head";

  const [form, setForm] = useState({
    id: "",
    department: "Information Technology",
    email: "",
    status: "Full-Time" as "Full-Time" | "Part-Time",
    maxLoadHours: 24,
    availability: "Monday-Friday: 08:00-17:00",
    programs: ["BSIT"],
  });

  const toast = useToast();

  const fetchFaculty = async () => {
    setFetching(true);
    try {
      const res = await api.get("/faculty");
      setFaculty(res.data?.data || []);
    } catch {
      setFaculty([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleEdit = (f: FacultyMember) => {
    if (!canEdit) {
      toast.push("Forbidden. Administrators cannot edit teacher profiles.", "error");
      return;
    }
    setEditingFaculty(f);
    const parts = (f.name || "").trim().split(" ");
    const fName = parts.slice(0, -1).join(" ") || parts[0] || "";
    const lName = parts.length > 1 ? parts[parts.length - 1] : "";
    setFirstName(fName);
    setLastName(lName);
    setPhone(f.phone || "");
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setForm({
      id: f.id,
      department: f.department,
      email: f.email,
      status: f.status,
      maxLoadHours: f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24),
      availability: f.availability || "",
      programs: f.programs || ["BSIT"],
    });
    setIsOpen(true);
  };

  const handleOpenAdd = () => {
    if (!canEdit) {
      toast.push("Forbidden. Only the Super Administrator can register new faculty.", "error");
      return;
    }
    setEditingFaculty(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setForm({
      id: `FAC-00${faculty.length + 1}`,
      department: "Information Technology",
      email: "",
      status: "Full-Time",
      maxLoadHours: 24,
      availability: "Monday-Friday: 08:00-17:00",
      programs: ["BSIT"],
    });
    setIsOpen(true);
  };

  // Requirement 4: First Name and Last Name Validation
  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setFirstNameError("Invalid. Please enter characters only.");
    } else {
      setFirstNameError(null);
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setLastNameError("Invalid. Please enter characters only.");
    } else {
      setLastNameError(null);
    }
  };

  // Requirement 3: Phone Number Validation
  const handlePhoneChange = (val: string) => {
    const filtered = val.replace(/[^0-9+\s\-()]/g, "");
    setPhone(filtered);
    if (val !== filtered) {
      setPhoneError("Invalid phone number. Please enter digits and valid phone characters only.");
    } else {
      setPhoneError(null);
    }
  };

  const executeDelete = async () => {
    if (!facultyToDelete) return;
    if (!canDelete) {
      toast.push("Forbidden. Only the Super Administrator can delete faculty members.", "error");
      setFacultyToDelete(null);
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/faculty/${encodeURIComponent(facultyToDelete.id)}`);
      toast.push("Faculty member deleted successfully", "success");
      addNotification({
        title: "Faculty Profile Removed",
        message: `${facultyToDelete.name} was removed from the academic faculty roster.`,
        type: "warning",
        link: "/faculty",
        targetRole: "admin,program_head",
        targetProgram: facultyToDelete.department,
        targetTeacherId: facultyToDelete.id,
      });
      fetchFaculty();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete faculty member", "error");
    } finally {
      setLoading(false);
      setFacultyToDelete(null);
    }
  };

  const openAvailabilityModal = (f: FacultyMember) => {
    setSelectedFacultyForAvail(f);
    const slotsMap = expandAvailabilityToSlots(f.availability || "", SLOTS);
    setSelectedSlots(slotsMap);
    setAvailabilityModalOpen(true);
  };

  const dragRangeInfo = useMemo(() => {
    if (!isDraggingRange || !dragStart || !dragCurrent) return null;
    const minSlotIdx = Math.min(dragStart.slotIdx, dragCurrent.slotIdx);
    const maxSlotIdx = Math.max(dragStart.slotIdx, dragCurrent.slotIdx);
    const startDayIdx = DAYS.indexOf(dragStart.day);
    const currentDayIdx = DAYS.indexOf(dragCurrent.day);
    const minDayIdx = Math.min(startDayIdx, currentDayIdx);
    const maxDayIdx = Math.max(startDayIdx, currentDayIdx);
    const targetDays = DAYS.slice(minDayIdx, maxDayIdx + 1);

    const startSlotStr = SLOTS[minSlotIdx].split("-")[0].trim();
    const endSlotStr = SLOTS[maxSlotIdx].split("-")[1].trim();
    const hours = (maxSlotIdx - minSlotIdx + 1) * 0.5;

    return {
      minSlotIdx,
      maxSlotIdx,
      targetDays,
      startSlotStr,
      endSlotStr,
      hours,
    };
  }, [isDraggingRange, dragStart, dragCurrent]);

  const handleCellMouseDown = (day: string, slotIdx: number) => {
    if (isProgramHead) return;
    const slot = SLOTS[slotIdx];
    const isCurrentlySelected = Boolean(selectedSlots[day]?.includes(slot));
    const intent: "add" | "remove" = isCurrentlySelected ? "remove" : "add";

    setIsDraggingRange(true);
    setDragIntent(intent);
    setDragStart({ day, slotIdx });
    setDragCurrent({ day, slotIdx });
  };

  const handleCellMouseEnter = (day: string, slotIdx: number) => {
    if (!isDraggingRange || isProgramHead) return;
    setDragCurrent({ day, slotIdx });
  };

  const handleRangeMouseUp = useCallback(() => {
    if (!isDraggingRange || !dragStart || !dragCurrent) {
      setIsDraggingRange(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const minSlotIdx = Math.min(dragStart.slotIdx, dragCurrent.slotIdx);
    const maxSlotIdx = Math.max(dragStart.slotIdx, dragCurrent.slotIdx);
    const startDayIdx = DAYS.indexOf(dragStart.day);
    const currentDayIdx = DAYS.indexOf(dragCurrent.day);
    const minDayIdx = Math.min(startDayIdx, currentDayIdx);
    const maxDayIdx = Math.max(startDayIdx, currentDayIdx);
    const targetDays = DAYS.slice(minDayIdx, maxDayIdx + 1);

    const slotsInRange = SLOTS.slice(minSlotIdx, maxSlotIdx + 1);

    setSelectedSlots((prev) => {
      const updated = { ...prev };
      for (const d of targetDays) {
        const current = updated[d] || [];
        if (dragIntent === "add") {
          updated[d] = Array.from(new Set([...current, ...slotsInRange]));
        } else {
          updated[d] = current.filter((s) => !slotsInRange.includes(s));
        }
      }
      return updated;
    });

    setIsDraggingRange(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [isDraggingRange, dragStart, dragCurrent, dragIntent]);

  useEffect(() => {
    window.addEventListener("mouseup", handleRangeMouseUp);
    return () => window.removeEventListener("mouseup", handleRangeMouseUp);
  }, [handleRangeMouseUp]);

  const handleQuickPreset = (preset: "morning" | "afternoon" | "all_day" | "all_slots" | "clear_all") => {
    if (isProgramHead) return;
    if (preset === "clear_all") {
      setSelectedSlots({});
      return;
    }
    if (preset === "all_slots") {
      const all: Record<string, string[]> = {};
      for (const d of DAYS) {
        all[d] = [...SLOTS];
      }
      setSelectedSlots(all);
      return;
    }

    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const newSlots: Record<string, string[]> = { ...selectedSlots };

    for (const d of weekdays) {
      let filteredSlots: string[] = [];
      if (preset === "morning") {
        filteredSlots = SLOTS.filter((s) => {
          const startMin = parseTimeToMinutes(s.split("-")[0].trim());
          return startMin >= 420 && startMin < 720;
        });
      } else if (preset === "afternoon") {
        filteredSlots = SLOTS.filter((s) => {
          const startMin = parseTimeToMinutes(s.split("-")[0].trim());
          return startMin >= 780 && startMin < 1020;
        });
      } else if (preset === "all_day") {
        filteredSlots = SLOTS.filter((s) => {
          const startMin = parseTimeToMinutes(s.split("-")[0].trim());
          return startMin >= 480 && startMin < 1020;
        });
      }
      const current = newSlots[d] || [];
      newSlots[d] = Array.from(new Set([...current, ...filteredSlots]));
    }
    setSelectedSlots(newSlots);
  };

  const toggleDayColumn = (day: string) => {
    if (isProgramHead) return;
    const current = selectedSlots[day] || [];
    if (current.length === SLOTS.length) {
      setSelectedSlots((prev) => ({ ...prev, [day]: [] }));
    } else {
      setSelectedSlots((prev) => ({ ...prev, [day]: [...SLOTS] }));
    }
  };

  const toggleSlotRow = (slot: string) => {
    if (isProgramHead) return;
    const allDaysHaveSlot = DAYS.every((d) => selectedSlots[d]?.includes(slot));
    setSelectedSlots((prev) => {
      const updated = { ...prev };
      for (const d of DAYS) {
        const cur = updated[d] || [];
        if (allDaysHaveSlot) {
          updated[d] = cur.filter((s) => s !== slot);
        } else {
          if (!cur.includes(slot)) {
            updated[d] = [...cur, slot];
          }
        }
      }
      return updated;
    });
  };

  const totalSelectedSlotsCount = useMemo(() => {
    return Object.values(selectedSlots).reduce((sum, slots) => sum + slots.length, 0);
  }, [selectedSlots]);

  const saveAvailabilityFromModal = async () => {
    if (!selectedFacultyForAvail) return;
    const formatted = formatSlotsToAvailability(selectedSlots, SLOTS);

    try {
      await api.put(`/faculty/${encodeURIComponent(selectedFacultyForAvail.id)}`, {
        availability: formatted || "Monday-Friday: 08:00 AM - 05:00 PM",
      });
      toast.push(`Updated availability for ${selectedFacultyForAvail.name}`, "success");
      addNotification({
        title: "Faculty Availability Updated",
        message: `Teaching availability timesheet updated for ${selectedFacultyForAvail.name}.`,
        type: "info",
        link: "/faculty",
        targetRole: "admin,program_head,teacher",
        targetProgram: selectedFacultyForAvail.department,
        targetTeacherId: selectedFacultyForAvail.id,
      });
      setAvailabilityModalOpen(false);
      fetchFaculty();
    } catch {
      toast.push("Failed to update availability", "error");
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.push("Only administrators can modify faculty profiles", "error");
      return;
    }
    if (!form.id) {
      toast.push("Employee ID is required", "error");
      return;
    }

    // Requirement 4: First Name & Last Name validation
    if (!firstName.trim()) {
      setFirstNameError("First Name is required");
      toast.push("First Name is required", "error");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(firstName.trim())) {
      setFirstNameError("Invalid. Please enter characters only.");
      toast.push("Invalid First Name. Please enter characters only.", "error");
      return;
    }

    if (!lastName.trim()) {
      setLastNameError("Last Name is required");
      toast.push("Last Name is required", "error");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(lastName.trim())) {
      setLastNameError("Invalid. Please enter characters only.");
      toast.push("Invalid Last Name. Please enter characters only.", "error");
      return;
    }

    // Requirement 3: Phone number validation
    if (phone.trim() && !/^\+?[0-9\s\-()]{7,15}$/.test(phone.trim())) {
      setPhoneError("Invalid phone number. Please enter digits and valid phone characters only.");
      toast.push("Invalid phone number format", "error");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (!canEdit) {
      toast.push("Forbidden. Administrators cannot edit teacher profiles.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        name: fullName,
        phone: phone.trim(),
      };

      if (editingFaculty) {
        await api.put(`/faculty/${encodeURIComponent(editingFaculty.id)}`, payload);
        toast.push("Faculty profile updated successfully", "success");
        addNotification({
          title: "Faculty Profile Updated",
          message: `Faculty record for ${fullName} (${form.department}) updated.`,
          type: "success",
          link: "/faculty",
          targetRole: "admin,program_head",
          targetProgram: form.department,
          targetTeacherId: editingFaculty.id,
        });
      } else {
        await api.post("/faculty", payload);
        toast.push("Faculty member added successfully", "success");
        addNotification({
          title: "New Faculty Registered",
          message: `${fullName} registered to ${form.department} faculty roster.`,
          type: "success",
          link: "/faculty",
          targetRole: "admin,program_head",
          targetProgram: form.department,
          targetTeacherId: form.id,
        });
      }
      fetchFaculty();
      setIsOpen(false);
      setEditingFaculty(null);
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save faculty", "error");
    } finally {
      setLoading(false);
    }
  };

  // Click outside listener for filter, export, and row actions popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setOpenRowActionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Distinct departments for filter popover
  const departments = useMemo(() => {
    const set = new Set<string>();
    faculty.forEach((f) => {
      if (f.department) set.add(f.department);
    });
    return Array.from(set).sort();
  }, [faculty]);

  // Filtered faculty calculation
  const filteredFaculty = useMemo(() => {
    return faculty.filter((entry) => {
      const formattedId = formatSystemId(entry.id);
      const matchesQuery =
        !query.trim() ||
        [
          entry.name,
          entry.department,
          entry.status,
          entry.availability,
          entry.id,
          formattedId,
          entry.email || "",
          entry.phone || "",
          ...(entry.programs || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        entry.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesDept =
        deptFilter === "all" ||
        entry.department.toLowerCase() === deptFilter.toLowerCase();
      const matchesProg = matchesProgram(entry.programs || entry.department);

      return matchesQuery && matchesStatus && matchesDept && matchesProg;
    });
  }, [faculty, query, statusFilter, deptFilter, matchesProgram]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, deptFilter, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredFaculty.length / pageSize));
  const paginatedFaculty = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFaculty.slice(startIndex, startIndex + pageSize);
  }, [filteredFaculty, currentPage, pageSize]);

  // Active filter count
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (deptFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    handleQueryChange("");
    setStatusFilter("all");
    setDeptFilter("all");
    setIsFilterOpen(false);
  };

  // Row Selection Handlers
  const isAllCurrentPageSelected =
    paginatedFaculty.length > 0 &&
    paginatedFaculty.every((f) => selectedIds.has(f.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const next = new Set(selectedIds);
      paginatedFaculty.forEach((f) => next.delete(f.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedFaculty.forEach((f) => next.add(f.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getInitials = (name: string) => {
    if (!name) return "F";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Export handlers
  const exportToCsv = (data: FacultyMember[], filename = "scsms_faculty_roster.csv") => {
    const headers = [
      "System ID",
      "Employee ID",
      "Full Name",
      "Email Address",
      "Phone",
      "Department",
      "Employment Status",
      "Max Load (Hours)",
      "Availability Schedule",
    ];
    const rows = data.map((f) => [
      `"${f.id}"`,
      `"${formatSystemId(f.id)}"`,
      `"${(f.name || "").replace(/"/g, '""')}"`,
      `"${f.email || ""}"`,
      `"${f.phone || ""}"`,
      `"${f.department || ""}"`,
      `"${f.status || ""}"`,
      `"${f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24)}"`,
      `"${(f.availability || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push(`Exported ${data.length} faculty records to CSV`, "info");
    setIsExportOpen(false);
  };

  const exportToJson = (data: FacultyMember[], filename = "scsms_faculty_roster.json") => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push(`Exported ${data.length} faculty records to JSON`, "info");
    setIsExportOpen(false);
  };

  const handlePrint = () => {
    setIsExportOpen(false);
    window.print();
  };

  return (
    <div className="user-mgmt-container">
      <PageHeader
        title={
          isProgramHead
            ? `Program Faculty & Major Subject Instructors • ${selectedProgram.label}`
            : "Faculty & Availability Management"
        }
        description={
          isProgramHead
            ? `View instructors assigned to ${selectedProgram.label} (${selectedProgram.key || "ITP"}) major subjects, and inspect teaching availability for scheduling.`
            : "Maintain instructor profiles, full-time / part-time status, teaching load limits, and weekly availability schedules."
        }
        breadcrumbs={
          isProgramHead ? (
            <>
              <span>Home</span> <span>/</span> <span>{selectedProgram.shortLabel || "Program"}</span> <span>/</span> <strong>Faculty</strong>
            </>
          ) : (
            <>
              <span>Home</span> <span>/</span> <strong>Faculty</strong>
            </>
          )
        }
        actions={
          canEdit ? (
            <button
              className="user-mgmt-primary-btn"
              type="button"
              onClick={handleOpenAdd}
              aria-label="Add new faculty member"
            >
              <Plus size={16} />
              <span>Add Faculty</span>
            </button>
          ) : undefined
        }
      />

      {/* Main Faculty Roster Data Table Card */}
      <section className="user-mgmt-card">
        {/* Controls Toolbar (Search, Filter, Export, Add Faculty) */}
        <div className="user-mgmt-toolbar">
          {/* Search Input with Clear Button */}
          <div className="user-mgmt-search-wrapper">
            <span className="user-mgmt-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="user-mgmt-search-input"
              placeholder="Search faculty by name, department, ID..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              aria-label="Search faculty by name, department, or ID"
            />
            {query && (
              <button
                type="button"
                className="user-mgmt-search-clear"
                onClick={() => handleQueryChange("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls Actions Group */}
          <div className="user-mgmt-actions-group">
            {/* Filter Popover Trigger */}
            <div style={{ position: "relative" }} ref={filterRef}>
              <button
                type="button"
                className={`user-mgmt-secondary-btn ${isFilterOpen || activeFilterCount > 0 ? "is-active" : ""}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-label="Filter faculty records"
                aria-expanded={isFilterOpen}
              >
                <Filter size={15} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="filter-badge-count">{activeFilterCount}</span>
                )}
              </button>

              {/* Filter Dropdown Popover */}
              {isFilterOpen && (
                <div className="user-mgmt-dropdown-popover user-mgmt-filter-popover" role="dialog">
                  <div className="filter-popover-header">
                    <h4 className="filter-popover-title">Filter Faculty</h4>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="filter-popover-reset"
                        onClick={resetFilters}
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Filter by Status */}
                  <div className="filter-group">
                    <label htmlFor="facultyStatusFilter">Employment Status</label>
                    <select
                      id="facultyStatusFilter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Full-Time">Full-Time Only</option>
                      <option value="Part-Time">Part-Time Only</option>
                    </select>
                  </div>

                  {/* Filter by Department */}
                  <div className="filter-group">
                    <label htmlFor="facultyDeptFilter">Department</label>
                    <select
                      id="facultyDeptFilter"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Export Dropdown Trigger */}
            <div style={{ position: "relative" }} ref={exportRef}>
              <button
                type="button"
                className={`user-mgmt-secondary-btn ${isExportOpen ? "is-active" : ""}`}
                onClick={() => setIsExportOpen((prev) => !prev)}
                aria-label="Export faculty records"
                aria-expanded={isExportOpen}
              >
                <Download size={15} />
                <span>Export</span>
                <ChevronDown size={14} />
              </button>

              {/* Export Menu Popover */}
              {isExportOpen && (
                <div className="user-mgmt-dropdown-popover user-mgmt-export-popover" role="menu">
                  <button
                    type="button"
                    className="user-mgmt-menu-item"
                    onClick={() => exportToCsv(filteredFaculty, "scsms_faculty_roster.csv")}
                    role="menuitem"
                  >
                    <FileSpreadsheet size={16} style={{ color: "#10b981" }} />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    type="button"
                    className="user-mgmt-menu-item"
                    onClick={() => exportToJson(filteredFaculty, "scsms_faculty_roster.json")}
                    role="menuitem"
                  >
                    <FileCode size={16} style={{ color: "#3b82f6" }} />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    type="button"
                    className="user-mgmt-menu-item"
                    onClick={handlePrint}
                    role="menuitem"
                  >
                    <Printer size={16} style={{ color: "#6366f1" }} />
                    <span>Print Table</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Selection Bar (appears when 1+ rows selected) */}
        {selectedIds.size > 0 && (
          <div className="user-mgmt-bulk-bar" role="region" aria-label="Bulk actions toolbar">
            <div className="bulk-bar-info">
              <CheckCircle2 size={16} />
              <span>
                <strong>{selectedIds.size}</strong> of {filteredFaculty.length} instructor{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="bulk-bar-actions">
              <button
                type="button"
                className="bulk-action-btn"
                onClick={() => {
                  const selectedList = faculty.filter((f) => selectedIds.has(f.id));
                  exportToCsv(selectedList, "scsms_selected_faculty.csv");
                }}
              >
                <Download size={14} />
                <span>Export Selected</span>
              </button>
              <button
                type="button"
                className="bulk-action-btn"
                onClick={clearSelection}
              >
                <X size={14} />
                <span>Clear Selection</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {fetching ? (
          <TableSkeleton rows={7} columns={6} />
        ) : (
          <div className="user-mgmt-table-wrap">
            <table className="user-mgmt-table" aria-label="Faculty roster data table">
              <thead>
                <tr>
                  <th className="user-mgmt-checkbox-cell">
                    <input
                      type="checkbox"
                      className="custom-table-checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all instructors on current page"
                    />
                  </th>
                  <th>FACULTY MEMBER</th>
                  <th>DEPARTMENT / PROGRAMS</th>
                  <th>STATUS</th>
                  <th>TEACHING LOAD / AVAILABILITY</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="user-mgmt-empty-state">
                        <p className="empty-state-title">No faculty records found</p>
                        <p className="empty-state-desc">
                          {query || statusFilter !== "all" || deptFilter !== "all"
                            ? "Try adjusting your search criteria, employment status, or department filters."
                            : isProgramHead
                              ? `No faculty members found for ${selectedProgram.label}.`
                              : "No registered faculty exist yet. Click 'Add Faculty' above to register the first instructor."}
                        </p>
                        {(query || statusFilter !== "all" || deptFilter !== "all") && (
                          <button
                            type="button"
                            className="empty-state-reset-btn"
                            onClick={resetFilters}
                          >
                            Reset All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedFaculty.map((f) => {
                    const isSelected = selectedIds.has(f.id);
                    const isActionOpen = openRowActionId === f.id;
                    const availabilityDays = f.availability
                      ? f.availability.split("|").length
                      : 0;

                    return (
                      <tr key={f.id} className={isSelected ? "is-selected" : ""}>
                        {/* Checkbox Column */}
                        <td className="user-mgmt-checkbox-cell">
                          <input
                            type="checkbox"
                            className="custom-table-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(f.id)}
                            aria-label={`Select instructor ${f.name}`}
                          />
                        </td>

                        {/* Faculty Member Identity Cell */}
                        <td>
                          <div className="user-identity-cell">
                            <div className="user-avatar-wrap">
                              <div className="user-avatar-circle" aria-hidden="true">
                                {getInitials(f.name)}
                              </div>
                            </div>
                            <div className="user-identity-details">
                              <span className="user-identity-name">{f.name}</span>
                              <span className="user-identity-email">
                                {f.email || f.phone || "No email recorded"}
                              </span>
                              <span className="user-identity-id">
                                {formatSystemId(f.id)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Department / Programs Cell */}
                        <td>
                          <div>
                            <span className="pill" style={{ fontWeight: 700 }}>
                              <Building2 size={13} style={{ marginRight: 4 }} />
                              {f.department}
                            </span>
                            {f.programs && f.programs.length > 0 && (
                              <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                                {f.programs.map((p) => (
                                  <span key={p} className="pill pill--slate" style={{ fontSize: "0.72rem" }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Employment Status Cell */}
                        <td>
                          <span
                            className={`status-indicator-pill ${f.status === "Part-Time" ? "part-time" : "full-time"
                              }`}
                          >
                            <span className="status-dot" aria-hidden="true" />
                            <span>{f.status}</span>
                          </span>
                        </td>

                        {/* Teaching Load / Availability Cell */}
                        <td>
                          <div>
                            <span style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>
                              {f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24)} hrs/wk max
                            </span>
                            <p
                              style={{
                                margin: "3px 0 0",
                                fontSize: "0.76rem",
                                color: "var(--srcb-text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Clock size={12} />
                              {f.availability
                                ? availabilityDays > 2
                                  ? `${availabilityDays} Active Days Configured`
                                  : f.availability
                                : "Standard Schedule"}
                            </p>
                          </div>
                        </td>

                        {/* Actions Dropdown Column */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{ position: "relative", display: "inline-block" }}
                            ref={isActionOpen ? actionMenuRef : undefined}
                          >
                            <button
                              type="button"
                              className={`row-actions-trigger ${isActionOpen ? "is-open" : ""}`}
                              onClick={() =>
                                setOpenRowActionId((prev) => (prev === f.id ? null : f.id))
                              }
                              aria-label={`Actions for ${f.name}`}
                              aria-expanded={isActionOpen}
                            >
                              <span>Actions</span>
                              <ChevronDown size={13} />
                            </button>

                            {/* Row Action Dropdown Popover */}
                            {isActionOpen && (
                              <div className="user-mgmt-dropdown-popover" role="menu">
                                <button
                                  type="button"
                                  className="user-mgmt-menu-item"
                                  onClick={() => {
                                    setOpenRowActionId(null);
                                    openAvailabilityModal(f);
                                  }}
                                  role="menuitem"
                                >
                                  <Clock size={15} style={{ color: "#0284c7" }} />
                                  <span>Manage Availability</span>
                                </button>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="user-mgmt-menu-item"
                                    onClick={() => {
                                      setOpenRowActionId(null);
                                      handleEdit(f);
                                    }}
                                    role="menuitem"
                                  >
                                    <Edit2 size={15} />
                                    <span>Edit Profile</span>
                                  </button>
                                )}
                                {canDelete && (
                                  <>
                                    <div className="user-mgmt-menu-divider" />
                                    <button
                                      type="button"
                                      className="user-mgmt-menu-item danger"
                                      onClick={() => {
                                        setOpenRowActionId(null);
                                        setFacultyToDelete(f);
                                      }}
                                      role="menuitem"
                                    >
                                      <Trash2 size={15} />
                                      <span>Delete Faculty</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Summary Footer */}
        <div className="user-mgmt-pagination">
          <div className="pagination-summary">
            {filteredFaculty.length === 0
              ? "Showing 0 entries"
              : `Showing ${Math.min(
                (currentPage - 1) * pageSize + 1,
                filteredFaculty.length
              )} to ${Math.min(
                currentPage * pageSize,
                filteredFaculty.length
              )} of ${filteredFaculty.length} entries`}
          </div>

          <div className="pagination-controls-group">
            {/* Rows per page selector */}
            <div className="pagination-rows-select">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Select rows per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Navigation */}
            <div className="pagination-nav-buttons" role="navigation" aria-label="Pagination">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                aria-label="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Numbered page buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 5) return true;
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  );
                })
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && page - prev > 1;

                  return (
                    <div key={page} style={{ display: "inline-flex", alignItems: "center" }}>
                      {showEllipsis && (
                        <span style={{ padding: "0 4px", color: "var(--srcb-text-muted)", fontSize: "0.85rem" }}>
                          …
                        </span>
                      )}
                      <button
                        type="button"
                        className={`pagination-btn ${currentPage === page ? "is-active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Last Page"
                aria-label="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isOpen && canEdit}
        title={editingFaculty ? "Edit Faculty Profile" : "Register Faculty Member"}
        description="Configure employee details, department, employment status, and weekly limits."
        onClose={() => {
          setIsOpen(false);
          setEditingFaculty(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="facultyId">
              Employee ID <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="facultyId"
              value={form.id}
              disabled={!!editingFaculty}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              required
              aria-required="true"
            />
          </div>

          {/* Requirement 4: First Name & Last Name (Characters Only) */}
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field-group">
              <label htmlFor="facultyFirstName">
                First Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="facultyFirstName"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="e.g. Alan"
                required
                aria-required="true"
              />
              {firstNameError && (
                <p className="field-error-msg" role="alert" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} /> {firstNameError}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="facultyLastName">
                Last Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="facultyLastName"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="e.g. Turing"
                required
                aria-required="true"
              />
              {lastNameError && (
                <p className="field-error-msg" role="alert" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} /> {lastNameError}
                </p>
              )}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="facultyEmail">Email Address</label>
            <input
              id="facultyEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="faculty@srcb.edu.ph"
            />
          </div>

          {/* Requirement 3: Phone Number Validation */}
          <div className="field-group">
            <label htmlFor="facultyPhone">Phone Contact</label>
            <input
              id="facultyPhone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="09171234567"
            />
            {phoneError && (
              <p className="field-error-msg" role="alert" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} /> {phoneError}
              </p>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="facultyDept">Department</label>
            <input
              id="facultyDept"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyStatus">Employment Status</label>
            <select
              id="facultyStatus"
              value={form.status}
              onChange={(e) => {
                const status = e.target.value as "Full-Time" | "Part-Time";
                setForm({
                  ...form,
                  status,
                  maxLoadHours: status === "Part-Time" ? 12 : 24,
                });
              }}
            >
              <option value="Full-Time">Full-Time Faculty</option>
              <option value="Part-Time">Part-Time Faculty</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="facultyMaxLoad">Maximum Weekly Load (Hours)</label>
            <input
              id="facultyMaxLoad"
              type="number"
              value={form.maxLoadHours}
              onChange={(e) => setForm({ ...form, maxLoadHours: Number(e.target.value) || 24 })}
              min={1}
              max={40}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="cancel-button"
            onClick={() => {
              setIsOpen(false);
              setEditingFaculty(null);
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
            {loading ? "Saving..." : editingFaculty ? "Update Profile" : "Register Faculty"}
          </button>
        </div>
      </Modal>

      {/* Availability Timesheet Grid Modal */}
      <Modal
        isOpen={availabilityModalOpen}
        title={selectedFacultyForAvail ? `Teaching Availability • ${selectedFacultyForAvail.name}` : "Teaching Availability"}
        description="Click on any start time slot and drag down across the column to your designated end time to quickly select the teaching schedule."
        onClose={() => setAvailabilityModalOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Preset Quick Fill Controls */}
          {!isProgramHead && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "var(--srcb-surface-alt, #f8fafc)", borderRadius: 8, border: "1px solid var(--srcb-border, #e2e8f0)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--srcb-navy)" }}>Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("morning")}
                  className="chip-button"
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Sunrise size={12} color="#f59e0b" /> Morning (7am-12pm)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("afternoon")}
                  className="chip-button"
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Sunset size={12} color="#f97316" /> Afternoon (1pm-5pm)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("all_day")}
                  className="chip-button"
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Sun size={12} color="#0284c7" /> Full Day (8am-5pm)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("all_slots")}
                  className="chip-button"
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, border: "1px solid #a7f3d0", background: "#f0fdf4", color: "#15803d", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Check size={12} /> Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("clear_all")}
                  className="chip-button"
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <RotateCcw size={12} /> Clear All
                </button>
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.74rem", fontWeight: 700, color: totalSelectedSlotsCount > 0 ? "#15803d" : "#64748b", background: totalSelectedSlotsCount > 0 ? "#dcfce7" : "#f1f5f9", padding: "3px 10px", borderRadius: 12 }}>
                <CheckCircle2 size={13} />
                <span>{totalSelectedSlotsCount} Slots Selected ({(totalSelectedSlotsCount * 0.5).toFixed(1)} hrs/wk)</span>
              </div>
            </div>
          )}

          {/* Real-time Designated Time Range Drag Status Banner */}
          {dragRangeInfo ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                borderRadius: 8,
                background: dragIntent === "add" ? "#ecfdf5" : "#fef2f2",
                border: `1.5px solid ${dragIntent === "add" ? "#10b981" : "#ef4444"}`,
                color: dragIntent === "add" ? "#065f46" : "#991b1b",
                fontSize: "0.82rem",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} />
                <span>
                  {dragIntent === "add" ? "Designating Time:" : "Clearing Time:"}{" "}
                  <strong>
                    {dragRangeInfo.targetDays.length === 1
                      ? dragRangeInfo.targetDays[0]
                      : `${dragRangeInfo.targetDays[0]} – ${dragRangeInfo.targetDays[dragRangeInfo.targetDays.length - 1]}`}
                  </strong>{" "}
                  • {dragRangeInfo.startSlotStr} to {dragRangeInfo.endSlotStr} ({dragRangeInfo.hours} {dragRangeInfo.hours === 1 ? "hour" : "hours"})
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", background: "#ffffff", padding: "2px 8px", borderRadius: 4, border: "1px solid currentColor" }}>
                Release mouse to set
              </span>
            </div>
          ) : (
            <div style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)", padding: "0 4px" }}>
              🖱️ <strong>Drag to select time:</strong> Click a start time slot and drag down across the column to your designated time to assign availability (e.g. click 7:00 AM and drag down to 12:00 PM).
            </div>
          )}

          {/* Interactive Timesheet Matrix Grid */}
          <div
            style={{
              overflowX: "auto",
              maxHeight: "440px",
              border: "1px solid var(--srcb-border, #e2e8f0)",
              borderRadius: 8,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
              userSelect: "none",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--srcb-surface-alt, #f8fafc)" }}>
                <tr>
                  <th style={{ padding: "8px 10px", textAlign: "left", background: "var(--srcb-surface-alt, #f8fafc)", borderBottom: "2px solid var(--srcb-border, #cbd5e1)", borderRight: "2px solid var(--srcb-border, #cbd5e1)", color: "var(--srcb-navy)", width: 140, fontWeight: 800 }}>
                    Time Slot (30m)
                  </th>
                  {DAYS.map((day) => {
                    const daySelectedCount = selectedSlots[day]?.length || 0;
                    return (
                      <th
                        key={day}
                        onClick={() => toggleDayColumn(day)}
                        title={`Click to toggle all slots for ${day}`}
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          background: daySelectedCount > 0 ? "rgba(37, 99, 235, 0.05)" : "var(--srcb-surface-alt, #f8fafc)",
                          borderBottom: "2px solid var(--srcb-border, #cbd5e1)",
                          borderRight: "1px solid var(--srcb-border, #e2e8f0)",
                          fontWeight: 700,
                          color: "var(--srcb-navy)",
                          cursor: isProgramHead ? "default" : "pointer",
                          transition: "background 150ms ease",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span>{day}</span>
                          <span style={{ fontSize: "0.66rem", fontWeight: 600, color: daySelectedCount > 0 ? "#16a34a" : "#94a3b8" }}>
                            {daySelectedCount}/{SLOTS.length} slots
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot, slotIdx) => {
                  return (
                    <tr key={slot}>
                      <td
                        onClick={() => toggleSlotRow(slot)}
                        title="Click to toggle this time slot for all days"
                        style={{
                          padding: "5px 8px",
                          fontWeight: 700,
                          fontSize: "0.74rem",
                          color: slot.includes(":00 ") ? "var(--srcb-navy)" : "#64748b",
                          background: slot.includes(":00 ") ? "var(--srcb-surface-alt, #f1f5f9)" : "#ffffff",
                          borderRight: "2px solid var(--srcb-border, #cbd5e1)",
                          borderBottom: "1px solid #e2e8f0",
                          whiteSpace: "nowrap",
                          cursor: isProgramHead ? "default" : "pointer",
                          userSelect: "none",
                        }}
                      >
                        {slot}
                      </td>
                      {DAYS.map((day) => {
                        const isSelected = selectedSlots[day]?.includes(slot);
                        const isInDrag = Boolean(
                          dragRangeInfo &&
                          dragRangeInfo.targetDays.includes(day) &&
                          slotIdx >= dragRangeInfo.minSlotIdx &&
                          slotIdx <= dragRangeInfo.maxSlotIdx
                        );
                        const willBeSelected = isInDrag ? dragIntent === "add" : isSelected;

                        return (
                          <td
                            key={`${day}-${slot}`}
                            onMouseDown={() => handleCellMouseDown(day, slotIdx)}
                            onMouseEnter={() => handleCellMouseEnter(day, slotIdx)}
                            style={{
                              padding: "4px 2px",
                              textAlign: "center",
                              cursor: isProgramHead ? "default" : "pointer",
                              borderRight: "1px solid #e2e8f0",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor: isInDrag
                                ? dragIntent === "add" ? "#bbf7d0" : "#fecaca"
                                : isSelected ? "#dcfce7" : "transparent",
                              outline: isInDrag
                                ? `2px dashed ${dragIntent === "add" ? "#16a34a" : "#dc2626"}`
                                : "none",
                              outlineOffset: "-2px",
                              transition: "background-color 80ms ease",
                              userSelect: "none",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 22,
                                height: 22,
                                borderRadius: 5,
                                backgroundColor: willBeSelected
                                  ? "#16a34a"
                                  : isInDrag && dragIntent === "remove"
                                    ? "#ef4444"
                                    : "#f1f5f9",
                                border: willBeSelected
                                  ? "1px solid #15803d"
                                  : isInDrag && dragIntent === "remove"
                                    ? "1px solid #b91c1c"
                                    : "1px solid #cbd5e1",
                                transition: "all 80ms ease",
                                boxShadow: willBeSelected ? "0 1px 3px rgba(22, 163, 74, 0.25)" : "none",
                              }}
                            >
                              {willBeSelected ? (
                                <Check size={13} color="#ffffff" strokeWidth={3} />
                              ) : isInDrag && dragIntent === "remove" ? (
                                <X size={13} color="#ffffff" strokeWidth={3} />
                              ) : (
                                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#cbd5e1" }} />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="cancel-button"
            onClick={() => setAvailabilityModalOpen(false)}
          >
            {isProgramHead ? "Close" : "Cancel"}
          </button>
          {!isProgramHead && (
            <button
              type="button"
              className="action-button"
              onClick={saveAvailabilityFromModal}
            >
              Save Availability Schedule
            </button>
          )}
        </div>
      </Modal>

      {/* Delete Faculty Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(facultyToDelete) && canDelete}
        title="Delete Faculty Profile"
        message={`Are you sure you want to delete ${facultyToDelete?.name} (${facultyToDelete?.id})? Active class schedules assigned to this faculty member will become unassigned.`}
        confirmLabel="Delete Faculty"
        variant="danger"
        loading={loading}
        onConfirm={executeDelete}
        onCancel={() => setFacultyToDelete(null)}
      />
    </div>
  );
}
