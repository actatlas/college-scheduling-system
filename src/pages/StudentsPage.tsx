import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";

type StudentRow = {
  id: string;
  userId: string;
  studentId: string;
  name: string;
  email: string;
  programCode: string;
  yearLevel: string;
  sectionId: string;
  sectionLabel: string;
  status: string;
};

type CourseOption = {
  code: string;
  name: string;
};

type SectionOption = {
  id: string;
  course: string;
  yearLevel: string;
  section: string;
};

export function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    programCode: "",
    yearLevel: "First Year",
    sectionId: "",
    status: "active",
  });

  const toast = useToast();

  const fetchStudents = async () => {
    try {
      const res = await api.get("/students");
      setStudents(res.data?.data || []);
    } catch {
      setStudents([]);
    }
  };

  const fetchCoursesAndSections = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get("/courses"),
        api.get("/sections"),
      ]);
      setCourses(cRes.data?.data || []);
      setSections(sRes.data?.data || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCoursesAndSections();
  }, []);

  // Filter sections that match student's program and year level
  const filteredSectionsForStudent = sections.filter((s) => {
    const pCode = editingStudent ? form.programCode : form.programCode;
    const yLvl = editingStudent ? form.yearLevel : form.yearLevel;

    // Normalize year level comparisons (e.g. "1" or "First Year" vs "1st Year" etc.)
    const matchesProgram =
      String(s.course).toLowerCase() === String(pCode).toLowerCase();

    // Normalize Year levels
    const normalizeYear = (yr: string) => {
      const y = yr.toLowerCase();
      if (y.includes("first") || y === "1") return "1";
      if (y.includes("second") || y === "2") return "2";
      if (y.includes("third") || y === "3") return "3";
      if (y.includes("fourth") || y === "4") return "4";
      if (y.includes("fifth") || y === "5") return "5";
      return y;
    };

    const matchesYear = normalizeYear(s.yearLevel) === normalizeYear(yLvl);
    return matchesProgram && matchesYear;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this student record from the system?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/students/${id}`);
      toast.push("Student deleted successfully", "success");
      fetchStudents();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to delete student",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (student: StudentRow) => {
    setEditingStudent(student);
    setForm({
      name: student.name,
      email: student.email,
      password: "", // do not populate password
      studentId: student.studentId,
      programCode: student.programCode,
      yearLevel: student.yearLevel,
      sectionId: student.sectionId || "",
      status: student.status,
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.push("Name and Email are required", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, {
          ...form,
          sectionId: form.sectionId ? Number(form.sectionId) : null,
        });
        toast.push("Student updated successfully", "success");
      } else {
        await api.post("/students", {
          ...form,
          password: form.password || undefined,
          sectionId: form.sectionId ? Number(form.sectionId) : null,
        });
        toast.push("Student registered successfully", "success");
      }
      setIsOpen(false);
      setEditingStudent(null);
      setForm({
        name: "",
        email: "",
        password: "",
        studentId: "",
        programCode: "",
        yearLevel: "First Year",
        sectionId: "",
        status: "active",
      });
      fetchStudents();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to save student",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    [s.name, s.email, s.studentId, s.programCode, s.yearLevel, s.sectionLabel]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Student Management"
        description="Monitor student records, academic programs, and section enrollments."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Students</strong>
          </>
        }
        helpText="Filter by program or section to manage enrollment changes faster."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => {
              setEditingStudent(null);
              setForm({
                name: "",
                email: "",
                password: "",
                studentId: "",
                programCode: "",
                yearLevel: "First Year",
                sectionId: "",
                status: "active",
              });
              setIsOpen(true);
            }}
          >
            <Plus size={16} />
            Register Student
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Student Roster</p>
            <h3>Registered Students</h3>
          </div>
          <label className="topbar__search" aria-label="Search students">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students"
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Program</th>
                <th>Year Level</th>
                <th>Section</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      No student records matched your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td>{s.studentId}</td>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.programCode}</td>
                    <td>{s.yearLevel}</td>
                    <td>
                      {s.sectionLabel ? (
                        <span className="pill pill--navy">
                          {s.sectionLabel}
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          Not Enrolled
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`pill ${s.status === "active" ? "pill--emerald" : "pill--amber"}`}
                      >
                        {s.status}
                      </span>
                    </td>
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
                          title="Edit Student"
                          onClick={() => handleEdit(s)}
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
                          title="Delete Student"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: deletingId === s.id ? "wait" : "pointer",
                            color: "#dc2626",
                            opacity: deletingId === s.id ? 0.7 : 1,
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
        title={editingStudent ? "Edit Student Details" : "Register Student"}
        description={
          editingStudent
            ? "Update student profile and section enrollment."
            : "Register a new student account."
        }
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="studentName">Full Name</label>
            <input
              id="studentName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Dela Cruz"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="studentEmail">Email Address</label>
            <input
              id="studentEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@srcb.edu.ph"
              required
            />
          </div>

          {!editingStudent && (
            <div className="field-group">
              <label htmlFor="studentPass">Password (Optional)</label>
              <input
                id="studentPass"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Default is @student123"
              />
            </div>
          )}

          <div className="field-group">
            <label htmlFor="studentIdInput">Student Number (Optional)</label>
            <input
              id="studentIdInput"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              placeholder="Auto-generated if empty"
            />
          </div>

          <div className="field-group">
            <label htmlFor="studentProgram">Program</label>
            <select
              id="studentProgram"
              value={form.programCode}
              onChange={(e) =>
                setForm({ ...form, programCode: e.target.value, sectionId: "" })
              }
            >
              <option value="">Select Program</option>
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="studentYear">Year Level</label>
            <select
              id="studentYear"
              value={form.yearLevel}
              onChange={(e) =>
                setForm({ ...form, yearLevel: e.target.value, sectionId: "" })
              }
            >
              <option value="First Year">First Year</option>
              <option value="Second Year">Second Year</option>
              <option value="Third Year">Third Year</option>
              <option value="Fourth Year">Fourth Year</option>
              <option value="Fifth Year">Fifth Year</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="studentSection">Section Assignment</label>
            <select
              id="studentSection"
              value={form.sectionId}
              onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
              disabled={!form.programCode}
            >
              <option value="">Not Assigned</option>
              {filteredSectionsForStudent.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.section} (Adviser: {s.section})
                </option>
              ))}
            </select>
            {!form.programCode && (
              <span
                className="muted"
                style={{ fontSize: "0.75rem", marginTop: 4 }}
              >
                Select a program first to assign a section.
              </span>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="studentStatus">Enrollment Status</label>
            <select
              id="studentStatus"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-actions" style={{ marginTop: 24 }}>
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
            onClick={handleSave}
          >
            {loading ? "Saving…" : "Save Student"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
