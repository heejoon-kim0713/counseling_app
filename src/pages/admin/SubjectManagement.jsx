import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]); // 지점 목록을 담을 상태
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(''); // 선택된 지점 ID를 담을 상태
  const [loading, setLoading] = useState(true);

  // 처음 로드될 때 과목과 지점 목록을 모두 가져옵니다.
  useEffect(() => {
    fetchSubjects();
    fetchBranches();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    // 과목을 가져올 때, 연결된 지점(Branches)의 이름(name)도 함께 가져옵니다.
    const { data, error } = await supabase
      .from('Subjects')
      .select('*, Branches(name)')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching subjects:', error);
    } else {
      setSubjects(data);
    }
    setLoading(false);
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase.from('Branches').select('*');
    if (error) console.error('Error fetching branches:', error);
    else setBranches(data || []);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !selectedBranchId) {
      alert('과목 이름과 소속 지점을 모두 선택해야 합니다.');
      return;
    }

    const { error } = await supabase
      .from('Subjects')
      .insert({ name: newSubjectName.trim(), branch_id: selectedBranchId });

    if (error) {
      alert('Error adding subject: ' + error.message);
    } else {
      alert('새로운 과목이 추가되었습니다.');
      setNewSubjectName('');
      setSelectedBranchId('');
      fetchSubjects();
    }
  };

  const handleUpdateSubject = async (id, currentName) => {
    const updatedName = window.prompt('새로운 과목 이름을 입력하세요:', currentName);
    if (!updatedName || updatedName.trim() === '' || updatedName.trim() === currentName) return;

    const { error } = await supabase
      .from('Subjects')
      .update({ name: updatedName.trim() })
      .eq('id', id);

    if (error) {
      alert('Error updating subject: ' + error.message);
    } else {
      alert('과목 이름이 수정되었습니다.');
      fetchSubjects();
    }
  };

  const handleDeleteSubject = async (id) => {
    if (window.confirm('정말로 이 과목을 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('Subjects')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error deleting subject: ' + error.message);
      } else {
        alert('과목이 삭제되었습니다.');
        fetchSubjects();
      }
    }
  };

  if (loading) return <div>Loading subjects...</div>;

  return (
    <div>
      <h3>과목 추가하기</h3>
      <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select 
          value={selectedBranchId} 
          onChange={(e) => setSelectedBranchId(e.target.value)}
          required
          style={{ padding: '8px' }}
        >
          <option value="">소속 지점 선택</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="새 과목 이름"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          style={{ padding: '8px' }}
          required
        />
        <button type="submit" style={{ padding: '8px 12px' }}>추가</button>
      </form>

      <hr />

      <h3>과목 목록</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>과목명</th>
            <th style={{ border: '1-x solid #ddd', padding: '8px', textAlign: 'left' }}>소속 지점</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map(subject => (
            <tr key={subject.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subject.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subject.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subject.Branches ? subject.Branches.name : 'N/A'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <button onClick={() => handleUpdateSubject(subject.id, subject.name)} style={{ marginRight: '5px' }}>수정</button>
                <button onClick={() => handleDeleteSubject(subject.id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SubjectManagement;