import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Filter, LoaderCircle, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import { studentNavItems } from "../config/studentNavItems";
import { clearAuthSession } from "../lib/authSession";
import { DarkWorkspaceShell } from "../components/layout/DarkWorkspaceShell";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../components/dashboard/DashboardTopNav";
import { Button } from "../components/ui/button";
import { NavDropdown } from "../components/ui/nav-dropdown";
import { Card, CardContent } from "../components/ui/card";

function emitNotificationsChanged() {
  window.dispatchEvent(new CustomEvent("learn2hire-notifications-changed"));
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function workspaceLabelForRole(role) {
  const map = {
    faculty: "Faculty Workspace",
    company: "Company Workspace",
    college: "College Workspace",
    admin: "Admin Workspace",
  };
  return map[role] || "Workspace";
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewerRole, setViewerRole] = useState("");
  const [viewerUser, setViewerUser] = useState(() => readStoredUser());

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setViewerRole(parsed.role || "");
            setViewerUser(parsed);
          } catch {
            setViewerRole("");
            setViewerUser(null);
          }
        }

        setError("");
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readApiResponse(
          response,
          "Notifications API returned HTML instead of JSON. Restart the backend server and refresh the page."
        );

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Failed to load notifications.");
        }

        setNotifications(data.data?.notifications || []);
        setUnreadCount(data.data?.unreadCount || 0);
        emitNotificationsChanged();
      } catch (err) {
        setError(err.message || "Unable to load notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [navigate]);

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  const handleMarkRead = async (notificationId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setMarkingId(notificationId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readApiResponse(
        response,
        "Notifications API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to mark notification as read.");
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      emitNotificationsChanged();
    } catch (err) {
      setError(err.message || "Unable to update notification.");
    } finally {
      setMarkingId("");
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setMarkingAll(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readApiResponse(
        response,
        "Notifications API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to mark all notifications as read.");
      }

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      emitNotificationsChanged();
      setSuccess("All notifications marked as read.");
    } catch (err) {
      setError(err.message || "Unable to update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const isLearner = (viewerUser?.role || viewerRole) === "student";

  const filterDropdown = (
    <NavDropdown
      theme="dark"
      align="right"
      icon={Filter}
      label={filter === "all" ? "Showing: All" : `Showing: Unread (${unreadCount})`}
      items={[
        {
          label: "All notifications",
          icon: Bell,
          onClick: () => setFilter("all"),
        },
        {
          label: `Unread only (${unreadCount})`,
          icon: Bell,
          onClick: () => setFilter("unread"),
        },
        { separator: true },
        {
          label: markingAll ? "Marking all…" : "Mark all as read",
          icon: CheckCheck,
          onClick: () => handleMarkAllRead(),
          disabled: markingAll || unreadCount === 0,
        },
      ]}
    />
  );

  const shellUser = viewerUser || {
    name: "Account",
    email: "",
    role: viewerRole || "student",
  };

  const listSection = (
    <>
 {error ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <div className="space-y-4">
          {visibleNotifications.length ? (
            visibleNotifications.map((notification) => (
              <Card
                key={notification._id}
                className={`border bg-white/5 shadow-none ${
                  notification.isRead ? "border-white/10" : "border-cyan-400/30"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-white">
                            {notification.title}
                          </h2>
                          {!notification.isRead ? (
                            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {notification.message}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white/5 px-3 py-1 capitalize">
                            {notification.category}
                          </span>
                          <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {notification.actionUrl ? (
                        <Button asChild variant="default">
                          <Link
                            to={notification.actionUrl}
                            onClick={() => {
                              if (!notification.isRead) {
                                handleMarkRead(notification._id);
                              }
                            }}
                          >
                            Open
                          </Link>
                        </Button>
                      ) : null}
                      {!notification.isRead ? (
                        <Button
                          variant="default"
                          onClick={() => handleMarkRead(notification._id)}
                          disabled={markingId === notification._id}
                        >
                          {markingId === notification._id ? "Updating..." : "Mark read"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6 text-sm text-slate-400">
                No notifications found for the selected filter.
              </CardContent>
            </Card>
          )}
        </div>
    </>
  );

  if (loading) {
    if (isLearner) {
      return (
        <DarkWorkspaceShell
          title="Notifications"
          description="Keep track of job updates, applications, and assessment activity."
          workspaceLabel="Student Workspace"
          brandSubtitle="Student Workspace"
          navItems={studentNavItems}
          onNavSectionSelect={(sid) =>
            navigate("/dashboard", { state: { studentSection: sid } })
          }
          user={{
            name: shellUser.name || "Learner",
            email: shellUser.email || "",
            role: shellUser.role || "student",
          }}
          onLogout={handleLogout}
          headerIcon={Sparkles}
          actions={filterDropdown}
        >
          <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 text-slate-300">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              Loading notifications...
            </div>
          </div>
        </DarkWorkspaceShell>
      );
    }
    return (
      <div className="l2h-dark-ui flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading notifications...
        </div>
      </div>
    );
  }

  if (isLearner) {
    return (
      <DarkWorkspaceShell
        title="Notifications"
        description="Keep track of job updates, applications, and assessment activity."
        workspaceLabel="Student Workspace"
        brandSubtitle="Student Workspace"
        navItems={studentNavItems}
        onNavSectionSelect={(sid) =>
          navigate("/dashboard", { state: { studentSection: sid } })
        }
        user={{
          name: viewerUser?.name || "Learner",
          email: viewerUser?.email || "",
          role: viewerUser?.role || "student",
        }}
        onLogout={handleLogout}
        headerIcon={Sparkles}
        actions={filterDropdown}
      >
        {listSection}
      </DarkWorkspaceShell>
    );
  }

  return (
    <div className="l2h-dark-ui min-h-screen bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-white">
      <div className="p-3 sm:p-4">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel={workspaceLabelForRole(viewerRole)}
          title="Notifications"
          description="Keep track of job updates, applications, and assessment activity."
          user={{
            name: viewerUser?.name || "Account",
            email: viewerUser?.email || "",
            role: viewerRole || viewerUser?.role || "",
          }}
          onLogout={handleLogout}
          actions={filterDropdown}
        />
        {listSection}
      </div>
    </div>
  );
}

export default NotificationsPage;

