import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface BookingSeat {
  pricePaid: string;
  showSeat: {
    seat: { rowLabel: string; seatNumber: number };
  };
}

interface Booking {
  id: string;
  reference: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  show: {
    startsAt: string;
    event: { title: string };
    venue: { name: string };
  };
  bookingSeats: BookingSeat[];
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/bookings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      const res = await fetch(`http://localhost:4000/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        alert('Booking cancelled');
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Failed to cancel');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-center py-10">Loading bookings...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium">&larr; Browse Events</Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 mb-4">You don't have any bookings yet.</p>
          <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium">Find an event to attend</Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">{booking.show.event.title}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {booking.status}
                  </span>
                </div>
                
                <p className="text-slate-400 text-sm">
                  {new Date(booking.show.startsAt).toLocaleString()} • {booking.show.venue.name}
                </p>
                
                <div className="pt-2 text-sm text-slate-300">
                  <span className="text-slate-500 mr-2">Seats:</span>
                  {booking.bookingSeats.map(bs => `${bs.showSeat.seat.rowLabel}${bs.showSeat.seat.seatNumber}`).join(', ')}
                </div>
                
                <div className="text-sm text-slate-300">
                  <span className="text-slate-500 mr-2">Ref:</span>
                  <span className="font-mono">{booking.reference}</span>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 w-full md:w-auto">
                <div className="text-2xl font-bold">${Number(booking.totalAmount).toFixed(2)}</div>
                {booking.status === 'CONFIRMED' && (
                  <button 
                    onClick={() => cancelBooking(booking.id)}
                    className="ml-auto md:ml-0 text-sm px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
