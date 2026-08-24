import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { FileDown, Printer, Building, GraduationCap, CalendarCheck } from "lucide-react";
import { api } from "../data/apiClient";
import { useState, useEffect } from "react";
import { useToast } from "../components/common/Toast";

export function ReportsPage() {
  const toast = useToast();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    api.get("/faculty").then((res: any) => setFaculty(res.data?.data || [])).catch(() => setFaculty([]));
    api.get("/rooms").then((res: any) => setRooms(res.data?.data || [])).catch(() => setRooms([]));
    api.get("/schedules").then((res: any) => setSchedules(res.data?.data || [])).catch(() => setSchedules([]));
    api.get("/exams").then((res: any) => setExams(res.data?.data || [])).catch(() => setExams([]));
  }, []);

  const handlePrint = () => {
    window.print();
    toast.push("Print preview triggered", "info");
  };

  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      institution: "St. Rita's College of Balingasag",
      semester: "1st Semester SY 2026-2027",
      faculty,
      rooms,
      classSchedules: schedules,
      examSchedules: exams,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SRCB_Academic_Schedule_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push("Academic report exported successfully", "success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Institutional Reports & Exports"
        description="Comprehensive planning insights for faculty teaching loads, room occupancy across College/SHS/JHS buildings, and examination schedules."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="secondary-button" type="button" onClick={handlePrint}>
              <Printer size={16} /> Print Timetables
            </button>
            <button className="action-button" type="button" onClick={handleExport}>
              <FileDown size={16} /> Export Data
            </button>
          </div>
        }
      />

      <section className="grid-3">
        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <GraduationCap size={18} color="#0d5499" />
            <p className="eyebrow" style={{ margin: 0 }}>Faculty Workload</p>
          </div>
          <h3 style={{ marginTop: 8 }}>Teaching Distribution</h3>
          <p className="muted">
            {faculty.filter((f) => f.status === "Full-Time").length} Full-Time & {faculty.filter((f) => f.status === "Part-Time").length} Part-Time Instructors.
          </p>
          <div style={{ marginTop: 12 }}>
            <span className="pill pill--royal">{schedules.length} Active Class Sessions</span>
          </div>
        </article>

        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building size={18} color="#0d5499" />
            <p className="eyebrow" style={{ margin: 0 }}>Multi-Building Facilities</p>
          </div>
          <h3 style={{ marginTop: 8 }}>Campus Utilization</h3>
          <p className="muted">
            Rooms in College ({rooms.filter((r) => (r.building || '').includes("College")).length}), SHS ({rooms.filter((r) => (r.building || '').includes("SHS")).length}), and JHS ({rooms.filter((r) => (r.building || '').includes("JHS")).length}).
          </p>
          <div style={{ marginTop: 12 }}>
            <span className="pill pill--navy">{rooms.length} Total Classrooms & Labs</span>
          </div>
        </article>

        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarCheck size={18} color="#0d5499" />
            <p className="eyebrow" style={{ margin: 0 }}>Examination Overview</p>
          </div>
          <h3 style={{ marginTop: 8 }}>Synchronized Exams</h3>
          <p className="muted">
            {exams.length} synchronized subject exam blocks scheduled across campus venues.
          </p>
          <div style={{ marginTop: 12 }}>
            <span className="pill pill--emerald">Midterm & Final Blocks Ready</span>
          </div>
        </article>
      </section>

      {/* Summary Table */}
      <section className="card" style={{ marginTop: 24 }}>
        <div className="card__header">
          <div>
            <p className="eyebrow">Institutional Summary</p>
            <h3>Faculty Teaching Load Breakdown</h3>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>Assigned Classes</th>
                <th>Estimated Hours</th>
                <th>Availability Scope</th>
              </tr>
            </thead>
            <tbody>
              {faculty.map((f) => {
                const assigned = schedules.filter(
                  (s) => (s.facultyId && s.facultyId === f.id) || ((s.faculty || '').toLowerCase().includes((f.name || '').toLowerCase()))
                );
                return (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.name}</strong>
                    </td>
                    <td>{f.department}</td>
                    <td>
                      <span className={`pill ${f.status === "Full-Time" ? "pill--royal" : "pill--navy"}`}>
                        {f.status}
                      </span>
                    </td>
                    <td>{assigned.length} Classes</td>
                    <td>{assigned.length * 3} hrs/wk</td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: 280 }}>
                      {f.availability || "Standard Mon-Fri"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
