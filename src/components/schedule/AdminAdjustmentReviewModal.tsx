import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../common/Modal";
import {
  ShieldCheck,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  User,
  GraduationCap,
  Tag,
  FileText,
} from "lucide-react";
import type { ScheduleAdjustmentRequest, RoomItem } from "../../types";
import { useToast } from "../common/Toast";
import { api } from "../../data/apiClient";
import {
  DAYS,
  TIME_SLOTS,
  calculateEndTimeFromStart,
} from "../../utils/scheduling";

interface AdminAdjustmentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ScheduleAdjustmentRequest | null;
  roomsList?: RoomItem[];
  onReviewed?: () => void;
}

export const AdminAdjustmentReviewModal: React.FC<AdminAdjustmentReviewModalProps> = ({
  isOpen,
  onClose,
  request,
  roomsList = [],
  onReviewed,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [confirmedDay, setConfirmedDay] = useState("Monday");
  const [confirmedStartTime, setConfirmedStartTime] = useState("07:30 AM");
  const [confirmedRoom, setConfirmedRoom] = useState("");
  const [adminResponse, setAdminResponse] = useState("");

  const isScheduleAdjustment = request?.requestedAction === "SCHEDULE_ADJUSTMENT" || Boolean(request?.scheduleId);

  // Calculate duration from current schedule or suggested
  const currentDurationMinutes = useMemo(() => {
    if (!request || !request.currentStartTime || !request.currentEndTime) return 90;
    const [cSh, cSm] = request.currentStartTime.split(":").map(Number);
    const [cEh, cEm] = request.currentEndTime.split(":").map(Number);
    const dur = (cEh * 60 + cEm) - (cSh * 60 + cSm);
    return dur > 0 ? dur : 90;
  }, [request]);

  const confirmedEndTime = useMemo(() => {
    return calculateEndTimeFromStart(confirmedStartTime, currentDurationMinutes);
  }, [confirmedStartTime, currentDurationMinutes]);

  useEffect(() => {
    if (request) {
      setConfirmedDay(request.suggestedDay || request.currentDay || "Monday");
      setConfirmedStartTime(
        request.suggestedStartTime
          ? (request.suggestedStartTime.includes(":") ? `${request.suggestedStartTime.slice(0, 5)} AM` : request.suggestedStartTime)
          : request.currentStartTime
          ? (request.currentStartTime.includes(":") ? `${request.currentStartTime.slice(0, 5)} AM` : request.currentStartTime)
          : "07:30 AM"
      );
      setConfirmedRoom(request.suggestedRoom || request.roomNumber || "");
      setAdminResponse(request.adminRemarks || request.adminResponse || "");
    }
  }, [request, isOpen]);

  if (!request) return null;

  const isPending = request.status === "Pending";
  const actionLabel = request.requestedAction ? request.requestedAction.replace(/_/g, " ") : "Schedule Adjustment";

  const handleApprove = async () => {
    setLoading(true);
    try {
      const payload: any = {
        adminRemarks: adminResponse.trim() || "Approved by Academic Administrator (DSA).",
        adminResponse: adminResponse.trim() || "Approved by Academic Administrator (DSA).",
      };

      if (isScheduleAdjustment && request.scheduleId) {
        payload.day = confirmedDay;
        payload.startTime = confirmedStartTime;
        payload.endTime = confirmedEndTime;
        payload.room = confirmedRoom || request.roomNumber;
      }

      await api.patch(`/schedule-adjustment-requests/${request.id}/approve`, payload);

      toast.push(`Permission request #${request.id} (${actionLabel}) granted successfully.`, "success");
      onClose();
      if (onReviewed) onReviewed();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to approve permission request.";
      toast.push(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!adminResponse.trim()) {
      toast.push("Please provide admin remarks explaining the rejection reason.", "error");
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/schedule-adjustment-requests/${request.id}/reject`, {
        adminRemarks: adminResponse.trim(),
        adminResponse: adminResponse.trim(),
      });

      toast.push(`Permission request #${request.id} rejected.`, "info");
      onClose();
      if (onReviewed) onReviewed();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to reject permission request.";
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
      eyebrow="Academic Scheduling Governance"
      icon={<ShieldCheck size={20} />}
      title={isScheduleAdjustment ? "Review Schedule Adjustment Request" : "Review Program Head Permission Request"}
      description={`Request #${request.id} • Submitted by ${request.requesterName} (${request.requesterProgram} Program Head)`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header Badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--srcb-primary)" }}>
              {request.subjectCode}
            </span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--srcb-text)" }}>
              {request.subjectName}
            </span>
            <span className="pill pill--navy" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
              Action: {actionLabel}
            </span>
          </div>

          <span
            className={`pill ${
              request.status === "Approved"
                ? "pill--emerald"
                : request.status === "Rejected"
                ? "pill--rose"
                : "pill--amber"
            }`}
            style={{ fontSize: "0.76rem", fontWeight: 800, padding: "3px 10px" }}
          >
            Status: {request.status.toUpperCase()}
          </span>
        </div>

        {/* Request Metadata Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            padding: "10px 12px",
            background: "var(--srcb-surface-alt)",
            border: "1px solid var(--srcb-border)",
            borderRadius: 6,
            fontSize: "0.8rem",
          }}
        >
          <div>
            <div style={{ color: "var(--srcb-text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>Requester</div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <User size={12} /> {request.requesterName}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--srcb-text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>Assigned Program</div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <GraduationCap size={12} /> {request.requesterProgram}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--srcb-text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>Section / Cohort</div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Tag size={12} /> {request.sectionName || "Program Major Cohort"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--srcb-text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>Requested Date</div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} /> {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Today"}
            </div>
          </div>
        </div>

        {/* If Schedule Adjustment: Current vs Suggested Slot */}
        {isScheduleAdjustment && (request.currentStartTime || request.suggestedStartTime) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
            {/* Current Slot */}
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 6,
                fontSize: "0.8rem",
              }}
            >
              <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={13} /> Current Timeslot
              </div>
              <div><strong>Day:</strong> {request.currentDay || "—"}</div>
              <div><strong>Time:</strong> {request.currentStartTime || "—"} – {request.currentEndTime || "—"}</div>
              <div><strong>Room:</strong> {request.roomNumber || "Unassigned"}</div>
            </div>

            <ArrowRight size={18} color="var(--srcb-text-muted)" />

            {/* Suggested Slot */}
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 6,
                fontSize: "0.8rem",
              }}
            >
              <div style={{ fontWeight: 700, color: "#059669", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={13} /> Suggested Timeslot
              </div>
              <div><strong>Day:</strong> {request.suggestedDay || request.currentDay || "Monday"}</div>
              <div><strong>Time:</strong> {request.suggestedStartTime || "—"} – {request.suggestedEndTime || "—"}</div>
              <div><strong>Room:</strong> {request.suggestedRoom || request.roomNumber || "Campus Room"}</div>
            </div>
          </div>
        )}

        {/* Reason from Program Head */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--srcb-surface-alt)",
            border: "1px solid var(--srcb-border)",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--srcb-text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <FileText size={13} /> Program Head Justification / Reason:
          </div>
          <div style={{ fontSize: "0.86rem", color: "var(--srcb-text)", fontStyle: "italic" }}>
            "{request.reason}"
          </div>
        </div>

        {/* If Request is Pending: Controls for Admin */}
        {isPending ? (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(37, 99, 235, 0.04)",
              border: "1px solid rgba(37, 99, 235, 0.2)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--srcb-primary)" }}>
              Admin Review &amp; Permission Confirmation:
            </div>

            {isScheduleAdjustment && request.scheduleId && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {/* Confirmed Day */}
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 3 }}>
                    Confirmed Day
                  </label>
                  <select
                    value={confirmedDay}
                    onChange={(e) => setConfirmedDay(e.target.value)}
                    className="input-base"
                    style={{ width: "100%", fontSize: "0.82rem", padding: "5px 7px" }}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Confirmed Start Time */}
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 3 }}>
                    Confirmed Start Time
                  </label>
                  <select
                    value={confirmedStartTime}
                    onChange={(e) => setConfirmedStartTime(e.target.value)}
                    className="input-base"
                    style={{ width: "100%", fontSize: "0.82rem", padding: "5px 7px" }}
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

                {/* Confirmed End Time */}
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 3 }}>
                    Confirmed End Time
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={confirmedEndTime}
                    className="input-base"
                    style={{ width: "100%", fontSize: "0.82rem", padding: "5px 7px", opacity: 0.85 }}
                    title="Auto-calculated from start time & duration"
                  />
                </div>
              </div>
            )}

            {isScheduleAdjustment && request.scheduleId && (
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--srcb-text-muted)", marginBottom: 3 }}>
                  Confirmed Room
                </label>
                <select
                  value={confirmedRoom}
                  onChange={(e) => setConfirmedRoom(e.target.value)}
                  className="input-base"
                  style={{ width: "100%", fontSize: "0.82rem", padding: "5px 7px" }}
                >
                  {roomsList.length > 0 ? (
                    roomsList.map((r) => (
                      <option key={r.number} value={r.number}>
                        {r.number} - {r.building} ({r.type})
                      </option>
                    ))
                  ) : (
                    <option value={request.roomNumber || "COL-101"}>{request.roomNumber || "COL-101"}</option>
                  )}
                </select>
              </div>
            )}

            {/* Admin Remarks / Decision Notes */}
            <div>
              <label
                htmlFor="admin-resp-text"
                style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--srcb-text)", marginBottom: 3 }}
              >
                Admin Remarks / Decision Notes (Recorded in Audit Trail &amp; Sent to Program Head)
              </label>
              <textarea
                id="admin-resp-text"
                rows={2}
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Enter remarks for approval or mandatory explanation if rejecting..."
                className="input-base"
                style={{ width: "100%", boxSizing: "border-box", fontSize: "0.82rem", padding: "6px 8px" }}
              />
            </div>
          </div>
        ) : (
          /* Processed Request Summary */
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(148, 163, 184, 0.08)",
              border: "1px solid var(--srcb-border)",
              borderRadius: 6,
              fontSize: "0.82rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--srcb-text)", marginBottom: 4 }}>
              Admin Remarks / Decision:
            </div>
            <div style={{ color: "var(--srcb-text-muted)" }}>
              {request.adminRemarks || request.adminResponse || "No written remarks provided."}
            </div>
            {request.reviewedAt && (
              <div style={{ marginTop: 6, fontSize: "0.74rem", color: "var(--srcb-text-muted)" }}>
                Reviewed on {new Date(request.reviewedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            Close
          </button>

          {isPending && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleReject}
                disabled={loading}
                style={{
                  color: "#dc2626",
                  borderColor: "rgba(220, 38, 38, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <XCircle size={15} />
                <span>Reject</span>
              </button>

              <button
                type="button"
                className="action-button"
                onClick={handleApprove}
                disabled={loading}
                aria-label={isScheduleAdjustment && request.scheduleId ? "Approve & Update" : "Approve & Grant"}
                title="Approve & Update Schedule / Grant Permission"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 160 }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{isScheduleAdjustment && request.scheduleId ? "Approve & Update" : "Approve & Grant"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
