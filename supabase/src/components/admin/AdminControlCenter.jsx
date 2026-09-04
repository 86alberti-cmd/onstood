import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import OnstoodWordmark from '../OnstoodWordmark';
import { fmtDate } from '../../utils/formatters';
import { Stat } from '../ui';
import {
  Activity,
  Check,
  Database,
  FileText,
  Globe2,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  Users
} from 'lucide-react';

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
  const [aiUserPeriod, setAiUserPeriod] = useState('day');
  const [aiUserCustomFrom, setAiUserCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [aiUserCustomTo, setAiUserCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [aiTopUsers, setAiTopUsers] = useState([]);
  const [aiTopUsersLoading, setAiTopUsersLoading] = useState(false);
  const [aiTopUsersError, setAiTopUsersError] = useState('');
  const [aiTopUsersLimit, setAiTopUsersLimit] = useState(10);
  const [aiTopUsersMetric, setAiTopUsersMetric] = useState('cost');
  const [aiTopUsersSelected, setAiTopUsersSelected] = useState(null);
  const [observability, setObservability] = useState({
    ai: {},
    knowledge: {},
    documents: {},
    harvester: null
  });

  async function loadObservability() {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0,0,0,0);

    const [snapshotResult, knowledgeResult] = await Promise.all([
      supabase.rpc('admin_observability_snapshot', {
        p_from: from.toISOString(),
        p_to: now.toISOString()
      }),
      supabase.rpc('onstood_public_knowledge_stats')
    ]);

    if (snapshotResult.error) {
      console.warn('Admin observability:', snapshotResult.error);
    }
    if (knowledgeResult.error) {
      console.warn('Knowledge stats:', knowledgeResult.error);
    }

    const snapshot = snapshotResult.data || {};
    const knowledgeStats = knowledgeResult.data || {};

    setObservability({
      ...snapshot,
      knowledge: {
        ...(snapshot.knowledge || {}),
        total: Number(knowledgeStats.total_records || snapshot.knowledge?.total || 0),
        academic_records: Number(knowledgeStats.academic_records || 0),
        user_contributors: Number(knowledgeStats.user_contributors || 0),
        indexed: Number(knowledgeStats.indexed || snapshot.knowledge?.indexed || 0),
        reference_only: Number(knowledgeStats.reference_only || snapshot.knowledge?.reference_only || 0)
      }
    });
  }

  function resolveAiUserRange(period = aiUserPeriod) {
    const now = new Date();
    let from = new Date(now);
    let to = new Date(now);

    if (period === 'day') {
      from.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      const parsedFrom = new Date(`${aiUserCustomFrom}T00:00:00`);
      const parsedTo = new Date(`${aiUserCustomTo}T23:59:59.999`);
      if (!Number.isNaN(parsedFrom.getTime())) from = parsedFrom;
      if (!Number.isNaN(parsedTo.getTime())) to = parsedTo;
    }

    return { from, to };
  }

  async function loadAiTopUsers(period = aiUserPeriod) {
    if (!['owner', 'admin'].includes(role)) return;
    const { from, to } = resolveAiUserRange(period);
    setAiTopUsersLoading(true);
    setAiTopUsersError('');
    try {
      const { data, error } = await supabase.rpc('admin_ai_top_users_chart', {
        p_from: from.toISOString(),
        p_to: new Date(to.getTime() + 1).toISOString(),
        p_limit: aiTopUsersLimit,
        p_metric: aiTopUsersMetric
      });
      if (error) throw error;
      setAiTopUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('AI top users:', error);
      setAiTopUsers([]);
      setAiTopUsersError(error?.message || 'Could not load AI user ranking.');
    } finally {
      setAiTopUsersLoading(false);
    }
  }

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


  useEffect(() => {
    if (tab === 'ai-observability' && ['owner', 'admin'].includes(role)) {
      loadAiTopUsers(aiUserPeriod);
    }
  }, [tab, aiUserPeriod, aiTopUsersLimit, aiTopUsersMetric, role]);

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

    loadObservability();

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
          ? `Give ${label === 'ONSTOOD AI' ? <><OnstoodWordmark /> AI</> : label} the ${staffRole} role?`
          : `Disable administrative access for ${label === 'ONSTOOD AI' ? <><OnstoodWordmark /> AI</> : label}?`
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
    [
      'ai-observability',
      'AI & Cost',
      Sparkles
    ],
    [
      'knowledge-observability',
      'Global Knowledge',
      Database
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
            <OnstoodWordmark /> Control Center
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
            {label === 'ONSTOOD AI' ? <><OnstoodWordmark /> AI</> : label}
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


      {tab === 'ai-observability' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div><h3>AI economics · today</h3><small className="muted">No private chat text is stored here. Token and cost telemetry only.</small></div>
              <Sparkles size={18}/>
            </div>
            <div className="stat-row">
              <Stat label="Answered requests" value={Number(observability.ai?.requests || 0).toLocaleString()} />
              <Stat label="AI cost today" value={`$${Number(observability.ai?.cost_usd || 0).toFixed(6)}`} />
              <Stat label="Avg / answer" value={`$${Number(observability.ai?.avg_cost_usd || 0).toFixed(6)}`} />
              <Stat label="Knowledge-assisted" value={`${Number(observability.ai?.knowledge_assisted || 0).toLocaleString()} / ${Number(observability.ai?.requests || 0).toLocaleString()}`} />
            </div>
          </div>
          <div className="grid2">
            <div className="card">
              <div className="card-head"><h3>Token flow</h3><Activity size={18}/></div>
              <div className="metric"><span>Provider input tokens</span><b>{Number(observability.ai?.input_tokens || 0).toLocaleString()}</b></div>
              <div className="metric"><span>Cached input tokens</span><b>{Number(observability.ai?.cached_input_tokens || 0).toLocaleString()}</b></div>
              <div className="metric"><span><OnstoodWordmark /> Knowledge context · est.</span><b>{Number(observability.ai?.knowledge_context_tokens_est || 0).toLocaleString()}</b></div>
              <div className="metric"><span>AI output tokens</span><b>{Number(observability.ai?.output_tokens || 0).toLocaleString()}</b></div>
            </div>
            <div className="card">
              <div className="card-head"><h3>Routing</h3><Database size={18}/></div>
              <div className="metric"><span>Standard</span><b>{Number(observability.ai?.standard_requests || 0).toLocaleString()}</b></div>
              <div className="metric"><span>Advanced</span><b>{Number(observability.ai?.advanced_requests || 0).toLocaleString()}</b></div>
              <div className="metric"><span>Knowledge-assisted</span><b>{Number(observability.ai?.knowledge_assisted || 0).toLocaleString()}</b></div>
              <div className="metric"><span>AI-only</span><b>{Number(observability.ai?.ai_only || 0).toLocaleString()}</b></div>
            </div>
          </div>
          {['owner', 'admin'].includes(role) && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head">
                <div>
                  <h3>AI abuse radar · top users</h3>
                  <small className="muted">Visual ranking of the heaviest AI users for the selected period. No prompt or private-message text is exposed.</small>
                </div>
                <Activity size={18}/>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                {[['day','Today'],['week','7 days'],['month','30 days'],['custom','Custom']].map(([id,label]) => (
                  <button
                    key={id}
                    type="button"
                    className={aiUserPeriod === id ? 'btn primary' : 'btn subtle'}
                    onClick={() => setAiUserPeriod(id)}
                  >
                    {label}
                  </button>
                ))}

                {aiUserPeriod === 'custom' && (
                  <>
                    <input type="date" value={aiUserCustomFrom} onChange={event => setAiUserCustomFrom(event.target.value)} style={{ width: 'auto' }} />
                    <span className="muted">to</span>
                    <input type="date" value={aiUserCustomTo} onChange={event => setAiUserCustomTo(event.target.value)} style={{ width: 'auto' }} />
                    <button type="button" className="btn subtle" onClick={() => loadAiTopUsers('custom')}>Apply</button>
                  </>
                )}
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                <span className="muted" style={{ fontWeight: 700 }}>Show</span>
                {[10,25,50,100].map(value => (
                  <button key={value} type="button" className={aiTopUsersLimit === value ? 'btn primary' : 'btn subtle'} onClick={() => setAiTopUsersLimit(value)}>
                    Top {value}
                  </button>
                ))}
                <span className="muted" style={{ fontWeight: 700, marginLeft: 8 }}>Rank by</span>
                {[
                  ['cost','Cost'],
                  ['requests','Requests'],
                  ['advanced','Advanced'],
                  ['tokens','Tokens']
                ].map(([id,label]) => (
                  <button key={id} type="button" className={aiTopUsersMetric === id ? 'btn primary' : 'btn subtle'} onClick={() => setAiTopUsersMetric(id)}>
                    {label}
                  </button>
                ))}
              </div>

              {aiTopUsersError && <div className="notice">{aiTopUsersError}</div>}
              {aiTopUsersLoading ? (
                <div className="empty" style={{ minHeight: 180 }}>Loading AI usage chart…</div>
              ) : aiTopUsers.length === 0 ? (
                <div className="empty" style={{ minHeight: 180 }}>No AI usage in this period.</div>
              ) : (() => {
                const metricValue = row => {
                  if (aiTopUsersMetric === 'requests') return Number(row.requests || 0);
                  if (aiTopUsersMetric === 'advanced') return Number(row.advanced_requests || 0);
                  if (aiTopUsersMetric === 'tokens') return Number(row.total_tokens || 0);
                  return Number(row.cost_usd || 0);
                };
                const values = aiTopUsers.map(metricValue).sort((a,b) => a-b);
                const maxValue = Math.max(...values, 0.000001);
                const median = values.length ? (values[Math.floor((values.length - 1) / 2)] + values[Math.ceil((values.length - 1) / 2)]) / 2 : 0;
                const formatMetric = row => {
                  const value = metricValue(row);
                  if (aiTopUsersMetric === 'cost') return `$${value.toFixed(4)}`;
                  return value.toLocaleString();
                };
                const metricLabel = aiTopUsersMetric === 'cost' ? 'AI cost' : aiTopUsersMetric === 'requests' ? 'requests' : aiTopUsersMetric === 'advanced' ? 'advanced requests' : 'tokens';

                return (
                  <>
                    <div style={{
                      maxHeight: aiTopUsersLimit > 25 ? 720 : 'none',
                      overflowY: aiTopUsersLimit > 25 ? 'auto' : 'visible',
                      padding: '8px 8px 8px 0'
                    }}>
                      {aiTopUsers.map((item, index) => {
                        const value = metricValue(item);
                        const width = Math.max(1.5, (value / maxValue) * 100);
                        const unusual = (median > 0 && value >= median * 5) || Number(item.cap_hits || 0) >= 5;
                        const selected = aiTopUsersSelected?.user_id === item.user_id;
                        return (
                          <button
                            key={item.user_id}
                            type="button"
                            onClick={() => setAiTopUsersSelected(selected ? null : item)}
                            title={`#${index + 1} ${item.name || 'User'} ${item.surname || ''} — ${formatMetric(item)}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '42px minmax(135px,220px) minmax(220px,1fr) 100px',
                              gap: 10,
                              alignItems: 'center',
                              width: '100%',
                              border: selected ? '1px solid rgba(99,102,241,.35)' : '1px solid transparent',
                              borderRadius: 14,
                              background: selected ? 'rgba(99,102,241,.055)' : 'transparent',
                              padding: '8px 10px',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <b style={{ fontVariantNumeric: 'tabular-nums' }}>#{index + 1}</b>
                            <div style={{ minWidth: 0 }}>
                              <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || 'User'} {item.surname || ''}</b>
                              <small className="muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.university || 'OnStood user'}</small>
                            </div>
                            <div style={{ position: 'relative', height: 28, borderRadius: 9, background: 'rgba(99,102,241,.08)', overflow: 'hidden' }}>
                              <div style={{
                                position: 'absolute', inset: '0 auto 0 0', width: `${width}%`, borderRadius: 9,
                                background: unusual ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                boxShadow: unusual ? '0 7px 22px rgba(239,68,68,.18)' : '0 7px 22px rgba(99,102,241,.16)',
                                transition: 'width .25s ease'
                              }} />
                              <small style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', height: '100%', padding: '0 9px', fontWeight: 800, color: width > 42 ? '#fff' : 'var(--text, #111827)' }}>
                                {formatMetric(item)}
                              </small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {unusual ? <small style={{ color: '#b45309', fontWeight: 800 }}>⚠ Unusual</small> : <small className="muted">{metricLabel}</small>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {aiTopUsersSelected && (
                      <div className="notice" style={{ marginTop: 12 }}>
                        <b>{aiTopUsersSelected.name || 'User'} {aiTopUsersSelected.surname || ''}</b>
                        {' · '}{Number(aiTopUsersSelected.requests || 0).toLocaleString()} requests
                        {' · '}{Number(aiTopUsersSelected.advanced_requests || 0).toLocaleString()} advanced
                        {' · '}{Number(aiTopUsersSelected.total_tokens || 0).toLocaleString()} tokens
                        {' · '}{Number(aiTopUsersSelected.cap_hits || 0).toLocaleString()} output-cap hits
                        {' · '}${Number(aiTopUsersSelected.cost_usd || 0).toFixed(6)} AI cost
                      </div>
                    )}

                    <div className="notice" style={{ marginTop: 12 }}>
                      Bars are relative to the highest user in the selected period. <b>Unusual</b> flags usage around 5× or more above the displayed median, or repeated output-cap hits. It is a review signal, not an automatic accusation.
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="notice" style={{marginTop:16}}>Knowledge tokens are an estimate derived from context length; provider input/output totals and cost are recorded from the AI response usage.</div>
        </div>
      )}

      {tab === 'knowledge-observability' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div><h3><OnstoodWordmark /> Global Knowledge</h3><small className="muted">Total Knowledge = indexed academic + reference-only academic + eligible student contributions.</small></div>
              <Database size={18}/>
            </div>
            <div className="stat-row">
              <Stat label="Total records" value={Number(observability.knowledge?.total || 0).toLocaleString()} />
              <Stat label="Academic records" value={Number(observability.knowledge?.academic_records || 0).toLocaleString()} />
              <Stat label="User contributors" value={Number(observability.knowledge?.user_contributors || 0).toLocaleString()} />
              <Stat label="Indexed" value={Number(observability.knowledge?.indexed || 0).toLocaleString()} />
              <Stat label="Reference-only" value={Number(observability.knowledge?.reference_only || 0).toLocaleString()} />
              <Stat label="Added today" value={`+${Number(observability.knowledge?.added_today || 0).toLocaleString()}`} />
            </div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <h3>Student document pipeline</h3>
                <small className="muted">
                  Upload → Extract/OCR → Classify → Index → Ready
                </small>
              </div>
              <FileText size={18}/>
            </div>

            <div className="stat-row">
              <Stat label="Documents" value={Number(observability.documents?.total || 0).toLocaleString()} />
              <Stat label="Ready" value={Number(observability.documents?.ready || 0).toLocaleString()} />
              <Stat label="OCR pending" value={Number(observability.documents?.ocr_pending || 0).toLocaleString()} />
              <Stat label="Failed" value={Number(observability.documents?.failed || 0).toLocaleString()} />
              <Stat label="Knowledge chunks" value={Number(observability.documents?.knowledge_chunks || 0).toLocaleString()} />
              <Stat label="Languages" value={Number(observability.documents?.languages || 0).toLocaleString()} />
            </div>

            <div className="grid2" style={{ marginTop: 14 }}>
              <div className="metric">
                <span>Extracting / classifying / indexing</span>
                <b>
                  {(
                    Number(observability.documents?.extracting || 0) +
                    Number(observability.documents?.classifying || 0) +
                    Number(observability.documents?.indexing || 0)
                  ).toLocaleString()}
                </b>
              </div>
              <div className="metric">
                <span>Extracted characters</span>
                <b>{Number(observability.documents?.extracted_chars || 0).toLocaleString()}</b>
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="card">
              <div className="card-head"><h3>Coverage</h3><Globe2 size={18}/></div>
              <div className="metric"><span>Institutions represented</span><b>{Number(observability.knowledge?.institutions || 0).toLocaleString()}</b></div>
              <div className="metric"><span>Last knowledge update</span><b>{observability.knowledge?.last_added ? new Date(observability.knowledge.last_added).toLocaleString() : '—'}</b></div>
            </div>
            <div className="card">
              <div className="card-head"><h3>Academic harvester</h3><Activity size={18}/></div>
              <div className="metric"><span>Status</span><b>{observability.harvester?.status || '—'}</b></div>
              <div className="metric"><span>Last batch scanned</span><b>{Number(observability.harvester?.seen_count || 0).toLocaleString()}</b></div>
              <div className="metric"><span>Accepted / catalogued</span><b>{Number(observability.harvester?.accepted_count || 0).toLocaleString()}</b></div>
              <div className="metric"><span>Skipped</span><b>{Number(observability.harvester?.skipped_count || 0).toLocaleString()}</b></div>
            </div>
          </div>
        </div>
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

export default AdminControlCenter;
