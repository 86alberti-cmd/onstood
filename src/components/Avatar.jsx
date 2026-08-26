import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function initials(profile) {
  const first =
    profile?.name?.trim()?.[0] || 'S';

  const last =
    profile?.surname?.trim()?.[0] || '';

  return `${first}${last}`.toUpperCase();
}

export default function Avatar({
  profile,
  size = '',
  onImageClick
}) {

  const [src, setSrc] =
    useState(null);


  useEffect(() => {

    let active = true;


    async function loadAvatar() {

      const path =
        profile?.avatar_url;


      if (!path) {

        if (active) {
          setSrc(null);
        }

        return;
      }


      /*
       * Compatibility with an existing
       * complete URL.
       */

      if (
        path.startsWith('http://') ||
        path.startsWith('https://')
      ) {

        if (active) {
          setSrc(path);
        }

        return;
      }


      const {
        data,
        error
      } = await supabase.storage
        .from('avatars')
        .createSignedUrl(
          path,
          60 * 60
        );


      if (
        !error &&
        data?.signedUrl &&
        active
      ) {

        setSrc(data.signedUrl);

      } else if (active) {

        setSrc(null);

      }

    }


    loadAvatar();


    return () => {
      active = false;
    };

  }, [profile?.avatar_url]);


  function handleImageClick(event) {

    event.stopPropagation();

    if (
      src &&
      typeof onImageClick === 'function'
    ) {

      onImageClick(src);

    }

  }


  return (

    <div
      className={`avatar ${size}`}
      onClick={
        src && onImageClick
          ? handleImageClick
          : undefined
      }
      style={{
        cursor:
          src && onImageClick
            ? 'zoom-in'
            : 'default'
      }}
      title={
        src && onImageClick
          ? 'View profile photo'
          : undefined
      }
    >

      {src ? (

        <img
          src={src}
          alt={
            `${profile?.name || ''} ${profile?.surname || ''}`
              .trim()
          }
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit',
            display: 'block'
          }}
        />

      ) : (

        initials(profile)

      )}

    </div>

  );
}
