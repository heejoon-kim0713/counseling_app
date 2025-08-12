import { Link, Outlet } from 'react-router-dom';

function AdminLayout() {
  // 간단한 CSS 스타일
  const styles = {
    layout: { display: 'flex' },
    sidebar: { width: '200px', padding: '20px', borderRight: '1px solid #ccc' },
    main: { flex: 1, padding: '20px' },
    nav: { display: 'flex', flexDirection: 'column', gap: '10px' },
    navLink: { textDecoration: 'none', color: '#007bff' },
    header: { marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <h2>관리 메뉴</h2>
        <nav style={styles.nav}>
          <Link to="/dashboard" style={styles.navLink}>← 대시보드로 돌아가기</Link>
            {/* ▼▼▼▼▼ 결산 대시보드 링크 추가 ▼▼▼▼▼ */}
  <Link to="/admin/analytics" style={styles.navLink}>결산 대시보드</Link>
  {/* ▲▲▲▲▲ 여기까지 ▲▲▲▲▲ */}
          <Link to="/admin/users" style={styles.navLink}>상담사 관리</Link>
          <Link to="/admin/branches" style={styles.navLink}>지점 관리</Link>
          <Link to="/admin/subjects" style={styles.navLink}>과목 관리</Link>
          <Link to="/admin/teams" style={styles.navLink}>팀 관리</Link>
        </nav>
      </aside>
      <main style={styles.main}>
        <header style={styles.header}>
          <h1>관리자 페이지</h1>
        </header>
        {/* 앞으로 여기에 각 관리 페이지의 내용이 표시됩니다. */}
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;