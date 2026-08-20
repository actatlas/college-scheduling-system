import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState, useMemo } from "react";
import { api } from "../data/apiClient";
import { storage } from "../data/storage";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2, Users } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import type { SectionItem } from "../types";

export function SectionsPage() {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canEdit = role === "super_admin" || role === "admin" || role === "program_head";

  const facultyList = useMemo(() => storage.getFaculty(), []);
  const programsList = useMemo(() => storage.getPrograms(), []);

  const [form, setForm] = useState({
    course: "BSIT",
    program: selectedProgram.key || "BSIT",
    yearLevel: "1",
    section: "BSIT 1-A",
    adviserId: "",
    adviser: "",
    students: "35",
    semester: "1st Semester",
    schoolYear: "2026-2027",
  });
  const toast = useToast();

  const fetchSections = () => {
    api
      .get("/sections")
      .then((res: any) => setSections(res.data?.data || []))
      .catch(() => setSections([]));
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleEdit = (section: SectionItem) => {
    if (!canEdit) return;
    setEditingSection(section);
    setForm({
      course: section.course,
      program: section.program || section.course || selectedProgram.key || "BSIT",
      yearLevel: section.yearLevel,
      section: section.section,
      adviserId: section.adviserId || "",
      adviser: section.adviser,
      students: String(section.students),
      semester: section.semester,
      schoolYear: section.schoolYear,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!canEdit || !id) return;
    if (!window.confirm("Remove this section and its current roster?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/sections/${encodeURIComponent(id)}`);
      toast.push("Section deleted successfully", "success");
      fetchSections();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete section", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!form.section || !form.course) {
      toast.push("Program and Section name are required", "error");
      return;
    }
    setLoading(true);
    try {
      const selectedAdviser = facultyList.find((f) => f.id === form.adviserId);
      const payload: SectionItem = {
        course: form.course,
        program: form.program,
        yearLevel: form.yearLevel,
        section: form.section,
        adviserId: form.adviserId || undefined,
        adviser: selectedAdviser ? selectedAdviser.name : form.adviser || "Unassigned",
        students: Number(form.students) || 30,
        semester: form.semester,
        schoolYear: form.schoolYear,
      };

      if (editingSection && editingSection.id) {
        await api.put(`/sections/${encodeURIComponent(editingSection.id)}`, payload);
        toast.push("Section updated successfully", "success");
      } else {
        await api.post("/sections", payload);
        toast.push("Section created successfully", "success");
      }
      fetchSections();
      setIsOpen(false);
      setEditingSection(null);
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save section", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredSections = sections.filter((section) => {
    const matchesQuery = [
      section.course,
      section.yearLevel,
      section.section,
      section.adviser,
      section.program || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesProg = role === "program_head"
      ? matchesProgram(section.program || section.course)
      : true;

    return matchesQuery && matchesProg;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Class Sections & Cohorts"
        description="Organize student cohorts by academic program, year level, faculty adviser, and student enrollment count."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Sections</strong>
          </>
        }
        helpText="Sections serve as the cohort units for weekly class schedules and synchronized examination scheduling."
        actions={
          canEdit ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSection(null);
                setForm({
                  course: selectedProgram.key || "BSIT",
                  program: selectedProgram.key || "BSIT",
                  yearLevel: "1",
                  section: `${selectedProgram.shortLabel || "BSIT"} 1-A`,
                  adviserId: facultyList[0]?.id || "",
                  adviser: facultyList[0]?.name || "",
                  students: "35",
                  semester: "1st Semester",
                  schoolYear: "2026-2027",
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Add Section
            </button>
          ) : undefined
        }
      />

      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Student Organization</p>
            <h3>Active Section Roster ({filteredSections.length})</h3>
          </div>
          <label className="topbar__search" aria-label="Search sections">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by section, adviser, course..."
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Program / Course</th>
                <th>Year Level</th>
                <th>Section Cohort</th>
                <th>Faculty Adviser</th>
                <th>Enrolled Students</th>
                <th>Term & SY</th>
                {canEdit && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6}>
                    <div className="empty-state">No sections matched your search criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => (
                  <tr key={section.id || `${section.course}-${section.section}`}>
                    <td>
                      <span className="pill pill--royal">{section.program || section.course}</span>
                    </td>
                    <td>Year {section.yearLevel}</td>
                    <td>
                      <strong>{section.section}</strong>
                    </td>
                    <td>{section.adviser}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Users size={14} color="#0d5499" />
                        <span>{section.students} Students</span>
                      </div>
                    </td>
                    <td>
                      {section.semester} ({section.schoolYear})
                    </td>
                    {canEdit && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit Section"
                            onClick={() => handleEdit(section)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            title="Delete Section"
                            onClick={() => handleDelete(section.id)}
                            disabled={deletingId === section.id}
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

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={isOpen && canEdit}
        title={editingSection ? "Edit Section Details" : "Register Class Section"}
        description="Configure student cohort, academic program, year level, and adviser."
        onClose={() => {
          setIsOpen(false);
          setEditingSection(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="sectionProgram">Academic Program</label>
            <select
              id="sectionProgram"
              value={form.program}
              onChange={(e) => {
                const prog = e.target.value;
                setForm({
                  ...form,
                  program: prog,
                  course: prog,
                  section: !editingSection ? `${prog} ${form.yearLevel}-A` : form.section,
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
            <label htmlFor="sectionYear">Year Level</label>
            <select
              id="sectionYear"
              value={form.yearLevel}
              onChange={(e) => setForm({ ...form, yearLevel: e.target.value })}
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="sectionLabel">Section Name / Label</label>
            <input
              id="sectionLabel"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder="e.g. BSIT 1-A, BSBA 2-B"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="sectionStudents">Student Headcount</label>
            <input
              id="sectionStudents"
              type="number"
              value={form.students}
              onChange={(e) => setForm({ ...form, students: e.target.value })}
            />
          </div>

          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="sectionAdviser">Section Adviser</label>
            <select
              id="sectionAdviser"
              value={form.adviserId}
              onChange={(e) => setForm({ ...form, adviserId: e.target.value })}
            >
              <option value="">Select adviser</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.department} · {f.status})
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="sectionSemester">Semester</label>
            <input
              id="sectionSemester"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="sectionSY">School Year</label>
            <input
              id="sectionSY"
              value={form.schoolYear}
              onChange={(e) => setForm({ ...form, schoolYear: e.target.value })}
            />
          </div>
        </div>

        <div className="table-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsOpen(false);
              setEditingSection(null);
            }}
          >
            Cancel
          </button>
          <button type="button" className="action-button" disabled={loading} onClick={handleSave}>
            {loading ? "Saving…" : "Save Section"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
