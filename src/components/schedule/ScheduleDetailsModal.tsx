import React from "react";
import { Modal } from "../common/Modal";
import {
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  UserCheck,
  GraduationCap,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Copy,
} from "lucide-react";
import type { ClassScheduleItem } from "../../types";
import { getProgramTheme } from "../../utils/programColors";

interface ScheduleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ClassScheduleItem | null;
  onDuplicate?: (schedule: ClassScheduleItem) => void;
}

export const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onDuplicate,
}) => {
  if (!schedule) return null;

  const progTheme = getProgramTheme(schedule);
  const startTime =
    schedule.startTime?.slice(0, 5) ||
    schedule.time?.split("-")[0]?.trim() ||
    "08:00";
  const endTime =
    schedule.endTime?.slice(0, 5) ||
    schedule.time?.split("-")[1]?.trim() ||
    "09:30";
  const programOrCourse = schedule.program || schedule.course || progTheme.code;
  const yearLevel = schedule.yearLevel || "1st Year";
  const classMode =
    schedule.classMode ||
    (String(schedule.roomType || "").toLowerCase().includes("lab")
      ? "Laboratory"
      : "Lecture");
  const semester = schedule.semester || "1st Semester";
  const academicYear = schedule.academicYear || "2026-2027";

  return (
    <Modal
      isOpen={isOpen}
      size="lg"
      onClose={onClose}
      eyebrow="Academic Timetable"
      icon={<BookOpen size={20} />}
      title="Assigned Class Schedule Details"
      description="Official Academic Schedule Assignment • Read-Only View"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Compact Integrated Subject Header Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: progTheme.lightBg,
            border: `1px solid ${progTheme.lightBorder}`,
            borderLeft: `5px solid ${progTheme.primary}`,
            borderRadius: 8,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.8)",
                color: progTheme.primary,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <BookOpen size={17} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: progTheme.primary,
                    letterSpacing: "0.5px",
                  }}
                >
                  {schedule.subjectCode}
                </span>
                <span
                  className="program-card-badge"
                  style={{
                    backgroundColor: progTheme.badgeBg,
                    color: progTheme.badgeText,
                    fontSize: "0.64rem",
                  }}
                >
                  {progTheme.code}
                </span>
                <span className="pill pill--f2f" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                  {schedule.modality || "Face-to-Face"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--srcb-text)",
                  lineHeight: 1.2,
                  marginTop: 2,
                }}
              >
                {schedule.subject}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={16} color={progTheme.primary} />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: progTheme.lightText }}>
              Verified Allocation
            </span>
          </div>
        </div>

        {/* Streamlined 2-Column Specs Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Left Column: Academic & Cohort Allocation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <GraduationCap size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Section / Class</div>
                <div className="sched-detail-spec-val">{schedule.section}</div>
              </div>
            </div>

            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <Layers size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Program / Course</div>
                <div className="sched-detail-spec-val">{programOrCourse}</div>
              </div>
            </div>

            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Year Level</div>
                <div className="sched-detail-spec-val">{yearLevel}</div>
              </div>
            </div>

            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <Calendar size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Term &amp; Academic Year</div>
                <div className="sched-detail-spec-val">{semester} • {academicYear}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Schedule, Room & Faculty */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <Clock size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Scheduled Time &amp; Day</div>
                <div className="sched-detail-spec-val">
                  {schedule.day} • {startTime} - {endTime}
                </div>
              </div>
            </div>

            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <DoorOpen size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Room &amp; Building</div>
                <div className="sched-detail-spec-val">
                  {schedule.room || "Room 101"} ({schedule.building || "Campus Building"})
                </div>
              </div>
            </div>

            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <UserCheck size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Instructor / Faculty</div>
                <div className="sched-detail-spec-val">{schedule.faculty}</div>
              </div>
            </div>

            <div className="sched-detail-spec-row">
              <div className="sched-detail-spec-icon">
                <BookOpen size={16} />
              </div>
              <div>
                <div className="sched-detail-spec-label">Class Mode</div>
                <div className="sched-detail-spec-val">{classMode}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Info Box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(148, 163, 184, 0.08)",
            border: "1px solid var(--srcb-border)",
            borderRadius: 6,
            fontSize: "0.76rem",
            color: "var(--srcb-text-muted)",
          }}
        >
          <Info size={15} style={{ flexShrink: 0 }} />
          <span>
            Officially assigned timetable block. Managed by College Administrators and Program Heads.
          </span>
        </div>

        {/* Action Footer */}
        <div className="modal-actions">
          {onDuplicate ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                onClose();
                onDuplicate(schedule);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Copy size={14} /> Duplicate Schedule
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            className="action-button"
            onClick={onClose}
            style={{ minWidth: 100 }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
