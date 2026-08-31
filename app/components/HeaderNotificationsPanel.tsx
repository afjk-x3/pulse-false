'use client';

import { X, Bell } from 'lucide-react';

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface HeaderNotificationsPanelProps {
  notifications: HeaderNotification[];
  onClose: () => void;
  // Not part of the task-5 brief's minimal interface, but required to preserve
  // the existing mark-as-read behavior (the header's unread-dot badge reads
  // from the same `notifications` state this mutates) -- a disclosed deviation.
  onMarkAsRead?: (id: string) => void;
}

export default function HeaderNotificationsPanel({ notifications, onClose, onMarkAsRead }: HeaderNotificationsPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-teal-600" />
          <span className="font-bold text-neutral-800">Notifications</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-neutral-100 focus:ring-2 focus:ring-teal-500"
          aria-label="Close notifications panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center text-sm text-neutral-500 py-4">No notifications</div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => onMarkAsRead?.(notif.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${notif.read ? 'bg-white border-border-color hover:bg-neutral-50' : 'bg-teal-50 border-teal-200 hover:bg-teal-100/50'}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onMarkAsRead?.(notif.id);
                }
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-semibold text-neutral-800">{notif.title}</h4>
                <span className="text-[10px] text-neutral-500">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-neutral-600 text-left">{notif.message}</p>
              {!notif.read && (
                <div className="text-[10px] text-teal-600 font-bold mt-2 text-left">
                  Click to mark as read
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
