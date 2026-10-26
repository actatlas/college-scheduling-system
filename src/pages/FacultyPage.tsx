import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState, useRef, useMemo } from "react";
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
  UserCheck,
  Users,
  Mail,
  Phone,
  Hash,
  Loader2,
  ShieldCheck,
  FileText,
  Clock3,
  XCircle,
  UserX,
  AlertTriangle,
  Eye,
  GraduationCap,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { formatSystemId } from "../utils/idFormatter";
import type { FacultyMember, ScheduleAdjustmentRequest, RoomItem } from "../types";
import { AdminAdjustmentReviewModal } from "../components/schedule/AdminAdjustmentReviewModal";

export const ASSIGNED_ACADEMIC_PROGRAMS = [
  { code: "ITP", name: "Information Technology Program" },
  { code: "BAP", name: "Business Administration Program" },
  { code: "CJEP", name: "Criminal Justice Education Program" },
  { code: "TEP", name: "Teacher Education Program" },
  { code: "HMP", name: "Hospitality Management Program" },
];

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

  // Form Validation States (Requirements 3 & 4)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showCustomId, setShowCustomId] = useState(false);

  const { selectedProgram, matchesProgram, programOptions } = useProgramContext();
  const { addNotification } = useNotifications();

  const academicProgramOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    ASSIGNED_ACADEMIC_PROGRAMS.forEach((p) => {
      map.set(p.code.toUpperCase(), p);
    });
    (programOptions || [])
      .filter((p) => p.key && p.key !== "ALL")
      .forEach((p) => {
        if (!map.has(p.key.toUpperCase())) {
          map.set(p.key.toUpperCase(), { code: p.key, name: p.label || p.key });
        }
      });
    return Array.from(map.values());
  }, [programOptions]);

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = isSuperAdmin || role === "admin" || role === "dsa" || role === "dean";
  const isDean = isAdmin;
  const canEdit = isSuperAdmin || isAdmin;
  const canDelete = isSuperAdmin || isAdmin;
  const isProgramHead = role === "program_head";

  const [activeTab, setActiveTab] = useState<"roster" | "requests">(() => {
    const t = searchParams.get("tab") || searchParams.get("view");
    return t === "requests" ? "requests" : "roster";
  });
  const [adjustmentRequests, setAdjustmentRequests] = useState<ScheduleAdjustmentRequest[]>([]);
  const [requestToReview, setRequestToReview] = useState<ScheduleAdjustmentRequest | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");
  const [requestActionFilter, setRequestActionFilter] = useState<string>("all");
  const [requestProgramFilter, setRequestProgramFilter] = useState<string>("all");
  const [requestSearchQuery, setRequestSearchQuery] = useState<string>("");
  const [roomsList, setRoomsList] = useState<RoomItem[]>([]);

  // Bulk Faculty Action States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkActionChoice, setBulkActionChoice] = useState<"delete" | "remove">("delete");

  const handleDispatchFacultyGmail = async (f: FacultyMember) => {
    try {
      const res = await api.post("/faculty-dispatch/send", {
        teacherId: f.id,
        recipientEmail: f.email,
      });
      toast.push(res.data?.message || `Schedule dispatched to ${f.name} via institutional Gmail!`, "success");
      addNotification({
        title: "Schedule Dispatched via Gmail",
        message: `Digital timetable dispatched to ${f.name} (${f.email || `${f.id.toLowerCase()}@srcb.edu.ph`}). Physical copy in departmental cubicle.`,
        type: "success",
        link: "/faculty",
      });
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to dispatch schedule via Gmail", "error");
    }
  };

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

  const fetchAdjustmentRequests = async () => {
    try {
      const res = await api.get("/schedule-adjustment-requests");
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setAdjustmentRequests(list);
    } catch {
      setAdjustmentRequests([]);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRoomsList(Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []);
    } catch {
      setRoomsList([]);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchAdjustmentRequests();
    fetchRooms();
  }, []);

  useEffect(() => {
    const reqId = searchParams.get("requestId");
    if (reqId) {
      api
        .get(`/schedule-adjustment-requests/${reqId}`)
        .then((res: any) => {
          if (res.data?.data) {
            setRequestToReview(res.data.data);
            setActiveTab("requests");
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const filteredRequests = useMemo(() => {
    return adjustmentRequests.filter((r) => {
      if (requestStatusFilter !== "all" && String(r.status || "").toLowerCase() !== requestStatusFilter.toLowerCase()) {
        return false;
      }
      if (requestActionFilter !== "all" && String(r.requestedAction || "SCHEDULE_ADJUSTMENT").toUpperCase() !== requestActionFilter.toUpperCase()) {
        return false;
      }
      if (requestProgramFilter !== "all" && !matchesProgram(r.requesterProgram || r.programCode || r.programId)) {
        return false;
      }
      if (requestSearchQuery.trim()) {
        const q = requestSearchQuery.toLowerCase();
        const match =
          String(r.id).includes(q) ||
          (r.requesterName || "").toLowerCase().includes(q) ||
          (r.requesterProgram || "").toLowerCase().includes(q) ||
          (r.subjectCode || "").toLowerCase().includes(q) ||
          (r.subjectName || "").toLowerCase().includes(q) ||
          (r.sectionName || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q) ||
          (r.adminRemarks || "").toLowerCase().includes(q) ||
          (r.adminResponse || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [adjustmentRequests, requestStatusFilter, requestActionFilter, requestProgramFilter, requestSearchQuery, matchesProgram]);

  const pendingRequestsCount = useMemo(() => {
    return adjustmentRequests.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
  }, [adjustmentRequests]);

  const handleEdit = (f: FacultyMember) => {
    if (!canEdit) {
      toast.push("Forbidden. Only the Dean or Super Administrator can edit teacher profiles.", "error");
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
    setShowCustomId(false);
    setForm({
      id: f.id,
      department: f.department,
      email: f.email,
      status: f.status,
      maxLoadHours: f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24),
      availability: f.availability || "",
      programs: f.programs || (f.department ? [f.department] : []),
    });
    setIsOpen(true);
  };

  const handleOpenAdd = () => {
    if (!canEdit) {
      toast.push("Forbidden. Only the Dean or Super Administrator can register new teachers.", "error");
      return;
    }
    setEditingFaculty(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setShowCustomId(false);
    const nextNum = faculty.length + 1;
    const padded = nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : `${nextNum}`;
    setForm({
      id: `FAC-${padded}`,
      department: selectedProgram?.label && selectedProgram.key !== "ALL" ? selectedProgram.label : "",
      email: "",
      status: "Full-Time",
      maxLoadHours: 24,
      availability: "Monday-Friday: 08:00-17:00",
      programs: selectedProgram?.label && selectedProgram.key !== "ALL" ? [selectedProgram.label] : [],
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
      toast.push("Forbidden. Only administrators can delete faculty members.", "error");
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

  const executeBulkFacultyAction = async () => {
    if (selectedIds.size === 0) return;
    if (!canDelete) {
      toast.push("Forbidden. Only administrators can delete or remove faculty members.", "error");
      setIsBulkModalOpen(false);
      return;
    }
    setLoading(true);
    const ids = Array.from(selectedIds);
    try {
      if (bulkActionChoice === "delete") {
        try {
          await api.post("/faculty/bulk-delete", { ids });
        } catch {
          await Promise.all(ids.map((id) => api.delete(`/faculty/${encodeURIComponent(id)}`)));
        }
        toast.push(`Successfully deleted ${ids.length} faculty member${ids.length > 1 ? "s" : ""}`, "success");
        addNotification({
          title: "Faculty Members Deleted",
          message: `${ids.length} faculty profiles were permanently deleted from the directory.`,
          type: "warning",
          link: "/faculty",
          targetRole: "admin,program_head",
        });
      } else {
        try {
          await api.post("/faculty/bulk-remove", { ids, action: "deactivate" });
        } catch {
          await Promise.all(ids.map((id) => api.put(`/faculty/${encodeURIComponent(id)}`, { status: "Inactive" })));
        }
        toast.push(`Successfully removed ${ids.length} faculty member${ids.length > 1 ? "s" : ""} from active roster`, "success");
        addNotification({
          title: "Faculty Members Deactivated",
          message: `${ids.length} faculty members have been removed from the active teaching roster.`,
          type: "info",
          link: "/faculty",
          targetRole: "admin,program_head",
        });
      }
      setSelectedIds(new Set());
      fetchFaculty();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || `Failed to ${bulkActionChoice} selected faculty members`, "error");
    } finally {
      setLoading(false);
      setIsBulkModalOpen(false);
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
      toast.push("Forbidden. Only the Dean or Super Administrator can register or edit teacher profiles.", "error");
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
        toast.push("Teacher profile updated successfully", "success");
        addNotification({
          title: "Teacher Profile Updated",
          message: `Faculty record for ${fullName}${form.department ? ` (${form.department})` : ""} updated.`,
          type: "success",
          link: "/faculty",
          targetRole: "admin,program_head",
          targetProgram: form.department || "General",
          targetTeacherId: editingFaculty.id,
        });
      } else {
        await api.post("/faculty", payload);
        toast.push("Teacher registered successfully", "success");
        addNotification({
          title: "New Teacher Registered",
          message: `${fullName} registered to faculty roster.`,
          type: "success",
          link: "/faculty",
          targetRole: "admin,program_head",
          targetProgram: form.department || "General",
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

  // Click outside listener for filter and export popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false);
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
            : "Faculty Management"
        }
        description={
          isProgramHead
            ? `View instructors assigned to ${selectedProgram.label} (${selectedProgram.key || "ITP"}) major subjects.`
            : "Maintain instructor profiles, full-time / part-time status, and weekly teaching load limits."
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
              aria-label="Add new teacher"
              data-testid="add-teacher-btn"
            >
              <Plus size={16} />
              <span>Add Teacher</span>
            </button>
          ) : undefined
        }
      />

      {/* Pending Schedule Adjustment / Permission Requests Banner for Admin */}
      {pendingRequestsCount > 0 && isAdmin && (
        <div
          data-testid="admin-adjustment-requests-banner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            marginBottom: 16,
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: 8,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} color="#d97706" />
            <div>
              <div style={{ fontWeight: 700, color: "var(--srcb-text)" }}>
                {`${pendingRequestsCount} Schedule Adjustment Request(s)`}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--srcb-text-muted)" }}>
                Program Heads have submitted schedule adjustment or timetable permission requests.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              data-testid="review-requests-banner-btn"
              className="action-button"
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => {
                const firstPending = adjustmentRequests.find((r) => String(r.status || "").toLowerCase() === "pending") || adjustmentRequests[0] || null;
                if (firstPending) {
                  setRequestToReview(firstPending);
                }
                setActiveTab("requests");
              }}
            >
              Review Requests
            </button>
          </div>
        </div>
      )}

      {/* View Segmented Tabs: Faculty Roster vs Permission Requests */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div className="sched-view-tabs">
          <button
            type="button"
            data-testid="faculty-roster-tab-btn"
            className={`sched-view-tab-btn ${activeTab === "roster" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("roster");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("tab");
                return next;
              });
            }}
          >
            <Users size={14} />
            <span>Faculty Roster</span>
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                fontSize: "0.72rem",
                fontWeight: 700,
                background: activeTab === "roster" ? "rgba(15, 44, 89, 0.12)" : "rgba(148, 163, 184, 0.2)",
                color: activeTab === "roster" ? "var(--srcb-navy, #0f2c59)" : "var(--srcb-text-muted)",
              }}
            >
              {faculty.length}
            </span>
          </button>

          <button
            type="button"
            data-testid="permission-requests-tab-btn"
            className={`sched-view-tab-btn ${activeTab === "requests" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("requests");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("tab", "requests");
                return next;
              });
            }}
          >
            <ShieldCheck size={14} />
            <span>Permission Requests</span>
            {pendingRequestsCount > 0 ? (
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: "0.72rem",
                  background: "#fef3c7",
                  color: "#92400e",
                  fontWeight: 800,
                }}
              >
                {pendingRequestsCount}
              </span>
            ) : (
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  background: activeTab === "requests" ? "rgba(15, 44, 89, 0.12)" : "rgba(148, 163, 184, 0.2)",
                  color: activeTab === "requests" ? "var(--srcb-navy, #0f2c59)" : "var(--srcb-text-muted)",
                }}
              >
                {adjustmentRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: Main Faculty Roster Data Table Card */}
      {activeTab === "roster" && (
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

                  {/* Filter by Faculty Type */}
                  <div className="filter-group">
                    <label htmlFor="facultyStatusFilter">Faculty Type</label>
                    <select
                      id="facultyStatusFilter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Faculty Types</option>
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
            <div className="bulk-bar-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Direct selection if user wants to delete or remove them */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(15, 44, 89, 0.08)", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(15, 44, 89, 0.15)" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--srcb-navy, #0f2c59)" }}>Action:</span>
                <select
                  data-testid="bulk-action-select"
                  value={bulkActionChoice}
                  onChange={(e) => setBulkActionChoice(e.target.value as "delete" | "remove")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--srcb-border, #cbd5e1)",
                    background: "var(--srcb-surface, #ffffff)",
                    color: "var(--srcb-text, #0f172a)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  aria-label="Select bulk action to apply"
                >
                  <option value="delete">Delete Permanently</option>
                  <option value="remove">Remove from Active Roster</option>
                </select>
                <button
                  type="button"
                  data-testid="apply-bulk-faculty-action-btn"
                  className="bulk-action-btn"
                  style={{
                    padding: "4px 10px",
                    background: bulkActionChoice === "delete" ? "#dc2626" : "#d97706",
                    borderColor: "transparent",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                  onClick={() => setIsBulkModalOpen(true)}
                >
                  <span>Apply</span>
                </button>
              </div>

              {canDelete && (
                <>
                  <button
                    type="button"
                    data-testid="bulk-delete-faculty-btn"
                    className="bulk-action-btn bulk-action-btn--danger"
                    onClick={() => {
                      setBulkActionChoice("delete");
                      setIsBulkModalOpen(true);
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      borderColor: "#f87171",
                      color: "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.size})</span>
                  </button>

                  <button
                    type="button"
                    data-testid="bulk-remove-faculty-btn"
                    className="bulk-action-btn"
                    onClick={() => {
                      setBulkActionChoice("remove");
                      setIsBulkModalOpen(true);
                    }}
                    style={{
                      background: "rgba(245, 158, 11, 0.12)",
                      borderColor: "#fbbf24",
                      color: "#d97706",
                      fontWeight: 600,
                    }}
                  >
                    <UserX size={14} />
                    <span>Remove from Roster ({selectedIds.size})</span>
                  </button>
                </>
              )}

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
                  <th>FACULTY TYPE</th>
                  <th>TEACHING LOAD</th>
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
                              : "No registered faculty exist yet. Click 'Add Teacher' above to register the first instructor."}
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

                    return (
                      <tr key={f.id} className={isSelected ? "is-selected" : ""}>
                        {/* Checkbox Column */}
                        <td className="user-mgmt-checkbox-cell">
                          <input
                            type="checkbox"
                            data-testid={`checkbox-faculty-${f.id}`}
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
                              {f.department || "General Faculty"}
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

                        {/* Teaching Load Cell */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Clock size={13} style={{ color: "var(--srcb-royal, #0284c7)" }} />
                            <span style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>
                              {f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24)} hrs/wk max
                            </span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td style={{ textAlign: "right" }}>
                          <div className="faculty-actions-cell">
                            {canEdit && (
                              <button
                                type="button"
                                className="faculty-action-btn faculty-action-btn--edit"
                                onClick={() => handleEdit(f)}
                                title={`Edit ${f.name} Profile`}
                                aria-label={`Edit ${f.name}`}
                                data-testid={`edit-faculty-${f.id}`}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                className="faculty-action-btn faculty-action-btn--danger"
                                onClick={() => setFacultyToDelete(f)}
                                title={`Delete ${f.name}`}
                                aria-label={`Delete ${f.name}`}
                                data-testid={`delete-faculty-${f.id}`}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
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
      )}

      {/* TAB 2: Program Head Permission Requests Governance View */}
      {activeTab === "requests" && (
        <section className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header Title */}
            <div>
              <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--srcb-text)", fontWeight: 700 }}>
                Program Head Academic Permission Requests ({filteredRequests.length})
              </h4>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.84rem" }}>
                Centralized faculty directory governance for academic scheduling requests (Create, Modify, Delete, and Time Adjustment).
              </p>
            </div>

            {/* Metric Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div
                style={{
                  background: "var(--srcb-surface-alt, #f8fafc)",
                  border: "1px solid var(--srcb-border)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.76rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>Total Requests</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--srcb-navy)" }}>{adjustmentRequests.length}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(13, 84, 153, 0.1)", color: "var(--srcb-navy)", display: "grid", placeItems: "center" }}>
                  <FileText size={18} />
                </div>
              </div>

              <div
                style={{
                  background: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.76rem", color: "#b45309", fontWeight: 600 }}>Pending Review</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#b45309" }}>{pendingRequestsCount}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "#d97706", display: "grid", placeItems: "center" }}>
                  <Clock3 size={18} />
                </div>
              </div>

              <div
                style={{
                  background: "rgba(16, 185, 129, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.76rem", color: "#047857", fontWeight: 600 }}>Approved / Granted</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#047857" }}>
                    {adjustmentRequests.filter((r) => String(r.status || "").toLowerCase() === "approved").length}
                  </div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "grid", placeItems: "center" }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <div
                style={{
                  background: "rgba(239, 68, 68, 0.06)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.76rem", color: "#b91c1c", fontWeight: 600 }}>Rejected</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#b91c1c" }}>
                    {adjustmentRequests.filter((r) => String(r.status || "").toLowerCase() === "rejected").length}
                  </div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", display: "grid", placeItems: "center" }}>
                  <XCircle size={18} />
                </div>
              </div>
            </div>

            {/* Filter Controls Toolbar */}
            <div
              style={{
                background: "var(--srcb-surface-alt, #f8fafc)",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--srcb-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Status Filter Tabs */}
                <div style={{ display: "flex", gap: 4, background: "var(--srcb-surface)", padding: 2, borderRadius: 6, border: "1px solid var(--srcb-border)" }}>
                  {(["all", "Pending", "Approved", "Rejected"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRequestStatusFilter(st)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        border: "none",
                        background: requestStatusFilter === st ? "var(--srcb-navy)" : "transparent",
                        color: requestStatusFilter === st ? "#ffffff" : "var(--srcb-text-muted)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {st === "all" ? "All" : st}
                    </button>
                  ))}
                </div>

                {/* Action Type Filter */}
                <select
                  value={requestActionFilter}
                  onChange={(e) => setRequestActionFilter(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  <option value="all">All Requested Actions</option>
                  <option value="CREATE_SCHEDULE">CREATE_SCHEDULE</option>
                  <option value="MODIFY_SCHEDULE">MODIFY_SCHEDULE</option>
                  <option value="DELETE_SCHEDULE">DELETE_SCHEDULE</option>
                  <option value="SCHEDULE_ADJUSTMENT">SCHEDULE_ADJUSTMENT</option>
                </select>

                {/* Program Filter for Admins */}
                {role !== "program_head" && (
                  <select
                    value={requestProgramFilter}
                    onChange={(e) => setRequestProgramFilter(e.target.value)}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.82rem", fontWeight: 600 }}
                  >
                    <option value="all">All Programs</option>
                    <option value="ITP">ITP (BSIT)</option>
                    <option value="BAP">BAP (BSBA)</option>
                    <option value="CJEP">CJEP (BSCRIM)</option>
                    <option value="HMP">HMP (BSHM)</option>
                    <option value="TEP">TEP (BSED/BEED)</option>
                  </select>
                )}
              </div>

              {/* Search Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <Search size={14} style={{ position: "absolute", left: 8, color: "var(--srcb-text-muted)" }} />
                  <input
                    type="text"
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    placeholder="Search requests by ID, subject, program head..."
                    className="input-base"
                    style={{ padding: "5px 10px 5px 28px", fontSize: "0.82rem", width: 240 }}
                  />
                </div>
              </div>
            </div>

            {/* Permission Requests Data Table */}
            {filteredRequests.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                <ShieldCheck size={38} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
                <h3 style={{ margin: 0, color: "var(--srcb-text)" }}>No Permission Requests Found</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.86rem" }}>
                  {requestStatusFilter !== "all" || requestActionFilter !== "all" || requestSearchQuery
                    ? "No permission requests match your active filters."
                    : "There are currently no permission requests recorded in the system."}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="user-mgmt-table" style={{ width: "100%", minWidth: 850 }}>
                  <thead>
                    <tr>
                      <th>REQUEST ID</th>
                      <th>PROGRAM HEAD</th>
                      <th>PROGRAM</th>
                      <th>TARGET SUBJECT &amp; SECTION</th>
                      <th>REQUESTED ACTION</th>
                      <th>STATUS</th>
                      <th>REQUESTED DATE</th>
                      <th>ADMIN REMARKS</th>
                      <th style={{ textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => {
                      const isPending = req.status === "Pending" || String(req.status || "").toLowerCase() === "pending";
                      const isApproved = req.status === "Approved" || String(req.status || "").toLowerCase() === "approved";
                      const isRejected = req.status === "Rejected" || String(req.status || "").toLowerCase() === "rejected";
                      const actionBadgeClass =
                        req.requestedAction === "CREATE_SCHEDULE"
                          ? "pill--emerald"
                          : req.requestedAction === "MODIFY_SCHEDULE"
                          ? "pill--blue"
                          : req.requestedAction === "DELETE_SCHEDULE"
                          ? "pill--rose"
                          : "pill--amber";

                      return (
                        <tr key={req.id}>
                          <td>
                            <span style={{ fontWeight: 800, color: "var(--srcb-navy)", fontSize: "0.82rem" }}>
                              #REQ-{String(req.id).padStart(3, "0")}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "rgba(13, 84, 153, 0.1)",
                                  color: "var(--srcb-navy)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  flexShrink: 0,
                                }}
                              >
                                {req.requesterName ? req.requesterName.charAt(0) : "P"}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "var(--srcb-text)", fontSize: "0.84rem" }}>
                                  {req.requesterName}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                                  Program Head
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="pill pill--navy" style={{ fontWeight: 700, fontSize: "0.72rem" }}>
                              {req.requesterProgram || req.programCode || req.programId || "ITP"}
                            </span>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--srcb-navy)", fontSize: "0.84rem" }}>
                                {req.subjectCode} – {req.subjectName}
                              </div>
                              <div style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                                {req.sectionName || "Program Cohort"} {req.roomNumber ? `• Room ${req.roomNumber}` : ""}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`pill ${actionBadgeClass}`} style={{ fontWeight: 700, fontSize: "0.7rem", padding: "2px 8px" }}>
                              {req.requestedAction || "SCHEDULE_ADJUSTMENT"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`pill ${
                                isApproved
                                  ? "pill--emerald"
                                  : isRejected
                                  ? "pill--rose"
                                  : "pill--amber"
                              }`}
                              style={{ fontWeight: 800, fontSize: "0.72rem" }}
                            >
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                              {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Today"}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.76rem", color: req.adminRemarks || req.adminResponse ? "var(--srcb-text)" : "var(--srcb-text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.adminRemarks || req.adminResponse || "No remarks"}>
                              {req.adminRemarks || req.adminResponse || "—"}
                            </div>
                            {req.reviewedByName && (
                              <div style={{ fontSize: "0.68rem", color: "var(--srcb-text-muted)" }}>
                                By: {req.reviewedByName}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {isPending && (role === "admin" || role === "super_admin" || role === "dsa") ? (
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => setRequestToReview(req)}
                                style={{ padding: "4px 10px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <ShieldCheck size={12} />
                                <span>Review &amp; Decide</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setRequestToReview(req)}
                                style={{ padding: "4px 10px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <Eye size={12} />
                                <span>View Details</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Add / Edit Faculty Modal - Minimal, Essential-Only Design */}
      <Modal
        isOpen={isOpen && canEdit}
        size="md"
        icon={<UserCheck size={20} />}
        title={editingFaculty ? "Edit Teacher Profile" : "Register Teacher"}
        eyebrow="Faculty Directory"
        description="Configure teacher details, department, employment status, and weekly limits."
        onClose={() => {
          setIsOpen(false);
          setEditingFaculty(null);
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Subtle Auto-Generated ID Header Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 14px",
              background: "var(--srcb-surface-subtle, #f8fafc)",
              borderRadius: 8,
              border: "1px solid var(--srcb-border, #e2e8f0)",
              fontSize: "0.82rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Hash size={13} style={{ color: "var(--srcb-navy, #1e3a8a)" }} />
              <span style={{ color: "var(--srcb-text-muted, #64748b)" }}>Employee ID:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--srcb-navy, #1e3a8a)", letterSpacing: "0.03em" }}>
                {form.id}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#059669",
                  background: "rgba(16, 185, 129, 0.1)",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                {editingFaculty ? "Assigned ID" : "Auto-Generated"}
              </span>
              {!editingFaculty && (
                <button
                  type="button"
                  onClick={() => setShowCustomId(!showCustomId)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--srcb-navy, #1e3a8a)",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  {showCustomId ? "Hide" : "Customize"}
                </button>
              )}
            </div>
          </div>

          {/* Optional Custom Employee ID Input when toggled */}
          {showCustomId && !editingFaculty && (
            <div className="field-group" style={{ marginTop: -4 }}>
              <label htmlFor="facultyId" style={{ fontSize: "0.78rem" }}>
                <Hash size={12} /> Custom Employee ID
              </label>
              <input
                id="facultyId"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
                placeholder="e.g. FAC-2026-001"
              />
            </div>
          )}

          {/* Row 1: First Name & Last Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field-group">
              <label htmlFor="facultyFirstName">
                <Users size={13} /> First Name <span className="required-asterisk">*</span>
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
                <Users size={13} /> Last Name <span className="required-asterisk">*</span>
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

          {/* Row 2: Assigned Academic Program & Faculty Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field-group">
              <label htmlFor="facultyProgram">
                <GraduationCap size={13} /> Assigned Academic Program
              </label>
              <select
                id="facultyProgram"
                data-testid="faculty-program-select"
                aria-label="Assigned Academic Program"
                value={
                  academicProgramOptions.find(
                    (p) =>
                      p.name.toLowerCase() === (form.department || "").toLowerCase() ||
                      p.code.toLowerCase() === (form.department || "").toLowerCase() ||
                      (p.name.toLowerCase().includes((form.department || "").toLowerCase()) && (form.department || "").length > 2)
                  )?.name || form.department
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    department: val,
                    programs: val ? [val] : [],
                  });
                }}
              >
                <option value="">None / General Faculty</option>
                {academicProgramOptions.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="facultyStatus">
                <CheckCircle2 size={13} /> Faculty Type
              </label>
              <select
                id="facultyStatus"
                aria-label="Faculty Type"
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
                <option value="Full-Time">Full-Time (24 hrs/wk)</option>
                <option value="Part-Time">Part-Time (12 hrs/wk)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Email Address & Phone Contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field-group">
              <label htmlFor="facultyEmail">
                <Mail size={13} /> Email Address
              </label>
              <input
                id="facultyEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="faculty@srcb.edu.ph"
              />
            </div>

            <div className="field-group">
              <label htmlFor="facultyPhone">
                <Phone size={13} /> Phone Contact
              </label>
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
          </div>
        </div>

        <div className="modal-actions">
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
            disabled={
              loading ||
              !form.id.trim() ||
              !firstName.trim() ||
              !lastName.trim() ||
              Boolean(firstNameError || lastNameError || phoneError)
            }
            onClick={handleSave}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? "Saving…" : editingFaculty ? "Update Profile" : "Register Teacher"}</span>
          </button>
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

      {/* Bulk Delete or Remove Faculties Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={bulkActionChoice === "delete" ? `Delete ${selectedIds.size} Faculty Members` : `Remove ${selectedIds.size} Faculty Members from Roster`}
        description="Choose whether to permanently delete faculty records and unassign schedules, or remove/deactivate them from the active semester roster."
        size="md"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, width: "100%" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-bulk-faculty-action-btn"
              className={`action-button ${bulkActionChoice === "delete" ? "action-button--danger" : ""}`}
              style={{
                background: bulkActionChoice === "delete" ? "#dc2626" : "#d97706",
                borderColor: bulkActionChoice === "delete" ? "#dc2626" : "#d97706",
                color: "#ffffff",
              }}
              onClick={executeBulkFacultyAction}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : bulkActionChoice === "delete"
                ? `Permanently Delete ${selectedIds.size} Instructor${selectedIds.size > 1 ? "s" : ""}`
                : `Remove ${selectedIds.size} Instructor${selectedIds.size > 1 ? "s" : ""} from Roster`}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Action Choice Radio Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--srcb-text)" }}>
              Select Desired Action:
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1.5px solid ${bulkActionChoice === "delete" ? "#dc2626" : "var(--srcb-border)"}`,
                background: bulkActionChoice === "delete" ? "rgba(239, 68, 68, 0.05)" : "var(--srcb-surface)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="bulkActionChoiceRadio"
                value="delete"
                data-testid="radio-bulk-delete"
                checked={bulkActionChoice === "delete"}
                onChange={() => setBulkActionChoice("delete")}
                style={{ marginTop: 3, accentColor: "#dc2626" }}
              />
              <div>
                <div style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.86rem" }}>
                  Delete Permanently
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                  Completely removes instructor profiles and user accounts from the system. Assigned class and exam schedules will become unassigned.
                </div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1.5px solid ${bulkActionChoice === "remove" ? "#d97706" : "var(--srcb-border)"}`,
                background: bulkActionChoice === "remove" ? "rgba(245, 158, 11, 0.05)" : "var(--srcb-surface)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="bulkActionChoiceRadio"
                value="remove"
                data-testid="radio-bulk-remove"
                checked={bulkActionChoice === "remove"}
                onChange={() => setBulkActionChoice("remove")}
                style={{ marginTop: 3, accentColor: "#d97706" }}
              />
              <div>
                <div style={{ fontWeight: 700, color: "#d97706", fontSize: "0.86rem" }}>
                  Remove from Active Roster (Deactivate)
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)" }}>
                  Changes instructor status to Inactive so they are removed from timetable planning and faculty loading, but preserves historical records.
                </div>
              </div>
            </label>
          </div>

          {/* Selected Faculties List Summary */}
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--srcb-text-muted)", marginBottom: 6 }}>
              Selected Faculty Members ({selectedIds.size}):
            </div>
            <div
              style={{
                maxHeight: 160,
                overflowY: "auto",
                background: "var(--srcb-surface-alt, #f8fafc)",
                borderRadius: 6,
                border: "1px solid var(--srcb-border)",
                padding: "6px 10px",
                fontSize: "0.8rem",
              }}
            >
              {faculty
                .filter((f) => selectedIds.has(f.id))
                .map((f, idx, arr) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      borderBottom: idx < arr.length - 1 ? "1px dashed #e2e8f0" : "none",
                    }}
                  >
                    <span>
                      <strong>{f.name}</strong> ({f.id})
                    </span>
                    <span style={{ color: "var(--srcb-text-muted)" }}>{f.department || "No Department"}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Admin Schedule Adjustment Review Modal */}
      <AdminAdjustmentReviewModal
        isOpen={Boolean(requestToReview)}
        onClose={() => setRequestToReview(null)}
        request={requestToReview}
        roomsList={roomsList}
        onReviewed={() => {
          fetchAdjustmentRequests();
          fetchFaculty();
        }}
      />
    </div>
  );
}
