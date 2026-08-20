import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  FileText,
  FolderOpen,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users
} from 'lucide-react';
import './styles.css';


/* =========================================================
   SUPABASE
   ========================================================= */

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   NAVIGATION
   ========================================================= */

const NAV = [
  ['home', 'Home', Home],
  ['friends', 'Network', Users],
  ['calendar', 'Calendar', CalendarDays],
  ['tasks', 'Tasks', CheckCircle2],
  ['docs', 'Documents', FolderOpen],
  ['courses', 'Courses', BookOpen],
  ['jobs', 'Career', BriefcaseBusiness],
  ['ai', 'ONSTOOD AI', Sparkles],
  ['profile', 'Profile', CircleUserRound]
];


/* =========================================================
   HELPERS
   ========================================================= */

function initials(profile) {
  const first = profile?.name?.trim()?.[0] || 'S';
  const last = profile?.surname?.trim()?.[0] || '';

  return `${first}${last}`.toUpperCase();
}

function Avatar({ profile, size = '' }) {
  return (
    <div className={`avatar ${size}`}>
      {initials(profile)}
    </div>
  );
}

function fmtDate(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
}


/* =========================================================
   AUTH
   ========================================================= */

function Auth({ onReady }) {
  const [mode, setMode] = useState('login');

  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    university: '',
    degree: '',
    year: ''
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function setField(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setMessage('');

    try {
      if (mode === 'login') {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password
          });

        if (error) {
          setMessage(error.message);
          return;
        }

        onReady(data.session);
        return;
      }

      const { data, error } =
        await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              surname: form.surname,
              university: form.university,
              degree: form.degree,
              year: form.year
            }
          }
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        onReady(data.session);
      } else {
        setMessage(
          'Check your email to verify your ONSTOOD account.'
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">

      <div className="auth-left">
        <div className="brand huge">
          ONSTOOD<span>.</span>
        </div>

        <h1>
          Your student life.
          <br />
          Connected.
        </h1>

        <p>
          One place for people, knowledge, documents,
          opportunities and the tools students need every day.
        </p>

        <div className="auth-pills">
          <span>Connect</span>
          <span>Learn</span>
          <span>Grow</span>
        </div>
      </div>


      <div className="auth-card">

        <div className="brand">
          ONSTOOD<span>.</span>
        </div>

        <p className="muted">
          The student network for the next generation.
        </p>

        <div className="tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setMessage('');
            }}
          >
            Sign in
          </button>

          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setMessage('');
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit}>

          {mode === 'register' && (
            <div className="grid2">
              <input
                placeholder="First name"
                value={form.name}
                onChange={e =>
                  setField('name', e.target.value)
                }
                required
              />

              <input
                placeholder="Last name"
                value={form.surname}
                onChange={e =>
                  setField('surname', e.target.value)
                }
                required
              />
            </div>
          )}

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e =>
              setField('email', e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            minLength="6"
            value={form.password}
            onChange={e =>
              setField('password', e.target.value)
            }
            required
          />

          {mode === 'register' && (
            <>
              <input
                placeholder="University"
                value={form.university}
                onChange={e =>
                  setField('university', e.target.value)
                }
              />

              <div className="grid2">

                <input
                  placeholder="Degree / field"
                  value={form.degree}
                  onChange={e =>
                    setField('degree', e.target.value)
                  }
                />

                <select
                  value={form.year}
                  onChange={e =>
                    setField('year', e.target.value)
                  }
                >
                  <option value="">
                    Study year
                  </option>

                  {[
                    'I',
                    'II',
                    'III',
                    'IV',
                    'Master I',
                    'Master II',
                    'PhD'
                  ].map(year => (
                    <option key={year}>
                      {year}
                    </option>
                  ))}
                </select>

              </div>
            </>
          )}

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <button
            className="btn primary full"
            disabled={busy}
          >
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in to ONSTOOD'
                : 'Create my account'}
          </button>

        </form>

        <small className="muted">
          Secure authentication powered by Supabase.
        </small>

      </div>
    </div>
  );
}


/* =========================================================
   APP
   ========================================================= */

function App({ session }) {

  const [section, setSection] = useState('home');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {

    let active = true;

    async function initialize() {

      try {

        const user = session?.user;

        if (!user) {
          if (active) {
            setLoading(false);
          }
          return;
        }

        /*
         * 1. Try to load existing profile
         */
        const { data, error } =
          await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
          console.error('Profile load error:', error);
        }

        /*
         * 2. If profile doesn't exist,
         * create it from Auth metadata.
         */
        if (!data) {

          const metadata = user.user_metadata || {};

          const newProfile = {
            id: user.id,
            name: metadata.name || 'Student',
            surname: metadata.surname || '',
            university: metadata.university || '',
            degree: metadata.degree || '',
            year: metadata.year || ''
          };

          const {
            data: createdProfile,
            error: createError
          } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {

            console.error(
              'Profile creation error:',
              createError
            );

            if (active) {
              setProfile(newProfile);
            }

          } else if (active) {

            setProfile(createdProfile);

          }

        } else if (active) {

          setProfile(data);

        }

      } catch (error) {

        console.error(
          'Application initialization error:',
          error
        );

      } finally {

        if (active) {
          setLoading(false);
        }

      }
    }

    initialize();

    return () => {
      active = false;
    };

  }, [session?.user?.id]);


  async function logout() {
    await supabase.auth.signOut();
  }


  function notify(message) {

    setToast(message);

    window.setTimeout(() => {
      setToast('');
    }, 2600);
  }


  if (loading) {
    return (
      <div className="loading">
        Loading ONSTOOD…
      </div>
    );
  }


  if (!profile) {
    return (
      <div className="loading">
        Unable to load your profile.
      </div>
    );
  }


  return (
    <div className="app-shell">

      {/* TOP BAR */}

      <header className="topbar">

        <button
          className="mobile-menu"
          onClick={() => setSection('home')}
        >
          ON
        </button>

        <div className="brand">
          ONSTOOD<span>.</span>
        </div>

        <div className="global-search">
          <Search size={17} />
          <input
            placeholder="Search students, courses, documents…"
          />
        </div>

        <div className="top-actions">

          <button
            className="icon-btn"
            onClick={() =>
              notify('Notifications will appear here.')
            }
          >
            <Bell size={19} />
          </button>

          <button
            className="icon-btn ai-icon"
            onClick={() => setSection('ai')}
          >
            <Sparkles size={19} />
          </button>

          <button
            className="avatar-button"
            onClick={() => setSection('profile')}
          >
            <Avatar profile={profile} />
          </button>

        </div>

      </header>


      <div className="app-grid">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <button
            className="profile-mini"
            onClick={() => setSection('profile')}
          >
            <Avatar profile={profile} />

            <div>
              <b>
                {profile.name} {profile.surname}
              </b>

              <small>
                {profile.university || 'Student'}
              </small>
            </div>
          </button>


          <nav>

            {NAV.map(([id, label, Icon]) => (

              <button
                key={id}
                className={
                  section === id
                    ? 'selected'
                    : ''
                }
                onClick={() => setSection(id)}
              >

                <Icon size={18} />

                <span>{label}</span>

                {id === 'ai' && (
                  <em>NEW</em>
                )}

              </button>

            ))}

          </nav>


          <button
            className="logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Sign out
          </button>

        </aside>


        {/* MAIN */}

        <main className="content">

          {section === 'home' && (
            <HomePage
              profile={profile}
              go={setSection}
              notify={notify}
            />
          )}

          {section === 'friends' && (
            <Friends
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'calendar' && (
            <Calendar
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'tasks' && (
            <Tasks
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'docs' && (
            <Documents
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'courses' && (
            <Courses />
          )}

          {section === 'jobs' && (
            <Career />
          )}

          {section === 'ai' && (
            <AI profile={profile} />
          )}

          {section === 'profile' && (
            <Profile
              profile={profile}
              setProfile={setProfile}
              notify={notify}
            />
          )}

        </main>


        {/* RIGHT SIDEBAR */}

        <aside className="rightbar">

          <div className="card ai-card">

            <div className="ai-badge">
              <Sparkles size={16} />
              ONSTOOD AI
            </div>

            <h3>
              Your student assistant.
            </h3>

            <p>
              Ask about your studies, organize your
              week or work with your documents.
            </p>

            <button
              className="btn primary full"
              onClick={() => setSection('ai')}
            >
              Open AI assistant
              <ChevronRight size={16} />
            </button>

          </div>


          <div className="card">

            <div className="card-head">
              <h3>Quick overview</h3>
              <Activity size={17} />
            </div>

            <div className="metric">
              <span>Tasks</span>
              <b>4</b>
            </div>

            <div className="metric">
              <span>Upcoming</span>
              <b>3</b>
            </div>

            <div className="metric">
              <span>Connections</span>
              <b>12</b>
            </div>

          </div>


          <div className="card tip">
            <b>ONSTOOD idea</b>
            <p>
              Knowledge becomes more valuable
              when students pass it to each other.
            </p>
          </div>

        </aside>

      </div>


      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

    </div>
  );
}


/* =========================================================
   HOME
   ========================================================= */

function HomePage({
  profile,
  go,
  notify
}) {

  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(true);
  const [counts, setCounts] = useState({});


  useEffect(() => {

    let active = true;

    async function loadFeed() {

      setBusy(true);

      const {
        data,
        error
      } = await supabase
        .from('posts')
        .select(`
          id,
          body,
          created_at,
          user_id,
          profiles (
            name,
            surname,
            university
          )
        `)
        .order('created_at', {
          ascending: false
        })
        .limit(30);

      if (error) {
        console.error('Feed error:', error);
      }

      if (!active) return;

      const rows = data || [];

      setPosts(rows);

      if (rows.length) {

        const ids = rows.map(post => post.id);

        const {
          data: likes
        } = await supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', ids);

        if (!active) return;

        const result = {};

        (likes || []).forEach(like => {
          result[like.post_id] =
            (result[like.post_id] || 0) + 1;
        });

        setCounts(result);

      }

      setBusy(false);
    }

    loadFeed();

    return () => {
      active = false;
    };

  }, []);


  async function publish() {

    if (!text.trim()) return;

    const {
      error
    } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        body: text.trim()
      });

    if (error) {
      notify(error.message);
      return;
    }

    setText('');

    notify('Post published.');

    window.location.reload();
  }


  async function like(postId) {

    const {
      data: existing
    } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .maybeSingle();


    if (existing) {

      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', profile.id);

    } else {

      await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: profile.id
        });

    }

    window.location.reload();
  }


  return (
    <>

      <section className="hero">

        <div>

          <span className="eyebrow">
            WELCOME TO ONSTOOD
          </span>

          <h1>
            Good to see you,
            {' '}
            {profile.name || 'student'}.
          </h1>

          <p>
            A smarter place to connect with students,
            discover knowledge and build your future.
          </p>

          <div className="hero-actions">

            <button
              className="btn light"
              onClick={() => go('ai')}
            >
              <Sparkles size={16} />
              Ask ONSTOOD AI
            </button>

            <button
              className="btn ghost"
              onClick={() => go('friends')}
            >
              <Users size={16} />
              Find students
            </button>

          </div>

        </div>

      </section>


      <div className="stat-row">

        <Stat
          label="Connections"
          value="12"
        />

        <Stat
          label="Upcoming"
          value="3"
        />

        <Stat
          label="Tasks this week"
          value="4"
        />

        <Stat
          label="Documents"
          value="0"
        />

      </div>


      <div className="section-title">

        <div>
          <span className="eyebrow dark">
            COMMUNITY
          </span>

          <h2>
            Student feed
          </h2>
        </div>

        <button
          className="btn subtle"
          onClick={() =>
            notify('Feed filters are coming next.')
          }
        >
          Latest
          <ChevronRight size={15} />
        </button>

      </div>


      <div className="feed-card card">

        <div className="composer">

          <Avatar profile={profile} />

          <textarea
            placeholder="Share something with your student community…"
            value={text}
            onChange={e =>
              setText(e.target.value)
            }
          />

          <button
            className="btn primary"
            onClick={publish}
          >
            <Send size={16} />
            Post
          </button>

        </div>

      </div>


      {busy ? (

        <div className="empty">
          Loading feed…
        </div>

      ) : posts.length === 0 ? (

        <div className="empty card">

          <MessageCircle />

          <h3>
            Your community starts here.
          </h3>

          <p>
            Be the first to share a note,
            question or useful resource.
          </p>

        </div>

      ) : (

        posts.map(post => (

          <Post
            key={post.id}
            post={post}
            count={counts[post.id] || 0}
            like={() => like(post.id)}
          />

        ))

      )}

    </>
  );
}


function Stat({
  label,
  value
}) {
  return (
    <div className="stat">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}


function Post({
  post,
  count,
  like
}) {

  const author = post.profiles || {};

  return (
    <article className="card post-card">

      <div className="post-author">

        <Avatar profile={author} />

        <div>

          <b>
            {author.name || 'Student'}
            {' '}
            {author.surname || ''}
          </b>

          <small>
            {author.university || 'ONSTOOD student'}
            {' · '}
            {fmtDate(post.created_at)}
          </small>

        </div>

      </div>


      <p className="post-body">
        {post.body}
      </p>


      <div className="post-actions">

        <button onClick={like}>
          <Heart
            size={16}
            fill={count ? 'currentColor' : 'none'}
          />
          {count}
        </button>

        <button>
          <MessageCircle size={16} />
          Comment
        </button>

        <button>
          <Send size={16} />
          Share
        </button>

      </div>

    </article>
  );
}


/* =========================================================
   GENERIC PAGE
   ========================================================= */

function Page({
  eyebrow,
  title,
  children,
  action
}) {

  return (
    <>
      <div className="page-heading">

        <div>

          <span className="eyebrow dark">
            {eyebrow}
          </span>

          <h1>
            {title}
          </h1>

        </div>

        {action}

      </div>

      {children}
    </>
  );
}


/* =========================================================
   NETWORK
   ========================================================= */

function Friends({
  profile,
  notify
}) {

  const [people, setPeople] = useState([]);
  const [requests, setRequests] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    let active = true;

    async function loadNetwork() {

      setLoading(true);

      const {
        data: peopleData
      } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          degree,
          year
        `)
        .neq('id', profile.id)
        .limit(50);


      const {
        data: requestData
      } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', profile.id)
        .eq('status', 'pending');


      if (!active) return;

      setPeople(peopleData || []);
      setRequests(requestData || []);
      setLoading(false);

    }

    loadNetwork();

    return () => {
      active = false;
    };

  }, [profile.id]);


  const filtered =
    people.filter(person =>
      `${person.name || ''} ${person.surname || ''} ${person.university || ''}`
        .toLowerCase()
        .includes(q.toLowerCase())
    );


  async function connect(receiverId) {

    const {
      error
    } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: profile.id,
        receiver_id: receiverId
      });


    if (error) {

      notify(
        error.code === '23505'
          ? 'Request already sent.'
          : error.message
      );

      return;
    }

    notify('Connection request sent.');
  }


  async function accept(requestId) {

    const {
      error
    } = await supabase
      .from('friend_requests')
      .update({
        status: 'accepted'
      })
      .eq('id', requestId);


    if (error) {
      notify(error.message);
      return;
    }

    notify('Connection accepted.');

    setRequests(current =>
      current.filter(request =>
        request.id !== requestId
      )
    );
  }


  return (
    <Page
      eyebrow="NETWORK"
      title="Students & connections"
      action={
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Find a student…"
            value={q}
            onChange={e =>
              setQ(e.target.value)
            }
          />
        </div>
      }
    >

      {requests.length > 0 && (

        <div className="card request-box">

          <b>
            Connection requests
          </b>

          {requests.map(request => (

            <div
              className="request"
              key={request.id}
            >

              <span>
                Someone wants to connect with you.
              </span>

              <button
                className="btn primary"
                onClick={() =>
                  accept(request.id)
                }
              >
                Accept
              </button>

            </div>

          ))}

        </div>

      )}


      {loading ? (

        <div className="empty">
          Loading students…
        </div>

      ) : (

        <div className="people-grid">

          {filtered.map(person => (

            <div
              className="card person"
              key={person.id}
            >

              <Avatar
                profile={person}
                size="lg"
              />

              <h3>
                {person.name} {person.surname}
              </h3>

              <p>
                {person.degree || 'Student'}
                {person.university
                  ? ` · ${person.university}`
                  : ''}
              </p>

              <button
                className="btn subtle full"
                onClick={() =>
                  connect(person.id)
                }
              >
                <UserPlus size={16} />
                Connect
              </button>

            </div>

          ))}

        </div>

      )}

    </Page>
  );
}


/* =========================================================
   CALENDAR
   ========================================================= */

function Calendar({
  profile,
  notify
}) {

  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: '',
    starts_at: '',
    location: ''
  });


  useEffect(() => {

    let active = true;

    async function loadEvents() {

      const {
        data,
        error
      } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', profile.id)
        .order('starts_at')
        .limit(50);

      if (error) {
        notify(error.message);
      }

      if (active) {
        setEvents(data || []);
      }
    }

    loadEvents();

    return () => {
      active = false;
    };

  }, [profile.id]);


  async function addEvent(event) {

    event.preventDefault();

    if (!form.title || !form.starts_at) {
      return;
    }


    const {
      error
    } = await supabase
      .from('calendar_events')
      .insert({
        user_id: profile.id,
        title: form.title,
        starts_at: new Date(
          form.starts_at
        ).toISOString(),
        location: form.location
      });


    if (error) {

      notify(error.message);

      return;
    }


    setForm({
      title: '',
      starts_at: '',
      location: ''
    });

    notify('Event added.');

    window.location.reload();
  }


  async function deleteEvent(id) {

    const {
      error
    } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setEvents(current =>
      current.filter(event =>
        event.id !== id
      )
    );
  }


  return (
    <Page
      eyebrow="PLANNER"
      title="Your calendar"
    >

      <div className="two-col">

        <div className="card">

          <h3>
            Upcoming
          </h3>

          {events.length === 0 ? (

            <div className="empty compact">
              No events yet.
            </div>

          ) : (

            events.map(event => (

              <div
                className="event-row"
                key={event.id}
              >

                <div className="event-date">
                  {new Date(
                    event.starts_at
                  ).getDate()}

                  <small>
                    {new Date(
                      event.starts_at
                    ).toLocaleString(
                      'en',
                      { month: 'short' }
                    )}
                  </small>
                </div>

                <div className="event-info">

                  <b>
                    {event.title}
                  </b>

                  <small>
                    {fmtDate(event.starts_at)}

                    {event.location
                      ? ` · ${event.location}`
                      : ''}
                  </small>

                </div>

                <button
                  className="icon-btn"
                  onClick={() =>
                    deleteEvent(event.id)
                  }
                >
                  <Trash2 size={15} />
                </button>

              </div>

            ))

          )}

        </div>


        <form
          className="card form-card"
          onSubmit={addEvent}
        >

          <h3>
            New event
          </h3>

          <input
            placeholder="Event title"
            value={form.title}
            onChange={e =>
              setForm({
                ...form,
                title: e.target.value
              })
            }
            required
          />

          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={e =>
              setForm({
                ...form,
                starts_at: e.target.value
              })
            }
            required
          />

          <input
            placeholder="Location / online link"
            value={form.location}
            onChange={e =>
              setForm({
                ...form,
                location: e.target.value
              })
            }
          />

          <button className="btn primary full">
            Save event
          </button>

        </form>

      </div>

    </Page>
  );
}


/* =========================================================
   TASKS
   ========================================================= */

function Tasks({
  profile,
  notify
}) {

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');


  useEffect(() => {

    let active = true;

    async function loadTasks() {

      const {
        data,
        error
      } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', profile.id)
        .order('done')
        .order('due_at', {
          ascending: true,
          nullsFirst: false
        });


      if (error) {
        notify(error.message);
      }

      if (active) {
        setTasks(data || []);
      }

    }

    loadTasks();

    return () => {
      active = false;
    };

  }, [profile.id]);


  async function addTask(event) {

    event.preventDefault();

    if (!title.trim()) return;

    const {
      error
    } = await supabase
      .from('tasks')
      .insert({
        user_id: profile.id,
        title: title.trim()
      });

    if (error) {
      notify(error.message);
      return;
    }

    setTitle('');

    window.location.reload();
  }


  async function toggleTask(task) {

    const {
      error
    } = await supabase
      .from('tasks')
      .update({
        done: !task.done
      })
      .eq('id', task.id)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setTasks(current =>
      current.map(item =>
        item.id === task.id
          ? { ...item, done: !item.done }
          : item
      )
    );
  }


  async function deleteTask(id) {

    const {
      error
    } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setTasks(current =>
      current.filter(task =>
        task.id !== id
      )
    );
  }


  return (
    <Page
      eyebrow="ORGANIZE"
      title="Tasks"
      action={
        <span className="muted">
          Stay one step ahead.
        </span>
      }
    >

      <form
        className="card task-add"
        onSubmit={addTask}
      >

        <input
          placeholder="What needs to be done?"
          value={title}
          onChange={e =>
            setTitle(e.target.value)
          }
        />

        <button className="btn primary">
          <Plus size={16} />
          Add
        </button>

      </form>


      <div className="card">

        {tasks.length === 0 ? (

          <div className="empty compact">
            No tasks. Add your first one above.
          </div>

        ) : (

          tasks.map(task => (

            <div
              className={
                `task ${task.done ? 'done' : ''}`
              }
              key={task.id}
            >

              <button
                className="check"
                onClick={() =>
                  toggleTask(task)
                }
              >
                {task.done && (
                  <Check size={15} />
                )}
              </button>

              <span>
                {task.title}
              </span>

              <button
                className="icon-btn"
                onClick={() =>
                  deleteTask(task.id)
                }
              >
                <Trash2 size={15} />
              </button>

            </div>

          ))

        )}

      </div>

    </Page>
  );
}


/* =========================================================
   DOCUMENTS
   ========================================================= */

function Documents({
  profile,
  notify
}) {

  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);


  useEffect(() => {

    let active = true;

    async function loadDocuments() {

      const {
        data,
        error
      } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', {
          ascending: false
        });


      if (error) {
        notify(error.message);
      }

      if (active) {
        setDocs(data || []);
      }

    }

    loadDocuments();

    return () => {
      active = false;
    };

  }, [profile.id]);


  async function upload(event) {

    const file =
      event.target.files?.[0];

    if (!file) return;

    setBusy(true);

    try {

      const path =
        `${profile.id}/${crypto.randomUUID()}-${file.name}`;


      const {
        error: uploadError
      } = await supabase
        .storage
        .from('student-documents')
        .upload(path, file);


      if (uploadError) {
        notify(uploadError.message);
        return;
      }


      const {
        error: dbError
      } = await supabase
        .from('documents')
        .insert({
          user_id: profile.id,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type
        });


      if (dbError) {
        notify(dbError.message);
        return;
      }


      notify('Document uploaded.');

      window.location.reload();

    } finally {

      setBusy(false);

    }
  }


  async function openDocument(document) {

    const {
      data,
      error
    } = await supabase
      .storage
      .from('student-documents')
      .createSignedUrl(
        document.storage_path,
        300
      );


    if (error) {

      notify(error.message);

      return;
    }


    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }


  return (
    <Page
      eyebrow="YOUR SPACE"
      title="Documents"
      action={
        <label className="btn primary upload-btn">

          <Upload size={16} />

          {busy
            ? 'Uploading…'
            : 'Upload document'}

          <input
            type="file"
            onChange={upload}
            hidden
          />

        </label>
      }
    >

      <div className="card dropzone">

        <FileText size={28} />

        <h3>
          Your private study library
        </h3>

        <p>
          Store PDFs and course files securely.
          ONSTOOD AI will work with them
          in the next phase.
        </p>

      </div>


      <div className="doc-grid">

        {docs.map(document => (

          <button
            className="card doc"
            key={document.id}
            onClick={() =>
              openDocument(document)
            }
          >

            <FileText />

            <div>

              <b>
                {document.file_name}
              </b>

              <small>
                {fmtDate(
                  document.created_at
                )}
              </small>

            </div>

          </button>

        ))}

      </div>

    </Page>
  );
}


/* =========================================================
   COURSES
   ========================================================= */

function Courses() {

  const courses = [
    'Accounting & Finance',
    'Microeconomics',
    'Statistics',
    'Management',
    'Public Finance',
    'Business Law'
  ];


  return (
    <Page
      eyebrow="LEARN"
      title="Courses"
      action={
        <button
          className="btn subtle"
        >
          <Plus size={16} />
          Add course
        </button>
      }
    >

      <div className="course-grid">

        {courses.map((course, index) => (

          <div
            className="card course"
            key={course}
          >

            <div className="course-icon">
              <BookOpen size={19} />
            </div>

            <span className="eyebrow dark">
              SEMESTER {index % 2 + 1}
            </span>

            <h3>
              {course}
            </h3>

            <p>
              Course workspace, materials,
              notes and classmates.
            </p>

            <button className="btn subtle">
              Open course
              <ChevronRight size={15} />
            </button>

          </div>

        ))}

      </div>

    </Page>
  );
}


/* =========================================================
   CAREER
   ========================================================= */

function Career() {

  const jobs = [
    'Finance Intern · Tirana',
    'Junior Data Analyst · Remote Europe',
    'Marketing Assistant · Hybrid'
  ];


  return (
    <Page
      eyebrow="FUTURE"
      title="Career & opportunities"
    >

      <div className="card career-hero">

        <div>

          <span className="eyebrow">
            COMING INTO FOCUS
          </span>

          <h2>
            Your next opportunity belongs here.
          </h2>

          <p>
            Internships, student jobs,
            graduate roles and projects
            will live in the same network
            as your university life.
          </p>

        </div>

        <BriefcaseBusiness size={48} />

      </div>


      <div className="job-grid">

        {jobs.map(job => (

          <div
            className="card job"
            key={job}
          >

            <span>
              NEW
            </span>

            <h3>
              {job}
            </h3>

            <p>
              Student-friendly opportunity
              · Posted recently
            </p>

            <button className="btn subtle">
              View opportunity
              <ChevronRight size={15} />
            </button>

          </div>

        ))}

      </div>

    </Page>
  );
}


/* =========================================================
   AI
   ========================================================= */

function AI({
  profile
}) {

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text:
        `Hi ${profile?.name || 'there'} — I’m ONSTOOD AI. ` +
        `The interface is ready. Next we connect ` +
        `the secure AI layer to your study context.`
    }
  ]);

  const [text, setText] = useState('');


  function send(event) {

    event.preventDefault();

    if (!text.trim()) return;

    const question = text.trim();

    setMessages(current => [
      ...current,
      {
        role: 'me',
        text: question
      },
      {
        role: 'ai',
        text:
          'I’ve received your question. The production AI ' +
          'layer will answer using your courses, calendar ' +
          'and approved documents.'
      }
    ]);

    setText('');
  }


  return (
    <Page
      eyebrow="YOUR ASSISTANT"
      title="ONSTOOD AI"
    >

      <div className="ai-page card">

        <div className="ai-intro">

          <div className="ai-badge">
            <Sparkles size={16} />
            ONSTOOD AI
          </div>

          <h2>
            Your student assistant.
          </h2>

          <p>
            One interface for questions,
            planning, study support and
            eventually your private knowledge base.
          </p>

        </div>


        <div className="chat">

          {messages.map((message, index) => (

            <div
              key={index}
              className={
                message.role === 'me'
                  ? 'bubble me'
                  : 'bubble'
              }
            >
              {message.text}
            </div>

          ))}

        </div>


        <form
          className="chat-input"
          onSubmit={send}
        >

          <input
            placeholder="Ask anything about your student life…"
            value={text}
            onChange={e =>
              setText(e.target.value)
            }
          />

          <button className="btn primary">
            <Send size={16} />
          </button>

        </form>

      </div>

    </Page>
  );
}


/* =========================================================
   PROFILE
   ========================================================= */

function Profile({
  profile,
  setProfile,
  notify
}) {

  const [form, setForm] =
    useState(profile || {});

  const [busy, setBusy] =
    useState(false);


  useEffect(() => {

    setForm(profile || {});

  }, [profile]);


  function updateField(key, value) {

    setForm(current => ({
      ...current,
      [key]: value
    }));

  }


  async function save(event) {

    event.preventDefault();

    setBusy(true);


    const payload = {
      name: form.name || '',
      surname: form.surname || '',
      university: form.university || '',
      degree: form.degree || '',
      year: form.year || ''
    };


    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .single();


    if (error) {

      notify(error.message);

    } else {

      setProfile(data);

      notify('Profile updated.');

    }


    setBusy(false);
  }


  return (
    <Page
      eyebrow="YOU"
      title="Profile"
    >

      <form
        className="card profile-card"
        onSubmit={save}
      >

        <div className="profile-banner">

          <Avatar
            profile={form}
            size="xl"
          />

          <div>

            <h2>
              {form.name} {form.surname}
            </h2>

            <p>
              {form.university || 'Student'}
              {' · '}
              {form.degree || 'Choose your field'}
            </p>

          </div>

        </div>


        <div className="grid2">

          <label>
            First name

            <input
              value={form.name || ''}
              onChange={e =>
                updateField(
                  'name',
                  e.target.value
                )
              }
            />
          </label>


          <label>
            Last name

            <input
              value={form.surname || ''}
              onChange={e =>
                updateField(
                  'surname',
                  e.target.value
                )
              }
            />
          </label>


          <label>
            University

            <input
              value={form.university || ''}
              onChange={e =>
                updateField(
                  'university',
                  e.target.value
                )
              }
            />
          </label>


          <label>
            Degree

            <input
              value={form.degree || ''}
              onChange={e =>
                updateField(
                  'degree',
                  e.target.value
                )
              }
            />
          </label>


          <label>
            Study year

            <input
              value={form.year || ''}
              onChange={e =>
                updateField(
                  'year',
                  e.target.value
                )
              }
            />
          </label>

        </div>


        <button
          className="btn primary"
          disabled={busy}
        >
          {busy
            ? 'Saving…'
            : 'Save profile'}
        </button>

      </form>

    </Page>
  );
}


/* =========================================================
   ROOT / AUTH SESSION
   ========================================================= */

function Root() {

  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    let mounted = true;


    async function start() {

      const {
        data,
        error
      } = await supabase.auth.getSession();


      if (error) {
        console.error(
          'Session error:',
          error
        );
      }


      if (mounted) {

        setSession(
          data?.session || null
        );

        setLoading(false);

      }

    }


    start();


    const {
      data: authData
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {

        setSession(newSession);

      }
    );


    return () => {

      mounted = false;

      authData.subscription.unsubscribe();

    };

  }, []);


  if (loading) {

    return (
      <div className="loading">
        Starting ONSTOOD…
      </div>
    );

  }


  if (!session) {

    return (
      <Auth
        onReady={setSession}
      />
    );

  }


  return (
    <App
      session={session}
    />
  );
}


/* =========================================================
   START APPLICATION
   ========================================================= */

createRoot(
  document.getElementById('root')
).render(
  <Root />
);