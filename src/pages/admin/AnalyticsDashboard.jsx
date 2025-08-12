import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function AnalyticsDashboard() {
  const [branches, setBranches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [dbCountList, setDbCountList] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    branch_id: '',
    online_db_count: 0,
    offline_db_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const [dbListFilters, setDbListFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    branch_id: 'all',
  });

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    branch_id: 'all',
  });
  const [stats, setStats] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      (async () => {
        const { data: branchData } = await supabase.from('Branches').select('*');
        setBranches(branchData || []);
      })(),
      (async () => {
        const { data: teamData } = await supabase.from('Teams').select('*');
        setTeams(teamData || []);
      })(),
      (async () => {
        const { data: subjectData } = await supabase.from('Subjects').select('*');
        setSubjects(subjectData || []);
      })(),
    ]);
    await fetchDbCountList();
    setLoading(false);
  };
  
  const fetchDbCountList = async () => {
    let query = supabase
      .from('DB_Daily_Counts')
      .select('*, Branches(name)')
      .gte('date', dbListFilters.startDate)
      .lte('date', dbListFilters.endDate)
      .order('date', { ascending: false });
      
    if (dbListFilters.branch_id !== 'all') {
      query = query.eq('branch_id', dbListFilters.branch_id);
    }
      
    const { data: dbCountData, error } = await query;
      
    if (error) {
      alert('DB 현황 목록을 불러오는 데 실패했습니다: ' + error.message);
      setDbCountList([]);
    } else {
      setDbCountList(dbCountData || []);
    }
  };

  const handleDbListFilterChange = (e) => {
    const { name, value } = e.target;
    setDbListFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDbSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch_id || !formData.date) {
      alert('날짜와 지점을 모두 선택해주세요.');
      return;
    }
    try {
      const { error } = await supabase.from('DB_Daily_Counts').upsert({
        date: formData.date,
        branch_id: parseInt(formData.branch_id),
        online_db_count: parseInt(formData.online_db_count) || 0,
        offline_db_count: parseInt(formData.offline_db_count) || 0,
      }, { onConflict: 'date, branch_id' });
      if (error) throw error;
      alert('DB 정보가 성공적으로 저장/업데이트되었습니다.');
      fetchDbCountList();
    } catch (error) {
      alert('DB 저장 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const calculateStats = async () => {
    setIsCalculating(true);
    setStats(null);
    try {
      let dbQuery = supabase.from('DB_Daily_Counts').select('online_db_count, offline_db_count').gte('date', filters.startDate).lte('date', filters.endDate);
      if (filters.branch_id !== 'all') { dbQuery = dbQuery.eq('branch_id', filters.branch_id); }
      const { data: dbData } = await dbQuery;
      const totalDb = dbData.reduce((acc, cur) => acc + cur.online_db_count + cur.offline_db_count, 0);

      let appointmentQuery = supabase.from('Appointments').select('*, counselor_id').gte('datetime', `${filters.startDate}T00:00:00`).lte('datetime', `${filters.endDate}T23:59:59`);
      if (filters.branch_id !== 'all') { appointmentQuery = appointmentQuery.eq('branch_id', filters.branch_id); }
      const { data: appointmentData } = await appointmentQuery;

      const { data: profilesData } = await supabase.from('Profiles').select('id, name, team_id');
      const profileMap = new Map(profilesData.map(p => [p.id, p]));

      const totalAppointments = appointmentData?.length || 0;
      const completedAppointments = appointmentData?.filter(a => a.status === '상담 완료' || a.status === '등록').length || 0;
      const registeredAppointments = appointmentData?.filter(a => a.status === '등록').length || 0;
      const dbToConsultationRate = totalDb > 0 ? ((totalAppointments / totalDb) * 100).toFixed(1) : 0;
      const registrationRate = completedAppointments > 0 ? ((registeredAppointments / completedAppointments) * 100).toFixed(1) : 0;
      
      const teamStats = teams.map(team => {
        const teamMembers = profilesData.filter(p => p.team_id === team.id);
        const memberStats = teamMembers.map(member => {
            const memberAppointments = appointmentData.filter(a => a.counselor_id === member.id);
            const completed = memberAppointments.filter(a => a.status === '상담 완료' || a.status === '등록').length;
            const registered = memberAppointments.filter(a => a.status === '등록').length;
            const nationalCancellations = memberAppointments.filter(a => a.cancellation_type === '국기 취소').length;
            const generalRefunds = memberAppointments.filter(a => a.cancellation_type === '일반 환불').length;
            return { id: member.id, name: member.name, completed, registered, nationalCancellations, generalRefunds };
        });
        return { ...team, members: memberStats };
      });
      
      const relevantSubjectIds = [...new Set(appointmentData.map(a => a.applied_subject_id))];
      const relevantSubjects = subjects.filter(s => relevantSubjectIds.includes(s.id));
      
      const subjectStats = relevantSubjects.map(subject => {
        const applied = appointmentData?.filter(a => a.applied_subject_id === subject.id).length || 0;
        const registered = appointmentData?.filter(a => a.status === '등록' && a.registered_subject_id === subject.id).length || 0;
        return { name: subject.name, applied, registered };
      });

      const paymentMethods = ['온라인:카드', '온라인:계좌', '단말기', '회사 계좌'];
      const paymentStats = paymentMethods.map(method => {
        const payments = appointmentData?.filter(a => a.payment_method === method) || [];
        return {
          name: method,
          count: payments.length,
          amount: payments.reduce((acc, cur) => acc + (cur.registration_amount || 0), 0),
        };
      });

      setStats({
        totalDb, totalAppointments, completedAppointments, registeredAppointments,
        dbToConsultationRate, registrationRate, teamStats, subjectStats, paymentStats
      });
    } catch (error) {
      alert('통계 계산 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportToExcel = async () => {
    // ... 엑셀 내보내기 함수 (이전과 동일)
  };

  const handleEditDbEntry = (dbEntry) => {
    setFormData({
      date: dbEntry.date,
      branch_id: dbEntry.branch_id,
      online_db_count: dbEntry.online_db_count,
      offline_db_count: dbEntry.offline_db_count,
    });
    window.scrollTo(0, 0);
  };

  const handleDeleteDbEntry = async (id) => {
    if (window.confirm('정말로 이 DB 기록을 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase.from('DB_Daily_Counts').delete().eq('id', id);
        if (error) throw error;
        alert('DB 기록이 삭제되었습니다.');
        fetchDbCountList();
      } catch (error) {
        alert('DB 기록 삭제 중 오류가 발생했습니다: ' + error.message);
      }
    }
  };

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  if (loading) return <h3>Loading...</h3>;

  return (
    <div>
      <h3>일일 DB 발생 수 입력/수정</h3>
      <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', maxWidth: '400px', marginBottom: '30px' }}>
        <form onSubmit={handleDbSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label>날짜</label>
          <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
          <label>지점</label>
          <select name="branch_id" value={formData.branch_id} onChange={handleFormChange} required>
            <option value="">지점 선택</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <label>온라인 DB 수</label>
          <input type="number" name="online_db_count" value={formData.online_db_count} onChange={handleFormChange} min="0" />
          <label>오프라인 DB 수</label>
          <input type="number" name="offline_db_count" value={formData.offline_db_count} onChange={handleFormChange} min="0" />
          <button type="submit" style={{ padding: '10px' }}>저장하기</button>
        </form>
      </div>
      <hr />
      <h3>DB 현황 조회</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
        <input type="date" name="startDate" value={dbListFilters.startDate} onChange={handleDbListFilterChange} />
        <span>~</span>
        <input type="date" name="endDate" value={dbListFilters.endDate} onChange={handleDbListFilterChange} />
        <select name="branch_id" value={dbListFilters.branch_id} onChange={handleDbListFilterChange} style={{ padding: '8px' }}>
            <option value="all">전체 지점</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <button onClick={fetchDbCountList} style={{ padding: '8px 16px', cursor: 'pointer' }}>조회하기</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>날짜</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>지점</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>온라인 DB</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>오프라인 DB</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>합계</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {dbCountList.map(item => (
            <tr key={item.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.date}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.Branches.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.online_db_count}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.offline_db_count}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{item.online_db_count + item.offline_db_count}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <button onClick={() => handleEditDbEntry(item)} style={{ marginRight: '5px' }}>수정</button>
                <button onClick={() => handleDeleteDbEntry(item.id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={{ margin: '40px 0' }} />

      <h3>통계 분석</h3>
      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} style={{ padding: '8px' }} />
          <span>~</span>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} style={{ padding: '8px' }} />
          <select name="branch_id" value={filters.branch_id} onChange={handleFilterChange} style={{ padding: '8px' }}>
            <option value="all">전체 지점</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <button onClick={calculateStats} disabled={isCalculating} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            {isCalculating ? '분석 중...' : '분석하기'}
          </button>
          <button onClick={handleExportToExcel} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px' }}>
            엑셀로 내보내기
          </button>
        </div>

        {stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h4>총 DB</h4>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.totalDb}</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h4>총 상담 건수</h4>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.totalAppointments}</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h4>DB 대비 상담률</h4>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.dbToConsultationRate}%</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h4>상담 대비 등록률</h4>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.registrationRate}%</p>
                <small>({stats.registeredAppointments}건 등록 / {stats.completedAppointments}건 상담 완료)</small>
              </div>
            </div>
            
            <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px' }}>
              <div>
                <h4>팀/개인별 실적</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>팀명 / 상담사명</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>등록률</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>국기취소</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>일반환불</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.teamStats.map(team => {
                      const teamCompleted = team.members.reduce((acc, cur) => acc + cur.completed, 0);
                      const teamRegistered = team.members.reduce((acc, cur) => acc + cur.registered, 0);
                      const teamNationalCancellations = team.members.reduce((acc, cur) => acc + cur.nationalCancellations, 0);
                      const teamGeneralRefunds = team.members.reduce((acc, cur) => acc + cur.generalRefunds, 0);

                      return (
                        <>
                          <tr key={team.id} style={{ backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                              <button onClick={() => toggleTeamExpansion(team.id)} style={{ marginRight: '10px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
                                {expandedTeams[team.id] ? '▼' : '▶'}
                              </button>
                              {team.name} (팀 합계)
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                              {teamCompleted > 0 ? `${((teamRegistered / teamCompleted) * 100).toFixed(1)}%` : '0%'}
                              <small> ({teamRegistered}/{teamCompleted})</small>
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{teamNationalCancellations}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{teamGeneralRefunds}</td>
                          </tr>
                          {expandedTeams[team.id] && team.members.map(member => (
                            <tr key={member.id}>
                              <td style={{ border: '1px solid #ddd', padding: '8px', paddingLeft: '40px' }}>
                                └ {member.name}
                              </td>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {member.completed > 0 ? `${((member.registered / member.completed) * 100).toFixed(1)}%` : '0%'}
                                <small> ({member.registered}/{member.completed})</small>
                              </td>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{member.nationalCancellations}</td>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{member.generalRefunds}</td>
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <h4>과목별 현황</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>과목명</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>상담문의</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>최종등록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.subjectStats.map(subject => (
                      <tr key={subject.name}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subject.name}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subject.applied}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subject.registered}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <h4>결제 방법별 통계</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>결제 방법</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>건수</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>금액 (원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.paymentStats.map(item => (
                      <tr key={item.name}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.name}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.count}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;