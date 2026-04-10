import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  PlayCircle,
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { NavDropdown } from '../components/ui/nav-dropdown';
import { Card, CardContent } from '../components/ui/card';
import { readApiResponse } from '../lib/api';
import progressBannerImg from '../assets/illustrations/progress-banner.png';
import emptyStateImg from '../assets/illustrations/empty-state.png';

function MyLearningProgressPage() {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    user = null;
  }

  const [summary, setSummary] = useState({
    totalStarted: 0,
    totalCompleted: 0,
    inProgressCount: 0,
    totalTimeSpentMinutes: 0,
    averageProgress: 0,
  });
  const [progress, setProgress] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/learning/progress/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readApiResponse(response);
        setSummary(
          data.data?.summary || {
            totalStarted: 0,
            totalCompleted: 0,
            inProgressCount: 0,
            totalTimeSpentMinutes: 0,
            averageProgress: 0,
          }
        );
        setProgress(data.data?.progress || []);
      } catch (err) {
        setError(err.message || 'Failed to load your learning progress.');
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.role === 'student') {
      fetchProgress();
    }
  }, [token, user?.role]);

  const filteredProgress = useMemo(() => {
    if (filter === 'completed') {
      return progress.filter((item) => item.completed);
    }

    if (filter === 'in-progress') {
      return progress.filter((item) => !item.completed);
    }

    return progress;
  }, [filter, progress]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_18%,#ffffff_38%,#f8fafc_100%)] text-slate-900">
      <main className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-indigo-200/40 shadow-[0_35px_100px_rgba(49,46,129,0.24)]">
          <img
            src={progressBannerImg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#4338ca_0%,#1e1b4b_55%,#020617_100%)] opacity-92" />
          <div className="relative px-6 py-7 text-white sm:px-10 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-200">My Learning Progress</p>
              {user?.name ? (
                <p className="mt-2 text-base font-semibold text-white drop-shadow-sm">{user.name}</p>
              ) : null}
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                Track every material you have started and completed.
              </h1>
              <p className="mt-4 max-w-2xl text-slate-100">
                Learn2Hire saves your reading activity when you open study materials while logged in
                as a student.
              </p>
            </div>

            <NavDropdown
              theme="dark"
              align="right"
              icon={BookOpen}
              label="Navigate"
              items={[
                {
                  label: 'Open learning hub',
                  to: '/dashboard/learning#learning-explore-content',
                  icon: BookOpen,
                },
                { label: 'Dashboard home', to: '/dashboard', icon: LayoutDashboard },
              ]}
            />
          </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Started</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalStarted}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Completed</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalCompleted}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.inProgressCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Time Spent</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {summary.totalTimeSpentMinutes} min
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200/80 bg-white/95 text-slate-900 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
          <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Saved Learning Activity</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Average saved progress: {summary.averageProgress}%
                </p>
              </div>

              <NavDropdown
                theme="light"
                align="right"
                icon={BookOpen}
                label={
                  filter === 'all'
                    ? 'View: All activity'
                    : filter === 'in-progress'
                      ? 'View: In progress'
                      : 'View: Completed'
                }
                items={[
                  {
                    label: 'All activity',
                    icon: BookOpen,
                    onClick: () => setFilter('all'),
                  },
                  {
                    label: 'In progress',
                    icon: PlayCircle,
                    onClick: () => setFilter('in-progress'),
                  },
                  {
                    label: 'Completed',
                    icon: CheckCircle2,
                    onClick: () => setFilter('completed'),
                  },
                ]}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">

          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-500">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading your learning progress...
              </div>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {error}
            </div>
          ) : filteredProgress.length ? (
            <div className="mt-6 space-y-4">
              {filteredProgress.map((item) => (
                <Link
                  key={item._id}
                  to={`/dashboard/learning/topic/${item.material?.slug}`}
                  className="block rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 no-underline shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                          {item.material?.category?.name || 'General'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-700">
                          {item.material?.materialType || 'MATERIAL'}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-semibold text-slate-950">
                        {item.material?.title || item.material?.name || 'Study material'}
                      </h3>

                      <p className="mt-2 text-sm text-slate-700">
                        {item.material?.summary || 'Continue this learning material.'}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          {item.timeSpentMinutes || 0} min spent
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Last viewed {new Date(item.lastViewedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-[180px]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-semibold text-slate-900">
                          {item.progressPercent || 0}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,#4f46e5_0%,#22c55e_100%)]"
                          style={{ width: `${item.progressPercent || 0}%` }}
                        />
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-sm">
                        {item.completed ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="font-medium text-emerald-700">Completed</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium text-indigo-700">In progress</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-3xl border border-dashed border-slate-300">
              <img src={emptyStateImg} alt="" className="h-52 w-full object-cover opacity-70" />
              <div className="bg-slate-50 p-6 text-center text-sm text-slate-500">
                No saved learning progress yet. Open a material from the learning hub and your
                activity will start appearing here.
              </div>
            </div>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default MyLearningProgressPage;
