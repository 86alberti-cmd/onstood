import React, { useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import {
  FileText,
  Heart,
  Mail,
  MessageCircle,
  Send,
  Trash2,
  X
} from 'lucide-react';
import Avatar from '../Avatar';
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
  onKnowledgeChange
}) {

  const author =
    post.profiles || {};

  const [mediaViewer, setMediaViewer] =
    useState(null);

  const [commentsOpen, setCommentsOpen] =
    useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] =
    useState(false);

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
            <select
              value={post.audience || 'public'}
              onChange={event =>
                onAudienceChange?.(
                  event.target.value
                )
              }
              title="Post privacy"
              style={{
                width: 'auto',
                minWidth: 118,
                padding: '6px 8px'
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

      {mediaViewer && (
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
        </div>
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

          {comments.map(comment => (
          <div
            key={comment.id}
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'flex-start'
            }}
          >
            <Avatar
              profile={
                comment.profiles || {}
              }
            />

            <div
              style={{
                flex: 1,
                padding: '9px 11px',
                borderRadius: 12,
                background:
                  'rgba(15,23,42,0.05)'
              }}
            >
              <b
                style={{
                  fontSize: 13
                }}
              >
                {comment.profiles?.name ||
                  'Student'}{' '}
                {comment.profiles?.surname ||
                  ''}
              </b>

              <div
                style={{
                  marginTop: 3
                }}
              >
                {comment.body}
              </div>

              <small className="muted">
                {fmtDate(
                  comment.created_at
                )}
              </small>
            </div>
          </div>
        ))}


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

      {deleteConfirmOpen && (
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
        </div>
      )}

    </article>
  );
}
