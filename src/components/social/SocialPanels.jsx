import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';

export function OnlineConnections({
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

export function SocialLayerPanel({ profile, viewingProfile, followingIds = [], onFollow, onUnfollow }) {
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
