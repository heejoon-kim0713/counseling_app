import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ▼▼▼▼▼ 영어 역할을 한글로 바꿔주는 '번역 객체'입니다. ▼▼▼▼▼
const ROLE_NAMES = {
  Admin: '관리자',
  Director: '원장',
  TeamLead: '팀장',
  Counselor: '상담사',
};
// ▲▲▲▲▲ 여기까지 ▲▲▲▲▲

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Profiles')
      .select('*, Teams(name)');
    
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase.from('Teams').select('*');
    if (error) console.error('Error fetching teams:', error);
    else setTeams(data || []);
  };

  const handleUpdateUser = async (userId, field, value) => {
    const { error } = await supabase
      .from('Profiles')
      .update({ [field]: value })
      .eq('id', userId);

    if (error) {
      alert('Error updating user: ' + error.message);
    } else {
      alert('사용자 정보가 수정되었습니다.');
      fetchUsers();
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <h3>상담사 관리</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>이름</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>역할</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>소속 팀</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <select 
                  value={user.role} 
                  onChange={(e) => handleUpdateUser(user.id, 'role', e.target.value)}
                >
                  {/* ▼▼▼▼▼ Object.entries()를 사용해 번역 객체를 옵션으로 만듭니다. ▼▼▼▼▼ */}
                  {Object.entries(ROLE_NAMES).map(([roleValue, roleName]) => (
                    <option key={roleValue} value={roleValue}>{roleName}</option>
                  ))}
                  {/* ▲▲▲▲▲ 여기까지 ▲▲▲▲▲ */}
                </select>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <select 
                  value={user.team_id || ''}
                  onChange={(e) => handleUpdateUser(user.id, 'team_id', e.target.value)}
                >
                  <option value="">팀 없음</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <select 
                  value={user.status} 
                  onChange={(e) => handleUpdateUser(user.id, 'status', e.target.value)}
                >
                  <option value="Active">활동중</option>
                  <option value="Inactive">퇴사</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserManagement;