import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface OfferData {
  offer: {
    id: string;
    expiresAt: string;
    token: string;
  };
  showSeat: {
    seat: { rowLabel: string; seatNumber: number };
    category: { name: string; price: string };
  };
}

export default function Offer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OfferData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:4000/api/offers/${token}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json().then(d => ({ ok: res.ok, body: d })))
      .then(({ ok, body }) => {
        if (!ok) setError(body.error?.message || 'Failed to load offer');
        else setData(body);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/offers/${token}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error?.message || 'Failed to accept offer');
        return;
      }
      
      // Successfully accepted, now it's a hold, redirect to checkout
      navigate(`/checkout/${resData.holdId}`, { state: { expiresAt: resData.expiresAt } });
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  if (loading) return <div className="text-center py-10">Loading offer...</div>;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl text-center">
      <h2 className="text-2xl font-bold mb-4">Waitlist Seat Available!</h2>
      <p className="text-slate-300 mb-6">
        Great news! A seat has opened up for your waitlisted category.
      </p>
      
      <div className="bg-slate-900 rounded-lg p-6 mb-8 text-left">
        <div className="text-sm text-slate-400 mb-1">Seat</div>
        <div className="text-xl font-bold mb-4">{data.showSeat.seat.rowLabel}{data.showSeat.seat.seatNumber}</div>
        
        <div className="text-sm text-slate-400 mb-1">Category</div>
        <div className="font-semibold mb-4">{data.showSeat.category.name}</div>
        
        <div className="text-sm text-slate-400 mb-1">Price</div>
        <div className="font-semibold">${Number(data.showSeat.category.price).toFixed(2)}</div>
      </div>

      <div className="text-sm text-red-400 mb-6">
        This offer expires at {new Date(data.offer.expiresAt).toLocaleString()}.
      </div>

      <button 
        onClick={handleAccept}
        className="w-full py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg shadow-green-500/20"
      >
        Accept Offer & Checkout
      </button>
    </div>
  );
}
