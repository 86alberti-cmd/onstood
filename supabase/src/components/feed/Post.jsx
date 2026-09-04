import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import OnstoodWordmark from '../OnstoodWordmark';
import {
  FileText,
  Heart,
  Mail,
  MessageCircle,
  CornerUpLeft,
  Send,
  Trash2,
  Pencil,
  Check,
  X
} from 'lucide-react';
import Avatar from '../Avatar';
import PrivacyControl from '../PrivacyControl';
import { fmtDate } from '../../utils/formatters';


function timelineDocumentKind(item) {
  const mime = String(item?.mime_type || '').toLowerCase();
  const name = String(item?.caption || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(name)) {
    return 'image';
  }

  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
    return 'pdf';
  }

  return 'document';
}

function TimelineDocumentPreview({ item }) {
  const kind = timelineDocumentKind(item);

  if (kind === 'image') {
    return (
      <div className="onstood-document-preview-card" style={{ overflow: 'hidden' }}>
        <a href={item.signed_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
          <img
            src={item.signed_url}
            alt={item.caption || 'Attached image'}
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              maxHeight: 420,
              objectFit: 'contain',
              background: '#f8fafc'
            }}
          />
        </a>
        <div className="onstood-document-preview-footer">
          <strong>{item.caption || 'Attached image'}</strong>
          <a
            href={item.signed_url}
            target="_blank"
            rel="noreferrer"
            className="btn subtle"
            style={{ textDecoration: 'none' }}
          >
            Open
          </a>
        </div>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="onstood-document-preview-card" style={{ overflow: 'hidden' }}>
        <iframe
          src={`${item.signed_url}#toolbar=0&navpanes=0&view=FitH`}
          title={item.caption || 'PDF preview'}
          loading="lazy"
          style={{
            width: '100%',
            height: 360,
            border: 0,
            display: 'block',
            background: '#f8fafc'
          }}
        />
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
              {item.caption || 'PDF document'}
            </strong>
            <small className="muted">PDF</small>
          </div>
          <a
            href={item.signed_url}
            target="_blank"
            rel="noreferrer"
            className="btn subtle"
            style={{ textDecoration: 'none' }}
          >
            Open
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={item.signed_url}
      target="_blank"
      rel="noreferrer"
      className="onstood-document-preview-card"
      style={{
        textDecoration: 'none',
        color: 'inherit',
        padding: 13,
        display: 'grid',
        gridTemplateColumns: '48px minmax(0,1fr) auto',
        gap: 11,
        alignItems: 'center'
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 48,
          height: 58,
          borderRadius: 10,
          background: 'linear-gradient(180deg,#eff6ff,#e0e7ff)',
          border: '1px solid rgba(37,99,235,.14)',
          display: 'grid',
          placeItems: 'center',
          color: '#1d4ed8',
          fontSize: 12,
          fontWeight: 900
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
        >
          {item.caption || 'Attached document'}
        </strong>
        <small className="muted" style={{ display: 'block', marginTop: 3 }}>
          {item.mime_type
            ? String(item.mime_type).split('/').pop()?.toUpperCase()
            : 'DOCUMENT'}
        </small>
        <small className="muted" style={{ display: 'block', marginTop: 3 }}>
          Tap to open full document
        </small>
      </div>

      <span className="btn subtle">Open</span>
    </a>
  );
}

export default function Post({
  post,
  profile,
  likeCount,
  liked,
  comments,
  shareCount,
  commentValue,
  setCommentValue,
  onLike,
  onComment,
  onShare,
  onPostOffice,
  onDelete,
  onOpenProfile,
  onAudienceChange,
  onKnowledgeChange,
  onDeleteComment,
  commentLikeCounts = {},
  commentLikedByMe = {},
  onToggleCommentLike,
  onReplyComment,
  onEditComment,
  onEditPost
}) {

  const author =
    post.profiles || {};

  const [mediaViewer, setMediaViewer] =
    useState(null);

  const [commentsOpen, setCommentsOpen] =
    useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] =
    useState(false);

  const [commentDeleteTarget, setCommentDeleteTarget] =
    useState(null);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [collapsedReplies, setCollapsedReplies] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentEditDraft, setCommentEditDraft] = useState('');
  const [postEditOpen, setPostEditOpen] = useState(false);

  // Fixed viewers/dialogs should not let the page behind them keep scrolling.
  // Besides being better UX, this prevents expensive backdrop/sticky repainting
  // that can look like a page refresh on long feeds.
  const overlayOpen = Boolean(mediaViewer || deleteConfirmOpen || postEditOpen);

  useEffect(() => {
    if (!overlayOpen || typeof document === 'undefined') return undefined;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverscroll: html.style.overscrollBehaviorY
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overscrollBehaviorY = 'none';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      html.style.overscrollBehaviorY = previous.htmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [overlayOpen]);
  const [postEditDraft, setPostEditDraft] = useState(post.body || '');
  const [postEditSaving, setPostEditSaving] = useState(false);

  const media =
    (post.post_media || [])
      .filter(
        item =>
          item.signed_url &&
          item.media_type !==
            'document'
      );

  const documents =
    (post.post_media || [])
      .filter(
        item =>
          item.signed_url &&
          item.media_type ===
            'document'
      );

  return (
    <article className="card post-card">

      <div className="post-author">
        <button type="button" onClick={onOpenProfile} title="Open profile"
          style={{border:0,background:'transparent',padding:0,cursor:'pointer',display:'flex'}}>
          <Avatar profile={author} />
        </button>

        <div
          style={{
            flex: 1
          }}
        >
          <b onClick={onOpenProfile} style={{cursor:'pointer'}}>
            {author.name || 'Student'}{' '}
            {author.surname || ''}
          </b>

          <small>
            {author.university ||
              'ONSTOOD member'}
            {' · '}
            {fmtDate(post.created_at)}
            {post.audience ===
              'connections'
              ? ' · Connections'
              : ''}
            {post.edited_at ? ' · edited' : ''}
          </small>
        </div>

        {post.user_id ===
          profile.id && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center'
            }}
          >
            <PrivacyControl
              value={post.audience || 'public'}
              privateValue="only_me"
              onChange={value =>
                onAudienceChange?.(value)
              }
            />

            <label
              title="Allow the study knowledge in this post to help other students through ONSTOOD Knowledge. This does not change post visibility."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 7px',
                borderRadius: 9,
                border: '1px solid rgba(99,102,241,.16)',
                fontSize: 10.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(post.knowledge_consent)}
                onChange={event =>
                  onKnowledgeChange?.(
                    event.target.checked
                  )
                }
              />
              Knowledge
            </label>

            <button
              type="button"
              className="onstood-owner-text-action"
              onClick={() => {
                setPostEditDraft(post.body || '');
                setPostEditOpen(true);
              }}
              title="Edit post"
              aria-label="Edit post"
            >
              <Pencil size={13} /> Edit
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                setDeleteConfirmOpen(true)
              }
              title="Delete post"
              aria-label="Delete post"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>


      {post.body && (
        <p className="post-body">
          {post.body}
        </p>
      )}

      {media.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              media.length === 1
                ? '1fr'
                : 'repeat(2, minmax(0, 1fr))',
            gap: 7,
            marginTop: post.body ? 10 : 4,
            borderRadius: 14,
            overflow: 'hidden'
          }}
        >
          {media.slice(0, 4).map((item, index) => {
            const more =
              index === 3 &&
              media.length > 4;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setMediaViewer({
                    items: media,
                    index
                  })
                }
                style={{
                  position: 'relative',
                  border: 0,
                  padding: 0,
                  background: '#0f172a',
                  cursor: 'zoom-in',
                  minHeight:
                    media.length === 1
                      ? 260
                      : 180,
                  maxHeight:
                    media.length === 1
                      ? 520
                      : 320,
                  overflow: 'hidden'
                }}
              >
                {item.media_type === 'video' ? (
                  <video
                    src={item.signed_url}
                    muted
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 'inherit',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <img
                    src={item.signed_url}
                    alt="Post media"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 'inherit',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                )}

                {more && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'rgba(15,23,42,.58)',
                      color: '#fff',
                      fontSize: 28,
                      fontWeight: 800
                    }}
                  >
                    +{media.length - 4}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {documents.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: 7,
            marginTop:
              post.body || media.length
                ? 10
                : 4
          }}
        >
          {documents.map(item => (
            <TimelineDocumentPreview
              key={item.id}
              item={item}
            />
          ))}
        </div>
      )}

      {mediaViewer && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setMediaViewer(null)
          }
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
              mediaViewer.items[
                mediaViewer.index
              ];

            if (!item) return null;

            return (
              <div
                onClick={event =>
                  event.stopPropagation()
                }
                style={{
                  position: 'relative',
                  maxWidth: '94vw',
                  maxHeight: '90vh'
                }}
              >
                {item.media_type === 'video' ? (
                  <video
                    src={item.signed_url}
                    controls
                    autoPlay
                    style={{
                      maxWidth: '94vw',
                      maxHeight: '86vh',
                      borderRadius: 14
                    }}
                  />
                ) : (
                  <img
                    src={item.signed_url}
                    alt="Post media"
                    style={{
                      maxWidth: '94vw',
                      maxHeight: '86vh',
                      objectFit: 'contain',
                      borderRadius: 14
                    }}
                  />
                )}

                {mediaViewer.items.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        setMediaViewer(current => ({
                          ...current,
                          index:
                            (current.index - 1 +
                              current.items.length) %
                            current.items.length
                        }))
                      }
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
                      onClick={() =>
                        setMediaViewer(current => ({
                          ...current,
                          index:
                            (current.index + 1) %
                            current.items.length
                        }))
                      }
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
              </div>
            );
          })()}

          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setMediaViewer(null)
            }
            style={{
              position: 'fixed',
              right: 20,
              top: 20,
              background: '#fff'
            }}
          >
            <X size={20} />
          </button>
        </div>,
        document.body
      )}


      <div className="post-actions">

        <button onClick={onLike}>
          <Heart
            size={16}
            fill={
              liked
                ? 'currentColor'
                : 'none'
            }
          />
          {likeCount}
        </button>

        <button
          type="button"
          onClick={() =>
            setCommentsOpen(
              current => !current
            )
          }
          aria-expanded={
            commentsOpen
          }
          title={
            commentsOpen
              ? 'Hide comments'
              : comments.length > 0
                ? 'Show comments'
                : 'Write a comment'
          }
        >
          <MessageCircle size={16} />
          {comments.length}
        </button>

        <button onClick={onShare}>
          <Send size={16} />
          Share
          {shareCount > 0
            ? ` ${shareCount}`
            : ''}
        </button>

        <button
          onClick={onPostOffice}
          title="Send through Messages"
        >
          <Mail size={16} />
          Messages
        </button>

      </div>


      {commentsOpen && (
        <div
          style={{
            display: 'grid',
            gap: 8,
            marginTop: 12
          }}
        >

          {!comments.length && (
            <small
              className="muted"
              style={{
                padding: '2px 1px'
              }}
            >
              No comments yet. Start the conversation.
            </small>
          )}

          {(() => {
            const roots = comments.filter(comment => !comment.parent_comment_id);
            const byParent = {};
            comments.forEach(comment => {
              if (!comment.parent_comment_id) return;
              if (!byParent[comment.parent_comment_id]) byParent[comment.parent_comment_id] = [];
              byParent[comment.parent_comment_id].push(comment);
            });

            const renderComment = (comment, depth = 0) => {
              const replies = byParent[comment.id] || [];
              const isLiked = Boolean(commentLikedByMe[comment.id]);
              const likeTotal = Number(commentLikeCounts[comment.id] || 0);
              const replyOpen = replyingTo === comment.id;
              const repliesCollapsed = Boolean(collapsedReplies[comment.id]);

              return (
                <div key={comment.id} className={`onstood-comment-thread depth-${Math.min(depth, 2)}`}>
                  <div className="onstood-comment-row">
                    <Avatar profile={comment.profiles || {}} />
                    <div className="onstood-comment-main">
                      <div className="onstood-comment-bubble">
                        <div className="onstood-comment-head">
                          <b>{comment.profiles?.name || 'Student'} {comment.profiles?.surname || ''}</b>
                          {comment.user_id === profile.id && (
                            <div className="onstood-comment-owner-actions">
                              <button
                                type="button"
                                className="onstood-comment-edit"
                                title="Edit comment"
                                aria-label="Edit comment"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setCommentEditDraft(comment.body || '');
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                className="onstood-comment-delete"
                                title="Delete comment"
                                aria-label="Delete comment"
                                onClick={() => setCommentDeleteTarget(comment)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="onstood-comment-edit-shell">
                            <textarea
                              autoFocus
                              value={commentEditDraft}
                              onChange={event => setCommentEditDraft(event.target.value)}
                              onKeyDown={async event => {
                                if (event.key === 'Escape') {
                                  setEditingCommentId(null);
                                  setCommentEditDraft('');
                                }
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  const clean = commentEditDraft.trim();
                                  if (!clean) return;
                                  const ok = await onEditComment?.(comment, clean);
                                  if (ok !== false) {
                                    setEditingCommentId(null);
                                    setCommentEditDraft('');
                                  }
                                }
                              }}
                            />
                            <div className="onstood-comment-edit-actions">
                              <button type="button" className="btn subtle" onClick={() => { setEditingCommentId(null); setCommentEditDraft(''); }}>Cancel</button>
                              <button
                                type="button"
                                className="btn primary"
                                onClick={async () => {
                                  const clean = commentEditDraft.trim();
                                  if (!clean) return;
                                  const ok = await onEditComment?.(comment, clean);
                                  if (ok !== false) {
                                    setEditingCommentId(null);
                                    setCommentEditDraft('');
                                  }
                                }}
                              ><Check size={14}/> Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="onstood-comment-body">{comment.body}</div>
                        )}
                      </div>

                      <div className="onstood-comment-actions">
                        <button
                          type="button"
                          className={isLiked ? 'active' : ''}
                          onClick={() => onToggleCommentLike?.(comment)}
                        >
                          <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
                          {likeTotal > 0 ? likeTotal : 'Like'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(current => current === comment.id ? null : comment.id)}
                        >
                          <CornerUpLeft size={13} /> Reply
                        </button>
                        {comment.user_id === profile.id && (
                          <button
                            type="button"
                            className="onstood-comment-edit-link"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setCommentEditDraft(comment.body || '');
                            }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        )}
                        <span>{fmtDate(comment.created_at)}{comment.edited_at ? ' · edited' : ''}</span>
                        {replies.length > 0 && (
                          <button
                            type="button"
                            className="onstood-replies-toggle"
                            onClick={() => setCollapsedReplies(current => ({...current,[comment.id]:!current[comment.id]}))}
                          >
                            {repliesCollapsed ? `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : `Hide ${replies.length === 1 ? 'reply' : 'replies'}`}
                          </button>
                        )}
                      </div>

                      {replyOpen && (
                        <div className="onstood-inline-reply">
                          <input
                            value={replyDrafts[comment.id] || ''}
                            autoFocus
                            placeholder={`Reply to ${comment.profiles?.name || 'student'}…`}
                            onChange={event => setReplyDrafts(current => ({...current,[comment.id]:event.target.value}))}
                            onKeyDown={event => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                const body = (replyDrafts[comment.id] || '').trim();
                                if (!body) return;
                                onReplyComment?.(comment, body);
                                setReplyDrafts(current => ({...current,[comment.id]:''}));
                                setReplyingTo(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => {
                              const body = (replyDrafts[comment.id] || '').trim();
                              if (!body) return;
                              onReplyComment?.(comment, body);
                              setReplyDrafts(current => ({...current,[comment.id]:''}));
                              setReplyingTo(null);
                            }}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      )}

                      {!repliesCollapsed && replies.length > 0 && (
                        <div className="onstood-comment-replies">
                          {replies.map(reply => renderComment(reply, depth + 1))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            return roots.map(comment => renderComment(comment));
          })()}


        <div
          style={{
            display: 'flex',
            gap: 8
          }}
        >
          <input
            name={`comment-${post.id}`}
            placeholder="Write a comment…"
            value={commentValue}
            onChange={event =>
              setCommentValue(
                event.target.value
              )
            }
            onKeyDown={event => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey
              ) {
                event.preventDefault();
                onComment();
              }
            }}
          />

          <button
            type="button"
            className="btn primary"
            onClick={onComment}
          >
            <Send size={15} />
          </button>
        </div>

        </div>
      )}


      {postEditOpen && createPortal(
        <div
          className="onstood-modal-backdrop"
          role="presentation"
          onClick={() => !postEditSaving && setPostEditOpen(false)}
        >
          <div
            className="onstood-edit-post-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit post"
            onClick={event => event.stopPropagation()}
          >
            <div className="onstood-edit-post-head">
              <div>
                <small className="muted">YOUR POST</small>
                <h3>Edit post</h3>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPostEditOpen(false)} aria-label="Close edit post">
                <X size={17} />
              </button>
            </div>
            <textarea
              className="onstood-edit-post-textarea"
              value={postEditDraft}
              onChange={event => setPostEditDraft(event.target.value)}
              autoFocus
              rows={6}
              placeholder="Edit your post..."
            />
            <div className="onstood-edit-post-foot">
              <span className="muted">Photos, videos and documents stay attached.</span>
              <div className="onstood-edit-post-actions">
                <button type="button" className="btn subtle" disabled={postEditSaving} onClick={() => setPostEditOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={postEditSaving || postEditDraft.trim() === String(post.body || '').trim()}
                  onClick={async () => {
                    setPostEditSaving(true);
                    const ok = await onEditPost?.(postEditDraft.trim());
                    setPostEditSaving(false);
                    if (ok !== false) setPostEditOpen(false);
                  }}
                >
                  <Check size={15} /> {postEditSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirmOpen && createPortal(
        <div
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setDeleteConfirmOpen(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, .42)',
            display: 'grid',
            placeItems: 'center',
            padding: 18
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-post-title-${post.id}`}
            className="card"
            style={{
              width: 'min(420px, calc(100vw - 28px))',
              padding: 20,
              borderRadius: 18,
              boxShadow: '0 20px 60px rgba(15,23,42,.24)'
            }}
          >
            <h3
              id={`delete-post-title-${post.id}`}
              style={{
                margin: 0,
                fontSize: 20
              }}
            >
              Delete this post?
            </h3>

            <p
              style={{
                margin: '9px 0 18px',
                color: '#64748b',
                lineHeight: 1.45
              }}
            >
              Are you sure you want to delete this post? This action cannot be undone.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setDeleteConfirmOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDelete?.();
                }}
                style={{
                  border: '1px solid rgba(220,38,38,.22)',
                  background: '#fff',
                  color: '#dc2626',
                  borderRadius: 10,
                  minHeight: 40,
                  padding: '0 15px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {commentDeleteTarget && createPortal(
        <div
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setCommentDeleteTarget(null);
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100001,
            background: 'rgba(15,23,42,.42)', display: 'grid',
            placeItems: 'center', padding: 18
          }}
        >
          <div role="dialog" aria-modal="true" className="card" style={{
            width: 'min(420px, calc(100vw - 28px))', padding: 20, borderRadius: 18,
            boxShadow: '0 24px 70px rgba(15,23,42,.28)'
          }}>
            <h3 style={{ margin: 0, fontSize: 20 }}>Delete this comment?</h3>
            <p style={{ margin: '9px 0 18px', color: '#64748b', lineHeight: 1.45 }}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn subtle" onClick={() => setCommentDeleteTarget(null)}>Cancel</button>
              <button type="button" onClick={() => {
                const target = commentDeleteTarget;
                setCommentDeleteTarget(null);
                onDeleteComment?.(target);
              }} style={{
                border: '1px solid rgba(220,38,38,.22)', background: '#fff', color: '#dc2626',
                borderRadius: 10, minHeight: 40, padding: '0 15px', fontWeight: 900, cursor: 'pointer'
              }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </article>
  );
}
