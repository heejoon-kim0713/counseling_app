import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Teams')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching teams:', error);
    } else {
      setTeams(data);
    }
    setLoading(false);
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const { error } = await supabase
      .from('Teams')
      .insert({ name: newTeamName.trim() });

    if (error) {
      alert('Error adding team: ' + error.message);
    } else {
      alert('새로운 팀이 추가되었습니다.');
      setNewTeamName('');
      fetchTeams();
    }
  };

  const handleUpdateTeam = async (id, currentName) => {
    const updatedName = window.prompt('새로운 팀 이름을 입력하세요:', currentName);
    if (!updatedName || updatedName.trim() === '' || updatedName.trim() === currentName) return;

    const { error } = await supabase
      .from('Teams')
      .update({ name: updatedName.trim() })
      .eq('id', id);

    if (error) {
      alert('Error updating team: ' + error.message);
    } else {
      alert('팀 이름이 수정되었습니다.');
      fetchTeams();
    }
  };

  const handleDeleteTeam = async (id) => {
    if (window.confirm('정말로 이 팀을 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('Teams')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error deleting team: ' + error.message);
      } else {
        alert('팀이 삭제되었습니다.');
        fetchTeams();
      }
    }
  };

  if (loading) return <div>Loading teams...</div>;

  return (
    <div>
      <h3>팀 추가하기</h3>
      <form onSubmit={handleAddTeam} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="새 팀 이름"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 12px' }}>추가</button>
      </form>

      <hr />

      <h3>팀 목록</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>팀명</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{team.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{team.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <button onClick={() => handleUpdateTeam(team.id, team.name)} style={{ marginRight: '5px' }}>수정</button>
                <button onClick={() => handleDeleteTeam(team.id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeamManagement;