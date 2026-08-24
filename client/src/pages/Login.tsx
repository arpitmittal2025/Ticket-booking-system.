import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }
      
      // Save token and navigate
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userRole', data.user.role);
      navigate('/');
    } catch (err) {
      setError('Network error. Is the backend running?');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Login</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="customer@example.com"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="password123"
            required
          />
        </div>
        
        <button 
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-3 transition-colors shadow-lg shadow-indigo-500/25 mt-2"
        >
          Sign In
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-slate-400">
        Don't have an account? <Link to="/register" className="text-indigo-400 hover:text-indigo-300">Sign up</Link>
      </p>
    </div>
  );
}
