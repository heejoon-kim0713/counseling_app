import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Navigate 추가
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import BranchManagement from './pages/admin/BranchManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import TeamManagement from './pages/admin/TeamManagement';
import UserManagement from './pages/admin/UserManagement';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import SignUp from './pages/SignUp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            {/* ▼▼▼▼▼ 이 부분이 수정/추가되었습니다. ▼▼▼▼▼ */}
            <Route index element={<Navigate to="branches" />} /> {/* 기본 경로를 지점 관리로 설정 */}
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="branches" element={<BranchManagement />} />
            <Route path="subjects" element={<SubjectManagement />} />
            <Route path="teams" element={<TeamManagement />} />
            {/* ▲▲▲▲▲ 여기까지 ▲▲▲▲▲ */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;