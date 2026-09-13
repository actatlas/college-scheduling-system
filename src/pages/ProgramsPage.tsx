import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, GraduationCap, Hash, BookOpen, Loader2 } from "lucide-react";
import { getProgramLogo } from "../utils/programLogos";
import { CardGridSkeleton } from "../components/common/Skeleton";
import { storage } from "../data/storage";

type ProgramRow = { id?: number; name: string; focus: string };

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreviewProgram, setSelectedPreviewProgram] = useState<{
    name: string;
    focus: string;
    logo: string;
  } | null>(null);
  const [form, setForm] = useState({ code: "", name: "", focus: "" });
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const toast = useToast();

  const fetchPrograms = () => {
    setIsFetching(true);
    api
      .get("/programs")
      .then((res: any) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          const invalidCodes = new Set(["BSIT", "BSBA", "BSED", "BEED", "BSCRIM", "BSHM"]);
          const sanitized = data.filter((p: any) => !invalidCodes.has(String(p.code || p.name).trim().toUpperCase()));
          setPrograms(sanitized);
          if (sanitized.length > 0) {
            storage.setPrograms(sanitized);
          }
        } else {
          setPrograms(storage.getPrograms());
        }
      })
      .catch(() => setPrograms(storage.getPrograms()))
      .finally(() => setIsFetching(false));
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const visiblePrograms = programs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Programs"
        description="Official college programs offered by St. Rita's College of Balingasag."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} />
            Add Program
          </button>
        }
      />

      {isFetching ? (
        <CardGridSkeleton count={5} />
      ) : (
        <section className="grid-3">
          {visiblePrograms.length === 0 ? (
            <div className="empty-state">No programs have been recorded yet.</div>
          ) : (
          visiblePrograms.map((program) => {
            const logoSrc = getProgramLogo(program.name || program.focus || "");

            return (
              <article
                className="card"
                key={program.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "22px",
                  borderRadius: "16px",
                  border: "1px solid var(--srcb-border)",
                  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
                      <p className="eyebrow" style={{ marginBottom: "6px" }}>
                        Academic Program
                      </p>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.18rem",
                          fontWeight: 800,
                          color: "var(--srcb-navy)",
                          lineHeight: 1.3,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {program.name}
                      </h3>
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
                        position: "relative",
                        flexShrink: 0,
                        borderRadius: "14px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      className="program-logo-btn"
                    >
                      <img
                        src={logoSrc}
                        alt={`${program.name} Logo`}
                        style={{
                          width: "68px",
                          height: "68px",
                          borderRadius: "14px",
                          objectFit: "contain",
                          background: "#ffffff",
                          padding: "4px",
                          border: "1px solid var(--srcb-border)",
                          boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.08)";
                          e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.16)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.08)";
                        }}
                      />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <span
                    className="pill pill--royal"
                    style={{ fontSize: "0.76rem", fontWeight: 700 }}
                  >
                    Official Collegiate Program
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
                width: "200px",
                height: "200px",
                objectFit: "contain",
                filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))",
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

          <p
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#0284c7",
              margin: "0 0 16px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {selectedPreviewProgram?.focus}
          </p>

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
        isOpen={isOpen}
        size="md"
        icon={<GraduationCap size={20} />}
        eyebrow="Registrar Catalog"
        title="Register New Program"
        description="Introduce a new collegiate academic program to the institutional catalog."
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="programCode">
              <Hash size={13} /> Program Code <span className="required-asterisk">*</span>
            </label>
            <input
              id="programCode"
              value={form.code}
              required
              aria-required="true"
              placeholder="e.g. BSIT, BSBA"
              onChange={(event) =>
                setForm({ ...form, code: event.target.value.toUpperCase() })
              }
            />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="programName">
              <BookOpen size={13} /> Program Name <span className="required-asterisk">*</span>
            </label>
            <input
              id="programName"
              value={form.name}
              required
              aria-required="true"
              placeholder="e.g. Bachelor of Science in Information Technology"
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading || !form.code.trim() || !form.name.trim()}
            onClick={async () => {
              if (!form.code.trim() || !form.name.trim()) {
                toast.push("Program code and name are required", "error");
                return;
              }
              setLoading(true);
              try {
                await api.post("/programs", {
                  code: form.code.toUpperCase().trim(),
                  name: form.name.trim(),
                  focus: form.focus,
                });
                fetchPrograms();
                toast.push("Program saved successfully", "success");
                setIsOpen(false);
                setForm({ code: "", name: "", focus: "" });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to save program",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? "Saving…" : "Save Program"}</span>
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
