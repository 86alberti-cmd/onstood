import React, { useEffect, useState } from 'react';
import { Mail, MessageCircle, Search, Send, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import { Page } from '../ui';
import { ProfileContentTabs } from '../profile/ProfileContent';

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
