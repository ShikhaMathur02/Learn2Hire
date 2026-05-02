import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookText,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Layers3,
  LoaderCircle,
  Sparkles,
  Tag,
} from 'lucide-react';

import SiteHeader from '../components/landing/SiteHeader';
import { DarkWorkspaceShell } from '../components/layout/DarkWorkspaceShell';
import { facultyNavItems } from '../config/facultyNavItems';
import { studentNavItems } from '../config/studentNavItems';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { readApiResponse } from '../lib/api';
import { clearAuthSession } from '../lib/authSession';
import { getSubjectImage } from '../lib/subjectIllustration';
import heroDashboardImg from '../assets/illustrations/hero-dashboard.png';

function youtubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function MaterialDetailsPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionStartedAtRef = useRef(Date.now());
  const storedUser = localStorage.getItem('user');

  let parsedUser = null;
  try {
    parsedUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    parsedUser = null;
  }

  const isLearner =
    parsedUser?.role && String(parsedUser.role).toLowerCase() === 'student';

  const [material, setMaterial] = useState(null);
  const [relatedMaterials, setRelatedMaterials] = useState([]);
  const [progress, setProgress] = useState(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sessionMinutes = useMemo(
    () => Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 60000)),
    [progress?.updatedAt]
  );

  const saveProgress = useCallback(
    async ({ progressPercent, completed = false, silent = false }) => {
      if (!localStorage.getItem("user") || !isLearner) return null;

      try {
        if (!silent) {
          setSavingProgress(true);
        }

        const totalTimeSpentMinutes = Math.max(
          progress?.timeSpentMinutes || 0,
          sessionMinutes,
          completed ? material?.estimatedReadMinutes || 1 : 1
        );

        const response = await fetch(`/api/learning/progress/material/${slug}`, {
          method: 'PUT',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progressPercent,
            completed,
            timeSpentMinutes: totalTimeSpentMinutes,
          }),
        });

        const data = await readApiResponse(response);
        const savedProgress = data.data?.progress || null;
        setProgress(savedProgress);
        return savedProgress;
      } catch (err) {
        if (!silent) {
          setError(err.message || 'Failed to save learning progress.');
        }
        return null;
      } finally {
        if (!silent) {
          setSavingProgress(false);
        }
      }
    },
    [isLearner, material?.estimatedReadMinutes, progress?.timeSpentMinutes, sessionMinutes, slug]
  );

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setLoading(true);
        setError('');
        setProgressLoaded(false);
        sessionStartedAtRef.current = Date.now();

        const optionalAuthHeaders = {};

        const response = await fetch(`/api/learning/materials/${slug}`, {
          cache: 'no-store',
          headers: optionalAuthHeaders,
        });
        const data = await readApiResponse(response);

        const fetchedMaterial = data.data?.material || null;

        if (!response.ok || !fetchedMaterial) {
          setMaterial(null);
          setRelatedMaterials([]);
          setProgress(null);
          setError(
            (typeof data.message === 'string' && data.message.trim()) ||
              'Study material not found or is no longer available.'
          );
          return;
        }

        setMaterial(fetchedMaterial);

        if (fetchedMaterial.category?.slug) {
          const relatedResponse = await fetch(
            `/api/learning/materials?category=${fetchedMaterial.category.slug}`,
            { cache: 'no-store', headers: optionalAuthHeaders }
          );
          const relatedData = await readApiResponse(relatedResponse);
          const nextRelatedMaterials = (relatedData.data?.materials || [])
            .filter((item) => item.slug !== slug)
            .slice(0, 3);
          setRelatedMaterials(nextRelatedMaterials);
        } else {
          setRelatedMaterials([]);
        }

        if (isLearner) {
          const progressResponse = await fetch(`/api/learning/progress/material/${slug}`, {
            cache: 'no-store',
            headers: {},
          });

          if (progressResponse.status === 401) {
            clearAuthSession();
            setProgress(null);
          } else {
            const progressData = await readApiResponse(progressResponse);
            setProgress(progressData.data?.progress || null);
          }
        } else {
          setProgress(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load this material.');
      } finally {
        setProgressLoaded(true);
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [isLearner, slug]);

  useEffect(() => {
    if (!material || !isLearner || !progressLoaded || progress) return;

    saveProgress({
      progressPercent: 10,
      completed: false,
      silent: true,
    });
  }, [isLearner, material, progress, progressLoaded, saveProgress]);

  useEffect(() => {
    if (!material || !isLearner || !progressLoaded) return undefined;

    const intervalId = window.setInterval(() => {
      const nextProgress = Math.min(90, Math.max(progress?.progressPercent || 0, 25));
      saveProgress({
        progressPercent: nextProgress,
        completed: false,
        silent: true,
      });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [isLearner, material, progress?.progressPercent, progressLoaded, saveProgress]);

  const contentParagraphs = useMemo(() => {
    const raw = String(material?.content || '').trim();
    if (!raw) return [];
    let parts = raw
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (parts.length === 1 && /^#{1,6}\s/m.test(parts[0])) {
      const byHeader = parts[0]
        .split(/(?=^#{1,6}\s)/m)
        .map((p) => p.trim())
        .filter(Boolean);
      if (byHeader.length > 1) return byHeader;
    }
    return parts.length ? parts : [raw];
  }, [material?.content]);

  const embedSrc = useMemo(
    () =>
      material?.materialType === 'video' && material?.resourceUrl
        ? youtubeEmbedUrl(material.resourceUrl)
        : null,
    [material?.materialType, material?.resourceUrl]
  );

  const articleSections = useMemo(() => {
    if (!material) return [];

    return [
      {
        id: 'overview',
        label: 'Overview',
        title: 'What You Will Learn',
      },
      {
        id: 'content',
        label: 'Study Content',
        title: 'Tutorial Notes',
      },
      {
        id: 'details',
        label: 'Details',
        title: 'Material Details',
      },
      ...(isLearner
        ? [
            {
              id: 'progress',
              label: 'Progress',
              title: 'Your Progress',
            },
          ]
        : []),
      {
        id: 'related',
        label: 'Related',
        title: 'Next Up',
      },
    ];
  }, [isLearner, material]);

  const nextMaterial = relatedMaterials[0] || null;
  const isDashboardTopicRoute = location.pathname.startsWith('/dashboard/learning/topic/');
  const topicBasePath = isDashboardTopicRoute ? '/dashboard/learning/topic' : '/learning/topic';
  const learningHubPath = isDashboardTopicRoute
    ? '/dashboard/learning#learning-explore-catalog'
    : '/learning#learning-explore-catalog';

  const roleLower = String(parsedUser?.role || '').toLowerCase();
  const useFacultyNav = ['faculty', 'admin', 'college'].includes(roleLower);
  const workspaceLabel =
    roleLower === 'faculty'
      ? 'Faculty Workspace'
      : roleLower === 'college'
        ? 'College Workspace'
        : roleLower === 'admin'
          ? 'Admin Workspace'
          : 'Student Workspace';
  const shellNavItems = useFacultyNav ? facultyNavItems : studentNavItems;

  const handleLogout = useCallback(() => {
    clearAuthSession();
    navigate('/login');
  }, [navigate]);

  const handleNavSection = useCallback(
    (id) => {
      if (useFacultyNav) {
        navigate('/dashboard', { state: { facultySection: id } });
        return;
      }
      if (id === 'learning') {
        navigate('/dashboard/learning#learning-explore-catalog');
        window.requestAnimationFrame(() => {
          document
            .getElementById('learning-explore-catalog')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }
      navigate('/dashboard', { state: { studentSection: id } });
    },
    [useFacultyNav, navigate]
  );

  const shellUser = {
    name: parsedUser?.name || 'Account',
    email: parsedUser?.email || '',
    role: parsedUser?.role || 'student',
  };

  const shellTitle = material?.title || (loading ? 'Loading…' : 'Study material');
  /** Keep top nav compact; full summary stays on the page body. */
  const shellDescription = loading ? 'Fetching this topic from the learning library.' : undefined;

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  const mainClassName = isDashboardTopicRoute
    ? 'w-full pb-8 pt-2 sm:pt-3'
    : 'l2h-container w-full pb-6 pt-24';

  const pageMain = (
    <main className={mainClassName}>
      <Button asChild variant="default" className="mb-6">
        <Link to={learningHubPath}>
          <ArrowLeft className="h-4 w-4" />
          Back to Learning Hub
        </Link>
      </Button>

        {loading ? (
          <div className="flex h-52 items-center justify-center rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading study material...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{error}</p>
            <Button asChild variant="default" className="mt-4">
              <Link to={learningHubPath}>Back to learning hub</Link>
            </Button>
          </div>
        ) : material ? (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-[36px] border border-indigo-200/40 shadow-[0_35px_100px_rgba(49,46,129,0.24)]">
              <img
                src={heroDashboardImg}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#4338ca_0%,#1e1b4b_55%,#020617_100%)] opacity-88" />
              <div className="relative px-6 py-7 text-white sm:px-10 sm:py-8">
              <div className="relative">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 uppercase tracking-wide text-cyan-100">
                  {material.materialType}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 capitalize text-cyan-100">
                  {material.level}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-cyan-100">
                  {material.category?.name || 'General'}
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-bold tracking-tight">{material.title}</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-200">{material.summary}</p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {material.estimatedReadMinutes} min
                </span>
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  By {material.createdBy?.name || 'Learn2Hire'}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                  <p className="text-sm text-cyan-100">Category</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {material.category?.name || 'General'}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                  <p className="text-sm text-cyan-100">Level</p>
                  <p className="mt-3 text-2xl font-semibold capitalize text-white">
                    {material.level}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                  <p className="text-sm text-cyan-100">Focus</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {contentParagraphs.length ? `${contentParagraphs.length} sections` : 'Quick read'}
                  </p>
                </div>
              </div>
              </div>{/* end relative content wrapper */}
              </div>{/* end relative px-6 py-10 */}
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.45fr_0.8fr]">
              <div className="space-y-4">
                <Card
                  id="overview"
                  className="rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                >
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                        <BrainCircuit className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-600">Overview</p>
                        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                          What You Will Learn
                        </h2>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-medium text-slate-500">Best for</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900 capitalize">
                          {material.level} learners
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-medium text-slate-500">Reading time</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                          {material.estimatedReadMinutes} minutes
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
                      <p className="text-sm leading-7 text-slate-600">
                        {material.summary ||
                          'This learning track helps you understand the subject in a simple, practical way.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  id="content"
                  className="rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                >
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <BookText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-600">Tutorial Notes</p>
                        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Study Content</h2>
                      </div>
                    </div>

                    {material.resourceUrl ? (
                      <div className="mt-8 space-y-4">
                        {embedSrc ? (
                          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-sm">
                            <div className="aspect-video w-full">
                              <iframe
                                title="Study video"
                                src={embedSrc}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/80 p-6">
                            <p className="text-sm font-semibold text-indigo-900">
                              {material.materialType === 'pdf'
                                ? 'PDF document'
                                : material.materialType === 'link'
                                  ? 'External link'
                                  : 'Resource'}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-indigo-800/90">
                              Open the resource below to read or watch the full material.
                            </p>
                            <Button asChild className="mt-4">
                              <a href={material.resourceUrl} target="_blank" rel="noreferrer">
                                Open resource
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {contentParagraphs.length ? (
                      <div className="mt-6 space-y-4">
                        {contentParagraphs.map((paragraph, index) => (
                          <div
                            key={`${material._id}-${index}`}
                            className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-6"
                          >
                            <div className="mb-4 flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                                <span className="text-sm font-semibold">{index + 1}</span>
                              </div>
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Section {index + 1}
                              </p>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">
                              {paragraph}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : material.resourceUrl && embedSrc ? (
                      <p className="mt-6 text-sm text-slate-500">
                        Tip: add notes in the editor for a written summary alongside the video.
                      </p>
                    ) : material.resourceUrl ? null : (
                      <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
                        No article content was added for this material yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card
                  id="details"
                  className="rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                >
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                        <Layers3 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-violet-600">Material Details</p>
                        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                          Quick Revision Snapshot
                        </h2>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm text-slate-500">Category</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                          {material.category?.name || 'General'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm text-slate-500">Type</p>
                        <p className="mt-3 text-lg font-semibold uppercase text-slate-900">
                          {material.materialType}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm text-slate-500">Level</p>
                        <p className="mt-3 text-lg font-semibold capitalize text-slate-900">
                          {material.level}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm text-slate-500">Author</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                          {material.createdBy?.name || 'Learn2Hire'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {(material.tags || []).length ? (
                        material.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No tags were added yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <Card className="overflow-hidden rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
                  {getSubjectImage(material.category?.slug) && (
                    <div className="relative h-28 w-full overflow-hidden">
                      <img
                        src={getSubjectImage(material.category?.slug)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/95" />
                      <p className="absolute bottom-2 left-4 text-xs font-semibold text-indigo-700">
                        {material.category?.name || 'Study Material'}
                      </p>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-xl font-semibold text-slate-900">On This Page</h2>
                    </div>

                    <div className="mt-5 space-y-3">
                      {articleSections.map((section) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <span>{section.title}</span>
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      ))}
                    </div>

                    {material.resourceUrl ? (
                      <Button asChild className="mt-6 w-full">
                        <a href={material.resourceUrl} target="_blank" rel="noreferrer">
                          Open Resource
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>

                {isLearner ? (
                  <Card
                    id="progress"
                    className="rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-xl font-semibold text-slate-900">Your Progress</h2>
                      </div>

                      <div className="mt-5 space-y-4 text-sm text-slate-600">
                        <div>
                          <p className="font-medium text-slate-900">Progress</p>
                          <p className="mt-1">{progress?.progressPercent || 0}% saved</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Status</p>
                          <p className="mt-1">
                            {progress?.completed ? 'Completed' : 'Reading in progress'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Time spent</p>
                          <p className="mt-1">{progress?.timeSpentMinutes || 0} minute(s)</p>
                        </div>
                      </div>

                      <div className="mt-5 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,#4f46e5_0%,#22c55e_100%)]"
                          style={{ width: `${progress?.progressPercent || 0}%` }}
                        />
                      </div>

                      <p className="mt-4 text-xs text-slate-500">
                        Progress saves automatically while you read this material.
                      </p>

                      <Button
                        className="mt-6 w-full"
                        onClick={() =>
                          saveProgress({
                            progressPercent: 100,
                            completed: true,
                          })
                        }
                        disabled={savingProgress || progress?.completed}
                      >
                        {progress?.completed
                          ? 'Completed'
                          : savingProgress
                            ? 'Saving...'
                            : 'Mark as Completed'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}

                  <Card
                    id="related"
                    className="rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                  >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-xl font-semibold text-slate-900">
                          {isLearner ? 'Continue With' : 'Related Materials'}
                        </h2>
                    </div>

                    {nextMaterial ? (
                      <Link
                        to={`${topicBasePath}/${nextMaterial.slug}`}
                        className="mt-5 block rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                          {isLearner ? 'Continue next' : 'Related read'}
                        </p>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">
                          {nextMaterial.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {nextMaterial.summary}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
                          Continue reading
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </Link>
                    ) : (
                      <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        More related materials will appear here as the library grows.
                      </div>
                    )}

                    <div className="mt-5 space-y-3">
                      {relatedMaterials.slice(0, 3).map((item) => (
                        <Link
                          key={item._id}
                          to={`${topicBasePath}/${item.slug}`}
                          className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm transition hover:border-indigo-200 hover:bg-indigo-50"
                        >
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.category?.name || 'General'} · {item.estimatedReadMinutes} min
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              We could not load this study material. It may have been removed, or your account may not
              have access (for example, course-only content). Return to the learning hub and pick another
              topic.
            </p>
            <Button asChild className="mt-6">
              <Link to={learningHubPath}>Browse learning materials</Link>
            </Button>
          </div>
        )}
      </main>
  );

  if (isDashboardTopicRoute) {
    return (
      <DarkWorkspaceShell
        title={shellTitle}
        description={shellDescription}
        workspaceLabel={workspaceLabel}
        brandSubtitle={workspaceLabel}
        navItems={shellNavItems}
        activeSection={useFacultyNav ? undefined : 'learning'}
        onNavSectionSelect={handleNavSection}
        user={shellUser}
        onLogout={handleLogout}
        showHistoryBack={false}
      >
        {pageMain}
      </DarkWorkspaceShell>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_18%,#ffffff_38%,#f8fafc_100%)] text-slate-900">
      <SiteHeader />
      {pageMain}
    </div>
  );
}

export default MaterialDetailsPage;
