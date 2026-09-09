import { Navigate } from "react-router-dom";

/**
 * @deprecated Conflict diagnostics are now embedded directly in Class Schedules (/schedules).
 */
export function ConflictPage() {
  return <Navigate to="/schedules?filter=conflict" replace />;
}
