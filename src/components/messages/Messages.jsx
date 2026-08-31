import React, { useEffect,
  useLayoutEffect, useRef, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { Mail, Paperclip, Search, Send, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../utils/formatters';
import Avatar from '../Avatar';
import { Page } from '../ui';



function prettyFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentKind(mimeType = '', fileName = '') {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(name)) return 'image';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  return 'document';
}

function SecureAttachmentPreview({
  bucket,
  storagePath,
  fileName,
  mimeType,
  size,
  notify,
  compact = false
}) {
  const [signedUrl, setSignedUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!bucket || !storagePath) {
      setPreviewLoading(false);
      return undefined;
    }

    setPreviewLoading(true);

    (async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 900);

      if (!active) return;

      if (error) {
        console.error('Attachment preview error:', error);
        setPreviewLoading(false);
        return;
      }

      setSignedUrl(data?.signedUrl || '');
      setPreviewLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [bucket, storagePath]);

  const kind = attachmentKind(mimeType, fileName);

  const openFile = () => {
    if (!signedUrl) {
      notify?.('The document preview is still loading.');
      return;
    }
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  if (previewLoading) {
    return (
      <div className="onstood-document-preview-card" style={{ marginTop: 8, padding: 12 }}>
        <small className="muted">Loading document preview…</small>
      </div>
    );
  }

  if (kind === 'image' && signedUrl) {
    return (
      <div className="onstood-document-preview-card" style={{ marginTop: 8, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={openFile}
          style={{
            display: 'block',
            width: '100%',
            padding: 0,
            border: 0,
            background: '#f8fafc',
            cursor: 'zoom-in'
          }}
          title="Open full attachment"
        >
          <img
            src={signedUrl}
            alt={fileName || 'Attachment'}
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              maxHeight: compact ? 260 : 380,
              objectFit: 'contain',
              background: '#f8fafc'
            }}
          />
        </button>

        <div className="onstood-document-preview-footer">
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 700
            }}
          >
            {fileName || 'Image'}
          </span>
          <button type="button" className="btn subtle" onClick={openFile}>
            Open
          </button>
        </div>
      </div>
    );
  }

  if (kind === 'pdf' && signedUrl) {
    return (
      <div className="onstood-document-preview-card" style={{ marginTop: 8, overflow: 'hidden' }}>
        <div className="onstood-pdf-preview-shell">
          <iframe
            src={`${signedUrl}#toolbar=0&navpanes=0&view=FitH`}
            title={fileName || 'PDF preview'}
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              height: compact ? 250 : 340,
              border: 0,
              background: '#f8fafc'
            }}
          />
        </div>

        <div className="onstood-document-preview-footer">
          <div style={{ minWidth: 0 }}>
            <strong
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {fileName || 'PDF document'}
            </strong>
            <small className="muted">
              PDF{size ? ` · ${prettyFileSize(size)}` : ''}
            </small>
          </div>
          <button type="button" className="btn subtle" onClick={openFile}>
            Open
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onstood-document-preview-card" style={{ marginTop: 8, padding: 13 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '46px minmax(0,1fr) auto',
          gap: 11,
          alignItems: 'center'
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 46,
            height: 56,
            borderRadius: 10,
            background: 'linear-gradient(180deg,#eff6ff,#e0e7ff)',
            border: '1px solid rgba(37,99,235,.14)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            color: '#1d4ed8',
            fontSize: 12
          }}
        >
          DOC
        </div>

        <div style={{ minWidth: 0 }}>
          <strong
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={fileName || ''}
          >
            {fileName || 'Attached document'}
          </strong>
          <small className="muted" style={{ display: 'block', marginTop: 3 }}>
            {mimeType
              ? String(mimeType).split('/').pop()?.toUpperCase()
              : 'DOCUMENT'}
            {size ? ` · ${prettyFileSize(size)}` : ''}
          </small>
          <small className="muted" style={{ display: 'block', marginTop: 3 }}>
            Tap Open to view the full document.
          </small>
        </div>

        <button
          type="button"
          className="btn subtle"
          onClick={openFile}
          disabled={!signedUrl}
        >
          Open
        </button>
      </div>
    </div>
  );
}

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


function DirectPostsPanel({
  profile,
  notify
}) {

  const [posts, setPosts] =
    useState([]);

  const [peopleById, setPeopleById] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [selectedPrivateUserId, setSelectedPrivateUserId] =
    useState(null);

  const privateThreadEndRef =
    useRef(null);


  const [replyPost, setReplyPost] =
    useState(null);

  const [replyBody, setReplyBody] =
    useState('');

  const [replyAttachment, setReplyAttachment] =
    useState(null);

  const [confirmAttachmentOnlyReply, setConfirmAttachmentOnlyReply] =
    useState(false);

  const [forwardPost, setForwardPost] =
    useState(null);

  const [forwardRecipientId, setForwardRecipientId] =
    useState('');

  const [forwardRecipients, setForwardRecipients] =
    useState([]);



  async function loadPosts() {

    setLoading(true);


    const {
      data,
      error
    } = await supabase
      .from('direct_posts')
      .select('*')
      .or(
        `sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(80);


    if (error) {

      notify(
        error.message
      );

      setLoading(false);
      return;
    }


    const rows =
      (data || [])
        .filter(item => {

          if (
            item.sender_id === profile.id &&
            item.sender_deleted_at
          ) {
            return false;
          }

          if (
            item.recipient_id === profile.id &&
            item.recipient_deleted_at
          ) {
            return false;
          }

          return true;
        });

    setPosts(
      rows
    );


    const ids =
      [
        ...new Set(
          rows
            .flatMap(item => [
              item.sender_id,
              item.recipient_id
            ])
            .filter(id =>
              id &&
              id !== profile.id
            )
        )
      ];


    if (ids.length > 0) {

      const {
        data: profilesData
      } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          avatar_url,
          avatar_visibility
        `)
        .in(
          'id',
          ids
        );


      const map = {};

      (profilesData || [])
        .forEach(person => {
          map[person.id] =
            person;
        });

      setPeopleById(
        map
      );

    } else {

      setPeopleById({});

    }


    const unreadIds =
      rows
        .filter(item =>
          item.recipient_id ===
            profile.id &&
          !item.read_at
        )
        .map(item =>
          item.id
        );


    if (
      unreadIds.length > 0
    ) {

      const readAt =
        new Date()
          .toISOString();

      const {
        error: readError
      } = await supabase
        .from('direct_posts')
        .update({
          read_at:
            readAt
        })
        .in(
          'id',
          unreadIds
        )
        .eq(
          'recipient_id',
          profile.id
        );


      if (!readError) {

        setPosts(current =>
          current.map(item =>
            unreadIds.includes(
              item.id
            )
              ? {
                  ...item,
                  read_at:
                    readAt
                }
              : item
          )
        );

      }

    }


    setLoading(false);

  }


  useEffect(() => {

    let active = true;

    loadPosts();


    const channel =
      supabase
        .channel(
          `direct-posts-${profile.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table:
              'direct_posts',
            filter:
              `recipient_id=eq.${profile.id}`
          },
          payload => {

            if (!active) {
              return;
            }

            setPosts(current => [
              payload.new,
              ...current
            ]);

          }
        )
        .subscribe();


    return () => {

      active = false;

      supabase.removeChannel(
        channel
      );

    };

  }, [profile.id]);



  async function loadForwardRecipients() {

    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        surname,
        university
      `)
      .neq(
        'id',
        profile.id
      )
      .order('name')
      .limit(100);


    if (error) {
      notify(error.message);
      return;
    }


    setForwardRecipients(
      data || []
    );

  }


  function beginReply(item) {

    setReplyPost(item);

    setReplyBody('');
    setReplyAttachment(null);

  }


  function chooseReplyAttachment(event) {

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

    setReplyAttachment(file);
  }


  function requestReplySend() {

    if (
      !replyBody.trim() &&
      !replyAttachment
    ) {
      return;
    }

    if (
      !replyBody.trim() &&
      replyAttachment
    ) {
      setConfirmAttachmentOnlyReply(true);
      return;
    }

    sendReply();
  }


  async function sendReply() {

    if (
      !replyPost ||
      (!replyBody.trim() &&
        !replyAttachment)
    ) {
      return;
    }

    const recipientId =
      replyPost.sender_id ===
        profile.id
        ? replyPost.recipient_id
        : replyPost.sender_id;

    const subject =
      replyPost.subject
        ? (
          replyPost.subject
            .toLowerCase()
            .startsWith('re:')
            ? replyPost.subject
            : `Re: ${replyPost.subject}`
        )
        : 'Re: Private post';

    let attachmentPath = null;

    try {
      if (replyAttachment) {
        const rawExtension =
          replyAttachment.name
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
          `${recipientId}/${profile.id}/${createBrowserSafeId()}${suffix}`;

        const {
          error: uploadError
        } = await supabase.storage
          .from('direct-post-attachments')
          .upload(
            attachmentPath,
            replyAttachment,
            {
              cacheControl: '3600',
              contentType:
                replyAttachment.type ||
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
            recipientId,
          subject,
          body:
            replyBody.trim(),
          attachment_name:
            replyAttachment?.name || null,
          attachment_path:
            attachmentPath,
          attachment_mime_type:
            replyAttachment?.type || null,
          attachment_size:
            replyAttachment?.size || null
        });

      if (error) {
        if (attachmentPath) {
          await supabase.storage
            .from('direct-post-attachments')
            .remove([attachmentPath]);
        }
        throw error;
      }

      setReplyPost(null);
      setReplyBody('');
      setReplyAttachment(null);
      setConfirmAttachmentOnlyReply(false);

      notify('Reply sent.');

      loadPosts();

    } catch (error) {
      notify(
        error?.message ||
        'Could not send reply.'
      );
    }
  }

  async function beginForward(item) {

    setForwardPost(item);
    setForwardRecipientId('');

    if (
      forwardRecipients.length === 0
    ) {
      await loadForwardRecipients();
    }

  }


  async function sendForward() {

    if (
      !forwardPost ||
      !forwardRecipientId
    ) {
      return;
    }


    const subject =
      forwardPost.subject
        ? (
          forwardPost.subject
            .toLowerCase()
            .startsWith('fwd:')
            ? forwardPost.subject
            : `Fwd: ${forwardPost.subject}`
        )
        : 'Fwd: Private post';


    const body =
      `Forwarded private post:\n\n${forwardPost.body || ''}`;


    const {
      error
    } = await supabase
      .from('direct_posts')
      .insert({
        sender_id:
          profile.id,
        recipient_id:
          forwardRecipientId,
        subject,
        body
      });


    if (error) {
      notify(error.message);
      return;
    }


    setForwardPost(null);
    setForwardRecipientId('');

    notify(
      'Private post forwarded.'
    );

    loadPosts();

  }


  async function openPrivatePostAttachment(
    item
  ) {

    if (!item?.attachment_path) {
      return;
    }

    const {
      data,
      error
    } = await supabase.storage
      .from('direct-post-attachments')
      .createSignedUrl(
        item.attachment_path,
        300
      );

    if (error) {
      notify(error.message);
      return;
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }


  async function deletePostForMe(postId) {

    const { error } = await supabase
      .rpc(
        'hide_direct_post_for_me',
        {
          p_post_id: postId
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setPosts(current =>
      current.filter(item =>
        item.id !== postId
      )
    );

    notify(
      'Post removed from your Messages.'
    );
  }


  const privateThreadsByUser = {};

  posts.forEach(item => {
    const otherId =
      item.sender_id === profile.id
        ? item.recipient_id
        : item.sender_id;

    if (!otherId) {
      return;
    }

    if (!privateThreadsByUser[otherId]) {
      privateThreadsByUser[otherId] = [];
    }

    privateThreadsByUser[otherId].push(item);
  });

  const privateThreadSummaries =
    Object.entries(privateThreadsByUser)
      .map(([userId, items]) => {
        const sorted =
          [...items].sort(
            (a, b) =>
              new Date(b.created_at) -
              new Date(a.created_at)
          );

        return {
          userId,
          latest: sorted[0],
          unreadCount:
            items.filter(item =>
              item.recipient_id === profile.id &&
              !item.read_at
            ).length
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latest.created_at) -
          new Date(a.latest.created_at)
      );

  const selectedPrivateThread =
    selectedPrivateUserId
      ? (
        privateThreadsByUser[
          selectedPrivateUserId
        ] || []
      )
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at) -
            new Date(b.created_at)
        )
      : [];

  useEffect(() => {
    if (
      !selectedPrivateUserId ||
      selectedPrivateThread.length === 0
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      privateThreadEndRef.current
        ?.scrollIntoView({
          behavior: 'auto',
          block: 'end'
        });
    });
  }, [
    selectedPrivateUserId
  ]);


  return (

    <div
      className="card"
      style={{
        marginBottom: 18
      }}
    >

      <div
        className="card-head"
      >
        <div>
          <h3>
            Private posts
          </h3>

          <small className="muted">
            Asynchronous communication — send now, read later.
          </small>
        </div>

        <Mail size={18} />
      </div>


      {loading ? (

        <div className="empty compact">
          Loading private posts…
        </div>

      ) : selectedPrivateUserId ? (

        <div>
          <button
            type="button"
            className="btn subtle"
            onClick={() =>
              setSelectedPrivateUserId(null)
            }
            style={{
              marginBottom: 12
            }}
          >
            ← Back to private posts
          </button>

          <div
            style={{
              maxHeight:
                'min(64vh, 620px)',
              overflowY: 'auto',
              display: 'grid',
              gap: 10,
              paddingRight: 2
            }}
          >
            {selectedPrivateThread.map(item => {

              const incoming =
                item.recipient_id ===
                  profile.id;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent:
                      incoming
                        ? 'flex-start'
                        : 'flex-end'
                  }}
                >
                  <div
                    style={{
                      width:
                        'min(88%, 680px)',
                      border:
                        '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 14,
                      padding: 14,
                      background:
                        incoming
                          ? '#fff'
                          : 'rgba(37,99,235,0.07)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 10,
                        alignItems:
                          'baseline',
                        flexWrap: 'wrap'
                      }}
                    >
                      <b>
                        {incoming
                          ? 'Received'
                          : 'Sent'}
                      </b>

                      <small className="muted">
                        {fmtDate(item.created_at)}
                      </small>
                    </div>

                    {item.subject && (
                      <div
                        style={{
                          marginTop: 6,
                          fontWeight: 700
                        }}
                      >
                        {item.subject}
                      </div>
                    )}

                    {item.body && (
                      <div
                        style={{
                          marginTop: 6,
                          whiteSpace:
                            'pre-wrap',
                          overflowWrap:
                            'anywhere'
                        }}
                      >
                        {item.body}
                      </div>
                    )}

                    {item.attachment_path && (
                      <SecureAttachmentPreview
                        bucket="direct-post-attachments"
                        storagePath={item.attachment_path}
                        fileName={item.attachment_name}
                        mimeType={item.attachment_mime_type}
                        size={item.attachment_size}
                        notify={notify}
                        compact
                      />
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 9
                      }}
                    >
                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          beginReply(item)
                        }
                        style={{
                          padding:
                            '6px 9px',
                          fontSize: 11
                        }}
                      >
                        Reply
                      </button>

                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          beginForward(item)
                        }
                        style={{
                          padding:
                            '6px 9px',
                          fontSize: 11
                        }}
                      >
                        Forward
                      </button>

                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          deletePostForMe(
                            item.id
                          )
                        }
                        style={{
                          padding:
                            '6px 9px',
                          fontSize: 11
                        }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              ref={privateThreadEndRef}
            />
          </div>
        </div>

      ) : privateThreadSummaries.length === 0 ? (

        <div className="empty compact">
          No private posts yet.
        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 8
          }}
        >
          {privateThreadSummaries.map(
            thread => {

              const item =
                thread.latest;

              const otherId =
                thread.userId;

              const person =
                peopleById[
                  otherId
                ] || {};

              const incoming =
                item.recipient_id ===
                  profile.id;

              return (
                <button
                  type="button"
                  key={otherId}
                  onClick={() =>
                    setSelectedPrivateUserId(
                      otherId
                    )
                  }
                  style={{
                    width: '100%',
                    border:
                      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 14,
                    padding: 12,
                    background:
                      thread.unreadCount > 0
                        ? 'rgba(37,99,235,0.05)'
                        : '#fff',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <Avatar
                    profile={person}
                  />

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 8,
                        alignItems:
                          'baseline'
                      }}
                    >
                      <b>
                        {person.name ||
                          'Student'}{' '}
                        {person.surname ||
                          ''}
                      </b>

                      <small className="muted">
                        {fmtDate(
                          item.created_at
                        )}
                      </small>
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        overflow: 'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap',
                        fontSize: 13
                      }}
                    >
                      {incoming
                        ? ''
                        : 'You: '}
                      {item.body ||
                        item.attachment_name ||
                        item.subject ||
                        'Private post'}
                    </div>
                  </div>

                  {thread.unreadCount > 0 && (
                    <span
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: 999,
                        display:
                          'inline-grid',
                        placeItems:
                          'center',
                        background:
                          '#2563eb',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800
                      }}
                    >
                      {thread.unreadCount}
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>

      )}


      {replyPost && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setReplyPost(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
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
                'min(640px, 94vw)',
              padding: 20,
              boxSizing: 'border-box'
            }}
          >
            <span className="eyebrow dark">
              REPLY PRIVATE POST
            </span>

            <h3>
              {
                replyPost.subject
                  ? `Re: ${replyPost.subject.replace(/^Re:\s*/i, '')}`
                  : 'Reply'
              }
            </h3>

            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background:
                  'rgba(15,23,42,0.05)',
                marginBottom: 10,
                whiteSpace:
                  'pre-wrap'
              }}
            >
              {replyPost.body}
            </div>

            <textarea
              name="private-post-reply"
              placeholder="Write your reply…"
              value={replyBody}
              onChange={event =>
                setReplyBody(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                minHeight: 180,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 10
              }}
            >
              <label
                className="btn subtle"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Paperclip size={15} />
                Attach document

                <input
                  type="file"
                  onChange={
                    chooseReplyAttachment
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

              {replyAttachment && (
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
                      maxWidth: 320
                    }}
                  >
                    {replyAttachment.name}
                  </span>

                  <button
                    type="button"
                    className="icon-btn"
                    title="Remove attachment"
                    aria-label="Remove attachment"
                    onClick={() =>
                      setReplyAttachment(null)
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
                gap: 8,
                justifyContent:
                  'flex-end',
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() => {
                  setReplyPost(null);
                  setReplyAttachment(null);
                  setConfirmAttachmentOnlyReply(false);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  !replyBody.trim() &&
                  !replyAttachment
                }
                onClick={
                  requestReplySend
                }
              >
                Reply
              </button>
            </div>
          </div>
        </div>

      )}


      {confirmAttachmentOnlyReply && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send attachment without message"
          onClick={() =>
            setConfirmAttachmentOnlyReply(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12050,
            background:
              'rgba(15,23,42,0.58)',
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
                'min(430px, 94vw)',
              padding: 20,
              boxSizing:
                'border-box'
            }}
          >
            <h3
              style={{
                marginTop: 0
              }}
            >
              Send attachment without text?
            </h3>

            <p
              className="muted"
              style={{
                marginBottom: 18
              }}
            >
              Your reply has an attachment but no written message. Do you want to send it anyway?
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setConfirmAttachmentOnlyReply(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={
                  sendReply
                }
              >
                Yes, send
              </button>
            </div>
          </div>
        </div>
      )}


      {forwardPost && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setForwardPost(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
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
                'min(500px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              FORWARD PRIVATE POST
            </span>

            <h3>
              Choose recipient
            </h3>

            <select
              name="private-post-forward-recipient"
              value={
                forwardRecipientId
              }
              onChange={event =>
                setForwardRecipientId(
                  event.target.value
                )
              }
            >
              <option value="">
                Choose a person
              </option>

              {forwardRecipients.map(
                person => (
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
                )
              )}
            </select>

            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background:
                  'rgba(15,23,42,0.05)',
                marginTop: 10,
                whiteSpace:
                  'pre-wrap'
              }}
            >
              {forwardPost.body}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent:
                  'flex-end',
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setForwardPost(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  !forwardRecipientId
                }
                onClick={
                  sendForward
                }
              >
                Forward
              </button>
            </div>
          </div>
        </div>

      )}


    </div>

  );

}

export function PostOffice({
  profile,
  notify,
  requestedConversationId = null,
  requestedUserId = null,
  onConversationResolved,
  onMessagesRead,
  compact = false,
  onlineUserIds = [],
  onOpenMiniChat,
  onChatDeleted
}) {

  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [acceptedContactIds, setAcceptedContactIds] = useState(new Set());
  const [chatRequests, setChatRequests] = useState([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState(requestedConversationId || null);

  const [messages, setMessages] = useState([]);
  const [visibleMessageCount, setVisibleMessageCount] =
    useState(3);
  const messagesEndRef = useRef(null);
  const messageScrollRef = useRef(null);
  const keepChatPinnedToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const messageInputRef = useRef(null);
  const conversationCardRef = useRef(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatViewportReady, setChatViewportReady] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [typingUserIds, setTypingUserIds] = useState([]);
  const [memberReadAt, setMemberReadAt] = useState({});
  const [search, setSearch] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [requestTargetUserId, setRequestTargetUserId] = useState(null);
  const requestTargetUserIdRef = useRef(null);
  const chatRequestChannelIdRef = useRef(createBrowserSafeId());

  useEffect(() => {
    requestTargetUserIdRef.current = requestTargetUserId;
  }, [requestTargetUserId]);

  const [replyToMessage, setReplyToMessage] =
    useState(null);

  const [deleteChoiceMessage, setDeleteChoiceMessage] =
    useState(null);

  const [inboxTab, setInboxTab] =
    useState('chats');

  const [messageCategory, setMessageCategory] = useState('chat');

  const [conversationMenuOpen, setConversationMenuOpen] =
    useState(false);

  const [emojiOpen, setEmojiOpen] =
    useState(false);

  const [gifOpen, setGifOpen] =
    useState(false);

  const [gifUrl, setGifUrl] =
    useState('');

  const [reportOpen, setReportOpen] =
    useState(false);

  const [reportCategory, setReportCategory] =
    useState('harassment');

  const [reportDetails, setReportDetails] =
    useState('');


  const selectedConversation =
    conversations.find(item =>
      item.conversation_id === selectedConversationId
    ) || null;

  const otherUserId =
    selectedConversation?.other_user_id || null;

  const isOtherOnline =
    otherUserId &&
    onlineUserIds.includes(otherUserId);

  const otherIsTyping =
    otherUserId &&
    typingUserIds.includes(otherUserId);


  /* -------------------------------------------------------
     LOAD CONVERSATIONS + AVAILABLE CONNECTIONS
     ------------------------------------------------------- */

  useEffect(() => {
    setConversationMenuOpen(false);
    setEmojiOpen(false);
    setGifOpen(false);
    setVisibleMessageCount(3);
    previousMessageCountRef.current =
      0;
    keepChatPinnedToBottomRef.current =
      true;
  }, [selectedConversationId]);


  useEffect(() => {

    if (!selectedConversationId) {
      document.documentElement.style
        .removeProperty(
          '--onstood-mobile-chat-height'
        );
      return;
    }

    const viewport =
      window.visualViewport;

    function syncMobileChatHeight() {

      if (
        window.innerWidth > 760 ||
        !conversationCardRef.current
      ) {
        document.documentElement.style
          .removeProperty(
            '--onstood-mobile-chat-height'
          );
        return;
      }

      const viewportHeight =
        viewport?.height ||
        window.innerHeight;

      const top =
        conversationCardRef.current
          .getBoundingClientRect()
          .top;

      const visibleBottom =
        (viewport?.offsetTop || 0) +
        viewportHeight;

      const mobileBottomNavReserve =
        104;

      const available =
        Math.max(
          220,
          Math.floor(
            visibleBottom -
            top -
            mobileBottomNavReserve
          )
        );

      document.documentElement.style
        .setProperty(
          '--onstood-mobile-chat-height',
          `${available}px`
        );
    }

    syncMobileChatHeight();

    viewport?.addEventListener(
      'resize',
      syncMobileChatHeight
    );
    viewport?.addEventListener(
      'scroll',
      syncMobileChatHeight
    );
    window.addEventListener(
      'resize',
      syncMobileChatHeight
    );
    window.addEventListener(
      'orientationchange',
      syncMobileChatHeight
    );

    return () => {
      viewport?.removeEventListener(
        'resize',
        syncMobileChatHeight
      );
      viewport?.removeEventListener(
        'scroll',
        syncMobileChatHeight
      );
      window.removeEventListener(
        'resize',
        syncMobileChatHeight
      );
      window.removeEventListener(
        'orientationchange',
        syncMobileChatHeight
      );

      document.documentElement.style
        .removeProperty(
          '--onstood-mobile-chat-height'
        );
    };

  }, [
    selectedConversationId
  ]);






  useEffect(() => {

    const previousCount =
      previousMessageCountRef.current;

    previousMessageCountRef.current =
      messages.length;

    if (
      !selectedConversationId ||
      loadingMessages ||
      !chatViewportReady ||
      messages.length === 0 ||
      previousCount === 0 ||
      messages.length <=
        previousCount ||
      !keepChatPinnedToBottomRef.current
    ) {
      return;
    }

    const scroller =
      messageScrollRef.current;

    if (!scroller) {
      return;
    }

    /*
     * Only a genuinely new live message may keep the viewport at the
     * natural bottom. Initial conversation opening performs no scroll.
     */
    window.requestAnimationFrame(() => {
      scroller.scrollTop = 0;
    });

  }, [
    messages.length,
    selectedConversationId,
    loadingMessages,
    chatViewportReady
  ]);


  async function loadConversations() {

    const [
      conversationsResult,
      preferencesResult,
      membershipResult,
      labelsResult
    ] = await Promise.all([
      supabase.rpc('list_my_conversations'),

      supabase
        .from('conversation_preferences')
        .select(`
          conversation_id,
          inbox_bucket,
          starred,
          archived,
          label
        `)
        .eq('user_id', profile.id),

      supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          muted
        `)
        .eq('user_id', profile.id),

      supabase
        .from('conversation_labels')
        .select(`
          conversation_id,
          label
        `)
        .eq('user_id', profile.id)
    ]);

    if (conversationsResult.error) {
      notify(
        conversationsResult.error.message
      );
      return [];
    }

    const preferenceMap =
      Object.fromEntries(
        (preferencesResult.data || [])
          .map(item => [
            item.conversation_id,
            item
          ])
      );

    const membershipMap =
      Object.fromEntries(
        (membershipResult.data || [])
          .map(item => [
            item.conversation_id,
            item
          ])
      );

    const labelsMap = {};
    for (const item of labelsResult.data || []) {
      if (!labelsMap[item.conversation_id]) {
        labelsMap[item.conversation_id] = [];
      }
      labelsMap[item.conversation_id].push(item.label);
    }

    const rows =
      (conversationsResult.data || [])
        .map(item => ({
          ...item,
          inbox_bucket:
            preferenceMap[
              item.conversation_id
            ]?.inbox_bucket ||
            'chats',
          starred:
            Boolean(
              preferenceMap[
                item.conversation_id
              ]?.starred
            ),
          archived:
            Boolean(
              preferenceMap[
                item.conversation_id
              ]?.archived
            ),
          label:
            preferenceMap[
              item.conversation_id
            ]?.label ||
            null,
          labels:
            labelsMap[
              item.conversation_id
            ] || [],
          muted:
            Boolean(
              membershipMap[
                item.conversation_id
              ]?.muted
            )
        }));

    setConversations(rows);

    return rows;
  }

  async function loadContacts() {
    const [acceptedResult, profilesResult, requestsResult] = await Promise.all([
      supabase.from('friend_requests').select('sender_id,receiver_id').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`),
      supabase.from('profiles').select(`id,name,surname,university,degree,avatar_url,avatar_visibility`).neq('id', profile.id).order('name').limit(150),
      supabase.from('chat_requests').select('*').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order('created_at',{ascending:false})
    ]);
    if (acceptedResult.error) { notify(acceptedResult.error.message); return; }
    if (profilesResult.error) { notify(profilesResult.error.message); return; }
    if (requestsResult.error) { notify(requestsResult.error.message); return; }
    const ids = new Set((acceptedResult.data || []).map(item => item.sender_id === profile.id ? item.receiver_id : item.sender_id));
    setAcceptedContactIds(ids);
    setContacts(profilesResult.data || []);
    setChatRequests(requestsResult.data || []);
  }

  function chatRequestForUser(userId) {
    return chatRequests.find(item =>
      (item.sender_id === profile.id && item.receiver_id === userId) ||
      (item.receiver_id === profile.id && item.sender_id === userId)
    ) || null;
  }

  function canChatWithUser(userId) {
    return acceptedContactIds.has(userId) ||
      chatRequests.some(item =>
        item.status === 'accepted' &&
        (item.sender_id === userId || item.receiver_id === userId)
      );
  }

  async function requestOrStartConversation(userId) {
    if (!userId) return;

    const existingConversation = conversations.find(
      item => item.other_user_id === userId
    );

    setNewConversationOpen(false);
    setSearch('');

    if (!compact && typeof onOpenMiniChat === 'function') {
      onOpenMiniChat(
        userId,
        existingConversation?.conversation_id || null
      );
      return;
    }

    if (existingConversation) {
      setRequestTargetUserId(null);
      setSelectedConversationId(existingConversation.conversation_id);
      onConversationResolved?.(existingConversation.conversation_id);
      return;
    }

    if (canChatWithUser(userId)) {
      setRequestTargetUserId(null);
      await startConversation(userId);
      return;
    }

    // A non-connection opens the same chat shell, but no conversation
    // is created until the chat request is accepted.
    setSelectedConversationId(null);
    setRequestTargetUserId(userId);
  }

  async function sendChatRequestToTarget(userId) {
    if (!userId) return;
    const existing = chatRequestForUser(userId);
    if (existing?.status === 'pending') return;

    const { error } = await supabase.rpc('send_chat_request', { p_user_id: userId });
    if (error) { notify(error.message); return; }
    notify('Chat request sent.');
    await loadContacts();
  }

  async function respondChatRequest(requestId, accept) {
    const { data, error } = await supabase.rpc('respond_chat_request', { p_request_id: requestId, p_accept: accept });
    if (error) { notify(error.message); return; }
    await loadContacts();
    if (!accept) {
      setRequestTargetUserId(null);
      notify('Chat request declined.');
      return;
    }
    await loadConversations();
    notify('Chat request accepted.');
    if (data) {
      setRequestTargetUserId(null);
      const request = chatRequests.find(item => item.id === requestId);
      const otherId = request?.sender_id === profile.id ? request?.receiver_id : request?.sender_id;
      if (!compact && typeof onOpenMiniChat === 'function') onOpenMiniChat(otherId, data);
      else setSelectedConversationId(data);
    }
  }



  useEffect(() => {

    let active = true;

    async function initializePostOffice() {

      setLoading(true);

      const [rows] =
        await Promise.all([
          loadConversations(),
          loadContacts()
        ]);

      if (!active) {
        return;
      }

      if (
        requestedConversationId
      ) {

        setMessageCategory('chat');
        const requestedRow =
          rows.find(item =>
            item.conversation_id ===
              requestedConversationId
          );

        if (requestedRow) {
          setInboxTab(
            requestedRow.inbox_bucket ===
              'requests'
              ? 'requests'
              : 'chats'
          );

          setSelectedConversationId(
            requestedConversationId
          );
        }
      }

      setLoading(false);
    }

    initializePostOffice();

    return () => {
      active = false;
    };

  }, [profile.id]);


  useEffect(() => {
    const channel = supabase
      .channel(`chat-requests-${profile.id}-${chatRequestChannelIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests'
        },
        async payload => {
          const row = payload.new?.id ? payload.new : payload.old;
          if (!row) return;
          if (row.sender_id !== profile.id && row.receiver_id !== profile.id) return;

          await loadContacts();
          const rows = await loadConversations();

          const targetUserId = requestTargetUserIdRef.current;
          if (targetUserId) {
            const existing = rows.find(item => item.other_user_id === targetUserId);
            if (existing) {
              setRequestTargetUserId(null);
              setSelectedConversationId(existing.conversation_id);
              onConversationResolved?.(existing.conversation_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile.id]);


  /* -------------------------------------------------------
     START A DIRECT CONVERSATION
     ------------------------------------------------------- */

  async function startConversation(userId) {

    if (!userId || userId === profile.id) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .rpc(
        'start_direct_conversation',
        {
          other_user_id: userId
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    const conversationId = data;

    await loadConversations();

    setSelectedConversationId(
      conversationId
    );

    onConversationResolved?.(
      conversationId
    );
  }


  useEffect(() => {

    if (!requestedUserId || loading) {
      return;
    }

    const existingConversation = conversations.find(
      item => item.other_user_id === requestedUserId
    );

    if (existingConversation) {
      setRequestTargetUserId(null);
      setSelectedConversationId(existingConversation.conversation_id);
      return;
    }

    if (canChatWithUser(requestedUserId)) {
      setRequestTargetUserId(null);
      startConversation(requestedUserId);
      return;
    }

    // For non-friends the MiniChat opens as a request shell.
    setSelectedConversationId(null);
    setRequestTargetUserId(requestedUserId);

  }, [
    requestedUserId,
    loading,
    conversations,
    acceptedContactIds,
    chatRequests
  ]);


  useEffect(() => {

    if (!requestedConversationId) {
      return;
    }

    const requestedRow =
      conversations.find(item =>
        item.conversation_id ===
          requestedConversationId
      );

    /*
     * Desktop: requested chats belong in the original small
     * floating MiniChat next to Online connections — never as
     * a giant full-page conversation.
     *
     * Mobile: onOpenMiniChat is null, so the same conversation
     * continues to open in the full mobile chat screen.
     */
    if (
      !compact &&
      typeof onOpenMiniChat ===
        'function'
    ) {
      onOpenMiniChat(
        requestedRow?.other_user_id ||
          null,
        requestedConversationId
      );

      setSelectedConversationId(
        null
      );

      onConversationResolved?.(
        null
      );

      return;
    }

    if (requestedRow) {
      setInboxTab(
        requestedRow.inbox_bucket ===
          'requests'
          ? 'requests'
          : 'chats'
      );
    }

    if (
      requestedConversationId !==
        selectedConversationId
    ) {
      setSelectedConversationId(
        requestedConversationId
      );
    }

  }, [
    requestedConversationId,
    conversations,
    compact,
    onOpenMiniChat
  ]);



  /* -------------------------------------------------------
     LOAD + REALTIME MESSAGES
     ------------------------------------------------------- */

  useEffect(() => {

    if (!selectedConversationId) {
      setMessages([]);
      setMemberReadAt({});
      return;
    }

    let active = true;
    let typingTimer = null;

    async function loadMessages() {

      setLoadingMessages(true);

      const [
        messagesResult,
        deletionsResult
      ] = await Promise.all([

        supabase
          .from('messages')
          .select('*')
          .eq(
            'conversation_id',
            selectedConversationId
          )
          .order(
            'created_at',
            {
              ascending: true
            }
          )
          .limit(300),

        supabase
          .from('message_deletions')
          .select('message_id')
          .eq(
            'user_id',
            profile.id
          )

      ]);


      if (messagesResult.error) {

        notify(
          messagesResult.error.message
        );

      } else if (active) {

        const hiddenIds =
          new Set(
            (deletionsResult.data || [])
              .map(item =>
                item.message_id
              )
          );

        setMessages(
          (messagesResult.data || [])
            .filter(message =>
              !hiddenIds.has(
                message.id
              )
            )
        );

      }

      const {
        data: members
      } = await supabase
        .from('conversation_members')
        .select('user_id, last_read_at')
        .eq(
          'conversation_id',
          selectedConversationId
        );

      if (active) {

        const readMap = {};

        (members || []).forEach(member => {
          readMap[member.user_id] =
            member.last_read_at;
        });

        setMemberReadAt(
          readMap
        );
      }

      await markConversationRead(
        selectedConversationId
      );

      if (active) {
        setLoadingMessages(false);
      }
    }

    loadMessages();


    const channel =
      supabase
        .channel(
          `post-office-${selectedConversationId}`,
          {
            config: {
              broadcast: {
                self: false
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter:
              `conversation_id=eq.${selectedConversationId}`
          },
          payload => {

            const message =
              payload.new;

            setMessages(current => {

              if (
                current.some(item =>
                  item.id === message.id
                )
              ) {
                return current;
              }

              return [
                ...current,
                message
              ];
            });

            if (
              message.sender_id !==
              profile.id
            ) {
              markConversationRead(
                selectedConversationId
              );
            }

            loadConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter:
              `conversation_id=eq.${selectedConversationId}`
          },
          payload => {

            setMessages(current =>
              current.map(item =>
                item.id === payload.new.id
                  ? payload.new
                  : item
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_members',
            filter:
              `conversation_id=eq.${selectedConversationId}`
          },
          payload => {

            setMemberReadAt(current => ({
              ...current,
              [payload.new.user_id]:
                payload.new.last_read_at
            }));
          }
        )
        .on(
          'broadcast',
          {
            event: 'typing'
          },
          payload => {

            const userId =
              payload?.payload?.user_id;

            const typing =
              payload?.payload?.typing;

            if (
              !userId ||
              userId === profile.id
            ) {
              return;
            }

            setTypingUserIds(current => {

              const next =
                new Set(current);

              if (typing) {
                next.add(userId);
              } else {
                next.delete(userId);
              }

              return [...next];
            });

            if (typing) {

              window.clearTimeout(
                typingTimer
              );

              typingTimer =
                window.setTimeout(() => {

                  setTypingUserIds(
                    current =>
                      current.filter(
                        id =>
                          id !== userId
                      )
                  );

                }, 3500);
            }
          }
        )
        .subscribe();


    return () => {

      active = false;

      window.clearTimeout(
        typingTimer
      );

      supabase.removeChannel(
        channel
      );
    };

  }, [selectedConversationId, profile.id]);


  async function markConversationRead(
    conversationId
  ) {

    if (!conversationId) {
      return;
    }

    const readAt =
      new Date().toISOString();

    const {
      error
    } = await supabase
      .from('conversation_members')
      .update({
        last_read_at: readAt
      })
      .eq(
        'conversation_id',
        conversationId
      )
      .eq(
        'user_id',
        profile.id
      );

    if (!error) {

      onMessagesRead?.();

      setMemberReadAt(current => ({
        ...current,
        [profile.id]:
          readAt
      }));

      setConversations(current =>
        current.map(item =>
          item.conversation_id ===
          conversationId
            ? {
                ...item,
                my_last_read_at:
                  readAt,
                unread_count: 0
              }
            : item
        )
      );
    }
  }


  /* -------------------------------------------------------
     SEND TEXT MESSAGE
     ------------------------------------------------------- */

  async function sendMessage(
    event
  ) {

    event.preventDefault();

    const body =
      text.trim();

    if (
      !selectedConversationId ||
      !body ||
      sending
    ) {
      return;
    }



    if (body.length > 4000) {

      notify(
        'Messages can contain up to 4000 characters.'
      );

      return;
    }

    setSending(true);

    const {
      data,
      error
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          selectedConversationId,
        sender_id:
          profile.id,
        body,
        message_type:
          'text',
        metadata:
          replyToMessage
            ? {
                kind: 'reply',
                reply_to_message_id:
                  replyToMessage.id,
                reply_to_body:
                  replyToMessage.body,
                reply_to_sender_id:
                  replyToMessage.sender_id
              }
            : {}
      })
      .select()
      .single();

    if (error) {

      notify(
        error.message
      );

    } else {

      setText('');
    setReplyToMessage(null);

      setMessages(current => {

        if (
          current.some(item =>
            item.id === data.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          data
        ];
      });

      await markConversationRead(
        selectedConversationId
      );

      await loadConversations();
    }

    setSending(false);
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  }


  /* -------------------------------------------------------
     TYPING BROADCAST
     ------------------------------------------------------- */

  async function sendTyping(
    typing
  ) {

    if (!selectedConversationId) {
      return;
    }

    const channel =
      supabase
        .getChannels()
        .find(item =>
          item.topic ===
          `realtime:post-office-${selectedConversationId}`
        );

    if (!channel) {
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: profile.id,
        typing
      }
    });
  }


  function updateText(
    value
  ) {

    setText(value);

    sendTyping(
      value.trim().length > 0
    );
  }


  /* -------------------------------------------------------
     SECURE FILE ATTACHMENTS
     ------------------------------------------------------- */

  async function uploadAttachment(
    event
  ) {

    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (
      !file ||
      !selectedConversationId
    ) {
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

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || '';

    if (
      blockedExtensions.includes(
        extension
      )
    ) {

      notify(
        'This file type is not allowed.'
      );

      return;
    }

    setUploading(true);

    try {

      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );

      const storagePath =
        `${selectedConversationId}/${profile.id}/${createBrowserSafeId()}-${safeName}`;

      const {
        error: uploadError
      } = await supabase
        .storage
        .from(
          'message-attachments'
        )
        .upload(
          storagePath,
          file,
          {
            cacheControl: '3600',
            contentType: file.type
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data,
        error: messageError
      } = await supabase
        .from('messages')
        .insert({
          conversation_id:
            selectedConversationId,
          sender_id:
            profile.id,
          body: '',
          message_type:
            'file',
          metadata: {
            file_name:
              file.name,
            storage_path:
              storagePath,
            mime_type:
              file.type,
            size:
              file.size
          }
        })
        .select()
        .single();

      if (messageError) {

        await supabase
          .storage
          .from(
            'message-attachments'
          )
          .remove([
            storagePath
          ]);

        throw messageError;
      }

      setMessages(current => {

        if (
          current.some(item =>
            item.id === data.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          data
        ];
      });

      await loadConversations();

    } catch (error) {

      notify(
        error?.message ||
        'Could not send attachment.'
      );

    } finally {

      setUploading(false);
    }
  }


  async function openAttachment(
    message
  ) {

    const storagePath =
      message?.metadata
        ?.storage_path;

    if (!storagePath) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .storage
      .from(
        'message-attachments'
      )
      .createSignedUrl(
        storagePath,
        300
      );

    if (error) {

      notify(error.message);

      return;
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }


  /* -------------------------------------------------------
     SOFT DELETE OWN MESSAGE
     ------------------------------------------------------- */

  async function deleteMessageForMe(
    message
  ) {

    if (!message?.id) {
      return;
    }


    const {
      error
    } = await supabase
      .from('message_deletions')
      .insert({
        message_id:
          message.id,
        user_id:
          profile.id
      });


    if (
      error &&
      error.code !== '23505'
    ) {
      notify(error.message);
      return;
    }


    setMessages(current =>
      current.filter(item =>
        item.id !== message.id
      )
    );


    setDeleteChoiceMessage(null);

    notify(
      'Message deleted for you.'
    );

  }


  async function deleteMessageForEveryone(
    message
  ) {

    if (
      !message?.id ||
      message.sender_id !==
        profile.id
    ) {
      return;
    }


    const {
      error
    } = await supabase
      .from('messages')
      .update({
        body: '',
        deleted_at:
          new Date().toISOString(),
        metadata: {
          ...(message.metadata || {}),
          deleted_for_everyone:
            true
        }
      })
      .eq(
        'id',
        message.id
      )
      .eq(
        'sender_id',
        profile.id
      );


    if (error) {
      notify(error.message);
      return;
    }


    setMessages(current =>
      current.map(item =>
        item.id === message.id
          ? {
              ...item,
              body: '',
              deleted_at:
                new Date()
                  .toISOString(),
              metadata: {
                ...(item.metadata || {}),
                deleted_for_everyone:
                  true
              }
            }
          : item
      )
    );


    setDeleteChoiceMessage(null);

    notify(
      'Message deleted for everyone.'
    );

  }


  async function saveConversationPreference(
    conversationId,
    patch
  ) {

    if (!conversationId) {
      return;
    }

    const current =
      conversations.find(
        item =>
          item.conversation_id ===
          conversationId
      ) || {};

    const payload = {
      conversation_id:
        conversationId,
      user_id:
        profile.id,
      inbox_bucket:
        patch.inbox_bucket ??
        current.inbox_bucket ??
        'chats',
      starred:
        patch.starred ??
        Boolean(current.starred),
      archived:
        patch.archived ??
        Boolean(current.archived),
      label:
        patch.label !== undefined
          ? patch.label
          : current.label || null,
      updated_at:
        new Date().toISOString()
    };

    const { error } =
      await supabase
        .from(
          'conversation_preferences'
        )
        .upsert(
          payload,
          {
            onConflict:
              'conversation_id,user_id'
          }
        );

    if (error) {
      notify(error.message);
      return false;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        conversationId
          ? {
              ...item,
              ...payload
            }
          : item
      )
    );

    return true;
  }


  async function toggleConversationStar() {

    if (!selectedConversation) {
      return;
    }

    const next =
      !selectedConversation.starred;

    if (
      await saveConversationPreference(
        selectedConversationId,
        {
          starred: next
        }
      )
    ) {
      notify(
        next
          ? 'Conversation starred.'
          : 'Conversation unstarred.'
      );
    }

    setConversationMenuOpen(false);
  }


  async function toggleConversationMute() {

    if (!selectedConversationId) {
      return;
    }

    const next =
      !selectedConversation?.muted;

    const { error } =
      await supabase
        .from('conversation_members')
        .update({
          muted: next
        })
        .eq(
          'conversation_id',
          selectedConversationId
        )
        .eq(
          'user_id',
          profile.id
        );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        selectedConversationId
          ? {
              ...item,
              muted: next
            }
          : item
      )
    );

    notify(
      next
        ? 'Conversation muted.'
        : 'Conversation unmuted.'
    );

    setConversationMenuOpen(false);
  }


  async function markConversationUnread() {

    if (!selectedConversationId) {
      return;
    }

    const lastAt =
      selectedConversation
        ?.last_message_at;

    const unreadFrom =
      lastAt
        ? new Date(
            new Date(
              lastAt
            ).getTime() - 1
          ).toISOString()
        : null;

    const { error } =
      await supabase
        .from('conversation_members')
        .update({
          last_read_at:
            unreadFrom
        })
        .eq(
          'conversation_id',
          selectedConversationId
        )
        .eq(
          'user_id',
          profile.id
        );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        selectedConversationId
          ? {
              ...item,
              my_last_read_at:
                unreadFrom,
              unread_count:
                Math.max(
                  1,
                  Number(
                    item.unread_count ||
                    0
                  )
                )
            }
          : item
      )
    );

    notify(
      'Conversation marked unread.'
    );

    setConversationMenuOpen(false);
  }


  async function setConversationBucket(
    bucket
  ) {

    if (
      !selectedConversationId ||
      !['chats', 'requests']
        .includes(bucket)
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'set_conversation_inbox_bucket',
        {
          p_conversation_id:
            selectedConversationId,
          p_bucket: bucket
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item =>
        item.conversation_id ===
        selectedConversationId
          ? {
              ...item,
              inbox_bucket: bucket,
              archived: false
            }
          : item
      )
    );

    notify(
      bucket === 'requests'
        ? 'Moved to Requests.'
        : 'Moved to Chats.'
    );

    setInboxTab(bucket);
    setConversationMenuOpen(false);
  }

  async function toggleConversationLabel(
    label
  ) {

    if (!selectedConversationId) {
      return;
    }

    const currentLabels =
      selectedConversation?.labels || [];

    const enabled =
      !currentLabels.includes(label);

    const { error } =
      await supabase.rpc(
        'set_conversation_label',
        {
          p_conversation_id:
            selectedConversationId,
          p_label: label,
          p_enabled: enabled
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setConversations(currentRows =>
      currentRows.map(item => {
        if (
          item.conversation_id !==
          selectedConversationId
        ) {
          return item;
        }

        const labels =
          item.labels || [];

        return {
          ...item,
          labels: enabled
            ? [
                ...new Set([
                  ...labels,
                  label
                ])
              ]
            : labels.filter(
                itemLabel =>
                  itemLabel !== label
              )
        };
      })
    );

    notify(
      enabled
        ? `${label} label added.`
        : `${label} label removed.`
    );
  }

  function reportConversation() {
    if (
      !selectedConversationId ||
      !otherUserId
    ) {
      return;
    }

    setReportCategory(
      'harassment'
    );
    setReportDetails('');
    setReportOpen(true);
    setConversationMenuOpen(false);
  }


  async function submitConversationReport() {

    if (
      !selectedConversationId ||
      !otherUserId
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('moderation_reports')
        .insert({
          reporter_user_id:
            profile.id,
          target_type:
            'conversation',
          target_id:
            selectedConversationId,
          category:
            reportCategory,
          details:
            reportDetails.trim() ||
            `Conversation reported from ONSTOOD Messages. Reported user: ${otherUserId}.`
        });

    if (error) {
      notify(error.message);
      return;
    }

    setReportOpen(false);
    setReportDetails('');

    notify(
      'Report sent to ONSTOOD moderation.'
    );
  }


  function addEmoji(
    emoji
  ) {
    setText(current =>
      `${current}${emoji}`
    );
    setEmojiOpen(false);
    window.requestAnimationFrame(
      () =>
        messageInputRef.current
          ?.focus()
    );
  }


  async function sendGif() {

    const url =
      gifUrl.trim();

    if (
      !selectedConversationId ||
      !url
    ) {
      return;
    }

    let parsed;

    try {
      parsed =
        new URL(url);
    } catch {
      notify(
        'Paste a valid GIF URL.'
      );
      return;
    }

    if (
      parsed.protocol !== 'https:'
    ) {
      notify(
        'GIF links must use HTTPS.'
      );
      return;
    }

    setSending(true);

    const {
      data,
      error
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          selectedConversationId,
        sender_id:
          profile.id,
        body: '',
        message_type:
          'gif',
        metadata: {
          url
        }
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
    } else {
      setMessages(current => [
        ...current,
        data
      ]);
      setGifUrl('');
      setGifOpen(false);
      await loadConversations();
    }

    setSending(false);
  }


  async function deleteConversationForMe() {

    if (!selectedConversationId) {
      return;
    }

    const conversationId =
      selectedConversationId;

    const { error } = await supabase
      .rpc(
        'hide_conversation_for_me',
        {
          p_conversation_id:
            conversationId
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    setSelectedConversationId(null);
    setMessages([]);

    await loadConversations();

    notify(
      'Chat removed from your inbox.'
    );

    onChatDeleted?.(
      conversationId
    );
  }


  /* -------------------------------------------------------
     FILTERS + READ RECEIPT
     ------------------------------------------------------- */

  const searchText =
    search.trim().toLowerCase();

  const filteredConversations =
    conversations
      .filter(item => !item.archived && inboxTab === 'chats')
      .filter(item => {

        const haystack =
          `
          ${item.other_name || ''}
          ${item.other_surname || ''}
          ${item.other_university || ''}
          ${item.last_message_body || ''}
          ${item.label || ''}
          `.toLowerCase();

        return true;
      })
      .sort((a, b) => {
        if (
          Boolean(a.starred) !==
          Boolean(b.starred)
        ) {
          return a.starred
            ? -1
            : 1;
        }

        return (
          new Date(
            b.last_message_at ||
            b.updated_at ||
            0
          ) -
          new Date(
            a.last_message_at ||
            a.updated_at ||
            0
          )
        );
      });

  const availableContacts =
    newConversationOpen && searchText
      ? contacts.filter(contact =>
          `${contact.name || ''} ${contact.surname || ''} ${contact.university || ''} ${contact.degree || ''}`
            .toLowerCase()
            .includes(searchText)
        )
      : [];

  const requestTarget =
    requestTargetUserId
      ? contacts.find(contact => contact.id === requestTargetUserId) || null
      : null;

  const requestTargetChatRequest =
    requestTargetUserId
      ? chatRequestForUser(requestTargetUserId)
      : null;

  const lastOwnMessage =
    [...messages]
      .reverse()
      .find(message =>
        message.sender_id ===
          profile.id &&
        !message.deleted_at
      );

  const otherLastReadAt =
    otherUserId
      ? memberReadAt[
          otherUserId
        ]
      : null;

  const lastOwnMessageSeen =
    lastOwnMessage &&
    otherLastReadAt &&
    new Date(otherLastReadAt) >=
      new Date(
        lastOwnMessage.created_at
      );



  const visibleChatMessages =
    messages.slice(
      -visibleMessageCount
    );

  const hasOlderChatMessages =
    messages.length >
    visibleMessageCount;



  /* -------------------------------------------------------
     RENDER
     ------------------------------------------------------- */

  return (

    <Page
      eyebrow="COMMUNICATION"
      title="Messages"
      hideHeading={compact}
      action={
        <span className="muted">
          Chat works whether your connection is online or offline.
        </span>
      }
    >

      {/* Messages is chat-only. Private Post has been retired. */}

      {(compact ||
        messageCategory ===
          'chat') && (
      <div
        className="postoffice-layout"
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'stretch',
          flexWrap: 'wrap',
          height:
            compact
              ? '100%'
              : 'auto'
        }}
      >

        {!compact && (

          <>
            {/* =================================================
                INBOX
                ================================================= */}

        <div
          className="card postoffice-inbox-card"
          style={{
            flex:
              '1 1 300px',
            minWidth: 280,
            maxWidth: 380,
            padding: 16
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14
            }}
          >

            <Mail size={19} />

            <div>
              <b>Inbox</b>
              <div
                className="muted"
                style={{
                  fontSize: 12
                }}
              >
                Conversations & unread messages
              </div>
            </div>

          </div>


          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 10
            }}
          >
            <button
              type="button"
              className={
                inboxTab === 'chats'
                  ? 'btn primary'
                  : 'btn subtle'
              }
              onClick={() =>
                setInboxTab('chats')
              }
              style={{
                padding: '7px 10px'
              }}
            >
              Chats
            </button>

            <button
              type="button"
              className={
                inboxTab === 'requests'
                  ? 'btn primary'
                  : 'btn subtle'
              }
              onClick={() =>
                setInboxTab('requests')
              }
              style={{
                padding: '7px 10px'
              }}
            >
              Requests
            </button>
          </div>


          {inboxTab === 'chats' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setNewConversationOpen(current => !current);
                  setSearch('');
                }}
                style={{
                  width: '100%',
                  border: 0,
                  background: 'transparent',
                  padding: '9px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 800,
                  marginBottom: newConversationOpen ? 7 : 12
                }}
              >
                <span style={{ fontSize: 19, lineHeight: 1 }}>＋</span>
                New conversation
              </button>

              {newConversationOpen && (
                <div
                  className="search-box"
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  <Search size={16} />
                  <input
                    autoFocus
                    placeholder="Search a person…"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
              )}

              {newConversationOpen && searchText && (
                <div style={{ marginBottom: 12 }}>
                  {availableContacts.slice(0, 12).map(contact => {
                    const isFriend = canChatWithUser(contact.id);
                    return (
                      <button
                        type="button"
                        key={contact.id}
                        onClick={() => requestOrStartConversation(contact.id)}
                        style={{
                          width: '100%',
                          border: 0,
                          background: 'transparent',
                          padding: '8px 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Avatar profile={contact} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <b>{contact.name || 'Student'} {contact.surname || ''}</b>
                          <small className="muted" style={{ display: 'block' }}>
                            {isFriend ? 'Connection · open chat' : 'Chat request required'}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                  {availableContacts.length === 0 && (
                    <div className="empty compact">No people found.</div>
                  )}
                </div>
              )}
            </>
          )}


          {loading ? (

            <div className="empty compact">
              Loading inbox…
            </div>

          ) : (

            <>

              {inboxTab === 'requests' && chatRequests.filter(item => item.receiver_id === profile.id && item.status === 'pending').map(request => {
                const person = contacts.find(item => item.id === request.sender_id);
                if (!person) return null;
                return (
                  <div key={request.id} className="card" style={{ padding: 10, marginBottom: 8 }}>
                    <div style={{ display:'flex', gap:9, alignItems:'center' }}><Avatar profile={person}/><div><b>{person.name || 'Student'} {person.surname || ''}</b><small className="muted" style={{display:'block'}}>Chat request</small></div></div>
                    <div style={{display:'flex',gap:7,marginTop:9}}><button type="button" className="btn primary" onClick={() => respondChatRequest(request.id,true)}>Accept</button><button type="button" className="btn subtle" onClick={() => respondChatRequest(request.id,false)}>Decline</button></div>
                  </div>
                );
              })}

              {filteredConversations
                .map(item => {

                  const online =
                    onlineUserIds.includes(
                      item.other_user_id
                    );

                  return (

                    <button
                      type="button"
                      key={
                        item.conversation_id
                      }
                      onClick={() => {

                        if (
                          !compact &&
                          typeof onOpenMiniChat === 'function'
                        ) {
                          onOpenMiniChat(
                            item.other_user_id,
                            item.conversation_id
                          );
                          return;
                        }

                        setSelectedConversationId(
                          item.conversation_id
                        );

                        onConversationResolved?.(
                          item.conversation_id
                        );
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        textAlign: 'left',
                        border: 0,
                        background:
                          selectedConversationId ===
                          item.conversation_id
                            ? 'rgba(0,0,0,0.05)'
                            : 'transparent',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                        marginBottom: 5
                      }}
                    >

                      <div
                        style={{
                          position:
                            'relative',
                          flexShrink: 0
                        }}
                      >

                        <Avatar
                          profile={{
                            id:
                              item.other_user_id,
                            name:
                              item.other_name,
                            surname:
                              item.other_surname,
                            avatar_url:
                              item.other_avatar_url,
                            avatar_visibility:
                              item.other_avatar_visibility
                          }}
                        />

                        <span
                          title={
                            online
                              ? 'Online'
                              : 'Offline'
                          }
                          style={{
                            position:
                              'absolute',
                            right: -1,
                            bottom: -1,
                            width: 10,
                            height: 10,
                            borderRadius:
                              '50%',
                            background:
                              online
                                ? '#22c55e'
                                : '#9ca3af',
                            border:
                              '2px solid white'
                          }}
                        />

                      </div>


                      <div
                        style={{
                          minWidth: 0,
                          flex: 1
                        }}
                      >

                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            gap: 8
                          }}
                        >

                          <b
                            style={{
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap'
                            }}
                          >
                            {item.starred
                              ? '★ '
                              : ''}
                            {item.other_name ||
                              'Student'}{' '}
                            {item.other_surname ||
                              ''}
                            {item.muted
                              ? ' · 🔕'
                              : ''}
                          </b>

                          {Number(
                            item.unread_count ||
                            0
                          ) > 0 && (

                            <span
                              style={{
                                minWidth:
                                  20,
                                height:
                                  20,
                                borderRadius:
                                  10,
                                padding:
                                  '0 6px',
                                display:
                                  'inline-flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                background:
                                  '#ef4444',
                                color:
                                  '#fff',
                                fontSize:
                                  11,
                                fontWeight:
                                  700
                              }}
                            >
                              {Number(
                                item.unread_count
                              ) > 99
                                ? '99+'
                                : item.unread_count}
                            </span>

                          )}

                        </div>

                        <small
                          className="muted"
                          style={{
                            display:
                              'block',
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {(item.labels || []).length
                            ? `${item.labels.join(' · ')} · `
                            : ''}
                          {item.last_message_type ===
                          'file'
                            ? '📎 Attachment'
                            : item.last_message_type ===
                                'gif'
                              ? 'GIF'
                              : item.last_message_body ||
                                item.other_university ||
                                'Start a conversation'}
                        </small>

                      </div>

                    </button>

                  );
                })}


              {filteredConversations.length ===
                0 && (

                <div
                  className="empty compact"
                >
                  No conversations found.
                </div>

              )}



            </>

          )}

        </div>

          </>

        )}


        {/* =================================================
            CONVERSATION
            ================================================= */}

        {(compact ||
          selectedConversation ||
          requestTarget) && (
        <div
          ref={conversationCardRef}
          className="card postoffice-conversation-card"
          style={{
            flex:
              '3 1 520px',
            minWidth:
              compact
                ? 0
                : 300,
            minHeight:
              compact
                ? 0
                : 560,
            height:
              compact
                ? '100%'
                : 'auto',
            padding: 0,
            overflow:
              compact
                ? 'visible'
                : 'hidden',
            display: 'flex',
            flexDirection:
              'column'
          }}
        >

          {!selectedConversation && requestTarget ? (

            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  padding: compact ? '10px 12px' : '16px 18px',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <Avatar profile={requestTarget} />
                <div style={{ minWidth: 0 }}>
                  <b>{requestTarget.name || 'Student'} {requestTarget.surname || ''}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {requestTarget.university || requestTarget.degree || 'Student'}
                  </div>
                </div>
              </div>

              <div className="empty" style={{ margin: 'auto', padding: 28, textAlign: 'center' }}>
                {requestTargetChatRequest?.status === 'pending' ? (
                  requestTargetChatRequest.sender_id === profile.id ? (
                    <>
                      <h3>Chat request pending</h3>
                      <p>Waiting for {requestTarget.name || 'this person'} to accept or decline your request.</p>
                      <button type="button" className="btn subtle" disabled>Request sent</button>
                    </>
                  ) : (
                    <>
                      <h3>Chat request</h3>
                      <p>{requestTarget.name || 'This person'} wants to chat with you.</p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="btn primary" onClick={() => respondChatRequest(requestTargetChatRequest.id, true)}>Accept</button>
                        <button type="button" className="btn subtle" onClick={() => respondChatRequest(requestTargetChatRequest.id, false)}>Decline</button>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <h3>Send a chat request?</h3>
                    <p>You are not connected yet. Messages become available only after the request is accepted.</p>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => sendChatRequestToTarget(requestTarget.id)}
                    >
                      Send chat request
                    </button>
                  </>
                )}
              </div>
            </div>

          ) : !selectedConversation ? (

            <div
              className="empty"
              style={{ margin: 'auto', padding: 40 }}
            >
              <Mail size={34} />
              <h3>Your <OnstoodWordmark /> Messages</h3>
              <p>Select a conversation or start a new one.</p>
            </div>

          ) : (

            <>

              {/* HEADER */}

              <div
                style={{
                  padding:
                    compact
                      ? '9px 10px'
                      : '16px 18px',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.08)',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: 12
                }}
              >

                <button
                  type="button"
                  className="icon-btn mobile-chat-back"
                  onClick={() => {
                    setSelectedConversationId(null);
                    onConversationResolved?.(null);
                  }}
                  title="Back to conversations"
                  aria-label="Back to conversations"
                >
                  ←
                </button>

                <Avatar
                  profile={{
                    id:
                      selectedConversation.other_user_id,
                    name:
                      selectedConversation.other_name,
                    surname:
                      selectedConversation.other_surname,
                    avatar_url:
                      selectedConversation.other_avatar_url,
                    avatar_visibility:
                      selectedConversation.other_avatar_visibility
                  }}
                />

                <div
                  style={{
                    minWidth: 0
                  }}
                >

                  <b>
                    {selectedConversation.other_name ||
                      'Student'}{' '}
                    {selectedConversation.other_surname ||
                      ''}
                  </b>

                  <div
                    style={{
                      fontSize:
                        12
                    }}
                    className="muted"
                  >
                    {otherIsTyping
                      ? 'Typing…'
                      : isOtherOnline
                        ? 'Online'
                        : selectedConversation.other_university ||
                          'Offline'}
                  </div>

                </div>

                <div
                  style={{
                    marginLeft: 'auto',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setConversationMenuOpen(
                        current => !current
                      )
                    }
                    title="Conversation options"
                    aria-label="Conversation options"
                    style={{
                      fontSize: 22,
                      lineHeight: 1
                    }}
                  >
                    ⋯
                  </button>

                  {conversationMenuOpen && (
                    <div
                      className="card conversation-options-menu"
                      style={{
                        position: 'absolute',
                        right:
                          compact
                            ? -2
                            : 0,
                        top: 'calc(100% + 6px)',
                        width:
                          compact
                            ? 238
                            : 230,
                        padding:
                          compact
                            ? 5
                            : 7,
                        zIndex: 12000,
                        boxShadow:
                          '0 18px 48px rgba(15,23,42,.18)',
                        maxHeight:
                          compact
                            ? 'min(430px, calc(100vh - 110px))'
                            : 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                      }}
                    >
                      {[
                        [
                          selectedConversation.starred
                            ? '☆'
                            : '★',
                          selectedConversation.starred
                            ? 'Unstar'
                            : 'Star',
                          toggleConversationStar
                        ],
                        [
                          '◌',
                          'Mark as unread',
                          markConversationUnread
                        ],
                        [
                          selectedConversation.muted
                            ? '🔔'
                            : '🔕',
                          selectedConversation.muted
                            ? 'Unmute'
                            : 'Mute',
                          toggleConversationMute
                        ]
                      ].map(
                        ([
                          icon,
                          label,
                          handler
                        ]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={handler}
                            style={{
                              width: '100%',
                              border: 0,
                              background:
                                'transparent',
                              display: 'flex',
                              alignItems:
                                'center',
                              gap: 10,
                              padding:
                                '9px 10px',
                              borderRadius: 8,
                              cursor:
                                'pointer',
                              textAlign:
                                'left'
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                textAlign:
                                  'center'
                              }}
                            >
                              {icon}
                            </span>
                            {label}
                          </button>
                        )
                      )}

                      <div
                        style={{
                          height: 1,
                          background:
                            'rgba(15,23,42,.08)',
                          margin: '5px 0'
                        }}
                      />

                      <div
                        className="muted"
                        style={{
                          padding:
                            '5px 10px 3px',
                          fontSize: 11,
                          fontWeight: 800
                        }}
                      >
                        LABEL
                      </div>

                      <div
                        className="conversation-label-grid"
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 5,
                          padding: '4px 8px 7px'
                        }}
                      >
                        {[
                          'Study',
                          'Course',
                          'Career',
                          'Personal'
                        ].map(label => {
                          const active =
                            (selectedConversation.labels || [])
                              .includes(label);

                          return (
                            <button
                              key={label}
                              type="button"
                              className={
                                active
                                  ? 'btn primary'
                                  : 'btn subtle'
                              }
                              onClick={() =>
                                toggleConversationLabel(
                                  label
                                )
                              }
                              style={{
                                padding:
                                  '5px 7px',
                                fontSize: 11
                              }}
                              title={
                                active
                                  ? `Remove ${label} label`
                                  : `Add ${label} label`
                              }
                            >
                              {active
                                ? `✓ ${label}`
                                : label}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={
                          reportConversation
                        }
                        style={{
                          width: '100%',
                          border: 0,
                          background:
                            'transparent',
                          padding:
                            '9px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        ⚑ Report conversation
                      </button>

                      <button
                        type="button"
                        onClick={
                          deleteConversationForMe
                        }
                        style={{
                          width: '100%',
                          border: 0,
                          background:
                            'transparent',
                          color: '#b42318',
                          padding:
                            '9px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        🗑 Delete conversation
                      </button>
                    </div>
                  )}
                </div>

              </div>


              {/* MESSAGES */}

              <div
                ref={messageScrollRef}
                className="postoffice-message-scroll"
                onScroll={event => {
                  const element =
                    event.currentTarget;

                  const distanceFromBottom =
                    Math.abs(
                      element.scrollTop
                    );

                  keepChatPinnedToBottomRef.current =
                    distanceFromBottom <= 48;
                }}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY:
                    'auto',
                  overflowX:
                    'hidden',
                  display:
                    'flex',
                  flexDirection:
                    'column-reverse',
                  scrollBehavior:
                    'auto',
                  overflowAnchor:
                    'none',
                  visibility:
                    'visible',
                  padding:
                    compact
                      ? 10
                      : 18,
                  background:
                    'rgba(0,0,0,0.015)'
                }}
              >

                <div ref={messagesEndRef} />

                {loadingMessages ? (

                  <div className="empty compact">
                    Loading messages…
                  </div>

                ) : messages.length ===
                  0 ? (

                  <div className="empty compact">
                    No messages yet. Say hello.
                  </div>

                ) : (

                  [...visibleChatMessages]
                    .reverse()
                    .map(
                    message => {

                      const mine =
                        message.sender_id ===
                        profile.id;

                      return (

                        <div
                          key={
                            message.id
                          }
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              mine
                                ? 'flex-end'
                                : 'flex-start',
                            marginBottom:
                              compact
                                ? 6
                                : 10
                          }}
                        >

                          <div
                            style={{
                              maxWidth:
                                compact
                                  ? '86%'
                                  : 'min(78%, 650px)',
                              padding:
                                compact
                                  ? '8px 10px'
                                  : '10px 12px',
                              borderRadius:
                                compact
                                  ? 11
                                  : 14,
                              background:
                                mine
                                  ? 'rgba(37,99,235,0.12)'
                                  : '#fff',
                              border:
                                '1px solid rgba(0,0,0,0.07)'
                            }}
                          >

                            {message.metadata?.kind ===
                              'reply' &&
                              message.metadata
                                ?.reply_to_body && (
                              <div
                                style={{
                                  padding:
                                    '7px 9px',
                                  marginBottom: 7,
                                  borderLeft:
                                    '3px solid rgba(37,99,235,0.45)',
                                  background:
                                    'rgba(37,99,235,0.06)',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  opacity: 0.8
                                }}
                              >
                                <small
                                  style={{
                                    display: 'block',
                                    fontWeight: 700,
                                    marginBottom: 2
                                  }}
                                >
                                  Reply to
                                </small>
                                {
                                  message.metadata
                                    .reply_to_body
                                }
                              </div>
                            )}

                            {message.deleted_at ? (

                              <span
                                className="muted"
                                style={{
                                  fontStyle:
                                    'italic'
                                }}
                              >
                                Message deleted
                              </span>

                            ) : message.message_type ===
                              'file' ? (

                              <SecureAttachmentPreview
                                bucket="message-attachments"
                                storagePath={message.metadata?.storage_path}
                                fileName={message.metadata?.file_name}
                                mimeType={message.metadata?.mime_type}
                                size={message.metadata?.size}
                                notify={notify}
                                compact
                              />

                            ) : message.message_type ===
                              'gif' &&
                              message.metadata?.url ? (

                              <div>
                                <img
                                  src={
                                    message.metadata.url
                                  }
                                  alt="GIF"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  style={{
                                    display: 'block',
                                    maxWidth: 280,
                                    maxHeight: 280,
                                    borderRadius: 12,
                                    objectFit: 'cover'
                                  }}
                                />
                              </div>

                            ) : message.message_type ===
                              'post' ? (

                              <div
                                style={{
                                  border:
                                    '1px solid rgba(79,70,229,.18)',
                                  background:
                                    'linear-gradient(180deg,rgba(99,102,241,.07),rgba(255,255,255,.9))',
                                  borderRadius: 12,
                                  padding: 11,
                                  minWidth: 220
                                }}
                              >
                                <small
                                  style={{
                                    fontWeight: 800,
                                    color: '#5b50e6'
                                  }}
                                >
                                  ↗ <OnstoodWordmark /> post
                                </small>

                                <div
                                  style={{
                                    marginTop: 5,
                                    whiteSpace:
                                      'pre-wrap',
                                    overflowWrap:
                                      'anywhere'
                                  }}
                                >
                                  {message.body}
                                </div>

                                <small
                                  className="muted"
                                  style={{
                                    display: 'block',
                                    marginTop: 7
                                  }}
                                >
                                  Shared inside <OnstoodWordmark />
                                </small>
                              </div>

                            ) : (

                              <div
                                style={{
                                  whiteSpace:
                                    'pre-wrap',
                                  overflowWrap:
                                    'anywhere'
                                }}
                              >
                                {message.body}
                              </div>

                            )}


                            <div
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'flex-end',
                                gap: 8,
                                marginTop:
                                  5,
                                fontSize:
                                  10,
                                opacity:
                                  0.58
                              }}
                            >

                              <span>
                                {fmtDate(
                                  message.created_at
                                )}
                              </span>


                              {!message.deleted_at && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyToMessage(
                                        message
                                      )
                                    }
                                    style={{
                                      border: 0,
                                      background:
                                        'transparent',
                                      fontSize: 10,
                                      opacity: 0.8,
                                      cursor:
                                        'pointer'
                                    }}
                                  >
                                    Reply
                                  </button>

                                </>
                              )}


                              {mine &&
                                !message.deleted_at && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteChoiceMessage(
                                      message
                                    )
                                  }
                                  style={{
                                    border:
                                      0,
                                    background:
                                      'transparent',
                                    fontSize:
                                      10,
                                    opacity:
                                      0.75,
                                    cursor:
                                      'pointer'
                                  }}
                                >
                                  Delete
                                </button>

                              )}

                            </div>

                          </div>

                        </div>

                      );
                    }
                  )

                )}


                {hasOlderChatMessages && (

                  <button
                    type="button"
                    onClick={() => {
                      setVisibleMessageCount(
                        current =>
                          Math.min(
                            messages.length,
                            current + 20
                          )
                      );
                    }}
                    style={{
                      alignSelf:
                        'center',
                      margin:
                        '8px auto 10px',
                      padding:
                        '7px 12px',
                      border:
                        '1px solid rgba(15,23,42,0.12)',
                      borderRadius:
                        999,
                      background:
                        '#fff',
                      cursor:
                        'pointer',
                      fontSize:
                        12,
                      fontWeight:
                        800
                    }}
                  >
                    Load history
                  </button>

                )}

                {messages.length > 0 &&
                messages[
                  messages.length - 1
                ]?.sender_id ===
                  profile.id &&
                lastOwnMessage && (

                  <div
                    style={{
                      textAlign:
                        'right',
                      fontSize:
                        11,
                      opacity:
                        0.6,
                      marginTop:
                        4
                    }}
                  >
                    {lastOwnMessageSeen
                      ? 'Seen'
                      : 'Sent'}
                  </div>

                )}

              </div>


              {/* COMPOSER */}

              {replyToMessage && (
                <div
                  style={{
                    margin:
                      '0 14px 8px',
                    padding:
                      '9px 11px',
                    borderRadius: 10,
                    background:
                      'rgba(37,99,235,0.07)',
                    borderLeft:
                      '3px solid rgba(37,99,235,0.45)',
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 10,
                    alignItems:
                      'center'
                  }}
                >
                  <div
                    style={{
                      minWidth: 0
                    }}
                  >
                    <small
                      style={{
                        fontWeight: 700
                      }}
                    >
                      Replying to message
                    </small>
                    <div
                      style={{
                        whiteSpace:
                          'nowrap',
                        overflow:
                          'hidden',
                        textOverflow:
                          'ellipsis',
                        maxWidth:
                          520,
                        fontSize: 12
                      }}
                    >
                      {replyToMessage.body}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setReplyToMessage(null)
                    }
                    title="Cancel reply"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form
                className="postoffice-composer"
                onSubmit={
                  sendMessage
                }
                style={{
                  padding:
                    compact
                      ? 6
                      : 14,
                  borderTop:
                    '1px solid rgba(0,0,0,0.08)',
                  display:
                    'grid',
                  gridTemplateColumns:
                    compact
                      ? '28px 28px 28px 32px minmax(0,1fr) 32px'
                      : 'auto auto auto auto minmax(0,1fr) auto',
                  gap:
                    compact
                      ? 4
                      : 10,
                  alignItems:
                    'center',
                  flex: '0 0 auto',
                  minWidth: 0,
                  overflow: 'visible'
                }}
              >

                <label
                  className="icon-btn"
                  title="Photo or video"
                  style={{
                    cursor:
                      uploading
                        ? 'default'
                        : 'pointer',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize:
                        compact
                          ? 14
                          : 17
                    }}
                  >
                    🖼️
                  </span>

                  <input
                    type="file"
                    accept="image/*,video/*"
                    disabled={
                      uploading
                    }
                    onChange={
                      uploadAttachment
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


                <label
                  className="icon-btn"
                  title="Attach document"
                  style={{
                    cursor:
                      uploading
                        ? 'default'
                        : 'pointer',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >

                  <Paperclip
                    size={18}
                  />

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.rtf,.odt,.ods,.odp,application/pdf"
                    disabled={
                      uploading
                    }
                    onChange={
                      uploadAttachment
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


                <div
                  style={{
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    title="Emoji"
                    disabled={false}
                    onClick={() => {
                      setEmojiOpen(
                        current => !current
                      );
                      setGifOpen(false);
                    }}
                    style={{
                      fontSize:
                        compact
                          ? 15
                          : 18
                    }}
                  >
                    🙂
                  </button>

                  {emojiOpen && (
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        bottom:
                          'calc(100% + 8px)',
                        left: 0,
                        zIndex: 12020,
                        width: compact ? 196 : 210,
                        padding: compact ? 5 : 8,
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(6,1fr)',
                        gap: 4,
                        boxShadow:
                          '0 14px 36px rgba(15,23,42,.18)'
                      }}
                    >
                      {[
                        '😀','😂','😍','🥳',
                        '😎','🤔','😊','🙏',
                        '👍','👏','🔥','❤️',
                        '📚','🎓','💡','✅',
                        '😅','😭','😮','😉',
                        '🤝','💪','✨','🚀'
                      ].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            addEmoji(emoji)
                          }
                          style={{
                            border: 0,
                            background:
                              'transparent',
                            fontSize: compact ? 18 : 20,
                            cursor:
                              'pointer',
                            padding: compact ? 2 : 4,
                            borderRadius: 7
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>


                <div
                  style={{
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    title="Send GIF"
                    disabled={false}
                    onClick={() => {
                      setGifOpen(
                        current => !current
                      );
                      setEmojiOpen(false);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 900
                    }}
                  >
                    GIF
                  </button>

                  {gifOpen && (
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        bottom:
                          'calc(100% + 8px)',
                        left: 0,
                        zIndex: 12020,
                        width: compact ? 250 : 300,
                        padding: compact ? 7 : 10,
                        boxShadow:
                          '0 14px 36px rgba(15,23,42,.18)'
                      }}
                    >
                      <small
                        className="muted"
                        style={{
                          display: 'block',
                          marginBottom: 6
                        }}
                      >
                        Paste an HTTPS GIF link
                      </small>

                      <div
                        style={{
                          display: 'flex',
                          gap: 6
                        }}
                      >
                        <input
                          value={gifUrl}
                          onChange={event =>
                            setGifUrl(
                              event.target.value
                            )
                          }
                          placeholder="https://…gif"
                          style={{
                            flex: 1,
                            margin: 0
                          }}
                        />

                        <button
                          type="button"
                          className="btn primary"
                          disabled={
                            !gifUrl.trim() ||
                            sending
                          }
                          onClick={sendGif}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>


                <input
                  ref={messageInputRef}
                  placeholder={
                    uploading
                      ? 'Uploading attachment…'
                      : isOtherOnline
                        ? 'Write a message…'
                        : 'Write a message · recipient is offline'
                  }
                  value={text}
                  maxLength={4000}
                  disabled={
                    sending ||
                    uploading
                  }
                  onChange={event =>
                    updateText(
                      event.target
                        .value
                    )
                  }
                  onBlur={() =>
                    sendTyping(
                      false
                    )
                  }
                  style={{
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                    height:
                      compact
                        ? 36
                        : undefined
                  }}
                />


                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    sending ||
                    uploading ||
                    !text.trim()
                  }
                >
                  <Send size={16} />
                </button>

              </form>

            </>

          )}

        </div>
        )}

      </div>

      )}

      {reportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setReportOpen(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30050,
            background:
              'rgba(15,23,42,.42)',
            display: 'grid',
            placeItems: 'center',
            padding: 16
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width:
                'min(390px,92vw)',
              padding: 16
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 10
              }}
            >
              <div>
                <b>
                  Report conversation
                </b>
                <div
                  className="muted"
                  style={{
                    fontSize: 12,
                    marginTop: 2
                  }}
                >
                  Send this conversation to <OnstoodWordmark /> moderation.
                </div>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setReportOpen(false)
                }
              >
                <X size={16} />
              </button>
            </div>

            <label
              style={{
                display: 'block',
                marginTop: 14
              }}
            >
              Reason

              <select
                value={
                  reportCategory
                }
                onChange={event =>
                  setReportCategory(
                    event.target.value
                  )
                }
                style={{
                  width: '100%',
                  marginTop: 6
                }}
              >
                <option value="harassment">
                  Harassment
                </option>
                <option value="spam">
                  Spam
                </option>
                <option value="hate">
                  Hate or abusive content
                </option>
                <option value="scam">
                  Scam or fraud
                </option>
                <option value="other">
                  Other
                </option>
              </select>
            </label>

            <label
              style={{
                display: 'block',
                marginTop: 12
              }}
            >
              Details (optional)

              <textarea
                value={
                  reportDetails
                }
                onChange={event =>
                  setReportDetails(
                    event.target.value
                  )
                }
                placeholder="Tell us briefly what happened…"
                maxLength={1000}
                style={{
                  width: '100%',
                  minHeight: 90,
                  marginTop: 6
                }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 8,
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setReportOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={
                  submitConversationReport
                }
              >
                Send report
              </button>
            </div>
          </div>
        </div>
      )}


      {deleteChoiceMessage && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setDeleteChoiceMessage(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
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
                'min(430px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              DELETE MESSAGE
            </span>

            <h3>
              Choose delete option
            </h3>

            <div
              style={{
                display: 'grid',
                gap: 8
              }}
            >
              <button
                type="button"
                className="btn subtle full"
                onClick={() =>
                  deleteMessageForMe(
                    deleteChoiceMessage
                  )
                }
              >
                Delete for me
              </button>

              {deleteChoiceMessage
                .sender_id ===
                profile.id && (

                <button
                  type="button"
                  className="btn primary full"
                  onClick={() =>
                    deleteMessageForEveryone(
                      deleteChoiceMessage
                    )
                  }
                >
                  Delete for everyone
                </button>

              )}

              <button
                type="button"
                className="btn subtle full"
                onClick={() =>
                  setDeleteChoiceMessage(null)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

      )}


    </Page>

  );
}

export function MiniChat({
  profile,
  notify,
  targetUserId,
  targetConversationId,
  onlineUserIds = [],
  index = 0,
  onClose
}) {

  if (
    !targetUserId &&
    !targetConversationId
  ) {
    return null;
  }

  const chatWidth = 360;
  const chatHeight = 520;
  const chatGap = 10;
  const onlinePanelWidth = 255;
  const baseRight =
    onlinePanelWidth + 28;

  const viewportWidth =
    typeof window !== 'undefined'
      ? window.innerWidth
      : 1400;

  const usableWidth =
    Math.max(
      chatWidth,
      viewportWidth -
        baseRight -
        20
    );

  const perRow =
    Math.max(
      1,
      Math.floor(
        usableWidth /
          (chatWidth + chatGap)
      )
    );

  const column =
    index % perRow;

  const row =
    Math.floor(
      index / perRow
    );

  const right =
    baseRight +
    column *
      (chatWidth + chatGap);

  const bottom =
    18 +
    row *
      (chatHeight + chatGap);

  return (
    <div
      className="onstood-mini-chat-shell"
      style={{
        position: 'fixed',
        right,
        bottom,
        width: `min(${chatWidth}px, calc(100vw - 24px))`,
        height: `min(${chatHeight}px, calc(100vh - 36px))`,
        zIndex: 10030,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 14,
        boxShadow: '0 12px 36px rgba(15,23,42,.18)',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          flex: '0 0 auto'
        }}
      >
        <div>
          <b>Live chat</b>
          <div className="muted" style={{fontSize: 11}}>
            <OnstoodWordmark /> mini chat
          </div>
        </div>

        <button
          type="button"
          className="btn subtle"
          onClick={onClose}
          aria-label="Close mini chat"
          title="Close chat"
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: 5,
          background: '#fff',
          borderRadius: '0 0 14px 14px'
        }}
      >
        <PostOffice
          profile={profile}
          notify={notify}
          requestedUserId={
            targetUserId
          }
          requestedConversationId={
            targetConversationId
          }
          onlineUserIds={
            onlineUserIds
          }
          compact={true}
          onChatDeleted={onClose}
        />
      </div>
    </div>
  );
}
