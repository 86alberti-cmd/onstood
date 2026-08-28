import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { BookOpen, BriefcaseBusiness } from 'lucide-react';
import { supabase } from '../../lib/supabase';


function OnstoodKnowledgeFlow() {
  const traces = [
    // Left book <-> chip
    "M78 132 H154 V108 H236 V126 H338",
    "M88 151 H136 V171 H222 V146 H338",
    "M104 112 H178 V88 H260 V108 H338",
    "M122 174 H198 V190 H284 V160 H338",
    "M154 126 V154 H244 V136 H338",

    // Chip <-> right book
    "M482 126 H574 V108 H656 V132 H748",
    "M482 146 H598 V171 H684 V151 H758",
    "M482 108 H548 V88 H630 V112 H742",
    "M482 160 H564 V190 H650 V174 H724",
    "M482 136 H586 V154 H674 V126 H710",

    // Small local chip interconnects
    "M338 112 H372 V86 H410",
    "M410 86 H448 V112 H482",
    "M338 174 H374 V198 H410",
    "M410 198 H446 V174 H482"
  ];

  return (
    <div className="onstood-knowledge-flow" aria-hidden="true">
      <svg className="knowledge-circuit-svg" viewBox="0 0 820 230" preserveAspectRatio="none">
        <defs>
          <filter id="onstoodGlow">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {traces.map((d, index) => (
          <g key={index}>
            <path className="circuit-base" d={d} />
            <path
              className={`circuit-pulse pulse-${index % 4}`}
              d={d}
              pathLength="100"
              style={{
                '--delay': `${index * -1.15}s`,
                '--duration': `${8.5 + (index % 5) * 1.35}s`
              }}
            />
          </g>
        ))}

        {[
          [154,108],[222,171],[260,88],[284,160],
          [574,108],[598,171],[630,88],[650,174],
          [372,86],[448,112],[374,198],[446,174]
        ].map(([cx, cy], index) => (
          <circle
            key={index}
            className={`circuit-node node-${index % 3}`}
            cx={cx}
            cy={cy}
            r="2.1"
          />
        ))}
      </svg>

      <div className="knowledge-label knowledge-label-left">Knowledge</div>
      <div className="knowledge-label knowledge-label-right">Resources</div>
      <div className="knowledge-label knowledge-label-center">AI-Powered</div>

      <div className="knowledge-book knowledge-book-left">
        <span className="book-cover" />
        <span className="book-pages" />
        <span className="book-spine" />
      </div>

      <div className="knowledge-chip" />

      <div className="knowledge-book knowledge-book-right">
        <span className="book-cover" />
        <span className="book-pages" />
        <span className="book-spine" />
      </div>
    </div>
  );
}

export function Auth({ onReady }) {

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
    `${authBaseUrl}/`;

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

      const normalizedEmail =
        form.email.trim().toLowerCase();

      const signupMetadata = {
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
      };

      /*
       * ONSTOOD registration rule:
       * - confirmed email -> stop and ask the user to sign in
       * - unconfirmed email -> replace the pending registration details/password
       *   and send a fresh confirmation email
       * - new email -> continue with the normal Supabase signUp flow below
       */
      const {
        data: pendingSignup,
        error: pendingSignupError
      } = await supabase.functions.invoke(
        'onstood-resend-confirmation',
        {
          body: {
            email: normalizedEmail,
            password: form.password,
            redirectTo: signupReturnUrl,
            metadata: signupMetadata
          }
        }
      );

      if (pendingSignupError) {
        setMessage(
          'Could not verify this registration right now. Please try again.'
        );
        return;
      }

      if (pendingSignup?.status === 'already_confirmed') {
        setMessage(
          'This email is already used for an account. Please sign in.'
        );
        return;
      }

      if (pendingSignup?.status === 'resent') {
        setMessage(
          'Your pending registration was updated. Check your email and use the newest confirmation link.'
        );
        return;
      }

      if (
        pendingSignup?.status ===
        'unconfirmed_updated_email_not_sent'
      ) {
        setMessage(
          pendingSignup.message ||
          'Your pending registration was updated, but the confirmation email could not be sent yet. Please try again shortly.'
        );
        return;
      }

      if (pendingSignup?.status !== 'not_found') {
        setMessage(
          pendingSignup?.error ||
          'Could not complete registration. Please try again.'
        );
        return;
      }

      const {
        data,
        error
      } = await supabase.auth.signUp({

        email: normalizedEmail,
        password: form.password,

        options: {

          emailRedirectTo:
            signupReturnUrl,

          data: signupMetadata

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
        <OnstoodAuthVisualStyles />

        <div className="auth-left">
          <div className="brand huge">
            <OnstoodWordmark /><span>.</span>
          </div>

          <h1>
            Recover your
            <br />
            account.
          </h1>

          <p>
            Enter the email address connected to your <OnstoodWordmark /> account.
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
            <OnstoodWordmark /><span>.</span>
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
            For your privacy, <OnstoodWordmark /> does not display your old password.
          </small>
        </div>

      </div>
    );
  }


  return (

    <div className="auth-shell">
        <OnstoodAuthVisualStyles />

      {
      /* 
      =========================
          LEFT SIDE
      ========================= 
      */}

      <div className="auth-left">

        <div className="brand huge">
          <OnstoodWordmark /><span>.</span>
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

        <OnstoodKnowledgeFlow />

      </div>


      {
      /* 
        =========================
          AUTH CARD
         ========================= 
         */}

      <div className="auth-card">

        <div className="brand">
          <OnstoodWordmark /><span>.</span>
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
                  disabled
                  aria-disabled="true"
                  title="Employer accounts are coming soon"
                  style={{
                    opacity: .52,
                    cursor: 'not-allowed'
                  }}
                >
                  Employer · Coming soon
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
            <svg
              className="google-official-g"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.509h3.232c1.891-1.741 2.982-4.305 2.982-7.35Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.041.955-3.386.955-2.605 0-4.809-1.759-5.6-4.123H3.059v2.591A9.999 9.999 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.4 13.9A6.01 6.01 0 0 1 6.086 12c0-.659.114-1.3.314-1.9V7.509H3.059A9.999 9.999 0 0 0 2 12c0 1.614.386 3.141 1.059 4.491L6.4 13.9Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.977c1.468 0 2.786.505 3.823 1.495l2.868-2.868C16.959 2.991 14.695 2 12 2A9.999 9.999 0 0 0 3.059 7.509L6.4 10.1C7.191 7.736 9.395 5.977 12 5.977Z"
              />
            </svg>
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

        <div className="onstood-auth-credit">
          Created by <strong>AN</strong>
          <span>•</span>
          Powered by <strong>AI</strong>
        </div>

      </div>

    </div>

  );

}

export function ResetPassword({ onDone }) {

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
        <OnstoodAuthVisualStyles />

      <div className="auth-left">

        <div className="brand huge">
          <OnstoodWordmark /><span>.</span>
        </div>

        <h1>
          Create a new
          <br />
          password.
        </h1>

        <p>
          Choose a new password for your <OnstoodWordmark />
          account and get back to your student life.
        </p>

        <div className="auth-pills">

          <span>Secure</span>
          <span>Simple</span>
          <span><OnstoodWordmark /></span>

        </div>

      </div>


      <div className="auth-card">

        <div className="brand">
          <OnstoodWordmark /><span>.</span>
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

export function GoogleAccountType({
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

  const [firstName, setFirstName] =
    useState(
      metadata.given_name ||
      nameParts[0] ||
      ''
    );

  const [lastName, setLastName] =
    useState(
      metadata.family_name ||
      nameParts.slice(1).join(' ') ||
      ''
    );

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


    if (!firstName.trim()) {
      setMessage(
        'Please enter your first name.'
      );
      return;
    }


    if (!lastName.trim()) {
      setMessage(
        'Please enter your last name.'
      );
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
        firstName.trim(),
      surname:
        lastName.trim(),
      social_name_edit_used: true,
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
        <OnstoodAuthVisualStyles />

      <div className="auth-card card">

        <span className="eyebrow dark">
          WELCOME TO <OnstoodWordmark />
        </span>

        <h1>
          Complete your account
        </h1>

        <p className="muted">
          Before entering <OnstoodWordmark />, confirm the
          name that will identify you on the platform.
        </p>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(220,38,38,.06)',
            border: '1px solid rgba(220,38,38,.16)'
          }}
        >
          <b style={{ color: '#b91c1c' }}>
            Important
          </b>

          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              lineHeight: 1.45,
              color: '#475569'
            }}
          >
            Your first name and last name can be saved only once.
            After you press Save, these two fields cannot be changed.
          </div>
        </div>

        <div
          className="grid2"
          style={{
            marginTop: 14,
            alignItems: 'start'
          }}
        >
          <label
            style={{
              minWidth: 0,
              width: '100%'
            }}
          >
            First name

            <input
              name="google-first-name"
              autoComplete="given-name"
              value={firstName}
              onChange={event =>
                setFirstName(
                  event.target.value
                )
              }
              placeholder="First name"
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            />
          </label>

          <label
            style={{
              minWidth: 0,
              width: '100%'
            }}
          >
            Last name

            <input
              name="google-last-name"
              autoComplete="family-name"
              value={lastName}
              onChange={event =>
                setLastName(
                  event.target.value
                )
              }
              placeholder="Last name"
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            />
          </label>
        </div>

        <div
          style={{
            marginTop: 18,
            fontWeight: 800
          }}
        >
          Account type
        </div>


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
            !firstName.trim() ||
            !lastName.trim() ||
            busy
          }
          onClick={finish}
          style={{
            marginTop: 16
          }}
        >
          {
            busy
              ? 'Saving…'
              : (
                role
                  ? 'Save and continue'
                  : 'Choose Student or Employer'
              )
          }
        </button>

      </div>

    </div>
  );

}



const ONSTOOD_AUTH_VISUAL_STYLES = `
  .auth-shell {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: linear-gradient(102deg,#5f51e8 0%,#7769ef 29%,#a79cf5 50%,#e6e2fd 69%,#fbfbff 84%,#fff 100%) !important;
  }

  .auth-left {
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow: hidden;
    background: transparent !important;
  }

  .auth-left::before {
    content:"";
    position:absolute;
    inset:0;
    z-index:-2;
    pointer-events:none;
    background:
      radial-gradient(circle at 16% 12%,rgba(255,255,255,.12),transparent 25%),
      radial-gradient(circle at 56% 69%,rgba(255,255,255,.26),transparent 30%);
  }

  .auth-card {
    position: relative;
    z-index: 10;
    width: min(430px, 92vw) !important;
    max-width: 430px !important;
    padding: 32px 34px !important;
    border-radius: 26px !important;
    box-shadow: 0 24px 70px rgba(55,45,120,.15) !important;
  }

  .auth-card .btn.subtle.full {
    position: relative;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .google-official-g {
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    position: absolute;
    left: 15px;
  }

  @media (min-width: 1100px) {
    .auth-card {
      transform: translateX(34px);
    }
  }


  .onstood-knowledge-flow {
    position:absolute;
    left:1%;
    right:-10%;
    bottom:8.5vh;
    height:min(25vh,235px);
    pointer-events:none;
  }

  .knowledge-circuit-svg {
    position:absolute;
    left:-2%;
    right:0;
    bottom:0;
    width:104%;
    height:88%;
    overflow:visible;
  }

  .circuit-base {
    fill:none;
    stroke:rgba(255,255,255,.30);
    stroke-width:1.05;
    vector-effect:non-scaling-stroke;
  }

  .circuit-pulse {
    fill:none;
    stroke:#fff;
    stroke-width:2.2;
    stroke-linecap:round;
    vector-effect:non-scaling-stroke;
    stroke-dasharray:2.2 97.8;
    filter:url(#onstoodGlow);
    animation:onstoodCircuitTravel var(--duration) ease-in-out infinite;
    animation-delay:var(--delay);
  }

  .pulse-1 { animation-direction:reverse; opacity:.82; }
  .pulse-2 { animation-direction:alternate; opacity:.66; }
  .pulse-3 { animation-direction:alternate-reverse; opacity:.92; }

  @keyframes onstoodCircuitTravel {
    0%   { stroke-dashoffset:100; opacity:.10; }
    12%  { opacity:.65; }
    34%  { opacity:1; }
    58%  { opacity:.35; }
    76%  { opacity:.88; }
    100% { stroke-dashoffset:0; opacity:.08; }
  }

  .circuit-node {
    fill:#fff;
    filter:url(#onstoodGlow);
    animation:onstoodNodePulse 5.8s ease-in-out infinite;
  }
  .node-1 { animation-delay:-1.7s; }
  .node-2 { animation-delay:-3.4s; }

  @keyframes onstoodNodePulse {
    0%,100% { opacity:.18; }
    50% { opacity:.92; }
  }

  .knowledge-book {
    position:absolute;
    bottom:14%;
    width:88px;
    height:62px;
    z-index:4;
    filter:drop-shadow(0 12px 15px rgba(64,43,170,.24));
  }
  .knowledge-book-left { left:5%; transform:rotate(-7deg); }
  .knowledge-book-right { right:14%; transform:rotate(7deg); }

  .book-cover {
    position:absolute; inset:0;
    border-radius:8px 15px 15px 7px;
    border:1px solid rgba(255,255,255,.72);
    background:linear-gradient(145deg,#7766ee,#5542c8);
    box-shadow:inset 0 0 20px rgba(255,255,255,.16),0 0 20px rgba(255,255,255,.22);
  }
  .book-pages {
    position:absolute; left:9px; right:3px; bottom:-8px; height:15px;
    border-radius:0 0 12px 6px;
    background:repeating-linear-gradient(to bottom,#fff 0 1px,#dcd8ff 1px 3px);
    opacity:.88;
  }
  .book-spine {
    position:absolute; left:7px; top:7px; bottom:4px; width:10px;
    border-right:1px solid rgba(255,255,255,.48);
    border-radius:8px;
  }

  .knowledge-chip {
    position:absolute;
    left:50%;
    bottom:9%;
    width:92px;
    height:92px;
    z-index:6;
    transform:translateX(-50%) rotate(45deg);
    border-radius:22px;
    border:2px solid rgba(255,255,255,.88);
    background:linear-gradient(145deg,#5038d2,#7657f3 52%,#a985ff);
    box-shadow:0 0 0 8px rgba(255,255,255,.10),0 0 28px rgba(255,255,255,.72),0 0 60px rgba(100,69,255,.56);
    animation:onstoodChipPulse 4.5s ease-in-out infinite;
  }
  .knowledge-chip::before,.knowledge-chip::after {
    content:"";
    position:absolute;
    inset:-13px 17px;
    border-top:5px dotted rgba(255,255,255,.86);
    border-bottom:5px dotted rgba(255,255,255,.86);
  }
  .knowledge-chip::after { transform:rotate(90deg); }
  .knowledge-chip-core {
    position:absolute; inset:25px;
    display:grid; place-items:center;
    border:1px solid rgba(255,255,255,.72);
    border-radius:12px;
    color:#fff; font-size:31px; font-weight:900;
    transform:rotate(-45deg);
    text-shadow:0 0 15px #fff;
  }
  @keyframes onstoodChipPulse {
    0%,100% { filter:brightness(.96); }
    45% { filter:brightness(1.18); }
    62% { filter:brightness(1.02); }
    76% { filter:brightness(1.22); }
  }

  .knowledge-label {
    position:absolute; z-index:8;
    padding:6px 12px;
    border:1px solid rgba(255,255,255,.55);
    border-radius:999px;
    color:#fff;
    background:rgba(90,65,205,.17);
    backdrop-filter:blur(7px);
    font-size:12px;
    box-shadow:0 5px 20px rgba(70,50,170,.13);
  }
  .knowledge-label-left { left:6%; bottom:53%; }
  .knowledge-label-center { left:50%; bottom:0; transform:translateX(-50%); }
  .knowledge-label-right { right:15%; bottom:53%; }

  .onstood-auth-credit {
    margin-top:20px;
    padding-top:15px;
    border-top:1px solid rgba(15,23,42,.08);
    text-align:center;
    color:#667085;
    font-size:12px;
  }
  .onstood-auth-credit span { margin:0 8px; opacity:.55; }
  .onstood-auth-credit strong { color:#6557ee; font-weight:800; }

  @media (max-width:900px) {
    .auth-card {
      width: min(92vw, 430px) !important;
      padding: 28px 24px !important;
      transform: none !important;
    }

    .auth-shell {
      overflow:auto;
      background:linear-gradient(160deg,#6858ea 0%,#9c90f4 34%,#eeeaff 70%,#fff 100%) !important;
    }
    .auth-left { min-height:auto; }
    .onstood-knowledge-flow {
      position:relative; left:auto; right:auto; bottom:auto;
      width:100%; height:205px; margin-top:22px;
    }
    .knowledge-book { width:72px; height:52px; }
    .knowledge-chip { width:82px; height:82px; border-radius:16px; }
    .knowledge-chip-core { inset:17px; font-size:22px; }
    .knowledge-label { font-size:10px; padding:4px 8px; }
  }

  @media (prefers-reduced-motion:reduce) {
    .circuit-pulse,.knowledge-chip { animation:none !important; }
  }
`

function OnstoodAuthVisualStyles() {
  return <style>{ONSTOOD_AUTH_VISUAL_STYLES}</style>;
}
