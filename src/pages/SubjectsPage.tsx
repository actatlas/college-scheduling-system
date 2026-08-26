import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { getProgramLogo } from "../utils/programLogos";
import type { SubjectItem, CourseItem, ProgramItem, FacultyMember } from "../types";

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [coursesList, setCoursesList] = useState<CourseItem[]>([]);
  const [programsList, setProgramsList] = useState<ProgramItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);
  const [query, setQuery] = useState("");
  const [majorFilter, setMajorFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = role === "super_admin" || role === "admin";
  const isProgramHead = role === "program_head";

  const [form, setForm] = useState({
    code: "",
    name: "",
    units: "3",
    lectureHours: "3",
    labHours: "0",
    semester: "First Semester",
    department: "Information Technology",
    program: selectedProgram.key || "BSIT",
    courseCode: selectedProgram.key || "BSIT",
    isMajor: true,
    instructorId: "",
    instructor: "",
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
      const [cRes, pRes, fRes] = await Promise.all([
        api.get("/courses").catch(() => ({ data: { data: [] } })),
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
      ]);
      setCoursesList(cRes.data?.data || []);
      setProgramsList(pRes.data?.data || []);
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
      semester: subject.semester,
      department: subject.department,
      program: subject.program || selectedProgram.key || "BSIT",
      courseCode: subject.courseCode || subject.program || "BSIT",
      isMajor: Boolean(subject.isMajor),
      instructorId: subject.instructorId || "",
      instructor: subject.instructor || "",
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
    if (!form.code || !form.name) {
      toast.push("Subject code and name are required", "error");
      return;
    }
    setLoading(true);
    try {
      const selectedFac = facultyList.find((f) => f.id === form.instructorId);
      const payload: SubjectItem = {
        code: form.code,
        name: form.name,
        units: Number(form.units) || 3,
        lectureHours: Number(form.lectureHours) || 0,
        labHours: Number(form.labHours) || 0,
        semester: form.semester,
        department: form.department,
        program: form.program,
        courseCode: form.courseCode,
        isMajor: Boolean(form.isMajor),
        instructorId: form.instructorId || undefined,
        instructor: selectedFac ? selectedFac.name : form.instructor || "Unassigned",
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
              subject.courseCode ||
              ""
            ).toUpperCase().trim();
            const filterKey = programFilter.toUpperCase().trim();

            const IT_KEYS = ["ITP", "BSIT", "BSCS", "IT", "INFORMATION TECHNOLOGY", "COMPUTER"];
            const CRIM_KEYS = ["CJEP", "BSCRIM", "CRIMINOLOGY", "CRIM", "CRIMINAL JUSTICE"];
            const BUS_KEYS = ["BSA", "BSBA", "BUSINESS", "ACCOUNTANCY", "ADMINISTRATION"];
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
            : "Course units determine student load limits and classroom hour calculations. Major subjects require departmental allocation."
        }
        actions={
          isAdmin ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSubject(null);
                setForm({
                  code: "",
                  name: "",
                  units: "3",
                  lectureHours: "2",
                  labHours: "3",
                  semester: "1st Semester",
                  department: "Information Technology",
                  program: selectedProgram.key || "BSIT",
                  courseCode: coursesList[0]?.code || "BSIT",
                  isMajor: true,
                  instructorId: facultyList[0]?.id || "",
                  instructor: facultyList[0]?.name || "",
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
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
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
                      <option value="ITP">Information Technology Program (ITP / BSIT)</option>
                      <option value="BSA">Business Administration (BSA / BSBA)</option>
                      <option value="CJEP">Criminal Justice Education Program (CJEP / BSCrim)</option>
                      <option value="HMP">Hospitality Management Program (HMP / BSHM)</option>
                      <option value="TEP">Teacher Education Program (TEP / BSED / BEED)</option>
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
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <option value="All">All Classifications</option>
                <option value="Major">Major Subjects Only</option>
                <option value="Minor">Gen Ed / Minor Only</option>
              </select>
            </label>

            <label className="topbar__search" aria-label="Search subjects">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by code, subject name, instructor..."
              />
            </label>
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
                  <th>Program / Dept</th>
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
                    return (
                      <tr key={subject.code}>
                        <td>
                          <code>{subject.code}</code>
                        </td>
                        <td>
                          <strong>{subject.name}</strong>
                        </td>
                        <td>
                          {subject.units} units ({subject.lectureHours} lec / {subject.labHours} lab)
                        </td>
                        <td>
                          <span className={`pill ${subject.isMajor ? "pill--royal" : "pill--slate"}`}>
                            {subject.isMajor ? "Major Subject" : "Gen Ed / Minor"}
                          </span>
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
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                              >
                                <Edit2 size={16} />
                              </button>
                            ) : (
                              <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                                View Only
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                className="icon-button"
                                title="Delete Subject"
                                aria-label={`Delete ${subject.code} ${subject.name}`}
                                onClick={() => setSubjectToDelete(subject)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                              >
                                <Trash2 size={16} />
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
        title={editingSubject ? "Edit Academic Subject" : "Register New Subject"}
        onClose={() => {
          setIsOpen(false);
          setEditingSubject(null);
        }}
        description="Set course units, major classification, teaching hours, and program link."
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="subjectCode">
              Subject Code <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="subjectCode"
              value={form.code}
              disabled={!!editingSubject}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="e.g. IT101, BA102"
              required
              aria-required="true"
            />
          </div>

          <div className="field-group">
            <label htmlFor="subjectName">
              Subject Title <span style={{ color: "#dc2626" }}>*</span>
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

          <div className="field-group">
            <label htmlFor="subjectUnits">Units</label>
            <input
              id="subjectUnits"
              type="number"
              value={form.units}
              onChange={(event) => setForm({ ...form, units: event.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="subjectLec">Lecture Hours</label>
            <input
              id="subjectLec"
              type="number"
              value={form.lectureHours}
              onChange={(event) => setForm({ ...form, lectureHours: event.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="subjectLab">Lab Hours</label>
            <input
              id="subjectLab"
              type="number"
              value={form.labHours}
              onChange={(event) => setForm({ ...form, labHours: event.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="subjectIsMajor">Subject Classification</label>
            <select
              id="subjectIsMajor"
              value={form.isMajor ? "true" : "false"}
              onChange={(e) => setForm({ ...form, isMajor: e.target.value === "true" })}
            >
              <option value="true">Major Subject (Program Specific)</option>
              <option value="false">General Education / Minor</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="subjectCourse">Course / Major Degree</label>
            <select
              id="subjectCourse"
              value={form.courseCode}
              onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
            >
              <option value="">General / All Courses</option>
              {coursesList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="subjectProgram">Program</label>
            <select
              id="subjectProgram"
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value })}
            >
              {programsList.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="subjectInstructor">Default Instructor</label>
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
        </div>

        <div className="table-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsOpen(false);
              setEditingSubject(null);
            }}
          >
            Cancel
          </button>
          <button type="button" className="action-button" disabled={loading} onClick={handleSave}>
            {loading ? "Saving…" : "Save Subject"}
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
            <span style={{ fontSize: "0.82rem", color: "#dc2626" }}>
              ⚠️ Make sure any scheduled class blocks using this subject are updated accordingly.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
