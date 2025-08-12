import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(true);

  // 처음 로드될 때 지점 목록을 가져옵니다.
  useEffect(() => {
    fetchBranches();
  }, []);

  // Supabase에서 지점 목록을 가져오는 함수
  const fetchBranches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Branches')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching branches:', error);
      alert('지점 목록을 불러오는 데 실패했습니다: ' + error.message);
    } else {
      setBranches(data);
    }
    setLoading(false);
  };

  // 새 지점을 추가하는 함수
  const handleAddBranch = async (e) => {
    e.preventDefault(); // 이 코드가 페이지 새로고침(깜빡임)을 막아줍니다.
    if (!newBranchName.trim()) return;

    const { error } = await supabase
      .from('Branches')
      .insert({ name: newBranchName.trim() });

    if (error) {
      alert('지점 추가 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert('새로운 지점이 추가되었습니다.');
      setNewBranchName('');
      fetchBranches(); // 목록 새로고침
    }
  };

  // 기존 지점 이름을 수정하는 함수
  const handleUpdateBranch = async (id, currentName) => {
    const updatedName = window.prompt('새로운 지점 이름을 입력하세요:', currentName);
    if (!updatedName || updatedName.trim() === '' || updatedName.trim() === currentName) {
      return; // 아무것도 입력하지 않거나, 이름이 그대로면 함수 종료
    }

    const { error } = await supabase
      .from('Branches')
      .update({ name: updatedName.trim() })
      .eq('id', id);

    if (error) {
      alert('지점 수정 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert('지점 이름이 수정되었습니다.');
      fetchBranches(); // 목록 새로고침
    }
  };

  // 지점을 삭제하는 함수
  const handleDeleteBranch = async (id) => {
    if (window.confirm('정말로 이 지점을 삭제하시겠습니까? 관련된 모든 데이터에 영향을 줄 수 있습니다.')) {
      const { error } = await supabase
        .from('Branches')
        .delete()
        .eq('id', id);

      if (error) {
        alert('지점 삭제 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('지점이 삭제되었습니다.');
        fetchBranches(); // 목록 새로고침
      }
    }
  };

  if (loading) return <div>Loading branches...</div>;

  return (
    <div>
      <h3>지점 추가하기</h3>
      <form onSubmit={handleAddBranch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="새 지점 이름"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '8px 12px', cursor: 'pointer' }}>추가</button>
      </form>

      <hr />

      <h3>지점 목록</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>지점명</th>
            <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {branches.map(branch => (
            <tr key={branch.id}>
              <td style={{ border: '1px solid #ddd', padding: '12px' }}>{branch.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '12px' }}>{branch.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                <button onClick={() => handleUpdateBranch(branch.id, branch.name)} style={{ marginRight: '5px', cursor: 'pointer' }}>수정</button>
                <button onClick={() => handleDeleteBranch(branch.id)} style={{ cursor: 'pointer' }}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BranchManagement;