import React, { useEffect, useState } from 'react';
import { BookOpen, BriefcaseBusiness } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
