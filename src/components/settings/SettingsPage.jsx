import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { Bell, BriefcaseBusiness, Database, Globe2, LockKeyhole, MessageCircle, Monitor, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Page } from '../ui';
import { ProfileEditor } from '../profile/ProfileScreens';

export function AdminMfaGate({
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
            opening <OnstoodWordmark /> Admin Control Center.
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

export default function SettingsPage({
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

  const [deleteSocialProvider, setDeleteSocialProvider] =
    useState(null);

  const [deleteSocialVerified, setDeleteSocialVerified] =
    useState(false);


  const [feedbackForm, setFeedbackForm] =
    useState({
      category: 'suggestion',
      subject: '',
      message: ''
    });

  const [feedbackBusy, setFeedbackBusy] =
    useState(false);

  const [blockedPeople, setBlockedPeople] = useState([]);
  const [unblockingId, setUnblockingId] = useState(null);
  const [blockedListOpen, setBlockedListOpen] = useState(false);



  async function loadBlockedPeople() {
    const { data, error } = await supabase.rpc('list_blocked_people');
    if (error) { console.error('Blocked people load error:', error); return; }
    setBlockedPeople(data || []);
  }

  async function unblockPerson(person) {
    if (!person?.user_id || unblockingId) return;
    const label = `${person.name || 'this person'} ${person.surname || ''}`.trim();
    if (!window.confirm(`Unblock ${label}? You will not be able to block this person again for 30 days.`)) return;
    setUnblockingId(person.user_id);
    const { error } = await supabase.rpc('unblock_user', { p_user_id: person.user_id });
    setUnblockingId(null);
    if (error) { notify(error.message); return; }
    setBlockedPeople(current => current.filter(item => item.user_id !== person.user_id));
    notify(`${label} unblocked. You cannot block this person again for 30 days.`);
  }

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

      const user =
        data?.user;

      const identities =
        user?.identities || [];

      const providers =
        identities
          .map(
            identity =>
              identity?.provider
          )
          .filter(Boolean);

      const hasEmailPasswordIdentity =
        providers.includes('email');

      const socialProvider =
        providers.includes('google')
          ? 'google'
          : providers.includes('apple')
            ? 'apple'
            : null;

      const lastSignInMs =
        Date.parse(
          String(
            user?.last_sign_in_at ||
            ''
          )
        );

      const isFreshSocialLogin =
        Boolean(socialProvider) &&
        Number.isFinite(lastSignInMs) &&
        (
          Date.now() -
          lastSignInMs
        ) <= 5 * 60 * 1000;

      setDeleteNeedsPassword(
        hasEmailPasswordIdentity
      );

      setDeleteSocialProvider(
        hasEmailPasswordIdentity
          ? null
          : socialProvider
      );

      setDeleteSocialVerified(
        hasEmailPasswordIdentity
          ? false
          : isFreshSocialLogin
      );

    }

    loadSettings();
    loadDeleteAuthMode();
    loadBlockedPeople();

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


  async function verifySocialForDelete() {

    if (!deleteSocialProvider) {
      notify(
        'No supported social sign-in provider was found.'
      );
      return;
    }

    const providerLabel =
      deleteSocialProvider === 'apple'
        ? 'Apple'
        : 'Google';

    try {

      sessionStorage.setItem(
        'onstood_delete_reauth',
        deleteSocialProvider
      );

    } catch {
      // Continue even if sessionStorage is unavailable.
    }

    const queryParams =
      deleteSocialProvider === 'google'
        ? {
            prompt: 'select_account'
          }
        : {
            prompt: 'login'
          };

    const {
      error
    } = await supabase.auth
      .signInWithOAuth({
        provider:
          deleteSocialProvider,
        options: {
          redirectTo:
            window.location.href,
          queryParams
        }
      });

    if (error) {
      notify(
        `${providerLabel} verification could not start: ${error.message}`
      );
    }

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

    if (
      !deleteNeedsPassword &&
      deleteSocialProvider &&
      !deleteSocialVerified
    ) {
      notify(
        `Verify with ${
          deleteSocialProvider === 'apple'
            ? 'Apple'
            : 'Google'
        } before deleting your account.`
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
              <h3>Blocked people</h3>
              <small className="muted">Manage people you have blocked without filling the Settings page with a long list.</small>
            </div>
            <ShieldCheck size={19} />
          </div>

          <button
            type="button"
            className="btn subtle"
            onClick={() => setBlockedListOpen(open => !open)}
            aria-expanded={blockedListOpen}
            style={{ width:'100%', justifyContent:'space-between' }}
          >
            <span>Blocked people list{blockedPeople.length ? ` (${blockedPeople.length})` : ''}</span>
            <span aria-hidden="true">{blockedListOpen ? '−' : '+'}</span>
          </button>

          {blockedListOpen && (
            <div style={{ marginTop:12 }}>
              {blockedPeople.length === 0 ? (
                <div className="empty compact">No blocked people.</div>
              ) : (
                <div style={{ display:'grid', gap:8, maxHeight:360, overflowY:'auto', paddingRight:4 }}>
                  {blockedPeople.map(person => (
                    <div key={person.user_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(15,23,42,.08)' }}>
                      <div><b>{person.name || 'Student'} {person.surname || ''}</b><small className="muted" style={{display:'block'}}>Blocked</small></div>
                      <button type="button" className="btn subtle" disabled={unblockingId === person.user_id} onClick={() => unblockPerson(person)}>{unblockingId === person.user_id ? 'Unblocking…' : 'Unblock'}</button>
                    </div>
                  ))}
                </div>
              )}
              <small className="muted" style={{ display:'block', marginTop:12 }}>Important: after you unblock someone, you cannot block that same person again for 30 days.</small>
            </div>
          )}
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
                Personalize <OnstoodWordmark />
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
                    <OnstoodWordmark /> AI Preferences
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
              <OnstoodWordmark /> learns with you.
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
            removes your <OnstoodWordmark /> authentication
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
                : (
                  deleteSocialProvider
                    ? (
                      deleteSocialVerified
                        ? `${
                            deleteSocialProvider === 'apple'
                              ? 'Apple'
                              : 'Google'
                          } identity verified. You can now permanently delete this account.`
                        : `For security, verify again with ${
                            deleteSocialProvider === 'apple'
                              ? 'Apple'
                              : 'Google'
                          } before permanently deleting this account. ONSTOOD never asks for your ${
                            deleteSocialProvider === 'apple'
                              ? 'Apple ID'
                              : 'Google'
                          } password.`
                    )
                    : 'A supported sign-in identity is required before this account can be deleted.'
                )}
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

            {!deleteNeedsPassword &&
              deleteSocialProvider &&
              !deleteSocialVerified && (

              <button
                type="button"
                className="btn subtle"
                onClick={
                  verifySocialForDelete
                }
                style={{
                  width: '100%',
                  marginTop: 12,
                  fontWeight: 850
                }}
              >
                Verify with {
                  deleteSocialProvider === 'apple'
                    ? 'Apple'
                    : 'Google'
                }
              </button>

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
                  ) ||
                  (
                    !deleteNeedsPassword &&
                    Boolean(
                      deleteSocialProvider
                    ) &&
                    !deleteSocialVerified
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
