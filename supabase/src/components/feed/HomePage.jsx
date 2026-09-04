import React, { useEffect, useState } from 'react';
import { OnstoodRichText } from '../OnstoodRichText';
import OnstoodWordmark from '../OnstoodWordmark';
import {
  Mail,
  MessageCircle,
  Paperclip,
  Send,
  Sparkles,
  UserPlus,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import { Stat } from '../ui';
import Post from './Post';

function createBrowserSafeId() {
  const cryptoApi =
    typeof globalThis !== 'undefined'
      ? globalThis.crypto
      : null;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
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

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2)
  ].join('-');
}


function getFileExtension(fileName = '') {
  const match = String(fileName).toLowerCase().match(/\.([a-z0-9]{1,12})$/);
  return match ? match[1] : '';
}

function inferUploadMimeType(file) {
  const declared =
    String(file?.type || '')
      .trim()
      .toLowerCase();

  const ext =
    getFileExtension(file?.name);

  const mimeByExtension = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv'
  };

  // Gallery providers on Android sometimes return non-standard MIME aliases
  // (for example image/jpg) even when the file itself is a normal JPEG.
  // Prefer a known extension when available, then normalize common aliases.
  if (mimeByExtension[ext]) {
    return mimeByExtension[ext];
  }

  const normalizedDeclared =
    {
      'image/jpg': 'image/jpeg',
      'image/pjpeg': 'image/jpeg',
      'image/x-png': 'image/png',
      'video/x-m4v': 'video/mp4'
    }[declared] || declared;

  if (
    normalizedDeclared &&
    normalizedDeclared !== 'application/octet-stream'
  ) {
    return normalizedDeclared;
  }

  return 'application/octet-stream';
}

function inferPostMediaType(file) {
  const mime = inferUploadMimeType(file);
  const ext = getFileExtension(file?.name);

  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
  ) {
    return 'image';
  }

  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov'].includes(ext)
  ) {
    return 'video';
  }

  return 'document';
}


export default function HomePage({
  profile,
  go,
  notify,
  overview,
  overviewLoading,
  onOpenProfile,
  onAskAiMaterial,
  aiAccess,
  mobileTip = null,
  mobileTipVisible = false,
  onMobileTipToggle,
  onMobileTipPrevious,
  onMobileTipNext
}) {

  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(true);
  const [likes, setLikes] = useState({});
  const [likedByMe, setLikedByMe] = useState({});
  const [comments, setComments] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [commentLikedByMe, setCommentLikedByMe] = useState({});
  const [shares, setShares] = useState({});
  const [commentText, setCommentText] = useState({});
  const [connections, setConnections] = useState([]);
  const [peopleSuggestions, setPeopleSuggestions] = useState([]);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState(null);
  const [mailTarget, setMailTarget] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [shareBusy, setShareBusy] = useState(false);

  const [postFiles, setPostFiles] = useState([]);
  const [postAudience, setPostAudience] = useState('public');
  const [postKnowledgeConsent, setPostKnowledgeConsent] = useState(false);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [rightsModalOpen, setRightsModalOpen] = useState(false);
  const [rightsConfirmChecked, setRightsConfirmChecked] = useState(false);
  const [rightsBusy, setRightsBusy] = useState(false);
  const [pendingKnowledgeAction, setPendingKnowledgeAction] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  function hideOnstoodTip() {
    setTipVisible(false);

    try {
      localStorage.setItem(
        `onstood_tip_hidden_${profile?.id || 'guest'}`,
        new Date().toISOString().slice(0, 10)
      );
    } catch {}
  }

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


  useEffect(() => {
    if (!profile?.id) return;

    let active = true;

    (async () => {
      const { data } = await supabase
        .from('onstood_upload_declarations')
        .select('user_id,terms_version,accepted_at')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (active) {
        setRightsAccepted(Boolean(data?.user_id));
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.id]);


  function requestKnowledgePermission(action) {
    if (rightsAccepted) {
      action?.();
      return;
    }

    setPendingKnowledgeAction(() => action || null);
    setRightsConfirmChecked(false);
    setRightsModalOpen(true);
  }


  async function acceptContentRightsDeclaration() {
    if (!rightsConfirmChecked || !profile?.id || rightsBusy) {
      return;
    }

    setRightsBusy(true);

    const declarationText =
      'I confirm that I own this content or have the necessary rights or permission to upload and contribute it through ONSTOOD. I understand that I am responsible for the content I contribute.';

    const { error } = await supabase
      .from('onstood_upload_declarations')
      .upsert(
        {
          user_id: profile.id,
          terms_version: 'knowledge-rights-v1',
          declaration_text: declarationText,
          accepted_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    setRightsBusy(false);

    if (error) {
      notify(
        error.message ||
        'Could not save the content rights declaration.'
      );
      return;
    }

    setRightsAccepted(true);
    setRightsModalOpen(false);

    const action = pendingKnowledgeAction;
    setPendingKnowledgeAction(null);
    action?.();
  }


  function closeRightsDeclaration() {
    if (rightsBusy) return;
    setRightsModalOpen(false);
    setRightsConfirmChecked(false);
    setPendingKnowledgeAction(null);
  }



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




  async function loadPeopleSuggestions() {

    setSuggestionsLoading(true);

    const { data: relationshipRows, error: relationshipError } = await supabase
      .from('friend_requests')
      .select('sender_id,receiver_id,status')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

    if (relationshipError) {
      console.error('Home suggestions relationship error:', relationshipError);
      setSuggestionsLoading(false);
      return;
    }

    const excludedIds = new Set([profile.id]);
    const friendIds = [];
    (relationshipRows || []).forEach(item => {
      const otherId = item.sender_id === profile.id ? item.receiver_id : item.sender_id;
      if (item.status === 'accepted' || item.status === 'pending') excludedIds.add(otherId);
      if (item.status === 'accepted') friendIds.push(otherId);
    });

    let fofIds = new Set();
    if (friendIds.length) {
      const { data: fofRows, error: fofError } = await supabase
        .from('friend_requests')
        .select('sender_id,receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.in.(${friendIds.join(',')}),receiver_id.in.(${friendIds.join(',')})`);
      if (!fofError) {
        (fofRows || []).forEach(row => {
          if (friendIds.includes(row.sender_id) && !excludedIds.has(row.receiver_id)) fofIds.add(row.receiver_id);
          if (friendIds.includes(row.receiver_id) && !excludedIds.has(row.sender_id)) fofIds.add(row.sender_id);
        });
      }
    }

    const candidateIds = [...fofIds];
    let profileQuery = supabase.from('profiles').select(`id,name,surname,university,degree,avatar_url`).neq('id', profile.id).limit(150);
    const { data: profileRows, error: profileError } = await profileQuery;
    if (profileError) {
      console.error('Home suggestions profile error:', profileError);
      setSuggestionsLoading(false);
      return;
    }

    const candidates = (profileRows || []).filter(person => !excludedIds.has(person.id));
    const shuffle = list => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const fof = shuffle(candidates.filter(person => fofIds.has(person.id)));
    const myDegree = String(profile.degree || '').trim().toLowerCase();
    const sameDegree = shuffle(candidates.filter(person => !fofIds.has(person.id) && myDegree && String(person.degree || '').trim().toLowerCase() === myDegree));
    const other = shuffle(candidates.filter(person => !fofIds.has(person.id) && !sameDegree.some(match => match.id === person.id)));

    /* Target mix: ~90% friends-of-friends, ~10% same study degree.
       Only use general fallback when one of those pools cannot fill the list. */
    const target = Math.min(30, candidates.length);
    const fofTarget = Math.ceil(target * 0.9);
    const degreeTarget = Math.max(0, target - fofTarget);
    const selected = [...fof.slice(0, fofTarget), ...sameDegree.slice(0, degreeTarget)];
    const selectedIds = new Set(selected.map(item => item.id));
    const fallback = [...fof.slice(fofTarget), ...sameDegree.slice(degreeTarget), ...other].filter(item => !selectedIds.has(item.id));
    const mixed = shuffle([...selected, ...fallback.slice(0, Math.max(0, target - selected.length))]);

    setPeopleSuggestions(mixed);
    setSuggestionOffset(0);
    setSuggestionsLoading(false);
  }


  async function connectSuggestedPerson(
    personId
  ) {

    if (
      !personId ||
      personId === profile.id
    ) {
      return;
    }

    const {
      error
    } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: profile.id,
        receiver_id: personId
      });

    if (error) {
      notify(
        error.code === '23505'
          ? 'Request already sent.'
          : error.message
      );
      return;
    }

    setPeopleSuggestions(current =>
      current.filter(
        person =>
          person.id !== personId
      )
    );

    notify(
      'Connection request sent.'
    );
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
        knowledge_consent,
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
          parent_comment_id,
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

    const commentIds = (commentsResult.data || []).map(item => item.id);
    const commentLikesResult = commentIds.length
      ? await supabase.from('comment_likes').select('comment_id,user_id').in('comment_id', commentIds)
      : { data: [], error: null };

    if (commentLikesResult.error) {
      console.error('Comment likes error:', commentLikesResult.error);
    }

    const commentLikeCounts = {};
    const commentMine = {};
    (commentLikesResult.data || []).forEach(item => {
      commentLikeCounts[item.comment_id] = (commentLikeCounts[item.comment_id] || 0) + 1;
      if (item.user_id === profile.id) commentMine[item.comment_id] = true;
    });

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
    setCommentLikes(commentLikeCounts);
    setCommentLikedByMe(commentMine);
    setShares(shareCounts);
    setBusy(false);
  }


  useEffect(() => {
    loadFeed();
    loadConnections();
    loadPeopleSuggestions();
  }, [profile.id]);


  useEffect(() => {

    if (
      peopleSuggestions.length <= 1
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {

        setSuggestionOffset(
          current =>
            (
              current + 4
            ) %
            peopleSuggestions.length
        );

      }, 10000);

    return () =>
      window.clearInterval(timer);

  }, [peopleSuggestions.length]);


  function addPostFiles(fileList) {
    const incoming =
      Array.from(fileList || []);

    if (!incoming.length) {
      return;
    }

    setPostFiles(current => {
      const next = [
        ...current,
        ...incoming
      ];

      const unique = [];
      const seen = new Set();

      for (const file of next) {
        const key =
          `${file.name}:${file.size}:${file.lastModified}`;

        if (!seen.has(key)) {
          seen.add(key);
          unique.push(file);
        }
      }

      return unique.slice(0, 12);
    });

    setComposerOpen(true);
    setAttachMenuOpen(false);
  }


  function removePostFile(index) {
    setPostFiles(current =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    );
  }


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

    const invalid = files.find(file => {
      const extension =
        String(file.name || '')
          .split('.')
          .pop()
          ?.toLowerCase() || '';

      const inferredMime =
        inferUploadMimeType(file);

      const inferredMediaType =
        inferPostMediaType(file);

      const isImage =
        inferredMediaType === 'image';

      const isVideo =
        inferredMediaType === 'video';

      const isDocument =
        [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv'
        ].includes(inferredMime);

      return (
        blockedExtensions.includes(
          extension
        ) ||
        !(
          isImage ||
          isVideo ||
          isDocument
        )
      );
    });

    if (invalid) {
      notify(
        'Choose a photo, video, PDF, Word, Excel, PowerPoint, TXT or CSV file.'
      );
      return;
    }

    const oversized = files.find(file => {
      const isDocument =
        !file.type?.startsWith('image/') &&
        !file.type?.startsWith('video/');

      return file.size >
        (
          isDocument
            ? 25
            : 50
        ) *
        1024 *
        1024;
    });

    if (oversized) {
      notify(
        'Photos/videos may be up to 50 MB and documents up to 25 MB.'
      );
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
          audience: postAudience,
          knowledge_consent: postKnowledgeConsent
        })
        .select(`
          id,
          body,
          created_at,
          user_id,
          audience,
          knowledge_consent,
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
        const inferredMime =
          inferUploadMimeType(file);

        const mediaType =
          inferPostMediaType(file);

        const originalExt =
          getFileExtension(file.name)
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 12);

        const fallbackExt =
          mediaType === 'video'
            ? 'mp4'
            : mediaType === 'image'
              ? 'jpg'
              : 'bin';

        const ext =
          originalExt || fallbackExt;

        const path =
          `${profile.id}/${data.id}/${createBrowserSafeId()}.${ext}`;

        const { error: uploadError } =
          await supabase.storage
            .from('post-media')
            .upload(path, file, {
              contentType: inferredMime,
              upsert: false,
              cacheControl: '3600'
            });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(path);

        const { data: mediaData, error: mediaError } =
          await supabase
            .from('post_media')
            .insert({
              post_id: data.id,
              owner_id: profile.id,
              media_type: mediaType,
              storage_path: path,
              mime_type: inferredMime || null,
              caption: file.name || null,
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

      if (postKnowledgeConsent && body) {
        const {
          data: knowledgeData,
          error: knowledgeError
        } = await supabase.functions.invoke(
          'onstood-knowledge-post-ingest',
          {
            body: {
              post_id: data.id,
              action: 'ingest'
            }
          }
        );

        if (knowledgeError || knowledgeData?.error) {
          console.warn(
            'ONSTOOD Knowledge post indexing:',
            knowledgeData?.error || knowledgeError
          );
        }
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
      setPostKnowledgeConsent(false);
      setPostFiles([]);
      setPostAudience('public');
      setComposerOpen(false);
      setAttachMenuOpen(false);

      [
        'onstood-post-photo-input',
        'onstood-post-video-input',
        'onstood-post-document-input'
      ].forEach(id => {
        const input =
          document.getElementById(id);

        if (input) {
          input.value = '';
        }
      });

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

  async function editPost(post, body) {
    const cleanBody = String(body || '').trim();
    if (!post?.id || post.user_id !== profile.id) return false;

    const editedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('posts')
      .update({ body: cleanBody, edited_at: editedAt })
      .eq('id', post.id)
      .eq('user_id', profile.id)
      .select('id,body,edited_at')
      .single();

    if (error) {
      notify(error.message);
      return false;
    }

    setPosts(current =>
      current.map(item =>
        item.id === post.id
          ? { ...item, body: data.body, edited_at: data.edited_at }
          : item
      )
    );

    notify('Post updated.');
    return true;
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


  async function updatePostKnowledge(post, enabled) {
    if (!post?.id) return;

    // Knowledge is append-only: once contributed, the indexed knowledge is retained.
    if (post.knowledge_consent && !enabled) {
      notify('This post is already part of ONSTOOD Knowledge. The contributed knowledge is retained.');
      return;
    }

    const run = async () => {
      const { data, error } = await supabase
        .from('posts')
        .update({ knowledge_consent: enabled })
        .eq('id', post.id)
        .eq('user_id', profile.id)
        .select('id,knowledge_consent')
        .single();

      if (error) {
        notify(error.message);
        return;
      }

      setPosts(current =>
        current.map(item =>
          item.id === post.id
            ? {
                ...item,
                knowledge_consent:
                  Boolean(data.knowledge_consent)
              }
            : item
        )
      );

      const {
        data: knowledgeData,
        error: knowledgeError
      } = await supabase.functions.invoke(
        'onstood-knowledge-post-ingest',
        {
          body: {
            post_id: post.id,
            action: 'ingest'
          }
        }
      );

      if (knowledgeError || knowledgeData?.error) {
        notify(
          knowledgeData?.error ||
          knowledgeError?.message ||
          'Could not update ONSTOOD Knowledge.'
        );
        return;
      }

      notify(
        'Post contributed to ONSTOOD Knowledge.'
      );
    };

    if (enabled) {
      requestKnowledgePermission(run);
    } else {
      await run();
    }
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
      .select('id,post_id,user_id,body,parent_comment_id,created_at,edited_at')
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


  async function replyToComment(postId, parentComment, body) {
    const cleanBody = String(body || '').trim();
    if (!cleanBody || !parentComment?.id) return;

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        parent_comment_id: parentComment.id,
        body: cleanBody
      })
      .select('id,post_id,user_id,body,parent_comment_id,created_at,edited_at')
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setComments(current => ({
      ...current,
      [postId]: [...(current[postId] || []), { ...data, profiles: profile }]
    }));
  }

  async function toggleCommentLike(comment) {
    if (!comment?.id) return;
    const liked = Boolean(commentLikedByMe[comment.id]);

    if (liked) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', comment.id)
        .eq('user_id', profile.id);
      if (error) return notify(error.message);
      setCommentLikedByMe(current => ({ ...current, [comment.id]: false }));
      setCommentLikes(current => ({
        ...current,
        [comment.id]: Math.max(0, Number(current[comment.id] || 1) - 1)
      }));
      return;
    }

    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: comment.id, user_id: profile.id });
    if (error) return notify(error.message);
    setCommentLikedByMe(current => ({ ...current, [comment.id]: true }));
    setCommentLikes(current => ({
      ...current,
      [comment.id]: Number(current[comment.id] || 0) + 1
    }));
  }

  async function editComment(postId, comment, body) {
    const cleanBody = String(body || '').trim();
    if (!comment?.id || comment.user_id !== profile.id || !cleanBody) return false;

    const editedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('post_comments')
      .update({ body: cleanBody, edited_at: editedAt })
      .eq('id', comment.id)
      .eq('user_id', profile.id)
      .select('id,body,edited_at')
      .single();

    if (error) {
      notify(error.message);
      return false;
    }

    setComments(current => ({
      ...current,
      [postId]: (current[postId] || []).map(item =>
        item.id === comment.id ? { ...item, body: data.body, edited_at: data.edited_at } : item
      )
    }));
    notify('Comment updated.');
    return true;
  }

  async function deleteComment(postId, comment) {
    if (!comment?.id || comment.user_id !== profile.id) return;

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', comment.id)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setComments(current => ({
      ...current,
      [postId]: (current[postId] || []).filter(item => item.id !== comment.id)
    }));
    notify('Comment deleted.');
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


  const visiblePeopleSuggestions =
    peopleSuggestions.length
      ? Array.from(
          {
            length:
              Math.min(
                4,
                peopleSuggestions.length
              )
          },
          (_, index) =>
            peopleSuggestions[
              (
                suggestionOffset +
                index
              ) %
              peopleSuggestions.length
            ]
        )
      : [];


  const personalizedFeed =
    buildPersonalizedFeed();


  return (
    <>
      {rightsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeRightsDeclaration();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70000,
            background: 'rgba(15,23,42,.48)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            style={{
              width: 'min(540px, 100%)',
              padding: 22,
              boxShadow: '0 24px 70px rgba(15,23,42,.28)'
            }}
          >
            <small
              className="muted"
              style={{ fontWeight: 900 }}
            >
              <OnstoodWordmark /> KNOWLEDGE · CONTENT RIGHTS
            </small>

            <h3 style={{ margin: '6px 0 8px' }}>
              Confirm before contributing
            </h3>

            <p
              className="muted"
              style={{ lineHeight: 1.55 }}
            >
              <OnstoodWordmark /> Knowledge can help other students from
              contributed material. Only contribute content you own
              or have permission or legal rights to share.
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                padding: '12px 13px',
                borderRadius: 12,
                border: '1px solid rgba(99,102,241,.18)',
                background: rightsConfirmChecked
                  ? 'rgba(99,102,241,.06)'
                  : '#fff',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={rightsConfirmChecked}
                onChange={event =>
                  setRightsConfirmChecked(
                    event.target.checked
                  )
                }
                style={{ marginTop: 2 }}
              />
              <span>
                <b>I confirm I have the necessary rights.</b>
                <small
                  className="muted"
                  style={{
                    display: 'block',
                    marginTop: 3,
                    lineHeight: 1.45
                  }}
                >
                  I understand that I am responsible for material I
                  upload or contribute and must not contribute content
                  that I am not allowed to share.
                </small>
              </span>
            </label>

            <small
              className="muted"
              style={{
                display: 'block',
                marginTop: 11,
                lineHeight: 1.45
              }}
            >
              For answer generation, <OnstoodWordmark /> may send only small,
              relevant, privacy-filtered excerpts to its AI processing
              provider. Original files are not sent as a knowledge
              base and are not authorized for external AI
              training/indexing.
            </small>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 9,
                marginTop: 18
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={closeRightsDeclaration}
                disabled={rightsBusy}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={acceptContentRightsDeclaration}
                disabled={
                  rightsBusy ||
                  !rightsConfirmChecked
                }
              >
                {rightsBusy
                  ? 'Saving…'
                  : 'Confirm & continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={`hero onstood-home-welcome ${mobileTipVisible ? 'mobile-tip-active' : ''}`}>
        <div>
          <span className="eyebrow">
            WELCOME TO <OnstoodWordmark />
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
              Ask <OnstoodWordmark /> AI
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

      <section
        className="card onstood-home-people-suggestions"
        style={{
          padding: '12px 14px',
          marginTop: 12,
          marginBottom: 14,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 10,
            marginBottom: 10
          }}
        >
          <div>
            <strong>
              People you may know
            </strong>
            <small
              className="muted"
              style={{
                display: 'block',
                marginTop: 2
              }}
            >
              Suggestions refresh every 10 seconds
            </small>
          </div>
        </div>

        {suggestionsLoading ? (
          <div
            className="muted"
            style={{
              padding: '8px 0'
            }}
          >
            Finding students…
          </div>
        ) : visiblePeopleSuggestions.length === 0 ? (
          <div
            className="muted"
            style={{
              padding: '8px 0'
            }}
          >
            No new suggestions right now.
          </div>
        ) : (
          <div
            className="onstood-home-suggestion-row"
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, minmax(0,1fr))',
              gap: 9
            }}
          >
            {visiblePeopleSuggestions.map(
              person => (
                <div
                  key={person.id}
                  className="onstood-home-suggestion-item"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'auto minmax(0,1fr)',
                    gap: 9,
                    alignItems: 'center',
                    minWidth: 0,
                    padding: '9px 10px',
                    border:
                      '1px solid rgba(15,23,42,.08)',
                    borderRadius: 12,
                    background: '#fff'
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProfile?.(
                        person.id
                      )
                    }
                    aria-label={`Open ${person.name || 'student'} profile`}
                    style={{
                      border: 0,
                      background:
                        'transparent',
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  >
                    <Avatar
                      profile={person}
                      size="md"
                    />
                  </button>

                  <div
                    style={{
                      minWidth: 0
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onOpenProfile?.(
                          person.id
                        )
                      }
                      style={{
                        display: 'block',
                        width: '100%',
                        border: 0,
                        background:
                          'transparent',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 800,
                        overflow: 'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {person.name || ''}{' '}
                      {person.surname || ''}
                    </button>

                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap',
                        marginTop: 2
                      }}
                      title={
                        person.university || ''
                      }
                    >
                      {person.university ||
                        'University'}
                    </small>

                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap'
                      }}
                      title={
                        person.degree || ''
                      }
                    >
                      {person.degree ||
                        'Degree not specified'}
                    </small>

                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        connectSuggestedPerson(
                          person.id
                        )
                      }
                      style={{
                        minHeight: 30,
                        height: 30,
                        padding:
                          '0 9px',
                        marginTop: 7,
                        fontSize: 11
                      }}
                    >
                      <UserPlus size={13} />
                      Connect
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>


      {mobileTip && (
        <section className={`hero onstood-home-mobile-tip ${mobileTipVisible ? 'active' : ''}`}>
          <button type="button" className="onstood-mobile-tip-arrow" onClick={onMobileTipPrevious} aria-label="Previous tip">‹</button>
          <button type="button" className="onstood-mobile-tip-body" onClick={onMobileTipToggle}>
            <span className="eyebrow">{mobileTip.eyebrow}</span>
            <h3>{mobileTip.title}</h3>
            <p>{mobileTip.text}</p>
          </button>
          <button type="button" className="onstood-mobile-tip-arrow" onClick={onMobileTipNext} aria-label="Next tip">›</button>
        </section>
      )}

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
          label="My Library"
          value={
            overviewLoading
              ? '…'
              : overview.documents
          }
          onClick={() => go('docs')}
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
        className="feed-card card onstood-post-composer"
        style={{
          padding: 14
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'auto minmax(0,1fr)',
            gap: 10,
            alignItems: 'start'
          }}
        >
          <Avatar profile={profile} />

          <div
            style={{
              minWidth: 0
            }}
          >
            <textarea
              name="new-post"
              placeholder="Share a question, idea, photo, video or document…"
              value={text}
              onFocus={() =>
                setComposerOpen(true)
              }
              onChange={event => {
                setText(
                  event.target.value
                );
                setComposerOpen(true);
              }}
              style={{
                width: '100%',
                minHeight:
                  composerOpen
                    ? 72
                    : 52,
                maxHeight: 150,
                margin: 0,
                resize: 'vertical',
                borderRadius: 12,
                padding: '12px 14px'
              }}
            />

            {(composerOpen ||
              text.trim() ||
              postFiles.length > 0) && (
              <>
                {postFiles.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 8
                    }}
                  >
                    {postFiles.map(
                      (file, index) => {
                        const kind =
                          file.type?.startsWith(
                            'image/'
                          )
                            ? '📷'
                            : file.type?.startsWith(
                                'video/'
                              )
                              ? '🎬'
                              : '📄';

                        return (
                          <span
                            key={`${file.name}-${file.size}-${index}`}
                            className="chip"
                            style={{
                              display:
                                'inline-flex',
                              alignItems:
                                'center',
                              gap: 6,
                              maxWidth:
                                '100%'
                            }}
                          >
                            <span>
                              {kind}
                            </span>

                            <span
                              style={{
                                overflow:
                                  'hidden',
                                textOverflow:
                                  'ellipsis',
                                whiteSpace:
                                  'nowrap',
                                maxWidth:
                                  190
                              }}
                              title={file.name}
                            >
                              {file.name}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removePostFile(
                                  index
                                )
                              }
                              aria-label={`Remove ${file.name}`}
                              title="Remove attachment"
                              style={{
                                border: 0,
                                background:
                                  'transparent',
                                cursor:
                                  'pointer',
                                padding: 0,
                                lineHeight: 1
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      }
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 9,
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    style={{
                      position: 'relative'
                    }}
                  >
                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        setAttachMenuOpen(
                          current =>
                            !current
                        )
                      }
                      title="Attach a photo, video or document"
                      style={{
                        height: 40,
                        padding: '0 11px'
                      }}
                    >
                      <Paperclip
                        size={15}
                      />
                      Attach
                    </button>

                    {attachMenuOpen && (
                      <div
                        className="card"
                        style={{
                          position:
                            'absolute',
                          left: 0,
                          bottom:
                            'calc(100% + 7px)',
                          zIndex: 15000,
                          width: 190,
                          padding: 6,
                          borderRadius: 14,
                          boxShadow:
                            '0 18px 44px rgba(15,23,42,.16)'
                        }}
                      >
                        <label
                          className="btn subtle"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            marginBottom: 4,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          📷 Photo
                          <input
                            id="onstood-post-photo-input"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={event => {
                              addPostFiles(event.currentTarget.files);
                              event.currentTarget.value = '';
                            }}
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

                        <label
                          className="btn subtle"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            marginBottom: 4,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          📸 Camera
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={event => {
                              addPostFiles(event.currentTarget.files);
                              event.currentTarget.value = '';
                            }}
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

                        <label
                          className="btn subtle"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            marginBottom: 4,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          🎬 Video
                          <input
                            id="onstood-post-video-input"
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            multiple
                            onChange={event => {
                              addPostFiles(event.currentTarget.files);
                              event.currentTarget.value = '';
                            }}
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

                        <label
                          className="btn subtle"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          📄 Document
                          <input
                            id="onstood-post-document-input"
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
                            multiple
                            onChange={event => {
                              addPostFiles(event.currentTarget.files);
                              event.currentTarget.value = '';
                            }}
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
                      </div>
                    )}
                  </div>

                  <select
                    value={postAudience}
                    onChange={event =>
                      setPostAudience(
                        event.target.value
                      )
                    }
                    title="Who can see this post?"
                    style={{
                      width: 132,
                      minWidth: 132,
                      height: 40,
                      margin: 0,
                      padding:
                        '0 30px 0 11px',
                      borderRadius: 10,
                      fontSize: 13
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

                  <label
                    title="Allow the study knowledge in this post to help other students inside ONSTOOD. This does not change who can see the original post."
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      minHeight: 40,
                      padding: '0 9px',
                      border: '1px solid rgba(99,102,241,.18)',
                      borderRadius: 10,
                      background: postKnowledgeConsent
                        ? 'rgba(99,102,241,.07)'
                        : '#fff',
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 800,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={postKnowledgeConsent}
                      onChange={event => {
                        const enabled =
                          event.target.checked;

                        if (!enabled) {
                          setPostKnowledgeConsent(false);
                          return;
                        }

                        requestKnowledgePermission(() =>
                          setPostKnowledgeConsent(true)
                        );
                      }}
                    />
                    <OnstoodWordmark /> Knowledge
                  </label>

                  <button
                    className="btn primary"
                    onClick={publish}
                    disabled={
                      publishing ||
                      (
                        !text.trim() &&
                        postFiles.length === 0
                      )
                    }
                    style={{
                      height: 40,
                      margin: 0,
                      padding: '0 15px'
                    }}
                  >
                    <Send size={16} />
                    {publishing
                      ? 'Posting…'
                      : 'Post'}
                  </button>
                </div>
              </>
            )}
          </div>
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
                        SUGGESTED BY <OnstoodWordmark /> AI
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
                        Click to explore with <OnstoodWordmark /> AI
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
                            ASK <OnstoodWordmark /> AI
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
                            ASK ADVANCED <OnstoodWordmark /> AI
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
                onEditPost={body => editPost(post, body)}
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
                onKnowledgeChange={enabled =>
                  updatePostKnowledge(
                    post,
                    enabled
                  )
                }
                onDeleteComment={comment =>
                  deleteComment(post.id, comment)
                }
                onEditComment={(comment, body) => editComment(post.id, comment, body)}
                commentLikeCounts={commentLikes}
                commentLikedByMe={commentLikedByMe}
                onToggleCommentLike={toggleCommentLike}
                onReplyComment={(comment, body) => replyToComment(post.id, comment, body)}
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
              visible across <OnstoodWordmark />.
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
