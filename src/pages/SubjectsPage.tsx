import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

type SubjectRow = {
  code: string;
  name: string;
  units: number;
  lectureHours: number;
  labHours: number;
  semester: string;
  department: string;
  instructor: string;
};

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    units: "3",
    lectureHours: "3",
    labHours: "0",
    semester: "1",
    department: "",
    instructorId: "",
  });
  const toast = useToast();
  const { selectedProgram, matchesProgram } = useProgramContext();

  const fetchSubjects = () => {
    api
      .get("/subjects")
      .then((res: any) => setSubjects(res.data?.data || []))
      .catch(() => setSubjects([]));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter((subject) => {
    const matchesQuery = [
      subject.code,
      subject.name,
      subject.department,
      subject.instructor,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    return (
      matchesQuery &&
      matchesProgram((subject as any).program || selectedProgram.shortLabel)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Subjects"
        description="Track learning units, lecture hours, lab hours, and instructors."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} />
            Add Subject
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Curriculum registry</p>
            <h3>Subject catalog</h3>
          </div>
          <label className="topbar__search" aria-label="Search subjects">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subject"
            />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject</th>
                <th>Units</th>
                <th>Lecture</th>
                <th>Lab</th>
                <th>Instructor</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      No subjects matched your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject.code}>
                    <td>{subject.code}</td>
                    <td>{subject.name}</td>
                    <td>{subject.units}</td>
                    <td>{subject.lectureHours}</td>
                    <td>{subject.labHours}</td>
                    <td>{subject.instructor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title="Create subject"
        description="Add a new academic subject to the registration catalog."
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="subjectCode">Subject Code</label>
            <input
              id="subjectCode"
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectName">Subject Name</label>
            <input
              id="subjectName"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectUnits">Units</label>
            <input
              id="subjectUnits"
              type="number"
              value={form.units}
              onChange={(event) =>
                setForm({ ...form, units: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectLecture">Lecture Hours</label>
            <input
              id="subjectLecture"
              type="number"
              value={form.lectureHours}
              onChange={(event) =>
                setForm({ ...form, lectureHours: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectLab">Lab Hours</label>
            <input
              id="subjectLab"
              type="number"
              value={form.labHours}
              onChange={(event) =>
                setForm({ ...form, labHours: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectSemester">Semester</label>
            <input
              id="subjectSemester"
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectDept">Program / Department</label>
            <input
              id="subjectDept"
              value={form.department}
              onChange={(event) =>
                setForm({ ...form, department: event.target.value })
              }
              placeholder="e.g. Information Technology"
            />
          </div>
          <div className="field-group">
            <label htmlFor="subjectInstructor">Instructor ID</label>
            <input
              id="subjectInstructor"
              value={form.instructorId}
              onChange={(event) =>
                setForm({ ...form, instructorId: event.target.value })
              }
              placeholder="Enter faculty ID"
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
              if (!form.code || !form.name) {
                toast.push("Subject code and name are required", "error");
                return;
              }
              setLoading(true);
              try {
                await api.post("/subjects", {
                  ...form,
                  units: Number(form.units),
                  lectureHours: Number(form.lectureHours),
                  labHours: Number(form.labHours),
                });
                fetchSubjects();
                toast.push("Subject created", "success");
                setIsOpen(false);
                setForm({
                  code: "",
                  name: "",
                  units: "3",
                  lectureHours: "3",
                  labHours: "0",
                  semester: "1",
                  department: "",
                  instructorId: "",
                });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to create subject",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Subject"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
