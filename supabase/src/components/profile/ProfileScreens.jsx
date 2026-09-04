import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import PhotoViewer from '../PhotoViewer';
import { Page } from '../ui';
import { ProfileContentTabs } from './ProfileContent';


function createBrowserSafeId() {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function'
    ) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(
        bytes,
        byte => byte.toString(16).padStart(2, '0')
      );

      return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join('')
      ].join('-');
    }
  } catch {
    // Fall through to a non-cryptographic compatibility id.
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}


export function MyProfile({
  profile,
  notify,
  onEditProfile
}) {
  const [largePhoto, setLargePhoto] =
    useState(null);

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
            onImageClick={
              setLargePhoto
            }
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
        onImageClick={
          setLargePhoto
        }
      />

      <PhotoViewer
        src={largePhoto}
        alt="Photo"
        onClose={() =>
          setLargePhoto(null)
        }
      />
    </Page>
  );
}

export function ProfileEditor({
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
      `${userId}/${createBrowserSafeId()}.${extension}`;


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
          profile.name || '',
        surname:
          profile.surname || '',
        social_name_edit_used:
          Boolean(profile.social_name_edit_used),
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
              value={profile.name || ''}
              readOnly
              disabled
              title="First name is fixed after account setup."
              style={{
                background: '#f1f5f9',
                color: '#64748b',
                borderColor: '#dbe3ec',
                cursor: 'not-allowed',
                opacity: .9
              }}
            />

            <small className="muted">
              Fixed identity field · cannot be changed.
            </small>
          </label>


          <label>
            Last name

            <input
              value={profile.surname || ''}
              readOnly
              disabled
              title="Last name is fixed after account setup."
              style={{
                background: '#f1f5f9',
                color: '#64748b',
                borderColor: '#dbe3ec',
                cursor: 'not-allowed',
                opacity: .9
              }}
            />

            <small className="muted">
              Fixed identity field · cannot be changed.
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
