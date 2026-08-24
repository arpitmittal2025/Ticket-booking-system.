import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Show {
  id: string;
  startsAt: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  type: string;
  shows: Show[];
}

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="text-center py-10">Loading events...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Upcoming Events</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-blue-900/20 transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <span className="text-xs font-medium px-2 py-1 bg-slate-700 text-slate-300 rounded-full">{event.type}</span>
              </div>
              <p className="text-slate-400 text-sm mb-6 line-clamp-2">{event.description}</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Available Shows</h4>
                {event.shows.length === 0 ? (
                  <p className="text-sm text-slate-500">No shows scheduled.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {event.shows.map(show => (
                      <Link 
                        key={show.id} 
                        to={`/shows/${show.id}`}
                        className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded hover:bg-indigo-500 hover:text-white transition-colors"
                      >
                        {new Date(show.startsAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
