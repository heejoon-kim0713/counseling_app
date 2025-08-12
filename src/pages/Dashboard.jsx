import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import AppointmentModal from '../components/AppointmentModal';
import axios from 'axios';

const STATUS_COLORS = {
  '상담 예정': '#3788d8',
  '상담 완료': '#198754',
  '등록': '#ffc107',
  '상담 취소': '#6c757d',
  '취소/환불': '#dc3545',
};

function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [rawAppointments, setRawAppointments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const fetchedYears = useRef(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [todayStats, setTodayStats] = useState({ total: 0, done: 0, left: 0 });

  const initialFormData = {
    client_name: '', client_contact: '', branch_id: '', subject_id: '',
    type: 'Online', time: '10:00', status: '상담 예정', comment: '',
    cancellation_reason: '', registered_subject_id: '',
    registration_type: '', registration_months: '', registration_amount: '', payment_method: '',
    cancellation_type: '', deduction_amount: '', refund_amount: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [branches, setBranches] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (profile) {
      fetchAppointments();
      fetchInitialData();
    }
  }, [profile]);

  // ▼▼▼▼▼ 이 useEffect 부분을 아래의 새 코드로 교체해주세요. ▼▼▼▼▼
  useEffect(() => {
    const calculateTodayStats = () => {
      if (rawAppointments.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayAppointments = rawAppointments.filter(apt => {
        const aptDate = new Date(apt.datetime);
        return aptDate >= today && aptDate < tomorrow;
      });
      
      const now = new Date();
      setTodayStats({
        total: todayAppointments.length,
        done: todayAppointments.filter(apt => new Date(apt.datetime) < now).length,
        left: todayAppointments.filter(apt => new Date(apt.datetime) >= now).length,
      });
    };

    calculateTodayStats();
    const intervalId = setInterval(calculateTodayStats, 60000);

    return () => clearInterval(intervalId);
  }, [rawAppointments]);

  const fetchInitialData = async () => {
    const { data: branchData } = await supabase.from('Branches').select('*');
    setBranches(branchData || []);
  };
  
  useEffect(() => {
    if (formData.branch_id) {
      const fetchSubjects = async () => {
        const { data: subjectData } = await supabase.from('Subjects').select('*').eq('branch_id', formData.branch_id);
        setSubjects(subjectData || []);
      };
      fetchSubjects();
    } else {
      setSubjects([]);
    }
  }, [formData.branch_id]);
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const fetchAppointments = async () => {
    try {
      const { data: appointments, error: appError } = await supabase.from('Appointments').select('*');
      if (appError) throw appError;

      const { data: clients, error: clientError } = await supabase.from('Clients').select('*');
      if (clientError) throw clientError;
      
      const { data: subjectsData, error: subjectError } = await supabase.from('Subjects').select('*');
      if (subjectError) throw subjectError;

      const { data: profiles, error: profileError } = await supabase.from('Profiles').select('id, name');
      if (profileError) throw profileError;

      const clientMap = new Map(clients.map(c => [c.id, c.name]));
      const subjectMap = new Map(subjectsData.map(s => [s.id, s.name]));
      const profileMap = new Map(profiles.map(p => [p.id, p.name]));

      setRawAppointments(appointments);
      const formattedEvents = appointments.map(apt => {
        const counselorName = profileMap.get(apt.counselor_id) || '미지정';
        const clientName = clientMap.get(apt.client_id) || '정보없음';
        const subjectName = subjectMap.get(apt.applied_subject_id) || '정보없음';
        return {
          id: apt.id,
          title: `${clientName} (${counselorName}, ${subjectName})`,
          start: apt.datetime,
          backgroundColor: STATUS_COLORS[apt.status] || '#3788d8',
          borderColor: STATUS_COLORS[apt.status] || '#3788d8'
        };
      });
      setEvents(formattedEvents);
    } catch (error) {
      console.error('데이터를 불러오는 중 오류 발생:', error);
      alert('데이터를 불러오는 데 실패했습니다: ' + error.message);
    }
  };
  // ▲▲▲▲▲ 여기까지 ▲▲▲▲▲

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    let appointmentUpdateData = {
      branch_id: formData.branch_id,
      applied_subject_id: formData.subject_id,
      datetime: new Date(`${editingEvent ? new Date(editingEvent.datetime).toISOString().split('T')[0] : selectedDate}T${formData.time}:00`).toISOString(),
      type: formData.type,
      status: formData.status,
      comment: formData.comment,
      cancellation_reason: formData.status === '상담 취소' ? formData.cancellation_reason : null,
      registered_subject_id: formData.status === '등록' ? formData.registered_subject_id : null,
      registration_type: formData.status === '등록' ? formData.registration_type : null,
      registration_months: formData.status === '등록' && formData.registration_type === '일반' ? formData.registration_months : null,
      registration_amount: formData.status === '등록' && formData.registration_type === '일반' ? formData.registration_amount : null,
      payment_method: formData.status === '등록' && formData.registration_type === '일반' ? formData.payment_method : null,
      cancellation_type: formData.status === '취소/환불' ? formData.cancellation_type : null,
      deduction_amount: formData.status === '취소/환불' && formData.cancellation_type === '일반 환불' ? formData.deduction_amount : null,
      refund_amount: formData.status === '취소/환불' && formData.cancellation_type === '일반 환불' ? formData.refund_amount : null,
    };

    if (editingEvent) {
      try {
        const { error: clientUpdateError } = await supabase.from('Clients').update({ name: formData.client_name, contact: formData.client_contact }).eq('id', editingEvent.Clients.id);
        if (clientUpdateError) throw clientUpdateError;
        const { error: appointmentUpdateError } = await supabase.from('Appointments').update(appointmentUpdateData).eq('id', editingEvent.id);
        if (appointmentUpdateError) throw appointmentUpdateError;
        alert('성공적으로 수정되었습니다.');
      } catch (error) {
        alert('수정 중 오류가 발생했습니다: ' + error.message);
      }
    } else {
      try {
        let { data: client } = await supabase.from('Clients').select('id').eq('contact', formData.client_contact).single();
        if (!client) {
          const { data: newClient, error: newClientError } = await supabase.from('Clients').insert({ name: formData.client_name, contact: formData.client_contact }).select('id').single();
          if (newClientError) throw newClientError;
          client = newClient;
        }
        const { error: appointmentError } = await supabase.from('Appointments').insert({
          ...appointmentUpdateData,
          counselor_id: profile.id,
          client_id: client.id,
        });
        if (appointmentError) throw appointmentError;
        alert('상담이 성공적으로 등록되었습니다.');
      } catch (error) {
        alert('등록 중 오류가 발생했습니다: ' + error.message);
      }
    }
    setIsModalOpen(false);
    setEditingEvent(null);
    fetchAppointments();
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (window.confirm('정말로 이 상담 내역을 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase.from('Appointments').delete().eq('id', editingEvent.id);
        if (error) throw error;
        alert('삭제되었습니다.');
        setIsModalOpen(false);
        setEditingEvent(null);
        fetchAppointments();
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
      }
    }
  };

  const handleDateClick = (arg) => {
    setEditingEvent(null);
    setSelectedDate(arg.dateStr);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };
  
  const handleAddNewAppointment = () => {
    const dateStr = window.prompt("상담을 등록할 날짜를 입력하세요 (YYYY-MM-DD 형식, ex)2025-08-13):");
    // 날짜 형식이 유효한지 간단히 확인
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      handleDateClick({ dateStr: dateStr });
    } else if (dateStr !== null) { // 사용자가 취소를 누르지 않았는데 형식이 틀린 경우
      alert("잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요.");
    }
  };

  const handleEventClick = async (clickInfo) => {
    try {
      const { data: appointment, error } = await supabase.from('Appointments').select(`*, Clients(*), Subjects!applied_subject_id(*), Branches(*), registered_subject:Subjects!registered_subject_id(*)`).eq('id', clickInfo.event.id).single();
      if (error) throw error;
      setEditingEvent(appointment);
      const eventTime = new Date(appointment.datetime).toTimeString().substring(0, 5);
      setFormData({
        client_name: appointment.Clients.name || '',
        client_contact: appointment.Clients.contact || '',
        branch_id: appointment.Branches.id || '',
        subject_id: appointment.Subjects.id || '',
        type: appointment.type || 'Online',
        time: eventTime,
        status: appointment.status || '상담 예정',
        comment: appointment.comment || '',
        cancellation_reason: appointment.cancellation_reason || '',
        registered_subject_id: appointment.registered_subject ? appointment.registered_subject.id : '',
        registration_type: appointment.registration_type || '',
        registration_months: appointment.registration_months || '',
        registration_amount: appointment.registration_amount || '',
        payment_method: appointment.payment_method || '',
        cancellation_type: appointment.cancellation_type || '',
        deduction_amount: appointment.deduction_amount || '',
        refund_amount: appointment.refund_amount || '',
      });
      setIsModalOpen(true);
    } catch (error) {
      alert('상담 정보를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleDatesSet = async (dateInfo) => {
    const year = dateInfo.view.currentStart.getFullYear();
    if (!fetchedYears.current.has(year)) {
      await fetchHolidays(year);
      fetchedYears.current.add(year);
    }
  };

  const fetchHolidays = async (year) => {
    try {
      const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
      const holidayEvents = response.data.map(holiday => ({
        title: holiday.localName,
        start: holiday.date,
        allDay: true,
        display: 'background',
        color: '#ffcdd2'
      }));
      setHolidays(prevHolidays => {
        const newHolidays = holidayEvents.filter(h => !prevHolidays.some(ph => ph.start === h.start));
        return [...prevHolidays, ...newHolidays];
      });
    } catch (error) {
      console.error("공휴일 정보를 불러오는 데 실패했습니다:", error);
    }
  };

  const dayCellClassNames = (arg) => {
    const adjustedDate = new Date(arg.date.getTime() + (9 * 60 * 60 * 1000));
    const dateString = adjustedDate.toISOString().split('T')[0];
    const isHoliday = holidays.some(h => h.start === dateString);
    if (isHoliday) {
      return ['fc-holiday'];
    }
    return [];
  };
  
  if (loading) return <h3>Loading...</h3>;
  if (!user) { navigate('/'); return null; }

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>상담 현황 대시보드</h1>
        <div>
          {profile && <span>{profile.name}({profile.role})님 환영합니다!</span>}
          {profile && (profile.role === 'Admin' || profile.role === 'Director') && (
            <Link to="/admin/branches" style={{ marginLeft: '10px', textDecoration: 'none', backgroundColor: '#6c757d', color: 'white', padding: '8px 12px', borderRadius: '5px' }}>
              관리자 메뉴
            </Link>
          )}
          <button onClick={handleLogout} style={{ marginLeft: '10px' }}>로그아웃</button>
        </div>
      </header>
      
      <div style={{ display: 'flex', gap: '20px', margin: '10px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>범례:</strong>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: color, borderRadius: '3px' }}></div>
            <span>{status}</span>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <strong>오늘 상담 현황:</strong>
          <span>총 {todayStats.total}건</span>
          <span>완료 {todayStats.done}건</span>
          <span>예정 {todayStats.left}건</span>
        </div>
        <button onClick={handleAddNewAppointment} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          + 새 상담 추가
        </button>
      </div>

      <main>
<FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay" // "day" 뷰가 기본
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth'
          }}
          events={[...events, ...holidays]}
          locale='ko'
          dayCellClassNames={dayCellClassNames}
          datesSet={handleDatesSet}
          editable={true}
          selectable={true}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime="09:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
        />
      </main>
      
      <AppointmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}>
        <form onSubmit={handleFormSubmit}>
          <h2>{editingEvent ? `상담 정보 수정 (ID: ${editingEvent.id})` : `새 상담 등록 (${selectedDate})`}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '15px' }}>
            <input type="text" name="client_name" placeholder="고객명" value={formData.client_name} onChange={handleFormChange} required />
            <input type="text" name="client_contact" placeholder="고객 연락처" value={formData.client_contact} onChange={handleFormChange} required />
            <select name="branch_id" value={formData.branch_id} onChange={handleFormChange} required>
              <option value="">지점 선택</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select name="subject_id" value={formData.subject_id} onChange={handleFormChange} required disabled={!formData.branch_id}>
              <option value="">과목 선택</option>
              {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <select name="type" value={formData.type} onChange={handleFormChange}>
              <option value="Online">온라인</option>
              <option value="Offline">오프라인</option>
            </select>
            <select name="time" value={formData.time} onChange={handleFormChange} required style={{ padding: '8px' }}>
              {Array.from({ length: 24 }, (_, i) => {
                const hour = String(Math.floor(i / 2) + 9).padStart(2, '0');
                const minute = i % 2 === 0 ? '00' : '30';
                if (parseInt(hour) > 20) return null;
                return (
                  <option key={`${hour}:${minute}`} value={`${hour}:${minute}`}>
                    {`${hour}:${minute}`}
                  </option>
                );
              })}
            </select>
            <hr/>
            <label>상담 상태</label>
            <select name="status" value={formData.status} onChange={handleFormChange}>
              <option value="상담 예정">상담 예정</option>
              <option value="상담 완료">상담 완료</option>
              <option value="등록">등록</option>
              <option value="상담 취소">상담 취소</option>
              <option value="취소/환불">취소/환불</option>
            </select>

            {formData.status === '등록' && (
              <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label>등록 유형</label>
                <select name="registration_type" value={formData.registration_type} onChange={handleFormChange}>
                  <option value="">선택</option>
                  <option value="국기">국기</option>
                  <option value="일반">일반</option>
                </select>

                {formData.registration_type === '일반' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <input type="number" name="registration_months" placeholder="등록 개월" value={formData.registration_months} onChange={handleFormChange} />
                    <input type="number" name="registration_amount" placeholder="등록 금액 (원)" value={formData.registration_amount} onChange={handleFormChange} />
                    <select name="payment_method" value={formData.payment_method} onChange={handleFormChange}>
                      <option value="">결제 방법 선택</option>
                      <option value="온라인:카드">온라인:카드</option>
                      <option value="온라인:계좌">온라인:계좌</option>
                      <option value="단말기">단말기</option>
                      <option value="회사 계좌">회사 계좌</option>
                    </select>
                  </div>
                )}
                
                <label style={{marginTop: '10px'}}>등록 과목</label>
                <select name="registered_subject_id" value={formData.registered_subject_id} onChange={handleFormChange} required>
                  <option value="">등록 과목 선택</option>
                  {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </div>
            )}

            {formData.status === '상담 취소' && (
              <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
                <label>취소 사유</label>
                <select name="cancellation_reason" value={formData.cancellation_reason} onChange={handleFormChange} required>
                  <option value="">취소 사유 선택</option>
                  <option value="부재">부재</option>
                  <option value="타기관 등록">타기관 등록</option>
                  <option value="개인 사유">개인 사유</option>
                </select>
              </div>
            )}
            
            {formData.status === '취소/환불' && (
              <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
                <label>취소/환불 유형</label>
                <select name="cancellation_type" value={formData.cancellation_type} onChange={handleFormChange}>
                    <option value="">선택</option>
                    <option value="국기 취소">국기 취소</option>
                    <option value="일반 환불">일반 환불</option>
                </select>

                {formData.cancellation_type === '일반 환불' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <input type="number" name="deduction_amount" placeholder="공제금 (원)" value={formData.deduction_amount} onChange={handleFormChange} />
                    <input type="number" name="refund_amount" placeholder="환불금 (원)" value={formData.refund_amount} onChange={handleFormChange} />
                  </div>
                )}
              </div>
            )}

            <label>코멘트</label>
            <textarea name="comment" value={formData.comment} onChange={handleFormChange} rows="4" placeholder="상담 내용이나 특이사항을 입력하세요..."></textarea>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
                {editingEvent ? '수정하기' : '저장하기'}
              </button>
              {editingEvent && (
                <button type="button" onClick={handleDelete} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}>
                  삭제하기
                </button>
              )}
            </div>
          </div>
        </form>
      </AppointmentModal>
    </div>
  );
}

export default Dashboard;