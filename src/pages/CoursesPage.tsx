import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  Layers,
  Building2,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

interface CourseRow {
  code: string;
  name: string;
  year?: number | string;
  programCode?: string;
}

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [query, setQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null);

  const [durationMode, setDurationMode] = useState<string>("4");
  const [customDuration, setCustomDuration] = useState<string>("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    year: "4",
    programCode: "ITP",
  });

  const toast = useToast();
  const { selectedProgramKey, selectedProgram } = useProgramContext();

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canManage = role === "super_admin" || role === "admin";

  const fetchAllData = async () => {
    setIsFetching(true);
    try {
      const [cRes, sRes, pRes, secRes] = await Promise.all([
        api.get("/courses").catch(() => ({ data: { data: [] } })),
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/sections").catch(() => ({ data: { data: [] } })),
      ]);

      setCourses(cRes.data?.data || []);
      setSubjects(sRes.data?.data || []);
      setPrograms(pRes.data?.data || []);
      setSections(secRes.data?.data || []);
    } catch {
      setCourses([]);
      setSubjects([]);
      setPrograms([]);
      setSections([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter courses by search query and selected program
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.programCode || "").toLowerCase().includes(query.toLowerCase());

      if (!matchesSearch) return false;

      if (!selectedProgramKey || selectedProgramKey === "ALL" || selectedProgram.shortLabel === "All Programs") {
        return true;
      }

      const pKey = selectedProgramKey.toLowerCase();
      return (
        c.code.toLowerCase().includes(pKey) ||
        (c.programCode || "").toLowerCase().includes(pKey) ||
        c.name.toLowerCase().includes(pKey)
      );
    });
  }, [courses, query, selectedProgramKey, selectedProgram]);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setDurationMode("4");
    setCustomDuration("");
    setForm({
      code: "",
      name: "",
      year: "4",
      programCode: programs[0]?.code || "ITP",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: CourseRow) => {
    setEditingCourse(course);
    const yrStr = String(course.year || 4);
    if (["2", "3", "4", "5"].includes(yrStr)) {
      setDurationMode(yrStr);
      setCustomDuration("");
    } else {
      setDurationMode("other");
      setCustomDuration(yrStr);
    }
    setForm({
      code: course.code,
      name: course.name,
      year: yrStr,
      programCode: course.programCode || programs[0]?.code || "ITP",
    });
    setIsModalOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!form.code.trim() || !form.name.trim()) {
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
          name: form.name,
          year: finalYear,
          programCode: form.programCode,
        });
        toast.push("Degree course updated successfully", "success");
      } else {
        await api.post("/courses", {
          code: form.code.toUpperCase().trim(),
          name: form.name.trim(),
          year: finalYear,
          programCode: form.programCode,
        });
        toast.push("New degree course registered successfully", "success");
      }
      setIsModalOpen(false);
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
        title="Collegiate Degree Courses & Curricula"
        description="Official collegiate degree offerings, program affiliations, year durations, and curriculum prospectus for St. Rita's College of Balingasag."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Courses</strong>
          </>
        }
        actions={
          canManage && (
            <button className="action-button" type="button" onClick={handleOpenAdd}>
              <Plus size={16} />
              Add Degree Course
            </button>
          )
        }
      />

      {/* Search & Statistics Bar */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
            <div className="topbar__search" style={{ width: "100%", maxWidth: 380 }}>
              <Search size={16} color="var(--srcb-slate)" />
              <input
                type="text"
                placeholder="Search courses by code, title, program..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="pill pill--navy">
              <GraduationCap size={14} /> {courses.length} Registered Degrees
            </span>
            <span className="pill pill--royal">
              <BookOpen size={14} /> {subjects.length} Curriculum Subjects
            </span>
          </div>
        </div>
      </section>

      {/* Main Course Roster Table */}
      <section className="card">
        {isFetching ? (
          <TableSkeleton rows={5} columns={5} />
        ) : filteredCourses.length === 0 ? (
          <div className="empty-state">
            <GraduationCap size={36} color="var(--srcb-slate)" style={{ margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No subjects available for this program yet.</p>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              {query ? "Try clearing your search query" : "Click 'Add Degree Course' above to register an academic degree offering."}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "130px" }}>Course Code</th>
                  <th>Degree Program Title</th>
                  <th>Department / Program</th>
                  <th>Duration</th>
                  <th>Cohort Sections</th>
                  {canManage && <th style={{ textAlign: "right" }}>Actions</th>}
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
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              className="icon-button"
                              type="button"
                              title="Edit Course"
                              onClick={() => handleOpenEdit(course)}
                            >
                              <Edit2 size={14} />
                            </button>
                            {role === "super_admin" && (
                              <button
                                className="icon-button icon-button--danger"
                                type="button"
                                title="Delete Course"
                                onClick={() => setCourseToDelete(course)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
              value={form.code}
              disabled={Boolean(editingCourse)}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
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
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                Department / Program
              </label>
              <select
                value={form.programCode}
                onChange={(e) => setForm({ ...form, programCode: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)" }}
              >
                {programs.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name}
                  </option>
                ))}
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
                    setForm({ ...form, year: e.target.value });
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
                      setForm({ ...form, year: e.target.value });
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button className="secondary-button" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="action-button" type="button" onClick={handleSaveCourse} disabled={loading}>
              {loading ? "Saving..." : editingCourse ? "Save Changes" : "Register Course"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(courseToDelete)}
        onCancel={() => setCourseToDelete(null)}
        onConfirm={handleDeleteCourse}
        title={`Delete Course ${courseToDelete?.code}?`}
        message={`Are you sure you want to remove ${courseToDelete?.name} (${courseToDelete?.code})? This will permanently unregister this degree offering.`}
        confirmLabel="Yes, Delete Course"
        variant="danger"
      />
    </motion.div>
  );
}
