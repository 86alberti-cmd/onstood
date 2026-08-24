import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Activity,
  AlertTriangle,
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
  Mail,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Database,
  Globe2,
  LockKeyhole,
  Monitor,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import './styles.css';

const ONSTOOD_BUILD = 'V27-SIMPLE-DELETE-CONFIRM';
console.info(`ONSTOOD ${ONSTOOD_BUILD} loaded`);


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
  ['messages', 'Messages', Mail],
  ['calendar', 'Calendar', CalendarDays],
  ['tasks', 'Tasks', CheckCircle2],
  ['docs', 'Documents', FolderOpen],
  ['courses', 'Courses', BookOpen],
  ['jobs', 'Career', BriefcaseBusiness],
  ['ai', 'ONSTOOD AI', Sparkles],
  ['profile', 'Profile', CircleUserRound],
  ['settings', 'Settings', Settings]
];

const EMPLOYER_NAV = [
  ['jobs', 'Career', BriefcaseBusiness],
  ['messages', 'Messages', Mail],
  ['profile', 'Company Profile', CircleUserRound],
  ['settings', 'Settings', Settings]
];

const VALID_SECTIONS = new Set([
  ...NAV.map(([id]) => id),
  'admin'
]);

const NOTIFICATION_SECTION_BY_KIND = {
  friend_request: 'friends',
  message: 'messages',
  message_mention: 'messages',
  direct_post: 'messages',
  calendar: 'calendar',
  calendar_reminder: 'calendar',
  task: 'tasks',
  task_reminder: 'tasks',
  document: 'docs',
  course: 'courses',
  job: 'jobs',
  job_match: 'jobs',
  post_like: 'home',
  post_comment: 'home'
};

const NOTIFICATION_KINDS_BY_SECTION = {
  friends: ['friend_request'],
  messages: ['message', 'message_mention', 'direct_post'],
  calendar: ['calendar', 'calendar_reminder'],
  tasks: ['task', 'task_reminder'],
  docs: ['document'],
  courses: ['course'],
  jobs: ['job', 'job_match'],
  home: ['post_like', 'post_comment']
};

function getInitialSection() {
  try {
    const saved = window.sessionStorage.getItem('onstood.activeSection');
    return VALID_SECTIONS.has(saved) ? saved : 'home';
  } catch {
    return 'home';
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

function initials(profile) {
  const first =
    profile?.name?.trim()?.[0] || 'S';

  const last =
    profile?.surname?.trim()?.[0] || '';

  return `${first}${last}`.toUpperCase();
}



function fmtDate(value) {
  if (!value) return '';

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);

  } catch {
    return '';
  }
}


function safeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function safeDay(value) {
  const date =
    safeDate(value);

  return date
    ? date.getDate()
    : '—';
}


function safeMonth(value) {
  const date =
    safeDate(value);

  if (!date) {
    return '';
  }

  try {
    return date.toLocaleString(
      'en',
      {
        month: 'short'
      }
    );
  } catch {
    return '';
  }
}


function Avatar({
  profile,
  size = '',
  onImageClick
}) {

  const [src, setSrc] =
    useState(null);


  useEffect(() => {

    let active = true;


    async function loadAvatar() {

      const path =
        profile?.avatar_url;


      if (!path) {

        if (active) {
          setSrc(null);
        }

        return;
      }


      /*
       * Compatibility with an existing
       * complete URL.
       */

      if (
        path.startsWith('http://') ||
        path.startsWith('https://')
      ) {

        if (active) {
          setSrc(path);
        }

        return;
      }


      const {
        data,
        error
      } = await supabase.storage
        .from('avatars')
        .createSignedUrl(
          path,
          60 * 60
        );


      if (
        !error &&
        data?.signedUrl &&
        active
      ) {

        setSrc(data.signedUrl);

      } else if (active) {

        setSrc(null);

      }

    }


    loadAvatar();


    return () => {
      active = false;
    };

  }, [profile?.avatar_url]);


  function handleImageClick(event) {

    event.stopPropagation();

    if (
      src &&
      typeof onImageClick === 'function'
    ) {

      onImageClick(src);

    }

  }


  return (

    <div
      className={`avatar ${size}`}
      onClick={
        src && onImageClick
          ? handleImageClick
          : undefined
      }
      style={{
        cursor:
          src && onImageClick
            ? 'zoom-in'
            : 'default'
      }}
      title={
        src && onImageClick
          ? 'View profile photo'
          : undefined
      }
    >

      {src ? (

        <img
          src={src}
          alt={
            `${profile?.name || ''} ${profile?.surname || ''}`
              .trim()
          }
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit',
            display: 'block'
          }}
        />

      ) : (

        initials(profile)

      )}

    </div>

  );
}

   /* 
   =========================================================
   AUTH
   ========================================================= */

function Auth({ onReady }) {

  const [mode, setMode] = useState('login');

  const [form, setForm] = useState({
    account_type: 'student',
    name: '',
    surname: '',
    email: '',
    password: '',
    confirm_password: '',
    university: '',
    degree: '',
    year: '',
    company_name: '',
    company_website: '',
    company_role: '',
    company_description: ''
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');


  function setField(key, value) {

    setForm(current => ({
      ...current,
      [key]: value
    }));

  }


  async function continueWithGoogle() {

    try {

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo:
              window.location.origin
          }
        });


      if (error) {
        setMessage(error.message);
      }

    } catch (error) {

      setMessage(
        error?.message ||
        'Could not continue with Google.'
      );

    }

  }


  async function submit(event) {

    event.preventDefault();

    setBusy(true);
    setMessage('');

    try {

      /* 
      =========================
         LOGIN
      ========================= 
      */

      if (mode === 'login') {

        const {
          data,
          error
        } = await supabase.auth.signInWithPassword({
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


      /* 
      =========================
         CREATE ACCOUNT
      ========================= 
      */

      if (form.password.length < 8) {
        setMessage(
          'Password must be at least 8 characters.'
        );
        return;
      }

      if (form.password !== form.confirm_password) {
        setMessage(
          'Passwords do not match.'
        );
        return;
      }

      const {
        data,
        error
      } = await supabase.auth.signUp({

        email: form.email,
        password: form.password,

        options: {

          emailRedirectTo:
            `${window.location.origin}/confirm-signup`,

          data: {
            account_type:
              form.account_type || 'student',
            name: form.name,
            surname: form.surname,
            university:
              form.account_type === 'student'
                ? form.university
                : '',
            degree:
              form.account_type === 'student'
                ? form.degree
                : '',
            year:
              form.account_type === 'student'
                ? form.year
                : '',
            company_name:
              form.account_type === 'employer'
                ? form.company_name
                : '',
            company_website:
              form.account_type === 'employer'
                ? form.company_website
                : '',
            company_role:
              form.account_type === 'employer'
                ? form.company_role
                : '',
            company_description:
              form.account_type === 'employer'
                ? form.company_description
                : ''
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


  	/* 
	=========================
    	 GOOGLE LOGIN
     	========================= 
	*/

  async function signInWithGoogle() {

    setBusy(true);
    setMessage('');

    const {
      error
    } = await supabase.auth.signInWithOAuth({

      provider: 'google',

      options: {

        redirectTo:
          window.location.origin

      }

    });


    if (error) {

      setMessage(error.message);
      setBusy(false);

    }

  }


     /* 
     =========================
     FORGOT PASSWORD
     ========================= 
     */

  async function forgotPassword() {

    if (!form.email) {

      setMessage(
        'Enter your email address first.'
      );

      return;

    }


    setBusy(true);
    setMessage('');

    const {
      error
    } =
      await supabase.auth.resetPasswordForEmail(
        form.email,
        {
          redirectTo:
            `${window.location.origin}/reset-password`
        }
      );


    if (error) {

      setMessage(error.message);

    } else {

      setMessage(
        'If an ONSTOOD account exists for this email, a secure reset link has been sent. Check your inbox and spam folder.'
      );

    }


    setBusy(false);

  }


  if (mode === 'forgot') {

    return (
      <div className="auth-shell">

        <div className="auth-left">
          <div className="brand huge">
            ONSTOOD<span>.</span>
          </div>

          <h1>
            Recover your
            <br />
            account.
          </h1>

          <p>
            Enter the email address connected to your ONSTOOD account.
            We will send you a secure link to create a new password.
          </p>

          <div className="auth-pills">
            <span>Secure</span>
            <span>Private</span>
            <span>Simple</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="brand">
            ONSTOOD<span>.</span>
          </div>

          <h2 style={{ marginBottom: 6 }}>
            Forgot your password?
          </h2>

          <p className="muted">
            Enter your email and we will send you a password reset link.
          </p>

          <form
            onSubmit={async event => {
              event.preventDefault();
              await forgotPassword();
            }}
          >
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={event =>
                setField('email', event.target.value)
              }
              autoComplete="email"
              required
              autoFocus
            />

            {message && (
              <div className="message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn primary full"
              disabled={busy}
            >
              {busy
                ? 'Sending reset link…'
                : 'Send reset link'}
            </button>

            <button
              type="button"
              className="btn subtle full"
              onClick={() => {
                setMode('login');
                setMessage('');
              }}
              disabled={busy}
              style={{ marginTop: 10 }}
            >
              Back to sign in
            </button>
          </form>

          <small className="muted">
            For your privacy, ONSTOOD does not display your old password.
          </small>
        </div>

      </div>
    );
  }


  return (

    <div className="auth-shell">

      {
      /* 
      =========================
          LEFT SIDE
      ========================= 
      */}

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


      {
      /* 
        =========================
          AUTH CARD
         ========================= 
         */}

      <div className="auth-card">

        <div className="brand">
          ONSTOOD<span>.</span>
        </div>

        <p className="muted">
          The student network for the next generation.
        </p>


        {/* TABS */}

        <div className="tabs">

          <button
            type="button"
            className={
              mode === 'login'
                ? 'active'
                : ''
            }
            onClick={() => {

              setMode('login');
              setMessage('');

            }}
          >
            Sign in
          </button>


          <button
            type="button"
            className={
              mode === 'register'
                ? 'active'
                : ''
            }
            onClick={() => {

              setMode('register');
              setMessage('');

            }}
          >
            Create account
          </button>

        </div>


        {/* FORM */}

        <form onSubmit={submit}>

          {/* REGISTER FIELDS */}

          {mode === 'register' && (

            <div className="grid2">

              <input
                placeholder="First name"
                value={form.name}
                onChange={e =>
                  setField(
                    'name',
                    e.target.value
                  )
                }
                required
              />


              <input
                placeholder="Last name"
                value={form.surname}
                onChange={e =>
                  setField(
                    'surname',
                    e.target.value
                  )
                }
                required
              />

            </div>

          )}


          {mode === 'register' && (

            <div
              className="card"
              style={{
                padding: 10,
                marginBottom: 12
              }}
            >
              <small className="muted">
                Account type
              </small>

              <div
                className="tabs"
                style={{
                  marginTop: 8
                }}
              >
                <button
                  type="button"
                  className={
                    form.account_type === 'student'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setField(
                      'account_type',
                      'student'
                    )
                  }
                >
                  Student
                </button>

                <button
                  type="button"
                  className={
                    form.account_type === 'employer'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setField(
                      'account_type',
                      'employer'
                    )
                  }
                >
                  Employer
                </button>
              </div>
            </div>

          )}


          <button
            type="button"
            className="btn subtle full"
            onClick={continueWithGoogle}
            style={{
              marginBottom: 12
            }}
          >
            Continue with Google
          </button>


          <div
            className="muted"
            style={{
              textAlign: 'center',
              fontSize: 12,
              marginBottom: 12
            }}
          >
            or continue with email
          </div>


          {/* EMAIL */}

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e =>
              setField(
                'email',
                e.target.value
              )
            }
            required
          />


          {/* PASSWORD */}

          <input
            type="password"
            placeholder={
              mode === 'register'
                ? 'Password · minimum 8 characters'
                : 'Password'
            }
            minLength={mode === 'register' ? 8 : 1}
            value={form.password}
            onChange={e =>
              setField(
                'password',
                e.target.value
              )
            }
            required
          />


          {mode === 'register' && (

            <input
              type="password"
              placeholder="Confirm password"
              minLength="8"
              value={form.confirm_password}
              onChange={e =>
                setField(
                  'confirm_password',
                  e.target.value
                )
              }
              required
            />

          )}


          {/* EXTRA REGISTER DATA */}

          {mode === 'register' &&
            form.account_type === 'student' && (

            <>

              <input
                name="university"
                placeholder="University"
                value={form.university}
                onChange={e =>
                  setField(
                    'university',
                    e.target.value
                  )
                }
              />


              <div className="grid2">

                <input
                  name="degree"
                  placeholder="Degree / field"
                  value={form.degree}
                  onChange={e =>
                    setField(
                      'degree',
                      e.target.value
                    )
                  }
                />


                <select
                  name="study-year"
                  value={form.year}
                  onChange={e =>
                    setField(
                      'year',
                      e.target.value
                    )
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

                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>

                  ))}

                </select>

              </div>

            </>

          )}


          {mode === 'register' &&
            form.account_type === 'employer' && (

            <>

              <input
                name="company-name"
                placeholder="Company / organization name"
                value={form.company_name}
                onChange={e =>
                  setField(
                    'company_name',
                    e.target.value
                  )
                }
                required
              />

              <div className="grid2">

                <input
                  name="company-role"
                  placeholder="Your role"
                  value={form.company_role}
                  onChange={e =>
                    setField(
                      'company_role',
                      e.target.value
                    )
                  }
                />

                <input
                  name="company-website"
                  type="text"
                  placeholder="Company website · optional"
                  value={form.company_website}
                  onChange={e =>
                    setField(
                      'company_website',
                      e.target.value
                    )
                  }
                />

              </div>

              <textarea
                name="company-description"
                placeholder="Briefly describe your company and the opportunities you recruit for."
                value={form.company_description}
                onChange={e =>
                  setField(
                    'company_description',
                    e.target.value
                  )
                }
                style={{
                  minHeight: 90
                }}
              />

            </>

          )}


          {/* MESSAGE */}

          {message && (

            <div className="message">
              {message}
            </div>

          )}


          {/* MAIN BUTTON */}

          <button
            type="submit"
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


        {/* GOOGLE + PASSWORD */}

        {mode === 'login' && (

          <>

            <button
              type="button"
              className="btn full"
              onClick={signInWithGoogle}
              disabled={busy}
            >
              Continue with Google
            </button>


            <button
              type="button"
              className="muted"
              onClick={() => {
                setMode('forgot');
                setMessage('');
              }}
              disabled={busy}
            >
              Forgot password?
            </button>

          </>

        )}


        <small className="muted">
          Secure authentication powered by Supabase.
        </small>

      </div>

    </div>

  );

}

    /* 
   =========================================================
   RESET PASSWORD
   ========================================================= 
   */

function ResetPassword({ onDone }) {

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);


  async function updatePassword(event) {

    event.preventDefault();

    setMessage('');


    if (password.length < 8) {

      setMessage(
        'Password must be at least 8 characters.'
      );

      return;

    }


    if (password !== confirmPassword) {

      setMessage(
        'Passwords do not match.'
      );

      return;

    }


    setBusy(true);


    const {
      error
    } = await supabase.auth.updateUser({
      password
    });


    if (error) {

      setMessage(error.message);
      setBusy(false);
      return;

    }


    setSuccess(true);
    setBusy(false);

    // The password recovery link already created an authenticated
    // recovery session. Keep it and enter ONSTOOD immediately.
    await onDone();

  }


  return (

    <div className="auth-shell">

      <div className="auth-left">

        <div className="brand huge">
          ONSTOOD<span>.</span>
        </div>

        <h1>
          Create a new
          <br />
          password.
        </h1>

        <p>
          Choose a new password for your ONSTOOD
          account and get back to your student life.
        </p>

        <div className="auth-pills">

          <span>Secure</span>
          <span>Simple</span>
          <span>ONSTOOD</span>

        </div>

      </div>


      <div className="auth-card">

        <div className="brand">
          ONSTOOD<span>.</span>
        </div>

        <p className="muted">
          Set your new password below.
        </p>


        <form onSubmit={updatePassword}>

          <input
            type="password"
            placeholder="New password"
            minLength="8"
            value={password}
            onChange={e =>
              setPassword(e.target.value)
            }
            required
          />


          <input
            type="password"
            placeholder="Confirm new password"
            minLength="8"
            value={confirmPassword}
            onChange={e =>
              setConfirmPassword(e.target.value)
            }
            required
          />


          {message && (

            <div className="message">
              {message}
            </div>

          )}


          <button
            type="submit"
            className="btn primary full"
            disabled={busy}
          >

            {busy
              ? 'Updating password…'
              : 'Update password'}

          </button>

        </form>


        <small className="muted">
          Secure authentication powered by Supabase.
        </small>

      </div>

    </div>

  );

}


   /* 
   =========================================================
   APP
   ========================================================= 
   */




class SectionErrorBoundary extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      message: ''
    };
  }


  static getDerivedStateFromError(error) {

    return {
      hasError: true,
      message:
        error?.message ||
        'Unknown rendering error'
    };

  }


  componentDidCatch(
    error,
    info
  ) {

    console.error(
      'ONSTOOD section render error:',
      error,
      info
    );

  }


  componentDidUpdate(
    previousProps
  ) {

    if (
      previousProps.sectionKey !==
      this.props.sectionKey &&
      this.state.hasError
    ) {

      this.setState({
        hasError: false,
        message: ''
      });

    }

  }


  render() {

    if (this.state.hasError) {

      return (
        <div className="card empty">

          <AlertTriangle
            size={28}
          />

          <h3>
            This section could not be displayed.
          </h3>

          <p>
            ONSTOOD kept the rest of the application running.
          </p>

          <small className="muted">
            {
              this.state.message
            }
          </small>

        </div>
      );

    }


    return this.props.children;

  }

}


function App({ session }) {

  const [section, setSection] = useState(getInitialSection);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationCounts, setNotificationCounts] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);


  const [adminRole, setAdminRole] =
    useState(null);

  const [adminRoleLoading, setAdminRoleLoading] =
    useState(true);

  const [onlineUserIds, setOnlineUserIds] =
    useState([]);
  const [messageConversationId, setMessageConversationId] = useState(null);
  const [messageTargetUserId, setMessageTargetUserId] = useState(null);
  const [miniChatUserId, setMiniChatUserId] = useState(null);
  const [miniChatConversationId, setMiniChatConversationId] = useState(null);


  const [overview, setOverview] =
    useState({
      connections: 0,
      upcoming: 0,
      tasks: 0,
      documents: 0
    });

  const [overviewLoading, setOverviewLoading] =
    useState(true);


  const [globalSearch, setGlobalSearch] =
    useState('');

  const [globalResults, setGlobalResults] =
    useState([]);

  const [globalSearchBusy, setGlobalSearchBusy] =
    useState(false);


  const baseNav =
    profile?.account_type === 'employer'
      ? EMPLOYER_NAV
      : NAV;


  const activeNav =
    adminRole
      ? [
          ...baseNav,
          [
            'admin',
            'Admin Control',
            ShieldCheck
          ]
        ]
      : baseNav;


  useEffect(() => {

    const query =
      globalSearch.trim();

    if (query.length < 2) {
      setGlobalResults([]);
      setGlobalSearchBusy(false);
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {

          setGlobalSearchBusy(true);

          const pattern =
            `%${query}%`;

          const requests = [
            supabase
              .from('profiles')
              .select('id,name,surname,university,degree,account_type,company_name')
              .or(
                `name.ilike.${pattern},surname.ilike.${pattern},university.ilike.${pattern},degree.ilike.${pattern},company_name.ilike.${pattern}`
              )
              .limit(6),

            supabase
              .from('courses')
              .select('id,title,description,language,status')
              .or(
                `title.ilike.${pattern},description.ilike.${pattern},language.ilike.${pattern}`
              )
              .limit(6),

            supabase
              .from('career_opportunities')
              .select('id,title,organization,city,country,status')
              .eq('status', 'published')
              .or(
                `title.ilike.${pattern},organization.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern}`
              )
              .limit(6)
          ];

          if (
            profile?.account_type !==
              'employer'
          ) {
            requests.push(
              supabase
                .from('documents')
                .select('id,file_name,created_at')
                .eq('user_id', profile.id)
                .ilike('file_name', pattern)
                .limit(6)
            );
          }

          const results =
            await Promise.all(
              requests
            );

          if (!active) {
            return;
          }

          const [
            peopleResult,
            coursesResult,
            jobsResult,
            docsResult
          ] = results;

          const merged = [
            ...(peopleResult.data || []).map(
              item => ({
                id: `person-${item.id}`,
                kind: 'person',
                title:
                  item.account_type === 'employer'
                    ? (
                      item.company_name ||
                      `${item.name || ''} ${item.surname || ''}`.trim()
                    )
                    : `${item.name || ''} ${item.surname || ''}`.trim(),
                subtitle:
                  item.account_type === 'employer'
                    ? 'Employer'
                    : (
                      item.university ||
                      item.degree ||
                      'Student'
                    ),
                section:
                  item.account_type === 'employer'
                    ? 'jobs'
                    : 'friends'
              })
            ),
            ...(coursesResult.data || []).map(
              item => ({
                id: `course-${item.id}`,
                kind: 'course',
                title: item.title,
                subtitle:
                  item.language ||
                  'Course',
                section: 'courses'
              })
            ),
            ...(jobsResult.data || []).map(
              item => ({
                id: `job-${item.id}`,
                kind: 'job',
                title: item.title,
                subtitle:
                  [
                    item.organization,
                    item.city,
                    item.country
                  ]
                    .filter(Boolean)
                    .join(' · '),
                section: 'jobs'
              })
            ),
            ...((docsResult?.data || []).map(
              item => ({
                id: `doc-${item.id}`,
                kind: 'document',
                title: item.file_name,
                subtitle: 'Your document',
                section: 'docs'
              })
            ))
          ];

          setGlobalResults(
            merged.slice(0, 18)
          );
          setGlobalSearchBusy(false);

        },
        280
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };

  }, [
    globalSearch,
    profile?.id,
    profile?.account_type
  ]);


  function openGlobalResult(
    item
  ) {
    setSection(item.section);
    setGlobalSearch('');
    setGlobalResults([]);
  }


  useEffect(() => {

    if (
      profile?.account_type === 'employer' &&
      !EMPLOYER_NAV.some(
        ([id]) => id === section
      )
    ) {
      setSection('jobs');
    }

  }, [
    profile?.account_type,
    section
  ]);


  useEffect(() => {
    try {
      window.sessionStorage.setItem('onstood.activeSection', section);
    } catch {
      // Ignore browser storage restrictions.
    }
  }, [section]);


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

        const { data, error } =
          await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
          console.error(
            'Profile load error:',
            error
          );
        }

        if (!data) {

          const metadata =
            user.user_metadata || {};

          const accountType =
            metadata.account_type === 'employer'
              ? 'employer'
              : 'student';

          const newProfile = {
            id: user.id,
            account_type: accountType,
            name:
              metadata.name ||
              (accountType === 'employer'
                ? 'Employer'
                : 'Student'),
            surname: metadata.surname || '',
            university:
              accountType === 'student'
                ? metadata.university || ''
                : '',
            degree:
              accountType === 'student'
                ? metadata.degree || ''
                : '',
            year:
              accountType === 'student'
                ? metadata.year || ''
                : '',
            company_name:
              accountType === 'employer'
                ? metadata.company_name || ''
                : '',
            company_website:
              accountType === 'employer'
                ? metadata.company_website || ''
                : '',
            company_role:
              accountType === 'employer'
                ? metadata.company_role || ''
                : '',
            company_description:
              accountType === 'employer'
                ? metadata.company_description || ''
                : ''
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


  useEffect(() => {

    if (!session?.user?.id) {
      setAdminRole(null);
      setAdminRoleLoading(false);
      return;
    }


    let active = true;


    async function loadAdminRole() {

      setAdminRoleLoading(true);

      const {
        data,
        error
      } = await supabase
        .from('admin_memberships')
        .select('role,active')
        .eq(
          'user_id',
          session.user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle();


      if (!active) {
        return;
      }


      if (error) {

        console.error(
          'Admin membership lookup error:',
          error
        );

        setAdminRole(null);

      } else {

        setAdminRole(
          data?.role || null
        );

      }


      setAdminRoleLoading(false);

    }


    loadAdminRole();


    return () => {
      active = false;
    };

  }, [session?.user?.id]);



  /*
   * =========================================================
   * REAL DASHBOARD OVERVIEW
   * One source of truth for Home + right sidebar.
   * =========================================================
   */

  useEffect(() => {

    if (!profile?.id) {
      return;
    }


    let active = true;


    async function loadOverview() {

      setOverviewLoading(true);


      const now =
        new Date().toISOString();


      const [
        connectionsResult,
        upcomingResult,
        tasksResult,
        documentsResult
      ] = await Promise.all([

        supabase
          .from('friend_requests')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'status',
            'accepted'
          )
          .or(
            `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
          ),

        supabase
          .from('calendar_events')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'user_id',
            profile.id
          )
          .gte(
            'starts_at',
            now
          ),

        supabase
          .from('tasks')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'user_id',
            profile.id
          )
          .eq(
            'done',
            false
          ),

        supabase
          .from('documents')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'user_id',
            profile.id
          )

      ]);


      if (!active) {
        return;
      }


      const results = [
        connectionsResult,
        upcomingResult,
        tasksResult,
        documentsResult
      ];


      const firstError =
        results.find(result =>
          result.error
        )?.error;


      if (firstError) {

        console.error(
          'Dashboard overview error:',
          firstError
        );

      }


      setOverview({
        connections:
          connectionsResult.count || 0,
        upcoming:
          upcomingResult.count || 0,
        tasks:
          tasksResult.count || 0,
        documents:
          documentsResult.count || 0
      });


      setOverviewLoading(false);

    }


    loadOverview();


    return () => {
      active = false;
    };

  }, [
    profile?.id,
    section
  ]);


  /*
   * =========================================================
   * NOTIFICATIONS HELPERS
   * =========================================================
   */

  function getNotificationSection(kind) {
    return NOTIFICATION_SECTION_BY_KIND[kind] || null;
  }


  async function markSectionNotificationsRead(sectionId) {
    const kinds = NOTIFICATION_KINDS_BY_SECTION[sectionId] || [];

    if (kinds.length === 0 || !session?.user?.id) {
      return;
    }

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', session.user.id)
      .in('kind', kinds)
      .is('read_at', null);

    if (error) {
      console.error('Mark notifications read error:', error);
      return;
    }

    setNotificationCounts(current => ({
      ...current,
      [sectionId]: 0
    }));

    setNotifications(current =>
      current.map(notification =>
        kinds.includes(notification.kind)
          ? { ...notification, read_at: readAt }
          : notification
      )
    );
  }


  function calculateNotificationCounts(data) {

    const counts = {};

    (data || []).forEach(notification => {

      if (notification.read_at) {
        return;
      }

      const section =
        getNotificationSection(
          notification.kind
        );

      if (!section) {
        return;
      }

      counts[section] =
        (counts[section] || 0) + 1;

    });

    return counts;
  }


  const unreadNotificationCount =
    notifications.filter(notification =>
      !notification.read_at
    ).length;


  async function markAllNotificationsRead() {

    if (!session?.user?.id) {
      return;
    }

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', session.user.id)
      .is('read_at', null);

    if (error) {
      notify(error.message);
      return;
    }

    setNotifications(current =>
      current.map(notification => ({
        ...notification,
        read_at:
          notification.read_at || readAt
      }))
    );

    setNotificationCounts({});
  }


  async function openNotification(notification) {

    const targetSection =
      getNotificationSection(
        notification.kind
      );

    if (!notification.read_at) {

      const readAt = new Date().toISOString();

      const query = supabase
        .from('notifications')
        .update({ read_at: readAt });

      const { error } = notification.id
        ? await query.eq('id', notification.id)
        : await query
            .eq('user_id', session.user.id)
            .eq('kind', notification.kind)
            .is('read_at', null);

      if (!error) {
        setNotifications(current =>
          current.map(item =>
            notification.id &&
            item.id === notification.id
              ? { ...item, read_at: readAt }
              : item
          )
        );

        if (targetSection) {
          setNotificationCounts(current => ({
            ...current,
            [targetSection]: Math.max(
              0,
              (current[targetSection] || 0) - 1
            )
          }));
        }
      }
    }

    if (
      notification.kind === 'message' ||
      notification.kind === 'message_mention'
    ) {

      const conversationId =
        notification?.metadata?.conversation_id || null;

      const senderId =
        notification?.metadata?.sender_id || null;

      setMiniChatConversationId(
        conversationId
      );

      setMiniChatUserId(
        senderId
      );

      setShowNotifications(false);
      return;
    }

    if (targetSection) {
      setSection(targetSection);
    }

    setShowNotifications(false);
  }


  /*
   * =========================================================
   * LOAD + REALTIME NOTIFICATIONS
   * =========================================================
   */

  useEffect(() => {

    if (!session?.user?.id) {
      return;
    }

    let active = true;

    async function loadNotifications() {

      const {
        data,
        error
      } = await supabase
        .from('notifications')
        .select('*')
        .eq(
          'user_id',
          session.user.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(30);

      if (error) {

        console.error(
          'Notifications load error:',
          error
        );

        return;
      }

      if (!active) {
        return;
      }

      setNotifications(data || []);

      setNotificationCounts(
        calculateNotificationCounts(data)
      );
    }

    loadNotifications();

    const channel =
      supabase
        .channel(
          `notifications-${session.user.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter:
              `user_id=eq.${session.user.id}`
          },
          payload => {

            const notification =
              payload.new;

            setNotifications(current => [
              notification,
              ...current
            ]);

            if (!notification.read_at) {

              const section =
                getNotificationSection(
                  notification.kind
                );

              if (section) {

                setNotificationCounts(
                  current => ({
                    ...current,
                    [section]:
                      (current[section] || 0) + 1
                  })
                );

              }
            }

            setToast(
              notification.title ||
              'New notification'
            );

            window.setTimeout(() => {
              setToast('');
            }, 3200);
          }
        )
        .subscribe();

    return () => {

      active = false;

      supabase.removeChannel(
        channel
      );

    };

  }, [session?.user?.id]);



  /*
   * =========================================================
   * GLOBAL ONLINE PRESENCE
   * One channel for the whole app.
   * =========================================================
   */

  useEffect(() => {

    if (!session?.user?.id) {
      return;
    }


    const channel =
      supabase.channel(
        'onstood-global-presence',
        {
          config: {
            presence: {
              key: session.user.id
            }
          }
        }
      );


    function syncPresence() {

      const state =
        channel.presenceState();

      const ids =
        Object.values(state)
          .flat()
          .map(item =>
            item?.user_id
          )
          .filter(Boolean);


      setOnlineUserIds(
        [...new Set(ids)]
      );

    }


    channel
      .on(
        'presence',
        {
          event: 'sync'
        },
        syncPresence
      )
      .on(
        'presence',
        {
          event: 'join'
        },
        syncPresence
      )
      .on(
        'presence',
        {
          event: 'leave'
        },
        syncPresence
      )
      .subscribe(
        async status => {

          if (
            status ===
            'SUBSCRIBED'
          ) {

            await channel.track({
              user_id:
                session.user.id,
              online_at:
                new Date()
                  .toISOString()
            });

          }

        }
      );


    return () => {

      supabase.removeChannel(
        channel
      );

    };

  }, [
    session?.user?.id
  ]);


  useEffect(() => {

    if (
      section === 'admin' &&
      !adminRole &&
      !adminRoleLoading
    ) {
      setSection('home');
    }

  }, [
    section,
    adminRole,
    adminRoleLoading
  ]);


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

        <div
          className="global-search"
          style={{
            position: 'relative'
          }}
        >
          <Search size={17} />
          <input
            name="global-search"
            placeholder={
              profile.account_type === 'employer'
                ? 'Search talent, jobs, companies…'
                : 'Search students, courses, jobs, documents…'
            }
            value={globalSearch}
            onChange={event =>
              setGlobalSearch(
                event.target.value
              )
            }
          />

          {(globalSearchBusy ||
            globalResults.length > 0) && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: 8,
                maxHeight: 420,
                overflowY: 'auto',
                boxShadow:
                  '0 18px 50px rgba(15,23,42,0.18)'
              }}
            >
              {globalSearchBusy ? (
                <div className="empty compact">
                  Searching ONSTOOD…
                </div>
              ) : (
                globalResults.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      openGlobalResult(item)
                    }
                    style={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    <b>{item.title}</b>
                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 3
                      }}
                    >
                      {item.kind.toUpperCase()}
                      {' · '}
                      {item.subtitle}
                    </small>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="top-actions">
<div
  style={{
    position: 'relative'
  }}
>

  <button
    type="button"
    className="icon-btn notification-btn"
    aria-label="Notifications"
    aria-expanded={showNotifications}
    onClick={() =>
      setShowNotifications(
        current => !current
      )
    }
    style={{
      position: 'relative'
    }}
  >
    <Bell size={19} />

    {unreadNotificationCount > 0 && (
      <span
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 999,
          background: '#ef4444',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          lineHeight: 1,
          boxShadow:
            '0 2px 6px rgba(0,0,0,0.25)'
        }}
      >
        {unreadNotificationCount > 99
          ? '99+'
          : unreadNotificationCount}
      </span>
    )}
  </button>


  {showNotifications && (
    <div
      role="dialog"
      aria-label="Notifications"
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: 'min(390px, 88vw)',
        maxHeight: 'min(560px, 72vh)',
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid rgba(15,23,42,0.12)',
        borderRadius: 16,
        boxShadow:
          '0 22px 60px rgba(15,23,42,0.20)',
        zIndex: 1000
      }}
    >

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          borderBottom:
            '1px solid rgba(15,23,42,0.08)'
        }}
      >
        <div>
          <strong>Notifications</strong>
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              opacity: 0.65
            }}
          >
            {unreadNotificationCount > 0
              ? `${unreadNotificationCount} unread`
              : 'You are all caught up'}
          </div>
        </div>

        {unreadNotificationCount > 0 && (
          <button
            type="button"
            className="btn subtle"
            onClick={markAllNotificationsRead}
            style={{
              padding: '7px 10px',
              fontSize: 12
            }}
          >
            Mark all read
          </button>
        )}
      </div>


      <div
        style={{
          overflowY: 'auto',
          maxHeight: 'min(490px, 64vh)'
        }}
      >

        {notifications.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              opacity: 0.65
            }}
          >
            No notifications yet.
          </div>
        ) : (
          notifications.map(notification => {

            const targetSection =
              getNotificationSection(
                notification.kind
              );

            const unread =
              !notification.read_at;

            return (
              <button
                key={
                  notification.id ||
                  `${notification.kind}-${notification.created_at}`
                }
                type="button"
                onClick={() =>
                  openNotification(notification)
                }
                style={{
                  width: '100%',
                  border: 0,
                  borderBottom:
                    '1px solid rgba(15,23,42,0.07)',
                  background: unread
                    ? 'rgba(59,130,246,0.07)'
                    : '#fff',
                  padding: '13px 16px',
                  display: 'grid',
                  gridTemplateColumns:
                    '10px 1fr auto',
                  gap: 10,
                  textAlign: 'left',
                  cursor: targetSection
                    ? 'pointer'
                    : 'default',
                  color: 'inherit'
                }}
              >

                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    marginTop: 6,
                    background: unread
                      ? '#2563eb'
                      : 'transparent'
                  }}
                />

                <span>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 13
                    }}
                  >
                    {notification.title ||
                      'ONSTOOD notification'}
                  </strong>

                  {(notification.body ||
                    notification.message) && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        fontSize: 12,
                        lineHeight: 1.4,
                        opacity: 0.72
                      }}
                    >
                      {notification.body ||
                        notification.message}
                    </span>
                  )}

                  {notification.created_at && (
                    <small
                      style={{
                        display: 'block',
                        marginTop: 5,
                        opacity: 0.52
                      }}
                    >
                      {fmtDate(
                        notification.created_at
                      )}
                    </small>
                  )}
                </span>

                {targetSection && (
                  <ChevronRight
                    size={15}
                    style={{
                      marginTop: 3,
                      opacity: 0.45
                    }}
                  />
                )}

              </button>
            );
          })
        )}

      </div>

    </div>
  )}

</div>

          <button
            type="button"
            className="icon-btn"
            aria-label="Open Messages"
            title="Messages"
            onClick={() => {
              setMessageTargetUserId(null);
              setSection('messages');
              markSectionNotificationsRead('messages');
            }}
            style={{
              position: 'relative'
            }}
          >
            <Mail size={19} />

            {(notificationCounts.messages || 0) > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1
                }}
              >
                {(notificationCounts.messages || 0) > 99
                  ? '99+'
                  : notificationCounts.messages}
              </span>
            )}
          </button>


          {profile.account_type !== 'employer' && (

            <button
              className="icon-btn ai-icon"
              onClick={() => setSection('ai')}
            >
              <Sparkles size={19} />
            </button>

          )}

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
                {
                  profile.account_type === 'employer'
                    ? (
                      profile.company_name ||
                      'Employer'
                    )
                    : (
                      profile.university ||
                      'Student'
                    )
                }
              </small>
            </div>
          </button>


     
        <nav>

  {activeNav.map(([id, label, Icon]) => {

    const count = notificationCounts[id] || 0;

    return (

      <button
  key={id}
  className={
    section === id
      ? 'selected'
      : ''
  }
  onClick={() => {
    setSection(id);
    markSectionNotificationsRead(id);
  }}
      >

        <span
          style={{
            position: 'relative',
            display: 'inline-flex'
          }}
        >

          <Icon size={18} />

          {count > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-14px',
                minWidth: '20px',
                height: '17px',
                padding: '0 5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: '700',
                lineHeight: '1',
                zIndex: 5,
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
              }}
            >

              {count > 99 ? '99+' : count}

              <span
                style={{
                  position: 'absolute',
                  bottom: '-3px',
                  left: '4px',
                  width: '6px',
                  height: '6px',
                  background: '#ef4444',
                  borderRadius: '50%'
                }}
              />

            </span>
          )}

        </span>

        <span>{label}</span>

        {id === 'ai' && (
          <em>NEW</em>
        )}

      </button>

    );

  })}

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

          <SectionErrorBoundary
            sectionKey={section}
          >

          {profile.account_type !== 'employer' && section === 'home' && (
            <HomePage
              profile={profile}
              go={setSection}
              notify={notify}
              overview={overview}
              overviewLoading={
                overviewLoading
              }
            />
          )}

          {section === 'friends' && (
            <Friends
              profile={profile}
              notify={notify}
              onlineUserIds={onlineUserIds}
              onOpenChat={personId => {
                setMiniChatConversationId(null);
                setMiniChatUserId(
                  personId
                );
              }}
            />
          )}

          <MiniChat
            profile={profile}
            notify={notify}
            targetUserId={miniChatUserId}
            targetConversationId={
              miniChatConversationId
            }
            onlineUserIds={onlineUserIds}
            onClose={() => {
              setMiniChatUserId(null);
              setMiniChatConversationId(null);
            }}
          />

          {section === 'messages' && (
            <PostOffice
              profile={profile}
              notify={notify}
              onlineUserIds={onlineUserIds}
              requestedConversationId={messageConversationId}
              requestedUserId={messageTargetUserId}
              onConversationResolved={conversationId => {
                setMessageConversationId(conversationId);
                setMessageTargetUserId(null);
              }}
              onMessagesRead={() =>
                markSectionNotificationsRead('messages')
              }
              onOpenMiniChat={(
                personId,
                conversationId
              ) => {
                setMiniChatUserId(
                  personId
                );
                setMiniChatConversationId(
                  conversationId
                );
              }}
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
            <Courses
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'jobs' && (
            <Career
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'ai' && (
            <AI profile={profile} />
          )}

          {section === 'admin' && (
            adminRole ? (
              <AdminMfaGate
                profile={profile}
                role={adminRole}
                notify={notify}
              >
                <AdminControlCenter
                  profile={profile}
                  role={adminRole}
                  notify={notify}
                />
              </AdminMfaGate>
            ) : (
              <div className="empty card">
                <ShieldCheck size={28} />
                <h3>Admin access required.</h3>
              </div>
            )
          )}

          {section === 'settings' && (
            <SettingsPage
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'profile' && (
            <Profile
              profile={profile}
              setProfile={setProfile}
              notify={notify}
            />
          )}

          </SectionErrorBoundary>

        </main>


        {/* RIGHT SIDEBAR */}

        {profile.account_type !== 'employer' && (
        <aside className="rightbar">

          <OnlineConnections
            profile={profile}
            onlineUserIds={onlineUserIds}
            notify={notify}
            onOpenChat={personId => {
              setMiniChatConversationId(null);
              setMiniChatUserId(personId);
            }}
          />


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
              <span>Open tasks</span>
              <b>
                {overviewLoading
                  ? '…'
                  : overview.tasks}
              </b>
            </div>

            <div className="metric">
              <span>Upcoming</span>
              <b>
                {overviewLoading
                  ? '…'
                  : overview.upcoming}
              </b>
            </div>

            <div className="metric">
              <span>Connections</span>
              <b>
                {overviewLoading
                  ? '…'
                  : overview.connections}
              </b>
            </div>

            <div className="metric">
              <span>Documents</span>
              <b>
                {overviewLoading
                  ? '…'
                  : overview.documents}
              </b>
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
        )}

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
  notify,
  overview,
  overviewLoading
}) {

  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(true);
  const [likes, setLikes] = useState({});
  const [likedByMe, setLikedByMe] = useState({});
  const [comments, setComments] = useState({});
  const [shares, setShares] = useState({});
  const [commentText, setCommentText] = useState({});
  const [connections, setConnections] = useState([]);
  const [shareTarget, setShareTarget] = useState(null);
  const [mailTarget, setMailTarget] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [shareBusy, setShareBusy] = useState(false);


  async function loadConnections() {

    const {
      data: accepted,
      error
    } = await supabase
      .from('friend_requests')
      .select('sender_id,receiver_id')
      .eq('status', 'accepted')
      .or(
        `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
      );

    if (error) {
      console.error(
        'Feed connections error:',
        error
      );
      return;
    }

    const ids = [
      ...new Set(
        (accepted || []).map(item =>
          item.sender_id === profile.id
            ? item.receiver_id
            : item.sender_id
        )
      )
    ];

    if (!ids.length) {
      setConnections([]);
      return;
    }

    const {
      data,
      error: profilesError
    } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        surname,
        university,
        degree,
        avatar_url
      `)
      .in('id', ids)
      .order('name');

    if (profilesError) {
      console.error(
        'Feed connection profiles error:',
        profilesError
      );
      return;
    }

    setConnections(data || []);
  }


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
        audience,
        shared_from_post_id,
        profiles!posts_user_id_fkey (
          name,
          surname,
          university,
          avatar_url
        )
      `)
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(40);

    if (error) {
      notify(error.message);
      setBusy(false);
      return;
    }

    const rows = data || [];
    setPosts(rows);

    const ids =
      rows.map(item => item.id);

    if (!ids.length) {
      setBusy(false);
      return;
    }

    const [
      likesResult,
      commentsResult,
      sharesResult
    ] = await Promise.all([

      supabase
        .from('post_likes')
        .select('post_id,user_id')
        .in('post_id', ids),

      supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          user_id,
          body,
          created_at,
          profiles (
            name,
            surname,
            avatar_url
          )
        `)
        .in('post_id', ids)
        .order('created_at'),

      supabase
        .from('post_shares')
        .select('post_id,user_id')
        .in('post_id', ids)

    ]);

    const likeCounts = {};
    const mine = {};

    (likesResult.data || []).forEach(
      item => {
        likeCounts[item.post_id] =
          (likeCounts[item.post_id] || 0) + 1;

        if (item.user_id === profile.id) {
          mine[item.post_id] = true;
        }
      }
    );

    const commentMap = {};

    (commentsResult.data || []).forEach(
      item => {
        if (!commentMap[item.post_id]) {
          commentMap[item.post_id] = [];
        }

        commentMap[item.post_id].push(item);
      }
    );

    const shareCounts = {};

    (sharesResult.data || []).forEach(
      item => {
        shareCounts[item.post_id] =
          (shareCounts[item.post_id] || 0) + 1;
      }
    );

    setLikes(likeCounts);
    setLikedByMe(mine);
    setComments(commentMap);
    setShares(shareCounts);
    setBusy(false);
  }


  useEffect(() => {
    loadFeed();
    loadConnections();
  }, [profile.id]);


  async function publish() {

    const body = text.trim();

    if (!body) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        body,
        audience: 'public'
      })
      .select(`
        id,
        body,
        created_at,
        user_id,
        audience,
        shared_from_post_id
      `)
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setPosts(current => [
      {
        ...data,
        profiles: profile
      },
      ...current
    ]);

    setText('');
    notify('Post published.');
  }


  async function toggleLike(
    postId
  ) {

    const isLiked =
      Boolean(
        likedByMe[postId]
      );

    if (isLiked) {

      const { error } =
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id);

      if (error) {
        notify(error.message);
        return;
      }

      setLikedByMe(current => ({
        ...current,
        [postId]: false
      }));

      setLikes(current => ({
        ...current,
        [postId]:
          Math.max(
            0,
            (current[postId] || 1) - 1
          )
      }));

    } else {

      const { error } =
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: profile.id
          });

      if (error) {
        notify(error.message);
        return;
      }

      setLikedByMe(current => ({
        ...current,
        [postId]: true
      }));

      setLikes(current => ({
        ...current,
        [postId]:
          (current[postId] || 0) + 1
      }));

    }
  }


  async function addComment(
    postId
  ) {

    const body =
      (commentText[postId] || '')
        .trim();

    if (!body) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        body
      })
      .select('id,post_id,user_id,body,created_at')
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setComments(current => ({
      ...current,
      [postId]: [
        ...(current[postId] || []),
        {
          ...data,
          profiles: profile
        }
      ]
    }));

    setCommentText(current => ({
      ...current,
      [postId]: ''
    }));
  }


  async function sharePost(
    post,
    audience
  ) {

    setShareBusy(true);

    const authorName =
      `${post.profiles?.name || 'Student'} ${post.profiles?.surname || ''}`
        .trim();

    const sharedBody =
      `↻ Shared from ${authorName}\n\n${post.body}`;

    const {
      data,
      error
    } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        body: sharedBody,
        audience,
        shared_from_post_id:
          post.id
      })
      .select(`
        id,
        body,
        created_at,
        user_id,
        audience,
        shared_from_post_id
      `)
      .single();

    if (error) {
      setShareBusy(false);
      notify(error.message);
      return;
    }

    const {
      error: shareError
    } = await supabase
      .from('post_shares')
      .insert({
        post_id: post.id,
        user_id: profile.id,
        audience
      });

    if (
      shareError &&
      shareError.code !== '23505'
    ) {
      console.error(
        'Share tracking error:',
        shareError
      );
    }

    setPosts(current => [
      {
        ...data,
        profiles: profile
      },
      ...current
    ]);

    if (!shareError) {
      setShares(current => ({
        ...current,
        [post.id]:
          (current[post.id] || 0) + 1
      }));
    }

    setShareBusy(false);
    setShareTarget(null);

    notify(
      audience === 'public'
        ? 'Post shared publicly.'
        : 'Post shared with your connections.'
    );
  }


  async function sendPostOffice(
    post
  ) {

    if (!selectedConnectionId) {
      notify(
        'Choose a connection first.'
      );
      return;
    }

    setShareBusy(true);

    const {
      data: conversationId,
      error: conversationError
    } = await supabase
      .rpc(
        'start_direct_conversation',
        {
          other_user_id:
            selectedConnectionId
        }
      );

    if (conversationError) {
      setShareBusy(false);
      notify(
        conversationError.message
      );
      return;
    }

    const authorName =
      `${post.profiles?.name || 'Student'} ${post.profiles?.surname || ''}`
        .trim();

    const {
      error
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          conversationId,
        sender_id:
          profile.id,
        body:
          `Shared post from ${authorName}:\n\n${post.body}`,
        message_type:
          'post',
        metadata: {
          kind: 'shared_post',
          post_id: post.id,
          original_author:
            authorName
        }
      });

    setShareBusy(false);

    if (error) {
      notify(error.message);
      return;
    }

    setMailTarget(null);
    setSelectedConnectionId('');

    notify(
      'Post sent through Messages.'
    );
  }


  async function deletePost(
    postId
  ) {

    const {
      error
    } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setPosts(current =>
      current.filter(
        item => item.id !== postId
      )
    );

    notify('Post deleted.');
  }


  return (
    <>

      <section className="hero">
        <div>
          <span className="eyebrow">
            WELCOME TO ONSTOOD
          </span>

          <h1>
            Good to see you,{' '}
            {profile.name || 'student'}.
          </h1>

          <p>
            Connect, learn, collaborate and
            build your future from one student
            platform.
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
          value={
            overviewLoading
              ? '…'
              : overview.connections
          }
        />

        <Stat
          label="Upcoming"
          value={
            overviewLoading
              ? '…'
              : overview.upcoming
          }
        />

        <Stat
          label="Open tasks"
          value={
            overviewLoading
              ? '…'
              : overview.tasks
          }
        />

        <Stat
          label="Documents"
          value={
            overviewLoading
              ? '…'
              : overview.documents
          }
        />
      </div>


      <div className="section-title">
        <div>
          <span className="eyebrow dark">
            COMMUNITY
          </span>
          <h2>Student feed</h2>
        </div>
      </div>


      <div className="feed-card card">
        <div className="composer">
          <Avatar profile={profile} />

          <textarea
            name="new-post"
            placeholder="Share a question, idea or useful resource…"
            value={text}
            onChange={event =>
              setText(
                event.target.value
              )
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
            Be the first to publish.
          </p>
        </div>
      ) : (
        posts.map(post => (
          <Post
            key={post.id}
            post={post}
            profile={profile}
            likeCount={
              likes[post.id] || 0
            }
            liked={
              Boolean(
                likedByMe[post.id]
              )
            }
            comments={
              comments[post.id] || []
            }
            shareCount={
              shares[post.id] || 0
            }
            commentValue={
              commentText[post.id] || ''
            }
            setCommentValue={value =>
              setCommentText(
                current => ({
                  ...current,
                  [post.id]: value
                })
              )
            }
            onLike={() =>
              toggleLike(post.id)
            }
            onComment={() =>
              addComment(post.id)
            }
            onShare={() =>
              setShareTarget(post)
            }
            onPostOffice={() => {
              setMailTarget(post);
              setSelectedConnectionId('');
            }}
            onDelete={() =>
              deletePost(post.id)
            }
          />
        ))
      )}


      {shareTarget && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setShareTarget(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(520px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              SHARE POST
            </span>

            <h3>
              Who should see this share?
            </h3>

            <p className="muted">
              Public makes the shared post
              visible across ONSTOOD.
              Connections limits it to
              accepted connections.
            </p>

            <div className="grid2">
              <button
                type="button"
                className="btn primary"
                disabled={shareBusy}
                onClick={() =>
                  sharePost(
                    shareTarget,
                    'public'
                  )
                }
              >
                Public
              </button>

              <button
                type="button"
                className="btn subtle"
                disabled={shareBusy}
                onClick={() =>
                  sharePost(
                    shareTarget,
                    'connections'
                  )
                }
              >
                Connections
              </button>
            </div>

            <button
              type="button"
              className="btn subtle full"
              style={{
                marginTop: 10
              }}
              onClick={() =>
                setShareTarget(null)
              }
            >
              Cancel
            </button>
          </div>
        </div>

      )}


      {mailTarget && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setMailTarget(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(520px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              MESSAGES
            </span>

            <h3>
              Send this post privately
            </h3>

            <p className="muted">
              Choose one of your accepted
              connections.
            </p>

            <select
              name="post-office-recipient"
              value={
                selectedConnectionId
              }
              onChange={event =>
                setSelectedConnectionId(
                  event.target.value
                )
              }
            >
              <option value="">
                Choose a connection
              </option>

              {connections.map(person => (
                <option
                  key={person.id}
                  value={person.id}
                >
                  {
                    `${person.name || ''} ${person.surname || ''}`
                      .trim()
                  }
                  {person.university
                    ? ` · ${person.university}`
                    : ''}
                </option>
              ))}
            </select>

            {connections.length === 0 && (
              <div
                className="notice"
                style={{
                  marginTop: 10
                }}
              >
                You need an accepted
                connection before sending
                a post privately.
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent:
                  'flex-end',
                marginTop: 14
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setMailTarget(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  shareBusy ||
                  !selectedConnectionId
                }
                onClick={() =>
                  sendPostOffice(
                    mailTarget
                  )
                }
              >
                <Mail size={15} />
                Send
              </button>
            </div>
          </div>
        </div>

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
  profile,
  likeCount,
  liked,
  comments,
  shareCount,
  commentValue,
  setCommentValue,
  onLike,
  onComment,
  onShare,
  onPostOffice,
  onDelete
}) {

  const author =
    post.profiles || {};

  return (
    <article className="card post-card">

      <div className="post-author">
        <Avatar profile={author} />

        <div
          style={{
            flex: 1
          }}
        >
          <b>
            {author.name || 'Student'}{' '}
            {author.surname || ''}
          </b>

          <small>
            {author.university ||
              'ONSTOOD member'}
            {' · '}
            {fmtDate(post.created_at)}
            {post.audience ===
              'connections'
              ? ' · Connections'
              : ''}
          </small>
        </div>

        {post.user_id ===
          profile.id && (
          <button
            type="button"
            className="icon-btn"
            onClick={onDelete}
            title="Delete post"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>


      <p className="post-body">
        {post.body}
      </p>


      <div className="post-actions">

        <button onClick={onLike}>
          <Heart
            size={16}
            fill={
              liked
                ? 'currentColor'
                : 'none'
            }
          />
          {likeCount}
        </button>

        <button>
          <MessageCircle size={16} />
          {comments.length}
        </button>

        <button onClick={onShare}>
          <Send size={16} />
          Share
          {shareCount > 0
            ? ` ${shareCount}`
            : ''}
        </button>

        <button
          onClick={onPostOffice}
          title="Send through Messages"
        >
          <Mail size={16} />
          Messages
        </button>

      </div>


      <div
        style={{
          display: 'grid',
          gap: 8,
          marginTop: 12
        }}
      >

        {comments.map(comment => (
          <div
            key={comment.id}
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'flex-start'
            }}
          >
            <Avatar
              profile={
                comment.profiles || {}
              }
            />

            <div
              style={{
                flex: 1,
                padding: '9px 11px',
                borderRadius: 12,
                background:
                  'rgba(15,23,42,0.05)'
              }}
            >
              <b
                style={{
                  fontSize: 13
                }}
              >
                {comment.profiles?.name ||
                  'Student'}{' '}
                {comment.profiles?.surname ||
                  ''}
              </b>

              <div
                style={{
                  marginTop: 3
                }}
              >
                {comment.body}
              </div>

              <small className="muted">
                {fmtDate(
                  comment.created_at
                )}
              </small>
            </div>
          </div>
        ))}


        <div
          style={{
            display: 'flex',
            gap: 8
          }}
        >
          <input
            name={`comment-${post.id}`}
            placeholder="Write a comment…"
            value={commentValue}
            onChange={event =>
              setCommentValue(
                event.target.value
              )
            }
            onKeyDown={event => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey
              ) {
                event.preventDefault();
                onComment();
              }
            }}
          />

          <button
            type="button"
            className="btn primary"
            onClick={onComment}
          >
            <Send size={15} />
          </button>
        </div>

      </div>

    </article>
  );
}


function Page({
  eyebrow,
  title,
  children,
  action,
  hideHeading = false
}) {

  return (
    <>
      {!hideHeading && (

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

      )}

      {children}
    </>
  );
}




function OnlineConnections({
  profile,
  onlineUserIds = [],
  notify,
  onOpenChat
}) {

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    let active = true;

    async function loadConnections() {

      setLoading(true);

      const {
        data: accepted,
        error
      } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(
          `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
        );

      if (error) {
        notify?.(error.message);

        if (active) {
          setLoading(false);
        }

        return;
      }

      const ids = [
        ...new Set(
          (accepted || [])
            .map(item =>
              item.sender_id === profile.id
                ? item.receiver_id
                : item.sender_id
            )
            .filter(Boolean)
        )
      ];

      if (ids.length === 0) {

        if (active) {
          setConnections([]);
          setLoading(false);
        }

        return;
      }

      const {
        data: profilesData,
        error: profilesError
      } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          degree,
          avatar_url,
          avatar_visibility
        `)
        .in('id', ids)
        .order('name');

      if (profilesError) {
        notify?.(profilesError.message);
      } else if (active) {
        setConnections(profilesData || []);
      }

      if (active) {
        setLoading(false);
      }

    }

    loadConnections();

    return () => {
      active = false;
    };

  }, [profile.id]);

  const onlineConnections =
    connections.filter(person =>
      onlineUserIds.includes(person.id)
    );

  return (
    <div className="card">

      <div className="card-head">

        <div>
          <h3>Online connections</h3>
          <small className="muted">
            Live chat
          </small>
        </div>

        <span
          style={{
            minWidth: 26,
            height: 26,
            padding: '0 7px',
            borderRadius: 13,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(34,197,94,0.12)',
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {onlineConnections.length}
        </span>

      </div>

      {loading ? (
        <div className="empty compact">
          Loading…
        </div>
      ) : onlineConnections.length === 0 ? (
        <div
          className="muted"
          style={{
            fontSize: 12,
            padding: '8px 0 2px'
          }}
        >
          No connections online.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 4
          }}
        >
          {onlineConnections.map(person => (
            <button
              type="button"
              key={person.id}
              onClick={() =>
                onOpenChat?.(person.id)
              }
              style={{
                width: '100%',
                border: 0,
                background: 'transparent',
                padding: '8px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 10
              }}
              title={`Chat with ${person.name || 'student'}`}
            >
              <div
                style={{
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                <Avatar profile={person} />

                <span
                  style={{
                    position: 'absolute',
                    right: -1,
                    bottom: -1,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid #fff'
                  }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <b
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {person.name || 'Student'}{' '}
                  {person.surname || ''}
                </b>

                <small className="muted">
                  Online
                </small>
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}


/* =========================================================
   NETWORK
   ========================================================= */


function ProfileTimeline({
  viewer,
  person,
  connectionStatus,
  notify,
  onImageClick
}) {

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    if (!person?.id) {
      setItems([]);
      setLoading(false);
      return;
    }


    let active = true;


    async function loadTimeline() {

      setLoading(true);


      const [
        postsResult,
        docsResult
      ] = await Promise.all([

        supabase
          .from('posts')
          .select(`
            id,
            body,
            created_at,
            user_id,
            audience,
            shared_from_post_id
          `)
          .eq(
            'user_id',
            person.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(60),

        supabase
          .from('documents')
          .select(`
            id,
            user_id,
            file_name,
            storage_path,
            mime_type,
            created_at,
            visibility
          `)
          .eq(
            'user_id',
            person.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(40)

      ]);


      if (!active) {
        return;
      }


      if (postsResult.error) {
        console.error(
          'Profile timeline posts error:',
          postsResult.error
        );
      }


      if (docsResult.error) {
        console.error(
          'Profile timeline documents error:',
          docsResult.error
        );
      }


      const posts =
        (postsResult.data || []).map(
          post => ({
            kind: 'post',
            id: `post-${post.id}`,
            created_at:
              post.created_at,
            data: post
          })
        );


      const rawDocs =
        docsResult.data || [];


      const docsWithLinks =
        await Promise.all(
          rawDocs.map(
            async document => {

              let signedUrl = null;


              if (
                document.storage_path
              ) {

                const {
                  data
                } = await supabase
                  .storage
                  .from(
                    'student-documents'
                  )
                  .createSignedUrl(
                    document.storage_path,
                    300
                  );


                signedUrl =
                  data?.signedUrl ||
                  null;

              }


              return {
                kind: 'document',
                id:
                  `document-${document.id}`,
                created_at:
                  document.created_at,
                data: {
                  ...document,
                  signed_url:
                    signedUrl
                }
              };

            }
          )
        );


      if (!active) {
        return;
      }


      const merged = [
        ...posts,
        ...docsWithLinks
      ].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );


      setItems(merged);
      setLoading(false);

    }


    loadTimeline();


    return () => {
      active = false;
    };

  }, [
    person?.id,
    connectionStatus
  ]);


  if (loading) {

    return (
      <div
        className="empty"
        style={{
          marginTop: 16
        }}
      >
        Loading timeline…
      </div>
    );

  }


  return (

    <div
      style={{
        marginTop: 26,
        paddingTop: 22,
        borderTop:
          '1px solid rgba(0,0,0,0.08)'
      }}
    >

      <div className="section-heading">

        <div>
          <span className="eyebrow dark">
            TIMELINE
          </span>

          <h3
            style={{
              marginTop: 4
            }}
          >
            Posts & shared materials
          </h3>

          <small className="muted">
            {
              connectionStatus ===
              'connected'
                ? 'You are connected. Public and connections-only items are visible.'
                : 'You are not connected. Only public items are visible.'
            }
          </small>
        </div>

      </div>


      {items.length === 0 ? (

        <div className="empty compact">
          No timeline items are visible to you.
        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 14
          }}
        >

          {items.map(item => {

            if (
              item.kind === 'post'
            ) {

              const post =
                item.data;


              return (

                <article
                  key={item.id}
                  className="card"
                  style={{
                    padding: 16
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems:
                          'center'
                      }}
                    >

                      <Avatar
                        profile={person}
                      />

                      <div>
                        <b>
                          {person.name || ''}
                          {' '}
                          {person.surname || ''}
                        </b>

                        <small
                          className="muted"
                          style={{
                            display:
                              'block'
                          }}
                        >
                          {
                            fmtDate(
                              post.created_at
                            )
                          }
                          {' · '}
                          {
                            post.audience ===
                            'connections'
                              ? 'Connections'
                              : 'Public'
                          }
                        </small>
                      </div>

                    </div>


                    <MessageCircle
                      size={16}
                    />

                  </div>


                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap',
                      marginBottom: 0
                    }}
                  >
                    {post.body}
                  </p>


                  {post.shared_from_post_id && (
                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 8
                      }}
                    >
                      Shared post
                    </small>
                  )}

                </article>

              );

            }


            const document =
              item.data;

            const isImage =
              String(
                document.mime_type ||
                ''
              ).startsWith(
                'image/'
              );


            return (

              <article
                key={item.id}
                className="card"
                style={{
                  padding: 16,
                  overflow: 'hidden'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    alignItems:
                      'center',
                    marginBottom: 12
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      gap: 9,
                      alignItems:
                        'center'
                    }}
                  >
                    <FileText
                      size={18}
                    />

                    <div>
                      <b>
                        {
                          document.file_name ||
                          'Shared document'
                        }
                      </b>

                      <small
                        className="muted"
                        style={{
                          display: 'block'
                        }}
                      >
                        {
                          fmtDate(
                            document.created_at
                          )
                        }
                        {' · '}
                        {
                          document.visibility ===
                          'connections'
                            ? 'Connections'
                            : 'Public'
                        }
                      </small>
                    </div>
                  </div>

                </div>


                {isImage &&
                document.signed_url ? (

                  <img
                    src={
                      document.signed_url
                    }
                    alt={
                      document.file_name ||
                      'Shared image'
                    }
                    onClick={() =>
                      onImageClick?.(
                        document.signed_url
                      )
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      maxHeight: 520,
                      objectFit:
                        'contain',
                      borderRadius: 12,
                      cursor:
                        onImageClick
                          ? 'zoom-in'
                          : 'pointer',
                      background:
                        'rgba(15,23,42,0.03)'
                    }}
                  />

                ) : (

                  <button
                    type="button"
                    className="btn subtle"
                    disabled={
                      !document.signed_url
                    }
                    onClick={() => {
                      if (
                        document.signed_url
                      ) {
                        window.open(
                          document.signed_url,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }
                    }}
                  >
                    <FileText
                      size={15}
                    />
                    Open document
                  </button>

                )}

              </article>

            );

          })}

        </div>

      )}

    </div>

  );

}


function Friends({
  profile,
  notify,
  onOpenChat,
  onlineUserIds = []
}) {

  const [people, setPeople] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [connections, setConnections] =
    useState([]);

  const [outgoing, setOutgoing] =
    useState([]);

  const [q, setQ] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [selectedPerson, setSelectedPerson] =
    useState(null);

  const [largeAvatar, setLargeAvatar] =
    useState(null);

  const [postRecipient, setPostRecipient] =
    useState(null);

  const [postSubject, setPostSubject] =
    useState('');

  const [postBody, setPostBody] =
    useState('');

  const [sendingPost, setSendingPost] =
    useState(false);


  /* -------------------------------------------------------
     LOAD NETWORK
     ------------------------------------------------------- */

  useEffect(() => {

    let active = true;


    async function loadNetwork() {

      setLoading(true);


      const {
        data: peopleData,
        error: peopleError
      } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          faculty,
          degree,
          year,
          city,
          avatar_url
        `)
        .neq('id', profile.id)
        .limit(100);


      const {
        data: requestData,
        error: requestError
      } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', profile.id)
        .eq('status', 'pending');


      const {
        data: outgoingData,
        error: outgoingError
      } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', profile.id)
        .eq('status', 'pending');


      const {
        data: connectionData,
        error: connectionError
      } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'accepted')
        .or(
          `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
        );


      if (!active) {
        return;
      }


      if (peopleError) {
        notify(peopleError.message);
      }

      if (requestError) {
        notify(requestError.message);
      }

      if (outgoingError) {
        notify(outgoingError.message);
      }

      if (connectionError) {
        notify(connectionError.message);
      }


      setPeople(
        peopleData || []
      );

      setRequests(
        requestData || []
      );

      setOutgoing(
        outgoingData || []
      );

      setConnections(
        connectionData || []
      );

      setLoading(false);

    }


    loadNetwork();


    return () => {
      active = false;
    };

  }, [profile.id]);



  /* -------------------------------------------------------
     CONNECTION IDS
     ------------------------------------------------------- */

  const connectionIds =
    new Set(
      connections.map(connection =>
        connection.sender_id === profile.id
          ? connection.receiver_id
          : connection.sender_id
      )
    );


  const incomingIds =
    new Set(
      requests.map(request =>
        request.sender_id
      )
    );


  const outgoingIds =
    new Set(
      outgoing.map(request =>
        request.receiver_id
      )
    );


  /* -------------------------------------------------------
     PROFILE LISTS
     ------------------------------------------------------- */

  const connectionProfiles =
    people.filter(person =>
      connectionIds.has(person.id)
    );


  const incomingProfiles =
    people.filter(person =>
      incomingIds.has(person.id)
    );


  /* -------------------------------------------------------
     SEARCH
     ------------------------------------------------------- */

  const searchText =
    q.trim().toLowerCase();


  const filteredPeople =
    people.filter(person => {

      if (
        connectionIds.has(person.id)
      ) {
        return false;
      }


      if (
        incomingIds.has(person.id)
      ) {
        return false;
      }


      if (
        outgoingIds.has(person.id)
      ) {
        return false;
      }


      const text =
        `
        ${person.name || ''}
        ${person.surname || ''}
        ${person.university || ''}
        ${person.faculty || ''}
        ${person.degree || ''}
        ${person.city || ''}
        ${person.year || ''}
        `.toLowerCase();


      return text.includes(
        searchText
      );

    });


  /* -------------------------------------------------------
     CONNECTION STATUS
     ------------------------------------------------------- */

  function getConnectionStatus(
    personId
  ) {

    if (
      connectionIds.has(personId)
    ) {
      return 'connected';
    }


    if (
      incomingIds.has(personId)
    ) {
      return 'incoming';
    }


    if (
      outgoingIds.has(personId)
    ) {
      return 'outgoing';
    }


    return 'none';

  }


  /* -------------------------------------------------------
     OPEN / CLOSE PROFILE
     ------------------------------------------------------- */

  function openProfile(person) {

    setSelectedPerson(person);

  }


  function closeProfile() {

    setSelectedPerson(null);

  }


  /* -------------------------------------------------------
     CONNECT
     ------------------------------------------------------- */

  async function connect(
    receiverId
  ) {

    if (
      !profile?.id ||
      !receiverId ||
      receiverId === profile.id
    ) {

      return;

    }


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


    setOutgoing(current => [
      ...current,
      {
        receiver_id: receiverId,
        sender_id: profile.id,
        status: 'pending'
      }
    ]);


    notify(
      'Connection request sent.'
    );

  }


  /* -------------------------------------------------------
     ACCEPT
     ------------------------------------------------------- */

  async function accept(
    requestId
  ) {

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


    const acceptedRequest =
      requests.find(request =>
        request.id === requestId
      );


    setRequests(current =>
      current.filter(request =>
        request.id !== requestId
      )
    );


    if (acceptedRequest) {

      setConnections(current => [
        ...current,
        {
          ...acceptedRequest,
          status: 'accepted'
        }
      ]);

    }


    notify(
      'Connection accepted.'
    );

  }


  /* -------------------------------------------------------
     DECLINE
     ------------------------------------------------------- */

  async function decline(
    requestId
  ) {

    const {
      error
    } = await supabase
      .from('friend_requests')
      .update({
        status: 'declined'
      })
      .eq('id', requestId);


    if (error) {

      notify(error.message);

      return;

    }


    setRequests(current =>
      current.filter(request =>
        request.id !== requestId
      )
    );


    notify(
      'Connection request declined.'
    );

  }


  /* -------------------------------------------------------
     PRIVATE POST
     Asynchronous communication: does not require connection
     and works whether the recipient is online or offline.
     ------------------------------------------------------- */

  function openPostComposer(person) {

    setPostRecipient(person);
    setPostSubject('');
    setPostBody('');

  }


  function closePostComposer() {

    if (sendingPost) {
      return;
    }

    setPostRecipient(null);
    setPostSubject('');
    setPostBody('');

  }


  async function sendPrivatePost(
    event
  ) {

    event.preventDefault();

    const subject =
      postSubject.trim();

    const body =
      postBody.trim();


    if (
      !postRecipient?.id ||
      !subject ||
      !body ||
      sendingPost
    ) {
      return;
    }


    if (body.length > 5000) {

      notify(
        'Private posts can contain up to 5000 characters.'
      );

      return;
    }


    setSendingPost(true);


    const {
      error
    } = await supabase
      .from('direct_posts')
      .insert({
        sender_id:
          profile.id,
        recipient_id:
          postRecipient.id,
        subject,
        body
      });


    if (error) {

      notify(
        error.message
      );

      setSendingPost(false);
      return;
    }


    notify(
      `Post sent to ${postRecipient.name || 'student'}.`
    );

    setPostRecipient(null);
    setPostSubject('');
    setPostBody('');
    setSendingPost(false);

  }


  /* -------------------------------------------------------
     PUBLIC PROFILE
     ------------------------------------------------------- */

  function PublicProfile({
    person
  }) {

    if (!person) {
      return null;
    }


    const status =
      getConnectionStatus(
        person.id
      );

    const isOnline =
      onlineUserIds.includes(
        person.id
      );

    const canChat =
      status === 'connected' &&
      isOnline;


    return (

      <div
        className="card"
        style={{
          marginBottom: 24,
          position: 'relative'
        }}
      >

        <button
          type="button"
          className="btn subtle"
          onClick={closeProfile}
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            zIndex: 2
          }}
        >
          Close
        </button>


        <div
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 24
          }}
        >

          {/* -------------------------------------------------
             PROFILE PHOTO
             ------------------------------------------------- */}

          <Avatar
            profile={person}
            size="xl"
            onImageClick={setLargeAvatar}
          />


          <div>

            <h2>
              {person.name || ''}{' '}
              {person.surname || ''}
            </h2>


            <p>

              {person.university ||
                'Student'}

              {person.degree
                ? ` · ${person.degree}`
                : ''}

            </p>

          </div>

        </div>


        {/* ---------------------------------------------------
           PROFILE INFORMATION
           --------------------------------------------------- */}

        <div className="grid2">

          <div>

            <strong>
              University
            </strong>

            <p>
              {person.university ||
                'Not specified'}
            </p>

          </div>


          <div>

            <strong>
              Faculty
            </strong>

            <p>
              {person.faculty ||
                'Not specified'}
            </p>

          </div>


          <div>

            <strong>
              Degree
            </strong>

            <p>
              {person.degree ||
                'Not specified'}
            </p>

          </div>


          <div>

            <strong>
              Study year
            </strong>

            <p>
              {person.year ||
                'Not specified'}
            </p>

          </div>


          <div>

            <strong>
              City
            </strong>

            <p>
              {person.city ||
                'Not specified'}
            </p>

          </div>

        </div>


        {/* ---------------------------------------------------
           CONNECTION ACTION
           --------------------------------------------------- */}

        <div
          style={{
            marginTop: 20
          }}
        >

          {status === 'none' && (

            <button
              type="button"
              className="btn primary"
              onClick={() =>
                connect(person.id)
              }
            >

              <UserPlus size={16} />

              Connect

            </button>

          )}


          {status === 'outgoing' && (

            <button
              type="button"
              className="btn subtle"
              disabled
            >
              Request sent
            </button>

          )}


          {status === 'connected' && (

            <button
              type="button"
              className="btn subtle"
              disabled
            >
              Connected ✓
            </button>

          )}


          {status === 'incoming' && (

            <div
              className="two-col"
              style={{
                maxWidth: 320
              }}
            >

              {requests
                .filter(request =>
                  request.sender_id === person.id
                )
                .map(request => (

                  <React.Fragment
                    key={request.id}
                  >

                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        accept(request.id)
                      }
                    >
                      Accept
                    </button>


                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        decline(request.id)
                      }
                    >
                      Decline
                    </button>

                  </React.Fragment>

                ))}

            </div>

          )}

        </div>


        {/* ---------------------------------------------------
           COMMUNICATION
           --------------------------------------------------- */}

        <div
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop:
              '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >

          <button
            type="button"
            className="btn subtle"
            onClick={() =>
              openPostComposer(
                person
              )
            }
          >
            <Mail size={16} />
            Send a post to {person.name || 'student'}
          </button>


          <button
            type="button"
            className={
              canChat
                ? 'btn primary'
                : 'btn subtle'
            }
            disabled={
              !canChat
            }
            title={
              status !== 'connected'
                ? 'Live chat is available between accepted connections.'
                : !isOnline
                  ? `${person.name || 'This student'} is offline. Send a private post instead.`
                  : `Chat live with ${person.name || 'student'}`
            }
            onClick={() =>
              onOpenChat?.(
                person.id
              )
            }
          >
            <MessageCircle size={16} />

            {isOnline &&
            status === 'connected'
              ? `Chat with ${person.name || 'student'}`
              : `${person.name || 'Student'} is offline`}
          </button>


          <span
            className="muted"
            style={{
              width: '100%',
              fontSize: 12
            }}
          >
            Private posts can be sent at any time. Live chat is available only when an accepted connection is online.
          </span>

        </div>


        <ProfileTimeline
          viewer={profile}
          person={person}
          connectionStatus={status}
          notify={notify}
          onImageClick={
            setLargeAvatar
          }
        />

      </div>

    );

  }


  /* -------------------------------------------------------
     RENDER
     ------------------------------------------------------- */

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


      {/* =====================================================
          PUBLIC PROFILE
          ===================================================== */}

      {selectedPerson && (

        <PublicProfile
          person={selectedPerson}
        />

      )}


      {postRecipient && (

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send private post"
          onClick={
            closePostComposer
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10020,
            background:
              'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
        >

          <form
            className="card"
            onSubmit={
              sendPrivatePost
            }
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(620px, 94vw)',
              padding: 22
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 12,
                alignItems:
                  'center',
                marginBottom: 14
              }}
            >

              <div>
                <span className="eyebrow dark">
                  PRIVATE POST
                </span>

                <h3
                  style={{
                    margin:
                      '4px 0 0'
                  }}
                >
                  Send a post to{' '}
                  {postRecipient.name ||
                    'student'}
                </h3>
              </div>


              <button
                type="button"
                className="btn subtle"
                disabled={
                  sendingPost
                }
                onClick={
                  closePostComposer
                }
              >
                Close
              </button>

            </div>


            <input
              id="direct-post-subject"
              name="direct-post-subject"
              type="text"
              value={postSubject}
              maxLength={160}
              autoFocus
              placeholder="Subject"
              onChange={event =>
                setPostSubject(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                marginBottom: 10
              }}
            />


            <textarea
              id="direct-post-body"
              name="direct-post"
              value={postBody}
              maxLength={5000}
              placeholder="Write a private post. The recipient can read it whenever they return to ONSTOOD…"
              onChange={event =>
                setPostBody(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                minHeight: 180,
                resize: 'vertical'
              }}
            />


            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: 12,
                marginTop: 12
              }}
            >

              <small className="muted">
                {postBody.length}/5000
              </small>


              <button
                type="submit"
                className="btn primary"
                disabled={
                  sendingPost ||
                  !postSubject.trim() ||
                  !postBody.trim()
                }
              >
                <Send size={16} />

                {sendingPost
                  ? 'Sending…'
                  : 'Send private post'}
              </button>

            </div>

          </form>

        </div>

      )}


      {/* =====================================================
          CONNECTION REQUESTS
          ===================================================== */}

      {requests.length > 0 && (

        <section>

          <div className="section-heading">

            <h3>
              Connection requests
            </h3>

          </div>


          <div className="people-grid">

            {requests.map(request => {

              const sender =
                incomingProfiles.find(
                  person =>
                    person.id ===
                    request.sender_id
                );


              if (!sender) {
                return null;
              }


              return (

                <div
                  className="card person"
                  key={request.id}
                  onClick={() =>
                    openProfile(sender)
                  }
                  style={{
                    cursor: 'pointer'
                  }}
                >

                  <Avatar
                    profile={sender}
                    size="lg"
                    onImageClick={
                      setLargeAvatar
                    }
                  />


                  <h3>
                    {sender.name || ''}{' '}
                    {sender.surname || ''}
                  </h3>


                  <p>

                    {sender.degree ||
                      'Student'}

                    {sender.university
                      ? ` · ${sender.university}`
                      : ''}

                  </p>


                  <div
                    className="two-col"
                    onClick={event =>
                      event.stopPropagation()
                    }
                  >

                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        accept(request.id)
                      }
                    >
                      Accept
                    </button>


                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        decline(request.id)
                      }
                    >
                      Decline
                    </button>

                  </div>

                </div>

              );

            })}

          </div>

        </section>

      )}


      {/* =====================================================
          MY CONNECTIONS
          ===================================================== */}

      {connectionProfiles.length > 0 && (

        <section>

          <div className="section-heading">

            <h3>
              My connections
            </h3>

          </div>


          <div className="people-grid">

            {connectionProfiles.map(
              person => (

                <div
                  className="card person"
                  key={person.id}
                  onClick={() =>
                    openProfile(person)
                  }
                  style={{
                    cursor: 'pointer'
                  }}
                >

                  <Avatar
                    profile={person}
                    size="lg"
                    onImageClick={
                      setLargeAvatar
                    }
                  />


                  <h3>
                    {person.name || ''}{' '}
                    {person.surname || ''}
                  </h3>


                  <p>

                    {person.degree ||
                      'Student'}

                    {person.university
                      ? ` · ${person.university}`
                      : ''}

                  </p>


                  <button
                    type="button"
                    className="btn subtle full"
                    disabled
                  >
                    Connected ✓
                  </button>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* =====================================================
          PEOPLE YOU MAY KNOW
          ===================================================== */}

      <section>

        <div className="section-heading">

          <h3>
            People you may know
          </h3>

        </div>


        {loading ? (

          <div className="empty">
            Loading students…
          </div>

        ) : filteredPeople.length === 0 ? (

          <div className="empty">

            {q.trim()
              ? 'No students found.'
              : 'No new students to show.'}

          </div>

        ) : (

          <div className="people-grid">

            {filteredPeople.map(
              person => (

                <div
                  className="card person"
                  key={person.id}
                  onClick={() =>
                    openProfile(person)
                  }
                  style={{
                    cursor: 'pointer'
                  }}
                >

                  <Avatar
                    profile={person}
                    size="lg"
                    onImageClick={
                      setLargeAvatar
                    }
                  />


                  <h3>
                    {person.name || ''}{' '}
                    {person.surname || ''}
                  </h3>


                  <p>

                    {person.degree ||
                      'Student'}

                    {person.university
                      ? ` · ${person.university}`
                      : ''}

                  </p>


                  <button
                    type="button"
                    className="btn subtle full"
                    onClick={event => {

                      event.stopPropagation();

                      connect(person.id);

                    }}
                  >

                    <UserPlus size={16} />

                    Connect

                  </button>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          LARGE PROFILE PHOTO
          ===================================================== */}

      {largeAvatar && (

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo"
          onClick={() =>
            setLargeAvatar(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background:
              'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'zoom-out'
          }}
        >

          <button
            type="button"
            className="btn subtle"
            onClick={event => {

              event.stopPropagation();

              setLargeAvatar(null);

            }}
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              zIndex: 10000
            }}
          >
            Close
          </button>


          <img
            src={largeAvatar}
            alt="Profile photo"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              maxWidth:
                'min(92vw, 1000px)',
              maxHeight:
                '88vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow:
                '0 20px 60px rgba(0,0,0,0.45)',
              cursor: 'default'
            }}
          />

        </div>

      )}

    </Page>

  );

}




/* =========================================================
   MESSAGES / COMMUNICATION HUB
   Professional direct messaging foundation:
   - accepted connections only
   - private conversations with RLS
   - realtime messages
   - unread state + read receipts
   - online presence
   - typing indicator
   - secure attachments
   ========================================================= */


function DirectPostsPanel({
  profile,
  notify
}) {

  const [posts, setPosts] =
    useState([]);

  const [peopleById, setPeopleById] =
    useState({});

  const [loading, setLoading] =
    useState(true);


  const [replyPost, setReplyPost] =
    useState(null);

  const [replyBody, setReplyBody] =
    useState('');

  const [forwardPost, setForwardPost] =
    useState(null);

  const [forwardRecipientId, setForwardRecipientId] =
    useState('');

  const [forwardRecipients, setForwardRecipients] =
    useState([]);



  async function loadPosts() {

    setLoading(true);


    const {
      data,
      error
    } = await supabase
      .from('direct_posts')
      .select('*')
      .or(
        `sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(80);


    if (error) {

      notify(
        error.message
      );

      setLoading(false);
      return;
    }


    const rows =
      (data || [])
        .filter(item => {

          if (
            item.sender_id === profile.id &&
            item.sender_deleted_at
          ) {
            return false;
          }

          if (
            item.recipient_id === profile.id &&
            item.recipient_deleted_at
          ) {
            return false;
          }

          return true;
        });

    setPosts(
      rows
    );


    const ids =
      [
        ...new Set(
          rows
            .flatMap(item => [
              item.sender_id,
              item.recipient_id
            ])
            .filter(id =>
              id &&
              id !== profile.id
            )
        )
      ];


    if (ids.length > 0) {

      const {
        data: profilesData
      } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          avatar_url,
          avatar_visibility
        `)
        .in(
          'id',
          ids
        );


      const map = {};

      (profilesData || [])
        .forEach(person => {
          map[person.id] =
            person;
        });

      setPeopleById(
        map
      );

    } else {

      setPeopleById({});

    }


    const unreadIds =
      rows
        .filter(item =>
          item.recipient_id ===
            profile.id &&
          !item.read_at
        )
        .map(item =>
          item.id
        );


    if (
      unreadIds.length > 0
    ) {

      const readAt =
        new Date()
          .toISOString();

      const {
        error: readError
      } = await supabase
        .from('direct_posts')
        .update({
          read_at:
            readAt
        })
        .in(
          'id',
          unreadIds
        )
        .eq(
          'recipient_id',
          profile.id
        );


      if (!readError) {

        setPosts(current =>
          current.map(item =>
            unreadIds.includes(
              item.id
            )
              ? {
                  ...item,
                  read_at:
                    readAt
                }
              : item
          )
        );

      }

    }


    setLoading(false);

  }


  useEffect(() => {

    let active = true;

    loadPosts();


    const channel =
      supabase
        .channel(
          `direct-posts-${profile.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table:
              'direct_posts',
            filter:
              `recipient_id=eq.${profile.id}`
          },
          payload => {

            if (!active) {
              return;
            }

            setPosts(current => [
              payload.new,
              ...current
            ]);

          }
        )
        .subscribe();


    return () => {

      active = false;

      supabase.removeChannel(
        channel
      );

    };

  }, [profile.id]);



  async function loadForwardRecipients() {

    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        surname,
        university
      `)
      .neq(
        'id',
        profile.id
      )
      .order('name')
      .limit(100);


    if (error) {
      notify(error.message);
      return;
    }


    setForwardRecipients(
      data || []
    );

  }


  function beginReply(item) {

    setReplyPost(item);

    setReplyBody('');

  }


  async function sendReply() {

    if (
      !replyPost ||
      !replyBody.trim()
    ) {
      return;
    }


    const recipientId =
      replyPost.sender_id ===
        profile.id
        ? replyPost.recipient_id
        : replyPost.sender_id;


    const subject =
      replyPost.subject
        ? (
          replyPost.subject
            .toLowerCase()
            .startsWith('re:')
            ? replyPost.subject
            : `Re: ${replyPost.subject}`
        )
        : 'Re: Private post';


    const {
      error
    } = await supabase
      .from('direct_posts')
      .insert({
        sender_id:
          profile.id,
        recipient_id:
          recipientId,
        subject,
        body:
          replyBody.trim()
      });


    if (error) {
      notify(error.message);
      return;
    }


    setReplyPost(null);
    setReplyBody('');

    notify('Reply sent.');

    loadPosts();

  }


  async function beginForward(item) {

    setForwardPost(item);
    setForwardRecipientId('');

    if (
      forwardRecipients.length === 0
    ) {
      await loadForwardRecipients();
    }

  }


  async function sendForward() {

    if (
      !forwardPost ||
      !forwardRecipientId
    ) {
      return;
    }


    const subject =
      forwardPost.subject
        ? (
          forwardPost.subject
            .toLowerCase()
            .startsWith('fwd:')
            ? forwardPost.subject
            : `Fwd: ${forwardPost.subject}`
        )
        : 'Fwd: Private post';


    const body =
      `Forwarded private post:\n\n${forwardPost.body || ''}`;


    const {
      error
    } = await supabase
      .from('direct_posts')
      .insert({
        sender_id:
          profile.id,
        recipient_id:
          forwardRecipientId,
        subject,
        body
      });


    if (error) {
      notify(error.message);
      return;
    }


    setForwardPost(null);
    setForwardRecipientId('');

    notify(
      'Private post forwarded.'
    );

    loadPosts();

  }


  async function deletePostForMe(postId) {

    const { error } = await supabase
      .rpc(
        'hide_direct_post_for_me',
        {
          p_post_id: postId
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setPosts(current =>
      current.filter(item =>
        item.id !== postId
      )
    );

    notify(
      'Post removed from your Messages.'
    );
  }


  return (

    <div
      className="card"
      style={{
        marginBottom: 18
      }}
    >

      <div
        className="card-head"
      >
        <div>
          <h3>
            Private posts
          </h3>

          <small className="muted">
            Asynchronous communication — send now, read later.
          </small>
        </div>

        <Mail size={18} />
      </div>


      {loading ? (

        <div className="empty compact">
          Loading private posts…
        </div>

      ) : posts.length === 0 ? (

        <div className="empty compact">
          No private posts yet.
        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 10
          }}
        >

          {posts
            .slice(0, 12)
            .map(item => {

              const incoming =
                item.recipient_id ===
                profile.id;

              const otherId =
                incoming
                  ? item.sender_id
                  : item.recipient_id;

              const person =
                peopleById[
                  otherId
                ] || {};

              return (

                <div
                  key={item.id}
                  style={{
                    border:
                      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    gap: 10,
                    alignItems:
                      'flex-start',
                    background:
                      incoming &&
                      !item.read_at
                        ? 'rgba(37,99,235,0.05)'
                        : 'transparent'
                  }}
                >

                  <Avatar
                    profile={
                      person
                    }
                  />


                  <div
                    style={{
                      minWidth: 0,
                      flex: 1
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 10,
                        flexWrap:
                          'wrap'
                      }}
                    >

                      <b>
                        {incoming
                          ? 'From'
                          : 'To'}{' '}
                        {person.name ||
                          'Student'}{' '}
                        {person.surname ||
                          ''}
                      </b>

                      <small className="muted">
                        {fmtDate(
                          item.created_at
                        )}
                      </small>

                    </div>


                    {item.subject && (
                      <div
                        style={{
                          marginTop: 6,
                          fontWeight: 700
                        }}
                      >
                        Subject: {item.subject}
                      </div>
                    )}


                    <div
                      style={{
                        marginTop: 6,
                        whiteSpace:
                          'pre-wrap',
                        overflowWrap:
                          'anywhere'
                      }}
                    >
                      {item.body}
                    </div>


                    <small
                      className="muted"
                      style={{
                        display:
                          'block',
                        marginTop: 6
                      }}
                    >
                      {incoming
                        ? 'Private post received'
                        : item.read_at
                          ? 'Read'
                          : 'Sent'}
                    </small>

                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 8
                      }}
                    >

                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          beginReply(item)
                        }
                        style={{
                          padding: '6px 9px',
                          fontSize: 11
                        }}
                      >
                        Reply
                      </button>


                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          beginForward(item)
                        }
                        style={{
                          padding: '6px 9px',
                          fontSize: 11
                        }}
                      >
                        Forward
                      </button>


                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        deletePostForMe(item.id)
                      }
                      style={{
                        marginTop: 8,
                        padding: '6px 9px',
                        fontSize: 11
                      }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>

                    </div>

                  </div>

                </div>

              );

            })}

        </div>

      )}


      {replyPost && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setReplyPost(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(560px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              REPLY PRIVATE POST
            </span>

            <h3>
              {
                replyPost.subject
                  ? `Re: ${replyPost.subject.replace(/^Re:\s*/i, '')}`
                  : 'Reply'
              }
            </h3>

            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background:
                  'rgba(15,23,42,0.05)',
                marginBottom: 10,
                whiteSpace:
                  'pre-wrap'
              }}
            >
              {replyPost.body}
            </div>

            <textarea
              name="private-post-reply"
              placeholder="Write your reply…"
              value={replyBody}
              onChange={event =>
                setReplyBody(
                  event.target.value
                )
              }
              style={{
                minHeight: 140
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent:
                  'flex-end',
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setReplyPost(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  !replyBody.trim()
                }
                onClick={
                  sendReply
                }
              >
                Reply
              </button>
            </div>
          </div>
        </div>

      )}


      {forwardPost && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setForwardPost(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(500px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              FORWARD PRIVATE POST
            </span>

            <h3>
              Choose recipient
            </h3>

            <select
              name="private-post-forward-recipient"
              value={
                forwardRecipientId
              }
              onChange={event =>
                setForwardRecipientId(
                  event.target.value
                )
              }
            >
              <option value="">
                Choose a person
              </option>

              {forwardRecipients.map(
                person => (
                  <option
                    key={person.id}
                    value={person.id}
                  >
                    {
                      `${person.name || ''} ${person.surname || ''}`
                        .trim()
                    }
                    {person.university
                      ? ` · ${person.university}`
                      : ''}
                  </option>
                )
              )}
            </select>

            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background:
                  'rgba(15,23,42,0.05)',
                marginTop: 10,
                whiteSpace:
                  'pre-wrap'
              }}
            >
              {forwardPost.body}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent:
                  'flex-end',
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setForwardPost(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  !forwardRecipientId
                }
                onClick={
                  sendForward
                }
              >
                Forward
              </button>
            </div>
          </div>
        </div>

      )}


    </div>

  );

}


function PostOffice({
  profile,
  notify,
  requestedConversationId = null,
  requestedUserId = null,
  onConversationResolved,
  onMessagesRead,
  compact = false,
  onlineUserIds = [],
  onOpenMiniChat,
  onChatDeleted
}) {

  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState(requestedConversationId || null);

  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [typingUserIds, setTypingUserIds] = useState([]);
  const [memberReadAt, setMemberReadAt] = useState({});
  const [search, setSearch] = useState('');

  const [replyToMessage, setReplyToMessage] =
    useState(null);

  const [deleteChoiceMessage, setDeleteChoiceMessage] =
    useState(null);

  const selectedConversation =
    conversations.find(item =>
      item.conversation_id === selectedConversationId
    ) || null;

  const otherUserId =
    selectedConversation?.other_user_id || null;

  const isOtherOnline =
    otherUserId &&
    onlineUserIds.includes(otherUserId);

  const otherIsTyping =
    otherUserId &&
    typingUserIds.includes(otherUserId);


  /* -------------------------------------------------------
     LOAD CONVERSATIONS + AVAILABLE CONNECTIONS
     ------------------------------------------------------- */

  function scrollMessagesToBottom(
    behavior = 'auto'
  ) {

    window.requestAnimationFrame(() => {
      messagesEndRef.current
        ?.scrollIntoView({
          behavior,
          block: 'end'
        });
    });
  }


  useEffect(() => {

    if (
      !selectedConversationId ||
      loadingMessages
    ) {
      return;
    }

    scrollMessagesToBottom('auto');

  }, [
    selectedConversationId,
    loadingMessages
  ]);


  useEffect(() => {

    if (
      !selectedConversationId ||
      messages.length === 0
    ) {
      return;
    }

    scrollMessagesToBottom('smooth');

  }, [
    messages.length
  ]);


  async function loadConversations() {

    const {
      data,
      error
    } = await supabase
      .rpc('list_my_conversations');

    if (error) {
      notify(error.message);
      return [];
    }

    const rows = data || [];

    setConversations(rows);

    return rows;
  }


  async function loadContacts() {

    const {
      data: accepted,
      error
    } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(
        `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
      );

    if (error) {
      notify(error.message);
      return;
    }

    const ids = [
      ...new Set(
        (accepted || []).map(item =>
          item.sender_id === profile.id
            ? item.receiver_id
            : item.sender_id
        )
      )
    ];

    if (ids.length === 0) {
      setContacts([]);
      return;
    }

    const {
      data: profiles,
      error: profilesError
    } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        surname,
        university,
        degree,
        avatar_url,
        avatar_visibility
      `)
      .in('id', ids)
      .order('name');

    if (profilesError) {
      notify(profilesError.message);
      return;
    }

    setContacts(profiles || []);
  }


  useEffect(() => {

    let active = true;

    async function initializePostOffice() {

      setLoading(true);

      const [rows] =
        await Promise.all([
          loadConversations(),
          loadContacts()
        ]);

      if (!active) {
        return;
      }

      if (
        requestedConversationId &&
        rows.some(item =>
          item.conversation_id === requestedConversationId
        )
      ) {
        setSelectedConversationId(
          requestedConversationId
        );
      }

      setLoading(false);
    }

    initializePostOffice();

    return () => {
      active = false;
    };

  }, [profile.id]);


  /* -------------------------------------------------------
     START A DIRECT CONVERSATION
     ------------------------------------------------------- */

  async function startConversation(userId) {

    if (!userId || userId === profile.id) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .rpc(
        'start_direct_conversation',
        {
          other_user_id: userId
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    const conversationId = data;

    await loadConversations();

    setSelectedConversationId(
      conversationId
    );

    onConversationResolved?.(
      conversationId
    );
  }


  useEffect(() => {

    if (!requestedUserId) {
      return;
    }

    startConversation(
      requestedUserId
    );

  }, [requestedUserId]);


  useEffect(() => {

    if (
      requestedConversationId &&
      requestedConversationId !== selectedConversationId
    ) {
      setSelectedConversationId(
        requestedConversationId
      );
    }

  }, [requestedConversationId]);



  /* -------------------------------------------------------
     LOAD + REALTIME MESSAGES
     ------------------------------------------------------- */

  useEffect(() => {

    if (!selectedConversationId) {
      setMessages([]);
      setMemberReadAt({});
      return;
    }

    let active = true;
    let typingTimer = null;

    async function loadMessages() {

      setLoadingMessages(true);

      const [
        messagesResult,
        deletionsResult
      ] = await Promise.all([

        supabase
          .from('messages')
          .select('*')
          .eq(
            'conversation_id',
            selectedConversationId
          )
          .order(
            'created_at',
            {
              ascending: true
            }
          )
          .limit(300),

        supabase
          .from('message_deletions')
          .select('message_id')
          .eq(
            'user_id',
            profile.id
          )

      ]);


      if (messagesResult.error) {

        notify(
          messagesResult.error.message
        );

      } else if (active) {

        const hiddenIds =
          new Set(
            (deletionsResult.data || [])
              .map(item =>
                item.message_id
              )
          );

        setMessages(
          (messagesResult.data || [])
            .filter(message =>
              !hiddenIds.has(
                message.id
              )
            )
        );

      }

      const {
        data: members
      } = await supabase
        .from('conversation_members')
        .select('user_id, last_read_at')
        .eq(
          'conversation_id',
          selectedConversationId
        );

      if (active) {

        const readMap = {};

        (members || []).forEach(member => {
          readMap[member.user_id] =
            member.last_read_at;
        });

        setMemberReadAt(
          readMap
        );
      }

      await markConversationRead(
        selectedConversationId
      );

      if (active) {
        setLoadingMessages(false);
      }
    }

    loadMessages();


    const channel =
      supabase
        .channel(
          `post-office-${selectedConversationId}`,
          {
            config: {
              broadcast: {
                self: false
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter:
              `conversation_id=eq.${selectedConversationId}`
          },
          payload => {

            const message =
              payload.new;

            setMessages(current => {

              if (
                current.some(item =>
                  item.id === message.id
                )
              ) {
                return current;
              }

              return [
                ...current,
                message
              ];
            });

            if (
              message.sender_id !==
              profile.id
            ) {
              markConversationRead(
                selectedConversationId
              );
            }

            loadConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter:
              `conversation_id=eq.${selectedConversationId}`
          },
          payload => {

            setMessages(current =>
              current.map(item =>
                item.id === payload.new.id
                  ? payload.new
                  : item
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_members',
            filter:
              `conversation_id=eq.${selectedConversationId}`
          },
          payload => {

            setMemberReadAt(current => ({
              ...current,
              [payload.new.user_id]:
                payload.new.last_read_at
            }));
          }
        )
        .on(
          'broadcast',
          {
            event: 'typing'
          },
          payload => {

            const userId =
              payload?.payload?.user_id;

            const typing =
              payload?.payload?.typing;

            if (
              !userId ||
              userId === profile.id
            ) {
              return;
            }

            setTypingUserIds(current => {

              const next =
                new Set(current);

              if (typing) {
                next.add(userId);
              } else {
                next.delete(userId);
              }

              return [...next];
            });

            if (typing) {

              window.clearTimeout(
                typingTimer
              );

              typingTimer =
                window.setTimeout(() => {

                  setTypingUserIds(
                    current =>
                      current.filter(
                        id =>
                          id !== userId
                      )
                  );

                }, 3500);
            }
          }
        )
        .subscribe();


    return () => {

      active = false;

      window.clearTimeout(
        typingTimer
      );

      supabase.removeChannel(
        channel
      );
    };

  }, [selectedConversationId, profile.id]);


  async function markConversationRead(
    conversationId
  ) {

    if (!conversationId) {
      return;
    }

    const readAt =
      new Date().toISOString();

    const {
      error
    } = await supabase
      .from('conversation_members')
      .update({
        last_read_at: readAt
      })
      .eq(
        'conversation_id',
        conversationId
      )
      .eq(
        'user_id',
        profile.id
      );

    if (!error) {

      onMessagesRead?.();

      setMemberReadAt(current => ({
        ...current,
        [profile.id]:
          readAt
      }));

      setConversations(current =>
        current.map(item =>
          item.conversation_id ===
          conversationId
            ? {
                ...item,
                my_last_read_at:
                  readAt,
                unread_count: 0
              }
            : item
        )
      );
    }
  }


  /* -------------------------------------------------------
     SEND TEXT MESSAGE
     ------------------------------------------------------- */

  async function sendMessage(
    event
  ) {

    event.preventDefault();

    const body =
      text.trim();

    if (
      !selectedConversationId ||
      !body ||
      sending
    ) {
      return;
    }

    if (!isOtherOnline) {

      notify(
        'Live chat is available only while the other person is online. Send a private post from their profile instead.'
      );

      return;
    }

    if (body.length > 4000) {

      notify(
        'Messages can contain up to 4000 characters.'
      );

      return;
    }

    setSending(true);

    const {
      data,
      error
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          selectedConversationId,
        sender_id:
          profile.id,
        body,
        message_type:
          'text',
        metadata:
          replyToMessage
            ? {
                kind: 'reply',
                reply_to_message_id:
                  replyToMessage.id,
                reply_to_body:
                  replyToMessage.body,
                reply_to_sender_id:
                  replyToMessage.sender_id
              }
            : {}
      })
      .select()
      .single();

    if (error) {

      notify(
        error.message
      );

    } else {

      setText('');
    setReplyToMessage(null);

      setMessages(current => {

        if (
          current.some(item =>
            item.id === data.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          data
        ];
      });

      await markConversationRead(
        selectedConversationId
      );

      await loadConversations();
    }

    setSending(false);
  }


  /* -------------------------------------------------------
     TYPING BROADCAST
     ------------------------------------------------------- */

  async function sendTyping(
    typing
  ) {

    if (!selectedConversationId) {
      return;
    }

    const channel =
      supabase
        .getChannels()
        .find(item =>
          item.topic ===
          `realtime:post-office-${selectedConversationId}`
        );

    if (!channel) {
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: profile.id,
        typing
      }
    });
  }


  function updateText(
    value
  ) {

    setText(value);

    sendTyping(
      value.trim().length > 0
    );
  }


  /* -------------------------------------------------------
     SECURE FILE ATTACHMENTS
     ------------------------------------------------------- */

  async function uploadAttachment(
    event
  ) {

    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (
      !file ||
      !selectedConversationId
    ) {
      return;
    }

    if (!isOtherOnline) {

      notify(
        'Attachments in live chat can be sent only while the other person is online.'
      );

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {

      notify(
        'Attachments must be smaller than 10 MB.'
      );

      return;
    }

    const blockedExtensions =
      [
        'exe',
        'msi',
        'bat',
        'cmd',
        'com',
        'scr',
        'ps1',
        'sh',
        'js',
        'jar'
      ];

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || '';

    if (
      blockedExtensions.includes(
        extension
      )
    ) {

      notify(
        'This file type is not allowed.'
      );

      return;
    }

    setUploading(true);

    try {

      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );

      const storagePath =
        `${selectedConversationId}/${profile.id}/${crypto.randomUUID()}-${safeName}`;

      const {
        error: uploadError
      } = await supabase
        .storage
        .from(
          'message-attachments'
        )
        .upload(
          storagePath,
          file,
          {
            cacheControl: '3600',
            contentType: file.type
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data,
        error: messageError
      } = await supabase
        .from('messages')
        .insert({
          conversation_id:
            selectedConversationId,
          sender_id:
            profile.id,
          body: '',
          message_type:
            'file',
          metadata: {
            file_name:
              file.name,
            storage_path:
              storagePath,
            mime_type:
              file.type,
            size:
              file.size
          }
        })
        .select()
        .single();

      if (messageError) {

        await supabase
          .storage
          .from(
            'message-attachments'
          )
          .remove([
            storagePath
          ]);

        throw messageError;
      }

      setMessages(current => {

        if (
          current.some(item =>
            item.id === data.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          data
        ];
      });

      await loadConversations();

    } catch (error) {

      notify(
        error?.message ||
        'Could not send attachment.'
      );

    } finally {

      setUploading(false);
    }
  }


  async function openAttachment(
    message
  ) {

    const storagePath =
      message?.metadata
        ?.storage_path;

    if (!storagePath) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .storage
      .from(
        'message-attachments'
      )
      .createSignedUrl(
        storagePath,
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


  /* -------------------------------------------------------
     SOFT DELETE OWN MESSAGE
     ------------------------------------------------------- */

  async function deleteMessageForMe(
    message
  ) {

    if (!message?.id) {
      return;
    }


    const {
      error
    } = await supabase
      .from('message_deletions')
      .insert({
        message_id:
          message.id,
        user_id:
          profile.id
      });


    if (
      error &&
      error.code !== '23505'
    ) {
      notify(error.message);
      return;
    }


    setMessages(current =>
      current.filter(item =>
        item.id !== message.id
      )
    );


    setDeleteChoiceMessage(null);

    notify(
      'Message deleted for you.'
    );

  }


  async function deleteMessageForEveryone(
    message
  ) {

    if (
      !message?.id ||
      message.sender_id !==
        profile.id
    ) {
      return;
    }


    const {
      error
    } = await supabase
      .from('messages')
      .update({
        body: '',
        deleted_at:
          new Date().toISOString(),
        metadata: {
          ...(message.metadata || {}),
          deleted_for_everyone:
            true
        }
      })
      .eq(
        'id',
        message.id
      )
      .eq(
        'sender_id',
        profile.id
      );


    if (error) {
      notify(error.message);
      return;
    }


    setMessages(current =>
      current.map(item =>
        item.id === message.id
          ? {
              ...item,
              body: '',
              deleted_at:
                new Date()
                  .toISOString(),
              metadata: {
                ...(item.metadata || {}),
                deleted_for_everyone:
                  true
              }
            }
          : item
      )
    );


    setDeleteChoiceMessage(null);

    notify(
      'Message deleted for everyone.'
    );

  }


  async function deleteConversationForMe() {

    if (!selectedConversationId) {
      return;
    }

    const conversationId =
      selectedConversationId;

    const { error } = await supabase
      .rpc(
        'hide_conversation_for_me',
        {
          p_conversation_id:
            conversationId
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setSelectedConversationId(null);
    setMessages([]);

    await loadConversations();

    notify(
      'Chat removed from your inbox.'
    );

    onChatDeleted?.(
      conversationId
    );
  }


  /* -------------------------------------------------------
     FILTERS + READ RECEIPT
     ------------------------------------------------------- */

  const searchText =
    search.trim().toLowerCase();

  const filteredConversations =
    conversations.filter(item => {

      const haystack =
        `
        ${item.other_name || ''}
        ${item.other_surname || ''}
        ${item.other_university || ''}
        ${item.last_message_body || ''}
        `.toLowerCase();

      return haystack.includes(
        searchText
      );
    });

  const conversationUserIds =
    new Set(
      conversations
        .map(item =>
          item.other_user_id
        )
        .filter(Boolean)
    );

  const availableContacts =
    contacts.filter(contact =>
      !conversationUserIds.has(
        contact.id
      )
    );

  const lastOwnMessage =
    [...messages]
      .reverse()
      .find(message =>
        message.sender_id ===
          profile.id &&
        !message.deleted_at
      );

  const otherLastReadAt =
    otherUserId
      ? memberReadAt[
          otherUserId
        ]
      : null;

  const lastOwnMessageSeen =
    lastOwnMessage &&
    otherLastReadAt &&
    new Date(otherLastReadAt) >=
      new Date(
        lastOwnMessage.created_at
      );



  /* -------------------------------------------------------
     RENDER
     ------------------------------------------------------- */

  return (

    <Page
      eyebrow="COMMUNICATION"
      title="Messages"
      hideHeading={compact}
      action={
        <span className="muted">
          Private posts anytime · live chat when your connection is online.
        </span>
      }
    >

      {!compact && (
        <DirectPostsPanel
          profile={profile}
          notify={notify}
        />
      )}


      <div
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'stretch',
          flexWrap: 'wrap',
          height:
            compact
              ? '100%'
              : 'auto'
        }}
      >

        {!compact && (

          <>
            {/* =================================================
                INBOX
                ================================================= */}

        <div
          className="card"
          style={{
            flex:
              '1 1 300px',
            minWidth: 280,
            maxWidth: 380,
            padding: 16
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14
            }}
          >

            <Mail size={19} />

            <div>
              <b>Inbox</b>
              <div
                className="muted"
                style={{
                  fontSize: 12
                }}
              >
                Conversations & unread messages
              </div>
            </div>

          </div>


          <div
            className="search-box"
            style={{
              width: '100%',
              marginBottom: 14
            }}
          >

            <Search size={16} />

            <input
              placeholder="Search messages…"
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>


          {loading ? (

            <div className="empty compact">
              Loading inbox…
            </div>

          ) : (

            <>

              {filteredConversations
                .map(item => {

                  const online =
                    onlineUserIds.includes(
                      item.other_user_id
                    );

                  return (

                    <button
                      type="button"
                      key={
                        item.conversation_id
                      }
                      onClick={() => {

                        if (
                          !compact &&
                          typeof onOpenMiniChat === 'function'
                        ) {
                          onOpenMiniChat(
                            item.other_user_id,
                            item.conversation_id
                          );
                          return;
                        }

                        setSelectedConversationId(
                          item.conversation_id
                        );

                        onConversationResolved?.(
                          item.conversation_id
                        );
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        textAlign: 'left',
                        border: 0,
                        background:
                          selectedConversationId ===
                          item.conversation_id
                            ? 'rgba(0,0,0,0.05)'
                            : 'transparent',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                        marginBottom: 5
                      }}
                    >

                      <div
                        style={{
                          position:
                            'relative',
                          flexShrink: 0
                        }}
                      >

                        <Avatar
                          profile={{
                            id:
                              item.other_user_id,
                            name:
                              item.other_name,
                            surname:
                              item.other_surname,
                            avatar_url:
                              item.other_avatar_url,
                            avatar_visibility:
                              item.other_avatar_visibility
                          }}
                        />

                        <span
                          title={
                            online
                              ? 'Online'
                              : 'Offline'
                          }
                          style={{
                            position:
                              'absolute',
                            right: -1,
                            bottom: -1,
                            width: 10,
                            height: 10,
                            borderRadius:
                              '50%',
                            background:
                              online
                                ? '#22c55e'
                                : '#9ca3af',
                            border:
                              '2px solid white'
                          }}
                        />

                      </div>


                      <div
                        style={{
                          minWidth: 0,
                          flex: 1
                        }}
                      >

                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            gap: 8
                          }}
                        >

                          <b
                            style={{
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap'
                            }}
                          >
                            {item.other_name ||
                              'Student'}{' '}
                            {item.other_surname ||
                              ''}
                          </b>

                          {Number(
                            item.unread_count ||
                            0
                          ) > 0 && (

                            <span
                              style={{
                                minWidth:
                                  20,
                                height:
                                  20,
                                borderRadius:
                                  10,
                                padding:
                                  '0 6px',
                                display:
                                  'inline-flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                background:
                                  '#ef4444',
                                color:
                                  '#fff',
                                fontSize:
                                  11,
                                fontWeight:
                                  700
                              }}
                            >
                              {Number(
                                item.unread_count
                              ) > 99
                                ? '99+'
                                : item.unread_count}
                            </span>

                          )}

                        </div>

                        <small
                          className="muted"
                          style={{
                            display:
                              'block',
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {item.last_message_type ===
                          'file'
                            ? '📎 Attachment'
                            : item.last_message_body ||
                              item.other_university ||
                              'Start a conversation'}
                        </small>

                      </div>

                    </button>

                  );
                })}


              {filteredConversations.length ===
                0 && (

                <div
                  className="empty compact"
                >
                  No conversations found.
                </div>

              )}


              {availableContacts.length >
                0 && (

                <div
                  style={{
                    marginTop: 20
                  }}
                >

                  <div
                    className="muted"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 8
                    }}
                  >
                    START A CONVERSATION
                  </div>

                  {availableContacts
                    .slice(0, 8)
                    .map(contact => (

                      <button
                        type="button"
                        key={contact.id}
                        onClick={() =>
                          startConversation(
                            contact.id
                          )
                        }
                        style={{
                          width:
                            '100%',
                          border: 0,
                          background:
                            'transparent',
                          padding:
                            '8px 4px',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: 9,
                          cursor:
                            'pointer',
                          textAlign:
                            'left'
                        }}
                      >

                        <Avatar
                          profile={
                            contact
                          }
                        />

                        <span>
                          {contact.name ||
                            'Student'}{' '}
                          {contact.surname ||
                            ''}
                        </span>

                      </button>

                    ))}

                </div>

              )}

            </>

          )}

        </div>

          </>

        )}


        {/* =================================================
            CONVERSATION
            ================================================= */}

        <div
          className="card"
          style={{
            flex:
              '3 1 520px',
            minWidth:
              compact
                ? 0
                : 300,
            minHeight:
              compact
                ? 0
                : 560,
            height:
              compact
                ? '100%'
                : 'auto',
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection:
              'column'
          }}
        >

          {!selectedConversation ? (

            <div
              className="empty"
              style={{
                margin: 'auto',
                padding: 40
              }}
            >
              <Mail size={34} />
              <h3>
                Your ONSTOOD Messages
              </h3>
              <p>
                Select a conversation or start one with an accepted connection.
              </p>
            </div>

          ) : (

            <>

              {/* HEADER */}

              <div
                style={{
                  padding:
                    '16px 18px',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.08)',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: 12
                }}
              >

                <Avatar
                  profile={{
                    id:
                      selectedConversation.other_user_id,
                    name:
                      selectedConversation.other_name,
                    surname:
                      selectedConversation.other_surname,
                    avatar_url:
                      selectedConversation.other_avatar_url,
                    avatar_visibility:
                      selectedConversation.other_avatar_visibility
                  }}
                />

                <div
                  style={{
                    minWidth: 0
                  }}
                >

                  <b>
                    {selectedConversation.other_name ||
                      'Student'}{' '}
                    {selectedConversation.other_surname ||
                      ''}
                  </b>

                  <div
                    style={{
                      fontSize:
                        12
                    }}
                    className="muted"
                  >
                    {otherIsTyping
                      ? 'Typing…'
                      : isOtherOnline
                        ? 'Online'
                        : selectedConversation.other_university ||
                          'Offline'}
                  </div>

                </div>

                <button
                  type="button"
                  className="btn subtle"
                  onClick={
                    deleteConversationForMe
                  }
                  style={{
                    marginLeft: 'auto',
                    padding: '7px 9px'
                  }}
                  title="Delete this chat from your inbox"
                >
                  <Trash2 size={14} />
                  Delete
                </button>

              </div>


              {/* MESSAGES */}

              <div
                style={{
                  flex: 1,
                  overflowY:
                    'auto',
                  padding: 18,
                  background:
                    'rgba(0,0,0,0.015)'
                }}
              >

                {loadingMessages ? (

                  <div className="empty compact">
                    Loading messages…
                  </div>

                ) : messages.length ===
                  0 ? (

                  <div className="empty compact">
                    No messages yet. Say hello.
                  </div>

                ) : (

                  messages.map(
                    message => {

                      const mine =
                        message.sender_id ===
                        profile.id;

                      return (

                        <div
                          key={
                            message.id
                          }
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              mine
                                ? 'flex-end'
                                : 'flex-start',
                            marginBottom:
                              10
                          }}
                        >

                          <div
                            style={{
                              maxWidth:
                                'min(78%, 650px)',
                              padding:
                                '10px 12px',
                              borderRadius:
                                14,
                              background:
                                mine
                                  ? 'rgba(37,99,235,0.12)'
                                  : '#fff',
                              border:
                                '1px solid rgba(0,0,0,0.07)'
                            }}
                          >

                            {message.metadata?.kind ===
                              'reply' &&
                              message.metadata
                                ?.reply_to_body && (
                              <div
                                style={{
                                  padding:
                                    '7px 9px',
                                  marginBottom: 7,
                                  borderLeft:
                                    '3px solid rgba(37,99,235,0.45)',
                                  background:
                                    'rgba(37,99,235,0.06)',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  opacity: 0.8
                                }}
                              >
                                <small
                                  style={{
                                    display: 'block',
                                    fontWeight: 700,
                                    marginBottom: 2
                                  }}
                                >
                                  Reply to
                                </small>
                                {
                                  message.metadata
                                    .reply_to_body
                                }
                              </div>
                            )}

                            {message.deleted_at ? (

                              <span
                                className="muted"
                                style={{
                                  fontStyle:
                                    'italic'
                                }}
                              >
                                Message deleted
                              </span>

                            ) : message.message_type ===
                              'file' ? (

                              <button
                                type="button"
                                className="btn subtle"
                                onClick={() =>
                                  openAttachment(
                                    message
                                  )
                                }
                              >
                                <Paperclip
                                  size={
                                    15
                                  }
                                />
                                {message
                                  .metadata
                                  ?.file_name ||
                                  'Attachment'}
                              </button>

                            ) : (

                              <div
                                style={{
                                  whiteSpace:
                                    'pre-wrap',
                                  overflowWrap:
                                    'anywhere'
                                }}
                              >
                                {message.body}
                              </div>

                            )}


                            <div
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'flex-end',
                                gap: 8,
                                marginTop:
                                  5,
                                fontSize:
                                  10,
                                opacity:
                                  0.58
                              }}
                            >

                              <span>
                                {fmtDate(
                                  message.created_at
                                )}
                              </span>


                              {!message.deleted_at && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyToMessage(
                                        message
                                      )
                                    }
                                    style={{
                                      border: 0,
                                      background:
                                        'transparent',
                                      fontSize: 10,
                                      opacity: 0.8,
                                      cursor:
                                        'pointer'
                                    }}
                                  >
                                    Reply
                                  </button>

                                </>
                              )}


                              {mine &&
                                !message.deleted_at && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteChoiceMessage(
                                      message
                                    )
                                  }
                                  style={{
                                    border:
                                      0,
                                    background:
                                      'transparent',
                                    fontSize:
                                      10,
                                    opacity:
                                      0.75,
                                    cursor:
                                      'pointer'
                                  }}
                                >
                                  Delete
                                </button>

                              )}

                            </div>

                          </div>

                        </div>

                      );
                    }
                  )

                )}


                {lastOwnMessage && (

                  <div
                    style={{
                      textAlign:
                        'right',
                      fontSize:
                        11,
                      opacity:
                        0.6,
                      marginTop:
                        4
                    }}
                  >
                    {lastOwnMessageSeen
                      ? 'Seen'
                      : 'Sent'}
                  </div>

                )}

                <div ref={messagesEndRef} />

              </div>


              {/* COMPOSER */}

              {replyToMessage && (
                <div
                  style={{
                    margin:
                      '0 14px 8px',
                    padding:
                      '9px 11px',
                    borderRadius: 10,
                    background:
                      'rgba(37,99,235,0.07)',
                    borderLeft:
                      '3px solid rgba(37,99,235,0.45)',
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 10,
                    alignItems:
                      'center'
                  }}
                >
                  <div
                    style={{
                      minWidth: 0
                    }}
                  >
                    <small
                      style={{
                        fontWeight: 700
                      }}
                    >
                      Replying to message
                    </small>
                    <div
                      style={{
                        whiteSpace:
                          'nowrap',
                        overflow:
                          'hidden',
                        textOverflow:
                          'ellipsis',
                        maxWidth:
                          520,
                        fontSize: 12
                      }}
                    >
                      {replyToMessage.body}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setReplyToMessage(null)
                    }
                    title="Cancel reply"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form
                onSubmit={
                  sendMessage
                }
                style={{
                  padding: 14,
                  borderTop:
                    '1px solid rgba(0,0,0,0.08)',
                  display:
                    'flex',
                  gap: 10,
                  alignItems:
                    'center'
                }}
              >

                <label
                  className="icon-btn"
                  title="Attach file"
                  style={{
                    cursor:
                      uploading ||
                      !isOtherOnline
                        ? 'default'
                        : 'pointer',
                    flexShrink: 0
                  }}
                >

                  <Paperclip
                    size={18}
                  />

                  <input
                    type="file"
                    hidden
                    disabled={
                      uploading ||
                      !isOtherOnline
                    }
                    onChange={
                      uploadAttachment
                    }
                  />

                </label>


                <input
                  placeholder={
                    !isOtherOnline
                      ? 'Offline — use Send a post from their profile'
                      : uploading
                        ? 'Uploading attachment…'
                        : 'Write a live message…'
                  }
                  value={text}
                  maxLength={4000}
                  disabled={
                    sending ||
                    uploading ||
                    !isOtherOnline
                  }
                  onChange={event =>
                    updateText(
                      event.target
                        .value
                    )
                  }
                  onBlur={() =>
                    sendTyping(
                      false
                    )
                  }
                  style={{
                    flex: 1
                  }}
                />


                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    sending ||
                    uploading ||
                    !isOtherOnline ||
                    !text.trim()
                  }
                >
                  <Send size={16} />
                  Send
                </button>

              </form>

            </>

          )}

        </div>

      </div>

      {deleteChoiceMessage && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setDeleteChoiceMessage(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(430px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              DELETE MESSAGE
            </span>

            <h3>
              Choose delete option
            </h3>

            <div
              style={{
                display: 'grid',
                gap: 8
              }}
            >
              <button
                type="button"
                className="btn subtle full"
                onClick={() =>
                  deleteMessageForMe(
                    deleteChoiceMessage
                  )
                }
              >
                Delete for me
              </button>

              {deleteChoiceMessage
                .sender_id ===
                profile.id && (

                <button
                  type="button"
                  className="btn primary full"
                  onClick={() =>
                    deleteMessageForEveryone(
                      deleteChoiceMessage
                    )
                  }
                >
                  Delete for everyone
                </button>

              )}

              <button
                type="button"
                className="btn subtle full"
                onClick={() =>
                  setDeleteChoiceMessage(null)
                }
              >
                Cancel
              </button>
            </div>
          </div>
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
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    starts_at: '',
    location: ''
  });


  useEffect(() => {

    let active = true;


    async function loadEvents() {

      setLoadingEvents(true);

      try {

        const {
          data,
          error
        } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', profile.id)
          .order('starts_at', {
            ascending: true
          })
          .limit(50);


        if (error) {
          throw error;
        }


        if (!active) {
          return;
        }


        const safeEvents =
          (Array.isArray(data) ? data : [])
            .filter(item =>
              item &&
              typeof item === 'object' &&
              item.id
            );


        setEvents(safeEvents);

      } catch (error) {

        console.error(
          'Calendar load error:',
          error
        );

        if (active) {
          setEvents([]);
        }

        notify(
          error?.message ||
          'Could not load calendar.'
        );

      } finally {

        if (active) {
          setLoadingEvents(false);
        }

      }

    }


    loadEvents();


    return () => {
      active = false;
    };

  }, [profile.id]);


  async function addEvent(event) {

    event.preventDefault();


    const title =
      form.title.trim();

    const startsAt =
      safeDate(form.starts_at);


    if (!title || !startsAt) {

      notify(
        'Add a valid event title and date.'
      );

      return;
    }


    setSaving(true);


    try {

      const payload = {
        user_id: profile.id,
        title,
        starts_at:
          startsAt.toISOString(),
        location:
          form.location.trim()
      };


      const {
        data,
        error
      } = await supabase
        .from('calendar_events')
        .insert(payload)
        .select()
        .single();


      if (error) {
        throw error;
      }


      setEvents(current =>
        [...current, data]
          .filter(Boolean)
          .sort((a, b) => {

            const aDate =
              safeDate(a?.starts_at);

            const bDate =
              safeDate(b?.starts_at);


            if (!aDate && !bDate) {
              return 0;
            }

            if (!aDate) {
              return 1;
            }

            if (!bDate) {
              return -1;
            }

            return (
              aDate.getTime() -
              bDate.getTime()
            );

          })
      );


      setForm({
        title: '',
        starts_at: '',
        location: ''
      });


      notify(
        'Event added.'
      );

    } catch (error) {

      console.error(
        'Calendar save error:',
        error
      );

      notify(
        error?.message ||
        'Could not save event.'
      );

    } finally {

      setSaving(false);

    }

  }


  async function deleteEvent(id) {

    if (!id) {
      return;
    }


    try {

      const {
        error
      } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq(
          'user_id',
          profile.id
        );


      if (error) {
        throw error;
      }


      setEvents(current =>
        current.filter(item =>
          item?.id !== id
        )
      );


      notify(
        'Event deleted.'
      );

    } catch (error) {

      console.error(
        'Calendar delete error:',
        error
      );

      notify(
        error?.message ||
        'Could not delete event.'
      );

    }

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


          {loadingEvents ? (

            <div className="empty compact">
              Loading events…
            </div>

          ) : events.length === 0 ? (

            <div className="empty compact">
              No events yet.
            </div>

          ) : (

            events.map(item => {

              const title =
                typeof item?.title === 'string'
                  ? item.title
                  : 'Untitled event';

              const location =
                typeof item?.location === 'string'
                  ? item.location
                  : '';

              return (

                <div
                  className="event-row"
                  key={
                    item.id ||
                    `${title}-${item.starts_at || ''}`
                  }
                >

                  <div className="event-date">

                    {safeDay(
                      item.starts_at
                    )}

                    <small>
                      {safeMonth(
                        item.starts_at
                      )}
                    </small>

                  </div>


                  <div className="event-info">

                    <b>
                      {title}
                    </b>

                    <small>

                      {fmtDate(
                        item.starts_at
                      ) || 'Date not available'}

                      {location
                        ? ` · ${location}`
                        : ''}

                    </small>

                  </div>


                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      deleteEvent(
                        item.id
                      )
                    }
                    title="Delete event"
                  >
                    <Trash2 size={15} />
                  </button>

                </div>

              );

            })

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
            id="calendar-title"
            name="calendar-title"
            placeholder="Event title"
            value={form.title}
            onChange={e =>
              setForm(current => ({
                ...current,
                title:
                  e.target.value
              }))
            }
            required
          />


          <input
            id="calendar-starts-at"
            name="calendar-starts-at"
            type="datetime-local"
            value={form.starts_at}
            onChange={e =>
              setForm(current => ({
                ...current,
                starts_at:
                  e.target.value
              }))
            }
            required
          />


          <input
            id="calendar-location"
            name="calendar-location"
            placeholder="Location / online link"
            value={form.location}
            onChange={e =>
              setForm(current => ({
                ...current,
                location:
                  e.target.value
              }))
            }
          />


          <button
            type="submit"
            className="btn primary full"
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : 'Save event'}
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
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [busy, setBusy] = useState(false);


  useEffect(() => {

    let active = true;


    async function loadDocuments() {

      setLoadingDocs(true);


      try {

        const {
          data,
          error
        } = await supabase
          .from('documents')
          .select('*')
          .eq(
            'user_id',
            profile.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          );


        if (error) {
          throw error;
        }


        if (!active) {
          return;
        }


        const safeDocs =
          (Array.isArray(data) ? data : [])
            .filter(item =>
              item &&
              typeof item === 'object' &&
              item.id
            );


        setDocs(safeDocs);

      } catch (error) {

        console.error(
          'Documents load error:',
          error
        );

        if (active) {
          setDocs([]);
        }

        notify(
          error?.message ||
          'Could not load documents.'
        );

      } finally {

        if (active) {
          setLoadingDocs(false);
        }

      }

    }


    loadDocuments();


    return () => {
      active = false;
    };

  }, [profile.id]);


  async function upload(event) {

    const input =
      event.target;

    const file =
      input.files?.[0];


    if (!file) {
      return;
    }


    const maxSize =
      25 * 1024 * 1024;


    if (file.size > maxSize) {

      notify(
        'Document must be smaller than 25 MB.'
      );

      input.value = '';
      return;
    }


    setBusy(true);


    let uploadedPath = null;


    try {

      const safeName =
        String(file.name || 'document')
          .replace(/[\\/]/g, '-');


      uploadedPath =
        `${profile.id}/${crypto.randomUUID()}-${safeName}`;


      const {
        error: uploadError
      } = await supabase
        .storage
        .from('student-documents')
        .upload(
          uploadedPath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType:
              file.type ||
              'application/octet-stream'
          }
        );


      if (uploadError) {
        throw uploadError;
      }


      const {
        data,
        error: dbError
      } = await supabase
        .from('documents')
        .insert({
          user_id:
            profile.id,
          file_name:
            file.name || 'Document',
          storage_path:
            uploadedPath,
          mime_type:
            file.type ||
            'application/octet-stream',
          visibility:
            'private'
        })
        .select()
        .single();


      if (dbError) {
        throw dbError;
      }


      setDocs(current => [
        data,
        ...current
      ].filter(Boolean));


      notify(
        'Document uploaded.'
      );

    } catch (error) {

      console.error(
        'Document upload error:',
        error
      );


      if (uploadedPath) {

        await supabase
          .storage
          .from('student-documents')
          .remove([
            uploadedPath
          ]);

      }


      notify(
        error?.message ||
        'Could not upload document.'
      );

    } finally {

      setBusy(false);
      input.value = '';

    }

  }


  async function openDocument(item) {

    const path =
      item?.storage_path;


    if (
      !path ||
      typeof path !== 'string'
    ) {

      notify(
        'This document has no valid storage path.'
      );

      return;
    }


    try {

      const {
        data,
        error
      } = await supabase
        .storage
        .from('student-documents')
        .createSignedUrl(
          path,
          300
        );


      if (error) {
        throw error;
      }


      if (!data?.signedUrl) {

        throw new Error(
          'Could not create document link.'
        );

      }


      window.open(
        data.signedUrl,
        '_blank',
        'noopener,noreferrer'
      );

    } catch (error) {

      console.error(
        'Open document error:',
        error
      );

      notify(
        error?.message ||
        'Could not open document.'
      );

    }

  }


  async function updateDocumentVisibility(
    item,
    visibility
  ) {

    if (
      !item?.id ||
      ![
        'private',
        'connections',
        'public'
      ].includes(
        visibility
      )
    ) {
      return;
    }


    const {
      data,
      error
    } = await supabase
      .from('documents')
      .update({
        visibility
      })
      .eq(
        'id',
        item.id
      )
      .eq(
        'user_id',
        profile.id
      )
      .select()
      .single();


    if (error) {
      notify(error.message);
      return;
    }


    setDocs(current =>
      current.map(document =>
        document.id === item.id
          ? data
          : document
      )
    );


    notify(
      visibility === 'public'
        ? 'Document is now public.'
        : visibility === 'connections'
          ? 'Document is now visible to connections.'
          : 'Document is private.'
    );

  }


  async function deleteDocument(item) {

    if (!item?.id) {
      return;
    }


    try {

      if (
        typeof item.storage_path ===
        'string'
      ) {

        const {
          error: storageError
        } = await supabase
          .storage
          .from('student-documents')
          .remove([
            item.storage_path
          ]);


        if (storageError) {
          throw storageError;
        }

      }


      const {
        error
      } = await supabase
        .from('documents')
        .delete()
        .eq(
          'id',
          item.id
        )
        .eq(
          'user_id',
          profile.id
        );


      if (error) {
        throw error;
      }


      setDocs(current =>
        current.filter(document =>
          document?.id !== item.id
        )
      );


      notify(
        'Document deleted.'
      );

    } catch (error) {

      console.error(
        'Delete document error:',
        error
      );

      notify(
        error?.message ||
        'Could not delete document.'
      );

    }

  }


  return (

    <Page
      eyebrow="YOUR SPACE"
      title="Documents"

      action={

        <label
          className="btn primary upload-btn"
          style={{
            cursor:
              busy
                ? 'default'
                : 'pointer'
          }}
        >

          <Upload size={16} />

          {busy
            ? 'Uploading…'
            : 'Upload document'}


          <input
            type="file"
            onChange={upload}
            hidden
            disabled={busy}
          />

        </label>

      }
    >

      <div className="card dropzone">

        <FileText size={28} />

        <h3>
          Your study library
        </h3>

        <p>
          Keep files private, share them with
          connections, or publish selected
          materials on your profile timeline.
        </p>

      </div>


      {loadingDocs ? (

        <div className="empty">
          Loading documents…
        </div>

      ) : docs.length === 0 ? (

        <div className="empty">
          No documents yet.
        </div>

      ) : (

        <div className="doc-grid">

          {docs.map(item => {

            const fileName =
              typeof item?.file_name === 'string' &&
              item.file_name.trim()
                ? item.file_name
                : 'Document';


            return (

              <div
                className="card doc"
                key={
                  item.id ||
                  item.storage_path ||
                  fileName
                }
                style={{
                  position: 'relative'
                }}
              >

                <button
                  type="button"
                  onClick={() =>
                    openDocument(item)
                  }
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >

                  <FileText />

                  <div>

                    <b>
                      {fileName}
                    </b>

                    <small>
                      {fmtDate(
                        item.created_at
                      ) || 'Stored document'}
                    </small>

                  </div>

                </button>


                <label
                  style={{
                    display: 'block',
                    marginTop: 10
                  }}
                >
                  <small className="muted">
                    Visibility
                  </small>

                  <select
                    name={`document-visibility-${item.id}`}
                    value={
                      item.visibility ||
                      'private'
                    }
                    onChange={event =>
                      updateDocumentVisibility(
                        item,
                        event.target.value
                      )
                    }
                    style={{
                      marginTop: 5,
                      width: '100%'
                    }}
                  >
                    <option value="private">
                      Private
                    </option>

                    <option value="connections">
                      Connections
                    </option>

                    <option value="public">
                      Public
                    </option>
                  </select>
                </label>


                <button
                  type="button"
                  className="icon-btn"
                  title="Delete document"
                  onClick={() =>
                    deleteDocument(item)
                  }
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10
                  }}
                >
                  <Trash2 size={15} />
                </button>

              </div>

            );

          })}

        </div>

      )}

    </Page>

  );

}


/* =========================================================
   COURSES
   ========================================================= */

function CourseTypeBadge({
  type
}) {

  const labels = {
    open: 'OPEN',
    free: 'FREE',
    paid: 'PAID',
    private: 'PRIVATE'
  };


  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 24,
        padding: '4px 9px',
        borderRadius: 999,
        background:
          type === 'paid'
            ? 'rgba(99,102,241,0.12)'
            : type === 'private'
              ? 'rgba(15,23,42,0.08)'
              : 'rgba(34,197,94,0.12)',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.06em'
      }}
    >
      {labels[type] || 'COURSE'}
    </span>
  );
}


function Courses({
  profile,
  notify
}) {

  const [courses, setCourses] =
    useState([]);

  const [enrollments, setEnrollments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [selectedCourse, setSelectedCourse] =
    useState(null);

  const [workspaceTab, setWorkspaceTab] =
    useState('overview');

  const [sessions, setSessions] =
    useState([]);

  const [lessons, setLessons] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [members, setMembers] =
    useState([]);

  const [attendance, setAttendance] =
    useState([]);

  const [workspaceLoading, setWorkspaceLoading] =
    useState(false);

  const [courseForm, setCourseForm] =
    useState({
      title: '',
      description: '',
      course_type: 'free',
      language: 'English',
      price: ''
    });

  const [sessionForm, setSessionForm] =
    useState({
      title: '',
      starts_at: '',
      room_url: ''
    });


  const [lessonForm, setLessonForm] =
    useState({
      title: '',
      summary: '',
      content: '',
      file: null
    });

  const [assignmentForm, setAssignmentForm] =
    useState({
      title: '',
      instructions: '',
      due_at: ''
    });

  const [submissions, setSubmissions] =
    useState([]);

  const [submissionText, setSubmissionText] =
    useState({});

  const [liveHands, setLiveHands] =
    useState([]);

  const [liveChat, setLiveChat] =
    useState([]);

  const [liveChatText, setLiveChatText] =
    useState('');


  async function loadCourses() {

    setLoading(true);


    const [
      coursesResult,
      enrollmentsResult
    ] = await Promise.all([

      supabase
        .from('courses')
        .select(`
          id,
          owner_id,
          title,
          description,
          course_type,
          status,
          language,
          price_cents,
          currency,
          starts_at,
          ends_at,
          created_at
        `)
        .neq(
          'status',
          'archived'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        ),

      supabase
        .from('course_enrollments')
        .select(`
          id,
          course_id,
          user_id,
          role,
          status,
          enrolled_at
        `)
        .eq(
          'user_id',
          profile.id
        )
        .eq(
          'status',
          'active'
        )

    ]);


    if (coursesResult.error) {
      notify(
        coursesResult.error.message
      );
    }


    if (enrollmentsResult.error) {
      notify(
        enrollmentsResult.error.message
      );
    }


    setCourses(
      coursesResult.data || []
    );

    setEnrollments(
      enrollmentsResult.data || []
    );

    setLoading(false);

  }


  useEffect(() => {

    loadCourses();

  }, [profile.id]);


  const enrolledIds =
    new Set(
      enrollments.map(item =>
        item.course_id
      )
    );


  const myCourses =
    courses.filter(course =>
      course.owner_id === profile.id ||
      enrolledIds.has(course.id)
    );


  const discoverCourses =
    courses.filter(course =>
      course.status === 'published' &&
      course.course_type !== 'private' &&
      course.owner_id !== profile.id &&
      !enrolledIds.has(course.id)
    );


  async function createCourse(
    event
  ) {

    event.preventDefault();


    const title =
      courseForm.title.trim();

    const description =
      courseForm.description.trim();


    if (!title) {
      return;
    }


    let priceCents = 0;


    if (
      courseForm.course_type ===
        'paid'
    ) {

      const parsed =
        Number(
          courseForm.price
        );


      if (
        !Number.isFinite(parsed) ||
        parsed <= 0
      ) {

        notify(
          'Enter a valid course price.'
        );

        return;
      }


      priceCents =
        Math.round(
          parsed * 100
        );

    }


    setCreating(true);


    const {
      data,
      error
    } = await supabase
      .from('courses')
      .insert({
        owner_id:
          profile.id,
        title,
        name:
          title,
        description,
        course_type:
          courseForm.course_type,
        status:
          'published',
        language:
          courseForm.language.trim() ||
          'English',
        price_cents:
          priceCents,
        currency:
          'EUR'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.message
      );

      setCreating(false);

      return;
    }


    setCourses(current => [
      data,
      ...current
    ]);

    setCourseForm({
      title: '',
      description: '',
      course_type: 'free',
      language: 'English',
      price: ''
    });

    setShowCreate(false);
    setCreating(false);

    notify(
      'Course published.'
    );

  }


  async function joinCourse(
    course
  ) {

    if (
      course.course_type ===
        'paid'
    ) {

      notify(
        'Paid enrollment is prepared. Payments will be connected in the next phase.'
      );

      return;
    }


    const {
      data,
      error
    } = await supabase
      .from(
        'course_enrollments'
      )
      .insert({
        course_id:
          course.id,
        user_id:
          profile.id,
        role:
          'student',
        status:
          'active'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.code === '23505'
          ? 'You are already enrolled.'
          : error.message
      );

      return;
    }


    setEnrollments(current => [
      data,
      ...current
    ]);

    notify(
      `Joined ${course.title}.`
    );

  }


  async function openCourse(
    course
  ) {

    setSelectedCourse(
      course
    );

    setWorkspaceTab(
      'overview'
    );

  }


  useEffect(() => {

    if (
      !selectedCourse?.id
    ) {

      setSessions([]);
      setLessons([]);
      setAssignments([]);
      setMembers([]);
      setAttendance([]);

      return;
    }


    let active = true;


    async function loadWorkspace() {

      setWorkspaceLoading(
        true
      );


      const [
        sessionsResult,
        lessonsResult,
        assignmentsResult,
        membersResult
      ] = await Promise.all([

        supabase
          .from(
            'course_sessions'
          )
          .select('*')
          .eq(
            'course_id',
            selectedCourse.id
          )
          .order(
            'starts_at',
            {
              ascending: true
            }
          ),

        supabase
          .from(
            'course_lessons'
          )
          .select('*')
          .eq(
            'course_id',
            selectedCourse.id
          )
          .order(
            'position'
          ),

        supabase
          .from(
            'course_assignments'
          )
          .select('*')
          .eq(
            'course_id',
            selectedCourse.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          ),

        supabase
          .from(
            'course_enrollments'
          )
          .select(`
            id,
            user_id,
            role,
            status,
            enrolled_at
          `)
          .eq(
            'course_id',
            selectedCourse.id
          )
          .eq(
            'status',
            'active'
          )

      ]);


      let attendanceResult = {
        data: [],
        error: null
      };


      const sessionIds =
        (sessionsResult.data || [])
          .map(item => item.id)
          .filter(Boolean);


      if (sessionIds.length) {

        attendanceResult =
          await supabase
            .from(
              'course_session_attendance'
            )
            .select(`
              id,
              session_id,
              user_id,
              joined_at,
              left_at,
              last_seen_at
            `)
            .in(
              'session_id',
              sessionIds
            );

      }


      if (!active) {
        return;
      }


      [
        sessionsResult,
        lessonsResult,
        assignmentsResult,
        membersResult,
        attendanceResult
      ].forEach(result => {

        if (result.error) {
          console.error(
            'Course workspace load error:',
            result.error
          );
        }

      });


      setSessions(
        sessionsResult.data || []
      );

      setLessons(
        lessonsResult.data || []
      );

      setAssignments(
        assignmentsResult.data || []
      );

      setMembers(
        membersResult.data || []
      );

      setAttendance(
        attendanceResult.data || []
      );

      setWorkspaceLoading(
        false
      );

    }


    loadWorkspace();


    return () => {
      active = false;
    };

  }, [
    selectedCourse?.id
  ]);


  async function scheduleSession(
    event
  ) {

    event.preventDefault();


    if (
      !selectedCourse?.id ||
      selectedCourse.owner_id !==
        profile.id
    ) {
      return;
    }


    if (
      !sessionForm.title.trim() ||
      !sessionForm.starts_at
    ) {
      return;
    }


    const customRoom =
      sessionForm.room_url.trim();


    const generatedRoomCode =
      `ONSTOOD-${selectedCourse.id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;


    const roomUrl =
      customRoom ||
      `https://meet.jit.si/${generatedRoomCode}`;


    const provider =
      customRoom
        ? 'external'
        : 'jitsi-test';


    const {
      data,
      error
    } = await supabase
      .from(
        'course_sessions'
      )
      .insert({
        course_id:
          selectedCourse.id,
        created_by:
          profile.id,
        title:
          sessionForm.title.trim(),
        starts_at:
          new Date(
            sessionForm.starts_at
          ).toISOString(),
        room_url:
          roomUrl,
        room_code:
          generatedRoomCode,
        provider,
        status:
          'scheduled'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.message
      );

      return;
    }


    setSessions(current =>
      [
        ...current,
        data
      ].sort(
        (a, b) =>
          new Date(a.starts_at) -
          new Date(b.starts_at)
      )
    );


    setSessionForm({
      title: '',
      starts_at: '',
      room_url: ''
    });


    notify(
      'Live session scheduled.'
    );

  }


  async function registerAttendance(
    session
  ) {

    if (!session?.id) {
      return;
    }


    const now =
      new Date().toISOString();


    const {
      data: existing
    } = await supabase
      .from(
        'course_session_attendance'
      )
      .select('id')
      .eq(
        'session_id',
        session.id
      )
      .eq(
        'user_id',
        profile.id
      )
      .maybeSingle();


    if (existing?.id) {

      const {
        data,
        error
      } = await supabase
        .from(
          'course_session_attendance'
        )
        .update({
          left_at: null,
          last_seen_at: now
        })
        .eq(
          'id',
          existing.id
        )
        .select()
        .single();


      if (!error && data) {

        setAttendance(current => [
          ...current.filter(item =>
            item.id !== data.id
          ),
          data
        ]);

      }

      return;
    }


    const {
      data,
      error
    } = await supabase
      .from(
        'course_session_attendance'
      )
      .insert({
        session_id:
          session.id,
        user_id:
          profile.id,
        joined_at:
          now,
        last_seen_at:
          now
      })
      .select()
      .single();


    if (!error && data) {

      setAttendance(current => [
        ...current,
        data
      ]);

    }

  }


  async function joinRoom(
    session
  ) {

    if (
      !session?.room_url
    ) {

      notify(
        'This classroom does not have a video room yet.'
      );

      return;
    }


    await registerAttendance(
      session
    );


    window.open(
      session.room_url,
      '_blank',
      'noopener,noreferrer'
    );

  }


  async function updateSessionStatus(
    session,
    status
  ) {

    if (
      !session?.id ||
      selectedCourse?.owner_id !==
        profile.id
    ) {
      return;
    }


    const payload = {
      status
    };


    if (status === 'live') {

      payload.starts_at =
        session.starts_at ||
        new Date().toISOString();

    }


    if (status === 'ended') {

      payload.ends_at =
        new Date().toISOString();

    }


    const {
      data,
      error
    } = await supabase
      .from(
        'course_sessions'
      )
      .update(
        payload
      )
      .eq(
        'id',
        session.id
      )
      .select()
      .single();


    if (error) {

      notify(
        error.message
      );

      return;
    }


    setSessions(current =>
      current.map(item =>
        item.id === data.id
          ? data
          : item
      )
    );


    if (status === 'live') {

      await registerAttendance(
        data
      );


      notify(
        'Classroom is live.'
      );


      window.open(
        data.room_url,
        '_blank',
        'noopener,noreferrer'
      );

    } else {

      notify(
        'Live session ended.'
      );

    }

  }


  function attendanceCount(
    sessionId
  ) {

    return attendance.filter(item =>
      item.session_id ===
        sessionId
    ).length;

  }





  useEffect(() => {

    const assignmentIds =
      assignments
        .map(item => item.id)
        .filter(Boolean);

    if (!assignmentIds.length) {
      setSubmissions([]);
      return;
    }

    let active = true;

    async function loadSubmissions() {

      const {
        data,
        error
      } = await supabase
        .from('course_submissions')
        .select('*')
        .in(
          'assignment_id',
          assignmentIds
        )
        .order(
          'submitted_at',
          {
            ascending: false
          }
        );

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          'Submissions load error:',
          error
        );
        return;
      }

      setSubmissions(data || []);
    }

    loadSubmissions();

    return () => {
      active = false;
    };

  }, [
    assignments
      .map(item => item.id)
      .join(',')
  ]);


  useEffect(() => {

    const sessionIds =
      sessions
        .map(item => item.id)
        .filter(Boolean);

    if (!sessionIds.length) {
      setLiveHands([]);
      setLiveChat([]);
      return;
    }

    let active = true;

    async function loadLiveTools() {

      const [
        handsResult,
        chatResult
      ] = await Promise.all([

        supabase
          .from('course_live_hands')
          .select('*')
          .in(
            'session_id',
            sessionIds
          ),

        supabase
          .from('course_live_chat')
          .select('*')
          .in(
            'session_id',
            sessionIds
          )
          .order('created_at')

      ]);

      if (!active) {
        return;
      }

      if (!handsResult.error) {
        setLiveHands(
          handsResult.data || []
        );
      }

      if (!chatResult.error) {
        setLiveChat(
          chatResult.data || []
        );
      }
    }

    loadLiveTools();

    const channel =
      supabase
        .channel(
          `course-live-tools-${selectedCourse?.id || 'none'}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'course_live_hands'
          },
          () => loadLiveTools()
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'course_live_chat'
          },
          payload => {
            if (
              sessionIds.includes(
                payload.new.session_id
              )
            ) {
              setLiveChat(current => [
                ...current,
                payload.new
              ]);
            }
          }
        )
        .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };

  }, [
    selectedCourse?.id,
    sessions
      .map(item => item.id)
      .join(',')
  ]);


  async function createLesson(
    event
  ) {

    event.preventDefault();

    if (
      !selectedCourse?.id ||
      selectedCourse.owner_id !==
        profile.id ||
      !lessonForm.title.trim()
    ) {
      return;
    }

    let storagePath = null;
    let fileName = null;
    let mimeType = null;

    if (lessonForm.file) {

      fileName =
        lessonForm.file.name;

      mimeType =
        lessonForm.file.type;

      storagePath =
        `${selectedCourse.id}/${crypto.randomUUID()}-${fileName}`;

      const {
        error: uploadError
      } = await supabase
        .storage
        .from('course-materials')
        .upload(
          storagePath,
          lessonForm.file
        );

      if (uploadError) {
        notify(uploadError.message);
        return;
      }
    }

    const {
      data,
      error
    } = await supabase
      .from('course_lessons')
      .insert({
        course_id:
          selectedCourse.id,
        created_by:
          profile.id,
        title:
          lessonForm.title.trim(),
        summary:
          lessonForm.summary.trim(),
        content:
          lessonForm.content.trim(),
        position:
          lessons.length,
        storage_path:
          storagePath,
        file_name:
          fileName,
        mime_type:
          mimeType
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setLessons(current => [
      ...current,
      data
    ]);

    setLessonForm({
      title: '',
      summary: '',
      content: '',
      file: null
    });

    notify('Course material published.');
  }


  async function openLessonFile(
    lesson
  ) {

    if (!lesson.storage_path) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .storage
      .from('course-materials')
      .createSignedUrl(
        lesson.storage_path,
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


  async function createAssignment(
    event
  ) {

    event.preventDefault();

    if (
      !selectedCourse?.id ||
      selectedCourse.owner_id !==
        profile.id ||
      !assignmentForm.title.trim()
    ) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from('course_assignments')
      .insert({
        course_id:
          selectedCourse.id,
        created_by:
          profile.id,
        title:
          assignmentForm.title.trim(),
        instructions:
          assignmentForm.instructions.trim(),
        due_at:
          assignmentForm.due_at
            ? new Date(
                assignmentForm.due_at
              ).toISOString()
            : null
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setAssignments(current => [
      data,
      ...current
    ]);

    setAssignmentForm({
      title: '',
      instructions: '',
      due_at: ''
    });

    notify('Assignment published.');
  }


  async function submitAssignment(
    assignment
  ) {

    const body =
      (
        submissionText[
          assignment.id
        ] || ''
      ).trim();

    if (!body) {
      notify(
        'Write your submission first.'
      );
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from('course_submissions')
      .upsert({
        assignment_id:
          assignment.id,
        student_id:
          profile.id,
        body,
        status:
          'submitted',
        submitted_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString()
      }, {
        onConflict:
          'assignment_id,student_id'
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setSubmissions(current => [
      data,
      ...current.filter(
        item =>
          !(
            item.assignment_id ===
              data.assignment_id &&
            item.student_id ===
              data.student_id
          )
      )
    ]);

    notify('Assignment submitted.');
  }


  function currentLiveSession() {

    return (
      sessions.find(item =>
        item.status === 'live'
      ) ||
      sessions.find(item =>
        item.status !== 'ended'
      ) ||
      null
    );
  }


  async function toggleRaiseHand() {

    const session =
      currentLiveSession();

    if (!session) {
      notify(
        'No active classroom session.'
      );
      return;
    }

    const mine =
      liveHands.find(item =>
        item.session_id ===
          session.id &&
        item.user_id ===
          profile.id
      );

    if (mine) {

      const { error } =
        await supabase
          .from('course_live_hands')
          .delete()
          .eq('id', mine.id);

      if (error) {
        notify(error.message);
      }

    } else {

      const { error } =
        await supabase
          .from('course_live_hands')
          .insert({
            session_id:
              session.id,
            user_id:
              profile.id
          });

      if (error) {
        notify(error.message);
      }
    }
  }


  async function lowerHand(
    handId
  ) {

    const {
      error
    } = await supabase
      .from('course_live_hands')
      .delete()
      .eq('id', handId);

    if (error) {
      notify(error.message);
    }

  }


  async function sendLiveChat(
    event
  ) {

    event.preventDefault();

    const session =
      currentLiveSession();

    const body =
      liveChatText.trim();

    if (!session || !body) {
      return;
    }

    const {
      error
    } = await supabase
      .from('course_live_chat')
      .insert({
        session_id:
          session.id,
        user_id:
          profile.id,
        body
      });

    if (error) {
      notify(error.message);
      return;
    }

    setLiveChatText('');
  }


  if (
    selectedCourse
  ) {

    const isOwner =
      selectedCourse.owner_id ===
      profile.id;


    const liveSession =
      sessions.find(item =>
        item.status === 'live'
      );


    const nextSession =
      liveSession ||
      sessions.find(item =>
        item.status !== 'ended' &&
        new Date(
          item.starts_at
        ).getTime() >=
        Date.now()
      );


    const tabs = [
      ['overview', 'Overview'],
      ['live', 'Live Classroom'],
      ['materials', 'Materials'],
      ['assignments', 'Assignments'],
      ['students', 'Students']
    ];


    return (
      <Page
        eyebrow="COURSE WORKSPACE"
        title={
          selectedCourse.title
        }
        action={
          <button
            type="button"
            className="btn subtle"
            onClick={() =>
              setSelectedCourse(
                null
              )
            }
          >
            Back to courses
          </button>
        }
      >

        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden'
          }}
        >

          <div
            style={{
              padding:
                '22px 22px 18px',
              borderBottom:
                '1px solid rgba(15,23,42,0.08)'
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >

              <div>

                <CourseTypeBadge
                  type={
                    selectedCourse.course_type
                  }
                />

                <p
                  className="muted"
                  style={{
                    maxWidth: 720,
                    margin:
                      '12px 0 0'
                  }}
                >
                  {
                    selectedCourse.description ||
                    'Course workspace for lessons, live sessions, assignments and classmates.'
                  }
                </p>

              </div>


              <div
                style={{
                  textAlign:
                    'right'
                }}
              >
                <b>
                  {
                    selectedCourse.language ||
                    'English'
                  }
                </b>

                <small
                  className="muted"
                  style={{
                    display:
                      'block'
                  }}
                >
                  {
                    isOwner
                      ? 'Course owner'
                      : 'Enrolled student'
                  }
                </small>
              </div>

            </div>

          </div>


          <div
            style={{
              display: 'flex',
              gap: 6,
              padding:
                '10px 14px',
              borderBottom:
                '1px solid rgba(15,23,42,0.08)',
              overflowX:
                'auto'
            }}
          >

            {tabs.map(
              ([id, label]) => (

                <button
                  key={id}
                  type="button"
                  className={
                    workspaceTab === id
                      ? 'btn primary'
                      : 'btn subtle'
                  }
                  onClick={() =>
                    setWorkspaceTab(
                      id
                    )
                  }
                >
                  {label}
                </button>

              )
            )}

          </div>


          <div
            style={{
              padding: 22
            }}
          >

            {workspaceLoading ? (

              <div className="empty">
                Loading course…
              </div>

            ) : workspaceTab ===
                'overview' ? (

              <div
                className="grid2"
              >

                <div className="card">

                  <span className="eyebrow dark">
                    {
                      liveSession
                        ? 'LIVE NOW'
                        : 'NEXT'
                    }
                  </span>

                  <h3>
                    {
                      nextSession
                        ? nextSession.title
                        : 'No live session scheduled'
                    }
                  </h3>

                  <p className="muted">
                    {
                      nextSession
                        ? fmtDate(
                            nextSession.starts_at
                          )
                        : 'The classroom is ready whenever the instructor schedules the next session.'
                    }
                  </p>

                  {nextSession && (

                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        joinRoom(
                          nextSession
                        )
                      }
                    >
                      <Activity
                        size={16}
                      />
                      Join classroom
                    </button>

                  )}

                </div>


                <div className="card">

                  <span className="eyebrow dark">
                    COURSE
                  </span>

                  <div className="metric">
                    <span>Materials</span>
                    <b>
                      {lessons.length}
                    </b>
                  </div>

                  <div className="metric">
                    <span>Assignments</span>
                    <b>
                      {assignments.length}
                    </b>
                  </div>

                  <div className="metric">
                    <span>
                      {
                        isOwner
                          ? 'Students'
                          : 'Membership'
                      }
                    </span>
                    <b>
                      {
                        isOwner
                          ? members.length
                          : 'Active'
                      }
                    </b>
                  </div>

                </div>

              </div>

            ) : workspaceTab ===
                'live' ? (

              <div
                className="two-col"
              >

                <div className="card">

                  <div className="card-head">

                    <div>
                      <h3>
                        Live Classroom
                      </h3>
                      <small className="muted">
                        Scheduled video sessions
                      </small>
                    </div>

                    <Activity
                      size={18}
                    />

                  </div>


                  {sessions.length ===
                    0 ? (

                    <div className="empty compact">
                      No live sessions yet.
                    </div>

                  ) : (

                    sessions.map(
                      item => (

                        <div
                          key={
                            item.id
                          }
                          className="event-row"
                        >

                          <div
                            className="event-date"
                          >
                            {
                              new Date(
                                item.starts_at
                              ).getDate()
                            }

                            <small>
                              {
                                new Date(
                                  item.starts_at
                                ).toLocaleString(
                                  'en',
                                  {
                                    month:
                                      'short'
                                  }
                                )
                              }
                            </small>
                          </div>


                          <div
                            className="event-info"
                          >
                            <b>
                              {
                                item.title
                              }
                            </b>

                            <small>
                              {
                                fmtDate(
                                  item.starts_at
                                )
                              }
                              {' · '}
                              {
                                item.status ===
                                  'live'
                                  ? 'LIVE NOW'
                                  : item.status ===
                                      'ended'
                                    ? 'Ended'
                                    : 'Scheduled'
                              }
                            </small>

                            <small
                              className="muted"
                              style={{
                                display:
                                  'block',
                                marginTop: 3
                              }}
                            >
                              {
                                attendanceCount(
                                  item.id
                                )
                              }{' '}
                              participant{
                                attendanceCount(
                                  item.id
                                ) === 1
                                  ? ''
                                  : 's'
                              } tracked
                            </small>
                          </div>


                          <div
                            style={{
                              display:
                                'flex',
                              gap: 6,
                              flexWrap:
                                'wrap',
                              justifyContent:
                                'flex-end'
                            }}
                          >

                            {isOwner &&
                              item.status ===
                                'scheduled' && (

                              <button
                                type="button"
                                className="btn primary"
                                onClick={() =>
                                  updateSessionStatus(
                                    item,
                                    'live'
                                  )
                                }
                              >
                                Start live
                              </button>

                            )}


                            {isOwner &&
                              item.status ===
                                'live' && (

                              <button
                                type="button"
                                className="btn subtle"
                                onClick={() =>
                                  updateSessionStatus(
                                    item,
                                    'ended'
                                  )
                                }
                              >
                                End
                              </button>

                            )}


                            {item.status !==
                              'ended' && (

                              <button
                                type="button"
                                className="btn subtle"
                                onClick={() =>
                                  joinRoom(
                                    item
                                  )
                                }
                              >
                                Join
                              </button>

                            )}

                          </div>

                        </div>

                      )
                    )

                  )}

                </div>


                {isOwner ? (

                  <form
                    className="card form-card"
                    onSubmit={
                      scheduleSession
                    }
                  >

                    <span className="eyebrow dark">
                      INSTRUCTOR
                    </span>

                    <h3>
                      Schedule a live session
                    </h3>

                    <input
                      name="session-title"
                      placeholder="Session title"
                      value={
                        sessionForm.title
                      }
                      onChange={event =>
                        setSessionForm(
                          current => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <input
                      name="session-start"
                      type="datetime-local"
                      value={
                        sessionForm.starts_at
                      }
                      onChange={event =>
                        setSessionForm(
                          current => ({
                            ...current,
                            starts_at:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <input
                      name="session-room"
                      type="url"
                      placeholder="Production video room URL · optional"
                      value={
                        sessionForm.room_url
                      }
                      onChange={event =>
                        setSessionForm(
                          current => ({
                            ...current,
                            room_url:
                              event.target.value
                          })
                        )
                      }
                    />

                    <div
                      style={{
                        padding:
                          '10px 12px',
                        borderRadius: 12,
                        background:
                          'rgba(15,23,42,0.05)',
                        fontSize: 12,
                        lineHeight: 1.5
                      }}
                    >
                      If no production room URL is supplied, ONSTOOD creates a temporary Jitsi test room automatically for development.
                    </div>

                    <button
                      className="btn primary full"
                    >
                      <CalendarDays
                        size={16}
                      />
                      Schedule session
                    </button>

                    <small className="muted">
                      The classroom lifecycle and attendance are stored in Supabase. A production video provider can replace the test room without changing the course model.
                    </small>

                  </form>

                ) : (

                  <div className="card">

                    <span className="eyebrow dark">
                      LIVE
                    </span>

                    <h3>
                      One classroom, anywhere.
                    </h3>

                    <p className="muted">
                      Join scheduled sessions from your course workspace. ONSTOOD records your classroom participation when you enter a session, while the video provider runs the live call.
                    </p>

                  </div>

                )}


                {currentLiveSession() && (

                  <div
                    className="card"
                    style={{
                      gridColumn: '1 / -1'
                    }}
                  >

                    <div className="card-head">
                      <div>
                        <h3>
                          Classroom interaction
                        </h3>

                        <small className="muted">
                          Attendance, questions and live discussion
                        </small>
                      </div>

                      <Users size={18} />
                    </div>


                    <div className="grid2">

                      <div>

                        <div className="metric">
                          <span>
                            Participants tracked
                          </span>
                          <b>
                            {
                              attendanceCount(
                                currentLiveSession().id
                              )
                            }
                          </b>
                        </div>

                        <div className="metric">
                          <span>
                            Raised hands
                          </span>
                          <b>
                            {
                              liveHands.filter(
                                hand =>
                                  hand.session_id ===
                                  currentLiveSession().id
                              ).length
                            }
                          </b>
                        </div>


                        <button
                          type="button"
                          className={
                            liveHands.some(
                              hand =>
                                hand.session_id ===
                                  currentLiveSession().id &&
                                hand.user_id ===
                                  profile.id
                            )
                              ? 'btn primary'
                              : 'btn subtle'
                          }
                          onClick={toggleRaiseHand}
                        >
                          ✋ {
                            liveHands.some(
                              hand =>
                                hand.session_id ===
                                  currentLiveSession().id &&
                                hand.user_id ===
                                  profile.id
                            )
                              ? 'Lower my hand'
                              : 'Raise hand'
                          }
                        </button>


                        {isOwner &&
                          liveHands
                            .filter(
                              hand =>
                                hand.session_id ===
                                currentLiveSession().id
                            )
                            .map(hand => (
                              <div
                                key={hand.id}
                                style={{
                                  display: 'flex',
                                  justifyContent:
                                    'space-between',
                                  gap: 8,
                                  alignItems:
                                    'center',
                                  marginTop: 8
                                }}
                              >
                                <small>
                                  Participant waiting to speak
                                </small>

                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={() =>
                                    lowerHand(
                                      hand.id
                                    )
                                  }
                                >
                                  Lower
                                </button>
                              </div>
                            ))}

                      </div>


                      <div>

                        <div
                          style={{
                            maxHeight: 220,
                            overflowY: 'auto',
                            display: 'grid',
                            gap: 7,
                            marginBottom: 10
                          }}
                        >

                          {liveChat
                            .filter(
                              message =>
                                message.session_id ===
                                currentLiveSession().id
                            )
                            .map(message => (

                              <div
                                key={message.id}
                                style={{
                                  padding:
                                    '8px 10px',
                                  borderRadius: 10,
                                  background:
                                    message.user_id ===
                                    profile.id
                                      ? 'rgba(59,130,246,0.10)'
                                      : 'rgba(15,23,42,0.05)'
                                }}
                              >
                                <b
                                  style={{
                                    fontSize: 12
                                  }}
                                >
                                  {
                                    message.user_id ===
                                      profile.id
                                      ? 'You'
                                      : 'Participant'
                                  }
                                </b>

                                <div>
                                  {message.body}
                                </div>

                                <small className="muted">
                                  {
                                    fmtDate(
                                      message.created_at
                                    )
                                  }
                                </small>
                              </div>

                            ))}

                        </div>


                        <form
                          onSubmit={sendLiveChat}
                          style={{
                            display: 'flex',
                            gap: 8
                          }}
                        >
                          <input
                            name="live-class-chat"
                            placeholder="Message the classroom…"
                            value={liveChatText}
                            onChange={event =>
                              setLiveChatText(
                                event.target.value
                              )
                            }
                          />

                          <button
                            className="btn primary"
                          >
                            <Send size={15} />
                          </button>
                        </form>

                      </div>

                    </div>


                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 12
                      }}
                    >
                      Camera, microphone and screen sharing are handled by the active video room. ONSTOOD stores the classroom interaction and attendance layer.
                    </small>

                  </div>

                )}

              </div>

            ) : workspaceTab ===
                'materials' ? (

              <div
                className={
                  isOwner
                    ? 'two-col'
                    : ''
                }
              >

                <div className="card">

                  <div className="card-head">
                    <div>
                      <h3>
                        Materials & lessons
                      </h3>
                      <small className="muted">
                        Files, notes and structured learning content
                      </small>
                    </div>

                    <FileText size={18} />
                  </div>


                  {lessons.length === 0 ? (

                    <div className="empty compact">
                      No materials have been published yet.
                    </div>

                  ) : (

                    lessons.map(lesson => (

                      <div
                        key={lesson.id}
                        className="event-row"
                      >
                        <div className="course-icon">
                          <BookOpen size={17} />
                        </div>

                        <div className="event-info">
                          <b>{lesson.title}</b>

                          <small>
                            {lesson.summary ||
                              'Course material'}
                          </small>

                          {lesson.content && (
                            <p
                              className="muted"
                              style={{
                                margin:
                                  '6px 0 0'
                              }}
                            >
                              {lesson.content}
                            </p>
                          )}
                        </div>

                        {lesson.storage_path && (
                          <button
                            type="button"
                            className="btn subtle"
                            onClick={() =>
                              openLessonFile(
                                lesson
                              )
                            }
                          >
                            Open file
                          </button>
                        )}
                      </div>

                    ))

                  )}

                </div>


                {isOwner && (

                  <form
                    className="card form-card"
                    onSubmit={createLesson}
                  >
                    <span className="eyebrow dark">
                      INSTRUCTOR
                    </span>

                    <h3>
                      Publish material
                    </h3>

                    <input
                      name="lesson-title"
                      placeholder="Lesson / material title"
                      value={lessonForm.title}
                      onChange={event =>
                        setLessonForm(
                          current => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <input
                      name="lesson-summary"
                      placeholder="Short summary"
                      value={lessonForm.summary}
                      onChange={event =>
                        setLessonForm(
                          current => ({
                            ...current,
                            summary:
                              event.target.value
                          })
                        )
                      }
                    />

                    <textarea
                      name="lesson-content"
                      placeholder="Notes, instructions or lesson content"
                      value={lessonForm.content}
                      onChange={event =>
                        setLessonForm(
                          current => ({
                            ...current,
                            content:
                              event.target.value
                          })
                        )
                      }
                      style={{
                        minHeight: 100
                      }}
                    />

                    <label>
                      Course file · optional

                      <input
                        name="lesson-file"
                        type="file"
                        onChange={event =>
                          setLessonForm(
                            current => ({
                              ...current,
                              file:
                                event.target
                                  .files?.[0] ||
                                null
                            })
                          )
                        }
                      />
                    </label>

                    <button className="btn primary full">
                      <Upload size={16} />
                      Publish material
                    </button>
                  </form>

                )}

              </div>

            ) : workspaceTab ===
                'assignments' ? (

              <div
                className={
                  isOwner
                    ? 'two-col'
                    : ''
                }
              >

                <div className="card">

                  <div className="card-head">
                    <div>
                      <h3>
                        Assignments
                      </h3>
                      <small className="muted">
                        Course work, submissions and deadlines
                      </small>
                    </div>

                    <CheckCircle2 size={18} />
                  </div>


                  {assignments.length === 0 ? (

                    <div className="empty compact">
                      No assignments yet.
                    </div>

                  ) : (

                    assignments.map(item => {

                      const mine =
                        submissions.find(
                          submission =>
                            submission.assignment_id ===
                              item.id &&
                            submission.student_id ===
                              profile.id
                        );

                      const count =
                        submissions.filter(
                          submission =>
                            submission.assignment_id ===
                              item.id
                        ).length;

                      return (
                        <div
                          key={item.id}
                          className="card"
                          style={{
                            marginBottom: 10
                          }}
                        >
                          <b>{item.title}</b>

                          <small
                            className="muted"
                            style={{
                              display: 'block',
                              marginTop: 4
                            }}
                          >
                            {item.due_at
                              ? `Due ${fmtDate(
                                  item.due_at
                                )}`
                              : 'No deadline'}
                            {isOwner
                              ? ` · ${count} submission${count === 1 ? '' : 's'}`
                              : ''}
                          </small>

                          {item.instructions && (
                            <p>
                              {item.instructions}
                            </p>
                          )}

                          {!isOwner && (
                            <>
                              <textarea
                                name={`submission-${item.id}`}
                                placeholder="Write your submission…"
                                value={
                                  submissionText[
                                    item.id
                                  ] ||
                                  mine?.body ||
                                  ''
                                }
                                onChange={event =>
                                  setSubmissionText(
                                    current => ({
                                      ...current,
                                      [item.id]:
                                        event.target.value
                                    })
                                  )
                                }
                                style={{
                                  minHeight: 90
                                }}
                              />

                              <button
                                type="button"
                                className="btn primary"
                                onClick={() =>
                                  submitAssignment(
                                    item
                                  )
                                }
                              >
                                <Send size={15} />
                                {mine
                                  ? 'Update submission'
                                  : 'Submit assignment'}
                              </button>

                              {mine && (
                                <small
                                  className="muted"
                                  style={{
                                    display: 'block',
                                    marginTop: 6
                                  }}
                                >
                                  Status: {mine.status}
                                  {mine.points != null
                                    ? ` · ${mine.points} points`
                                    : ''}
                                </small>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })

                  )}

                </div>


                {isOwner && (

                  <form
                    className="card form-card"
                    onSubmit={
                      createAssignment
                    }
                  >
                    <span className="eyebrow dark">
                      INSTRUCTOR
                    </span>

                    <h3>
                      Create assignment
                    </h3>

                    <input
                      name="assignment-title"
                      placeholder="Assignment title"
                      value={
                        assignmentForm.title
                      }
                      onChange={event =>
                        setAssignmentForm(
                          current => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <textarea
                      name="assignment-instructions"
                      placeholder="Instructions"
                      value={
                        assignmentForm.instructions
                      }
                      onChange={event =>
                        setAssignmentForm(
                          current => ({
                            ...current,
                            instructions:
                              event.target.value
                          })
                        )
                      }
                      style={{
                        minHeight: 110
                      }}
                    />

                    <input
                      name="assignment-due"
                      type="datetime-local"
                      value={
                        assignmentForm.due_at
                      }
                      onChange={event =>
                        setAssignmentForm(
                          current => ({
                            ...current,
                            due_at:
                              event.target.value
                          })
                        )
                      }
                    />

                    <button className="btn primary full">
                      Publish assignment
                    </button>
                  </form>

                )}

              </div>

            ) : (

              <div className="card">

                <div className="card-head">

                  <div>
                    <h3>
                      Students
                    </h3>
                    <small className="muted">
                      Active course members
                    </small>
                  </div>

                  <Users
                    size={18}
                  />

                </div>


                {!isOwner ? (

                  <div className="empty compact">
                    You are enrolled in this course. The full class roster is available to the course instructor.
                  </div>

                ) : members.length ===
                    0 ? (

                  <div className="empty compact">
                    No enrolled students yet.
                  </div>

                ) : (

                  <div
                    style={{
                      display:
                        'grid',
                      gap: 8
                    }}
                  >

                    {members.map(
                      member => (

                        <div
                          key={
                            member.id
                          }
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'space-between',
                            gap: 12,
                            padding:
                              '10px 0',
                            borderBottom:
                              '1px solid rgba(15,23,42,0.06)'
                          }}
                        >

                          <div>
                            <b>
                              Student
                            </b>

                            <small
                              className="muted"
                              style={{
                                display:
                                  'block'
                              }}
                            >
                              {
                                member.role
                              }
                            </small>
                          </div>

                          <small className="muted">
                            {
                              fmtDate(
                                member.enrolled_at
                              )
                            }
                          </small>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      </Page>
    );

  }


  return (
    <Page
      eyebrow="LEARN"
      title="Courses"
      action={
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            setShowCreate(
              current =>
                !current
            )
          }
        >
          <Plus size={16} />
          Create course
        </button>
      }
    >

      <div
        className="card"
        style={{
          marginBottom: 20,
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.94))',
          color: '#fff',
          overflow: 'hidden'
        }}
      >

        <span className="eyebrow">
          ONSTOOD LEARNING
        </span>

        <h2
          style={{
            maxWidth: 720
          }}
        >
          Learn live. Teach globally. Build knowledge together.
        </h2>

        <p
          style={{
            maxWidth: 760,
            opacity: 0.78
          }}
        >
          A professional learning space for open courses, free enrollment, private classrooms and future paid programs — with live sessions, materials, assignments and AI support in one place.
        </p>

      </div>


      {showCreate && (

        <form
          className="card form-card"
          onSubmit={
            createCourse
          }
          style={{
            marginBottom: 22
          }}
        >

          <div className="card-head">

            <div>
              <span className="eyebrow dark">
                CREATE
              </span>

              <h3>
                Publish a course
              </h3>
            </div>

            <BookOpen
              size={19}
            />

          </div>


          <input
            name="course-title"
            placeholder="Course title"
            value={
              courseForm.title
            }
            onChange={event =>
              setCourseForm(
                current => ({
                  ...current,
                  title:
                    event.target.value
                })
              )
            }
            required
          />


          <textarea
            name="course-description"
            placeholder="What will students learn?"
            value={
              courseForm.description
            }
            onChange={event =>
              setCourseForm(
                current => ({
                  ...current,
                  description:
                    event.target.value
                })
              )
            }
            style={{
              minHeight: 110
            }}
          />


          <div className="grid2">

            <label>
              Access

              <select
                name="course-type"
                value={
                  courseForm.course_type
                }
                onChange={event =>
                  setCourseForm(
                    current => ({
                      ...current,
                      course_type:
                        event.target.value,
                      price:
                        event.target.value ===
                          'paid'
                          ? current.price
                          : ''
                    })
                  )
                }
              >
                <option value="open">
                  Open · anyone can join
                </option>
                <option value="free">
                  Free · enrollment required
                </option>
                <option value="paid">
                  Paid · payments next phase
                </option>
                <option value="private">
                  Private · invite only
                </option>
              </select>

            </label>


            <label>
              Language

              <input
                name="course-language"
                value={
                  courseForm.language
                }
                onChange={event =>
                  setCourseForm(
                    current => ({
                      ...current,
                      language:
                        event.target.value
                    })
                  )
                }
              />

            </label>

          </div>


          {courseForm.course_type ===
            'paid' && (

            <label>
              Price · EUR

              <input
                name="course-price"
                type="number"
                min="1"
                step="0.01"
                value={
                  courseForm.price
                }
                onChange={event =>
                  setCourseForm(
                    current => ({
                      ...current,
                      price:
                        event.target.value
                    })
                  )
                }
                required
              />
            </label>

          )}


          <button
            className="btn primary"
            disabled={
              creating
            }
          >
            {
              creating
                ? 'Publishing…'
                : 'Publish course'
            }
          </button>

        </form>

      )}


      <div className="section-title">
        <div>
          <span className="eyebrow dark">
            YOUR LEARNING
          </span>
          <h2>
            My Courses
          </h2>
        </div>
      </div>


      {loading ? (

        <div className="empty">
          Loading courses…
        </div>

      ) : myCourses.length ===
          0 ? (

        <div className="empty card">

          <BookOpen />

          <h3>
            Your course space is ready.
          </h3>

          <p>
            Join an open course below or create your own learning community.
          </p>

        </div>

      ) : (

        <div className="course-grid">

          {myCourses.map(
            course => (

              <div
                className="card course"
                key={
                  course.id
                }
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'space-between',
                    gap: 10
                  }}
                >
                  <div className="course-icon">
                    <BookOpen
                      size={19}
                    />
                  </div>

                  <CourseTypeBadge
                    type={
                      course.course_type
                    }
                  />
                </div>


                <h3>
                  {course.title}
                </h3>

                <p>
                  {
                    course.description ||
                    'Course workspace'
                  }
                </p>

                <small className="muted">
                  {
                    course.owner_id ===
                      profile.id
                      ? 'You created this course'
                      : 'You are enrolled'
                  }
                  {' · '}
                  {
                    course.language ||
                    'English'
                  }
                </small>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    openCourse(
                      course
                    )
                  }
                >
                  Open course
                  <ChevronRight
                    size={15}
                  />
                </button>

              </div>

            )
          )}

        </div>

      )}


      <div
        className="section-title"
        style={{
          marginTop: 28
        }}
      >
        <div>
          <span className="eyebrow dark">
            DISCOVER
          </span>
          <h2>
            Discover Courses
          </h2>
        </div>
      </div>


      {loading ? null : discoverCourses.length ===
          0 ? (

        <div className="empty card">

          <Search />

          <h3>
            No public courses yet.
          </h3>

          <p>
            Published Open, Free and Paid courses will appear here automatically.
          </p>

        </div>

      ) : (

        <div className="course-grid">

          {discoverCourses.map(
            course => (

              <div
                className="card course"
                key={
                  course.id
                }
              >

                <CourseTypeBadge
                  type={
                    course.course_type
                  }
                />

                <h3>
                  {course.title}
                </h3>

                <p>
                  {
                    course.description ||
                    'Explore this course on ONSTOOD.'
                  }
                </p>

                <small className="muted">
                  {
                    course.language ||
                    'English'
                  }

                  {course.course_type ===
                    'paid'
                    ? ` · €${(
                        course.price_cents /
                        100
                      ).toFixed(2)}`
                    : ''}
                </small>


                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    joinCourse(
                      course
                    )
                  }
                >
                  {
                    course.course_type ===
                      'paid'
                      ? 'View enrollment'
                      : 'Join course'
                  }
                  <ChevronRight
                    size={15}
                  />
                </button>

              </div>

            )
          )}

        </div>

      )}

    </Page>
  );
}


/* =========================================================
   CAREER
   ========================================================= */

function Career({
  profile,
  notify
}) {

  const isEmployer =
    profile.account_type === 'employer';

  const [opportunities, setOpportunities] =
    useState([]);

  const [applications, setApplications] =
    useState([]);

  const [applicants, setApplicants] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [q, setQ] =
    useState('');

  const [type, setType] =
    useState('all');

  const [countryFilter, setCountryFilter] =
    useState('all');

  const [cityFilter, setCityFilter] =
    useState('all');

  const [workplaceFilter, setWorkplaceFilter] =
    useState('all');

  const [applyTo, setApplyTo] =
    useState(null);

  const [coverNote, setCoverNote] =
    useState('');

  const [showPublisher, setShowPublisher] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [jobForm, setJobForm] =
    useState({
      title: '',
      opportunity_type: 'internship',
      workplace: 'onsite',
      country: '',
      city: '',
      remote_scope: 'local',
      description: '',
      application_url: '',
      expires_at: ''
    });


  async function loadCareer() {

    setLoading(true);


  if (isEmployer) {

      const [
        jobsResult,
        applicationsResult
      ] = await Promise.all([

        supabase
          .from('career_opportunities')
          .select('*')
          .eq(
            'created_by',
            profile.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          ),

        supabase
          .from('job_applications')
          .select('*')
          .order(
            'applied_at',
            {
              ascending: false
            }
          )

      ]);


      if (jobsResult.error) {
        notify(jobsResult.error.message);
      }

      if (applicationsResult.error) {
        notify(applicationsResult.error.message);
      }


      const jobs =
        jobsResult.data || [];

      const jobIds =
        new Set(
          jobs.map(item =>
            item.id
          )
        );


      const ownApplications =
        (applicationsResult.data || [])
          .filter(item =>
            jobIds.has(
              item.opportunity_id
            )
          );


      const applicantIds =
        [
          ...new Set(
            ownApplications.map(item =>
              item.applicant_id
            )
          )
        ];


      let profilesData = [];


      if (applicantIds.length) {

        const {
          data,
          error
        } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            surname,
            university,
            degree,
            city,
            avatar_url
          `)
          .in(
            'id',
            applicantIds
          );


        if (error) {
          notify(error.message);
        } else {
          profilesData =
            data || [];
        }

      }


      const profileById =
        new Map(
          profilesData.map(item => [
            item.id,
            item
          ])
        );


      setOpportunities(jobs);

      setApplicants(
        ownApplications.map(item => ({
          ...item,
          applicant:
            profileById.get(
              item.applicant_id
            ) || null,
          opportunity:
            jobs.find(job =>
              job.id ===
              item.opportunity_id
            ) || null
        }))
      );


      setApplications([]);

    } else {

      const [
        jobsResult,
        applicationsResult
      ] = await Promise.all([

        supabase
          .from('career_opportunities')
          .select('*')
          .eq(
            'status',
            'published'
          )
          .order(
            'published_at',
            {
              ascending: false
            }
          ),

        supabase
          .from('job_applications')
          .select('*')
          .eq(
            'applicant_id',
            profile.id
          )
          .order(
            'applied_at',
            {
              ascending: false
            }
          )

      ]);


      if (jobsResult.error) {
        notify(jobsResult.error.message);
      }

      if (applicationsResult.error) {
        notify(applicationsResult.error.message);
      }


      setOpportunities(
        jobsResult.data || []
      );

      setApplications(
        applicationsResult.data || []
      );

      setApplicants([]);

    }


    setLoading(false);

  }


  useEffect(() => {
    loadCareer();
  }, [
    profile.id,
    isEmployer
  ]);


  const countries =
    [
      ...new Set(
        opportunities
          .map(item => item.country)
          .filter(Boolean)
      )
    ].sort();


  const cities =
    [
      ...new Set(
        opportunities
          .filter(item =>
            countryFilter === 'all' ||
            item.country === countryFilter
          )
          .map(item => item.city)
          .filter(Boolean)
      )
    ].sort();


  const filtered =
    opportunities.filter(item => {

      if (
        !isEmployer &&
        type !== 'all' &&
        item.opportunity_type !== type
      ) {
        return false;
      }


      if (
        !isEmployer &&
        countryFilter !== 'all' &&
        (item.country || '') !== countryFilter
      ) {
        return false;
      }


      if (
        !isEmployer &&
        cityFilter !== 'all' &&
        (item.city || '') !== cityFilter
      ) {
        return false;
      }


      if (
        !isEmployer &&
        workplaceFilter !== 'all' &&
        (item.workplace || '') !== workplaceFilter
      ) {
        return false;
      }


      const text =
        `
        ${item.title || ''}
        ${item.organization || ''}
        ${item.country || ''}
        ${item.city || ''}
        ${item.location || ''}
        ${item.description || ''}
        ${item.workplace || ''}
        `.toLowerCase();


      return text.includes(
        q.trim().toLowerCase()
      );

    });


  async function publishOpportunity(
    event
  ) {

    event.preventDefault();


    if (!isEmployer) {
      return;
    }


    if (
      !jobForm.title.trim() ||
      !jobForm.description.trim()
    ) {
      return;
    }


    setPublishing(true);


    const {
      data,
      error
    } = await supabase
      .from('career_opportunities')
      .insert({
        created_by:
          profile.id,
        title:
          jobForm.title.trim(),
        organization:
          profile.company_name ||
          `${profile.name || ''} ${profile.surname || ''}`.trim() ||
          'Employer',
        opportunity_type:
          jobForm.opportunity_type,
        workplace:
          jobForm.workplace,
        country:
          jobForm.country.trim(),
        city:
          jobForm.city.trim(),
        location:
          [
            jobForm.city.trim(),
            jobForm.country.trim()
          ].filter(Boolean).join(', '),
        remote_scope:
          jobForm.workplace === 'remote'
            ? jobForm.remote_scope
            : 'local',
        description:
          jobForm.description.trim(),
        application_url:
          jobForm.application_url.trim() ||
          null,
        status:
          'published',
        expires_at:
          jobForm.expires_at
            ? new Date(
                jobForm.expires_at
              ).toISOString()
            : null
      })
      .select()
      .single();


    if (error) {
      notify(error.message);
      setPublishing(false);
      return;
    }


    setOpportunities(current => [
      data,
      ...current
    ]);


    setJobForm({
      title: '',
      opportunity_type: 'internship',
      workplace: 'onsite',
      country: '',
      city: '',
      remote_scope: 'local',
      description: '',
      application_url: '',
      expires_at: ''
    });

    setShowPublisher(false);
    setPublishing(false);

    notify(
      'Opportunity published.'
    );

  }


  async function apply(
    opportunity
  ) {

    const {
      data,
      error
    } = await supabase
      .from('job_applications')
      .insert({
        opportunity_id:
          opportunity.id,
        applicant_id:
          profile.id,
        cover_note:
          coverNote.trim(),
        status:
          'applied'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.code === '23505'
          ? 'You already applied for this opportunity.'
          : error.message
      );

      return;
    }


    setApplications(current => [
      data,
      ...current
    ]);

    setApplyTo(null);
    setCoverNote('');

    notify(
      'Application sent.'
    );

  }


  async function updateApplicationStatus(
    application,
    status
  ) {

    const {
      data,
      error
    } = await supabase
      .from('job_applications')
      .update({
        status
      })
      .eq(
        'id',
        application.id
      )
      .select()
      .single();


    if (error) {
      notify(error.message);
      return;
    }


    setApplicants(current =>
      current.map(item =>
        item.id === data.id
          ? {
              ...item,
              status:
                data.status,
              updated_at:
                data.updated_at
            }
          : item
      )
    );


    notify(
      `Applicant moved to ${status}.`
    );

  }


  const applicationByJob =
    new Map(
      applications.map(item => [
        item.opportunity_id,
        item
      ])
    );


  if (isEmployer) {

    return (
      <Page
        eyebrow="EMPLOYER"
        title="Career Publisher"
        action={
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              setShowPublisher(
                current => !current
              )
            }
          >
            <Plus size={16} />
            Publish opportunity
          </button>
        }
      >

        <div className="card career-hero">

          <div>
            <span className="eyebrow">
              {
                profile.company_name ||
                'ONSTOOD EMPLOYER'
              }
            </span>

            <h2>
              Recruit students and emerging talent.
            </h2>

            <p>
              Publish internships, graduate roles, projects and student-friendly opportunities, then manage applicants in one professional pipeline.
            </p>
          </div>

          <BriefcaseBusiness
            size={48}
          />

        </div>


        {showPublisher && (

          <form
            className="card form-card"
            onSubmit={
              publishOpportunity
            }
            style={{
              marginTop: 20
            }}
          >

            <div className="card-head">
              <div>
                <span className="eyebrow dark">
                  NEW LISTING
                </span>
                <h3>
                  Publish an opportunity
                </h3>
              </div>

              <BriefcaseBusiness
                size={19}
              />
            </div>


            <input
              name="job-title"
              placeholder="Role title"
              value={
                jobForm.title
              }
              onChange={event =>
                setJobForm(
                  current => ({
                    ...current,
                    title:
                      event.target.value
                  })
                )
              }
              required
            />


            <div className="grid2">

              <select
                name="opportunity-type"
                value={
                  jobForm.opportunity_type
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      opportunity_type:
                        event.target.value
                    })
                  )
                }
              >
                <option value="internship">
                  Internship
                </option>
                <option value="part_time">
                  Part-time
                </option>
                <option value="graduate">
                  Graduate role
                </option>
                <option value="project">
                  Project
                </option>
                <option value="scholarship">
                  Scholarship
                </option>
              </select>


              <select
                name="workplace"
                value={
                  jobForm.workplace
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      workplace:
                        event.target.value
                    })
                  )
                }
              >
                <option value="onsite">
                  On-site
                </option>
                <option value="hybrid">
                  Hybrid
                </option>
                <option value="remote">
                  Remote
                </option>
              </select>

            </div>


            <div className="grid2">

              <input
                name="job-country"
                placeholder="Country · e.g. Japan, Singapore, USA, Australia"
                value={
                  jobForm.country
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      country:
                        event.target.value
                    })
                  )
                }
                required
              />


              <input
                name="job-city"
                placeholder="City · e.g. Tokyo, Singapore, New York, Sydney"
                value={
                  jobForm.city
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      city:
                        event.target.value
                    })
                  )
                }
              />

            </div>


            {jobForm.workplace === 'remote' && (

              <label>
                Remote scope

                <select
                  name="remote-scope"
                  value={
                    jobForm.remote_scope
                  }
                  onChange={event =>
                    setJobForm(
                      current => ({
                        ...current,
                        remote_scope:
                          event.target.value
                      })
                    )
                  }
                >
                  <option value="country">
                    Remote within this country
                  </option>
                  <option value="region">
                    Remote within region / continent
                  </option>
                  <option value="worldwide">
                    Remote worldwide
                  </option>
                </select>
              </label>

            )}


            <textarea
              name="job-description"
              placeholder="Role description, requirements and what the student will work on."
              value={
                jobForm.description
              }
              onChange={event =>
                setJobForm(
                  current => ({
                    ...current,
                    description:
                      event.target.value
                  })
                )
              }
              style={{
                minHeight: 140
              }}
              required
            />


            <div className="grid2">

              <input
                name="application-url"
                type="url"
                placeholder="External application URL · optional"
                value={
                  jobForm.application_url
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      application_url:
                        event.target.value
                    })
                  )
                }
              />


              <input
                name="job-expiry"
                type="datetime-local"
                value={
                  jobForm.expires_at
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      expires_at:
                        event.target.value
                    })
                  )
                }
              />

            </div>


            <button
              className="btn primary"
              disabled={
                publishing
              }
            >
              {
                publishing
                  ? 'Publishing…'
                  : 'Publish opportunity'
              }
            </button>

          </form>

        )}


        <div
          className="section-title"
          style={{
            marginTop: 26
          }}
        >
          <div>
            <span className="eyebrow dark">
              YOUR LISTINGS
            </span>
            <h2>
              Published opportunities
            </h2>
          </div>
        </div>


        {loading ? (

          <div className="empty">
            Loading employer workspace…
          </div>

        ) : filtered.length === 0 ? (

          <div className="empty card">
            <BriefcaseBusiness />
            <h3>
              No opportunities published yet.
            </h3>
            <p>
              Publish your first role to start recruiting through ONSTOOD.
            </p>
          </div>

        ) : (

          <div className="job-grid">

            {filtered.map(item => {

              const count =
                applicants.filter(app =>
                  app.opportunity_id ===
                    item.id
                ).length;

              return (
                <div
                  className="card job"
                  key={item.id}
                >
                  <span>
                    {
                      item.opportunity_type
                        .replace('_', ' ')
                        .toUpperCase()
                    }
                  </span>

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.workplace}
                    {item.city
                      ? ` · ${item.city}`
                      : ''}
                    {item.country
                      ? ` · ${item.country}`
                      : ''}
                    {item.workplace === 'remote' &&
                      item.remote_scope
                      ? ` · ${item.remote_scope}`
                      : ''}
                  </p>

                  <div className="metric">
                    <span>Applicants</span>
                    <b>{count}</b>
                  </div>

                  <small className="muted">
                    {
                      item.status
                    }
                    {' · '}
                    {
                      fmtDate(
                        item.published_at
                      )
                    }
                  </small>
                </div>
              );
            })}

          </div>

        )}


        <div
          className="section-title"
          style={{
            marginTop: 28
          }}
        >
          <div>
            <span className="eyebrow dark">
              PIPELINE
            </span>
            <h2>
              Applicants
            </h2>
          </div>
        </div>


        {applicants.length === 0 ? (

          <div className="empty card">
            <Users />
            <h3>
              No applications yet.
            </h3>
            <p>
              Student applications will appear here automatically.
            </p>
          </div>

        ) : (

          <div
            style={{
              display: 'grid',
              gap: 12
            }}
          >

            {applicants.map(item => (

              <div
                className="card"
                key={item.id}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap'
                  }}
                >

                  <div>
                    <b>
                      {
                        item.applicant
                          ? `${item.applicant.name || ''} ${item.applicant.surname || ''}`.trim()
                          : 'Applicant'
                      }
                    </b>

                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 4
                      }}
                    >
                      {
                        item.applicant?.degree ||
                        'Student'
                      }
                      {item.applicant?.university
                        ? ` · ${item.applicant.university}`
                        : ''}
                    </small>

                    <p>
                      Applied for{' '}
                      <b>
                        {
                          item.opportunity?.title ||
                          'opportunity'
                        }
                      </b>
                    </p>

                    {item.cover_note && (
                      <p className="muted">
                        {item.cover_note}
                      </p>
                    )}
                  </div>


                  <div
                    style={{
                      minWidth: 190
                    }}
                  >
                    <small className="muted">
                      Application status
                    </small>

                    <select
                      value={item.status}
                      onChange={event =>
                        updateApplicationStatus(
                          item,
                          event.target.value
                        )
                      }
                      style={{
                        marginTop: 6
                      }}
                    >
                      <option value="applied">
                        Applied
                      </option>
                      <option value="reviewed">
                        Reviewed
                      </option>
                      <option value="interview">
                        Interview
                      </option>
                      <option value="accepted">
                        Accepted
                      </option>
                      <option value="rejected">
                        Rejected
                      </option>
                    </select>
                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </Page>
    );

  }


  return (
    <Page
      eyebrow="FUTURE"
      title="Career & opportunities"
      action={
        <div className="search-box">
          <Search size={16} />
          <input
            name="career-search"
            placeholder="Search opportunities…"
            value={q}
            onChange={event =>
              setQ(
                event.target.value
              )
            }
          />
        </div>
      }
    >

      <div className="card career-hero">

        <div>
          <span className="eyebrow">
            ONSTOOD CAREER
          </span>

          <h2>
            From university to opportunity.
          </h2>

          <p>
            Discover internships, graduate roles, projects, scholarships and student-friendly work from employers recruiting through ONSTOOD.
          </p>
        </div>

        <BriefcaseBusiness
          size={48}
        />

      </div>


      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          margin: '18px 0'
        }}
      >
        {[
          ['all', 'All'],
          ['internship', 'Internships'],
          ['part_time', 'Part-time'],
          ['graduate', 'Graduate'],
          ['project', 'Projects'],
          ['scholarship', 'Scholarships']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              type === id
                ? 'btn primary'
                : 'btn subtle'
            }
            onClick={() =>
              setType(id)
            }
          >
            {label}
          </button>
        ))}
      </div>


      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 18
        }}
      >
        <div className="grid2">

          <label>
            Country

            <select
              name="career-country"
              value={countryFilter}
              onChange={event => {
                setCountryFilter(
                  event.target.value
                );
                setCityFilter('all');
              }}
            >
              <option value="all">
                All countries
              </option>

              {countries.map(country => (
                <option
                  key={country}
                  value={country}
                >
                  {country}
                </option>
              ))}
            </select>
          </label>


          <label>
            City

            <select
              name="career-city"
              value={cityFilter}
              onChange={event =>
                setCityFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All cities
              </option>

              {cities.map(city => (
                <option
                  key={city}
                  value={city}
                >
                  {city}
                </option>
              ))}
            </select>
          </label>


          <label>
            Workplace

            <select
              name="career-workplace"
              value={workplaceFilter}
              onChange={event =>
                setWorkplaceFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All workplace types
              </option>
              <option value="onsite">
                On-site
              </option>
              <option value="hybrid">
                Hybrid
              </option>
              <option value="remote">
                Remote
              </option>
            </select>
          </label>

        </div>
      </div>


      {loading ? (

        <div className="empty">
          Loading opportunities…
        </div>

      ) : filtered.length === 0 ? (

        <div className="empty card">
          <BriefcaseBusiness />
          <h3>
            No opportunities published yet.
          </h3>
          <p>
            Employer listings will appear here automatically.
          </p>
        </div>

      ) : (

        <div className="job-grid">

          {filtered.map(item => {

            const application =
              applicationByJob.get(
                item.id
              );

            return (
              <div
                className="card job"
                key={item.id}
              >

                <span>
                  {
                    item.opportunity_type
                      .replace('_', ' ')
                      .toUpperCase()
                  }
                </span>

                <h3>
                  {item.title}
                </h3>

                <p>
                  <b>
                    {item.organization}
                  </b>
                </p>

                <p>
                  {item.workplace}
                  {item.city
                    ? ` · ${item.city}`
                    : ''}
                  {item.country
                    ? ` · ${item.country}`
                    : ''}
                  {item.workplace === 'remote' &&
                    item.remote_scope
                    ? ` · ${item.remote_scope}`
                    : ''}
                </p>

                <p>
                  {
                    item.description ||
                    'Opportunity details'
                  }
                </p>

                <small className="muted">
                  Published{' '}
                  {
                    fmtDate(
                      item.published_at
                    )
                  }
                </small>


                {application ? (

                  <button
                    type="button"
                    className="btn subtle"
                    disabled
                  >
                    {
                      application.status
                        .replace('_', ' ')
                    }
                  </button>

                ) : (

                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      setApplyTo(item);
                      setCoverNote('');
                    }}
                  >
                    Apply with ONSTOOD
                    <ChevronRight
                      size={15}
                    />
                  </button>

                )}

              </div>
            );

          })}

        </div>

      )}


      <div
        className="section-title"
        style={{
          marginTop: 28
        }}
      >
        <div>
          <span className="eyebrow dark">
            TRACKING
          </span>
          <h2>
            My Applications
          </h2>
        </div>
      </div>


      {applications.length === 0 ? (

        <div className="empty card">
          <FileText />
          <h3>
            No applications yet.
          </h3>
          <p>
            Your applications and their status will appear here.
          </p>
        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 10
          }}
        >
          {applications.map(app => {

            const job =
              opportunities.find(item =>
                item.id ===
                app.opportunity_id
              );

            return (
              <div
                className="card"
                key={app.id}
              >
                <b>
                  {
                    job?.title ||
                    'Opportunity'
                  }
                </b>

                <small
                  className="muted"
                  style={{
                    display: 'block',
                    marginTop: 5
                  }}
                >
                  {
                    job?.organization ||
                    'Employer'
                  }
                  {' · '}
                  {
                    app.status
                      .replace('_', ' ')
                  }
                </small>
              </div>
            );
          })}
        </div>

      )}


      {applyTo && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setApplyTo(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width: 'min(560px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              APPLY
            </span>

            <h3>
              {applyTo.title}
            </h3>

            <p className="muted">
              {applyTo.organization}
            </p>

            <textarea
              name="cover-note"
              placeholder="Short note to the employer · optional"
              value={coverNote}
              onChange={event =>
                setCoverNote(
                  event.target.value
                )
              }
              style={{
                minHeight: 130
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setApplyTo(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  apply(applyTo)
                }
              >
                Send application
              </button>
            </div>
          </div>
        </div>

      )}

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

  const [form, setForm] = useState(
    profile || {}
  );

  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);


  useEffect(() => {

    setForm({
      ...(profile || {}),
      avatar_visibility:
        profile?.avatar_visibility || 'public'
    });

    setAvatarFile(null);
    setAvatarPreview(null);


    if (profile?.avatar_url) {
      loadAvatar(profile.avatar_url);
    } else {
      setAvatarUrl(null);
    }

  }, [profile]);


  async function loadAvatar(path) {

    if (!path) {
      setAvatarUrl(null);
      return;
    }


    if (
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      setAvatarUrl(path);
      return;
    }


    const {
      data,
      error
    } = await supabase.storage
      .from('avatars')
      .createSignedUrl(
        path,
        60 * 60
      );


    if (!error && data?.signedUrl) {
      setAvatarUrl(data.signedUrl);
    } else {
      setAvatarUrl(null);
    }

  }


  function updateField(key, value) {

    setForm(current => ({
      ...current,
      [key]: value
    }));

  }


  function handleAvatarChange(event) {

    const file =
      event.target.files?.[0];

    if (!file) return;


    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];


    if (!allowedTypes.includes(file.type)) {

      notify(
        'Please choose a JPG, PNG or WebP image.'
      );

      event.target.value = '';
      return;
    }


    const maxSize =
      2 * 1024 * 1024;


    if (file.size > maxSize) {

      notify(
        'Profile image must be smaller than 2 MB.'
      );

      event.target.value = '';
      return;
    }


    setAvatarFile(file);

    setAvatarPreview(
      URL.createObjectURL(file)
    );

  }


  function removeAvatar() {

    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrl(null);

  }


  async function uploadAvatar(userId) {

    if (!avatarFile) {
      return form.avatar_url || null;
    }


    const extension =
      avatarFile.name
        .split('.')
        .pop()
        .toLowerCase();


    const filePath =
      `${userId}/avatar.${extension}`;


    const {
      error: uploadError
    } = await supabase.storage
      .from('avatars')
      .upload(
        filePath,
        avatarFile,
        {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type
        }
      );


    if (uploadError) {
      throw uploadError;
    }


    return filePath;
  }


  async function save(event) {

    event.preventDefault();


    if (!profile?.id) {

      notify(
        'Profile not available.'
      );

      return;
    }


    setBusy(true);


    try {

      let avatarPath =
        form.avatar_url || null;


      if (avatarFile) {

        avatarPath =
          await uploadAvatar(profile.id);

      }


      const avatarVisibility =
        [
          'public',
          'connections',
          'private'
        ].includes(
          form.avatar_visibility
        )
          ? form.avatar_visibility
          : 'public';


      const isEmployer =
        profile.account_type === 'employer';

      const payload = {

        name: profile.name || '',
        surname: profile.surname || '',
        university:
          isEmployer
            ? ''
            : form.university || '',
        faculty:
          isEmployer
            ? ''
            : form.faculty || '',
        degree:
          isEmployer
            ? ''
            : form.degree || '',
        year:
          isEmployer
            ? ''
            : form.year || '',
        city: form.city || '',
        company_name:
          isEmployer
            ? form.company_name || ''
            : null,
        company_website:
          isEmployer
            ? form.company_website || ''
            : null,
        company_role:
          isEmployer
            ? form.company_role || ''
            : null,
        company_description:
          isEmployer
            ? form.company_description || ''
            : null,
        avatar_url: avatarPath,
        avatar_visibility:
          avatarVisibility

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
        throw error;
      }


      setProfile(data);

      setAvatarFile(null);
      setAvatarPreview(null);

      await loadAvatar(
        data.avatar_url
      );


      notify(
        'Profile updated.'
      );

    } catch (error) {

      notify(
        error?.message ||
        'Could not update profile.'
      );

    } finally {

      setBusy(false);

    }

  }


  const displayedAvatar =
    avatarPreview ||
    avatarUrl;


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

          <div>

            <label
              style={{
                cursor: busy
                  ? 'default'
                  : 'pointer',
                display: 'inline-block',
                position: 'relative'
              }}
              title="Change profile photo"
            >

              {displayedAvatar ? (

                <img
                  src={displayedAvatar}
                  alt="Profile"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />

              ) : (

                <Avatar
                  profile={form}
                  size="xl"
                />

              )}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={busy}
                onChange={handleAvatarChange}
              />

            </label>


            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                opacity: 0.7
              }}
            >
              JPG, PNG or WebP · max 2 MB
            </div>


            {(avatarFile || displayedAvatar) && (

              <button
                type="button"
                className="btn"
                style={{
                  marginTop: 8
                }}
                disabled={busy}
                onClick={removeAvatar}
              >
                Remove photo
              </button>

            )}

          </div>


          <div>

            <h2>
              {form.name} {form.surname}
            </h2>

            <p>
              {
                profile.account_type === 'employer'
                  ? (
                    form.company_name ||
                    'Employer'
                  )
                  : (
                    form.university ||
                    'Student'
                  )
              }
              {' · '}
              {
                profile.account_type === 'employer'
                  ? (
                    form.company_role ||
                    'Recruiting'
                  )
                  : (
                    form.degree ||
                    'Choose your field'
                  )
              }
            </p>

          </div>

        </div>


        <div className="grid2">

          <label>
            First name

            <input
              value={profile.name || ''}
              readOnly
              disabled
              title="First name is fixed after account creation."
            />

            <small className="muted">
              Fixed after account creation.
            </small>
          </label>


          <label>
            Last name

            <input
              value={profile.surname || ''}
              readOnly
              disabled
              title="Last name is fixed after account creation."
            />

            <small className="muted">
              Fixed after account creation.
            </small>
          </label>


          {profile.account_type !== 'employer' && (

            <>

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
            Faculty

            <input
              value={form.faculty || ''}
              onChange={e =>
                updateField(
                  'faculty',
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


            </>

          )}


          {profile.account_type === 'employer' && (

            <>

              <label>
                Company name

                <input
                  value={form.company_name || ''}
                  onChange={e =>
                    updateField(
                      'company_name',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Your role

                <input
                  value={form.company_role || ''}
                  onChange={e =>
                    updateField(
                      'company_role',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Company website

                <input
                  type="text"
                  placeholder="Company website · optional"
                  value={form.company_website || ''}
                  onChange={e =>
                    updateField(
                      'company_website',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Company description

                <textarea
                  value={form.company_description || ''}
                  onChange={e =>
                    updateField(
                      'company_description',
                      e.target.value
                    )
                  }
                  style={{
                    minHeight: 100
                  }}
                />
              </label>

            </>

          )}


          <label>
            City

            <input
              value={form.city || ''}
              onChange={e =>
                updateField(
                  'city',
                  e.target.value
                )
              }
            />
          </label>


          <label>
            Profile photo visibility

            <select
              value={
                form.avatar_visibility ||
                'public'
              }
              onChange={e =>
                updateField(
                  'avatar_visibility',
                  e.target.value
                )
              }
              disabled={busy}
            >

              <option value="public">
                Public
              </option>

              <option value="connections">
                Connections
              </option>

              <option value="private">
                Only me
              </option>

            </select>

          </label>

        </div>


        <button
          type="submit"
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
   SETTINGS & PRIVACY
   ========================================================= */


/* =========================================================
   V21 ADMIN CONTROL CENTER
   ========================================================= */


function AdminMfaGate({
  profile,
  role,
  notify,
  children
}) {

  const [loading, setLoading] =
    useState(true);

  const [aal, setAal] =
    useState({
      currentLevel: null,
      nextLevel: null
    });

  const [verifiedFactor, setVerifiedFactor] =
    useState(null);

  const [enrollData, setEnrollData] =
    useState(null);

  const [code, setCode] =
    useState('');

  const [busy, setBusy] =
    useState(false);


  async function refreshMfaState() {

    setLoading(true);

    const [
      assuranceResult,
      factorsResult
    ] = await Promise.all([
      supabase.auth.mfa
        .getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa
        .listFactors()
    ]);


    if (assuranceResult.error) {

      console.error(
        'MFA assurance error:',
        assuranceResult.error
      );

      notify(
        assuranceResult.error.message
      );

    } else {

      setAal(
        assuranceResult.data || {
          currentLevel: null,
          nextLevel: null
        }
      );

    }


    if (factorsResult.error) {

      console.error(
        'MFA factors error:',
        factorsResult.error
      );

      notify(
        factorsResult.error.message
      );

    } else {

      const factor =
        (
          factorsResult.data?.totp ||
          []
        ).find(item =>
          item.status === 'verified'
        ) || null;


      setVerifiedFactor(factor);

    }


    setLoading(false);

  }


  useEffect(() => {

    refreshMfaState();

  }, [profile.id]);


  async function beginEnrollment() {

    setBusy(true);
    setCode('');


    const {
      data,
      error
    } = await supabase.auth.mfa
      .enroll({
        factorType: 'totp',
        friendlyName:
          'ONSTOOD Admin'
      });


    setBusy(false);


    if (error) {

      notify(error.message);
      return;

    }


    setEnrollData(data);

  }


  async function verifyEnrollment() {

    const factorId =
      enrollData?.id;


    if (
      !factorId ||
      !code.trim()
    ) {
      return;
    }


    setBusy(true);


    const challenge =
      await supabase.auth.mfa
        .challenge({
          factorId
        });


    if (challenge.error) {

      setBusy(false);
      notify(
        challenge.error.message
      );
      return;

    }


    const verify =
      await supabase.auth.mfa
        .verify({
          factorId,
          challengeId:
            challenge.data.id,
          code:
            code.trim()
        });


    setBusy(false);


    if (verify.error) {

      notify(
        verify.error.message
      );
      return;

    }


    setEnrollData(null);
    setCode('');

    notify(
      'Two-factor authentication enabled.'
    );

    await refreshMfaState();

  }


  async function verifyExistingFactor() {

    if (
      !verifiedFactor?.id ||
      !code.trim()
    ) {
      return;
    }


    setBusy(true);


    const challenge =
      await supabase.auth.mfa
        .challenge({
          factorId:
            verifiedFactor.id
        });


    if (challenge.error) {

      setBusy(false);
      notify(
        challenge.error.message
      );
      return;

    }


    const verify =
      await supabase.auth.mfa
        .verify({
          factorId:
            verifiedFactor.id,
          challengeId:
            challenge.data.id,
          code:
            code.trim()
        });


    setBusy(false);


    if (verify.error) {

      notify(
        verify.error.message
      );
      return;

    }


    setCode('');

    await refreshMfaState();

  }


  if (loading) {

    return (
      <div className="empty card">
        <ShieldCheck size={28} />
        <h3>
          Checking admin security…
        </h3>
      </div>
    );

  }


  const isAal2 =
    aal.currentLevel === 'aal2';


  if (isAal2) {

    return children;

  }


  return (

    <div
      className="card"
      style={{
        maxWidth: 680,
        margin: '20px auto'
      }}
    >

      <div className="card-head">

        <div>
          <span className="eyebrow dark">
            ADMIN SECURITY
          </span>

          <h2>
            Two-factor authentication required
          </h2>
        </div>

        <ShieldCheck size={28} />

      </div>


      <p className="muted">
        Administrative access is protected
        with a second factor. Your public
        profile remains unchanged and does
        not reveal your {role} role.
      </p>


      {!verifiedFactor &&
       !enrollData && (

        <>

          <div className="notice">
            Set up an authenticator app before
            opening ONSTOOD Admin Control Center.
            You can use Google Authenticator,
            Authy, 1Password or another TOTP app.
          </div>

          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={beginEnrollment}
            style={{
              marginTop: 14
            }}
          >
            <LockKeyhole size={16} />
            {
              busy
                ? 'Preparing…'
                : 'Set up 2FA'
            }
          </button>

        </>

      )}


      {enrollData && (

        <div
          style={{
            display: 'grid',
            gap: 12,
            marginTop: 14
          }}
        >

          <p>
            Scan this QR code with your
            authenticator app.
          </p>

          {enrollData.totp?.qr_code && (

            <img
              src={
                enrollData.totp
                  .qr_code
              }
              alt="ONSTOOD 2FA QR code"
              style={{
                width: 220,
                maxWidth: '100%',
                background: '#fff',
                padding: 10,
                borderRadius: 12
              }}
            />

          )}


          {enrollData.totp?.secret && (

            <details>
              <summary>
                Cannot scan the QR code?
              </summary>

              <code
                style={{
                  display: 'block',
                  marginTop: 8,
                  overflowWrap:
                    'anywhere'
                }}
              >
                {
                  enrollData.totp
                    .secret
                }
              </code>
            </details>

          )}


          <input
            name="admin-mfa-enroll-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={event =>
              setCode(
                event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6)
              )
            }
          />


          <button
            type="button"
            className="btn primary"
            disabled={
              busy ||
              code.length !== 6
            }
            onClick={
              verifyEnrollment
            }
          >
            {
              busy
                ? 'Verifying…'
                : 'Enable 2FA'
            }
          </button>

        </div>

      )}


      {verifiedFactor &&
       aal.currentLevel !==
         'aal2' && (

        <div
          style={{
            display: 'grid',
            gap: 12,
            marginTop: 14
          }}
        >

          <p>
            Enter the current code from
            your authenticator app to open
            Admin Control Center.
          </p>

          <input
            name="admin-mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={event =>
              setCode(
                event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6)
              )
            }
          />

          <button
            type="button"
            className="btn primary"
            disabled={
              busy ||
              code.length !== 6
            }
            onClick={
              verifyExistingFactor
            }
          >
            {
              busy
                ? 'Verifying…'
                : 'Verify and open Admin'
            }
          </button>

        </div>

      )}

    </div>

  );

}


function AdminControlCenter({
  profile,
  role,
  notify
}) {

  const [tab, setTab] =
    useState('dashboard');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [stats, setStats] =
    useState({
      users: 0,
      students: 0,
      employers: 0,
      courses: 0,
      jobs: 0,
      posts: 0,
      feedbackNew: 0,
      reportsOpen: 0
    });

  const [users, setUsers] =
    useState([]);

  const [feedback, setFeedback] =
    useState([]);

  const [reports, setReports] =
    useState([]);

  const [team, setTeam] =
    useState([]);

  const [audit, setAudit] =
    useState([]);

  const [search, setSearch] =
    useState('');

  const [feedbackFilter, setFeedbackFilter] =
    useState('all');


  const canManageSupport =
    [
      'owner',
      'admin',
      'support'
    ].includes(role);


  const canModerate =
    [
      'owner',
      'admin',
      'moderator'
    ].includes(role);


  async function loadAll(
    quiet = false
  ) {

    quiet
      ? setRefreshing(true)
      : setLoading(true);


    const [
      usersCount,
      studentsCount,
      employersCount,
      coursesCount,
      jobsCount,
      postsCount,
      feedbackCount,
      reportsCount,
      usersResult,
      feedbackResult,
      reportsResult,
      teamResult,
      auditResult
    ] = await Promise.all([

      supabase
        .from('profiles')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('profiles')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'account_type',
          'student'
        ),

      supabase
        .from('profiles')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'account_type',
          'employer'
        ),

      supabase
        .from('courses')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('career_opportunities')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('posts')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('feedback_support')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'status',
          'new'
        ),

      supabase
        .from('moderation_reports')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .in(
          'status',
          [
            'new',
            'reviewing'
          ]
        ),

      supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          degree,
          city,
          account_type,
          company_name,
          admin_status,
          admin_status_reason,
          employer_verified,
          created_at
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200),

      supabase
        .from('feedback_support')
        .select(`
          id,
          user_id,
          category,
          subject,
          message,
          status,
          created_at,
          updated_at
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200),

      supabase
        .from('moderation_reports')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200),

      supabase
        .from('admin_memberships')
        .select(`
          user_id,
          role,
          active,
          created_at,
          created_by
        `)
        .order(
          'created_at',
          {
            ascending: true
          }
        ),

      supabase
        .from('admin_audit_log')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200)

    ]);


    const countErrors = [
      usersCount,
      studentsCount,
      employersCount,
      coursesCount,
      jobsCount,
      postsCount,
      feedbackCount,
      reportsCount
    ]
      .map(item => item.error)
      .filter(Boolean);


    if (countErrors.length) {
      console.error(
        'Admin dashboard count errors:',
        countErrors
      );
    }


    setStats({
      users:
        usersCount.count || 0,
      students:
        studentsCount.count || 0,
      employers:
        employersCount.count || 0,
      courses:
        coursesCount.count || 0,
      jobs:
        jobsCount.count || 0,
      posts:
        postsCount.count || 0,
      feedbackNew:
        feedbackCount.count || 0,
      reportsOpen:
        reportsCount.count || 0
    });


    if (!usersResult.error) {
      setUsers(
        usersResult.data || []
      );
    }

    if (!feedbackResult.error) {
      setFeedback(
        feedbackResult.data || []
      );
    }

    if (!reportsResult.error) {
      setReports(
        reportsResult.data || []
      );
    }


    if (!teamResult.error) {

      const memberships =
        teamResult.data || [];

      const ids =
        memberships
          .map(item =>
            item.user_id
          )
          .filter(Boolean);


      let profilesById = {};


      if (ids.length) {

        const {
          data: teamProfiles
        } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            surname,
            account_type
          `)
          .in(
            'id',
            ids
          );


        profilesById =
          Object.fromEntries(
            (teamProfiles || [])
              .map(item => [
                item.id,
                item
              ])
          );

      }


      setTeam(
        memberships.map(item => ({
          ...item,
          profile:
            profilesById[
              item.user_id
            ] || null
        }))
      );

    }


    if (!auditResult.error) {

      setAudit(
        auditResult.data || []
      );

    }


    quiet
      ? setRefreshing(false)
      : setLoading(false);

  }


  useEffect(() => {

    loadAll();

  }, [profile.id]);


  async function updateFeedbackStatus(
    item,
    status
  ) {

    if (!canManageSupport) {
      notify(
        'Your admin role cannot manage support items.'
      );
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_update_feedback',
        {
          p_feedback_id: item.id,
          p_status: status
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      `Feedback marked ${status}.`
    );

    await loadAll(true);
  }


  async function setUserStatus(
    item,
    status
  ) {

    if (!['owner','admin'].includes(role)) {
      notify('Only Owner/Admin can change account status.');
      return;
    }

    const verb =
      status === 'suspended'
        ? 'suspend'
        : 'reactivate';

    const reason =
      window.prompt(
        `Reason to ${verb} ${item.name || ''} ${item.surname || ''}?`
      );

    if (reason === null) {
      return;
    }

    if (
      status === 'suspended' &&
      !reason.trim()
    ) {
      notify('A reason is required to suspend an account.');
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_set_user_status',
        {
          p_target_user_id: item.id,
          p_status: status,
          p_reason: reason.trim() || null
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      status === 'suspended'
        ? 'Account suspended.'
        : 'Account reactivated.'
    );

    await loadAll(true);
  }


  async function setEmployerVerified(
    item,
    verified
  ) {

    if (!['owner','admin'].includes(role)) {
      notify('Only Owner/Admin can verify employers.');
      return;
    }

    const reason =
      window.prompt(
        verified
          ? `Verification note for ${item.company_name || item.name || 'employer'} (optional):`
          : `Reason to remove verification from ${item.company_name || item.name || 'employer'}?`
      );

    if (reason === null) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_set_employer_verified',
        {
          p_target_user_id: item.id,
          p_verified: verified,
          p_reason: reason.trim() || null
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      verified
        ? 'Employer verified.'
        : 'Employer verification removed.'
    );

    await loadAll(true);
  }


  async function setStaffRole(
    item,
    staffRole,
    active = true
  ) {

    if (role !== 'owner') {
      notify('Only Owner can manage the admin team.');
      return;
    }

    const label =
      `${item.name || ''} ${item.surname || ''}`.trim() ||
      'this user';

    if (
      !window.confirm(
        active
          ? `Give ${label} the ${staffRole} role?`
          : `Disable administrative access for ${label}?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_set_staff_role',
        {
          p_target_user_id: item.id,
          p_role: staffRole,
          p_active: active
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      active
        ? `${staffRole} role assigned.`
        : 'Administrative access disabled.'
    );

    await loadAll(true);
  }


  async function updateReportStatus(
    item,
    status
  ) {

    if (!canModerate) {
      notify('Your role cannot manage moderation reports.');
      return;
    }

    const reason =
      window.prompt(
        `Moderation note for status "${status}" (optional):`
      );

    if (reason === null) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_update_report',
        {
          p_report_id: item.id,
          p_status: status,
          p_reason: reason.trim() || null
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      `Report marked ${status}.`
    );

    await loadAll(true);
  }


  const filteredUsers =
    users.filter(item => {

      const haystack =
        [
          item.name,
          item.surname,
          item.university,
          item.degree,
          item.city,
          item.company_name,
          item.account_type
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();


      return haystack.includes(
        search
          .trim()
          .toLowerCase()
      );

    });


  const filteredFeedback =
    feedback.filter(item =>
      feedbackFilter === 'all'
        ? true
        : item.status ===
          feedbackFilter
    );


  const navItems = [
    [
      'dashboard',
      'Dashboard',
      Activity
    ],
    [
      'users',
      'Users',
      Users
    ],
    [
      'feedback',
      'Feedback & Support',
      MessageCircle
    ],
    [
      'moderation',
      'Moderation',
      ShieldCheck
    ],
    [
      'team',
      'Admin Team',
      UserPlus
    ],
    [
      'audit',
      'Audit Log',
      FileText
    ],
    [
      'health',
      'System Health',
      Database
    ]
  ];


  if (loading) {

    return (
      <div className="empty card">
        <ShieldCheck size={28} />
        <h3>
          Loading Admin Control Center…
        </h3>
      </div>
    );

  }


  return (

    <div>

      <div className="section-title">

        <div>
          <span className="eyebrow dark">
            V21 ADMIN
          </span>

          <h2>
            ONSTOOD Control Center
          </h2>

          <p className="muted">
            Signed in as{' '}
            <b>{role}</b>.
            Administrative roles are never
            shown on public profiles.
          </p>
        </div>


        <button
          type="button"
          className="btn subtle"
          disabled={refreshing}
          onClick={() =>
            loadAll(true)
          }
        >
          <Activity size={15} />
          {
            refreshing
              ? 'Refreshing…'
              : 'Refresh data'
          }
        </button>

      </div>


      <div
        className="card"
        style={{
          padding: 10,
          marginBottom: 16,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap'
        }}
      >

        {navItems.map(
          ([
            id,
            label,
            Icon
          ]) => (

          <button
            key={id}
            type="button"
            className={
              tab === id
                ? 'btn primary'
                : 'btn subtle'
            }
            onClick={() =>
              setTab(id)
            }
          >
            <Icon size={15} />
            {label}
          </button>

        ))}

      </div>


      {tab === 'dashboard' && (

        <>

          <div
            className="stat-row"
            style={{
              marginBottom: 16
            }}
          >

            <Stat
              label="Total users"
              value={stats.users}
            />

            <Stat
              label="Students"
              value={stats.students}
            />

            <Stat
              label="Employers"
              value={stats.employers}
            />

            <Stat
              label="Courses"
              value={stats.courses}
            />

          </div>


          <div className="grid2">

            <div className="card">

              <div className="card-head">
                <h3>
                  Platform activity
                </h3>
                <Activity size={18} />
              </div>

              <div className="metric">
                <span>
                  Career opportunities
                </span>
                <b>{stats.jobs}</b>
              </div>

              <div className="metric">
                <span>
                  Feed posts
                </span>
                <b>{stats.posts}</b>
              </div>

              <div className="metric">
                <span>
                  New feedback
                </span>
                <b>
                  {stats.feedbackNew}
                </b>
              </div>

              <div className="metric">
                <span>
                  Open reports
                </span>
                <b>
                  {stats.reportsOpen}
                </b>
              </div>

            </div>


            <div className="card">

              <div className="card-head">
                <h3>
                  Admin principles
                </h3>
                <ShieldCheck size={18} />
              </div>

              <p className="muted">
                Private chats are not exposed
                in this dashboard. Administrative
                actions must be role-based and
                auditable.
              </p>

              <div
                className="notice"
                style={{
                  marginTop: 12
                }}
              >
                Build for today's users.
                Architect for global scale.
              </div>

            </div>

          </div>

        </>

      )}


      {tab === 'users' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Users
              </h3>
              <small className="muted">
                Account status, employer verification
                and staff roles are protected by backend RPCs
                and recorded in Audit Log.
              </small>
            </div>

            <Users size={18} />
          </div>


          <input
            name="admin-user-search"
            placeholder="Search name, university, city, company…"
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
          />


          <div
            style={{
              display: 'grid',
              gap: 9,
              marginTop: 14
            }}
          >

            {filteredUsers.map(
              item => (

              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.06)'
                }}
              >

                <div>
                  <b>
                    {item.name}{' '}
                    {item.surname}
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.account_type
                    }
                    {
                      item.company_name
                        ? ` · ${item.company_name}`
                        : item.university
                          ? ` · ${item.university}`
                          : ''
                    }
                  </small>
                </div>


                <div
                  style={{
                    display: 'flex',
                    gap: 7,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                  }}
                >
                  {['owner','admin'].includes(role) && (
                    item.admin_status === 'suspended' ? (
                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          setUserStatus(item, 'active')
                        }
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          setUserStatus(item, 'suspended')
                        }
                      >
                        Suspend
                      </button>
                    )
                  )}

                  {item.account_type === 'employer' &&
                   ['owner','admin'].includes(role) && (
                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        setEmployerVerified(
                          item,
                          !item.employer_verified
                        )
                      }
                    >
                      {
                        item.employer_verified
                          ? 'Unverify'
                          : 'Verify employer'
                      }
                    </button>
                  )}

                  {role === 'owner' && (
                    <select
                      name={`admin-role-${item.id}`}
                      defaultValue=""
                      onChange={event => {
                        const value = event.target.value;
                        if (!value) return;
                        setStaffRole(item, value, true);
                        event.target.value = '';
                      }}
                    >
                      <option value="">
                        Add staff role…
                      </option>
                      <option value="admin">
                        Admin
                      </option>
                      <option value="moderator">
                        Moderator
                      </option>
                      <option value="support">
                        Support
                      </option>
                    </select>
                  )}

                  <small className="muted">
                    {
                      item.admin_status === 'suspended'
                        ? 'Suspended'
                        : fmtDate(item.created_at)
                    }
                  </small>
                </div>

              </div>

            ))}

          </div>

        </div>

      )}


      {tab === 'feedback' && (

        <div className="card">

          <div className="card-head">

            <div>
              <h3>
                Feedback & Support
              </h3>

              <small className="muted">
                Suggestions, problems,
                complaints and other requests.
              </small>
            </div>

            <MessageCircle
              size={18}
            />

          </div>


          <select
            name="admin-feedback-filter"
            value={feedbackFilter}
            onChange={event =>
              setFeedbackFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All statuses
            </option>
            <option value="new">
              New
            </option>
            <option value="reviewing">
              Reviewing
            </option>
            <option value="resolved">
              Resolved
            </option>
            <option value="closed">
              Closed
            </option>
          </select>


          <div
            style={{
              display: 'grid',
              gap: 12,
              marginTop: 14
            }}
          >

            {filteredFeedback.length ===
              0 ? (

              <div className="empty compact">
                No feedback items in this view.
              </div>

            ) : (

              filteredFeedback.map(
                item => (

                <article
                  key={item.id}
                  style={{
                    padding: 14,
                    border:
                      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 14
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div>
                      <b>
                        {item.subject}
                      </b>

                      <small
                        className="muted"
                        style={{
                          display:
                            'block'
                        }}
                      >
                        {item.category}
                        {' · '}
                        {
                          fmtDate(
                            item.created_at
                          )
                        }
                      </small>
                    </div>


                    <span
                      className="pill"
                    >
                      {item.status}
                    </span>

                  </div>


                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap'
                    }}
                  >
                    {item.message}
                  </p>


                  {canManageSupport && (

                    <select
                      name={`feedback-status-${item.id}`}
                      value={
                        item.status
                      }
                      onChange={event =>
                        updateFeedbackStatus(
                          item,
                          event.target.value
                        )
                      }
                    >
                      <option value="new">
                        New
                      </option>
                      <option value="reviewing">
                        Reviewing
                      </option>
                      <option value="resolved">
                        Resolved
                      </option>
                      <option value="closed">
                        Closed
                      </option>
                    </select>

                  )}

                </article>

              ))

            )}

          </div>

        </div>

      )}


      {tab === 'moderation' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Moderation
              </h3>

              <small className="muted">
                Reports only. Private conversations
                remain private unless a future
                audited abuse flow explicitly
                requires evidence.
              </small>
            </div>

            <ShieldCheck
              size={18}
            />
          </div>


          {!canModerate ? (

            <div className="empty compact">
              Your admin role does not include moderation.
            </div>

          ) : reports.length === 0 ? (

            <div className="empty compact">
              No moderation reports.
            </div>

          ) : (

            <div
              style={{
                display: 'grid',
                gap: 10
              }}
            >
              {reports.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: 12,
                    border:
                      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12
                  }}
                >
                  <b>
                    {
                      item.target_type ||
                      'Reported item'
                    }
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.status ||
                      'new'
                    }
                    {' · '}
                    {
                      fmtDate(
                        item.created_at
                      )
                    }
                  </small>

                  <p>
                    {
                      item.details ||
                      'No additional details.'
                    }
                  </p>

                  <select
                    name={`report-status-${item.id}`}
                    value={item.status || 'open'}
                    onChange={event =>
                      updateReportStatus(
                        item,
                        event.target.value
                      )
                    }
                  >
                    <option value="open">
                      Open
                    </option>
                    <option value="reviewing">
                      Reviewing
                    </option>
                    <option value="resolved">
                      Resolved
                    </option>
                    <option value="dismissed">
                      Dismissed
                    </option>
                  </select>
                </div>
              ))}
            </div>

          )}

        </div>

      )}


      {tab === 'team' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Admin Team
              </h3>

              <small className="muted">
                Roles are backend-only and never
                appear on public profiles.
              </small>
            </div>

            <UserPlus size={18} />
          </div>


          <div
            style={{
              display: 'grid',
              gap: 10
            }}
          >

            {team.map(item => (

              <div
                key={item.user_id}
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: 12,
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.06)'
                }}
              >
                <div>
                  <b>
                    {
                      item.profile
                        ? `${item.profile.name || ''} ${item.profile.surname || ''}`.trim()
                        : 'Admin user'
                    }
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    Public profile:{' '}
                    {
                      item.profile
                        ?.account_type ||
                      'member'
                    }
                  </small>
                </div>

                <div
                  style={{
                    textAlign: 'right'
                  }}
                >
                  <b>{item.role}</b>
                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.active
                        ? 'Active'
                        : 'Inactive'
                    }
                  </small>

                  {role === 'owner' &&
                   item.role !== 'owner' &&
                   item.active && (
                    <button
                      type="button"
                      className="btn subtle"
                      style={{ marginTop: 6 }}
                      onClick={() =>
                        setStaffRole(
                          {
                            id: item.user_id,
                            name: item.profile?.name,
                            surname: item.profile?.surname
                          },
                          item.role,
                          false
                        )
                      }
                    >
                      Disable access
                    </button>
                  )}
                </div>
              </div>

            ))}

          </div>

        </div>

      )}


      {tab === 'audit' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Audit Log
              </h3>

              <small className="muted">
                Administrative actions are recorded
                for accountability.
              </small>
            </div>

            <FileText size={18} />
          </div>


          {audit.length === 0 ? (

            <div className="empty compact">
              No administrative actions recorded yet.
            </div>

          ) : (

            <div
              style={{
                display: 'grid',
                gap: 9
              }}
            >

              {audit.map(item => (

                <div
                  key={item.id}
                  style={{
                    padding:
                      '10px 0',
                    borderBottom:
                      '1px solid rgba(0,0,0,0.06)'
                  }}
                >
                  <b>
                    {item.action}
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.target_type ||
                      'system'
                    }
                    {
                      item.target_id
                        ? ` · ${item.target_id}`
                        : ''
                    }
                    {' · '}
                    {
                      fmtDate(
                        item.created_at
                      )
                    }
                  </small>
                </div>

              ))}

            </div>

          )}

        </div>

      )}


      {tab === 'health' && (

        <div className="grid2">

          <div className="card">

            <div className="card-head">
              <h3>
                Data layer
              </h3>
              <Database size={18} />
            </div>

            <div className="metric">
              <span>
                Admin RLS
              </span>
              <b>Active</b>
            </div>

            <div className="metric">
              <span>
                Audit log
              </span>
              <b>Active</b>
            </div>

            <div className="metric">
              <span>
                Anonymous admin access
              </span>
              <b>Blocked</b>
            </div>

          </div>


          <div className="card">

            <div className="card-head">
              <h3>
                Security roadmap
              </h3>
              <LockKeyhole size={18} />
            </div>

            <p className="muted">
              Remaining production tasks include
              leaked-password protection,
              RLS performance cleanup,
              MFA administration and a final
              production security audit.
            </p>

          </div>

        </div>

      )}

    </div>

  );

}


function SettingsPage({
  profile,
  notify
}) {

  const defaults = {
    language: 'en',
    timezone: 'auto',
    date_format: 'dd_mm_yyyy',
    profile_visibility: 'connections',
    show_online_status: true,
    show_university: true,
    show_city: true,
    allow_connection_requests: 'everyone',
    allow_chat: 'connections',
    allow_post_office: 'connections',
    notify_connections: true,
    notify_messages: true,
    notify_courses: true,
    notify_career: true,
    email_notifications: true,
    appearance: 'system',
    text_size: 'normal',
    reduced_motion: false,
    ai_language: 'auto',
    ai_detail: 'balanced',
    ai_use_documents: true,
    ai_use_courses: true,
    job_country: '',
    job_city: '',
    job_workplace: 'all',
    job_alerts: true
  };

  const [settings, setSettings] =
    useState(defaults);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [password, setPassword] =
    useState('');

  const [password2, setPassword2] =
    useState('');

  const [securityBusy, setSecurityBusy] =
    useState(false);

  const [showDelete, setShowDelete] =
    useState(false);

  const [deletePassword, setDeletePassword] =
    useState('');

  const [deleteText, setDeleteText] =
    useState('');

  const [deleteBusy, setDeleteBusy] =
    useState(false);

  const [deleteNeedsPassword, setDeleteNeedsPassword] =
    useState(true);


  const [feedbackForm, setFeedbackForm] =
    useState({
      category: 'suggestion',
      subject: '',
      message: ''
    });

  const [feedbackBusy, setFeedbackBusy] =
    useState(false);



  useEffect(() => {

    let active = true;

    async function loadSettings() {

      const {
        data,
        error
      } = await supabase
        .from('user_settings')
        .select('*')
        .eq(
          'user_id',
          profile.id
        )
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        notify(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings(current => ({
          ...current,
          ...data
        }));
      }

      setLoading(false);
    }

    async function loadDeleteAuthMode() {

      const {
        data
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      const identities =
        data?.user?.identities || [];

      const hasEmailPasswordIdentity =
        identities.some(
          identity =>
            identity?.provider === 'email'
        );

      setDeleteNeedsPassword(
        hasEmailPasswordIdentity
      );

    }

    loadSettings();
    loadDeleteAuthMode();

    return () => {
      active = false;
    };

  }, [profile.id]);


  function update(
    key,
    value
  ) {

    setSettings(current => ({
      ...current,
      [key]: value
    }));

  }


  async function saveSettings() {

    setSaving(true);

    const payload = {
      ...settings,
      user_id: profile.id,
      updated_at:
        new Date().toISOString()
    };

    delete payload.id;

    const {
      error
    } = await supabase
      .from('user_settings')
      .upsert(
        payload,
        {
          onConflict: 'user_id'
        }
      );

    setSaving(false);

    if (error) {
      notify(error.message);
      return;
    }

    notify('Settings saved.');
  }


  async function changePassword(
    event
  ) {

    event.preventDefault();

    if (password.length < 8) {
      notify(
        'Use at least 8 characters.'
      );
      return;
    }

    if (password !== password2) {
      notify(
        'Passwords do not match.'
      );
      return;
    }

    setSecurityBusy(true);

    const {
      error
    } = await supabase.auth
      .updateUser({
        password
      });

    setSecurityBusy(false);

    if (error) {
      notify(error.message);
      return;
    }

    setPassword('');
    setPassword2('');
    notify('Password updated.');
  }


  async function signOutOtherDevices() {

    setSecurityBusy(true);

    const {
      error
    } = await supabase.auth
      .signOut({
        scope: 'others'
      });

    setSecurityBusy(false);

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      'Other sessions signed out.'
    );
  }


  async function deleteAccount() {

    if (
      deleteNeedsPassword &&
      !deletePassword
    ) {
      notify(
        'Enter your current password.'
      );
      return;
    }

    setDeleteBusy(true);

    const {
      data,
      error
    } = await supabase
      .functions
      .invoke(
        'delete-my-account',
        {
          body: {
            password:
              deletePassword,
            confirmation:
              'DELETE'
          }
        }
      );

    if (error) {
      setDeleteBusy(false);
      notify(
        error.message ||
        'Could not delete account.'
      );
      return;
    }

    if (data?.error) {
      setDeleteBusy(false);
      notify(data.error);
      return;
    }

    try {
      await supabase.auth.signOut({
        scope: 'local'
      });
    } catch {
      // Account is already removed server-side.
    }

    window.location.reload();
  }



  async function submitFeedback(
    event
  ) {

    event.preventDefault();

    const subject =
      feedbackForm.subject.trim();

    const message =
      feedbackForm.message.trim();


    if (!subject || !message) {

      notify(
        'Please add a subject and message.'
      );

      return;

    }


    setFeedbackBusy(true);


    const {
      error
    } = await supabase
      .from('feedback_support')
      .insert({
        user_id:
          profile.id,
        category:
          feedbackForm.category,
        subject,
        message
      });


    setFeedbackBusy(false);


    if (error) {

      notify(error.message);
      return;

    }


    setFeedbackForm({
      category: 'suggestion',
      subject: '',
      message: ''
    });


    notify(
      'Thank you. Your feedback was sent.'
    );

  }


  if (loading) {
    return (
      <div className="empty card">
        Loading settings…
      </div>
    );
  }


  return (
    <Page
      eyebrow="ACCOUNT"
      title="Settings & Privacy"
      action={
        <button
          type="button"
          className="btn primary"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving
            ? 'Saving…'
            : 'Save settings'}
        </button>
      }
    >

      <div
        style={{
          display: 'grid',
          gap: 16
        }}
      >

        <section className="card">
          <div className="card-head">
            <div>
              <h3>
                Language & Region
              </h3>
              <small className="muted">
                Interface, time and date preferences
              </small>
            </div>
            <Globe2 size={19} />
          </div>

          <div className="grid2">

            <label>
              Language
              <select
                name="settings-language"
                value={
                  settings.language
                }
                onChange={event =>
                  update(
                    'language',
                    event.target.value
                  )
                }
              >
                <option value="en">English</option>
              </select>
            </label>

            <label>
              Time zone
              <select
                name="settings-timezone"
                value={
                  settings.timezone
                }
                onChange={event =>
                  update(
                    'timezone',
                    event.target.value
                  )
                }
              >
                <option value="auto">
                  Automatic
                </option>
                <option value="Europe/Tirane">
                  Europe / Tirana
                </option>
                <option value="Europe/London">
                  Europe / London
                </option>
                <option value="America/New_York">
                  America / New York
                </option>
                <option value="Asia/Tokyo">
                  Asia / Tokyo
                </option>
                <option value="Asia/Singapore">
                  Asia / Singapore
                </option>
                <option value="Australia/Sydney">
                  Australia / Sydney
                </option>
              </select>
            </label>

            <label>
              Date format
              <select
                name="settings-date-format"
                value={
                  settings.date_format
                }
                onChange={event =>
                  update(
                    'date_format',
                    event.target.value
                  )
                }
              >
                <option value="dd_mm_yyyy">
                  DD/MM/YYYY
                </option>
                <option value="mm_dd_yyyy">
                  MM/DD/YYYY
                </option>
                <option value="yyyy_mm_dd">
                  YYYY-MM-DD
                </option>
              </select>
            </label>

          </div>
        </section>


        <section className="card">
          <div className="card-head">
            <div>
              <h3>Privacy</h3>
              <small className="muted">
                Control profile and communication visibility
              </small>
            </div>
            <ShieldCheck size={19} />
          </div>

          <div className="grid2">

            <label>
              Profile visibility
              <select
                name="settings-profile-visibility"
                value={
                  settings.profile_visibility
                }
                onChange={event =>
                  update(
                    'profile_visibility',
                    event.target.value
                  )
                }
              >
                <option value="everyone">
                  Everyone
                </option>
                <option value="connections">
                  Connections
                </option>
                <option value="private">
                  Only me
                </option>
              </select>
            </label>

            <label>
              Connection requests
              <select
                name="settings-connection-requests"
                value={
                  settings.allow_connection_requests
                }
                onChange={event =>
                  update(
                    'allow_connection_requests',
                    event.target.value
                  )
                }
              >
                <option value="everyone">
                  Everyone
                </option>
                <option value="students">
                  Students only
                </option>
                <option value="none">
                  Nobody
                </option>
              </select>
            </label>

            <label>
              Chat
              <select
                name="settings-chat"
                value={
                  settings.allow_chat
                }
                onChange={event =>
                  update(
                    'allow_chat',
                    event.target.value
                  )
                }
              >
                <option value="everyone">
                  Everyone
                </option>
                <option value="connections">
                  Connections
                </option>
                <option value="none">
                  Nobody
                </option>
              </select>
            </label>

            <label>
              Messages
              <select
                name="settings-post-office"
                value={
                  settings.allow_post_office
                }
                onChange={event =>
                  update(
                    'allow_post_office',
                    event.target.value
                  )
                }
              >
                <option value="everyone">
                  Everyone
                </option>
                <option value="connections">
                  Connections
                </option>
                <option value="none">
                  Nobody
                </option>
              </select>
            </label>

          </div>

          <div
            style={{
              display: 'grid',
              gap: 10,
              marginTop: 14
            }}
          >
            {[
              [
                'show_online_status',
                'Show my online status'
              ],
              [
                'show_university',
                'Show my university'
              ],
              [
                'show_city',
                'Show my city'
              ]
            ].map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center'
                }}
              >
                <input
                  name={`settings-${key}`}
                  type="checkbox"
                  checked={
                    Boolean(
                      settings[key]
                    )
                  }
                  onChange={event =>
                    update(
                      key,
                      event.target.checked
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </section>


        <section className="card">
          <div className="card-head">
            <div>
              <h3>Notifications</h3>
              <small className="muted">
                Decide which updates matter
              </small>
            </div>
            <Bell size={19} />
          </div>

          <div className="grid2">
            {[
              [
                'notify_connections',
                'Connections'
              ],
              [
                'notify_messages',
                'Chat & Messages'
              ],
              [
                'notify_courses',
                'Courses & classroom'
              ],
              [
                'notify_career',
                'Career'
              ],
              [
                'email_notifications',
                'Email notifications'
              ]
            ].map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center'
                }}
              >
                <input
                  name={`settings-${key}`}
                  type="checkbox"
                  checked={
                    Boolean(
                      settings[key]
                    )
                  }
                  onChange={event =>
                    update(
                      key,
                      event.target.checked
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </section>


        <section className="card">
          <div className="card-head">
            <div>
              <h3>
                Appearance & Accessibility
              </h3>
              <small className="muted">
                Personalize ONSTOOD
              </small>
            </div>
            <Monitor size={19} />
          </div>

          <div className="grid2">

            <label>
              Appearance
              <select
                name="settings-appearance"
                value={
                  settings.appearance
                }
                onChange={event =>
                  update(
                    'appearance',
                    event.target.value
                  )
                }
              >
                <option value="system">
                  System
                </option>
                <option value="light">
                  Light
                </option>
                <option value="dark">
                  Dark
                </option>
              </select>
            </label>

            <label>
              Text size
              <select
                name="settings-text-size"
                value={
                  settings.text_size
                }
                onChange={event =>
                  update(
                    'text_size',
                    event.target.value
                  )
                }
              >
                <option value="small">
                  Small
                </option>
                <option value="normal">
                  Normal
                </option>
                <option value="large">
                  Large
                </option>
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center'
              }}
            >
              <input
                name="settings-reduced-motion"
                type="checkbox"
                checked={
                  Boolean(
                    settings.reduced_motion
                  )
                }
                onChange={event =>
                  update(
                    'reduced_motion',
                    event.target.checked
                  )
                }
              />
              Reduce motion
            </label>

          </div>
        </section>


        {profile.account_type !==
          'employer' && (

          <>
            <section className="card">
              <div className="card-head">
                <div>
                  <h3>
                    Career Preferences
                  </h3>
                  <small className="muted">
                    Preferred location and work style
                  </small>
                </div>
                <BriefcaseBusiness size={19} />
              </div>

              <div className="grid2">

                <label>
                  Country
                  <input
                    name="settings-job-country"
                    placeholder="e.g. Albania"
                    value={
                      settings.job_country
                    }
                    onChange={event =>
                      update(
                        'job_country',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  City
                  <input
                    name="settings-job-city"
                    placeholder="e.g. Tirana"
                    value={
                      settings.job_city
                    }
                    onChange={event =>
                      update(
                        'job_city',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Workplace
                  <select
                    name="settings-job-workplace"
                    value={
                      settings.job_workplace
                    }
                    onChange={event =>
                      update(
                        'job_workplace',
                        event.target.value
                      )
                    }
                  >
                    <option value="all">
                      Any
                    </option>
                    <option value="onsite">
                      On-site
                    </option>
                    <option value="hybrid">
                      Hybrid
                    </option>
                    <option value="remote">
                      Remote
                    </option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center'
                  }}
                >
                  <input
                    name="settings-job-alerts"
                    type="checkbox"
                    checked={
                      Boolean(
                        settings.job_alerts
                      )
                    }
                    onChange={event =>
                      update(
                        'job_alerts',
                        event.target.checked
                      )
                    }
                  />
                  Career alerts
                </label>

              </div>
            </section>


            <section className="card">
              <div className="card-head">
                <div>
                  <h3>
                    ONSTOOD AI Preferences
                  </h3>
                  <small className="muted">
                    How AI should assist you
                  </small>
                </div>
                <Sparkles size={19} />
              </div>

              <div className="grid2">

                <label>
                  AI language
                  <select
                    name="settings-ai-language"
                    value={
                      settings.ai_language
                    }
                    onChange={event =>
                      update(
                        'ai_language',
                        event.target.value
                      )
                    }
                  >
                    <option value="auto">
                      Automatic
                    </option>
                    <option value="en">
                      English
                    </option>
                  </select>
                </label>

                <label>
                  Answer detail
                  <select
                    name="settings-ai-detail"
                    value={
                      settings.ai_detail
                    }
                    onChange={event =>
                      update(
                        'ai_detail',
                        event.target.value
                      )
                    }
                  >
                    <option value="concise">
                      Concise
                    </option>
                    <option value="balanced">
                      Balanced
                    </option>
                    <option value="detailed">
                      Detailed
                    </option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center'
                  }}
                >
                  <input
                    name="settings-ai-documents"
                    type="checkbox"
                    checked={
                      Boolean(
                        settings.ai_use_documents
                      )
                    }
                    onChange={event =>
                      update(
                        'ai_use_documents',
                        event.target.checked
                      )
                    }
                  />
                  AI may use my documents
                </label>

                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center'
                  }}
                >
                  <input
                    name="settings-ai-courses"
                    type="checkbox"
                    checked={
                      Boolean(
                        settings.ai_use_courses
                      )
                    }
                    onChange={event =>
                      update(
                        'ai_use_courses',
                        event.target.checked
                      )
                    }
                  />
                  AI may use course materials
                </label>

              </div>
            </section>
          </>

        )}


        <section className="card">

          <div className="card-head">

            <div>

              <h3>
                Feedback & Support
              </h3>

              <small className="muted">
                Suggestions, problems and concerns
              </small>

            </div>

            <MessageCircle size={19} />

          </div>


          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background:
                'rgba(37,99,235,0.06)',
              marginBottom: 16
            }}
          >

            <b>
              ONSTOOD learns with you.
            </b>

            <p
              className="muted"
              style={{
                margin:
                  '6px 0 0'
              }}
            >
              Your ideas, feedback and concerns
              help us build a better platform
              for everyone.
            </p>

          </div>


          <form
            onSubmit={
              submitFeedback
            }
            style={{
              display: 'grid',
              gap: 10
            }}
          >

            <label>
              Type

              <select
                name="feedback-category"
                value={
                  feedbackForm.category
                }
                onChange={event =>
                  setFeedbackForm(
                    current => ({
                      ...current,
                      category:
                        event.target.value
                    })
                  )
                }
              >
                <option value="suggestion">
                  Suggestion
                </option>

                <option value="problem">
                  Problem
                </option>

                <option value="complaint">
                  Complaint
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>


            <input
              name="feedback-subject"
              placeholder="Subject"
              value={
                feedbackForm.subject
              }
              onChange={event =>
                setFeedbackForm(
                  current => ({
                    ...current,
                    subject:
                      event.target.value
                  })
                )
              }
            />


            <textarea
              name="feedback-message"
              placeholder="Tell us what happened, what you would improve, or what you would like ONSTOOD to do better…"
              value={
                feedbackForm.message
              }
              onChange={event =>
                setFeedbackForm(
                  current => ({
                    ...current,
                    message:
                      event.target.value
                  })
                )
              }
              style={{
                minHeight: 130
              }}
            />


            <button
              type="submit"
              className="btn primary"
              disabled={
                feedbackBusy
              }
            >
              {
                feedbackBusy
                  ? 'Sending…'
                  : 'Send feedback'
              }
            </button>

          </form>

        </section>


        <section className="card">
          <div className="card-head">
            <div>
              <h3>
                Account & Security
              </h3>
              <small className="muted">
                Password and active sessions
              </small>
            </div>
            <LockKeyhole size={19} />
          </div>

          <form
            onSubmit={changePassword}
            className="grid2"
          >
            <input
              name="settings-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={event =>
                setPassword(
                  event.target.value
                )
              }
            />

            <input
              name="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={password2}
              onChange={event =>
                setPassword2(
                  event.target.value
                )
              }
            />

            <button
              className="btn subtle"
              disabled={securityBusy}
            >
              Change password
            </button>

            <button
              type="button"
              className="btn subtle"
              disabled={securityBusy}
              onClick={
                signOutOtherDevices
              }
            >
              Sign out other devices
            </button>
          </form>
        </section>


        <section
          className="card"
          style={{
            border:
              '1px solid rgba(220,38,38,0.25)'
          }}
        >
          <div className="card-head">
            <div>
              <h3>
                Data & Account
              </h3>
              <small className="muted">
                Permanent account controls
              </small>
            </div>
            <Database size={19} />
          </div>

          <p className="muted">
            Deleting your account permanently
            removes your ONSTOOD authentication
            account. This action cannot be undone.
          </p>

          <button
            type="button"
            className="btn subtle"
            onClick={() =>
              setShowDelete(true)
            }
            style={{
              borderColor:
                'rgba(220,38,38,0.35)'
            }}
          >
            <Trash2 size={15} />
            Delete account
          </button>
        </section>

      </div>


      {showDelete && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setShowDelete(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background:
              'rgba(15,23,42,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(520px, 94vw)',
              border:
                '1px solid rgba(220,38,38,0.35)'
            }}
          >
            <span className="eyebrow dark">
              DANGER ZONE
            </span>

            <h2>
              Permanently delete account?
            </h2>

            <p className="muted">
              {deleteNeedsPassword
                ? 'Enter your current password to permanently delete your account.'
                : 'Confirm below to permanently remove this account. Your active Google session is used for verification.'}
            </p>

            {deleteNeedsPassword && (

              <input
                name="delete-account-password"
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                value={deletePassword}
                onChange={event =>
                  setDeletePassword(
                    event.target.value
                  )
                }
              />

            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent:
                  'flex-end',
                marginTop: 14
              }}
            >
              <button
                type="button"
                className="btn subtle"
                disabled={deleteBusy}
                onClick={() =>
                  setShowDelete(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  deleteBusy ||
                  (
                    deleteNeedsPassword &&
                    !deletePassword
                  )
                }
                onClick={deleteAccount}
              >
                <Trash2 size={15} />
                {deleteBusy
                  ? 'Deleting…'
                  : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>

      )}

    </Page>
  );

}


/* =========================================================
   GOOGLE FIRST-TIME ACCOUNT TYPE
   ========================================================= */

function GoogleAccountType({
  session,
  onDone
}) {

  const user =
    session?.user;

  const metadata =
    user?.user_metadata || {};

  const fullName =
    metadata.full_name ||
    metadata.name ||
    '';

  const nameParts =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const [role, setRole] =
    useState(null);

  const [companyName, setCompanyName] =
    useState('');

  const [companyRole, setCompanyRole] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState('');


  async function finish() {

    if (!role || !user?.id) {
      return;
    }


    if (
      role === 'employer' &&
      !companyName.trim()
    ) {
      setMessage(
        'Please enter your company or organization name.'
      );
      return;
    }


    setBusy(true);
    setMessage('');


    const payload = {
      id: user.id,
      account_type: role,
      name:
        nameParts[0] ||
        metadata.given_name ||
        'User',
      surname:
        nameParts.slice(1).join(' ') ||
        metadata.family_name ||
        '',
      avatar_url:
        metadata.avatar_url ||
        metadata.picture ||
        null,
      university: '',
      faculty: '',
      degree: '',
      year: '',
      city: '',
      company_name:
        role === 'employer'
          ? companyName.trim()
          : null,
      company_role:
        role === 'employer'
          ? companyRole.trim()
          : null,
      company_website: null,
      company_description: null
    };


    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .upsert(
        payload,
        {
          onConflict: 'id'
        }
      )
      .select()
      .single();


    if (error) {

      setMessage(error.message);
      setBusy(false);
      return;

    }


    setBusy(false);
    onDone(data);

  }


  return (
    <div className="auth-shell">

      <div className="auth-card card">

        <span className="eyebrow dark">
          WELCOME TO ONSTOOD
        </span>

        <h1>
          Choose your account type
        </h1>

        <p className="muted">
          You only choose this once.
          ONSTOOD will use it to open the
          right workspace whenever you sign
          in with Google.
        </p>


        <div
          className="grid2"
          style={{
            marginTop: 18
          }}
        >

          <button
            type="button"
            className={
              role === 'student'
                ? 'card active'
                : 'card'
            }
            onClick={() =>
              setRole('student')
            }
            style={{
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <BookOpen size={24} />

            <h3>
              Student
            </h3>

            <p className="muted">
              Courses, documents, calendar,
              network, AI and career.
            </p>
          </button>


          <button
            type="button"
            className={
              role === 'employer'
                ? 'card active'
                : 'card'
            }
            onClick={() =>
              setRole('employer')
            }
            style={{
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <BriefcaseBusiness
              size={24}
            />

            <h3>
              Employer
            </h3>

            <p className="muted">
              Publish opportunities,
              manage applicants and
              communicate with talent.
            </p>
          </button>

        </div>


        {role === 'employer' && (

          <div
            style={{
              display: 'grid',
              gap: 10,
              marginTop: 14
            }}
          >

            <input
              name="google-company-name"
              placeholder="Company / organization name"
              value={companyName}
              onChange={event =>
                setCompanyName(
                  event.target.value
                )
              }
            />

            <input
              name="google-company-role"
              placeholder="Your role · optional"
              value={companyRole}
              onChange={event =>
                setCompanyRole(
                  event.target.value
                )
              }
            />

          </div>

        )}


        {message && (

          <div
            className="notice"
            style={{
              marginTop: 12
            }}
          >
            {message}
          </div>

        )}


        <button
          type="button"
          className="btn primary full"
          disabled={
            !role ||
            busy
          }
          onClick={finish}
          style={{
            marginTop: 16
          }}
        >
          {
            busy
              ? 'Creating account…'
              : (
                role === 'employer'
                  ? 'Continue as Employer'
                  : role === 'student'
                    ? 'Continue as Student'
                    : 'Choose Student or Employer'
              )
          }
        </button>

      </div>

    </div>
  );

}


/* =========================================================
   ROOT / AUTH SESSION
   ========================================================= */


function MiniChat({
  profile,
  notify,
  targetUserId,
  targetConversationId,
  onlineUserIds = [],
  onClose
}) {

  if (
    !targetUserId &&
    !targetConversationId
  ) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        width: 'min(430px, calc(100vw - 24px))',
        height: 'min(600px, calc(100vh - 36px))',
        zIndex: 10030,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 16,
        boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          flex: '0 0 auto'
        }}
      >
        <div>
          <b>Live chat</b>
          <div className="muted" style={{fontSize: 11}}>
            ONSTOOD mini chat
          </div>
        </div>

        <button
          type="button"
          className="btn subtle"
          onClick={onClose}
          aria-label="Close mini chat"
          title="Close chat"
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: 10
        }}
      >
        <PostOffice
          profile={profile}
          notify={notify}
          requestedUserId={
            targetUserId
          }
          requestedConversationId={
            targetConversationId
          }
          onlineUserIds={
            onlineUserIds
          }
          compact={true}
          onChatDeleted={onClose}
        />
      </div>
    </div>
  );
}


function Root() {

  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [recoveryMode, setRecoveryMode] =
    useState(() => {
      try {
        const url = new URL(window.location.href);

        return (
          url.pathname === '/reset-password' ||
          url.searchParams.get('onstood_recovery') === '1' ||
          url.searchParams.get('type') === 'recovery' ||
          window.location.hash.includes('type=recovery')
        );
      } catch {
        return false;
      }
    });

  const [recoveryError, setRecoveryError] =
    useState('');

  const [confirmationMode, setConfirmationMode] =
    useState(() => {
      try {
        return new URL(window.location.href).pathname === '/confirm-signup';
      } catch {
        return false;
      }
    });

  const [confirmationStatus, setConfirmationStatus] =
    useState('checking');

  const [confirmationError, setConfirmationError] =
    useState('');

  const [needsAccountType, setNeedsAccountType] =
    useState(false);

  const [profileCheckBusy, setProfileCheckBusy] =
    useState(false);


  async function checkAccountType(
    currentSession
  ) {

    const userId =
      currentSession?.user?.id;


    if (!userId) {

      setNeedsAccountType(false);
      return;

    }


    setProfileCheckBusy(true);


    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', userId)
      .maybeSingle();


    if (error) {

      console.error(
        'Profile role check error:',
        error
      );

      setNeedsAccountType(false);
      setProfileCheckBusy(false);
      return;

    }


    setNeedsAccountType(
      !data?.account_type
    );

    setProfileCheckBusy(false);

  }


  useEffect(() => {

    let mounted = true;


    async function start() {

      try {

        const url =
          new URL(window.location.href);

        const tokenHash =
          url.searchParams.get('token_hash');

        const emailType =
          url.searchParams.get('type');

        const authError =
          url.searchParams.get('error_description') ||
          url.searchParams.get('error');

        if (authError) {

          setRecoveryError(
            decodeURIComponent(
              String(authError).replace(/\+/g, ' ')
            )
          );

        }

        if (
          url.pathname === '/reset-password' &&
          tokenHash &&
          emailType === 'recovery'
        ) {

          const {
            error: verifyError
          } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });

          if (verifyError) {

            setRecoveryError(
              verifyError.message ||
              'This password reset link is invalid or has expired.'
            );

          } else {

            setRecoveryMode(true);
            setRecoveryError('');

            window.history.replaceState(
              {},
              document.title,
              '/reset-password'
            );

          }

        }

        if (url.pathname === '/confirm-signup') {

          setConfirmationMode(true);
          setConfirmationStatus('checking');
          setConfirmationError('');

          if (!tokenHash || emailType !== 'email') {

            setConfirmationStatus('error');
            setConfirmationError(
              'This confirmation link is incomplete or invalid.'
            );

          } else {

            const {
              data: confirmationData,
              error: confirmationVerifyError
            } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'email'
            });

            if (confirmationVerifyError) {

              setConfirmationStatus('error');
              setConfirmationError(
                confirmationVerifyError.message ||
                'This confirmation link is invalid or has expired.'
              );

            } else {

              const confirmedSession =
                confirmationData?.session || null;

              setConfirmationStatus('success');
              setConfirmationError('');

              if (confirmedSession) {

                setSession(confirmedSession);

                await checkAccountType(
                  confirmedSession
                );

              }

              // Seamless activation:
              // confirmed users go straight into ONSTOOD.
              window.history.replaceState(
                {},
                document.title,
                '/'
              );

              setConfirmationMode(false);

            }

          }

        }

      } catch (error) {

        console.error(
          'Recovery URL handling error:',
          error
        );

      }

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


      const currentSession =
        data?.session || null;


      if (mounted) {

        setSession(
          currentSession
        );


        if (currentSession) {
          await checkAccountType(
            currentSession
          );
        }


        setLoading(false);

      }

    }


    start();


    const {
      data: authData
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {

        if (event === 'PASSWORD_RECOVERY') {

          setRecoveryMode(true);

        }


        setSession(newSession);


        if (newSession) {

          setTimeout(() => {
            checkAccountType(
              newSession
            );
          }, 0);

        } else {

          setNeedsAccountType(false);

        }

      }
    );


    return () => {

      mounted = false;

      authData.subscription.unsubscribe();

    };

  }, []);


  if (
    loading ||
    profileCheckBusy
  ) {

    return (
      <div className="loading">
        Starting ONSTOOD…
      </div>
    );

  }


  if (confirmationMode) {

    return (
      <div className="auth-shell">

        <div className="auth-left">

          <div className="brand huge">
            ONSTOOD<span>.</span>
          </div>

          <h1>
            {confirmationStatus === 'success'
              ? 'Identity confirmed.'
              : confirmationStatus === 'error'
                ? 'Activation interrupted.'
                : 'Initializing account.'}
          </h1>

          <p>
            {confirmationStatus === 'success'
              ? 'Your email is verified and your ONSTOOD account is active.'
              : confirmationStatus === 'error'
                ? 'The activation link could not be verified.'
                : 'Securely verifying your ONSTOOD activation token…'}
          </p>

          <div className="auth-pills">
            <span>Secure</span>
            <span>Email verified</span>
            <span>ONSTOOD</span>
          </div>

        </div>

        <div className="auth-card">

          <div className="brand">
            ONSTOOD<span>.</span>
          </div>

          {confirmationStatus === 'checking' && (
            <>
              <h2>Activating your account…</h2>
              <div className="message">
                Verifying your email securely. This should only take a moment.
              </div>
            </>
          )}

          {confirmationStatus === 'success' && (
            <>
              <h2>◈ ACCOUNT ACTIVATED</h2>

              <div className="message success">
                Your email has been confirmed successfully.
                Welcome to ONSTOOD.
              </div>

              <button
                className="btn primary full"
                onClick={() => {
                  window.history.replaceState(
                    {},
                    document.title,
                    '/'
                  );
                  setConfirmationMode(false);
                }}
              >
                Continue to sign in
              </button>
            </>
          )}

          {confirmationStatus === 'error' && (
            <>
              <h2>Activation link unavailable</h2>

              <div className="message">
                {confirmationError}
              </div>

              <button
                className="btn primary full"
                onClick={() => {
                  window.history.replaceState(
                    {},
                    document.title,
                    '/'
                  );
                  setConfirmationMode(false);
                  setConfirmationStatus('checking');
                  setConfirmationError('');
                }}
              >
                Back to sign in
              </button>
            </>
          )}

          <div
            className="muted"
            style={{
              marginTop: 14,
              fontSize: 12
            }}
          >
            Secure account activation powered by ONSTOOD Auth.
          </div>

        </div>

      </div>
    );

  }


  if (recoveryMode) {

    if (recoveryError) {

      return (
        <div className="auth-shell">

          <div className="auth-left">

            <div className="brand huge">
              ONSTOOD<span>.</span>
            </div>

            <h1>
              Reset link
              <br />
              unavailable.
            </h1>

            <p>
              This password reset link is invalid, expired,
              or has already been used.
            </p>

          </div>

          <div className="auth-card">

            <div className="brand">
              ONSTOOD<span>.</span>
            </div>

            <h2>
              Request a new password reset link
            </h2>

            <div className="message">
              {recoveryError}
            </div>

            <button
              className="btn primary full"
              onClick={() => {
                window.history.replaceState(
                  {},
                  document.title,
                  '/'
                );
                setRecoveryError('');
                setRecoveryMode(false);
              }}
            >
              Back to sign in
            </button>

          </div>

        </div>
      );

    }

    return (
      <ResetPassword
        onDone={async () => {

          const {
            data
          } = await supabase.auth.getSession();

          const activeSession =
            data?.session || null;

          if (activeSession) {

            setSession(activeSession);

            await checkAccountType(
              activeSession
            );

          }

          window.history.replaceState(
            {},
            document.title,
            '/'
          );

          setRecoveryError('');
          setRecoveryMode(false);

        }}
      />
    );

  }


  if (!session) {

    return (
      <Auth
        onReady={setSession}
      />
    );

  }


  if (needsAccountType) {

    return (
      <GoogleAccountType
        session={session}
        onDone={() => {
          setNeedsAccountType(false);
        }}
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