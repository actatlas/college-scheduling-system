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
  Users,
  AlertTriangle,
  X,
  Layers,
  GraduationCap,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import { useAcademicPeriod } from "../contexts/AcademicPeriodContext";
import { getProgramLogo } from "../utils/programLogos";
import type { SectionItem, ProgramItem, MajorItem } from "../types";

export function SectionsPage() {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [programsList, setProgramsList] = useState<ProgramItem[]>([]);
  const [majorsList, setMajorsList] = useState<MajorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [sectionToDelete, setSectionToDelete] = useState<SectionItem | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("search") || "");

  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search") || "";
    setQuery(q);
  }, [searchParams]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set("q", val);
      } else {
        next.delete("q");
        next.delete("search");
      }
      return next;
    }, { replace: true });
  };
  const [isOpen, setIsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  const { selectedProgram, matchesProgram } = useProgramContext();
  const { activeSchoolYear, activeSemester } = useAcademicPeriod();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = role === "super_admin" || role === "admin";
  const canEdit = isAdmin;

  const [form, setForm] = useState({
    program: selectedProgram.key !== "ALL" ? selectedProgram.key : "TEP",
    majorId: "",
    yearLevel: "1",
    sectionLabel: "A",
    students: "35",
    semester: activeSemester || "1st Semester",
    schoolYear: activeSchoolYear || "2026-2027",
  });

  const toast = useToast();

  const fetchSections = async () => {
    setFetching(true);
    try {
      const res = await api.get("/sections");
      setSections(res.data?.data || []);
    } catch {
      setSections([]);
    } finally {
      setFetching(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/program-majors").catch(() => ({ data: { data: [] } })),
      ]);
      setProgramsList(pRes.data?.data || []);
      setMajorsList(mRes.data?.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSections();
    fetchDependencies();
  }, []);

  const handleEdit = (section: SectionItem) => {
    if (!canEdit) return;
    setEditingSection(section);
    setForm({
      program: section.program || section.course || selectedProgram.key || "TEP",
      majorId: (section as any).majorId || "",
      yearLevel: section.yearLevel || "1",
      sectionLabel: (section as any).sectionLabel || section.section || "A",
      students: String(section.students || 35),
      semester: section.semester || activeSemester || "1st Semester",
      schoolYear: section.schoolYear || activeSchoolYear || "2026-2027",
    });
    setIsOpen(true);
  };

  const executeDelete = async () => {
    if (!sectionToDelete || !sectionToDelete.id) return;
    setLoading(true);
    try {
      await api.delete(`/sections/${encodeURIComponent(sectionToDelete.id)}`);
      toast.push("Section deleted successfully", "success");
      fetchSections();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete section", "error");
    } finally {
      setLoading(false);
      setSectionToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!form.program || !form.sectionLabel.trim()) {
      toast.push("Program and Section name are required", "error");
      return;
    }
    setLoading(true);
    try {
      const selectedMajor = majorsList.find((m) => String(m.id) === String(form.majorId));
      const majorPrefix = selectedMajor?.code || form.program;
      const sectionName = `${majorPrefix} ${form.yearLevel}-${form.sectionLabel.trim().toUpperCase()}`;

      const payload = {
        program: form.program,
        programCode: form.program,
        majorId: form.majorId ? Number(form.majorId) : null,
        yearLevel: Number(form.yearLevel) || 1,
        section: form.sectionLabel.trim().toUpperCase(),
        sectionLabel: form.sectionLabel.trim().toUpperCase(),
        sectionName,
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
      section.sectionName || section.section || "",
      section.course || "",
      section.yearLevel || "",
      section.program || "",
      (section as any).majorName || "",
      (section as any).majorCode || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesProg = matchesProgram(section.program || section.course);

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
        description="Organize collegiate student cohorts by academic program, major, year level, and student enrollment count."
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
                const progKey = selectedProgram.key !== "ALL" ? selectedProgram.key : (programsList[0]?.code || "TEP");
                setForm({
                  program: progKey,
                  majorId: "",
                  yearLevel: "1",
                  sectionLabel: "A",
                  students: "35",
                  semester: activeSemester,
                  schoolYear: activeSchoolYear,
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
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <label className="topbar__search" aria-label="Search sections" style={{ margin: 0, paddingRight: query ? 32 : 12 }}>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Search by section, program, major..."
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

        {fetching ? (
          <TableSkeleton rows={5} columns={canEdit ? 6 : 5} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Academic Program</th>
                  <th>Major</th>
                  <th>Year Level</th>
                  <th>Section Cohort</th>
                  <th>Enrolled Students</th>
                  <th>Term & SY</th>
                  {canEdit && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSections.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6}>
                      <div className="empty-state" style={{ padding: "36px 16px", textAlign: "center" }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No sections matched your search criteria.</p>
                        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                          Try searching with different cohort names or academic programs.
                        </p>
                        {query && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleQueryChange("")}
                            style={{ marginTop: 12, fontSize: "0.8rem" }}
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSections.map((section) => (
                    <tr key={section.id || `${section.program}-${section.section}`}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <img
                            src={getProgramLogo(section.program || section.course)}
                            alt="Program Logo"
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "6px",
                              objectFit: "contain",
                              background: "#ffffff",
                              padding: "1px",
                              border: "1px solid var(--srcb-border)",
                              boxShadow: "0 2px 4px rgba(15, 23, 42, 0.06)",
                              flexShrink: 0,
                            }}
                          />
                          <span className="pill pill--royal">{section.program || section.course}</span>
                        </div>
                      </td>
                      <td>
                        {(section as any).majorCode ? (
                          <span className="pill pill--slate" style={{ fontSize: "0.78rem" }}>
                            {(section as any).majorCode}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: "0.78rem" }}>General</span>
                        )}
                      </td>
                      <td>Year {section.yearLevel}</td>
                      <td>
                        <strong>{section.sectionName || section.section}</strong>
                      </td>
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
                              aria-label={`Edit ${section.section}`}
                              onClick={() => handleEdit(section)}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              title="Delete Section"
                              aria-label={`Delete ${section.section}`}
                              onClick={() => setSectionToDelete(section)}
                            >
                              <Trash2 size={15} />
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
        )}
      </section>

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={isOpen && canEdit}
        size="md"
        icon={<Users size={20} />}
        title={editingSection ? "Edit Section Details" : "Register Class Section"}
        eyebrow="Class Cohorts"
        description="Configure student cohort, academic program, major, year level, and enrollment details."
        onClose={() => {
          setIsOpen(false);
          setEditingSection(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="sectionProgram">
              <GraduationCap size={13} /> Academic Program <span className="required-asterisk">*</span>
            </label>
            <select
              id="sectionProgram"
              value={form.program}
              onChange={(e) => {
                const code = e.target.value;
                setForm({
                  ...form,
                  program: code,
                  majorId: "",
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
            <label htmlFor="sectionMajor">
              <Layers size={13} /> Major (Optional / Nullable)
            </label>
            <select
              id="sectionMajor"
              value={form.majorId}
              onChange={(e) => setForm({ ...form, majorId: e.target.value })}
            >
              <option value="">None / General Program Section</option>
              {majorsList
                .filter((m) => !form.program || m.programCode === form.program || (m as any).program_code === form.program)
                .map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.code} - {m.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="sectionYear">
              <Layers size={13} /> Year Level
            </label>
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
            <label htmlFor="sectionLabel">
              <Layers size={13} /> Section Label / Cohort ID <span className="required-asterisk">*</span>
            </label>
            <input
              id="sectionLabel"
              value={form.sectionLabel}
              onChange={(e) => setForm({ ...form, sectionLabel: e.target.value.toUpperCase() })}
              placeholder="e.g. A, B, 301, 302"
              required
              aria-required="true"
            />
          </div>

          <div className="field-group">
            <label htmlFor="sectionStudents">
              <Users size={13} /> Student Headcount
            </label>
            <input
              id="sectionStudents"
              type="number"
              min={1}
              max={150}
              value={form.students}
              onChange={(event) => setForm({ ...form, students: event.target.value })}
              placeholder="e.g. 40"
            />
          </div>

          <div className="field-group">
            <label htmlFor="sectionSemester">
              <Calendar size={13} /> Semester
            </label>
            <select
              id="sectionSemester"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="sectionSY">
              <Clock size={13} /> School Year
            </label>
            <select
              id="sectionSY"
              value={form.schoolYear}
              onChange={(e) => setForm({ ...form, schoolYear: e.target.value })}
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
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
            disabled={loading || !form.sectionLabel.trim() || !form.program.trim()}
            onClick={handleSave}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? "Saving…" : editingSection ? "Update Section" : "Register Section"}</span>
          </button>
        </div>
      </Modal>

      {/* Delete Section Confirmation Modal (Heuristic 3 & 5) */}
      <ConfirmModal
        isOpen={Boolean(sectionToDelete)}
        title="Remove Section"
        variant="danger"
        confirmLabel="Delete Section"
        loading={loading}
        onCancel={() => setSectionToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to delete section <strong>{sectionToDelete?.sectionName || sectionToDelete?.section}</strong> ({sectionToDelete?.program} - Year {sectionToDelete?.yearLevel})?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> This will remove the student cohort roster and its schedule associations.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
