import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState, useMemo } from "react";
import { api } from "../data/apiClient";
import { storage } from "../data/storage";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2, GraduationCap } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import type { SubjectItem } from "../types";

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [majorFilter, setMajorFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canEdit = role === "super_admin" || role === "admin" || role === "program_head";

  const facultyList = useMemo(() => storage.getFaculty(), []);
  const programsList = useMemo(() => storage.getPrograms(), []);

  const [form, setForm] = useState({
    code: "",
    name: "",
    units: "3",
    lectureHours: "2",
    labHours: "3",
    semester: "1st Semester",
    department: "Information Technology",
    program: selectedProgram.key || "BSIT",
    isMajor: true,
    instructorId: "",
    instructor: "",
  });
  const toast = useToast();

  const fetchSubjects = () => {
    api
      .get("/subjects")
      .then((res: any) => setSubjects(res.data?.data || []))
      .catch(() => setSubjects([]));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleEdit = (subject: SubjectItem) => {
    if (!canEdit) return;
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
      isMajor: Boolean(subject.isMajor),
      instructorId: subject.instructorId || "",
      instructor: subject.instructor || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (code: string) => {
    if (!canEdit) return;
    if (!window.confirm("Remove this subject from curriculum catalog?")) return;

    setDeletingCode(code);
    try {
      await api.delete(`/subjects/${encodeURIComponent(code)}`);
      toast.push("Subject deleted successfully", "success");
      fetchSubjects();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete subject", "error");
    } finally {
      setDeletingCode(null);
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
        isMajor: Boolean(form.isMajor),
        instructorId: form.instructorId || undefined,
        instructor: selectedFac ? selectedFac.name : form.instructor || "Unassigned",
      };

      if (editingSubject) {
        await api.put(`/subjects/${encodeURIComponent(editingSubject.code)}`, payload);
        toast.push("Subject updated successfully", "success");
      } else {
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
      subject.department,
      subject.instructor,
      subject.program || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesMajor =
      majorFilter === "All" ||
      (majorFilter === "Major" ? subject.isMajor : !subject.isMajor);

    const matchesProg = role === "program_head"
      ? matchesProgram(subject.program || subject.department)
      : true;

    return matchesQuery && matchesMajor && matchesProg;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Subjects & Curriculum Catalog"
        description="Track academic subjects, major vs general education classification, lecture and laboratory hours, and assigned instructors."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Subjects</strong>
          </>
        }
        helpText="Program Heads can schedule their assigned program's major subjects directly into the class timetables."
        actions={
          canEdit ? (
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
            <p className="eyebrow">Academic Catalog</p>
            <h3>Registered Subjects ({filteredSubjects.length})</h3>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Classification:
              <select
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="All">All Subjects</option>
                <option value="Major">Major Subjects Only</option>
                <option value="Minor">General / Minor</option>
              </select>
            </label>

            <label className="topbar__search" aria-label="Search subjects">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search code, subject, instructor..."
              />
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Name</th>
                <th>Units</th>
                <th>Lec / Lab Hours</th>
                <th>Classification</th>
                <th>Program / Dept</th>
                <th>Assigned Instructor</th>
                {canEdit && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7}>
                    <div className="empty-state">No subjects matched your search filters.</div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject.code}>
                    <td>
                      <code>{subject.code}</code>
                    </td>
                    <td>
                      <strong>{subject.name}</strong>
                    </td>
                    <td>{subject.units} Units</td>
                    <td>
                      {subject.lectureHours}h Lec / {subject.labHours}h Lab
                    </td>
                    <td>
                      <span className={`pill ${subject.isMajor ? "pill--royal" : "pill--slate"}`}>
                        {subject.isMajor ? "Major Subject" : "Gen Ed / Minor"}
                      </span>
                    </td>
                    <td>{subject.program || subject.department}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <GraduationCap size={15} color="#0d5499" />
                        <span>{subject.instructor || "Unassigned"}</span>
                      </div>
                    </td>
                    {canEdit && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit Subject"
                            onClick={() => handleEdit(subject)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            title="Delete Subject"
                            onClick={() => handleDelete(subject.code)}
                            disabled={deletingCode === subject.code}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isOpen && canEdit}
        title={editingSubject ? "Edit Academic Subject" : "Register New Subject"}
        onClose={() => {
          setIsOpen(false);
          setEditingSubject(null);
        }}
        description="Set course units, major classification, teaching hours, and program link."
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="subjectCode">Subject Code</label>
            <input
              id="subjectCode"
              value={form.code}
              disabled={!!editingSubject}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="e.g. IT101, BA102"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="subjectName">Subject Title</label>
            <input
              id="subjectName"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Computer Programming 1"
              required
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
    </motion.div>
  );
}
