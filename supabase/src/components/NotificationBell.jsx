import React from 'react';
import {
  Bell,
  ChevronRight
} from 'lucide-react';
import { fmtDate } from '../utils/formatters';

export default function NotificationBell({
  show,
  unreadCount,
  notifications,
  onToggle,
  onClose,
  onMarkAllRead,
  getTargetSection,
  onOpenNotification
}) {
  return (
    <div
      style={{
        position: 'relative'
      }}
    >
      <button
        type="button"
        className="icon-btn notification-btn"
        aria-label="Notifications"
        aria-expanded={show}
        onClick={onToggle}
        style={{
          position: 'relative'
        }}
      >
        <Bell size={19} />

        {unreadCount > 0 && (
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
              lineHeight: 1,
              boxShadow:
                '0 2px 6px rgba(0,0,0,0.25)'
            }}
          >
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {show && (
        <>
          <button
            type="button"
            className="notification-backdrop"
            aria-label="Close notifications"
            onClick={onClose}
          />

          <div
            role="dialog"
            aria-label="Notifications"
            className="notification-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              right: 0,
              width: 'min(390px, 88vw)',
              maxHeight: 'min(560px, 72vh)',
              overflow: 'hidden',
              background: '#fff',
              border:
                '1px solid rgba(15,23,42,0.12)',
              borderRadius: 16,
              boxShadow:
                '0 22px 60px rgba(15,23,42,0.20)',
              zIndex: 1000
            }}
          >
            <div
              className="notification-panel-head"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 12,
                padding: '14px 16px',
                borderBottom:
                  '1px solid rgba(15,23,42,0.08)'
              }}
            >
              <div>
                <strong>
                  Notifications
                </strong>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    opacity: 0.65
                  }}
                >
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : 'You are all caught up'}
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn subtle"
                  onClick={
                    onMarkAllRead
                  }
                  style={{
                    padding:
                      '7px 10px',
                    fontSize: 12
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div
              className="notification-list"
              style={{
                overflowY: 'auto',
                maxHeight:
                  'min(490px, 64vh)'
              }}
            >
              {notifications.length ===
              0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    opacity: 0.65
                  }}
                >
                  No notifications yet.
                </div>
              ) : (
                notifications.map(
                  notification => {
                    const targetSection =
                      getTargetSection(
                        notification.kind
                      );

                    const unread =
                      !notification.read_at;

                    return (
                      <button
                        key={
                          notification.id ||
                          `${notification.kind}-${notification.created_at}`
                        }
                        type="button"
                        className="notification-row"
                        onClick={() =>
                          onOpenNotification(
                            notification
                          )
                        }
                        style={{
                          width: '100%',
                          border: 0,
                          borderBottom:
                            '1px solid rgba(15,23,42,0.07)',
                          background:
                            unread
                              ? 'rgba(59,130,246,0.07)'
                              : '#fff',
                          padding:
                            '13px 16px',
                          display: 'grid',
                          gridTemplateColumns:
                            '10px 1fr auto',
                          gap: 10,
                          textAlign:
                            'left',
                          cursor:
                            targetSection
                              ? 'pointer'
                              : 'default',
                          color:
                            'inherit'
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius:
                              '50%',
                            marginTop: 6,
                            background:
                              unread
                                ? '#2563eb'
                                : 'transparent'
                          }}
                        />

                        <span>
                          <strong
                            style={{
                              display:
                                'block',
                              fontSize: 13
                            }}
                          >
                            {notification.title ||
                              'ONSTOOD notification'}
                          </strong>

                          {(notification.body ||
                            notification.message) && (
                            <span
                              style={{
                                display:
                                  'block',
                                marginTop: 3,
                                fontSize: 12,
                                lineHeight:
                                  1.4,
                                opacity:
                                  0.72
                              }}
                            >
                              {notification.body ||
                                notification.message}
                            </span>
                          )}

                          {notification.created_at && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop: 5,
                                opacity:
                                  0.52
                              }}
                            >
                              {fmtDate(
                                notification.created_at
                              )}
                            </small>
                          )}
                        </span>

                        {targetSection && (
                          <ChevronRight
                            size={15}
                            style={{
                              marginTop: 3,
                              opacity:
                                0.45
                            }}
                          />
                        )}
                      </button>
                    );
                  }
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
