import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import SubmitReport from "./pages/reports/SubmitReport";
import ManageReports from "./pages/reports/ManageReports";
import MyReports from "./pages/reports/MyReports";
import Members from "./pages/members/Members";
import Attendance from "./pages/members/Attendance";
import AssignCellLeader from "./pages/members/AssignCellLeader";
import FirstTimers from "./pages/members/FirstTimers";
import Partnership from "./pages/members/Partnership";
import Messaging from "./pages/messaging/Messaging";
import Structure from "./pages/structure/Structure";
import AssignFellowshipLeader from "./pages/structure/AssignFellowshipLeader";
import Settings from "./pages/settings/Settings";

const memberManagerRoles = ["admin", "pastor", "staff", "fellowship_leader", "cell_leader"];
const messagingRoles = ["admin", "pastor", "staff", "fellowship_leader", "cell_leader", "teacher", "member"];
const structureRoles = ["admin", "pastor", "staff", "fellowship_leader"];
const fellowshipLeaderAssignmentRoles = ["admin", "pastor", "staff"];
const cellLeaderAssignmentRoles = ["admin", "pastor", "staff", "fellowship_leader"];
const settingsRoles = ["admin", "pastor", "staff", "fellowship_leader", "cell_leader"];

function ProtectedLayoutRoute({ allowedRoles, allowedResponsibilities, children }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles} allowedResponsibilities={allowedResponsibilities}>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedLayoutRoute
              allowedRoles={["admin", "pastor", "staff"]}
              allowedResponsibilities={["first_timer", "cell_ministry", "partnership"]}
            >
              <Dashboard />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedLayoutRoute allowedRoles={settingsRoles}>
              <Settings />
            </ProtectedLayoutRoute>
          }
        />

        <Route path="/profile" element={<Navigate to="/settings" replace />} />

        <Route
          path="/reports/submit"
          element={
            <ProtectedLayoutRoute allowedRoles={["cell_leader"]}>
              <SubmitReport />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/reports/manage"
          element={
            <ProtectedLayoutRoute
              allowedRoles={["admin", "pastor", "staff", "fellowship_leader"]}
              allowedResponsibilities={["cell_ministry"]}
            >
              <ManageReports />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/reports/my"
          element={
            <ProtectedLayoutRoute allowedRoles={["cell_leader"]}>
              <MyReports />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/members"
          element={
            <ProtectedLayoutRoute allowedRoles={memberManagerRoles}>
              <Members />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/members/assign-cell-leader"
          element={
            <ProtectedLayoutRoute allowedRoles={cellLeaderAssignmentRoles} allowedResponsibilities={["cell_ministry"]}>
              <AssignCellLeader />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/members/assign-fellowship-leader"
          element={
            <ProtectedLayoutRoute
              allowedRoles={fellowshipLeaderAssignmentRoles}
              allowedResponsibilities={["cell_ministry"]}
            >
              <AssignFellowshipLeader />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedLayoutRoute allowedRoles={memberManagerRoles}>
              <Attendance />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/structure"
          element={
            <ProtectedLayoutRoute allowedRoles={structureRoles} allowedResponsibilities={["cell_ministry"]}>
              <Structure />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/first-timers"
          element={
            <ProtectedLayoutRoute allowedRoles={["admin", "pastor", "staff"]} allowedResponsibilities={["first_timer"]}>
              <FirstTimers />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/partnership"
          element={
            <ProtectedLayoutRoute allowedRoles={["admin", "pastor", "staff"]} allowedResponsibilities={["partnership"]}>
              <Partnership />
            </ProtectedLayoutRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedLayoutRoute allowedRoles={messagingRoles}>
              <Messaging />
            </ProtectedLayoutRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
