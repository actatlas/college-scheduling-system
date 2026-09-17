import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { Plus, GraduationCap, Hash, BookOpen, Layers, Edit2, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { getProgramLogo } from "../utils/programLogos";
import { CardGridSkeleton } from "../components/common/Skeleton";
import type { ProgramItem, MajorItem } from "../types";

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<MajorItem | null>(null);
  const [majorToDelete, setMajorToDelete] = useState<MajorItem | null>(null);

  const [selectedPreviewProgram, setSelectedPreviewProgram] = useState<{
    name: string;
    focus: string;
    logo: string;
  } | null>(null);

  const [programForm, setProgramForm] = useState({ code: "", name: "", description: "" });
  const [majorForm, setMajorForm] = useState({ code: "", name: "", programCode: "TEP" });

  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const toast = useToast();

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canEdit = role === "super_admin" || role === "admin";

  const fetchAll = async () => {
    setIsFetching(true);
    try {
      const [progRes, majRes] = await Promise.all([
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/program-majors").catch(() => ({ data: { data: [] } })),
      ]);
      setPrograms(progRes.data?.data || []);
      setMajors(majRes.data?.data || []);
    } catch {
      setPrograms([]);
      setMajors([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleOpenAddMajor = (programCode?: string) => {
    setEditingMajor(null);
    setMajorForm({
      code: "",
      name: "",
      programCode: programCode || programs[0]?.code || "TEP",
    });
    setIsMajorModalOpen(true);
  };

  const handleOpenEditMajor = (major: MajorItem) => {
    setEditingMajor(major);
    setMajorForm({
      code: major.code,
      name: major.name,
      programCode: major.programCode || (major as any).program_code || "TEP",
    });
    setIsMajorModalOpen(true);
  };

  const handleSaveProgram = async () => {
    if (!programForm.code.trim() || !programForm.name.trim()) {
      toast.push("Program code and name are required", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/programs", {
        code: programForm.code.toUpperCase().trim(),
        name: programForm.name.trim(),
        description: programForm.description.trim(),
      });
      fetchAll();
      toast.push("Program registered successfully", "success");
      setIsProgramModalOpen(false);
      setProgramForm({ code: "", name: "", description: "" });
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save program", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMajor = async () => {
    if (!majorForm.code.trim() || !majorForm.name.trim() || !majorForm.programCode) {
      toast.push("Major code, title, and assigned program are required", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        code: majorForm.code.toUpperCase().trim(),
        name: majorForm.name.trim(),
        programCode: majorForm.programCode,
      };
      if (editingMajor) {
        await api.put(`/program-majors/${editingMajor.id}`, payload);
        toast.push("Major updated successfully", "success");
      } else {
        await api.post("/program-majors", payload);
        toast.push("Major registered successfully", "success");
      }
      fetchAll();
      setIsMajorModalOpen(false);
      setEditingMajor(null);
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save major", "error");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteMajor = async () => {
    if (!majorToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/program-majors/${majorToDelete.id}`);
      toast.push("Major removed successfully", "success");
      fetchAll();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete major", "error");
    } finally {
      setLoading(false);
      setMajorToDelete(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Collegiate Programs & Majors"
        description="Official collegiate programs and their specialized major tracks at St. Rita's College of Balingasag."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Programs & Majors</strong>
          </>
        }
        helpText="Programs contain zero, one, or multiple Majors (PROGRAM 1 : N MAJOR). Subjects and sections can belong directly to a program or an applicable major."
        actions={
          canEdit && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="secondary-button"
                type="button"
                onClick={() => handleOpenAddMajor()}
              >
                <Plus size={16} />
                Add Major
              </button>
              <button
                className="action-button"
                type="button"
                onClick={() => {
                  setProgramForm({ code: "", name: "", description: "" });
                  setIsProgramModalOpen(true);
                }}
              >
                <Plus size={16} />
                Add Program
              </button>
            </div>
          )
        }
      />

      {isFetching ? (
        <CardGridSkeleton count={5} />
      ) : (
        <section className="grid-3">
          {programs.length === 0 ? (
            <div className="empty-state">No academic programs registered.</div>
          ) : (
            programs.map((program) => {
              const logoSrc = getProgramLogo(program.code || program.name || "");
              const programMajors = majors.filter(
                (m) =>
                  m.programCode === program.code ||
                  (m as any).program_code === program.code
              );

              return (
                <article
                  className="card"
                  key={program.code}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "22px",
                    borderRadius: "16px",
                    border: "1px solid var(--srcb-border)",
                    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "14px",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p className="eyebrow" style={{ marginBottom: "4px" }}>
                          Academic Program • {program.code}
                        </p>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.12rem",
                            fontWeight: 800,
                            color: "var(--srcb-navy)",
                            lineHeight: 1.3,
                          }}
                        >
                          {program.name}
                        </h3>
                        {program.description && (
                          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                            {program.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        title="Click to view enlarged logo"
                        onClick={() =>
                          setSelectedPreviewProgram({
                            name: program.name,
                            focus: "Official Collegiate Program",
                            logo: logoSrc,
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          borderRadius: "12px",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={logoSrc}
                          alt={`${program.name} Logo`}
                          style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "12px",
                            objectFit: "contain",
                            background: "#ffffff",
                            padding: "3px",
                            border: "1px solid var(--srcb-border)",
                            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                          }}
                        />
                      </button>
                    </div>

                    {/* Majors List under this Program */}
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--srcb-border)", paddingTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--srcb-navy)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Majors / Specializations ({programMajors.length})
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddMajor(program.code)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--srcb-royal)",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Plus size={13} /> Add Major
                          </button>
                        )}
                      </div>

                      {programMajors.length === 0 ? (
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--srcb-text-muted)", fontStyle: "italic" }}>
                          No separate majors. Single curriculum program.
                        </p>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                          {programMajors.map((major) => (
                            <li
                              key={major.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "var(--srcb-bg)",
                                padding: "6px 10px",
                                borderRadius: 8,
                                fontSize: "0.82rem",
                              }}
                            >
                              <div>
                                <strong style={{ color: "var(--srcb-navy)", marginRight: 6 }}>{major.code}</strong>
                                <span>{major.name}</span>
                              </div>
                              {canEdit && (
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    type="button"
                                    className="icon-button"
                                    title="Edit Major"
                                    aria-label={`Edit ${major.code}`}
                                    onClick={() => handleOpenEditMajor(major)}
                                    style={{ padding: 2 }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-button icon-button--danger"
                                    title="Delete Major"
                                    aria-label={`Delete ${major.code}`}
                                    onClick={() => setMajorToDelete(major)}
                                    style={{ padding: 2 }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <span className="pill pill--royal" style={{ fontSize: "0.74rem", fontWeight: 700 }}>
                      Collegiate Academic Unit
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Enlarged Program Logo Modal */}
      <Modal
        isOpen={Boolean(selectedPreviewProgram)}
        size="sm"
        eyebrow="Academic Seal"
        title={selectedPreviewProgram?.name || "Program Logo"}
        description="Official Academic Program Seal · St. Rita's College of Balingasag"
        onClose={() => setSelectedPreviewProgram(null)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 10px 0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
              borderRadius: "24px",
              border: "1px solid var(--srcb-border)",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <img
              src={selectedPreviewProgram?.logo}
              alt={`${selectedPreviewProgram?.name} Enlarged Logo`}
              style={{
                width: "180px",
                height: "180px",
                objectFit: "contain",
              }}
            />
          </div>

          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--srcb-navy)",
              margin: "0 0 6px",
            }}
          >
            {selectedPreviewProgram?.name}
          </h3>

          <div className="modal-actions">
            <button
              type="button"
              className="action-button"
              onClick={() => setSelectedPreviewProgram(null)}
              style={{ minWidth: "140px" }}
            >
              Close Preview
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Program Modal */}
      <Modal
        isOpen={isProgramModalOpen}
        size="md"
        icon={<GraduationCap size={20} />}
        eyebrow="Registrar Catalog"
        title="Register New Program"
        description="Introduce a new collegiate academic program to the institutional catalog."
        onClose={() => setIsProgramModalOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="programCode">
              <Hash size={13} /> Program Code <span className="required-asterisk">*</span>
            </label>
            <input
              id="programCode"
              value={programForm.code}
              required
              aria-required="true"
              placeholder="e.g. BSIT, BSBA, TEP, CJEP"
              onChange={(event) =>
                setProgramForm({ ...programForm, code: event.target.value.toUpperCase() })
              }
            />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="programName">
              <BookOpen size={13} /> Program Name <span className="required-asterisk">*</span>
            </label>
            <input
              id="programName"
              value={programForm.name}
              required
              aria-required="true"
              placeholder="e.g. Bachelor of Science in Business Administration"
              onChange={(event) =>
                setProgramForm({ ...programForm, name: event.target.value })
              }
            />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="programDescription">
              <Layers size={13} /> Description
            </label>
            <input
              id="programDescription"
              value={programForm.description}
              placeholder="e.g. Department of Business & Accountancy"
              onChange={(event) =>
                setProgramForm({ ...programForm, description: event.target.value })
              }
            />
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => setIsProgramModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading || !programForm.code.trim() || !programForm.name.trim()}
            onClick={handleSaveProgram}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? "Saving…" : "Save Program"}</span>
          </button>
        </div>
      </Modal>

      {/* Add / Edit Major Modal */}
      <Modal
        isOpen={isMajorModalOpen}
        size="md"
        icon={<Layers size={20} />}
        eyebrow="Academic Majors"
        title={editingMajor ? "Edit Major" : "Register New Major"}
        description="Add a major specialization track under an existing collegiate program."
        onClose={() => {
          setIsMajorModalOpen(false);
          setEditingMajor(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="majorProgram">
              <GraduationCap size={13} /> Parent Academic Program <span className="required-asterisk">*</span>
            </label>
            <select
              id="majorProgram"
              value={majorForm.programCode}
              onChange={(e) => setMajorForm({ ...majorForm, programCode: e.target.value })}
            >
              {programs.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="majorCode">
              <Hash size={13} /> Major Code <span className="required-asterisk">*</span>
            </label>
            <input
              id="majorCode"
              value={majorForm.code}
              required
              aria-required="true"
              placeholder="e.g. FM, MM, ENG, FIL"
              onChange={(event) =>
                setMajorForm({ ...majorForm, code: event.target.value.toUpperCase() })
              }
            />
          </div>

          <div className="field-group">
            <label htmlFor="majorName">
              <BookOpen size={13} /> Major Name <span className="required-asterisk">*</span>
            </label>
            <input
              id="majorName"
              value={majorForm.name}
              required
              aria-required="true"
              placeholder="e.g. Financial Management, English"
              onChange={(event) =>
                setMajorForm({ ...majorForm, name: event.target.value })
              }
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => {
              setIsMajorModalOpen(false);
              setEditingMajor(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading || !majorForm.code.trim() || !majorForm.name.trim()}
            onClick={handleSaveMajor}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? "Saving…" : editingMajor ? "Update Major" : "Register Major"}</span>
          </button>
        </div>
      </Modal>

      {/* Delete Major Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(majorToDelete)}
        title="Remove Major"
        variant="danger"
        confirmLabel="Delete Major"
        loading={loading}
        onCancel={() => setMajorToDelete(null)}
        onConfirm={executeDeleteMajor}
        message={
          <span>
            Are you sure you want to remove major <strong>{majorToDelete?.code} - {majorToDelete?.name}</strong>?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> Any associated subjects or sections will be unlinked from this major.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
