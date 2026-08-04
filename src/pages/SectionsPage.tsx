import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

type SectionRow = {
  id?: string;
  course: string;
  yearLevel: string;
  section: string;
  adviser: string;
  adviserId?: string;
  students: number;
  semester: string;
  schoolYear: string;
};

export function SectionsPage() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionRow | null>(null);
  const [form, setForm] = useState({
    courseCode: "",
    yearLevel: "1",
    sectionLabel: "A",
    adviserId: "",
    students: "30",
    semester: "1",
    schoolYear: "2026-2027",
  });
  const toast = useToast();

  const handleEdit = (section: SectionRow) => {
    setEditingSection(section);
    setForm({
      courseCode: section.course,
      yearLevel: section.yearLevel,
      sectionLabel: section.section,
      adviserId: section.adviserId || "",
      students: String(section.students),
      semester: section.semester,
      schoolYear: section.schoolYear,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("Remove this section and its current roster?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/sections/${encodeURIComponent(id)}`);
      toast.push("Section deleted successfully", "success");
      fetchSections();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to delete section",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const { selectedProgram, matchesProgram } = useProgramContext();

  const fetchSections = () => {
    api
      .get("/sections")
      .then((res: any) => setSections(res.data?.data || []))
      .catch(() => setSections([]));
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const filteredSections = sections.filter((section) => {
    const matchesQuery = [
      section.course,
      section.yearLevel,
      section.section,
      section.adviser,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    return (
      matchesQuery &&
      matchesProgram((section as any).program || selectedProgram.shortLabel)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Sections"
        description="Organize student sections by course, year level, and advisor."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Sections</strong>
          </>
        }
        helpText="Use sections to keep student cohorts and classroom assignments aligned."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => {
              setEditingSection(null);
              setForm({
                courseCode: "",
                yearLevel: "1",
                sectionLabel: "A",
                adviserId: "",
                students: "30",
                semester: "1",
                schoolYear: "2026-2027",
              });
              setIsOpen(true);
            }}
          >
            <Plus size={16} />
            Add Section
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Student organization</p>
            <h3>Section roster</h3>
          </div>
          <label className="topbar__search" aria-label="Search sections">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search section"
            />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Year</th>
                <th>Section</th>
                <th>Adviser</th>
                <th>Students</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      No sections matched your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => (
                  <tr
                    key={section.id || `${section.course}-${section.section}`}
                  >
                    <td>{section.course}</td>
                    <td>{section.yearLevel}</td>
                    <td>{section.section}</td>
                    <td>{section.adviser}</td>
                    <td>{section.students}</td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit Section"
                          onClick={() => handleEdit(section)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#4b5563",
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Delete Section"
                          onClick={() => handleDelete(section.id)}
                          disabled={deletingId === section.id}
                          style={{
                            background: "none",
                            border: "none",
                            cursor:
                              deletingId === section.id ? "wait" : "pointer",
                            color: "#dc2626",
                            opacity: deletingId === section.id ? 0.7 : 1,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title={editingSection ? "Edit section" : "Create section"}
        description={
          editingSection
            ? "Update class section registration details."
            : "Register a new class section for a course."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingSection(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="sectionCourse">Course Code</label>
            <input
              id="sectionCourse"
              value={form.courseCode}
              onChange={(event) =>
                setForm({ ...form, courseCode: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sectionYear">Year Level</label>
            <input
              id="sectionYear"
              value={form.yearLevel}
              onChange={(event) =>
                setForm({ ...form, yearLevel: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sectionLabel">Section Label</label>
            <input
              id="sectionLabel"
              value={form.sectionLabel}
              onChange={(event) =>
                setForm({ ...form, sectionLabel: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sectionAdviser">Adviser ID</label>
            <input
              id="sectionAdviser"
              value={form.adviserId}
              onChange={(event) =>
                setForm({ ...form, adviserId: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sectionStudents">Students</label>
            <input
              id="sectionStudents"
              type="number"
              value={form.students}
              onChange={(event) =>
                setForm({ ...form, students: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sectionSemester">Semester</label>
            <input
              id="sectionSemester"
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sectionSY">School Year</label>
            <input
              id="sectionSY"
              value={form.schoolYear}
              onChange={(event) =>
                setForm({ ...form, schoolYear: event.target.value })
              }
            />
          </div>
        </div>
        <div className="table-actions">
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
          <button
            type="button"
            className="action-button"
            disabled={loading}
            onClick={async () => {
              if (!form.courseCode || !form.sectionLabel) {
                toast.push(
                  "Course code and section label are required",
                  "error",
                );
                return;
              }
              setLoading(true);
              try {
                const payload = {
                  ...form,
                  students: Number(form.students),
                };
                if (editingSection && editingSection.id) {
                  await api.put(
                    `/sections/${encodeURIComponent(editingSection.id)}`,
                    payload,
                  );
                  toast.push("Section updated", "success");
                } else {
                  await api.post("/sections", payload);
                  toast.push("Section created", "success");
                }
                fetchSections();
                setIsOpen(false);
                setEditingSection(null);
                setForm({
                  courseCode: "",
                  yearLevel: "1",
                  sectionLabel: "A",
                  adviserId: "",
                  students: "30",
                  semester: "1",
                  schoolYear: "2026-2027",
                });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to save section",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Section"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
