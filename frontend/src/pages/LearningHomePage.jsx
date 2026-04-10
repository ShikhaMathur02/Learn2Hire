import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  BookText,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Flame,
  GraduationCap,
  Layers3,
  LoaderCircle,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import SiteHeader from '../components/landing/SiteHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { readApiResponse } from '../lib/api';
import learningHeroIllustration from '../assets/illustrations/hero-learning.png';
import learningEmptyIllustration from '../assets/illustrations/empty-state.png';

/** Scroll to Latest Materials (explicit hash only). */
const MATERIALS_SECTION_HASH = '#learning-materials-list';
/**
 * Hash used in links / post-login redirect. Intentionally does not match any DOM `id` so the browser
 * does not auto-scroll; buttons that jump to the catalog use element id `learning-explore-catalog`.
 */
const EXPLORE_SECTION_HASH = '#learning-explore-content';
const EXPLORE_SCROLL_TARGET_ID = 'learning-explore-catalog';

/** Featured count on the learning hub; remaining subjects are reachable via the dropdown. */
const FEATURED_SUBJECTS_COUNT = 4;
/** Latest Materials and Full catalog: this many rows stay visible; the rest sit in a details dropdown. */
const MATERIAL_LIST_VISIBLE_FIRST = 5;
const LEARNING_TRACKS_PREVIEW = 3;

/** Match materials to a subject whether category is populated { slug, _id } or only an id string. */
function materialInCategory(material, selectedCategory, categorySlug) {
  if (!categorySlug) return true;
  const slugNorm = String(categorySlug).trim().toLowerCase();
  const cat = material?.category;

  if (cat && typeof cat === 'object') {
    if (cat.slug != null && String(cat.slug).trim().toLowerCase() === slugNorm) return true;
    const mid = cat._id ?? cat.id;
    if (selectedCategory?._id != null && mid != null) {
      return String(mid) === String(selectedCategory._id);
    }
  }
  if (typeof cat === 'string' && selectedCategory?._id != null) {
    return String(cat) === String(selectedCategory._id);
  }
  return false;
}

function SectionHeader({ eyebrow, title, description, action, tone = 'light' }) {
  const onDark = tone === 'dark';
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p
            className={`text-sm font-semibold ${onDark ? 'text-indigo-300' : 'text-indigo-600'}`}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
            onDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-3 max-w-2xl text-sm leading-6 ${onDark ? 'text-slate-300' : 'text-slate-500'}`}
        >
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function scrollToExploreCatalog() {
  window.requestAnimationFrame(() => {
    document
      .getElementById(EXPLORE_SCROLL_TARGET_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** Native select with visible chevron; optional hint when there are many options. */
function LearningSelect({
  id,
  value,
  onChange,
  dark = false,
  className = '',
  outerClassName = '',
  hint,
  children,
}) {
  const selectCls = [
    'w-full cursor-pointer appearance-none outline-none focus:ring-2',
    dark
      ? 'rounded-2xl border border-white/15 bg-slate-950/50 py-3 pl-4 pr-10 text-sm text-white ring-offset-slate-950 focus:ring-cyan-400/40'
      : 'rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-slate-900 focus:ring-indigo-400/40',
    className,
  ].join(' ');

  return (
    <div className={['w-full', outerClassName].filter(Boolean).join(' ')}>
      <div className="relative">
        <select id={id} value={value} onChange={onChange} className={selectCls}>
          {children}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-90 ${
            dark ? 'text-cyan-200' : 'text-indigo-600'
          }`}
          aria-hidden
        />
      </div>
      {hint ? (
        <p className={`mt-1.5 flex items-start gap-1 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}

function SubjectQuickTile({
  category,
  subjectPagePath,
  setExploreSubjectId,
  isDashboardLayout,
}) {
  const shell = isDashboardLayout
    ? 'border-white/15 bg-white/5 text-white'
    : 'border-slate-200/90 bg-white text-slate-900 shadow-sm';

  return (
    <div
      className={`flex min-h-[140px] flex-col rounded-2xl border p-4 transition hover:-translate-y-0.5 ${shell} ${
        isDashboardLayout ? 'hover:border-cyan-400/35' : 'hover:border-indigo-200'
      }`}
    >
      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{category.name}</p>
      <p className={`mt-1 text-xs ${isDashboardLayout ? 'text-slate-400' : 'text-slate-500'}`}>
        {category.materialCount ?? 0} materials
      </p>
      <div className="mt-auto flex flex-col gap-2 pt-3">
        <Button asChild variant="default" className="h-9 w-full justify-center text-xs">
          <Link to={subjectPagePath(category.slug)}>Open subject</Link>
        </Button>
        <button
          type="button"
          className={`text-center text-xs font-semibold underline decoration-dotted underline-offset-2 transition hover:no-underline ${
            isDashboardLayout ? 'text-cyan-200' : 'text-indigo-600'
          }`}
          onClick={() => {
            setExploreSubjectId(String(category._id));
            scrollToExploreCatalog();
          }}
        >
          Filter catalog
        </button>
      </div>
    </div>
  );
}

function LearningTrackCard({
  material,
  topicBasePath = '/learning/topic',
  accent = 'indigo',
  showReason = false,
}) {
  const accents =
    accent === 'emerald'
      ? {
          badge: 'bg-emerald-50 text-emerald-700',
          iconWrap: 'bg-emerald-100 text-emerald-700',
          reason: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        }
      : {
          badge: 'bg-indigo-50 text-indigo-700',
          iconWrap: 'bg-indigo-100 text-indigo-700',
          reason: 'border-indigo-100 bg-indigo-50 text-indigo-700',
        };

  return (
    <Card className="overflow-hidden rounded-[30px] border-slate-200/80 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accents.badge}`}>
              {material.materialType}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
              {material.level}
            </span>
            {material.audience === 'cohort' ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                Class
              </span>
            ) : null}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accents.iconWrap}`}>
            <BookText className="h-5 w-5" />
          </div>
        </div>

        <h3 className="mt-5 text-xl font-semibold leading-tight text-slate-900">{material.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{material.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {material.category?.name || 'General'}
          </span>
          {(material.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              #{tag}
            </span>
          ))}
        </div>

        {showReason && material.recommendationReason ? (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-xs leading-5 ${accents.reason}`}>
            {material.recommendationReason}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              <span>{material.estimatedReadMinutes} min</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              By {material.createdBy?.name || 'Learn2Hire'}
            </p>
          </div>
          <Button asChild variant="default">
            <Link to={`${topicBasePath}/${material.slug}`}>
              Open
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LatestMaterialRow({ material, topicBasePath = '/learning/topic' }) {
  return (
    <Link
      to={`${topicBasePath}/${material.slug}`}
      className="group flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {material.category?.name || 'General'}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600">
            {material.materialType}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
          {material.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{material.summary}</p>
      </div>

      <div className="flex min-w-[180px] flex-col items-start gap-3 text-sm text-slate-500 md:items-end">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          <span>{material.estimatedReadMinutes} min</span>
        </div>
        <span className="text-xs text-slate-400">By {material.createdBy?.name || 'Learn2Hire'}</span>
        <span className="inline-flex items-center gap-2 font-medium text-indigo-600">
          Read now
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function LearningHomePage({ mode = 'auto' }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    user = null;
  }

  const isAuthenticated = Boolean(token && user);
  const isStudent =
    isAuthenticated && user?.role && String(user.role).toLowerCase() === 'student';

  const isStudentLoggedIn =
    mode === 'public' ? false : Boolean(isAuthenticated && isStudent);

  const canManageLearning =
    mode === 'public'
      ? false
      : Boolean(
          isAuthenticated &&
            ['faculty', 'admin', 'college'].includes(String(user?.role).toLowerCase())
        );

  const isPublicVisitor = mode === 'public' ? true : !isAuthenticated;

  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [recommendedMaterials, setRecommendedMaterials] = useState([]);
  const [studentProgressSummary, setStudentProgressSummary] = useState({
    totalStarted: 0,
    totalCompleted: 0,
    inProgressCount: 0,
    totalTimeSpentMinutes: 0,
    averageProgress: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    materialType: 'all',
    level: 'all',
  });
  /** Empty string = all subjects; otherwise category `_id`. */
  const [exploreSubjectId, setExploreSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const materialsListRef = useRef(null);
  const exploreSectionRef = useRef(null);

  const isDashboardLayout = mode === 'dashboard';
  const subjectBasePath = isDashboardLayout ? '/dashboard/learning' : '/learning';
  const topicBasePath = isDashboardLayout ? '/dashboard/learning/topic' : '/learning/topic';
  const subjectPagePath = (slug) => `${subjectBasePath}/subject/${slug}`;

  useEffect(() => {
    const fetchLearningData = async () => {
      try {
        setLoading(true);
        setError('');

        const optionalAuthHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [categoriesResponse, materialsResponse] = await Promise.all([
          fetch('/api/learning/subjects', {
            cache: 'no-store',
            headers: optionalAuthHeaders,
          }),
          fetch('/api/learning/materials', {
            cache: 'no-store',
            headers: optionalAuthHeaders,
          }),
        ]);

        const categoriesData = await readApiResponse(categoriesResponse);
        const materialsData = await readApiResponse(materialsResponse);

        if (!categoriesResponse.ok) {
          throw new Error(categoriesData.message || 'Failed to load subjects.');
        }
        if (!materialsResponse.ok) {
          throw new Error(materialsData.message || 'Failed to load materials.');
        }

        setCategories(categoriesData.data?.subjects || []);
        setMaterials(materialsData.data?.materials || []);

        if (isStudentLoggedIn && token) {
          const auth = { Authorization: `Bearer ${token}` };
          try {
            const [recommendedResponse, progressResponse] = await Promise.all([
              fetch('/api/learning/materials/recommended/me', {
                cache: 'no-store',
                headers: auth,
              }),
              fetch('/api/learning/progress/me', {
                cache: 'no-store',
                headers: auth,
              }),
            ]);
            const recommendedData = await readApiResponse(recommendedResponse);
            const progressData = await readApiResponse(progressResponse);
            if (recommendedResponse.ok) {
              setRecommendedMaterials(recommendedData.data?.materials || []);
            }
            if (progressResponse.ok) {
              setStudentProgressSummary(
                progressData.data?.summary || {
                  totalStarted: 0,
                  totalCompleted: 0,
                  inProgressCount: 0,
                  totalTimeSpentMinutes: 0,
                  averageProgress: 0,
                }
              );
            }
          } catch {
            /* catalog already loaded; progress/recommendations are optional */
          }
        } else {
          setRecommendedMaterials([]);
          setStudentProgressSummary({
            totalStarted: 0,
            totalCompleted: 0,
            inProgressCount: 0,
            totalTimeSpentMinutes: 0,
            averageProgress: 0,
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load learning materials.');
      } finally {
        setLoading(false);
      }
    };

    fetchLearningData();
  }, [isStudentLoggedIn, token]);

  const selectedCategory = useMemo(() => {
    if (!exploreSubjectId) return null;
    return categories.find((c) => String(c._id) === String(exploreSubjectId)) || null;
  }, [categories, exploreSubjectId]);

  const categorySlugForFilter = selectedCategory?.slug;

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesCategory = materialInCategory(
        material,
        selectedCategory,
        categorySlugForFilter || undefined
      );
      const matchesType =
        filters.materialType === 'all' ? true : material.materialType === filters.materialType;
      const matchesLevel = filters.level === 'all' ? true : material.level === filters.level;
      const searchText = filters.search.trim().toLowerCase();
      const matchesSearch = searchText
        ? [material.title, material.summary, ...(material.tags || [])]
            .join(' ')
            .toLowerCase()
            .includes(searchText)
        : true;

      return matchesCategory && matchesType && matchesLevel && matchesSearch;
    });
  }, [
    filters.level,
    filters.materialType,
    filters.search,
    materials,
    selectedCategory,
    categorySlugForFilter,
  ]);

  const featuredSubjects = useMemo(() => {
    if (!categories.length) return [];
    return [...categories]
      .sort((a, b) => (b.materialCount || 0) - (a.materialCount || 0))
      .slice(0, FEATURED_SUBJECTS_COUNT);
  }, [categories]);

  const subjectDropdownHint = useMemo(() => {
    if (categories.length <= 1) return null;
    if (categories.length > FEATURED_SUBJECTS_COUNT) {
      return `All ${categories.length} subjects are in this menu (${categories.length - FEATURED_SUBJECTS_COUNT} more than the featured tiles). Use the arrow to expand.`;
    }
    return 'Use the arrow to open the full subject list.';
  }, [categories.length]);

  useEffect(() => {
    if (loading || error) return;

    const hash = location.hash || '';
    const wantsLatestMaterials =
      hash === MATERIALS_SECTION_HASH || hash === '#learning-materials-list';

    if (!wantsLatestMaterials) return undefined;

    const targetEl = materialsListRef.current;
    const run = () => {
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const t1 = window.setTimeout(run, 120);
    const t2 = window.setTimeout(run, 450);
    const t3 = window.setTimeout(run, 800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [
    loading,
    error,
    location.hash,
    location.pathname,
    filteredMaterials.length,
    materials.length,
  ]);

  const latestMaterials = filteredMaterials.slice(0, MATERIAL_LIST_VISIBLE_FIRST);
  const tracksSourceList =
    isStudentLoggedIn && recommendedMaterials.length
      ? recommendedMaterials
      : filteredMaterials;
  const learningTracksPreview = tracksSourceList.slice(0, LEARNING_TRACKS_PREVIEW);
  const hasMoreLearningTracks = tracksSourceList.length > LEARNING_TRACKS_PREVIEW;
  const totalMinutes = filteredMaterials.reduce(
    (sum, material) => sum + (material.estimatedReadMinutes || 0),
    0
  );
  const quickStats = [
    {
      label: 'Subjects',
      value: categories.length,
      icon: Layers3,
    },
    {
      label: 'Study Materials',
      value: materials.length,
      icon: BookOpen,
    },
    {
      label: 'Learning Paths',
      value: isStudentLoggedIn ? recommendedMaterials.length || filteredMaterials.length : filteredMaterials.length,
      icon: Target,
    },
    {
      label: 'Reading Minutes',
      value: totalMinutes,
      icon: GraduationCap,
    },
  ];

  return (
    <div
      className={
        isDashboardLayout
          ? 'min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)]'
          : 'min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_18%,#ffffff_38%,#f8fafc_100%)] text-slate-900'
      }
    >
      {!isDashboardLayout && <SiteHeader />}

      <main
        className={`w-full px-3 pb-8 sm:px-4 ${isDashboardLayout ? 'pt-6' : 'pt-24'}`}
      >
        <section className="relative overflow-hidden rounded-[38px] border border-indigo-200/40 bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#312e81_42%,#020617_100%)] px-4 py-8 text-white shadow-[0_35px_100px_rgba(49,46,129,0.28)] sm:px-6 sm:py-9 lg:px-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <img
            src={learningHeroIllustration}
            alt=""
            className="pointer-events-none absolute -right-8 bottom-0 hidden h-full w-[480px] rounded-r-[38px] object-cover opacity-20 lg:block"
          />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {isStudentLoggedIn
                  ? 'Student learning workspace with saved progress'
                  : 'Free learning hub for public visitors and learners'}
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                {isStudentLoggedIn
                  ? 'Continue your learning journey with saved student progress.'
                  : 'Hello, what do you want to learn today?'}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
                {isStudentLoggedIn
                  ? 'Pick up where you left off, follow recommended materials, and track your study momentum inside Learn2Hire.'
                  : 'Explore a GeeksforGeeks-inspired learning experience with clear subjects, latest reading tracks, and professional study resources for placements.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {canManageLearning ? (
                  <Button asChild variant="default">
                    <Link to="/dashboard/learning/manage">Manage Materials</Link>
                  </Button>
                ) : isStudentLoggedIn ? (
                  <>
                    <Button asChild variant="default">
                      <Link to={`${subjectBasePath}${EXPLORE_SECTION_HASH}`}>Browse all materials</Link>
                    </Button>
                    <Button asChild variant="default">
                      <Link to="/dashboard/learning/progress">My Progress</Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="default">
                    <Link to="/signup">Create Account</Link>
                  </Button>
                )}

                {isStudentLoggedIn ? (
                  <Button asChild variant="default">
                    <Link to="/dashboard">Open Student Dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild variant="default">
                    <Link to="/login">Login</Link>
                  </Button>
                )}
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {quickStats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-cyan-100">{item.label}</p>
                          <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isStudentLoggedIn ? (
              <div className="rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-100">Learning Overview</p>
                      <h2 className="mt-1 text-2xl font-semibold text-white">
                        Track your study progress
                      </h2>
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    Progress sync active
                  </div>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200">
                  Your student account saves reading progress, completion status, and learning
                  activity so you can continue studying without losing momentum.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-cyan-100">Started Materials</p>
                      <BookOpen className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {studentProgressSummary.totalStarted}
                    </p>
                    <p className="mt-2 text-xs text-slate-300">Materials opened from your account</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-cyan-100">Completed Materials</p>
                      <CheckCircle2 className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {studentProgressSummary.totalCompleted}
                    </p>
                    <p className="mt-2 text-xs text-slate-300">Finished and marked complete</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-cyan-100">Active Materials</p>
                      <Target className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {studentProgressSummary.inProgressCount}
                    </p>
                    <p className="mt-2 text-xs text-slate-300">Currently being studied</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-cyan-100">Average Completion</p>
                      <TrendingUp className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {studentProgressSummary.averageProgress}%
                    </p>
                    <p className="mt-2 text-xs text-slate-300">Overall progress across saved materials</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                    <p className="text-sm font-medium text-emerald-100">Student progress is enabled</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Continue any saved material at any time. Your study record is maintained in
                    your learning progress and reflected in your student skill profile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cyan-100">Must Explore</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">
                      {selectedCategory ? selectedCategory.name : 'Trending Subject Picks'}
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Popular tracks
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {featuredSubjects.map((category) => (
                      <SubjectQuickTile
                        key={category._id}
                        category={category}
                        subjectPagePath={subjectPagePath}
                        setExploreSubjectId={setExploreSubjectId}
                        isDashboardLayout
                      />
                    ))}
                  </div>
                  <div>
                    <label htmlFor="hero-subject-jump" className="text-xs font-semibold text-cyan-100/90">
                      All subjects
                    </label>
                    <LearningSelect
                      id="hero-subject-jump"
                      dark
                      outerClassName="mt-2"
                      value={exploreSubjectId}
                      hint={subjectDropdownHint}
                      onChange={(e) => {
                        setExploreSubjectId(e.target.value);
                        if (e.target.value) scrollToExploreCatalog();
                      }}
                    >
                      <option value="">All subjects — full catalog</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name} ({category.materialCount ?? 0})
                        </option>
                      ))}
                    </LearningSelect>
                  </div>
                  <p className="text-sm leading-6 text-slate-200">
                    {selectedCategory
                      ? selectedCategory.description || 'Filters below apply to this subject.'
                      : 'Start from a popular track or choose any subject from the menu.'}
                  </p>
                  {selectedCategory ? (
                    <Button asChild variant="default" className="mt-1">
                      <Link to={subjectPagePath(selectedCategory.slug)}>Subject overview</Link>
                    </Button>
                  ) : null}
                </div>

                {isPublicVisitor ? (
                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-medium text-white">Student-only saved progress</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      Visitors can explore freely. Log in as a student to unlock saved progress,
                      personalized recommendations, and your own study workspace.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-medium text-white">Browsing Mode</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      This account can explore materials, but progress tracking is reserved for
                      student accounts only.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader
            tone={isDashboardLayout ? 'dark' : 'light'}
            eyebrow="Explore"
            title="Subjects to start with"
            description="We highlight a few popular tracks. Every other subject is in the menu — pick one to filter the catalog below."
          />

          <div
            className={`mt-6 flex flex-col gap-6 rounded-[28px] border p-6 sm:p-7 lg:flex-row lg:items-stretch ${
              isDashboardLayout
                ? 'border-white/10 bg-white/5 backdrop-blur-xl'
                : 'border-slate-200/80 bg-white/90 shadow-[0_25px_70px_rgba(15,23,42,0.06)]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isDashboardLayout ? 'text-cyan-100/90' : 'text-indigo-600'
                }`}
              >
                Featured ({FEATURED_SUBJECTS_COUNT})
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {featuredSubjects.map((category) => (
                  <SubjectQuickTile
                    key={category._id}
                    category={category}
                    subjectPagePath={subjectPagePath}
                    setExploreSubjectId={setExploreSubjectId}
                    isDashboardLayout={isDashboardLayout}
                  />
                ))}
              </div>
            </div>

            <div
              className={`flex w-full shrink-0 flex-col justify-between rounded-2xl border p-4 lg:w-72 ${
                isDashboardLayout
                  ? 'border-white/10 bg-slate-950/40'
                  : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <div>
                <label
                  htmlFor="learning-subject-picker"
                  className={`text-sm font-semibold ${isDashboardLayout ? 'text-cyan-100' : 'text-indigo-600'}`}
                >
                  All subjects
                </label>
                <p
                  className={`mt-1 text-xs ${isDashboardLayout ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  Menu lists every subject (including the featured tiles).
                </p>
                <LearningSelect
                  id="learning-subject-picker"
                  dark={isDashboardLayout}
                  outerClassName="mt-3"
                  value={exploreSubjectId}
                  hint={subjectDropdownHint}
                  onChange={(e) => setExploreSubjectId(e.target.value)}
                >
                  <option value="">All subjects ({materials.length})</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name} · {category.materialCount ?? 0}
                    </option>
                  ))}
                </LearningSelect>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild variant="default" className="w-full justify-center">
                  <Link to={`${subjectBasePath}${EXPLORE_SECTION_HASH}`}>Jump to catalog</Link>
                </Button>
                {selectedCategory ? (
                  <Button asChild variant="soft" className="w-full justify-center">
                    <Link to={subjectPagePath(selectedCategory.slug)}>Open subject page</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-7 flex h-40 items-center justify-center rounded-[32px] border border-slate-200/80 bg-white/90 text-slate-500 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading learning content...
            </div>
          </div>
        ) : error ? (
          <div className="mt-7 rounded-[32px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <>
            <section
              ref={materialsListRef}
              id="learning-materials-list"
              className="mt-8 scroll-mt-24"
            >
              <SectionHeader
                tone={isDashboardLayout ? 'dark' : 'light'}
                eyebrow="Latest Articles"
                title="Latest Materials"
                description={
                  selectedCategory
                    ? `Fresh content and reading tracks for ${selectedCategory.name}.`
                    : 'Browse the latest published study materials across all subjects. Login as a student to enable saved progress and recommendations.'
                }
                action={
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                      isDashboardLayout
                        ? 'bg-white/10 text-indigo-100 ring-1 ring-white/15'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    {filteredMaterials.length > MATERIAL_LIST_VISIBLE_FIRST
                      ? `Showing ${MATERIAL_LIST_VISIBLE_FIRST} of ${filteredMaterials.length}`
                      : `${filteredMaterials.length} material${filteredMaterials.length === 1 ? '' : 's'}`}
                  </div>
                }
              />

              <div className="mt-6 space-y-4">
                {latestMaterials.length ? (
                  <>
                    {latestMaterials.map((material) => (
                      <LatestMaterialRow
                        key={material._id}
                        material={material}
                        topicBasePath={topicBasePath}
                      />
                    ))}
                    {filteredMaterials.length > MATERIAL_LIST_VISIBLE_FIRST ? (
                      <details
                        className={`group rounded-[28px] border shadow-sm ${
                          isDashboardLayout
                            ? 'border-white/15 bg-white/5'
                            : 'border-indigo-200/60 bg-indigo-50/30'
                        }`}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition group-open:rotate-180 ${
                              isDashboardLayout ? 'text-cyan-200' : 'text-indigo-700'
                            }`}
                            aria-hidden
                          />
                          <span className={isDashboardLayout ? 'text-cyan-100' : 'text-indigo-900'}>
                            View {filteredMaterials.length - MATERIAL_LIST_VISIBLE_FIRST} more
                            material
                            {filteredMaterials.length - MATERIAL_LIST_VISIBLE_FIRST === 1 ? '' : 's'}
                          </span>
                        </summary>
                        <div className="space-y-4 border-t border-slate-200/20 px-1 pb-4 pt-4 sm:px-2">
                          {filteredMaterials.slice(MATERIAL_LIST_VISIBLE_FIRST).map((material) => (
                            <LatestMaterialRow
                              key={material._id}
                              material={material}
                              topicBasePath={topicBasePath}
                            />
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
                    <img
                      src={learningEmptyIllustration}
                      alt=""
                      className="mx-auto h-48 w-full object-cover opacity-60"
                    />
                    <div className="p-8">
                      {materials.length > 0 &&
                      filteredMaterials.length === 0 &&
                      (filters.search.trim() ||
                        filters.materialType !== 'all' ||
                        filters.level !== 'all' ||
                        exploreSubjectId) ? (
                        <p>
                          Nothing matches your current subject, search, or filters. Try &quot;All
                          subjects&quot;, clear the search box, or set type and level to &quot;All&quot;.
                        </p>
                      ) : (
                        <p>No learning materials match the current filters yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-8">
              <SectionHeader
                tone={isDashboardLayout ? 'dark' : 'light'}
                eyebrow={isStudentLoggedIn ? 'For You' : 'Featured'}
                title={isStudentLoggedIn ? 'Recommended Learning Tracks' : 'Popular Learning Tracks'}
                description={
                  isStudentLoggedIn
                    ? 'These picks are tailored from your student activity and saved learning progress.'
                    : 'Start with these popular materials chosen from the current public learning library. Login as a student if you also want your progress tracked.'
                }
              />

              <div className="mt-6 grid gap-5 xl:grid-cols-3">
                {learningTracksPreview.map((material) => (
                  <LearningTrackCard
                    key={material._id}
                    material={material}
                    topicBasePath={topicBasePath}
                    accent={isStudentLoggedIn ? 'emerald' : 'indigo'}
                    showReason={isStudentLoggedIn}
                  />
                ))}
              </div>
              {hasMoreLearningTracks ? (
                <details
                  className={`group mt-6 rounded-[28px] border shadow-sm ${
                    isDashboardLayout
                      ? 'border-white/15 bg-white/5'
                      : 'border-indigo-200/60 bg-indigo-50/30'
                  }`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition group-open:rotate-180 ${
                        isDashboardLayout ? 'text-cyan-200' : 'text-indigo-700'
                      }`}
                      aria-hidden
                    />
                    <span className={isDashboardLayout ? 'text-cyan-100' : 'text-indigo-900'}>
                      View all {tracksSourceList.length} learning tracks (
                      {tracksSourceList.length - LEARNING_TRACKS_PREVIEW} more)
                    </span>
                  </summary>
                  <div className="grid gap-5 border-t border-slate-200/20 px-2 pb-4 pt-6 xl:grid-cols-3">
                    {tracksSourceList.slice(LEARNING_TRACKS_PREVIEW).map((material) => (
                      <LearningTrackCard
                        key={material._id}
                        material={material}
                        topicBasePath={topicBasePath}
                        accent={isStudentLoggedIn ? 'emerald' : 'indigo'}
                        showReason={isStudentLoggedIn}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          </>
        )}

        <section
          ref={exploreSectionRef}
          id={EXPLORE_SCROLL_TARGET_ID}
          className="mt-8 scroll-mt-24"
        >
          <Card className="rounded-[34px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6 sm:p-8">
              <SectionHeader
                eyebrow="Catalog"
                title="Explore materials"
                description="Refine the list with subject (same as above), type, level, and search."
                action={
                  <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                    {filteredMaterials.length} result{filteredMaterials.length === 1 ? '' : 's'}
                  </div>
                }
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 lg:col-span-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Layers3 className="h-4 w-4 text-indigo-600" />
                    Subject
                  </span>
                  <LearningSelect
                    outerClassName="mt-2"
                    value={exploreSubjectId}
                    hint={subjectDropdownHint}
                    onChange={(e) => setExploreSubjectId(e.target.value)}
                  >
                    <option value="">All subjects</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name} ({category.materialCount ?? 0})
                      </option>
                    ))}
                  </LearningSelect>
                </label>

                <label className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Filter className="h-4 w-4 text-indigo-600" />
                    Type
                  </span>
                  <LearningSelect
                    outerClassName="mt-2"
                    value={filters.materialType}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, materialType: event.target.value }))
                    }
                  >
                    <option value="all">All types</option>
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                    <option value="link">Link</option>
                  </LearningSelect>
                </label>

                <label className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    Level
                  </span>
                  <LearningSelect
                    outerClassName="mt-2"
                    value={filters.level}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, level: event.target.value }))
                    }
                  >
                    <option value="all">All levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </LearningSelect>
                </label>
              </div>

              <label className="mt-4 block rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Search className="h-4 w-4 text-indigo-600" />
                  Search
                </div>
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Title, summary, or tag"
                  className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>

              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Current focus</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedCategory
                        ? selectedCategory.description ||
                          `Showing materials tagged under ${selectedCategory.name}.`
                        : 'All published subjects are included. Choose a subject above to focus the list.'}
                    </p>
                  </div>
                </div>
                {selectedCategory ? (
                  <Button asChild variant="default" className="shrink-0 self-start sm:self-center">
                    <Link to={subjectPagePath(selectedCategory.slug)}>Subject overview</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {!loading && !error ? (
            <div className="mt-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isDashboardLayout ? 'text-cyan-200' : 'text-indigo-600'}`}>
                    Full catalog
                  </p>
                  <h3
                    className={`mt-1 text-xl font-bold ${isDashboardLayout ? 'text-white' : 'text-slate-900'}`}
                  >
                    {selectedCategory
                      ? `Materials · ${selectedCategory.name}`
                      : 'Materials · all subjects'}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${isDashboardLayout ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    Only the first {MATERIAL_LIST_VISIBLE_FIRST} rows stay open; expand the list below for
                    the rest, or narrow by subject and filters.
                  </p>
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    isDashboardLayout
                      ? 'bg-white/10 text-cyan-100 ring-1 ring-white/15'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {filteredMaterials.length > MATERIAL_LIST_VISIBLE_FIRST
                    ? `Showing ${MATERIAL_LIST_VISIBLE_FIRST} of ${filteredMaterials.length}`
                    : `${filteredMaterials.length} material${filteredMaterials.length === 1 ? '' : 's'}`}
                </div>
              </div>
              <div className="space-y-4">
                {filteredMaterials.length ? (
                  <>
                    {filteredMaterials.slice(0, MATERIAL_LIST_VISIBLE_FIRST).map((material) => (
                      <LatestMaterialRow
                        key={material._id}
                        material={material}
                        topicBasePath={topicBasePath}
                      />
                    ))}
                    {filteredMaterials.length > MATERIAL_LIST_VISIBLE_FIRST ? (
                      <details
                        className={`group rounded-[28px] border shadow-sm ${
                          isDashboardLayout
                            ? 'border-white/15 bg-white/5'
                            : 'border-indigo-200/60 bg-indigo-50/30'
                        }`}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition group-open:rotate-180 ${
                              isDashboardLayout ? 'text-cyan-200' : 'text-indigo-700'
                            }`}
                            aria-hidden
                          />
                          <span className={isDashboardLayout ? 'text-cyan-100' : 'text-indigo-900'}>
                            View {filteredMaterials.length - MATERIAL_LIST_VISIBLE_FIRST} more
                            material
                            {filteredMaterials.length - MATERIAL_LIST_VISIBLE_FIRST === 1 ? '' : 's'}
                          </span>
                        </summary>
                        <div className="space-y-4 border-t border-slate-200/20 px-1 pb-4 pt-4 sm:px-2">
                          {filteredMaterials.slice(MATERIAL_LIST_VISIBLE_FIRST).map((material) => (
                            <LatestMaterialRow
                              key={`catalog-${material._id}`}
                              material={material}
                              topicBasePath={topicBasePath}
                            />
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
                    <img
                      src={learningEmptyIllustration}
                      alt=""
                      className="mx-auto h-40 w-full object-cover opacity-60"
                    />
                    <div className="p-6">
                      {materials.length > 0 &&
                      filteredMaterials.length === 0 &&
                      (filters.search.trim() ||
                        filters.materialType !== 'all' ||
                        filters.level !== 'all' ||
                        exploreSubjectId) ? (
                        <p>
                          Nothing matches your filters or subject. Reset to all subjects or loosen type,
                          level, and search.
                        </p>
                      ) : (
                        <p>No materials in this view yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default LearningHomePage;
