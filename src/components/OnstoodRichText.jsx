import React from 'react';
import OnstoodWordmark from './OnstoodWordmark';

export function OnstoodRichText({ children }) {
  const text = String(children ?? '');
  const parts = text.split(/(ONSTOOD|Onstood|OnStood)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^(ONSTOOD|Onstood|OnStood)$/.test(part)
          ? <OnstoodWordmark key={index} />
          : <React.Fragment key={index}>{part}</React.Fragment>
      )}
    </>
  );
}
