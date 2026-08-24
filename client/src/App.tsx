import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import EventList from './pages/EventList';
import SeatMap from './pages/SeatMap';
import Checkout from './pages/Checkout';
import Offer from './pages/Offer';
import Login from './pages/Login';
import Register from './pages/Register';
import Bookings from './pages/Bookings';
import OrganiserDashboard from './pages/OrganiserDashboard';
import AdminVenues from './pages/AdminVenues';

function AuthButton() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');
  const userRole = localStorage.getItem('userRole');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  if (token) {
    return (
      <div className="flex items-center gap-6">
        <div className="flex gap-4 border-r border-slate-700 pr-6">
          <Link to="/" className="text-sm text-slate-300 hover:text-white font-medium transition-colors">Events</Link>
          {userRole === 'CUSTOMER' && <Link to="/bookings" className="text-sm text-slate-300 hover:text-white font-medium transition-colors">My Bookings</Link>}
          {userRole === 'ORGANISER' && <Link to="/organiser" className="text-sm text-slate-300 hover:text-white font-medium transition-colors">Dashboard</Link>}
          {userRole === 'ADMIN' && <Link to="/admin" className="text-sm text-slate-300 hover:text-white font-medium transition-colors">Admin</Link>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 font-mono hidden sm:block">{userEmail}</span>
          <button onClick={handleLogout} className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-medium text-slate-200">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link to="/register" className="text-sm text-slate-300 hover:text-white font-medium transition-colors">Sign Up</Link>
      <Link to="/login" className="text-sm px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium shadow-lg shadow-indigo-500/20">Sign In</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">TicketBooking</h1>
            </Link>
            <AuthButton />
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/organiser" element={<OrganiserDashboard />} />
            <Route path="/admin" element={<AdminVenues />} />
            <Route path="/shows/:id" element={<SeatMap />} />
            <Route path="/checkout/:holdId" element={<Checkout />} />
            <Route path="/offers/:token" element={<Offer />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
