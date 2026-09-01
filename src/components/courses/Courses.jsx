import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { Activity, BookOpen, CalendarDays, CheckCircle2, ChevronRight, FileText, Plus, Search, Send, Upload, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../utils/formatters';
import { CourseTypeBadge, Page } from '../ui';


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


export default function Courses({
  profile,
  notify
}) {

  const [courses, setCourses] =
    useState([]);

  const [enrollments, setEnrollments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [selectedCourse, setSelectedCourse] =
    useState(null);

  const [workspaceTab, setWorkspaceTab] =
    useState('overview');

  const [sessions, setSessions] =
    useState([]);

  const [lessons, setLessons] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [members, setMembers] =
    useState([]);

  const [attendance, setAttendance] =
    useState([]);

  const [workspaceLoading, setWorkspaceLoading] =
    useState(false);

  const [courseForm, setCourseForm] =
    useState({
      title: '',
      description: '',
      course_type: 'free',
      language: 'English',
      price: ''
    });

  const [sessionForm, setSessionForm] =
    useState({
      title: '',
      starts_at: '',
      room_url: ''
    });


  const [lessonForm, setLessonForm] =
    useState({
      title: '',
      summary: '',
      content: '',
      file: null
    });

  const [assignmentForm, setAssignmentForm] =
    useState({
      title: '',
      instructions: '',
      due_at: ''
    });

  const [submissions, setSubmissions] =
    useState([]);

  const [submissionText, setSubmissionText] =
    useState({});

  const [liveHands, setLiveHands] =
    useState([]);

  const [liveChat, setLiveChat] =
    useState([]);

  const [liveChatText, setLiveChatText] =
    useState('');


  async function loadCourses() {

    setLoading(true);


    const [
      coursesResult,
      enrollmentsResult
    ] = await Promise.all([

      supabase
        .from('courses')
        .select(`
          id,
          owner_id,
          title,
          description,
          course_type,
          status,
          language,
          price_cents,
          currency,
          starts_at,
          ends_at,
          created_at
        `)
        .neq(
          'status',
          'archived'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        ),

      supabase
        .from('course_enrollments')
        .select(`
          id,
          course_id,
          user_id,
          role,
          status,
          enrolled_at
        `)
        .eq(
          'user_id',
          profile.id
        )
        .eq(
          'status',
          'active'
        )

    ]);


    if (coursesResult.error) {
      notify(
        coursesResult.error.message
      );
    }


    if (enrollmentsResult.error) {
      notify(
        enrollmentsResult.error.message
      );
    }


    setCourses(
      coursesResult.data || []
    );

    setEnrollments(
      enrollmentsResult.data || []
    );

    setLoading(false);

  }


  useEffect(() => {

    loadCourses();

  }, [profile.id]);


  const enrolledIds =
    new Set(
      enrollments.map(item =>
        item.course_id
      )
    );


  const myCourses =
    courses.filter(course =>
      course.owner_id === profile.id ||
      enrolledIds.has(course.id)
    );


  const discoverCourses =
    courses.filter(course =>
      course.status === 'published' &&
      course.course_type !== 'private' &&
      course.owner_id !== profile.id &&
      !enrolledIds.has(course.id)
    );


  async function createCourse(
    event
  ) {

    event.preventDefault();


    const title =
      courseForm.title.trim();

    const description =
      courseForm.description.trim();


    if (!title) {
      return;
    }


    let priceCents = 0;


    if (
      courseForm.course_type ===
        'paid'
    ) {

      const parsed =
        Number(
          courseForm.price
        );


      if (
        !Number.isFinite(parsed) ||
        parsed <= 0
      ) {

        notify(
          'Enter a valid course price.'
        );

        return;
      }


      priceCents =
        Math.round(
          parsed * 100
        );

    }


    setCreating(true);


    const {
      data,
      error
    } = await supabase
      .from('courses')
      .insert({
        owner_id:
          profile.id,
        title,
        name:
          title,
        description,
        course_type:
          courseForm.course_type,
        status:
          'published',
        language:
          courseForm.language.trim() ||
          'English',
        price_cents:
          priceCents,
        currency:
          'EUR'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.message
      );

      setCreating(false);

      return;
    }


    setCourses(current => [
      data,
      ...current
    ]);

    setCourseForm({
      title: '',
      description: '',
      course_type: 'free',
      language: 'English',
      price: ''
    });

    setShowCreate(false);
    setCreating(false);

    notify(
      'Course published.'
    );

  }


  async function joinCourse(
    course
  ) {

    if (
      course.course_type ===
        'paid'
    ) {

      notify(
        'Paid enrollment is prepared. Payments will be connected in the next phase.'
      );

      return;
    }


    const {
      data,
      error
    } = await supabase
      .from(
        'course_enrollments'
      )
      .insert({
        course_id:
          course.id,
        user_id:
          profile.id,
        role:
          'student',
        status:
          'active'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.code === '23505'
          ? 'You are already enrolled.'
          : error.message
      );

      return;
    }


    setEnrollments(current => [
      data,
      ...current
    ]);

    notify(
      `Joined ${course.title}.`
    );

  }


  async function openCourse(
    course
  ) {

    setSelectedCourse(
      course
    );

    setWorkspaceTab(
      'overview'
    );

  }


  useEffect(() => {

    if (
      !selectedCourse?.id
    ) {

      setSessions([]);
      setLessons([]);
      setAssignments([]);
      setMembers([]);
      setAttendance([]);

      return;
    }


    let active = true;


    async function loadWorkspace() {

      setWorkspaceLoading(
        true
      );


      const [
        sessionsResult,
        lessonsResult,
        assignmentsResult,
        membersResult
      ] = await Promise.all([

        supabase
          .from(
            'course_sessions'
          )
          .select('*')
          .eq(
            'course_id',
            selectedCourse.id
          )
          .order(
            'starts_at',
            {
              ascending: true
            }
          ),

        supabase
          .from(
            'course_lessons'
          )
          .select('*')
          .eq(
            'course_id',
            selectedCourse.id
          )
          .order(
            'position'
          ),

        supabase
          .from(
            'course_assignments'
          )
          .select('*')
          .eq(
            'course_id',
            selectedCourse.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          ),

        supabase
          .from(
            'course_enrollments'
          )
          .select(`
            id,
            user_id,
            role,
            status,
            enrolled_at
          `)
          .eq(
            'course_id',
            selectedCourse.id
          )
          .eq(
            'status',
            'active'
          )

      ]);


      let attendanceResult = {
        data: [],
        error: null
      };


      const sessionIds =
        (sessionsResult.data || [])
          .map(item => item.id)
          .filter(Boolean);


      if (sessionIds.length) {

        attendanceResult =
          await supabase
            .from(
              'course_session_attendance'
            )
            .select(`
              id,
              session_id,
              user_id,
              joined_at,
              left_at,
              last_seen_at
            `)
            .in(
              'session_id',
              sessionIds
            );

      }


      if (!active) {
        return;
      }


      [
        sessionsResult,
        lessonsResult,
        assignmentsResult,
        membersResult,
        attendanceResult
      ].forEach(result => {

        if (result.error) {
          console.error(
            'Course workspace load error:',
            result.error
          );
        }

      });


      setSessions(
        sessionsResult.data || []
      );

      setLessons(
        lessonsResult.data || []
      );

      setAssignments(
        assignmentsResult.data || []
      );

      setMembers(
        membersResult.data || []
      );

      setAttendance(
        attendanceResult.data || []
      );

      setWorkspaceLoading(
        false
      );

    }


    loadWorkspace();


    return () => {
      active = false;
    };

  }, [
    selectedCourse?.id
  ]);


  async function scheduleSession(
    event
  ) {

    event.preventDefault();


    if (
      !selectedCourse?.id ||
      selectedCourse.owner_id !==
        profile.id
    ) {
      return;
    }


    if (
      !sessionForm.title.trim() ||
      !sessionForm.starts_at
    ) {
      return;
    }


    const customRoom =
      sessionForm.room_url.trim();


    const generatedRoomCode =
      `ONSTOOD-${selectedCourse.id.slice(0, 8)}-${createBrowserSafeId().slice(0, 8)}`;


    const roomUrl =
      customRoom ||
      `https://meet.jit.si/${generatedRoomCode}`;


    const provider =
      customRoom
        ? 'external'
        : 'jitsi-test';


    const {
      data,
      error
    } = await supabase
      .from(
        'course_sessions'
      )
      .insert({
        course_id:
          selectedCourse.id,
        created_by:
          profile.id,
        title:
          sessionForm.title.trim(),
        starts_at:
          new Date(
            sessionForm.starts_at
          ).toISOString(),
        room_url:
          roomUrl,
        room_code:
          generatedRoomCode,
        provider,
        status:
          'scheduled'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.message
      );

      return;
    }


    setSessions(current =>
      [
        ...current,
        data
      ].sort(
        (a, b) =>
          new Date(a.starts_at) -
          new Date(b.starts_at)
      )
    );


    setSessionForm({
      title: '',
      starts_at: '',
      room_url: ''
    });


    notify(
      'Live session scheduled.'
    );

  }


  async function registerAttendance(
    session
  ) {

    if (!session?.id) {
      return;
    }


    const now =
      new Date().toISOString();


    const {
      data: existing
    } = await supabase
      .from(
        'course_session_attendance'
      )
      .select('id')
      .eq(
        'session_id',
        session.id
      )
      .eq(
        'user_id',
        profile.id
      )
      .maybeSingle();


    if (existing?.id) {

      const {
        data,
        error
      } = await supabase
        .from(
          'course_session_attendance'
        )
        .update({
          left_at: null,
          last_seen_at: now
        })
        .eq(
          'id',
          existing.id
        )
        .select()
        .single();


      if (!error && data) {

        setAttendance(current => [
          ...current.filter(item =>
            item.id !== data.id
          ),
          data
        ]);

      }

      return;
    }


    const {
      data,
      error
    } = await supabase
      .from(
        'course_session_attendance'
      )
      .insert({
        session_id:
          session.id,
        user_id:
          profile.id,
        joined_at:
          now,
        last_seen_at:
          now
      })
      .select()
      .single();


    if (!error && data) {

      setAttendance(current => [
        ...current,
        data
      ]);

    }

  }


  async function joinRoom(
    session
  ) {

    if (
      !session?.room_url
    ) {

      notify(
        'This classroom does not have a video room yet.'
      );

      return;
    }


    await registerAttendance(
      session
    );


    window.open(
      session.room_url,
      '_blank',
      'noopener,noreferrer'
    );

  }


  async function updateSessionStatus(
    session,
    status
  ) {

    if (
      !session?.id ||
      selectedCourse?.owner_id !==
        profile.id
    ) {
      return;
    }


    const payload = {
      status
    };


    if (status === 'live') {

      payload.starts_at =
        session.starts_at ||
        new Date().toISOString();

    }


    if (status === 'ended') {

      payload.ends_at =
        new Date().toISOString();

    }


    const {
      data,
      error
    } = await supabase
      .from(
        'course_sessions'
      )
      .update(
        payload
      )
      .eq(
        'id',
        session.id
      )
      .select()
      .single();


    if (error) {

      notify(
        error.message
      );

      return;
    }


    setSessions(current =>
      current.map(item =>
        item.id === data.id
          ? data
          : item
      )
    );


    if (status === 'live') {

      await registerAttendance(
        data
      );


      notify(
        'Classroom is live.'
      );


      window.open(
        data.room_url,
        '_blank',
        'noopener,noreferrer'
      );

    } else {

      notify(
        'Live session ended.'
      );

    }

  }


  function attendanceCount(
    sessionId
  ) {

    return attendance.filter(item =>
      item.session_id ===
        sessionId
    ).length;

  }





  useEffect(() => {

    const assignmentIds =
      assignments
        .map(item => item.id)
        .filter(Boolean);

    if (!assignmentIds.length) {
      setSubmissions([]);
      return;
    }

    let active = true;

    async function loadSubmissions() {

      const {
        data,
        error
      } = await supabase
        .from('course_submissions')
        .select('*')
        .in(
          'assignment_id',
          assignmentIds
        )
        .order(
          'submitted_at',
          {
            ascending: false
          }
        );

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          'Submissions load error:',
          error
        );
        return;
      }

      setSubmissions(data || []);
    }

    loadSubmissions();

    return () => {
      active = false;
    };

  }, [
    assignments
      .map(item => item.id)
      .join(',')
  ]);


  useEffect(() => {

    const sessionIds =
      sessions
        .map(item => item.id)
        .filter(Boolean);

    if (!sessionIds.length) {
      setLiveHands([]);
      setLiveChat([]);
      return;
    }

    let active = true;

    async function loadLiveTools() {

      const [
        handsResult,
        chatResult
      ] = await Promise.all([

        supabase
          .from('course_live_hands')
          .select('*')
          .in(
            'session_id',
            sessionIds
          ),

        supabase
          .from('course_live_chat')
          .select('*')
          .in(
            'session_id',
            sessionIds
          )
          .order('created_at')

      ]);

      if (!active) {
        return;
      }

      if (!handsResult.error) {
        setLiveHands(
          handsResult.data || []
        );
      }

      if (!chatResult.error) {
        setLiveChat(
          chatResult.data || []
        );
      }
    }

    loadLiveTools();

    const channel =
      supabase
        .channel(
          `course-live-tools-${selectedCourse?.id || 'none'}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'course_live_hands'
          },
          () => loadLiveTools()
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'course_live_chat'
          },
          payload => {
            if (
              sessionIds.includes(
                payload.new.session_id
              )
            ) {
              setLiveChat(current => [
                ...current,
                payload.new
              ]);
            }
          }
        )
        .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };

  }, [
    selectedCourse?.id,
    sessions
      .map(item => item.id)
      .join(',')
  ]);


  async function createLesson(
    event
  ) {

    event.preventDefault();

    if (
      !selectedCourse?.id ||
      selectedCourse.owner_id !==
        profile.id ||
      !lessonForm.title.trim()
    ) {
      return;
    }

    let storagePath = null;
    let fileName = null;
    let mimeType = null;

    if (lessonForm.file) {

      fileName =
        lessonForm.file.name;

      mimeType =
        lessonForm.file.type;

      storagePath =
        `${selectedCourse.id}/${createBrowserSafeId()}-${fileName}`;

      const {
        error: uploadError
      } = await supabase
        .storage
        .from('course-materials')
        .upload(
          storagePath,
          lessonForm.file
        );

      if (uploadError) {
        notify(uploadError.message);
        return;
      }
    }

    const {
      data,
      error
    } = await supabase
      .from('course_lessons')
      .insert({
        course_id:
          selectedCourse.id,
        created_by:
          profile.id,
        title:
          lessonForm.title.trim(),
        summary:
          lessonForm.summary.trim(),
        content:
          lessonForm.content.trim(),
        position:
          lessons.length,
        storage_path:
          storagePath,
        file_name:
          fileName,
        mime_type:
          mimeType
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setLessons(current => [
      ...current,
      data
    ]);

    setLessonForm({
      title: '',
      summary: '',
      content: '',
      file: null
    });

    notify('Course material published.');
  }


  async function openLessonFile(
    lesson
  ) {

    if (!lesson.storage_path) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .storage
      .from('course-materials')
      .createSignedUrl(
        lesson.storage_path,
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


  async function createAssignment(
    event
  ) {

    event.preventDefault();

    if (
      !selectedCourse?.id ||
      selectedCourse.owner_id !==
        profile.id ||
      !assignmentForm.title.trim()
    ) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from('course_assignments')
      .insert({
        course_id:
          selectedCourse.id,
        created_by:
          profile.id,
        title:
          assignmentForm.title.trim(),
        instructions:
          assignmentForm.instructions.trim(),
        due_at:
          assignmentForm.due_at
            ? new Date(
                assignmentForm.due_at
              ).toISOString()
            : null
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setAssignments(current => [
      data,
      ...current
    ]);

    setAssignmentForm({
      title: '',
      instructions: '',
      due_at: ''
    });

    notify('Assignment published.');
  }


  async function submitAssignment(
    assignment
  ) {

    const body =
      (
        submissionText[
          assignment.id
        ] || ''
      ).trim();

    if (!body) {
      notify(
        'Write your submission first.'
      );
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from('course_submissions')
      .upsert({
        assignment_id:
          assignment.id,
        student_id:
          profile.id,
        body,
        status:
          'submitted',
        submitted_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString()
      }, {
        onConflict:
          'assignment_id,student_id'
      })
      .select()
      .single();

    if (error) {
      notify(error.message);
      return;
    }

    setSubmissions(current => [
      data,
      ...current.filter(
        item =>
          !(
            item.assignment_id ===
              data.assignment_id &&
            item.student_id ===
              data.student_id
          )
      )
    ]);

    notify('Assignment submitted.');
  }


  function currentLiveSession() {

    return (
      sessions.find(item =>
        item.status === 'live'
      ) ||
      sessions.find(item =>
        item.status !== 'ended'
      ) ||
      null
    );
  }


  async function toggleRaiseHand() {

    const session =
      currentLiveSession();

    if (!session) {
      notify(
        'No active classroom session.'
      );
      return;
    }

    const mine =
      liveHands.find(item =>
        item.session_id ===
          session.id &&
        item.user_id ===
          profile.id
      );

    if (mine) {

      const { error } =
        await supabase
          .from('course_live_hands')
          .delete()
          .eq('id', mine.id);

      if (error) {
        notify(error.message);
      }

    } else {

      const { error } =
        await supabase
          .from('course_live_hands')
          .insert({
            session_id:
              session.id,
            user_id:
              profile.id
          });

      if (error) {
        notify(error.message);
      }
    }
  }


  async function lowerHand(
    handId
  ) {

    const {
      error
    } = await supabase
      .from('course_live_hands')
      .delete()
      .eq('id', handId);

    if (error) {
      notify(error.message);
    }

  }


  async function sendLiveChat(
    event
  ) {

    event.preventDefault();

    const session =
      currentLiveSession();

    const body =
      liveChatText.trim();

    if (!session || !body) {
      return;
    }

    const {
      error
    } = await supabase
      .from('course_live_chat')
      .insert({
        session_id:
          session.id,
        user_id:
          profile.id,
        body
      });

    if (error) {
      notify(error.message);
      return;
    }

    setLiveChatText('');
  }


  if (
    selectedCourse
  ) {

    const isOwner =
      selectedCourse.owner_id ===
      profile.id;


    const liveSession =
      sessions.find(item =>
        item.status === 'live'
      );


    const nextSession =
      liveSession ||
      sessions.find(item =>
        item.status !== 'ended' &&
        new Date(
          item.starts_at
        ).getTime() >=
        Date.now()
      );


    const tabs = [
      ['overview', 'Overview'],
      ['live', 'Live Classroom'],
      ['materials', 'Materials'],
      ['assignments', 'Assignments'],
      ['students', 'Students']
    ];


    return (
      <Page
        eyebrow="COURSE WORKSPACE"
        title={
          selectedCourse.title
        }
        action={
          <button
            type="button"
            className="btn subtle"
            onClick={() =>
              setSelectedCourse(
                null
              )
            }
          >
            Back to courses
          </button>
        }
      >

        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden'
          }}
        >

          <div
            style={{
              padding:
                '22px 22px 18px',
              borderBottom:
                '1px solid rgba(15,23,42,0.08)'
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >

              <div>

                <CourseTypeBadge
                  type={
                    selectedCourse.course_type
                  }
                />

                <p
                  className="muted"
                  style={{
                    maxWidth: 720,
                    margin:
                      '12px 0 0'
                  }}
                >
                  {
                    selectedCourse.description ||
                    'Course workspace for lessons, live sessions, assignments and classmates.'
                  }
                </p>

              </div>


              <div
                style={{
                  textAlign:
                    'right'
                }}
              >
                <b>
                  {
                    selectedCourse.language ||
                    'English'
                  }
                </b>

                <small
                  className="muted"
                  style={{
                    display:
                      'block'
                  }}
                >
                  {
                    isOwner
                      ? 'Course owner'
                      : 'Enrolled student'
                  }
                </small>
              </div>

            </div>

          </div>


          <div
            style={{
              display: 'flex',
              gap: 6,
              padding:
                '10px 14px',
              borderBottom:
                '1px solid rgba(15,23,42,0.08)',
              overflowX:
                'auto'
            }}
          >

            {tabs.map(
              ([id, label]) => (

                <button
                  key={id}
                  type="button"
                  className={
                    workspaceTab === id
                      ? 'btn primary'
                      : 'btn subtle'
                  }
                  onClick={() =>
                    setWorkspaceTab(
                      id
                    )
                  }
                >
                  {label}
                </button>

              )
            )}

          </div>


          <div
            style={{
              padding: 22
            }}
          >

            {workspaceLoading ? (

              <div className="empty">
                Loading course…
              </div>

            ) : workspaceTab ===
                'overview' ? (

              <div
                className="grid2"
              >

                <div className="card">

                  <span className="eyebrow dark">
                    {
                      liveSession
                        ? 'LIVE NOW'
                        : 'NEXT'
                    }
                  </span>

                  <h3>
                    {
                      nextSession
                        ? nextSession.title
                        : 'No live session scheduled'
                    }
                  </h3>

                  <p className="muted">
                    {
                      nextSession
                        ? fmtDate(
                            nextSession.starts_at
                          )
                        : 'The classroom is ready whenever the instructor schedules the next session.'
                    }
                  </p>

                  {nextSession && (

                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        joinRoom(
                          nextSession
                        )
                      }
                    >
                      <Activity
                        size={16}
                      />
                      Join classroom
                    </button>

                  )}

                </div>


                <div className="card">

                  <span className="eyebrow dark">
                    COURSE
                  </span>

                  <div className="metric">
                    <span>Materials</span>
                    <b>
                      {lessons.length}
                    </b>
                  </div>

                  <div className="metric">
                    <span>Assignments</span>
                    <b>
                      {assignments.length}
                    </b>
                  </div>

                  <div className="metric">
                    <span>
                      {
                        isOwner
                          ? 'Students'
                          : 'Membership'
                      }
                    </span>
                    <b>
                      {
                        isOwner
                          ? members.length
                          : 'Active'
                      }
                    </b>
                  </div>

                </div>

              </div>

            ) : workspaceTab ===
                'live' ? (

              <div
                className="two-col"
              >

                <div className="card">

                  <div className="card-head">

                    <div>
                      <h3>
                        Live Classroom
                      </h3>
                      <small className="muted">
                        Scheduled video sessions
                      </small>
                    </div>

                    <Activity
                      size={18}
                    />

                  </div>


                  {sessions.length ===
                    0 ? (

                    <div className="empty compact">
                      No live sessions yet.
                    </div>

                  ) : (

                    sessions.map(
                      item => (

                        <div
                          key={
                            item.id
                          }
                          className="event-row"
                        >

                          <div
                            className="event-date"
                          >
                            {
                              new Date(
                                item.starts_at
                              ).getDate()
                            }

                            <small>
                              {
                                new Date(
                                  item.starts_at
                                ).toLocaleString(
                                  'en',
                                  {
                                    month:
                                      'short'
                                  }
                                )
                              }
                            </small>
                          </div>


                          <div
                            className="event-info"
                          >
                            <b>
                              {
                                item.title
                              }
                            </b>

                            <small>
                              {
                                fmtDate(
                                  item.starts_at
                                )
                              }
                              {' · '}
                              {
                                item.status ===
                                  'live'
                                  ? 'LIVE NOW'
                                  : item.status ===
                                      'ended'
                                    ? 'Ended'
                                    : 'Scheduled'
                              }
                            </small>

                            <small
                              className="muted"
                              style={{
                                display:
                                  'block',
                                marginTop: 3
                              }}
                            >
                              {
                                attendanceCount(
                                  item.id
                                )
                              }{' '}
                              participant{
                                attendanceCount(
                                  item.id
                                ) === 1
                                  ? ''
                                  : 's'
                              } tracked
                            </small>
                          </div>


                          <div
                            style={{
                              display:
                                'flex',
                              gap: 6,
                              flexWrap:
                                'wrap',
                              justifyContent:
                                'flex-end'
                            }}
                          >

                            {isOwner &&
                              item.status ===
                                'scheduled' && (

                              <button
                                type="button"
                                className="btn primary"
                                onClick={() =>
                                  updateSessionStatus(
                                    item,
                                    'live'
                                  )
                                }
                              >
                                Start live
                              </button>

                            )}


                            {isOwner &&
                              item.status ===
                                'live' && (

                              <button
                                type="button"
                                className="btn subtle"
                                onClick={() =>
                                  updateSessionStatus(
                                    item,
                                    'ended'
                                  )
                                }
                              >
                                End
                              </button>

                            )}


                            {item.status !==
                              'ended' && (

                              <button
                                type="button"
                                className="btn subtle"
                                onClick={() =>
                                  joinRoom(
                                    item
                                  )
                                }
                              >
                                Join
                              </button>

                            )}

                          </div>

                        </div>

                      )
                    )

                  )}

                </div>


                {isOwner ? (

                  <form
                    className="card form-card"
                    onSubmit={
                      scheduleSession
                    }
                  >

                    <span className="eyebrow dark">
                      INSTRUCTOR
                    </span>

                    <h3>
                      Schedule a live session
                    </h3>

                    <input
                      name="session-title"
                      placeholder="Session title"
                      value={
                        sessionForm.title
                      }
                      onChange={event =>
                        setSessionForm(
                          current => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <input
                      name="session-start"
                      type="datetime-local"
                      value={
                        sessionForm.starts_at
                      }
                      onChange={event =>
                        setSessionForm(
                          current => ({
                            ...current,
                            starts_at:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <input
                      name="session-room"
                      type="url"
                      placeholder="Production video room URL · optional"
                      value={
                        sessionForm.room_url
                      }
                      onChange={event =>
                        setSessionForm(
                          current => ({
                            ...current,
                            room_url:
                              event.target.value
                          })
                        )
                      }
                    />

                    <div
                      style={{
                        padding:
                          '10px 12px',
                        borderRadius: 12,
                        background:
                          'rgba(15,23,42,0.05)',
                        fontSize: 12,
                        lineHeight: 1.5
                      }}
                    >
                      If no production room URL is supplied, <OnstoodWordmark /> creates a temporary Jitsi test room automatically for development.
                    </div>

                    <button
                      className="btn primary full"
                    >
                      <CalendarDays
                        size={16}
                      />
                      Schedule session
                    </button>

                    <small className="muted">
                      The classroom lifecycle and attendance are stored in Supabase. A production video provider can replace the test room without changing the course model.
                    </small>

                  </form>

                ) : (

                  <div className="card">

                    <span className="eyebrow dark">
                      LIVE
                    </span>

                    <h3>
                      One classroom, anywhere.
                    </h3>

                    <p className="muted">
                      Join scheduled sessions from your course workspace. <OnstoodWordmark /> records your classroom participation when you enter a session, while the video provider runs the live call.
                    </p>

                  </div>

                )}


                {currentLiveSession() && (

                  <div
                    className="card"
                    style={{
                      gridColumn: '1 / -1'
                    }}
                  >

                    <div className="card-head">
                      <div>
                        <h3>
                          Classroom interaction
                        </h3>

                        <small className="muted">
                          Attendance, questions and live discussion
                        </small>
                      </div>

                      <Users size={18} />
                    </div>


                    <div className="grid2">

                      <div>

                        <div className="metric">
                          <span>
                            Participants tracked
                          </span>
                          <b>
                            {
                              attendanceCount(
                                currentLiveSession().id
                              )
                            }
                          </b>
                        </div>

                        <div className="metric">
                          <span>
                            Raised hands
                          </span>
                          <b>
                            {
                              liveHands.filter(
                                hand =>
                                  hand.session_id ===
                                  currentLiveSession().id
                              ).length
                            }
                          </b>
                        </div>


                        <button
                          type="button"
                          className={
                            liveHands.some(
                              hand =>
                                hand.session_id ===
                                  currentLiveSession().id &&
                                hand.user_id ===
                                  profile.id
                            )
                              ? 'btn primary'
                              : 'btn subtle'
                          }
                          onClick={toggleRaiseHand}
                        >
                          ✋ {
                            liveHands.some(
                              hand =>
                                hand.session_id ===
                                  currentLiveSession().id &&
                                hand.user_id ===
                                  profile.id
                            )
                              ? 'Lower my hand'
                              : 'Raise hand'
                          }
                        </button>


                        {isOwner &&
                          liveHands
                            .filter(
                              hand =>
                                hand.session_id ===
                                currentLiveSession().id
                            )
                            .map(hand => (
                              <div
                                key={hand.id}
                                style={{
                                  display: 'flex',
                                  justifyContent:
                                    'space-between',
                                  gap: 8,
                                  alignItems:
                                    'center',
                                  marginTop: 8
                                }}
                              >
                                <small>
                                  Participant waiting to speak
                                </small>

                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={() =>
                                    lowerHand(
                                      hand.id
                                    )
                                  }
                                >
                                  Lower
                                </button>
                              </div>
                            ))}

                      </div>


                      <div>

                        <div
                          style={{
                            maxHeight: 220,
                            overflowY: 'auto',
                            display: 'grid',
                            gap: 7,
                            marginBottom: 10
                          }}
                        >

                          {liveChat
                            .filter(
                              message =>
                                message.session_id ===
                                currentLiveSession().id
                            )
                            .map(message => (

                              <div
                                key={message.id}
                                style={{
                                  padding:
                                    '8px 10px',
                                  borderRadius: 12,
                                  background:
                                    message.user_id ===
                                    profile.id
                                      ? 'rgba(59,130,246,0.10)'
                                      : 'rgba(15,23,42,0.05)'
                                }}
                              >
                                <b
                                  style={{
                                    fontSize: 12
                                  }}
                                >
                                  {
                                    message.user_id ===
                                      profile.id
                                      ? 'You'
                                      : 'Participant'
                                  }
                                </b>

                                <div>
                                  {message.body}
                                </div>

                                <small className="muted">
                                  {
                                    fmtDate(
                                      message.created_at
                                    )
                                  }
                                </small>
                              </div>

                            ))}

                        </div>


                        <form
                          onSubmit={sendLiveChat}
                          style={{
                            display: 'flex',
                            gap: 8
                          }}
                        >
                          <input
                            name="live-class-chat"
                            placeholder="Message the classroom…"
                            value={liveChatText}
                            onChange={event =>
                              setLiveChatText(
                                event.target.value
                              )
                            }
                          />

                          <button
                            className="btn primary"
                          >
                            <Send size={15} />
                          </button>
                        </form>

                      </div>

                    </div>


                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 12
                      }}
                    >
                      Camera, microphone and screen sharing are handled by the active video room. <OnstoodWordmark /> stores the classroom interaction and attendance layer.
                    </small>

                  </div>

                )}

              </div>

            ) : workspaceTab ===
                'materials' ? (

              <div
                className={
                  isOwner
                    ? 'two-col'
                    : ''
                }
              >

                <div className="card">

                  <div className="card-head">
                    <div>
                      <h3>
                        Materials & lessons
                      </h3>
                      <small className="muted">
                        Files, notes and structured learning content
                      </small>
                    </div>

                    <FileText size={18} />
                  </div>


                  {lessons.length === 0 ? (

                    <div className="empty compact">
                      No materials have been published yet.
                    </div>

                  ) : (

                    lessons.map(lesson => (

                      <div
                        key={lesson.id}
                        className="event-row"
                      >
                        <div className="course-icon">
                          <BookOpen size={17} />
                        </div>

                        <div className="event-info">
                          <b>{lesson.title}</b>

                          <small>
                            {lesson.summary ||
                              'Course material'}
                          </small>

                          {lesson.content && (
                            <p
                              className="muted"
                              style={{
                                margin:
                                  '6px 0 0'
                              }}
                            >
                              {lesson.content}
                            </p>
                          )}
                        </div>

                        {lesson.storage_path && (
                          <button
                            type="button"
                            className="btn subtle"
                            onClick={() =>
                              openLessonFile(
                                lesson
                              )
                            }
                          >
                            Open file
                          </button>
                        )}
                      </div>

                    ))

                  )}

                </div>


                {isOwner && (

                  <form
                    className="card form-card"
                    onSubmit={createLesson}
                  >
                    <span className="eyebrow dark">
                      INSTRUCTOR
                    </span>

                    <h3>
                      Publish material
                    </h3>

                    <input
                      name="lesson-title"
                      placeholder="Lesson / material title"
                      value={lessonForm.title}
                      onChange={event =>
                        setLessonForm(
                          current => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <input
                      name="lesson-summary"
                      placeholder="Short summary"
                      value={lessonForm.summary}
                      onChange={event =>
                        setLessonForm(
                          current => ({
                            ...current,
                            summary:
                              event.target.value
                          })
                        )
                      }
                    />

                    <textarea
                      name="lesson-content"
                      placeholder="Notes, instructions or lesson content"
                      value={lessonForm.content}
                      onChange={event =>
                        setLessonForm(
                          current => ({
                            ...current,
                            content:
                              event.target.value
                          })
                        )
                      }
                      style={{
                        minHeight: 100
                      }}
                    />

                    <label>
                      Course file · optional

                      <input
                        name="lesson-file"
                        type="file"
                        onChange={event =>
                          setLessonForm(
                            current => ({
                              ...current,
                              file:
                                event.target
                                  .files?.[0] ||
                                null
                            })
                          )
                        }
                      />
                    </label>

                    <button className="btn primary full">
                      <Upload size={16} />
                      Publish material
                    </button>
                  </form>

                )}

              </div>

            ) : workspaceTab ===
                'assignments' ? (

              <div
                className={
                  isOwner
                    ? 'two-col'
                    : ''
                }
              >

                <div className="card">

                  <div className="card-head">
                    <div>
                      <h3>
                        Assignments
                      </h3>
                      <small className="muted">
                        Course work, submissions and deadlines
                      </small>
                    </div>

                    <CheckCircle2 size={18} />
                  </div>


                  {assignments.length === 0 ? (

                    <div className="empty compact">
                      No assignments yet.
                    </div>

                  ) : (

                    assignments.map(item => {

                      const mine =
                        submissions.find(
                          submission =>
                            submission.assignment_id ===
                              item.id &&
                            submission.student_id ===
                              profile.id
                        );

                      const count =
                        submissions.filter(
                          submission =>
                            submission.assignment_id ===
                              item.id
                        ).length;

                      return (
                        <div
                          key={item.id}
                          className="card"
                          style={{
                            marginBottom: 10
                          }}
                        >
                          <b>{item.title}</b>

                          <small
                            className="muted"
                            style={{
                              display: 'block',
                              marginTop: 4
                            }}
                          >
                            {item.due_at
                              ? `Due ${fmtDate(
                                  item.due_at
                                )}`
                              : 'No deadline'}
                            {isOwner
                              ? ` · ${count} submission${count === 1 ? '' : 's'}`
                              : ''}
                          </small>

                          {item.instructions && (
                            <p>
                              {item.instructions}
                            </p>
                          )}

                          {!isOwner && (
                            <>
                              <textarea
                                name={`submission-${item.id}`}
                                placeholder="Write your submission…"
                                value={
                                  submissionText[
                                    item.id
                                  ] ||
                                  mine?.body ||
                                  ''
                                }
                                onChange={event =>
                                  setSubmissionText(
                                    current => ({
                                      ...current,
                                      [item.id]:
                                        event.target.value
                                    })
                                  )
                                }
                                style={{
                                  minHeight: 90
                                }}
                              />

                              <button
                                type="button"
                                className="btn primary"
                                onClick={() =>
                                  submitAssignment(
                                    item
                                  )
                                }
                              >
                                <Send size={15} />
                                {mine
                                  ? 'Update submission'
                                  : 'Submit assignment'}
                              </button>

                              {mine && (
                                <small
                                  className="muted"
                                  style={{
                                    display: 'block',
                                    marginTop: 6
                                  }}
                                >
                                  Status: {mine.status}
                                  {mine.points != null
                                    ? ` · ${mine.points} points`
                                    : ''}
                                </small>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })

                  )}

                </div>


                {isOwner && (

                  <form
                    className="card form-card"
                    onSubmit={
                      createAssignment
                    }
                  >
                    <span className="eyebrow dark">
                      INSTRUCTOR
                    </span>

                    <h3>
                      Create assignment
                    </h3>

                    <input
                      name="assignment-title"
                      placeholder="Assignment title"
                      value={
                        assignmentForm.title
                      }
                      onChange={event =>
                        setAssignmentForm(
                          current => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />

                    <textarea
                      name="assignment-instructions"
                      placeholder="Instructions"
                      value={
                        assignmentForm.instructions
                      }
                      onChange={event =>
                        setAssignmentForm(
                          current => ({
                            ...current,
                            instructions:
                              event.target.value
                          })
                        )
                      }
                      style={{
                        minHeight: 110
                      }}
                    />

                    <input
                      name="assignment-due"
                      type="datetime-local"
                      value={
                        assignmentForm.due_at
                      }
                      onChange={event =>
                        setAssignmentForm(
                          current => ({
                            ...current,
                            due_at:
                              event.target.value
                          })
                        )
                      }
                    />

                    <button className="btn primary full">
                      Publish assignment
                    </button>
                  </form>

                )}

              </div>

            ) : (

              <div className="card">

                <div className="card-head">

                  <div>
                    <h3>
                      Students
                    </h3>
                    <small className="muted">
                      Active course members
                    </small>
                  </div>

                  <Users
                    size={18}
                  />

                </div>


                {!isOwner ? (

                  <div className="empty compact">
                    You are enrolled in this course. The full class roster is available to the course instructor.
                  </div>

                ) : members.length ===
                    0 ? (

                  <div className="empty compact">
                    No enrolled students yet.
                  </div>

                ) : (

                  <div
                    style={{
                      display:
                        'grid',
                      gap: 8
                    }}
                  >

                    {members.map(
                      member => (

                        <div
                          key={
                            member.id
                          }
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'space-between',
                            gap: 12,
                            padding:
                              '10px 0',
                            borderBottom:
                              '1px solid rgba(15,23,42,0.06)'
                          }}
                        >

                          <div>
                            <b>
                              Student
                            </b>

                            <small
                              className="muted"
                              style={{
                                display:
                                  'block'
                              }}
                            >
                              {
                                member.role
                              }
                            </small>
                          </div>

                          <small className="muted">
                            {
                              fmtDate(
                                member.enrolled_at
                              )
                            }
                          </small>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      </Page>
    );

  }


  return (
    <Page
      eyebrow="LEARN"
      title="Courses"
      action={
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            setShowCreate(
              current =>
                !current
            )
          }
        >
          <Plus size={16} />
          Create course
        </button>
      }
    >

      <div
        className="card"
        style={{
          marginBottom: 20,
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.94))',
          color: '#fff',
          overflow: 'hidden'
        }}
      >

        <span className="eyebrow">
          <OnstoodWordmark /> LEARNING
        </span>

        <h2
          style={{
            maxWidth: 720
          }}
        >
          Learn live. Teach globally. Build knowledge together.
        </h2>

        <p
          style={{
            maxWidth: 760,
            opacity: 0.78
          }}
        >
          A professional learning space for open courses, free enrollment, private classrooms and future paid programs — with live sessions, materials, assignments and AI support in one place.
        </p>

      </div>


      {showCreate && (

        <form
          className="card form-card"
          onSubmit={
            createCourse
          }
          style={{
            marginBottom: 22
          }}
        >

          <div className="card-head">

            <div>
              <span className="eyebrow dark">
                CREATE
              </span>

              <h3>
                Publish a course
              </h3>
            </div>

            <BookOpen
              size={19}
            />

          </div>


          <input
            name="course-title"
            placeholder="Course title"
            value={
              courseForm.title
            }
            onChange={event =>
              setCourseForm(
                current => ({
                  ...current,
                  title:
                    event.target.value
                })
              )
            }
            required
          />


          <textarea
            name="course-description"
            placeholder="What will students learn?"
            value={
              courseForm.description
            }
            onChange={event =>
              setCourseForm(
                current => ({
                  ...current,
                  description:
                    event.target.value
                })
              )
            }
            style={{
              minHeight: 110
            }}
          />


          <div className="grid2">

            <label>
              Access

              <select
                name="course-type"
                value={
                  courseForm.course_type
                }
                onChange={event =>
                  setCourseForm(
                    current => ({
                      ...current,
                      course_type:
                        event.target.value,
                      price:
                        event.target.value ===
                          'paid'
                          ? current.price
                          : ''
                    })
                  )
                }
              >
                <option value="open">
                  Open · anyone can join
                </option>
                <option value="free">
                  Free · enrollment required
                </option>
                <option value="paid">
                  Paid · payments next phase
                </option>
                <option value="private">
                  Private · invite only
                </option>
              </select>

            </label>


            <label>
              Language

              <input
                name="course-language"
                value={
                  courseForm.language
                }
                onChange={event =>
                  setCourseForm(
                    current => ({
                      ...current,
                      language:
                        event.target.value
                    })
                  )
                }
              />

            </label>

          </div>


          {courseForm.course_type ===
            'paid' && (

            <label>
              Price · EUR

              <input
                name="course-price"
                type="number"
                min="1"
                step="0.01"
                value={
                  courseForm.price
                }
                onChange={event =>
                  setCourseForm(
                    current => ({
                      ...current,
                      price:
                        event.target.value
                    })
                  )
                }
                required
              />
            </label>

          )}


          <button
            className="btn primary"
            disabled={
              creating
            }
          >
            {
              creating
                ? 'Publishing…'
                : 'Publish course'
            }
          </button>

        </form>

      )}


      <div className="section-title">
        <div>
          <span className="eyebrow dark">
            YOUR LEARNING
          </span>
          <h2>
            My Courses
          </h2>
        </div>
      </div>


      {loading ? (

        <div className="empty">
          Loading courses…
        </div>

      ) : myCourses.length ===
          0 ? (

        <div className="empty card">

          <BookOpen />

          <h3>
            Your course space is ready.
          </h3>

          <p>
            Join an open course below or create your own learning community.
          </p>

        </div>

      ) : (

        <div className="course-grid">

          {myCourses.map(
            course => (

              <div
                className="card course"
                key={
                  course.id
                }
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'space-between',
                    gap: 10
                  }}
                >
                  <div className="course-icon">
                    <BookOpen
                      size={19}
                    />
                  </div>

                  <CourseTypeBadge
                    type={
                      course.course_type
                    }
                  />
                </div>


                <h3>
                  {course.title}
                </h3>

                <p>
                  {
                    course.description ||
                    'Course workspace'
                  }
                </p>

                <small className="muted">
                  {
                    course.owner_id ===
                      profile.id
                      ? 'You created this course'
                      : 'You are enrolled'
                  }
                  {' · '}
                  {
                    course.language ||
                    'English'
                  }
                </small>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    openCourse(
                      course
                    )
                  }
                >
                  Open course
                  <ChevronRight
                    size={15}
                  />
                </button>

              </div>

            )
          )}

        </div>

      )}


      <div
        className="section-title"
        style={{
          marginTop: 28
        }}
      >
        <div>
          <span className="eyebrow dark">
            DISCOVER
          </span>
          <h2>
            Discover Courses
          </h2>
        </div>
      </div>


      {loading ? null : discoverCourses.length ===
          0 ? (

        <div className="empty card">

          <Search />

          <h3>
            No public courses yet.
          </h3>

          <p>
            Published Open, Free and Paid courses will appear here automatically.
          </p>

        </div>

      ) : (

        <div className="course-grid">

          {discoverCourses.map(
            course => (

              <div
                className="card course"
                key={
                  course.id
                }
              >

                <CourseTypeBadge
                  type={
                    course.course_type
                  }
                />

                <h3>
                  {course.title}
                </h3>

                <p>
                  {
                    course.description ||
                    'Explore this course on ONSTOOD.'
                  }
                </p>

                <small className="muted">
                  {
                    course.language ||
                    'English'
                  }

                  {course.course_type ===
                    'paid'
                    ? ` · €${(
                        course.price_cents /
                        100
                      ).toFixed(2)}`
                    : ''}
                </small>


                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    joinCourse(
                      course
                    )
                  }
                >
                  {
                    course.course_type ===
                      'paid'
                      ? 'View enrollment'
                      : 'Join course'
                  }
                  <ChevronRight
                    size={15}
                  />
                </button>

              </div>

            )
          )}

        </div>

      )}

    </Page>
  );
}
