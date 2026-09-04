import React from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  Home,
  LogOut,
  Mail,
  Plus,
  Settings,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import Avatar from './Avatar';
import OnstoodWordmark from './OnstoodWordmark';

export default function AppNavigation({
  profile,
  section,
  activeNav,
  notificationCounts,
  mobileMoreOpen,
  onSetMobileMoreOpen,
  onNavigate,
  onMobileNavigate,
  onProfile,
  onLogout,
  showAdmin = false
}) {
  return (
    <>
      <aside className="sidebar desktop-sidebar">
        <button
          className="profile-mini"
          onClick={onProfile}
        >
          <Avatar profile={profile} />

          <div>
            <b>
              {profile.name}{' '}
              {profile.surname}
            </b>

            <small>
              {profile.account_type ===
              'employer'
                ? (
                    profile.company_name ||
                    'Employer'
                  )
                : (
                    profile.university ||
                    'Student'
                  )}
            </small>
          </div>
        </button>

        <nav>
          {activeNav.map(
            ([id, label, Icon]) => {
              const count =
                notificationCounts[id] ||
                0;

              return (
                <button
                  key={id}
                  className={
                    section === id
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    onNavigate(id)
                  }
                >
                  <span
                    style={{
                      position:
                        'relative',
                      display:
                        'inline-flex'
                    }}
                  >
                    <Icon size={18} />

                    {count > 0 && (
                      <span
                        style={{
                          position:
                            'absolute',
                          top: '-12px',
                          right:
                            '-14px',
                          minWidth:
                            '20px',
                          height:
                            '17px',
                          padding:
                            '0 5px',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          background:
                            '#ef4444',
                          color: '#fff',
                          borderRadius:
                            '10px',
                          fontSize:
                            '10px',
                          fontWeight:
                            '700',
                          lineHeight:
                            '1',
                          zIndex: 5,
                          boxShadow:
                            '0 1px 3px rgba(0,0,0,0.25)'
                        }}
                      >
                        {count > 99
                          ? '99+'
                          : count}

                        <span
                          style={{
                            position:
                              'absolute',
                            bottom:
                              '-3px',
                            left: '4px',
                            width: '6px',
                            height: '6px',
                            background:
                              '#ef4444',
                            borderRadius:
                              '50%'
                          }}
                        />
                      </span>
                    )}
                  </span>

                  <span>
                    {id === 'ai' ? <><OnstoodWordmark /> AI</> : id === 'docs' ? <><OnstoodWordmark /> Library</> : label}
                  </span>

                  {id === 'ai' && (
                    <em>NEW</em>
                  )}
                </button>
              );
            }
          )}
        </nav>

        <button
          className="logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>

      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
      >
        {[
          ['home', Home, 'Home'],
          ['friends', Users, 'Network'],
          ['messages', Mail, 'Messages'],
          ['ai', Sparkles, 'AI']
        ].map(
          ([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              className={
                section === key
                  ? 'mobile-nav-item active'
                  : 'mobile-nav-item'
              }
              onClick={() =>
                onMobileNavigate(key)
              }
              aria-label={label}
              title={label}
            >
              <Icon size={20} />
              <span>{label}</span>

              {key === 'messages' &&
                Number(
                  notificationCounts
                    ?.messages || 0
                ) > 0 && (
                  <span className="mobile-nav-badge">
                    {Number(
                      notificationCounts
                        .messages
                    ) > 9
                      ? '9+'
                      : Number(
                          notificationCounts
                            .messages
                        )}
                  </span>
                )}
            </button>
          )
        )}

        <button
          type="button"
          className="mobile-nav-item"
          onClick={() =>
            onSetMobileMoreOpen(
              current => !current
            )
          }
          aria-label="More"
          title="More"
        >
          <Plus size={20} />
          <span>More</span>
        </button>
      </nav>

      {mobileMoreOpen && (
        <div
          className="mobile-more-backdrop"
          onClick={() =>
            onSetMobileMoreOpen(false)
          }
        >
          <div
            className="mobile-more-sheet"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <div className="mobile-more-handle" />

            <div className="mobile-more-title">
              More
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  onSetMobileMoreOpen(
                    false
                  )
                }
                aria-label="Close menu"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mobile-more-grid">
              {[
                [
                  'calendar',
                  CalendarDays,
                  'Calendar'
                ],
                [
                  'tasks',
                  CheckCircle2,
                  'Tasks'
                ],
                [
                  'docs',
                  FileText,
                  'OnStood Library'
                ],
                [
                  'courses',
                  BookOpen,
                  'Courses'
                ],
                [
                  'jobs',
                  BriefcaseBusiness,
                  'Career'
                ],
                [
                  'settings',
                  Settings,
                  'Settings'
                ],
                ...(showAdmin
                  ? [[
                      'admin',
                      Settings,
                      'Admin'
                    ]]
                  : []),
                [
                  'logout',
                  LogOut,
                  'Sign out'
                ]
              ].map(
                ([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'logout') {
                        onSetMobileMoreOpen(false);
                        onLogout();
                        return;
                      }

                      onMobileNavigate(
                        key
                      );
                      onSetMobileMoreOpen(
                        false
                      );
                    }}
                  >
                    <Icon size={20} />
                    <span>
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
