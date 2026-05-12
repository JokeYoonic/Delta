import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '@/store';
import { logtoApi, api } from '@/api';

export function AuthCallback() {
  const navigate = useNavigate();
  const setUser = useStore((s) => s.setUser);
  const setIsAuthenticated = useStore((s) => s.setIsAuthenticated);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const redirectUri = `${window.location.origin}/auth/callback`;

    if (!code) {
      navigate('/');
      return;
    }

    (async () => {
      try {
        const res = await logtoApi.callback(code, redirectUri);
        api.setToken(res.access_token);
        setUser({
          id: res.user.id,
          name: res.user.name,
          avatar: res.user.avatar || '',
          grade: res.user.grade || '',
          school: res.user.school || '',
          role: res.user.role,
          points: res.user.points || 0,
          streakDays: res.user.streak_days || 0,
        });
        setIsAuthenticated(true);
        navigate('/');
      } catch (err) {
        console.error('Logto callback failed:', err);
        navigate('/');
      }
    })();
  }, [navigate, setUser, setIsAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在登录...</p>
      </div>
    </div>
  );
}
