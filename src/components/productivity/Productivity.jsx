import React, { useEffect, useRef, useState } from 'react';
import { Check, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fmtDate, safeDate, safeDay, safeMonth } from '../../utils/formatters';
import { Page } from '../ui';

export function Calendar({
  profile,
  notify
}) {

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    starts_at: '',
    location: ''
  });


  useEffect(() => {

    let active = true;


    async function loadEvents() {

      setLoadingEvents(true);

      try {

        const {
          data,
          error
        } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', profile.id)
          .order('starts_at', {
            ascending: true
          })
          .limit(50);


        if (error) {
          throw error;
        }


        if (!active) {
          return;
        }


        const safeEvents =
          (Array.isArray(data) ? data : [])
            .filter(item =>
              item &&
              typeof item === 'object' &&
              item.id
            );


        setEvents(safeEvents);

      } catch (error) {

        console.error(
          'Calendar load error:',
          error
        );

        if (active) {
          setEvents([]);
        }

        notify(
          error?.message ||
          'Could not load calendar.'
        );

      } finally {

        if (active) {
          setLoadingEvents(false);
        }

      }

    }


    loadEvents();


    return () => {
      active = false;
    };

  }, [profile.id]);


  async function addEvent(event) {

    event.preventDefault();


    const title =
      form.title.trim();

    const startsAt =
      safeDate(form.starts_at);


    if (!title || !startsAt) {

      notify(
        'Add a valid event title and date.'
      );

      return;
    }


    setSaving(true);


    try {

      const payload = {
        user_id: profile.id,
        title,
        starts_at:
          startsAt.toISOString(),
        location:
          form.location.trim()
      };


      const {
        data,
        error
      } = await supabase
        .from('calendar_events')
        .insert(payload)
        .select()
        .single();


      if (error) {
        throw error;
      }


      setEvents(current =>
        [...current, data]
          .filter(Boolean)
          .sort((a, b) => {

            const aDate =
              safeDate(a?.starts_at);

            const bDate =
              safeDate(b?.starts_at);


            if (!aDate && !bDate) {
              return 0;
            }

            if (!aDate) {
              return 1;
            }

            if (!bDate) {
              return -1;
            }

            return (
              aDate.getTime() -
              bDate.getTime()
            );

          })
      );


      setForm({
        title: '',
        starts_at: '',
        location: ''
      });


      notify(
        'Event added.'
      );

    } catch (error) {

      console.error(
        'Calendar save error:',
        error
      );

      notify(
        error?.message ||
        'Could not save event.'
      );

    } finally {

      setSaving(false);

    }

  }


  async function deleteEvent(id) {

    if (!id) {
      return;
    }


    try {

      const {
        error
      } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq(
          'user_id',
          profile.id
        );


      if (error) {
        throw error;
      }


      setEvents(current =>
        current.filter(item =>
          item?.id !== id
        )
      );


      notify(
        'Event deleted.'
      );

    } catch (error) {

      console.error(
        'Calendar delete error:',
        error
      );

      notify(
        error?.message ||
        'Could not delete event.'
      );

    }

  }


  return (

    <Page
      eyebrow="PLANNER"
      title="Your calendar"
    >

      <div className="two-col">

        <div className="card">

          <h3>
            Upcoming
          </h3>


          {loadingEvents ? (

            <div className="empty compact">
              Loading events…
            </div>

          ) : events.length === 0 ? (

            <div className="empty compact">
              No events yet.
            </div>

          ) : (

            events.map(item => {

              const title =
                typeof item?.title === 'string'
                  ? item.title
                  : 'Untitled event';

              const location =
                typeof item?.location === 'string'
                  ? item.location
                  : '';

              return (

                <div
                  className="event-row"
                  key={
                    item.id ||
                    `${title}-${item.starts_at || ''}`
                  }
                >

                  <div className="event-date">

                    {safeDay(
                      item.starts_at
                    )}

                    <small>
                      {safeMonth(
                        item.starts_at
                      )}
                    </small>

                  </div>


                  <div className="event-info">

                    <b>
                      {title}
                    </b>

                    <small>

                      {fmtDate(
                        item.starts_at
                      ) || 'Date not available'}

                      {location
                        ? ` · ${location}`
                        : ''}

                    </small>

                  </div>


                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      deleteEvent(
                        item.id
                      )
                    }
                    title="Delete event"
                  >
                    <Trash2 size={15} />
                  </button>

                </div>

              );

            })

          )}

        </div>


        <form
          className="card form-card"
          onSubmit={addEvent}
        >

          <h3>
            New event
          </h3>


          <input
            id="calendar-title"
            name="calendar-title"
            placeholder="Event title"
            value={form.title}
            onChange={e =>
              setForm(current => ({
                ...current,
                title:
                  e.target.value
              }))
            }
            required
          />


          <input
            id="calendar-starts-at"
            name="calendar-starts-at"
            type="datetime-local"
            value={form.starts_at}
            onChange={e =>
              setForm(current => ({
                ...current,
                starts_at:
                  e.target.value
              }))
            }
            required
          />


          <input
            id="calendar-location"
            name="calendar-location"
            placeholder="Location / online link"
            value={form.location}
            onChange={e =>
              setForm(current => ({
                ...current,
                location:
                  e.target.value
              }))
            }
          />


          <button
            type="submit"
            className="btn primary full"
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : 'Save event'}
          </button>

        </form>

      </div>

    </Page>

  );

}

export function Tasks({
  profile,
  notify
}) {

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');


  useEffect(() => {

    let active = true;

    async function loadTasks() {

      const {
        data,
        error
      } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', profile.id)
        .order('done')
        .order('due_at', {
          ascending: true,
          nullsFirst: false
        });


      if (error) {
        notify(error.message);
      }

      if (active) {
        setTasks(data || []);
      }

    }

    loadTasks();

    return () => {
      active = false;
    };

  }, [profile.id]);


  async function addTask(event) {

    event.preventDefault();

    if (!title.trim()) return;

    const {
      error
    } = await supabase
      .from('tasks')
      .insert({
        user_id: profile.id,
        title: title.trim()
      });

    if (error) {
      notify(error.message);
      return;
    }

    setTitle('');

    window.location.reload();
  }


  async function toggleTask(task) {

    const {
      error
    } = await supabase
      .from('tasks')
      .update({
        done: !task.done
      })
      .eq('id', task.id)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setTasks(current =>
      current.map(item =>
        item.id === task.id
          ? { ...item, done: !item.done }
          : item
      )
    );
  }


  async function deleteTask(id) {

    const {
      error
    } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      notify(error.message);
      return;
    }

    setTasks(current =>
      current.filter(task =>
        task.id !== id
      )
    );
  }


  return (
    <Page
      eyebrow="ORGANIZE"
      title="Tasks"
      action={
        <span className="muted">
          Stay one step ahead.
        </span>
      }
    >

      <form
        className="card task-add"
        onSubmit={addTask}
      >

        <input
          placeholder="What needs to be done?"
          value={title}
          onChange={e =>
            setTitle(e.target.value)
          }
        />

        <button className="btn primary">
          <Plus size={16} />
          Add
        </button>

      </form>


      <div className="card">

        {tasks.length === 0 ? (

          <div className="empty compact">
            No tasks. Add your first one above.
          </div>

        ) : (

          tasks.map(task => (

            <div
              className={
                `task ${task.done ? 'done' : ''}`
              }
              key={task.id}
            >

              <button
                className="check"
                onClick={() =>
                  toggleTask(task)
                }
              >
                {task.done && (
                  <Check size={15} />
                )}
              </button>

              <span>
                {task.title}
              </span>

              <button
                className="icon-btn"
                onClick={() =>
                  deleteTask(task.id)
                }
              >
                <Trash2 size={15} />
              </button>

            </div>

          ))

        )}

      </div>

    </Page>
  );
}

export function Documents({
  profile,
  notify
}) {

  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadVisibility, setUploadVisibility] = useState('');
  const [uploadKnowledgeConsent, setUploadKnowledgeConsent] = useState(false);
  const fileInputRef = useRef(null);


  useEffect(() => {

    let active = true;


    async function loadDocuments() {

      setLoadingDocs(true);


      try {

        const {
          data,
          error
        } = await supabase
          .from('documents')
          .select('*')
          .eq(
            'user_id',
            profile.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          );


        if (error) {
          throw error;
        }


        if (!active) {
          return;
        }


        const safeDocs =
          (Array.isArray(data) ? data : [])
            .filter(item =>
              item &&
              typeof item === 'object' &&
              item.id
            );


        setDocs(safeDocs);

      } catch (error) {

        console.error(
          'Documents load error:',
          error
        );

        if (active) {
          setDocs([]);
        }

        notify(
          error?.message ||
          'Could not load documents.'
        );

      } finally {

        if (active) {
          setLoadingDocs(false);
        }

      }

    }


    loadDocuments();


    return () => {
      active = false;
    };

  }, [profile.id]);


  function chooseDocument(event) {

    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 25 * 1024 * 1024;

    if (file.size > maxSize) {
      notify('Document must be smaller than 25 MB.');
      input.value = '';
      return;
    }

    // Do not upload yet. The user must explicitly choose visibility first.
    setPendingFile(file);
    setUploadVisibility('');
  }


  function cancelPendingUpload() {
    setPendingFile(null);
    setUploadVisibility('');
    setUploadKnowledgeConsent(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }


  async function upload() {

    const file = pendingFile;

    if (!file || !uploadVisibility) {
      return;
    }

    setBusy(true);

    let uploadedPath = null;

    try {

      const safeName =
        String(file.name || 'document')
          .replace(/[\\/]/g, '-');

      uploadedPath =
        `${profile.id}/${crypto.randomUUID()}-${safeName}`;

      const {
        error: uploadError
      } = await supabase
        .storage
        .from('student-documents')
        .upload(
          uploadedPath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType:
              file.type ||
              'application/octet-stream'
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data,
        error: dbError
      } = await supabase
        .from('documents')
        .insert({
          user_id: profile.id,
          file_name: file.name || 'Document',
          storage_path: uploadedPath,
          mime_type:
            file.type ||
            'application/octet-stream',
          visibility: uploadVisibility,
          knowledge_consent: uploadKnowledgeConsent,
          ai_opt_in: uploadKnowledgeConsent
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      setDocs(current => [
        data,
        ...current
      ].filter(Boolean));

      if (uploadKnowledgeConsent) {
        const {
          data: knowledgeData,
          error: knowledgeError
        } = await supabase.functions.invoke(
          'onstood-knowledge-ingest',
          {
            body: {
              document_id: data.id,
              action: 'ingest'
            }
          }
        );

        if (knowledgeError || knowledgeData?.error) {
          notify(
            `Document uploaded. ONSTOOD Knowledge indexing: ${
              knowledgeData?.error ||
              knowledgeError?.message ||
              'not available yet'
            }`
          );
        } else {
          notify(
            'Document uploaded and added to ONSTOOD Knowledge.'
          );
        }
      } else {
        notify('Document uploaded.');
      }

      cancelPendingUpload();

    } catch (error) {

      console.error(
        'Document upload error:',
        error
      );

      if (uploadedPath) {
        await supabase
          .storage
          .from('student-documents')
          .remove([uploadedPath]);
      }

      notify(
        error?.message ||
        'Could not upload document.'
      );

    } finally {
      setBusy(false);
    }
  }

  async function openDocument(item) {

    const path =
      item?.storage_path;


    if (
      !path ||
      typeof path !== 'string'
    ) {

      notify(
        'This document has no valid storage path.'
      );

      return;
    }


    try {

      const {
        data,
        error
      } = await supabase
        .storage
        .from('student-documents')
        .createSignedUrl(
          path,
          300
        );


      if (error) {
        throw error;
      }


      if (!data?.signedUrl) {

        throw new Error(
          'Could not create document link.'
        );

      }


      window.open(
        data.signedUrl,
        '_blank',
        'noopener,noreferrer'
      );

    } catch (error) {

      console.error(
        'Open document error:',
        error
      );

      notify(
        error?.message ||
        'Could not open document.'
      );

    }

  }


  async function updateDocumentVisibility(
    item,
    visibility
  ) {
    if (
      !item?.id ||
      !['private', 'connections', 'public'].includes(visibility)
    ) {
      return;
    }

    const { data, error } = await supabase
      .from('documents')
      .update({ visibility })
      .eq('id', item.id)
      .eq('user_id', profile.id)
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setDocs(current =>
      current.map(document =>
        document.id === item.id ? data : document
      )
    );

    notify(
      visibility === 'public'
        ? 'Document is public.'
        : visibility === 'connections'
          ? 'Document is visible to connections.'
          : 'Document is private.'
    );
  }

  async function updateDocumentKnowledge(
    item,
    enabled
  ) {
    if (!item?.id) return;

    const { data, error } = await supabase
      .from('documents')
      .update({
        knowledge_consent: enabled,
        ai_opt_in: enabled
      })
      .eq('id', item.id)
      .eq('user_id', profile.id)
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setDocs(current =>
      current.map(document =>
        document.id === item.id ? data : document
      )
    );

    const { data: knowledgeData, error: knowledgeError } =
      await supabase.functions.invoke(
        'onstood-knowledge-ingest',
        {
          body: {
            document_id: item.id,
            action: enabled ? 'ingest' : 'revoke'
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
      enabled
        ? 'Document contributed to ONSTOOD Knowledge.'
        : 'Document removed from ONSTOOD Knowledge.'
    );
  }


  async function deleteDocument(item) {

    if (!item?.id) {
      return;
    }


    try {

      if (
        typeof item.storage_path ===
        'string'
      ) {

        const {
          error: storageError
        } = await supabase
          .storage
          .from('student-documents')
          .remove([
            item.storage_path
          ]);


        if (storageError) {
          throw storageError;
        }

      }


      const {
        error
      } = await supabase
        .from('documents')
        .delete()
        .eq(
          'id',
          item.id
        )
        .eq(
          'user_id',
          profile.id
        );


      if (error) {
        throw error;
      }


      setDocs(current =>
        current.filter(document =>
          document?.id !== item.id
        )
      );


      notify(
        'Document deleted.'
      );

    } catch (error) {

      console.error(
        'Delete document error:',
        error
      );

      notify(
        error?.message ||
        'Could not delete document.'
      );

    }

  }


  return (

    <Page
      eyebrow="YOUR SPACE"
      title="Documents"

      action={

        <label
          className="btn primary upload-btn"
          style={{
            cursor:
              busy
                ? 'default'
                : 'pointer'
          }}
        >

          <Upload size={16} />

          {busy
            ? 'Uploading…'
            : 'Upload document'}


          <input
            ref={fileInputRef}
            type="file"
            onChange={chooseDocument}
            hidden
            disabled={busy}
          />

        </label>

      }
    >

      <div className="card dropzone">

        <FileText size={28} />

        <h3>
          Your study library
        </h3>

        <p>
          Choose who can open each file: Only me, Connections, or Public. ONSTOOD Knowledge is a separate permission, so even a private file can contribute useful study knowledge without changing its visibility.
        </p>

      </div>


      {pendingFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(15,23,42,0.48)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
          onMouseDown={event => {
            if (event.target === event.currentTarget && !busy) {
              cancelPendingUpload();
            }
          }}
        >
          <div
            className="card"
            style={{
              width: 'min(520px, 100%)',
              padding: 22,
              boxShadow: '0 24px 70px rgba(15,23,42,0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <small className="muted">DOCUMENT PRIVACY</small>
                <h3 style={{ margin: '5px 0 6px' }}>Who can use this document?</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Choose one option before upload. Nothing is uploaded until you confirm.
                </p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={cancelPendingUpload}
                disabled={busy}
                title="Cancel upload"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#f8fafc',
                overflowWrap: 'anywhere'
              }}
            >
              <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              <b>{pendingFile.name}</b>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {[
                ['private', 'Only me', 'Only you can open the original document.'],
                ['connections', 'Connections', 'Your accepted connections can open the original document.'],
                ['public', 'Public', 'Any signed-in ONSTOOD user can access the original document.']
              ].map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUploadVisibility(value)}
                  disabled={busy}
                  style={{
                    border: uploadVisibility === value
                      ? '2px solid #6558ff'
                      : '1px solid #e2e8f0',
                    background: uploadVisibility === value
                      ? '#f5f3ff'
                      : '#fff',
                    borderRadius: 14,
                    padding: '13px 14px',
                    textAlign: 'left',
                    cursor: busy ? 'default' : 'pointer'
                  }}
                >
                  <b>{title}</b>
                  <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                    {description}
                  </small>
                </button>
              ))}
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                marginTop: 14,
                padding: '12px 13px',
                borderRadius: 12,
                border: '1px solid rgba(99,102,241,.18)',
                background: uploadKnowledgeConsent
                  ? 'rgba(99,102,241,.07)'
                  : '#fff',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={uploadKnowledgeConsent}
                onChange={event =>
                  setUploadKnowledgeConsent(
                    event.target.checked
                  )
                }
                style={{ marginTop: 2 }}
              />
              <span>
                <b>Contribute to ONSTOOD Knowledge</b>
                <small className="muted" style={{ display: 'block', marginTop: 3, lineHeight: 1.45 }}>
                  This is separate from visibility. ONSTOOD may use the study knowledge to help other students inside ONSTOOD. Personal identifiers are filtered and the material is not authorized for external AI training/indexing.
                </small>
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn subtle"
                onClick={cancelPendingUpload}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={upload}
                disabled={busy || !uploadVisibility}
                style={{
                  opacity: busy || !uploadVisibility ? 0.55 : 1,
                  cursor: busy || !uploadVisibility ? 'not-allowed' : 'pointer'
                }}
              >
                <Upload size={16} />
                {busy ? 'Uploading…' : 'Confirm & upload'}
              </button>
            </div>
          </div>
        </div>
      )}


      {loadingDocs ? (

        <div className="empty">
          Loading documents…
        </div>

      ) : docs.length === 0 ? (

        <div className="empty">
          No documents yet.
        </div>

      ) : (

        <div className="doc-grid">

          {docs.map(item => {

            const fileName =
              typeof item?.file_name === 'string' &&
              item.file_name.trim()
                ? item.file_name
                : 'Document';


            return (

              <div
                className="card doc"
                key={
                  item.id ||
                  item.storage_path ||
                  fileName
                }
                style={{
                  position: 'relative'
                }}
              >

                <button
                  type="button"
                  onClick={() =>
                    openDocument(item)
                  }
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >

                  <FileText />

                  <div>

                    <b>
                      {fileName}
                    </b>

                    <small>
                      {fmtDate(
                        item.created_at
                      ) || 'Stored document'}
                    </small>

                  </div>

                </button>


                <label
                  style={{
                    display: 'block',
                    marginTop: 10
                  }}
                >
                  <small className="muted">
                    Visibility
                  </small>

                  <select
                    name={`document-visibility-${item.id}`}
                    value={
                      item.visibility === 'onstood_ai'
                        ? 'private'
                        : item.visibility || 'private'
                    }
                    onChange={event =>
                      updateDocumentVisibility(
                        item,
                        event.target.value
                      )
                    }
                    style={{
                      marginTop: 5,
                      width: '100%'
                    }}
                  >
                    <option value="private">
                      Private
                    </option>

                    <option value="connections">
                      Connections
                    </option>

                    <option value="public">
                      Public
                    </option>
                  </select>
                </label>

                <label
                  title="This permission is independent from document visibility."
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginTop: 9,
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(
                      item.knowledge_consent ?? item.ai_opt_in
                    )}
                    onChange={event =>
                      updateDocumentKnowledge(
                        item,
                        event.target.checked
                      )
                    }
                  />
                  ONSTOOD Knowledge
                </label>


                <button
                  type="button"
                  className="icon-btn"
                  title="Delete document"
                  onClick={() =>
                    deleteDocument(item)
                  }
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10
                  }}
                >
                  <Trash2 size={15} />
                </button>

              </div>

            );

          })}

        </div>

      )}

    </Page>

  );

}
