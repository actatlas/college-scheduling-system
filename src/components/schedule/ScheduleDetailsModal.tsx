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
} from "lucide-react";
import type { ClassScheduleItem } from "../../types";

interface ScheduleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ClassScheduleItem | null;
}

export const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({
  isOpen,
  onClose,
  schedule,
}) => {
  if (!schedule) return null;

  const startTime =
    schedule.startTime?.slice(0, 5) ||
    schedule.time?.split("-")[0]?.trim() ||
    "08:00";
  const endTime =
    schedule.endTime?.slice(0, 5) ||
    schedule.time?.split("-")[1]?.trim() ||
    "09:30";
  const programOrCourse = schedule.program || schedule.course || "BSIT";
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
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color="#0284c7" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--srcb-text)" }}>
              Assigned Class Schedule
            </span>
          </div>
          <span
            className="pill pill--f2f"
            style={{ fontSize: "0.75rem", padding: "3px 8px" }}
          >
            {schedule.modality || "Face-to-Face"}
          </span>
        </div>

        {/* Primary Subject Info Card */}
        <div
          style={{
            padding: 14,
            background: "var(--srcb-surface)",
            border: "1px solid var(--srcb-border)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(2, 132, 199, 0.12)",
                color: "#0284c7",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#0284c7",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {schedule.subjectCode}
              </span>
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            className="action-button"
            onClick={onClose}
            style={{ minWidth: 110 }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
