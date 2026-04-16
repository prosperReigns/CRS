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
import Messaging from "./pages/messaging/Messaging";

const memberManagerRoles = ["pastor", "staff", "fellowship_leader", "cell_leader"];
const messagingRoles = ["pastor", "staff", "fellowship_leader", "cell_leader", "teacher", "member"];

function ProtectedLayoutRoute({ allowedRoles, children }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
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
            <ProtectedLayoutRoute allowedRoles={["pastor", "staff"]}>
              <Dashboard />
            </ProtectedLayoutRoute>
          }
        />

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
            <ProtectedLayoutRoute allowedRoles={["pastor", "staff", "fellowship_leader"]}>
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
          path="/attendance"
          element={
            <ProtectedLayoutRoute allowedRoles={memberManagerRoles}>
              <Attendance />
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
