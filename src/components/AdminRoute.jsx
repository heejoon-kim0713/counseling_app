import { useAuth } from '../lib/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

function AdminRoute() {
  const { profile, loading } = useAuth(); // AuthContext에서 loading 상태를 가져옵니다.

  // ▼▼▼▼▼ 바로 이 부분이 핵심입니다. ▼▼▼▼▼
  // 프로필 정보를 아직 불러오는 중이라면, 아무것도 하지 않고 잠시 기다립니다.
  if (loading) {
    return <div>Loading user permissions...</div>; // 또는 그냥 null을 반환해도 됩니다.
  }
  // ▲▲▲▲▲ 여기까지 ▲▲▲▲▲

  // 로딩이 끝난 후, 허용된 역할인지 확인합니다.
  const isAdminOrDirector = profile && (profile.role === 'Admin' || profile.role === 'Director');

  return isAdminOrDirector ? <Outlet /> : <Navigate to="/dashboard" />;
}

export default AdminRoute;