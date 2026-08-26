import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import {
  fmtDate,
  safeDate,
  safeDay,
  safeMonth
} from './utils/formatters';
import Avatar from './components/Avatar';
import NotificationBell from './components/NotificationBell';
import Post from './components/feed/Post';
import HomePage from './components/feed/HomePage';
import PhotoViewer from './components/PhotoViewer';
import {
  ProfileContentTabs,
  ProfileMediaGallery,
  ProfileTimeline
} from './components/profile/ProfileContent';
import Friends from './components/network/Friends';
import { MiniChat, PostOffice } from './components/messages/Messages';
import AI from './components/ai/AI';
import { MyProfile, ProfileEditor } from './components/profile/ProfileScreens';
import { Auth, ResetPassword, GoogleAccountType } from './components/auth/AuthScreens';
import { Calendar, Tasks, Documents } from './components/productivity/Productivity';
import Courses from './components/learning/Courses';
import Career from './components/career/Career';
import SettingsPage, { AdminMfaGate } from './components/settings/SettingsPage';
import { OnlineConnections, SocialLayerPanel } from './components/social/SocialPanels';
import AppNavigation from './components/AppNavigation';
import {
  Stat,
  Page,
  CourseTypeBadge
} from './components/ui';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  ChevronRight,
  CircleUserRound,
  FileText,
  FolderOpen,
  Heart,
  Home,
  LogOut,
  Mail,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Database,
  Globe2,
  LockKeyhole,
  Monitor,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import './styles.css';

const ONSTOOD_BUILD = 'V30-FINAL-MODULAR-REFRACTOR';
console.log('%cOopss, only for developers!', 'font-size:28px;font-weight:900;color:#6558ff;');
console.log('%cThis area is intended for ONSTOOD developers. Never paste code here that someone sent you — it could compromise your ONSTOOD account.', 'font-size:13px;font-weight:600;color:#64748b;');
console.info(`ONSTOOD ${ONSTOOD_BUILD} loaded`);


/* =========================================================
   SUPABASE
   ========================================================= */



/* =========================================================
   NAVIGATION
   ========================================================= */

const NAV = [
  ['home', 'Home', Home],
  ['friends', 'Network', Users],
  ['messages', 'Messages', Mail],
  ['calendar', 'Calendar', CalendarDays],
  ['tasks', 'Tasks', CheckCircle2],
  ['docs', 'Documents', FolderOpen],
  ['courses', 'Courses', BookOpen],
  ['jobs', 'Career', BriefcaseBusiness],
  ['ai', 'ONSTOOD AI', Sparkles],
  ['profile', 'Profile', CircleUserRound],
  ['settings', 'Settings', Settings]
];

const EMPLOYER_NAV = [
  ['jobs', 'Career', BriefcaseBusiness],
  ['messages', 'Messages', Mail],
  ['profile', 'Company Profile', CircleUserRound],
  ['settings', 'Settings', Settings]
];

const VALID_SECTIONS = new Set([
  ...NAV.map(([id]) => id),
  'admin'
]);

const NOTIFICATION_SECTION_BY_KIND = {
  friend_request: 'friends',
  message: 'messages',
  message_mention: 'messages',
  direct_post: 'messages',
  calendar: 'calendar',
  calendar_reminder: 'calendar',
  task: 'tasks',
  task_reminder: 'tasks',
  document: 'docs',
  course: 'courses',
  job: 'jobs',
  job_match: 'jobs',
  post_like: 'home',
  post_comment: 'home'
};

const NOTIFICATION_KINDS_BY_SECTION = {
  friends: ['friend_request'],
  messages: ['message', 'message_mention', 'direct_post'],
  calendar: ['calendar', 'calendar_reminder'],
  tasks: ['task', 'task_reminder'],
  docs: ['document'],
  courses: ['course'],
  jobs: ['job', 'job_match'],
  home: ['post_like', 'post_comment']
};

function getInitialSection() {
  try {
    const saved = window.sessionStorage.getItem('onstood.activeSection');
    return VALID_SECTIONS.has(saved) ? saved : 'home';
  } catch {
    return 'home';
  }
}


/* =========================================================
   HELPERS
   ========================================================= */



















   /* 
   =========================================================
   AUTH
   ========================================================= */



    /* 
   =========================================================
   RESET PASSWORD
   ========================================================= 
   */




   /* 
   =========================================================
   APP
   ========================================================= 
   */




class SectionErrorBoundary extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      message: ''
    };
  }


  static getDerivedStateFromError(error) {

    return {
      hasError: true,
      message:
        error?.message ||
        'Unknown rendering error'
    };

  }


  componentDidCatch(
    error,
    info
  ) {

    console.error(
      'ONSTOOD section render error:',
      error,
      info
    );

  }


  componentDidUpdate(
    previousProps
  ) {

    if (
      previousProps.sectionKey !==
      this.props.sectionKey &&
      this.state.hasError
    ) {

      this.setState({
        hasError: false,
        message: ''
      });

    }

  }


  render() {

    if (this.state.hasError) {

      return (
        <div className="card empty">

          <AlertTriangle
            size={28}
          />

          <h3>
            This section could not be displayed.
          </h3>

          <p>
            ONSTOOD kept the rest of the application running.
          </p>

          <small className="muted">
            {
              this.state.message
            }
          </small>

        </div>
      );

    }


    return this.props.children;

  }

}


function App({ session }) {

  const [section, setSection] = useState(getInitialSection);
  const [requestedProfileId, setRequestedProfileId] = useState(null);
  function openMemberProfile(userId) {
    if (!userId || userId === profile?.id) { setRequestedProfileId(null); setSection('profile'); return; }
    setRequestedProfileId(userId);
    setSection('friends');
  }

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [globalSelectionAction, setGlobalSelectionAction] =
    useState(null);

  const [globalAiAccess, setGlobalAiAccess] =
    useState({
      loaded: false,
      plan_code: 'free',
      standard_left: 0,
      advanced_left: 0
    });

  const [externalAiAsk, setExternalAiAsk] =
    useState(null);

  const globalSelectionToolbarRef =
    useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationCounts, setNotificationCounts] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);


  const [adminRole, setAdminRole] =
    useState(null);

  const [adminRoleLoading, setAdminRoleLoading] =
    useState(true);

  const [onlineUserIds, setOnlineUserIds] =
    useState([]);
  const [messageConversationId, setMessageConversationId] = useState(null);
  const [messageTargetUserId, setMessageTargetUserId] = useState(null);
  const [miniChats, setMiniChats] =
    useState([]);

  const [isMobileViewport, setIsMobileViewport] =
    useState(() =>
      window.matchMedia('(max-width: 767px)').matches
    );

  const [mobileMoreOpen, setMobileMoreOpen] =
    useState(false);

  useEffect(() => {
    /*
     * ONSTOOD browser-back boundary.
     *
     * App sections are state-driven, not browser pages. We therefore keep
     * one protected history entry in front of the real entry. Pressing the
     * Android/Chrome Back button lands on the boundary entry; ONSTOOD then
     * returns to Home and immediately moves forward to the protected entry.
     * Repeated Back presses on Home stay inside ONSTOOD.
     */
    const appUrl =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    const boundaryState = {
      ...(window.history.state || {}),
      onstood_app: true,
      onstood_history_boundary: true
    };

    const protectedState = {
      onstood_app: true,
      onstood_history_protected: true
    };

    try {
      window.history.replaceState(boundaryState, '', appUrl);
      window.history.pushState(protectedState, '', appUrl);
    } catch {}

    let restoringProtectedEntry = false;

    const goHomeInsideOnstood = () => {
      setRequestedProfileId(null);
      setMessageConversationId(null);
      setMessageTargetUserId(null);
      setMiniChats([]);
      setMobileMoreOpen(false);
      setShowNotifications(false);
      setSection('home');
    };

    const handleBackInsideOnstood = event => {
      if (restoringProtectedEntry) {
        restoringProtectedEntry = false;
        return;
      }

      goHomeInsideOnstood();

      /*
       * Do not create an endless pile of pushState entries. The Back action
       * moved from the protected entry to our boundary entry, so move forward
       * to the already-existing protected entry. This is what keeps both the
       * Android system Back gesture/button and Chrome Back inside ONSTOOD.
       */
      if (event.state?.onstood_history_boundary) {
        restoringProtectedEntry = true;
        try {
          window.history.forward();
        } catch {
          restoringProtectedEntry = false;
        }
        return;
      }

      /* Safety net for browsers restoring an unusual/stale history state. */
      try {
        window.history.pushState(protectedState, '', appUrl);
      } catch {}
    };

    window.addEventListener('popstate', handleBackInsideOnstood);

    return () => {
      window.removeEventListener('popstate', handleBackInsideOnstood);
    };
  }, []);

  useEffect(() => {
    const media =
      window.matchMedia('(max-width: 767px)');

    const update = () => {
      setIsMobileViewport(media.matches);

      if (!media.matches) {
        setMobileMoreOpen(false);
      }
    };

    media.addEventListener?.('change', update);

    return () =>
      media.removeEventListener?.('change', update);
  }, []);

  function openMiniChat({
    userId = null,
    conversationId = null
  }) {
    if (!userId && !conversationId) {
      return;
    }

    if (isMobileViewport) {
      setMiniChats([]);
      setMessageConversationId(
        conversationId || null
      );
      setMessageTargetUserId(
        conversationId ? null : userId
      );
      setSection('messages');
      return;
    }

    const key =
      conversationId
        ? `conversation:${conversationId}`
        : `user:${userId}`;

    setMiniChats(current => {
      const exists =
        current.some(item => item.key === key);

      if (exists) return current;

      return [
        ...current,
        { key, userId, conversationId }
      ];
    });
  }

  function closeMiniChat(
    key
  ) {
    setMiniChats(current =>
      current.filter(
        item => item.key !== key
      )
    );
  }


  const [overview, setOverview] =
    useState({
      connections: 0,
      upcoming: 0,
      tasks: 0,
      documents: 0
    });

  const [overviewLoading, setOverviewLoading] =
    useState(true);


  const [globalSearch, setGlobalSearch] =
    useState('');

  const [globalResults, setGlobalResults] =
    useState([]);

  const [globalSearchBusy, setGlobalSearchBusy] =
    useState(false);


  const baseNav =
    profile?.account_type === 'employer'
      ? EMPLOYER_NAV
      : NAV;


  const activeNav =
    adminRole
      ? [
          ...baseNav,
          [
            'admin',
            'Admin Control',
            ShieldCheck
          ]
        ]
      : baseNav;


  useEffect(() => {

    const query =
      globalSearch.trim();

    if (query.length < 2) {
      setGlobalResults([]);
      setGlobalSearchBusy(false);
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {

          setGlobalSearchBusy(true);

          const pattern =
            `%${query}%`;

          const requests = [
            supabase
              .from('profiles')
              .select('id,name,surname,university,degree,account_type,company_name')
              .or(
                `name.ilike.${pattern},surname.ilike.${pattern},university.ilike.${pattern},degree.ilike.${pattern},company_name.ilike.${pattern}`
              )
              .limit(6),

            supabase
              .from('courses')
              .select('id,title,description,language,status')
              .or(
                `title.ilike.${pattern},description.ilike.${pattern},language.ilike.${pattern}`
              )
              .limit(6),

            supabase
              .from('career_opportunities')
              .select('id,title,organization,city,country,status')
              .eq('status', 'published')
              .or(
                `title.ilike.${pattern},organization.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern}`
              )
              .limit(6)
          ];

          if (
            profile?.account_type !==
              'employer'
          ) {
            requests.push(
              supabase
                .from('documents')
                .select('id,file_name,created_at')
                .eq('user_id', profile.id)
                .ilike('file_name', pattern)
                .limit(6)
            );
          }

          const results =
            await Promise.all(
              requests
            );

          if (!active) {
            return;
          }

          const [
            peopleResult,
            coursesResult,
            jobsResult,
            docsResult
          ] = results;

          const merged = [
            ...(peopleResult.data || []).map(
              item => ({
                id: `person-${item.id}`,
                kind: 'person',
                title:
                  item.account_type === 'employer'
                    ? (
                      item.company_name ||
                      `${item.name || ''} ${item.surname || ''}`.trim()
                    )
                    : `${item.name || ''} ${item.surname || ''}`.trim(),
                subtitle:
                  item.account_type === 'employer'
                    ? 'Employer'
                    : (
                      item.university ||
                      item.degree ||
                      'Student'
                    ),
                section:
                  item.account_type === 'employer'
                    ? 'jobs'
                    : 'friends'
              })
            ),
            ...(coursesResult.data || []).map(
              item => ({
                id: `course-${item.id}`,
                kind: 'course',
                title: item.title,
                subtitle:
                  item.language ||
                  'Course',
                section: 'courses'
              })
            ),
            ...(jobsResult.data || []).map(
              item => ({
                id: `job-${item.id}`,
                kind: 'job',
                title: item.title,
                subtitle:
                  [
                    item.organization,
                    item.city,
                    item.country
                  ]
                    .filter(Boolean)
                    .join(' · '),
                section: 'jobs'
              })
            ),
            ...((docsResult?.data || []).map(
              item => ({
                id: `doc-${item.id}`,
                kind: 'document',
                title: item.file_name,
                subtitle: 'Your document',
                section: 'docs'
              })
            ))
          ];

          setGlobalResults(
            merged.slice(0, 18)
          );
          setGlobalSearchBusy(false);

        },
        280
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };

  }, [
    globalSearch,
    profile?.id,
    profile?.account_type
  ]);


  function openGlobalResult(
    item
  ) {
    setSection(item.section);
    setGlobalSearch('');
    setGlobalResults([]);
  }


  useEffect(() => {

    if (
      profile?.account_type === 'employer' &&
      !EMPLOYER_NAV.some(
        ([id]) => id === section
      )
    ) {
      setSection('jobs');
    }

  }, [
    profile?.account_type,
    section
  ]);


  useEffect(() => {
    try {
      window.sessionStorage.setItem('onstood.activeSection', section);
    } catch {
      // Ignore browser storage restrictions.
    }
  }, [section]);


  useEffect(() => {

    let active = true;

    async function initialize() {

      try {

        const user = session?.user;

        if (!user) {
          if (active) {
            setLoading(false);
          }
          return;
        }

        const { data, error } =
          await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
          console.error(
            'Profile load error:',
            error
          );
        }

        if (!data) {

          const metadata =
            user.user_metadata || {};

          const accountType =
            metadata.account_type === 'employer'
              ? 'employer'
              : 'student';

          const newProfile = {
            id: user.id,
            account_type: accountType,
            name:
              metadata.name ||
              (accountType === 'employer'
                ? 'Employer'
                : 'Student'),
            surname: metadata.surname || '',
            university:
              accountType === 'student'
                ? metadata.university || ''
                : '',
            degree:
              accountType === 'student'
                ? metadata.degree || ''
                : '',
            year:
              accountType === 'student'
                ? metadata.year || ''
                : '',
            company_name:
              accountType === 'employer'
                ? metadata.company_name || ''
                : '',
            company_website:
              accountType === 'employer'
                ? metadata.company_website || ''
                : '',
            company_role:
              accountType === 'employer'
                ? metadata.company_role || ''
                : '',
            company_description:
              accountType === 'employer'
                ? metadata.company_description || ''
                : ''
          };

          const {
            data: createdProfile,
            error: createError
          } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {

            console.error(
              'Profile creation error:',
              createError
            );

            if (active) {
              setProfile(newProfile);
            }

          } else if (active) {

            setProfile(createdProfile);

          }

        } else if (active) {

          setProfile(data);

        }

      } catch (error) {

        console.error(
          'Application initialization error:',
          error
        );

      } finally {

        if (active) {
          setLoading(false);
        }

      }
    }

    initialize();

    return () => {
      active = false;
    };

  }, [session?.user?.id]);


  useEffect(() => {

    if (!session?.user?.id) {
      setAdminRole(null);
      setAdminRoleLoading(false);
      return;
    }


    let active = true;


    async function loadAdminRole() {

      setAdminRoleLoading(true);

      const {
        data,
        error
      } = await supabase
        .from('admin_memberships')
        .select('role,active')
        .eq(
          'user_id',
          session.user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle();


      if (!active) {
        return;
      }


      if (error) {

        console.error(
          'Admin membership lookup error:',
          error
        );

        setAdminRole(null);

      } else {

        setAdminRole(
          data?.role || null
        );

      }


      setAdminRoleLoading(false);

    }


    loadAdminRole();


    return () => {
      active = false;
    };

  }, [session?.user?.id]);



  /*
   * =========================================================
   * REAL DASHBOARD OVERVIEW
   * One source of truth for Home + right sidebar.
   * =========================================================
   */

  useEffect(() => {

    if (!profile?.id) {
      return;
    }


    let active = true;


    async function loadOverview() {

      setOverviewLoading(true);


      const now =
        new Date().toISOString();


      const [
        connectionsResult,
        upcomingResult,
        tasksResult,
        documentsResult
      ] = await Promise.all([

        supabase
          .from('friend_requests')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'status',
            'accepted'
          )
          .or(
            `sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`
          ),

        supabase
          .from('calendar_events')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'user_id',
            profile.id
          )
          .gte(
            'starts_at',
            now
          ),

        supabase
          .from('tasks')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'user_id',
            profile.id
          )
          .eq(
            'done',
            false
          ),

        supabase
          .from('documents')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )
          .eq(
            'user_id',
            profile.id
          )

      ]);


      if (!active) {
        return;
      }


      const results = [
        connectionsResult,
        upcomingResult,
        tasksResult,
        documentsResult
      ];


      const firstError =
        results.find(result =>
          result.error
        )?.error;


      if (firstError) {

        console.error(
          'Dashboard overview error:',
          firstError
        );

      }


      setOverview({
        connections:
          connectionsResult.count || 0,
        upcoming:
          upcomingResult.count || 0,
        tasks:
          tasksResult.count || 0,
        documents:
          documentsResult.count || 0
      });


      setOverviewLoading(false);

    }


    loadOverview();


    return () => {
      active = false;
    };

  }, [
    profile?.id,
    section
  ]);


  /*
   * =========================================================
   * NOTIFICATIONS HELPERS
   * =========================================================
   */

  function getNotificationSection(kind) {
    return NOTIFICATION_SECTION_BY_KIND[kind] || null;
  }


  async function markSectionNotificationsRead(sectionId) {
    const kinds = NOTIFICATION_KINDS_BY_SECTION[sectionId] || [];

    if (kinds.length === 0 || !session?.user?.id) {
      return;
    }

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', session.user.id)
      .in('kind', kinds)
      .is('read_at', null);

    if (error) {
      console.error('Mark notifications read error:', error);
      return;
    }

    setNotificationCounts(current => ({
      ...current,
      [sectionId]: 0
    }));

    setNotifications(current =>
      current.map(notification =>
        kinds.includes(notification.kind)
          ? { ...notification, read_at: readAt }
          : notification
      )
    );
  }


  function calculateNotificationCounts(data) {

    const counts = {};

    (data || []).forEach(notification => {

      if (notification.read_at) {
        return;
      }

      const section =
        getNotificationSection(
          notification.kind
        );

      if (!section) {
        return;
      }

      counts[section] =
        (counts[section] || 0) + 1;

    });

    return counts;
  }


  const unreadNotificationCount =
    notifications.filter(notification =>
      !notification.read_at
    ).length;


  async function markAllNotificationsRead() {

    if (!session?.user?.id) {
      return;
    }

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', session.user.id)
      .is('read_at', null);

    if (error) {
      notify(error.message);
      return;
    }

    setNotifications(current =>
      current.map(notification => ({
        ...notification,
        read_at:
          notification.read_at || readAt
      }))
    );

    setNotificationCounts({});
  }


  async function openNotification(notification) {

    const targetSection =
      getNotificationSection(
        notification.kind
      );

    if (!notification.read_at) {

      const readAt = new Date().toISOString();

      const query = supabase
        .from('notifications')
        .update({ read_at: readAt });

      const { error } = notification.id
        ? await query.eq('id', notification.id)
        : await query
            .eq('user_id', session.user.id)
            .eq('kind', notification.kind)
            .is('read_at', null);

      if (!error) {
        setNotifications(current =>
          current.map(item =>
            notification.id &&
            item.id === notification.id
              ? { ...item, read_at: readAt }
              : item
          )
        );

        if (targetSection) {
          setNotificationCounts(current => ({
            ...current,
            [targetSection]: Math.max(
              0,
              (current[targetSection] || 0) - 1
            )
          }));
        }
      }
    }

    if (
      notification.kind === 'message' ||
      notification.kind === 'message_mention'
    ) {

      const conversationId =
        notification?.metadata?.conversation_id || null;

      const senderId =
        notification?.metadata?.sender_id || null;

      openMiniChat({
        userId: senderId,
        conversationId
      });

      setShowNotifications(false);
      return;
    }

    if (targetSection) {
      setSection(targetSection);
    }

    setShowNotifications(false);
  }


  /*
   * =========================================================
   * LOAD + REALTIME NOTIFICATIONS
   * =========================================================
   */

  useEffect(() => {

    if (!session?.user?.id) {
      return;
    }

    let active = true;

    async function loadNotifications() {

      const {
        data,
        error
      } = await supabase
        .from('notifications')
        .select('*')
        .eq(
          'user_id',
          session.user.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(30);

      if (error) {

        console.error(
          'Notifications load error:',
          error
        );

        return;
      }

      if (!active) {
        return;
      }

      setNotifications(data || []);

      setNotificationCounts(
        calculateNotificationCounts(data)
      );
    }

    loadNotifications();

    const channel =
      supabase
        .channel(
          `notifications-${session.user.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter:
              `user_id=eq.${session.user.id}`
          },
          payload => {

            const notification =
              payload.new;

            setNotifications(current => [
              notification,
              ...current
            ]);

            if (!notification.read_at) {

              const section =
                getNotificationSection(
                  notification.kind
                );

              if (section) {

                setNotificationCounts(
                  current => ({
                    ...current,
                    [section]:
                      (current[section] || 0) + 1
                  })
                );

              }
            }

            setToast(
              notification.title ||
              'New notification'
            );

            window.setTimeout(() => {
              setToast('');
            }, 3200);
          }
        )
        .subscribe();

    return () => {

      active = false;

      supabase.removeChannel(
        channel
      );

    };

  }, [session?.user?.id]);



  /*
   * =========================================================
   * GLOBAL ONLINE PRESENCE
   * One channel for the whole app.
   * =========================================================
   */

  useEffect(() => {

    if (!session?.user?.id) {
      return;
    }


    const channel =
      supabase.channel(
        'onstood-global-presence',
        {
          config: {
            presence: {
              key: session.user.id
            }
          }
        }
      );


    function syncPresence() {

      const state =
        channel.presenceState();

      const ids =
        Object.values(state)
          .flat()
          .map(item =>
            item?.user_id
          )
          .filter(Boolean);


      setOnlineUserIds(
        [...new Set(ids)]
      );

    }


    channel
      .on(
        'presence',
        {
          event: 'sync'
        },
        syncPresence
      )
      .on(
        'presence',
        {
          event: 'join'
        },
        syncPresence
      )
      .on(
        'presence',
        {
          event: 'leave'
        },
        syncPresence
      )
      .subscribe(
        async status => {

          if (
            status ===
            'SUBSCRIBED'
          ) {

            await channel.track({
              user_id:
                session.user.id,
              online_at:
                new Date()
                  .toISOString()
            });

          }

        }
      );


    return () => {

      supabase.removeChannel(
        channel
      );

    };

  }, [
    session?.user?.id
  ]);


  useEffect(() => {

    if (
      section === 'admin' &&
      !adminRole &&
      !adminRoleLoading
    ) {
      setSection('home');
    }

  }, [
    section,
    adminRole,
    adminRoleLoading
  ]);


  async function logout() {
    await supabase.auth.signOut();
  }


  function notify(message) {

    setToast(message);

    window.setTimeout(() => {
      setToast('');
    }, 2600);
  }


  function clearGlobalBrowserSelection() {
    try {
      window.getSelection?.()?.removeAllRanges?.();
    } catch {}
  }


  async function loadGlobalAiAccess() {
    if (!profile?.id) return;

    const { data, error } =
      await supabase.rpc('get_ai_usage');

    if (error) return;

    const row =
      Array.isArray(data)
        ? data[0]
        : data;

    const standardLimit =
      Number(row?.standard_limit ?? 5);

    const advancedLimit =
      Number(row?.advanced_limit ?? 0);

    const standardUsed =
      Number(row?.standard_used ?? 0);

    const advancedUsed =
      Number(row?.advanced_used ?? 0);

    setGlobalAiAccess({
      loaded: true,
      plan_code:
        row?.plan_code || 'free',
      standard_left:
        Math.max(
          0,
          standardLimit - standardUsed
        ),
      advanced_left:
        Math.max(
          0,
          advancedLimit - advancedUsed
        )
    });
  }


  function openMaterialInAi(
    materialText,
    mode = 'standard'
  ) {
    const cleanText =
      String(
        materialText || ''
      )
        .trim()
        .slice(0, 3000);

    if (!cleanText) {
      return;
    }

    const isAdvanced =
      mode === 'advanced';

    if (
      !isAdvanced &&
      globalAiAccess.loaded &&
      globalAiAccess.standard_left <= 0
    ) {
      notify(
        'Your standard AI allowance is finished.'
      );
      return;
    }

    if (
      isAdvanced &&
      (
        globalAiAccess.plan_code !== 'pro' ||
        globalAiAccess.advanced_left <= 0
      )
    ) {
      notify(
        'Advanced ONSTOOD AI is not active for this account.'
      );
      return;
    }

    setExternalAiAsk({
      id:
        `${Date.now()}-${Math.random()}`,
      text: cleanText,
      mode:
        isAdvanced
          ? 'advanced'
          : 'standard'
    });

    setSection('ai');
  }


  function openGlobalSelectionInAi(
    mode = 'standard'
  ) {
    const selectedText =
      globalSelectionAction?.text;

    if (!selectedText) return;

    const isAdvanced =
      mode === 'advanced';

    if (
      !isAdvanced &&
      globalAiAccess.loaded &&
      globalAiAccess.standard_left <= 0
    ) {
      notify(
        'Your standard AI allowance is finished.'
      );
      return;
    }

    if (
      isAdvanced &&
      (
        globalAiAccess.plan_code !== 'pro' ||
        globalAiAccess.advanced_left <= 0
      )
    ) {
      notify(
        'Advanced ONSTOOD AI is not active for this account.'
      );
      return;
    }

    setExternalAiAsk({
      id:
        `${Date.now()}-${Math.random()}`,
      text:
        selectedText.slice(0, 4000),
      mode:
        isAdvanced
          ? 'advanced'
          : 'standard'
    });

    setGlobalSelectionAction(null);
    clearGlobalBrowserSelection();
    setSection('ai');
  }


  async function copyGlobalSelection() {
    const selectedText =
      globalSelectionAction?.text;

    if (!selectedText) return;

    try {
      await navigator.clipboard.writeText(
        selectedText
      );
    } catch {
      const temp =
        document.createElement(
          'textarea'
        );

      temp.value =
        selectedText;

      temp.style.position =
        'fixed';

      temp.style.opacity =
        '0';

      document.body.appendChild(
        temp
      );

      temp.select();
      document.execCommand('copy');
      temp.remove();
    }

    setGlobalSelectionAction(null);
    clearGlobalBrowserSelection();
  }


  useEffect(() => {
    if (!profile?.id) return;
    loadGlobalAiAccess();
  }, [profile?.id]);


  useEffect(() => {

    function captureGlobalSelection() {
      window.setTimeout(() => {

        const selection =
          window.getSelection?.();

        const selectedText =
          String(
            selection?.toString() || ''
          ).trim();

        if (
          !selection ||
          selection.rangeCount === 0 ||
          !selectedText
        ) {
          setGlobalSelectionAction(
            null
          );
          return;
        }

        const range =
          selection.getRangeAt(0);

        const commonNode =
          range.commonAncestorContainer;

        const commonElement =
          commonNode?.nodeType === 1
            ? commonNode
            : commonNode?.parentElement;

        const appShell =
          document.querySelector(
            '.app-shell'
          );

        if (
          !appShell ||
          !commonElement ||
          !appShell.contains(
            commonElement
          )
        ) {
          setGlobalSelectionAction(
            null
          );
          return;
        }

        if (
          commonElement.closest(
            'input, textarea, [contenteditable="true"], .onstood-global-selection-toolbar'
          )
        ) {
          return;
        }

        const rect =
          range.getBoundingClientRect();

        if (
          !rect ||
          (!rect.width &&
            !rect.height)
        ) {
          setGlobalSelectionAction(
            null
          );
          return;
        }

        const toolbarWidth =
          Math.min(
            520,
            window.innerWidth - 20
          );

        const safeLeft =
          Math.max(
            10,
            Math.min(
              window.innerWidth -
                toolbarWidth -
                10,
              rect.left +
                rect.width / 2 -
                toolbarWidth / 2
            )
          );

        const preferredTop =
          rect.top - 56;

        const safeTop =
          preferredTop >= 10
            ? preferredTop
            : rect.bottom + 10;

        setGlobalSelectionAction({
          text:
            selectedText.slice(
              0,
              4000
            ),
          left:
            safeLeft,
          top:
            safeTop
        });
      }, 0);
    }


    function handleGlobalPointerDown(
      event
    ) {
      if (
        globalSelectionToolbarRef.current
          ?.contains(
            event.target
          )
      ) {
        return;
      }

      const selection =
        window.getSelection?.();

      if (
        !selection ||
        !String(
          selection.toString() || ''
        ).trim()
      ) {
        setGlobalSelectionAction(
          null
        );
      }
    }


    function handleGlobalKeyDown(
      event
    ) {
      if (
        event.key === 'Escape'
      ) {
        setGlobalSelectionAction(
          null
        );
        clearGlobalBrowserSelection();
      }
    }


    document.addEventListener(
      'mouseup',
      captureGlobalSelection
    );

    document.addEventListener(
      'keyup',
      captureGlobalSelection
    );

    document.addEventListener(
      'mousedown',
      handleGlobalPointerDown
    );

    window.addEventListener(
      'keydown',
      handleGlobalKeyDown
    );

    window.addEventListener(
      'scroll',
      () =>
        setGlobalSelectionAction(
          null
        ),
      true
    );

    return () => {
      document.removeEventListener(
        'mouseup',
        captureGlobalSelection
      );

      document.removeEventListener(
        'keyup',
        captureGlobalSelection
      );

      document.removeEventListener(
        'mousedown',
        handleGlobalPointerDown
      );

      window.removeEventListener(
        'keydown',
        handleGlobalKeyDown
      );
    };

  }, []);


  if (loading) {
    return (
      <div className="loading">
        Loading ONSTOOD…
      </div>
    );
  }


  if (!profile) {
    return (
      <div className="loading">
        Unable to load your profile.
      </div>
    );
  }


  return (
    <div className="app-shell">

      {/* TOP BAR */}

      <header className="topbar">

        <button
          className="mobile-menu"
          onClick={() => setSection('home')}
        >
          ON
        </button>

        <div className="brand">
          ONSTOOD<span>.</span>
        </div>

        <div
          className="global-search"
          style={{
            position: 'relative'
          }}
        >
          <Search size={17} />
          <input
            name="global-search"
            placeholder={
              profile.account_type === 'employer'
                ? 'Search talent, jobs, companies…'
                : 'Search students, courses, jobs, documents…'
            }
            value={globalSearch}
            onChange={event =>
              setGlobalSearch(
                event.target.value
              )
            }
          />

          {(globalSearchBusy ||
            globalResults.length > 0) && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: 8,
                maxHeight: 420,
                overflowY: 'auto',
                boxShadow:
                  '0 18px 50px rgba(15,23,42,0.18)'
              }}
            >
              {globalSearchBusy ? (
                <div className="empty compact">
                  Searching ONSTOOD…
                </div>
              ) : (
                globalResults.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      openGlobalResult(item)
                    }
                    style={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    <b>{item.title}</b>
                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 3
                      }}
                    >
                      {item.kind.toUpperCase()}
                      {' · '}
                      {item.subtitle}
                    </small>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="top-actions">
<NotificationBell
            show={showNotifications}
            unreadCount={unreadNotificationCount}
            notifications={notifications}
            onToggle={() =>
              setShowNotifications(
                current => !current
              )
            }
            onClose={() =>
              setShowNotifications(false)
            }
            onMarkAllRead={
              markAllNotificationsRead
            }
            getTargetSection={
              getNotificationSection
            }
            onOpenNotification={
              openNotification
            }
          />

          <button
            type="button"
            className="icon-btn"
            aria-label="Open Messages"
            title="Messages"
            onClick={() => {
              const latestMessageNotification =
                notifications.find(item =>
                  !item.read_at &&
                  (
                    item.kind === 'message' ||
                    item.kind === 'message_mention'
                  )
                );

              if (latestMessageNotification) {
                openNotification(
                  latestMessageNotification
                );
                return;
              }

              setMessageConversationId(null);
              setMessageTargetUserId(null);
              setSection('messages');
            }}
            style={{
              position: 'relative'
            }}
          >
            <Mail size={19} />

            {(notificationCounts.messages || 0) > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1
                }}
              >
                {(notificationCounts.messages || 0) > 99
                  ? '99+'
                  : notificationCounts.messages}
              </span>
            )}
          </button>


          {profile.account_type !== 'employer' && (

            <button
              className="icon-btn ai-icon"
              onClick={() => setSection('ai')}
            >
              <Sparkles size={19} />
            </button>

          )}

          <button
            className="avatar-button"
            onClick={() => setSection('profile')}
          >
            <Avatar profile={profile} />
          </button>

        </div>

      </header>


      <div className="app-grid">

        {/* SIDEBAR */}

        <AppNavigation
          profile={profile}
          section={section}
          activeNav={activeNav}
          notificationCounts={
            notificationCounts
          }
          mobileMoreOpen={
            mobileMoreOpen
          }
          onSetMobileMoreOpen={
            setMobileMoreOpen
          }
          onNavigate={id => {
            setSection(id);
            markSectionNotificationsRead(
              id
            );
          }}
          onMobileNavigate={key => {
            if (key === 'messages') {
              const latestMessageNotification =
                notifications.find(
                  item =>
                    !item.read_at &&
                    (
                      item.kind ===
                        'message' ||
                      item.kind ===
                        'message_mention'
                    )
                );

              if (
                latestMessageNotification
              ) {
                openNotification(
                  latestMessageNotification
                );
                return;
              }

              setMessageConversationId(
                null
              );
              setMessageTargetUserId(
                null
              );
            }

            setSection(key);
          }}
          onProfile={() =>
            setSection('profile')
          }
          onLogout={logout}
        />



        {/* MAIN */}

        <main className="content">

          <SectionErrorBoundary
            sectionKey={section}
          >

          {profile.account_type !== 'employer' && section === 'home' && (
            <HomePage
              profile={profile}
              go={setSection}
              notify={notify}
              overview={overview}
              overviewLoading={
                overviewLoading
              }
              onOpenProfile={openMemberProfile}
              onAskAiMaterial={
                openMaterialInAi
              }
              aiAccess={
                globalAiAccess
              }
            />
          )}

          {section === 'friends' && (
            <Friends
              profile={profile}
              notify={notify}
              onlineUserIds={onlineUserIds}
              requestedProfileId={requestedProfileId}
              onOpenChat={personId => {
                openMiniChat({
                  userId: personId
                });
              }}
            />
          )}

          {!isMobileViewport &&
          miniChats.map(
            (chat, index) => (
              <MiniChat
                key={chat.key}
                profile={profile}
                notify={notify}
                targetUserId={
                  chat.userId
                }
                targetConversationId={
                  chat.conversationId
                }
                onlineUserIds={
                  onlineUserIds
                }
                index={index}
                onClose={() =>
                  closeMiniChat(
                    chat.key
                  )
                }
              />
            )
          )}

          {section === 'messages' && (
            <PostOffice
              profile={profile}
              notify={notify}
              onlineUserIds={onlineUserIds}
              requestedConversationId={messageConversationId}
              requestedUserId={messageTargetUserId}
              onConversationResolved={conversationId => {
                setMessageConversationId(conversationId);
                setMessageTargetUserId(null);
              }}
              onMessagesRead={() =>
                markSectionNotificationsRead('messages')
              }
              onOpenMiniChat={
                isMobileViewport
                  ? null
                  : (
                      personId,
                      conversationId
                    ) => {
                      openMiniChat({
                        userId: personId,
                        conversationId
                      });
                    }
              }
            />
          )}

          {section === 'calendar' && (
            <Calendar
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'tasks' && (
            <Tasks
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'docs' && (
            <Documents
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'courses' && (
            <Courses
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'jobs' && (
            <Career
              profile={profile}
              notify={notify}
            />
          )}

          {section === 'ai' && (
            <AI
              profile={profile}
              externalAsk={
                externalAiAsk
              }
              onExternalAskConsumed={() =>
                setExternalAiAsk(null)
              }
              onUsageChanged={
                loadGlobalAiAccess
              }
            />
          )}

          {section === 'admin' && (
            adminRole ? (
              <AdminMfaGate
                profile={profile}
                role={adminRole}
                notify={notify}
              >
                <AdminControlCenter
                  profile={profile}
                  role={adminRole}
                  notify={notify}
                />
              </AdminMfaGate>
            ) : (
              <div className="empty card">
                <ShieldCheck size={28} />
                <h3>Admin access required.</h3>
              </div>
            )
          )}

          {section === 'settings' && (
            <SettingsPage
              profile={profile}
              setProfile={setProfile}
              notify={notify}
            />
          )}

          {section === 'profile' && (
            <MyProfile
              profile={profile}
              notify={notify}
              onEditProfile={() => setSection('settings')}
            />
          )}

          </SectionErrorBoundary>

        </main>


        {/* RIGHT SIDEBAR */}

        {profile.account_type !== 'employer' && (
        <aside className="rightbar">

          <div className="card ai-card">

            <div className="ai-badge">
              <Sparkles size={16} />
              ONSTOOD AI
            </div>

            <h3>
              Your student assistant.
            </h3>

            <p>
              Ask about your studies, organize your
              week or work with your documents.
            </p>

            <button
              className="btn primary full"
              onClick={() => setSection('ai')}
            >
              Open AI assistant
              <ChevronRight size={16} />
            </button>

          </div>


          <div className="card tip">
            <b>ONSTOOD idea</b>
            <p>
              Knowledge becomes more valuable
              when students pass it to each other.
            </p>
          </div>

        </aside>
        )}

      </div>

      {profile.account_type !== 'employer' &&
      !isMobileViewport && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            width: 'min(260px, calc(100vw - 24px))',
            zIndex: 10040
          }}
        >
          <OnlineConnections
            profile={profile}
            onlineUserIds={onlineUserIds}
            notify={notify}
            onOpenChat={personId => {
              openMiniChat({
                userId: personId
              });
            }}
          />
        </div>
      )}


      <style>{`
        @keyframes onstoodGlobalSelectionFlow {
          0% {
            transform: translateX(-125%);
            opacity: 0;
          }
          14% {
            opacity: .9;
          }
          72% {
            opacity: .58;
          }
          100% {
            transform: translateX(250%);
            opacity: 0;
          }
        }

        @keyframes onstoodGlobalSelectionLed {
          0%, 100% {
            opacity: .5;
            box-shadow:
              0 0 5px rgba(96,165,250,.7),
              0 0 11px rgba(99,102,241,.28);
          }
          50% {
            opacity: 1;
            box-shadow:
              0 0 8px rgba(125,211,252,.95),
              0 0 19px rgba(99,102,241,.55);
          }
        }

        .onstood-global-selection-toolbar {
          position: fixed;
          z-index: 70000;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border: 1px solid rgba(148,163,184,.28);
          border-radius: 14px;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(15px);
          box-shadow:
            0 16px 45px rgba(15,23,42,.18),
            inset 0 1px 0 rgba(255,255,255,.92);
        }

        .onstood-global-selection-copy {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(148,163,184,.28);
          border-radius: 10px;
          background: #fff;
          color: #475569;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .onstood-global-selection-chip {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 10px;
          border: 1px solid rgba(99,102,241,.30);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .35px;
          white-space: nowrap;
          cursor: pointer;
          box-shadow:
            inset 0 0 18px rgba(96,165,250,.10),
            0 0 16px rgba(99,102,241,.18);
          transition:
            transform .16s ease,
            box-shadow .16s ease,
            opacity .16s ease;
        }

        .onstood-global-selection-chip.standard {
          background:
            radial-gradient(circle at 72% 50%,rgba(56,189,248,.18),transparent 35%),
            linear-gradient(135deg,#172554,#312e81);
        }

        .onstood-global-selection-chip.advanced {
          background:
            radial-gradient(circle at 70% 50%,rgba(125,211,252,.22),transparent 34%),
            linear-gradient(135deg,#09111f,#202b55);
        }

        .onstood-global-selection-chip:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow:
            inset 0 0 20px rgba(96,165,250,.14),
            0 0 23px rgba(99,102,241,.32);
        }

        .onstood-global-selection-chip:disabled {
          opacity: .38;
          cursor: default;
          box-shadow: none;
        }

        .onstood-global-selection-flow {
          position: absolute;
          inset: 0 auto 0 0;
          width: 36%;
          z-index: 1;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(125,211,252,.28),
              rgba(167,139,250,.30),
              transparent
            );
          animation:
            onstoodGlobalSelectionFlow 1.85s linear infinite;
          pointer-events: none;
        }

        .onstood-global-selection-chip.advanced
        .onstood-global-selection-flow {
          animation-duration: 1.5s;
        }

        .onstood-global-selection-led {
          position: relative;
          z-index: 3;
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 7px;
          border-radius: 999px;
          background: #7dd3fc;
          animation:
            onstoodGlobalSelectionLed 1.35s ease-in-out infinite;
          vertical-align: middle;
        }

        .onstood-global-selection-chip:disabled
        .onstood-global-selection-flow {
          display: none;
        }

        .onstood-global-selection-chip:disabled
        .onstood-global-selection-led {
          background: #64748b;
          animation: none;
          box-shadow: none;
        }

        .onstood-global-selection-label {
          position: relative;
          z-index: 4;
        }

        @media (max-width: 720px) {
          .onstood-global-selection-toolbar {
            max-width: calc(100vw - 16px);
            gap: 4px;
            padding: 5px;
          }

          .onstood-global-selection-chip {
            padding: 0 7px;
            font-size: 9px;
            letter-spacing: .15px;
          }

          .onstood-global-selection-copy {
            width: 30px;
            height: 30px;
          }
        }

        .mobile-chat-back {
          display: none !important;
        }


        .mobile-bottom-nav,
        .mobile-more-backdrop {
          display: none;
        }


        .notification-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          border: 0;
          padding: 0;
          margin: 0;
          background: transparent;
        }

        .notification-panel {
          z-index: 1000 !important;
        }

        /* ===================================================
           ONSTOOD RESPONSIVE FOUNDATION
           Desktop: >= 1181px
           Tablet browser: 768px - 1180px
           =================================================== */

        @media (min-width: 1181px) {
          .app-grid {
            min-width: 0;
          }

          .content,
          .sidebar,
          .rightbar {
            min-width: 0;
          }
        }

        @media (min-width: 768px) and (max-width: 1180px) {
          html,
          body,
          #root {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .app-shell {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          .topbar {
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            padding-left: 14px !important;
            padding-right: 14px !important;
            gap: 10px !important;
          }

          .topbar .brand {
            flex: 0 0 auto;
          }

          .global-search {
            min-width: 0 !important;
            flex: 1 1 260px !important;
            max-width: none !important;
          }

          .global-search input {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .top-actions {
            flex: 0 0 auto;
            gap: 5px !important;
          }

          .app-grid {
            display: grid !important;
            grid-template-columns:
              minmax(160px, 190px)
              minmax(0, 1fr) !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            box-sizing: border-box !important;
          }

          .sidebar {
            width: auto !important;
            min-width: 0 !important;
            max-width: 190px !important;
          }

          .sidebar .profile-mini {
            min-width: 0 !important;
          }

          .sidebar .profile-mini > div {
            min-width: 0 !important;
          }

          .sidebar .profile-mini b,
          .sidebar .profile-mini small {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sidebar nav button {
            min-width: 0 !important;
            gap: 8px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .sidebar nav button > span:last-of-type {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .content {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-x: hidden;
          }

          .rightbar {
            display: none !important;
          }

          .hero,
          .card,
          .feed-card,
          .post-card {
            max-width: 100%;
            box-sizing: border-box;
          }

          .hero {
            overflow: hidden;
          }

          .grid2,
          .two-col {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .people-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .page-heading {
            gap: 12px !important;
            flex-wrap: wrap !important;
          }

          .page-heading .search-box {
            width: min(100%, 320px) !important;
          }

          .post-card img,
          .post-card video {
            max-width: 100%;
          }

          .onstood-global-selection-toolbar {
            max-width: calc(100vw - 24px);
          }

          .onstood-mini-chat-shell {
            max-width: min(360px, calc(100vw - 24px)) !important;
          }
        }

        @media (min-width: 768px) and (max-width: 900px) {
          .app-grid {
            grid-template-columns:
              150px minmax(0, 1fr) !important;
            gap: 10px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .sidebar {
            max-width: 150px !important;
          }

          .sidebar nav button {
            font-size: 13px !important;
          }

          .sidebar .profile-mini small {
            display: none !important;
          }

          .topbar {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .global-search input {
            font-size: 13px !important;
          }

          .people-grid {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }

          .grid2,
          .two-col {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }
        }


        /* Mobile browser foundation */
        @media (max-width: 767px) {
          html,
          body,
          #root {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          body {
            -webkit-text-size-adjust: 100%;
          }

          .app-shell {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          .topbar {
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            padding: 8px 10px !important;
            gap: 7px !important;
          }

          .topbar .brand {
            flex: 0 0 auto;
            font-size: 19px !important;
          }

          .global-search {
            min-width: 0 !important;
            flex: 1 1 auto !important;
            max-width: none !important;
          }

          .global-search input {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            font-size: 13px !important;
          }

          .top-actions {
            flex: 0 0 auto;
            gap: 2px !important;
          }


          /* Mobile notifications */
          .notification-panel {
            position: fixed !important;
            top: 76px !important;
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
            max-width: none !important;
            max-height: calc(100dvh - 96px) !important;
            border-radius: 16px !important;
          }

          .notification-panel-head {
            gap: 8px !important;
            padding: 10px 12px !important;
          }

          .notification-panel-head strong {
            font-size: 14px !important;
          }

          .notification-panel-head .btn {
            padding: 6px 8px !important;
            font-size: 10px !important;
            white-space: nowrap !important;
          }

          .notification-list {
            max-height: calc(100dvh - 154px) !important;
          }

          .notification-row {
            padding: 8px 9px !important;
            gap: 6px !important;
            grid-template-columns: 7px minmax(0,1fr) 14px !important;
          }

          .notification-row strong {
            font-size: 11.5px !important;
            line-height: 1.2 !important;
          }

          .notification-row span {
            font-size: 10.5px !important;
            line-height: 1.25 !important;
          }

          .notification-row small {
            font-size: 9.5px !important;
            margin-top: 2px !important;
          }


          .onstood-post-composer {
            padding: 10px !important;
          }

          .onstood-post-composer textarea {
            font-size: 16px !important;
          }

          .onstood-post-composer .btn,
          .onstood-post-composer select {
            min-height: 40px !important;
          }

          /* Mobile ONSTOOD AI: history becomes a small top strip,
             while the conversation gets the screen. */
          .onstood-ai-workspace {
            display: flex !important;
            flex-direction: column !important;
            min-height: calc(100dvh - 220px) !important;
          }

          .onstood-ai-history {
            width: 100% !important;
            max-width: 100% !important;
            border-right: 0 !important;
            border-bottom: 1px solid rgba(0,0,0,.08) !important;
            padding: 8px 10px !important;
            gap: 6px !important;
            flex: 0 0 auto !important;
          }

          .onstood-ai-history > div:first-child {
            display: none !important;
          }

          .onstood-ai-history > small {
            display: none !important;
          }

          .onstood-ai-history > div:last-child {
            display: flex !important;
            gap: 6px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            max-height: none !important;
            padding-bottom: 2px !important;
            scrollbar-width: none;
          }

          .onstood-ai-history > div:last-child::-webkit-scrollbar {
            display: none;
          }

          .onstood-ai-history > div:last-child button {
            flex: 0 0 auto !important;
            width: auto !important;
            max-width: 190px !important;
            min-width: 120px !important;
            margin: 0 !important;
            padding: 7px 9px !important;
          }

          .onstood-ai-history > div:last-child button b {
            font-size: 11px !important;
          }

          .onstood-ai-history > div:last-child button small {
            font-size: 9px !important;
          }

          .onstood-ai-chat {
            min-height: 0 !important;
            flex: 1 1 auto !important;
          }

          .onstood-ai-messages {
            min-height: 52dvh !important;
            max-height: none !important;
            padding: 12px !important;
          }

          .onstood-ai-composer-wrap {
            padding: 9px !important;
            background: #fff !important;
            position: sticky !important;
            bottom: 0 !important;
            z-index: 18 !important;
          }

          .onstood-ai-usage-row {
            gap: 5px !important;
            margin-bottom: 6px !important;
          }

          .onstood-ai-usage-row small {
            font-size: 9.5px !important;
          }

          .onstood-ai-composer {
            gap: 6px !important;
          }

          .onstood-ai-composer input {
            min-width: 0 !important;
            font-size: 16px !important;
          }

          .onstood-ai-composer .onstood-advanced-chip {
            width: 118px !important;
            min-width: 118px !important;
            padding: 0 7px !important;
          }

          .onstood-ai-composer .onstood-chip-title {
            font-size: 8px !important;
            letter-spacing: .35px !important;
          }

          .onstood-ai-composer .onstood-chip-count {
            display: none !important;
          }

          .top-actions .icon-btn {
            width: 34px !important;
            height: 34px !important;
          }

          .avatar-button {
            width: 36px !important;
            height: 36px !important;
          }

          .app-grid {
            display: block !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding: 0 10px calc(88px + env(safe-area-inset-bottom)) !important;
            box-sizing: border-box !important;
          }

          .desktop-sidebar {
            display: none !important;
          }

          .mobile-bottom-nav {
            position: fixed;
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            left: 8px;
            right: 8px;
            bottom: max(8px, env(safe-area-inset-bottom));
            z-index: 24000;
            min-height: 62px;
            padding: 6px 5px;
            border: 1px solid rgba(148,163,184,.22);
            border-radius: 20px;
            background: rgba(255,255,255,.97);
            backdrop-filter: blur(18px);
            box-shadow: 0 14px 40px rgba(15,23,42,.16);
          }

          .mobile-nav-item {
            position: relative;
            border: 0;
            background: transparent;
            min-width: 0;
            min-height: 50px;
            padding: 5px 2px;
            border-radius: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            color: #64748b;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
          }

          .mobile-nav-item.active {
            color: #4338ca;
            background: rgba(79,70,229,.09);
          }

          .mobile-nav-item span {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobile-nav-badge {
            position: absolute;
            top: 2px;
            right: 18%;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            background: #ef4444;
            color: #fff !important;
            font-size: 9px;
            line-height: 1;
            box-shadow: 0 0 0 2px #fff;
          }

          .mobile-more-backdrop {
            position: fixed;
            inset: 0;
            z-index: 25000;
            display: flex !important;
            align-items: flex-end;
            background: rgba(15,23,42,.30);
          }

          .mobile-more-sheet {
            width: 100%;
            max-height: min(68dvh, 520px);
            overflow-y: auto;
            padding:
              8px 14px
              calc(18px + env(safe-area-inset-bottom));
            border-radius: 24px 24px 0 0;
            background: #fff;
            box-shadow: 0 -18px 50px rgba(15,23,42,.18);
          }

          .mobile-more-handle {
            width: 38px;
            height: 4px;
            border-radius: 999px;
            background: rgba(100,116,139,.28);
            margin: 2px auto 10px;
          }

          .mobile-more-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 17px;
            font-weight: 900;
            padding: 2px 2px 12px;
          }

          .mobile-more-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 9px;
          }

          .mobile-more-grid button {
            border: 1px solid rgba(148,163,184,.20);
            background: rgba(248,250,252,.92);
            border-radius: 15px;
            min-height: 74px;
            padding: 10px 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: #334155;
            font-size: 11px;
            font-weight: 800;
          }

          .content {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .rightbar {
            display: none !important;
          }

          .hero,
          .card,
          .feed-card,
          .post-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .hero {
            padding: 18px !important;
            border-radius: 18px !important;
            overflow: hidden !important;
          }

          .hero h1 {
            font-size: clamp(25px, 8vw, 34px) !important;
            line-height: 1.06 !important;
          }

          .page-heading {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .page-heading .search-box,
          .search-box {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .grid2,
          .two-col,
          .people-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .post-card img,
          .post-card video,
          .card img,
          .card video {
            max-width: 100% !important;
            height: auto;
          }

          input,
          textarea,
          select,
          button {
            max-width: 100%;
            box-sizing: border-box;
          }

          textarea {
            resize: vertical;
          }

          .onstood-global-selection-toolbar {
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
            max-width: calc(100vw - 16px) !important;
            justify-content: center !important;
            overflow-x: auto !important;
          }

          .onstood-global-selection-chip {
            min-width: max-content;
          }

          .onstood-mini-chat-shell {
            display: none !important;
          }

          .mobile-chat-back {
            display: inline-grid !important;
            place-items: center !important;
            width: 36px !important;
            height: 36px !important;
            flex: 0 0 36px !important;
            font-size: 20px !important;
          }

          .postoffice-layout {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .postoffice-inbox-card {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .postoffice-layout:has(.postoffice-message-scroll)
          .postoffice-inbox-card {
            display: none !important;
          }

          .postoffice-conversation-card {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            border-radius: 16px !important;
            overflow: hidden !important;
          }

          /* On portrait mobile the empty conversation pane must not exist.
             It was the large white card covering Profile/Home. */
          .postoffice-conversation-card:not(:has(.postoffice-message-scroll)) {
            display: none !important;
          }

          /* Once a conversation is actually open, use the available screen. */
          .postoffice-conversation-card:has(.postoffice-message-scroll) {
            display: flex !important;
            min-height: calc(100dvh - 150px) !important;
            height: calc(100dvh - 150px) !important;
            max-height: calc(100dvh - 150px) !important;
          }

          .postoffice-message-scroll {
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          .postoffice-composer {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 20 !important;
            background: #fff !important;
            grid-template-columns:
              34px 34px 34px 34px minmax(0,1fr) 38px !important;
            gap: 5px !important;
            padding: 8px !important;
          }

          .postoffice-composer input:not([type="file"]) {
            min-height: 40px !important;
            font-size: 16px !important;
          }


          /* Conversation options are a bottom sheet on mobile.
             Never let the desktop popup become a thin clipped column. */
          .conversation-options-menu {
            position: fixed !important;
            left: 8px !important;
            right: 8px !important;
            top: auto !important;
            bottom: calc(82px + env(safe-area-inset-bottom)) !important;
            width: auto !important;
            max-width: none !important;
            max-height: min(62dvh, 520px) !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 8px !important;
            border-radius: 18px !important;
            z-index: 32000 !important;
            box-shadow: 0 -14px 46px rgba(15,23,42,.22) !important;
          }

          .conversation-options-menu > button {
            min-height: 42px !important;
            font-size: 14px !important;
          }

          .conversation-label-grid {
            display: grid !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
            padding: 6px 8px 9px !important;
          }

          .conversation-label-grid button {
            width: 100% !important;
            min-width: 0 !important;
            justify-content: center !important;
            font-size: 12px !important;
            min-height: 36px !important;
          }
        }

        @media (max-width: 520px) {
          .topbar {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .topbar .brand {
            font-size: 17px !important;
          }

          .global-search {
            flex-basis: 120px !important;
          }

          .top-actions .icon-btn {
            width: 31px !important;
            height: 31px !important;
          }

          .app-grid {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .hero {
            padding: 15px !important;
          }

          .hero .btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 390px) {
          .global-search {
            display: none !important;
          }

          .topbar {
            justify-content: space-between !important;
          }
        }

        @media (max-width: 767px) and (orientation: landscape) {
          .sidebar {
            left: 12px !important;
            right: 12px !important;
          }

          .onstood-mini-chat-shell {
            inset: 48px 10px 70px 10px !important;
          }

          .hero {
            padding-top: 14px !important;
            padding-bottom: 14px !important;
          }
        }
      `}</style>


      {globalSelectionAction && (
        <div
          ref={
            globalSelectionToolbarRef
          }
          className="onstood-global-selection-toolbar"
          style={{
            left:
              globalSelectionAction.left,
            top:
              globalSelectionAction.top
          }}
          onMouseDown={event =>
            event.preventDefault()
          }
        >
          <button
            type="button"
            className="onstood-global-selection-copy"
            onClick={
              copyGlobalSelection
            }
            title="Copy"
          >
            <Copy size={15} />
          </button>

          <button
            type="button"
            className="onstood-global-selection-chip standard"
            disabled={
              globalAiAccess.loaded &&
              globalAiAccess.standard_left <= 0
            }
            onClick={() =>
              openGlobalSelectionInAi(
                'standard'
              )
            }
            title="Ask ONSTOOD AI about selected text"
          >
            <span className="onstood-global-selection-flow" />
            <span className="onstood-global-selection-led" />
            <span className="onstood-global-selection-label">
              ASK ONSTOOD AI
            </span>
          </button>

          <button
            type="button"
            className="onstood-global-selection-chip advanced"
            disabled={
              !globalAiAccess.loaded ||
              globalAiAccess.plan_code !== 'pro' ||
              globalAiAccess.advanced_left <= 0
            }
            onClick={() =>
              openGlobalSelectionInAi(
                'advanced'
              )
            }
            title={
              globalAiAccess.plan_code === 'pro'
                ? 'Ask Advanced ONSTOOD AI about selected text'
                : 'Advanced AI requires ONSTOOD PRO'
            }
          >
            <span className="onstood-global-selection-flow" />
            <span className="onstood-global-selection-led" />
            <span className="onstood-global-selection-label">
              ASK ADVANCED ONSTOOD AI
            </span>
          </button>
        </div>
      )}


      {toast && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 14,
            bottom: 'auto',
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)',
            zIndex: 50000,
            width: 'max-content',
            maxWidth: 'min(88vw, 440px)',
            height: 'auto',
            minHeight: 0,
            maxHeight: 'none',
            padding: '9px 13px',
            margin: 0,
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#fff',
            boxShadow: '0 10px 28px rgba(15,23,42,.24)',
            fontSize: 13,
            lineHeight: 1.35,
            fontWeight: 700,
            textAlign: 'center',
            whiteSpace: 'normal',
            pointerEvents: 'none',
            display: 'block',
            inset: 'auto auto auto 50%'
          }}
        >
          {toast}
        </div>
      )}

    </div>
  );
}


/* =========================================================
   HOME
   ========================================================= */


















/* =========================================================
   NETWORK
   ========================================================= */
















/* =========================================================
   MESSAGES / COMMUNICATION HUB
   Professional direct messaging foundation:
   - accepted connections only
   - private conversations with RLS
   - realtime messages
   - unread state + read receipts
   - online presence
   - typing indicator
   - secure attachments
   ========================================================= */








/* =========================================================
   CALENDAR
   ========================================================= */




/* =========================================================
   TASKS
   ========================================================= */




/* =========================================================
   DOCUMENTS
   ========================================================= */




/* =========================================================
   COURSES
   ========================================================= */







/* =========================================================
   CAREER
   ========================================================= */




/* =========================================================
   AI
   ========================================================= */






/* =========================================================
   PROFILE
   ========================================================= */









/* =========================================================
   SETTINGS & PRIVACY
   ========================================================= */


/* =========================================================
   V21 ADMIN CONTROL CENTER
   ========================================================= */





function AdminControlCenter({
  profile,
  role,
  notify
}) {

  const [tab, setTab] =
    useState('dashboard');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [stats, setStats] =
    useState({
      users: 0,
      students: 0,
      employers: 0,
      courses: 0,
      jobs: 0,
      posts: 0,
      feedbackNew: 0,
      reportsOpen: 0
    });

  const [users, setUsers] =
    useState([]);

  const [feedback, setFeedback] =
    useState([]);

  const [reports, setReports] =
    useState([]);

  const [team, setTeam] =
    useState([]);

  const [audit, setAudit] =
    useState([]);

  const [search, setSearch] =
    useState('');

  const [feedbackFilter, setFeedbackFilter] =
    useState('all');

  const [financePeriod, setFinancePeriod] = useState('month');
  const [finance, setFinance] = useState({ revenue: 0, costs: 0, profit: 0, ai_cost: 0, entries: 0, currency: 'USD' });
  const [planSettings, setPlanSettings] = useState([]);

  async function loadOwnerFinance(period = financePeriod) {
    if (role !== 'owner') return;
    const now = new Date();
    let from = new Date(0);
    if (period === 'today') { from = new Date(now); from.setHours(0,0,0,0); }
    if (period === 'week') from = new Date(now.getTime() - 7*24*60*60*1000);
    if (period === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); }
    if (period === 'year') { from = new Date(now.getFullYear(), 0, 1); }
    const [{ data: summary }, { data: plans }] = await Promise.all([
      supabase.rpc('owner_finance_summary', { p_from: from.toISOString(), p_to: now.toISOString() }),
      supabase.from('plan_settings').select('plan_code,display_name,monthly_price_eur,standard_daily_limit,advanced_daily_limit,active').order('monthly_price_eur')
    ]);
    if (summary) setFinance(summary);
    if (plans) setPlanSettings(plans);
  }


  const canManageSupport =
    [
      'owner',
      'admin',
      'support'
    ].includes(role);


  const canModerate =
    [
      'owner',
      'admin',
      'moderator'
    ].includes(role);


  async function loadAll(
    quiet = false
  ) {

    quiet
      ? setRefreshing(true)
      : setLoading(true);


    const [
      usersCount,
      studentsCount,
      employersCount,
      coursesCount,
      jobsCount,
      postsCount,
      feedbackCount,
      reportsCount,
      usersResult,
      feedbackResult,
      reportsResult,
      teamResult,
      auditResult
    ] = await Promise.all([

      supabase
        .from('profiles')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('profiles')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'account_type',
          'student'
        ),

      supabase
        .from('profiles')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'account_type',
          'employer'
        ),

      supabase
        .from('courses')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('career_opportunities')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('posts')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        ),

      supabase
        .from('feedback_support')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'status',
          'new'
        ),

      supabase
        .from('moderation_reports')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .in(
          'status',
          [
            'new',
            'reviewing'
          ]
        ),

      supabase
        .from('profiles')
        .select(`
          id,
          name,
          surname,
          university,
          degree,
          city,
          account_type,
          company_name,
          admin_status,
          admin_status_reason,
          employer_verified,
          created_at
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200),

      supabase
        .from('feedback_support')
        .select(`
          id,
          user_id,
          category,
          subject,
          message,
          status,
          created_at,
          updated_at
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200),

      supabase
        .from('moderation_reports')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200),

      supabase
        .from('admin_memberships')
        .select(`
          user_id,
          role,
          active,
          created_at,
          created_by
        `)
        .order(
          'created_at',
          {
            ascending: true
          }
        ),

      supabase
        .from('admin_audit_log')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(200)

    ]);


    const countErrors = [
      usersCount,
      studentsCount,
      employersCount,
      coursesCount,
      jobsCount,
      postsCount,
      feedbackCount,
      reportsCount
    ]
      .map(item => item.error)
      .filter(Boolean);


    if (countErrors.length) {
      console.error(
        'Admin dashboard count errors:',
        countErrors
      );
    }


    setStats({
      users:
        usersCount.count || 0,
      students:
        studentsCount.count || 0,
      employers:
        employersCount.count || 0,
      courses:
        coursesCount.count || 0,
      jobs:
        jobsCount.count || 0,
      posts:
        postsCount.count || 0,
      feedbackNew:
        feedbackCount.count || 0,
      reportsOpen:
        reportsCount.count || 0
    });


    if (!usersResult.error) {
      setUsers(
        usersResult.data || []
      );
    }

    if (!feedbackResult.error) {
      setFeedback(
        feedbackResult.data || []
      );
    }

    if (!reportsResult.error) {
      setReports(
        reportsResult.data || []
      );
    }


    if (!teamResult.error) {

      const memberships =
        teamResult.data || [];

      const ids =
        memberships
          .map(item =>
            item.user_id
          )
          .filter(Boolean);


      let profilesById = {};


      if (ids.length) {

        const {
          data: teamProfiles
        } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            surname,
            account_type
          `)
          .in(
            'id',
            ids
          );


        profilesById =
          Object.fromEntries(
            (teamProfiles || [])
              .map(item => [
                item.id,
                item
              ])
          );

      }


      setTeam(
        memberships.map(item => ({
          ...item,
          profile:
            profilesById[
              item.user_id
            ] || null
        }))
      );

    }


    if (!auditResult.error) {

      setAudit(
        auditResult.data || []
      );

    }


    quiet
      ? setRefreshing(false)
      : setLoading(false);

  }


  useEffect(() => {

    loadAll();

  }, [profile.id]);

  useEffect(() => { if (role === 'owner' && tab === 'finance') loadOwnerFinance(financePeriod); }, [role, tab, financePeriod]);


  async function updateFeedbackStatus(
    item,
    status
  ) {

    if (!canManageSupport) {
      notify(
        'Your admin role cannot manage support items.'
      );
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_update_feedback',
        {
          p_feedback_id: item.id,
          p_status: status
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      `Feedback marked ${status}.`
    );

    await loadAll(true);
  }


  async function setUserStatus(
    item,
    status
  ) {

    if (!['owner','admin'].includes(role)) {
      notify('Only Owner/Admin can change account status.');
      return;
    }

    const verb =
      status === 'suspended'
        ? 'suspend'
        : 'reactivate';

    const reason =
      window.prompt(
        `Reason to ${verb} ${item.name || ''} ${item.surname || ''}?`
      );

    if (reason === null) {
      return;
    }

    if (
      status === 'suspended' &&
      !reason.trim()
    ) {
      notify('A reason is required to suspend an account.');
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_set_user_status',
        {
          p_target_user_id: item.id,
          p_status: status,
          p_reason: reason.trim() || null
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      status === 'suspended'
        ? 'Account suspended.'
        : 'Account reactivated.'
    );

    await loadAll(true);
  }


  async function setEmployerVerified(
    item,
    verified
  ) {

    if (!['owner','admin'].includes(role)) {
      notify('Only Owner/Admin can verify employers.');
      return;
    }

    const reason =
      window.prompt(
        verified
          ? `Verification note for ${item.company_name || item.name || 'employer'} (optional):`
          : `Reason to remove verification from ${item.company_name || item.name || 'employer'}?`
      );

    if (reason === null) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_set_employer_verified',
        {
          p_target_user_id: item.id,
          p_verified: verified,
          p_reason: reason.trim() || null
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      verified
        ? 'Employer verified.'
        : 'Employer verification removed.'
    );

    await loadAll(true);
  }


  async function setStaffRole(
    item,
    staffRole,
    active = true
  ) {

    if (role !== 'owner') {
      notify('Only Owner can manage the admin team.');
      return;
    }

    const label =
      `${item.name || ''} ${item.surname || ''}`.trim() ||
      'this user';

    if (
      !window.confirm(
        active
          ? `Give ${label} the ${staffRole} role?`
          : `Disable administrative access for ${label}?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_set_staff_role',
        {
          p_target_user_id: item.id,
          p_role: staffRole,
          p_active: active
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      active
        ? `${staffRole} role assigned.`
        : 'Administrative access disabled.'
    );

    await loadAll(true);
  }


  async function updateReportStatus(
    item,
    status
  ) {

    if (!canModerate) {
      notify('Your role cannot manage moderation reports.');
      return;
    }

    const reason =
      window.prompt(
        `Moderation note for status "${status}" (optional):`
      );

    if (reason === null) {
      return;
    }

    const { error } =
      await supabase.rpc(
        'admin_update_report',
        {
          p_report_id: item.id,
          p_status: status,
          p_reason: reason.trim() || null
        }
      );

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      `Report marked ${status}.`
    );

    await loadAll(true);
  }


  const filteredUsers =
    users.filter(item => {

      const haystack =
        [
          item.name,
          item.surname,
          item.university,
          item.degree,
          item.city,
          item.company_name,
          item.account_type
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();


      return haystack.includes(
        search
          .trim()
          .toLowerCase()
      );

    });


  const filteredFeedback =
    feedback.filter(item =>
      feedbackFilter === 'all'
        ? true
        : item.status ===
          feedbackFilter
    );


  const navItems = [
    [
      'dashboard',
      'Dashboard',
      Activity
    ],
    ...(role === 'owner' ? [['finance', 'Owner Finance', Activity]] : []),
    [
      'users',
      'Users',
      Users
    ],
    [
      'feedback',
      'Feedback & Support',
      MessageCircle
    ],
    [
      'moderation',
      'Moderation',
      ShieldCheck
    ],
    [
      'team',
      'Admin Team',
      UserPlus
    ],
    [
      'audit',
      'Audit Log',
      FileText
    ],
    [
      'health',
      'System Health',
      Database
    ]
  ];


  if (loading) {

    return (
      <div className="empty card">
        <ShieldCheck size={28} />
        <h3>
          Loading Admin Control Center…
        </h3>
      </div>
    );

  }


  return (

    <div>

      <div className="section-title">

        <div>
          <span className="eyebrow dark">
            V21 ADMIN
          </span>

          <h2>
            ONSTOOD Control Center
          </h2>

          <p className="muted">
            Signed in as{' '}
            <b>{role}</b>.
            Administrative roles are never
            shown on public profiles.
          </p>
        </div>


        <button
          type="button"
          className="btn subtle"
          disabled={refreshing}
          onClick={() =>
            loadAll(true)
          }
        >
          <Activity size={15} />
          {
            refreshing
              ? 'Refreshing…'
              : 'Refresh data'
          }
        </button>

      </div>


      <div
        className="card"
        style={{
          padding: 10,
          marginBottom: 16,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap'
        }}
      >

        {navItems.map(
          ([
            id,
            label,
            Icon
          ]) => (

          <button
            key={id}
            type="button"
            className={
              tab === id
                ? 'btn primary'
                : 'btn subtle'
            }
            onClick={() =>
              setTab(id)
            }
          >
            <Icon size={15} />
            {label}
          </button>

        ))}

      </div>


      {tab === 'dashboard' && (

        <>

          <div
            className="stat-row"
            style={{
              marginBottom: 16
            }}
          >

            <Stat
              label="Total users"
              value={stats.users}
            />

            <Stat
              label="Students"
              value={stats.students}
            />

            <Stat
              label="Employers"
              value={stats.employers}
            />

            <Stat
              label="Courses"
              value={stats.courses}
            />

          </div>


          <div className="grid2">

            <div className="card">

              <div className="card-head">
                <h3>
                  Platform activity
                </h3>
                <Activity size={18} />
              </div>

              <div className="metric">
                <span>
                  Career opportunities
                </span>
                <b>{stats.jobs}</b>
              </div>

              <div className="metric">
                <span>
                  Feed posts
                </span>
                <b>{stats.posts}</b>
              </div>

              <div className="metric">
                <span>
                  New feedback
                </span>
                <b>
                  {stats.feedbackNew}
                </b>
              </div>

              <div className="metric">
                <span>
                  Open reports
                </span>
                <b>
                  {stats.reportsOpen}
                </b>
              </div>

            </div>


            <div className="card">

              <div className="card-head">
                <h3>
                  Admin principles
                </h3>
                <ShieldCheck size={18} />
              </div>

              <p className="muted">
                Private chats are not exposed
                in this dashboard. Administrative
                actions must be role-based and
                auditable.
              </p>

              <div
                className="notice"
                style={{
                  marginTop: 12
                }}
              >
                Build for today's users.
                Architect for global scale.
              </div>

            </div>

          </div>

        </>

      )}


      {tab === 'finance' && role === 'owner' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><div><h3>Owner Finance</h3><small className="muted">Revenue, costs, profit and AI economics from the permanent finance ledger.</small></div><Activity size={18}/></div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {['today','week','month','year','all'].map(p => <button key={p} className={financePeriod===p?'btn primary':'btn subtle'} onClick={()=>setFinancePeriod(p)}>{p==='all'?'All time':p[0].toUpperCase()+p.slice(1)}</button>)}
            </div>
            <div className="stat-row">
              <Stat label="Revenue" value={`$${Number(finance.revenue||0).toFixed(4)}`} />
              <Stat label="Total costs" value={`$${Number(finance.costs||0).toFixed(4)}`} />
              <Stat label="Profit" value={`$${Number(finance.profit||0).toFixed(4)}`} />
              <Stat label="AI cost" value={`$${Number(finance.ai_cost||0).toFixed(4)}`} />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div><h3>Plan Engine</h3><small className="muted">Backend-controlled limits and pricing. FREE Advanced AI is locked.</small></div><ShieldCheck size={18}/></div>
            {(planSettings||[]).map(item => <div className="metric" key={item.plan_code}><span><b>{item.display_name}</b><small className="muted" style={{display:'block'}}>{item.standard_daily_limit} Standard/day · {item.advanced_daily_limit} Advanced/day</small></span><b>{Number(item.monthly_price_eur||0)===0?'FREE':`€${Number(item.monthly_price_eur).toFixed(2)}/mo`}</b></div>)}
            <div className="notice" style={{marginTop:12}}>PRO limits are configurable in the backend; €8.99/month is the planned price. Revenue remains zero until real monetization is connected.</div>
          </div>
        </div>
      )}


      {tab === 'users' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Users
              </h3>
              <small className="muted">
                Account status, employer verification
                and staff roles are protected by backend RPCs
                and recorded in Audit Log.
              </small>
            </div>

            <Users size={18} />
          </div>


          <input
            name="admin-user-search"
            placeholder="Search name, university, city, company…"
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
          />


          <div
            style={{
              display: 'grid',
              gap: 9,
              marginTop: 14
            }}
          >

            {filteredUsers.map(
              item => (

              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.06)'
                }}
              >

                <div>
                  <b>
                    {item.name}{' '}
                    {item.surname}
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.account_type
                    }
                    {
                      item.company_name
                        ? ` · ${item.company_name}`
                        : item.university
                          ? ` · ${item.university}`
                          : ''
                    }
                  </small>
                </div>


                <div
                  style={{
                    display: 'flex',
                    gap: 7,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                  }}
                >
                  {['owner','admin'].includes(role) && (
                    item.admin_status === 'suspended' ? (
                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          setUserStatus(item, 'active')
                        }
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn subtle"
                        onClick={() =>
                          setUserStatus(item, 'suspended')
                        }
                      >
                        Suspend
                      </button>
                    )
                  )}

                  {item.account_type === 'employer' &&
                   ['owner','admin'].includes(role) && (
                    <button
                      type="button"
                      className="btn subtle"
                      onClick={() =>
                        setEmployerVerified(
                          item,
                          !item.employer_verified
                        )
                      }
                    >
                      {
                        item.employer_verified
                          ? 'Unverify'
                          : 'Verify employer'
                      }
                    </button>
                  )}

                  {role === 'owner' && (
                    <select
                      name={`admin-role-${item.id}`}
                      defaultValue=""
                      onChange={event => {
                        const value = event.target.value;
                        if (!value) return;
                        setStaffRole(item, value, true);
                        event.target.value = '';
                      }}
                    >
                      <option value="">
                        Add staff role…
                      </option>
                      <option value="admin">
                        Admin
                      </option>
                      <option value="moderator">
                        Moderator
                      </option>
                      <option value="support">
                        Support
                      </option>
                    </select>
                  )}

                  <small className="muted">
                    {
                      item.admin_status === 'suspended'
                        ? 'Suspended'
                        : fmtDate(item.created_at)
                    }
                  </small>
                </div>

              </div>

            ))}

          </div>

        </div>

      )}


      {tab === 'feedback' && (

        <div className="card">

          <div className="card-head">

            <div>
              <h3>
                Feedback & Support
              </h3>

              <small className="muted">
                Suggestions, problems,
                complaints and other requests.
              </small>
            </div>

            <MessageCircle
              size={18}
            />

          </div>


          <select
            name="admin-feedback-filter"
            value={feedbackFilter}
            onChange={event =>
              setFeedbackFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All statuses
            </option>
            <option value="new">
              New
            </option>
            <option value="reviewing">
              Reviewing
            </option>
            <option value="resolved">
              Resolved
            </option>
            <option value="closed">
              Closed
            </option>
          </select>


          <div
            style={{
              display: 'grid',
              gap: 12,
              marginTop: 14
            }}
          >

            {filteredFeedback.length ===
              0 ? (

              <div className="empty compact">
                No feedback items in this view.
              </div>

            ) : (

              filteredFeedback.map(
                item => (

                <article
                  key={item.id}
                  style={{
                    padding: 14,
                    border:
                      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 14
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div>
                      <b>
                        {item.subject}
                      </b>

                      <small
                        className="muted"
                        style={{
                          display:
                            'block'
                        }}
                      >
                        {item.category}
                        {' · '}
                        {
                          fmtDate(
                            item.created_at
                          )
                        }
                      </small>
                    </div>


                    <span
                      className="pill"
                    >
                      {item.status}
                    </span>

                  </div>


                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap'
                    }}
                  >
                    {item.message}
                  </p>


                  {canManageSupport && (

                    <select
                      name={`feedback-status-${item.id}`}
                      value={
                        item.status
                      }
                      onChange={event =>
                        updateFeedbackStatus(
                          item,
                          event.target.value
                        )
                      }
                    >
                      <option value="new">
                        New
                      </option>
                      <option value="reviewing">
                        Reviewing
                      </option>
                      <option value="resolved">
                        Resolved
                      </option>
                      <option value="closed">
                        Closed
                      </option>
                    </select>

                  )}

                </article>

              ))

            )}

          </div>

        </div>

      )}


      {tab === 'moderation' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Moderation
              </h3>

              <small className="muted">
                Reports only. Private conversations
                remain private unless a future
                audited abuse flow explicitly
                requires evidence.
              </small>
            </div>

            <ShieldCheck
              size={18}
            />
          </div>


          {!canModerate ? (

            <div className="empty compact">
              Your admin role does not include moderation.
            </div>

          ) : reports.length === 0 ? (

            <div className="empty compact">
              No moderation reports.
            </div>

          ) : (

            <div
              style={{
                display: 'grid',
                gap: 10
              }}
            >
              {reports.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: 12,
                    border:
                      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12
                  }}
                >
                  <b>
                    {
                      item.target_type ||
                      'Reported item'
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
                      item.status ||
                      'new'
                    }
                    {' · '}
                    {
                      fmtDate(
                        item.created_at
                      )
                    }
                  </small>

                  <p>
                    {
                      item.details ||
                      'No additional details.'
                    }
                  </p>

                  <select
                    name={`report-status-${item.id}`}
                    value={item.status || 'open'}
                    onChange={event =>
                      updateReportStatus(
                        item,
                        event.target.value
                      )
                    }
                  >
                    <option value="open">
                      Open
                    </option>
                    <option value="reviewing">
                      Reviewing
                    </option>
                    <option value="resolved">
                      Resolved
                    </option>
                    <option value="dismissed">
                      Dismissed
                    </option>
                  </select>
                </div>
              ))}
            </div>

          )}

        </div>

      )}


      {tab === 'team' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Admin Team
              </h3>

              <small className="muted">
                Roles are backend-only and never
                appear on public profiles.
              </small>
            </div>

            <UserPlus size={18} />
          </div>


          <div
            style={{
              display: 'grid',
              gap: 10
            }}
          >

            {team.map(item => (

              <div
                key={item.user_id}
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: 12,
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid rgba(0,0,0,0.06)'
                }}
              >
                <div>
                  <b>
                    {
                      item.profile
                        ? `${item.profile.name || ''} ${item.profile.surname || ''}`.trim()
                        : 'Admin user'
                    }
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    Public profile:{' '}
                    {
                      item.profile
                        ?.account_type ||
                      'member'
                    }
                  </small>
                </div>

                <div
                  style={{
                    textAlign: 'right'
                  }}
                >
                  <b>{item.role}</b>
                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.active
                        ? 'Active'
                        : 'Inactive'
                    }
                  </small>

                  {role === 'owner' &&
                   item.role !== 'owner' &&
                   item.active && (
                    <button
                      type="button"
                      className="btn subtle"
                      style={{ marginTop: 6 }}
                      onClick={() =>
                        setStaffRole(
                          {
                            id: item.user_id,
                            name: item.profile?.name,
                            surname: item.profile?.surname
                          },
                          item.role,
                          false
                        )
                      }
                    >
                      Disable access
                    </button>
                  )}
                </div>
              </div>

            ))}

          </div>

        </div>

      )}


      {tab === 'audit' && (

        <div className="card">

          <div className="card-head">
            <div>
              <h3>
                Audit Log
              </h3>

              <small className="muted">
                Administrative actions are recorded
                for accountability.
              </small>
            </div>

            <FileText size={18} />
          </div>


          {audit.length === 0 ? (

            <div className="empty compact">
              No administrative actions recorded yet.
            </div>

          ) : (

            <div
              style={{
                display: 'grid',
                gap: 9
              }}
            >

              {audit.map(item => (

                <div
                  key={item.id}
                  style={{
                    padding:
                      '10px 0',
                    borderBottom:
                      '1px solid rgba(0,0,0,0.06)'
                  }}
                >
                  <b>
                    {item.action}
                  </b>

                  <small
                    className="muted"
                    style={{
                      display:
                        'block'
                    }}
                  >
                    {
                      item.target_type ||
                      'system'
                    }
                    {
                      item.target_id
                        ? ` · ${item.target_id}`
                        : ''
                    }
                    {' · '}
                    {
                      fmtDate(
                        item.created_at
                      )
                    }
                  </small>
                </div>

              ))}

            </div>

          )}

        </div>

      )}


      {tab === 'health' && (

        <div className="grid2">

          <div className="card">

            <div className="card-head">
              <h3>
                Data layer
              </h3>
              <Database size={18} />
            </div>

            <div className="metric">
              <span>
                Admin RLS
              </span>
              <b>Active</b>
            </div>

            <div className="metric">
              <span>
                Audit log
              </span>
              <b>Active</b>
            </div>

            <div className="metric">
              <span>
                Anonymous admin access
              </span>
              <b>Blocked</b>
            </div>

          </div>


          <div className="card">

            <div className="card-head">
              <h3>
                Security roadmap
              </h3>
              <LockKeyhole size={18} />
            </div>

            <p className="muted">
              Remaining production tasks include
              leaked-password protection,
              RLS performance cleanup,
              MFA administration and a final
              production security audit.
            </p>

          </div>

        </div>

      )}

    </div>

  );

}





/* =========================================================
   GOOGLE FIRST-TIME ACCOUNT TYPE
   ========================================================= */




/* =========================================================
   ROOT / AUTH SESSION
   ========================================================= */





function Root() {

  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [recoveryMode, setRecoveryMode] =
    useState(() => {
      try {
        const url = new URL(window.location.href);

        return (
          url.pathname === '/reset-password' ||
          url.searchParams.get('onstood_recovery') === '1' ||
          url.searchParams.get('type') === 'recovery' ||
          window.location.hash.includes('type=recovery')
        );
      } catch {
        return false;
      }
    });

  const [recoveryError, setRecoveryError] =
    useState('');

  const [confirmationMode, setConfirmationMode] =
    useState(() => {
      try {
        const url =
          new URL(
            window.location.href
          );

        return (
          url.pathname ===
            '/confirm-signup' ||
          url.searchParams.get(
            'onstood_confirm'
          ) === '1'
        );
      } catch {
        return false;
      }
    });

  const [confirmationStatus, setConfirmationStatus] =
    useState('checking');

  const [confirmationError, setConfirmationError] =
    useState('');

  const [needsAccountType, setNeedsAccountType] =
    useState(false);

  const [profileCheckBusy, setProfileCheckBusy] =
    useState(false);


  async function checkAccountType(
    currentSession
  ) {

    const userId =
      currentSession?.user?.id;


    if (!userId) {

      setNeedsAccountType(false);
      return;

    }


    setProfileCheckBusy(true);


    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', userId)
      .maybeSingle();


    if (error) {

      console.error(
        'Profile role check error:',
        error
      );

      setNeedsAccountType(false);
      setProfileCheckBusy(false);
      return;

    }


    setNeedsAccountType(
      !data?.account_type
    );

    setProfileCheckBusy(false);

  }


  useEffect(() => {

    let mounted = true;


    async function start() {

      try {

        const url =
          new URL(window.location.href);

        const tokenHash =
          url.searchParams.get('token_hash');

        const emailType =
          url.searchParams.get('type');

        const authError =
          url.searchParams.get('error_description') ||
          url.searchParams.get('error');

        if (authError) {

          setRecoveryError(
            decodeURIComponent(
              String(authError).replace(/\+/g, ' ')
            )
          );

        }

        if (
          url.pathname === '/reset-password' &&
          tokenHash &&
          emailType === 'recovery'
        ) {

          const {
            error: verifyError
          } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });

          if (verifyError) {

            setRecoveryError(
              verifyError.message ||
              'This password reset link is invalid or has expired.'
            );

          } else {

            setRecoveryMode(true);
            setRecoveryError('');

            window.history.replaceState(
              {},
              document.title,
              '/reset-password'
            );

          }

        }

        if (
          url.pathname ===
            '/confirm-signup' ||
          url.searchParams.get(
            'onstood_confirm'
          ) === '1'
        ) {

          setConfirmationMode(true);
          setConfirmationStatus('checking');
          setConfirmationError('');

          if (!tokenHash || emailType !== 'email') {

            setConfirmationStatus('error');
            setConfirmationError(
              'This confirmation link is incomplete or invalid.'
            );

          } else {

            const {
              data: confirmationData,
              error: confirmationVerifyError
            } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'email'
            });

            if (confirmationVerifyError) {

              setConfirmationStatus('error');
              setConfirmationError(
                confirmationVerifyError.message ||
                'This confirmation link is invalid or has expired.'
              );

            } else {

              const confirmedSession =
                confirmationData?.session || null;

              setConfirmationStatus('success');
              setConfirmationError('');

              if (confirmedSession) {

                setSession(confirmedSession);

                await checkAccountType(
                  confirmedSession
                );

              }

              // Seamless activation:
              // confirmed users go straight into ONSTOOD.
              window.history.replaceState(
                {},
                document.title,
                '/'
              );

              setConfirmationMode(false);

            }

          }

        }

      } catch (error) {

        console.error(
          'Recovery URL handling error:',
          error
        );

      }

      const {
        data,
        error
      } = await supabase.auth.getSession();


      if (error) {
        console.error(
          'Session error:',
          error
        );
      }


      const currentSession =
        data?.session || null;


      if (mounted) {

        setSession(
          currentSession
        );


        if (currentSession) {
          await checkAccountType(
            currentSession
          );
        }


        setLoading(false);

      }

    }


    start();


    const {
      data: authData
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {

        if (event === 'PASSWORD_RECOVERY') {

          setRecoveryMode(true);

        }


        setSession(newSession);


        if (newSession) {

          setTimeout(() => {
            checkAccountType(
              newSession
            );
          }, 0);

        } else {

          setNeedsAccountType(false);

        }

      }
    );


    return () => {

      mounted = false;

      authData.subscription.unsubscribe();

    };

  }, []);


  if (
    loading ||
    profileCheckBusy
  ) {

    return (
      <div className="loading">
        Starting ONSTOOD…
      </div>
    );

  }


  if (confirmationMode) {

    return (
      <div className="auth-shell">

        <div className="auth-left">

          <div className="brand huge">
            ONSTOOD<span>.</span>
          </div>

          <h1>
            {confirmationStatus === 'success'
              ? 'Identity confirmed.'
              : confirmationStatus === 'error'
                ? 'Activation interrupted.'
                : 'Initializing account.'}
          </h1>

          <p>
            {confirmationStatus === 'success'
              ? 'Your email is verified and your ONSTOOD account is active.'
              : confirmationStatus === 'error'
                ? 'The activation link could not be verified.'
                : 'Securely verifying your ONSTOOD activation token…'}
          </p>

          <div className="auth-pills">
            <span>Secure</span>
            <span>Email verified</span>
            <span>ONSTOOD</span>
          </div>

        </div>

        <div className="auth-card">

          <div className="brand">
            ONSTOOD<span>.</span>
          </div>

          {confirmationStatus === 'checking' && (
            <>
              <h2>Activating your account…</h2>
              <div className="message">
                Verifying your email securely. This should only take a moment.
              </div>
            </>
          )}

          {confirmationStatus === 'success' && (
            <>
              <h2>◈ ACCOUNT ACTIVATED</h2>

              <div className="message success">
                Your email has been confirmed successfully.
                Welcome to ONSTOOD.
              </div>

              <button
                className="btn primary full"
                onClick={() => {
                  window.history.replaceState(
                    {},
                    document.title,
                    '/'
                  );
                  setConfirmationMode(false);
                }}
              >
                Continue to sign in
              </button>
            </>
          )}

          {confirmationStatus === 'error' && (
            <>
              <h2>Activation link unavailable</h2>

              <div className="message">
                {confirmationError}
              </div>

              <button
                className="btn primary full"
                onClick={() => {
                  window.history.replaceState(
                    {},
                    document.title,
                    '/'
                  );
                  setConfirmationMode(false);
                  setConfirmationStatus('checking');
                  setConfirmationError('');
                }}
              >
                Back to sign in
              </button>
            </>
          )}

          <div
            className="muted"
            style={{
              marginTop: 14,
              fontSize: 12
            }}
          >
            Secure account activation powered by ONSTOOD Auth.
          </div>

        </div>

      </div>
    );

  }


  if (recoveryMode) {

    if (recoveryError) {

      return (
        <div className="auth-shell">

          <div className="auth-left">

            <div className="brand huge">
              ONSTOOD<span>.</span>
            </div>

            <h1>
              Reset link
              <br />
              unavailable.
            </h1>

            <p>
              This password reset link is invalid, expired,
              or has already been used.
            </p>

          </div>

          <div className="auth-card">

            <div className="brand">
              ONSTOOD<span>.</span>
            </div>

            <h2>
              Request a new password reset link
            </h2>

            <div className="message">
              {recoveryError}
            </div>

            <button
              className="btn primary full"
              onClick={() => {
                window.history.replaceState(
                  {},
                  document.title,
                  '/'
                );
                setRecoveryError('');
                setRecoveryMode(false);
              }}
            >
              Back to sign in
            </button>

          </div>

        </div>
      );

    }

    return (
      <ResetPassword
        onDone={async () => {

          const {
            data
          } = await supabase.auth.getSession();

          const activeSession =
            data?.session || null;

          if (activeSession) {

            setSession(activeSession);

            await checkAccountType(
              activeSession
            );

          }

          window.history.replaceState(
            {},
            document.title,
            '/'
          );

          setRecoveryError('');
          setRecoveryMode(false);

        }}
      />
    );

  }


  if (!session) {

    return (
      <Auth
        onReady={setSession}
      />
    );

  }


  if (needsAccountType) {

    return (
      <GoogleAccountType
        session={session}
        onDone={() => {
          setNeedsAccountType(false);
        }}
      />
    );

  }


  return (
    <App
      session={session}
    />
  );

}



/* =========================================================
   START APPLICATION
   ========================================================= */

createRoot(
  document.getElementById('root')
).render(
  <Root />
);