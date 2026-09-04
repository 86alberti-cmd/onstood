import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import {
  FileText,
  MessageCircle,
  Trash2,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../utils/formatters';
import Avatar from '../Avatar';
import PrivacyControl from '../PrivacyControl';
import Post from '../feed/Post';

export function ProfileMediaGallery({
  person,
  type = 'image',
  currentUser,
  notify
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
              knowledge_consent,
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

  async function updateMediaPrivacy(item, value) {
    if (!item || currentUser?.id !== person?.id) return;

    if (item.source === 'post' && item.post_id) {
      if (!['only_me', 'connections', 'public'].includes(value)) return;

      const { data, error } = await supabase
        .from('posts')
        .update({ audience: value })
        .eq('id', item.post_id)
        .eq('user_id', currentUser.id)
        .select('id,audience')
        .single();

      if (error) {
        notify?.(error.message);
        return;
      }

      setItems(current =>
        current.map(media =>
          media.source === 'post' && media.post_id === item.post_id
            ? { ...media, posts: { ...media.posts, audience: data.audience } }
            : media
        )
      );

      setViewer(current => current ? {
        ...current,
        items: current.items.map(media =>
          media.source === 'post' && media.post_id === item.post_id
            ? { ...media, posts: { ...media.posts, audience: data.audience } }
            : media
        )
      } : current);

      notify?.('Privacy updated.');
      return;
    }

    if (item.source === 'profile_picture' && item.id) {
      if (!['only_me', 'connections', 'public'].includes(value)) return;

      const { data, error } = await supabase
        .from('profile_picture_history')
        .update({ visibility: value })
        .eq('id', item.id)
        .eq('user_id', currentUser.id)
        .select('id,visibility')
        .single();

      if (error) {
        notify?.(error.message);
        return;
      }

      setItems(current =>
        current.map(media =>
          media.source === 'profile_picture' && media.id === item.id
            ? { ...media, visibility: data.visibility }
            : media
        )
      );

      setViewer(current => current ? {
        ...current,
        items: current.items.map(media =>
          media.source === 'profile_picture' && media.id === item.id
            ? { ...media, visibility: data.visibility }
            : media
        )
      } : current);

      notify?.('Privacy updated.');
    }
  }

  async function updateMediaKnowledge(item, enabled) {
    if (!item || item.source !== 'post' || !item.post_id || currentUser?.id !== person?.id) return;
    if (item.posts?.knowledge_consent && !enabled) {
      notify?.('This material is already part of ONSTOOD Knowledge. The contributed knowledge is retained.');
      return;
    }
    if (!enabled) return;
    const { data, error } = await supabase.from('posts').update({ knowledge_consent: true }).eq('id', item.post_id).eq('user_id', currentUser.id).select('id,knowledge_consent').single();
    if (error) { notify?.(error.message); return; }
    setItems(current => current.map(media => media.source === 'post' && media.post_id === item.post_id ? {...media,posts:{...media.posts,knowledge_consent:Boolean(data.knowledge_consent)}} : media));
    setViewer(current => current ? {...current,items:current.items.map(media => media.source === 'post' && media.post_id === item.post_id ? {...media,posts:{...media.posts,knowledge_consent:Boolean(data.knowledge_consent)}} : media)} : current);
    const { data: kd, error: ke } = await supabase.functions.invoke('onstood-knowledge-post-ingest',{body:{post_id:item.post_id,action:'ingest'}});
    if (ke || kd?.error) { notify?.(kd?.error || ke?.message || 'Could not update ONSTOOD Knowledge.'); return; }
    notify?.('Material contributed to ONSTOOD Knowledge.');
  }

  async function deleteMedia(item) {
    if (!item || currentUser?.id !== person?.id) return;

    if (item.source === 'post') {
      if (item.storage_path) {
        const { error: storageError } = await supabase.storage.from('post-media').remove([item.storage_path]);
        if (storageError) { notify?.(storageError.message); return; }
      }
      const { error } = await supabase.from('post_media').delete().eq('id', item.id).eq('owner_id', currentUser.id);
      if (error) { notify?.(error.message); return; }
    } else {
      const { error } = await supabase.from('profile_picture_history').delete().eq('id', item.id).eq('user_id', currentUser.id);
      if (error) { notify?.(error.message); return; }
      // Do not remove the avatar Storage object here: it may still be the active profile picture.
    }

    setItems(current => current.filter(media => !(media.source === item.source && media.id === item.id)));
    setViewer(null);
    setDeleteTarget(null);
    notify?.(item.media_type === 'video' ? 'Video deleted.' : 'Photo deleted.');
  }

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
          <div
            key={`${item.source}-${item.id}`}
            role="button"
            tabIndex={0}
            onClick={() => setViewer({ items, index })}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setViewer({ items, index }); }}
            style={{
              border: '1px solid rgba(148,163,184,.18)', padding: 0, aspectRatio: '1 / 1',
              overflow: 'hidden', borderRadius: 14, background: '#0f172a', cursor: 'zoom-in',
              position: 'relative', boxShadow: '0 8px 22px rgba(15,23,42,.10)'
            }}
          >
            {item.media_type === 'video' ? (
              <video src={item.signed_url} muted preload="metadata" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
            ) : (
              <img src={item.signed_url} alt={item.source === 'profile_picture' ? 'Profile picture' : 'Photo'} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
            )}

            {item.source === 'profile_picture' && (
              <span style={{position:'absolute',left:7,bottom:7,padding:'4px 7px',borderRadius:999,background:'rgba(15,23,42,.78)',color:'#fff',fontSize:11,fontWeight:700}}>Profile picture</span>
            )}

            {currentUser?.id === person?.id && (
              <div onClick={event => event.stopPropagation()} style={{position:'absolute',top:7,right:7,display:'flex',alignItems:'center',gap:4,padding:'4px 5px',borderRadius:10,background:'rgba(255,255,255,.94)',boxShadow:'0 8px 20px rgba(15,23,42,.18)'}}>
                <PrivacyControl
                  value={item.source === 'post' ? (item.posts?.audience || 'public') : (item.visibility || 'only_me')}
                  privateValue="only_me"
                  onChange={next => updateMediaPrivacy(item, next)}
                />
                {item.source === 'post' && (
                  <label className="onstood-owner-knowledge" title="Add to ONSTOOD Knowledge">
                    <input type="checkbox" checked={Boolean(item.posts?.knowledge_consent)} onChange={event => updateMediaKnowledge(item, event.target.checked)} /> K
                  </label>
                )}
                <button type="button" className="icon-btn" title="Delete" onClick={() => setDeleteTarget(item)} style={{width:28,height:28,minHeight:28}}><Trash2 size={13}/></button>
              </div>
            )}
          </div>
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

          {currentUser?.id === person?.id && (() => {
            const item = viewer.items[viewer.index];
            if (!item) return null;
            const value = item.source === 'post'
              ? (item.posts?.audience || 'public')
              : (item.visibility || 'only_me');
            return (
              <div
                onClick={event => event.stopPropagation()}
                style={{
                  position: 'fixed', top: 18, right: 72, padding: '5px 8px', borderRadius: 11,
                  background: 'rgba(255,255,255,.96)', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 12px 30px rgba(15,23,42,.18)'
                }}
              >
                <PrivacyControl value={value} privateValue="only_me" onChange={next => updateMediaPrivacy(item, next)} />
                {item.source === 'post' && (
                  <label className="onstood-owner-knowledge" title="Add this material to ONSTOOD Knowledge">
                    <input type="checkbox" checked={Boolean(item.posts?.knowledge_consent)} onChange={event => updateMediaKnowledge(item, event.target.checked)} /> Knowledge
                  </label>
                )}
                <button type="button" className="icon-btn" title={item.media_type === 'video' ? 'Delete video' : 'Delete photo'} onClick={() => setDeleteTarget(item)}><Trash2 size={15}/></button>
              </div>
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

      {deleteTarget && (
        <div className="onstood-owner-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <div className="card onstood-owner-modal">
            <h3>Delete this {deleteTarget.media_type === 'video' ? 'video' : 'photo'}?</h3>
            <p className="muted">Are you sure? This action cannot be undone. Knowledge already contributed to ONSTOOD is retained.</p>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button type="button" className="btn subtle" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="onstood-danger-button" onClick={() => deleteMedia(deleteTarget)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ProfileContentTabs({
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
            currentUser={viewer}
            notify={notify}
          />
        )}

        {tab === 'videos' && (
          <ProfileMediaGallery
            person={person}
            type="video"
            currentUser={viewer}
            notify={notify}
          />
        )}
      </div>
    </div>
  );
}

export function ProfileTimeline({
  viewer,
  person,
  connectionStatus,
  notify,
  onImageClick
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState({});
  const [likedByMe, setLikedByMe] = useState({});
  const [comments, setComments] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [commentLikedByMe, setCommentLikedByMe] = useState({});
  const [shares, setShares] = useState({});
  const [commentText, setCommentText] = useState({});
  const [shareTarget, setShareTarget] = useState(null);
  const [mailTarget, setMailTarget] = useState(null);
  const [connections, setConnections] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState(null);

  async function loadConnections() {
    if (!viewer?.id) return;
    const { data: accepted, error } = await supabase
      .from('friend_requests')
      .select('sender_id,receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${viewer.id},receiver_id.eq.${viewer.id}`);
    if (error) return console.error('Profile connections error:', error);
    const ids = [...new Set((accepted || []).map(row => row.sender_id === viewer.id ? row.receiver_id : row.sender_id))];
    if (!ids.length) return setConnections([]);
    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id,name,surname,university,degree,avatar_url')
      .in('id', ids)
      .order('name');
    if (!profilesError) setConnections(data || []);
  }

  async function loadTimeline() {
    if (!person?.id) return;
    setLoading(true);
    const [postsResult, docsResult] = await Promise.all([
      supabase.from('posts').select(`
        id,body,created_at,user_id,audience,knowledge_consent,shared_from_post_id,
        post_media (id,media_type,storage_path,mime_type,caption,sort_order,created_at)
      `).eq('user_id', person.id).order('created_at', { ascending: false }).limit(60),
      supabase.from('documents').select(`
        id,user_id,file_name,storage_path,mime_type,created_at,visibility,knowledge_consent,ai_opt_in
      `).eq('user_id', person.id).order('created_at', { ascending: false }).limit(40)
    ]);

    if (postsResult.error) console.error('Profile timeline posts error:', postsResult.error);
    if (docsResult.error) console.error('Profile timeline documents error:', docsResult.error);

    const signedPosts = await Promise.all((postsResult.data || []).map(async post => ({
      ...post,
      profiles: person,
      post_media: await Promise.all((post.post_media || []).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(async media => {
        const { data } = await supabase.storage.from('post-media').createSignedUrl(media.storage_path, 60 * 60);
        return { ...media, signed_url: data?.signedUrl || null };
      }))
    })));

    const docsWithLinks = await Promise.all((docsResult.data || []).map(async document => {
      const { data } = document.storage_path
        ? await supabase.storage.from('student-documents').createSignedUrl(document.storage_path, 300)
        : { data: null };
      return { ...document, signed_url: data?.signedUrl || null };
    }));

    const postIds = signedPosts.map(post => post.id);
    if (postIds.length) {
      const [likesResult, commentsResult, sharesResult] = await Promise.all([
        supabase.from('post_likes').select('post_id,user_id').in('post_id', postIds),
        supabase.from('post_comments').select(`id,post_id,user_id,body,parent_comment_id,created_at,edited_at,profiles(name,surname,avatar_url)`).in('post_id', postIds).order('created_at'),
        supabase.from('post_shares').select('post_id,user_id').in('post_id', postIds)
      ]);
      const commentIds = (commentsResult.data || []).map(row => row.id);
      const commentLikesResult = commentIds.length
        ? await supabase.from('comment_likes').select('comment_id,user_id').in('comment_id', commentIds)
        : { data: [], error: null };
      const commentLikeCounts = {}, commentMine = {};
      (commentLikesResult.data || []).forEach(row => {
        commentLikeCounts[row.comment_id] = (commentLikeCounts[row.comment_id] || 0) + 1;
        if (row.user_id === viewer?.id) commentMine[row.comment_id] = true;
      });
      const likeCounts = {}, mine = {}, commentMap = {}, shareCounts = {};
      (likesResult.data || []).forEach(row => {
        likeCounts[row.post_id] = (likeCounts[row.post_id] || 0) + 1;
        if (row.user_id === viewer?.id) mine[row.post_id] = true;
      });
      (commentsResult.data || []).forEach(row => {
        if (!commentMap[row.post_id]) commentMap[row.post_id] = [];
        commentMap[row.post_id].push(row);
      });
      (sharesResult.data || []).forEach(row => shareCounts[row.post_id] = (shareCounts[row.post_id] || 0) + 1);
      setLikes(likeCounts); setLikedByMe(mine); setComments(commentMap); setCommentLikes(commentLikeCounts); setCommentLikedByMe(commentMine); setShares(shareCounts);
    }

    setItems([
      ...signedPosts.map(data => ({ kind: 'post', id: `post-${data.id}`, created_at: data.created_at, data })),
      ...docsWithLinks.map(data => ({ kind: 'document', id: `document-${data.id}`, created_at: data.created_at, data }))
    ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));
    setLoading(false);
  }

  useEffect(() => { loadTimeline(); loadConnections(); }, [person?.id, viewer?.id, connectionStatus]);

  async function toggleLike(postId) {
    if (!viewer?.id) return;
    if (likedByMe[postId]) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', viewer.id);
      if (error) return notify?.(error.message);
      setLikedByMe(v => ({...v,[postId]:false})); setLikes(v => ({...v,[postId]:Math.max(0,(v[postId]||1)-1)}));
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: viewer.id });
      if (error) return notify?.(error.message);
      setLikedByMe(v => ({...v,[postId]:true})); setLikes(v => ({...v,[postId]:(v[postId]||0)+1}));
    }
  }

  async function addComment(postId) {
    const body = (commentText[postId] || '').trim();
    if (!body || !viewer?.id) return;
    const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: viewer.id, body }).select('id,post_id,user_id,body,parent_comment_id,created_at,edited_at').single();
    if (error) return notify?.(error.message);
    setComments(v => ({...v,[postId]:[...(v[postId]||[]),{...data,profiles:viewer}]}));
    setCommentText(v => ({...v,[postId]:''}));
  }

  async function replyToComment(postId, parentComment, body) {
    const cleanBody = String(body || '').trim();
    if (!cleanBody || !viewer?.id || !parentComment?.id) return;
    const { data, error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: viewer.id,
      parent_comment_id: parentComment.id,
      body: cleanBody
    }).select('id,post_id,user_id,body,parent_comment_id,created_at,edited_at').single();
    if (error) return notify?.(error.message);
    setComments(v => ({...v,[postId]:[...(v[postId]||[]),{...data,profiles:viewer}]}));
  }

  async function toggleCommentLike(comment) {
    if (!viewer?.id || !comment?.id) return;
    const liked = Boolean(commentLikedByMe[comment.id]);
    if (liked) {
      const { error } = await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', viewer.id);
      if (error) return notify?.(error.message);
      setCommentLikedByMe(v => ({...v,[comment.id]:false}));
      setCommentLikes(v => ({...v,[comment.id]:Math.max(0,Number(v[comment.id]||1)-1)}));
      return;
    }
    const { error } = await supabase.from('comment_likes').insert({comment_id:comment.id,user_id:viewer.id});
    if (error) return notify?.(error.message);
    setCommentLikedByMe(v => ({...v,[comment.id]:true}));
    setCommentLikes(v => ({...v,[comment.id]:Number(v[comment.id]||0)+1}));
  }

  async function editComment(postId, comment, body) {
    const cleanBody = String(body || '').trim();
    if (!viewer?.id || !comment?.id || comment.user_id !== viewer.id || !cleanBody) return false;
    const editedAt = new Date().toISOString();
    const { data, error } = await supabase.from('post_comments')
      .update({body:cleanBody,edited_at:editedAt})
      .eq('id',comment.id).eq('user_id',viewer.id)
      .select('id,body,edited_at').single();
    if (error) { notify?.(error.message); return false; }
    setComments(v => ({...v,[postId]:(v[postId]||[]).map(row => row.id === comment.id ? {...row,body:data.body,edited_at:data.edited_at} : row)}));
    notify?.('Comment updated.');
    return true;
  }

  async function deleteComment(postId, comment) {
    if (!comment?.id || comment.user_id !== viewer?.id) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', comment.id).eq('user_id', viewer.id);
    if (error) return notify?.(error.message);
    setComments(v => ({...v,[postId]:(v[postId]||[]).filter(row => row.id !== comment.id)}));
    notify?.('Comment deleted.');
  }

  async function changePostAudience(postId, audience) {
    if (viewer?.id !== person?.id || !['only_me','connections','public'].includes(audience)) return;
    const { data, error } = await supabase.from('posts').update({ audience }).eq('id', postId).eq('user_id', viewer.id).select('id,audience').single();
    if (error) return notify?.(error.message);
    setItems(v => v.map(item => item.kind === 'post' && item.data.id === postId ? {...item,data:{...item.data,audience:data.audience}} : item));
    notify?.('Privacy updated.');
  }

  async function updatePostKnowledge(post, enabled) {
    if (viewer?.id !== person?.id || !post?.id) return;
    if (post.knowledge_consent && !enabled) {
      notify?.('This post is already part of ONSTOOD Knowledge. The contributed knowledge is retained.');
      return;
    }
    if (!enabled) return;
    const { data, error } = await supabase.from('posts').update({ knowledge_consent: true }).eq('id', post.id).eq('user_id', viewer.id).select('id,knowledge_consent').single();
    if (error) return notify?.(error.message);
    setItems(v => v.map(item => item.kind === 'post' && item.data.id === post.id ? {...item,data:{...item.data,knowledge_consent:Boolean(data.knowledge_consent)}} : item));
    const { data: kd, error: ke } = await supabase.functions.invoke('onstood-knowledge-post-ingest',{body:{post_id:post.id,action:'ingest'}});
    if (ke || kd?.error) return notify?.(kd?.error || ke?.message || 'Could not update ONSTOOD Knowledge.');
    notify?.('Post contributed to ONSTOOD Knowledge.');
  }

  async function deletePost(postId) {
    if (viewer?.id !== person?.id) return;
    const item = items.find(row => row.kind === 'post' && row.data.id === postId);
    const paths = (item?.data?.post_media || []).map(m => m.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from('post-media').remove(paths);
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', viewer.id);
    if (error) return notify?.(error.message);
    setItems(v => v.filter(row => !(row.kind === 'post' && row.data.id === postId)));
    notify?.('Post deleted.');
  }

  async function sharePost(post, audience) {
    if (!viewer?.id) return;
    const authorName = `${post.profiles?.name || 'Student'} ${post.profiles?.surname || ''}`.trim();
    const { error } = await supabase.from('posts').insert({ user_id: viewer.id, body: `↻ Shared from ${authorName}\n\n${post.body || ''}`, audience, shared_from_post_id: post.id });
    if (error) return notify?.(error.message);
    const { error: trackError } = await supabase.from('post_shares').insert({ post_id: post.id, user_id: viewer.id, audience });
    if (!trackError) setShares(v => ({...v,[post.id]:(v[post.id]||0)+1}));
    setShareTarget(null); notify?.('Post shared.');
  }

  async function sendPostOffice(post) {
    if (!selectedConnectionId || !viewer?.id) return notify?.('Choose a connection first.');
    const { data: conversationId, error: ce } = await supabase.rpc('start_direct_conversation',{other_user_id:selectedConnectionId});
    if (ce) return notify?.(ce.message);
    const authorName = `${post.profiles?.name || 'Student'} ${post.profiles?.surname || ''}`.trim();
    const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: viewer.id, body: `Shared post from ${authorName}:\n\n${post.body || ''}`, message_type:'post', metadata:{kind:'shared_post',post_id:post.id,original_author:authorName} });
    if (error) return notify?.(error.message);
    setMailTarget(null); setSelectedConnectionId(''); notify?.('Post sent through Messages.');
  }

  async function updateDocumentPrivacy(documentId, visibility) {
    if (viewer?.id !== person?.id || !['private','connections','public'].includes(visibility)) return;
    const { data, error } = await supabase.from('documents').update({ visibility }).eq('id', documentId).eq('user_id', viewer.id).select('id,visibility').single();
    if (error) return notify?.(error.message);
    setItems(v => v.map(item => item.kind === 'document' && item.data.id === documentId ? {...item,data:{...item.data,visibility:data.visibility}} : item));
    notify?.('Privacy updated.');
  }

  async function updateDocumentKnowledge(document, enabled) {
    if (viewer?.id !== person?.id || !document?.id) return;
    if (document.knowledge_consent && !enabled) {
      notify?.('This document is already part of ONSTOOD Knowledge. The contributed knowledge is retained.');
      return;
    }
    if (!enabled) return;
    const { data, error } = await supabase.from('documents').update({ knowledge_consent:true, ai_opt_in:true }).eq('id',document.id).eq('user_id',viewer.id).select().single();
    if (error) return notify?.(error.message);
    setItems(v => v.map(item => item.kind === 'document' && item.data.id === document.id ? {...item,data:{...item.data,...data}} : item));
    const { data: kd, error: ke } = await supabase.functions.invoke('onstood-knowledge-ingest',{body:{document_id:document.id,action:'ingest'}});
    if (ke || kd?.error) return notify?.(kd?.error || ke?.message || 'Could not update ONSTOOD Knowledge.');
    notify?.('Document contributed to ONSTOOD Knowledge.');
  }

  async function deleteDocument(document) {
    if (viewer?.id !== person?.id || !document?.id) return;
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage.from('student-documents').remove([document.storage_path]);
      if (storageError) return notify?.(storageError.message);
    }
    const { error } = await supabase.from('documents').delete().eq('id',document.id).eq('user_id',viewer.id);
    if (error) return notify?.(error.message);
    setItems(v => v.filter(item => !(item.kind === 'document' && item.data.id === document.id)));
    setDocumentDeleteTarget(null); notify?.('Document deleted.');
  }

  if (loading) return <div className="empty" style={{marginTop:16}}>Loading Onstream…</div>;

  return <div className="onstood-profile-stream" style={{marginTop:22}}>
    <div className="section-heading" style={{marginBottom:14}}><div>
      <span className="eyebrow dark">ONSTREAM</span>
      <h3 style={{marginTop:4}}>Posts & shared materials</h3>
      <small className="muted">The same social post experience as News Feed, filtered by allowed privacy.</small>
    </div></div>

    {!items.length ? <div className="empty compact">No Onstream items are visible to you.</div> :
      <div style={{display:'grid',gap:16}}>{items.map(item => {
        if (item.kind === 'post') {
          const post = item.data;
          return <Post key={item.id} post={post} profile={viewer}
            likeCount={likes[post.id]||0} liked={Boolean(likedByMe[post.id])}
            comments={comments[post.id]||[]} shareCount={shares[post.id]||0}
            commentValue={commentText[post.id]||''}
            setCommentValue={value=>setCommentText(v=>({...v,[post.id]:value}))}
            onLike={()=>toggleLike(post.id)} onComment={()=>addComment(post.id)}
            onShare={()=>setShareTarget(post)} onPostOffice={()=>{setMailTarget(post);setSelectedConnectionId('');}}
            onDelete={()=>deletePost(post.id)} onOpenProfile={()=>{}}
            onAudienceChange={audience=>changePostAudience(post.id,audience)}
            onKnowledgeChange={enabled=>updatePostKnowledge(post,enabled)}
            onDeleteComment={comment=>deleteComment(post.id,comment)}
            onEditComment={(comment,body)=>editComment(post.id,comment,body)}
            commentLikeCounts={commentLikes}
            commentLikedByMe={commentLikedByMe}
            onToggleCommentLike={toggleCommentLike}
            onReplyComment={(comment, body)=>replyToComment(post.id,comment,body)} />;
        }
        const document = item.data;
        const isImage = String(document.mime_type||'').startsWith('image/');
        return <article key={item.id} className="card onstood-profile-document-card" style={{padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}>
            <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0}}><FileText size={19}/><div style={{minWidth:0}}>
              <b style={{display:'block',overflow:'hidden',textOverflow:'ellipsis'}}>{document.file_name||'Shared document'}</b>
              <small className="muted">{fmtDate(document.created_at)}</small>
            </div></div>
            {viewer?.id===person?.id && <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
              <PrivacyControl value={document.visibility||'private'} privateValue="private" onChange={value=>updateDocumentPrivacy(document.id,value)}/>
              <label className="onstood-owner-knowledge" title="Add this material to ONSTOOD Knowledge"><input type="checkbox" checked={Boolean(document.knowledge_consent)} onChange={e=>updateDocumentKnowledge(document,e.target.checked)}/> Knowledge</label>
              <button type="button" className="icon-btn" title="Delete document" onClick={()=>setDocumentDeleteTarget(document)}><Trash2 size={15}/></button>
            </div>}
          </div>
          {isImage && document.signed_url && <img src={document.signed_url} alt={document.file_name||'Shared image'} onClick={()=>onImageClick?.(document.signed_url)} style={{display:'block',width:'100%',maxHeight:520,objectFit:'contain',borderRadius:14,marginTop:12,cursor:'zoom-in',background:'rgba(15,23,42,.03)'}}/>}
          {!isImage && document.signed_url && <button type="button" className="btn subtle" style={{marginTop:12}} onClick={()=>window.open(document.signed_url,'_blank','noopener,noreferrer')}><FileText size={15}/> Open document</button>}
        </article>;
      })}</div>}

    {shareTarget && <div className="onstood-owner-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShareTarget(null)}}><div className="card onstood-owner-modal">
      <h3>Share post</h3><p className="muted">Choose who can see your shared copy.</p><div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
        <button className="btn subtle" onClick={()=>setShareTarget(null)}>Cancel</button>
        <button className="btn subtle" onClick={()=>sharePost(shareTarget,'connections')}>Connections</button>
        <button className="btn primary" onClick={()=>sharePost(shareTarget,'public')}>Public</button>
      </div></div></div>}

    {mailTarget && <div className="onstood-owner-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setMailTarget(null)}}><div className="card onstood-owner-modal">
      <h3>Send through Messages</h3><select value={selectedConnectionId} onChange={e=>setSelectedConnectionId(e.target.value)} style={{width:'100%',margin:'10px 0 16px'}}><option value="">Choose a connection…</option>{connections.map(c=><option key={c.id} value={c.id}>{`${c.name||''} ${c.surname||''}`.trim()}</option>)}</select>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn subtle" onClick={()=>setMailTarget(null)}>Cancel</button><button className="btn primary" onClick={()=>sendPostOffice(mailTarget)}>Send</button></div>
    </div></div>}

    {documentDeleteTarget && <div className="onstood-owner-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDocumentDeleteTarget(null)}}><div className="card onstood-owner-modal">
      <h3>Delete this document?</h3><p className="muted">Are you sure you want to delete this document? This action cannot be undone. Knowledge already contributed to ONSTOOD remains in the Knowledge base.</p>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn subtle" onClick={()=>setDocumentDeleteTarget(null)}>Cancel</button><button className="onstood-danger-button" onClick={()=>deleteDocument(documentDeleteTarget)}>Delete</button></div>
    </div></div>}
  </div>;
}
