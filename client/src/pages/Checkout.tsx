import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function Checkout() {
  const { holdId } = useParams<{ holdId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const expiresAtStr = location.state?.expiresAt;

  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAtStr) return;
    
    const expiresAt = new Date(expiresAtStr).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((expiresAt - now) / 1000);
      
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        alert('Your hold has expired.');
        navigate('/'); // redirect back to events
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAtStr, navigate]);

  const handleRelease = async () => {
    try {
      await fetch(`http://localhost:4000/api/holds/${holdId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // assuming we stored token
        }
      });
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ holdId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || 'Failed to complete booking');
        return;
      }
      alert(`Booking successful! Your reference is ${data.reference}. Email sent!`);
      navigate('/'); // in a real app, go to /bookings
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  if (!expiresAtStr) {
    return <div className="text-center py-10">Invalid checkout session</div>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-800">
          <h2 className="text-3xl font-bold text-white">Checkout</h2>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-400 mb-1">Time remaining</div>
            <div className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-slate-300">Complete your booking details below.</p>
          {/* Phase 4 Booking Form will go here */}
          
          <div className="flex gap-4 pt-6 mt-6 border-t border-slate-800">
            <button 
              onClick={handleRelease}
              className="px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel Hold
            </button>
            <button 
              onClick={handleCheckout}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
            >
              Pay Now (Complete Booking)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
