import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import {
  Printer,
  Building,
  GraduationCap,
  CalendarCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "../data/apiClient";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "../components/common/Toast";
import { CardGridSkeleton, TableSkeleton } from "../components/common/Skeleton";
import Logo from "../assets/images/Logo.png";

interface FacultyWorkloadRow {
  id: string;
  name: string;
  department: string;
  status: string;
  classesCount: number;
  weeklyHours: number;
  estimatedWeeklyHours: number;
  subjectsHandled: string[];
  sectionsHandledCount: number;
}

interface RoomUtilizationRow {
  number: string;
  building: string;
  capacity: number;
  type: string;
  status: string;
  bookingsCount: number;
  weeklyHoursBooked: number;
  utilizationRate: number;
}

interface ReportSummary {
  totalFaculty: number;
  fullTimeFaculty: number;
  partTimeFaculty: number;
  totalRooms: number;
  totalSchedules: number;
  totalExams: number;
}

export function ReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"workload" | "rooms" | "cfl" | "master-loading">("workload");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [facultyWorkload, setFacultyWorkload] = useState<FacultyWorkloadRow[]>([]);
  const [roomUtilization, setRoomUtilization] = useState<RoomUtilizationRow[]>([]);
  const [rawSchedules, setRawSchedules] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [query, setQuery] = useState("");
  const [masterProgramFilter, setMasterProgramFilter] = useState<string>("All");
  const [masterStatusFilter, setMasterStatusFilter] = useState<string>("All");

  // Selected faculty for Certificate of Faculty Loading (CFL)
  const [selectedCflFacultyId, setSelectedCflFacultyId] = useState<string>("");

  useEffect(() => {
    setIsFetching(true);
    Promise.all([
      api.get("/reports").then((res: any) => {
        const data = res.data?.data;
        if (data) {
          setSummary(data.summary || null);
          setFacultyWorkload(data.facultyWorkload || []);
          setRoomUtilization(data.roomUtilization || []);
          if (data.facultyWorkload && data.facultyWorkload.length > 0) {
            setSelectedCflFacultyId(data.facultyWorkload[0].id);
          }
        }
      }),
      api.get("/schedules").then((res: any) => {
        setRawSchedules(res.data?.data || []);
      }),
      api.get("/subjects").then((res: any) => {
        setSubjectsList(res.data?.data || []);
      }).catch(() => {}),
    ])
      .catch(() => {
        toast.push("Failed to load full reporting metrics", "error");
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, []);

  // Filtered workload records
  const filteredWorkload = useMemo(() => {
    return facultyWorkload.filter((f) => {
      const haystack = `${f.name} ${f.department} ${f.status}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [facultyWorkload, query]);

  // Filtered room utilization records
  const filteredRooms = useMemo(() => {
    return roomUtilization.filter((r) => {
      const haystack = `${r.number} ${r.building} ${r.type} ${r.status}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [roomUtilization, query]);

  // Data for the selected faculty member's Certificate of Faculty Loading
  const cflFaculty = useMemo(() => {
    return facultyWorkload.find((f) => String(f.id) === String(selectedCflFacultyId)) || facultyWorkload[0] || null;
  }, [facultyWorkload, selectedCflFacultyId]);

  const cflSchedules = useMemo(() => {
    if (!cflFaculty) return [];
    return rawSchedules.filter(
      (s) =>
        (s.facultyId && String(s.facultyId) === String(cflFaculty.id)) ||
        (s.faculty && s.faculty.toLowerCase().includes(cflFaculty.name.toLowerCase()))
    );
  }, [rawSchedules, cflFaculty]);

  const handlePrint = () => {
    window.print();
    toast.push("Print preview triggered for document", "info");
  };

  // Export Faculty Workload to Excel CSV
  const handleExportWorkloadCSV = () => {
    if (facultyWorkload.length === 0) return;
    const headers = ["Faculty ID", "Name", "Department", "Status", "Classes Count", "Weekly Teaching Hours", "Subjects Handled"];
    const rows = facultyWorkload.map((f) => [
      `"${f.id}"`,
      `"${f.name}"`,
      `"${f.department}"`,
      `"${f.status}"`,
      f.classesCount,
      f.weeklyHours,
      `"${(f.subjectsHandled || []).join(", ")}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SRCB_Faculty_Workload_Report_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.push("Faculty Workload CSV exported successfully", "success");
  };

  // Export Room Utilization to Excel CSV
  const handleExportRoomsCSV = () => {
    if (roomUtilization.length === 0) return;
    const headers = ["Room Number", "Building", "Capacity", "Room Type", "Status", "Bookings Count", "Weekly Hours Booked", "Utilization Rate (%)"];
    const rows = roomUtilization.map((r) => [
      `"${r.number}"`,
      `"${r.building}"`,
      r.capacity,
      `"${r.type}"`,
      `"${r.status}"`,
      r.bookingsCount,
      r.weeklyHoursBooked,
      `${r.utilizationRate}%`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SRCB_Room_Utilization_Report_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.push("Room Utilization CSV exported successfully", "success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Institutional Reports & Analytical Insights"
        description="Official academic planning metrics, faculty loading distributions, classroom utilization rates, and Certificate of Faculty Loading (CFL) documents."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Reports</strong>
          </>
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="secondary-button" type="button" onClick={handlePrint}>
              <Printer size={16} /> Print Document
            </button>
            <button
              className="action-button"
              type="button"
              onClick={activeTab === "rooms" ? handleExportRoomsCSV : handleExportWorkloadCSV}
            >
              <FileSpreadsheet size={16} /> Export to CSV
            </button>
          </div>
        }
      />

      {/* KPI Metric Summary Cards */}
      {isFetching ? (
        <CardGridSkeleton count={3} />
      ) : (
        <section className="grid-3" style={{ marginBottom: 20 }}>
          <article className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <GraduationCap size={18} color="var(--srcb-navy)" />
              <p className="eyebrow" style={{ margin: 0 }}>Faculty Workload</p>
            </div>
            <h3 style={{ marginTop: 8 }}>{summary?.totalFaculty || facultyWorkload.length} Instructors</h3>
            <p className="muted">
              {summary?.fullTimeFaculty || 0} Full-Time & {summary?.partTimeFaculty || 0} Part-Time.
            </p>
            <div style={{ marginTop: 12 }}>
              <span className="pill pill--royal">{summary?.totalSchedules || rawSchedules.length} Active Class Sessions</span>
            </div>
          </article>

          <article className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Building size={18} color="var(--srcb-navy)" />
              <p className="eyebrow" style={{ margin: 0 }}>Campus Venues</p>
            </div>
            <h3 style={{ marginTop: 8 }}>{summary?.totalRooms || roomUtilization.length} Classrooms & Labs</h3>
            <p className="muted">
              Distributed across College, Senior High, and Junior High school buildings.
            </p>
            <div style={{ marginTop: 12 }}>
              <span className="pill pill--navy">Multi-Building Academic Space</span>
            </div>
          </article>

          <article className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarCheck size={18} color="var(--srcb-green-dark)" />
              <p className="eyebrow" style={{ margin: 0 }}>Examination Overview</p>
            </div>
            <h3 style={{ marginTop: 8 }}>{summary?.totalExams || 0} Synchronized Exams</h3>
            <p className="muted">
              Coordinated midterms and final examination blocks across collegiate scopes.
            </p>
            <div style={{ marginTop: 12 }}>
              <span className="pill pill--emerald">Proctor Assignments Ready</span>
            </div>
          </article>
        </section>
      )}

      {/* Navigation Tabs Bar */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, background: "var(--srcb-surface-alt, #f1f5f9)", padding: 4, borderRadius: 8, border: "1px solid var(--srcb-border)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("workload")}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: activeTab === "workload" ? "var(--srcb-surface)" : "transparent",
                color: activeTab === "workload" ? "var(--srcb-navy)" : "var(--srcb-text-muted)",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: "pointer",
                boxShadow: activeTab === "workload" ? "var(--srcb-shadow-soft)" : "none",
              }}
            >
              Faculty Workload Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: activeTab === "rooms" ? "var(--srcb-surface)" : "transparent",
                color: activeTab === "rooms" ? "var(--srcb-navy)" : "var(--srcb-text-muted)",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: "pointer",
                boxShadow: activeTab === "rooms" ? "var(--srcb-shadow-soft)" : "none",
              }}
            >
              Room Utilization Rates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cfl")}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: activeTab === "cfl" ? "var(--srcb-surface)" : "transparent",
                color: activeTab === "cfl" ? "var(--srcb-green-dark, #349b57)" : "var(--srcb-text-muted)",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: "pointer",
                boxShadow: activeTab === "cfl" ? "var(--srcb-shadow-soft)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Award size={15} /> Certificate of Faculty Loading (CFL)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("master-loading")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: activeTab === "master-loading" ? "var(--srcb-surface)" : "transparent",
                color: activeTab === "master-loading" ? "var(--srcb-navy, #0d5499)" : "var(--srcb-text-muted)",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: "pointer",
                boxShadow: activeTab === "master-loading" ? "var(--srcb-shadow-soft)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileSpreadsheet size={15} /> Master Loading Document (SRCB)
            </button>
          </div>

          {activeTab === "master-loading" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <select
                value={masterProgramFilter}
                onChange={(e) => setMasterProgramFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.84rem", fontWeight: 600 }}
              >
                <option value="All">All Academic Programs</option>
                <option value="TEP">Teacher Education Program (TEP)</option>
                <option value="BSHM">Hospitality Management (BSHM)</option>
                <option value="CJEP">Criminal Justice (CJEP)</option>
                <option value="BSBA">Business Administration (BSBA)</option>
                <option value="BSIT">Information Technology (BSIT)</option>
              </select>

              <select
                value={masterStatusFilter}
                onChange={(e) => setMasterStatusFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.84rem", fontWeight: 600 }}
              >
                <option value="All">All Faculty Types</option>
                <option value="Full-Time">Full-Time Faculty</option>
                <option value="Part-Time">Part-Time Instructors</option>
              </select>

              <button
                type="button"
                className="secondary-button"
                onClick={() => window.print()}
                style={{ padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.84rem" }}
              >
                <Printer size={14} /> Print Document
              </button>
            </div>
          ) : activeTab === "cfl" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--srcb-slate)" }}>Select Faculty Member:</span>
              <select
                value={selectedCflFacultyId}
                onChange={(e) => setSelectedCflFacultyId(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", fontSize: "0.86rem", fontWeight: 600 }}
              >
                {facultyWorkload.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department} • {f.status})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="topbar__search" style={{ minWidth: 260 }}>
              <Search size={16} color="var(--srcb-slate)" />
              <input
                type="text"
                placeholder={activeTab === "workload" ? "Search faculty, department..." : "Search room, building, type..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      {/* Tab 1: Faculty Workload Matrix Table */}
      {activeTab === "workload" && (
        <section className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">Institutional Teaching Distribution</p>
              <h3>Faculty Teaching Loads & Hours Summary</h3>
            </div>
          </div>

          {isFetching ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredWorkload.length === 0 ? (
            <div className="empty-state">No matching faculty members found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Instructor Name</th>
                    <th>Department</th>
                    <th>Employment Status</th>
                    <th>Assigned Sections</th>
                    <th>Weekly Teaching Load</th>
                    <th>Load Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkload.map((f) => {
                    const isFullTime = f.status === "Full-Time";
                    const maxHours = isFullTime ? 24 : 12;
                    const isOverload = f.weeklyHours > maxHours;
                    const isUnderload = f.weeklyHours < (isFullTime ? 15 : 6) && f.classesCount > 0;

                    return (
                      <tr key={f.id}>
                        <td>
                          <strong style={{ color: "var(--srcb-text)" }}>{f.name}</strong>
                          <div style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>ID: {f.id}</div>
                        </td>
                        <td>{f.department}</td>
                        <td>
                          <span className={`pill ${isFullTime ? "pill--royal" : "pill--amber"}`}>
                            {f.status}
                          </span>
                        </td>
                        <td>
                          <span className="pill pill--navy">
                            {f.classesCount} Classes ({f.sectionsHandledCount} Cohorts)
                          </span>
                        </td>
                        <td>
                          <strong>{f.weeklyHours} hrs/wk</strong>
                          <div style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                            Limit: {maxHours} hrs/wk
                          </div>
                        </td>
                        <td>
                          {isOverload ? (
                            <span className="pill pill--danger">
                              <AlertTriangle size={12} /> Overload (+{(f.weeklyHours - maxHours).toFixed(1)} hrs)
                            </span>
                          ) : isUnderload ? (
                            <span className="pill pill--amber">Underload Target</span>
                          ) : (
                            <span className="pill pill--emerald">
                              <CheckCircle2 size={12} /> Optimal Load
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Room Utilization Rates Table */}
      {activeTab === "rooms" && (
        <section className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">Classroom & Laboratory Efficiency</p>
              <h3>Campus Venue Weekly Utilization Rates</h3>
            </div>
          </div>

          {isFetching ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredRooms.length === 0 ? (
            <div className="empty-state">No matching rooms or facilities found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Campus Building</th>
                    <th>Seating Capacity</th>
                    <th>Facility Type</th>
                    <th>Booked Classes</th>
                    <th>Weekly Occupancy Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((r) => (
                    <tr key={r.number}>
                      <td>
                        <strong style={{ color: "var(--srcb-navy)", fontFamily: "var(--font-mono)" }}>
                          {r.number}
                        </strong>
                      </td>
                      <td>{r.building}</td>
                      <td>{r.capacity} students</td>
                      <td>
                        <span className={`pill ${/lab/i.test(r.type) ? "pill--royal" : "pill--slate"}`}>
                          {r.type || "Classroom"}
                        </span>
                      </td>
                      <td>{r.bookingsCount} sessions/week</td>
                      <td style={{ minWidth: 180 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>
                          <span>{r.weeklyHoursBooked} hrs booked</span>
                          <span style={{ color: r.utilizationRate > 60 ? "var(--srcb-green-dark)" : "var(--srcb-navy)" }}>
                            {r.utilizationRate}%
                          </span>
                        </div>
                        <div style={{ width: "100%", height: 8, background: "var(--srcb-border)", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, r.utilizationRate)}%`,
                              height: "100%",
                              background: r.utilizationRate > 75 ? "#f59e0b" : "var(--srcb-green)",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Formal Certificate of Faculty Loading (CFL) Document */}
      {activeTab === "cfl" && cflFaculty && (
        <section className="card" style={{ padding: "36px 40px", background: "var(--srcb-surface-elevated, #ffffff)", border: "1px solid var(--srcb-border)", maxWidth: 960, margin: "0 auto" }}>
          {/* Institutional Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, borderBottom: "2px solid var(--srcb-navy)", paddingBottom: 20, marginBottom: 24, textAlign: "center" }}>
            <img src={Logo} alt="SRCB Logo" style={{ width: 72, height: 72, objectFit: "contain" }} />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "var(--srcb-navy)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                St. Rita's College of Balingasag
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--srcb-slate)", fontWeight: 500 }}>
                Balingasag, Misamis Oriental 9005, Philippines • Office of Academic Affairs
              </p>
              <h4 style={{ margin: "8px 0 0", fontSize: "1.05rem", fontWeight: 700, color: "var(--srcb-green-dark, #349b57)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Certificate of Faculty Loading (CFL)
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                Academic Year 2026-2027 • First Semester
              </p>
            </div>
          </div>

          {/* Instructor Particulars Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "var(--srcb-surface-alt, #f8fafc)", padding: "16px 20px", borderRadius: 8, border: "1px solid var(--srcb-border)", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Faculty Member</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--srcb-navy)" }}>{cflFaculty.name}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--srcb-slate)" }}>Faculty ID: {cflFaculty.id}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--srcb-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Department & Employment</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--srcb-text)" }}>{cflFaculty.department}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--srcb-slate)" }}>Status: <strong>{cflFaculty.status}</strong></div>
            </div>
          </div>

          {/* Detailed Course Timetable Table */}
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <table className="data-table" style={{ fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ background: "var(--srcb-navy)", color: "#ffffff" }}>
                  <th style={{ color: "#ffffff" }}>Subject Code</th>
                  <th style={{ color: "#ffffff" }}>Descriptive Title</th>
                  <th style={{ color: "#ffffff" }}>Section</th>
                  <th style={{ color: "#ffffff" }}>Day & Time</th>
                  <th style={{ color: "#ffffff" }}>Room</th>
                  <th style={{ color: "#ffffff", textAlign: "right" }}>Units</th>
                </tr>
              </thead>
              <tbody>
                {cflSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--srcb-text-muted)" }}>
                      No class schedules currently assigned to this instructor for the active semester.
                    </td>
                  </tr>
                ) : (
                  cflSchedules.map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td><strong>{s.subjectCode || s.code}</strong></td>
                      <td>{s.subject || s.name}</td>
                      <td>{s.section}</td>
                      <td>{s.day} {s.time}</td>
                      <td>{s.room}</td>
                      <td style={{ textAlign: "right" }}><strong>3.0</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--srcb-surface-alt, #f8fafc)", fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: "right", color: "var(--srcb-navy)" }}>Total Teaching Load:</td>
                  <td style={{ textAlign: "right", color: "var(--srcb-navy)" }}>{cflSchedules.length * 3}.0 Units</td>
                </tr>
                <tr style={{ background: "var(--srcb-surface-alt, #f8fafc)", fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: "right", color: "var(--srcb-navy)" }}>Total Weekly Contact Hours:</td>
                  <td style={{ textAlign: "right", color: "var(--srcb-navy)" }}>{cflFaculty.weeklyHours} Hours/Week</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Formal Tri-Party Signatures Block (CHED Standard) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 48, paddingTop: 24, borderTop: "1px dashed var(--srcb-border)", textAlign: "center" }}>
            <div>
              <div style={{ borderBottom: "1px solid #000", width: "80%", margin: "0 auto 8px" }} />
              <strong style={{ fontSize: "0.85rem", display: "block" }}>{cflFaculty.name}</strong>
              <span style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)" }}>Faculty Member</span>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid #000", width: "80%", margin: "0 auto 8px" }} />
              <strong style={{ fontSize: "0.85rem", display: "block" }}>Program Head</strong>
              <span style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)" }}>Academic Department Head</span>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid #000", width: "80%", margin: "0 auto 8px" }} />
              <strong style={{ fontSize: "0.85rem", display: "block" }}>Dean / Vice President</strong>
              <span style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)" }}>Office of Academic Affairs</span>
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: SRCB Official Master Faculty Loading Document (Pages 1-17 Format) */}
      {activeTab === "master-loading" && (
        <section
          className="card"
          style={{
            padding: "36px 32px",
            background: "#ffffff",
            border: "2px solid #0f172a",
            maxWidth: 1100,
            margin: "0 auto",
            color: "#0f172a",
          }}
        >
          {/* Institutional Header Banner */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 8 }}>
              <img src={Logo} alt="SRCB Logo" style={{ width: 64, height: 64, objectFit: "contain" }} />
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0f172a" }}>
                  St. Rita's College of Balingasag, Inc.
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                  Balingasag, Misamis Oriental 9005 • Higher Education Department
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  PAASCU Level I &amp; II Accredited Programs
                </p>
              </div>
            </div>
            <h3 style={{ margin: "10px 0 0", fontSize: "1.05rem", fontWeight: 800, textTransform: "uppercase", color: "#0d5499" }}>
              Faculty Teaching Loading Document
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>
              First Semester SY 2026-2027
            </p>
          </div>

          {/* Master Loading Table Content */}
          {(() => {
            // Group faculty by status and filter
            const filteredFaculty = facultyWorkload.filter((f) => {
              if (masterProgramFilter !== "All") {
                const dep = String(f.department || "").toUpperCase();
                if (!dep.includes(masterProgramFilter.toUpperCase())) return false;
              }
              if (masterStatusFilter !== "All") {
                if (f.status !== masterStatusFilter) return false;
              }
              return true;
            });

            const fullTimeList = filteredFaculty.filter((f) => f.status === "Full-Time");
            const partTimeList = filteredFaculty.filter((f) => f.status !== "Full-Time");

            const renderFacultySection = (title: string, list: typeof filteredFaculty) => {
              if (list.length === 0) return null;

              return (
                <div style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      padding: "8px 16px",
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 10,
                      borderRadius: 4,
                    }}
                  >
                    {title}
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #000000",
                      fontSize: "0.82rem",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f1f5f9", textAlign: "center", fontWeight: 800 }}>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "18%" }}>NAME OF INSTRUCTOR</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "10%" }}>SUBJECT CODE</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "20%" }}>DESCRIPTION</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "7%" }}>Units</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "6%" }}>Sections</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "7%" }}>Students</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "10%" }}>Course-Year</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "10%" }}>Time</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "10%" }}>Day</th>
                        <th style={{ border: "1px solid #000000", padding: "8px 6px", width: "8%" }}>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((faculty, fIdx) => {
                        const scheds = rawSchedules.filter(
                          (s) =>
                            String(s.facultyId || "") === String(faculty.id) ||
                            String(s.faculty || "").toLowerCase() === faculty.name.toLowerCase()
                        );

                        // Find details from subjectsList
                        const rows = scheds.length > 0 ? scheds : [null];
                        const totalUnits = scheds.reduce((sum, s) => {
                          const subObj = subjectsList.find((sub) => sub.code === (s?.subjectCode || s?.code));
                          return sum + (Number(subObj?.units) || 3);
                        }, 0);

                        return (
                          <>
                            {rows.map((s, rIdx) => {
                              const subObj = s ? subjectsList.find((sub) => sub.code === (s?.subjectCode || s?.code)) : null;
                              const units = subObj?.units || 3;

                              return (
                                <tr key={`${faculty.id}-${s?.id || rIdx}`}>
                                  {rIdx === 0 && (
                                    <td
                                      rowSpan={rows.length}
                                      style={{
                                        border: "1px solid #000000",
                                        padding: "8px",
                                        verticalAlign: "top",
                                        fontWeight: 700,
                                        background: "#fafafa",
                                      }}
                                    >
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <span>{fIdx + 1}.</span>
                                        <div>
                                          <strong style={{ color: "#0f172a" }}>{faculty.name}</strong>
                                          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
                                            {faculty.department} • {faculty.status}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", fontWeight: 700, textAlign: "center" }}>
                                    {s?.subjectCode || s?.code || "—"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px" }}>
                                    {s?.subject || s?.name || subObj?.name || "No classes currently scheduled"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center" }}>
                                    {s ? units : "—"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center" }}>
                                    {s ? 1 : "—"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center" }}>
                                    {s?.students || s?.enrolled || "25"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>
                                    {s?.section || "—"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center", fontSize: "0.78rem" }}>
                                    {s?.time || "—"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center", fontSize: "0.78rem" }}>
                                    {s?.day ? (s.day.includes("Monday") ? "Mon. & Thurs." : s.day.includes("Tuesday") ? "Tues. & Fri." : s.day) : "—"}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "6px 8px", textAlign: "center", fontWeight: 700 }}>
                                    {s?.room || "—"}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Subtotal row per faculty matching official format */}
                            <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                              <td colSpan={3} style={{ border: "1px solid #000000", padding: "6px 10px", textAlign: "right" }}>
                                Subtotal Teaching Load ({faculty.name}):
                              </td>
                              <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center", color: "#0d5499" }}>
                                {totalUnits} Units
                              </td>
                              <td colSpan={6} style={{ border: "1px solid #000000", padding: "6px 10px", fontSize: "0.76rem" }}>
                                {faculty.status === "Full-Time" ? (
                                  totalUnits > 24 ? (
                                    <span style={{ color: "#b91c1c", fontWeight: 700 }}>Overload (+{totalUnits - 24} units beyond 24 unit limit)</span>
                                  ) : (
                                    <span style={{ color: "#15803d", fontWeight: 700 }}>Normal Full-Time Load ({totalUnits}/24 units)</span>
                                  )
                                ) : totalUnits > 12 ? (
                                  <span style={{ color: "#b91c1c", fontWeight: 700 }}>Part-Time Overload (+{totalUnits - 12} units beyond 12 unit limit)</span>
                                ) : (
                                  <span style={{ color: "#15803d", fontWeight: 700 }}>Normal Part-Time Load ({totalUnits}/12 units)</span>
                                )}
                              </td>
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            };

            return (
              <>
                {renderFacultySection("FULLTIME FACULTY", fullTimeList)}
                {renderFacultySection("PART - TIME INSTRUCTOR", partTimeList)}
              </>
            );
          })()}

          {/* Institutional Signatories Block Matching Document Pages 11 & 17 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
              marginTop: 48,
              paddingTop: 24,
              borderTop: "2px solid #0f172a",
              textAlign: "center",
            }}
          >
            <div>
              <p style={{ margin: "0 0 40px", fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>Prepared by:</p>
              <div style={{ borderBottom: "1px solid #000000", width: "85%", margin: "0 auto 6px" }} />
              <strong style={{ fontSize: "0.88rem", display: "block", color: "#0f172a", textTransform: "uppercase" }}>
                JESTONI E. SALVAÑA / EUGENE D. SILVA
              </strong>
              <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600 }}>Program Head</span>
            </div>

            <div>
              <p style={{ margin: "0 0 40px", fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>Noted by:</p>
              <div style={{ borderBottom: "1px solid #000000", width: "85%", margin: "0 auto 6px" }} />
              <strong style={{ fontSize: "0.88rem", display: "block", color: "#0f172a", textTransform: "uppercase" }}>
                DR. CHARLES DARWIN O. GODINEZ
              </strong>
              <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600 }}>Dean of College</span>
            </div>

            <div>
              <p style={{ margin: "0 0 40px", fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>Approved by:</p>
              <div style={{ borderBottom: "1px solid #000000", width: "85%", margin: "0 auto 6px" }} />
              <strong style={{ fontSize: "0.88rem", display: "block", color: "#0f172a", textTransform: "uppercase" }}>
                S. MA. JESUSITA L. BERNATE, RVM
              </strong>
              <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600 }}>School President / VP Academic Affairs</span>
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
}
