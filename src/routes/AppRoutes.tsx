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
const RegisterPage = lazy(() =>
  import("../pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);

function RouteFallback() {
  return <div className="empty-state">Loading page…</div>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin-dashboard" element={<DashboardPage />} />
          <Route path="/teacher-dashboard" element={<DashboardPage />} />
          <Route path="/student-dashboard" element={<DashboardPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/programs" element={<CoursesPage />} />
          <Route path="/departments" element={<CoursesPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/conflicts" element={<ConflictPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
