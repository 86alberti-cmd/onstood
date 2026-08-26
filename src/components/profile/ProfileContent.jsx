import React, { useEffect, useState } from 'react';
import {
  FileText,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../utils/formatters';
import Avatar from '../Avatar';

export function ProfileMediaGallery({
  person,
  type = 'image'
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);

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
          <button
            key={`${item.source}-${item.id}`}
            type="button"
            onClick={() =>
              setViewer({
                items,
                index
              })
            }
            style={{
              border: 0,
              padding: 0,
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              borderRadius: 12,
              background: '#0f172a',
              cursor: 'zoom-in',
              position: 'relative'
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
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <img
                src={item.signed_url}
                alt={
                  item.source ===
                  'profile_picture'
                    ? 'Profile picture'
                    : 'Photo'
                }
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}

            {item.source ===
              'profile_picture' && (
              <span
                style={{
                  position: 'absolute',
                  left: 7,
                  bottom: 7,
                  padding: '4px 7px',
                  borderRadius: 999,
                  background:
                    'rgba(15,23,42,.78)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                Profile picture
              </span>
            )}
          </button>
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
          />
        )}

        {tab === 'videos' && (
          <ProfileMediaGallery
            person={person}
            type="video"
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

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    if (!person?.id) {
      setItems([]);
      setLoading(false);
      return;
    }


    let active = true;


    async function loadTimeline() {

      setLoading(true);


      const [
        postsResult,
        docsResult
      ] = await Promise.all([

        supabase
          .from('posts')
          .select(`
            id,
            body,
            created_at,
            user_id,
            audience,
            shared_from_post_id,
            post_media (
              id,
              media_type,
              storage_path,
              mime_type,
              sort_order,
              created_at
            )
          `)
          .eq(
            'user_id',
            person.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(60),

        supabase
          .from('documents')
          .select(`
            id,
            user_id,
            file_name,
            storage_path,
            mime_type,
            created_at,
            visibility
          `)
          .eq(
            'user_id',
            person.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(40)

      ]);


      if (!active) {
        return;
      }


      if (postsResult.error) {
        console.error(
          'Profile timeline posts error:',
          postsResult.error
        );
      }


      if (docsResult.error) {
        console.error(
          'Profile timeline documents error:',
          docsResult.error
        );
      }


      const signedPosts =
        await Promise.all(
          (postsResult.data || []).map(
            async post => {
              const signedMedia =
                await Promise.all(
                  (post.post_media || [])
                    .sort(
                      (a, b) =>
                        (a.sort_order || 0) -
                        (b.sort_order || 0)
                    )
                    .map(async media => {
                      const { data } =
                        await supabase.storage
                          .from('post-media')
                          .createSignedUrl(
                            media.storage_path,
                            60 * 60
                          );

                      return {
                        ...media,
                        signed_url:
                          data?.signedUrl ||
                          null
                      };
                    })
                );

              return {
                ...post,
                post_media:
                  signedMedia
              };
            }
          )
        );


      const posts =
        signedPosts.map(
          post => ({
            kind: 'post',
            id: `post-${post.id}`,
            created_at:
              post.created_at,
            data: post
          })
        );


      const rawDocs =
        docsResult.data || [];


      const docsWithLinks =
        await Promise.all(
          rawDocs.map(
            async document => {

              let signedUrl = null;


              if (
                document.storage_path
              ) {

                const {
                  data
                } = await supabase
                  .storage
                  .from(
                    'student-documents'
                  )
                  .createSignedUrl(
                    document.storage_path,
                    300
                  );


                signedUrl =
                  data?.signedUrl ||
                  null;

              }


              return {
                kind: 'document',
                id:
                  `document-${document.id}`,
                created_at:
                  document.created_at,
                data: {
                  ...document,
                  signed_url:
                    signedUrl
                }
              };

            }
          )
        );


      if (!active) {
        return;
      }


      const merged = [
        ...posts,
        ...docsWithLinks
      ].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );


      setItems(merged);
      setLoading(false);

    }


    loadTimeline();


    return () => {
      active = false;
    };

  }, [
    person?.id,
    connectionStatus
  ]);


  if (loading) {

    return (
      <div
        className="empty"
        style={{
          marginTop: 16
        }}
      >
        Loading Onstream…
      </div>
    );

  }


  return (

    <div
      style={{
        marginTop: 26,
        paddingTop: 22,
        borderTop:
          '1px solid rgba(0,0,0,0.08)'
      }}
    >

      <div className="section-heading">

        <div>
          <span className="eyebrow dark">
            ONSTREAM
          </span>

          <h3
            style={{
              marginTop: 4
            }}
          >
            Posts & shared materials
          </h3>

          <small className="muted">
            {
              connectionStatus ===
              'connected'
                ? 'You are connected. Public and connections-only items are visible.'
                : 'You are not connected. Only public items are visible.'
            }
          </small>
        </div>

      </div>


      {items.length === 0 ? (

        <div className="empty compact">
          No Onstream items are visible to you.
        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 14
          }}
        >

          {items.map(item => {

            if (
              item.kind === 'post'
            ) {

              const post =
                item.data;


              return (

                <article
                  key={item.id}
                  className="card"
                  style={{
                    padding: 16
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems:
                          'center'
                      }}
                    >

                      <Avatar
                        profile={person}
                      />

                      <div>
                        <b>
                          {person.name || ''}
                          {' '}
                          {person.surname || ''}
                        </b>

                        <small
                          className="muted"
                          style={{
                            display:
                              'block'
                          }}
                        >
                          {
                            fmtDate(
                              post.created_at
                            )
                          }
                          {' · '}
                          {
                            post.audience ===
                            'connections'
                              ? 'Connections'
                              : post.audience ===
                                  'only_me'
                                ? 'Only me'
                                : 'Public'
                          }
                        </small>
                      </div>

                    </div>


                    <MessageCircle
                      size={16}
                    />

                  </div>


                  {post.body && (
                    <p
                      style={{
                        whiteSpace:
                          'pre-wrap',
                        marginBottom:
                          (post.post_media || []).length
                            ? 12
                            : 0
                      }}
                    >
                      {post.body}
                    </p>
                  )}

                  {(post.post_media || [])
                    .filter(
                      media =>
                        media.signed_url &&
                        media.media_type !==
                          'document'
                    )
                    .length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          (post.post_media || []).length === 1
                            ? '1fr'
                            : 'repeat(2,minmax(0,1fr))',
                        gap: 7,
                        borderRadius: 12,
                        overflow: 'hidden'
                      }}
                    >
                      {(post.post_media || [])
                        .filter(
                          media =>
                            media.signed_url &&
                            media.media_type !==
                              'document'
                        )
                        .slice(0, 4)
                        .map(media => (
                          <div
                            key={media.id}
                            style={{
                              minHeight: 150,
                              maxHeight: 300,
                              background: '#0f172a',
                              overflow: 'hidden'
                            }}
                          >
                            {media.media_type === 'video' ? (
                              <video
                                src={media.signed_url}
                                controls
                                preload="metadata"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  minHeight: 150,
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            ) : (
                              <img
                                src={media.signed_url}
                                alt="Post photo"
                                onClick={() =>
                                  onImageClick?.(
                                    media.signed_url
                                  )
                                }
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  minHeight: 150,
                                  objectFit: 'cover',
                                  display: 'block',
                                  cursor:
                                    onImageClick
                                      ? 'zoom-in'
                                      : 'default'
                                }}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}


                  {(post.post_media || [])
                    .filter(
                      media =>
                        media.signed_url &&
                        media.media_type ===
                          'document'
                    )
                    .map(media => (
                      <a
                        key={media.id}
                        href={media.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn subtle"
                        style={{
                          marginTop: 7,
                          justifyContent:
                            'flex-start',
                          textDecoration:
                            'none'
                        }}
                      >
                        <FileText size={15} />
                        {media.caption ||
                          'Attached document'}
                      </a>
                    ))}

                  {post.shared_from_post_id && (
                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 8
                      }}
                    >
                      Shared post
                    </small>
                  )}

                </article>

              );

            }


            const document =
              item.data;

            const isImage =
              String(
                document.mime_type ||
                ''
              ).startsWith(
                'image/'
              );


            return (

              <article
                key={item.id}
                className="card"
                style={{
                  padding: 16,
                  overflow: 'hidden'
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
                    marginBottom: 12
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      gap: 9,
                      alignItems:
                        'center'
                    }}
                  >
                    <FileText
                      size={18}
                    />

                    <div>
                      <b>
                        {
                          document.file_name ||
                          'Shared document'
                        }
                      </b>

                      <small
                        className="muted"
                        style={{
                          display: 'block'
                        }}
                      >
                        {
                          fmtDate(
                            document.created_at
                          )
                        }
                        {' · '}
                        {
                          document.visibility ===
                          'connections'
                            ? 'Connections'
                            : 'Public'
                        }
                      </small>
                    </div>
                  </div>

                </div>


                {isImage &&
                document.signed_url ? (

                  <img
                    src={
                      document.signed_url
                    }
                    alt={
                      document.file_name ||
                      'Shared image'
                    }
                    onClick={() =>
                      onImageClick?.(
                        document.signed_url
                      )
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      maxHeight: 520,
                      objectFit:
                        'contain',
                      borderRadius: 12,
                      cursor:
                        onImageClick
                          ? 'zoom-in'
                          : 'pointer',
                      background:
                        'rgba(15,23,42,0.03)'
                    }}
                  />

                ) : (

                  <button
                    type="button"
                    className="btn subtle"
                    disabled={
                      !document.signed_url
                    }
                    onClick={() => {
                      if (
                        document.signed_url
                      ) {
                        window.open(
                          document.signed_url,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }
                    }}
                  >
                    <FileText
                      size={15}
                    />
                    Open document
                  </button>

                )}

              </article>

            );

          })}

        </div>

      )}

    </div>

  );

}
