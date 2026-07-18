import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

type SectionRow = {
  course: string;
  yearLevel: string;
  section: string;
  adviser: string;
  students: number;
  semester: string;
  schoolYear: string;
};

export function SectionsPage() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => setIsOpen(true)}
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
              </tr>
            </thead>
            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      No sections matched your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => (
                  <tr key={`${section.course}-${section.section}`}>
                    <td>{section.course}</td>
                    <td>{section.yearLevel}</td>
                    <td>{section.section}</td>
                    <td>{section.adviser}</td>
                    <td>{section.students}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title="Create section"
        description="Register a new class section for a course."
        onClose={() => setIsOpen(false)}
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
            onClick={() => setIsOpen(false)}
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
                await api.post("/sections", {
                  ...form,
                  students: Number(form.students),
                });
                fetchSections();
                toast.push("Section created", "success");
                setIsOpen(false);
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
                  err?.response?.data?.error || "Failed to create section",
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
