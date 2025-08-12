import { useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1단계: 일반 사용자로 회원가입 요청
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error('회원가입 후 사용자 정보를 받아오지 못했습니다.');

      // 2단계: RLS를 우회하기 위해 관리자 클라이언트로 Profiles 정보 추가
      const { error: profileError } = await supabaseAdmin
        .from('Profiles')
        .insert({
          id: user.id,
          name: formData.name,
          email: formData.email,
          role: 'Counselor',
          status: 'Active',
        });

      if (profileError) throw profileError;

      alert('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.');
      navigate('/');

    } catch (error) {
      alert('회원가입 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px', width: '300px' }}>
        <h2>회원가입</h2>
        <input type="text" name="name" placeholder="이름" value={formData.name} onChange={handleInputChange} required style={{ padding: '8px' }} />
        <input type="email" name="email" placeholder="이메일" value={formData.email} onChange={handleInputChange} required style={{ padding: '8px' }} />
        <input type="password" name="password" placeholder="비밀번호 (6자 이상)" value={formData.password} onChange={handleInputChange} required style={{ padding: '8px' }} />
        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer' }}>
          {loading ? '가입 중...' : '가입하기'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          이미 계정이 있으신가요? <Link to="/">로그인</Link>
        </p>
      </form>
    </div>
  );
}

export default SignUp;