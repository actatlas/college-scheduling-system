import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

const getRole = () =>
  (localStorage.getItem("userRole") || "admin").toLowerCase();

type SubjectRow = {
  code: string;
  name: string;
  units: number;
  lectureHours: number;
  labHours: number;
  semester: string;
  department: string;
  instructor: string;
  instructorId?: string;
};

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null);
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

  const role = getRole();
  const isAdmin = role === "admin";

  const handleEdit = (subject: SubjectRow) => {
    if (!isAdmin) return;
    setEditingSubject(subject);

    setForm({
      code: subject.code,
      name: subject.name,
      units: String(subject.units),
      lectureHours: String(subject.lectureHours),
      labHours: String(subject.labHours),
      semester: subject.semester,
      department: subject.department,
      instructorId: subject.instructorId || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (code: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Remove this subject from the catalog?")) return;

    setDeletingCode(code);
    try {
      await api.delete(`/subjects/${encodeURIComponent(code)}`);
      toast.push("Subject deleted successfully", "success");
      fetchSubjects();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to delete subject",
        "error",
      );
    } finally {
      setDeletingCode(null);
    }
  };

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
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Subjects</strong>
          </>
        }
        helpText="Add subjects once and reuse them when building sections and schedules."
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
                  lectureHours: "3",
                  labHours: "0",
                  semester: "1",
                  department: "",
                  instructorId: "",
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
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6}>
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
                    {isAdmin && (
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
                            title="Edit Subject"
                            onClick={() => handleEdit(subject)}
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
                            title="Delete Subject"
                            onClick={() => handleDelete(subject.code)}
                            disabled={deletingCode === subject.code}
                            style={{
                              background: "none",
                              border: "none",
                              cursor:
                                deletingCode === subject.code
                                  ? "wait"
                                  : "pointer",
                              color: "#dc2626",
                              opacity: deletingCode === subject.code ? 0.7 : 1,
                            }}
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

      <Modal
        isOpen={isOpen && isAdmin}
        title={editingSubject ? "Edit subject" : "Create subject"}
        onClose={() => {
          setIsOpen(false);
          setEditingSubject(null);
        }}
        description={
          editingSubject
            ? "Update academic subject registration details."
            : "Add a new academic subject to the registration catalog."
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="subjectCode">Subject Code</label>
            <input
              id="subjectCode"
              value={form.code}
              disabled={!!editingSubject}
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
            disabled={loading}
            onClick={async () => {
              if (!form.code || !form.name) {
                toast.push("Subject code and name are required", "error");
                return;
              }
              setLoading(true);
              try {
                const payload = {
                  ...form,
                  units: Number(form.units),
                  lectureHours: Number(form.lectureHours),
                  labHours: Number(form.labHours),
                };
                if (editingSubject) {
                  await api.put(
                    `/subjects/${encodeURIComponent(editingSubject.code)}`,
                    payload,
                  );
                  toast.push("Subject updated", "success");
                } else {
                  await api.post("/subjects", payload);
                  toast.push("Subject created", "success");
                }
                fetchSubjects();
                setIsOpen(false);
                setEditingSubject(null);
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
                  err?.response?.data?.error || "Failed to save subject",
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
