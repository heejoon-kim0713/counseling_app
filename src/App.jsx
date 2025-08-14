import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import BranchManagement from './pages/admin/BranchManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import TeamManagement from './pages/admin/TeamManagement';
import UserManagement from './pages/admin/UserManagement';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import SignUp from './pages/SignUp'; // 경로 오타 수정
import LogViewer from './pages/admin/LogViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="branches" />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="branches" element={<BranchManagement />} />
            <Route path="subjects" element={<SubjectManagement />} />
            <Route path="teams" element={<TeamManagement />} />
            <Route path="logs" element={<LogViewer />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;