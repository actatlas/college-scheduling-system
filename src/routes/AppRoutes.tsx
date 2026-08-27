import { Suspense, lazy } from "react";
import { Route, Routes, Navigate, Outlet } from "react-router-dom";
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
const ExamSchedulesPage = lazy(() =>
  import("../pages/ExamSchedulesPage").then((module) => ({
    default: module.ExamSchedulesPage,
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
const ProfilePage = lazy(() =>
  import("../pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
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
const SidebarDemoPage = lazy(() =>
  import("../pages/SidebarDemoPage").then((module) => ({
    default: module.SidebarDemoPage,
  })),
);


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
    return <Navigate to="/dashboard" replace />;
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
        <Route path="/sidebar-demo" element={<SidebarDemoPage />} />

        <Route element={<MainLayout />}>
          {/* Dashboard and Profile accessible by all authenticated roles */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["super_admin", "admin", "program_head", "teacher"]}
              />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin-dashboard" element={<DashboardPage />} />
            <Route path="/program-head-dashboard" element={<DashboardPage />} />
            <Route path="/teacher-dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<ProfilePage />} />
          </Route>

          {/* Admin only: System Preferences & Configuration (Requirement 2) */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              />
            }
          >
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Super Admin only: User Account Management */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["super_admin"]}
              />
            }
          >
            <Route path="/users" element={<UserManagementPage />} />
          </Route>

          {/* General paths accessible by Super Admin, Admin, Program Head, Teacher */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["super_admin", "admin", "program_head", "teacher"]}
              />
            }
          >
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/exams" element={<ExamSchedulesPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
          </Route>

          {/* Catalog, Governance & Diagnostic Paths for Super Admin, Admin & Program Head */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["super_admin", "admin", "program_head"]}
              />
            }
          >
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/sections" element={<SectionsPage />} />
            <Route path="/faculty" element={<FacultyPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/conflicts" element={<ConflictPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
