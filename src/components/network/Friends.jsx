import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { Mail, MessageCircle, Paperclip, Search, Send, UserPlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import { Page } from '../ui';
import { ProfileContentTabs } from '../profile/ProfileContent';


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
    // Compatibility fallback below.
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

export default function Friends({
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

  const [postAttachment, setPostAttachment] =
    useState(null);

  const [followingIds, setFollowingIds] = useState([]);
  const [blockingId, setBlockingId] = useState(null);

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


  const filteredConnections =
    connectionProfiles.filter(person => {

      if (!searchText) {
        return true;
      }

      const text =
        `
        ${person.name || ''}
        ${person.surname || ''}
        ${person.university || ''}
        ${person.degree || ''}
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
     CANCEL OUTGOING REQUEST
     ------------------------------------------------------- */

  async function cancelRequest(
    receiverId
  ) {

    if (
      !profile?.id ||
      !receiverId
    ) {
      return;
    }

    const {
      error
    } = await supabase
      .from('friend_requests')
      .delete()
      .eq('sender_id', profile.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending');

    if (error) {
      notify(error.message);
      return;
    }

    setOutgoing(current =>
      current.filter(item => item.receiver_id !== receiverId)
    );

    notify('Connection request cancelled.');

  }


  /* -------------------------------------------------------
     UNFRIEND
     ------------------------------------------------------- */

  async function unfriendPerson(person) {
    if (!person?.id || !profile?.id) {
      return;
    }

    const connection = connections.find(item =>
      item.status === 'accepted' &&
      (
        (item.sender_id === profile.id && item.receiver_id === person.id) ||
        (item.receiver_id === profile.id && item.sender_id === person.id)
      )
    );

    if (!connection?.id) {
      notify('Connection could not be found.');
      return;
    }

    const label = `${person.name || 'this person'} ${person.surname || ''}`.trim();
    if (!window.confirm(`Remove ${label} from your connections? Your chat history will not be deleted.`)) {
      return;
    }

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', connection.id)
      .eq('status', 'accepted');

    if (error) {
      notify(error.message);
      return;
    }

    setConnections(current =>
      current.filter(item => item.id !== connection.id)
    );

    notify(`${label} removed from your connections.`);
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
    setPostAttachment(null);

  }


  function closePostComposer() {

    if (sendingPost) {
      return;
    }

    setPostRecipient(null);
    setPostSubject('');
    setPostBody('');
    setPostAttachment(null);

  }


  function choosePrivatePostAttachment(event) {

    const file =
      event.currentTarget.files?.[0] || null;

    event.currentTarget.value = '';

    if (!file) {
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

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || '';

    const blockedExtensions = [
      'exe', 'msi', 'bat', 'cmd', 'com',
      'scr', 'ps1', 'sh', 'js', 'jar'
    ];

    if (blockedExtensions.includes(extension)) {
      notify('This file type is not allowed.');
      return;
    }

    setPostAttachment(file);
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
      (!body && !postAttachment) ||
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

    let attachmentPath = null;

    try {
      if (postAttachment) {
        const rawExtension =
          postAttachment.name
            .split('.')
            .pop()
            ?.toLowerCase() || '';

        const extension =
          rawExtension
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 12);

        const suffix =
          extension
            ? `.${extension}`
            : '';

        attachmentPath =
          `${postRecipient.id}/${profile.id}/${createBrowserSafeId()}${suffix}`;

        const {
          error: uploadError
        } = await supabase.storage
          .from('direct-post-attachments')
          .upload(
            attachmentPath,
            postAttachment,
            {
              cacheControl: '3600',
              contentType:
                postAttachment.type ||
                'application/octet-stream'
            }
          );

        if (uploadError) {
          throw uploadError;
        }
      }

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
          body,
          attachment_name:
            postAttachment?.name || null,
          attachment_path:
            attachmentPath,
          attachment_mime_type:
            postAttachment?.type || null,
          attachment_size:
            postAttachment?.size || null
        });

      if (error) {
        if (attachmentPath) {
          await supabase.storage
            .from('direct-post-attachments')
            .remove([attachmentPath]);
        }
        throw error;
      }

      notify(
        `Post sent to ${postRecipient.name || 'student'}.`
      );

      setPostRecipient(null);
      setPostSubject('');
      setPostBody('');
      setPostAttachment(null);

    } catch (error) {
      notify(
        error?.message ||
        'Could not send private post.'
      );
    } finally {
      setSendingPost(false);
    }
  }

  async function blockPerson(person) {
    if (!person?.id || blockingId) return;
    const label = `${person.name || 'this person'} ${person.surname || ''}`.trim();
    if (!window.confirm(`Block ${label}? You will become invisible to each other on OnStood.`)) return;
    setBlockingId(person.id);
    const { error } = await supabase.rpc('block_user', { p_user_id: person.id });
    setBlockingId(null);
    if (error) { notify(error.message); return; }
    setPeople(current => current.filter(item => item.id !== person.id));
    setConnections(current => current.filter(item => item.sender_id !== person.id && item.receiver_id !== person.id));
    setRequests(current => current.filter(item => item.sender_id !== person.id));
    setOutgoing(current => current.filter(item => item.receiver_id !== person.id));
    setSelectedPerson(null);
    notify(`${label} blocked.`);
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
      status === 'connected';


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
              onClick={() => cancelRequest(person.id)}
            >
              Cancel request
            </button>

          )}


          {status === 'connected' && (

            <>
              <button
                type="button"
                className="btn subtle"
                disabled
              >
                Connected ✓
              </button>

              <button
                type="button"
                className="btn subtle"
                onClick={() => unfriendPerson(person)}
              >
                Unfriend
              </button>
            </>

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
                ? 'Chat is available between accepted connections.'
                : `Chat with ${person.name || 'student'}${isOnline ? '' : ' (offline)'}`
            }
            onClick={() =>
              onOpenChat?.(
                person.id
              )
            }
          >
            <MessageCircle size={16} />

            {status === 'connected'
              ? `Chat with ${person.name || 'student'}`
              : 'Chat unavailable'}
          </button>


          <button type="button" className="btn subtle" disabled={blockingId === person.id} onClick={() => blockPerson(person)} style={{ color: '#b91c1c' }}>
            {blockingId === person.id ? 'Blocking…' : `Block ${person.name || 'person'}`}
          </button>
          <span className="muted" style={{ width: '100%', fontSize: 12 }}>Messages are delivered even when a connection is offline.</span>

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
          : 'My connections'
      }

      action={null}
    >


      {/* =====================================================
          PUBLIC PROFILE
          ===================================================== */}

      {selectedPerson && (
        /*
         * Render the foreign profile inline instead of mounting the
         * locally-declared PublicProfile function as a React component.
         *
         * PublicProfile is declared inside Friends(), so every parent
         * re-render creates a new function identity. Selecting text opens
         * the global Copy / Ask AI toolbar in App, which re-renders Friends;
         * React then treated PublicProfile as a different component,
         * unmounted/remounted the whole foreign profile and destroyed the
         * browser text selection — visually looking like a page refresh.
         *
         * This renderer uses no hooks, so invoking it inline preserves the
         * existing UI/logic while keeping the profile DOM stable.
         */
        PublicProfile({
          person: selectedPerson
        })
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
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                flexWrap: 'wrap'
              }}
            >
              <label
                className="btn subtle"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: sendingPost
                    ? 'default'
                    : 'pointer'
                }}
              >
                <Paperclip size={15} />
                Attach document

                <input
                  type="file"
                  disabled={sendingPost}
                  onChange={
                    choosePrivatePostAttachment
                  }
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </label>

              {postAttachment && (
                <div
                  className="btn subtle"
                  style={{
                    cursor: 'default',
                    maxWidth: '100%'
                  }}
                >
                  <Paperclip size={14} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 300
                    }}
                  >
                    {postAttachment.name}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove attachment"
                    title="Remove attachment"
                    disabled={sendingPost}
                    onClick={() =>
                      setPostAttachment(null)
                    }
                    style={{
                      width: 24,
                      height: 24,
                      minWidth: 24
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>


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
                  (!postBody.trim() &&
                    !postAttachment)
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
          {requests.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <div className="section-heading">
                <div>
                  <h3 style={{ marginBottom: 2 }}>Friend requests</h3>
                  <small className="muted">{requests.length} new {requests.length === 1 ? 'request' : 'requests'}</small>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {requests.map(request => {
                  const person = people.find(item => item.id === request.sender_id);
                  if (!person) return null;
                  return (
                    <div key={request.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                      <button type="button" onClick={() => openProfile(person)} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}><Avatar profile={person} /></button>
                      <button type="button" onClick={() => openProfile(person)} style={{ border: 0, background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer', flex: 1 }}>
                        <b>{person.name || 'Student'} {person.surname || ''}</b>
                        <small className="muted" style={{ display: 'block' }}>{person.university || ''}{person.degree ? ` · ${person.degree}` : ''}</small>
                      </button>
                      <button type="button" className="btn primary" onClick={() => accept(request.id)}>Accept</button>
                      <button type="button" className="btn subtle" onClick={() => decline(request.id)}>Decline</button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <section>
            <div
              className="section-heading"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <div>
                <h3 style={{ marginBottom: 2 }}>
                  My connections
                </h3>
                <small className="muted">
                  {connectionProfiles.length}{' '}
                  {connectionProfiles.length === 1
                    ? 'connection'
                    : 'connections'}
                </small>
              </div>

              <div
                className="search-box onstood-network-list-search"
                style={{
                  marginLeft: 'auto'
                }}
              >
                <Search size={16} />
                <input
                  placeholder="Search this list…"
                  value={q}
                  onChange={event =>
                    setQ(event.target.value)
                  }
                  aria-label="Search my connections"
                />
              </div>
            </div>


            {loading ? (
              <div className="empty">
                Loading connections…
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="empty">
                {q.trim()
                  ? 'No connection matches your search.'
                  : 'You do not have any connections yet.'}
              </div>
            ) : (
              <div
                className="onstood-network-connection-list"
                style={{
                  display: 'grid',
                  gap: 8
                }}
              >
                {filteredConnections.map(
                  person => (
                    <button
                      type="button"
                      key={person.id}
                      className="card onstood-network-connection-row"
                      onClick={() =>
                        openProfile(person)
                      }
                      style={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns:
                          'auto minmax(0,1fr)',
                        gap: 12,
                        alignItems: 'center',
                        textAlign: 'left',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        border:
                          '1px solid rgba(15,23,42,.08)',
                        background: '#fff'
                      }}
                    >
                      <Avatar
                        profile={person}
                        size="md"
                        onImageClick={
                          setLargeAvatar
                        }
                      />

                      <div
                        style={{
                          minWidth: 0,
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(170px,1.15fr) minmax(180px,1fr) minmax(160px,.9fr)',
                          gap: 14,
                          alignItems: 'center'
                        }}
                        className="onstood-network-connection-fields"
                      >
                        <div
                          style={{
                            minWidth: 0
                          }}
                        >
                          <strong
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {person.name || ''}{' '}
                            {person.surname || ''}
                          </strong>
                        </div>

                        <div
                          className="muted"
                          style={{
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={
                            person.university || ''
                          }
                        >
                          {person.university ||
                            'University not specified'}
                        </div>

                        <div
                          className="muted"
                          style={{
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={
                            person.degree || ''
                          }
                        >
                          {person.degree ||
                            'Degree not specified'}
                        </div>
                      </div>
                    </button>
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
