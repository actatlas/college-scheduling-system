import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";

const LoginPage = lazy(() =>
  import("../pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const FacultyPage = lazy(() =>
  import("../pages/FacultyPage").then((module) => ({
    default: module.FacultyPage,
  })),
);
const CoursesPage = lazy(() =>
  import("../pages/CoursesPage").then((module) => ({
    default: module.CoursesPage,
  })),
);
const ProgramsPage = lazy(() =>
  import("../pages/ProgramsPage").then((module) => ({
    default: module.ProgramsPage,
  })),
);
const SubjectsPage = lazy(() =>
  import("../pages/SubjectsPage").then((module) => ({
    default: module.SubjectsPage,
  })),
);
const SectionsPage = lazy(() =>
  import("../pages/SectionsPage").then((module) => ({
    default: module.SectionsPage,
  })),
);
const RoomsPage = lazy(() =>
  import("../pages/RoomsPage").then((module) => ({
    default: module.RoomsPage,
  })),
);
const SchedulesPage = lazy(() =>
  import("../pages/SchedulesPage").then((module) => ({
    default: module.SchedulesPage,
  })),
);
const ConflictPage = lazy(() =>
  import("../pages/ConflictPage").then((module) => ({
    default: module.ConflictPage,
  })),
);
const ReportsPage = lazy(() =>
  import("../pages/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const UserManagementPage = lazy(() =>
  import("../pages/UserManagementPage").then((module) => ({
    default: module.UserManagementPage,
  })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (role === "teacher") return <Navigate to="/teacher-dashboard" replace />;
    if (role === "program_head")
      return <Navigate to="/program-head-dashboard" replace />;
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <Outlet />;
}

function RouteFallback() {
  return <div className="empty-state">Loading page…</div>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          {/* Shared paths */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["admin", "teacher", "program_head"]}
              />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
          </Route>

          {/* Admin + Program Head paths */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["admin", "program_head"]} />
            }
          >
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/sections" element={<SectionsPage />} />
            <Route path="/faculty" element={<FacultyPage />} />
          </Route>

          {/* Admin-only paths */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin-dashboard" element={<DashboardPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/departments" element={<CoursesPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/conflicts" element={<ConflictPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Program Head paths */}
          <Route element={<ProtectedRoute allowedRoles={["program_head"]} />}>
            <Route path="/program-head-dashboard" element={<DashboardPage />} />
          </Route>

          {/* Teacher-only paths */}
          <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher-dashboard" element={<DashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
