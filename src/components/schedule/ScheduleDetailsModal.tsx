import React from "react";
import { Modal } from "../common/Modal";
import {
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  Building,
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
      onClose={onClose}
      title="Assigned Class Schedule Details"
      description="Official Academic Schedule Assignment • Read-Only View"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Assignment Verification Header Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: progTheme.lightBg,
            border: `1px solid ${progTheme.lightBorder}`,
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color={progTheme.primary} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: progTheme.lightText }}>
              Assigned Schedule • {progTheme.name}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              className="program-card-badge"
              style={{
                backgroundColor: progTheme.badgeBg,
                color: progTheme.badgeText,
                padding: "3px 8px",
                fontSize: "0.72rem",
              }}
            >
              {progTheme.code}
            </span>
            <span
              className="pill pill--f2f"
              style={{ fontSize: "0.75rem", padding: "3px 8px" }}
            >
              {schedule.modality || "Face-to-Face"}
            </span>
          </div>
        </div>

        {/* Primary Subject Info Card */}
        <div
          style={{
            padding: 14,
            background: "var(--srcb-surface)",
            border: "1px solid var(--srcb-border)",
            borderLeft: `5px solid ${progTheme.primary}`,
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: progTheme.lightBg,
                color: progTheme.primary,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: progTheme.primary,
                    textTransform: "uppercase",
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
                    fontSize: "0.62rem",
                  }}
                >
                  {progTheme.code}
                </span>
              </div>
              <h4
                style={{
                  margin: "2px 0 0",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "var(--srcb-text)",
                }}
              >
                {schedule.subject}
              </h4>
            </div>
          </div>
        </div>

        {/* Detailed Grid Info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}
        >
          {/* Section & Program */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <GraduationCap size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                SECTION / CLASS
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {schedule.section}
              </div>
            </div>
          </div>

          {/* Program / Course */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Layers size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                PROGRAM / COURSE
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {programOrCourse}
              </div>
            </div>
          </div>

          {/* Year Level */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                YEAR LEVEL
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {yearLevel}
              </div>
            </div>
          </div>

          {/* Class Mode (Lecture / Laboratory) */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <BookOpen size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                CLASS MODE
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {classMode}
              </div>
            </div>
          </div>

          {/* Day */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Calendar size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                DAY OF WEEK
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {schedule.day}
              </div>
            </div>
          </div>

          {/* Time Slot */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Clock size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                SCHEDULED TIME
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {startTime} - {endTime}
              </div>
            </div>
          </div>

          {/* Room */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <DoorOpen size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                ASSIGNED ROOM
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {schedule.room || "Room 101"}
              </div>
            </div>
          </div>

          {/* Building */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Building size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                BUILDING LOCATION
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {schedule.building || "College Building"}
              </div>
            </div>
          </div>

          {/* Instructor / Faculty */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <UserCheck size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                FACULTY INSTRUCTOR
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {schedule.faculty}
              </div>
            </div>
          </div>

          {/* Semester & Academic Year */}
          <div
            style={{
              padding: 12,
              background: "var(--srcb-surface)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Calendar size={20} color="#0284c7" />
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", fontWeight: 600 }}>
                SEMESTER & A.Y.
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--srcb-text)" }}>
                {semester} • {academicYear}
              </div>
            </div>
          </div>
        </div>

        {/* Notice Info Box */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            background: "rgba(148, 163, 184, 0.08)",
            border: "1px solid var(--srcb-border)",
            borderRadius: 6,
            fontSize: "0.78rem",
            color: "var(--srcb-text-muted)",
          }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            This schedule is an officially assigned timetable block. Only College Administrators and Program Heads can modify class allocations.
          </span>
        </div>

        {/* Action Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          {onDuplicate && (
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
