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
  Copy,
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

const ONSTOOD_BUILD = 'V29.18.3-MOBILE-MESSAGES-FOCUS';
console.log('%cOopss, only for developers!', 'font-size:28px;font-weight:900;color:#6558ff;');
console.log('%cThis area is intended for ONSTOOD developers. Never paste code here that someone sent you — it could compromise your ONSTOOD account.', 'font-size:13px;font-weight:600;color:#64748b;');
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

  const authBaseUrl =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? window.location.origin
      : 'https://onstood.com';

  const signupReturnUrl =
    `${authBaseUrl}/?onstood_confirm=1`;

  const recoveryReturnUrl =
    `${authBaseUrl}/?onstood_recovery=1`;


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
              authBaseUrl
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
            signupReturnUrl,

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
            recoveryReturnUrl
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


        {/* PASSWORD */}

        {mode === 'login' && (

          <>

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
  const [requestedProfileId, setRequestedProfileId] = useState(null);
  function openMemberProfile(userId) {
    if (!userId || userId === profile?.id) { setRequestedProfileId(null); setSection('profile'); return; }
    setRequestedProfileId(userId);
    setSection('friends');
  }

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [globalSelectionAction, setGlobalSelectionAction] =
    useState(null);

  const [globalAiAccess, setGlobalAiAccess] =
    useState({
      loaded: false,
      plan_code: 'free',
      standard_left: 0,
      advanced_left: 0
    });

  const [externalAiAsk, setExternalAiAsk] =
    useState(null);

  const globalSelectionToolbarRef =
    useRef(null);

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
  const [miniChats, setMiniChats] =
    useState([]);

  const [isMobileViewport, setIsMobileViewport] =
    useState(() =>
      window.matchMedia('(max-width: 767px)').matches
    );

  useEffect(() => {
    const media =
      window.matchMedia('(max-width: 767px)');

    const update = () =>
      setIsMobileViewport(media.matches);

    media.addEventListener?.('change', update);

    return () =>
      media.removeEventListener?.('change', update);
  }, []);

  function openMiniChat({
    userId = null,
    conversationId = null
  }) {
    if (!userId && !conversationId) {
      return;
    }

    if (isMobileViewport) {
      setMiniChats([]);
      setMessageConversationId(
        conversationId || null
      );
      setMessageTargetUserId(
        conversationId ? null : userId
      );
      setSection('messages');
      return;
    }

    const key =
      conversationId
        ? `conversation:${conversationId}`
        : `user:${userId}`;

    setMiniChats(current => {
      const exists =
        current.some(item => item.key === key);

      if (exists) return current;

      return [
        ...current,
        { key, userId, conversationId }
      ];
    });
  }

  function closeMiniChat(
    key
  ) {
    setMiniChats(current =>
      current.filter(
        item => item.key !== key
      )
    );
  }


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

      openMiniChat({
        userId: senderId,
        conversationId
      });

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


  function clearGlobalBrowserSelection() {
    try {
      window.getSelection?.()?.removeAllRanges?.();
    } catch {}
  }


  async function loadGlobalAiAccess() {
    if (!profile?.id) return;

    const { data, error } =
      await supabase.rpc('get_ai_usage');

    if (error) return;

    const row =
      Array.isArray(data)
        ? data[0]
        : data;

    const standardLimit =
      Number(row?.standard_limit ?? 5);

    const advancedLimit =
      Number(row?.advanced_limit ?? 0);

    const standardUsed =
      Number(row?.standard_used ?? 0);

    const advancedUsed =
      Number(row?.advanced_used ?? 0);

    setGlobalAiAccess({
      loaded: true,
      plan_code:
        row?.plan_code || 'free',
      standard_left:
        Math.max(
          0,
          standardLimit - standardUsed
        ),
      advanced_left:
        Math.max(
          0,
          advancedLimit - advancedUsed
        )
    });
  }


  function openMaterialInAi(
    materialText,
    mode = 'standard'
  ) {
    const cleanText =
      String(
        materialText || ''
      )
        .trim()
        .slice(0, 3000);

    if (!cleanText) {
      return;
    }

    const isAdvanced =
      mode === 'advanced';

    if (
      !isAdvanced &&
      globalAiAccess.loaded &&
      globalAiAccess.standard_left <= 0
    ) {
      notify(
        'Your standard AI allowance is finished.'
      );
      return;
    }

    if (
      isAdvanced &&
      (
        globalAiAccess.plan_code !== 'pro' ||
        globalAiAccess.advanced_left <= 0
      )
    ) {
      notify(
        'Advanced ONSTOOD AI is not active for this account.'
      );
      return;
    }

    setExternalAiAsk({
      id:
        `${Date.now()}-${Math.random()}`,
      text: cleanText,
      mode:
        isAdvanced
          ? 'advanced'
          : 'standard'
    });

    setSection('ai');
  }


  function openGlobalSelectionInAi(
    mode = 'standard'
  ) {
    const selectedText =
      globalSelectionAction?.text;

    if (!selectedText) return;

    const isAdvanced =
      mode === 'advanced';

    if (
      !isAdvanced &&
      globalAiAccess.loaded &&
      globalAiAccess.standard_left <= 0
    ) {
      notify(
        'Your standard AI allowance is finished.'
      );
      return;
    }

    if (
      isAdvanced &&
      (
        globalAiAccess.plan_code !== 'pro' ||
        globalAiAccess.advanced_left <= 0
      )
    ) {
      notify(
        'Advanced ONSTOOD AI is not active for this account.'
      );
      return;
    }

    setExternalAiAsk({
      id:
        `${Date.now()}-${Math.random()}`,
      text:
        selectedText.slice(0, 4000),
      mode:
        isAdvanced
          ? 'advanced'
          : 'standard'
    });

    setGlobalSelectionAction(null);
    clearGlobalBrowserSelection();
    setSection('ai');
  }


  async function copyGlobalSelection() {
    const selectedText =
      globalSelectionAction?.text;

    if (!selectedText) return;

    try {
      await navigator.clipboard.writeText(
        selectedText
      );
    } catch {
      const temp =
        document.createElement(
          'textarea'
        );

      temp.value =
        selectedText;

      temp.style.position =
        'fixed';

      temp.style.opacity =
        '0';

      document.body.appendChild(
        temp
      );

      temp.select();
      document.execCommand('copy');
      temp.remove();
    }

    setGlobalSelectionAction(null);
    clearGlobalBrowserSelection();
  }


  useEffect(() => {
    if (!profile?.id) return;
    loadGlobalAiAccess();
  }, [profile?.id]);


  useEffect(() => {

    function captureGlobalSelection() {
      window.setTimeout(() => {

        const selection =
          window.getSelection?.();

        const selectedText =
          String(
            selection?.toString() || ''
          ).trim();

        if (
          !selection ||
          selection.rangeCount === 0 ||
          !selectedText
        ) {
          setGlobalSelectionAction(
            null
          );
          return;
        }

        const range =
          selection.getRangeAt(0);

        const commonNode =
          range.commonAncestorContainer;

        const commonElement =
          commonNode?.nodeType === 1
            ? commonNode
            : commonNode?.parentElement;

        const appShell =
          document.querySelector(
            '.app-shell'
          );

        if (
          !appShell ||
          !commonElement ||
          !appShell.contains(
            commonElement
          )
        ) {
          setGlobalSelectionAction(
            null
          );
          return;
        }

        if (
          commonElement.closest(
            'input, textarea, [contenteditable="true"], .onstood-global-selection-toolbar'
          )
        ) {
          return;
        }

        const rect =
          range.getBoundingClientRect();

        if (
          !rect ||
          (!rect.width &&
            !rect.height)
        ) {
          setGlobalSelectionAction(
            null
          );
          return;
        }

        const toolbarWidth =
          Math.min(
            520,
            window.innerWidth - 20
          );

        const safeLeft =
          Math.max(
            10,
            Math.min(
              window.innerWidth -
                toolbarWidth -
                10,
              rect.left +
                rect.width / 2 -
                toolbarWidth / 2
            )
          );

        const preferredTop =
          rect.top - 56;

        const safeTop =
          preferredTop >= 10
            ? preferredTop
            : rect.bottom + 10;

        setGlobalSelectionAction({
          text:
            selectedText.slice(
              0,
              4000
            ),
          left:
            safeLeft,
          top:
            safeTop
        });
      }, 0);
    }


    function handleGlobalPointerDown(
      event
    ) {
      if (
        globalSelectionToolbarRef.current
          ?.contains(
            event.target
          )
      ) {
        return;
      }

      const selection =
        window.getSelection?.();

      if (
        !selection ||
        !String(
          selection.toString() || ''
        ).trim()
      ) {
        setGlobalSelectionAction(
          null
        );
      }
    }


    function handleGlobalKeyDown(
      event
    ) {
      if (
        event.key === 'Escape'
      ) {
        setGlobalSelectionAction(
          null
        );
        clearGlobalBrowserSelection();
      }
    }


    document.addEventListener(
      'mouseup',
      captureGlobalSelection
    );

    document.addEventListener(
      'keyup',
      captureGlobalSelection
    );

    document.addEventListener(
      'mousedown',
      handleGlobalPointerDown
    );

    window.addEventListener(
      'keydown',
      handleGlobalKeyDown
    );

    window.addEventListener(
      'scroll',
      () =>
        setGlobalSelectionAction(
          null
        ),
      true
    );

    return () => {
      document.removeEventListener(
        'mouseup',
        captureGlobalSelection
      );

      document.removeEventListener(
        'keyup',
        captureGlobalSelection
      );

      document.removeEventListener(
        'mousedown',
        handleGlobalPointerDown
      );

      window.removeEventListener(
        'keydown',
        handleGlobalKeyDown
      );
    };

  }, []);


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
              const latestMessageNotification =
                notifications.find(item =>
                  !item.read_at &&
                  (
                    item.kind === 'message' ||
                    item.kind === 'message_mention'
                  )
                );

              if (latestMessageNotification) {
                const conversationId =
                  latestMessageNotification
                    ?.metadata?.conversation_id || null;

                const senderId =
                  latestMessageNotification
                    ?.metadata?.sender_id || null;

                setMessageConversationId(conversationId);
                setMessageTargetUserId(
                  conversationId ? null : senderId
                );
              } else {
                setMessageConversationId(null);
                setMessageTargetUserId(null);
              }

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
              onOpenProfile={openMemberProfile}
              onAskAiMaterial={
                openMaterialInAi
              }
              aiAccess={
                globalAiAccess
              }
            />
          )}

          {section === 'friends' && (
            <Friends
              profile={profile}
              notify={notify}
              onlineUserIds={onlineUserIds}
              requestedProfileId={requestedProfileId}
              onOpenChat={personId => {
                openMiniChat({
                  userId: personId
                });
              }}
            />
          )}

          {!isMobileViewport &&
          miniChats.map(
            (chat, index) => (
              <MiniChat
                key={chat.key}
                profile={profile}
                notify={notify}
                targetUserId={
                  chat.userId
                }
                targetConversationId={
                  chat.conversationId
                }
                onlineUserIds={
                  onlineUserIds
                }
                index={index}
                onClose={() =>
                  closeMiniChat(
                    chat.key
                  )
                }
              />
            )
          )}

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
              onOpenMiniChat={
                isMobileViewport
                  ? null
                  : (
                      personId,
                      conversationId
                    ) => {
                      openMiniChat({
                        userId: personId,
                        conversationId
                      });
                    }
              }
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
            <AI
              profile={profile}
              externalAsk={
                externalAiAsk
              }
              onExternalAskConsumed={() =>
                setExternalAiAsk(null)
              }
              onUsageChanged={
                loadGlobalAiAccess
              }
            />
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
              setProfile={setProfile}
              notify={notify}
            />
          )}

          {section === 'profile' && (
            <MyProfile
              profile={profile}
              notify={notify}
              onEditProfile={() => setSection('settings')}
            />
          )}

          </SectionErrorBoundary>

        </main>


        {/* RIGHT SIDEBAR */}

        {profile.account_type !== 'employer' && (
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

      {profile.account_type !== 'employer' &&
      !isMobileViewport && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            width: 'min(260px, calc(100vw - 24px))',
            zIndex: 10040
          }}
        >
          <OnlineConnections
            profile={profile}
            onlineUserIds={onlineUserIds}
            notify={notify}
            onOpenChat={personId => {
              openMiniChat({
                userId: personId
              });
            }}
          />
        </div>
      )}


      <style>{`
        @keyframes onstoodGlobalSelectionFlow {
          0% {
            transform: translateX(-125%);
            opacity: 0;
          }
          14% {
            opacity: .9;
          }
          72% {
            opacity: .58;
          }
          100% {
            transform: translateX(250%);
            opacity: 0;
          }
        }

        @keyframes onstoodGlobalSelectionLed {
          0%, 100% {
            opacity: .5;
            box-shadow:
              0 0 5px rgba(96,165,250,.7),
              0 0 11px rgba(99,102,241,.28);
          }
          50% {
            opacity: 1;
            box-shadow:
              0 0 8px rgba(125,211,252,.95),
              0 0 19px rgba(99,102,241,.55);
          }
        }

        .onstood-global-selection-toolbar {
          position: fixed;
          z-index: 70000;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border: 1px solid rgba(148,163,184,.28);
          border-radius: 14px;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(15px);
          box-shadow:
            0 16px 45px rgba(15,23,42,.18),
            inset 0 1px 0 rgba(255,255,255,.92);
        }

        .onstood-global-selection-copy {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(148,163,184,.28);
          border-radius: 10px;
          background: #fff;
          color: #475569;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .onstood-global-selection-chip {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 10px;
          border: 1px solid rgba(99,102,241,.30);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .35px;
          white-space: nowrap;
          cursor: pointer;
          box-shadow:
            inset 0 0 18px rgba(96,165,250,.10),
            0 0 16px rgba(99,102,241,.18);
          transition:
            transform .16s ease,
            box-shadow .16s ease,
            opacity .16s ease;
        }

        .onstood-global-selection-chip.standard {
          background:
            radial-gradient(circle at 72% 50%,rgba(56,189,248,.18),transparent 35%),
            linear-gradient(135deg,#172554,#312e81);
        }

        .onstood-global-selection-chip.advanced {
          background:
            radial-gradient(circle at 70% 50%,rgba(125,211,252,.22),transparent 34%),
            linear-gradient(135deg,#09111f,#202b55);
        }

        .onstood-global-selection-chip:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow:
            inset 0 0 20px rgba(96,165,250,.14),
            0 0 23px rgba(99,102,241,.32);
        }

        .onstood-global-selection-chip:disabled {
          opacity: .38;
          cursor: default;
          box-shadow: none;
        }

        .onstood-global-selection-flow {
          position: absolute;
          inset: 0 auto 0 0;
          width: 36%;
          z-index: 1;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(125,211,252,.28),
              rgba(167,139,250,.30),
              transparent
            );
          animation:
            onstoodGlobalSelectionFlow 1.85s linear infinite;
          pointer-events: none;
        }

        .onstood-global-selection-chip.advanced
        .onstood-global-selection-flow {
          animation-duration: 1.5s;
        }

        .onstood-global-selection-led {
          position: relative;
          z-index: 3;
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 7px;
          border-radius: 999px;
          background: #7dd3fc;
          animation:
            onstoodGlobalSelectionLed 1.35s ease-in-out infinite;
          vertical-align: middle;
        }

        .onstood-global-selection-chip:disabled
        .onstood-global-selection-flow {
          display: none;
        }

        .onstood-global-selection-chip:disabled
        .onstood-global-selection-led {
          background: #64748b;
          animation: none;
          box-shadow: none;
        }

        .onstood-global-selection-label {
          position: relative;
          z-index: 4;
        }

        @media (max-width: 720px) {
          .onstood-global-selection-toolbar {
            max-width: calc(100vw - 16px);
            gap: 4px;
            padding: 5px;
          }

          .onstood-global-selection-chip {
            padding: 0 7px;
            font-size: 9px;
            letter-spacing: .15px;
          }

          .onstood-global-selection-copy {
            width: 30px;
            height: 30px;
          }
        }

        .mobile-chat-back {
          display: none !important;
        }

        /* ===================================================
           ONSTOOD RESPONSIVE FOUNDATION
           Desktop: >= 1181px
           Tablet browser: 768px - 1180px
           =================================================== */

        @media (min-width: 1181px) {
          .app-grid {
            min-width: 0;
          }

          .content,
          .sidebar,
          .rightbar {
            min-width: 0;
          }
        }

        @media (min-width: 768px) and (max-width: 1180px) {
          html,
          body,
          #root {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .app-shell {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          .topbar {
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            padding-left: 14px !important;
            padding-right: 14px !important;
            gap: 10px !important;
          }

          .topbar .brand {
            flex: 0 0 auto;
          }

          .global-search {
            min-width: 0 !important;
            flex: 1 1 260px !important;
            max-width: none !important;
          }

          .global-search input {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .top-actions {
            flex: 0 0 auto;
            gap: 5px !important;
          }

          .app-grid {
            display: grid !important;
            grid-template-columns:
              minmax(160px, 190px)
              minmax(0, 1fr) !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            box-sizing: border-box !important;
          }

          .sidebar {
            width: auto !important;
            min-width: 0 !important;
            max-width: 190px !important;
          }

          .sidebar .profile-mini {
            min-width: 0 !important;
          }

          .sidebar .profile-mini > div {
            min-width: 0 !important;
          }

          .sidebar .profile-mini b,
          .sidebar .profile-mini small {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sidebar nav button {
            min-width: 0 !important;
            gap: 8px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .sidebar nav button > span:last-of-type {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .content {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-x: hidden;
          }

          .rightbar {
            display: none !important;
          }

          .hero,
          .card,
          .feed-card,
          .post-card {
            max-width: 100%;
            box-sizing: border-box;
          }

          .hero {
            overflow: hidden;
          }

          .grid2,
          .two-col {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .people-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .page-heading {
            gap: 12px !important;
            flex-wrap: wrap !important;
          }

          .page-heading .search-box {
            width: min(100%, 320px) !important;
          }

          .post-card img,
          .post-card video {
            max-width: 100%;
          }

          .onstood-global-selection-toolbar {
            max-width: calc(100vw - 24px);
          }

          .onstood-mini-chat-shell {
            max-width: min(360px, calc(100vw - 24px)) !important;
          }
        }

        @media (min-width: 768px) and (max-width: 900px) {
          .app-grid {
            grid-template-columns:
              150px minmax(0, 1fr) !important;
            gap: 10px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .sidebar {
            max-width: 150px !important;
          }

          .sidebar nav button {
            font-size: 13px !important;
          }

          .sidebar .profile-mini small {
            display: none !important;
          }

          .topbar {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .global-search input {
            font-size: 13px !important;
          }

          .people-grid {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }

          .grid2,
          .two-col {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }
        }


        /* Mobile browser foundation */
        @media (max-width: 767px) {
          html,
          body,
          #root {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          body {
            -webkit-text-size-adjust: 100%;
          }

          .app-shell {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          .topbar {
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            padding: 8px 10px !important;
            gap: 7px !important;
          }

          .topbar .brand {
            flex: 0 0 auto;
            font-size: 19px !important;
          }

          .global-search {
            min-width: 0 !important;
            flex: 1 1 auto !important;
            max-width: none !important;
          }

          .global-search input {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            font-size: 13px !important;
          }

          .top-actions {
            flex: 0 0 auto;
            gap: 2px !important;
          }

          .top-actions .icon-btn {
            width: 34px !important;
            height: 34px !important;
          }

          .avatar-button {
            width: 36px !important;
            height: 36px !important;
          }

          .app-grid {
            display: block !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding: 0 10px 88px !important;
            box-sizing: border-box !important;
          }

          .sidebar {
            position: fixed !important;
            left: 8px !important;
            right: 8px !important;
            bottom: 8px !important;
            top: auto !important;
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
            height: auto !important;
            z-index: 12000 !important;
            padding: 6px !important;
            border: 1px solid rgba(148,163,184,.22) !important;
            border-radius: 18px !important;
            background: rgba(255,255,255,.96) !important;
            backdrop-filter: blur(18px) !important;
            box-shadow: 0 14px 40px rgba(15,23,42,.16) !important;
          }

          .sidebar .profile-mini {
            display: none !important;
          }

          .sidebar nav {
            display: flex !important;
            align-items: center !important;
            justify-content: space-around !important;
            gap: 2px !important;
            overflow-x: auto !important;
            scrollbar-width: none;
          }

          .sidebar nav::-webkit-scrollbar {
            display: none;
          }

          .sidebar nav button {
            flex: 0 0 52px !important;
            width: 52px !important;
            min-width: 52px !important;
            height: 48px !important;
            padding: 0 !important;
            display: grid !important;
            place-items: center !important;
            border-radius: 13px !important;
          }

          .sidebar nav button > span:not(.nav-badge),
          .sidebar nav button small {
            display: none !important;
          }

          .sidebar nav button svg {
            margin: 0 !important;
          }

          .sidebar > button:last-child {
            display: none !important;
          }

          .content {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .rightbar {
            display: none !important;
          }

          .hero,
          .card,
          .feed-card,
          .post-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .hero {
            padding: 18px !important;
            border-radius: 18px !important;
            overflow: hidden !important;
          }

          .hero h1 {
            font-size: clamp(25px, 8vw, 34px) !important;
            line-height: 1.06 !important;
          }

          .page-heading {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .page-heading .search-box,
          .search-box {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .grid2,
          .two-col,
          .people-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .post-card img,
          .post-card video,
          .card img,
          .card video {
            max-width: 100% !important;
            height: auto;
          }

          input,
          textarea,
          select,
          button {
            max-width: 100%;
            box-sizing: border-box;
          }

          textarea {
            resize: vertical;
          }

          .onstood-global-selection-toolbar {
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
            max-width: calc(100vw - 16px) !important;
            justify-content: center !important;
            overflow-x: auto !important;
          }

          .onstood-global-selection-chip {
            min-width: max-content;
          }

          .onstood-mini-chat-shell {
            display: none !important;
          }

          .mobile-chat-back {
            display: inline-grid !important;
            place-items: center !important;
            width: 36px !important;
            height: 36px !important;
            flex: 0 0 36px !important;
            font-size: 20px !important;
          }

          .postoffice-layout {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .postoffice-inbox-card {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .postoffice-layout:has(.postoffice-message-scroll)
          .postoffice-inbox-card {
            display: none !important;
          }

          .postoffice-conversation-card {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            min-height: calc(100dvh - 150px) !important;
            height: calc(100dvh - 150px) !important;
            max-height: calc(100dvh - 150px) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
          }

          .postoffice-message-scroll {
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          .postoffice-composer {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 20 !important;
            background: #fff !important;
            grid-template-columns:
              34px 34px 34px 34px minmax(0,1fr) 38px !important;
            gap: 5px !important;
            padding: 8px !important;
          }

          .postoffice-composer input:not([type="file"]) {
            min-height: 40px !important;
            font-size: 16px !important;
          }
        }

        @media (max-width: 520px) {
          .topbar {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .topbar .brand {
            font-size: 17px !important;
          }

          .global-search {
            flex-basis: 120px !important;
          }

          .top-actions .icon-btn {
            width: 31px !important;
            height: 31px !important;
          }

          .app-grid {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .hero {
            padding: 15px !important;
          }

          .hero .btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 390px) {
          .global-search {
            display: none !important;
          }

          .topbar {
            justify-content: space-between !important;
          }
        }

        @media (max-width: 767px) and (orientation: landscape) {
          .sidebar {
            left: 12px !important;
            right: 12px !important;
          }

          .onstood-mini-chat-shell {
            inset: 48px 10px 70px 10px !important;
          }

          .hero {
            padding-top: 14px !important;
            padding-bottom: 14px !important;
          }
        }
      `}</style>


      {globalSelectionAction && (
        <div
          ref={
            globalSelectionToolbarRef
          }
          className="onstood-global-selection-toolbar"
          style={{
            left:
              globalSelectionAction.left,
            top:
              globalSelectionAction.top
          }}
          onMouseDown={event =>
            event.preventDefault()
          }
        >
          <button
            type="button"
            className="onstood-global-selection-copy"
            onClick={
              copyGlobalSelection
            }
            title="Copy"
          >
            <Copy size={15} />
          </button>

          <button
            type="button"
            className="onstood-global-selection-chip standard"
            disabled={
              globalAiAccess.loaded &&
              globalAiAccess.standard_left <= 0
            }
            onClick={() =>
              openGlobalSelectionInAi(
                'standard'
              )
            }
            title="Ask ONSTOOD AI about selected text"
          >
            <span className="onstood-global-selection-flow" />
            <span className="onstood-global-selection-led" />
            <span className="onstood-global-selection-label">
              ASK ONSTOOD AI
            </span>
          </button>

          <button
            type="button"
            className="onstood-global-selection-chip advanced"
            disabled={
              !globalAiAccess.loaded ||
              globalAiAccess.plan_code !== 'pro' ||
              globalAiAccess.advanced_left <= 0
            }
            onClick={() =>
              openGlobalSelectionInAi(
                'advanced'
              )
            }
            title={
              globalAiAccess.plan_code === 'pro'
                ? 'Ask Advanced ONSTOOD AI about selected text'
                : 'Advanced AI requires ONSTOOD PRO'
            }
          >
            <span className="onstood-global-selection-flow" />
            <span className="onstood-global-selection-led" />
            <span className="onstood-global-selection-label">
              ASK ADVANCED ONSTOOD AI
            </span>
          </button>
        </div>
      )}


      {toast && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 14,
            bottom: 'auto',
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)',
            zIndex: 50000,
            width: 'max-content',
            maxWidth: 'min(88vw, 440px)',
            height: 'auto',
            minHeight: 0,
            maxHeight: 'none',
            padding: '9px 13px',
            margin: 0,
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#fff',
            boxShadow: '0 10px 28px rgba(15,23,42,.24)',
            fontSize: 13,
            lineHeight: 1.35,
            fontWeight: 700,
            textAlign: 'center',
            whiteSpace: 'normal',
            pointerEvents: 'none',
            display: 'block',
            inset: 'auto auto auto 50%'
          }}
        >
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
  overviewLoading,
  onOpenProfile,
  onAskAiMaterial,
  aiAccess
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

  const [postFiles, setPostFiles] = useState([]);
  const [postAudience, setPostAudience] = useState('public');
  const [publishing, setPublishing] = useState(false);

  const [
    openAiSuggestedPostId,
    setOpenAiSuggestedPostId
  ] = useState(null);

  const [
    localAiInterestTokens,
    setLocalAiInterestTokens
  ] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          `onstood_ai_interests_${profile?.id || 'guest'}`
        ) || '{}'
      );
    } catch {
      return {};
    }
  });



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
        post_media (
          id,
          media_type,
          storage_path,
          mime_type,
          caption,
          sort_order,
          created_at
        ),
        profiles!posts_user_id_fkey (
          name,
          surname,
          university,
          degree,
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

    const rows = await Promise.all(
      (data || []).map(async item => {
        const signedMedia = await Promise.all(
          (item.post_media || [])
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(async media => {
              const { data: signed } = await supabase.storage
                .from('post-media')
                .createSignedUrl(media.storage_path, 60 * 60);

              return {
                ...media,
                signed_url: signed?.signedUrl || null
              };
            })
        );

        return {
          ...item,
          post_media: signedMedia
        };
      })
    );

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
    const files = Array.from(postFiles || []);

    if (!body && files.length === 0) {
      notify('Write something or add a photo/video.');
      return;
    }

    if (!['public', 'connections', 'only_me'].includes(postAudience)) {
      notify('Choose who can see this post.');
      return;
    }

    const oversized = files.find(file => file.size > 50 * 1024 * 1024);
    if (oversized) {
      notify('Each photo/video must be smaller than 50 MB.');
      return;
    }

    const invalid = files.find(file =>
      !(file.type?.startsWith('image/') || file.type?.startsWith('video/'))
    );
    if (invalid) {
      notify('Only photos and videos can be attached.');
      return;
    }

    setPublishing(true);

    let createdPost = null;
    const uploadedPaths = [];

    try {
      const {
        data,
        error
      } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          body,
          audience: postAudience
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
        throw error;
      }

      createdPost = data;

      const mediaRows = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const originalExt =
          (file.name.split('.').pop() || '').toLowerCase();

        const ext =
          originalExt ||
          (file.type?.startsWith('video/') ? 'mp4' : 'jpg');

        const path =
          `${profile.id}/${data.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } =
          await supabase.storage
            .from('post-media')
            .upload(path, file, {
              contentType: file.type,
              upsert: false,
              cacheControl: '3600'
            });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(path);

        const mediaType =
          file.type?.startsWith('video/')
            ? 'video'
            : 'image';

        const { data: mediaData, error: mediaError } =
          await supabase
            .from('post_media')
            .insert({
              post_id: data.id,
              owner_id: profile.id,
              media_type: mediaType,
              storage_path: path,
              mime_type: file.type || null,
              sort_order: index
            })
            .select('*')
            .single();

        if (mediaError) {
          throw mediaError;
        }

        const { data: signed } =
          await supabase.storage
            .from('post-media')
            .createSignedUrl(path, 60 * 60);

        mediaRows.push({
          ...mediaData,
          signed_url: signed?.signedUrl || null
        });
      }

      setPosts(current => [
        {
          ...data,
          profiles: profile,
          post_media: mediaRows
        },
        ...current
      ]);

      setText('');
      setPostFiles([]);
      setPostAudience('public');

      const input =
        document.getElementById('onstood-post-media-input');
      if (input) {
        input.value = '';
      }

      notify('Post published.');

    } catch (error) {

      if (uploadedPaths.length) {
        await supabase.storage
          .from('post-media')
          .remove(uploadedPaths);
      }

      if (createdPost?.id) {
        await supabase
          .from('posts')
          .delete()
          .eq('id', createdPost.id)
          .eq('user_id', profile.id);
      }

      notify(
        error?.message ||
        'Could not publish the post.'
      );

    } finally {
      setPublishing(false);
    }
  }

  async function changePostAudience(postId, audience) {
    if (!['public', 'connections', 'only_me'].includes(audience)) {
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ audience })
      .eq('id', postId)
      .eq('user_id', profile.id)
      .select('id,audience')
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setPosts(current =>
      current.map(item =>
        item.id === postId
          ? { ...item, audience: data.audience }
          : item
      )
    );

    notify('Post privacy updated.');
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

    const post =
      posts.find(item => item.id === postId);

    const mediaPaths =
      (post?.post_media || [])
        .map(item => item.storage_path)
        .filter(Boolean);

    if (mediaPaths.length) {
      await supabase.storage
        .from('post-media')
        .remove(mediaPaths);
    }

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


  function extractInterestTokens(
    value
  ) {
    return String(value || '')
      .toLowerCase()
      .split(
        /[^a-zA-ZÀ-ž0-9]+/
      )
      .filter(token =>
        token.length >= 4
      )
      .slice(0, 24);
  }


  function rememberAiInterest(
    post,
    weight = 1
  ) {
    const tokens =
      extractInterestTokens(
        [
          post?.body,
          post?.profiles?.university,
          post?.profiles?.degree
        ]
          .filter(Boolean)
          .join(' ')
      );

    if (!tokens.length) {
      return;
    }

    setLocalAiInterestTokens(
      current => {
        const next = {
          ...current
        };

        for (const token of tokens) {
          next[token] =
            Math.min(
              12,
              Number(
                next[token] || 0
              ) + weight
            );
        }

        const trimmed =
          Object.fromEntries(
            Object.entries(next)
              .sort(
                (a, b) =>
                  b[1] - a[1]
              )
              .slice(0, 80)
          );

        try {
          localStorage.setItem(
            `onstood_ai_interests_${profile?.id || 'guest'}`,
            JSON.stringify(
              trimmed
            )
          );
        } catch {}

        return trimmed;
      }
    );
  }


  function suggestionReason(
    post
  ) {
    const profileUniversity =
      String(
        profile?.university || ''
      ).trim();

    const postUniversity =
      String(
        post?.profiles?.university ||
        ''
      ).trim();

    if (
      profileUniversity &&
      postUniversity &&
      profileUniversity.toLowerCase() ===
        postUniversity.toLowerCase()
    ) {
      return `Popular in ${profileUniversity}`;
    }

    const degree =
      String(
        profile?.degree ||
        profile?.faculty ||
        ''
      ).trim();

    if (
      degree &&
      String(
        post?.body || ''
      )
        .toLowerCase()
        .includes(
          degree.toLowerCase()
        )
    ) {
      return `Relevant to your ${degree} studies`;
    }

    const tokens =
      extractInterestTokens(
        post?.body
      );

    const learnedMatch =
      tokens.find(
        token =>
          Number(
            localAiInterestTokens[
              token
            ] || 0
          ) >= 2
      );

    if (learnedMatch) {
      return `Related to topics you explore on ONSTOOD`;
    }

    if (
      connections.some(
        person =>
          person.id ===
          post?.user_id
      )
    ) {
      return 'From your student network';
    }

    return 'Relevant to your studies';
  }


  function personalizationTokens() {
    return [
      profile?.university,
      profile?.faculty,
      profile?.degree,
      profile?.city
    ]
      .filter(Boolean)
      .flatMap(value =>
        String(value)
          .toLowerCase()
          .split(
            /[^a-zA-ZÀ-ž0-9]+/
          )
      )
      .filter(token =>
        token.length >= 3
      );
  }


  function scoreSuggestedPost(
    post
  ) {
    let score = 0;

    const body =
      String(
        post?.body || ''
      ).toLowerCase();

    const authorUniversity =
      String(
        post?.profiles?.university ||
        ''
      ).toLowerCase();

    const authorDegree =
      String(
        post?.profiles?.degree ||
        ''
      ).toLowerCase();

    const tokens =
      personalizationTokens();

    for (const token of tokens) {
      if (body.includes(token)) {
        score += 3;
      }

      if (
        authorUniversity.includes(
          token
        )
      ) {
        score += 2;
      }

      if (
        authorDegree.includes(
          token
        )
      ) {
        score += 2;
      }
    }

    for (
      const [
        token,
        interestWeight
      ] of Object.entries(
        localAiInterestTokens
      )
    ) {
      if (
        body.includes(token)
      ) {
        score +=
          Math.min(
            4,
            Number(
              interestWeight || 0
            ) * 0.45
          );
      }
    }

    if (
      connections.some(
        person =>
          person.id ===
          post?.user_id
      )
    ) {
      score += 5;
    }

    if (
      post?.user_id ===
      profile.id
    ) {
      score -= 7;
    }

    const ageHours =
      Math.max(
        0,
        (
          Date.now() -
          new Date(
            post?.created_at || 0
          ).getTime()
        ) /
        3600000
      );

    score += Math.max(
      0,
      3 - ageHours / 72
    );

    score += Math.min(
      1.25,
      Number(
        likes[post?.id] || 0
      ) * 0.12 +
      Number(
        comments[
          post?.id
        ]?.length || 0
      ) * 0.18
    );

    return score;
  }


  function buildPersonalizedFeed() {
    if (!posts.length) {
      return [];
    }

    if (posts.length < 10) {
      return posts.map(post => ({
        type: 'post',
        post
      }));
    }

    const ranked =
      [...posts]
        .sort(
          (a, b) =>
            scoreSuggestedPost(b) -
            scoreSuggestedPost(a)
        );

    const suggestedIds =
      new Set();

    const result = [];
    let regularCount = 0;

    for (const post of posts) {
      if (
        suggestedIds.has(post.id)
      ) {
        continue;
      }

      result.push({
        type: 'post',
        post
      });

      regularCount += 1;

      if (regularCount % 9 === 0) {
        const candidate =
          ranked.find(item =>
            !suggestedIds.has(
              item.id
            ) &&
            item.id !== post.id &&
            !result.some(
              feedItem =>
                feedItem.post?.id ===
                item.id
            )
          );

        if (candidate) {
          suggestedIds.add(
            candidate.id
          );

          result.push({
            type: 'ai_suggestion',
            post: candidate
          });
        }
      }
    }

    return result;
  }


  function aiMaterialText(
    post
  ) {
    const author =
      `${
        post?.profiles?.name || ''
      } ${
        post?.profiles?.surname || ''
      }`.trim();

    const body =
      String(
        post?.body || ''
      )
        .trim()
        .slice(0, 2600);

    return [
      author
        ? `ONSTOOD post by ${author}`
        : 'ONSTOOD post',
      body
    ]
      .filter(Boolean)
      .join('\\n\\n');
  }


  const personalizedFeed =
    buildPersonalizedFeed();


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
          onClick={() => go('friends')}
        />

        <Stat
          label="Upcoming"
          value={
            overviewLoading
              ? '…'
              : overview.upcoming
          }
          onClick={() => go('calendar')}
        />

        <Stat
          label="Open tasks"
          value={
            overviewLoading
              ? '…'
              : overview.tasks
          }
          onClick={() => go('tasks')}
        />

        <Stat
          label="Documents"
          value={
            overviewLoading
              ? '…'
              : overview.documents
          }
          onClick={() => go('documents')}
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


      <div
        className="feed-card card"
        style={{
          padding: 14
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0,1fr) auto',
            gap: 10,
            alignItems: 'start'
          }}
        >
          <Avatar profile={profile} />

          <textarea
            name="new-post"
            placeholder="Share a question, idea, photo or video…"
            value={text}
            onChange={event =>
              setText(
                event.target.value
              )
            }
            style={{
              width: '100%',
              minHeight: 68,
              maxHeight: 120,
              margin: 0,
              resize: 'vertical',
              borderRadius: 12,
              padding: '12px 14px'
            }}
          />

          <label
            title="Choose one or more photos/videos"
            style={{
              height: 46,
              padding: '0 14px',
              border: '1px solid #dfe3ec',
              borderRadius: 12,
              background: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: 'pointer',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              alignSelf: 'center'
            }}
          >
            <Paperclip size={15} />
            {postFiles.length > 0
              ? `${postFiles.length} selected`
              : 'Photo / Video'}

            <input
              id="onstood-post-media-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              hidden
              onChange={event =>
                setPostFiles(
                  Array.from(
                    event.target.files || []
                  )
                )
              }
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            paddingLeft: 46
          }}
        >
          <select
            value={postAudience}
            onChange={event =>
              setPostAudience(
                event.target.value
              )
            }
            title="Who can see this post?"
            style={{
              width: 138,
              minWidth: 138,
              height: 42,
              margin: 0,
              padding: '0 32px 0 12px',
              borderRadius: 10,
              fontSize: 14,
              lineHeight: 1.2
            }}
          >
            <option value="public">
              Public
            </option>
            <option value="connections">
              Connections
            </option>
            <option value="only_me">
              Only me
            </option>
          </select>

          <button
            className="btn primary"
            onClick={publish}
            disabled={publishing}
            style={{
              height: 42,
              margin: 0,
              padding: '0 16px'
            }}
          >
            <Send size={16} />
            {publishing ? 'Posting…' : 'Post'}
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
        personalizedFeed.map(
          (feedItem, index) => {

            const post =
              feedItem.post;

            if (
              feedItem.type ===
              'ai_suggestion'
            ) {
              const opened =
                openAiSuggestedPostId ===
                post.id;

              const standardDisabled =
                Boolean(
                  aiAccess?.loaded &&
                  aiAccess.standard_left <= 0
                );

              const advancedDisabled =
                Boolean(
                  !aiAccess?.loaded ||
                  aiAccess.plan_code !== 'pro' ||
                  aiAccess.advanced_left <= 0
                );

              return (
                <div
                  key={`ai-suggested-${post.id}-${index}`}
                  className="card"
                  onClick={() => {
                    const willOpen =
                      openAiSuggestedPostId !==
                      post.id;

                    setOpenAiSuggestedPostId(
                      willOpen
                        ? post.id
                        : null
                    );

                    if (willOpen) {
                      rememberAiInterest(
                        post,
                        1
                      );
                    }
                  }}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border:
                      '1px solid rgba(99,102,241,.18)',
                    background:
                      'linear-gradient(135deg,rgba(15,23,42,.965),rgba(30,41,59,.94))',
                    color: '#fff',
                    boxShadow:
                      '0 14px 38px rgba(15,23,42,.18), inset 0 0 42px rgba(99,102,241,.08)',
                    padding: 16
                  }}
                  title="Anything on ONSTOOD can become a question"
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents:
                        'none',
                      background:
                        'radial-gradient(circle at 80% 30%,rgba(99,102,241,.18),transparent 34%)'
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: 8,
                        marginBottom: 10
                      }}
                    >
                      <Sparkles
                        size={14}
                      />

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing:
                            '1.05px'
                        }}
                      >
                        SUGGESTED BY ONSTOOD AI
                      </span>

                      <span
                        style={{
                          marginLeft:
                            'auto',
                          fontSize: 10,
                          opacity: .68,
                          textAlign:
                            'right'
                        }}
                        title="Why ONSTOOD suggested this"
                      >
                        {suggestionReason(
                          post
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems:
                          'center'
                      }}
                    >
                      <Avatar
                        profile={{
                          ...post.profiles,
                          id:
                            post.user_id
                        }}
                      />

                      <div
                        style={{
                          minWidth: 0
                        }}
                      >
                        <b
                          style={{
                            display:
                              'block'
                          }}
                        >
                          {post.profiles
                            ?.name ||
                            'Student'}{' '}
                          {post.profiles
                            ?.surname ||
                            ''}
                        </b>

                        <small
                          style={{
                            opacity: .66
                          }}
                        >
                          {post.profiles
                            ?.university ||
                            'ONSTOOD'}
                        </small>
                      </div>
                    </div>

                    <p
                      style={{
                        margin:
                          '12px 0 0',
                        lineHeight: 1.55,
                        opacity: .9,
                        display:
                          '-webkit-box',
                        WebkitLineClamp:
                          opened ? 5 : 3,
                        WebkitBoxOrient:
                          'vertical',
                        overflow:
                          'hidden'
                      }}
                    >
                      {post.body}
                    </p>

                    {!opened && (
                      <small
                        style={{
                          display:
                            'block',
                          marginTop: 10,
                          opacity: .55
                        }}
                      >
                        Click to explore with ONSTOOD AI
                      </small>
                    )}

                    {opened && (
                      <div
                        onClick={event =>
                          event.stopPropagation()
                        }
                        style={{
                          display: 'flex',
                          gap: 7,
                          alignItems:
                            'center',
                          flexWrap: 'wrap',
                          marginTop: 13,
                          paddingTop: 12,
                          borderTop:
                            '1px solid rgba(255,255,255,.11)'
                        }}
                      >
                        <button
                          type="button"
                          className="onstood-global-selection-chip standard"
                          disabled={
                            standardDisabled
                          }
                          onClick={() => {
                            rememberAiInterest(
                              post,
                              3
                            );

                            onAskAiMaterial?.(
                              aiMaterialText(
                                post
                              ),
                              'standard'
                            );
                          }}
                          title="Ask ONSTOOD AI to explain this post"
                        >
                          <span className="onstood-global-selection-flow" />
                          <span className="onstood-global-selection-led" />
                          <span className="onstood-global-selection-label">
                            ASK ONSTOOD AI
                          </span>
                        </button>

                        <button
                          type="button"
                          className="onstood-global-selection-chip advanced"
                          disabled={
                            advancedDisabled
                          }
                          onClick={() => {
                            rememberAiInterest(
                              post,
                              3
                            );

                            onAskAiMaterial?.(
                              aiMaterialText(
                                post
                              ),
                              'advanced'
                            );
                          }}
                          title={
                            aiAccess?.plan_code ===
                            'pro'
                              ? 'Ask Advanced ONSTOOD AI to explain this post'
                              : 'Advanced AI requires ONSTOOD PRO'
                          }
                        >
                          <span className="onstood-global-selection-flow" />
                          <span className="onstood-global-selection-led" />
                          <span className="onstood-global-selection-label">
                            ASK ADVANCED ONSTOOD AI
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
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
                onOpenProfile={() =>
                  onOpenProfile?.(
                    post.user_id
                  )
                }
                onAudienceChange={audience =>
                  changePostAudience(
                    post.id,
                    audience
                  )
                }
              />
            );
          }
        )
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
  value,
  onClick
}) {
  if (onClick) {
    return (
      <button
        type="button"
        className="stat"
        onClick={onClick}
        title={`Open ${label}`}
        style={{
          textAlign: 'left',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        <span>{value}</span>
        <small>{label}</small>
      </button>
    );
  }

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
  onDelete,
  onOpenProfile,
  onAudienceChange
}) {

  const author =
    post.profiles || {};

  const [mediaViewer, setMediaViewer] =
    useState(null);

  const [commentsOpen, setCommentsOpen] =
    useState(false);

  const media =
    (post.post_media || [])
      .filter(item => item.signed_url);

  return (
    <article className="card post-card">

      <div className="post-author">
        <button type="button" onClick={onOpenProfile} title="Open profile"
          style={{border:0,background:'transparent',padding:0,cursor:'pointer',display:'flex'}}>
          <Avatar profile={author} />
        </button>

        <div
          style={{
            flex: 1
          }}
        >
          <b onClick={onOpenProfile} style={{cursor:'pointer'}}>
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
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center'
            }}
          >
            <select
              value={post.audience || 'public'}
              onChange={event =>
                onAudienceChange?.(
                  event.target.value
                )
              }
              title="Post privacy"
              style={{
                width: 'auto',
                minWidth: 118,
                padding: '6px 8px'
              }}
            >
              <option value="public">
                Public
              </option>
              <option value="connections">
                Connections
              </option>
              <option value="only_me">
                Only me
              </option>
            </select>

            <button
              type="button"
              className="icon-btn"
              onClick={onDelete}
              title="Delete post"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>


      {post.body && (
        <p className="post-body">
          {post.body}
        </p>
      )}

      {media.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              media.length === 1
                ? '1fr'
                : 'repeat(2, minmax(0, 1fr))',
            gap: 7,
            marginTop: post.body ? 10 : 4,
            borderRadius: 14,
            overflow: 'hidden'
          }}
        >
          {media.slice(0, 4).map((item, index) => {
            const more =
              index === 3 &&
              media.length > 4;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setMediaViewer({
                    items: media,
                    index
                  })
                }
                style={{
                  position: 'relative',
                  border: 0,
                  padding: 0,
                  background: '#0f172a',
                  cursor: 'zoom-in',
                  minHeight:
                    media.length === 1
                      ? 260
                      : 180,
                  maxHeight:
                    media.length === 1
                      ? 520
                      : 320,
                  overflow: 'hidden'
                }}
              >
                {item.media_type === 'video' ? (
                  <video
                    src={item.signed_url}
                    muted
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 'inherit',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <img
                    src={item.signed_url}
                    alt="Post media"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 'inherit',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                )}

                {more && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'rgba(15,23,42,.58)',
                      color: '#fff',
                      fontSize: 28,
                      fontWeight: 800
                    }}
                  >
                    +{media.length - 4}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {mediaViewer && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setMediaViewer(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30000,
            background:
              'rgba(3,7,18,.92)',
            display: 'grid',
            placeItems: 'center',
            padding: 24
          }}
        >
          {(() => {
            const item =
              mediaViewer.items[
                mediaViewer.index
              ];

            if (!item) return null;

            return (
              <div
                onClick={event =>
                  event.stopPropagation()
                }
                style={{
                  position: 'relative',
                  maxWidth: '94vw',
                  maxHeight: '90vh'
                }}
              >
                {item.media_type === 'video' ? (
                  <video
                    src={item.signed_url}
                    controls
                    autoPlay
                    style={{
                      maxWidth: '94vw',
                      maxHeight: '86vh',
                      borderRadius: 14
                    }}
                  />
                ) : (
                  <img
                    src={item.signed_url}
                    alt="Post media"
                    style={{
                      maxWidth: '94vw',
                      maxHeight: '86vh',
                      objectFit: 'contain',
                      borderRadius: 14
                    }}
                  />
                )}

                {mediaViewer.items.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        setMediaViewer(current => ({
                          ...current,
                          index:
                            (current.index - 1 +
                              current.items.length) %
                            current.items.length
                        }))
                      }
                      style={{
                        position: 'fixed',
                        left: 20,
                        top: '50%',
                        background: '#fff'
                      }}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        setMediaViewer(current => ({
                          ...current,
                          index:
                            (current.index + 1) %
                            current.items.length
                        }))
                      }
                      style={{
                        position: 'fixed',
                        right: 20,
                        top: '50%',
                        background: '#fff'
                      }}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setMediaViewer(null)
            }
            style={{
              position: 'fixed',
              right: 20,
              top: 20,
              background: '#fff'
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}


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

        <button
          type="button"
          onClick={() =>
            setCommentsOpen(
              current => !current
            )
          }
          aria-expanded={
            commentsOpen
          }
          title={
            commentsOpen
              ? 'Hide comments'
              : comments.length > 0
                ? 'Show comments'
                : 'Write a comment'
          }
        >
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


      {commentsOpen && (
        <div
          style={{
            display: 'grid',
            gap: 8,
            marginTop: 12
          }}
        >

          {!comments.length && (
            <small
              className="muted"
              style={{
                padding: '2px 1px'
              }}
            >
              No comments yet. Start the conversation.
            </small>
          )}

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
      )}

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


function ProfileMediaGallery({
  person,
  type = 'image'
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!person?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [
        mediaResult,
        avatarResult
      ] = await Promise.all([
        supabase
          .from('post_media')
          .select(`
            id,
            post_id,
            owner_id,
            media_type,
            storage_path,
            mime_type,
            sort_order,
            created_at,
            posts!post_media_post_id_fkey (
              id,
              body,
              audience,
              created_at,
              user_id
            )
          `)
          .eq('owner_id', person.id)
          .eq('media_type', type)
          .order('created_at', {
            ascending: false
          }),

        type === 'image'
          ? supabase
              .from('profile_picture_history')
              .select(`
                id,
                user_id,
                storage_path,
                visibility,
                created_at
              `)
              .eq('user_id', person.id)
              .order('created_at', {
                ascending: false
              })
          : Promise.resolve({
              data: [],
              error: null
            })
      ]);

      if (!active) return;

      if (mediaResult.error) {
        console.error(
          'Profile media error:',
          mediaResult.error
        );
      }

      if (avatarResult.error) {
        console.error(
          'Profile picture history error:',
          avatarResult.error
        );
      }

      const postMedia = await Promise.all(
        (mediaResult.data || []).map(
          async item => {
            const { data } =
              await supabase.storage
                .from('post-media')
                .createSignedUrl(
                  item.storage_path,
                  60 * 60
                );

            return {
              ...item,
              source: 'post',
              signed_url:
                data?.signedUrl || null
            };
          }
        )
      );

      const avatars = await Promise.all(
        (avatarResult.data || []).map(
          async item => {
            const { data } =
              await supabase.storage
                .from('avatars')
                .createSignedUrl(
                  item.storage_path,
                  60 * 60
                );

            return {
              ...item,
              media_type: 'image',
              source: 'profile_picture',
              signed_url:
                data?.signedUrl || null
            };
          }
        )
      );

      if (!active) return;

      const merged = [
        ...postMedia,
        ...avatars
      ]
        .filter(item => item.signed_url)
        .sort(
          (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at)
        );

      setItems(merged);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [person?.id, type]);

  if (loading) {
    return (
      <div className="empty compact">
        Loading {type === 'video' ? 'videos' : 'photos'}…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="empty compact">
        No {type === 'video' ? 'videos' : 'photos'} to show.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill,minmax(145px,1fr))',
          gap: 8
        }}
      >
        {items.map((item, index) => (
          <button
            key={`${item.source}-${item.id}`}
            type="button"
            onClick={() =>
              setViewer({
                items,
                index
              })
            }
            style={{
              border: 0,
              padding: 0,
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              borderRadius: 12,
              background: '#0f172a',
              cursor: 'zoom-in',
              position: 'relative'
            }}
          >
            {item.media_type === 'video' ? (
              <video
                src={item.signed_url}
                muted
                preload="metadata"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <img
                src={item.signed_url}
                alt={
                  item.source ===
                  'profile_picture'
                    ? 'Profile picture'
                    : 'Photo'
                }
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}

            {item.source ===
              'profile_picture' && (
              <span
                style={{
                  position: 'absolute',
                  left: 7,
                  bottom: 7,
                  padding: '4px 7px',
                  borderRadius: 999,
                  background:
                    'rgba(15,23,42,.78)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                Profile picture
              </span>
            )}
          </button>
        ))}
      </div>

      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setViewer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30000,
            background:
              'rgba(3,7,18,.92)',
            display: 'grid',
            placeItems: 'center',
            padding: 24
          }}
        >
          {(() => {
            const item =
              viewer.items[viewer.index];

            if (!item) return null;

            return item.media_type ===
              'video' ? (
              <video
                src={item.signed_url}
                controls
                autoPlay
                onClick={event =>
                  event.stopPropagation()
                }
                style={{
                  maxWidth: '94vw',
                  maxHeight: '86vh',
                  borderRadius: 14
                }}
              />
            ) : (
              <img
                src={item.signed_url}
                alt="Media"
                onClick={event =>
                  event.stopPropagation()
                }
                style={{
                  maxWidth: '94vw',
                  maxHeight: '86vh',
                  objectFit: 'contain',
                  borderRadius: 14
                }}
              />
            );
          })()}

          {viewer.items.length > 1 && (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={event => {
                  event.stopPropagation();
                  setViewer(current => ({
                    ...current,
                    index:
                      (current.index - 1 +
                        current.items.length) %
                      current.items.length
                  }));
                }}
                style={{
                  position: 'fixed',
                  left: 20,
                  top: '50%',
                  background: '#fff'
                }}
              >
                ‹
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={event => {
                  event.stopPropagation();
                  setViewer(current => ({
                    ...current,
                    index:
                      (current.index + 1) %
                      current.items.length
                  }));
                }}
                style={{
                  position: 'fixed',
                  right: 20,
                  top: '50%',
                  background: '#fff'
                }}
              >
                ›
              </button>
            </>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={() => setViewer(null)}
            style={{
              position: 'fixed',
              right: 20,
              top: 20,
              background: '#fff'
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}


function ProfileContentTabs({
  viewer,
  person,
  connectionStatus,
  notify,
  onImageClick
}) {
  const [tab, setTab] =
    useState('timeline');

  return (
    <div
      className="card"
      style={{
        marginTop: 18
      }}
    >
      <div
        className="tabs"
        style={{
          display: 'flex',
          gap: 7,
          padding: 5,
          width: 'fit-content',
          border: '1px solid rgba(148,163,184,.22)',
          borderRadius: 13,
          background: 'linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)',
          boxShadow: '0 1px 2px rgba(15,23,42,.05), inset 0 1px 0 rgba(255,255,255,.9)'
        }}
      >
        <button
          type="button"
          className={
            tab === 'timeline'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('timeline')
          }
          style={{
            borderRadius: 9,
            border: '1px solid rgba(148,163,184,.18)',
            boxShadow: tab === 'timeline'
              ? '0 3px 8px rgba(79,70,229,.16), inset 0 1px 0 rgba(255,255,255,.7)'
              : '0 1px 2px rgba(15,23,42,.06), inset 0 1px 0 rgba(255,255,255,.9)',
            transform: tab === 'timeline' ? 'translateY(-1px)' : 'none',
            transition: 'transform .16s ease, box-shadow .16s ease'
          }}
        >
          Onstream
        </button>

        <button
          type="button"
          className={
            tab === 'photos'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('photos')
          }
          style={{
            borderRadius: 9,
            border: '1px solid rgba(148,163,184,.18)',
            boxShadow: tab === 'photos'
              ? '0 3px 8px rgba(79,70,229,.16), inset 0 1px 0 rgba(255,255,255,.7)'
              : '0 1px 2px rgba(15,23,42,.06), inset 0 1px 0 rgba(255,255,255,.9)',
            transform: tab === 'photos' ? 'translateY(-1px)' : 'none',
            transition: 'transform .16s ease, box-shadow .16s ease'
          }}
        >
          Photos
        </button>

        <button
          type="button"
          className={
            tab === 'videos'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('videos')
          }
          style={{
            borderRadius: 9,
            border: '1px solid rgba(148,163,184,.18)',
            boxShadow: tab === 'videos'
              ? '0 3px 8px rgba(79,70,229,.16), inset 0 1px 0 rgba(255,255,255,.7)'
              : '0 1px 2px rgba(15,23,42,.06), inset 0 1px 0 rgba(255,255,255,.9)',
            transform: tab === 'videos' ? 'translateY(-1px)' : 'none',
            transition: 'transform .16s ease, box-shadow .16s ease'
          }}
        >
          Videos
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === 'timeline' && (
          <ProfileTimeline
            viewer={viewer}
            person={person}
            connectionStatus={
              connectionStatus
            }
            notify={notify}
            onImageClick={
              onImageClick
            }
          />
        )}

        {tab === 'photos' && (
          <ProfileMediaGallery
            person={person}
            type="image"
          />
        )}

        {tab === 'videos' && (
          <ProfileMediaGallery
            person={person}
            type="video"
          />
        )}
      </div>
    </div>
  );
}


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
            shared_from_post_id,
            post_media (
              id,
              media_type,
              storage_path,
              mime_type,
              sort_order,
              created_at
            )
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


      const signedPosts =
        await Promise.all(
          (postsResult.data || []).map(
            async post => {
              const signedMedia =
                await Promise.all(
                  (post.post_media || [])
                    .sort(
                      (a, b) =>
                        (a.sort_order || 0) -
                        (b.sort_order || 0)
                    )
                    .map(async media => {
                      const { data } =
                        await supabase.storage
                          .from('post-media')
                          .createSignedUrl(
                            media.storage_path,
                            60 * 60
                          );

                      return {
                        ...media,
                        signed_url:
                          data?.signedUrl ||
                          null
                      };
                    })
                );

              return {
                ...post,
                post_media:
                  signedMedia
              };
            }
          )
        );


      const posts =
        signedPosts.map(
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
        Loading Onstream…
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
            ONSTREAM
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
          No Onstream items are visible to you.
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
                              : post.audience ===
                                  'only_me'
                                ? 'Only me'
                                : 'Public'
                          }
                        </small>
                      </div>

                    </div>


                    <MessageCircle
                      size={16}
                    />

                  </div>


                  {post.body && (
                    <p
                      style={{
                        whiteSpace:
                          'pre-wrap',
                        marginBottom:
                          (post.post_media || []).length
                            ? 12
                            : 0
                      }}
                    >
                      {post.body}
                    </p>
                  )}

                  {(post.post_media || [])
                    .filter(media => media.signed_url)
                    .length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          (post.post_media || []).length === 1
                            ? '1fr'
                            : 'repeat(2,minmax(0,1fr))',
                        gap: 7,
                        borderRadius: 12,
                        overflow: 'hidden'
                      }}
                    >
                      {(post.post_media || [])
                        .filter(media => media.signed_url)
                        .slice(0, 4)
                        .map(media => (
                          <div
                            key={media.id}
                            style={{
                              minHeight: 150,
                              maxHeight: 300,
                              background: '#0f172a',
                              overflow: 'hidden'
                            }}
                          >
                            {media.media_type === 'video' ? (
                              <video
                                src={media.signed_url}
                                controls
                                preload="metadata"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  minHeight: 150,
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            ) : (
                              <img
                                src={media.signed_url}
                                alt="Post photo"
                                onClick={() =>
                                  onImageClick?.(
                                    media.signed_url
                                  )
                                }
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  minHeight: 150,
                                  objectFit: 'cover',
                                  display: 'block',
                                  cursor:
                                    onImageClick
                                      ? 'zoom-in'
                                      : 'default'
                                }}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}


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
  onlineUserIds = [],
  requestedProfileId = null
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

  const [followingIds, setFollowingIds] = useState([]);

  async function loadFollowingIds() {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profile.id);
    if (error) { console.error('Follow load error:', error); return; }
    setFollowingIds((data || []).map(row => row.following_id));
  }

  async function followPerson(personId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: profile.id, following_id: personId });
    if (error) { notify(error.message); return; }
    setFollowingIds(current => Array.from(new Set([...current, personId])));
    notify('Following.');
  }

  async function unfollowPerson(personId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', profile.id)
      .eq('following_id', personId);
    if (error) { notify(error.message); return; }
    setFollowingIds(current => current.filter(id => id !== personId));
    notify('Unfollowed.');
  }

  useEffect(() => { loadFollowingIds(); }, [profile.id]);


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



  useEffect(() => {
    if (!requestedProfileId || !people.length) return;
    const found = people.find(person => person.id === requestedProfileId);
    if (found) setSelectedPerson(found);
  }, [requestedProfileId, people]);

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
          ← Back to Network
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
            marginTop: 20,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >

          <button
            type="button"
            className={followingIds.includes(person.id) ? 'btn subtle' : 'btn primary'}
            onClick={() => followingIds.includes(person.id) ? unfollowPerson(person.id) : followPerson(person.id)}
          >
            {followingIds.includes(person.id) ? 'Following ✓' : 'Follow'}
          </button>

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


        <ProfileContentTabs
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
      eyebrow={
        selectedPerson
          ? 'STUDENT PROFILE'
          : 'NETWORK'
      }
      title={
        selectedPerson
          ? `${
              selectedPerson.name ||
              'Student'
            } ${
              selectedPerson.surname ||
              ''
            }`.trim()
          : 'Students & connections'
      }

      action={
        !selectedPerson
          ? (
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
          )
          : null
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


      {!selectedPerson && (
        <>
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


        </>
      )}


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
  const messageInputRef = useRef(null);
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

  const [inboxTab, setInboxTab] =
    useState('chats');

  const [conversationMenuOpen, setConversationMenuOpen] =
    useState(false);

  const [emojiOpen, setEmojiOpen] =
    useState(false);

  const [gifOpen, setGifOpen] =
    useState(false);

  const [gifUrl, setGifUrl] =
    useState('');

  const [reportOpen, setReportOpen] =
    useState(false);

  const [reportCategory, setReportCategory] =
    useState('harassment');

  const [reportDetails, setReportDetails] =
    useState('');


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
    setConversationMenuOpen(false);
    setEmojiOpen(false);
    setGifOpen(false);
  }, [selectedConversationId]);


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
    if (!selectedConversationId || loadingMessages || !isOtherOnline) return;
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  }, [selectedConversationId, loadingMessages, isOtherOnline]);


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

    const [
      conversationsResult,
      preferencesResult,
      membershipResult,
      labelsResult
    ] = await Promise.all([
      supabase.rpc('list_my_conversations'),

      supabase
        .from('conversation_preferences')
        .select(`
          conversation_id,
          inbox_bucket,
          starred,
          archived,
          label
        `)
        .eq('user_id', profile.id),

      supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          muted
        `)
        .eq('user_id', profile.id),

      supabase
        .from('conversation_labels')
        .select(`
          conversation_id,
          label
        `)
        .eq('user_id', profile.id)
    ]);

    if (conversationsResult.error) {
      notify(
        conversationsResult.error.message
      );
      return [];
    }

    const preferenceMap =
      Object.fromEntries(
        (preferencesResult.data || [])
          .map(item => [
            item.conversation_id,
            item
          ])
      );

    const membershipMap =
      Object.fromEntries(
        (membershipResult.data || [])
          .map(item => [
            item.conversation_id,
            item
          ])
      );

    const labelsMap = {};
    for (const item of labelsResult.data || []) {
      if (!labelsMap[item.conversation_id]) {
        labelsMap[item.conversation_id] = [];
      }
      labelsMap[item.conversation_id].push(item.label);
    }

    const rows =
      (conversationsResult.data || [])
        .map(item => ({
          ...item,
          inbox_bucket:
            preferenceMap[
              item.conversation_id
            ]?.inbox_bucket ||
            'chats',
          starred:
            Boolean(
              preferenceMap[
                item.conversation_id
              ]?.starred
            ),
          archived:
            Boolean(
              preferenceMap[
                item.conversation_id
              ]?.archived
            ),
          label:
            preferenceMap[
              item.conversation_id
            ]?.label ||
            null,
          labels:
            labelsMap[
              item.conversation_id
            ] || [],
          muted:
            Boolean(
              membershipMap[
                item.conversation_id
              ]?.muted
            )
        }));

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
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
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


  async function saveConversationPreference(
    conversationId,
    patch
  ) {

    if (!conversationId) {
      return;
    }

    const current =
      conversations.find(
        item =>
          item.conversation_id ===
          conversationId
      ) || {};

    const payload = {
      conversation_id:
        conversationId,
      user_id:
        profile.id,
      inbox_bucket:
        patch.inbox_bucket ??
        current.inbox_bucket ??
        'chats',
      starred:
        patch.starred ??
        Boolean(current.starred),
      archived:
        patch.archived ??
        Boolean(current.archived),
      label:
        patch.label !== undefined
          ? patch.label
          : current.label || null,
      updated_at:
        new Date().toISOString()
    };

    const { error } =
      await supabase
        .from(
          'conversation_preferences'
        )
        .upsert(
          payload,
          {
            onConflict:
              'conversation_id,user_id'
          }
        );

    if (error) {
      notify(error.message);
      return false;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        conversationId
          ? {
              ...item,
              ...payload
            }
          : item
      )
    );

    return true;
  }


  async function toggleConversationStar() {

    if (!selectedConversation) {
      return;
    }

    const next =
      !selectedConversation.starred;

    if (
      await saveConversationPreference(
        selectedConversationId,
        {
          starred: next
        }
      )
    ) {
      notify(
        next
          ? 'Conversation starred.'
          : 'Conversation unstarred.'
      );
    }

    setConversationMenuOpen(false);
  }


  async function toggleConversationMute() {

    if (!selectedConversationId) {
      return;
    }

    const next =
      !selectedConversation?.muted;

    const { error } =
      await supabase
        .from('conversation_members')
        .update({
          muted: next
        })
        .eq(
          'conversation_id',
          selectedConversationId
        )
        .eq(
          'user_id',
          profile.id
        );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        selectedConversationId
          ? {
              ...item,
              muted: next
            }
          : item
      )
    );

    notify(
      next
        ? 'Conversation muted.'
        : 'Conversation unmuted.'
    );

    setConversationMenuOpen(false);
  }


  async function markConversationUnread() {

    if (!selectedConversationId) {
      return;
    }

    const lastAt =
      selectedConversation
        ?.last_message_at;

    const unreadFrom =
      lastAt
        ? new Date(
            new Date(
              lastAt
            ).getTime() - 1
          ).toISOString()
        : null;

    const { error } =
      await supabase
        .from('conversation_members')
        .update({
          last_read_at:
            unreadFrom
        })
        .eq(
          'conversation_id',
          selectedConversationId
        )
        .eq(
          'user_id',
          profile.id
        );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        selectedConversationId
          ? {
              ...item,
              my_last_read_at:
                unreadFrom,
              unread_count:
                Math.max(
                  1,
                  Number(
                    item.unread_count ||
                    0
                  )
                )
            }
          : item
      )
    );

    notify(
      'Conversation marked unread.'
    );

    setConversationMenuOpen(false);
  }


  async function setConversationBucket(
    bucket
  ) {

    if (
      !selectedConversationId ||
      !['chats', 'requests']
        .includes(bucket)
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'set_conversation_inbox_bucket',
        {
          p_conversation_id:
            selectedConversationId,
          p_bucket: bucket
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        selectedConversationId
          ? {
              ...item,
              inbox_bucket: bucket,
              archived: false
            }
          : item
      )
    );

    notify(
      bucket === 'requests'
        ? 'Moved to Requests.'
        : 'Moved to Chats.'
    );

    setInboxTab(bucket);
    setConversationMenuOpen(false);
  }

  async function toggleConversationLabel(
    label
  ) {

    if (!selectedConversationId) {
      return;
    }

    const currentLabels =
      selectedConversation?.labels || [];

    const enabled =
      !currentLabels.includes(label);

    const { error } =
      await supabase.rpc(
        'set_conversation_label',
        {
          p_conversation_id:
            selectedConversationId,
          p_label: label,
          p_enabled: enabled
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item => {
        if (
          item.conversation_id !==
          selectedConversationId
        ) {
          return item;
        }

        const labels =
          item.labels || [];

        return {
          ...item,
          labels: enabled
            ? [
                ...new Set([
                  ...labels,
                  label
                ])
              ]
            : labels.filter(
                itemLabel =>
                  itemLabel !== label
              )
        };
      })
    );

    notify(
      enabled
        ? `${label} label added.`
        : `${label} label removed.`
    );
  }

  function reportConversation() {
    if (
      !selectedConversationId ||
      !otherUserId
    ) {
      return;
    }

    setReportCategory(
      'harassment'
    );
    setReportDetails('');
    setReportOpen(true);
    setConversationMenuOpen(false);
  }


  async function submitConversationReport() {

    if (
      !selectedConversationId ||
      !otherUserId
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('moderation_reports')
        .insert({
          reporter_user_id:
            profile.id,
          target_type:
            'conversation',
          target_id:
            selectedConversationId,
          category:
            reportCategory,
          details:
            reportDetails.trim() ||
            `Conversation reported from ONSTOOD Messages. Reported user: ${otherUserId}.`
        });

    if (error) {
      notify(error.message);
      return;
    }

    setReportOpen(false);
    setReportDetails('');

    notify(
      'Report sent to ONSTOOD moderation.'
    );
  }


  function addEmoji(
    emoji
  ) {
    setText(current =>
      `${current}${emoji}`
    );
    setEmojiOpen(false);
    window.requestAnimationFrame(
      () =>
        messageInputRef.current
          ?.focus()
    );
  }


  async function sendGif() {

    const url =
      gifUrl.trim();

    if (
      !selectedConversationId ||
      !isOtherOnline ||
      !url
    ) {
      return;
    }

    let parsed;

    try {
      parsed =
        new URL(url);
    } catch {
      notify(
        'Paste a valid GIF URL.'
      );
      return;
    }

    if (
      parsed.protocol !== 'https:'
    ) {
      notify(
        'GIF links must use HTTPS.'
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
        body: '',
        message_type:
          'gif',
        metadata: {
          url
        }
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
    } else {
      setMessages(current => [
        ...current,
        data
      ]);
      setGifUrl('');
      setGifOpen(false);
      await loadConversations();
    }

    setSending(false);
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
    conversations
      .filter(item =>
        !item.archived &&
        item.inbox_bucket ===
          inboxTab
      )
      .filter(item => {

        const haystack =
          `
          ${item.other_name || ''}
          ${item.other_surname || ''}
          ${item.other_university || ''}
          ${item.last_message_body || ''}
          ${item.label || ''}
          `.toLowerCase();

        return haystack.includes(
          searchText
        );
      })
      .sort((a, b) => {
        if (
          Boolean(a.starred) !==
          Boolean(b.starred)
        ) {
          return a.starred
            ? -1
            : 1;
        }

        return (
          new Date(
            b.last_message_at ||
            b.updated_at ||
            0
          ) -
          new Date(
            a.last_message_at ||
            a.updated_at ||
            0
          )
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

      {!compact &&
      !selectedConversation && (
        <DirectPostsPanel
          profile={profile}
          notify={notify}
        />
      )}


      <div
        className="postoffice-layout"
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
          className="card postoffice-inbox-card"
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
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 10
            }}
          >
            <button
              type="button"
              className={
                inboxTab === 'chats'
                  ? 'btn primary'
                  : 'btn subtle'
              }
              onClick={() =>
                setInboxTab('chats')
              }
              style={{
                padding: '7px 10px'
              }}
            >
              Chats
            </button>

            <button
              type="button"
              className={
                inboxTab === 'requests'
                  ? 'btn primary'
                  : 'btn subtle'
              }
              onClick={() =>
                setInboxTab('requests')
              }
              style={{
                padding: '7px 10px'
              }}
            >
              Requests
            </button>
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
                            {item.starred
                              ? '★ '
                              : ''}
                            {item.other_name ||
                              'Student'}{' '}
                            {item.other_surname ||
                              ''}
                            {item.muted
                              ? ' · 🔕'
                              : ''}
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
                          {(item.labels || []).length
                            ? `${item.labels.join(' · ')} · `
                            : ''}
                          {item.last_message_type ===
                          'file'
                            ? '📎 Attachment'
                            : item.last_message_type ===
                                'gif'
                              ? 'GIF'
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
          className="card postoffice-conversation-card"
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
            overflow:
              compact
                ? 'visible'
                : 'hidden',
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
                    compact
                      ? '9px 10px'
                      : '16px 18px',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.08)',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: 12
                }}
              >

                <button
                  type="button"
                  className="icon-btn mobile-chat-back"
                  onClick={() => {
                    setSelectedConversationId(null);
                    onConversationResolved?.(null);
                  }}
                  title="Back to conversations"
                  aria-label="Back to conversations"
                >
                  ←
                </button>

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

                <div
                  style={{
                    marginLeft: 'auto',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setConversationMenuOpen(
                        current => !current
                      )
                    }
                    title="Conversation options"
                    aria-label="Conversation options"
                    style={{
                      fontSize: 22,
                      lineHeight: 1
                    }}
                  >
                    ⋯
                  </button>

                  {conversationMenuOpen && (
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        right:
                          compact
                            ? -2
                            : 0,
                        top: 'calc(100% + 6px)',
                        width:
                          compact
                            ? 238
                            : 230,
                        padding:
                          compact
                            ? 5
                            : 7,
                        zIndex: 12000,
                        boxShadow:
                          '0 18px 48px rgba(15,23,42,.18)',
                        maxHeight:
                          compact
                            ? 'min(430px, calc(100vh - 110px))'
                            : 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                      }}
                    >
                      {[
                        [
                          selectedConversation.starred
                            ? '☆'
                            : '★',
                          selectedConversation.starred
                            ? 'Unstar'
                            : 'Star',
                          toggleConversationStar
                        ],
                        [
                          '◌',
                          'Mark as unread',
                          markConversationUnread
                        ],
                        [
                          selectedConversation.muted
                            ? '🔔'
                            : '🔕',
                          selectedConversation.muted
                            ? 'Unmute'
                            : 'Mute',
                          toggleConversationMute
                        ]
                      ].map(
                        ([
                          icon,
                          label,
                          handler
                        ]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={handler}
                            style={{
                              width: '100%',
                              border: 0,
                              background:
                                'transparent',
                              display: 'flex',
                              alignItems:
                                'center',
                              gap: 10,
                              padding:
                                '9px 10px',
                              borderRadius: 8,
                              cursor:
                                'pointer',
                              textAlign:
                                'left'
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                textAlign:
                                  'center'
                              }}
                            >
                              {icon}
                            </span>
                            {label}
                          </button>
                        )
                      )}

                      <div
                        style={{
                          height: 1,
                          background:
                            'rgba(15,23,42,.08)',
                          margin: '5px 0'
                        }}
                      />

                      <div
                        className="muted"
                        style={{
                          padding:
                            '5px 10px 3px',
                          fontSize: 11,
                          fontWeight: 800
                        }}
                      >
                        LABEL
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 5,
                          padding: '4px 8px 7px'
                        }}
                      >
                        {[
                          'Study',
                          'Course',
                          'Career',
                          'Personal'
                        ].map(label => {
                          const active =
                            (selectedConversation.labels || [])
                              .includes(label);

                          return (
                            <button
                              key={label}
                              type="button"
                              className={
                                active
                                  ? 'btn primary'
                                  : 'btn subtle'
                              }
                              onClick={() =>
                                toggleConversationLabel(
                                  label
                                )
                              }
                              style={{
                                padding:
                                  '5px 7px',
                                fontSize: 11
                              }}
                              title={
                                active
                                  ? `Remove ${label} label`
                                  : `Add ${label} label`
                              }
                            >
                              {active
                                ? `✓ ${label}`
                                : label}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={
                          reportConversation
                        }
                        style={{
                          width: '100%',
                          border: 0,
                          background:
                            'transparent',
                          padding:
                            '9px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        ⚑ Report conversation
                      </button>

                      <button
                        type="button"
                        onClick={
                          deleteConversationForMe
                        }
                        style={{
                          width: '100%',
                          border: 0,
                          background:
                            'transparent',
                          color: '#b42318',
                          padding:
                            '9px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        🗑 Delete conversation
                      </button>
                    </div>
                  )}
                </div>

              </div>


              {/* MESSAGES */}

              <div
                className="postoffice-message-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY:
                    'auto',
                  overflowX:
                    'hidden',
                  padding:
                    compact
                      ? 10
                      : 18,
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
                              compact
                                ? 6
                                : 10
                          }}
                        >

                          <div
                            style={{
                              maxWidth:
                                compact
                                  ? '86%'
                                  : 'min(78%, 650px)',
                              padding:
                                compact
                                  ? '8px 10px'
                                  : '10px 12px',
                              borderRadius:
                                compact
                                  ? 11
                                  : 14,
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

                            ) : message.message_type ===
                              'gif' &&
                              message.metadata?.url ? (

                              <div>
                                <img
                                  src={
                                    message.metadata.url
                                  }
                                  alt="GIF"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  style={{
                                    display: 'block',
                                    maxWidth: 280,
                                    maxHeight: 280,
                                    borderRadius: 12,
                                    objectFit: 'cover'
                                  }}
                                />
                              </div>

                            ) : message.message_type ===
                              'post' ? (

                              <div
                                style={{
                                  border:
                                    '1px solid rgba(79,70,229,.18)',
                                  background:
                                    'linear-gradient(180deg,rgba(99,102,241,.07),rgba(255,255,255,.9))',
                                  borderRadius: 12,
                                  padding: 11,
                                  minWidth: 220
                                }}
                              >
                                <small
                                  style={{
                                    fontWeight: 800,
                                    color: '#5b50e6'
                                  }}
                                >
                                  ↗ ONSTOOD post
                                </small>

                                <div
                                  style={{
                                    marginTop: 5,
                                    whiteSpace:
                                      'pre-wrap',
                                    overflowWrap:
                                      'anywhere'
                                  }}
                                >
                                  {message.body}
                                </div>

                                <small
                                  className="muted"
                                  style={{
                                    display: 'block',
                                    marginTop: 7
                                  }}
                                >
                                  Shared inside ONSTOOD
                                </small>
                              </div>

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
                className="postoffice-composer"
                onSubmit={
                  sendMessage
                }
                style={{
                  padding:
                    compact
                      ? 6
                      : 14,
                  borderTop:
                    '1px solid rgba(0,0,0,0.08)',
                  display:
                    'grid',
                  gridTemplateColumns:
                    compact
                      ? '28px 28px 28px 32px minmax(0,1fr) 32px'
                      : 'auto auto auto auto minmax(0,1fr) auto',
                  gap:
                    compact
                      ? 4
                      : 10,
                  alignItems:
                    'center',
                  flex: '0 0 auto',
                  minWidth: 0,
                  overflow: 'visible'
                }}
              >

                <label
                  className="icon-btn"
                  title="Photo or video"
                  style={{
                    cursor:
                      uploading ||
                      !isOtherOnline
                        ? 'default'
                        : 'pointer',
                    flexShrink: 0
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize:
                        compact
                          ? 14
                          : 17
                    }}
                  >
                    🖼️
                  </span>

                  <input
                    type="file"
                    accept="image/*,video/*"
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


                <label
                  className="icon-btn"
                  title="Attach document"
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


                <div
                  style={{
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    title="Emoji"
                    disabled={!isOtherOnline}
                    onClick={() => {
                      setEmojiOpen(
                        current => !current
                      );
                      setGifOpen(false);
                    }}
                    style={{
                      fontSize:
                        compact
                          ? 15
                          : 18
                    }}
                  >
                    🙂
                  </button>

                  {emojiOpen && (
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        bottom:
                          'calc(100% + 8px)',
                        left: 0,
                        zIndex: 12020,
                        width: compact ? 196 : 210,
                        padding: compact ? 5 : 8,
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(6,1fr)',
                        gap: 4,
                        boxShadow:
                          '0 14px 36px rgba(15,23,42,.18)'
                      }}
                    >
                      {[
                        '😀','😂','😍','🥳',
                        '😎','🤔','😊','🙏',
                        '👍','👏','🔥','❤️',
                        '📚','🎓','💡','✅',
                        '😅','😭','😮','😉',
                        '🤝','💪','✨','🚀'
                      ].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            addEmoji(emoji)
                          }
                          style={{
                            border: 0,
                            background:
                              'transparent',
                            fontSize: compact ? 18 : 20,
                            cursor:
                              'pointer',
                            padding: compact ? 2 : 4,
                            borderRadius: 7
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>


                <div
                  style={{
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    title="Send GIF"
                    disabled={!isOtherOnline}
                    onClick={() => {
                      setGifOpen(
                        current => !current
                      );
                      setEmojiOpen(false);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 900
                    }}
                  >
                    GIF
                  </button>

                  {gifOpen && (
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        bottom:
                          'calc(100% + 8px)',
                        left: 0,
                        zIndex: 12020,
                        width: compact ? 250 : 300,
                        padding: compact ? 7 : 10,
                        boxShadow:
                          '0 14px 36px rgba(15,23,42,.18)'
                      }}
                    >
                      <small
                        className="muted"
                        style={{
                          display: 'block',
                          marginBottom: 6
                        }}
                      >
                        Paste an HTTPS GIF link
                      </small>

                      <div
                        style={{
                          display: 'flex',
                          gap: 6
                        }}
                      >
                        <input
                          value={gifUrl}
                          onChange={event =>
                            setGifUrl(
                              event.target.value
                            )
                          }
                          placeholder="https://…gif"
                          style={{
                            flex: 1,
                            margin: 0
                          }}
                        />

                        <button
                          type="button"
                          className="btn primary"
                          disabled={
                            !gifUrl.trim() ||
                            sending
                          }
                          onClick={sendGif}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>


                <input
                  ref={messageInputRef}
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
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                    height:
                      compact
                        ? 36
                        : undefined
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
                </button>

              </form>

            </>

          )}

        </div>

      </div>

      {reportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setReportOpen(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30050,
            background:
              'rgba(15,23,42,.42)',
            display: 'grid',
            placeItems: 'center',
            padding: 16
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(390px,92vw)',
              padding: 16
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 10
              }}
            >
              <div>
                <b>
                  Report conversation
                </b>
                <div
                  className="muted"
                  style={{
                    fontSize: 12,
                    marginTop: 2
                  }}
                >
                  Send this conversation to ONSTOOD moderation.
                </div>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setReportOpen(false)
                }
              >
                <X size={16} />
              </button>
            </div>

            <label
              style={{
                display: 'block',
                marginTop: 14
              }}
            >
              Reason

              <select
                value={
                  reportCategory
                }
                onChange={event =>
                  setReportCategory(
                    event.target.value
                  )
                }
                style={{
                  width: '100%',
                  marginTop: 6
                }}
              >
                <option value="harassment">
                  Harassment
                </option>
                <option value="spam">
                  Spam
                </option>
                <option value="hate">
                  Hate or abusive content
                </option>
                <option value="scam">
                  Scam or fraud
                </option>
                <option value="other">
                  Other
                </option>
              </select>
            </label>

            <label
              style={{
                display: 'block',
                marginTop: 12
              }}
            >
              Details (optional)

              <textarea
                value={
                  reportDetails
                }
                onChange={event =>
                  setReportDetails(
                    event.target.value
                  )
                }
                placeholder="Tell us briefly what happened…"
                maxLength={1000}
                style={{
                  width: '100%',
                  minHeight: 90,
                  marginTop: 6
                }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 8,
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setReportOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={
                  submitConversationReport
                }
              >
                Send report
              </button>
            </div>
          </div>
        </div>
      )}


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
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadVisibility, setUploadVisibility] = useState('');
  const fileInputRef = useRef(null);


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


  function chooseDocument(event) {

    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 25 * 1024 * 1024;

    if (file.size > maxSize) {
      notify('Document must be smaller than 25 MB.');
      input.value = '';
      return;
    }

    // Do not upload yet. The user must explicitly choose visibility first.
    setPendingFile(file);
    setUploadVisibility('');
  }


  function cancelPendingUpload() {
    setPendingFile(null);
    setUploadVisibility('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }


  async function upload() {

    const file = pendingFile;

    if (!file || !uploadVisibility) {
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
          user_id: profile.id,
          file_name: file.name || 'Document',
          storage_path: uploadedPath,
          mime_type:
            file.type ||
            'application/octet-stream',
          visibility: uploadVisibility
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

      notify('Document uploaded.');
      cancelPendingUpload();

    } catch (error) {

      console.error(
        'Document upload error:',
        error
      );

      if (uploadedPath) {
        await supabase
          .storage
          .from('student-documents')
          .remove([uploadedPath]);
      }

      notify(
        error?.message ||
        'Could not upload document.'
      );

    } finally {
      setBusy(false);
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
        'onstood_ai'
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
      visibility === 'onstood_ai'
        ? 'Document is now available to your connections and ONSTOOD AI.'
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
            ref={fileInputRef}
            type="file"
            onChange={chooseDocument}
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
          connections, or make selected materials
          available to your connections and ONSTOOD AI.
        </p>

      </div>


      {pendingFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(15,23,42,0.48)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
          onMouseDown={event => {
            if (event.target === event.currentTarget && !busy) {
              cancelPendingUpload();
            }
          }}
        >
          <div
            className="card"
            style={{
              width: 'min(520px, 100%)',
              padding: 22,
              boxShadow: '0 24px 70px rgba(15,23,42,0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <small className="muted">DOCUMENT PRIVACY</small>
                <h3 style={{ margin: '5px 0 6px' }}>Who can use this document?</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Choose one option before upload. Nothing is uploaded until you confirm.
                </p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={cancelPendingUpload}
                disabled={busy}
                title="Cancel upload"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#f8fafc',
                overflowWrap: 'anywhere'
              }}
            >
              <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              <b>{pendingFile.name}</b>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {[
                ['private', 'Private', 'Only you can access this document.'],
                ['connections', 'Connections', 'Your accepted connections can access it.'],
                ['onstood_ai', 'ONSTOOD AI', 'Your connections can access it, and ONSTOOD AI may use it as a knowledge source when relevant.']
              ].map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUploadVisibility(value)}
                  disabled={busy}
                  style={{
                    border: uploadVisibility === value
                      ? '2px solid #6558ff'
                      : '1px solid #e2e8f0',
                    background: uploadVisibility === value
                      ? '#f5f3ff'
                      : '#fff',
                    borderRadius: 14,
                    padding: '13px 14px',
                    textAlign: 'left',
                    cursor: busy ? 'default' : 'pointer'
                  }}
                >
                  <b>{title}</b>
                  <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                    {description}
                  </small>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn subtle"
                onClick={cancelPendingUpload}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={upload}
                disabled={busy || !uploadVisibility}
                style={{
                  opacity: busy || !uploadVisibility ? 0.55 : 1,
                  cursor: busy || !uploadVisibility ? 'not-allowed' : 'pointer'
                }}
              >
                <Upload size={16} />
                {busy ? 'Uploading…' : 'Confirm & upload'}
              </button>
            </div>
          </div>
        </div>
      )}


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

                    <option value="onstood_ai">
                      ONSTOOD AI
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


function SocialLayerPanel({ profile, viewingProfile, followingIds = [], onFollow, onUnfollow }) {
  const target = viewingProfile || profile;
  const own = target?.id === profile?.id;
  const following = followingIds.includes(target?.id);
  const [privacy, setPrivacy] = useState(target?.follow_privacy || 'everyone');
  const [albums, setAlbums] = useState([]);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumVisibility, setAlbumVisibility] = useState('');

  useEffect(() => {
    if (!target?.id) return;
    supabase.from('photo_albums').select('*').eq('owner_id', target.id).order('created_at',{ascending:false})
      .then(({data}) => setAlbums(data || []));
  }, [target?.id]);

  async function saveFollowPrivacy(value) {
    setPrivacy(value);
    await supabase.from('profiles').update({ follow_privacy: value }).eq('id', profile.id);
  }

  async function createAlbum() {
    if (!albumTitle.trim() || !albumVisibility) return;
    const { data, error } = await supabase.from('photo_albums').insert({
      owner_id: profile.id, title: albumTitle.trim(), visibility: albumVisibility
    }).select().single();
    if (!error && data) { setAlbums(v => [data,...v]); setAlbumTitle(''); setAlbumVisibility(''); }
  }

  return <div className="card" style={{marginTop:16}}>
    <div className="card-head"><div><h3>Photos & social</h3><small className="muted">Posts, follow and Onstream controls.</small></div><Users size={18}/></div>
    {!own && <div className="row" style={{marginBottom:14}}>
      <button className={following ? 'btn subtle' : 'btn primary'} onClick={() => following ? onUnfollow?.(target.id) : onFollow?.(target.id)}>
        {following ? 'Following' : 'Follow'}
      </button>
    </div>}
    {own && <div className="field" style={{marginBottom:14}}>
      <label>Who can follow me?</label>
      <select value={privacy} onChange={e=>saveFollowPrivacy(e.target.value)}>
        <option value="everyone">Everyone</option>
        <option value="friends_of_connections">Friends of connections</option>
        <option value="connections">Connections only</option>
      </select>
    </div>}
    {own && <div style={{padding:'12px 0',borderTop:'1px solid var(--line)'}}>
      <b>Create photo album</b>
      <div className="row" style={{gap:8,marginTop:8,flexWrap:'wrap'}}>
        <input value={albumTitle} onChange={e=>setAlbumTitle(e.target.value)} placeholder="Album name" />
        <select value={albumVisibility} onChange={e=>setAlbumVisibility(e.target.value)}>
          <option value="">Choose privacy…</option>
          <option value="only_me">Only me</option>
          <option value="connections">Connections</option>
          <option value="public">Public</option>
        </select>
        <button className="btn primary" disabled={!albumTitle.trim() || !albumVisibility} onClick={createAlbum}>Create album</button>
      </div>
      <small className="muted">No album can be created without an explicit privacy choice. Privacy can be changed later.</small>
    </div>}
    <div style={{paddingTop:12,borderTop:'1px solid var(--line)'}}>
      <b>Albums</b>
      {albums.length===0 ? <p className="muted">No albums yet.</p> :
        <div className="chips" style={{marginTop:8}}>{albums.map(a=><span className="chip" key={a.id}>{a.title} · {a.visibility.replaceAll('_',' ')}</span>)}</div>}
    </div>
  </div>;
}

function AI({
  profile,
  externalAsk = null,
  onExternalAskConsumed = null,
  onUsageChanged = null
}) {
  const [plan, setPlan] = useState({ plan_code: 'free', standard_limit: 5, advanced_limit: 0, monthly_price_eur: 0 });
  const [aiInsights, setAiInsights] = useState([]);
  const [insightBusy, setInsightBusy] = useState(false);

  async function loadAiInsights() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('ai_insights')
      .select('id,title,teaser,action_prompt,status,advanced_required,created_at')
      .eq('user_id', profile.id)
      .in('status', ['new','seen'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setAiInsights(data);
  }

  async function dismissInsight(id) {
    await supabase.from('ai_insights').update({ status: 'dismissed', acted_at: new Date().toISOString() }).eq('id', id);
    setAiInsights(current => current.filter(x => x.id !== id));
  }

  async function acceptInsight(insight) {
    if (!isPro) {
      setMessages(current => [...current, {
        id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced',
        content: 'I found this proactively, but the full analysis uses Advanced AI and is available with ONSTOOD PRO.'
      }]);
      focusInput();
      return;
    }
    if (advancedLeft <= 0) {
      setMessages(current => [...current, {
        id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced',
        content: 'Your Advanced AI allowance is finished. It refreshes at 12:00 PM.'
      }]);
      focusInput();
      return;
    }
    await supabase.from('ai_insights').update({ status: 'accepted', acted_at: new Date().toISOString() }).eq('id', insight.id);
    setAiInsights(current => current.filter(x => x.id !== insight.id));
    setDraft(insight.action_prompt || `Analyze this study insight in depth: ${insight.title}. ${insight.teaser}`);
    setMode('advanced');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const lastExternalAskRef = useRef(null);

  const [planLoaded, setPlanLoaded] =
    useState(false);

  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState({ standard_count: 0, advanced_count: 0 });
  const [historySearch, setHistorySearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const standardLeft = Math.max(0, Number(plan.standard_limit || 0) - Number(usage.standard_count || 0));
  const advancedLeft = Math.max(0, Number(plan.advanced_limit || 0) - Number(usage.advanced_count || 0));
  const isPro = plan.plan_code === 'pro';

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function scrollChat() {
    window.requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }

  function renderAiText(value) {
    const parts = String(value || '').split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }

  async function loadUsage() {
    const { data, error } = await supabase.rpc('get_ai_usage');
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      setUsage({ standard_count: Number(row?.standard_used || 0), advanced_count: Number(row?.advanced_used || 0) });
      setPlan({ plan_code: row?.plan_code || 'free', standard_limit: Number(row?.standard_limit ?? 5), advanced_limit: Number(row?.advanced_limit ?? 0), monthly_price_eur: Number(row?.monthly_price_eur ?? 0) });
      setPlanLoaded(true);
      onUsageChanged?.();
    } else {
      setPlanLoaded(true);
    }
  }

  async function loadConversations(preferredId = null) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id,title,created_at,updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });

    if (error) return;
    const rows = data || [];
    setConversations(rows);
    const nextId = preferredId || conversationId || rows[0]?.id || null;
    if (nextId) setConversationId(nextId);
  }

  async function loadMessages(id) {
    if (!id) {
      setMessages([]);
      focusInput();
      return;
    }
    const { data, error } = await supabase
      .from('ai_messages')
      .select('id,role,mode,content,created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
    focusInput();
    scrollChat();
  }

  async function loadSuggestions() {
    const [docsResult, eventsResult, postsResult] = await Promise.all([
      supabase.from('documents').select('id,file_name,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('calendar_events').select('id,title,starts_at,location').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(6),
      supabase.from('posts').select('id,body,created_at').order('created_at', { ascending: false }).limit(6)
    ]);

    const items = [];
    (eventsResult.data || []).forEach(item => items.push({ id: item.id, sourceType: 'calendar_event', kind: 'Upcoming', title: item.title, context: [item.title, item.location].filter(Boolean).join(' — '), meta: item.location || new Date(item.starts_at).toLocaleString() }));
    (docsResult.data || []).forEach(item => items.push({ id: item.id, sourceType: 'document', kind: 'Document', title: item.file_name, context: item.file_name, meta: 'Available in ONSTOOD' }));
    (postsResult.data || []).filter(item => item.body?.trim()).forEach(item => items.push({ id: item.id, sourceType: 'post', kind: 'From your network', title: item.body.trim().slice(0, 90), context: item.body.trim(), meta: 'Shared on ONSTOOD' }));
    setSuggestions(items.slice(0, 12));
  }

  useEffect(() => {
    if (!profile?.id) return;
    loadUsage();
    loadConversations();
    loadSuggestions();
    focusInput();
  }, [profile?.id]);

  useEffect(() => {
    loadMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (suggestions.length <= 1) return;
    const timer = window.setInterval(() => {
      setSuggestionIndex(current => (current + 1) % suggestions.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  async function ensureConversation(question) {
    if (conversationId) return conversationId;
    const title = question.trim().slice(0, 52) || 'ONSTOOD AI';
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: profile.id, title })
      .select('id')
      .single();
    if (error) throw error;
    setConversationId(data.id);
    await loadConversations(data.id);
    return data.id;
  }

  async function refundQuestion(questionMode) {
    try { await supabase.rpc('refund_ai_question', { p_mode: questionMode }); } catch {}
  }

  async function send(event, forcedMode = 'standard', forcedQuestion = null) {
    event?.preventDefault?.();
    const question = String(forcedQuestion ?? text).trim();
    if (!question || busy) return;
    const questionMode = forcedMode === 'advanced' ? 'advanced' : 'standard';

    if (questionMode === 'standard' && standardLeft <= 0) {
      setMessages(current => [...current, { id: `local-${Date.now()}`, role: 'assistant', mode: 'standard', content: 'Your 5 free Ask AI questions are finished. They refresh at 12:00 PM.' }]);
      focusInput(); return;
    }
    if (questionMode === 'advanced' && !isPro) {
      setMessages(current => [...current, { id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced', content: 'Advanced AI is available with ONSTOOD PRO. PRO is planned at €8.99/month.' }]);
      focusInput(); return;
    }
    if (questionMode === 'advanced' && advancedLeft <= 0) {
      setMessages(current => [...current, { id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced', content: 'Your Advanced AI allowance is finished. It refreshes at 12:00 PM.' }]);
      focusInput(); return;
    }

    setBusy(true);
    setText('');
    let activeId = null;

    try {
      activeId = await ensureConversation(question);
      const { data: quotaData, error: quotaError } = await supabase.rpc('consume_ai_question', { p_mode: questionMode });
      const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData;
      if (quotaError || !quota?.allowed) throw new Error('Daily AI allowance reached. Refreshes at 12:00 PM.');

      setUsage({ standard_count: Number(quota.standard_used || 0), advanced_count: Number(quota.advanced_used || 0) });
      setPlan(current => ({ ...current, plan_code: quota.plan_code || current.plan_code, standard_limit: Number(quota.standard_limit ?? current.standard_limit), advanced_limit: Number(quota.advanced_limit ?? current.advanced_limit) }));
      onUsageChanged?.();

      const userMessage = { conversation_id: activeId, user_id: profile.id, role: 'user', mode: questionMode, content: question };
      const { data: savedUser, error: saveUserError } = await supabase.from('ai_messages').insert(userMessage).select('id,role,mode,content,created_at').single();
      if (saveUserError) throw saveUserError;
      setMessages(current => [...current, savedUser]);
      scrollChat();

      const { data, error } = await supabase.functions.invoke('onstood-ai', { body: { message: question, mode: questionMode } });
      if (error || !data?.answer) {
        await refundQuestion(questionMode);
        await loadUsage();
        throw new Error(data?.error || error?.message || 'ONSTOOD AI is temporarily unavailable. Your AI question was refunded.');
      }

      const { data: savedAi, error: saveAiError } = await supabase.from('ai_messages').insert({ conversation_id: activeId, user_id: profile.id, role: 'assistant', mode: questionMode, content: data.answer }).select('id,role,mode,content,created_at').single();
      if (saveAiError) throw saveAiError;
      setMessages(current => [...current, savedAi]);
      await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeId);
      await loadConversations(activeId);
    } catch (error) {
      setMessages(current => [...current, { id: `error-${Date.now()}`, role: 'assistant', mode: questionMode, content: error.message || 'Something went wrong.' }]);
    } finally {
      setBusy(false);
      focusInput();
      scrollChat();
    }
  }

  useEffect(() => {
    if (
      !externalAsk?.id ||
      !planLoaded ||
      busy ||
      lastExternalAskRef.current ===
        externalAsk.id
    ) {
      return;
    }

    lastExternalAskRef.current =
      externalAsk.id;

    const selectedText =
      String(
        externalAsk.text || ''
      ).trim();

    if (!selectedText) {
      onExternalAskConsumed?.();
      return;
    }

    const question =
      `${selectedText}\n\nHelp me understand this selected text clearly.`;

    setText(question);

    send(
      null,
      externalAsk.mode ===
        'advanced'
        ? 'advanced'
        : 'standard',
      question
    );

    onExternalAskConsumed?.();

  }, [
    externalAsk?.id,
    planLoaded,
    busy
  ]);


  function buildSuggestionQuestion(item) {
    if (!item) return '';
    const source = String(item.context || item.title || '').trim();
    if (!source) return '';
    return `Explain this ONSTOOD material and help me understand it:\n\n${source}`;
  }

  function chooseSuggestion(item) {
    setSelectedSuggestion(item);
  }

  function askSelectedSuggestion(
    event,
    mode = 'standard'
  ) {
    event?.preventDefault?.();

    if (!selectedSuggestion || busy) {
      return;
    }

    const question =
      buildSuggestionQuestion(
        selectedSuggestion
      );

    if (!question) {
      return;
    }

    setText(question);

    send(
      event,
      mode === 'advanced'
        ? 'advanced'
        : 'standard',
      question
    );

    setSelectedSuggestion(null);
  }



  const filteredHistory = conversations.filter(item => (item.title || '').toLowerCase().includes(historySearch.toLowerCase()));
  const activeSuggestion = suggestions.length ? suggestions[suggestionIndex % suggestions.length] : null;

  return (
    <Page eyebrow="INTELLIGENCE LAYER" title="ONSTOOD AI">
      <style>{`
        .onstood-advanced-chip{
          width:190px; min-width:190px; min-height:48px; padding:0 14px;
          border-radius:14px; border:1px solid rgba(99,102,241,.30);
          background:
            radial-gradient(circle at 72% 50%,rgba(79,70,229,.24),transparent 34%),
            linear-gradient(135deg,rgba(8,15,35,.97),rgba(25,35,74,.96));
          color:#fff; position:relative; overflow:hidden; cursor:pointer;
          box-shadow:inset 0 0 20px rgba(96,165,250,.05),0 5px 18px rgba(30,41,59,.12);
          isolation:isolate;
        }
        .onstood-advanced-chip:disabled{opacity:.44;cursor:default}
        .onstood-chip-label{
          position:relative;z-index:5;display:flex;align-items:center;justify-content:center;
          gap:8px;white-space:nowrap;text-shadow:0 1px 7px rgba(0,0,0,.78);
        }
        .onstood-chip-title{
          font-size:11px;font-weight:750;letter-spacing:.9px;line-height:1;
        }
        .onstood-chip-count{
          min-width:27px;padding:3px 6px;border-radius:999px;
          border:1px solid rgba(191,219,254,.22);
          background:rgba(255,255,255,.055);
          font-size:9px;font-weight:800;letter-spacing:.2px;line-height:1;
          color:rgba(239,246,255,.92);
          box-shadow:inset 0 0 8px rgba(96,165,250,.05);
        }
        .onstood-chip-core{
          position:absolute;right:17px;top:11px;width:27px;height:27px;border-radius:5px;
          border:1px solid rgba(147,197,253,.20);
          background:linear-gradient(145deg,rgba(5,12,27,.46),rgba(30,64,175,.12));
          box-shadow:0 0 10px rgba(96,165,250,.08);opacity:.40;z-index:1;
        }
        .onstood-chip-core:before,.onstood-chip-core:after{
          content:"";position:absolute;inset:5px;border:1px solid rgba(147,197,253,.22);border-radius:2px;
        }
        .onstood-chip-core i{position:absolute;width:2px;height:4px;background:rgba(147,197,253,.25)}
        .onstood-chip-core i:nth-child(1){left:-4px;top:5px}.onstood-chip-core i:nth-child(2){left:-4px;bottom:5px}
        .onstood-chip-core i:nth-child(3){right:-4px;top:5px}.onstood-chip-core i:nth-child(4){right:-4px;bottom:5px}
        .onstood-chip-core i:nth-child(5){top:-4px;left:12px;width:4px;height:2px}.onstood-chip-core i:nth-child(6){bottom:-4px;left:12px;width:4px;height:2px}
        .onstood-chip-circuit{position:absolute;height:1px;background:rgba(96,165,250,.16);z-index:0}
        .onstood-chip-circuit:after{content:"";position:absolute;right:-4px;top:-2px;width:5px;height:5px;border:1px solid rgba(147,197,253,.18);border-radius:50%}
        .onstood-chip-circuit-a{width:72px;right:43px;top:15px;transform:rotate(-7deg)}
        .onstood-chip-circuit-b{width:82px;right:43px;top:24px}
        .onstood-chip-circuit-c{width:68px;right:43px;top:34px;transform:rotate(7deg)}
        .onstood-chip-circuit-d{width:42px;right:7px;top:24px}
        .onstood-chip-packet{
          position:absolute;width:13px;height:2px;border-radius:999px;
          background:rgba(191,219,254,.96);box-shadow:0 0 5px rgba(96,165,250,.95),0 0 10px rgba(99,102,241,.65);
          z-index:2;opacity:0;
        }
        .packet-a{top:14px;right:108px;animation:onstoodDataA 1.93s linear infinite}
        .packet-b{top:23px;right:119px;animation:onstoodDataB 2.4s linear .55s infinite}
        .packet-c{top:33px;right:106px;animation:onstoodDataC 2.13s linear 1.1s infinite}
        @keyframes onstoodDataA{0%{transform:translateX(-18px) rotate(-7deg);opacity:0}12%{opacity:.9}78%{opacity:.9}100%{transform:translateX(68px) rotate(-7deg);opacity:0}}
        @keyframes onstoodDataB{0%{transform:translateX(-10px);opacity:0}12%{opacity:.9}78%{opacity:.9}100%{transform:translateX(82px);opacity:0}}
        @keyframes onstoodDataC{0%{transform:translateX(-14px) rotate(7deg);opacity:0}12%{opacity:.85}78%{opacity:.85}100%{transform:translateX(66px) rotate(7deg);opacity:0}}
        .onstood-advanced-chip:not(:disabled):hover{
          border-color:rgba(129,140,248,.56);box-shadow:inset 0 0 24px rgba(96,165,250,.09),0 0 18px rgba(99,102,241,.16)
        }
        .onstood-advanced-chip:not(:disabled):hover .onstood-chip-core{opacity:.58}
        .onstood-advanced-chip:not(:disabled):active .onstood-chip-core{box-shadow:0 0 18px rgba(96,165,250,.35);opacity:.75}

        .onstood-standard-chip{
          width:50px;min-width:50px;min-height:48px;border-radius:14px;
          border:1px solid rgba(99,102,241,.22);
          background:linear-gradient(145deg,rgba(31,41,74,.96),rgba(49,46,129,.88));
          color:white;position:relative;overflow:hidden;cursor:pointer;
          display:grid;place-items:center;isolation:isolate;
          box-shadow:inset 0 0 14px rgba(96,165,250,.05),0 4px 12px rgba(30,41,59,.10);
        }
        .onstood-standard-chip:disabled{opacity:.45;cursor:default}
        .onstood-standard-chip svg{position:relative;z-index:5}
        .onstood-standard-core{
          position:absolute;width:18px;height:18px;border-radius:4px;
          border:1px solid rgba(191,219,254,.18);
          background:rgba(15,23,42,.26);opacity:.38;z-index:1;
          box-shadow:0 0 8px rgba(96,165,250,.08);
        }
        .onstood-standard-track{
          position:absolute;height:1px;width:43px;background:rgba(147,197,253,.14);z-index:0;
        }
        .track-a{left:3px;top:16px;transform:rotate(12deg)}
        .track-b{left:3px;bottom:15px;transform:rotate(-12deg)}
        .onstood-standard-packet{
          position:absolute;width:9px;height:2px;border-radius:999px;
          background:rgba(219,234,254,.94);
          box-shadow:0 0 5px rgba(96,165,250,.82),0 0 8px rgba(99,102,241,.48);
          z-index:2;opacity:0;
        }
        .standard-packet-a{left:2px;top:15px;animation:onstoodStandardA 3.3s linear infinite}
        .standard-packet-b{right:2px;bottom:14px;animation:onstoodStandardB 3.7s linear 1.25s infinite}
        @keyframes onstoodStandardA{
          0%{transform:translateX(-8px) rotate(12deg);opacity:0}
          15%{opacity:.82}78%{opacity:.82}
          100%{transform:translateX(39px) rotate(12deg);opacity:0}
        }
        @keyframes onstoodStandardB{
          0%{transform:translateX(8px) rotate(-12deg);opacity:0}
          15%{opacity:.78}78%{opacity:.78}
          100%{transform:translateX(-39px) rotate(-12deg);opacity:0}
        }
        .onstood-standard-chip:not(:disabled):hover{
          border-color:rgba(129,140,248,.48);
          box-shadow:inset 0 0 18px rgba(96,165,250,.08),0 0 14px rgba(99,102,241,.12);
        }
        @media(max-width:850px){.onstood-advanced-chip{width:154px;min-width:154px}.onstood-chip-title{font-size:9.5px;letter-spacing:.55px}.onstood-chip-label{gap:5px}.onstood-chip-count{padding:3px 5px}}

        .onstood-ai-selection-toolbar{
          position:fixed;z-index:60000;display:flex;align-items:center;gap:6px;
          padding:6px;border-radius:14px;border:1px solid rgba(99,102,241,.20);
          background:rgba(255,255,255,.97);backdrop-filter:blur(14px);
          box-shadow:0 14px 38px rgba(15,23,42,.20);
        }
        .onstood-ai-selection-copy{
          width:34px;height:34px;border-radius:10px;border:1px solid rgba(148,163,184,.25);
          background:#fff;cursor:pointer;display:grid;place-items:center;color:#475569;
        }
        .onstood-ai-selection-chip{
          min-height:34px;padding:0 10px;border-radius:10px;position:relative;overflow:hidden;
          border:1px solid rgba(99,102,241,.30);cursor:pointer;isolation:isolate;
          display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:850;letter-spacing:.45px;
          white-space:nowrap;
        }
        .onstood-ai-selection-chip.standard{
          color:#eef2ff;background:linear-gradient(145deg,rgba(31,41,74,.98),rgba(67,56,202,.93));
          box-shadow:inset 0 0 14px rgba(96,165,250,.07),0 0 13px rgba(99,102,241,.18);
        }
        .onstood-ai-selection-chip.advanced{
          color:#fff;background:radial-gradient(circle at 80% 50%,rgba(96,165,250,.22),transparent 28%),linear-gradient(135deg,#071126,#1d2853);
          box-shadow:inset 0 0 18px rgba(96,165,250,.08),0 0 17px rgba(99,102,241,.22);
        }
        .onstood-ai-selection-chip:disabled{opacity:.38;cursor:default;box-shadow:none}
        .onstood-ai-selection-chip:not(:disabled):hover{transform:translateY(-1px);box-shadow:inset 0 0 20px rgba(96,165,250,.12),0 0 22px rgba(99,102,241,.28)}
        .onstood-ai-selection-led{
          width:8px;height:8px;border-radius:50%;background:#93c5fd;
          box-shadow:0 0 5px #60a5fa,0 0 11px rgba(99,102,241,.95);
          animation:onstoodSelectionLed 1.7s ease-in-out infinite;position:relative;z-index:2;
        }
        .onstood-ai-selection-chip:disabled .onstood-ai-selection-led{background:#64748b;box-shadow:none;animation:none}
        .onstood-ai-selection-flow{
          position:absolute;left:-18px;bottom:5px;width:18px;height:1px;border-radius:99px;
          background:#bfdbfe;box-shadow:0 0 6px #60a5fa;opacity:0;
          animation:onstoodSelectionFlow 2.2s linear infinite;z-index:1;
        }
        .onstood-ai-selection-chip.advanced .onstood-ai-selection-flow{animation-duration:1.55s}
        .onstood-ai-selection-chip:disabled .onstood-ai-selection-flow{display:none}
        @keyframes onstoodSelectionLed{0%,100%{opacity:.52}50%{opacity:1}}
        @keyframes onstoodSelectionFlow{0%{transform:translateX(0);opacity:0}18%{opacity:.9}78%{opacity:.9}100%{transform:translateX(150px);opacity:0}}
        @media(max-width:720px){
          .onstood-ai-selection-toolbar{max-width:calc(100vw - 16px);gap:4px;padding:5px}
          .onstood-ai-selection-chip{padding:0 7px;font-size:9px;letter-spacing:.2px}
          .onstood-ai-selection-copy{width:30px;height:30px}
        }
      
      .onstood-mini-chat-shell {
        min-width: 0 !important;
        overflow: hidden !important;
      }
      .onstood-mini-chat-shell .card { border-radius: 10px !important; }
      .onstood-mini-chat-shell button,
      .onstood-mini-chat-shell input,
      .onstood-mini-chat-shell textarea { font-size: 12.5px !important; }
      .onstood-mini-chat-shell input,
      .onstood-mini-chat-shell textarea {
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .onstood-mini-chat-shell .btn {
        min-height: 31px !important;
        padding: 5px 8px !important;
        gap: 5px !important;
      }
      .onstood-mini-chat-shell .icon-btn {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
        padding: 4px !important;
      }
      .onstood-mini-chat-shell small { font-size: 10px !important; }
      .onstood-mini-chat-shell img { max-width: 100% !important; }
`}</style>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ minHeight: 76, padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>✦ SUGGESTED BY ONSTOOD AI</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeSuggestion ? (
              <button type="button" onClick={() => chooseSuggestion(activeSuggestion)} key={`${activeSuggestion.kind}-${activeSuggestion.id || suggestionIndex}`} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeIn .35s ease', cursor: 'pointer', textAlign: 'left' }} title="Open this material with ONSTOOD AI">
                <span style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(99,102,241,.09)', fontSize: 11, fontWeight: 800 }}>{activeSuggestion.kind}</span>
                <div style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSuggestion.title}</b><small className="muted">{activeSuggestion.meta}</small></div>
              </button>
            ) : <small className="muted">Suggestions will appear here from ONSTOOD content available to you.</small>}
          </div>
          {suggestions.length > 1 && <small className="muted">{suggestionIndex + 1}/{suggestions.length}</small>}
        </div>

        {selectedSuggestion && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(99,102,241,.035)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <small className="muted" style={{ display: 'block', fontWeight: 800 }}>SELECTED ONSTOOD MATERIAL</small>
              <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSuggestion.title}</b>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="onstood-global-selection-chip standard"
                disabled={
                  busy ||
                  standardLeft <= 0
                }
                onClick={event =>
                  askSelectedSuggestion(
                    event,
                    'standard'
                  )
                }
                title="Ask ONSTOOD AI about this material"
              >
                <span className="onstood-global-selection-flow" />
                <span className="onstood-global-selection-led" />
                <span className="onstood-global-selection-label">
                  ASK ONSTOOD AI
                </span>
              </button>

              <button
                type="button"
                className="onstood-global-selection-chip advanced"
                disabled={
                  busy ||
                  !isPro ||
                  advancedLeft <= 0
                }
                onClick={event =>
                  askSelectedSuggestion(
                    event,
                    'advanced'
                  )
                }
                title={
                  isPro
                    ? 'Ask Advanced ONSTOOD AI about this material'
                    : 'Advanced AI requires ONSTOOD PRO'
                }
              >
                <span className="onstood-global-selection-flow" />
                <span className="onstood-global-selection-led" />
                <span className="onstood-global-selection-label">
                  ASK ADVANCED ONSTOOD AI
                </span>
              </button>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                setSelectedSuggestion(
                  null
                )
              }
              title="Close"
            >
              ×
            </button>
          </div>
        )}

        <div style={{ display: 'flex', minHeight: 610 }}>
          <aside style={{ width: 250, borderRight: '1px solid rgba(0,0,0,.08)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={15} /><input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search history…" style={{ width: '100%' }} /></div>
            <small className="muted" style={{ fontWeight: 800 }}>HISTORY</small>
            <div style={{ overflowY: 'auto', maxHeight: 510 }}>
              {filteredHistory.map(item => (
                <button key={item.id} type="button" onClick={() => { setConversationId(item.id); focusInput(); }} style={{ width: '100%', border: 0, borderRadius: 10, padding: '10px 9px', marginBottom: 4, textAlign: 'left', cursor: 'pointer', background: conversationId === item.id ? 'rgba(99,102,241,.09)' : 'transparent' }}>
                  <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{item.title || 'ONSTOOD AI'}</b>
                  <small className="muted">{new Date(item.updated_at).toLocaleDateString()}</small>
                </button>
              ))}
              {!filteredHistory.length && <small className="muted">Your AI history will stay here.</small>}
            </div>
          </aside>

          <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{ flex: 1, padding: 18, overflowY: 'auto', maxHeight: 520 }}
            >
              {!messages.length && <div className="empty" style={{ marginTop: 90 }}><Sparkles size={28} /><b>Ask ONSTOOD AI</b><span className="muted">Your cursor is ready below. Press Enter for a standard AI question.</span></div>}
              {messages.map(message => (
                <div key={message.id} className={message.role === 'user' ? 'bubble me' : 'bubble'} style={{ whiteSpace: 'pre-wrap' }}>
                  {message.role === 'assistant' && message.mode === 'advanced' && <small style={{ display: 'block', marginBottom: 5, fontWeight: 900 }}>✦ ADVANCED AI</small>}
                  {renderAiText(message.content)}
                </div>
              ))}
              {busy && <div className="bubble"><Sparkles size={15} /> ONSTOOD AI is thinking…</div>}
              <div ref={chatEndRef} />
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <small className="muted">Free {standardLeft}/{plan.standard_limit} · Advanced {advancedLeft}/{plan.advanced_limit} · refresh 12:00 PM</small>
                <small className="muted">Enter = Ask AI</small>
              </div>
              <form onSubmit={event => send(event, 'standard')} style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
                <input ref={inputRef} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Ask ONSTOOD AI" disabled={busy} style={{ flex: 1, minHeight: 48, fontSize: 15 }} />
                <button
                  className="onstood-standard-chip"
                  disabled={busy || !text.trim()}
                  title="Ask AI · Enter"
                >
                  <span className="onstood-standard-track track-a" />
                  <span className="onstood-standard-track track-b" />
                  <span className="onstood-standard-packet standard-packet-a" />
                  <span className="onstood-standard-packet standard-packet-b" />
                  <span className="onstood-standard-core" aria-hidden="true" />
                  <Send size={16} />
                </button>

                <button
                  type="button"
                  className="onstood-advanced-chip"
                  disabled={busy || !text.trim() || advancedLeft <= 0}
                  onClick={event => send(event, 'advanced')}
                  title="Ask Advanced AI"
                >
                  <span className="onstood-chip-circuit onstood-chip-circuit-a" />
                  <span className="onstood-chip-circuit onstood-chip-circuit-b" />
                  <span className="onstood-chip-circuit onstood-chip-circuit-c" />
                  <span className="onstood-chip-circuit onstood-chip-circuit-d" />
                  <span className="onstood-chip-packet packet-a" />
                  <span className="onstood-chip-packet packet-b" />
                  <span className="onstood-chip-packet packet-c" />
                  <span className="onstood-chip-core" aria-hidden="true">
                    <i /><i /><i /><i /><i /><i />
                  </span>
                  <span className="onstood-chip-label">
                    <span className="onstood-chip-title">ADVANCED AI</span>
                    <span className="onstood-chip-count">{advancedLeft}/{plan.advanced_limit}</span>
                  </span>
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>

    </Page>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */


function MyProfile({
  profile,
  notify,
  onEditProfile
}) {
  const [followers, setFollowers] =
    useState(0);
  const [following, setFollowing] =
    useState(0);
  const [connections, setConnections] =
    useState(0);

  useEffect(() => {
    let active = true;

    async function loadCounts() {
      if (!profile?.id) return;

      const [
        followersResult,
        followingResult,
        connectionsResult
      ] = await Promise.all([
        supabase
          .from('follows')
          .select('*', {
            count: 'exact',
            head: true
          })
          .eq(
            'following_id',
            profile.id
          ),

        supabase
          .from('follows')
          .select('*', {
            count: 'exact',
            head: true
          })
          .eq(
            'follower_id',
            profile.id
          ),

        supabase
          .from('friend_requests')
          .select('*', {
            count: 'exact',
            head: true
          })
          .eq('status', 'accepted')
          .or(
            `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
          )
      ]);

      if (!active) return;

      setFollowers(
        followersResult.count || 0
      );
      setFollowing(
        followingResult.count || 0
      );
      setConnections(
        connectionsResult.count || 0
      );
    }

    loadCounts();

    return () => {
      active = false;
    };
  }, [profile?.id]);

  return (
    <Page
      eyebrow="PROFILE"
      title={`${profile.name || ''} ${profile.surname || ''}`}
    >
      <div className="card">
        <div
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <Avatar
            profile={profile}
            size="xl"
          />

          <div
            style={{
              flex: 1,
              minWidth: 220
            }}
          >
            <h2
              style={{
                margin: '0 0 4px'
              }}
            >
              {profile.name}{' '}
              {profile.surname}
            </h2>

            <div className="muted">
              {profile.university ||
                'ONSTOOD member'}
              {profile.degree
                ? ` · ${profile.degree}`
                : ''}
            </div>

            <div
              className="row"
              style={{
                gap: 18,
                marginTop: 12,
                flexWrap: 'wrap'
              }}
            >
              <b>
                {connections}{' '}
                <span className="muted">
                  Connections
                </span>
              </b>

              <b>
                {followers}{' '}
                <span className="muted">
                  Followers
                </span>
              </b>

              <b>
                {following}{' '}
                <span className="muted">
                  Following
                </span>
              </b>
            </div>
          </div>

          <button
            className="btn subtle"
            onClick={onEditProfile}
          >
            Edit profile
          </button>
        </div>
      </div>

      <ProfileContentTabs
        viewer={profile}
        person={profile}
        connectionStatus="connected"
        notify={notify}
      />
    </Page>
  );
}


function ProfileEditor({
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

  const [socialProvider, setSocialProvider] = useState(null);
  const [canEditSocialName, setCanEditSocialName] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadIdentityMode() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const providers = (data?.user?.identities || [])
        .map(identity => identity?.provider)
        .filter(Boolean);

      const provider =
        providers.find(item => item === 'google' || item === 'apple') || null;

      setSocialProvider(provider);
      setCanEditSocialName(
        Boolean(provider) &&
        !Boolean(profile?.social_name_edit_used)
      );
    }

    loadIdentityMode();

    return () => {
      active = false;
    };
  }, [profile?.id, profile?.social_name_edit_used]);



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
      `${userId}/${crypto.randomUUID()}.${extension}`;


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

        name:
          canEditSocialName
            ? (form.name || '').trim()
            : profile.name || '',
        surname:
          canEditSocialName
            ? (form.surname || '').trim()
            : profile.surname || '',
        social_name_edit_used:
          canEditSocialName
            ? true
            : Boolean(profile.social_name_edit_used),
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

      if (avatarFile && data.avatar_url) {
        const {
          error: historyError
        } = await supabase
          .from('profile_picture_history')
          .insert({
            user_id: profile.id,
            storage_path:
              data.avatar_url,
            visibility:
              avatarVisibility
          });

        if (historyError) {
          console.error(
            'Profile picture history error:',
            historyError
          );
        }
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
              value={
                canEditSocialName
                  ? form.name || ''
                  : profile.name || ''
              }
              onChange={
                canEditSocialName
                  ? event =>
                      updateField(
                        'name',
                        event.target.value
                      )
                  : undefined
              }
              readOnly={!canEditSocialName}
              disabled={!canEditSocialName}
              title={
                canEditSocialName
                  ? 'You may correct your name once because this account was created with Google or Apple.'
                  : 'Name is fixed after account setup.'
              }
            />

            <small className="muted">
              {canEditSocialName
                ? `Imported from ${socialProvider === 'apple' ? 'Apple' : 'Google'} · you can correct it once.`
                : 'Fixed after account setup.'}
            </small>
          </label>


          <label>
            Last name

            <input
              value={
                canEditSocialName
                  ? form.surname || ''
                  : profile.surname || ''
              }
              onChange={
                canEditSocialName
                  ? event =>
                      updateField(
                        'surname',
                        event.target.value
                      )
                  : undefined
              }
              readOnly={!canEditSocialName}
              disabled={!canEditSocialName}
              title={
                canEditSocialName
                  ? 'You may correct your surname once because this account was created with Google or Apple.'
                  : 'Surname is fixed after account setup.'
              }
            />

            <small className="muted">
              {canEditSocialName
                ? 'Save once to confirm your preferred name.'
                : 'Fixed after account setup.'}
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

  const [financePeriod, setFinancePeriod] = useState('month');
  const [finance, setFinance] = useState({ revenue: 0, costs: 0, profit: 0, ai_cost: 0, entries: 0, currency: 'USD' });
  const [planSettings, setPlanSettings] = useState([]);

  async function loadOwnerFinance(period = financePeriod) {
    if (role !== 'owner') return;
    const now = new Date();
    let from = new Date(0);
    if (period === 'today') { from = new Date(now); from.setHours(0,0,0,0); }
    if (period === 'week') from = new Date(now.getTime() - 7*24*60*60*1000);
    if (period === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); }
    if (period === 'year') { from = new Date(now.getFullYear(), 0, 1); }
    const [{ data: summary }, { data: plans }] = await Promise.all([
      supabase.rpc('owner_finance_summary', { p_from: from.toISOString(), p_to: now.toISOString() }),
      supabase.from('plan_settings').select('plan_code,display_name,monthly_price_eur,standard_daily_limit,advanced_daily_limit,active').order('monthly_price_eur')
    ]);
    if (summary) setFinance(summary);
    if (plans) setPlanSettings(plans);
  }


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

  useEffect(() => { if (role === 'owner' && tab === 'finance') loadOwnerFinance(financePeriod); }, [role, tab, financePeriod]);


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
    ...(role === 'owner' ? [['finance', 'Owner Finance', Activity]] : []),
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


      {tab === 'finance' && role === 'owner' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><div><h3>Owner Finance</h3><small className="muted">Revenue, costs, profit and AI economics from the permanent finance ledger.</small></div><Activity size={18}/></div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {['today','week','month','year','all'].map(p => <button key={p} className={financePeriod===p?'btn primary':'btn subtle'} onClick={()=>setFinancePeriod(p)}>{p==='all'?'All time':p[0].toUpperCase()+p.slice(1)}</button>)}
            </div>
            <div className="stat-row">
              <Stat label="Revenue" value={`$${Number(finance.revenue||0).toFixed(4)}`} />
              <Stat label="Total costs" value={`$${Number(finance.costs||0).toFixed(4)}`} />
              <Stat label="Profit" value={`$${Number(finance.profit||0).toFixed(4)}`} />
              <Stat label="AI cost" value={`$${Number(finance.ai_cost||0).toFixed(4)}`} />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div><h3>Plan Engine</h3><small className="muted">Backend-controlled limits and pricing. FREE Advanced AI is locked.</small></div><ShieldCheck size={18}/></div>
            {(planSettings||[]).map(item => <div className="metric" key={item.plan_code}><span><b>{item.display_name}</b><small className="muted" style={{display:'block'}}>{item.standard_daily_limit} Standard/day · {item.advanced_daily_limit} Advanced/day</small></span><b>{Number(item.monthly_price_eur||0)===0?'FREE':`€${Number(item.monthly_price_eur).toFixed(2)}/mo`}</b></div>)}
            <div className="notice" style={{marginTop:12}}>PRO limits are configurable in the backend; €8.99/month is the planned price. Revenue remains zero until real monetization is connected.</div>
          </div>
        </div>
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
  setProfile,
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
    follow_privacy: profile?.follow_privacy || 'everyone',
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

    await supabase.from('profiles').update({ follow_privacy: settings.follow_privacy || 'everyone' }).eq('id', profile.id);
    const payload = {
      ...settings,
      user_id: profile.id,
      updated_at:
        new Date().toISOString()
    };

    delete payload.id;
    delete payload.follow_privacy;

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

        <section>
          <ProfileEditor
            profile={profile}
            setProfile={setProfile}
            notify={notify}
          />
        </section>

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
  index = 0,
  onClose
}) {

  if (
    !targetUserId &&
    !targetConversationId
  ) {
    return null;
  }

  const chatWidth = 360;
  const chatHeight = 520;
  const chatGap = 10;
  const onlinePanelWidth = 255;
  const baseRight =
    onlinePanelWidth + 28;

  const viewportWidth =
    typeof window !== 'undefined'
      ? window.innerWidth
      : 1400;

  const usableWidth =
    Math.max(
      chatWidth,
      viewportWidth -
        baseRight -
        20
    );

  const perRow =
    Math.max(
      1,
      Math.floor(
        usableWidth /
          (chatWidth + chatGap)
      )
    );

  const column =
    index % perRow;

  const row =
    Math.floor(
      index / perRow
    );

  const right =
    baseRight +
    column *
      (chatWidth + chatGap);

  const bottom =
    18 +
    row *
      (chatHeight + chatGap);

  return (
    <div
      className="onstood-mini-chat-shell"
      style={{
        position: 'fixed',
        right,
        bottom,
        width: `min(${chatWidth}px, calc(100vw - 24px))`,
        height: `min(${chatHeight}px, calc(100vh - 36px))`,
        zIndex: 10030,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 14,
        boxShadow: '0 12px 36px rgba(15,23,42,.18)',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
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
          overflow: 'hidden',
          padding: 5,
          background: '#fff',
          borderRadius: '0 0 14px 14px'
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
        const url =
          new URL(
            window.location.href
          );

        return (
          url.pathname ===
            '/confirm-signup' ||
          url.searchParams.get(
            'onstood_confirm'
          ) === '1'
        );
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

        if (
          url.pathname ===
            '/confirm-signup' ||
          url.searchParams.get(
            'onstood_confirm'
          ) === '1'
        ) {

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