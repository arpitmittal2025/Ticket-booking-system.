import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  rows: number;
  cols: number;
  categories: Category[];
}

export default function AdminVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vName, setVName] = useState('');
  const [vAddress, setVAddress] = useState('');
  const [vRows, setVRows] = useState(10);
  const [vCols, setVCols] = useState(20);
  const [vCats, setVCats] = useState([{ name: 'Premium', color: '#8b5cf6' }, { name: 'Standard', color: '#3b82f6' }]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchVenues = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/venues', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setVenues(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      // 1. Create Venue
      const vRes = await fetch('http://localhost:4000/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: vName, address: vAddress, rows: vRows, cols: vCols, categories: vCats })
      });
      
      if (!vRes.ok) throw new Error('Failed to create venue');
      const venue = await vRes.json();
      
      // 2. Generate Seats Payload
      const seats = [];
      const catsCount = venue.categories.length;
      const rowsPerCat = Math.ceil(vRows / catsCount);
      
      for (let r = 0; r < vRows; r++) {
        const rowLabel = String.fromCharCode(65 + r); // A, B, C...
        // simple distribution: split rows evenly across categories
        const catIndex = Math.min(Math.floor(r / rowsPerCat), catsCount - 1);
        const categoryId = venue.categories[catIndex].id;
        
        for (let c = 0; c < vCols; c++) {
          seats.push({
            rowLabel,
            seatNumber: c + 1,
            rowIndex: r,
            colIndex: c,
            isAisle: false,
            categoryId
          });
        }
      }

      // 3. Post Seats
      await fetch(`http://localhost:4000/api/venues/${venue.id}/seats/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ seats })
      });

      // Cleanup
      setIsModalOpen(false);
      fetchVenues();
      setVName(''); setVAddress(''); setVRows(10); setVCols(20);
    } catch (err) {
      console.error(err);
      alert('Error creating venue');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading venues...</div>;

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-slate-400">Manage venues and seating configurations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors"
        >
          + Create Venue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map(venue => (
          <div key={venue.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-1">{venue.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{venue.address}</p>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-slate-800 rounded-lg px-3 py-1.5 flex flex-col items-center flex-1">
                  <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Rows</span>
                  <span className="font-mono text-lg">{venue.rows}</span>
                </div>
                <div className="bg-slate-800 rounded-lg px-3 py-1.5 flex flex-col items-center flex-1">
                  <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Cols</span>
                  <span className="font-mono text-lg">{venue.cols}</span>
                </div>
                <div className="bg-slate-800 rounded-lg px-3 py-1.5 flex flex-col items-center flex-1">
                  <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Seats</span>
                  <span className="font-mono text-lg">{venue.rows * venue.cols}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {venue.categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-800 flex justify-between items-center text-sm">
              <span className="text-slate-500 font-mono text-xs">{venue.id.split('-')[0]}</span>
            </div>
          </div>
        ))}
        {venues.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            No venues found. Create one to get started.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Create New Venue</h3>
            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Venue Name</label>
                <input required value={vName} onChange={e => setVName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <input required value={vAddress} onChange={e => setVAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Grid Rows</label>
                  <input type="number" min="1" max="26" required value={vRows} onChange={e => setVRows(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Grid Columns</label>
                  <input type="number" min="1" max="50" required value={vCols} onChange={e => setVCols(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Categories (Premium / Standard)</label>
                {vCats.map((cat, i) => (
                  <div key={i} className="flex gap-3 mb-2">
                    <input required value={cat.name} onChange={e => { const n = [...vCats]; n[i].name = e.target.value; setVCats(n); }} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm" placeholder="Name" />
                    <input type="color" value={cat.color} onChange={e => { const n = [...vCats]; n[i].color = e.target.value; setVCats(n); }} className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800" />
                    <button type="button" onClick={() => setVCats(vCats.filter((_, idx) => idx !== i))} className="px-3 text-red-400 hover:text-red-300 bg-red-400/10 rounded-xl text-sm">X</button>
                  </div>
                ))}
                <button type="button" onClick={() => setVCats([...vCats, { name: 'New Cat', color: '#ff0000' }])} className="text-sm text-indigo-400 hover:text-indigo-300 mt-1">+ Add Category</button>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" disabled={isCreating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/20">
                  {isCreating ? 'Generating...' : 'Create & Generate Seats'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
