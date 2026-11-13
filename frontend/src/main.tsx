
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera, Search, MapPin, BookOpen, MessageCircle,
  ArrowLeft, ExternalLink, Building2, AlertCircle,
  Sun, Moon, CalendarDays, Home, Layers, Heart,
  Menu, X, ChevronRight, ArrowUpRight,
  GraduationCap, Compass, ShieldCheck, Clock,
  Upload
} from 'lucide-react';
import './index.css';

const API = import.meta.env.VITE_API_URL || '';

const EVENT_URL = 'https://events.mtu.edu/';
const ROZSA_URL =
  'https://www.mtu.edu/rozsa/events-and-programs/calendar/';
const CAMPUS_MAP = 'https://map.mtu.edu/';

type Source = {
  title: string;
  url: string;
  checked_at?: string;
};

type Item = {
  id?: number;
  name?: string;
  room_number?: string;
  room_type?: string;
  notes?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  source?: Source;
};

type Building = {
  id: number;
  name: string;
  abbreviation: string;
  description: string;
  address: string;
  map_url: string;
  campus_map_number?: number;
  source?: Source;
  departments?: Item[];
  offices?: Item[];
  rooms?: Item[];
  events?: Item[];
  classes?: Item[];
};

type LiveEvent = {
  title: string;
  location: string;
  start_time: string;
  url: string;
  source: string;
};

type EventsResponse = {
  events: LiveEvent[];
  status: 'live' | 'cached' | 'unavailable';
  building?: string;
};

type Prediction = {
  status: string;
  building_id: number | null;
  confidence?: string;
  evidence?: string;
  message?: string;
  provider?: string;
};

type Page =
  | 'Home'
  | 'Buildings'
  | 'Events'
  | 'Ask CampusLens';

type BuildingTab =
  | 'Overview'
  | 'Departments & offices'
  | 'Events'
  | 'Classes & rooms'
  | 'Location'
  | 'Ask CampusLens';

const tabs: BuildingTab[] = [
  'Overview',
  'Departments & offices',
  'Events',
  'Classes & rooms',
  'Location',
  'Ask CampusLens'
];

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API}${url}`, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();

      if (typeof data.detail === 'string') {
        message = data.detail;
      }
    } catch {
      // Keep the HTTP error message.
    }

    throw new Error(message);
  }

  return response.json();
}

function SourceLink({ source }: { source?: Source }) {
  if (!source?.url) return null;

  return (
    <a
      className="source-link"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {source.title || 'Official source'}
      <ExternalLink size={13} />
    </a>
  );
}

function LiveEventCards({
  events,
  status
}: {
  events: LiveEvent[];
  status: string;
}) {
  if (status === 'loading') {
    return (
      <div className="empty-record">
        <CalendarDays size={20} />
        Loading upcoming university events...
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="empty-record">
        <AlertCircle size={20} />
        The university calendar is temporarily unavailable.
        Please check the official calendar.
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="empty-record">
        <CalendarDays size={20} />
        No upcoming events were found for this location.
      </div>
    );
  }

  return (
    <>
      <p className="muted">
        {events.length} upcoming event
        {events.length === 1 ? '' : 's'} found
        {status === 'cached' ? ' (cached results)' : ''}.
      </p>

      <div className="items-grid">
        {events.map((event, index) => {
          const date = new Date(event.start_time);

          const formattedDate = Number.isNaN(date.getTime())
            ? event.start_time
            : date.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'America/Detroit'
              });

          return (
            <article
              className="item-card"
              key={`${event.title}-${event.start_time}-${index}`}
            >
              <span className="eyebrow">
                <CalendarDays size={14} />
                MTU EVENT
              </span>

              <h3>{event.title}</h3>

              <p>
                <Clock size={15} />
                {' '}{formattedDate}
              </p>

              <p>
                <MapPin size={15} />
                {' '}{event.location}
              </p>

              <a
                className="source-link"
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View official event
                <ExternalLink size={14} />
              </a>
            </article>
          );
        })}
      </div>
    </>
  );
}

function Items({
  items,
  empty
}: {
  items?: Item[];
  empty: string;
}) {
  if (!items?.length) {
    return (
      <div className="empty-record">
        <ShieldCheck size={20} />
        {empty}
      </div>
    );
  }

  return (
    <div className="items-grid">
      {items.map((item, index) => (
        <article
          className="item-card"
          key={item.id ?? index}
        >
          <strong>
            {item.name ||
              item.title ||
              (item.room_number
                ? `Room ${item.room_number}`
                : 'Record')}
          </strong>

          {item.room_type && <p>{item.room_type}</p>}
          {item.description && <p>{item.description}</p>}
          {item.notes && <p>{item.notes}</p>}

          {item.start_time && (
            <p>
              <Clock size={13} />
              {item.start_time}
              {item.end_time ? ` – ${item.end_time}` : ''}
            </p>
          )}

          <SourceLink source={item.source} />
        </article>
      ))}
    </div>
  );
}

function App() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);

  const [prediction, setPrediction] =
    useState<Prediction | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const [tab, setTab] = useState<BuildingTab>('Overview');

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSources, setAnswerSources] =
    useState<Source[]>([]);
  const [chatBusy, setChatBusy] = useState(false);

  const [page, setPage] = useState<Page>('Home');
  const [mobileMenu, setMobileMenu] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('campuslens-theme') === 'light'
      ? 'light'
      : 'dark'
  );

  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('campuslens-favorites') || '[]'
      );
    } catch {
      return [];
    }
  });

  // LIVE EVENTS STATE
  const [liveEvents, setLiveEvents] =
    useState<LiveEvent[]>([]);
  const [eventsStatus, setEventsStatus] =
    useState('loading');

  const [buildingEvents, setBuildingEvents] =
    useState<LiveEvent[]>([]);
  const [buildingEventsStatus, setBuildingEventsStatus] =
    useState('loading');

  // THEME
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('campuslens-theme', theme);
  }, [theme]);

  // FAVORITES
  useEffect(() => {
    localStorage.setItem(
      'campuslens-favorites',
      JSON.stringify(favorites)
    );
  }, [favorites]);

  // LOAD BUILDINGS
  useEffect(() => {
    request<Building[]>('/api/buildings')
      .then(setBuildings)
      .catch(e => setError(e.message));
  }, []);

  // CLEAN UP IMAGE PREVIEWS
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // LOAD ALL UPCOMING MTU EVENTS
  useEffect(() => {
    let cancelled = false;

    request<EventsResponse>('/api/events')
      .then(data => {
        if (cancelled) return;
        setLiveEvents(data.events);
        setEventsStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) {
          setEventsStatus('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // LOAD EVENTS FOR THE SELECTED BUILDING
  useEffect(() => {
    if (!selected || tab !== 'Events') return;

    let cancelled = false;

    setBuildingEvents([]);
    setBuildingEventsStatus('loading');

    request<EventsResponse>(
      `/api/buildings/${selected.id}/events`
    )
      .then(data => {
        if (cancelled) return;

        setBuildingEvents(data.events);
        setBuildingEventsStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) {
          setBuildingEventsStatus('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, tab]);

  const filtered = useMemo(() => {
    const search = query.toLowerCase();

    return buildings.filter(building =>
      `${building.name} ${building.abbreviation} ${building.description}`
        .toLowerCase()
        .includes(search)
    );
  }, [buildings, query]);

  function navigate(destination: Page) {
    setPage(destination);
    setSelected(null);
    setMobileMenu(false);
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function openBuilding(id: number) {
    setLoading(true);
    setError('');

    try {
      const building = await request<Building>(
        `/api/buildings/${id}`
      );

      setSelected(building);
      setPage('Buildings');
      setPrediction(null);
      setTab('Overview');
      setQuestion('');
      setAnswer('');
      setAnswerSources([]);

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function chooseFile(file?: File) {
    if (!file) return;

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (
      !allowed.includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError(
        'Please select a JPG, PNG or WebP image under 8 MB.'
      );
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setPrediction(null);
    setError('');
  }

  async function analyze() {
    if (!photo) return;

    setLoading(true);
    setError('');
    setPrediction(null);

    const form = new FormData();
    form.append('file', photo);

    try {
      const result = await request<Prediction>(
        '/api/recognize',
        {
          method: 'POST',
          body: form
        }
      );

      setPrediction(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();

    if (!selected || question.trim().length < 2) {
      return;
    }

    setChatBusy(true);
    setAnswer('');

    try {
      const response = await request<{
        answer: string;
        sources: Source[];
      }>('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          building_id: selected.id,
          question
        })
      });

      setAnswer(response.answer);
      setAnswerSources(response.sources || []);
    } catch (e) {
      setAnswer(String(e));
    } finally {
      setChatBusy(false);
    }
  }

  function toggleFavorite(id: number) {
    setFavorites(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );
  }

  const nav: [Page, React.ReactNode][] = [
    ['Home', <Home size={18} />],
    ['Buildings', <Building2 size={18} />],
    ['Events', <CalendarDays size={18} />],
    ['Ask CampusLens', <MessageCircle size={18} />]
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate('Home')}
        >
          <span className="brand-symbol">
  <img
    src="/images/husky-icon.png"
    alt="Michigan Tech Husky icon"
    className="brand-logo-img"
  />
</span>

          <span className="brand-text">
            <strong>
              MTU <em>CampusLens</em>
            </strong>
            <small>
              Michigan Technological University · Student project
            </small>
          </span>
        </button>

        <nav className="topnav">
          {nav.map(([destination, icon]) => (
            <button
              key={destination}
              className={
                page === destination ? 'active' : ''
              }
              onClick={() => navigate(destination)}
            >
              {icon}
              {destination}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <button
            className="icon-btn"
            aria-label="Switch theme"
            title="Switch light/dark theme"
            onClick={() =>
              setTheme(current =>
                current === 'dark' ? 'light' : 'dark'
              )
            }
          >
            {theme === 'dark'
              ? <Sun size={19} />
              : <Moon size={19} />}
          </button>

          <button
            className="icon-btn mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside
          className={`sidebar ${mobileMenu ? 'open' : ''}`}
        >
          <div className="side-label">DISCOVER</div>

          {nav.map(([destination, icon]) => (
            <button
              key={destination}
              className={`side-item ${
                page === destination ? 'active' : ''
              }`}
              onClick={() => navigate(destination)}
            >
              {icon}
              {destination}
            </button>
          ))}

          <div className="side-divider" />

          <div className="side-label">
            CAMPUS RESOURCES
          </div>

          <a
            className="side-item"
            href={CAMPUS_MAP}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={18} />
            Campus map
            <ExternalLink size={13} />
          </a>

          <a
            className="side-item"
            href={EVENT_URL}
            target="_blank"
            rel="noreferrer"
          >
            <CalendarDays size={18} />
            MTU events
            <ExternalLink size={13} />
          </a>

          <a
            className="side-item"
            href={ROZSA_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Compass size={18} />
            Rozsa Center
            <ExternalLink size={13} />
          </a>

          <a
            className="side-item"
            href="https://www.mtu.edu/registrar/"
            target="_blank"
            rel="noreferrer"
          >
            <GraduationCap size={18} />
            Registrar
            <ExternalLink size={13} />
          </a>

          <div className="side-divider" />

          <div className="side-label">YOUR SPACE</div>

          <div className="side-item">
            <Heart size={18} />
            {favorites.length} saved buildings
          </div>

          <div className="side-foot">
            <span>✦ CAMPUSLENS</span>
            <p>
              Built by students. Grounded in public MTU information.
            </p>
          </div>
        </aside>

        <main className="main-area">
          {error && (
            <div className="error-box" role="alert">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {selected ? (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setSelected(null);
                  setPage('Buildings');
                }}
              >
                <ArrowLeft size={17} />
                All buildings
              </button>

              <div className="building-banner">
                <span className="eyebrow">
                  BUILDING {selected.campus_map_number ?? '—'}
                  {' '}· CAMPUSLENS
                </span>

                <h1>{selected.name}</h1>

                <p>
                  <MapPin size={17} />
                  {selected.address}
                </p>

                <button
                  className={`favorite-btn ${
                    favorites.includes(selected.id)
                      ? 'saved'
                      : ''
                  }`}
                  onClick={() => toggleFavorite(selected.id)}
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.includes(selected.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  {favorites.includes(selected.id)
                    ? 'Saved'
                    : 'Save building'}
                </button>
              </div>

              <div className="tabs">
                {tabs.map(value => (
                  <button
                    key={value}
                    className={
                      tab === value ? 'active' : ''
                    }
                    onClick={() => setTab(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <section className="content-card">
                {tab === 'Overview' && (
                  <>
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">
                          BUILDING PROFILE
                        </span>
                        <h2>About this building</h2>
                      </div>
                      <ShieldCheck className="accent" />
                    </div>

                    <p className="body-copy">
                      {selected.description}
                    </p>

                    <div className="metric-row">
                      <div>
                        <Building2 size={21} />
                        <strong>
                          {(selected.departments?.length || 0) +
                            (selected.offices?.length || 0)}
                        </strong>
                        <span>
                          Verified departments & offices
                        </span>
                      </div>

                      <div>
                        <BookOpen size={21} />
                        <strong>
                          {selected.rooms?.length || 0}
                        </strong>
                        <span>Verified rooms</span>
                      </div>

                      <div>
                        <CalendarDays size={21} />
                        <strong>
                          {selected.events?.length || 0}
                        </strong>
                        <span>Curated events</span>
                      </div>
                    </div>

                    <SourceLink source={selected.source} />

                    <p className="disclaimer">
                      Building records are curated snapshots.
                      Check the Events tab for live calendar listings.
                    </p>
                  </>
                )}

                {tab === 'Departments & offices' && (
                  <>
                    <h2>Departments</h2>

                    <Items
                      items={selected.departments}
                      empty="No verified department records are loaded."
                    />

                    <h2 className="subhead">
                      Offices & facilities
                    </h2>

                    <Items
                      items={selected.offices}
                      empty="No verified office records are loaded."
                    />
                  </>
                )}

                {tab === 'Events' && (
                  <>
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">
                          LIVE CAMPUS CALENDAR
                        </span>
                        <h2>Events at {selected.name}</h2>
                      </div>
                      <CalendarDays className="accent" />
                    </div>

                    <p className="muted">
                      Upcoming events retrieved from Michigan
                      Tech's official university calendar.
                    </p>

                    <LiveEventCards
                      events={buildingEvents}
                      status={buildingEventsStatus}
                    />

                    <div className="resource-buttons">
                      <a
                        href={EVENT_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official MTU events
                        <ArrowUpRight size={16} />
                      </a>

                      <a
                        href={ROZSA_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Rozsa calendar
                        <ArrowUpRight size={16} />
                      </a>
                    </div>
                  </>
                )}

                {tab === 'Classes & rooms' && (
                  <>
                    <h2>Verified rooms</h2>

                    <Items
                      items={selected.rooms}
                      empty="No verified room records are loaded."
                    />

                    <h2 className="subhead">
                      Published classes
                    </h2>

                    <Items
                      items={selected.classes}
                      empty="No verified class schedules are loaded."
                    />
                  </>
                )}

                {tab === 'Location' && (
                  <>
                    <h2>Find this building</h2>

                    <p className="body-copy">
                      {selected.address}
                    </p>

                    <a
                      className="gold-btn inline"
                      href={selected.map_url || CAMPUS_MAP}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={17} />
                      Open official campus map
                      <ArrowUpRight size={16} />
                    </a>
                  </>
                )}

                {tab === 'Ask CampusLens' && (
                  <>
                    <h2>Ask CampusLens</h2>

                    <p className="muted">
                      Ask about {selected.abbreviation}.
                      Answers use curated building records
                      and cite available sources.
                    </p>

                    <form
                      className="ask-form"
                      onSubmit={ask}
                    >
                      <input
                        value={question}
                        onChange={e =>
                          setQuestion(e.target.value)
                        }
                        minLength={2}
                        maxLength={500}
                        placeholder="Which departments are in this building?"
                      />

                      <button
                        className="gold-btn"
                        disabled={
                          chatBusy ||
                          question.trim().length < 2
                        }
                      >
                        {chatBusy ? 'Thinking…' : 'Ask AI'}
                        <ArrowUpRight size={17} />
                      </button>
                    </form>

                    {answer && (
                      <div className="answer">
                        <MessageCircle size={19} />

                        <div>
                          <p>{answer}</p>

                          {answerSources.map((source, index) => (
                            <SourceLink
                              key={index}
                              source={source}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          ) : page === 'Home' ? (
            <>
              <section className="hero">
                <div className="hero-inner">
                  <span className="eyebrow">
                    ✦ EXPLORE MICHIGAN TECH
                  </span>

                  <h1>
                    Discover MTU
                    <br />
                    buildings, events
                    <br />
                    <em>& resources.</em>
                  </h1>

                  <p>
                    Identify a building from a photo,
                    explore verified campus information,
                    and ask questions with AI.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="gold-btn"
                      onClick={() => navigate('Buildings')}
                    >
                      <Camera size={18} />
                      Identify a building
                    </button>

                    <button
                      className="outline-btn"
                      onClick={() => navigate('Buildings')}
                    >
                      Explore buildings
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div className="hero-art campus-photo">
  <img
    src="/images/mtu-campus.webp"
    alt="Aerial view of Michigan Technological University campus"
    className="campus-hero-image"
  />

  <span className="campus-photo-label">
    <MapPin size={14} />
    MICHIGAN TECH · HOUGHTON, MI
  </span>
</div>
              </section>

              <div className="quick-actions">
                <button
                  onClick={() => navigate('Buildings')}
                >
                  <Camera />
                  <span>
                    <strong>Identify a building</strong>
                    <small>
                      Upload a photo for AI recognition
                    </small>
                  </span>
                  <ChevronRight />
                </button>

                <button
                  onClick={() => navigate('Buildings')}
                >
                  <Layers />
                  <span>
                    <strong>Explore buildings</strong>
                    <small>
                      Browse supported campus locations
                    </small>
                  </span>
                  <ChevronRight />
                </button>

                <button
                  onClick={() => navigate('Events')}
                >
                  <CalendarDays />
                  <span>
                    <strong>Campus events</strong>
                    <small>
                      Live university calendar listings
                    </small>
                  </span>
                  <ChevronRight />
                </button>

                <button
                  onClick={() => navigate('Ask CampusLens')}
                >
                  <MessageCircle />
                  <span>
                    <strong>Ask CampusLens</strong>
                    <small>
                      Grounded answers about buildings
                    </small>
                  </span>
                  <ChevronRight />
                </button>
              </div>

              <div className="home-columns">
                <section className="content-card">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">
                        WHAT'S HAPPENING
                      </span>
                      <h2>Campus events</h2>
                    </div>

                    <button
                      className="text-action"
                      onClick={() => navigate('Events')}
                    >
                      Explore
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="event-promo">
                    <CalendarDays size={30} />

                    <div>
                      <strong>
                        Upcoming events at Michigan Tech
                      </strong>

                      {eventsStatus === 'loading' ? (
                        <p>Loading university events...</p>
                      ) : eventsStatus === 'unavailable' ? (
                        <p>
                          The live calendar is temporarily
                          unavailable.
                        </p>
                      ) : (
                        <p>
                          {liveEvents.length} upcoming
                          university events retrieved.
                        </p>
                      )}

                      <button
                        className="text-action"
                        onClick={() => navigate('Events')}
                      >
                        Explore events
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>

                  {liveEvents.slice(0, 2).map((event, index) => (
                    <div
                      className="event-promo"
                      key={`${event.start_time}-${index}`}
                    >
                      <CalendarDays size={26} />

                      <div>
                        <strong>{event.title}</strong>

                        <p>
                          {new Date(
                            event.start_time
                          ).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'America/Detroit'
                          })}
                        </p>

                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View event
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="content-card">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">
                        START EXPLORING
                      </span>
                      <h2>Featured buildings</h2>
                    </div>

                    <button
                      className="text-action"
                      onClick={() => navigate('Buildings')}
                    >
                      View all
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="featured-grid">
                    {buildings.slice(0, 4).map(building => (
                      <button
                        key={building.id}
                        className="featured-tile"
                        onClick={() =>
                          openBuilding(building.id)
                        }
                      >
                        <span className="tile-icon">
                          <Building2 size={23} />
                        </span>

                        <span>
                          <strong>{building.name}</strong>
                          <small>
                            {building.abbreviation}
                          </small>
                        </span>

                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="trust-line">
                <ShieldCheck size={18} />
                Information is sourced from public
                university pages. This is an independent
                student prototype, not an official MTU application.
              </div>
            </>
          ) : page === 'Buildings' ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  EXPLORE THE CAMPUS
                </span>

                <h1>Find your next destination.</h1>

                <p>
                  Upload a photo for an AI suggestion or
                  choose a building from the curated directory.
                </p>
              </div>

              <div className="explore-grid">
                <section className="content-card">
                  <h2>
                    <Camera size={23} />
                    Identify a building
                  </h2>

                  <p className="muted">
                    JPG, PNG or WebP · up to 8 MB
                  </p>

                  <label className="upload-zone">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={e =>
                        chooseFile(e.target.files?.[0])
                      }
                    />

                    {preview ? (
                      <img
                        src={preview}
                        alt="Uploaded building"
                      />
                    ) : (
                      <>
                        <Upload size={34} />
                        <strong>
                          Upload or take a photo
                        </strong>
                        <span>
                          AI will suggest a supported
                          campus building
                        </span>
                      </>
                    )}
                  </label>

                  <button
                    className="gold-btn wide"
                    disabled={!photo || loading}
                    onClick={analyze}
                  >
                    {loading
                      ? 'Analyzing photo…'
                      : 'Recognize building'}
                    <ArrowUpRight size={17} />
                  </button>

                  {prediction && (
                    <div className="prediction">
                      <strong>
                        {prediction.status === 'recognized'
                          ? 'AI building suggestion'
                          : 'Recognition uncertain'}
                      </strong>

                      <p>{prediction.message}</p>

                      {prediction.evidence && (
                        <p>
                          Visible evidence:
                          {' '}{prediction.evidence}
                        </p>
                      )}

                      {prediction.building_id && (
                        <>
                          <h3>
                            {buildings.find(
                              building =>
                                building.id ===
                                prediction.building_id
                            )?.name}
                          </h3>

                          <small>
                            Confidence:
                            {' '}{prediction.confidence}
                            {' '}· Provider:
                            {' '}{prediction.provider}
                          </small>

                          <button
                            className="gold-btn"
                            onClick={() =>
                              openBuilding(
                                prediction.building_id!
                              )
                            }
                          >
                            Confirm and explore
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </section>

                <section className="content-card">
                  <h2>
                    <Search size={23} />
                    Browse campus buildings
                  </h2>

                  <p className="muted">
                    Works without an AI key.
                  </p>

                  <div className="search-field">
                    <Search size={18} />

                    <input
                      value={query}
                      onChange={e =>
                        setQuery(e.target.value)
                      }
                      placeholder="Search buildings, departments…"
                    />
                  </div>

                  <div className="building-results">
                    {filtered.map(building => (
                      <button
                        key={building.id}
                        onClick={() =>
                          openBuilding(building.id)
                        }
                      >
                        <span className="tile-icon">
                          <Building2 size={20} />
                        </span>

                        <span>
                          <strong>{building.name}</strong>
                          <small>
                            {building.abbreviation}
                          </small>
                        </span>

                        <ChevronRight size={17} />
                      </button>
                    ))}

                    {!filtered.length && (
                      <p className="muted">
                        No matching supported buildings.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : page === 'Events' ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  CAMPUS LIFE
                </span>

                <h1>What's happening at MTU?</h1>

                <p>
                  Discover upcoming university events,
                  performances, and campus activities
                  from Michigan Tech's official calendar.
                </p>
              </div>

              <section className="content-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      LIVE UNIVERSITY CALENDAR
                    </span>

                    <h2>Upcoming MTU events</h2>
                  </div>

                  <CalendarDays className="accent" />
                </div>

                <LiveEventCards
                  events={liveEvents}
                  status={eventsStatus}
                />

                <div className="resource-buttons">
                  <a
                    href={EVENT_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Full MTU calendar
                    <ArrowUpRight size={16} />
                  </a>

                  <a
                    href={ROZSA_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Rozsa performances
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  YOUR AI CAMPUS GUIDE
                </span>

                <h1>Ask CampusLens.</h1>

                <p>
                  Choose a supported building to ask
                  grounded questions about its departments,
                  rooms, and public information.
                </p>
              </div>

              <div className="content-card">
                <h2>Choose a building to start</h2>

                <div className="building-results">
                  {buildings.map(building => (
                    <button
                      key={building.id}
                      onClick={async () => {
                        await openBuilding(building.id);
                        setTab('Ask CampusLens');
                      }}
                    >
                      <span className="tile-icon">
                        <MessageCircle size={19} />
                      </span>

                      <span>
                        <strong>{building.name}</strong>
                        <small>
                          Ask about {building.abbreviation}
                        </small>
                      </span>

                      <ChevronRight size={17} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <footer className="footer">
            <span>
              © 2026 MTU CampusLens · Student prototype
            </span>

            <span>
              Not affiliated with or endorsed by
              Michigan Technological University.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
