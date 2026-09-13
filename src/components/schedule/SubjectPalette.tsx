import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  X,
  GripVertical,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  FlaskConical,
  GraduationCap,
} from "lucide-react";
import { isGeneralSubject } from "../../utils/scheduling";

export interface SubjectPaletteProps {
  subjects: any[];
  scheduledSubjectCodes?: Set<string>;
  canSchedule?: boolean;
  onSelectSubject?: (subject: any) => void;
  isExamMode?: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  title?: string;
  selectedProgramKey?: string;
  side?: "left" | "right";
}

export const SubjectPalette: React.FC<SubjectPaletteProps> = ({
  subjects,
  scheduledSubjectCodes = new Set(),
  canSchedule = true,
  onSelectSubject,
  isExamMode = false,
  isOpen,
  onToggleOpen,
  title,
  selectedProgramKey,
  side = "right",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "major" | "minor">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unscheduled">("unscheduled");
  const [isDraggingCode, setIsDraggingCode] = useState<string | null>(null);

  // Filter subjects based on query, type, and scheduled status
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (sub.code || "").toLowerCase();
        const name = (sub.name || "").toLowerCase();
        const prog = (sub.program || sub.department || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !prog.includes(q)) {
          return false;
        }
      }

      // 2. Classification Filter (Major vs Gen Ed / Minor)
      const isGenEd = isGeneralSubject(sub) || !sub.isMajor;
      if (filterType === "major" && isGenEd) return false;
      if (filterType === "minor" && !isGenEd) return false;

      // 3. Status Filter (Unscheduled vs All)
      if (statusFilter === "unscheduled" && scheduledSubjectCodes.size > 0) {
        const code = (sub.code || "").toUpperCase();
        if (scheduledSubjectCodes.has(code)) {
          return false;
        }
      }

      return true;
    });
  }, [subjects, searchQuery, filterType, statusFilter, scheduledSubjectCodes]);

  const totalUnscheduled = useMemo(() => {
    if (scheduledSubjectCodes.size === 0) return subjects.length;
    return subjects.filter((s) => !scheduledSubjectCodes.has((s.code || "").toUpperCase())).length;
  }, [subjects, scheduledSubjectCodes]);

  const handleDragStart = (e: React.DragEvent, sub: any) => {
    if (!canSchedule) return;
    setIsDraggingCode(sub.code);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "new_subject",
        subject: sub,
        isExamMode,
      })
    );
  };

  const handleDragEnd = () => {
    setIsDraggingCode(null);
  };

  if (!isOpen) {
    return (
      <div className={`timetable-palette-collapsed ${side === "right" ? "side-right" : "side-left"}`}>
        <button
          type="button"
          className="timetable-palette-expand-btn"
          onClick={onToggleOpen}
          title="Open Subjects Palette (Drag & Drop)"
          aria-label="Expand Subject Palette"
        >
          <div className="palette-collapsed-icon-wrap">
            <BookOpen size={16} />
          </div>
          {side === "right" ? (
            <ChevronLeft size={16} className="palette-collapsed-chevron" />
          ) : (
            <ChevronRight size={16} className="palette-collapsed-chevron" />
          )}
          <span className="palette-vertical-text">Subject Palette</span>
          {totalUnscheduled > 0 && (
            <span className="palette-collapsed-badge" title={`${totalUnscheduled} unscheduled subjects`}>
              {totalUnscheduled}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`timetable-subject-palette ${side === "right" ? "side-right" : "side-left"}`}
      aria-label="Academic Subjects Palette for Drag and Drop"
    >
      {/* Palette Header with Ambient Gradient Accent */}
      <div className="palette-header">
        <div className="palette-header-left">
          <div className="palette-icon-wrap">
            <BookOpen size={17} />
          </div>
          <div className="palette-title-block">
            <div className="palette-title-row">
              <h3 className="palette-title">
                {title || (isExamMode ? "Exam Subjects" : "Subject Palette")}
              </h3>
              <span className="palette-count-badge">
                {filteredSubjects.length} of {subjects.length}
              </span>
            </div>
            <p className="palette-subtitle">
              {canSchedule
                ? "Drag cards onto timetable or click '+'"
                : "Curriculum course offerings catalog"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="palette-collapse-btn"
          onClick={onToggleOpen}
          title="Collapse Palette for wider timetable view"
          aria-label="Collapse Subject Palette"
        >
          {side === "right" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Program Indicator if active */}
      {selectedProgramKey && selectedProgramKey !== "ALL" && (
        <div className="palette-program-indicator">
          <Sparkles size={12} className="palette-sparkle-icon" />
          <span>Active Program: <strong>{selectedProgramKey}</strong></span>
        </div>
      )}

      {/* Search Input */}
      <div className="palette-search-wrap">
        <div className="palette-search-box">
          <Search size={14} className="palette-search-icon" />
          <input
            type="text"
            className="palette-search-input"
            placeholder="Search code or subject title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search curriculum subjects"
          />
          {searchQuery && (
            <button
              type="button"
              className="palette-search-clear"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Pills */}
      <div className="palette-filters">
        {/* Status: Unscheduled vs All */}
        {scheduledSubjectCodes.size > 0 && (
          <div className="palette-status-tabs" role="tablist">
            <button
              type="button"
              className={`palette-tab ${statusFilter === "unscheduled" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("unscheduled")}
              role="tab"
              aria-selected={statusFilter === "unscheduled"}
            >
              <span>Unscheduled</span>
              <span className="palette-tab-count">{totalUnscheduled}</span>
            </button>
            <button
              type="button"
              className={`palette-tab ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
              role="tab"
              aria-selected={statusFilter === "all"}
            >
              <span>All Catalog</span>
              <span className="palette-tab-count">{subjects.length}</span>
            </button>
          </div>
        )}

        {/* Classification Filter Pills */}
        <div className="palette-pills-row">
          <button
            type="button"
            className={`palette-pill ${filterType === "all" ? "is-active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`palette-pill ${filterType === "major" ? "is-active" : ""}`}
            onClick={() => setFilterType("major")}
            title="Major courses (2h Lec / 3h Lab)"
          >
            Majors
          </button>
          <button
            type="button"
            className={`palette-pill ${filterType === "minor" ? "is-active" : ""}`}
            onClick={() => setFilterType("minor")}
            title="General Education / Minor courses (1.5h standard)"
          >
            Minor / Gen Ed
          </button>
        </div>
      </div>

      {/* Palette Subject Cards List */}
      <div className="palette-cards-container" role="list">
        {filteredSubjects.length === 0 ? (
          <div className="palette-empty-state">
            <div className="palette-empty-icon-wrap">
              <Info size={24} />
            </div>
            <p className="palette-empty-title">No matching subjects</p>
            <p className="palette-empty-desc">
              {searchQuery
                ? `No subjects match "${searchQuery}".`
                : statusFilter === "unscheduled"
                ? "All curriculum subjects have been scheduled!"
                : "No subjects available in this program."}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="palette-empty-action"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setStatusFilter("all");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredSubjects.map((sub) => {
            const isGenEd = isGeneralSubject(sub) || !sub.isMajor;
            const isLab = Number(sub.labHours || 0) > 0;
            const isScheduled = scheduledSubjectCodes.has((sub.code || "").toUpperCase());
            const isCurrentDragging = isDraggingCode === sub.code;

            // Duration badge text and styling based on user rules
            let durationLabel = "1.5h Standard";
            let durationClass = "duration-gened";
            let durationTooltip = "General Education / Minor: 1 hour 30 mins session";
            let cardCategoryClass = "card-gened";
            let DurationIcon = Clock;

            if (isExamMode) {
              durationLabel = "2h Exam";
              durationClass = "duration-exam";
              durationTooltip = "Standard Examination Period: 2 hours";
              cardCategoryClass = "card-exam";
            } else if (!isGenEd) {
              if (isLab) {
                durationLabel = "2h Lec / 3h Lab";
                durationClass = "duration-lab";
                durationTooltip = "Major: 2h Lecture or 3h Laboratory block";
                cardCategoryClass = "card-lab";
                DurationIcon = FlaskConical;
              } else {
                durationLabel = "2h Lecture";
                durationClass = "duration-lec";
                durationTooltip = "Major: 2 hours standard lecture";
                cardCategoryClass = "card-lec";
                DurationIcon = GraduationCap;
              }
            }

            return (
              <div
                key={sub.code || sub.id}
                role="listitem"
                className={`palette-subject-card ${cardCategoryClass} ${
                  isCurrentDragging ? "is-dragging" : ""
                } ${isScheduled ? "is-already-scheduled" : ""}`}
                draggable={canSchedule}
                onDragStart={(e) => handleDragStart(e, sub)}
                onDragEnd={handleDragEnd}
                tabIndex={0}
                title={
                  canSchedule
                    ? `Drag ${sub.code} onto the timetable or click '+' to schedule`
                    : sub.name
                }
              >
                {/* Visual Category Accent Strip */}
                <div className="palette-card-accent-bar" />

                <div className="palette-card-content">
                  <div className="palette-card-top">
                    <div className="palette-card-header-left">
                      {canSchedule && (
                        <span className="palette-grip" aria-hidden="true" title="Drag onto schedule slot">
                          <GripVertical size={14} />
                        </span>
                      )}
                      <span className="palette-subject-code">{sub.code}</span>
                      {sub.program && (
                        <span className="palette-program-pill" title={`Program: ${sub.program}`}>
                          {sub.program}
                        </span>
                      )}
                    </div>

                    {canSchedule && onSelectSubject && (
                      <button
                        type="button"
                        className="palette-quick-add-btn"
                        onClick={() => onSelectSubject(sub)}
                        title={`Quick Schedule ${sub.code} (Nielsen Heuristic #7)`}
                        aria-label={`Schedule ${sub.code}`}
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>

                  <div className="palette-subject-name" title={sub.name}>
                    {sub.name}
                  </div>

                  <div className="palette-card-footer">
                    <span
                      className={`palette-duration-tag ${durationClass}`}
                      title={durationTooltip}
                    >
                      <DurationIcon size={12} className="palette-duration-icon" />
                      <span>{durationLabel}</span>
                    </span>

                    <div className="palette-card-meta">
                      {sub.units && (
                        <span className="palette-units-pill">{sub.units} Units</span>
                      )}
                      {isScheduled && (
                        <span className="palette-scheduled-tag" title="Already scheduled on active timetable">
                          <Check size={11} />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Palette Footer Tip */}
      <div className="palette-footer-tip">
        <Sparkles size={13} className="palette-footer-sparkle" />
        <span>Drop subject onto any slot to jump directly to Section & Faculty assignment</span>
      </div>
    </aside>
  );
};
