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
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Copy,
} from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import {
  validateScheduleSlot,
  findAvailableRoomForSlot,
  formatGroupedAvailability,
  isTimeOverlapping,
  parseTeacherAvailability,
  parseTimeToMinutes,
  isGeneralSubject,
  getPairedDay,
} from "../utils/scheduling";
import { getProgramTheme, getProgramColor } from "../utils/programColors";
import { ScheduleDetailsModal } from "../components/schedule/ScheduleDetailsModal";
import { TimetableSkeleton, CardGridSkeleton } from "../components/common/Skeleton";
import { Tooltip } from "../components/common/Tooltip";
import { SearchableSelect, type SearchableOption } from "../components/common/SearchableSelect";
import { useNotifications } from "../contexts/NotificationContext";
import type { ClassScheduleItem, ClassModality, BuildingType } from "../types";

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

interface ScheduleCluster {
  startIdx: number;
  endIdx: number;
  items: ClassScheduleItem[];
}

function buildDayScheduleClusters(daySchedules: ClassScheduleItem[]): ScheduleCluster[] {
  if (!daySchedules || daySchedules.length === 0) return [];

  const itemsWithRange = daySchedules.map((item) => {
    const startIdx = Math.max(0, getScheduleStartSlotIdx(item.time));
    const span = Math.max(1, getScheduleRowSpan(item.time));
    return {
      item,
      startIdx,
      endIdx: Math.min(TIME_SLOTS.length, startIdx + span),
    };
  });

  // Sort by startIdx ascending, then span descending
  itemsWithRange.sort((a, b) => a.startIdx - b.startIdx || (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx));

  const clusters: ScheduleCluster[] = [];

  for (const entry of itemsWithRange) {
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster && entry.startIdx < lastCluster.endIdx) {
      lastCluster.endIdx = Math.max(lastCluster.endIdx, entry.endIdx);
      lastCluster.items.push(entry.item);
    } else {
      clusters.push({
        startIdx: entry.startIdx,
        endIdx: entry.endIdx,
        items: [entry.item],
      });
    }
  }

  return clusters;
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
  onDuplicate?: (item: ClassScheduleItem) => void;
}

function StackedScheduleCell({
  day,
  slot,
  slotIdx: _slotIdx,
  rowSpan,
  schedules,
  canCreate,
  onEdit,
  onDelete,
  onView,
  onAddAtSlot,
  onDuplicate,
}: StackedScheduleCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [frontCardId, setFrontCardId] = useState<string | null>(null);

  const isStacked = schedules.length > 1;

  // Active index for carousel flipper controls
  const activeIdx = useMemo(() => {
    if (!frontCardId) return schedules.length - 1;
    const found = schedules.findIndex((s) => s.id === frontCardId);
    return found >= 0 ? found : schedules.length - 1;
  }, [schedules, frontCardId]);

  const handlePrevCard = () => {
    const nextIdx = (activeIdx - 1 + schedules.length) % schedules.length;
    setFrontCardId(schedules[nextIdx].id);
  };

  const handleNextCard = () => {
    const nextIdx = (activeIdx + 1) % schedules.length;
    setFrontCardId(schedules[nextIdx].id);
  };

  const distinctRooms = useMemo(() => {
    return Array.from(new Set(schedules.map((s) => s.room).filter(Boolean)));
  }, [schedules]);

  const hasRoomClash = distinctRooms.length < schedules.length;

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
        onClick={(e) => {
          e.stopPropagation();
          setFrontCardId(item.id);
          if (!canCreate) {
            onView(item);
          }
        }}
        title={canCreate ? "Drag to reschedule to another slot" : "Click to view official assigned schedule details"}
        style={{
          borderLeft: `5px solid ${cardBorderColor}`,
          borderRadius: 8,
          padding: isCompact ? "5px 7px" : "6px 8px",
          marginBottom: 0,
          height: isCompact ? "auto" : "calc(100% - 4px)",
          minHeight: !isCompact && rowSpan > 1 ? `${rowSpan * 38}px` : "42px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: "left",
          cursor: canCreate ? "grab" : "pointer",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <span className="schedule-card-code" style={{ fontWeight: 800, fontSize: isCompact ? "0.8rem" : "0.84rem" }}>
                {item.subjectCode}
              </span>
              <span
                className="program-card-badge"
                style={{
                  backgroundColor: progTheme.badgeBg,
                  color: progTheme.badgeText,
                }}
                title={`Program: ${progTheme.name}`}
              >
                {progTheme.code}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {canCreate && <GripVertical size={11} color="var(--srcb-text-muted, #94a3b8)" style={{ opacity: 0.6 }} />}
              <span
                className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                style={{ fontSize: "0.62rem", padding: "1px 5px" }}
              >
                {item.modality}
              </span>
            </div>
          </div>
          <div className="schedule-card-subject" style={{ fontSize: isCompact ? "0.72rem" : "0.76rem", marginTop: 2, fontWeight: 600, lineHeight: 1.2 }}>
            {item.subject}
          </div>
          <div className="schedule-card-meta" style={{ fontSize: "0.68rem", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} style={{ flexShrink: 0 }} /> {item.time}
          </div>
          <div className="schedule-card-meta" style={{ fontSize: "0.68rem", display: "flex", alignItems: "center", gap: 4 }}>
            <GraduationCap size={11} style={{ flexShrink: 0 }} /> <strong>Sec:</strong> {item.section}
          </div>
          <div
            className="schedule-card-meta"
            style={{
              fontSize: "0.68rem",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 700,
              color: "var(--srcb-text)",
            }}
          >
            <DoorOpen size={11} style={{ flexShrink: 0, color: progTheme.primary }} />
            <span>
              <strong>Room:</strong> {item.room} {item.building ? `(${item.building.split(" ")[0]})` : ""}
            </span>
          </div>
          <div className="schedule-card-faculty" style={{ fontSize: "0.7rem", fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <UserCheck size={11} style={{ flexShrink: 0 }} /> {item.faculty}
          </div>

          {item.modality === "Online" && item.onlineLink && (
            <a
              href={item.onlineLink}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.68rem",
                color: "var(--srcb-green, #10b981)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: 2,
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              <ExternalLink size={10} /> Join Class
            </a>
          )}
        </div>

        {canCreate && (
          <div className="schedule-card-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 4, paddingTop: 3 }}>
            {onDuplicate && (
              <button
                type="button"
                className="icon-button icon-button--sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(item);
                }}
                title="Duplicate Schedule Block"
                aria-label={`Duplicate class block ${item.subjectCode}`}
                style={{ width: 22, height: 22, padding: 0 }}
              >
                <Copy size={11} />
              </button>
            )}
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
      <div className="stacked-schedule-container">
        {renderCard(schedules[0])}
      </div>
    );
  }

  return (
    <div className="stacked-schedule-container">
      <div className="stacked-schedule-header">
        <span className="stacked-pill-badge" title={`${schedules.length} classes scheduled in this time slot`}>
          <Layers size={11} /> Stacked ({schedules.length})
        </span>

        {distinctRooms.length > 1 && (
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 700,
              color: hasRoomClash ? "#dc2626" : "#15803d",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
            title={hasRoomClash ? "Warning: Same room scheduled multiple times" : `${distinctRooms.length} distinct rooms scheduled`}
          >
            {hasRoomClash ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
            {hasRoomClash ? "Room Conflict" : `${distinctRooms.length} Rooms`}
          </span>
        )}

        <div className="stacked-header-actions">
          {!isExpanded && schedules.length > 1 && (
            <div className="stacked-flipper" title="Cycle through concurrent room schedules">
              <button
                type="button"
                className="stacked-flipper-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevCard();
                }}
                aria-label="Previous card in stack"
              >
                <ChevronLeft size={10} />
              </button>
              <span>{activeIdx + 1}/{schedules.length}</span>
              <button
                type="button"
                className="stacked-flipper-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextCard();
                }}
                aria-label="Next card in stack"
              >
                <ChevronRight size={10} />
              </button>
            </div>
          )}

          <button
            type="button"
            className="stacked-view-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            title={isExpanded ? "Collapse to stacked cards" : "Expand cards vertically"}
            aria-label="Toggle stack view mode"
          >
            {isExpanded ? <Layers size={10} /> : <LayoutList size={10} />}
            <span>{isExpanded ? "Stack" : "Expand"}</span>
          </button>

          {canCreate && (
            <button
              type="button"
              className="stacked-add-slot-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddAtSlot(day, schedules[0]?.time || slot);
              }}
              title="Add another schedule to this time slot"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Room Tabs Strip */}
      <div className="stacked-room-tabs" aria-label="Room tabs for concurrent classes">
        {schedules.map((item, idx) => {
          const isFront = frontCardId ? frontCardId === item.id : idx === schedules.length - 1;
          const sTheme = getProgramTheme(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`stacked-room-pill ${isFront ? "is-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setFrontCardId(item.id);
              }}
              title={`Switch to Room ${item.room} (${sTheme.code} · ${item.subjectCode})`}
            >
              <span className="stacked-room-dot" style={{ backgroundColor: sTheme.primary }} />
              <span>{item.room || `R${idx + 1}`}</span>
              <span style={{ fontSize: "0.58rem", opacity: 0.9 }}>({sTheme.code})</span>
            </button>
          );
        })}
      </div>

      <div className={`stacked-cards-stack ${isExpanded ? "mode-expanded" : "mode-stacked"}`}>
        {schedules.map((item, idx) => {
          const isFront = frontCardId ? frontCardId === item.id : idx === schedules.length - 1;
          return (
            <div
              key={item.id}
              className={`stacked-card-wrapper ${isFront ? "is-front" : ""}`}
              style={{ zIndex: isFront ? 20 + idx : idx + 1 }}
              onClick={() => setFrontCardId(item.id)}
            >
              {renderCard(item, true)}
            </div>
          );
        })}
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

  useEffect(() => {
    const v = searchParams.get("view") || searchParams.get("filter");
    if (v === "unscheduled") {
      setViewMode("unscheduled");
    } else if (v === "list") {
      setViewMode("list");
    } else if (v === "grid") {
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
  const [isOpen, setIsOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ClassScheduleItem | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassScheduleItem | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; slotIdx: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: string; slotIdx: number } | null>(null);

  // Multi-Perspective Timetable State (Section vs Faculty vs Room)
  const [perspectiveMode, setPerspectiveMode] = useState<"all" | "section" | "faculty" | "room">("all");
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

  const [form, setForm] = useState({
    day: "Monday",
    time: "07:00 AM - 08:30 AM",
    subjectCode: "",
    subject: "",
    section: "",
    facultyId: "",
    faculty: "",
    room: "COL-101",
    building: "College Building" as BuildingType,
    modality: "Face-to-Face" as ClassModality,
    onlineLink: "",
    isMajor: true,
    program: selectedProgram.key || "BSIT",
  });
  const [pairDayEnabled, setPairDayEnabled] = useState(true);
  const [duplicateDays, setDuplicateDays] = useState<string[]>(["Friday"]);

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
    const calculatedTime = `${startSlotStr} - ${endSlotStr}`;
    const day = dragStart.day;

    const freeRoom = findAvailableRoomForSlot(day, calculatedTime, roomsList, scheduleItems);
    const firstSub = availableSubjects[0] || subjectsList[0];
    const defFac = facultyList.find((f) => f.id === firstSub?.instructorId) || facultyList[0];
    const defSec = sectionsList.find((s) => s.program === firstSub?.program) || sectionsList[0];
    const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
    const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
    const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

    setEditingSchedule(null);
    const paired = getPairedDay(day);
    setPairDayEnabled(Boolean(paired));
    setDuplicateDays(paired ? [paired] : ["Friday"]);
    setForm({
      day,
      time: calculatedTime,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      section: defSecVal,
      facultyId: defFac?.id || "",
      faculty: defFac?.name || "",
      room: defRoom,
      building: defBuilding,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: Boolean(firstSub?.isMajor),
      program: firstSub?.program || selectedProgram.key || "BSIT",
    });

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
        const defFac = facultyList.find((f) => f.id === sub.instructorId) || facultyList[0];
        const defSec = sectionsList.find((s) => s.program === sub.program) || sectionsList[0];
        const defSecVal = defSec ? (defSec.course && defSec.section ? `${defSec.course} ${defSec.yearLevel || ''}-${defSec.section}`.trim() : defSec.section) : "BSIT 1-A";
        const defRoom = freeRoom?.number || roomsList[0]?.number || "COL-101";
        const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";

        setEditingSchedule(null);
        setForm({
          day,
          time: slot,
          subjectCode: sub.code || "",
          subject: sub.name || "",
          section: defSecVal,
          facultyId: defFac?.id || "",
          faculty: defFac?.name || "",
          room: defRoom,
          building: defBuilding,
          modality: "Face-to-Face",
          onlineLink: "",
          isMajor: Boolean(sub.isMajor),
          program: sub.program || selectedProgram.key || "BSIT",
        });
        setModalStep(1);
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

  const fetchSchedules = async () => {
    try {
      const res = await api.get("/schedules");
      setScheduleItems(res.data?.data || []);
    } catch {
      setScheduleItems([]);
    }
  };

  useEffect(() => {
    setIsFetching(true);
    Promise.all([
      fetchSchedules(),
      api.get("/faculty").then((res: any) => setFacultyList(res.data?.data || [])).catch(() => setFacultyList([])),
      api.get("/subjects").then((res: any) => setSubjectsList(res.data?.data || [])).catch(() => setSubjectsList([])),
      api.get("/rooms").then((res: any) => setRoomsList(res.data?.data || [])).catch(() => setRoomsList([])),
      api.get("/sections").then((res: any) => setSectionsList(res.data?.data || [])).catch(() => setSectionsList([])),
    ]).finally(() => {
      setIsFetching(false);
    });
  }, []);

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

      // 2. Check Part-Time and registered availability rules
      if (fac.status === "Part-Time" && fac.availability) {
        const parsedAvail = parseTeacherAvailability(fac.availability);
        const dayEntry = parsedAvail.find((d) => d.day.toLowerCase() === form.day.toLowerCase());
        if (!dayEntry || !dayEntry.slots || dayEntry.slots.length === 0) return false;

        const [candStart] = form.time.split("-").map((t) => t.trim());
        const isSlotListed = dayEntry.slots.some((slot) => {
          const [sStart] = slot.split("-").map((t) => t.trim());
          return (
            slot.includes(form.time) ||
            form.time.includes(slot) ||
            (sStart && candStart && sStart.slice(0, 2) === candStart.slice(0, 2))
          );
        });
        if (!isSlotListed) return false;
      }

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

      // Room type rules: laboratory subjects require lab room
      if (requiresLab) {
        const isLab = /lab/i.test(rm.type || "") || /lab/i.test(rm.building || "");
        if (!isLab) return false;
      }

      return true;
    });
  }, [roomsList, scheduleItems, form.day, form.time, form.modality, form.subjectCode, subjectsList, editingSchedule]);

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

  const isStep1ResourcesAvailable = useMemo(() => {
    return Boolean(form.subjectCode && form.day && form.time);
  }, [form.subjectCode, form.day, form.time]);

  const selectedSubjectObj = useMemo(() => {
    if (!form.subjectCode) return null;
    return (
      availableSubjects.find((s) => s.code === form.subjectCode) ||
      subjectsList.find((s) => s.code === form.subjectCode) ||
      null
    );
  }, [form.subjectCode, availableSubjects, subjectsList]);

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
    const facCandidates = availableFacultyForSlot.length > 0 ? availableFacultyForSlot : availableFaculty.length > 0 ? availableFaculty : facultyList;
    if (!facCandidates.some((f) => f.id === form.facultyId || f.name === form.faculty)) {
      const firstFac = facCandidates[0];
      if (firstFac) {
        setForm((prev) => ({ ...prev, facultyId: firstFac.id, faculty: firstFac.name }));
      } else {
        setForm((prev) => ({ ...prev, facultyId: "", faculty: "" }));
      }
    }

    // Adapt / validate room selection for the new slot
    if (form.modality === "Face-to-Face") {
      const roomCandidates = availableRoomsForSlot.length > 0 ? availableRoomsForSlot : availableRoomsForBuilding.length > 0 ? availableRoomsForBuilding : roomsList;
      if (!roomCandidates.some((r) => r.number === form.room)) {
        const firstRoom = roomCandidates[0];
        if (firstRoom) {
          setForm((prev) => ({ ...prev, room: firstRoom.number, building: (firstRoom.building as BuildingType) || prev.building }));
        } else {
          setForm((prev) => ({ ...prev, room: "" }));
        }
      }
    }

    // Adapt / validate section selection for the new slot & subject
    const secCandidates = availableSectionsForSlot.length > 0 ? availableSectionsForSlot : availableSections.length > 0 ? availableSections : sectionsList;
    if (!secCandidates.some((s) => s.section === form.section || (s.course && `${s.course} ${s.yearLevel || ''}-${s.section}`.trim() === form.section))) {
      const firstSec = secCandidates[0];
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
    setPairDayEnabled(true);
    setDuplicateDays(["Friday"]);
    setForm({
      day: "Monday",
      time: "07:00 AM - 08:30 AM",
      subjectCode: sub.code || "",
      subject: sub.name || "",
      section: "",
      facultyId: "",
      faculty: "",
      room: "COL-101",
      building: "College Building" as BuildingType,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: Boolean(sub.isMajor),
      program: sub.program || selectedProgram.key || "BSIT",
    });
    setModalStep(1);
    setIsOpen(true);
  };

  const handleSubjectChange = (code: string) => {
    const sub = subjectsList.find((s) => s.code === code);
    if (!sub) return;

    setForm((prev) => ({
      ...prev,
      subjectCode: sub.code,
      subject: sub.name,
      isMajor: Boolean(sub.isMajor),
      program: sub.program || prev.program,
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
    setPairDayEnabled(false);
    setDuplicateDays([]);
    setForm({
      day: item.day,
      time: item.time,
      subjectCode: item.subjectCode || "",
      subject: item.subject,
      section: item.section,
      facultyId: item.facultyId || "",
      faculty: item.faculty,
      room: item.room,
      building: item.building as BuildingType,
      modality: item.modality || "Face-to-Face",
      onlineLink: item.onlineLink || "",
      isMajor: Boolean(item.isMajor),
      program: item.program || selectedProgram.key || "BSIT",
    });
    setModalStep(1);
    setIsOpen(true);
  };

  const handleDuplicate = (item: ClassScheduleItem) => {
    if (!canCreate) return;
    setEditingSchedule(null);
    const targetDay = item.day === "Monday" || item.day === "Tuesday" ? "Friday" : (getPairedDay(item.day) || "Friday");
    setForm({
      day: targetDay,
      time: item.time,
      subjectCode: item.subjectCode || "",
      subject: item.subject,
      section: item.section,
      facultyId: item.facultyId || "",
      faculty: item.faculty,
      room: item.room,
      building: (item.building as BuildingType) || "College Building",
      modality: item.modality || "Face-to-Face",
      onlineLink: item.onlineLink || "",
      isMajor: Boolean(item.isMajor),
      program: item.program || selectedProgram.key || "BSIT",
    });
    setPairDayEnabled(false);
    setDuplicateDays([]);
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

  const handleSave = async () => {
    if (!form.subjectCode || !form.section || !form.faculty) {
      toast.push("Please select Subject, Section, and Faculty", "error");
      return;
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
      };

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

        // Schedule Duplication (e.g., Monday -> Friday, Tuesday -> Friday)
        const targetDuplicateDays = (
          duplicateDays.length > 0
            ? duplicateDays
            : getPairedDay(form.day)
            ? [getPairedDay(form.day)!]
            : []
        ).filter((d) => d !== form.day);

        const successfullyDuplicatedDays: string[] = [];
        const failedDuplicateErrors: string[] = [];

        if (pairDayEnabled && targetDuplicateDays.length > 0) {
          for (const targetDay of targetDuplicateDays) {
            const duplicatedPayload = {
              ...payload,
              id: undefined,
              day: targetDay,
            };
            try {
              await api.post("/schedules", duplicatedPayload);
              successfullyDuplicatedDays.push(targetDay);
            } catch (dupErr: any) {
              console.warn(`Could not duplicate schedule to ${targetDay}:`, dupErr);
              const errMsg = dupErr?.response?.data?.error || dupErr?.message || "Slot conflict";
              failedDuplicateErrors.push(`${targetDay} (${errMsg})`);
            }
          }
        }

        if (successfullyDuplicatedDays.length > 0) {
          toast.push(
            `Successfully scheduled on ${form.day} & also saved on ${successfullyDuplicatedDays.join(", ")} (${form.time})`,
            "success"
          );
          addNotification({
            title: "Duplicated Classes Scheduled",
            message: `${form.subjectCode} (${form.section}) scheduled on ${form.day} & also saved on ${successfullyDuplicatedDays.join(", ")} at ${form.time}.`,
            type: "success",
            link: "/schedules",
            targetRole: "admin,program_head,teacher",
            targetProgram: form.program,
            targetTeacherId: form.facultyId,
          });
          if (failedDuplicateErrors.length > 0) {
            toast.push(`Some duplicate days could not be saved: ${failedDuplicateErrors.join(", ")}`, "info");
          }
        } else if (failedDuplicateErrors.length > 0) {
          toast.push(`Created on ${form.day}, but duplicate on ${failedDuplicateErrors.join(", ")} failed`, "info");
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

      setIsOpen(false);
      setEditingSchedule(null);
      setModalStep(1);
      fetchSchedules();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save schedule";
      toast.push(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const visibleSchedules = useMemo(() => {
    return scheduleItems.filter((item) => {
      // Perspective filter: By Section, By Faculty, or By Room
      if (perspectiveMode === "section" && selectedPerspectiveEntity !== "All") {
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

      return true;
    });
  }, [
    scheduleItems,
    perspectiveMode,
    selectedPerspectiveEntity,
    selectedFacultyFilter,
    selectedDayFilter,
    selectedProgram,
    role,
    matchesProgram,
    query,
  ]);

  const dayScheduleClusters = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildDayScheduleClusters>>();
    for (const day of DAYS) {
      const dayItems = visibleSchedules.filter((item) => item.day.toLowerCase() === day.toLowerCase());
      map.set(day.toLowerCase(), buildDayScheduleClusters(dayItems));
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

    setEditingSchedule(null);
    const paired = getPairedDay(day);
    setPairDayEnabled(Boolean(paired));
    setDuplicateDays(paired ? [paired] : ["Friday"]);
    setForm({
      day,
      time: timeSlot,
      subjectCode: firstSub?.code || "",
      subject: firstSub?.name || "",
      section: defSecVal,
      facultyId: defFac?.id || "",
      faculty: defFac?.name || "",
      room: defRoom,
      building: defBuilding,
      modality: "Face-to-Face",
      onlineLink: "",
      isMajor: Boolean(firstSub?.isMajor),
      program: firstSub?.program || selectedProgram.key || "BSIT",
    });
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
            : "Supports Face-to-Face and Online classes, College/SHS/JHS room assignments, and part-time availability checking."
        }
        actions={
          canCreate ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingSchedule(null);
                setPairDayEnabled(true);
                setDuplicateDays(["Friday"]);
                const firstSec = availableSections[0] || sectionsList[0];
                const defSecVal = firstSec ? (firstSec.course && firstSec.section ? `${firstSec.course} ${firstSec.yearLevel || ''}-${firstSec.section}`.trim() : firstSec.section) : "BSIT 1-A";
                const filteredSubs = availableSubjects.filter((s) => isSubjectMatchingSection(s, firstSec));
                const firstSub = filteredSubs[0] || availableSubjects[0] || subjectsList[0];
                const defFac = availableFaculty.find((f) => f.id === firstSub?.instructorId || f.name === firstSub?.instructor) || availableFaculty[0] || facultyList[0];
                const isLab = Number(firstSub?.labHours || 0) > 0;
                const freeRoom = findAvailableRoomForSlot("Monday", "07:00 AM - 08:30 AM", roomsList, scheduleItems);
                const defRoom = freeRoom?.number || roomsList.find((r) => isLab ? (/lab/i.test(r.type || '') || /lab/i.test(r.building || '')) : true)?.number || roomsList[0]?.number || "COL-101";
                const defBuilding = (freeRoom?.building as BuildingType) || roomsList[0]?.building || "College Building";
                setForm({
                  day: "Monday",
                  time: "07:00 AM - 08:30 AM",
                  subjectCode: firstSub?.code || "",
                  subject: firstSub?.name || "",
                  section: defSecVal,
                  facultyId: defFac?.id || "",
                  faculty: defFac?.name || "",
                  room: defRoom,
                  building: defBuilding as BuildingType,
                  modality: "Face-to-Face",
                  onlineLink: "",
                  isMajor: Boolean(firstSub?.isMajor),
                  program: firstSub?.program || firstSec?.program || selectedProgram.key || "BSIT",
                });
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--srcb-surface-alt, #f8fafc)", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}>
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
                <option value="section">By Section / Block</option>
                <option value="faculty">By Faculty Member</option>
                <option value="room">By Room / Facility</option>
              </select>

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
                {facultyList
                  .filter((f) => !currentUserName || (f.name !== currentUserName && String(f.id) !== String(currentTeacherId)))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department || "Academic"})
                    </option>
                  ))}
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
              <>
                <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table" style={{ textAlign: "center" }}>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Time Slot (30m)</th>
                  {DAYS.map((d) => (
                    <th key={d} style={{ minWidth: 155 }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                onMouseLeave={() => {
                  if (isDraggingGrid) {
                    setIsDraggingGrid(false);
                    setDragStart(null);
                    setDragCurrent(null);
                  }
                }}
                onMouseUp={handleMouseUpGrid}
              >
                {(() => {
                  // Track occupied (day, slotIdx) slots that are covered by an earlier rowSpan
                  const coveredCells = new Set<string>();

                  return TIME_SLOTS.map((slot, slotIdx) => (
                    <tr key={slot}>
                      <td className={`timetable-time-slot-cell ${slot.includes(":00 ") ? "is-hour" : "is-half-hour"}`}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span className="timetable-time-slot-time">
                            {slot.split("-")[0].trim()}
                          </span>
                          <span className="timetable-time-slot-range">
                            to {slot.split("-")[1].trim()}
                          </span>
                        </div>
                      </td>
                      {DAYS.map((day) => {
                        const cellKey = `${day.toLowerCase()}-${slotIdx}`;
                        if (coveredCells.has(cellKey)) {
                          // This cell is part of an ongoing multi-slot block from an earlier row
                          return null;
                        }

                        const clusters = dayScheduleClusters.get(day.toLowerCase()) || [];
                        const cluster = clusters.find((c) => c.startIdx === slotIdx);

                        const inRange = isSlotInDragRange(day, slotIdx);
                        const isDropHover = dropTarget?.day === day && dropTarget?.slot === slot;

                        if (!cluster || cluster.items.length === 0) {
                          return (
                            <td
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
                                  <span style={{ fontSize: "0.72rem", opacity: 0.65 }}>+ Slot</span>
                                ) : (
                                  <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>—</span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        const rowSpan = Math.max(1, cluster.endIdx - cluster.startIdx);

                        // Mark subsequent slots as covered
                        for (let offset = 1; offset < rowSpan; offset++) {
                          if (slotIdx + offset < TIME_SLOTS.length) {
                            coveredCells.add(`${day.toLowerCase()}-${slotIdx + offset}`);
                          }
                        }

                        return (
                          <td
                            key={`${day}-${slot}`}
                            rowSpan={rowSpan > 1 ? rowSpan : undefined}
                            className={`schedule-grid-cell ${inRange ? "drag-hover" : ""} ${isDropHover ? "drag-target-hover" : ""}`}
                            style={{ height: rowSpan > 1 ? `${rowSpan * 42}px` : undefined }}
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
                          >
                            <StackedScheduleCell
                              day={day}
                              slot={slot}
                              slotIdx={slotIdx}
                              rowSpan={rowSpan}
                              schedules={cluster.items}
                              canCreate={canCreate}
                              onEdit={handleEdit}
                              onDelete={(item) => setScheduleToDelete(item)}
                              onView={(item) => setViewingSchedule(item)}
                              onAddAtSlot={handleOpenAddAtSlot}
                              onDuplicate={handleDuplicate}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          </>
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
                          <span
                            className={`pill ${item.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                            style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                          >
                            {item.modality}
                          </span>
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
        title={
          modalStep === 1
            ? (editingSchedule ? "Edit Class Schedule - Step 1: Basic Information" : "Create Class Schedule - Step 1: Basic Information")
            : (editingSchedule ? "Edit Class Schedule - Step 2: Resource Assignment" : "Create Class Schedule - Step 2: Resource Assignment")
        }
        description={
          modalStep === 1
            ? "Define the academic subject, teaching day, time slot, and instructional delivery mode."
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="sched-modal-side-by-side">
              {/* LEFT COLUMN: WHAT & HOW (Subject + Modality) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Subject Section Card */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <BookOpen size={16} />
                      </div>
                      <span className="sched-form-card-title">Curriculum Subject</span>
                    </div>
                    {selectedSubjectObj && (
                      <span className="sched-form-card-badge">
                        {selectedSubjectObj.units} Units {Number(selectedSubjectObj.labHours || 0) > 0 ? "· Lab Required" : "· Lecture"}
                      </span>
                    )}
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="schedSubject">
                      Academic Subject <span style={{ color: "#dc2626" }}>*</span>
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
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(2, 132, 199, 0.06)",
                        border: "1px solid rgba(2, 132, 199, 0.15)",
                        fontSize: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "var(--srcb-navy)" }}>{selectedSubjectObj.code}</span>
                      <span style={{ color: "var(--srcb-text-muted)" }}>•</span>
                      <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedSubjectObj.name}
                      </span>
                      <span className={`pill ${selectedSubjectObj.isMajor ? "pill--blue" : "pill--amber"}`} style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                        {selectedSubjectObj.isMajor ? "Major" : "Gen Ed (Universal)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Modality & Facility Card */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <Building2 size={16} />
                      </div>
                      <span className="sched-form-card-title">Delivery Mode</span>
                    </div>
                  </div>

                  <div className="sched-modality-grid">
                    <button
                      type="button"
                      className={`sched-modality-card ${form.modality === "Face-to-Face" ? "is-selected" : ""}`}
                      onClick={() => setForm({ ...form, modality: "Face-to-Face" })}
                    >
                      <div className="sched-modality-icon-wrap">
                        <Building2 size={16} />
                      </div>
                      <div className="sched-modality-details">
                        <span className="sched-modality-name">Face-to-Face</span>
                        <span className="sched-modality-sub">On-campus facility</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`sched-modality-card ${form.modality === "Online" ? "is-selected" : ""}`}
                      onClick={() => setForm({ ...form, modality: "Online" })}
                    >
                      <div className="sched-modality-icon-wrap">
                        <Monitor size={16} />
                      </div>
                      <div className="sched-modality-details">
                        <span className="sched-modality-name">Online</span>
                        <span className="sched-modality-sub">Virtual session</span>
                      </div>
                    </button>
                  </div>

                  {form.modality === "Online" ? (
                    <div className="field-group" style={{ margin: 0 }}>
                      <label htmlFor="schedOnlineLink" style={{ fontSize: "0.78rem" }}>Virtual Meeting Link</label>
                      <input
                        id="schedOnlineLink"
                        placeholder="https://meet.google.com/xxx or Zoom"
                        value={form.onlineLink}
                        onChange={(e) => setForm({ ...form, onlineLink: e.target.value })}
                        style={{ fontSize: "0.82rem", padding: "6px 10px" }}
                      />
                    </div>
                  ) : (
                    <div className="field-group" style={{ margin: 0 }}>
                      <label htmlFor="schedBuilding" style={{ fontSize: "0.78rem" }}>Preferred Campus Building</label>
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
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: WHEN & READINESS (Day + Paired Day + Time + Availability) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Day & Time Card */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <CalendarDays size={16} />
                      </div>
                      <span className="sched-form-card-title">Schedule Timing & Duration</span>
                    </div>
                    {form.time && getTimeDurationStr(form.time) && (
                      <span className="sched-duration-tag">
                        <Clock size={12} />
                        {getTimeDurationStr(form.time)}
                      </span>
                    )}
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="schedDay">
                      Teaching Day <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <select
                      id="schedDay"
                      value={form.day}
                      onChange={(e) => {
                        const newDay = e.target.value;
                        setForm({ ...form, day: newDay });
                        if (!editingSchedule) {
                          const paired = getPairedDay(newDay);
                          setPairDayEnabled(Boolean(paired));
                          setDuplicateDays(paired ? [paired] : ["Friday"]);
                        }
                      }}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>

                    {/* Schedule Duplication Section */}
                    {!editingSchedule && (
                      <div className="sched-duplication-box">
                        <div className="sched-duplication-header">
                          <label className="sched-duplication-toggle" htmlFor="pairDayEnabledToggle">
                            <input
                              id="pairDayEnabledToggle"
                              type="checkbox"
                              checked={pairDayEnabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPairDayEnabled(checked);
                                if (checked && duplicateDays.length === 0) {
                                  const paired = getPairedDay(form.day) || "Friday";
                                  setDuplicateDays([paired]);
                                }
                              }}
                            />
                            <span className="sched-duplication-title">
                              <Copy size={13} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />
                              Duplicate Schedule to Paired Day
                            </span>
                          </label>
                          {getPairedDay(form.day) && (
                            <span className="sched-dup-recommended">
                              Recommended: {getPairedDay(form.day)}
                            </span>
                          )}
                        </div>

                        {pairDayEnabled && (
                          <>
                            <div className="sched-dup-days-grid">
                              {DAYS.filter((d) => d !== form.day).map((d) => {
                                const isSelected = duplicateDays.includes(d);
                                const isDefaultPair = d === getPairedDay(form.day);
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    className={`sched-dup-day-btn ${isSelected ? "selected" : ""}`}
                                    onClick={() => {
                                      if (isSelected) {
                                        setDuplicateDays(duplicateDays.filter((x) => x !== d));
                                      } else {
                                        setDuplicateDays([...duplicateDays, d]);
                                      }
                                    }}
                                  >
                                    {d.slice(0, 3)}
                                    {isDefaultPair && <span style={{ fontSize: "0.65rem", marginLeft: 2, opacity: 0.85 }}>★</span>}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="sched-dup-preview">
                              {duplicateDays.length > 0 ? (
                                <>
                                  Will save matching session on <strong>{duplicateDays.join(", ")}</strong> at {form.time}
                                </>
                              ) : (
                                <span style={{ color: "#eab308" }}>Select at least one day to duplicate to</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label htmlFor="schedStartTime" style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem" }}>
                        Time Window <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      {getTimeDurationStr(form.time) && (
                        <span className="sched-duration-chip" title="Total allocated class duration">
                          <Clock size={11} /> {getTimeDurationStr(form.time)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
                      <div>
                        <label htmlFor="schedStartTime" style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", display: "block", marginBottom: 3, fontWeight: 600 }}>
                          Start Time
                        </label>
                        <select
                          id="schedStartTime"
                          value={form.time.split("-")[0]?.trim() || "07:00 AM"}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const curEnd = form.time.split("-")[1]?.trim() || "08:30 AM";
                            const startMin = parseTimeToMinutes(newStart);
                            const endMin = parseTimeToMinutes(curEnd);
                            let newEnd = curEnd;
                            if (startMin >= endMin) {
                              const targetMin = Math.min(startMin + 90, 21 * 60);
                              const found = TIME_POINTS.find((tp) => parseTimeToMinutes(tp) >= targetMin) || TIME_POINTS[TIME_POINTS.length - 1];
                              newEnd = found;
                            }
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

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 18, color: "var(--srcb-text-muted)" }}>
                        <ArrowRight size={14} />
                      </div>

                      <div>
                        <label htmlFor="schedEndTime" style={{ fontSize: "0.72rem", color: "var(--srcb-text-muted)", display: "block", marginBottom: 3, fontWeight: 600 }}>
                          End Time
                        </label>
                        <select
                          id="schedEndTime"
                          value={form.time.split("-")[1]?.trim() || "08:30 AM"}
                          onChange={(e) => {
                            const curStart = form.time.split("-")[0]?.trim() || "07:00 AM";
                            const newEnd = e.target.value;
                            setForm({ ...form, time: `${curStart} - ${newEnd}` });
                          }}
                        >
                          {TIME_POINTS.map((tp) => {
                            const curStart = form.time.split("-")[0]?.trim() || "07:00 AM";
                            const startMin = parseTimeToMinutes(curStart);
                            const endMin = parseTimeToMinutes(tp);
                            if (endMin <= startMin) return null;
                            const diff = endMin - startMin;
                            const hrs = diff / 60;
                            const diffLabel = hrs % 1 === 0 ? `${hrs}h` : `${hrs.toFixed(1)}h`;
                            return (
                              <option key={tp} value={tp}>
                                {tp} ({diffLabel})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Availability Assessment */}
                {form.subjectCode && form.day && form.time && (
                  <div className="sched-compact-readiness-row">
                    <span style={{ fontWeight: 700, color: "var(--srcb-navy)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Sparkles size={13} color="var(--srcb-royal)" /> Pre-check:
                    </span>
                    <span className={`sched-compact-chip ${availableFacultyForSlot.length > 0 ? "is-good" : "is-warning"}`}>
                      {availableFacultyForSlot.length > 0 ? `✓ ${availableFacultyForSlot.length} Faculty Free` : "⚠ No Faculty Free"}
                    </span>
                    <span className={`sched-compact-chip ${form.modality === "Online" || availableRoomsForSlot.length > 0 ? "is-good" : "is-warning"}`}>
                      {form.modality === "Online" ? "✓ Online" : availableRoomsForSlot.length > 0 ? `✓ ${availableRoomsForSlot.length} Rooms Free` : "⚠ No Rooms Free"}
                    </span>
                    <span className={`sched-compact-chip ${availableSectionsForSlot.length > 0 ? "is-good" : "is-warning"}`}>
                      {availableSectionsForSlot.length > 0 ? `✓ ${availableSectionsForSlot.length} Sections Free` : "⚠ Check Section"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Step 1 Context Summary Bar */}
            <div className="sched-context-banner" style={{ padding: "8px 14px" }}>
              <div className="sched-context-tags">
                <div className="sched-context-item">
                  <BookOpen size={14} color="var(--srcb-royal)" />
                  <strong>Subject:</strong> <span>{form.subjectCode} — {form.subject}</span>
                </div>
                <div className="sched-context-item">
                  <Calendar size={14} color="var(--srcb-royal)" />
                  <strong>Schedule:</strong>{" "}
                  <span>
                    {pairDayEnabled && !editingSchedule && duplicateDays.length > 0
                      ? `${form.day} & ${duplicateDays.join(", ")}`
                      : pairDayEnabled && !editingSchedule && getPairedDay(form.day)
                      ? `${form.day} & ${getPairedDay(form.day)}`
                      : form.day}{" "}
                    • {form.time}
                  </span>
                </div>
                <div className="sched-context-item">
                  <DoorOpen size={14} color="var(--srcb-royal)" />
                  <strong>Modality:</strong> <span>{form.modality}</span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Resource: Section */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <Users size={16} />
                      </div>
                      <span className="sched-form-card-title">Assign Student Section</span>
                    </div>
                    {form.section && (
                      <span className="sched-form-card-badge" style={{ color: "var(--srcb-royal)" }}>
                        Enrolled: {selectedSectionHeadcount} Students
                      </span>
                    )}
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="schedSection">
                      Student Section <span style={{ color: "#dc2626" }}>*</span>
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

                {/* Resource: Faculty */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <UserCheck size={16} />
                      </div>
                      <span className="sched-form-card-title">Assign Instructor</span>
                    </div>
                    {form.faculty && (
                      <span className="sched-form-card-badge" style={{ color: "var(--srcb-royal)" }}>
                        {form.faculty}
                      </span>
                    )}
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="schedFaculty">
                      Instructor / Faculty <span style={{ color: "#dc2626" }}>*</span>
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
                            (pairDayEnabled && duplicateDays.some((d) => d.toLowerCase() === day.toLowerCase())) ||
                            (pairDayEnabled && day.toLowerCase() === (getPairedDay(form.day) || "").toLowerCase());
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
              </div>

              {/* RIGHT COLUMN: Room & Validation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Resource: Room */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <DoorOpen size={16} />
                      </div>
                      <span className="sched-form-card-title">Assign Classroom</span>
                    </div>
                    {selectedRoomObj && form.modality !== "Online" && (
                      <span className="sched-form-card-badge">
                        Cap: {selectedRoomObj.capacity} seats · {selectedRoomObj.type || "Classroom"}
                      </span>
                    )}
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label htmlFor="schedRoom">
                      Classroom / Laboratory <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    {form.modality === "Online" ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 12px",
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          borderRadius: 6,
                          color: "#059669",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>Virtual Classroom Mode — No physical room needed</span>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                {/* Validation & Conflict Status Card */}
                <div className="sched-form-card">
                  <div className="sched-form-card-header">
                    <div className="sched-form-card-title-wrap">
                      <div className="sched-form-card-icon">
                        <ShieldCheck size={16} />
                      </div>
                      <span className="sched-form-card-title">Validation & Conflict Diagnostics</span>
                    </div>
                  </div>

                  {validationFeedback.errors.length > 0 ? (
                    <div
                      style={{
                        padding: 10,
                        background: "rgba(239, 68, 68, 0.08)",
                        borderRadius: 6,
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderLeft: "3px solid #dc2626",
                        fontSize: "0.76rem",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
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
            </div>

            {/* Sticky Action Footer */}
            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
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
                  className="secondary-button"
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
                  disabled={
                    loading ||
                    !form.subjectCode ||
                    !form.section ||
                    !form.faculty ||
                    (form.modality === "Face-to-Face" && !form.room) ||
                    (!validationFeedback.valid && validationFeedback.errors.length > 0)
                  }
                  onClick={handleSave}
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? "Saving…" : (editingSchedule ? "Save Schedule Changes" : "Confirm & Schedule Block")}</span>
                </button>
              </div>
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
