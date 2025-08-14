import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Activity_Logs')
        .select('*, Profiles(name)') // 수정자 이름(Profiles)만 조인해서 가져옴
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      alert('로그를 불러오는 데 실패했습니다: ' + error.message);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading logs...</div>;

  return (
    <div>
      <h3>상담 활동 로그 (최신 100개)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>수정시간</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>수정자</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>상담일</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>담당 상담사</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>고객명</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>활동 내용</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {log.Profiles?.name || 'N/A'}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {log.appointment_date || 'N/A'}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {log.counselor_name || 'N/A'}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {log.client_name || 'N/A'}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {log.action}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LogViewer;