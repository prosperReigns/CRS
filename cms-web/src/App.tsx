import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["pastor", "staff"]}>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* SUBMIT REPORT */}
        <Route
          path="/reports/submit"
          element={
            <ProtectedRoute allowedRoles={["cell_leader"]}>
              <MainLayout>
                <SubmitReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* MANAGE REPORTS */}
        <Route
          path="/reports/manage"
          element={
            <ProtectedRoute
              allowedRoles={["pastor", "staff", "fellowship_leader"]}
            >
              <MainLayout>
                <ManageReports />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* VIEW REPORTS */}
        <Route
          path="/reports/my"
          element={
            <ProtectedRoute allowedRoles={["cell_leader"]}>
              <MainLayout>
                <MyReports />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* VIEW MEMBERS */}
        <Route
          path="/members"
          element={
            <ProtectedRoute
              allowedRoles={[
                "pastor",
                "staff",
                "fellowship_leader",
                "cell_leader",
              ]}
            >
              <MainLayout>
                <Members />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ATTENDANCE */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "pastor",
                "staff",
                "fellowship_leader",
                "cell_leader",
              ]}
            >
              <MainLayout>
                <Attendance />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* MESSAGING */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute
              allowedRoles={[
                "pastor",
                "staff",
                "fellowship_leader",
                "cell_leader",
                "teacher",
              ]}
            >
              <MainLayout>
                <Messaging />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
