//pages/settings.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "../redux/slices/authSlice";
import LogoutButton from "../components/LogoutButton";
import { useTheme } from "../hooks/useTheme";
import {
  MoonIcon,
  SunIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import Skeleton from "../ui/skeleton";

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-1 text-sm font-medium text-ink">{value || "—"}</p>
  </div>
);

const Settings = () => {
  const dispatch = useDispatch();
  const { user, isLoading, error } = useSelector((state) => state.auth);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Your admin profile and preferences</p>
      </div>

      {error && (
        <div className="rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {String(error)}
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardContent>
          {isLoading && !user ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xl font-semibold text-primary-fg">
                  {(user?.firstName?.[0] || "A").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold text-ink">
                    {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin"}
                  </h2>
                  <p className="truncate text-sm text-muted">{user?.email}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Field label="First Name" value={user?.firstName} />
                <Field label="Last Name" value={user?.lastName} />
                <Field label="Email" value={user?.email} />
                <Field label="Phone Number" value={user?.phoneNumber} />
                <Field label="Account Created" value={formatDate(user?.createdAt)} />
                <Field label="Last Updated" value={formatDate(user?.updatedAt)} />
              </div>

              <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
                To change your profile information, please contact support.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Theme</p>
              <p className="text-xs text-muted">Currently using {theme} mode</p>
            </div>
            <button
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              Switch to {theme === "dark" ? "light" : "dark"} mode
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader><CardTitle>Session</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Sign out</p>
              <p className="text-xs text-muted">End your admin session on this device</p>
            </div>
            <LogoutButton className="inline-flex items-center gap-2 rounded-[10px] border border-danger/40 bg-surface px-4 py-2 text-sm font-medium !text-danger shadow-sm transition-colors hover:bg-danger-soft">
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Logout
            </LogoutButton>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Settings;
