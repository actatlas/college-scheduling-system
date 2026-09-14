import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../common/Modal";
import {
  ArrowRightLeft,
  Clock,
  Calendar,
  Building,
  UserCheck,
  GraduationCap,
  Send,
  Loader2,
  Info,
} from "lucide-react";
import type { ClassScheduleItem, RoomItem } from "../../types";
import { useToast } from "../common/Toast";
import { api } from "../../data/apiClient";
import {
  DAYS,
  TIME_SLOTS,
  calculateEndTimeFromStart,
  getExpectedSubjectDuration,
} from "../../utils/scheduling";
import { getProgramTheme } from "../../utils/programColors";

interface ScheduleAdjustmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ClassScheduleItem | null;
  roomsList?: RoomItem[];
  onSubmitSuccess?: () => void;
}

export const ScheduleAdjustmentRequestModal: React.FC<ScheduleAdjustmentRequestModalProps> = ({
  isOpen,
  onClose,
  schedule,
  roomsList = [],
  onSubmitSuccess,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [reason, setReason] = useState(
    "This schedule is blocking a continuous Major Subject scheduling period."
  );
  const [suggestedDay, setSuggestedDay] = useState("Monday");
  const [suggestedStartTime, setSuggestedStartTime] = useState("07:30 AM");
  const [suggestedRoom, setSuggestedRoom] = useState("");

  const startTime =
    schedule?.startTime?.slice(0, 5) ||
    schedule?.time?.split("-")[0]?.trim() ||
    "08:00 AM";
  const endTime =
    schedule?.endTime?.slice(0, 5) ||
    schedule?.time?.split("-")[1]?.trim() ||
    "09:30 AM";

  const progTheme = schedule ? getProgramTheme(schedule) : { primary: "#2563eb", lightBg: "#eff6ff", lightBorder: "#bfdbfe" };

  // Calculate subject duration
  const expectedDurationMinutes = useMemo(() => {
    if (!schedule) return 90;
    const isLab = schedule.classMode === "Laboratory" || String(schedule.roomType || "").toLowerCase().includes("lab");
    return getExpectedSubjectDuration(schedule, isLab ? "Laboratory" : "Lecture");
  }, [schedule]);

  // Suggested End Time auto-calculated based on suggested Start Time + duration
  const suggestedEndTime = useMemo(() => {
    return calculateEndTimeFromStart(suggestedStartTime, expectedDurationMinutes);
  }, [suggestedStartTime, expectedDurationMinutes]);

  useEffect(() => {
    if (schedule) {
      setSuggestedDay(schedule.day || "Monday");
      setSuggestedRoom(schedule.room || "");
      // Default suggested start time to 7:30 AM or 8:00 AM
      setSuggestedStartTime("07:30 AM");
      setReason("This schedule is blocking a continuous Major Subject scheduling period.");
    }
  }, [schedule, isOpen]);

  if (!schedule) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.push("Please enter a reason for the adjustment request.", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/schedule-adjustment-requests", {
        scheduleId: Number(schedule.id),
        reason: reason.trim(),
        suggestedDay,
        suggestedStartTime,
        suggestedEndTime,
        suggestedRoom: suggestedRoom || schedule.room,
      });

      toast.push("Schedule adjustment request submitted to Admin for review.", "success");
      onClose();
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to submit adjustment request.";
      toast.push(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size="lg"
      onClose={onClose}
      eyebrow="Program Head Request Workflow"
      icon={<ArrowRightLeft size={20} />}
      title="Request Schedule Adjustment"
      description="Request permission from College Administration to move this schedule block to free up a continuous Major Subject block."
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Current Schedule Summary Card */}
        <div
          style={{
            padding: "12px 14px",
            background: progTheme.lightBg || "rgba(37, 99, 235, 0.05)",
            border: `1px solid ${progTheme.lightBorder || "rgba(37, 99, 235, 0.2)"}`,
            borderLeft: `5px solid ${progTheme.primary || "#2563eb"}`,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: progTheme.primary }}>
                {schedule.subjectCode}
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--srcb-text)" }}>
                {schedule.subject}
              </span>
            </div>
            <span className="pill pill--amber" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
              Current Active Schedule
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, fontSize: "0.82rem", color: "var(--srcb-text-muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} color="var(--srcb-primary)" />
              <span><strong>Day &amp; Time:</strong> {schedule.day}, {startTime} – {endTime}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <GraduationCap size={14} color="var(--srcb-primary)" />
              <span><strong>Section:</strong> {schedule.section || "BSIT 1-A"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <UserCheck size={14} color="var(--srcb-primary)" />
              <span><strong>Instructor:</strong> {schedule.faculty || "Assigned Faculty"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Building size={14} color="var(--srcb-primary)" />
              <span><strong>Room:</strong> {schedule.room || "Room 101"} ({schedule.building || "Main"})</span>
            </div>
          </div>
        </div>

        {/* Reason for Schedule Adjustment */}
        <div>
          <label
            htmlFor="adj-reason"
            style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "var(--srcb-text)", marginBottom: 4 }}
          >
            Reason for Adjustment <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            id="adj-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this schedule needs adjustment (e.g. blocking a continuous Major Subject block)..."
            required
            className="input-base"
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontSize: "0.85rem", padding: "8px 10px" }}
          />
        </div>

        {/* Suggested New Time Allocation */}
        <div style={{ background: "var(--srcb-surface-alt)", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--srcb-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Clock size={16} color="var(--srcb-primary)" />
            <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--srcb-text)" }}>
              Suggested New Time Slot (Optional / Recommended)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {/* Suggested Day */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 4 }}>
                Suggested Day
              </label>
              <select
                value={suggestedDay}
                onChange={(e) => setSuggestedDay(e.target.value)}
                className="input-base"
                style={{ width: "100%", fontSize: "0.82rem", padding: "6px 8px" }}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Suggested Start Time */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 4 }}>
                Suggested Start Time
              </label>
              <select
                value={suggestedStartTime}
                onChange={(e) => setSuggestedStartTime(e.target.value)}
                className="input-base"
                style={{ width: "100%", fontSize: "0.82rem", padding: "6px 8px" }}
              >
                {TIME_SLOTS.map((slot) => {
                  const st = slot.split("-")[0].trim();
                  return (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Auto-Calculated Suggested End Time */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 4 }}>
                Suggested End Time (Auto)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={suggestedEndTime}
                className="input-base"
                style={{ width: "100%", fontSize: "0.82rem", padding: "6px 8px", background: "var(--srcb-input-bg)", opacity: 0.85 }}
                title={`Calculated automatically based on ${expectedDurationMinutes / 60}h required duration`}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 4 }}>
              Suggested Room
            </label>
            <select
              value={suggestedRoom}
              onChange={(e) => setSuggestedRoom(e.target.value)}
              className="input-base"
              style={{ width: "100%", fontSize: "0.82rem", padding: "6px 8px" }}
            >
              {roomsList.length > 0 ? (
                roomsList.map((r) => (
                  <option key={r.number} value={r.number}>
                    {r.number} - {r.building} ({r.type})
                  </option>
                ))
              ) : (
                <option value={schedule.room || "COL-101"}>{schedule.room || "COL-101"}</option>
              )}
            </select>
          </div>
        </div>

        {/* Workflow Info Alert */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(148, 163, 184, 0.08)",
            border: "1px solid var(--srcb-border)",
            borderRadius: 6,
            fontSize: "0.76rem",
            color: "var(--srcb-text-muted)",
          }}
        >
          <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            This request will be sent to College Administration for review. The schedule will remain in its current timeslot until an Administrator approves and validates the proposed change.
          </span>
        </div>

        {/* Actions */}
        <div className="modal-actions" style={{ marginTop: 4 }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            className="action-button"
            disabled={loading || !reason.trim()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 140 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>{loading ? "Submitting…" : "Send Request"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
