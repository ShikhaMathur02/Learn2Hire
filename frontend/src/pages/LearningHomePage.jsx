import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  BookText,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
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

const subjectImageMap = {
  dsa: new URL('../assets/illustrations/subject-dsa.png', import.meta.url).href,
  dbms: new URL('../assets/illustrations/subject-dbms.png', import.meta.url).href,
  os: new URL('../assets/illustrations/subject-os.png', import.meta.url).href,
  cn: new URL('../assets/illustrations/subject-cn.png', import.meta.url).href,
  oop: new URL('../assets/illustrations/subject-oop.png', import.meta.url).href,
  'web-dev': new URL('../assets/illustrations/subject-webdev.png', import.meta.url).href,
  webdev: new URL('../assets/illustrations/subject-webdev.png', import.meta.url).href,
  'ai-ml': new URL('../assets/illustrations/subject-aiml.png', import.meta.url).href,
  aiml: new URL('../assets/illustrations/subject-aiml.png', import.meta.url).href,
  'interview-prep': new URL('../assets/illustrations/subject-interview.png', import.meta.url).href,
  interview: new URL('../assets/illustrations/subject-interview.png', import.meta.url).href,
  aptitude: new URL('../assets/illustrations/subject-aptitude.png', import.meta.url).href,
};

function getSubjectImage(slug) {
  if (!slug) return null;
  const key = String(slug).toLowerCase().replace(/\s+/g, '-');
  return subjectImageMap[key] || null;
}

/** Scroll to Latest Materials (explicit hash only). */
const MATERIALS_SECTION_HASH = '#learning-materials-list';
/** Scroll to Search & Filter + full catalog list for the selected subject. */
const EXPLORE_SECTION_HASH = '#learning-explore-content';

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

function SubjectCard({ category, isActive, to }) {
  const subjectImg = getSubjectImage(category.slug);

  return (
    <Link
      to={to}
      className={`group overflow-hidden rounded-[28px] border transition ${
        isActive
          ? 'border-indigo-200 bg-indigo-50 shadow-[0_18px_50px_rgba(99,102,241,0.18)]'
          : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]'
      }`}
    >
      {subjectImg && (
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={subjectImg}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className={`absolute inset-0 ${isActive ? 'bg-indigo-900/50' : 'bg-slate-900/30 group-hover:bg-indigo-900/30'} transition`} />
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isActive ? 'bg-indigo-500 text-white' : 'bg-white/80 text-slate-700'}`}>
            {isActive ? 'Viewing' : 'Explore'}
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-lg font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-900'}`}>
              {category.name}
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">
              {category.description || 'Explore curated learning content in this subject.'}
            </p>
          </div>
          {!subjectImg && (
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'}`}>
              <Layers3 className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {category.materialCount || 0} materials
          </span>
          <ChevronRight className={`h-4 w-4 transition ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`} />
        </div>
      </div>
    </Link>
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
          button: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
          reason: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        }
      : {
          badge: 'bg-indigo-50 text-indigo-700',
          iconWrap: 'bg-indigo-100 text-indigo-700',
          button: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
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
          <Button asChild variant="outline" className={`rounded-2xl border bg-white ${accents.button}`}>
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

  const selectedCategory = null;

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesCategory = materialInCategory(material, selectedCategory, undefined);
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
  ]);

  useEffect(() => {
    if (loading || error) return;

    const hash = location.hash || '';
    const wantsLatestMaterials =
      hash === MATERIALS_SECTION_HASH || hash === '#learning-materials-list';
    const wantsExplore =
      hash === EXPLORE_SECTION_HASH || hash === '#learning-explore-content';

    if (!wantsLatestMaterials && !wantsExplore) return undefined;

    const targetEl = wantsLatestMaterials ? materialsListRef.current : exploreSectionRef.current;
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

  const featuredMaterials = filteredMaterials.slice(0, 3);
  const latestMaterials = filteredMaterials.slice(0, 6);
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
        className={`mx-auto max-w-7xl px-4 pb-8 ${
          isDashboardLayout ? 'pt-6' : 'pt-24'
        } sm:px-6 lg:px-8`}
      >
        <section className="relative overflow-hidden rounded-[38px] border border-indigo-200/40 bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#312e81_42%,#020617_100%)] px-6 py-8 text-white shadow-[0_35px_100px_rgba(49,46,129,0.28)] sm:px-10 sm:py-10 lg:px-12">
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
                  <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                    <Link to="/dashboard/learning/manage">Manage Materials</Link>
                  </Button>
                ) : isStudentLoggedIn ? (
                  <>
                    <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                      <Link to={`${subjectBasePath}${EXPLORE_SECTION_HASH}`}>Browse all materials</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="!border-white/20 bg-white/5 !text-white hover:bg-white/10 hover:!text-white"
                    >
                      <Link to="/dashboard/learning/progress">My Progress</Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                    <Link to="/signup">Create Account</Link>
                  </Button>
                )}

                {isStudentLoggedIn ? (
                  <Button
                    asChild
                    variant="outline"
                    className="!border-white/20 bg-white/5 !text-white hover:bg-white/10 hover:!text-white"
                  >
                    <Link to="/dashboard">Open Student Dashboard</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className="!border-white/20 bg-white/5 !text-white hover:bg-white/10 hover:!text-white"
                  >
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

                <div className="mt-6 space-y-4">
                  {categories.slice(0, 4).map((category, index) => (
                    <Link
                      key={category._id}
                      to={subjectPagePath(category.slug)}
                      className="block rounded-3xl border border-white/10 bg-white/5 px-4 py-4 transition hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                            {index === 0 ? 'Top Track' : 'Popular'}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-white">{category.name}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">
                            {category.description || 'Explore curated learning content in this subject.'}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                          {category.materialCount || 0}
                        </span>
                      </div>
                    </Link>
                  ))}
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
            title="Subjects to Start With"
            description="Pick a subject like DSA, DBMS, OS, CN, OOP, or Web Development and jump directly into curated learning materials."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <SubjectCard
              category={{
                _id: 'all',
                name: 'All Categories',
                description:
                  'Browse every published subject and all available materials in one place.',
                materialCount: materials.length,
              }}
              isActive
              to={`${subjectBasePath}${EXPLORE_SECTION_HASH}`}
            />
            {categories.map((category) => (
              <SubjectCard
                key={category._id}
                category={category}
                isActive={false}
                to={subjectPagePath(category.slug)}
              />
            ))}
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
                    {filteredMaterials.length} material{filteredMaterials.length === 1 ? '' : 's'}
                  </div>
                }
              />

              <div className="mt-6 space-y-4">
                {latestMaterials.length ? (
                  latestMaterials.map((material) => (
                    <LatestMaterialRow
                      key={material._id}
                      material={material}
                      topicBasePath={topicBasePath}
                    />
                  ))
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
                        filters.level !== 'all') ? (
                        <p>
                          Nothing matches your search or filters for this subject. Clear the search box
                          or set type and level to &quot;All&quot; to see materials.
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
                {(isStudentLoggedIn && recommendedMaterials.length
                  ? recommendedMaterials.slice(0, 3)
                  : featuredMaterials
                ).map((material) => (
                  <LearningTrackCard
                    key={material._id}
                    material={material}
                    topicBasePath={topicBasePath}
                    accent={isStudentLoggedIn ? 'emerald' : 'indigo'}
                    showReason={isStudentLoggedIn}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <section
          ref={exploreSectionRef}
          id="learning-explore-content"
          className="mt-8 scroll-mt-24"
        >
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[34px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6 sm:p-7">
              <SectionHeader
                eyebrow="Search & Filter"
                title="Explore Content"
                description="Use search, level, and type filters to quickly find tutorials, revision notes, and learning tracks."
                action={
                  <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                    {filteredMaterials.length} result{filteredMaterials.length === 1 ? '' : 's'}
                  </div>
                }
              />

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
                <label className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Search className="h-4 w-4" />
                    <span className="text-sm font-medium">Search</span>
                  </div>
                  <input
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, search: event.target.value }))
                    }
                    placeholder="Search by title, summary, or tag"
                    className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>

                <select
                  value={filters.materialType}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, materialType: event.target.value }))
                  }
                  className="h-[58px] rounded-3xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-900 outline-none"
                >
                  <option value="all">All types</option>
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>

                <select
                  value={filters.level}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, level: event.target.value }))
                  }
                  className="h-[58px] rounded-3xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-900 outline-none"
                >
                  <option value="all">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[34px] border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-600">Quick Browse</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">
                    {selectedCategory ? selectedCategory.name : 'Popular Topics'}
                  </h3>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {categories.slice(0, 8).map((category) => (
                  <Link
                    key={category._id}
                    to={subjectPagePath(category.slug)}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <p className="font-semibold text-slate-900">Current Selection</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {selectedCategory?.description ||
                    'Browse all published materials across interview prep, core CS subjects, and modern development tracks.'}
                </p>
              </div>
            </CardContent>
          </Card>
          </div>

          {!loading && !error ? (
            <div className="mt-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-600">Full catalog</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedCategory
                      ? `All materials · ${selectedCategory.name}`
                      : 'All materials · every subject'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Search and filters above apply to this list. Open any row to read the full topic.
                  </p>
                </div>
                <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                  {filteredMaterials.length} shown
                </div>
              </div>
              <div className="space-y-4">
                {filteredMaterials.length ? (
                  filteredMaterials.map((material) => (
                    <LatestMaterialRow
                      key={material._id}
                      material={material}
                      topicBasePath={topicBasePath}
                    />
                  ))
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
                        filters.level !== 'all') ? (
                        <p>
                          Nothing matches your filters. Clear search or set type and level to
                          &quot;All&quot; to see materials.
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
