import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  BookOpen,
  Hash,
  Award,
  Clock,
  Calendar,
  Layers,
  GraduationCap,
  UserCheck,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import { useAcademicPeriod } from "../contexts/AcademicPeriodContext";
import { getProgramLogo } from "../utils/programLogos";
import type { SubjectItem, ProgramItem, MajorItem, FacultyMember } from "../types";

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [programsList, setProgramsList] = useState<ProgramItem[]>([]);
  const [majorsList, setMajorsList] = useState<MajorItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);

  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const handleQueryChange = (val: string) => {
    setQuery(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) {
      next.set("q", val);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  };
  const [majorFilter, setMajorFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const { activeSemester } = useAcademicPeriod();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = role === "super_admin" || role === "admin";
  const isProgramHead = role === "program_head";

  const [form, setForm] = useState({
    code: "",
    name: "",
    units: "3",
    lectureHours: "2",
    labHours: "0",
    semester: activeSemester || "1st Semester",
    department: "Information Technology",
    program: selectedProgram.key !== "ALL" ? selectedProgram.key : "ITP",
    majorId: "",
    isMajor: true,
    instructorId: "",
    instructor: "Unassigned",
  });

  const toast = useToast();

  const fetchSubjects = async () => {
    setFetching(true);
    try {
      const res = await api.get("/subjects");
      setSubjects(res.data?.data || []);
    } catch {
      setSubjects([]);
    } finally {
      setFetching(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [pRes, mRes, fRes] = await Promise.all([
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/program-majors").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
      ]);
      setProgramsList(pRes.data?.data || []);
      setMajorsList(mRes.data?.data || []);
      setFacultyList(fRes.data?.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchDependencies();
  }, []);

  const canEditSubject = (subject: SubjectItem) => {
    if (isAdmin) return true;
    if (isProgramHead) {
      return (
        Boolean(subject.isMajor) &&
        matchesProgram(subject.program || subject.courseCode || subject.department)
      );
    }
    return false;
  };

  const handleEdit = (subject: SubjectItem) => {
    if (!canEditSubject(subject)) {
      toast.push("You do not have permission to edit this subject.", "error");
      return;
    }
    setEditingSubject(subject);
    setForm({
      code: subject.code,
      name: subject.name,
      units: String(subject.units),
      lectureHours: String(subject.lectureHours),
      labHours: String(subject.labHours),
      semester: subject.semester || activeSemester || "1st Semester",
      department: subject.department || (subject.isMajor ? (subject.program || "ITP") : "General Education"),
      program: subject.program || (subject.isMajor ? (selectedProgram.key !== "ALL" ? selectedProgram.key : "ITP") : "ALL"),
      majorId: (subject as any).majorId || "",
      isMajor: Boolean(subject.isMajor),
      instructorId: subject.instructorId || "",
      instructor: subject.instructor || "Unassigned",
    });
    setIsOpen(true);
  };

  const executeDelete = async () => {
    if (!subjectToDelete) return;
    if (!isAdmin) {
      toast.push("Only administrators can delete subjects from curriculum catalog.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/subjects/${encodeURIComponent(subjectToDelete.code)}`);
      toast.push("Subject deleted successfully", "success");
      fetchSubjects();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete subject", "error");
    } finally {
      setLoading(false);
      setSubjectToDelete(null);
    }
  };

  const handleSave = async () => {
    const cleanCode = form.code.trim().toUpperCase();
    const cleanName = form.name.trim();
    if (!cleanCode || !cleanName) {
      toast.push("Subject code and name are required", "error");
      return;
    }
    setLoading(true);
    try {
      const selectedFac = editingSubject ? facultyList.find((f) => f.id === form.instructorId) : null;
      const isMaj = Boolean(form.isMajor);
      const payload = {
        code: cleanCode,
        name: cleanName,
        units: Number(form.units) || 3,
        lectureHours: Number(form.lectureHours) || 0,
        labHours: Number(form.labHours) || 0,
        semester: form.semester || activeSemester || "1st Semester",
        department: isMaj ? (form.program || "ITP") : "General Education",
        program: isMaj ? (form.program || "ITP") : "ALL",
        programCode: isMaj ? (form.program || "ITP") : "ALL",
        majorId: isMaj && form.majorId ? form.majorId : null,
        isMajor: isMaj,
        instructorId: editingSubject ? (form.instructorId || undefined) : undefined,
        instructor: editingSubject ? (selectedFac ? selectedFac.name : form.instructor || "Unassigned") : "Unassigned",
      };

      if (editingSubject) {
        await api.put(`/subjects/${encodeURIComponent(editingSubject.code)}`, payload);
        toast.push("Subject updated successfully", "success");
      } else {
        if (!isAdmin) {
          toast.push("Only administrators can create new subjects in the catalog.", "error");
          setLoading(false);
          return;
        }
        await api.post("/subjects", payload);
        toast.push("Subject created successfully", "success");
      }
      fetchSubjects();
      setIsOpen(false);
      setEditingSubject(null);
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save subject", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const matchesQuery = [
      subject.code,
      subject.name,
      subject.instructor,
      subject.department,
      subject.program || "",
      (subject as any).majorName || "",
      (subject as any).majorCode || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesMajor =
      majorFilter === "All" ||
      (majorFilter === "Major" ? subject.isMajor : !subject.isMajor);

    const matchesProg = isProgramHead
      ? matchesProgram(subject.program || subject.department)
      : programFilter === "All"
        ? true
        : (() => {
          const subProg = String(
            subject.program ||
            subject.department ||
            ""
          ).toUpperCase().trim();
          const filterKey = programFilter.toUpperCase().trim();

          const IT_KEYS = ["ITP", "BSIT", "BSCS", "IT", "INFORMATION TECHNOLOGY", "COMPUTER"];
          const CRIM_KEYS = ["CJEP", "BSCRIM", "CRIMINOLOGY", "CRIM", "CRIMINAL JUSTICE"];
          const BUS_KEYS = ["BAP", "BSA", "BSBA", "BUSINESS", "ACCOUNTANCY", "ADMINISTRATION"];
          const HM_KEYS = ["HMP", "BSHM", "HOSPITALITY", "HOTEL", "TOURISM"];
          const EDUC_KEYS = ["TEP", "BSED", "BEED", "EDUCATION", "TEACHER"];

          const getFam = (k: string) => {
            if (IT_KEYS.some((x) => k.includes(x))) return "IT";
            if (CRIM_KEYS.some((x) => k.includes(x))) return "CRIM";
            if (BUS_KEYS.some((x) => k.includes(x))) return "BUS";
            if (HM_KEYS.some((x) => k.includes(x))) return "HM";
            if (EDUC_KEYS.some((x) => k.includes(x))) return "EDUC";
            return "";
          };

          if (subProg.includes(filterKey) || filterKey.includes(subProg)) return true;
          const f1 = getFam(filterKey);
          const f2 = getFam(subProg);
          return Boolean(f1 && f2 && f1 === f2);
        })();

    return matchesQuery && matchesMajor && matchesProg;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={
          isProgramHead
            ? `Program Subjects & Major Curriculum • ${selectedProgram.label}`
            : "Subjects & Curriculum Catalog"
        }
        description={
          isProgramHead
            ? `Manage major subjects, assigned instructors, and curriculum requirements for ${selectedProgram.label} (${selectedProgram.key || "ITP"}).`
            : "Track academic subjects, major vs general education classification, lecture and laboratory hours, and assigned instructors."
        }
        breadcrumbs={
          isProgramHead ? (
            <>
              <span>Home</span> <span>/</span> <span>{selectedProgram.shortLabel || "Program"}</span> <span>/</span> <strong>Subjects</strong>
            </>
          ) : (
            <>
              <span>Home</span> <span>/</span> <strong>Subjects</strong>
            </>
          )
        }
        helpText={
          isProgramHead
            ? "Program Heads manage Major Subject instructor assignments for their assigned program. General Education and cross-program minor subjects are managed globally by College Administrators."
            : "Course units determine student load limits and classroom hour calculations. Major subjects belong directly to Academic Programs and optional Majors."
        }
        actions={
          isAdmin ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSubject(null);
                const defaultProg = selectedProgram.key !== "ALL" ? selectedProgram.key : (programsList[0]?.code || "ITP");
                setForm({
                  code: "",
                  name: "",
                  units: "3",
                  lectureHours: "2",
                  labHours: "0",
                  semester: activeSemester || "1st Semester",
                  department: defaultProg,
                  program: defaultProg,
                  majorId: "",
                  isMajor: true,
                  instructorId: "",
                  instructor: "Unassigned",
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Add Subject
            </button>
          ) : undefined
        }
      />

      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Academic Catalog</p>
              {isAdmin && programFilter !== "All" && (
                <span
                  className="pill pill--royal"
                  style={{
                    fontSize: "0.74rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 700,
                  }}
                >
                  <img
                    src={getProgramLogo(programFilter)}
                    alt=""
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "3px",
                      objectFit: "contain",
                      background: "#ffffff",
                    }}
                  />
                  Filtering: {programFilter}
                </span>
              )}
            </div>
            <h3 style={{ margin: "4px 0 0" }}>Registered Subjects ({filteredSubjects.length})</h3>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Program Classification Filter for College Administrators */}
            {isAdmin && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
                Program:
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--srcb-border)",
                    background: "var(--srcb-surface-elevated, #ffffff)",
                    color: "var(--srcb-text)",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  aria-label="Filter subjects by Academic Program"
                >
                  <option value="All">All Academic Programs</option>
                  {programsList.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                  {programsList.length === 0 && (
                    <>
                      <option value="ITP">Information Technology Program (ITP)</option>
                      <option value="BAP">Business Administration Program (BAP)</option>
                      <option value="CJEP">Criminal Justice Education Program (CJEP)</option>
                      <option value="HMP">Hospitality Management Program (HMP)</option>
                      <option value="TEP">Teacher Education Program (TEP)</option>
                    </>
                  )}
                </select>
              </label>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Classification:
              <select
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--srcb-border)",
                  background: "var(--srcb-surface-elevated, #ffffff)",
                  color: "var(--srcb-text)",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <option value="All">All Classifications</option>
                <option value="Major">Major Subjects Only</option>
                <option value="Minor">Gen Ed / Minor Only</option>
              </select>
            </label>

            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <label className="topbar__search" aria-label="Search subjects" style={{ margin: 0, paddingRight: query ? 32 : 12 }}>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Search by code, subject name, instructor..."
                />
              </label>
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    color: "var(--srcb-text-muted, #94a3b8)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {fetching ? (
          <TableSkeleton rows={6} columns={7} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject Name</th>
                  <th>Units / Hours</th>
                  <th>Classification</th>
                  <th>Assigned Instructor</th>
                  <th>Program & Major</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state" style={{ padding: "36px 16px", textAlign: "center" }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No subjects matched your search filters.</p>
                        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                          Try adjusting your keywords, academic program, or switching the subject classification filter.
                        </p>
                        {(query || majorFilter !== "All" || programFilter !== "All") && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setQuery("");
                              setMajorFilter("All");
                              setProgramFilter("All");
                            }}
                            style={{ marginTop: 12, fontSize: "0.8rem" }}
                          >
                            Clear Search & Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subject) => {
                    const allowedToEdit = canEditSubject(subject);
                    const majCode = (subject as any).majorCode;
                    return (
                      <tr key={subject.code}>
                        <td>
                          <code>{subject.code}</code>
                        </td>
                        <td>
                          <strong>{subject.name}</strong>
                          {majCode && (
                            <span style={{ display: "block", fontSize: "0.74rem", color: "var(--srcb-royal)" }}>
                              Major: {majCode}
                            </span>
                          )}
                        </td>
                        <td>
                          <div><strong>{subject.units} units</strong></div>
                          <div style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                            {subject.lectureHours}h lec / {subject.labHours}h lab
                          </div>
                          {subject.semester && (
                            <div style={{ marginTop: 2 }}>
                              <span className="pill pill--navy" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                                {subject.semester}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`pill ${subject.isMajor ? "pill--royal" : "pill--slate"}`}>
                            {subject.isMajor ? "Major Subject" : "Gen Ed / Minor"}
                          </span>
                        </td>
                        <td>
                          {subject.instructor ? (
                            <span style={{ fontWeight: 600, color: "var(--srcb-navy)" }}>{subject.instructor}</span>
                          ) : (
                            <span className="muted" style={{ fontSize: "0.78rem" }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <img
                              src={getProgramLogo(subject.program || subject.department)}
                              alt="Program Logo"
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "5px",
                                objectFit: "contain",
                                background: "#ffffff",
                                padding: "1px",
                                border: "1px solid var(--srcb-border)",
                                boxShadow: "0 2px 4px rgba(15, 23, 42, 0.06)",
                                flexShrink: 0,
                              }}
                            />
                            <span>{subject.program || subject.department}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center" }}>
                            {allowedToEdit ? (
                              <button
                                type="button"
                                className="icon-button"
                                title="Edit Subject Assignment"
                                aria-label={`Edit ${subject.code} ${subject.name}`}
                                onClick={() => handleEdit(subject)}
                              >
                                <Edit2 size={15} />
                              </button>
                            ) : (
                              <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                                View Only
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                className="icon-button icon-button--danger"
                                title="Delete Subject"
                                aria-label={`Delete ${subject.code} ${subject.name}`}
                                onClick={() => setSubjectToDelete(subject)}
                              >
                                <Trash2 size={15} />
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
      </section>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isOpen}
        icon={<BookOpen size={20} />}
        title={editingSubject ? "Edit Academic Subject" : "Register New Subject"}
        eyebrow="Subject Catalog"
        onClose={() => {
          setIsOpen(false);
          setEditingSubject(null);
        }}
        description="Set course units, major classification, teaching hours, and program link."
      >
        <div className="form-grid">
          {/* Subject Code */}
          <div className="field-group">
            <label htmlFor="subjectCode">
              <Hash size={13} /> Subject Code <span className="required-asterisk">*</span>
            </label>
            <input
              id="subjectCode"
              value={form.code}
              disabled={!!editingSubject}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              placeholder="e.g. IT101, BA102, GE101, EDUC5"
              required
              aria-required="true"
            />
          </div>

          {/* Subject Title */}
          <div className="field-group">
            <label htmlFor="subjectName">
              <BookOpen size={13} /> Subject Title <span className="required-asterisk">*</span>
            </label>
            <input
              id="subjectName"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Computer Programming 1"
              required
              aria-required="true"
            />
          </div>

          {/* Subject Classification */}
          <div className="field-group">
            <label htmlFor="subjectIsMajor">
              <Layers size={13} /> Subject Classification <span className="required-asterisk">*</span>
            </label>
            <select
              id="subjectIsMajor"
              value={form.isMajor ? "true" : "false"}
              onChange={(e) => {
                const isMaj = e.target.value === "true";
                const prog = isMaj ? (programsList[0]?.code || "ITP") : "ALL";
                setForm({
                  ...form,
                  isMajor: isMaj,
                  lectureHours: isMaj ? "2" : "1.5",
                  labHours: "0",
                  program: prog,
                  majorId: "",
                  department: isMaj ? prog : "General Education",
                });
              }}
            >
              <option value="true">Major Subject (Program Specific)</option>
              <option value="false">General Education / Minor Subject (Universal)</option>
            </select>
          </div>

          {/* Academic Semester */}
          <div className="field-group">
            <label htmlFor="subjectSemester">
              <Calendar size={13} /> Academic Semester
            </label>
            <select
              id="subjectSemester"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          {/* Class Component Structure (Major vs Minor) */}
          {form.isMajor ? (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="subjectComponent">
                <Clock size={13} /> Class Component & Institutional Hours
              </label>
              <select
                id="subjectComponent"
                value={
                  Number(form.labHours) > 0 && Number(form.lectureHours) > 0
                    ? "LecLab"
                    : Number(form.labHours) > 0
                      ? "LabOnly"
                      : Number(form.lectureHours) === 2 && Number(form.labHours) === 0
                        ? "LecOnly"
                        : "Custom"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "LecOnly") {
                    setForm({ ...form, lectureHours: "2", labHours: "0", units: "3" });
                  } else if (val === "LabOnly") {
                    setForm({ ...form, lectureHours: "0", labHours: "3", units: "3" });
                  } else if (val === "LecLab") {
                    setForm({ ...form, lectureHours: "2", labHours: "3", units: "3" });
                  }
                }}
              >
                <option value="LecOnly">Major Lecture Only (2 Hours per session)</option>
                <option value="LabOnly">Major Laboratory Only (3 Hours per session)</option>
                <option value="LecLab">Major Lecture & Laboratory (2h Lec + 3h Lab)</option>
                <option value="Custom">Custom Teaching Hours</option>
              </select>
            </div>
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "10px 14px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: 8,
                color: "#059669",
                fontSize: "0.82rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>✓ Universal Minor / Gen Ed Subject: Scheduled in 1.5h sessions (e.g. 7:00-8:30 AM or 7:30-9:00 AM). Automatically accessible to all collegiate programs.</span>
            </div>
          )}

          {/* Credit Units */}
          <div className="field-group">
            <label htmlFor="subjectUnits">
              <Award size={13} /> Credit Units
            </label>
            <input
              id="subjectUnits"
              type="number"
              min={1}
              max={12}
              value={form.units}
              onChange={(event) => setForm({ ...form, units: event.target.value })}
            />
          </div>

          {/* Lecture Hours */}
          <div className="field-group">
            <label htmlFor="subjectLec">
              <Clock size={13} /> Lecture Hours {form.isMajor ? "(2h per lecture session)" : "(1.5h session)"}
            </label>
            <input
              id="subjectLec"
              type="number"
              step="0.5"
              min={0}
              max={10}
              value={form.lectureHours}
              onChange={(event) => setForm({ ...form, lectureHours: event.target.value })}
            />
          </div>

          {/* Laboratory Hours */}
          <div className="field-group">
            <label htmlFor="subjectLab">
              <Clock size={13} /> Laboratory Hours {form.isMajor ? "(3h per lab session)" : "(0 for minor)"}
            </label>
            <input
              id="subjectLab"
              type="number"
              step="0.5"
              min={0}
              max={10}
              value={form.labHours}
              disabled={!form.isMajor}
              onChange={(event) => setForm({ ...form, labHours: event.target.value })}
            />
          </div>

          {/* Program & Major (Only when Major) */}
          {form.isMajor && (
            <>
              <div className="field-group">
                <label htmlFor="subjectProgram">
                  <GraduationCap size={13} /> Academic Program <span className="required-asterisk">*</span>
                </label>
                <select
                  id="subjectProgram"
                  value={form.program}
                  onChange={(e) => {
                    const newProg = e.target.value;
                    setForm({
                      ...form,
                      program: newProg,
                      majorId: "",
                      department: newProg,
                    });
                  }}
                >
                  {programsList.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="subjectMajor">
                  <Layers size={13} /> Major (Optional / Nullable)
                </label>
                <select
                  id="subjectMajor"
                  value={form.majorId}
                  onChange={(e) => setForm({ ...form, majorId: e.target.value })}
                >
                  <option value="">None / Program-Wide Subject</option>
                  {majorsList
                    .filter((m) => !form.program || m.programCode === form.program || (m as any).program_code === form.program)
                    .map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.code} - {m.name}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {/* Assigned Instructor (strictly only when editing an existing subject) */}
          {editingSubject && (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="subjectInstructor">
                <UserCheck size={13} /> Assigned Instructor
              </label>
              <select
                id="subjectInstructor"
                value={form.instructorId}
                onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department} · {f.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Live Timetable Preview */}
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "var(--srcb-surface-alt, #f8fafc)",
            borderRadius: 8,
            border: "1px solid var(--srcb-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontSize: "0.8rem",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--srcb-navy, #0f2c59)", display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={13} color="var(--srcb-royal, #2563eb)" /> Timetable Session Duration:
          </span>
          {!form.isMajor ? (
            <span className="pill pill--amber" style={{ fontWeight: 700, fontSize: "0.75rem" }}>
              Minor / Gen Ed: 1 hr 30 mins (1.5h session)
            </span>
          ) : Number(form.labHours) > 0 && Number(form.lectureHours) > 0 ? (
            <div style={{ display: "flex", gap: 6 }}>
              <span className="pill pill--blue" style={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Major Lec: 2 hrs
              </span>
              <span className="pill pill--purple" style={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Major Lab: 3 hrs
              </span>
            </div>
          ) : Number(form.labHours) > 0 ? (
            <span className="pill pill--purple" style={{ fontWeight: 700, fontSize: "0.75rem" }}>
              Major Lab: 3 hrs session
            </span>
          ) : (
            <span className="pill pill--blue" style={{ fontWeight: 700, fontSize: "0.75rem" }}>
              Major Lec: 2 hrs session
            </span>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="cancel-button"
            onClick={() => {
              setIsOpen(false);
              setEditingSubject(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={
              loading ||
              !form.code.trim() ||
              !form.name.trim() ||
              (form.isMajor && !form.program)
            }
            onClick={handleSave}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? "Saving…" : editingSubject ? "Update Subject" : "Register Subject"}</span>
          </button>
        </div>
      </Modal>

      {/* Delete Subject Confirmation Modal (Heuristic 3 & 5) */}
      <ConfirmModal
        isOpen={Boolean(subjectToDelete)}
        title="Remove Subject from Catalog"
        variant="danger"
        confirmLabel="Delete Subject"
        loading={loading}
        onCancel={() => setSubjectToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to delete <strong>{subjectToDelete?.code} - {subjectToDelete?.name}</strong> from the institutional curriculum catalog?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> Make sure any scheduled class blocks using this subject are updated accordingly.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
