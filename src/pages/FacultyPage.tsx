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
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { formatSystemId } from "../utils/idFormatter";
import type { FacultyMember } from "../types";

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

  const { selectedProgram, matchesProgram } = useProgramContext();
  const { addNotification } = useNotifications();

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = isSuperAdmin || role === "admin";
  const canEdit = isSuperAdmin;
  const canDelete = isSuperAdmin;
  const isProgramHead = role === "program_head";

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
                  <th>FACULTY TYPE</th>
                  <th>TEACHING LOAD (MAX HOURS)</th>
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

                        {/* Teaching Load Cell */}
                        <td>
                          <div>
                            <span style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>
                              {f.maxLoadHours || (f.status === "Part-Time" ? 12 : 24)} hrs/wk max
                            </span>
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
                                <div className="user-mgmt-menu-divider" />
                                <button
                                  type="button"
                                  className="user-mgmt-menu-item"
                                  onClick={() => {
                                    setOpenRowActionId(null);
                                    handleDispatchFacultyGmail(f);
                                  }}
                                  role="menuitem"
                                >
                                  <Mail size={15} />
                                  <span>Dispatch Schedule (Gmail)</span>
                                </button>
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
        size="lg"
        icon={<UserCheck size={20} />}
        title={editingFaculty ? "Edit Faculty Profile" : "Register Faculty Member"}
        eyebrow="Faculty Directory"
        description="Configure employee details, department, employment status, and weekly limits."
        onClose={() => {
          setIsOpen(false);
          setEditingFaculty(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="facultyId">
              <Hash size={13} /> Employee ID <span className="required-asterisk">*</span>
            </label>
            <input
              id="facultyId"
              value={form.id}
              disabled={!!editingFaculty}
              onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
              placeholder="e.g. FAC-2026-001"
              required
              aria-required="true"
            />
          </div>

          {/* Requirement 4: First Name & Last Name (Characters Only) */}
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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

          {/* Requirement 3: Phone Number Validation */}
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

          <div className="field-group">
            <label htmlFor="facultyDept">
              <Building2 size={13} /> Department
            </label>
            <input
              id="facultyDept"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="facultyStatus">
              <CheckCircle2 size={13} /> Faculty Type
            </label>
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
            <label htmlFor="facultyMaxLoad">
              <Clock size={13} /> Maximum Weekly Load (Hours)
            </label>
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
            <span>{loading ? "Saving…" : editingFaculty ? "Update Profile" : "Register Faculty"}</span>
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
    </div>
  );
}
