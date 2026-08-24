import { useEffect, useState } from 'react';

interface Category { id: string; name: string; color: string; }
interface Venue { id: string; name: string; categories: Category[]; }

interface Event { id: string; title: string; type: string; }

interface ShowStat { eventId: string; eventTitle: string; showId: string; startsAt: string; ticketsSold: number; revenue: number; }
interface DashboardData { totalRevenue: number; totalTicketsSold: number; showStats: ShowStat[]; events: Event[]; }

export default function OrganiserDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eType, setEType] = useState('MOVIE');
  const [eDuration, setEDuration] = useState(120);
  const [ePoster, setEPoster] = useState('');

  const [isShowModalOpen, setIsShowModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sVenueId, setSVenueId] = useState('');
  const [sStartsAt, setSStartsAt] = useState('');
  const [sPrices, setSPrices] = useState<{categoryId: string, price: number}[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, venRes] = await Promise.all([
        fetch('http://localhost:4000/api/events/dashboard', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('http://localhost:4000/api/venues')
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (venRes.ok) setVenues(await venRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:4000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title: eTitle, description: eDesc, type: eType, durationMin: eDuration, posterUrl: ePoster })
      });
      if (res.ok) {
        setIsEventModalOpen(false);
        fetchData();
        setETitle(''); setEDesc(''); setEPoster('');
      } else {
        alert('Failed to create event');
      }
    } catch (e) {
      console.error(e);
    } finally { setIsCreating(false); }
  };

  const handleScheduleShow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch(`http://localhost:4000/api/events/${selectedEventId}/shows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ venueId: sVenueId, startsAt: sStartsAt, prices: sPrices, holdTtlSec: 600 })
      });
      if (res.ok) {
        setIsShowModalOpen(false);
        fetchData();
        setSStartsAt(''); setSVenueId(''); setSPrices([]);
      } else {
        alert('Failed to schedule show');
      }
    } catch (e) {
      console.error(e);
    } finally { setIsCreating(false); }
  };

  const openShowModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsShowModalOpen(true);
    setSVenueId('');
    setSPrices([]);
  };

  const handleVenueSelect = (vid: string) => {
    setSVenueId(vid);
    const v = venues.find(x => x.id === vid);
    if (v) setSPrices(v.categories.map(c => ({ categoryId: c.id, price: 10 })));
    else setSPrices([]);
  };

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;
  if (!data) return <div className="text-center py-10 text-red-400">Failed to load dashboard</div>;

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold">Organiser Dashboard</h2>
          <p className="text-slate-400">Manage your events and view performance.</p>
        </div>
        <button onClick={() => setIsEventModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors">
          + Create Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center">
          <div className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest">Total Revenue</div>
          <div className="text-4xl font-bold text-emerald-400">${data.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center">
          <div className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest">Tickets Sold</div>
          <div className="text-4xl font-bold text-indigo-400">{data.totalTicketsSold}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50">
            <h3 className="font-bold">Show Statistics</h3>
          </div>
          {data.showStats.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No shows scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Event</th>
                    <th className="px-6 py-4 font-medium">Starts At</th>
                    <th className="px-6 py-4 font-medium text-right">Tickets</th>
                    <th className="px-6 py-4 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.showStats.map(stat => (
                    <tr key={stat.showId} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-medium text-white">{stat.eventTitle}</td>
                      <td className="px-6 py-4 text-slate-300">{new Date(stat.startsAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">{stat.ticketsSold}</td>
                      <td className="px-6 py-4 text-right text-emerald-400 font-medium">${stat.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50">
            <h3 className="font-bold">My Events</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {data.events.map(ev => (
              <div key={ev.id} className="p-4 flex justify-between items-center hover:bg-slate-800/50">
                <div>
                  <div className="font-bold">{ev.title}</div>
                  <div className="text-xs text-slate-400">{ev.type}</div>
                </div>
                <button onClick={() => openShowModal(ev.id)} className="text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg font-medium transition-colors">
                  Schedule Show
                </button>
              </div>
            ))}
            {data.events.length === 0 && <div className="p-6 text-center text-slate-400">No events created yet.</div>}
          </div>
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Create Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input required value={eTitle} onChange={e => setETitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                <select value={eType} onChange={e => setEType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white">
                  <option value="MOVIE">Movie</option>
                  <option value="CONCERT">Concert</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4 mt-6">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" disabled={isCreating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/20">
                  {isCreating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE SHOW MODAL */}
      {isShowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Schedule Show</h3>
            <form onSubmit={handleScheduleShow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Starts At</label>
                <input type="datetime-local" required value={sStartsAt} onChange={e => setSStartsAt(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Venue</label>
                <select required value={sVenueId} onChange={e => handleVenueSelect(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white">
                  <option value="">Select a venue...</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              
              {sVenueId && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category Pricing</label>
                  {sPrices.map((p, i) => {
                    const cat = venues.find(v => v.id === sVenueId)?.categories.find(c => c.id === p.categoryId);
                    return (
                      <div key={p.categoryId} className="flex items-center gap-4 mb-2">
                        <span className="w-24 text-sm font-medium text-slate-400">{cat?.name}</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2 text-slate-500">$</span>
                          <input type="number" min="0" required value={p.price} onChange={e => { const n = [...sPrices]; n[i].price = parseFloat(e.target.value); setSPrices(n); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-white" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-4 pt-4 mt-6">
                <button type="button" onClick={() => setIsShowModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" disabled={isCreating || !sVenueId} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/20">
                  {isCreating ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
