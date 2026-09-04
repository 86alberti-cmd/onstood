import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';

export function OnlineConnections({
  profile,
  onlineUserIds = [],
  notify,
  onOpenChat,
  onClose
}) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedOffline, setCollapsedOffline] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadConnections() {
      setLoading(true);
      const { data: accepted, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

      if (error) {
        notify?.(error.message);
        if (active) setLoading(false);
        return;
      }

      const ids = [...new Set((accepted || []).map(item =>
        item.sender_id === profile.id ? item.receiver_id : item.sender_id
      ).filter(Boolean))];

      if (!ids.length) {
        if (active) { setConnections([]); setLoading(false); }
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id,name,surname,university,degree,avatar_url,avatar_visibility')
        .in('id', ids)
        .order('name');

      if (profilesError) notify?.(profilesError.message);
      else if (active) setConnections(profilesData || []);
      if (active) setLoading(false);
    }

    loadConnections();
    return () => { active = false; };
  }, [profile.id]);

  const onlineConnections = connections.filter(person => onlineUserIds.includes(person.id));
  const offlineConnections = connections.filter(person => !onlineUserIds.includes(person.id));

  function PersonRow({ person, online }) {
    return (
      <button
        type="button"
        className={`onstood-presence-person ${online ? 'is-online' : 'is-offline'}`}
        onClick={() => onOpenChat?.(person.id)}
        title={`Chat with ${person.name || 'student'}`}
      >
        <div className="onstood-presence-avatar">
          <Avatar profile={person} />
          <span className="onstood-presence-dot" aria-hidden="true" />
        </div>
        <div className="onstood-presence-copy">
          <b>{person.name || 'Student'} {person.surname || ''}</b>
          <small>{online ? 'Online now' : 'Offline · message anytime'}</small>
        </div>
        <span className="onstood-presence-chevron">›</span>
      </button>
    );
  }

  return (
    <div className="card onstood-presence-card">
      <div className="card-head onstood-presence-head">
        <div>
          <h3>Chat</h3>
          <small className="muted">You are online while this panel is open</small>
        </div>
        <div className="onstood-presence-head-actions">
          <span className="onstood-online-count">{onlineConnections.length}</span>
          <button type="button" className="onstood-presence-close" onClick={onClose} title="Close chat and go offline" aria-label="Close chat and go offline">
            <X size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty compact">Loading…</div>
      ) : connections.length === 0 ? (
        <div className="muted onstood-presence-empty">No connections yet.</div>
      ) : (
        <div className="onstood-presence-list">
          <div className="onstood-presence-section-title">
            <span><i className="onstood-status-pip online" /> Online</span>
            <b>{onlineConnections.length}</b>
          </div>
          {onlineConnections.length ? onlineConnections.map(person => (
            <PersonRow key={person.id} person={person} online />
          )) : <div className="onstood-presence-empty">No one is online right now.</div>}

          <button
            type="button"
            className="onstood-presence-section-title offline-toggle"
            onClick={() => setCollapsedOffline(value => !value)}
          >
            <span><i className="onstood-status-pip offline" /> Offline</span>
            <b>{offlineConnections.length} {collapsedOffline ? '＋' : '−'}</b>
          </button>
          {!collapsedOffline && offlineConnections.map(person => (
            <PersonRow key={person.id} person={person} online={false} />
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
