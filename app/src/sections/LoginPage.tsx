import { useState } from 'react';
import { useStore } from '@/store';
import { authApi, logtoApi, superAdminApi, api } from '@/api';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const setUser = useStore((s) => s.setUser);
  const setIsAuthenticated = useStore((s) => s.setIsAuthenticated);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login({ email, password });
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
    } catch (err: any) {
      setError(err?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register({ name, email, password, grade: grade || undefined, school: school || undefined });
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
    } catch (err: any) {
      setError(err?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogtoLogin = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { url } = await logtoApi.getAuthUrl(redirectUri);
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err?.message || 'Logto登录不可用，请先配置Logto应用');
    }
  };

  const handleSuperAdminLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const seedRes = await superAdminApi.seedSuperUser();
      const token = (seedRes as any).access_token;
      if (token) {
        api.setToken(token);
      }
      const res = await authApi.login({ email: 'user77@delta.ai', password: 'delta77admin' });
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
    } catch (err: any) {
      setError(err?.message || '超级管理员登录失败');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">Δ</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Delta 智学伴</h1>
          <p className="text-gray-500 mt-2">AI驱动的个性化学习伙伴</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm" data-testid="login-error">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入邮箱"
                data-testid="email-input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入密码"
                data-testid="password-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              data-testid="login-btn"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入姓名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入邮箱"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入密码（至少6位）"
                minLength={6}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="如：九年级"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学校</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="如：实验中学"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={switchMode}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            {mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
          </button>
        </div>

        <div className="mt-4">
          <button
            onClick={handleLogtoLogin}
            className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔐 Logto 统一认证登录
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleSuperAdminLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50 text-sm"
          >
            👑 77号超级管理员登录
          </button>
        </div>
      </div>
    </div>
  );
}
