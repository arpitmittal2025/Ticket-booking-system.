import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

interface Seat {
  showSeatId: string;
  seatId: string;
  categoryId: string;
  rowLabel: string;
  seatNumber: number;
  rowIndex: number;
  colIndex: number;
  isAisle: boolean;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'OFFERED';
}

interface Category {
  id: string;
  name: string;
  color: string;
  price: string;
}

interface Venue {
  id: string;
  name: string;
  rows: number;
  cols: number;
}

interface ShowSeatMapData {
  show: { id: string; startsAt: string; status: string };
  venue: Venue;
  categories: Category[];
  seats: Seat[];
}

export default function SeatMap() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShowSeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:4000/api/shows/${id}/seatmap`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);

    const socket = io('http://localhost:4000');
    socket.emit('joinShow', id);

    socket.on('seatUpdate', (updates: { seatId: string, status: Seat['status'] }[]) => {
      setData(prevData => {
        if (!prevData) return prevData;
        const newSeats = prevData.seats.map(seat => {
          const update = updates.find(u => u.seatId === seat.seatId);
          if (update) {
            return { ...seat, status: update.status };
          }
          return seat;
        });
        return { ...prevData, seats: newSeats };
      });
    });

    return () => {
      socket.emit('leaveShow', id);
      socket.disconnect();
    };
  }, [id]);

  if (loading) return <div className="text-center py-10">Loading seat map...</div>;
  if (!data) return <div className="text-center py-10">Failed to load show</div>;

  const { venue, categories, seats, show } = data;

  const getSeatColor = (seat: Seat) => {
    if (seat.isAisle) return 'transparent';
    if (seat.status !== 'AVAILABLE') return '#334155'; // slate-700
    const cat = categories.find(c => c.id === seat.categoryId);
    return cat ? cat.color : '#cbd5e1';
  };

  const getSeatCursor = (seat: Seat) => {
    if (seat.isAisle || seat.status !== 'AVAILABLE') return 'not-allowed';
    return 'pointer';
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.isAisle || seat.status !== 'AVAILABLE') return;
    setSelectedSeatIds(prev => 
      prev.includes(seat.seatId)
        ? prev.filter(sId => sId !== seat.seatId)
        : [...prev, seat.seatId]
    );
  };

  const handleHoldSeats = async () => {
    if (selectedSeatIds.length === 0) return;
    try {
      // Assuming customer token is available or will be handled by a proper auth context
      // For now we'll just send a placeholder or whatever is in localStorage
      const token = localStorage.getItem('token') || 'dummy-token';
      const res = await fetch(`http://localhost:4000/api/shows/${id}/holds`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ seatIds: selectedSeatIds })
      });
      const resData = await res.json();
      
      if (!res.ok) {
        alert(resData.error?.message || 'Failed to hold seats');
        // If 409 conflict, ideally refresh seatmap here
        return;
      }
      
      navigate(`/checkout/${resData.holdId}`, { state: { expiresAt: resData.expiresAt } });
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <Link to="/" className="text-slate-400 hover:text-white">&larr; Back to Events</Link>
        <h2 className="text-2xl font-bold">Select Seats</h2>
        <div className="ml-auto text-sm text-slate-400">
          {new Date(show.startsAt).toLocaleString()} at {venue.name}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Map Area */}
        <div className="flex-1 overflow-x-auto bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="w-full text-center mb-8 border-b-2 border-indigo-500/50 pb-2 text-indigo-400 font-bold uppercase tracking-widest text-sm">Screen / Stage</div>
          
          <div 
            className="inline-grid gap-1 mx-auto" 
            style={{ 
              gridTemplateRows: `repeat(${venue.rows}, minmax(0, 1fr))`,
              gridTemplateColumns: `repeat(${venue.cols}, minmax(0, 1fr))`
            }}
          >
            {seats.map(seat => (
              <div 
                key={seat.showSeatId}
                title={seat.isAisle ? 'Aisle' : `${seat.rowLabel}${seat.seatNumber} - ${categories.find(c=>c.id===seat.categoryId)?.name}`}
                onClick={() => toggleSeat(seat)}
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center text-[10px] font-medium transition-transform 
                  ${seat.status === 'AVAILABLE' && !seat.isAisle ? 'hover:scale-110 active:scale-95 shadow-sm' : ''} 
                  ${selectedSeatIds.includes(seat.seatId) ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg' : ''}
                `}
                style={{
                  gridRow: seat.rowIndex + 1,
                  gridColumn: seat.colIndex + 1,
                  backgroundColor: getSeatColor(seat),
                  cursor: getSeatCursor(seat),
                  opacity: seat.isAisle ? 0 : 1,
                }}
              >
                {!seat.isAisle && <span className="text-slate-900 opacity-60">{seat.rowLabel}{seat.seatNumber}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="w-full lg:w-64 space-y-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              {categories.map(cat => (
                <div key={cat.id} className="flex flex-col gap-2 p-2 border border-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }}></div>
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-medium">${Number(cat.price).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      const res = await fetch(`http://localhost:4000/api/shows/${id}/waitlist`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}` },
                        body: JSON.stringify({ categoryId: cat.id, seatsWanted: 1 })
                      });
                      const d = await res.json();
                      if (res.ok) alert('Successfully joined waitlist for ' + cat.name);
                      else alert(d.error?.message || 'Failed to join waitlist');
                    }}
                    className="text-xs w-full py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    Join Waitlist
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700">
                <div className="w-4 h-4 rounded bg-slate-700"></div>
                <span className="text-slate-400">Unavailable</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-300">Selected Seats:</span>
              <span className="font-bold text-lg">{selectedSeatIds.length}</span>
            </div>
            <button 
              onClick={handleHoldSeats}
              disabled={selectedSeatIds.length === 0}
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Hold Seats & Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
