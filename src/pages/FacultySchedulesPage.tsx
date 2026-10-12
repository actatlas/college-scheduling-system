import React, { useEffect, useState, useMemo } from "react";
import { api } from "../data/apiClient";
import {
  Users,
  CalendarCheck,
  Mail,
  Send,
  Download,
  Eye,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  BookOpen,
  Building2,
  X,
  ExternalLink,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmDialog, showWarningAlert } from "../utils/alerts";
import { useProgramContext } from "../contexts/ProgramContext";

interface FacultyMember {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  email: string;
  schoolEmail: string;
  phone?: string;
  facultyType: string;
  status: string;
  department: string;
  programCode: string;
  hasValidEmail: boolean;
  emailStatus: "READY" | "SENT" | "FAILED" | "MISSING_EMAIL";
}

interface ScheduleItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  lectureHours: number;
  labHours: number;
  section: string;
  courseCode: string;
  yearLevel: string;
  day: string;
  startTime: string;
  endTime: string;
  time: string;
  room: string;
  mode: string;
  status: string;
  durationHours: string;
}

interface FacultyGroup {
  faculty: FacultyMember;
  schedules: ScheduleItem[];
  summary: {
    totalClasses: number;
    totalUnits: number;
    totalWeeklyHours: number;
    dispatchStatus: "READY" | "SENT" | "FAILED" | "MISSING_EMAIL";
    lastSentAt: string | null;
    resendCount: number;
    errorMessage: string | null;
  };
  academicTerm: string;
  academicYear: string;
  semester: string;
}

export function FacultySchedulesPage() {
  const { selectedProgram } = useProgramContext();
  const userRole = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const [facultyGroups, setFacultyGroups] = useState<FacultyGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterProgram, setFilterProgram] = useState<string>("ALL");
  const [selectedFacultyType, setSelectedFacultyType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Review Modal State
  const [reviewFaculty, setReviewFaculty] = useState<FacultyGroup | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [isProcessingSingle, setIsProcessingSingle] = useState<string | null>(null);

  const fetchFacultySchedules = async () => {
    setLoading(true);
    try {
      const prog = selectedProgram !== "ALL" ? selectedProgram : undefined;
      const res = await api.get("/faculty-dispatch", {
        params: {
          program: prog,
        },
      });
      const data = res.data?.data || res.data || [];
      setFacultyGroups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to load faculty schedules.";
      showErrorAlert("Loading Error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultySchedules();
  }, [selectedProgram]);

  // Filtered Faculty List
  const filteredGroups = useMemo(() => {
    return facultyGroups.filter((item) => {
      // Program Filter
      if (filterProgram !== "ALL") {
        const pCode = (item.faculty.programCode || item.faculty.department || "").toUpperCase();
        if (!pCode.includes(filterProgram.toUpperCase())) return false;
      }

      // Faculty Type Filter
      if (selectedFacultyType !== "ALL") {
        const fType = (item.faculty.facultyType || item.faculty.status || "").toLowerCase();
        if (!fType.includes(selectedFacultyType.toLowerCase())) return false;
      }

      // Status Filter
      if (selectedStatus !== "ALL") {
        if (item.summary.dispatchStatus !== selectedStatus) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = item.faculty.name.toLowerCase().includes(q);
        const emailMatch = item.faculty.email.toLowerCase().includes(q);
        const empMatch = (item.faculty.employeeNumber || "").toLowerCase().includes(q);
        const subMatch = item.schedules.some(
          (s) => s.subjectCode.toLowerCase().includes(q) || s.subjectName.toLowerCase().includes(q)
        );
        if (!nameMatch && !emailMatch && !empMatch && !subMatch) return false;
      }

      return true;
    });
  }, [facultyGroups, filterProgram, selectedFacultyType, selectedStatus, searchQuery]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const totalFaculty = facultyGroups.length;
    const missingEmailCount = facultyGroups.filter((f) => !f.faculty.hasValidEmail).length;
    const readyCount = facultyGroups.filter((f) => f.faculty.hasValidEmail && f.summary.dispatchStatus === "READY").length;
    const sentCount = facultyGroups.filter((f) => f.summary.dispatchStatus === "SENT").length;
    const failedCount = facultyGroups.filter((f) => f.summary.dispatchStatus === "FAILED").length;
    const totalClasses = facultyGroups.reduce((acc, curr) => acc + curr.schedules.length, 0);

    return {
      totalFaculty,
      missingEmailCount,
      readyCount,
      sentCount,
      failedCount,
      totalClasses,
    };
  }, [facultyGroups]);

  // Download PDF Handler
  const handleDownloadPdf = async (facultyId: string, facultyName: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/faculty-dispatch/${facultyId}/pdf`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Faculty_Schedule_${facultyName.replace(/[^a-zA-Z0-9_-]/g, "_")}_2026-2027_1st_Semester.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showErrorAlert("PDF Download Failed", "Could not generate official faculty schedule PDF.");
    }
  };

  // Preview PDF in new tab
  const handlePreviewPdf = async (facultyId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/faculty-dispatch/${facultyId}/pdf`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      showErrorAlert("PDF Preview Failed", "Could not generate preview PDF.");
    }
  };

  // Resend / Single Dispatch Handler
  const handleSendSingle = async (faculty: FacultyMember) => {
    if (!faculty.hasValidEmail) {
      showWarningAlert(
        "Missing Official Email",
        `Cannot send schedule: ${faculty.name} does not have an official school email. Please update their profile in Faculty Directory.`
      );
      return;
    }

    const confirmed = await showConfirmDialog({
      title: "Send Faculty Schedule?",
      text: `An official timetable PDF will be generated and dispatched via Gmail to ${faculty.name} (${faculty.schoolEmail}).`,
      confirmButtonText: "Yes, Send Schedule",
      cancelButtonText: "Cancel",
      icon: "question",
    });

    if (!confirmed) return;

    setIsProcessingSingle(faculty.id);
    try {
      const res = await api.post(`/faculty-dispatch/${faculty.id}/send`, {
        recipientEmail: faculty.schoolEmail,
      });

      const status = res.data?.data?.deliveryStatus;
      if (status === "SENT") {
        showSuccessAlert("Schedule Dispatched", `Official timetable PDF sent to ${faculty.name} (${faculty.schoolEmail}).`);
      } else {
        showWarningAlert("PDF Generated", res.data?.message || "Schedule PDF was created, but email transmission was not delivered.");
      }
      fetchFacultySchedules();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to dispatch faculty schedule.";
      showErrorAlert("Dispatch Failed", msg);
    } finally {
      setIsProcessingSingle(null);
    }
  };

  // Bulk Publish & Send to All Faculty
  const handlePublishAndSendAll = async () => {
    if (metrics.totalClasses === 0) {
      showWarningAlert("No Schedules", "There are no class schedules ready for publication.");
      return;
    }

    const readyCount = facultyGroups.filter((f) => f.faculty.hasValidEmail).length;
    const missingCount = metrics.missingEmailCount;

    const confirmed = await showConfirmDialog({
      title: "Publish & Send Faculty Schedules?",
      text: `This action will publish all finalized schedules and dispatch individual schedule PDFs to ${readyCount} faculty members via their official school emails.${
        missingCount > 0 ? ` Note: ${missingCount} faculty are missing official school emails and will be skipped.` : ""
      }`,
      confirmButtonText: "Publish & Send",
      cancelButtonText: "Cancel",
      icon: "warning",
    });

    if (!confirmed) return;

    setIsProcessingBatch(true);
    try {
      const prog = selectedProgram !== "ALL" ? selectedProgram : undefined;
      const res = await api.post("/faculty-dispatch/publish-and-send", {
        programCode: prog,
      });

      const data = res.data?.data;
      const sent = data?.sentCount || 0;
      const failed = data?.failedCount || 0;
      const missing = data?.missingEmailCount || 0;

      showSuccessAlert(
        "Publication & Dispatch Complete",
        `Faculty Schedules Published! Sent: ${sent}, Failed: ${failed}, Missing Email: ${missing}.`
      );
      fetchFacultySchedules();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Bulk dispatch failed.";
      showErrorAlert("Operation Error", msg);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  return (
    <div className="faculty-schedules-page" data-testid="faculty-schedules-page">
      {/* Page Header */}
      <div className="faculty-schedules__header">
        <div>
          <h1 className="faculty-schedules__title">Faculty Schedules & Workload Loading</h1>
          <p className="faculty-schedules__subtitle">
            Review instructor-centered teaching loads, download official PDF loading sheets, and dispatch individual schedules to official school emails.
          </p>
        </div>

        <div className="faculty-schedules__actions">
          <button
            type="button"
            className="faculty-schedules__action-btn"
            onClick={fetchFacultySchedules}
            disabled={loading}
            title="Refresh schedule loading data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="faculty-schedules__action-btn faculty-schedules__action-btn--primary"
              onClick={handlePublishAndSendAll}
              disabled={isProcessingBatch || metrics.totalClasses === 0}
              data-testid="publish-and-send-btn"
            >
              <Send size={15} />
              <span>{isProcessingBatch ? "Publishing & Sending..." : "Publish & Send to Faculty"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="faculty-schedules__stats">
        <div className="faculty-schedules__stat-card">
          <div className="faculty-schedules__stat-icon faculty-schedules__stat-icon--navy">
            <Users size={20} />
          </div>
          <div>
            <div className="faculty-schedules__stat-label">Assigned Faculty</div>
            <div className="faculty-schedules__stat-value">{metrics.totalFaculty}</div>
          </div>
        </div>

        <div className="faculty-schedules__stat-card">
          <div className="faculty-schedules__stat-icon faculty-schedules__stat-icon--green">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="faculty-schedules__stat-label">Emails Verified</div>
            <div className="faculty-schedules__stat-value">{metrics.totalFaculty - metrics.missingEmailCount}</div>
          </div>
        </div>

        <div className="faculty-schedules__stat-card">
          <div className="faculty-schedules__stat-icon faculty-schedules__stat-icon--amber">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="faculty-schedules__stat-label">Missing School Email</div>
            <div className="faculty-schedules__stat-value">{metrics.missingEmailCount}</div>
          </div>
        </div>

        <div className="faculty-schedules__stat-card">
          <div className="faculty-schedules__stat-icon faculty-schedules__stat-icon--blue">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="faculty-schedules__stat-label">Total Assigned Classes</div>
            <div className="faculty-schedules__stat-value">{metrics.totalClasses}</div>
          </div>
        </div>
      </div>

      {/* Missing Emails Advisory Banner */}
      {metrics.missingEmailCount > 0 && (
        <div className="faculty-schedules__missing-alert" role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={18} />
            <span>
              <strong>Action Required:</strong> {metrics.missingEmailCount} faculty member(s) do not have an official school email address.
              Their schedules cannot be dispatched until official emails are updated in the Faculty Directory.
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="faculty-schedules__filter-bar">
        <div className="faculty-schedules__search-wrap">
          <Search size={16} className="faculty-schedules__search-icon" />
          <input
            type="text"
            className="faculty-schedules__search-input"
            placeholder="Search faculty name, email, employee ID, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="faculty-schedules__filter-selects">
          <select
            className="faculty-schedules__select"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            aria-label="Filter by Academic Program"
          >
            <option value="ALL">All Academic Programs</option>
            <option value="ITP">IT Program (ITP)</option>
            <option value="BAP">Business Administration (BAP)</option>
            <option value="CJEP">Criminology (CJEP)</option>
            <option value="TEP">Teacher Education (TEP)</option>
            <option value="HMP">Hospitality Management (HMP)</option>
          </select>

          <select
            className="faculty-schedules__select"
            value={selectedFacultyType}
            onChange={(e) => setSelectedFacultyType(e.target.value)}
            aria-label="Filter by Faculty Type"
          >
            <option value="ALL">All Faculty Types</option>
            <option value="Full-Time">Full-Time Faculty</option>
            <option value="Part-Time">Part-Time Faculty</option>
          </select>

          <select
            className="faculty-schedules__select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by Dispatch Status"
          >
            <option value="ALL">All Dispatch Statuses</option>
            <option value="READY">Ready for Dispatch</option>
            <option value="SENT">Dispatched / Sent</option>
            <option value="FAILED">Dispatch Failed</option>
            <option value="MISSING_EMAIL">Missing School Email</option>
          </select>
        </div>
      </div>

      {/* Faculty Schedules Table */}
      <div className="faculty-schedules__table-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--srcb-text-muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <p>Loading finalized faculty schedules...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--srcb-text-muted)" }}>
            <CalendarCheck size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--srcb-text)" }}>
              No finalized faculty schedules are available for this semester.
            </h3>
            <p style={{ fontSize: "0.88rem", marginTop: "4px" }}>
              {searchQuery || selectedProgram !== "ALL" || selectedStatus !== "ALL"
                ? "Try adjusting your search filters above."
                : "Create and finalize class schedules in the Class Schedules section first."}
            </p>
          </div>
        ) : (
          <table className="faculty-schedules__table">
            <thead>
              <tr>
                <th>Faculty Instructor</th>
                <th>Program / Dept</th>
                <th>Official School Email</th>
                <th>Assigned Workload</th>
                <th>Dispatch Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => {
                const f = group.faculty;
                const sum = group.summary;
                const isSingleLoading = isProcessingSingle === f.id;

                let statusBadgeClass = "faculty-schedules__status-badge--ready";
                let statusLabel = "Ready";
                if (sum.dispatchStatus === "SENT") {
                  statusBadgeClass = "faculty-schedules__status-badge--sent";
                  statusLabel = "Dispatched";
                } else if (sum.dispatchStatus === "FAILED") {
                  statusBadgeClass = "faculty-schedules__status-badge--failed";
                  statusLabel = "Failed";
                } else if (sum.dispatchStatus === "MISSING_EMAIL") {
                  statusBadgeClass = "faculty-schedules__status-badge--missing";
                  statusLabel = "Missing Email";
                }

                return (
                  <tr key={f.id} data-testid={`faculty-row-${f.id}`}>
                    <td>
                      <div className="faculty-schedules__instructor-cell">
                        <span className="faculty-schedules__instructor-name">{f.name}</span>
                        <div className="faculty-schedules__instructor-meta">
                          <span>{f.employeeNumber || f.id}</span>
                          <span>•</span>
                          <span style={{ fontWeight: 600, color: f.facultyType === "Full-Time" ? "#059669" : "#d97706" }}>
                            {f.facultyType}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge badge--neutral" style={{ fontWeight: 600 }}>
                        {f.programCode || f.department}
                      </span>
                    </td>

                    <td>
                      {f.hasValidEmail ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--srcb-navy)" }}>
                          <Mail size={14} />
                          <span style={{ fontSize: "0.85rem" }}>{f.schoolEmail}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#d97706", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <AlertTriangle size={13} /> Missing Email
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.82rem" }}>
                        <span>
                          <strong>{group.schedules.length}</strong> classes ({sum.totalUnits} units)
                        </span>
                        <span style={{ color: "var(--srcb-text-muted)" }}>
                          {sum.totalWeeklyHours} hrs / week
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`faculty-schedules__status-badge ${statusBadgeClass}`}>
                        {sum.dispatchStatus === "SENT" && <CheckCircle size={12} />}
                        {sum.dispatchStatus === "FAILED" && <AlertTriangle size={12} />}
                        {sum.dispatchStatus === "MISSING_EMAIL" && <AlertTriangle size={12} />}
                        {statusLabel}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="faculty-schedules__row-actions" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="faculty-schedules__action-btn"
                          onClick={() => setReviewFaculty(group)}
                          title="Review complete faculty schedule"
                        >
                          <Eye size={14} />
                          <span>Review</span>
                        </button>

                        <button
                          type="button"
                          className="faculty-schedules__action-btn"
                          onClick={() => handleDownloadPdf(f.id, f.name)}
                          title="Download official schedule PDF"
                        >
                          <Download size={14} />
                          <span>PDF</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            className="faculty-schedules__action-btn"
                            onClick={() => handleSendSingle(f)}
                            disabled={!f.hasValidEmail || isSingleLoading}
                            title={f.hasValidEmail ? "Send schedule PDF to faculty official email" : "Missing official school email"}
                          >
                            <Send size={14} />
                            <span>{isSingleLoading ? "Sending..." : sum.dispatchStatus === "SENT" ? "Resend" : "Send"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Faculty Schedule Modal */}
      {reviewFaculty && (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="faculty-review-modal">
          <div className="modal-card modal-card--lg" style={{ maxWidth: "900px" }}>
            <div className="modal-card__header">
              <div className="modal-card__header-content">
                <div className="modal-card__header-icon">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="modal-card__title">Official Faculty Teaching Schedule</h2>
                  <p className="modal-card__subtitle">
                    {reviewFaculty.faculty.name} — {reviewFaculty.academicTerm}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-card__close"
                onClick={() => setReviewFaculty(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-card__body" style={{ maxHeight: "calc(90vh - 140px)", overflowY: "auto" }}>
              <div className="faculty-modal-schedule">
                {/* Faculty Metadata Box */}
                <div className="faculty-modal-meta-grid">
                  <div className="faculty-modal-meta-item">
                    <span className="faculty-modal-meta-label">Faculty Instructor</span>
                    <span className="faculty-modal-meta-value">{reviewFaculty.faculty.name}</span>
                  </div>

                  <div className="faculty-modal-meta-item">
                    <span className="faculty-modal-meta-label">Employee ID</span>
                    <span className="faculty-modal-meta-value">{reviewFaculty.faculty.employeeNumber || reviewFaculty.faculty.id}</span>
                  </div>

                  <div className="faculty-modal-meta-item">
                    <span className="faculty-modal-meta-label">Faculty Type</span>
                    <span className="faculty-modal-meta-value" style={{ color: reviewFaculty.faculty.facultyType === "Full-Time" ? "#059669" : "#d97706" }}>
                      {reviewFaculty.faculty.facultyType}
                    </span>
                  </div>

                  <div className="faculty-modal-meta-item">
                    <span className="faculty-modal-meta-label">Program / Department</span>
                    <span className="faculty-modal-meta-value">{reviewFaculty.faculty.department}</span>
                  </div>

                  <div className="faculty-modal-meta-item">
                    <span className="faculty-modal-meta-label">Official School Email</span>
                    <span className="faculty-modal-meta-value" style={{ color: reviewFaculty.faculty.hasValidEmail ? "var(--srcb-navy)" : "#d97706" }}>
                      {reviewFaculty.faculty.schoolEmail || "Missing Official Email"}
                    </span>
                  </div>

                  <div className="faculty-modal-meta-item">
                    <span className="faculty-modal-meta-label">Academic Semester</span>
                    <span className="faculty-modal-meta-value">{reviewFaculty.academicTerm}</span>
                  </div>
                </div>

                {/* Schedule Table */}
                <div style={{ border: "1px solid var(--srcb-border)", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                    <thead>
                      <tr style={{ background: "var(--srcb-bg)", borderBottom: "1px solid var(--srcb-border)", color: "var(--srcb-text-muted)" }}>
                        <th style={{ padding: "10px 12px", textAlign: "center", width: "36px" }}>#</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Subject</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "10px 12px", textAlign: "center" }}>Units</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Section</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Day</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Time</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Room</th>
                        <th style={{ padding: "10px 12px", textAlign: "center" }}>Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewFaculty.schedules.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "var(--srcb-text-muted)" }}>
                            No scheduled classes assigned to this faculty member.
                          </td>
                        </tr>
                      ) : (
                        reviewFaculty.schedules.map((s, idx) => (
                          <tr key={s.id || idx} style={{ borderBottom: "1px solid var(--srcb-border)" }}>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--srcb-text-muted)" }}>{idx + 1}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--srcb-navy)" }}>{s.subjectCode}</td>
                            <td style={{ padding: "10px 12px" }}>{s.subjectName}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>{s.units}</td>
                            <td style={{ padding: "10px 12px" }}>{s.section}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.day}</td>
                            <td style={{ padding: "10px 12px" }}>{s.time}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.room}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span className="badge badge--neutral" style={{ fontSize: "0.72rem" }}>
                                {s.mode}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Workload Summary Bar */}
                <div className="faculty-modal-summary-box">
                  <span>
                    <strong>Workload Summary:</strong> {reviewFaculty.schedules.length} Assigned Classes
                  </span>
                  <span>
                    Total Units: <strong>{reviewFaculty.summary.totalUnits} Units</strong>
                  </span>
                  <span>
                    Weekly Load: <strong>{reviewFaculty.summary.totalWeeklyHours} Hours / Week</strong>
                  </span>
                </div>

                {/* Cubicle Advisory Note */}
                <div style={{ padding: "10px 14px", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", fontSize: "0.82rem", color: "#0369a1", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={16} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Official Notice:</strong> A physical printed copy of this finalized teaching schedule has been placed in your departmental faculty cubicle for daily classroom reference.
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-card__footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <button
                  type="button"
                  className="faculty-schedules__action-btn"
                  onClick={() => handlePreviewPdf(reviewFaculty.faculty.id)}
                >
                  <ExternalLink size={14} />
                  <span>Preview PDF</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="faculty-schedules__action-btn"
                  onClick={() => handleDownloadPdf(reviewFaculty.faculty.id, reviewFaculty.faculty.name)}
                >
                  <Download size={14} />
                  <span>Download PDF Document</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    className="faculty-schedules__action-btn faculty-schedules__action-btn--primary"
                    onClick={() => {
                      handleSendSingle(reviewFaculty.faculty);
                      setReviewFaculty(null);
                    }}
                    disabled={!reviewFaculty.faculty.hasValidEmail}
                  >
                    <Send size={14} />
                    <span>Send via Email</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setReviewFaculty(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultySchedulesPage;
