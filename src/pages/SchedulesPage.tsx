import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  X,
  CalendarDays,
  ListFilter,
  CalendarRange,
  CalendarPlus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Download,
  Calendar,
  GraduationCap,
  DoorOpen,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Check,
  Building2,
  Users,
  Monitor,
  ShieldCheck,
  Layers,
  Copy,
  Loader2,
  Printer,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  FileText,
  Clock3,
  XCircle,
  CheckSquare,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import {
  validateScheduleSlot,
  findAvailableRoomForSlot,
  formatGroupedAvailability,
  isTimeOverlapping,
  parseTimeToMinutes,
  isGeneralSubject,
  getPairedDay,
  getExpectedSubjectDuration,
  calculateEndTimeFromStart,
  SRCB_STANDARD_TIME_SLOTS,
  isSrcbStandaloneDay,
  canTeacherTeachSubject,
} from "../utils/scheduling";
import { getProgramTheme, getProgramColor } from "../utils/programColors";
import { ScheduleDetailsModal } from "../components/schedule/ScheduleDetailsModal";
import { ScheduleAdjustmentRequestModal } from "../components/schedule/ScheduleAdjustmentRequestModal";
import { AdminAdjustmentReviewModal } from "../components/schedule/AdminAdjustmentReviewModal";
import { TimetableSkeleton, CardGridSkeleton } from "../components/common/Skeleton";
import { Tooltip } from "../components/common/Tooltip";
import { SearchableSelect, type SearchableOption } from "../components/common/SearchableSelect";
import { useNotifications } from "../contexts/NotificationContext";
import type { ClassScheduleItem, ClassModality, BuildingType, ScheduleAdjustmentRequest } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  "07:00 AM - 07:30 AM",
  "07:30 AM - 08:00 AM",
  "08:00 AM - 08:30 AM",
  "08:30 AM - 09:00 AM",
  "09:00 AM - 09:30 AM",
  "09:30 AM - 10:00 AM",
  "10:00 AM - 10:30 AM",
  "10:30 AM - 11:00 AM",
  "11:00 AM - 11:30 AM",
  "11:30 AM - 12:00 PM",
  "12:00 PM - 12:30 PM",
  "12:30 PM - 01:00 PM",
  "01:00 PM - 01:30 PM",
  "01:30 PM - 02:00 PM",
  "02:00 PM - 02:30 PM",
  "02:30 PM - 03:00 PM",
  "03:00 PM - 03:30 PM",
  "03:30 PM - 04:00 PM",
  "04:00 PM - 04:30 PM",
  "04:30 PM - 05:00 PM",
  "05:00 PM - 05:30 PM",
  "05:30 PM - 06:00 PM",
  "06:00 PM - 06:30 PM",
  "06:30 PM - 07:00 PM",
  "07:00 PM - 07:30 PM",
  "07:30 PM - 08:00 PM",
  "08:00 PM - 08:30 PM",
  "08:30 PM - 09:00 PM",
];

const TIME_POINTS = [
  "07:00 AM",
  "07:30 AM",
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
  "08:30 PM",
  "09:00 PM",
];

function getTimeDurationStr(timeRange: string): string | null {
  if (!timeRange || !timeRange.includes("-")) return null;
  const [startStr, endStr] = timeRange.split("-").map((s) => s.trim());
  if (!startStr || !endStr) return null;
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  if (isNaN(startMin) || isNaN(endMin) || endMin <= startMin) return null;
  const totalMin = endMin - startMin;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  return `${mins} min${mins > 1 ? "s" : ""}`;
}

function slotToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  return parseTimeToMinutes(timeStr);
}

function isScheduleInSlot(scheduleTime: string, gridSlot: string) {
  if (!scheduleTime || !gridSlot) return false;
  if (scheduleTime.trim().toLowerCase() === gridSlot.trim().toLowerCase()) return true;

  const [sStartStr, sEndStr] = scheduleTime.split("-");
  const [gStartStr, gEndStr] = gridSlot.split("-");
  if (!sStartStr || !gStartStr) return false;

  const sStart = slotToMinutes(sStartStr);
  const sEnd = sEndStr ? slotToMinutes(sEndStr) : sStart + 30;
  const gStart = slotToMinutes(gStartStr);
  const gEnd = gEndStr ? slotToMinutes(gEndStr) : gStart + 30;

  return sStart < gEnd && gStart < sEnd;
}

// Determines the first matching slot row index for a schedule item
function getScheduleStartSlotIdx(scheduleTime: string) {
  if (!scheduleTime) return -1;
  const [sStartStr] = scheduleTime.split("-");
  const sStart = slotToMinutes(sStartStr);

  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const [gStartStr, gEndStr] = TIME_SLOTS[i].split("-");
    const gStart = slotToMinutes(gStartStr);
    const gEnd = gEndStr ? slotToMinutes(gEndStr) : gStart + 30;
    if (sStart >= gStart && sStart < gEnd) {
      return i;
    }
  }

  for (let i = 0; i < TIME_SLOTS.length; i++) {
    if (isScheduleInSlot(scheduleTime, TIME_SLOTS[i])) {
      return i;
    }
  }
  return 0;
}

// Calculates how many consecutive 30-min slot rows this schedule spans
function getScheduleRowSpan(scheduleTime: string) {
  if (!scheduleTime) return 1;
  const startIdx = getScheduleStartSlotIdx(scheduleTime);
  let matchingCount = 0;
  for (let i = startIdx; i < TIME_SLOTS.length; i++) {
    if (isScheduleInSlot(scheduleTime, TIME_SLOTS[i])) {
      matchingCount++;
    } else {
      break;
    }
  }
  return Math.max(1, matchingCount);
}

const PROGRAM_COURSE_MAP: Record<string, string[]> = {
  CJEP: ["CJEP", "BSCRIM", "CRIM", "CRIMINOLOGY"],
  BSCRIM: ["CJEP", "BSCRIM", "CRIM", "CRIMINOLOGY"],
  CRIM: ["CJEP", "BSCRIM", "CRIM", "CRIMINOLOGY"],
  ITP: ["ITP", "BSIT", "BSCS", "IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE"],
  BSIT: ["ITP", "BSIT", "BSCS", "IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE"],
  BSCS: ["ITP", "BSIT", "BSCS", "IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE"],
  BAP: ["BAP", "BSA", "BSBA", "BA", "BUSINESS ADMINISTRATION"],
  BSA: ["BAP", "BSA", "BSBA", "BA", "BUSINESS ADMINISTRATION"],
  BSBA: ["BAP", "BSA", "BSBA", "BA", "BUSINESS ADMINISTRATION"],
  HMP: ["HMP", "BSHM", "HM", "HOSPITALITY MANAGEMENT"],
  BSHM: ["HMP", "BSHM", "HM", "HOSPITALITY MANAGEMENT"],
  TEP: ["TEP", "BSED", "BEED", "EDUC", "EDUCATION", "TEACHER EDUCATION"],
  BSED: ["TEP", "BSED", "BEED", "EDUC", "EDUCATION", "TEACHER EDUCATION"],
  BEED: ["TEP", "BSED", "BEED", "EDUC", "EDUCATION", "TEACHER EDUCATION"],
};

function isSubjectMatchingSection(sub: any, sec: any): boolean {
  if (!sec || !sub) return true;

  // Universal General Subjects rule:
  // If the subject is General Education / non-major, ALL academic programs can take it!
  if (isGeneralSubject(sub) || !sub.isMajor) {
    return true;
  }

  const secCourse = String(sec.course || sec.course_code || "").trim().toUpperCase();
  const secProg = String(sec.program || sec.department || "").trim().toUpperCase();
  const secYearStr = String(sec.yearLevel || sec.year_level || sec.year || "").replace(/\D/g, "");
  const secLabel = String(sec.section || sec.section_label || "").trim().toUpperCase();

  const subProg = String(sub.program || sub.programCode || sub.department || sub.courseCode || "").trim().toUpperCase();
  const subYearStr = String(sub.yearLevel || sub.year || "").replace(/\D/g, "");
  const isMajor = Boolean(sub.isMajor);

  const getAliases = (key: string) => {
    if (!key) return [];
    const direct = PROGRAM_COURSE_MAP[key] || [key];
    return Array.from(new Set([key, ...direct]));
  };

  const secAliases = [
    ...getAliases(secCourse),
    ...getAliases(secProg),
  ];

  for (const k of Object.keys(PROGRAM_COURSE_MAP)) {
    if (secLabel.includes(k) || secLabel.startsWith(k)) {
      secAliases.push(...getAliases(k));
    }
  }

  const subAliases = getAliases(subProg);

  let programMatches = false;
  if (!subProg || subProg === "ALL" || subProg === "GEN ED" || subProg === "GENERAL EDUCATION") {
    programMatches = true;
  } else if (secAliases.some((sa) => subAliases.some((sb) => sa === sb || sa.includes(sb) || sb.includes(sa)))) {
    programMatches = true;
  }

  let yearMatches = true;
  if (secYearStr && subYearStr) {
    yearMatches = secYearStr === subYearStr;
  }

  if (isMajor) {
    return programMatches && yearMatches;
  }

  return true;
}

function formatSectionDisplay(sec?: any): string {
  if (!sec) return "";
  const rawSec = String(sec.section || sec.section_label || sec.name || "").trim();
  const rawCourse = String(sec.course || sec.course_code || sec.program || "").trim();
  const rawYl = String(sec.yearLevel || sec.year_level || "").trim();
  if (!rawSec) return "";
  if (rawCourse && rawSec.toLowerCase().startsWith(rawCourse.toLowerCase())) {
    return rawSec;
  }
  if (rawCourse && rawYl) {
    return `${rawCourse} ${rawYl}-${rawSec}`;
  }
  if (rawCourse) {
    return `${rawCourse} ${rawSec}`;
  }
  return rawSec;
}

export function isSameSectionMatch(sec: any, s: ClassScheduleItem | any): boolean {
  if (!sec || !s) return false;

  // 1. Direct ID match
  const secId = sec.id || (sec as any).sectionId || (sec as any).section_id;
  const sSecId = s.sectionId || (s as any).section_id;
  if (secId && sSecId && String(secId) === String(sSecId)) {
    return true;
  }

  const sSec = String(s.section || "").trim().toLowerCase();
  if (!sSec) return false;

  const displayLabel = formatSectionDisplay(sec).trim().toLowerCase();
  const rawSec = String(sec.section || sec.section_label || sec.name || "").trim().toLowerCase();
  const secName = String(sec.sectionName || "").trim().toLowerCase();

  if (displayLabel && sSec === displayLabel) return true;
  if (rawSec && sSec === rawSec) return true;
  if (secName && sSec === secName) return true;

  // Normalized alphanumeric comparison (e.g. "bsit 1-a" -> "bsit1a")
  const normS = sSec.replace(/[^a-z0-9]/g, "");
  const normDisplay = displayLabel.replace(/[^a-z0-9]/g, "");
  if (normS && normDisplay && normS === normDisplay) return true;

  const course = String(sec.course || sec.course_code || sec.program || "").trim().toLowerCase();
  const yl = String(sec.yearLevel || sec.year_level || "").trim().toLowerCase();
  if (course && rawSec) {
    const normComposed = `${course}${yl}${rawSec}`.replace(/[^a-z0-9]/g, "");
    if (normS && normComposed && normS === normComposed) return true;
    if (yl && `${course} ${yl}-${rawSec}` === sSec) return true;
    if (`${course} ${rawSec}` === sSec) return true;
  }

  return false;
}

export function isSectionScheduledAtTime(
  sec: any,
  day: string,
  time: string,
  checkPaired: boolean = false,
  pDay: string | null = null,
  pTime: string | null = null,
  items: ClassScheduleItem[] = [],
  excludeScheduleId?: string
): boolean {
  if (!day || !time || !sec || !Array.isArray(items)) return false;
  return items.some((s) => {
    if (excludeScheduleId && String(s.id) === String(excludeScheduleId)) return false;
    if (!isSameSectionMatch(sec, s)) return false;

    // Check primary day & time slot
    if (s.day && s.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(s.time, time)) {
      return true;
    }

    // Check paired day & time slot if paired scheduling is enabled
    if (checkPaired && pDay && pTime) {
      if (s.day && s.day.toLowerCase() === pDay.toLowerCase() && isTimeOverlapping(s.time, pTime)) {
        return true;
      }
    }

    return false;
  });
}





interface DayTimelineBlock {
  key: string;
  startIdx: number;
  span: number;
  endIdx: number;
  slot: string;
  items: ClassScheduleItem[];
  trackIndex: number;
  totalTracks: number;
  leftPercent: number;
  widthPercent: number;
}

function buildDayTimelineBlocks(daySchedules: ClassScheduleItem[]): DayTimelineBlock[] {
  if (!daySchedules || daySchedules.length === 0) return [];

  // Group items into non-overlapping clusters sorted chronologically
  const sorted = [...daySchedules].sort((a, b) => {
    const aStart = Math.max(0, getScheduleStartSlotIdx(a.time));
    const bStart = Math.max(0, getScheduleStartSlotIdx(b.time));
    if (aStart !== bStart) return aStart - bStart;
    const aSpan = Math.max(1, getScheduleRowSpan(a.time));
    const bSpan = Math.max(1, getScheduleRowSpan(b.time));
    return bSpan - aSpan;
  });

  interface Cluster {
    startIdx: number;
    endIdx: number;
    items: ClassScheduleItem[];
  }

  const clusters: Cluster[] = [];

  for (const item of sorted) {
    const startIdx = Math.max(0, getScheduleStartSlotIdx(item.time));
    const span = Math.max(1, getScheduleRowSpan(item.time));
    const endIdx = Math.min(TIME_SLOTS.length, startIdx + span);

    // Merge overlapping / concurrent schedules into the same single-track cluster
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster && startIdx < lastCluster.endIdx) {
      lastCluster.endIdx = Math.max(lastCluster.endIdx, endIdx);
      lastCluster.items.push(item);
    } else {
      clusters.push({
        startIdx,
        endIdx,
        items: [item],
      });
    }
  }

  return clusters.map((c, idx) => {
    const span = Math.max(1, c.endIdx - c.startIdx);
    const startStr = TIME_SLOTS[c.startIdx]?.split("-")[0]?.trim() || "07:00 AM";
    const endStr =
      TIME_SLOTS[c.endIdx - 1]?.split("-")[1]?.trim() ||
      TIME_SLOTS[c.startIdx]?.split("-")[1]?.trim() ||
      "08:30 AM";
    const slotStr = `${startStr} - ${endStr}`;

    return {
      key: `block-${c.startIdx}-${span}-${c.items[0]?.id || idx}`,
      startIdx: c.startIdx,
      span,
      endIdx: c.endIdx,
      slot: slotStr,
      items: c.items,
      trackIndex: 0,
      totalTracks: 1,
      leftPercent: 0,
      widthPercent: 100,
    };
  });
}

interface StackedScheduleCellProps {
  day: string;
  slot: string;
  slotIdx: number;
  rowSpan: number;
  schedules: ClassScheduleItem[];
  canCreate: boolean;
  onEdit: (item: ClassScheduleItem) => void;
  onDelete: (item: ClassScheduleItem) => void;
  onView: (item: ClassScheduleItem) => void;
  onAddAtSlot: (day: string, slotTime: string) => void;
  onOpenStackGroup?: (group: { day: string; slot: string; schedules: ClassScheduleItem[] }) => void;
  onAssignPlotted?: (item: ClassScheduleItem) => void;
  onRemovePlotted?: (id: string) => void;
  isSelectMode?: boolean;
  selectedScheduleIds?: Set<string>;
  onToggleSelect?: (scheduleId: string) => void;
}

function getClusterConflicts(items: ClassScheduleItem[]) {
  const roomMap: Record<string, ClassScheduleItem[]> = {};
  const facultyMap: Record<string, ClassScheduleItem[]> = {};

  items.forEach((item) => {
    if (item.isPlotted) return;
    if (item.room && item.room !== "TBA" && item.room !== "TBD") {
      roomMap[item.room] = roomMap[item.room] || [];
      roomMap[item.room].push(item);
    }
    if (item.faculty && item.faculty !== "TBA" && item.faculty !== "TBD" && item.faculty !== "Unassigned") {
      facultyMap[item.faculty] = facultyMap[item.faculty] || [];
      facultyMap[item.faculty].push(item);
    }
  });

  const roomClashes = Object.entries(roomMap).filter(([_, list]) => list.length > 1);
  const facultyClashes = Object.entries(facultyMap).filter(([_, list]) => list.length > 1);
  const totalConflicts = roomClashes.length + facultyClashes.length;

  return {
    roomClashes,
    facultyClashes,
    totalConflicts,
    hasConflict: totalConflicts > 0,
    hasRoomClash: roomClashes.length > 0,
    hasFacultyClash: facultyClashes.length > 0,
  };
}

function StackedScheduleCell({
  day,
  slot,
  slotIdx: _slotIdx,
  rowSpan,
  schedules,
  canCreate,
  onEdit: _onEdit,
  onDelete: _onDelete,
  onView: _onView,
  onAddAtSlot,
  onOpenStackGroup,
  onAssignPlotted,
  onRemovePlotted,
  isSelectMode,
  selectedScheduleIds,
  onToggleSelect,
}: StackedScheduleCellProps) {
  if (!schedules || schedules.length === 0) return null;

  // Single Plotted Time Slot Handling
  if (schedules.length === 1 && schedules[0]?.isPlotted) {
    const pItem = schedules[0];
    return (
      <div
        data-testid="plotted-slot-card"
        className="plotted-time-card"
        onClick={(e) => {
          e.stopPropagation();
          onAssignPlotted?.(pItem);
        }}
        role="button"
        tabIndex={0}
        aria-label={`Plotted time schedule on ${day} ${pItem.time}. Click to add subject and room.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAssignPlotted?.(pItem);
          }
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--srcb-royal, #2563eb)", fontWeight: 700, fontSize: "0.74rem" }}>
            <Clock size={12} />
            <span>{pItem.time}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="plotted-time-badge">Plotted</span>
            {canCreate && (
              <button
                type="button"
                className="sched-card-quick-add-btn"
                title={`Add another class to this slot (${day} ${pItem.time})`}
                aria-label={`Add another class to this slot (${day} ${pItem.time})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAtSlot?.(day, pItem.time);
                }}
              >
                <Plus size={10} />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: "0.68rem", color: "var(--srcb-text-muted, #64748b)", margin: "2px 0" }}>
          Ready for Subject & Room
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
          <button
            type="button"
            className="action-button"
            onClick={(e) => {
              e.stopPropagation();
              onAssignPlotted?.(pItem);
            }}
            style={{
              padding: "2px 6px",
              fontSize: "0.68rem",
              fontWeight: 700,
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <Plus size={11} />
            <span>Add Subject & Room</span>
          </button>
          <button
            type="button"
            title="Remove plotted time slot"
            onClick={(e) => {
              e.stopPropagation();
              onRemovePlotted?.(pItem.id);
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--srcb-border)",
              borderRadius: 4,
              padding: "2px 4px",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  }

  const isSingle = schedules.length === 1;
  const timeStr = schedules[0]?.time || slot;
  const conflicts = getClusterConflicts(schedules);
  const progTheme = getProgramTheme(schedules[0]);

  let pillLabel = "";
  if (conflicts.hasConflict) {
    pillLabel = `⚠️ ${schedules.length} ${schedules.length === 1 ? "CLASS" : "CLASSES"}`;
  } else if (isSingle) {
    const code = schedules[0]?.subjectCode;
    pillLabel = code ? `${code} • 1 Class` : "1 CLASS";
  } else {
    pillLabel = `${schedules.length} CLASSES`;
  }

  if (isSingle) {
    const sItem = schedules[0];
    const code = sItem?.subjectCode || "";
    const progColor = progTheme.primary || sItem.color || "var(--srcb-royal, #2563eb)";
    const modeBadge = sItem.classMode === "Laboratory" ? "LAB" : "LEC";
    const isSelected = Boolean(selectedScheduleIds?.has(sItem.id));

    return (
      <div
        data-testid="same-time-stack-card"
        className={`same-time-cluster-cell-wrapper is-single-wrapper ${isSelected ? "is-selected-cell" : ""}`}
        onClick={() => {
          if (isSelectMode) {
            onToggleSelect?.(sItem.id);
          } else {
            onOpenStackGroup?.({ day, slot: timeStr, schedules });
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${pillLabel} scheduled on ${day} ${timeStr}. Click to view class details.`}
        style={{
          outline: isSelected ? "2.5px solid var(--srcb-royal, #2563eb)" : undefined,
          borderRadius: 6,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isSelectMode) {
              onToggleSelect?.(sItem.id);
            } else {
              onOpenStackGroup?.({ day, slot: timeStr, schedules });
            }
          }
        }}
      >
        <div
          className="same-time-cluster-card"
          style={{ borderLeftColor: progColor }}
        >
          <div className="sched-card-top-row">
            <div className="sched-card-code-badge" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {(isSelectMode || isSelected) && (
                <input
                  type="checkbox"
                  data-testid={`cell-checkbox-${sItem.id}`}
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(sItem.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 14, height: 14, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer", marginRight: 2 }}
                />
              )}
              <BookOpen size={12} style={{ color: progColor, flexShrink: 0 }} />
              <span className="cluster-pill-text">{pillLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                className="sched-card-mode-pill"
                style={{
                  background: sItem.classMode === "Laboratory" ? "rgba(124, 58, 237, 0.12)" : "rgba(37, 99, 235, 0.12)",
                  color: sItem.classMode === "Laboratory" ? "#7c3aed" : "var(--srcb-royal, #2563eb)",
                }}
              >
                {modeBadge}
              </span>
              {canCreate && (
                <button
                  type="button"
                  className="sched-card-quick-add-btn"
                  title={`Add another class to this slot (${day} ${timeStr})`}
                  aria-label={`Add another class to this slot (${day} ${timeStr})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAtSlot?.(day, timeStr);
                  }}
                >
                  <Plus size={10} />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>

          {rowSpan >= 2 && sItem.subject && (
            <div className="sched-card-title" title={sItem.subject}>
              {sItem.subject}
            </div>
          )}

          <div className="sched-card-meta-row">
            {sItem.room && (
              <span className="sched-card-chip sched-card-chip--room" title={`Classroom: ${sItem.room}`}>
                <DoorOpen size={10} />
                <span>{sItem.room}</span>
              </span>
            )}
            {sItem.section && (
              <span className="sched-card-chip sched-card-chip--sec" title={`Section: ${sItem.section}`}>
                <Users size={10} />
                <span>{sItem.section}</span>
              </span>
            )}
            {rowSpan >= 3 && sItem.faculty && (
              <span className="sched-card-chip sched-card-chip--fac" title={`Instructor: ${sItem.faculty}`}>
                <UserCheck size={10} />
                <span>{sItem.faculty}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Multiple schedules / concurrent classes or plotted items in this same time slot
  const allSlotSelected = schedules.length > 0 && schedules.every((s) => selectedScheduleIds?.has(s.id));
  const someSlotSelected = schedules.some((s) => selectedScheduleIds?.has(s.id));

  return (
    <div
      data-testid="same-time-stack-card"
      className={`same-time-cluster-cell-wrapper is-multi-wrapper ${someSlotSelected ? "is-selected-cell" : ""}`}
      onClick={() => onOpenStackGroup?.({ day, slot: timeStr, schedules })}
      role="button"
      tabIndex={0}
      aria-label={`${pillLabel} scheduled on ${day} ${timeStr}. Click to view class details.`}
      style={{
        outline: allSlotSelected ? "2.5px solid var(--srcb-royal, #2563eb)" : (someSlotSelected ? "1.5px dashed var(--srcb-royal, #2563eb)" : undefined),
        borderRadius: 6,
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenStackGroup?.({ day, slot: timeStr, schedules });
        }
      }}
    >
      <div className="same-time-cluster-card multi-class-card">
        <div className="sched-card-top-row">
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {(isSelectMode || someSlotSelected) && (
              <input
                type="checkbox"
                data-testid={`multi-slot-checkbox-${day}-${timeStr.replace(/\s+/g, "_")}`}
                checked={allSlotSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  schedules.forEach((s) => {
                    if (allSlotSelected) {
                      if (selectedScheduleIds?.has(s.id)) onToggleSelect?.(s.id);
                    } else {
                      if (!selectedScheduleIds?.has(s.id)) onToggleSelect?.(s.id);
                    }
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 14, height: 14, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer" }}
                title={allSlotSelected ? "Deselect all classes in this slot" : "Select all classes in this slot"}
              />
            )}
            <div
              className={`same-time-cluster-pill ${conflicts.hasConflict ? "is-conflict-pill" : ""}`}
            >
              {conflicts.hasConflict ? (
                <span className="cluster-pill-text">{pillLabel}</span>
              ) : (
                <>
                  <Layers size={12} className="cluster-pill-icon" />
                  <span className="cluster-pill-text">{pillLabel}</span>
                </>
              )}
            </div>
          </div>

          {canCreate && (
            <button
              type="button"
              className="sched-card-quick-add-btn"
              title={`Add another class to this slot (${day} ${timeStr})`}
              aria-label={`Add another class to this slot (${day} ${timeStr})`}
              onClick={(e) => {
                e.stopPropagation();
                onAddAtSlot?.(day, timeStr);
              }}
            >
              <Plus size={10} />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Informative Preview of the concurrent classes & plotted slots */}
        <div className="same-time-cluster-preview-items">
          {schedules.slice(0, rowSpan >= 2 ? 3 : 2).map((item, idx) => (
            <div key={item.id || idx} className="same-time-preview-row">
              <span
                className="preview-indicator"
                style={{ background: item.isPlotted ? "#4f46e5" : (item.color || "var(--srcb-royal, #2563eb)") }}
              />
              <span className="preview-code">
                {item.isPlotted ? "PLOTTED" : (item.subjectCode || "Class")}
              </span>
              <span className="preview-meta">
                {item.isPlotted ? "Awaiting Subject" : (item.section ? item.section : (item.room || ""))}
              </span>
            </div>
          ))}
          {schedules.length > (rowSpan >= 2 ? 3 : 2) && (
            <div className="preview-more-count">
              +{schedules.length - (rowSpan >= 2 ? 3 : 2)} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SchedulesPage() {
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("view") || searchParams.get("filter") || "grid") as "grid" | "list" | "unscheduled" | "requests";
  const [viewMode, setViewMode] = useState<"grid" | "list" | "unscheduled" | "requests">(
    initialView === "requests" ? "requests" : initialView === "unscheduled" ? "unscheduled" : initialView === "list" ? "list" : "grid"
  );
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("search") || "");
  const [matrixProgram, setMatrixProgram] = useState<string>("All");
  const [matrixYearLevel, setMatrixYearLevel] = useState<string>("All");

  // Permission Requests Governance Filters
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("all");
  const [requestActionFilter, setRequestActionFilter] = useState<string>("all");
  const [requestProgramFilter, setRequestProgramFilter] = useState<string>("all");
  const [requestSearchQuery, setRequestSearchQuery] = useState<string>("");
  const [selectedPermissionSubject, setSelectedPermissionSubject] = useState<any | null>(null);
  const [isDirectPermissionModalOpen, setIsDirectPermissionModalOpen] = useState(false);

  useEffect(() => {
    const v = searchParams.get("view") || searchParams.get("filter");
    if (v === "requests") {
      setViewMode("requests");
    } else if (v === "unscheduled") {
      setViewMode("unscheduled");
    } else if (v === "list") {
      setViewMode("list");
    } else {
      setViewMode("grid");
    }
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

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>("All");
  const [durationFilter, setDurationFilter] = useState<string>("All");
  const [isOpen, setIsOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ClassScheduleItem | null>(null);
  const [scheduleToAdjust, setScheduleToAdjust] = useState<ClassScheduleItem | null>(null);
  const [requestToReview, setRequestToReview] = useState<ScheduleAdjustmentRequest | null>(null);
  const [adjustmentRequests, setAdjustmentRequests] = useState<ScheduleAdjustmentRequest[]>([]);
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassScheduleItem | null>(null);
  const [schedulesToBulkDelete, setSchedulesToBulkDelete] = useState<ClassScheduleItem[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(new Set());
  const [selectedInDrawerIds, setSelectedInDrawerIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [activeStackGroup, setActiveStackGroup] = useState<{ day: string; slot: string; schedules: ClassScheduleItem[] } | null>(null);
  const [expandedStackItemId, setExpandedStackItemId] = useState<string | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; slotIdx: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: string; slotIdx: number } | null>(null);

  // Multi-Perspective Timetable State (Program vs Section vs Faculty vs Room)
  const [perspectiveMode, setPerspectiveMode] = useState<"all" | "program" | "section" | "faculty" | "room">("all");
  const [selectedPerspectiveEntity, setSelectedPerspectiveEntity] = useState<string>("All");

  const toast = useToast();
  const { addNotification } = useNotifications();
  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const currentUserName = localStorage.getItem("userName") || "";
  const currentTeacherId = localStorage.getItem("teacherId") || "";
  const canCreate = role === "super_admin" || role === "admin" || role === "program_head" || role === "dean";
  const isAdmin = role === "admin" || role === "super_admin" || role === "dsa";
  const isDeanOrAdmin = role === "admin" || role === "super_admin" || role === "dean";

  // Plotted Time Slots (Dean plots all time schedules first, then adds subjects and rooms)
  const [plottedSlots, setPlottedSlots] = useState<{ id: string; day: string; time: string; program?: string; durationMinutes?: number; createdAt?: number }[]>(() => {
    try {
      const saved = localStorage.getItem(`srcb_plotted_time_slots_${selectedProgram?.key || 'ALL'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [editingPlottedSlotId, setEditingPlottedSlotId] = useState<string | null>(null);
  const [isBatchPlotterOpen, setIsBatchPlotterOpen] = useState(false);
  const [batchPlotDays, setBatchPlotDays] = useState<string[]>(["Monday", "Thursday"]);
  const [batchPlotTimes, setBatchPlotTimes] = useState<string[]>([
    "07:30 AM - 09:30 AM",
    "09:30 AM - 11:30 AM",
  ]);


  useEffect(() => {
    try {
      localStorage.setItem(`srcb_plotted_time_slots_${selectedProgram?.key || 'ALL'}`, JSON.stringify(plottedSlots));
    } catch { }
  }, [plottedSlots, selectedProgram?.key]);

  // Automated Faculty Gmail Dispatch Modal
  const [isGmailDispatchModalOpen, setIsGmailDispatchModalOpen] = useState(false);
  const [selectedDispatchFacultyId, setSelectedDispatchFacultyId] = useState<string>("ALL");
  const [dispatchPreview, setDispatchPreview] = useState<any>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [customDispatchNotes, setCustomDispatchNotes] = useState("");

  const handleOpenGmailDispatch = (facultyId?: string) => {
    const targetId = facultyId || "ALL";
    setSelectedDispatchFacultyId(targetId);
    setCustomDispatchNotes("");
    setIsGmailDispatchModalOpen(true);
    if (targetId !== "ALL") {
      api.get(`/faculty-dispatch/preview/${encodeURIComponent(targetId)}`)
        .then((res: any) => setDispatchPreview(res.data?.data || null))
        .catch(() => setDispatchPreview(null));
    } else {
      setDispatchPreview(null);
    }
  };

  const handleDispatchFacultyChange = (teacherId: string) => {
    setSelectedDispatchFacultyId(teacherId);
    if (teacherId !== "ALL") {
      api.get(`/faculty-dispatch/preview/${encodeURIComponent(teacherId)}`)
        .then((res: any) => setDispatchPreview(res.data?.data || null))
        .catch(() => setDispatchPreview(null));
    } else {
      setDispatchPreview(null);
    }
  };

  const handleExecuteGmailDispatch = async () => {
    setIsDispatching(true);
    try {
      if (selectedDispatchFacultyId === "ALL") {
        const res = await api.post("/faculty-dispatch/batch", {
          programCode: selectedProgram.key,
        });
        toast.push(res.data?.message || "Schedules successfully dispatched to faculty via institutional Gmail!", "success");
      } else {
        const targetFac = facultyList.find((f) => f.id === selectedDispatchFacultyId || f.name === selectedDispatchFacultyId);
        const res = await api.post("/faculty-dispatch/send", {
          teacherId: selectedDispatchFacultyId,
          recipientEmail: targetFac?.email,
          customNotes: customDispatchNotes,
        });
        toast.push(res.data?.message || `Schedule dispatched to ${targetFac?.name || selectedDispatchFacultyId} via Gmail!`, "success");
      }
      setIsGmailDispatchModalOpen(false);
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to dispatch schedule via Gmail", "error");
    } finally {
      setIsDispatching(false);
    }
  };

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

  interface ScheduleFormData {
    day: string;
    time: string;
    subjectCode: string;
    subject: string;
    section: string;
    facultyId: string;
    faculty: string;
    room: string;
    pairedRoom: string;
    building: BuildingType;
    pairedBuilding: BuildingType;
    modality: ClassModality;
    onlineLink: string;
    isMajor: boolean;
    classMode: "Lecture" | "Laboratory";
    program: string;
    isCombinedCohort?: boolean;
  }

  const [form, setForm] = useState<ScheduleFormData>({
    day: "Monday",
    time: "07:00 AM - 08:30 AM",
    subjectCode: "",
    subject: "",
    section: "",
    facultyId: "",
    faculty: "",
    room: "COL-101",
    pairedRoom: "",
    building: "College Building" as BuildingType,
    pairedBuilding: "College Building" as BuildingType,
    modality: "Face-to-Face" as ClassModality,
    onlineLink: "",
    isMajor: true,
    classMode: "Lecture" as "Lecture" | "Laboratory",
    program: selectedProgram.key || "BSIT",
    isCombinedCohort: false,
  });
  const [pairedEnabled, setPairedEnabled] = useState(true);

  const handleMouseDownCell = (day: string, slotIdx: number) => {
    if (!canCreate) return;
    setIsDraggingGrid(true);
    setDragStart({ day, slotIdx });
    setDragCurrent({ day, slotIdx });
  };

  const handleMouseEnterCell = (day: string, slotIdx: number) => {
    if (isDraggingGrid && dragStart && dragStart.day === day) {
      setDragCurrent({ day, slotIdx });
    }
  };

  const handleMouseUpGrid = () => {
    if (!isDraggingGrid || !dragStart || !dragCurrent) {
      setIsDraggingGrid(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const minIdx = Math.min(dragStart.slotIdx, dragCurrent.slotIdx);
    const maxIdx = Math.max(dragStart.slotIdx, dragCurrent.slotIdx);
    const startSlotStr = TIME_SLOTS[minIdx].split("-")[0].trim();
    const endSlotStr = TIME_SLOTS[maxIdx].split("-")[1].trim();
    const day = dragStart.day;

    const firstSub = availableSubjects[0] || subjectsList[0];
    const isFirstMajor = Boolean(firstSub?.isMajor) && !isGeneralSubject(firstSub);
    const defMode: "Lecture" | "Laboratory" = isFirstMajor && Number(firstSub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";
    const duration = getExpectedSubjectDuration(firstSub, defMode);

    // If single cell clicked, use the official institutional class duration (1.5h Minor, 2h Major Lec, 3h Major Lab)
    const calculatedEnd = calculateEndTimeFromStart(startSlotStr, duration);
    const calculatedTime = minIdx === maxIdx ? `${startSlotStr} - ${calculatedEnd}` : `${startSlotStr} - ${endSlotStr}`;

    const freeRoom = findAvailableRoomForSlot(day, calculatedTime, roomsList, scheduleItems);
    const defFac = facultyList.find((f) => f.id === firstSub?.instructorId) || facultyList[0];
    const defSec = sectionsList.find((s) => s.program === firstSub?.program) || sectionsList[0];
    const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
    const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
    const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

    setEditingSchedule(null);
    setForm({
      day,
      time: calculatedTime,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      section: defSecVal,
      facultyId: defFac?.id || "",
      faculty: defFac?.name || "",
      room: defRoom,
      pairedRoom: "",
      building: defBuilding,
      pairedBuilding: defBuilding,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: isFirstMajor,
      classMode: defMode,
      program: firstSub?.program || selectedProgram.key || "BSIT",
    });
    setPairedEnabled(true);

    setIsDraggingGrid(false);
    setDragStart(null);
    setDragCurrent(null);
    setModalStep(1);
    setIsOpen(true);
  };

  const buildingOptions: BuildingType[] = useMemo(() => {
    return ["College Building", "JHS Building", "SHS Building"];
  }, []);

  const availableRoomsForBuilding = useMemo(() => {
    if (!form.building) return roomsList;
    const matchingRooms = roomsList.filter(
      (r) =>
        r.building &&
        (r.building.toLowerCase().trim() === form.building.toLowerCase().trim() ||
          r.building.toLowerCase().includes(form.building.split(" ")[0].toLowerCase()))
    );
    return matchingRooms.length > 0 ? matchingRooms : roomsList;
  }, [roomsList, form.building]);

  const isSlotInDragRange = (day: string, slotIdx: number) => {
    if (!isDraggingGrid || !dragStart || !dragCurrent || dragStart.day !== day) return false;
    const minIdx = Math.min(dragStart.slotIdx, dragCurrent.slotIdx);
    const maxIdx = Math.max(dragStart.slotIdx, dragCurrent.slotIdx);
    return slotIdx >= minIdx && slotIdx <= maxIdx;
  };

  const [dropTarget, setDropTarget] = useState<{ day: string; slot: string } | null>(null);

  const handleDropOnCell = async (day: string, slot: string, dataStr: string) => {
    setDropTarget(null);
    if (!canCreate || !dataStr) return;

    try {
      const payload = JSON.parse(dataStr);

      if (payload.type === "move_schedule") {
        const item: ClassScheduleItem = payload.item;
        const updatedItem = { ...item, day, time: slot };
        await api.put(`/schedules/${encodeURIComponent(item.id)}`, updatedItem);
        toast.push(`Moved class to ${day} at ${slot}`, "success");
        fetchSchedules();
      } else if (payload.type === "new_subject") {
        const sub = payload.subject;
        const freeRoom = findAvailableRoomForSlot(day, slot, roomsList, scheduleItems);
        const defFac = facultyList.find((f) => {
          if (sub.instructorId && f.id === sub.instructorId) {
            return !scheduleItems.some((s) => s.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(s.time, slot) && (s.facultyId === f.id || s.faculty === f.name));
          }
          return false;
        }) || facultyList.find((f) => !scheduleItems.some((s) => s.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(s.time, slot) && (s.facultyId === f.id || s.faculty === f.name))) || facultyList[0];

        const defSec = sectionsList.find((s) => {
          if (sub.program && s.program && s.program !== sub.program) return false;
          const sLabel = s.course ? `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() : s.section;
          return !scheduleItems.some((sc) => sc.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(sc.time, slot) && (sc.section === sLabel || sc.section === s.section));
        }) || sectionsList.find((s) => {
          const sLabel = s.course ? `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() : s.section;
          return !scheduleItems.some((sc) => sc.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(sc.time, slot) && (sc.section === sLabel || sc.section === s.section));
        }) || sectionsList[0];

        const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
        const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
        const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

        const isSubMajor = Boolean(sub?.isMajor) && !isGeneralSubject(sub);
        const defSubMode: "Lecture" | "Laboratory" = isSubMajor && Number(sub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";
        const duration = getExpectedSubjectDuration(sub, defSubMode);
        const [startSlot, endSlot] = slot.split("-").map((t) => t.trim());
        const hasValidSlot = Boolean(
          startSlot &&
          endSlot &&
          parseTimeToMinutes(endSlot) > parseTimeToMinutes(startSlot)
        );
        const calculatedEnd = calculateEndTimeFromStart(startSlot || "07:00 AM", duration);
        const finalSlotTime = hasValidSlot ? slot : (startSlot && calculatedEnd ? `${startSlot} - ${calculatedEnd}` : slot);

        setEditingSchedule(null);
        setForm({
          day,
          time: finalSlotTime,
          subjectCode: sub.code || "",
          subject: sub.name || "",
          section: defSecVal,
          facultyId: defFac?.id || "",
          faculty: defFac?.name || "",
          room: defRoom,
          pairedRoom: "",
          building: defBuilding,
          pairedBuilding: defBuilding,
          modality: "Face-to-Face",
          onlineLink: "",
          isMajor: isSubMajor,
          classMode: defSubMode,
          program: sub.program || selectedProgram.key || "BSIT",
        });
        setPairedEnabled(true);
        setModalStep(2);
        setIsOpen(true);
      }
    } catch (err: any) {
      toast.push(err?.message || err?.response?.data?.error || "Failed to update schedule location", "error");
      fetchSchedules();
    }
  };

  const [validationFeedback, setValidationFeedback] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>({ valid: true, errors: [], warnings: [] });

  const fetchAdjustmentRequests = async () => {
    try {
      const res = await api.get("/schedule-adjustment-requests");
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
      setAdjustmentRequests(list);
    } catch {
      setAdjustmentRequests([]);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await api.get("/schedules");
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
      setScheduleItems(list);
    } catch {
      setScheduleItems([]);
    }
  };

  useEffect(() => {
    setIsFetching(true);
    Promise.all([
      fetchSchedules(),
      fetchAdjustmentRequests(),
      api.get("/faculty").then((res: any) => setFacultyList(res.data?.data || [])).catch(() => setFacultyList([])),
      api.get("/subjects").then((res: any) => setSubjectsList(res.data?.data || [])).catch(() => setSubjectsList([])),
      api.get("/rooms").then((res: any) => setRoomsList(res.data?.data || [])).catch(() => setRoomsList([])),
      api.get("/sections").then((res: any) => setSectionsList(res.data?.data || [])).catch(() => setSectionsList([])),
    ]).finally(() => {
      setIsFetching(false);
    });
  }, []);

  useEffect(() => {
    const reqId = searchParams.get("requestId");
    if (reqId) {
      api
        .get(`/schedule-adjustment-requests/${reqId}`)
        .then((res: any) => {
          if (res.data?.data) {
            setRequestToReview(res.data.data);
          }
        })
        .catch(() => { });
    }
  }, [searchParams]);

  const availableSubjects = useMemo(() => {
    if (role === "program_head") {
      return subjectsList.filter((s) => isGeneralSubject(s) || matchesProgram(s.program || s.department));
    }
    return subjectsList;
  }, [role, subjectsList, selectedProgram.key, matchesProgram]);

  const availableSections = useMemo(() => {
    if (role === "program_head") {
      return sectionsList.filter((s) => matchesProgram(s.program || s.course));
    }
    return sectionsList;
  }, [role, sectionsList, selectedProgram.key, matchesProgram]);

  const availableFaculty = useMemo(() => {
    let list = facultyList;
    if (role === "program_head") {
      list = list.filter((f) => matchesProgram(f.programs || f.department));
    }
    // Program-specific major subject instructor restriction:
    // Teachers assigned to a specific program will only teach their program's major subjects
    const currentSub = form.subjectCode
      ? subjectsList.find((s) => s.code.toLowerCase() === form.subjectCode.toLowerCase())
      : null;
    if (currentSub && (currentSub.isMajor || form.isMajor)) {
      const targetProg = currentSub.program || form.program;
      if (targetProg && targetProg !== "ALL" && targetProg !== "UNIVERSAL") {
        list = list.filter((f) => canTeacherTeachSubject(f, currentSub, targetProg));
      }
    }
    return list;
  }, [role, facultyList, selectedProgram.key, matchesProgram, form.subjectCode, form.isMajor, form.program, subjectsList]);

  const scheduledSubjectCodes = useMemo(() => {
    return new Set(
      scheduleItems.map((s) => (s.subjectCode || "").toUpperCase()).filter(Boolean)
    );
  }, [scheduleItems]);

  const unscheduledSubjects = useMemo(() => {
    return availableSubjects.filter((sub) => {
      const codeMatches = scheduledSubjectCodes.has((sub.code || "").toUpperCase());
      const nameMatches = scheduleItems.some(
        (sc) => (sc.subject || "").toLowerCase() === (sub.name || "").toLowerCase()
      );
      return !codeMatches && !nameMatches;
    });
  }, [availableSubjects, scheduledSubjectCodes, scheduleItems]);

  const filteredUnscheduled = useMemo(() => {
    if (!query.trim()) return unscheduledSubjects;
    const q = query.toLowerCase();
    return unscheduledSubjects.filter(
      (sub) =>
        (sub.code && sub.code.toLowerCase().includes(q)) ||
        (sub.name && sub.name.toLowerCase().includes(q)) ||
        (sub.department && sub.department.toLowerCase().includes(q)) ||
        (sub.program && sub.program.toLowerCase().includes(q))
    );
  }, [unscheduledSubjects, query]);

  // Permission Requests Filtered List
  const filteredRequests = useMemo(() => {
    return adjustmentRequests.filter((r) => {
      if (requestStatusFilter !== "all" && String(r.status || "").toLowerCase() !== requestStatusFilter.toLowerCase()) {
        return false;
      }
      if (requestActionFilter !== "all" && String(r.requestedAction || "SCHEDULE_ADJUSTMENT").toUpperCase() !== requestActionFilter.toUpperCase()) {
        return false;
      }
      if (requestProgramFilter !== "all" && !matchesProgram(r.requesterProgram || r.programCode || r.programId)) {
        return false;
      }
      if (requestSearchQuery.trim()) {
        const q = requestSearchQuery.toLowerCase();
        const match =
          String(r.id).includes(q) ||
          (r.requesterName || "").toLowerCase().includes(q) ||
          (r.requesterProgram || "").toLowerCase().includes(q) ||
          (r.subjectCode || "").toLowerCase().includes(q) ||
          (r.subjectName || "").toLowerCase().includes(q) ||
          (r.sectionName || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q) ||
          (r.adminRemarks || "").toLowerCase().includes(q) ||
          (r.adminResponse || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [adjustmentRequests, requestStatusFilter, requestActionFilter, requestProgramFilter, requestSearchQuery, matchesProgram]);

  const pendingRequestsCount = useMemo(() => {
    return adjustmentRequests.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
  }, [adjustmentRequests]);

  // Step 1: Subject options (filtered by Program Head if applicable)
  const subjectOptionsForStep1: SearchableOption[] = useMemo(() => {
    return availableSubjects.map((sub) => {
      const isMajor = Boolean(sub.isMajor);
      const isLab = Number(sub.labHours || 0) > 0;
      const units = sub.units || 3;
      return {
        value: sub.code,
        label: `${sub.code} - ${sub.name}`,
        sublabel: `${isMajor ? "Major Subject" : "General Education"} · ${units} Units · ${sub.program || sub.department || "Curriculum"} ${isLab ? "(Laboratory Required)" : "(Lecture)"}`,
        badge: isMajor ? "Major" : "Gen Ed",
        badgeTone: isMajor ? "blue" : "amber",
        searchKeywords: [
          sub.code,
          sub.name,
          sub.program || "",
          sub.department || "",
          isMajor ? "major" : "gen ed general education",
          isLab ? "lab laboratory" : "lecture",
        ],
      };
    });
  }, [availableSubjects]);

  // Requirement 4 & 11: Step 2 - Available Faculty for selected Day & Time
  const availableFacultyForSlot = useMemo(() => {
    if (!form.day || !form.time) return availableFaculty;

    return availableFaculty.filter((fac) => {
      // 1. Exclude if teacher already has another class scheduled on this day at overlapping time
      const hasClash = scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        const isSameTeacher =
          (s.facultyId && fac.id && String(s.facultyId) === String(fac.id)) ||
          (s.faculty && fac.name && s.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
        if (!isSameTeacher) return false;
        return isTimeOverlapping(s.time, form.time);
      });
      if (hasClash) return false;

      // Faculty availability window constraints removed per requirements (faculty are available unless they have an overlapping class clash)
      return true;
    });
  }, [availableFaculty, scheduleItems, form.day, form.time, editingSchedule]);

  // Requirement 5 & 11: Step 2 - Available Rooms for selected Day & Time
  const availableRoomsForSlot = useMemo(() => {
    if (form.modality === "Online") return [];
    if (!form.day || !form.time) return roomsList;

    const subObj = subjectsList.find((s) => s.code === form.subjectCode);
    const requiresLab = subObj ? Number(subObj.labHours || 0) > 0 : false;

    return roomsList.filter((rm) => {
      // Exclude rooms under maintenance or inactive
      const status = String(rm.status || "").toLowerCase();
      if (status === "maintenance" || status === "closed" || status === "inactive") return false;

      // Exclude if room is already occupied by a Face-to-Face class on this day at overlapping time
      const hasClash = scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.modality === "Online") return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        if (!s.room || String(s.room).toLowerCase().trim() !== String(rm.number).toLowerCase().trim()) return false;
        return isTimeOverlapping(s.time, form.time);
      });
      if (hasClash) return false;

      // Room type rules: Laboratory sessions require lab rooms
      const isLabSession = form.classMode === "Laboratory" || (requiresLab && form.classMode !== "Lecture");
      if (isLabSession) {
        const isLab = /lab/i.test(rm.type || "") || /lab/i.test(rm.building || "");
        if (!isLab) return false;
      }

      return true;
    });
  }, [roomsList, scheduleItems, form.day, form.time, form.modality, form.subjectCode, form.classMode, subjectsList, editingSchedule]);

  // Selected Subject Object & Day Pairing (moved up for slot dependency resolution)
  const selectedSubjectObj = useMemo(() => {
    if (!form.subjectCode) return null;
    return (
      availableSubjects.find((s) => s.code === form.subjectCode) ||
      subjectsList.find((s) => s.code === form.subjectCode) ||
      null
    );
  }, [form.subjectCode, availableSubjects, subjectsList]);

  const pairedDay = useMemo(() => {
    return getPairedDay(form.day);
  }, [form.day]);

  const pairedClassMode: "Lecture" | "Laboratory" = useMemo(() => {
    if (form.isMajor) {
      return form.classMode === "Lecture" ? "Laboratory" : "Lecture";
    }
    return "Lecture";
  }, [form.isMajor, form.classMode]);

  const pairedDuration = useMemo(() => {
    return getExpectedSubjectDuration(selectedSubjectObj, pairedClassMode);
  }, [selectedSubjectObj, pairedClassMode]);

  const pairedTime = useMemo(() => {
    const startPart = form.time.split("-")[0]?.trim() || "07:00 AM";
    const endPart = calculateEndTimeFromStart(startPart, pairedDuration);
    return `${startPart} - ${endPart}`;
  }, [form.time, pairedDuration]);

  // Requirement 6 & 11: Step 2 - Available Sections for selected Subject, Day & Time
  // STRICT RULE: Never show sections already scheduled on this day/time slot
  const availableSectionsForSlot = useMemo(() => {
    const subObj = selectedSubjectObj;

    return availableSections.filter((sec) => {
      // 1. Exclude if section already has another class scheduled on this day/time or paired day/time
      if (form.day && form.time) {
        if (
          isSectionScheduledAtTime(
            sec,
            form.day,
            form.time,
            pairedEnabled,
            pairedDay,
            pairedTime,
            scheduleItems,
            editingSchedule?.id
          )
        ) {
          return false;
        }
      }

      // 2. Check curriculum match (section must match subject's program / course & year level)
      if (subObj && !isSubjectMatchingSection(subObj, sec)) {
        return false;
      }

      return true;
    });
  }, [selectedSubjectObj, availableSections, form.day, form.time, pairedEnabled, pairedDay, pairedTime, scheduleItems, editingSchedule]);

  // Unbooked sections across all programs that are completely free from class clashes during this slot
  const unbookedSectionsForSlot = useMemo(() => {
    const base = availableSections.length > 0 ? availableSections : sectionsList;
    return base.filter((sec) => {
      if (form.day && form.time) {
        return !isSectionScheduledAtTime(
          sec,
          form.day,
          form.time,
          pairedEnabled,
          pairedDay,
          pairedTime,
          scheduleItems,
          editingSchedule?.id
        );
      }
      return true;
    });
  }, [availableSections, sectionsList, form.day, form.time, pairedEnabled, pairedDay, pairedTime, scheduleItems, editingSchedule]);

  // Searchable Select Mappers for Step 2
  const facultyOptionsForStep2: SearchableOption[] = useMemo(() => {
    const baseList = availableFacultyForSlot.length > 0 ? availableFacultyForSlot : availableFaculty.length > 0 ? availableFaculty : facultyList;
    return baseList.map((f) => {
      const isFullTime = f.status === "Full-Time";
      const isSlotSpecific = availableFacultyForSlot.some((af) => af.id === f.id);
      return {
        value: f.id,
        label: f.name,
        sublabel: `${f.department || "Academic Faculty"} · Max Load: ${f.maxLoadHours || 24} hrs/wk`,
        badge: isSlotSpecific ? f.status || "Full-Time" : `${f.status || "Faculty"} (Unregistered slot)`,
        badgeTone: isSlotSpecific ? (isFullTime ? "emerald" : "amber") : "slate",
        searchKeywords: [f.name, f.department || "", f.status || "", f.id],
      };
    });
  }, [availableFacultyForSlot, availableFaculty, facultyList]);

  // Selected Section Headcount for Proactive Room Capacity Verification
  const selectedSectionHeadcount = useMemo(() => {
    if (!form.section) return 0;
    const sec = availableSections.find(
      (s) =>
        s.section === form.section ||
        formatSectionDisplay(s) === form.section ||
        (s.course && `${s.course} ${s.yearLevel || ""}-${s.section}`.trim() === form.section) ||
        form.section.includes(s.section)
    );
    return Number(sec?.students || 35);
  }, [form.section, availableSections]);

  const selectedRoomObj = useMemo(() => {
    if (!form.room) return null;
    return roomsList.find((r) => String(r.number).toLowerCase().trim() === String(form.room).toLowerCase().trim()) || null;
  }, [form.room, roomsList]);

  const concurrentSlotSchedules = useMemo(() => {
    if (!form.day || !form.time) return [];
    return scheduleItems.filter(
      (s) =>
        (!editingSchedule || String(s.id) !== String(editingSchedule.id)) &&
        s.day.toLowerCase() === form.day.toLowerCase() &&
        isTimeOverlapping(s.time, form.time) &&
        s.modality !== "Online" &&
        s.room
    );
  }, [scheduleItems, editingSchedule, form.day, form.time]);

  const isRoomTooSmall = useMemo(() => {
    if (form.modality === "Online" || !selectedRoomObj || !selectedSectionHeadcount) return false;
    return Number(selectedRoomObj.capacity) < selectedSectionHeadcount;
  }, [form.modality, selectedRoomObj, selectedSectionHeadcount]);

  const roomOptionsForStep2: SearchableOption[] = useMemo(() => {
    const baseList = availableRoomsForSlot.length > 0 ? availableRoomsForSlot : availableRoomsForBuilding.length > 0 ? availableRoomsForBuilding : roomsList;
    return baseList.map((r) => {
      const isLab = /lab/i.test(r.type || "") || /lab/i.test(r.building || "");
      const isTooSmall = selectedSectionHeadcount > 0 && Number(r.capacity) < selectedSectionHeadcount;
      const isAvailableForSlot = availableRoomsForSlot.some((ar) => ar.number === r.number);
      return {
        value: r.number,
        label: `${r.number} - ${r.building || "Campus"}`,
        sublabel: isTooSmall
          ? `⚠ Capacity: ${r.capacity} — Section requires ${selectedSectionHeadcount} seats`
          : !isAvailableForSlot && availableRoomsForSlot.length > 0
            ? `${r.type || "Classroom"} · Capacity: ${r.capacity} · Warning: Occupied or conflicting slot`
            : `${r.type || "Classroom"} · Capacity: ${r.capacity} students · Status: Available`,
        badge: isTooSmall ? `Too Small (${r.capacity})` : isLab ? "Lab" : `Cap: ${r.capacity}`,
        badgeTone: isTooSmall ? "danger" : isLab ? "purple" : "slate",
        searchKeywords: [r.number, r.building || "", r.type || "", String(r.capacity)],
      };
    });
  }, [availableRoomsForSlot, availableRoomsForBuilding, roomsList, selectedSectionHeadcount]);

  const sectionOptionsForStep2: SearchableOption[] = useMemo(() => {
    // Only choose from candidates that are NOT already booked on this slot
    const candidateList = availableSectionsForSlot.length > 0 ? availableSectionsForSlot : unbookedSectionsForSlot;
    return candidateList.map((sec, idx) => {
      const secLabel = formatSectionDisplay(sec) || `Section ${idx + 1}`;
      const studentCount = sec.students || 30;
      return {
        value: secLabel,
        label: secLabel,
        sublabel: `${sec.course || sec.program || "Academic Program"} · Year Level ${sec.yearLevel || "1"} · ${studentCount} enrolled students`,
        badge: `${studentCount} Students`,
        badgeTone: "blue",
        searchKeywords: [sec.course || "", sec.program || "", sec.section || "", `Year ${sec.yearLevel}`],
      };
    });
  }, [availableSectionsForSlot, unbookedSectionsForSlot]);

  const pairedRoomOptionsForStep2: SearchableOption[] = useMemo(() => {
    return roomsList.map((r) => {
      const isLab = /lab/i.test(r.type || "") || /lab/i.test(r.building || "") || /lab/i.test(r.number || "");
      const isPreferred = pairedClassMode === "Laboratory" ? isLab : !isLab;
      return {
        value: r.number,
        label: `${r.number} - ${r.building || "Campus"}${isPreferred ? " ★ Recommended" : ""}`,
        sublabel: `${r.type || "Classroom"} · Capacity: ${r.capacity} students · ${isLab ? "Lab Facility" : "Standard Classroom"}`,
        badge: isLab ? "Laboratory" : `Cap: ${r.capacity}`,
        badgeTone: isLab ? "purple" : "slate",
        searchKeywords: [r.number, r.building || "", r.type || "", String(r.capacity)],
      };
    });
  }, [roomsList, pairedClassMode]);

  const parsedDurationMinutes = useMemo(() => {
    if (!form.time || !form.time.includes("-")) return 90;
    const [startStr, endStr] = form.time.split("-").map((s) => s.trim());
    if (!startStr || !endStr) return 90;
    const sMin = parseTimeToMinutes(startStr);
    const eMin = parseTimeToMinutes(endStr);
    return !isNaN(sMin) && !isNaN(eMin) && eMin > sMin ? eMin - sMin : 90;
  }, [form.time]);

  const validEndPoints = useMemo(() => {
    const startStr = form.time.split("-")[0]?.trim() || "07:00 AM";
    const startMin = parseTimeToMinutes(startStr);
    return TIME_POINTS.filter((tp) => parseTimeToMinutes(tp) > startMin);
  }, [form.time]);

  const handleStartTimeChange = (newStart: string) => {
    const [currentStart, currentEnd] = form.time.split("-").map((t) => t.trim());
    let duration = 90;
    if (currentStart && currentEnd) {
      const diff = parseTimeToMinutes(currentEnd) - parseTimeToMinutes(currentStart);
      if (!isNaN(diff) && diff > 0) duration = diff;
    }
    let newEnd = calculateEndTimeFromStart(newStart, duration);
    if (parseTimeToMinutes(newEnd) > parseTimeToMinutes("09:00 PM")) {
      newEnd = "09:00 PM";
    }
    setForm((prev) => ({
      ...prev,
      time: `${newStart} - ${newEnd}`,
    }));
  };

  const handleEndTimeChange = (newEnd: string) => {
    const startPart = form.time.split("-")[0]?.trim() || "07:00 AM";
    const startMin = parseTimeToMinutes(startPart);
    const endMin = parseTimeToMinutes(newEnd);
    let newMode: "Lecture" | "Laboratory" | undefined = undefined;
    if (endMin > startMin) {
      const duration = endMin - startMin;
      newMode = duration >= 180 ? "Laboratory" : "Lecture";
    }

    setForm((prev) => ({
      ...prev,
      time: `${startPart} - ${newEnd}`,
      classMode: (newMode && prev.isMajor) ? newMode : prev.classMode,
    }));
  };

  const handleQuickDuration = (durationMinutes: number) => {
    const startPart = form.time.split("-")[0]?.trim() || "07:00 AM";
    let newEnd = calculateEndTimeFromStart(startPart, durationMinutes);
    if (parseTimeToMinutes(newEnd) > parseTimeToMinutes("09:00 PM")) {
      newEnd = "09:00 PM";
    }
    const newMode: "Lecture" | "Laboratory" = durationMinutes >= 180 ? "Laboratory" : "Lecture";

    setForm((prev) => ({
      ...prev,
      time: `${startPart} - ${newEnd}`,
      classMode: prev.isMajor ? newMode : prev.classMode,
    }));
  };

  const isStep1ResourcesAvailable = useMemo(() => {
    return Boolean(form.day && form.time);
  }, [form.day, form.time]);

  const isStep2ResourcesAvailable = useMemo(() => {
    return Boolean(form.day && form.time && form.subjectCode && form.section);
  }, [form.day, form.time, form.subjectCode, form.section]);

  const selectedFacultyMember = useMemo(() => {
    return (
      availableFaculty.find(
        (f) => f.id === form.facultyId || (form.faculty && f.name.toLowerCase() === form.faculty.toLowerCase())
      ) || null
    );
  }, [form.facultyId, form.faculty, availableFaculty]);

  const handleConfirmTimeAndNext = () => {
    if (!form.day || !form.time) {
      toast.push("Please select Teaching Day and Time Slot to continue", "error");
      return;
    }

    const [sPart, ePart] = form.time.split("-").map((t) => t.trim());
    if (sPart && ePart && parseTimeToMinutes(ePart) <= parseTimeToMinutes(sPart)) {
      toast.push("End time must be after start time", "error");
      return;
    }

    // If subject is unset, pick candidate matching selected program or first subject
    if (!form.subjectCode && subjectsList.length > 0) {
      const candidateSub = subjectsList.find((s) => !form.program || s.program === form.program || s.program === "ALL") || subjectsList[0];
      if (candidateSub) {
        handleSubjectChange(candidateSub.code);
      }
    }

    // Auto-select or re-validate section to ensure it is never a scheduled section
    const freeSecs = availableSectionsForSlot.length > 0 ? availableSectionsForSlot : unbookedSectionsForSlot;
    const isCurSectionBusy = form.section && isSectionScheduledAtTime(
      { section: form.section },
      form.day,
      form.time,
      pairedEnabled,
      pairedDay,
      pairedTime,
      scheduleItems,
      editingSchedule?.id
    );

    if (!form.section || isCurSectionBusy) {
      if (freeSecs.length > 0) {
        const s = freeSecs[0];
        const sVal = formatSectionDisplay(s);
        setForm((prev) => ({
          ...prev,
          section: sVal,
          program: s.program || s.course || prev.program,
        }));
      } else {
        setForm((prev) => ({ ...prev, section: "" }));
      }
    }

    setModalStep(2);
  };

  const handleContinueToStep2 = () => {
    handleConfirmTimeAndNext();
  };

  const handleContinueToStep3 = () => {
    if (!form.subjectCode) {
      toast.push("Please select an Academic Subject to continue", "error");
      return;
    }
    if (!form.section) {
      toast.push("Please select a Student Section to continue", "error");
      return;
    }

    // Adapt / validate faculty selection for the confirmed slot
    const isCurrentFacultyOccupied = scheduleItems.some((s) => {
      if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
      if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
      const isMatch = (s.facultyId && form.facultyId && String(s.facultyId) === String(form.facultyId)) ||
        (s.faculty && form.faculty && s.faculty.toLowerCase().trim() === form.faculty.toLowerCase().trim());
      return isMatch && isTimeOverlapping(s.time, form.time);
    });

    const facCandidates = availableFacultyForSlot.length > 0 ? availableFacultyForSlot : availableFaculty.length > 0 ? availableFaculty : facultyList;
    if (isCurrentFacultyOccupied || !form.facultyId || !facCandidates.some((f) => f.id === form.facultyId || f.name === form.faculty)) {
      const firstFac = availableFacultyForSlot[0] || facCandidates[0];
      if (firstFac) {
        setForm((prev) => ({ ...prev, facultyId: firstFac.id, faculty: firstFac.name }));
      } else {
        setForm((prev) => ({ ...prev, facultyId: "", faculty: "" }));
      }
    }

    // Adapt / validate room selection for the confirmed slot
    if (form.modality === "Face-to-Face") {
      const isCurrentRoomOccupied = scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.modality === "Online") return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        return s.room && form.room && s.room.toLowerCase().trim() === form.room.toLowerCase().trim() && isTimeOverlapping(s.time, form.time);
      });

      const roomCandidates = availableRoomsForSlot.length > 0 ? availableRoomsForSlot : availableRoomsForBuilding.length > 0 ? availableRoomsForBuilding : roomsList;
      if (isCurrentRoomOccupied || !form.room || !roomCandidates.some((r) => r.number === form.room)) {
        const firstRoom = availableRoomsForSlot[0] || roomCandidates[0];
        if (firstRoom) {
          setForm((prev) => ({ ...prev, room: firstRoom.number, building: (firstRoom.building as BuildingType) || prev.building }));
        } else {
          setForm((prev) => ({ ...prev, room: "" }));
        }
      }
    }

    setModalStep(3);
  };

  const handleScheduleUnscheduledSubject = (sub: any) => {
    if (!canCreate) return;
    setEditingSchedule(null);
    const isMajor = Boolean(sub?.isMajor) && !isGeneralSubject(sub);
    const mode: "Lecture" | "Laboratory" = isMajor && Number(sub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";
    const duration = getExpectedSubjectDuration(sub, mode);
    const calculatedEndTime = calculateEndTimeFromStart("07:00 AM", duration);
    const labRoom = roomsList.find((r) => /lab/i.test(r.type || "") || /lab/i.test(r.number || ""));
    const defPairedRoom = mode === "Lecture" ? (labRoom?.number || "COL-101") : "COL-101";

    setForm({
      day: "Monday",
      time: `07:00 AM - ${calculatedEndTime}`,
      subjectCode: sub.code || "",
      subject: sub.name || "",
      section: "",
      facultyId: "",
      faculty: "",
      room: "COL-101",
      pairedRoom: defPairedRoom,
      building: "College Building" as BuildingType,
      pairedBuilding: "College Building" as BuildingType,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor,
      classMode: mode,
      program: sub.program || selectedProgram.key || "BSIT",
    });
    setPairedEnabled(true);
    setModalStep(1);
    setIsOpen(true);
  };

  const handleSubjectChange = (code: string) => {
    const sub = subjectsList.find((s) => s.code === code);
    if (!sub) return;

    const isMajor = Boolean(sub.isMajor) && !isGeneralSubject(sub);
    const [startPart, endPart] = form.time.split("-").map((t) => t.trim());
    const hasScheduledTime = Boolean(
      startPart &&
      endPart &&
      parseTimeToMinutes(endPart) > parseTimeToMinutes(startPart)
    );
    const currentDuration = hasScheduledTime
      ? parseTimeToMinutes(endPart) - parseTimeToMinutes(startPart)
      : 90;

    let mode: "Lecture" | "Laboratory" = isMajor ? (form.classMode || "Lecture") : "Lecture";
    if (isMajor) {
      if (currentDuration >= 180) {
        mode = "Laboratory";
      } else {
        mode = "Lecture";
      }
    }

    // Follow the time on the scheduled time! Do NOT set time again!
    let finalTime = form.time;
    if (!hasScheduledTime) {
      const duration = getExpectedSubjectDuration(sub, mode);
      const finalStart = startPart || "07:00 AM";
      const calculatedEnd = calculateEndTimeFromStart(finalStart, duration);
      finalTime = `${finalStart} - ${calculatedEnd}`;
    }

    let defPairedRoom = form.pairedRoom;
    if (isMajor && mode === "Lecture") {
      const labRoom = roomsList.find((r) => /lab/i.test(r.type || "") || /lab/i.test(r.number || ""));
      if (labRoom) defPairedRoom = labRoom.number;
    }

    // Helper to check if a faculty member has a conflict at this slot
    const isFacOccupied = (facId?: string, facName?: string) => {
      if (!facId && !facName) return false;
      return scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        if (!isTimeOverlapping(s.time, finalTime)) return false;
        return (facId && s.facultyId === facId) || (facName && s.faculty && s.faculty.toLowerCase().trim() === facName.toLowerCase().trim());
      });
    };

    // Auto-pick available faculty for this time if unset or occupied
    let defFacId = form.facultyId;
    let defFacName = form.faculty;
    if (sub.instructorId) {
      const subFac = facultyList.find((f) => f.id === sub.instructorId);
      if (subFac && !isFacOccupied(subFac.id, subFac.name)) {
        defFacId = subFac.id;
        defFacName = subFac.name;
      }
    }
    if (!defFacId || isFacOccupied(defFacId, defFacName)) {
      const freeFac = facultyList.find((f) => !isFacOccupied(f.id, f.name));
      if (freeFac) {
        defFacId = freeFac.id;
        defFacName = freeFac.name;
      } else if (availableFaculty.length > 0) {
        defFacId = availableFaculty[0].id;
        defFacName = availableFaculty[0].name;
      }
    }

    // Helper to check if a room is occupied at this slot
    const isRoomOccupied = (roomNum?: string) => {
      if (!roomNum) return false;
      return scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.modality === "Online") return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        if (!isTimeOverlapping(s.time, finalTime)) return false;
        return s.room && s.room.toLowerCase().trim() === roomNum.toLowerCase().trim();
      });
    };

    // Auto-pick available room for this time if unset or occupied
    let defRoom = form.room;
    let defBuilding = form.building;
    if (!defRoom || isRoomOccupied(defRoom)) {
      const freeRoom = findAvailableRoomForSlot(form.day, finalTime, roomsList, scheduleItems, editingSchedule?.id);
      if (freeRoom) {
        defRoom = freeRoom.number;
        defBuilding = (freeRoom.building as BuildingType) || defBuilding;
      }
    }

    // Helper to check if a section is occupied at this slot
    const isSecOccupied = (secVal?: string) => {
      if (!secVal) return false;
      return isSectionScheduledAtTime({ section: secVal }, form.day, finalTime, pairedEnabled, pairedDay, pairedTime, scheduleItems, editingSchedule?.id);
    };

    // Auto-pick matching section only if it is completely unbooked in this slot
    let defSec = form.section;
    if (!defSec || isSecOccupied(defSec)) {
      const freeMatchingSec = availableSections.find((sec) => {
        if (!isSubjectMatchingSection(sub, sec)) return false;
        return !isSectionScheduledAtTime(sec, form.day, finalTime, pairedEnabled, pairedDay, pairedTime, scheduleItems, editingSchedule?.id);
      }) || availableSections.find((sec) => {
        return !isSectionScheduledAtTime(sec, form.day, finalTime, pairedEnabled, pairedDay, pairedTime, scheduleItems, editingSchedule?.id);
      });

      if (freeMatchingSec) {
        defSec = formatSectionDisplay(freeMatchingSec);
      } else {
        defSec = "";
      }
    }

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      isMajor,
      classMode: mode,
      time: finalTime,
      facultyId: defFacId || prev.facultyId,
      faculty: defFacName || prev.faculty,
      room: defRoom || prev.room,
      building: defBuilding || prev.building,
      section: defSec || prev.section,
      pairedRoom: defPairedRoom || prev.pairedRoom,
      program: sub.program || prev.program,
    }));
  };

  const handleClassModeChange = (mode: "Lecture" | "Laboratory") => {
    // Auto-pick paired room if opposite is lab
    const oppositeMode: "Lecture" | "Laboratory" = mode === "Lecture" ? "Laboratory" : "Lecture";
    let nextPairedRoom = form.pairedRoom;
    if (oppositeMode === "Laboratory") {
      const labRoom = roomsList.find((r) => /lab/i.test(r.type || "") || /lab/i.test(r.number || ""));
      if (labRoom) nextPairedRoom = labRoom.number;
    } else {
      const lecRoom = roomsList.find((r) => !/lab/i.test(r.type || "") && !/lab/i.test(r.number || ""));
      if (lecRoom) nextPairedRoom = lecRoom.number;
    }

    // Follow the scheduled time! Do NOT set time again!
    setForm((prev) => ({
      ...prev,
      classMode: mode,
      pairedRoom: nextPairedRoom || prev.pairedRoom,
    }));
  };

  const handleBuildingChange = (newBuilding: BuildingType) => {
    const matchingRooms = roomsList.filter(
      (r) =>
        r.building &&
        newBuilding &&
        (r.building.toLowerCase().trim() === newBuilding.toLowerCase().trim() ||
          r.building.toLowerCase().includes(newBuilding.split(" ")[0].toLowerCase()))
    );
    const isCurrentValid = matchingRooms.some((r) => r.number === form.room);
    const nextRoom = isCurrentValid
      ? form.room
      : matchingRooms[0]?.number || roomsList[0]?.number || "";

    setForm((prev) => ({
      ...prev,
      building: newBuilding,
      room: nextRoom,
    }));
  };

  const handleRoomChange = (roomNumber: string) => {
    const selectedRoomObj = roomsList.find((r) => r.number === roomNumber);
    setForm((prev) => ({
      ...prev,
      room: roomNumber,
      building: (selectedRoomObj?.building as BuildingType) || prev.building,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    const result = validateScheduleSlot(
      {
        id: editingSchedule?.id,
        day: form.day,
        time: form.time,
        room: form.room,
        faculty: form.faculty,
        facultyId: form.facultyId,
        section: form.section,
        building: form.building,
        modality: form.modality,
        isCombinedCohort: form.isCombinedCohort,
        isAuthorizedScheduler: isDeanOrAdmin,
      },
      scheduleItems,
      facultyList
    );
    setValidationFeedback(result);
  }, [
    isOpen,
    form.day,
    form.time,
    form.room,
    form.faculty,
    form.facultyId,
    form.section,
    form.building,
    form.modality,
    form.isCombinedCohort,
    editingSchedule,
    scheduleItems,
    facultyList,
  ]);

  const handleEdit = (item: ClassScheduleItem) => {
    if (!canCreate) {
      setViewingSchedule(item);
      return;
    }
    setEditingSchedule(item);
    const isMajor = Boolean(item.isMajor);
    const resolvedMode: "Lecture" | "Laboratory" =
      (item.classMode as "Lecture" | "Laboratory") ||
      (String(item.roomType || "").toLowerCase().includes("lab") ? "Laboratory" : "Lecture");
    setForm({
      day: item.day,
      time: item.time,
      subjectCode: item.subjectCode || "",
      subject: item.subject,
      section: item.section,
      facultyId: item.facultyId || "",
      faculty: item.faculty,
      room: item.room,
      pairedRoom: "",
      building: item.building as BuildingType,
      pairedBuilding: item.building as BuildingType,
      modality: item.modality || "Face-to-Face",
      onlineLink: item.onlineLink || "",
      isMajor,
      classMode: resolvedMode,
      program: item.program || selectedProgram.key || "BSIT",
      isCombinedCohort: Boolean((item as any).isCombinedCohort),
    });
    setPairedEnabled(false);
    setModalStep(1);
    setIsOpen(true);
  };

  const handleDuplicate = (item: ClassScheduleItem) => {
    if (!canCreate) return;
    setEditingSchedule(null);
    const targetDay = getPairedDay(item.day) || item.day;
    const isMajor = Boolean(item.isMajor);
    const resolvedMode: "Lecture" | "Laboratory" =
      (item.classMode as "Lecture" | "Laboratory") ||
      (String(item.roomType || "").toLowerCase().includes("lab") ? "Laboratory" : "Lecture");
    setForm({
      day: targetDay,
      time: item.time,
      subjectCode: item.subjectCode || "",
      subject: item.subject,
      section: item.section,
      facultyId: item.facultyId || "",
      faculty: item.faculty,
      room: item.room,
      pairedRoom: "",
      building: (item.building as BuildingType) || "College Building",
      pairedBuilding: (item.building as BuildingType) || "College Building",
      modality: item.modality || "Face-to-Face",
      onlineLink: item.onlineLink || "",
      isMajor,
      classMode: resolvedMode,
      program: item.program || selectedProgram.key || "BSIT",
    });
    setPairedEnabled(Boolean(getPairedDay(targetDay)));
    setModalStep(1);
    setIsOpen(true);
    toast.push(`Duplicating schedule for ${item.subjectCode} to ${targetDay}.`, "info");
  };

  const handleFinalizeSchedule = async (schedule: ClassScheduleItem) => {
    try {
      await api.post(`/schedules/${encodeURIComponent(schedule.id)}/finalize`);
      toast.push(`${schedule.subjectCode} is marked as FINALIZED and ready to publish.`, "success");
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to finalize schedule", "error");
    }
  };

  const handlePublishSchedule = async (schedule: ClassScheduleItem) => {
    try {
      await api.post(`/schedules/${encodeURIComponent(schedule.id)}/publish`, { notifyFaculty: true });
      toast.push(`${schedule.subjectCode} is officially PUBLISHED and assigned faculty notified via Gmail.`, "success");
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to publish schedule", "error");
    }
  };

  const handleBulkPublishProgram = async () => {
    try {
      const prog = matrixProgram !== "All" ? matrixProgram : (selectedProgram?.key || "BSIT");
      const res = await api.post('/schedules/bulk-status', {
        program: prog,
        status: 'PUBLISHED',
        notifyFaculty: true,
      });
      const count = res?.data?.data?.updatedCount ?? 0;
      const facCount = res?.data?.data?.facultyNotifiedCount ?? 0;
      toast.push(`Successfully published ${count} schedules for ${prog}.${facCount > 0 ? ` Notified ${facCount} faculty members.` : ''}`, "success");
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to publish program schedules", "error");
    }
  };

  const handleBulkFinalizeProgram = async () => {
    try {
      const prog = matrixProgram !== "All" ? matrixProgram : (selectedProgram?.key || "BSIT");
      const res = await api.post('/schedules/bulk-status', {
        program: prog,
        status: 'FINALIZED',
      });
      const count = res?.data?.data?.updatedCount ?? 0;
      toast.push(`Successfully finalized ${count} schedules for ${prog}. Ready for publication.`, "success");
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to finalize program schedules", "error");
    }
  };

  const executeDelete = async () => {
    if (!canCreate || !scheduleToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/schedules/${encodeURIComponent(scheduleToDelete.id)}`);
      toast.push("Class schedule removed successfully", "success");
      addNotification({
        title: "Class Schedule Removed",
        message: `Schedule session for ${scheduleToDelete.subjectCode} (${scheduleToDelete.section}) was removed.`,
        type: "warning",
        link: "/schedules",
        targetRole: "admin,program_head,teacher",
        targetProgram: scheduleToDelete.program,
        targetTeacherId: scheduleToDelete.facultyId,
      });
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.message || err?.response?.data?.error || "Failed to delete schedule", "error");
    } finally {
      setLoading(false);
      setScheduleToDelete(null);
    }
  };

  const toggleScheduleSelection = (id: string) => {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisibleSchedules = () => {
    if (visibleSchedules.length === 0) return;
    const allSelected = visibleSchedules.every((s) => selectedScheduleIds.has(s.id));
    if (allSelected) {
      setSelectedScheduleIds(new Set());
    } else {
      setSelectedScheduleIds(new Set(visibleSchedules.map((s) => s.id)));
    }
  };

  const clearScheduleSelection = () => {
    setSelectedScheduleIds(new Set());
  };

  const executeBulkDelete = async () => {
    if (!canCreate || schedulesToBulkDelete.length === 0) return;
    setLoading(true);
    try {
      const plottedItems = schedulesToBulkDelete.filter((s) => s.isPlotted || String(s.id).startsWith("plotted-"));
      const realDbItems = schedulesToBulkDelete.filter((s) => !s.isPlotted && !String(s.id).startsWith("plotted-"));

      // Remove plotted items from local state
      plottedItems.forEach((p) => {
        const cleanId = String(p.id).replace(/^plotted-/, "");
        handleRemovePlottedSlot(cleanId);
      });

      if (realDbItems.length > 0) {
        const ids = realDbItems.map((s) => s.id);
        try {
          await api.post("/schedules/bulk-delete", { ids });
        } catch (_bulkErr: any) {
          // Graceful fallback to sequential/parallel individual delete requests
          await Promise.allSettled(ids.map((id) => api.delete(`/schedules/${encodeURIComponent(id)}`)));
        }
      }

      toast.push(`Successfully removed ${schedulesToBulkDelete.length} class schedule${schedulesToBulkDelete.length > 1 ? "s" : ""}`, "success");
      addNotification({
        title: "Class Schedules Removed",
        message: `Removed ${schedulesToBulkDelete.length} scheduled class blocks in bulk.`,
        type: "warning",
        link: "/schedules",
        targetRole: "admin,program_head,teacher",
      });

      // Update activeStackGroup if currently open
      if (activeStackGroup) {
        const deletedIdSet = new Set(schedulesToBulkDelete.map((s) => s.id));
        const remaining = activeStackGroup.schedules.filter((s) => !deletedIdSet.has(s.id));
        if (remaining.length === 0) {
          setActiveStackGroup(null);
        } else {
          setActiveStackGroup({
            ...activeStackGroup,
            schedules: remaining,
          });
        }
      }

      setSelectedScheduleIds(new Set());
      setSelectedInDrawerIds(new Set());
      fetchSchedules();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err.message || "Failed to remove schedules", "error");
    } finally {
      setLoading(false);
      setSchedulesToBulkDelete([]);
    }
  };

  const handleSave = async (addAnother = false) => {
    if (!form.subjectCode || !form.section || !form.faculty) {
      toast.push("Please select Subject, Section, and Faculty", "error");
      return;
    }

    const [sPart, ePart] = form.time.split("-").map((t) => t.trim());
    if (sPart && ePart) {
      const actMin = parseTimeToMinutes(ePart) - parseTimeToMinutes(sPart);
      if (actMin <= 0) {
        toast.push("Invalid schedule duration: End time must be after start time.", "error");
        return;
      }
    }

    if (!validationFeedback.valid && validationFeedback.errors.length > 0 && !isDeanOrAdmin) {
      toast.push(validationFeedback.errors[0], "error");
      return;
    }

    let pairedSaved = false;
    let pairedErrorMsg: string | null = null;
    let createdPairedPayload: any = null;

    setLoading(true);
    try {
      const isRoomInFiltered = availableRoomsForBuilding.some((r) => r.number === form.room);
      const resolvedRoom =
        form.modality === "Online"
          ? "Virtual Room"
          : isRoomInFiltered
            ? form.room
            : (availableRoomsForBuilding[0]?.number || form.room || roomsList[0]?.number || "R-101");

      const resolvedBuilding =
        form.modality === "Online"
          ? "Virtual Classroom"
          : (roomsList.find((r) => r.number === resolvedRoom)?.building as BuildingType) || form.building;

      const targetSecObj =
        sectionsList.find((s) => s.id === (form as any).sectionId || formatSectionDisplay(s) === form.section || s.section === form.section) ||
        availableSections.find((s) => formatSectionDisplay(s) === form.section || s.section === form.section);
      const resolvedSectionId = targetSecObj?.id || (form as any).sectionId || undefined;

      const [startPart, endPart] = form.time.split("-").map((t) => t.trim());
      const payload: Omit<ClassScheduleItem, "id"> & { id?: string; start_time?: string; end_time?: string; followScheduledTime?: boolean; bypassDurationValidation?: boolean; sectionId?: string; section_id?: string } = {
        id: editingSchedule?.id,
        day: form.day,
        time: form.time,
        start_time: startPart,
        end_time: endPart,
        subjectCode: form.subjectCode,
        subject: form.subject,
        section: form.section,
        sectionId: resolvedSectionId ? String(resolvedSectionId) : undefined,
        section_id: resolvedSectionId ? String(resolvedSectionId) : undefined,
        faculty: form.faculty,
        facultyId: form.facultyId,
        room: resolvedRoom,
        building: resolvedBuilding,
        classMode: form.classMode,
        modality: form.modality,
        onlineLink: form.onlineLink,
        isMajor: form.isMajor,
        program: form.program,
        color: getProgramColor({
          program: form.program,
          section: form.section,
          subjectCode: form.subjectCode,
        }),
        status: "Confirmed",
        isCombinedCohort: form.isCombinedCohort,
        is_combined_cohort: form.isCombinedCohort,
        followScheduledTime: true,
        bypassDurationValidation: true,
      } as any;

      if (editingSchedule) {
        await api.put(`/schedules/${encodeURIComponent(editingSchedule.id)}`, payload);
        toast.push("Class schedule updated", "success");
        addNotification({
          title: "Class Schedule Updated",
          message: `${form.subjectCode} for ${form.section} (${form.day} ${form.time}) updated.`,
          type: "success",
          link: "/schedules",
          targetRole: "admin,program_head,teacher",
          targetProgram: form.program,
          targetTeacherId: form.facultyId,
        });
      } else {
        await api.post("/schedules", payload);

        if (editingPlottedSlotId) {
          setPlottedSlots((prev) => prev.filter((p) => p.id !== editingPlottedSlotId));
          setEditingPlottedSlotId(null);
        }

        // Automatic Paired-Day Schedule Creation (e.g., Monday Lecture -> Thursday Lab)
        if (pairedEnabled && pairedDay && pairedDay.toLowerCase() !== form.day.toLowerCase()) {
          const [pStartPart, pEndPart] = pairedTime.split("-").map((t) => t.trim());
          const resolvedPairedRoom = form.pairedRoom || resolvedRoom;
          const resolvedPairedBuilding =
            (roomsList.find((r) => r.number === resolvedPairedRoom)?.building as BuildingType) || resolvedBuilding;

          const pairedPayload = {
            ...payload,
            id: undefined,
            day: pairedDay,
            classMode: pairedClassMode,
            time: pairedTime,
            start_time: pStartPart,
            end_time: pEndPart,
            room: resolvedPairedRoom,
            building: resolvedPairedBuilding,
            followScheduledTime: true,
            bypassDurationValidation: true,
          };
          try {
            await api.post("/schedules", pairedPayload);
            pairedSaved = true;
            createdPairedPayload = pairedPayload;
          } catch (dupErr: any) {
            console.warn(`Could not automatically create paired schedule on ${pairedDay}:`, dupErr);
            pairedErrorMsg = dupErr?.response?.data?.error || dupErr?.message || "Slot conflict";
          }
        }

        if (pairedSaved && pairedDay) {
          const detailMsg = form.isMajor
            ? `${form.day} (${form.classMode}: ${form.time}) & ${pairedDay} (${pairedClassMode}: ${pairedTime})`
            : `${form.day} & ${pairedDay} (${form.time})`;
          toast.push(
            `Successfully scheduled: ${detailMsg}`,
            "success"
          );
          addNotification({
            title: "Paired Classes Scheduled",
            message: `${form.subjectCode} (${form.section}) scheduled on ${detailMsg}.`,
            type: "success",
            link: "/schedules",
            targetRole: "admin,program_head,teacher",
            targetProgram: form.program,
            targetTeacherId: form.facultyId,
          });
        } else if (pairedErrorMsg && pairedDay) {
          toast.push(
            `Created on ${form.day}, but paired session on ${pairedDay} had a conflict (${pairedErrorMsg})`,
            "info"
          );
        } else {
          toast.push("Class schedule created successfully", "success");
          addNotification({
            title: "New Class Scheduled",
            message: `${form.subjectCode} assigned to ${form.faculty} on ${form.day} ${form.time}.`,
            type: "success",
            link: "/schedules",
            targetRole: "admin,program_head,teacher",
            targetProgram: form.program,
            targetTeacherId: form.facultyId,
          });
        }
      }

      if (addAnother && !editingSchedule) {
        toast.push(
          `Scheduled ${form.subjectCode}! Pick another subject for ${form.day} ${form.time}.`,
          "success"
        );

        const curDay = form.day;
        const curTime = form.time;
        const updatedList = [
          ...scheduleItems,
          payload as any,
          ...(pairedSaved && createdPairedPayload ? [createdPairedPayload] : []),
        ];
        // Instantly update state so section dropdown immediately filters out the just-scheduled section
        setScheduleItems(updatedList);
        fetchSchedules();

        const nextFreeRoom = findAvailableRoomForSlot(curDay, curTime, roomsList, updatedList);
        const nextDefRoom = nextFreeRoom?.number || roomsList[0]?.number || "COL-101";
        const nextDefBuilding = (nextFreeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

        // Find next section that is NOT booked during this time
        const pool = availableSections.length > 0 ? availableSections : sectionsList;
        const nextFreeSec = pool.find((s) => {
          return !isSectionScheduledAtTime(s, curDay, curTime, pairedEnabled, pairedDay, pairedTime, updatedList);
        });
        const nextSecVal = nextFreeSec ? formatSectionDisplay(nextFreeSec) : "";

        const nextFreeFac = facultyList.find((f) => !updatedList.some((s) => s.day && s.day.toLowerCase() === curDay.toLowerCase() && isTimeOverlapping(s.time, curTime) && (s.facultyId === f.id || s.faculty === f.name)));

        setForm((prev) => ({
          ...prev,
          day: curDay,
          time: curTime,
          subjectCode: "",
          subject: "",
          room: nextDefRoom,
          building: nextDefBuilding,
          section: nextSecVal,
          facultyId: nextFreeFac?.id || "",
          faculty: nextFreeFac?.name || "",
        }));
        setModalStep(2);
      } else {
        setIsOpen(false);
        setEditingSchedule(null);
        setModalStep(1);
        fetchSchedules();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save schedule";
      toast.push(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const visibleSchedules = useMemo(() => {
    return scheduleItems.filter((item) => {
      // Perspective filter: By Program, By Section, By Faculty, or By Room
      if (perspectiveMode === "program") {
        if (matrixProgram !== "All") {
          const progAliases = PROGRAM_COURSE_MAP[matrixProgram] || [matrixProgram];
          const itemProg = String(item.program || "").toUpperCase();
          const itemSec = String(item.section || "").toUpperCase();
          const itemCode = String(item.subjectCode || "").toUpperCase();
          const matches =
            progAliases.some((a) => itemProg.includes(a) || itemSec.includes(a) || itemCode.includes(a)) ||
            isGeneralSubject(item);
          if (!matches) return false;
        }
        if (matrixYearLevel !== "All") {
          const secStr = String(item.section || "").toLowerCase();
          const yl = matrixYearLevel;
          const matchesYear =
            secStr.includes(`${yl}-`) ||
            secStr.includes(` ${yl} `) ||
            secStr.includes(`-${yl}`) ||
            secStr.includes(`${yl}st`) ||
            secStr.includes(`${yl}nd`) ||
            secStr.includes(`${yl}rd`) ||
            secStr.includes(`${yl}th`) ||
            secStr.endsWith(` ${yl}`) ||
            secStr.endsWith(`${yl}`);
          if (!matchesYear) return false;
        }
      } else if (perspectiveMode === "section" && selectedPerspectiveEntity !== "All") {
        if (!item.section || !item.section.toLowerCase().includes(selectedPerspectiveEntity.toLowerCase())) {
          return false;
        }
      } else if (perspectiveMode === "faculty" && selectedPerspectiveEntity !== "All") {
        if (!item.faculty || !item.faculty.toLowerCase().includes(selectedPerspectiveEntity.toLowerCase())) {
          return false;
        }
      } else if (perspectiveMode === "room" && selectedPerspectiveEntity !== "All") {
        if (!item.room || !item.room.toLowerCase().includes(selectedPerspectiveEntity.toLowerCase())) {
          return false;
        }
      }

      // If a specific instructor filter is chosen, filter by that instructor
      if (selectedFacultyFilter !== "All") {
        const isMatch =
          item.facultyId === selectedFacultyFilter ||
          item.faculty.toLowerCase() === selectedFacultyFilter.toLowerCase();
        if (!isMatch) return false;
      }

      if (role === "program_head" || (selectedProgram.key && selectedProgram.key !== "ALL")) {
        const itemProg = String(item.program || "").toUpperCase().trim();
        if (itemProg !== "ALL" && itemProg !== "UNIVERSAL" && !itemProg.includes("GENERAL EDUCATION")) {
          if (!matchesProgram(item.program || selectedProgram.shortLabel)) {
            return false;
          }
        }
      }

      if (selectedDayFilter !== "All" && item.day !== selectedDayFilter) {
        return false;
      }

      if (query.trim()) {
        const str = [
          item.subject,
          item.subjectCode,
          item.faculty,
          item.room,
          item.building,
          item.section,
          item.modality,
        ]
          .join(" ")
          .toLowerCase();
        if (!str.includes(query.toLowerCase())) return false;
      }

      if (durationFilter === "Minor") {
        const isMin = !item.isMajor || (item.time && getTimeDurationStr(item.time)?.includes("1h 30m")) || item.classMode === "1.5h";
        if (!isMin) return false;
      } else if (durationFilter === "MajorLec") {
        const isLec = Boolean(item.isMajor) && item.classMode === "Lecture";
        if (!isLec) return false;
      } else if (durationFilter === "MajorLab") {
        const isLab = item.classMode === "Laboratory" || String(item.roomType || "").toLowerCase().includes("lab");
        if (!isLab) return false;
      } else if (durationFilter === "7am") {
        if (!item.time.startsWith("07:00 AM") && !item.time.startsWith("7:00 AM")) return false;
      } else if (durationFilter === "730am") {
        if (!item.time.startsWith("07:30 AM") && !item.time.startsWith("7:30 AM")) return false;
      }

      return true;
    });
  }, [
    scheduleItems,
    perspectiveMode,
    selectedPerspectiveEntity,
    matrixProgram,
    matrixYearLevel,
    selectedFacultyFilter,
    selectedDayFilter,
    durationFilter,
    selectedProgram,
    role,
    matchesProgram,
    query,
  ]);

  const dayTimelineBlocks = useMemo(() => {
    const map = new Map<string, DayTimelineBlock[]>();
    for (const day of DAYS) {
      const dayOfficial = visibleSchedules.filter((item) => item.day.toLowerCase() === day.toLowerCase());

      // Plotted Time Slots for this day (can coexist with official classes in the same time slot)
      const dayPlottedItems: ClassScheduleItem[] = plottedSlots
        .filter((ps) => ps.day.toLowerCase() === day.toLowerCase())
        .map((ps) => ({
          id: `plotted-${ps.id}`,
          day: ps.day,
          time: ps.time,
          subjectCode: "PLOTTED",
          subject: "Plotted Time Slot",
          section: "Awaiting Assignment",
          faculty: "TBD",
          room: "TBD",
          building: "College Building",
          modality: "Face-to-Face" as ClassModality,
          program: ps.program || selectedProgram.key || "BSIT",
          color: "#4f46e5",
          isPlotted: true,
        }));

      const combinedDayItems = [...dayOfficial, ...dayPlottedItems];
      map.set(day.toLowerCase(), buildDayTimelineBlocks(combinedDayItems));
    }
    return map;
  }, [visibleSchedules, plottedSlots, selectedProgram.key]);

  const handleAssignPlottedSlot = (item: ClassScheduleItem) => {
    if (!canCreate) return;
    setEditingSchedule(null);
    const cleanId = item.id.replace(/^plotted-/, "");
    setEditingPlottedSlotId(cleanId);

    const firstSub = availableSubjects[0] || subjectsList[0];
    const isMajor = Boolean(firstSub?.isMajor) && !isGeneralSubject(firstSub);
    const mode = isMajor && Number(firstSub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";

    const defSec = sectionsList.find((sec) => isSubjectMatchingSection(firstSub, sec)) || sectionsList[0];
    const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";

    const freeRoom = findAvailableRoomForSlot(item.day, item.time, roomsList, scheduleItems);
    const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
    const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

    const defFac = facultyList.find((f) => {
      if (firstSub?.instructorId && f.id === firstSub.instructorId) return true;
      return !scheduleItems.some((s) => s.day.toLowerCase() === item.day.toLowerCase() && isTimeOverlapping(s.time, item.time) && (s.facultyId === f.id || s.faculty === f.name));
    }) || facultyList[0];

    setForm({
      day: item.day,
      time: item.time,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      section: defSecVal,
      facultyId: defFac?.id || "",
      faculty: defFac?.name || "",
      room: defRoom,
      pairedRoom: defRoom,
      building: defBuilding as BuildingType,
      pairedBuilding: defBuilding as BuildingType,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor,
      classMode: mode,
      program: selectedProgram?.key || "BSIT",
      isCombinedCohort: false,
    });
    setPairedEnabled(true);
    setModalStep(2);
    setIsOpen(true);
  };

  const handleRemovePlottedSlot = (id: string) => {
    const cleanId = id.replace(/^plotted-/, "");
    setPlottedSlots((prev) => prev.filter((p) => p.id !== cleanId));
    toast.push("Plotted time slot removed from timetable", "info");
  };

  const handlePlotCurrentTimeSlot = () => {
    if (!form.day || !form.time) {
      toast.push("Please select Day and Time to plot", "error");
      return;
    }
    const newId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSlot = {
      id: newId,
      day: form.day,
      time: form.time,
      program: selectedProgram.key || "BSIT",
      durationMinutes: parsedDurationMinutes,
      createdAt: Date.now(),
    };
    setPlottedSlots((prev) => [...prev, newSlot]);
    setIsOpen(false);
    toast.push(
      `Plotted ${form.day} (${form.time}) onto the matrix! Click "+ Add Subject & Room" on the grid when you're ready to assign details.`,
      "success"
    );
  };

  const handlePlotNewSlotAt = (day: string, timeSlot: string) => {
    if (!canCreate) return;
    const newId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const [sStr, eStr] = timeSlot.split("-").map((p) => p.trim());
    const dur = sStr && eStr ? parseTimeToMinutes(eStr) - parseTimeToMinutes(sStr) : 90;
    const newSlot = {
      id: newId,
      day,
      time: timeSlot,
      program: selectedProgram.key || "BSIT",
      durationMinutes: dur > 0 ? dur : 90,
      createdAt: Date.now(),
    };
    setPlottedSlots((prev) => [...prev, newSlot]);
    toast.push(`Plotted another time slot on ${day} (${timeSlot})!`, "success");
  };

  const handleBatchPlotTimeSchedules = () => {
    if (batchPlotDays.length === 0) {
      toast.push("Please select at least one day", "error");
      return;
    }
    if (batchPlotTimes.length === 0) {
      toast.push("Please select at least one time slot", "error");
      return;
    }

    const newSlots: { id: string; day: string; time: string; program: string; durationMinutes: number; createdAt: number }[] = [];
    for (const d of batchPlotDays) {
      for (const t of batchPlotTimes) {
        const alreadyPlottedInProgram = plottedSlots.some(
          (ps) => ps.day.toLowerCase() === d.toLowerCase() && ps.time === t && ps.program === (selectedProgram.key || "BSIT")
        );
        if (!alreadyPlottedInProgram) {
          const [sStr, eStr] = t.split("-").map((p) => p.trim());
          const dur = sStr && eStr ? parseTimeToMinutes(eStr) - parseTimeToMinutes(sStr) : 90;
          newSlots.push({
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            day: d,
            time: t,
            program: selectedProgram.key || "BSIT",
            durationMinutes: dur > 0 ? dur : 90,
            createdAt: Date.now(),
          });
        }
      }
    }

    if (newSlots.length === 0) {
      toast.push("All selected time schedules are already plotted or scheduled", "info");
      setIsBatchPlotterOpen(false);
      return;
    }

    setPlottedSlots((prev) => [...prev, ...newSlots]);
    setIsBatchPlotterOpen(false);
    toast.push(
      `Successfully plotted ${newSlots.length} class time schedule(s) onto the timetable! Click "+ Add Subject & Room" to complete them.`,
      "success"
    );
  };

  const handleOpenAddAtSlot = (day: string, timeSlot: string) => {
    if (!canCreate) return;
    const freeRoom = findAvailableRoomForSlot(day, timeSlot, roomsList, scheduleItems);
    const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
    const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

    const firstSub = availableSubjects[0] || subjectsList[0];
    const defFac = facultyList.find((f) => {
      if (firstSub?.instructorId && f.id === firstSub.instructorId) {
        return !scheduleItems.some((s) => s.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(s.time, timeSlot) && (s.facultyId === f.id || s.faculty === f.name));
      }
      return false;
    }) || facultyList.find((f) => !scheduleItems.some((s) => s.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(s.time, timeSlot) && (s.facultyId === f.id || s.faculty === f.name))) || facultyList[0];

    const defSec = sectionsList.find((s) => {
      const sLabel = formatSectionDisplay(s);
      return !scheduleItems.some((sc) => sc.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(sc.time, timeSlot) && (sc.section === sLabel || sc.section === s.section));
    }) || sectionsList[0];
    const defSecVal = defSec ? formatSectionDisplay(defSec) : "BSIT 1-A";

    const isFirstMajor = Boolean(firstSub?.isMajor) && !isGeneralSubject(firstSub);
    const defMode: "Lecture" | "Laboratory" = isFirstMajor && Number(firstSub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";
    const duration = getExpectedSubjectDuration(firstSub, defMode);
    const [startSlot, endSlot] = timeSlot.split("-").map((t) => t.trim());
    const hasValidTimeSlot = Boolean(
      startSlot &&
      endSlot &&
      parseTimeToMinutes(endSlot) > parseTimeToMinutes(startSlot)
    );
    const calculatedEnd = calculateEndTimeFromStart(startSlot || "07:00 AM", duration);
    const finalSlotTime = hasValidTimeSlot ? timeSlot : (startSlot && calculatedEnd ? `${startSlot} - ${calculatedEnd}` : timeSlot);

    setEditingSchedule(null);
    setForm({
      day,
      time: finalSlotTime,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      section: defSecVal,
      facultyId: defFac?.id || "",
      faculty: defFac?.name || "",
      room: defRoom,
      pairedRoom: "",
      building: defBuilding,
      pairedBuilding: defBuilding,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: isFirstMajor,
      classMode: defMode,
      program: firstSub?.program || selectedProgram.key || "BSIT",
    });
    setPairedEnabled(true);
    setModalStep(1);
    setIsOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={
          role === "program_head"
            ? "Academic Program Class Schedules"
            : "Institutional Class Schedules"
        }
        description={
          "Manually schedule, monitor, and adjust classes with real-time faculty availability and room clash prevention."
        }
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Schedules</strong>
          </>
        }
        actions={
          canCreate ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSchedule(null);
                const firstSec = availableSections[0] || sectionsList[0];
                const defSecVal = firstSec ? (firstSec.course && firstSec.section ? `${firstSec.course} ${firstSec.yearLevel || ''}-${firstSec.section}`.trim() : firstSec.section) : "BSIT 1-A";
                const filteredSubs = availableSubjects.filter((s) => isSubjectMatchingSection(s, firstSec));
                const firstSub = filteredSubs[0] || availableSubjects[0] || subjectsList[0];
                const defFac = availableFaculty.find((f) => f.id === firstSub?.instructorId || f.name === firstSub?.instructor) || availableFaculty[0] || facultyList[0];
                const freeRoom = findAvailableRoomForSlot("Monday", "07:00 AM - 08:30 AM", roomsList, scheduleItems);
                const isFirstMajor = Boolean(firstSub?.isMajor) && !isGeneralSubject(firstSub);
                const defMode: "Lecture" | "Laboratory" = isFirstMajor && Number(firstSub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";
                const duration = getExpectedSubjectDuration(firstSub, defMode);
                const calculatedEnd = calculateEndTimeFromStart("07:00 AM", duration);
                const labRoom = roomsList.find((r) => /lab/i.test(r.type || "") || /lab/i.test(r.number || ""));
                const defPairedRoom = defMode === "Lecture" ? (labRoom?.number || "COL-101") : "COL-101";
                const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
                const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

                setForm({
                  day: "Monday",
                  time: `07:00 AM - ${calculatedEnd}`,
                  subjectCode: firstSub?.code || "",
                  subject: firstSub?.name || "",
                  section: defSecVal,
                  facultyId: defFac?.id || "",
                  faculty: defFac?.name || "",
                  room: defRoom,
                  pairedRoom: defPairedRoom,
                  building: defBuilding as BuildingType,
                  pairedBuilding: defBuilding as BuildingType,
                  modality: "Face-to-Face",
                  onlineLink: "",
                  isMajor: isFirstMajor,
                  classMode: defMode,
                  program: firstSub?.program || firstSec?.program || selectedProgram.key || "BSIT",
                });
                setPairedEnabled(true);
                setModalStep(1);
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Schedule Class
            </button>
          ) : undefined
        }
      />

      {/* Control Bar */}
      <section className="card">
        <div className="card__header" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 20px" }}>
          {/* Row 1: Header Title and Segmented View Switcher */}
          <div className="sched-control-top-row" style={{ width: "100%" }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Class Timetable & Governance</p>
              <h3 style={{ margin: "2px 0 0", fontSize: "1.15rem", fontWeight: 800 }}>
                {viewMode === "unscheduled"
                  ? `Unscheduled Curriculum Subjects (${filteredUnscheduled.length})`
                  : `Scheduled Classes (${visibleSchedules.length})`}
              </h3>
            </div>

            {/* View Mode Switcher */}
            <div className="sched-view-tabs">
              <Tooltip content="Weekly Timetable Grid">
                <button
                  type="button"
                  aria-label="Weekly Timetable Grid View"
                  className={`sched-view-tab-btn ${viewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => {
                    setViewMode("grid");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete("view");
                      next.delete("filter");
                      return next;
                    });
                  }}
                >
                  <CalendarDays size={14} />
                  <span>Weekly Grid</span>
                </button>
              </Tooltip>

              <Tooltip content="List View of Class Sessions">
                <button
                  type="button"
                  aria-label="List View of Class Sessions"
                  className={`sched-view-tab-btn ${viewMode === "list" ? "is-active" : ""}`}
                  onClick={() => {
                    setViewMode("list");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("view", "list");
                      return next;
                    });
                  }}
                >
                  <ListFilter size={14} />
                  <span>List View</span>
                </button>
              </Tooltip>

              <Tooltip content="Unscheduled Curriculum Subjects">
                <button
                  type="button"
                  aria-label="Unscheduled Curriculum Subjects"
                  className={`sched-view-tab-btn ${viewMode === "unscheduled" ? "is-active" : ""}`}
                  onClick={() => {
                    setViewMode("unscheduled");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("view", "unscheduled");
                      return next;
                    });
                  }}
                >
                  <CalendarRange size={14} />
                  <span>Unscheduled</span>
                  <span
                    className="sched-view-tab-badge"
                    style={{
                      background: viewMode === "unscheduled" ? "var(--srcb-gold-soft, #fef3c7)" : "rgba(148, 163, 184, 0.25)",
                      color: viewMode === "unscheduled" ? "var(--srcb-gold, #92400e)" : "var(--srcb-text-muted, #475569)",
                    }}
                  >
                    {unscheduledSubjects.length}
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Row 2: Unified Filters & Search Toolbar */}
          <div className="sched-filter-toolbar" style={{ width: "100%", margin: 0 }}>
            {/* Perspective Filter */}
            <div className="sched-filter-item">
              <label>
                <Eye size={13} style={{ color: "var(--srcb-royal)" }} />
                <span>Perspective:</span>
              </label>
              <select
                value={perspectiveMode}
                onChange={(e) => {
                  setPerspectiveMode(e.target.value as any);
                  setSelectedPerspectiveEntity("All");
                }}
                aria-label="Select Timetable Perspective"
              >
                <option value="all">All Timetables</option>
                <option value="program">By Program</option>
                <option value="section">By Section</option>
                <option value="faculty">By Faculty</option>
                <option value="room">By Room</option>
              </select>
            </div>

            {/* Dynamic Perspective Sub-Filters */}
            {perspectiveMode === "program" && (
              <>
                <div className="sched-filter-item">
                  <label>
                    <GraduationCap size={13} style={{ color: "var(--srcb-royal)" }} />
                    <span>Program:</span>
                  </label>
                  <select
                    value={matrixProgram}
                    onChange={(e) => setMatrixProgram(e.target.value)}
                    aria-label="Filter by Program"
                  >
                    <option value="All">All Programs</option>
                    <option value="CJEP">CJEP (Criminology)</option>
                    <option value="TEP">TEP (Education)</option>
                    <option value="BSHM">BSHM (Hospitality)</option>
                    <option value="BSBA">BSBA (Business)</option>
                    <option value="BSIT">BSIT (Info Tech)</option>
                  </select>
                </div>

                <div className="sched-filter-item">
                  <label>
                    <span>Year:</span>
                  </label>
                  <select
                    value={matrixYearLevel}
                    onChange={(e) => setMatrixYearLevel(e.target.value)}
                    aria-label="Filter by Year Level"
                  >
                    <option value="All">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </>
            )}

            {perspectiveMode === "section" && (
              <div className="sched-filter-item">
                <label>
                  <Users size={13} style={{ color: "var(--srcb-royal)" }} />
                  <span>Section:</span>
                </label>
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  aria-label="Filter by Section"
                >
                  <option value="All">All Sections</option>
                  {availableSections.map((sec) => {
                    const label = sec.section || (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : `Section ${sec.id}`);
                    return <option key={sec.id || label} value={label}>{label}</option>;
                  })}
                </select>
              </div>
            )}

            {perspectiveMode === "faculty" && (
              <div className="sched-filter-item">
                <label>
                  <UserCheck size={13} style={{ color: "var(--srcb-royal)" }} />
                  <span>Faculty:</span>
                </label>
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  aria-label="Filter by Faculty Member"
                >
                  <option value="All">All Instructors</option>
                  {availableFaculty.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} ({f.status})</option>
                  ))}
                </select>
              </div>
            )}

            {perspectiveMode === "room" && (
              <div className="sched-filter-item">
                <label>
                  <DoorOpen size={13} style={{ color: "var(--srcb-royal)" }} />
                  <span>Room:</span>
                </label>
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  aria-label="Filter by Room"
                >
                  <option value="All">All Rooms & Labs</option>
                  {roomsList.map((r) => (
                    <option key={r.number} value={r.number}>{r.number} - {r.building}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Day Filter */}
            <div className="sched-filter-item">
              <label>
                <Calendar size={13} style={{ color: "var(--srcb-royal)" }} />
                <span>Day:</span>
              </label>
              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
                aria-label="Filter by Day"
              >
                <option value="All">All Days</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Instructor Filter (hidden if perspective is faculty to avoid redundant selector) */}
            {perspectiveMode !== "faculty" && (
              <div className="sched-filter-item">
                <label>
                  <UserCheck size={13} style={{ color: "var(--srcb-royal)" }} />
                  <span>Instructor:</span>
                </label>
                <select
                  value={selectedFacultyFilter}
                  onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                  aria-label="Filter by Instructor"
                >
                  <option value="All">All Faculty</option>
                  {role === "program_head" && currentUserName && (
                    <option value={currentTeacherId || currentUserName}>
                      My Classes ({currentUserName})
                    </option>
                  )}
                  {availableFaculty.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Duration Filter */}
            <div className="sched-filter-item">
              <label>
                <Clock size={13} style={{ color: "var(--srcb-royal)" }} />
                <span>Duration:</span>
              </label>
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                aria-label="Filter by class duration"
              >
                <option value="All">All Durations</option>
                <option value="Minor">1.5h Minor</option>
                <option value="MajorLec">2h Major Lecture</option>
                <option value="MajorLab">3h Major Lab</option>
                <option value="7am">7:00 AM Starts</option>
                <option value="730am">7:30 AM Starts</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="sched-search-box">
              <Search size={14} style={{ color: "var(--srcb-text-muted)", flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search classes, rooms, instructors..."
                aria-label="Search schedules"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--srcb-text-muted, #94a3b8)",
                    cursor: "pointer",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Schedules Content Views */}
        {isFetching ? (
          viewMode === "grid" ? (
            <div style={{ marginTop: 16 }}>
              <TimetableSkeleton />
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <CardGridSkeleton count={6} />
            </div>
          )
        ) : (
          <>
            {/* View Mode: Weekly Matrix Grid */}
            {viewMode === "grid" && (
              <div className="timetable-workspace">
                <div className="timetable-workspace-main">
                  {/* Clean Minimal Guidelines & Quick Print Substrip */}
                  <div className="sched-matrix-substrip">
                    <div
                      role="region"
                      aria-label="Institutional Class Duration Guidelines"
                      className="sched-duration-guidelines"
                    >
                      <span className="pill pill--amber" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                        Minor: 1 hr 30 mins (1.5h)
                      </span>
                      <span className="pill pill--blue" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                        Major Lecture (2h)
                      </span>
                      <span className="pill pill--purple" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                        Major Lab (3h)
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--srcb-text-muted)" }}>
                        (Starts at 7:00 AM or 7:30 AM)
                      </span>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => window.print()}
                      style={{ padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, fontSize: "0.76rem", height: 28 }}
                      title="Print Timetable Matrix"
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>
                  </div>

                  <div className="timetable-calendar-scroll" style={{ overflowX: "auto" }}>
                    <div className="timetable-timeline-grid" role="grid" aria-label="Weekly Class Schedule Timetable">
                      {/* Sticky Days Header */}
                      <div className="timetable-timeline-header" role="row">
                        <div className="timetable-timeline-corner-cell" role="columnheader">
                          <Clock size={14} style={{ marginRight: 5, verticalAlign: "middle" }} />
                          <span>Class Time</span>
                        </div>
                        {DAYS.map((d) => {
                          const count = visibleSchedules.filter((s) => s.day.toLowerCase() === d.toLowerCase()).length;
                          return (
                            <div key={d} className="timetable-timeline-day-header" role="columnheader">
                              <div className="day-name">{d.toUpperCase()}</div>
                              <div className="day-count-badge">
                                {count} {count === 1 ? "Class" : "Classes"}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Timeline Body */}
                      <div
                        className="timetable-timeline-body"
                        onMouseLeave={() => {
                          if (isDraggingGrid) {
                            setIsDraggingGrid(false);
                            setDragStart(null);
                            setDragCurrent(null);
                          }
                        }}
                        onMouseUp={handleMouseUpGrid}
                      >
                        {/* Time Gutter Column */}
                        <div className="timetable-time-gutter">
                          {TIME_SLOTS.map((slot) => {
                            const startTime = slot.split("-")[0].trim();
                            const isHour = startTime.includes(":00");
                            return (
                              <div
                                key={slot}
                                className={`timetable-time-slot-cell ${isHour ? "is-hour" : "is-half-hour"}`}
                              >
                                <span className="timetable-time-slot-time">
                                  {startTime}
                                </span>
                                <span className="timetable-time-slot-sub">
                                  {isHour ? "Hour Mark" : ":30 Shift"}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* 6 Day Columns */}
                        {DAYS.map((day) => {
                          const blocks = dayTimelineBlocks.get(day.toLowerCase()) || [];

                          return (
                            <div key={day} className="timetable-day-column" data-day={day}>
                              {/* Background Slot Grid: Interactive Drag, Drop, Click Targets */}
                              <div className="timetable-day-slots-bg">
                                {TIME_SLOTS.map((slot, slotIdx) => {
                                  const inRange = isSlotInDragRange(day, slotIdx);
                                  const isDropHover = dropTarget?.day === day && dropTarget?.slot === slot;

                                  return (
                                    <div
                                      key={`${day}-${slot}`}
                                      className={`schedule-grid-cell ${inRange ? "drag-hover" : ""} ${isDropHover ? "drag-target-hover" : ""}`}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        if (!dropTarget || dropTarget.day !== day || dropTarget.slot !== slot) {
                                          setDropTarget({ day, slot });
                                        }
                                      }}
                                      onDragLeave={() => {
                                        if (dropTarget?.day === day && dropTarget?.slot === slot) {
                                          setDropTarget(null);
                                        }
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const dataStr = e.dataTransfer.getData("application/json");
                                        handleDropOnCell(day, slot, dataStr);
                                      }}
                                      onMouseDown={(e) => {
                                        if (e.button === 0) {
                                          handleMouseDownCell(day, slotIdx);
                                        }
                                      }}
                                      onMouseEnter={() => handleMouseEnterCell(day, slotIdx)}
                                    >
                                      <div className="schedule-empty-slot">
                                        {isDropHover ? (
                                          <span className="schedule-drag-hint">
                                            <Download size={13} style={{ flexShrink: 0 }} /> Drop to assign here
                                          </span>
                                        ) : inRange && dragStart && dragCurrent ? (
                                          <span className="schedule-drag-hint">
                                            <Clock size={13} style={{ flexShrink: 0 }} />{" "}
                                            {TIME_SLOTS[Math.min(dragStart.slotIdx, dragCurrent.slotIdx)].split("-")[0].trim()} -{" "}
                                            {TIME_SLOTS[Math.max(dragStart.slotIdx, dragCurrent.slotIdx)].split("-")[1].trim()}
                                          </span>
                                        ) : canCreate ? (
                                          <span className="grid-cell-add-btn">
                                            <Plus size={11} style={{ marginRight: 2 }} /> Add
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Foreground Scheduled Class Blocks */}
                              <div className="timetable-day-items-layer">
                                {blocks.map((block) => (
                                  <div
                                    key={block.key}
                                    className="timetable-schedule-positioned-block"
                                    style={{
                                      top: `${block.startIdx * 52}px`,
                                      height: `${block.span * 52 - 4}px`,
                                      left: `calc(${block.leftPercent}% + 2px)`,
                                      width: `calc(${block.widthPercent}% - 4px)`,
                                      zIndex: 2,
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const dataStr = e.dataTransfer.getData("application/json");
                                      handleDropOnCell(day, block.slot, dataStr);
                                    }}
                                  >
                                    <StackedScheduleCell
                                      day={day}
                                      slot={block.slot}
                                      slotIdx={block.startIdx}
                                      rowSpan={block.span}
                                      schedules={block.items}
                                      canCreate={canCreate}
                                      onEdit={handleEdit}
                                      onDelete={(item) => setScheduleToDelete(item)}
                                      onView={(item) => setViewingSchedule(item)}
                                      onAddAtSlot={handleOpenAddAtSlot}
                                      onOpenStackGroup={(group) => {
                                        setActiveStackGroup(group);
                                        setSelectedInDrawerIds(new Set());
                                      }}
                                      onAssignPlotted={handleAssignPlottedSlot}
                                      onRemovePlotted={handleRemovePlottedSlot}
                                      isSelectMode={isSelectMode}
                                      selectedScheduleIds={selectedScheduleIds}
                                      onToggleSelect={toggleScheduleSelection}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid View Floating Bulk Action Bar */}
                {selectedScheduleIds.size > 0 && (
                  <div
                    className="user-mgmt-bulk-bar"
                    role="region"
                    aria-label="Bulk actions toolbar"
                    data-testid="grid-bulk-bar"
                    style={{
                      position: "sticky",
                      bottom: 16,
                      zIndex: 50,
                      marginTop: 16,
                      boxShadow: "0 4px 18px rgba(15, 23, 42, 0.12)",
                      background: "var(--srcb-surface-elevated, #ffffff)",
                      border: "1px solid var(--srcb-border)",
                    }}
                  >
                    <div className="bulk-bar-info">
                      <CheckCircle2 size={16} color="var(--srcb-royal)" />
                      <span>
                        <strong>{selectedScheduleIds.size}</strong> class schedule{selectedScheduleIds.size > 1 ? "s" : ""} selected
                      </span>
                    </div>
                    <div className="bulk-bar-actions">
                      <button
                        type="button"
                        className="bulk-action-btn danger"
                        data-testid="grid-bulk-delete-btn"
                        onClick={() => {
                          const toDelete = scheduleItems.filter((s) => selectedScheduleIds.has(s.id));
                          setSchedulesToBulkDelete(toDelete);
                        }}
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                          fontWeight: 700,
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedScheduleIds.size})</span>
                      </button>
                      <button
                        type="button"
                        className="bulk-action-btn"
                        onClick={() => setSelectedScheduleIds(new Set())}
                      >
                        <X size={14} />
                        <span>Clear Selection</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Mode: Filterable List View */}
            {viewMode === "list" && (
              <div style={{ marginTop: 16 }}>
                {visibleSchedules.length === 0 ? (
                  <div className="empty-state" style={{ padding: "36px 16px", background: "var(--srcb-surface-alt, #f8fafc)", borderRadius: 8, textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No scheduled classes found matching your filters.</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                      Try changing your Day or Instructor filter, or adjusting your search keywords.
                    </p>
                    {(query || selectedDayFilter !== "All" || selectedFacultyFilter !== "All") && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setQuery("");
                          setSelectedDayFilter("All");
                          setSelectedFacultyFilter("All");
                        }}
                        style={{ marginTop: 12, fontSize: "0.8rem" }}
                      >
                        Clear Search & Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {canCreate && visibleSchedules.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          background: "var(--srcb-surface-alt, #f8fafc)",
                          borderRadius: 8,
                          border: "1px solid var(--srcb-border)",
                          marginBottom: 16,
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", margin: 0 }}>
                          <input
                            type="checkbox"
                            data-testid="list-select-all-checkbox"
                            checked={visibleSchedules.length > 0 && visibleSchedules.every((s) => selectedScheduleIds.has(s.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScheduleIds(new Set(visibleSchedules.map((s) => s.id)));
                              } else {
                                setSelectedScheduleIds(new Set());
                              }
                            }}
                            style={{ width: 16, height: 16, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer" }}
                          />
                          <span>Select All Visible Classes ({visibleSchedules.length})</span>
                        </label>

                        {selectedScheduleIds.size > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              type="button"
                              className="secondary-button"
                              data-testid="list-bulk-delete-btn"
                              onClick={() => {
                                const toDelete = scheduleItems.filter((s) => selectedScheduleIds.has(s.id));
                                setSchedulesToBulkDelete(toDelete);
                              }}
                              style={{
                                padding: "5px 14px",
                                fontSize: "0.82rem",
                                color: "#dc2626",
                                borderColor: "#fca5a5",
                                background: "#fff1f2",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontWeight: 700,
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete Selected ({selectedScheduleIds.size})</span>
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => setSelectedScheduleIds(new Set())}
                              style={{ padding: "5px 12px", fontSize: "0.82rem" }}
                            >
                              <X size={13} />
                              <span>Clear Selection</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                      {visibleSchedules.map((item) => {
                        const itemTheme = getProgramTheme(item);
                        return (
                          <div
                            key={item.id}
                            style={{
                              background: item.modality === "Online" ? "rgba(52, 211, 153, 0.12)" : "var(--srcb-surface-elevated, #ffffff)",
                              border: selectedScheduleIds.has(item.id) ? "1.5px solid var(--srcb-royal, #2563eb)" : "1px solid var(--srcb-border)",
                              borderLeft: `5px solid ${itemTheme.primary}`,
                              borderRadius: 10,
                              padding: "14px 16px",
                              boxShadow: selectedScheduleIds.has(item.id) ? "0 0 0 3px rgba(37, 99, 235, 0.15)" : "0 2px 6px rgba(15, 23, 42, 0.05)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              transition: "transform 150ms ease, box-shadow 150ms ease",
                            }}
                          >
                            <div>
                              {/* Card Header: Code & Modality */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {canCreate && (
                                    <input
                                      type="checkbox"
                                      data-testid={`list-item-checkbox-${item.id}`}
                                      checked={selectedScheduleIds.has(item.id)}
                                      onChange={() => toggleScheduleSelection(item.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ width: 16, height: 16, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer", marginRight: 4 }}
                                      aria-label={`Select schedule for ${item.subjectCode}`}
                                    />
                                  )}
                                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                                    {item.subjectCode}
                                  </span>
                                  <span
                                    className="program-card-badge"
                                    style={{
                                      backgroundColor: itemTheme.badgeBg,
                                      color: itemTheme.badgeText,
                                    }}
                                    title={`Program: ${itemTheme.name}`}
                                  >
                                    {itemTheme.code}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  {item.modality === "Online" && (
                                    <span
                                      className="pill pill--emerald"
                                      style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                                    >
                                      Online
                                    </span>
                                  )}
                                  <span className={`pill ${item.isMajor ? "pill--royal" : "pill--slate"}`} style={{ fontSize: "0.7rem" }}>
                                    {item.isMajor ? "Major" : "Gen Ed"}
                                  </span>
                                </div>
                              </div>

                              {/* Subject Name */}
                              <h4 style={{ fontSize: "0.9rem", color: "var(--srcb-text)", margin: "0 0 8px 0", fontWeight: 600, lineHeight: 1.3 }}>
                                {item.subject}
                              </h4>

                              {/* Metadata Grid */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: "0.8rem", color: "var(--srcb-text-muted)", background: "var(--srcb-surface-alt)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Calendar size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Day:</strong> {item.day}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Clock size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Time:</strong> {item.time}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <GraduationCap size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Section:</strong> {item.section}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <DoorOpen size={12} style={{ flexShrink: 0 }} /> <strong style={{ color: "var(--srcb-text)" }}>Room:</strong> {item.room}
                                </div>
                              </div>

                              <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--srcb-navy)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                <UserCheck size={13} style={{ flexShrink: 0 }} /> {item.faculty}
                              </div>

                              {item.modality === "Online" && item.onlineLink && (
                                <div style={{ marginTop: 6 }}>
                                  <a
                                    href={item.onlineLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: "0.76rem",
                                      color: "#059669",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      textDecoration: "underline",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <ExternalLink size={13} /> Open Virtual Meeting Link
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Card Actions */}
                            {canCreate ? (
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--srcb-border-subtle, #f1f5f9)" }}>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleDuplicate(item)}
                                  aria-label={`Duplicate schedule for ${item.subjectCode}`}
                                  style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Copy size={13} /> Duplicate
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleEdit(item)}
                                  aria-label={`Edit schedule for ${item.subjectCode}`}
                                  style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Edit2 size={13} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => setScheduleToDelete(item)}
                                  aria-label={`Remove schedule for ${item.subjectCode}`}
                                  style={{ padding: "5px 10px", fontSize: "0.78rem", color: "#dc2626", borderColor: "#fca5a5", display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Trash2 size={13} /> Remove
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--srcb-border-subtle, #f1f5f9)" }}>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => setViewingSchedule(item)}
                                  style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                                >
                                  <Eye size={13} /> View Details
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Unscheduled Subjects View */}
            {viewMode === "unscheduled" && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--srcb-text)" }}>
                      Curriculum Subjects Awaiting Class Schedule ({filteredUnscheduled.length})
                    </h4>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.84rem" }}>
                      These subjects are active in the institutional catalog but do not currently have an assigned timetable block.
                    </p>
                  </div>
                  <span className="pill pill--amber">
                    {filteredUnscheduled.length} Unscheduled
                  </span>
                </div>

                {filteredUnscheduled.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <CheckCircle2 size={40} color="#10b981" style={{ margin: "0 auto 12px" }} />
                    <h3 style={{ margin: 0, color: "var(--srcb-text)" }}>All Academic Subjects Scheduled</h3>
                    <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
                      Every active curriculum subject in the institutional database has been allocated a timetable schedule.
                    </p>
                  </div>
                ) : (
                  <div className="grid-3" style={{ gap: 16 }}>
                    {filteredUnscheduled.map((sub) => {
                      const subTheme = getProgramTheme(sub);
                      return (
                        <div
                          key={sub.code || sub.id}
                          className="card"
                          style={{
                            borderLeft: `4px solid ${subTheme.primary}`,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: 16,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--srcb-navy)" }}>
                                  {sub.code}
                                </span>
                                <span
                                  className="program-card-badge"
                                  style={{
                                    backgroundColor: subTheme.badgeBg,
                                    color: subTheme.badgeText,
                                  }}
                                  title={`Program: ${subTheme.name}`}
                                >
                                  {subTheme.code}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <span className={`pill ${sub.isMajor ? "pill--royal" : "pill--slate"}`} style={{ fontSize: "0.7rem" }}>
                                  {sub.isMajor ? "Major" : "Gen Ed"}
                                </span>
                                <span className="pill pill--amber" style={{ fontSize: "0.7rem" }}>
                                  Unscheduled
                                </span>
                              </div>
                            </div>

                            <h4 style={{ fontSize: "0.92rem", color: "var(--srcb-text)", margin: "0 0 8px 0", fontWeight: 600, lineHeight: 1.3 }}>
                              {sub.name}
                            </h4>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: "0.8rem", color: "var(--srcb-text-muted)", background: "var(--srcb-surface-alt, rgba(148, 163, 184, 0.08))", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)" }}>
                              <div>
                                <strong>Department:</strong> {sub.program || sub.department || "Academic"}
                              </div>
                              <div>
                                <strong>Units:</strong> {sub.units || 3} Units
                              </div>
                              <div>
                                <strong>Lec Hours:</strong> {sub.lecHours || sub.lectureHours || 3} hrs
                              </div>
                              <div>
                                <strong>Lab Hours:</strong> {sub.labHours || 0} hrs
                              </div>
                            </div>
                          </div>

                          {canCreate && (
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--srcb-border)", flexWrap: "wrap" }}>
                              {role === "program_head" && (
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedPermissionSubject(sub);
                                    setIsDirectPermissionModalOpen(true);
                                  }}
                                  style={{ padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                                  title="Submit a permission request to Admin for this subject"
                                >
                                  <ShieldCheck size={14} /> Request Permission
                                </button>
                              )}
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => handleScheduleUnscheduledSubject(sub)}
                                style={{ padding: "6px 14px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                              >
                                <CalendarRange size={14} /> Schedule Now
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Program Head Permission Requests Governance View */}

          </>
        )}
      </section>

      {/* ===================================================
          TWO-STEP MANUAL CLASS SCHEDULE MODAL
          =================================================== */}
      <Modal
        isOpen={isOpen && canCreate}
        size="lg"
        className="sched-wizard-modal"
        icon={<Calendar size={18} />}
        eyebrow="Class Timetable"
        title={
          modalStep === 1
            ? (editingSchedule ? "Edit Class Schedule - Step 1: Set Class Time" : "Create Class Schedule - Step 1: Set Class Time")
            : modalStep === 2
              ? (editingSchedule ? "Edit Class Schedule - Step 2: Subject & Section" : "Create Class Schedule - Step 2: Subject & Section")
              : (editingSchedule ? "Edit Class Schedule - Step 3: Instructor & Classroom" : "Create Class Schedule - Step 3: Instructor & Classroom")
        }
        description={
          modalStep === 1
            ? "Set the teaching day and time window for this class."
            : modalStep === 2
              ? "Select the curriculum subject and student section."
              : "Assign the instructor and classroom for this class."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingSchedule(null);
          setEditingPlottedSlotId(null);
          setModalStep(1);
        }}
      >
        {/* Sleek Minimal Stepper */}
        <div className="sched-wizard-stepper">
          <button
            type="button"
            className={`sched-step-btn ${modalStep === 1 ? "is-active" : modalStep > 1 ? "is-completed" : ""}`}
            onClick={() => setModalStep(1)}
          >
            <div className="sched-step-circle">
              {modalStep > 1 ? <Check size={14} /> : <span>1</span>}
            </div>
            <div className="sched-step-info">
              <span className="sched-step-label">Step 1</span>
              <span className="sched-step-title">Designate Time</span>
            </div>
          </button>

          <div className={`sched-step-divider ${modalStep >= 2 ? "is-active" : ""}`} />

          <button
            type="button"
            className={`sched-step-btn ${modalStep === 2 ? "is-active" : modalStep > 2 ? "is-completed" : ""}`}
            onClick={() => {
              if (isStep1ResourcesAvailable) {
                setModalStep(2);
              }
            }}
            disabled={modalStep === 1 && !isStep1ResourcesAvailable}
            title={!isStep1ResourcesAvailable ? "Please select Day and Time first" : "Jump to Step 2"}
          >
            <div className="sched-step-circle">
              {modalStep > 2 ? <Check size={14} /> : <span>2</span>}
            </div>
            <div className="sched-step-info">
              <span className="sched-step-label">Step 2</span>
              <span className="sched-step-title">Subject & Section</span>
            </div>
          </button>

          <div className={`sched-step-divider ${modalStep === 3 ? "is-active" : ""}`} />

          <button
            type="button"
            className={`sched-step-btn ${modalStep === 3 ? "is-active" : ""}`}
            onClick={() => {
              if (isStep2ResourcesAvailable) {
                setModalStep(3);
              }
            }}
            disabled={modalStep < 3 && !isStep2ResourcesAvailable}
            title={!isStep2ResourcesAvailable ? "Please select Subject and Section first" : "Jump to Step 3"}
          >
            <div className="sched-step-circle">
              <span>3</span>
            </div>
            <div className="sched-step-info">
              <span className="sched-step-label">Step 3</span>
              <span className="sched-step-title">Teacher & Room</span>
            </div>
          </button>
        </div>

        {/* STEP 1: TIME FIRST */}
        {/* STEP 1: TIME FIRST */}
        {modalStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              className="sched-form-card"
              style={{
                padding: "16px 18px",
                background: "var(--srcb-surface, #ffffff)",
                border: "1px solid var(--srcb-border)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Header: Title + Real-time Live Status Badge (Heuristic #1: Visibility of System Status) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "rgba(2, 132, 199, 0.1)",
                      color: "var(--srcb-royal, #0284c7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="sched-form-card-title" style={{ fontSize: "0.95rem", fontWeight: 700, display: "block", color: "var(--srcb-navy, #0f2c59)" }}>
                      1. Select Designated Class Time First
                    </span>
                    <span style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                      Set the teaching day and timetable duration for this class block
                    </span>
                  </div>
                </div>

                {form.time && getTimeDurationStr(form.time) && (
                  <span
                    className="sched-duration-tag"
                    style={{
                      background: "rgba(2, 132, 199, 0.09)",
                      color: "var(--srcb-royal, #0284c7)",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: "0.76rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      border: "1px solid rgba(2, 132, 199, 0.25)",
                    }}
                  >
                    <Clock size={12} />
                    <span>{form.day} • {form.time} ({getTimeDurationStr(form.time)})</span>
                  </span>
                )}
              </div>

              {/* Day and Time Controls in a Balanced Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.65fr", gap: 16, alignItems: "start" }}>
                {/* Teaching Day Selection */}
                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedDay" className="modal-field-label" style={{ marginBottom: 6, fontSize: "0.82rem", fontWeight: 600 }}>
                    <Calendar size={13} />
                    <span>Teaching Day</span>
                    <span className="required-asterisk">*</span>
                  </label>
                  <select
                    id="schedDay"
                    aria-label="Teaching Day"
                    value={form.day}
                    onChange={(e) => {
                      const newDay = e.target.value;
                      const hasPair = Boolean(getPairedDay(newDay));
                      setForm({ ...form, day: newDay });
                      if (!editingSchedule) {
                        setPairedEnabled(hasPair);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: "0.85rem",
                      borderRadius: 8,
                      border: "1.5px solid var(--srcb-border)",
                      background: "var(--srcb-surface, #ffffff)",
                      width: "100%",
                      fontWeight: 600,
                    }}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d} {getPairedDay(d) ? `(Pairs with ${getPairedDay(d)})` : ""}
                      </option>
                    ))}
                  </select>

                  {!editingSchedule && pairedDay && (
                    <label
                      style={{
                        fontSize: "0.76rem",
                        color: pairedEnabled ? "var(--srcb-royal, #0284c7)" : "var(--srcb-text-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        marginTop: 8,
                        cursor: "pointer",
                        fontWeight: pairedEnabled ? 600 : 500,
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: pairedEnabled ? "rgba(2, 132, 199, 0.08)" : "transparent",
                        border: pairedEnabled ? "1px solid rgba(2, 132, 199, 0.2)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={pairedEnabled}
                        onChange={(e) => setPairedEnabled(e.target.checked)}
                        style={{ cursor: "pointer", margin: 0 }}
                      />
                      <span>Auto-pairs with {pairedDay}</span>
                    </label>
                  )}
                </div>

                {/* Time Window Option (Heuristics Enhanced: Error Prevention, Recognition, and Flexibility) */}
                <div className="sched-time-window-card" style={{ margin: 0 }}>
                  <div className="sched-time-window-header">
                    <label htmlFor="schedStartTime" className="modal-field-label" style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy, #0f2c59)" }}>
                      <Clock size={13} />
                      <span>Time Window</span>
                      <span className="required-asterisk">*</span>
                    </label>

                    {/* Quick Duration Buttons (Heuristics: Recognition rather than Recall & Efficiency) */}
                    <div className="sched-duration-pills-wrap">
                      <button
                        type="button"
                        onClick={() => handleQuickDuration(90)}
                        className={`sched-duration-pill-btn ${parsedDurationMinutes === 90 ? "is-active" : ""}`}
                        title="Standard 1.5 Hours for Minor / Gen Ed"
                      >
                        1.5h (Minor)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDuration(120)}
                        className={`sched-duration-pill-btn ${parsedDurationMinutes === 120 ? "is-active" : ""}`}
                        title="Standard 2.0 Hours for Major Lecture"
                      >
                        2.0h (Major Lec)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDuration(180)}
                        className={`sched-duration-pill-btn ${parsedDurationMinutes === 180 ? "is-active" : ""}`}
                        title="Standard 3.0 Hours for Laboratory"
                      >
                        3.0h (Lab)
                      </button>
                    </div>
                  </div>

                  {/* Start and End Time Selectors (Selectable Dropdowns) */}
                  <div className="sched-time-picker-grid">
                    <div className="sched-time-select-card">
                      <label htmlFor="schedStartTime" className="sched-time-select-label">
                        <Clock size={11} /> Start Time
                      </label>
                      <select
                        id="schedStartTime"
                        aria-label="Start Time"
                        className="sched-time-select-dropdown"
                        value={form.time.split("-")[0]?.trim() || "07:00 AM"}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                      >
                        {TIME_POINTS.slice(0, -1).map((tp) => (
                          <option key={tp} value={tp}>
                            {tp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sched-time-connector">
                      <ArrowRight size={13} />
                      <span>{getTimeDurationStr(form.time) || "Duration"}</span>
                    </div>

                    <div className="sched-time-select-card">
                      <label htmlFor="schedEndTime" className="sched-time-select-label">
                        <Clock size={11} /> End Time
                      </label>
                      <select
                        id="schedEndTime"
                        aria-label="End Time"
                        className="sched-time-select-dropdown"
                        value={form.time.split("-")[1]?.trim() || "08:30 AM"}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                      >
                        {validEndPoints.map((tp) => {
                          const sPart = form.time.split("-")[0]?.trim() || "07:00 AM";
                          const dur = getTimeDurationStr(`${sPart} - ${tp}`);
                          return (
                            <option key={tp} value={tp}>
                              {tp} {dur ? `(${dur})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paired Day Information Card (Heuristic #1: Visibility of System Status) */}
              {!editingSchedule && pairedDay && pairedEnabled && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(2, 132, 199, 0.06)",
                    border: "1px solid rgba(2, 132, 199, 0.2)",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    color: "var(--srcb-royal, #0284c7)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CalendarRange size={14} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Auto-pairs with {pairedDay}:</strong> Linked class pattern scheduled for {pairedDay} • {pairedTime} ({pairedClassMode === "Laboratory" ? "3h Lab" : "2h Lecture"}).
                  </span>
                </div>
              )}

              {/* Concurrent Time Slot Note */}
              {concurrentSlotSchedules.length > 0 && (
                <div
                  style={{
                    padding: "7px 11px",
                    background: "rgba(37, 99, 235, 0.05)",
                    border: "1px solid rgba(37, 99, 235, 0.18)",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    color: "var(--srcb-royal, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Layers size={13} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Concurrent Time Slot:</strong> {concurrentSlotSchedules.length} other class{concurrentSlotSchedules.length > 1 ? "es" : ""} running at this time ({concurrentSlotSchedules.map((cs) => `${cs.subjectCode || "Class"} in ${cs.room || "Room"}`).join(", ")}).
                  </span>
                </div>
              )}
            </div>

            {/* STEP 1 ACTIONS */}
            <div className="modal-actions" style={{ justifyContent: "space-between", marginTop: 2, padding: "8px 16px" }}>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsOpen(false);
                  setEditingSchedule(null);
                  setEditingPlottedSlotId(null);
                  setModalStep(1);
                }}
                style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              >
                Cancel
              </button>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {editingSchedule && (
                  <button
                    type="button"
                    className="action-button action-button--secondary"
                    onClick={() => handleSave(false)}
                    disabled={loading}
                    style={{ padding: "6px 14px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>Save Changes</span>
                  </button>
                )}
                <button
                  type="button"
                  className="action-button"
                  aria-label="Confirm Time & Next"
                  onClick={() => handleConfirmTimeAndNext()}
                  style={{
                    padding: "6px 18px",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>Confirm Time & Next</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CURRICULUM SUBJECT & SECTION */}
        {modalStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Minimal Confirmed Time Context Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 12px",
                background: "var(--srcb-surface-alt, #f8fafc)",
                borderRadius: 8,
                border: "1px solid var(--srcb-border)",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={12} color="var(--srcb-royal)" />
                <span>
                  <strong>Confirmed Time:</strong>{" "}
                  {!editingSchedule && pairedDay && pairedEnabled
                    ? `${form.day} & ${pairedDay} • ${form.time} ${form.isMajor
                      ? `(${form.classMode})`
                      : `(${parsedDurationMinutes / 60}h Minor)`
                    }`
                    : `${form.day} • ${form.time} (${form.isMajor ? form.classMode : `${parsedDurationMinutes / 60}h Minor`})`}
                </span>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalStep(1)}
                style={{ padding: "2px 8px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Edit2 size={10} />
                <span>Change Time</span>
              </button>
            </div>

            {/* Step 2 Form Card: Subject & Section */}
            <div
              className="sched-form-card"
              style={{
                padding: "14px 16px",
                background: "var(--srcb-surface, #ffffff)",
                border: "1px solid var(--srcb-border)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span className="sched-form-card-title" style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                  2. Curriculum Subject & Section
                </span>
                {form.subjectCode && (
                  <span
                    style={{
                      background: "rgba(2, 132, 199, 0.1)",
                      color: "var(--srcb-royal, #0284c7)",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <BookOpen size={12} />
                    {form.subjectCode}
                  </span>
                )}
              </div>

              {/* 2-Column Grid for Subject & Section matching Steps 1 & 3 */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "start" }}>
                {/* Subject Selection */}
                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedSubject" className="modal-field-label" style={{ marginBottom: 4, fontSize: "0.82rem" }}>
                    <BookOpen size={13} />
                    <span>Curriculum Subject / Course</span>
                    <span className="required-asterisk">*</span>
                  </label>
                  <SearchableSelect
                    id="schedSubject"
                    value={form.subjectCode}
                    onChange={(val) => handleSubjectChange(val)}
                    options={subjectOptionsForStep1}
                    placeholder="Search course code or subject title..."
                    searchPlaceholder="Search subjects (e.g. IT 101, CC 102)..."
                    emptyText="No matching subjects found"
                  />
                </div>

                {/* Section Selection */}
                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedSection" className="modal-field-label" style={{ marginBottom: 4, fontSize: "0.82rem" }}>
                    <Users size={13} />
                    <span>Student Section</span>
                    <span className="required-asterisk">*</span>
                  </label>
                  <SearchableSelect
                    id="schedSection"
                    value={form.section}
                    onChange={(val) => {
                      const sec = availableSections.find(
                        (s) => s.section === val || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === val)
                      );
                      setForm({
                        ...form,
                        section: val,
                        program: sec?.program || sec?.course || form.program,
                      });
                    }}
                    options={sectionOptionsForStep2}
                    placeholder="Search & select student section..."
                    searchPlaceholder="Search sections (e.g. BSIT 1-A)..."
                    emptyText="No matching student sections found"
                  />
                </div>
              </div>

              {/* Status Banner when all sections are occupied (Heuristic: Visibility of System Status & Error Prevention) */}
              {sectionOptionsForStep2.length === 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    color: "#b91c1c",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>All student sections are already scheduled at this time.</strong> Every section in this program already has a timetable block during {form.day} {form.time}. Please switch time window in Step 1 to schedule another class.
                  </span>
                </div>
              )}

              {/* Major Subject Mode / Paired Info */}
              {selectedSubjectObj && form.isMajor && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "8px 12px",
                    background: "rgba(37, 99, 235, 0.05)",
                    borderRadius: 8,
                    border: "1px solid rgba(37, 99, 235, 0.15)",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--srcb-text-muted)" }}>
                      Class Mode:
                    </span>
                    <button
                      type="button"
                      className={`mode-btn ${form.classMode === "Lecture" ? "is-active" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, classMode: "Lecture" }))}
                      style={{ padding: "3px 8px", fontSize: "0.74rem", borderRadius: 4 }}
                    >
                      {form.day}: Lecture (2h)
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${form.classMode === "Laboratory" ? "is-active" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, classMode: "Laboratory" }))}
                      style={{ padding: "3px 8px", fontSize: "0.74rem", borderRadius: 4 }}
                    >
                      {form.day}: Lab (3h)
                    </button>
                  </div>

                  {!editingSchedule && pairedDay && pairedEnabled && (
                    <span style={{ fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                      Auto-pairs with {pairedDay}: {pairedDay} auto-assigned as <strong>{pairedClassMode} ({pairedClassMode === "Laboratory" ? "3 hrs" : "2 hrs"})</strong>
                    </span>
                  )}
                </div>
              )}

              {concurrentSlotSchedules.length > 0 && (
                <div
                  style={{
                    padding: "6px 10px",
                    background: "rgba(37, 99, 235, 0.06)",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                    borderRadius: 6,
                    fontSize: "0.74rem",
                    color: "var(--srcb-royal, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <Layers size={13} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Other classes scheduled at this time:</strong> {concurrentSlotSchedules.map((cs) => `${cs.section || "Sec"} (${cs.subjectCode})`).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2 Action Footer */}
            <div className="modal-actions" style={{ justifyContent: "space-between", marginTop: 2, padding: "8px 16px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalStep(1)}
                style={{ padding: "6px 12px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <ArrowLeft size={14} />
                <span>Back to Time</span>
              </button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsOpen(false);
                    setEditingSchedule(null);
                    setModalStep(1);
                  }}
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-button"
                  disabled={!form.subjectCode || !form.section}
                  onClick={handleContinueToStep3}
                  style={{
                    padding: "6px 18px",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>Confirm Subject & Next</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INSTRUCTOR & CLASSROOM */}
        {modalStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Minimal Confirmed Context Summary Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 12px",
                background: "var(--srcb-surface-alt, #f8fafc)",
                borderRadius: 8,
                border: "1px solid var(--srcb-border)",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} color="var(--srcb-royal)" />
                  <strong>Time:</strong> {form.day} • {form.time}
                </span>
                <span style={{ color: "var(--srcb-border)" }}>|</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <BookOpen size={12} color="var(--srcb-royal)" />
                  <strong>Subject:</strong> {form.subjectCode}
                </span>
                <span style={{ color: "var(--srcb-border)" }}>|</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Users size={12} color="var(--srcb-royal)" />
                  <strong>Section:</strong> {form.section}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalStep(1)}
                  style={{ padding: "2px 8px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Edit2 size={10} />
                  <span>Change Time</span>
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalStep(2)}
                  style={{ padding: "2px 8px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Edit2 size={10} />
                  <span>Change Subject</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side: Instructor & Classroom */}
            <div
              className="sched-form-card"
              style={{
                padding: "14px 16px",
                background: "var(--srcb-surface, #ffffff)",
                border: "1px solid var(--srcb-border)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span className="sched-form-card-title" style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                  3. Instructor Assignment, Classroom & Verification
                </span>
                {form.room && (
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#059669",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <DoorOpen size={12} />
                    {form.room}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                {/* Column 1: Instructor */}
                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedFaculty" className="modal-field-label" style={{ marginBottom: 4, fontSize: "0.82rem" }}>
                    <UserCheck size={13} />
                    <span>Assigned Instructor</span>
                    <span className="required-asterisk">*</span>
                  </label>
                  <SearchableSelect
                    id="schedFaculty"
                    value={form.facultyId}
                    onChange={(val) => {
                      const fac = availableFaculty.find((f) => f.id === val);
                      setForm({
                        ...form,
                        facultyId: val,
                        faculty: fac ? fac.name : "",
                      });
                    }}
                    options={facultyOptionsForStep2}
                    placeholder="Search & select instructor..."
                    searchPlaceholder="Search instructors..."
                    emptyText="No matching instructors found"
                  />
                  {selectedFacultyMember && selectedFacultyMember.status === "Part-Time" && (
                    <div style={{ marginTop: 4, fontSize: "0.72rem", color: "#d97706" }}>
                      Part-Time Availability: {selectedFacultyMember.availability || "Check availability"}
                    </div>
                  )}
                </div>

                {/* Column 2: Classroom */}
                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedRoom" className="modal-field-label" style={{ marginBottom: 4, fontSize: "0.82rem" }}>
                    <DoorOpen size={13} />
                    <span>Assigned Classroom</span>
                    <span className="required-asterisk">*</span>
                  </label>
                  <SearchableSelect
                    id="schedRoom"
                    value={form.room}
                    onChange={(val) => handleRoomChange(val)}
                    options={roomOptionsForStep2}
                    placeholder="Search & select classroom or lab..."
                    searchPlaceholder="Search rooms..."
                    emptyText="No matching rooms found"
                  />

                  {/* Paired Day Room if needed */}
                  {!editingSchedule && pairedDay && pairedEnabled && (
                    <div style={{ marginTop: 8 }}>
                      <label htmlFor="schedPairedRoom" className="modal-field-label" style={{ marginBottom: 3, fontSize: "0.74rem" }}>
                        <DoorOpen size={12} />
                        <span>Classroom for {pairedDay} ({pairedClassMode})</span>
                        <span className="required-asterisk">*</span>
                      </label>
                      <SearchableSelect
                        id="schedPairedRoom"
                        value={form.pairedRoom || form.room}
                        onChange={(val) => setForm((prev) => ({ ...prev, pairedRoom: val }))}
                        options={pairedRoomOptionsForStep2}
                        placeholder={`Search room for ${pairedDay}...`}
                        searchPlaceholder="Search rooms..."
                        emptyText="No matching rooms found"
                      />
                    </div>
                  )}

                  {isRoomTooSmall && (
                    <div style={{ marginTop: 4, color: "#dc2626", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} />
                      <span>Room capacity ({selectedRoomObj?.capacity}) is less than section size ({selectedSectionHeadcount}).</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation & Conflict Diagnostics */}
              {validationFeedback.errors.length > 0 ? (
                <div
                  style={{
                    padding: "6px 10px",
                    background: "rgba(239, 68, 68, 0.08)",
                    borderRadius: 6,
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderLeft: "3px solid #dc2626",
                    fontSize: "0.74rem",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={13} />
                    <span>Conflicts Detected ({validationFeedback.errors.length})</span>
                  </div>
                  {validationFeedback.errors.map((err, i) => (
                    <div key={i} style={{ color: "var(--srcb-text)", marginTop: 2 }}>
                      • {err}
                    </div>
                  ))}
                </div>
              ) : validationFeedback.valid && form.subjectCode && form.section && form.faculty ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 8px",
                    background: "rgba(16, 185, 129, 0.08)",
                    borderRadius: 6,
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    fontSize: "0.74rem",
                    color: "#059669",
                    fontWeight: 600,
                  }}
                >
                  <ShieldCheck size={13} />
                  <span>All resources verified: Instructor, Room, and Section are clear.</span>
                </div>
              ) : null}
            </div>

            {/* Action Footer */}
            <div className="modal-actions" style={{ justifyContent: "space-between", marginTop: 2, padding: "8px 16px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalStep(2)}
                style={{ padding: "6px 12px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <ArrowLeft size={14} />
                <span>Back to Subject & Section</span>
              </button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsOpen(false);
                    setEditingSchedule(null);
                    setModalStep(1);
                  }}
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                {!editingSchedule && (
                  <button
                    type="button"
                    className="action-button action-button--secondary"
                    disabled={
                      loading ||
                      !form.subjectCode ||
                      !form.section ||
                      !form.faculty ||
                      (form.modality === "Face-to-Face" && !form.room) ||
                      (!validationFeedback.valid && validationFeedback.errors.length > 0 && !isDeanOrAdmin)
                    }
                    onClick={() => handleSave(true)}
                    title="Save this subject and immediately schedule another subject at this exact same time slot"
                    style={{
                      background: "var(--srcb-royal-light, #eff6ff)",
                      color: "var(--srcb-royal, #2563eb)",
                      borderColor: "var(--srcb-royal, #2563eb)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      fontSize: "0.82rem",
                    }}
                  >
                    <Plus size={14} />
                    <span>Save & Add Another Subject Here</span>
                  </button>
                )}
                <button
                  type="button"
                  className="action-button"
                  disabled={
                    loading ||
                    !form.subjectCode ||
                    !form.section ||
                    !form.faculty ||
                    (form.modality === "Face-to-Face" && !form.room) ||
                    (!validationFeedback.valid && validationFeedback.errors.length > 0 && !isDeanOrAdmin)
                  }
                  onClick={() => handleSave(false)}
                  style={{
                    padding: "6px 18px",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{loading ? "Saving…" : (editingSchedule ? "Save Schedule Changes" : "Confirm & Schedule Block")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Stacked Same-Time Schedules Group Modal / Drawer */}
      <Modal
        isOpen={Boolean(activeStackGroup)}
        onClose={() => {
          setActiveStackGroup(null);
          setExpandedStackItemId(null);
        }}
        title={`${activeStackGroup?.day || ""} • ${activeStackGroup?.slot || ""} (${activeStackGroup?.schedules.length || 0} ${activeStackGroup?.schedules.length === 1 ? "Class" : "Classes"})`}
        size="lg"
      >
        {activeStackGroup && (() => {
          const groupConflicts = getClusterConflicts(activeStackGroup.schedules);
          const isSingle = activeStackGroup.schedules.length === 1;

          return (
            <div className="stacked-group-modal-content">
              <div className="stacked-group-modal-banner">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: "8px", borderRadius: 8, background: "rgba(37, 99, 235, 0.1)", color: "var(--srcb-royal, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSingle ? <BookOpen size={20} /> : <Layers size={20} />}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--srcb-navy, #0f2c59)" }}>
                        {isSingle ? "1 Class Scheduled" : `${activeStackGroup.schedules.length} Concurrent Classes Scheduled`}
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted, #64748b)" }}>
                        {isSingle
                          ? `Scheduled on ${activeStackGroup.day} from ${activeStackGroup.slot}. Click "Details" to expand full assignment and actions.`
                          : `All classes below are scheduled simultaneously on ${activeStackGroup.day} from ${activeStackGroup.slot}. Click "Details" on any class to expand its full assignment.`}
                      </p>
                    </div>
                  </div>

                  {canCreate && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          const slotDay = activeStackGroup.day;
                          const slotTime = activeStackGroup.slot;
                          setActiveStackGroup(null);
                          handleOpenAddAtSlot(slotDay, slotTime);
                        }}
                        title={`+ Add Subject / Add another subject to slot (${activeStackGroup.day} ${activeStackGroup.slot})`}
                        aria-label={`+ Add Subject / Add another subject to slot ${activeStackGroup.day} ${activeStackGroup.slot}`}
                        style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <Plus size={13} />
                        <span>+ Add Subject</span>
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          handlePlotNewSlotAt(activeStackGroup.day, activeStackGroup.slot);
                          setActiveStackGroup(null);
                        }}
                        title={`+ Plot Another Slot (${activeStackGroup.day} ${activeStackGroup.slot})`}
                        aria-label={`+ Plot Another Slot ${activeStackGroup.day} ${activeStackGroup.slot}`}
                        style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <Clock size={13} />
                        <span>+ Plot Another Slot</span>
                      </button>
                    </div>
                  )}
                </div>

                {groupConflicts.hasConflict && (
                  <div className="stacked-group-conflict-alert">
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {groupConflicts.hasRoomClash && (
                        <span>
                          <strong>Room Collision:</strong> Multiple classes share room {groupConflicts.roomClashes.map(([r]) => r).join(", ")}.
                        </span>
                      )}
                      {groupConflicts.hasFacultyClash && (
                        <span>
                          <strong>Instructor Double-Booking:</strong> Faculty member {groupConflicts.facultyClashes.map(([f]) => f).join(", ")} is assigned to multiple classes.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Bulk Selection Toolbar (Delete multiple classes in this slot) */}
              {canCreate && activeStackGroup.schedules.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--srcb-surface-alt, #f8fafc)",
                    borderRadius: 8,
                    marginBottom: 12,
                    border: "1px solid var(--srcb-border-subtle, #e2e8f0)",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", margin: 0 }}>
                    <input
                      type="checkbox"
                      data-testid="drawer-select-all-checkbox"
                      checked={activeStackGroup.schedules.length > 0 && activeStackGroup.schedules.every((s) => selectedInDrawerIds.has(s.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInDrawerIds(new Set(activeStackGroup.schedules.map((s) => s.id)));
                        } else {
                          setSelectedInDrawerIds(new Set());
                        }
                      }}
                      style={{ width: 16, height: 16, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer" }}
                    />
                    <span>Select All in Slot ({activeStackGroup.schedules.length})</span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {selectedInDrawerIds.size > 0 && (
                      <button
                        type="button"
                        className="secondary-button"
                        data-testid="drawer-delete-selected-btn"
                        onClick={() => {
                          const toDelete = activeStackGroup.schedules.filter((s) => selectedInDrawerIds.has(s.id));
                          setSchedulesToBulkDelete(toDelete);
                        }}
                        style={{
                          padding: "5px 12px",
                          fontSize: "0.78rem",
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                          background: "#fff1f2",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontWeight: 700,
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete Selected ({selectedInDrawerIds.size})</span>
                      </button>
                    )}

                    {activeStackGroup.schedules.length > 1 && (
                      <button
                        type="button"
                        className="secondary-button"
                        data-testid="drawer-clear-slot-btn"
                        onClick={() => {
                          setSchedulesToBulkDelete(activeStackGroup.schedules);
                        }}
                        style={{
                          padding: "5px 12px",
                          fontSize: "0.78rem",
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        title="Delete all schedules in this slot at once"
                      >
                        <Trash2 size={13} />
                        <span>Delete All in Slot ({activeStackGroup.schedules.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TIER 2: Clean Subject-Only List with TIER 3 Accordion Details */}
              <div className="stacked-group-modal-list">
                {activeStackGroup.schedules.map((item, index) => {
                  if (item.isPlotted) {
                    const cleanId = item.id.replace(/^plotted-/, "");
                    return (
                      <div
                        key={item.id || `plotted-${index}`}
                        className="stacked-accordion-item is-plotted-item"
                        style={{ borderLeftColor: "#4f46e5" }}
                      >
                        <div className="stacked-accordion-header" style={{ cursor: "default" }}>
                          <div className="stacked-accordion-title-area">
                            {canCreate && (
                              <input
                                type="checkbox"
                                data-testid={`drawer-item-checkbox-${cleanId}`}
                                checked={selectedInDrawerIds.has(item.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedInDrawerIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(item.id)) next.delete(item.id);
                                    else next.add(item.id);
                                    return next;
                                  });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: 16, height: 16, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer", marginRight: 8, flexShrink: 0 }}
                                aria-label="Select plotted slot"
                              />
                            )}
                            <span
                              className="stacked-accordion-code"
                              style={{
                                color: "#4f46e5",
                                background: "rgba(79, 70, 229, 0.1)",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: 700,
                                fontSize: "0.75rem",
                              }}
                            >
                              PLOTTED SLOT
                            </span>
                            <span className="stacked-accordion-divider">—</span>
                            <span className="stacked-accordion-subject" style={{ color: "var(--srcb-text-muted)" }}>
                              Ready for Subject & Room Assignment
                            </span>
                          </div>

                          <div
                            className="stacked-accordion-actions"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "flex", gap: 6, alignItems: "center" }}
                          >
                            {canCreate && (
                              <>
                                <button
                                  type="button"
                                  className="primary-button"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: "0.75rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  onClick={() => {
                                    setActiveStackGroup(null);
                                    handleAssignPlottedSlot(item);
                                  }}
                                  title="Assign Subject & Room"
                                >
                                  <Plus size={12} />
                                  <span>Assign Subject & Room</span>
                                </button>
                                <button
                                  type="button"
                                  className="icon-button icon-button--sm icon-button--danger"
                                  onClick={() => {
                                    handleRemovePlottedSlot(cleanId);
                                    setActiveStackGroup((prev) =>
                                      prev
                                        ? {
                                          ...prev,
                                          schedules: prev.schedules.filter((s) => s.id !== item.id),
                                        }
                                        : null
                                    );
                                  }}
                                  title="Remove Plotted Slot"
                                  aria-label="Remove Plotted Slot"
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const sTheme = getProgramTheme(item);
                  const itemId = item.id || `stack-item-${index}`;
                  const isExpanded = expandedStackItemId === itemId;
                  const isRoomClashed = item.room && item.room !== "TBA" && activeStackGroup.schedules.filter((s) => s.room === item.room).length > 1;
                  const isFacultyClashed = item.faculty && item.faculty !== "TBA" && item.faculty !== "Unassigned" && activeStackGroup.schedules.filter((s) => s.faculty === item.faculty).length > 1;
                  const hasItemConflict = isRoomClashed || isFacultyClashed;

                  return (
                    <div
                      key={itemId}
                      className={`stacked-accordion-item ${isExpanded ? "is-expanded" : ""} ${hasItemConflict ? "has-conflict" : ""}`}
                      style={{ borderLeftColor: sTheme.primary }}
                    >
                      {/* TIER 2: Clean Subject-Only Header Row */}
                      <div
                        className="stacked-accordion-header"
                        onClick={() => setExpandedStackItemId(isExpanded ? null : itemId)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${item.subjectCode} — ${item.subject}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedStackItemId(isExpanded ? null : itemId);
                          }
                        }}
                      >
                        <div className="stacked-accordion-title-area">
                          {canCreate && (
                            <input
                              type="checkbox"
                              data-testid={`drawer-item-checkbox-${itemId}`}
                              checked={selectedInDrawerIds.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedInDrawerIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 16, height: 16, accentColor: "var(--srcb-royal, #2563eb)", cursor: "pointer", marginRight: 8, flexShrink: 0 }}
                              aria-label={`Select ${item.subjectCode}`}
                            />
                          )}
                          <span className="stacked-accordion-code" style={{ color: sTheme.primary }}>
                            {item.subjectCode}
                          </span>
                          <span className="stacked-accordion-divider">—</span>
                          <span className="stacked-accordion-subject">
                            {item.subject}
                          </span>
                          {hasItemConflict && (
                            <span className="stacked-row-conflict-badge" title="Collision flagged for this class">
                              ⚠️
                            </span>
                          )}
                        </div>

                        <div className="stacked-accordion-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`secondary-button stacked-details-toggle-btn ${isExpanded ? "is-active" : ""}`}
                            onClick={() => setExpandedStackItemId(isExpanded ? null : itemId)}
                            aria-label={`Details for ${item.subjectCode}`}
                          >
                            <span>Details</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* TIER 3: Expanded Full Details Section */}
                      {isExpanded && (
                        <div className="stacked-accordion-body">
                          {/* Specific conflict details if flagged */}
                          {hasItemConflict && (
                            <div className="stacked-group-conflict-alert" style={{ padding: "6px 10px", fontSize: "0.76rem" }}>
                              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {isRoomClashed && (
                                  <span><strong>Room Conflict:</strong> Room {item.room} is assigned to another concurrent class in this slot.</span>
                                )}
                                {isFacultyClashed && (
                                  <span><strong>Instructor Conflict:</strong> {item.faculty} is double-booked in this slot.</span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="stacked-group-modal-meta-grid">
                            <div className="stacked-meta-item">
                              <UserCheck size={13} className="meta-icon" />
                              <span><strong>Faculty / Instructor:</strong> {item.faculty || "Unassigned"}</span>
                            </div>

                            <div className="stacked-meta-item">
                              <DoorOpen size={13} className="meta-icon" />
                              <span><strong>Room & Building:</strong> {item.room || "TBA"} ({item.building || "College Building"})</span>
                            </div>

                            <div className="stacked-meta-item">
                              <GraduationCap size={13} className="meta-icon" />
                              <span><strong>Section & Year:</strong> {item.section || "N/A"}{item.yearLevel ? ` (Year ${item.yearLevel})` : ""}</span>
                              {item.isCombinedCohort && (
                                <span className="pill pill--cyan" style={{ fontSize: "0.62rem", padding: "0 4px" }}>Combined</span>
                              )}
                            </div>

                            <div className="stacked-meta-item">
                              <Monitor size={13} className="meta-icon" />
                              <span><strong>Modality:</strong> {item.modality || "Face-to-Face"}</span>
                            </div>

                            <div className="stacked-meta-item">
                              <Clock size={13} className="meta-icon" />
                              <span><strong>Time:</strong> {item.time}</span>
                            </div>
                          </div>

                          {/* Action controls */}
                          <div className="stacked-accordion-action-bar">
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                              onClick={() => setViewingSchedule(item)}
                              title="View Full Profile Details"
                            >
                              <Eye size={12} />
                              <span>Full Details</span>
                            </button>

                            {canCreate && (
                              <>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                  onClick={() => {
                                    setActiveStackGroup(null);
                                    handleEdit(item);
                                  }}
                                  title="Reassign Room"
                                >
                                  <DoorOpen size={12} />
                                  <span>Reassign Room</span>
                                </button>

                                <button
                                  type="button"
                                  className="primary-button"
                                  style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                  onClick={() => {
                                    setActiveStackGroup(null);
                                    handleEdit(item);
                                  }}
                                  title="Edit Schedule"
                                >
                                  <Edit2 size={12} />
                                  <span>Edit Schedule</span>
                                </button>

                                <button
                                  type="button"
                                  className="icon-button icon-button--sm icon-button--danger"
                                  onClick={() => {
                                    setActiveStackGroup(null);
                                    setScheduleToDelete(item);
                                  }}
                                  title="Delete"
                                  aria-label="Delete"
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Footer Quick Action CTA */}
                {canCreate && (
                  <div className="stacked-group-modal-footer-cta">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--srcb-navy, #0f2c59)" }}>
                      <Layers size={15} style={{ color: "var(--srcb-royal, #2563eb)", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                        Different class or section at this same time?
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        className="primary-button"
                        style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                        onClick={() => {
                          const slotDay = activeStackGroup.day;
                          const slotTime = activeStackGroup.slot;
                          setActiveStackGroup(null);
                          handleOpenAddAtSlot(slotDay, slotTime);
                        }}
                      >
                        <Plus size={13} />
                        <span>+ Add Another Class Here</span>
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ padding: "5px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                        onClick={() => {
                          handlePlotNewSlotAt(activeStackGroup.day, activeStackGroup.slot);
                          setActiveStackGroup(null);
                        }}
                      >
                        <Clock size={13} />
                        <span>+ Plot Another Slot</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Read-Only Assigned Schedule Details Modal */}
      <ScheduleDetailsModal
        isOpen={Boolean(viewingSchedule)}
        onClose={() => setViewingSchedule(null)}
        schedule={viewingSchedule}
        onDuplicate={canCreate ? handleDuplicate : undefined}
        onRequestAdjustment={(sched) => setScheduleToAdjust(sched)}
        onReviewAdjustment={(req) => setRequestToReview(req)}
        adjustmentRequest={
          adjustmentRequests.find(
            (r) =>
              (String(r.scheduleId) === String(viewingSchedule?.id) ||
                String((r as any).schedule_id) === String(viewingSchedule?.id) ||
                Number(r.scheduleId) === Number(viewingSchedule?.id) ||
                Number((r as any).schedule_id) === Number(viewingSchedule?.id) ||
                (r.subjectCode && viewingSchedule?.subjectCode && r.subjectCode.toUpperCase() === viewingSchedule.subjectCode.toUpperCase() && (!r.currentDay || r.currentDay.toLowerCase() === viewingSchedule.day.toLowerCase()))) &&
              (r.status === "Pending" || String(r.status || "").toLowerCase() === "pending")
          ) ||
          adjustmentRequests.find(
            (r) =>
              String(r.scheduleId) === String(viewingSchedule?.id) ||
              String((r as any).schedule_id) === String(viewingSchedule?.id) ||
              Number(r.scheduleId) === Number(viewingSchedule?.id) ||
              Number((r as any).schedule_id) === Number(viewingSchedule?.id) ||
              (r.subjectCode && viewingSchedule?.subjectCode && r.subjectCode.toUpperCase() === viewingSchedule.subjectCode.toUpperCase() && (!r.currentDay || r.currentDay.toLowerCase() === viewingSchedule.day.toLowerCase()))
          )
        }
        onFinalize={handleFinalizeSchedule}
        onPublish={handlePublishSchedule}
        userRole={role}
      />

      {/* Program Head Schedule Adjustment & Permission Request Modal */}
      <ScheduleAdjustmentRequestModal
        isOpen={Boolean(scheduleToAdjust) || isDirectPermissionModalOpen}
        onClose={() => {
          setScheduleToAdjust(null);
          setIsDirectPermissionModalOpen(false);
          setSelectedPermissionSubject(null);
        }}
        schedule={scheduleToAdjust}
        initialSubject={selectedPermissionSubject}
        roomsList={roomsList}
        subjectsList={availableSubjects}
        sectionsList={availableSections}
        onSubmitSuccess={() => {
          fetchAdjustmentRequests();
          fetchSchedules();
        }}
      />



      {/* Automated Faculty Gmail Dispatch Modal */}
      {isGmailDispatchModalOpen && (
        <Modal
          isOpen={isGmailDispatchModalOpen}
          onClose={() => setIsGmailDispatchModalOpen(false)}
          title="Dispatch Finalized Schedule to Faculty via Institutional Gmail"
          description="Send formatted digital schedule breakdown directly to faculty school Gmail accounts. Physical schedules remain placed in departmental cubicles."
          size="lg"
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, width: "100%" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsGmailDispatchModalOpen(false)}
                disabled={isDispatching}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button"
                onClick={handleExecuteGmailDispatch}
                disabled={isDispatching}
              >
                <Send size={15} style={{ marginRight: 6 }} />
                {isDispatching ? "Dispatching..." : "Send via Gmail"}
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field-group">
              <label htmlFor="dispatchFacultySelect">Target Faculty Member</label>
              <select
                id="dispatchFacultySelect"
                value={selectedDispatchFacultyId}
                onChange={(e) => handleDispatchFacultyChange(e.target.value)}
              >
                <option value="ALL">All Departmental Faculty Members (Batch Dispatch)</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.email || `${f.id.toLowerCase()}@srcb.edu.ph`}) • {f.department || "Faculty"}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Payload Preview Card */}
            <div
              style={{
                background: "var(--srcb-surface-alt, #f8fafc)",
                border: "1px solid var(--srcb-border)",
                borderRadius: 8,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span className="pill pill--royal" style={{ fontSize: "0.74rem", fontWeight: 700 }}>
                  <Mail size={12} style={{ marginRight: 4 }} /> Institutional Gmail Payload
                </span>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Sender: <code>academic.scheduling@srcb.edu.ph</code>
                </span>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--srcb-text)", lineHeight: 1.5 }}>
                {selectedDispatchFacultyId === "ALL" ? (
                  <div>
                    <strong>Batch Recipient Scope:</strong> All {facultyList.length} faculty instructors across {selectedProgram.label || "Department"}.
                    <br />
                    Each instructor receives a personalized breakdown of their assigned subjects, sections, lecture/lab hours, and room assignments.
                  </div>
                ) : (
                  <div>
                    <strong>Recipient:</strong>{" "}
                    {dispatchPreview?.faculty?.name || facultyList.find((f) => f.id === selectedDispatchFacultyId)?.name || selectedDispatchFacultyId} (
                    <code>
                      {dispatchPreview?.faculty?.email || facultyList.find((f) => f.id === selectedDispatchFacultyId)?.email || `${selectedDispatchFacultyId.toLowerCase()}@srcb.edu.ph`}
                    </code>
                    )
                    <br />
                    <strong>Assigned Classes:</strong> {dispatchPreview?.schedules?.length || 0} scheduled block(s)
                  </div>
                )}
              </div>

              {/* Cubicle Advisory Note Preview */}
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "rgba(0, 40, 85, 0.05)",
                  border: "1px solid rgba(0, 40, 85, 0.12)",
                  fontSize: "0.78rem",
                  color: "var(--srcb-navy)",
                }}
              >
                <strong>Departmental Cubicle Advisory:</strong>
                <p style={{ margin: "3px 0 0", fontStyle: "italic" }}>
                  "A physical printed copy of this finalized teaching schedule has been placed in your departmental faculty cubicle for daily classroom reference."
                </p>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="customNotes">Additional Advisory Notes (Optional)</label>
              <textarea
                id="customNotes"
                rows={2}
                value={customDispatchNotes}
                onChange={(e) => setCustomDispatchNotes(e.target.value)}
                placeholder="Add departmental notices, syllabus submission deadlines, or room guidelines..."
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)" }}
              />
            </div>

            <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Email dispatch status will be logged into the immutable SRCB Audit Trail (/system-logs).</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Dean's Multi-Schedule Time Plotter Modal */}
      {isBatchPlotterOpen && (
        <Modal
          isOpen={isBatchPlotterOpen}
          title="Plot Time Schedules to Matrix"
          subtitle="Pre-plot designated class time slots across the week. You can then click each plotted slot on the timetable to assign the subject and room."
          onClose={() => setIsBatchPlotterOpen(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Day Selector */}
            <div className="batch-plotter-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--srcb-navy)" }}>
                  1. Select Teaching Days:
                </strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                    onClick={() => setBatchPlotDays(["Monday", "Thursday"])}
                  >
                    Mon & Thu
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                    onClick={() => setBatchPlotDays(["Tuesday", "Friday"])}
                  >
                    Tue & Fri
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                    onClick={() => setBatchPlotDays(DAYS)}
                  >
                    All Days
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DAYS.map((day) => {
                  const isChecked = batchPlotDays.includes(day);
                  return (
                    <label
                      key={day}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: isChecked ? "1.5px solid var(--srcb-royal)" : "1px solid var(--srcb-border)",
                        background: isChecked ? "rgba(37, 99, 235, 0.08)" : "var(--srcb-surface)",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: isChecked ? 700 : 500,
                        color: isChecked ? "var(--srcb-royal)" : "var(--srcb-text)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBatchPlotDays((prev) => [...prev, day]);
                          } else {
                            setBatchPlotDays((prev) => prev.filter((d) => d !== day));
                          }
                        }}
                        style={{ accentColor: "var(--srcb-royal)" }}
                      />
                      <span>{day}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Selector */}
            <div className="batch-plotter-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--srcb-navy)" }}>
                  2. Select Time Schedules to Plot:
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)" }}>
                  {batchPlotTimes.length} slot(s) selected
                </span>
              </div>
              <div className="batch-plotter-grid">
                {SRCB_STANDARD_TIME_SLOTS.map((slot) => {
                  const isChecked = batchPlotTimes.includes(slot.label);
                  return (
                    <div
                      key={slot.id}
                      className={`batch-plotter-chip ${isChecked ? "is-selected" : ""}`}
                      onClick={() => {
                        if (isChecked) {
                          setBatchPlotTimes((prev) => prev.filter((t) => t !== slot.label));
                        } else {
                          setBatchPlotTimes((prev) => [...prev, slot.label]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        style={{ accentColor: "var(--srcb-royal)", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{slot.label}</span>
                        <span style={{ fontSize: "0.68rem", color: "var(--srcb-text-muted)", fontWeight: 500 }}>
                          {slot.durationMinutes} mins • {slot.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary & Action */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(37, 99, 235, 0.05)",
                border: "1px solid rgba(37, 99, 235, 0.2)",
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--srcb-navy)" }}>
                Will plot <strong>{batchPlotDays.length * batchPlotTimes.length}</strong> slot(s) across{" "}
                <strong>{batchPlotDays.length}</strong> day(s).
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setIsBatchPlotterOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-button"
                  onClick={handleBatchPlotTimeSchedules}
                  disabled={batchPlotDays.length === 0 || batchPlotTimes.length === 0}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                >
                  <CalendarPlus size={15} />
                  <span>Plot {batchPlotDays.length * batchPlotTimes.length} Schedules to Matrix</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Schedule Block Confirmation Modal (Heuristic 3 & 5) */}
      <ConfirmModal
        isOpen={Boolean(scheduleToDelete)}
        title="Remove Scheduled Class Block"
        variant="danger"
        confirmLabel="Delete Class Block"
        loading={loading}
        onCancel={() => setScheduleToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to remove the scheduled block for <strong>{scheduleToDelete?.subjectCode}</strong> ({scheduleToDelete?.day} {scheduleToDelete?.time}) in room <strong>{scheduleToDelete?.room}</strong>?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> The room, instructor timeslot, and section cohort will be immediately freed up.
            </span>
          </span>
        }
      />

      {/* Bulk Delete Schedules Confirmation Modal */}
      <ConfirmModal
        isOpen={schedulesToBulkDelete.length > 0}
        title={`Remove ${schedulesToBulkDelete.length} Scheduled Class${schedulesToBulkDelete.length > 1 ? "es" : ""}`}
        variant="danger"
        confirmLabel={`Delete ${schedulesToBulkDelete.length} Class${schedulesToBulkDelete.length > 1 ? "es" : ""}`}
        loading={loading}
        onCancel={() => setSchedulesToBulkDelete([])}
        onConfirm={executeBulkDelete}
        message={
          <div>
            <p style={{ margin: "0 0 10px", fontWeight: 600 }}>
              Are you sure you want to remove these <strong>{schedulesToBulkDelete.length}</strong> scheduled class blocks at once?
            </p>
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                background: "var(--srcb-surface-alt, #f8fafc)",
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 12,
                border: "1px solid var(--srcb-border-subtle, #e2e8f0)",
                fontSize: "0.82rem",
              }}
            >
              {schedulesToBulkDelete.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom: idx < schedulesToBulkDelete.length - 1 ? "1px dashed #e2e8f0" : "none",
                  }}
                >
                  <span>
                    <strong>{item.subjectCode || "Class"}</strong> — {item.section || "Section"} ({item.day} {item.time})
                  </span>
                  <span style={{ color: "var(--srcb-text-muted)" }}>{item.room || "Room TBA"}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> The rooms, instructor timeslots, and section cohorts for these {schedulesToBulkDelete.length} schedules will be immediately freed up.
            </span>
          </div>
        }
      />
    </motion.div>
  );
}
