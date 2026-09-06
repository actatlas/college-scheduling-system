import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  Building2,
  GraduationCap,
  Users,
  Layers,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { getProgramLogo } from "../utils/programLogos";
import type { SubjectItem, ProgramItem, FacultyMember } from "../types";

export const ACADEMIC_PROGRAMS = [
  { code: "BAP", name: "Business Administration Program", short: "Business Administration" },
  { code: "ITP", name: "Information Technology Program", short: "Information Technology" },
  { code: "CJEP", name: "Criminal Justice Education Program", short: "Criminal Justice Education" },
  { code: "TEP", name: "Teacher Education Program", short: "Teacher Education" },
  { code: "HMP", name: "Hospitality Management Program", short: "Hospitality Management" },
];

export interface DegreeCourseRow {
  code: string;
  name: string;
  year?: number | string;
  programCode?: string;
}

function getSubjectAcademicProgram(sub: SubjectItem): { code: string; name: string } {
  const rawProg = String(sub.program || (sub as any).programCode || sub.department || "").toUpperCase().trim();
  const code = String(sub.code || "").toUpperCase().trim();

  if (rawProg === "ITP" || rawProg.includes("BSIT") || rawProg.includes("BSCS") || rawProg.includes("TECH") || code.startsWith("IT") || code.startsWith("CS")) {
    return { code: "ITP", name: "Information Technology Program" };
  }
  if (rawProg === "BAP" || rawProg.includes("BSBA") || rawProg.includes("BSA") || rawProg.includes("BUS") || rawProg.includes("ADMIN") || code.startsWith("BA") || code.startsWith("ACT") || code.startsWith("ACC")) {
    return { code: "BAP", name: "Business Administration Program" };
  }
  if (rawProg === "CJEP" || rawProg.includes("BSCRIM") || rawProg.includes("CRIM") || rawProg.includes("JUSTICE") || code.startsWith("CRIM") || code.startsWith("CJ")) {
    return { code: "CJEP", name: "Criminal Justice Education Program" };
  }
  if (rawProg === "TEP" || rawProg.includes("BSED") || rawProg.includes("BEED") || rawProg.includes("EDUC") || rawProg.includes("TEACH") || code.startsWith("ED") || code.startsWith("TE")) {
    return { code: "TEP", name: "Teacher Education Program" };
  }
  if (rawProg === "HMP" || rawProg.includes("BSHM") || rawProg.includes("HM") || rawProg.includes("HOSP") || rawProg.includes("HOTEL") || code.startsWith("HM") || code.startsWith("HRM")) {
    return { code: "HMP", name: "Hospitality Management Program" };
  }
  return { code: rawProg || "ITP", name: sub.department || "Academic Program" };
}

function isMajorSubject(s: SubjectItem): boolean {
  if (s.isMajor === false) return false;
  const c = String(s.code || "").toUpperCase().trim();
  if (/^(GE|GEC|NSTP|PE|PATHFIT|RIZAL|MATH1|ENG1|FIL1|SOC1)\b/i.test(c)) return false;
  const dept = String(s.department || "").toUpperCase().trim();
  if (dept === "GENERAL EDUCATION" || dept === "GEN ED") return false;
  return true;
}

export function CoursesPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [courses, setCourses] = useState<DegreeCourseRow[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Mode: "major_subjects" (default) or "degree_courses"
  const [viewMode, setViewMode] = useState<"major_subjects" | "degree_courses">("major_subjects");

  // Filter states
  const [activeProgramTab, setActiveProgramTab] = useState<string>("ALL");
  const [semesterFilter, setSemesterFilter] = useState<string>("ALL");

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);

  // Degree Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<DegreeCourseRow | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<DegreeCourseRow | null>(null);

  // Subject Form
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    programCode: "BAP",
    units: "3",
    lectureHours: "3",
    labHours: "0",
    semester: "1st Semester",
    instructorId: "",
  });

  // Course Form
  const [courseForm, setCourseForm] = useState({
    code: "",
    name: "",
    year: "4",
    programCode: "ITP",
  });
  const [durationMode, setDurationMode] = useState<string>("4");
  const [customDuration, setCustomDuration] = useState<string>("");

  const toast = useToast();
  const { selectedProgramKey } = useProgramContext();

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canManage = role === "super_admin" || role === "admin";

  // Sync with global program switcher
  useEffect(() => {
    if (selectedProgramKey && selectedProgramKey !== "ALL") {
      const upper = selectedProgramKey.toUpperCase();
      const match = ACADEMIC_PROGRAMS.find(
        (p) =>
          p.code === upper ||
          (upper.includes("IT") && p.code === "ITP") ||
          (upper.includes("BUS") && p.code === "BAP") ||
          (upper.includes("CRIM") && p.code === "CJEP") ||
          (upper.includes("TEACH") && p.code === "TEP") ||
          (upper.includes("HOSP") && p.code === "HMP")
      );
      if (match) {
        setActiveProgramTab(match.code);
      }
    }
  }, [selectedProgramKey]);

  const fetchAllData = async () => {
    setIsFetching(true);
    try {
      const [subRes, cRes, facRes, progRes, secRes] = await Promise.all([
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
        api.get("/courses").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/sections").catch(() => ({ data: { data: [] } })),
      ]);

      setSubjects(subRes.data?.data || []);
      setCourses(cRes.data?.data || []);
      setFaculty(facRes.data?.data || []);
      setPrograms(progRes.data?.data || []);
      setSections(secRes.data?.data || []);
    } catch {
      setSubjects([]);
      setCourses([]);
      setFaculty([]);
      setPrograms([]);
      setSections([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter specifically for Major Subjects of the programs
  const majorSubjects = useMemo(() => {
    return subjects.filter(isMajorSubject);
  }, [subjects]);

  // Apply search and program filters to Major Subjects
  const filteredSubjects = useMemo(() => {
    return majorSubjects.filter((sub) => {
      const progInfo = getSubjectAcademicProgram(sub);

      if (activeProgramTab !== "ALL") {
        if (progInfo.code !== activeProgramTab) return false;
      }

      if (semesterFilter !== "ALL") {
        if (sub.semester !== semesterFilter) return false;
      }

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matchesCode = (sub.code || "").toLowerCase().includes(q);
        const matchesName = (sub.name || "").toLowerCase().includes(q);
        const matchesProg = progInfo.name.toLowerCase().includes(q) || progInfo.code.toLowerCase().includes(q);
        const matchesInstructor = (sub.instructor || "").toLowerCase().includes(q);
        return matchesCode || matchesName || matchesProg || matchesInstructor;
      }

      return true;
    });
  }, [majorSubjects, activeProgramTab, semesterFilter, query]);

  // Filter for Degree Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeProgramTab !== "ALL") {
        const pCode = (c.programCode || "").toUpperCase();
        if (pCode !== activeProgramTab && !c.code.toUpperCase().includes(activeProgramTab)) return false;
      }

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.programCode || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courses, activeProgramTab, query]);

  // Statistics
  const stats = useMemo(() => {
    const activeList = activeProgramTab === "ALL"
      ? majorSubjects
      : majorSubjects.filter((s) => getSubjectAcademicProgram(s).code === activeProgramTab);

    const totalUnits = activeList.reduce((acc, s) => acc + (Number(s.units) || 0), 0);
    const withInstructorCount = activeList.filter((s) => s.instructorId && s.instructor !== "Unassigned").length;

    return {
      total: activeList.length,
      units: totalUnits,
      assigned: withInstructorCount,
    };
  }, [majorSubjects, activeProgramTab]);

  // --- Handlers for Major Subjects ---
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      code: "",
      name: "",
      programCode: activeProgramTab !== "ALL" ? activeProgramTab : "BAP",
      units: "3",
      lectureHours: "3",
      labHours: "0",
      semester: "1st Semester",
      instructorId: "",
    });
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subject: SubjectItem) => {
    setEditingSubject(subject);
    const progInfo = getSubjectAcademicProgram(subject);
    setSubjectForm({
      code: subject.code,
      name: subject.name,
      programCode: progInfo.code,
      units: String(subject.units || 3),
      lectureHours: String(subject.lectureHours || 3),
      labHours: String(subject.labHours || 0),
      semester: subject.semester || "1st Semester",
      instructorId: subject.instructorId || "",
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.code.trim() || !subjectForm.name.trim()) {
      toast.push("Subject code and major subject title are required", "error");
      return;
    }

    const selectedProg = ACADEMIC_PROGRAMS.find((p) => p.code === subjectForm.programCode);
    const payload = {
      code: subjectForm.code.trim().toUpperCase(),
      name: subjectForm.name.trim(),
      programCode: subjectForm.programCode,
      program: subjectForm.programCode,
      department: selectedProg ? selectedProg.name : subjectForm.programCode,
      courseCode: subjectForm.programCode,
      units: Number(subjectForm.units) || 3,
      lectureHours: Number(subjectForm.lectureHours) || 3,
      labHours: Number(subjectForm.labHours) || 0,
      semester: subjectForm.semester,
      instructorId: subjectForm.instructorId || null,
      isMajor: true,
    };

    setLoading(true);
    try {
      if (editingSubject) {
        await api.put(`/subjects/${encodeURIComponent(editingSubject.code)}`, payload);
        toast.push(`Major subject ${payload.code} updated successfully`, "success");
      } else {
        await api.post("/subjects", payload);
        toast.push(`Major subject ${payload.code} registered under ${subjectForm.programCode}`, "success");
      }
      setIsSubjectModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err?.message || "Failed to save major subject", "error");
    } finally {
      setLoading(false);
    }
  };

  const [cascadeConfirmSubject, setCascadeConfirmSubject] = useState<{ subject: SubjectItem; message: string } | null>(null);

  const handleDeleteSubject = async (forceCascade = false) => {
    const target = forceCascade ? cascadeConfirmSubject?.subject : subjectToDelete;
    if (!target) return;
    setLoading(true);
    try {
      const url = `/subjects/${encodeURIComponent(target.code)}${forceCascade ? "?cascade=true" : ""}`;
      await api.delete(url);
      toast.push(
        `Major subject ${target.code} ${forceCascade ? "and its assigned schedules were deleted" : "deleted successfully"}`,
        "success"
      );
      setSubjectToDelete(null);
      setCascadeConfirmSubject(null);
      fetchAllData();
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp?.code === "ACADEMIC_DEPENDENCY_RESTRICT" || err?.status === 409) {
        setCascadeConfirmSubject({
          subject: target,
          message: resp?.error || `Cannot delete "${target.code}" because it is currently assigned to active schedules.`,
        });
        setSubjectToDelete(null);
      } else {
        toast.push(resp?.error || err?.message || "Failed to delete major subject", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Degree Courses ---
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setDurationMode("4");
    setCustomDuration("");
    setCourseForm({
      code: "",
      name: "",
      year: "4",
      programCode: activeProgramTab !== "ALL" ? activeProgramTab : "ITP",
    });
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: DegreeCourseRow) => {
    setEditingCourse(course);
    const yrStr = String(course.year || 4);
    if (["2", "3", "4", "5"].includes(yrStr)) {
      setDurationMode(yrStr);
      setCustomDuration("");
    } else {
      setDurationMode("other");
      setCustomDuration(yrStr);
    }
    setCourseForm({
      code: course.code,
      name: course.name,
      year: yrStr,
      programCode: course.programCode || "ITP",
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.code.trim() || !courseForm.name.trim()) {
      toast.push("Course code and degree name are required", "error");
      return;
    }
    const finalYear = durationMode === "other" ? Number(customDuration) : Number(durationMode);
    if (!finalYear || isNaN(finalYear) || finalYear < 1 || finalYear > 10) {
      toast.push("Please enter a valid course duration between 1 and 10 years.", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingCourse) {
        await api.put(`/courses/${encodeURIComponent(editingCourse.code)}`, {
          name: courseForm.name,
          year: finalYear,
          programCode: courseForm.programCode,
        });
        toast.push("Degree course updated successfully", "success");
      } else {
        await api.post("/courses", {
          code: courseForm.code.toUpperCase().trim(),
          name: courseForm.name.trim(),
          year: finalYear,
          programCode: courseForm.programCode,
        });
        toast.push("New degree course registered successfully", "success");
      }
      setIsCourseModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save degree course", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/courses/${encodeURIComponent(courseToDelete.code)}`);
      toast.push(`Degree course ${courseToDelete.code} removed`, "success");
      setCourseToDelete(null);
      fetchAllData();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete degree course", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Major Subjects of Academic Programs"
        description="Official professional courses and major curriculum requirements categorized across collegiate academic programs."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Major Subjects</strong>
          </>
        }
        actions={
          canManage && (
            <div style={{ display: "flex", gap: 10 }}>
              {viewMode === "major_subjects" ? (
                <button
                  className="action-button"
                  type="button"
                  onClick={handleOpenAddSubject}
                  aria-label="Add Major Subject"
                >
                  <Plus size={16} />
                  <span>Add Major Subject</span>
                </button>
              ) : (
                <button
                  className="action-button"
                  type="button"
                  onClick={handleOpenAddCourse}
                  aria-label="Add Degree Course"
                >
                  <Plus size={16} />
                  <span>Add Degree Course</span>
                </button>
              )}
            </div>
          )
        }
      />

      {/* Program Scope Selector Tabs & View Switcher */}
      <section className="card" style={{ marginBottom: 16, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          {/* Academic Program Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: 4 }}>
              Program:
            </span>
            <button
              type="button"
              className={`secondary-button ${activeProgramTab === "ALL" ? "action-button" : ""}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem", borderRadius: 20 }}
              onClick={() => setActiveProgramTab("ALL")}
            >
              All Programs ({majorSubjects.length})
            </button>
            {ACADEMIC_PROGRAMS.map((prog) => {
              const count = majorSubjects.filter((s) => getSubjectAcademicProgram(s).code === prog.code).length;
              const isActive = activeProgramTab === prog.code;
              return (
                <button
                  key={prog.code}
                  type="button"
                  className={`secondary-button ${isActive ? "action-button" : ""}`}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.82rem",
                    borderRadius: 20,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={() => setActiveProgramTab(prog.code)}
                >
                  <img
                    src={getProgramLogo(prog.code)}
                    alt=""
                    style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <span>{prog.code}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: isActive ? "rgba(255,255,255,0.25)" : "var(--srcb-border)",
                      color: isActive ? "#ffffff" : "var(--srcb-text)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--srcb-bg)", padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              className={`secondary-button ${viewMode === "major_subjects" ? "action-button" : ""}`}
              style={{ padding: "5px 12px", fontSize: "0.78rem", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={() => setViewMode("major_subjects")}
            >
              <BookOpen size={14} />
              <span>Major Subjects ({majorSubjects.length})</span>
            </button>
            <button
              type="button"
              className={`secondary-button ${viewMode === "degree_courses" ? "action-button" : ""}`}
              style={{ padding: "5px 12px", fontSize: "0.78rem", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={() => setViewMode("degree_courses")}
            >
              <GraduationCap size={14} />
              <span>Degree Programs ({courses.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Statistics Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600 }}>Total Major Subjects</p>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.4rem", color: "var(--srcb-navy)" }}>{stats.total}</h3>
            </div>
            <div style={{ padding: 8, background: "rgba(13, 84, 153, 0.1)", borderRadius: 8, color: "var(--srcb-royal)" }}>
              <BookOpen size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600 }}>Curriculum Units</p>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.4rem", color: "#0284c7" }}>{stats.units} Units</h3>
            </div>
            <div style={{ padding: 8, background: "rgba(2, 132, 199, 0.1)", borderRadius: 8, color: "#0284c7" }}>
              <Layers size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600 }}>Instructors Assigned</p>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.4rem", color: "#10b981" }}>{stats.assigned}</h3>
            </div>
            <div style={{ padding: 8, background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, color: "#10b981" }}>
              <Users size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Roster Card */}
      <section className="card">
        {/* Search and Filter Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
            <div className="topbar__search" style={{ width: "100%", maxWidth: 380 }}>
              <Search size={16} color="var(--srcb-slate)" />
              <input
                type="text"
                placeholder={
                  viewMode === "major_subjects"
                    ? "Search major subjects by code, title, instructor..."
                    : "Search degree courses by code, title, program..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search courses and subjects"
              />
            </div>
          </div>

          {viewMode === "major_subjects" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Semester Filter */}
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--srcb-border)",
                  fontSize: "0.84rem",
                  background: "var(--srcb-surface)",
                }}
                aria-label="Filter by Semester"
              >
                <option value="ALL">All Semesters</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
          )}
        </div>

        {/* View Mode 1: Major Subjects Table */}
        {viewMode === "major_subjects" && (
          isFetching ? (
            <TableSkeleton rows={6} columns={7} />
          ) : filteredSubjects.length === 0 ? (
            <div className="empty-state">
              <GraduationCap size={36} color="var(--srcb-slate)" style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No subjects available for this program yet.</p>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                {query
                  ? "Try clearing your search query or filters"
                  : "Click 'Add Major Subject' above to register a major curriculum offering."}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table" aria-label="Major subjects table">
                <thead>
                  <tr>
                    <th style={{ width: "130px" }}>Subject Code</th>
                    <th>Major Subject Title</th>
                    <th>Academic Program</th>
                    <th>Units & Hours</th>
                    <th>Semester</th>
                    <th>Assigned Faculty</th>
                    {canManage && <th style={{ textAlign: "right", minWidth: "150px" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((subject) => {
                    const progInfo = getSubjectAcademicProgram(subject);
                    const isLab = Number(subject.labHours || 0) > 0;
                    const progLogo = getProgramLogo(progInfo.code);

                    return (
                      <tr key={subject.code}>
                        <td>
                          <span
                            className="pill pill--royal"
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {subject.code}
                          </span>
                        </td>

                        <td>
                          <div>
                            <strong style={{ color: "var(--srcb-text)", fontSize: "0.92rem", display: "block" }}>
                              {subject.name}
                            </strong>
                            <span style={{ fontSize: "0.76rem", color: "var(--srcb-text-muted)" }}>
                              Major Curriculum Requirement
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <img
                              src={progLogo}
                              alt=""
                              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                            />
                            <div>
                              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--srcb-navy)" }}>
                                {progInfo.code}
                              </span>
                              <span style={{ display: "block", fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                                {progInfo.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                              {subject.units || 3} Units
                            </span>
                            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--srcb-text-muted)" }}>
                              {subject.lectureHours || 3}h Lec
                              {isLab ? ` · ${subject.labHours}h Lab` : " · No Lab"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="pill pill--slate" style={{ fontSize: "0.78rem" }}>
                            {subject.semester || "1st Semester"}
                          </span>
                        </td>

                        <td>
                          {subject.instructor && subject.instructor !== "Unassigned" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: "var(--srcb-royal)",
                                  color: "#ffffff",
                                  fontSize: "0.68rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                }}
                              >
                                {subject.instructor.charAt(0)}
                              </div>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                {subject.instructor}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--srcb-text-muted)", fontStyle: "italic" }}>
                              Unassigned
                            </span>
                          )}
                        </td>

                        {canManage && (
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.78rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  borderRadius: 6,
                                  cursor: "pointer",
                                }}
                                title="Edit Major Subject"
                                aria-label={`Edit ${subject.code}`}
                                onClick={() => handleOpenEditSubject(subject)}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.78rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  borderRadius: 6,
                                  color: "var(--srcb-danger, #dc2626)",
                                  borderColor: "rgba(220, 38, 38, 0.35)",
                                  cursor: "pointer",
                                }}
                                title="Delete Major Subject"
                                aria-label={`Delete ${subject.code}`}
                                onClick={() => setSubjectToDelete(subject)}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* View Mode 2: Degree Courses Table */}
        {viewMode === "degree_courses" && (
          isFetching ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredCourses.length === 0 ? (
            <div className="empty-state">
              <GraduationCap size={36} color="var(--srcb-slate)" style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No degree courses registered for this program yet.</p>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                {query ? "Try clearing your search query" : "Click 'Add Degree Course' above to register a degree program."}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table" aria-label="Degree courses table">
                <thead>
                  <tr>
                    <th style={{ width: "130px" }}>Course Code</th>
                    <th>Degree Program Title</th>
                    <th>Department / Program</th>
                    <th>Duration</th>
                    <th>Cohort Sections</th>
                    {canManage && <th style={{ textAlign: "right", minWidth: "150px" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => {
                    const courseSections = sections.filter(
                      (s) => (s.course || s.course_code || "").toUpperCase() === course.code.toUpperCase()
                    );
                    const progMatch = programs.find((p) => p.code === course.programCode);

                    return (
                      <tr key={course.code}>
                        <td>
                          <span
                            className="pill pill--royal"
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {course.code}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "var(--srcb-text)", fontSize: "0.92rem" }}>
                            {course.name}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Building2 size={15} color="var(--srcb-slate)" />
                            <span>{progMatch ? progMatch.name : (course.programCode || "Collegiate Department")}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Clock size={15} color="var(--srcb-slate)" />
                            <span>{course.year || 4} Academic Years</span>
                          </div>
                        </td>
                        <td>
                          <span className="pill pill--navy">
                            <Layers size={13} /> {courseSections.length} Sections
                          </span>
                        </td>
                        {canManage && (
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.78rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  borderRadius: 6,
                                  cursor: "pointer",
                                }}
                                title="Edit Course"
                                aria-label={`Edit ${course.code}`}
                                onClick={() => handleOpenEditCourse(course)}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.78rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  borderRadius: 6,
                                  color: "var(--srcb-danger, #dc2626)",
                                  borderColor: "rgba(220, 38, 38, 0.35)",
                                  cursor: "pointer",
                                }}
                                title="Delete Course"
                                aria-label={`Delete ${course.code}`}
                                onClick={() => setCourseToDelete(course)}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {/* Add / Edit Major Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? `Edit Major Subject (${editingSubject.code})` : "Register Program Major Subject"}
        description="Configure official major subject details, academic program affiliation, and credit unit parameters."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Subject Code *
              </label>
              <input
                type="text"
                className="user-mgmt-modal-input"
                placeholder="e.g. IT101, BA101"
                value={subjectForm.code}
                disabled={Boolean(editingSubject)}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Major Subject Title *
              </label>
              <input
                type="text"
                className="user-mgmt-modal-input"
                placeholder="e.g. Computer Programming 1"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
              Assigned Academic Program *
            </label>
            <select
              value={subjectForm.programCode}
              onChange={(e) => setSubjectForm({ ...subjectForm, programCode: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)" }}
            >
              {ACADEMIC_PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Units *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={subjectForm.units}
                onChange={(e) => setSubjectForm({ ...subjectForm, units: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Lecture Hours
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={subjectForm.lectureHours}
                onChange={(e) => setSubjectForm({ ...subjectForm, lectureHours: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Lab Hours
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={subjectForm.labHours}
                onChange={(e) => setSubjectForm({ ...subjectForm, labHours: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Semester *
              </label>
              <select
                value={subjectForm.semester}
                onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)" }}
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Assigned Faculty Instructor
              </label>
              <select
                value={subjectForm.instructorId}
                onChange={(e) => setSubjectForm({ ...subjectForm, instructorId: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)" }}
              >
                <option value="">-- Unassigned --</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department || "Faculty"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button className="secondary-button" type="button" onClick={() => setIsSubjectModalOpen(false)}>
              Cancel
            </button>
            <button className="action-button" type="button" onClick={handleSaveSubject} disabled={loading}>
              {loading ? "Saving..." : editingSubject ? "Save Changes" : "Register Major Subject"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Degree Course Modal */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title={editingCourse ? `Edit Degree Course (${editingCourse.code})` : "Register New Degree Course"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
              Course Code (Acronym) *
            </label>
            <input
              type="text"
              className="user-mgmt-modal-input"
              placeholder="e.g. BSIT, BSBA, BSHM, BSCRIM"
              value={courseForm.code}
              disabled={Boolean(editingCourse)}
              onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
              Official Degree Title *
            </label>
            <input
              type="text"
              className="user-mgmt-modal-input"
              placeholder="e.g. Bachelor of Science in Information Technology"
              value={courseForm.name}
              onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Department / Program
              </label>
              <select
                value={courseForm.programCode}
                onChange={(e) => setCourseForm({ ...courseForm, programCode: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)" }}
              >
                {programs.length > 0 ? (
                  programs
                    .filter((p) => !["BSIT", "BSBA", "BSED", "BEED", "BSCRIM", "BSHM"].includes((p.code || "").toUpperCase()))
                    .map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} - {p.name}
                      </option>
                    ))
                ) : (
                  ACADEMIC_PROGRAMS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Degree Duration (Years) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={durationMode}
                onChange={(e) => {
                  setDurationMode(e.target.value);
                  if (e.target.value !== "other") {
                    setCourseForm({ ...courseForm, year: e.target.value });
                  }
                }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)" }}
              >
                <option value="4">4 Years (Standard Baccalaureate)</option>
                <option value="3">3 Years</option>
                <option value="5">5 Years</option>
                <option value="2">2 Years (Associate)</option>
                <option value="other">Other (Custom Duration)</option>
              </select>
              {durationMode === "other" && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, marginBottom: 3, color: "var(--srcb-navy)" }}>
                    Enter Custom Duration (Years) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="e.g. 6"
                    value={customDuration}
                    onChange={(e) => {
                      setCustomDuration(e.target.value);
                      setCourseForm({ ...courseForm, year: e.target.value });
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button className="secondary-button" type="button" onClick={() => setIsCourseModalOpen(false)}>
              Cancel
            </button>
            <button className="action-button" type="button" onClick={handleSaveCourse} disabled={loading}>
              {loading ? "Saving..." : editingCourse ? "Save Changes" : "Register Course"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Subject Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(subjectToDelete)}
        onCancel={() => setSubjectToDelete(null)}
        onConfirm={handleDeleteSubject}
        title={`Delete Major Subject ${subjectToDelete?.code}?`}
        message={`Are you sure you want to remove ${subjectToDelete?.name} (${subjectToDelete?.code})? This will unregister this major course from the curriculum.`}
        confirmLabel="Yes, Delete Major Subject"
        variant="danger"
        loading={loading}
      />

      {/* Force / Cascade Delete Subject Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(cascadeConfirmSubject)}
        onCancel={() => setCascadeConfirmSubject(null)}
        onConfirm={() => handleDeleteSubject(true)}
        title={`Force Delete Subject ${cascadeConfirmSubject?.subject.code}?`}
        message={`${cascadeConfirmSubject?.message} Do you want to force delete this subject and automatically remove all of its associated class schedule timetable entries?`}
        confirmLabel="Yes, Force Delete & Remove Schedules"
        variant="danger"
        loading={loading}
      />

      {/* Delete Course Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(courseToDelete)}
        onCancel={() => setCourseToDelete(null)}
        onConfirm={handleDeleteCourse}
        title={`Delete Degree Course ${courseToDelete?.code}?`}
        message={`Are you sure you want to remove ${courseToDelete?.name} (${courseToDelete?.code})? This will permanently unregister this degree offering.`}
        confirmLabel="Yes, Delete Course"
        variant="danger"
        loading={loading}
      />
    </motion.div>
  );
}
