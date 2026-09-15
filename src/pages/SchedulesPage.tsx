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
  GripVertical,
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

  // 1. Group items that have the exact same start time AND exact same duration span
  // so exact same-time schedules become a unified compact stack
  const exactTimeMap = new Map<string, { startIdx: number; span: number; endIdx: number; slot: string; items: ClassScheduleItem[] }>();

  for (const item of daySchedules) {
    const startIdx = Math.max(0, getScheduleStartSlotIdx(item.time));
    const span = Math.max(1, getScheduleRowSpan(item.time));
    const endIdx = Math.min(TIME_SLOTS.length, startIdx + span);
    const slotStr = item.time || (TIME_SLOTS[startIdx] ? `${TIME_SLOTS[startIdx].split("-")[0].trim()} - ${TIME_SLOTS[endIdx - 1]?.split("-")[1]?.trim() || ''}` : "07:00 AM - 07:30 AM");
    const exactKey = `${startIdx}_${span}`;

    if (!exactTimeMap.has(exactKey)) {
      exactTimeMap.set(exactKey, { startIdx, span, endIdx, slot: slotStr, items: [item] });
    } else {
      exactTimeMap.get(exactKey)!.items.push(item);
    }
  }

  const rawBlocks = Array.from(exactTimeMap.values());

  // 2. Sort by startIdx ascending, then span descending
  rawBlocks.sort((a, b) => a.startIdx - b.startIdx || b.span - a.span);

  // 3. Cluster overlapping blocks (blocks that overlap in time range [startIdx, endIdx))
  const clusters: typeof rawBlocks[] = [];
  for (const block of rawBlocks) {
    let placed = false;
    for (const cluster of clusters) {
      // Check if this block overlaps with any block in the cluster
      const overlaps = cluster.some((b) => block.startIdx < b.endIdx && b.startIdx < block.endIdx);
      if (overlaps) {
        cluster.push(block);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push([block]);
    }
  }

  // 4. Within each cluster, assign tracks (lanes)
  const result: DayTimelineBlock[] = [];

  for (const cluster of clusters) {
    // Sort cluster blocks by startIdx
    cluster.sort((a, b) => a.startIdx - b.startIdx || b.span - a.span);

    // Track end times for each lane
    const laneEndTimes: number[] = [];
    const blockTracks: number[] = [];

    for (const block of cluster) {
      // Find the first lane where laneEndTime <= block.startIdx
      let assignedLane = -1;
      for (let l = 0; l < laneEndTimes.length; l++) {
        if (laneEndTimes[l] <= block.startIdx) {
          assignedLane = l;
          laneEndTimes[l] = block.endIdx;
          break;
        }
      }
      if (assignedLane === -1) {
        assignedLane = laneEndTimes.length;
        laneEndTimes.push(block.endIdx);
      }
      blockTracks.push(assignedLane);
    }

    const totalTracks = Math.max(1, laneEndTimes.length);
    const widthPercent = 100 / totalTracks;

    for (let i = 0; i < cluster.length; i++) {
      const block = cluster[i];
      const trackIndex = blockTracks[i];
      result.push({
        key: `${block.startIdx}-${block.span}-${block.items[0]?.id || i}`,
        startIdx: block.startIdx,
        span: block.span,
        endIdx: block.endIdx,
        slot: block.slot,
        items: block.items,
        trackIndex,
        totalTracks,
        leftPercent: trackIndex * widthPercent,
        widthPercent,
      });
    }
  }

  return result;
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
}

function StackedScheduleCell({
  day,
  slot,
  slotIdx: _slotIdx,
  rowSpan: _rowSpan,
  schedules,
  canCreate,
  onEdit,
  onDelete,
  onView,
  onAddAtSlot,
  onOpenStackGroup,
}: StackedScheduleCellProps) {
  const isStacked = schedules.length > 1;

  const renderCard = (item: ClassScheduleItem, isCompact = false) => {
    if (!item) return null;
    const progTheme = getProgramTheme(item);
    const cardBorderColor = progTheme.primary || item.color || (item.modality === "Online" ? "#10b981" : "#2563eb");

    return (
      <div
        key={item.id}
        className={`schedule-card-draggable ${item.modality === "Online" ? "is-online" : ""}`}
        draggable={canCreate}
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ type: "move_schedule", item })
          );
        }}
        onClick={() => onView(item)}
        role="button"
        tabIndex={0}
        aria-label={`View class ${item.subjectCode} ${item.subject} scheduled ${item.day} ${item.time}`}
        style={{
          borderLeftColor: cardBorderColor,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: canCreate ? "grab" : "pointer",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0, overflow: "hidden" }}>
          {/* Institutional Matrix Subject (Room) Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap", minWidth: 0 }}>
              <span className="schedule-card-code" style={{ fontWeight: 900, fontSize: isCompact ? "0.82rem" : "0.88rem", letterSpacing: "-0.01em" }}>
                {item.subjectCode}
              </span>
              <span className="schedule-card-room" style={{ fontWeight: 800, fontSize: isCompact ? "0.76rem" : "0.82rem" }}>
                ({item.room || "TBA"})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              {canCreate && <GripVertical size={11} style={{ opacity: 0.6 }} />}
              <span
                className="program-card-badge"
                style={{
                  backgroundColor: progTheme.badgeBg,
                  color: progTheme.badgeText,
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
                title={`Program: ${progTheme.name}`}
              >
                {progTheme.code}
              </span>
              {item.classMode === "Laboratory" || String(item.roomType || "").toLowerCase().includes("lab") ? (
                <span className="pill pill--purple" style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px" }} title="Major Laboratory Session (3 Hours)">
                  Major Lab (3h)
                </span>
              ) : item.isMajor ? (
                <span className="pill pill--blue" style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px" }} title="Major Lecture Session (2 Hours)">
                  Major Lec (2h)
                </span>
              ) : (
                <span className="pill pill--amber" style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px" }} title="Minor / Gen Ed Session (1 Hour 30 Mins)">
                  Minor (1.5h)
                </span>
              )}
              {item.modality === "Online" && (
                <span
                  className="pill pill--emerald"
                  style={{ fontSize: "0.6rem", padding: "1px 4px" }}
                >
                  Online
                </span>
              )}
            </div>
          </div>
          <div
            className="schedule-card-subject"
            style={{
              fontSize: isCompact ? "0.7rem" : "0.74rem",
              marginTop: 1,
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={item.subject}
          >
            {item.subject}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
            <div className="schedule-card-meta" style={{ fontSize: "0.68rem", display: "flex", alignItems: "center", gap: 4 }}>
              <GraduationCap size={11} style={{ flexShrink: 0 }} />
              <span><strong>Sec:</strong> {item.section}</span>
              {item.isCombinedCohort && (
                <span className="pill pill--cyan" style={{ fontSize: "0.58rem", padding: "0 4px", fontWeight: 700 }} title="Shared / Combined Cohort Session">
                  Combined
                </span>
              )}
            </div>
            <div className="schedule-card-faculty" style={{ fontSize: "0.68rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <UserCheck size={11} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.faculty}</span>
            </div>
            <div className="schedule-card-meta schedule-card-time" style={{ fontSize: "0.65rem", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={10} style={{ flexShrink: 0 }} />
              <span>{item.time}</span>
            </div>
          </div>

          {item.modality === "Online" && item.onlineLink && (
            <a
              href={item.onlineLink}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.66rem",
                color: "var(--srcb-green, #10b981)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: 1,
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              <ExternalLink size={10} /> Join Class
            </a>
          )}
        </div>

        {canCreate && (
          <div className="schedule-card-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 3, paddingTop: 3 }}>
            <button
              type="button"
              className="icon-button icon-button--sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddAtSlot(day, item.time || slot);
              }}
              title={`+ Add Subject / Add another subject to slot (${day} ${item.time || slot})`}
              aria-label={`+ Add Subject / Add another subject to slot ${day} ${item.time || slot}`}
              style={{ width: 22, height: 22, padding: 0, color: "var(--srcb-royal, #2563eb)" }}
            >
              <Plus size={11} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              title="Edit Class Block"
              aria-label={`Edit class block ${item.subjectCode}`}
              style={{ width: 22, height: 22, padding: 0 }}
            >
              <Edit2 size={11} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--sm icon-button--danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              title="Delete Class Block"
              aria-label={`Delete class block ${item.subjectCode}`}
              style={{ width: 22, height: 22, padding: 0 }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!isStacked) {
    return (
      <div className="single-schedule-container" style={{ height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {renderCard(schedules[0])}
        </div>
      </div>
    );
  }

  // 2+ Schedules with exact same Day, Start Time, and End Time
  const timeStr = schedules[0]?.time || slot;
  const distinctRooms = Array.from(new Set(schedules.map((s) => s.room).filter(Boolean)));
  const hasRoomClash = distinctRooms.length < schedules.length;

  return (
    <div
      data-testid="same-time-stack-card"
      className={`same-time-stack-card ${hasRoomClash ? "has-room-clash" : ""}`}
      onClick={() => onOpenStackGroup?.({ day, slot: timeStr, schedules })}
      role="button"
      tabIndex={0}
      aria-label={`${schedules.length} classes scheduled on ${day} ${timeStr}. Click to view all.`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenStackGroup?.({ day, slot: timeStr, schedules });
        }
      }}
    >
      <div className="same-time-stack-header">
        <div className="same-time-stack-title-row">
          <span className="same-time-stack-badge">
            <Layers size={11} />
            <span>{schedules.length} CLASSES</span>
          </span>
          <span className="same-time-stack-time">
            <Clock size={10} />
            {timeStr}
          </span>
        </div>

        {hasRoomClash ? (
          <span className="same-time-conflict-pill" title="Multiple classes share the same room at this time">
            <AlertTriangle size={10} /> Room Conflict
          </span>
        ) : distinctRooms.length > 1 ? (
          <span className="same-time-rooms-pill" title={`${distinctRooms.length} rooms in use: ${distinctRooms.join(", ")}`}>
            <Building2 size={10} /> {distinctRooms.length} Rooms
          </span>
        ) : (
          <span className="same-time-rooms-pill" title={`Room ${distinctRooms[0]}`}>
            <DoorOpen size={10} /> {distinctRooms[0] || "TBA"}
          </span>
        )}
      </div>

      {/* Subject codes summary */}
      <div className="same-time-stack-subjects" title={schedules.map((s) => `${s.subjectCode} (${s.section || s.room})`).join(", ")}>
        <div className="same-time-stack-subject-pills">
          {schedules.slice(0, 4).map((item, idx) => {
            const sTheme = getProgramTheme(item);
            return (
              <span key={item.id || idx} className="same-time-subject-chip" style={{ borderLeftColor: sTheme.primary }}>
                <span className="subject-chip-code">{item.subjectCode}</span>
                {item.section && <span className="subject-chip-sec">({item.section})</span>}
              </span>
            );
          })}
          {schedules.length > 4 && (
            <span className="same-time-more-chip">+{schedules.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Footer link */}
      <div className="same-time-stack-footer">
        <span className="same-time-view-cta">
          View {schedules.length} Classes <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}

export function SchedulesPage() {
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("view") || searchParams.get("filter") || "grid") as "grid" | "list" | "unscheduled";
  const [viewMode, setViewMode] = useState<"grid" | "list" | "unscheduled">(
    initialView === "unscheduled" ? "unscheduled" : initialView === "list" ? "list" : "grid"
  );
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("search") || "");
  const [matrixProgram, setMatrixProgram] = useState<string>("All");
  const [matrixYearLevel, setMatrixYearLevel] = useState<string>("All");

  useEffect(() => {
    const v = searchParams.get("view") || searchParams.get("filter");
    if (v === "unscheduled") {
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
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ClassScheduleItem | null>(null);
  const [scheduleToAdjust, setScheduleToAdjust] = useState<ClassScheduleItem | null>(null);
  const [requestToReview, setRequestToReview] = useState<ScheduleAdjustmentRequest | null>(null);
  const [adjustmentRequests, setAdjustmentRequests] = useState<ScheduleAdjustmentRequest[]>([]);
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassScheduleItem | null>(null);
  const [activeStackGroup, setActiveStackGroup] = useState<{ day: string; slot: string; schedules: ClassScheduleItem[] } | null>(null);
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

  const canCreate = role === "super_admin" || role === "admin" || role === "program_head";

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
        const [startSlot] = slot.split("-").map((t) => t.trim());
        const calculatedEnd = calculateEndTimeFromStart(startSlot || "07:00 AM", duration);
        const finalSlotTime = startSlot && calculatedEnd ? `${startSlot} - ${calculatedEnd}` : slot;

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
        .catch(() => {});
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
    if (role === "program_head") {
      return facultyList.filter((f) => matchesProgram(f.programs || f.department));
    }
    return facultyList;
  }, [role, facultyList, selectedProgram.key, matchesProgram]);

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

  // Requirement 6 & 11: Step 2 - Available Sections for selected Subject, Day & Time
  const availableSectionsForSlot = useMemo(() => {
    const subObj = subjectsList.find((s) => s.code === form.subjectCode);

    return availableSections.filter((sec) => {
      // 1. Check curriculum match (section must match subject's program / course & year level)
      if (subObj && !isSubjectMatchingSection(subObj, sec)) {
        return false;
      }

      // 2. Exclude if section already has another class scheduled on this day at overlapping time
      if (form.day && form.time) {
        const hasClash = scheduleItems.some((s) => {
          if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
          if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
          const secLabel = sec.section ? (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : sec.section) : '';
          const sSec = s.section || '';
          const isSameSection =
            sSec.toLowerCase().trim() === sec.section.toLowerCase().trim() ||
            (secLabel && sSec.toLowerCase().trim() === secLabel.toLowerCase().trim()) ||
            sSec.toLowerCase().includes(sec.section.toLowerCase().trim());
          if (!isSameSection) return false;
          return isTimeOverlapping(s.time, form.time);
        });
        if (hasClash) return false;
      }

      return true;
    });
  }, [availableSections, subjectsList, form.subjectCode, form.day, form.time, scheduleItems, editingSchedule]);

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
    const baseList = availableSectionsForSlot.length > 0 ? availableSectionsForSlot : availableSections.length > 0 ? availableSections : sectionsList;
    return baseList.map((sec, idx) => {
      const secLabel = sec.section
        ? sec.course
          ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim()
          : sec.section
        : `Section ${idx + 1}`;
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
  }, [availableSectionsForSlot, availableSections, sectionsList]);

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

  const isStep1ResourcesAvailable = useMemo(() => {
    return Boolean(form.subjectCode && form.day && form.time);
  }, [form.subjectCode, form.day, form.time]);

  const selectedFacultyMember = useMemo(() => {
    return (
      availableFaculty.find(
        (f) => f.id === form.facultyId || (form.faculty && f.name.toLowerCase() === form.faculty.toLowerCase())
      ) || null
    );
  }, [form.facultyId, form.faculty, availableFaculty]);

  const handleContinueToStep2 = () => {
    if (!form.subjectCode) {
      toast.push("Please select an Academic Subject to continue", "error");
      return;
    }
    if (!form.day || !form.time) {
      toast.push("Please select Teaching Day and Time Slot to continue", "error");
      return;
    }

    // Adapt / validate faculty selection for the new slot
    const isCurrentFacultyOccupied = scheduleItems.some((s) => {
      if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
      if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
      const isMatch = (s.facultyId && form.facultyId && String(s.facultyId) === String(form.facultyId)) ||
        (s.faculty && form.faculty && s.faculty.toLowerCase().trim() === form.faculty.toLowerCase().trim());
      return isMatch && isTimeOverlapping(s.time, form.time);
    });

    const facCandidates = availableFacultyForSlot.length > 0 ? availableFacultyForSlot : availableFaculty.length > 0 ? availableFaculty : facultyList;
    if (isCurrentFacultyOccupied || !facCandidates.some((f) => f.id === form.facultyId || f.name === form.faculty)) {
      const firstFac = availableFacultyForSlot[0] || facCandidates[0];
      if (firstFac) {
        setForm((prev) => ({ ...prev, facultyId: firstFac.id, faculty: firstFac.name }));
      } else {
        setForm((prev) => ({ ...prev, facultyId: "", faculty: "" }));
      }
    }

    // Adapt / validate room selection for the new slot
    if (form.modality === "Face-to-Face") {
      const isCurrentRoomOccupied = scheduleItems.some((s) => {
        if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
        if (s.modality === "Online") return false;
        if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
        return s.room && form.room && s.room.toLowerCase().trim() === form.room.toLowerCase().trim() && isTimeOverlapping(s.time, form.time);
      });

      const roomCandidates = availableRoomsForSlot.length > 0 ? availableRoomsForSlot : availableRoomsForBuilding.length > 0 ? availableRoomsForBuilding : roomsList;
      if (isCurrentRoomOccupied || !roomCandidates.some((r) => r.number === form.room)) {
        const firstRoom = availableRoomsForSlot[0] || roomCandidates[0];
        if (firstRoom) {
          setForm((prev) => ({ ...prev, room: firstRoom.number, building: (firstRoom.building as BuildingType) || prev.building }));
        } else {
          setForm((prev) => ({ ...prev, room: "" }));
        }
      }
    }

    // Adapt / validate section selection for the new slot & subject
    const isCurrentSectionOccupied = scheduleItems.some((s) => {
      if (editingSchedule && String(s.id) === String(editingSchedule.id)) return false;
      if (s.day.toLowerCase() !== form.day.toLowerCase()) return false;
      const sSec = s.section || '';
      const isMatch = form.section && (
        sSec.toLowerCase().trim() === form.section.toLowerCase().trim() ||
        sSec.toLowerCase().includes(form.section.toLowerCase().trim())
      );
      return isMatch && isTimeOverlapping(s.time, form.time);
    });

    const secCandidates = availableSectionsForSlot.length > 0 ? availableSectionsForSlot : availableSections.length > 0 ? availableSections : sectionsList;
    if (isCurrentSectionOccupied || !secCandidates.some((s) => s.section === form.section || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === form.section))) {
      const firstSec = availableSectionsForSlot[0] || secCandidates[0];
      if (firstSec) {
        const secVal = firstSec.course ? `${firstSec.course} ${firstSec.yearLevel || ''}-${firstSec.section}`.trim() : firstSec.section;
        setForm((prev) => ({ ...prev, section: secVal }));
      } else {
        setForm((prev) => ({ ...prev, section: "" }));
      }
    }

    setModalStep(2);
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
    const mode: "Lecture" | "Laboratory" = isMajor ? (form.classMode || "Lecture") : "Lecture";
    const duration = getExpectedSubjectDuration(sub, mode);
    const startPart = form.time.split("-")[0]?.trim() || "07:00 AM";
    const endPart = calculateEndTimeFromStart(startPart, duration);

    let defPairedRoom = form.pairedRoom;
    if (isMajor && mode === "Lecture") {
      const labRoom = roomsList.find((r) => /lab/i.test(r.type || "") || /lab/i.test(r.number || ""));
      if (labRoom) defPairedRoom = labRoom.number;
    }

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      isMajor,
      classMode: mode,
      time: `${startPart} - ${endPart}`,
      pairedRoom: defPairedRoom || prev.pairedRoom,
      program: sub.program || prev.program,
    }));
  };

  const handleClassModeChange = (mode: "Lecture" | "Laboratory") => {
    const duration = getExpectedSubjectDuration(selectedSubjectObj, mode);
    const startPart = form.time.split("-")[0]?.trim() || "07:00 AM";
    const endPart = calculateEndTimeFromStart(startPart, duration);

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

    setForm((prev) => ({
      ...prev,
      classMode: mode,
      time: `${startPart} - ${endPart}`,
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

  const handleSave = async (addAnother = false) => {
    if (!form.subjectCode || !form.section || !form.faculty) {
      toast.push("Please select Subject, Section, and Faculty", "error");
      return;
    }

    const [sPart, ePart] = form.time.split("-").map((t) => t.trim());
    if (sPart && ePart) {
      const actMin = parseTimeToMinutes(ePart) - parseTimeToMinutes(sPart);
      const expMin = getExpectedSubjectDuration(selectedSubjectObj, form.classMode);
      if (actMin !== expMin && !isSrcbStandaloneDay(form.day)) {
        toast.push(`Invalid schedule duration: ${form.subjectCode} (${form.classMode}) requires ${expMin / 60} hour(s) (${expMin} mins).`, "error");
        return;
      }
    }

    if (!validationFeedback.valid && validationFeedback.errors.length > 0) {
      toast.push(validationFeedback.errors[0], "error");
      return;
    }

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

      const [startPart, endPart] = form.time.split("-").map((t) => t.trim());
      const payload: Omit<ClassScheduleItem, "id"> & { id?: string; start_time?: string; end_time?: string } = {
        id: editingSchedule?.id,
        day: form.day,
        time: form.time,
        start_time: startPart,
        end_time: endPart,
        subjectCode: form.subjectCode,
        subject: form.subject,
        section: form.section,
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

        // Automatic Paired-Day Schedule Creation (e.g., Monday Lecture 2h -> Thursday Lab 3h)
        let pairedSaved = false;
        let pairedErrorMsg: string | null = null;

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
          };
          try {
            await api.post("/schedules", pairedPayload);
            pairedSaved = true;
          } catch (dupErr: any) {
            console.warn(`Could not automatically create paired schedule on ${pairedDay}:`, dupErr);
            pairedErrorMsg = dupErr?.response?.data?.error || dupErr?.message || "Slot conflict";
          }
        }

        if (pairedSaved && pairedDay) {
          const detailMsg = form.isMajor
            ? `${form.day} (${form.classMode === "Laboratory" ? "Lab 3h" : "Lecture 2h"}: ${form.time}) & ${pairedDay} (${pairedClassMode === "Laboratory" ? "Lab 3h" : "Lecture 2h"}: ${pairedTime})`
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
        await fetchSchedules();

        const curDay = form.day;
        const curTime = form.time;
        const updatedList = [...scheduleItems, payload as any];
        const nextFreeRoom = findAvailableRoomForSlot(curDay, curTime, roomsList, updatedList);
        const nextDefRoom = nextFreeRoom?.number || roomsList[0]?.number || "COL-101";
        const nextDefBuilding = (nextFreeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

        setForm((prev) => ({
          ...prev,
          day: curDay,
          time: curTime,
          subjectCode: "",
          subject: "",
          room: nextDefRoom,
          building: nextDefBuilding,
          section: "",
          facultyId: "",
          faculty: "",
        }));
        setModalStep(1);
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
      const dayItems = visibleSchedules.filter((item) => item.day.toLowerCase() === day.toLowerCase());
      map.set(day.toLowerCase(), buildDayTimelineBlocks(dayItems));
    }
    return map;
  }, [visibleSchedules]);

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
      const sLabel = s.course ? `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() : s.section;
      return !scheduleItems.some((sc) => sc.day.toLowerCase() === day.toLowerCase() && isTimeOverlapping(sc.time, timeSlot) && (sc.section === sLabel || sc.section === s.section));
    }) || sectionsList[0];
    const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";

    const isFirstMajor = Boolean(firstSub?.isMajor) && !isGeneralSubject(firstSub);
    const defMode: "Lecture" | "Laboratory" = isFirstMajor && Number(firstSub?.labHours || 0) > 0 ? "Laboratory" : "Lecture";
    const duration = getExpectedSubjectDuration(firstSub, defMode);
    const [startSlot] = timeSlot.split("-").map((t) => t.trim());
    const calculatedEnd = calculateEndTimeFromStart(startSlot || "07:00 AM", duration);
    const finalSlotTime = startSlot && calculatedEnd ? `${startSlot} - ${calculatedEnd}` : timeSlot;

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
          role === "teacher"
            ? "Faculty Timetable & Class Schedules"
            : role === "program_head"
              ? "Academic Program Class Schedules"
              : "Institutional Class Schedules"
        }
        description={
          role === "teacher"
            ? "View your assigned classes alongside all departmental and institutional teaching schedules."
            : "Manually schedule, monitor, and adjust classes with real-time faculty availability and room clash prevention."
        }
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Schedules</strong>
          </>
        }
        helpText={
          role === "teacher"
            ? "Browse your schedule or view other instructors' timetables to coordinate class times and room availability."
            : "Supports College, SHS, and JHS room assignments, paired lecture/laboratory scheduling, and instructor conflict prevention."
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
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Class Timetable</p>
            <h3>
              {viewMode === "unscheduled"
                ? `Unscheduled Curriculum Subjects (${filteredUnscheduled.length})`
                : `Scheduled Classes (${visibleSchedules.length})`}
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* View Mode Switcher */}
            <div style={{ display: "flex", background: "var(--srcb-surface-alt, #e2e8f0)", borderRadius: 8, padding: 2, border: "1px solid var(--srcb-border)" }}>
              <Tooltip content="Weekly Timetable Grid">
                <button
                  type="button"
                  aria-label="Weekly Timetable Grid View"
                  onClick={() => {
                    setViewMode("grid");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete("view");
                      next.delete("filter");
                      return next;
                    });
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "grid" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "grid" ? "var(--srcb-navy, #0d5499)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "grid" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                  }}
                >
                  <CalendarDays size={14} style={{ display: "inline", marginRight: 4 }} />
                  Weekly Grid
                </button>
              </Tooltip>

              <Tooltip content="List View of Class Sessions">
                <button
                  type="button"
                  aria-label="List View of Class Sessions"
                  onClick={() => {
                    setViewMode("list");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("view", "list");
                      return next;
                    });
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "list" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "list" ? "var(--srcb-navy, #0d5499)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "list" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                  }}
                >
                  <ListFilter size={14} style={{ display: "inline", marginRight: 4 }} />
                  List View
                </button>
              </Tooltip>

              <Tooltip content="Unscheduled Curriculum Subjects">
                <button
                  type="button"
                  aria-label="Unscheduled Curriculum Subjects"
                  onClick={() => {
                    setViewMode("unscheduled");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("view", "unscheduled");
                      return next;
                    });
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "unscheduled" ? "var(--srcb-surface-elevated, #ffffff)" : "transparent",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: viewMode === "unscheduled" ? "var(--srcb-gold, #d97706)" : "var(--srcb-text-muted, #64748b)",
                    boxShadow: viewMode === "unscheduled" ? "var(--srcb-shadow-soft, 0 1px 3px rgba(0,0,0,0.1))" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CalendarRange size={14} />
                  <span>Unscheduled</span>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 10,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: viewMode === "unscheduled" ? "var(--srcb-gold-soft, #fef3c7)" : "var(--srcb-surface-alt, rgba(148, 163, 184, 0.3))",
                      color: viewMode === "unscheduled" ? "var(--srcb-gold, #92400e)" : "var(--srcb-text-muted, #475569)",
                    }}
                  >
                    {unscheduledSubjects.length}
                  </span>
                </button>
              </Tooltip>

            </div>

            {/* Multi-Perspective Matrix View Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--srcb-surface-alt, #f8fafc)", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--srcb-border)", flexWrap: "wrap" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                Perspective:
              </label>
              <select
                value={perspectiveMode}
                onChange={(e) => {
                  setPerspectiveMode(e.target.value as any);
                  setSelectedPerspectiveEntity("All");
                }}
                style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.84rem", fontWeight: 600 }}
              >
                <option value="all">All Timetables</option>
                <option value="program">By Academic Program (SRCB Matrix)</option>
                <option value="section">By Section / Block</option>
                <option value="faculty">By Faculty Member</option>
                <option value="room">By Room / Facility</option>
              </select>

              {perspectiveMode === "program" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <select
                    value={matrixProgram}
                    onChange={(e) => setMatrixProgram(e.target.value)}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.84rem", fontWeight: 600 }}
                  >
                    <option value="All">All Academic Programs</option>
                    <option value="CJEP">Criminal Justice (BSCRIM / CJEP)</option>
                    <option value="TEP">Teacher Education (TEP / BSED / BEED)</option>
                    <option value="BSHM">Hospitality Management (BSHM)</option>
                    <option value="BSBA">Business Administration (BSBA)</option>
                    <option value="BSIT">Information Technology (BSIT / ITP)</option>
                  </select>

                  <select
                    value={matrixYearLevel}
                    onChange={(e) => setMatrixYearLevel(e.target.value)}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.84rem", fontWeight: 600 }}
                  >
                    <option value="All">All Year Levels</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              )}

              {perspectiveMode === "section" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.84rem", maxWidth: 170 }}
                >
                  <option value="All">All Sections</option>
                  {availableSections.map((sec) => {
                    const label = sec.section || (sec.course ? `${sec.course} ${sec.yearLevel || ''}-${sec.section}`.trim() : `Section ${sec.id}`);
                    return <option key={sec.id || label} value={label}>{label}</option>;
                  })}
                </select>
              )}

              {perspectiveMode === "faculty" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.84rem", maxWidth: 170 }}
                >
                  <option value="All">All Instructors</option>
                  {availableFaculty.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} ({f.status})</option>
                  ))}
                </select>
              )}

              {perspectiveMode === "room" && (
                <select
                  value={selectedPerspectiveEntity}
                  onChange={(e) => setSelectedPerspectiveEntity(e.target.value)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontSize: "0.84rem", maxWidth: 170 }}
                >
                  <option value="All">All Rooms & Labs</option>
                  {roomsList.map((r) => (
                    <option key={r.number} value={r.number}>{r.number} - {r.building}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Day Filter */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Day:
              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)" }}
              >
                <option value="All">All Days (Mon-Sat)</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            {/* Faculty / Teacher / Program Head Filter */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Instructor:
              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", maxWidth: 190 }}
              >
                <option value="All">All Faculty Members</option>
                {(role === "teacher" || role === "program_head") && currentUserName && (
                  <option value={currentTeacherId || currentUserName}>
                    {role === "program_head" ? `My Classes (${currentUserName})` : `My Schedule (${currentUserName})`}
                  </option>
                )}
                {availableFaculty.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name} ({f.department || "Faculty"})
                  </option>
                ))}
              </select>
            </label>

            {/* Academic Duration & Bell Shift Filter */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Class Duration:
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--srcb-border)", background: "var(--srcb-surface)", color: "var(--srcb-text)", fontWeight: 500 }}
                aria-label="Filter by class duration"
              >
                <option value="All">All Class Durations</option>
                <option value="Minor">1.5h Minor (1hr 30m)</option>
                <option value="MajorLec">2h Major Lecture</option>
                <option value="MajorLab">3h Major Lab</option>
                <option value="7am">7:00 AM Starts</option>
                <option value="730am">7:30 AM Starts</option>
              </select>
            </label>

            {/* Search Input */}
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <label className="topbar__search" aria-label="Search schedules" style={{ margin: 0, paddingRight: query ? 32 : 12 }}>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search subject, faculty, room, section..."
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
                  {/* Admin Pending Adjustment Requests Banner */}
                  {(role === "admin" || role === "dsa") && adjustmentRequests.filter((r) => r.status === "Pending").length > 0 && (
                    <div
                      role="region"
                      aria-label="Pending Schedule Adjustment Requests"
                      style={{
                        marginBottom: 12,
                        padding: "10px 14px",
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderLeft: "4px solid #f59e0b",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#b45309" }}>
                        <ArrowRightLeft size={16} />
                        <span>
                          <strong>{adjustmentRequests.filter((r) => r.status === "Pending").length} Schedule Adjustment Request(s)</strong> pending review from Program Heads.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => {
                          const firstPending = adjustmentRequests.find((r) => r.status === "Pending");
                          if (firstPending) setRequestToReview(firstPending);
                        }}
                        style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                      >
                        Review Requests
                      </button>
                    </div>
                  )}

                  {/* Institutional Timetable Matrix Banner */}
                  <div className="timetable-matrix-institutional-banner">
                    <div>
                      <h3 className="timetable-matrix-banner-title">
                        {perspectiveMode === "program" && matrixProgram !== "All"
                          ? `${matrixProgram === "CJEP" ? "CRIMINAL JUSTICE EDUCATION PROGRAM" : matrixProgram === "TEP" ? "TEACHER EDUCATION PROGRAM" : matrixProgram === "BSHM" ? "HOSPITALITY MANAGEMENT PROGRAM" : matrixProgram === "BSBA" ? "BUSINESS ADMINISTRATION PROGRAM" : "INFORMATION TECHNOLOGY PROGRAM"} CLASS SCHEDULE ${matrixYearLevel !== "All" ? `FOR ${matrixYearLevel === "1" ? "1ST" : matrixYearLevel === "2" ? "2ND" : matrixYearLevel === "3" ? "3RD" : "4TH"} YEAR` : ""}`
                          : perspectiveMode === "section" && selectedPerspectiveEntity !== "All"
                          ? `CLASS SCHEDULE FOR SECTION ${selectedPerspectiveEntity.toUpperCase()}`
                          : perspectiveMode === "faculty" && selectedPerspectiveEntity !== "All"
                          ? `FACULTY TEACHING TIMETABLE • ${selectedPerspectiveEntity.toUpperCase()}`
                          : perspectiveMode === "room" && selectedPerspectiveEntity !== "All"
                          ? `ROOM UTILIZATION TIMETABLE • ${selectedPerspectiveEntity.toUpperCase()}`
                          : "OFFICIAL INSTITUTIONAL CLASS TIMETABLE"}
                        <span className="timetable-matrix-banner-semester">
                          (1st Semester SY 2026-2027)
                        </span>
                      </h3>
                      <div className="timetable-matrix-banner-sub">
                        St. Rita's College of Balingasag • Multi-Track Matrix Timetable (Monday – Saturday, 7:00 AM – 9:00 PM)
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {/* Institutional Class Durations Guidelines */}
                      <div
                        role="region"
                        aria-label="Institutional Class Duration Guidelines"
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.74rem", fontWeight: 600, flexWrap: "wrap" }}
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
                        style={{ padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.82rem" }}
                        title="Print Timetable Matrix"
                      >
                        <Printer size={14} />
                        <span>Print Timetable</span>
                      </button>
                    </div>
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
                                          <span style={{ fontSize: "0.72rem", opacity: 0.65 }}>+ Add Class</span>
                                        ) : (
                                          <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>—</span>
                                        )}
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
                                      onOpenStackGroup={(group) => setActiveStackGroup(group)}
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {visibleSchedules.map((item) => {
                      const itemTheme = getProgramTheme(item);
                      return (
                        <div
                          key={item.id}
                          style={{
                            background: item.modality === "Online" ? "rgba(52, 211, 153, 0.12)" : "var(--srcb-surface-elevated, #ffffff)",
                            border: "1px solid var(--srcb-border)",
                            borderLeft: `5px solid ${itemTheme.primary}`,
                            borderRadius: 10,
                            padding: "14px 16px",
                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.05)",
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
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--srcb-border)" }}>
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
          </>
        )}
      </section>

      {/* ===================================================
          TWO-STEP MANUAL CLASS SCHEDULE MODAL
          =================================================== */}
      <Modal
        isOpen={isOpen && canCreate}
        size="xl"
        icon={<Calendar size={20} />}
        eyebrow="Class Timetable"
        title={
          modalStep === 1
            ? (editingSchedule ? "Edit Class Schedule - Step 1: Basic Information" : "Create Class Schedule - Step 1: Basic Information")
            : (editingSchedule ? "Edit Class Schedule - Step 2: Resource Assignment" : "Create Class Schedule - Step 2: Resource Assignment")
        }
        description={
          modalStep === 1
            ? "Define the academic subject, teaching day, and time slot."
            : "Assign an available instructor, room, and student section for this schedule slot."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingSchedule(null);
          setModalStep(1);
        }}
      >
        {/* Modern Stepper Header */}
        <div className="sched-wizard-stepper">
          <button
            type="button"
            className={`sched-step-btn ${modalStep === 1 ? "is-active" : "is-completed"}`}
            onClick={() => setModalStep(1)}
          >
            <div className="sched-step-circle">
              {modalStep > 1 ? <Check size={16} /> : <span>1</span>}
            </div>
            <div className="sched-step-info">
              <span className="sched-step-label">Step 1</span>
              <span className="sched-step-title">Basic Information</span>
            </div>
          </button>

          <div className={`sched-step-divider ${modalStep === 2 ? "is-active" : ""}`} />

          <button
            type="button"
            className={`sched-step-btn ${modalStep === 2 ? "is-active" : ""}`}
            onClick={() => {
              if (isStep1ResourcesAvailable) {
                handleContinueToStep2();
              }
            }}
            disabled={modalStep === 1 && !isStep1ResourcesAvailable}
            title={!isStep1ResourcesAvailable ? "Please select Subject, Day, and Time first" : "Jump to Step 2"}
          >
            <div className="sched-step-circle">
              <span>2</span>
            </div>
            <div className="sched-step-info">
              <span className="sched-step-label">Step 2</span>
              <span className="sched-step-title">Resource Assignment</span>
            </div>
          </button>
        </div>

        {/* STEP 1: Basic Schedule Information (WHAT & WHEN) */}
        {modalStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="sched-modal-side-by-side">
              {/* LEFT COLUMN: Subject & Component (Consolidated Card) */}
              <div className="sched-form-card" style={{ padding: "14px 16px", gap: 10 }}>
                <div className="sched-form-card-header" style={{ paddingBottom: 8 }}>
                  <div className="sched-form-card-title-wrap">
                    <div className="sched-form-card-icon">
                      <BookOpen size={16} />
                    </div>
                    <span className="sched-form-card-title">Curriculum Subject &amp; Component</span>
                  </div>
                  <span
                    className="sched-form-card-badge"
                    style={{
                      background: form.isMajor ? "rgba(37, 99, 235, 0.1)" : "rgba(245, 158, 11, 0.1)",
                      color: form.isMajor ? "var(--srcb-royal)" : "#b45309",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {selectedSubjectObj ? `${selectedSubjectObj.units} Units · ` : ""}
                    {form.isMajor
                      ? pairedDay && pairedEnabled && !editingSchedule
                        ? `Major: ${form.classMode === "Lecture" ? "Lec (2h) + Lab (3h)" : "Lab (3h) + Lec (2h)"}`
                        : form.classMode === "Laboratory"
                          ? "Major Lab (3h)"
                          : "Major Lecture (2h)"
                      : "Gen Ed / Minor (1.5h)"}
                  </span>
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedSubject" className="modal-field-label">
                    <BookOpen size={13} />
                    <span>Academic Subject</span>
                    <span className="required-asterisk">*</span>
                  </label>
                  <SearchableSelect
                    id="schedSubject"
                    value={form.subjectCode}
                    onChange={(val) => handleSubjectChange(val)}
                    options={subjectOptionsForStep1}
                    placeholder="Search & select curriculum subject..."
                    searchPlaceholder="Search by subject code, title, program..."
                    emptyText="No matching academic subjects found"
                  />
                </div>

                {selectedSubjectObj && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "rgba(2, 132, 199, 0.06)",
                      border: "1px solid rgba(2, 132, 199, 0.15)",
                      fontSize: "0.74rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>{selectedSubjectObj.code}</span>
                    <span style={{ color: "var(--srcb-text-muted)" }}>•</span>
                    <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedSubjectObj.name}
                    </span>
                    <span className={`pill ${selectedSubjectObj.isMajor ? "pill--blue" : "pill--amber"}`} style={{ fontSize: "0.66rem", padding: "1px 5px" }}>
                      {selectedSubjectObj.isMajor ? "Major" : "Gen Ed (Universal)"}
                    </span>
                  </div>
                )}

                {/* Session Component */}
                <div style={{ marginTop: 2 }}>
                  <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--srcb-navy)", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <Clock size={12} />
                    <span>Academic Component Allocation</span>
                  </label>
                  {form.isMajor ? (
                    <>
                      <div className="sched-segmented-control">
                        <button
                          type="button"
                          className={`sched-segmented-btn ${form.classMode === "Lecture" ? "is-selected" : ""}`}
                          onClick={() => handleClassModeChange("Lecture")}
                          style={{ padding: "6px 12px" }}
                        >
                          <BookOpen size={13} />
                          <span>{form.day}: Lecture (2h)</span>
                        </button>
                        <button
                          type="button"
                          className={`sched-segmented-btn ${form.classMode === "Laboratory" ? "is-selected" : ""}`}
                          onClick={() => handleClassModeChange("Laboratory")}
                          style={{ padding: "6px 12px" }}
                        >
                          <Monitor size={13} />
                          <span>{form.day}: Lab (3h)</span>
                        </button>
                      </div>

                      {/* Paired Day Auto-Complement Banner */}
                      {pairedDay && pairedEnabled && !editingSchedule && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: "6px 10px",
                            background: "rgba(37, 99, 235, 0.06)",
                            border: "1px solid rgba(37, 99, 235, 0.18)",
                            borderRadius: 6,
                            fontSize: "0.74rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Sparkles size={13} color="var(--srcb-royal)" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>Paired Day:</strong> {pairedDay} auto-assigned as{" "}
                              <strong style={{ color: pairedClassMode === "Laboratory" ? "#7c3aed" : "#2563eb" }}>
                                {pairedClassMode} ({pairedClassMode === "Laboratory" ? "3 hrs" : "2 hrs"})
                              </strong>
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: pairedClassMode === "Laboratory" ? "rgba(124, 58, 237, 0.12)" : "rgba(37, 99, 235, 0.12)",
                              color: pairedClassMode === "Laboratory" ? "#7c3aed" : "#2563eb",
                              padding: "1px 6px",
                              borderRadius: 4,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {pairedTime}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                        fontSize: "0.76rem",
                        color: "#92400e",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 34,
                      }}
                    >
                      <Clock size={14} color="#d97706" />
                      <span>Gen Ed / Minor (1.5h standard session)</span>
                    </div>
                  )}
                </div>

                {/* Preferred Campus Building */}
                <div className="field-group" style={{ margin: 0, marginTop: 4 }}>
                  <label htmlFor="schedBuilding" className="modal-field-label" style={{ fontSize: "0.74rem" }}>
                    <Building2 size={13} />
                    <span>Campus Building</span>
                  </label>
                  <select
                    id="schedBuilding"
                    value={form.building}
                    onChange={(e) => handleBuildingChange(e.target.value as BuildingType)}
                    style={{ fontSize: "0.82rem", padding: "6px 10px" }}
                  >
                    {buildingOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RIGHT COLUMN: WHEN & READINESS (Day + Paired Day + Time + Availability) */}
              <div className="sched-form-card" style={{ padding: "14px 16px", gap: 10 }}>
                <div className="sched-form-card-header" style={{ paddingBottom: 8 }}>
                  <div className="sched-form-card-title-wrap">
                    <div className="sched-form-card-icon">
                      <CalendarDays size={16} />
                    </div>
                    <span className="sched-form-card-title">Schedule Timing &amp; Duration</span>
                  </div>
                  {form.time && getTimeDurationStr(form.time) && (
                    <span className="sched-duration-tag">
                      <Clock size={12} />
                      {getTimeDurationStr(form.time)}
                    </span>
                  )}
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label htmlFor="schedDay" className="modal-field-label" style={{ margin: 0 }}>
                      <Calendar size={13} />
                      <span>Teaching Day</span>
                      <span className="required-asterisk">*</span>
                    </label>
                    {!editingSchedule && pairedDay && (
                      <label
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "var(--srcb-primary, #1e40af)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "rgba(59, 130, 246, 0.08)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={pairedEnabled}
                          onChange={(e) => setPairedEnabled(e.target.checked)}
                          style={{ cursor: "pointer", margin: 0 }}
                        />
                        <Sparkles size={11} /> Auto-pairs with {pairedDay}
                      </label>
                    )}
                  </div>
                  <select
                    id="schedDay"
                    value={form.day}
                    onChange={(e) => {
                      const newDay = e.target.value;
                      const hasPair = Boolean(getPairedDay(newDay));
                      setForm({ ...form, day: newDay });
                      if (!editingSchedule) {
                        setPairedEnabled(hasPair);
                      }
                    }}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label htmlFor="schedStartTime" className="modal-field-label" style={{ margin: 0 }}>
                      <Clock size={13} />
                      <span>Time Window</span>
                      <span className="required-asterisk">*</span>
                    </label>
                    {getTimeDurationStr(form.time) && (
                      <span className="sched-duration-chip" title="Total allocated class duration">
                        <Clock size={11} /> {getTimeDurationStr(form.time)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
                    <div>
                      <label htmlFor="schedStartTime" style={{ fontSize: "0.7rem", color: "var(--srcb-text-muted)", display: "block", marginBottom: 2, fontWeight: 600 }}>
                        Start Time
                      </label>
                      <select
                        id="schedStartTime"
                        value={form.time.split("-")[0]?.trim() || "07:00 AM"}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const duration = getExpectedSubjectDuration(selectedSubjectObj, form.classMode);
                          const newEnd = calculateEndTimeFromStart(newStart, duration);
                          setForm({ ...form, time: `${newStart} - ${newEnd}` });
                        }}
                      >
                        {TIME_POINTS.slice(0, -1).map((tp) => (
                          <option key={tp} value={tp}>
                            {tp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 16, color: "var(--srcb-text-muted)" }}>
                      <ArrowRight size={14} />
                    </div>

                    <div>
                      <label htmlFor="schedEndTime" style={{ fontSize: "0.7rem", color: "var(--srcb-text-muted)", display: "block", marginBottom: 2, fontWeight: 600 }}>
                        End Time (Auto-calculated)
                      </label>
                      <select
                        id="schedEndTime"
                        value={form.time.split("-")[1]?.trim() || "08:30 AM"}
                        disabled
                        style={{ background: "var(--srcb-surface-alt)", cursor: "not-allowed", opacity: 0.95 }}
                        title="End time is automatically calculated from the required subject component duration."
                      >
                        <option value={form.time.split("-")[1]?.trim() || "08:30 AM"}>
                          {form.time.split("-")[1]?.trim() || "08:30 AM"} ({getTimeDurationStr(form.time) || "Auto"})
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* SRCB Official Standard Time Slots Quick-Select */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--srcb-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--srcb-navy)", display: "flex", alignItems: "center", gap: 5 }}>
                        <Sparkles size={12} color="var(--srcb-royal)" />
                        <span>SRCB Standard Period Presets ({form.day === "Wednesday" ? "Wednesday 3h Blocks" : form.day === "Saturday" ? "Saturday Blocks" : "M-Th & T-F 1.5h Periods"})</span>
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {SRCB_STANDARD_TIME_SLOTS
                        .filter((preset) => {
                          if (form.day === "Wednesday") return preset.category === "wednesday" || preset.category === "laboratory";
                          if (form.day === "Saturday") return preset.category === "saturday";
                          return preset.category === "m-th-tf" || (form.classMode === "Laboratory" && preset.category === "laboratory");
                        })
                        .map((preset) => {
                          const isSelected = form.time.trim() === preset.label.trim();
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, time: preset.label });
                              }}
                              style={{
                                padding: "3px 8px",
                                borderRadius: 5,
                                border: isSelected ? "1px solid var(--srcb-royal, #2563eb)" : "1px solid var(--srcb-border, #cbd5e1)",
                                background: isSelected ? "rgba(37, 99, 235, 0.12)" : "var(--srcb-surface-alt, #f8fafc)",
                                color: isSelected ? "var(--srcb-royal, #2563eb)" : "var(--srcb-text, #1e293b)",
                                fontSize: "0.72rem",
                                fontWeight: isSelected ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              title={preset.description}
                            >
                              {preset.startTime.replace(/ (AM|PM)/i, "")} - {preset.endTime}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Compact Availability Assessment */}
                {form.subjectCode && form.day && form.time && (
                  <div className="sched-compact-readiness-row" style={{ padding: "6px 8px" }}>
                    <span style={{ fontWeight: 700, color: "var(--srcb-navy)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Sparkles size={12} color="var(--srcb-royal)" /> Pre-check:
                    </span>
                    <span className={`sched-compact-chip ${availableFacultyForSlot.length > 0 ? "is-good" : "is-warning"}`}>
                      {availableFacultyForSlot.length > 0 ? `✓ ${availableFacultyForSlot.length} Faculty Free` : "⚠ No Faculty Free"}
                    </span>
                    <span className={`sched-compact-chip ${availableRoomsForSlot.length > 0 ? "is-good" : "is-warning"}`}>
                      {availableRoomsForSlot.length > 0 ? `✓ ${availableRoomsForSlot.length} Rooms Free` : "⚠ No Rooms Free"}
                    </span>
                    <span className={`sched-compact-chip ${availableSectionsForSlot.length > 0 ? "is-good" : "is-warning"}`}>
                      {availableSectionsForSlot.length > 0 ? `✓ ${availableSectionsForSlot.length} Sections Free` : "⚠ Check Section"}
                    </span>
                  </div>
                )}

                {/* Concurrent Time Slot Information Banner */}
                {form.day && form.time && concurrentSlotSchedules.length > 0 && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(37, 99, 235, 0.08)",
                      border: "1px solid rgba(37, 99, 235, 0.25)",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                      color: "var(--srcb-royal, #2563eb)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                      <Layers size={14} />
                      <span>Concurrent Time Slot: {concurrentSlotSchedules.length} other subject{concurrentSlotSchedules.length > 1 ? "s" : ""} scheduled at this time</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      {concurrentSlotSchedules.map((cs) => (
                        <span
                          key={cs.id}
                          style={{
                            padding: "2px 8px",
                            background: "var(--srcb-surface, #fff)",
                            border: "1px solid var(--srcb-border, #cbd5e1)",
                            borderRadius: 4,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "var(--srcb-text, #1e293b)",
                          }}
                        >
                          {cs.subjectCode} ({cs.section} • {cs.room || "Online"} • {cs.faculty})
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted, #64748b)" }}>
                      Multiple different subjects can run concurrently at this time across distinct rooms and sections.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="modal-actions" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsOpen(false);
                  setEditingSchedule(null);
                  setModalStep(1);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button"
                disabled={!isStep1ResourcesAvailable}
                style={{
                  opacity: !isStep1ResourcesAvailable ? 0.5 : 1,
                  cursor: !isStep1ResourcesAvailable ? "not-allowed" : "pointer",
                }}
                onClick={handleContinueToStep2}
                title="Proceed to assign Faculty, Room, and Section"
              >
                <span>Continue to Resource Assignment</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Resource Assignment ONLY (WHO, WHERE, FOR WHOM) */}
        {modalStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Step 1 Context Summary Bar */}
            <div className="sched-context-banner" style={{ padding: "6px 12px" }}>
              <div className="sched-context-tags">
                <div className="sched-context-item">
                  <BookOpen size={13} color="var(--srcb-royal)" />
                  <strong>Subject:</strong> <span>{form.subjectCode} — {form.subject}</span>
                </div>
                <div className="sched-context-item">
                  <Calendar size={13} color="var(--srcb-royal)" />
                  <strong>Schedule:</strong>{" "}
                  <span>
                    {!editingSchedule && pairedDay && pairedEnabled
                      ? `${form.day} (${form.classMode === "Laboratory" ? "Lab 3h" : "Lec 2h"}: ${form.time}) & ${pairedDay} (${pairedClassMode === "Laboratory" ? "Lab 3h" : "Lec 2h"}: ${pairedTime})`
                      : `${form.day} • ${form.time}`}
                  </span>
                </div>
                <div className="sched-context-item">
                  <Building2 size={13} color="var(--srcb-royal)" />
                  <strong>Building:</strong> <span>{form.building || "All Buildings"}</span>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalStep(1)}
                style={{ padding: "3px 8px", fontSize: "0.74rem" }}
              >
                <Edit2 size={12} />
                <span>Edit Slot</span>
              </button>
            </div>

            <div className="sched-modal-side-by-side">
              {/* LEFT COLUMN: Section & Faculty */}
              <div className="sched-form-card" style={{ padding: "14px 16px", gap: 10 }}>
                <div className="sched-form-card-header" style={{ paddingBottom: 8 }}>
                  <div className="sched-form-card-title-wrap">
                    <div className="sched-form-card-icon">
                      <Users size={16} />
                    </div>
                    <span className="sched-form-card-title">Student Cohort &amp; Instructor</span>
                  </div>
                  {form.section && (
                    <span className="sched-form-card-badge" style={{ color: "var(--srcb-royal)" }}>
                      Enrolled: {selectedSectionHeadcount} Students
                    </span>
                  )}
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedSection" className="modal-field-label">
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

                {/* Combined / Cross-Program Cohort Toggle */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: form.isCombinedCohort ? "rgba(37, 99, 235, 0.08)" : "var(--srcb-surface-alt, #f8fafc)",
                    border: form.isCombinedCohort ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid var(--srcb-border)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    cursor: "pointer",
                  }}
                  onClick={() => setForm({ ...form, isCombinedCohort: !form.isCombinedCohort })}
                >
                  <input
                    type="checkbox"
                    checked={form.isCombinedCohort}
                    onChange={(e) => setForm({ ...form, isCombinedCohort: e.target.checked })}
                    style={{ marginTop: 2, cursor: "pointer" }}
                  />
                  <div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: form.isCombinedCohort ? "var(--srcb-royal)" : "var(--srcb-text)", display: "block" }}>
                      Combined / Cross-Program Shared Cohort
                    </span>
                    <span style={{ fontSize: "0.71rem", color: "var(--srcb-text-muted)", display: "block", marginTop: 2 }}>
                      Allows this section to share this room &amp; instructor with another section taking the same course (e.g. Crim 1 / IT 1, HM-1 / CJEP).
                    </span>
                  </div>
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedFaculty" className="modal-field-label">
                    <UserCheck size={13} />
                    <span>Instructor / Faculty</span>
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
                </div>

                {/* Part-Time Instructor Availability Window */}
                {selectedFacultyMember && selectedFacultyMember.status === "Part-Time" && (
                  <div
                    style={{
                      padding: "6px 10px",
                      background: "var(--srcb-surface)",
                      borderRadius: 6,
                      border: "1px solid var(--srcb-border)",
                      borderLeft: "3px solid #f59e0b",
                      fontSize: "0.74rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>
                      <Clock size={12} />
                      <span>Part-Time Availability Windows:</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {formatGroupedAvailability(selectedFacultyMember.availability).map(({ day, formattedRange }) => {
                        const isMatchingDay =
                          day.toLowerCase() === form.day.toLowerCase() ||
                          (!editingSchedule && day.toLowerCase() === (getPairedDay(form.day) || "").toLowerCase());
                        return (
                          <span
                            key={day}
                            style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: isMatchingDay ? "rgba(245, 158, 11, 0.15)" : "rgba(148, 163, 184, 0.08)",
                              border: `1px solid ${isMatchingDay ? "rgba(245, 158, 11, 0.4)" : "var(--srcb-border)"}`,
                              fontSize: "0.72rem",
                            }}
                          >
                            <strong>{day}:</strong> {formattedRange}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Room & Validation */}
              <div className="sched-form-card" style={{ padding: "14px 16px", gap: 10 }}>
                <div className="sched-form-card-header" style={{ paddingBottom: 8 }}>
                  <div className="sched-form-card-title-wrap">
                    <div className="sched-form-card-icon">
                      <DoorOpen size={16} />
                    </div>
                    <span className="sched-form-card-title">Classroom &amp; Conflict Verification</span>
                  </div>
                  {selectedRoomObj && (
                    <span className="sched-form-card-badge">
                      Cap: {selectedRoomObj.capacity} seats · {selectedRoomObj.type || "Classroom"}
                    </span>
                  )}
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                  <label htmlFor="schedRoom" className="modal-field-label">
                    <DoorOpen size={13} />
                    <span>
                      {!editingSchedule && pairedDay && pairedEnabled
                        ? `Classroom for ${form.day} (${form.classMode === "Laboratory" ? "Lab - 3h" : "Lecture - 2h"})`
                        : "Classroom / Laboratory"}
                    </span>
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
                  {concurrentSlotSchedules.length > 0 && (
                    <div className="sched-concurrent-alert" style={{ marginTop: 6, padding: "6px 10px", fontSize: "0.74rem" }}>
                      <Sparkles size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <strong>Concurrent Slot:</strong> {concurrentSlotSchedules.length} class(es) running in other rooms ({concurrentSlotSchedules.map((cs) => cs.room).join(", ")}).
                        {form.room && !concurrentSlotSchedules.some((cs) => cs.room.toLowerCase() === form.room.toLowerCase()) && (
                          <span style={{ color: "#166534", fontWeight: 700, marginLeft: 4 }}>
                            ✓ Room {form.room} is clear.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {isRoomTooSmall && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 6,
                        color: "#dc2626",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                      <span>
                        ⚠ Room capacity ({selectedRoomObj?.capacity}) is less than section size ({selectedSectionHeadcount}).
                      </span>
                    </div>
                  )}
                </div>

                {/* Paired Day Room Selection */}
                {!editingSchedule && pairedDay && pairedEnabled && (
                  <div className="field-group" style={{ margin: 0, marginTop: 4 }}>
                    <label htmlFor="schedPairedRoom" className="modal-field-label">
                      <DoorOpen size={13} />
                      <span>
                        Classroom for {pairedDay} ({pairedClassMode === "Laboratory" ? "Lab - 3h" : "Lecture - 2h"})
                      </span>
                      <span className="required-asterisk">*</span>
                    </label>
                    <SearchableSelect
                      id="schedPairedRoom"
                      value={form.pairedRoom || form.room}
                      onChange={(val) => setForm((prev) => ({ ...prev, pairedRoom: val }))}
                      options={pairedRoomOptionsForStep2}
                      placeholder={`Search & select room for ${pairedDay}...`}
                      searchPlaceholder="Search rooms..."
                      emptyText="No matching rooms found"
                    />
                  </div>
                )}

                {/* Validation & Conflict Diagnostics */}
                {validationFeedback.errors.length > 0 ? (
                  <div
                    style={{
                      padding: 8,
                      background: "rgba(239, 68, 68, 0.08)",
                      borderRadius: 6,
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderLeft: "3px solid #dc2626",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={14} />
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
                      gap: 8,
                      padding: "8px 12px",
                      background: "rgba(16, 185, 129, 0.08)",
                      borderRadius: 6,
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      fontSize: "0.78rem",
                      color: "#059669",
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>All resources verified: Instructor, Room, and Section are clear.</span>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "var(--srcb-text-muted)" }}>
                    Select an available Section, Instructor, and Room to verify conflict-free scheduling.
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="modal-actions" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Back to Step 1</span>
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsOpen(false);
                    setEditingSchedule(null);
                    setModalStep(1);
                  }}
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
                      (!validationFeedback.valid && validationFeedback.errors.length > 0)
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
                    }}
                  >
                    <Plus size={15} />
                    <span>Save &amp; Add Another Subject Here</span>
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
                    (!validationFeedback.valid && validationFeedback.errors.length > 0)
                  }
                  onClick={() => handleSave(false)}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{loading ? "Saving…" : (editingSchedule ? "Save Schedule Changes" : "Confirm & Schedule Block")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Stacked Same-Time Schedules Group Modal */}
      <Modal
        isOpen={Boolean(activeStackGroup)}
        onClose={() => setActiveStackGroup(null)}
        title={`${activeStackGroup?.day || ""} • ${activeStackGroup?.slot || ""} (${activeStackGroup?.schedules.length || 0} Scheduled Classes)`}
        size="lg"
      >
        {activeStackGroup && (
          <div className="stacked-group-modal-content">
            <div className="stacked-group-modal-banner">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: "8px", borderRadius: 8, background: "rgba(37, 99, 235, 0.1)", color: "var(--srcb-royal, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--srcb-navy, #0f2c59)" }}>
                    {activeStackGroup.schedules.length} Concurrent Classes Scheduled
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted, #64748b)" }}>
                    All classes below are scheduled simultaneously on {activeStackGroup.day} from {activeStackGroup.slot}.
                  </p>
                </div>
              </div>

              {Array.from(new Set(activeStackGroup.schedules.map((s) => s.room).filter(Boolean))).length < activeStackGroup.schedules.length && (
                <div className="stacked-group-conflict-alert">
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span><strong>Room Conflict Detected:</strong> Multiple classes are assigned to the same room at this time slot.</span>
                </div>
              )}
            </div>

            <div className="stacked-group-modal-list">
              {activeStackGroup.schedules.map((item, index) => {
                const sTheme = getProgramTheme(item);
                return (
                  <div
                    key={item.id || index}
                    className="stacked-group-modal-card"
                    style={{ borderLeftColor: sTheme.primary }}
                    onClick={() => {
                      setViewingSchedule(item);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View class ${item.subjectCode} - ${item.subject}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setViewingSchedule(item);
                      }
                    }}
                  >
                    <div className="stacked-group-modal-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="stacked-card-code" style={{ color: sTheme.primary }}>
                          {item.subjectCode}
                        </span>
                        <span
                          className="program-card-badge"
                          style={{
                            backgroundColor: sTheme.badgeBg,
                            color: sTheme.badgeText,
                          }}
                        >
                          {sTheme.code}
                        </span>
                        <span className={`pill ${item.isMajor ? "pill--royal" : "pill--slate"}`} style={{ fontSize: "0.68rem" }}>
                          {item.classMode === "Laboratory" || String(item.roomType || "").toLowerCase().includes("lab") ? "Major Lab (3h)" : item.isMajor ? "Major Lec (2h)" : "Minor (1.5h)"}
                        </span>
                        {item.modality === "Online" && (
                          <span className="pill pill--emerald" style={{ fontSize: "0.68rem" }}>Online</span>
                        )}
                      </div>

                      <div className="stacked-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                          onClick={() => setViewingSchedule(item)}
                          title="View Full Details"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        {canCreate && (
                          <>
                            <button
                              type="button"
                              className="icon-button icon-button--sm"
                              onClick={() => {
                                setActiveStackGroup(null);
                                handleEdit(item);
                              }}
                              title="Edit Schedule Block"
                              style={{ width: 26, height: 26 }}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--sm icon-button--danger"
                              onClick={() => {
                                setActiveStackGroup(null);
                                setScheduleToDelete(item);
                              }}
                              title="Delete Schedule Block"
                              style={{ width: 26, height: 26 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Subject Title */}
                    <div className="stacked-group-modal-subject-title">
                      {item.subject}
                    </div>

                    {/* Metadata Grid */}
                    <div className="stacked-group-modal-meta-grid">
                      <div className="stacked-meta-item">
                        <GraduationCap size={13} className="meta-icon" />
                        <span><strong>Section:</strong> {item.section || "N/A"}</span>
                        {item.isCombinedCohort && (
                          <span className="pill pill--cyan" style={{ fontSize: "0.62rem", padding: "0 4px" }}>Combined</span>
                        )}
                      </div>

                      <div className="stacked-meta-item">
                        <UserCheck size={13} className="meta-icon" />
                        <span><strong>Instructor:</strong> {item.faculty || "Unassigned"}</span>
                      </div>

                      <div className="stacked-meta-item">
                        <DoorOpen size={13} className="meta-icon" />
                        <span><strong>Room:</strong> {item.room || "TBA"} ({item.building || "College Building"})</span>
                      </div>

                      <div className="stacked-meta-item">
                        <Clock size={13} className="meta-icon" />
                        <span><strong>Time:</strong> {item.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
        userRole={role}
      />

      {/* Program Head Schedule Adjustment Request Modal */}
      <ScheduleAdjustmentRequestModal
        isOpen={Boolean(scheduleToAdjust)}
        onClose={() => setScheduleToAdjust(null)}
        schedule={scheduleToAdjust}
        roomsList={roomsList}
        onSubmitSuccess={() => {
          fetchAdjustmentRequests();
          fetchSchedules();
        }}
      />

      {/* Admin Schedule Adjustment Review Modal */}
      <AdminAdjustmentReviewModal
        isOpen={Boolean(requestToReview)}
        onClose={() => setRequestToReview(null)}
        request={requestToReview}
        roomsList={roomsList}
        onReviewed={() => {
          fetchAdjustmentRequests();
          fetchSchedules();
        }}
      />

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
    </motion.div>
  );
}
