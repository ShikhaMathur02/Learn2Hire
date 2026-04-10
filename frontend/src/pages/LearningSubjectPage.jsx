import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Filter,
  Layers3,
  LoaderCircle,
  Search,
  Sparkles,
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

function slugEq(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

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

function LatestMaterialRow({ material, topicBasePath }) {
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

function LearningTrackCard({ material, topicBasePath }) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-slate-200/80 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
            {material.materialType}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
            {material.level}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{material.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{material.summary}</p>
        <Button asChild variant="default" className="mt-4">
          <Link to={`${topicBasePath}/${material.slug}`}>
            Open
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LearningSubjectPage({ mode = 'public' }) {
  const { categorySlug: slugParam } = useParams();
  const categorySlug = slugParam ? String(slugParam).trim().toLowerCase() : '';
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  const isAuthenticated = Boolean(token && user);
  const isStudent = isAuthenticated && String(user?.role).toLowerCase() === 'student';
  const isStudentLoggedIn = mode === 'dashboard' && isStudent && isAuthenticated;

  const isDashboardLayout = mode === 'dashboard';
  const hubPath = isDashboardLayout ? '/dashboard/learning' : '/learning';
  const topicBasePath = isDashboardLayout ? '/dashboard/learning/topic' : '/learning/topic';

  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [recommendedMaterials, setRecommendedMaterials] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    materialType: 'all',
    level: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [catRes, matRes] = await Promise.all([
          fetch('/api/learning/subjects', { cache: 'no-store', headers }),
          fetch('/api/learning/materials', { cache: 'no-store', headers }),
        ]);
        const catData = await readApiResponse(catRes);
        const matData = await readApiResponse(matRes);
        if (!catRes.ok) throw new Error(catData.message || 'Failed to load subjects.');
        if (!matRes.ok) throw new Error(matData.message || 'Failed to load materials.');
        setCategories(catData.data?.subjects || []);
        setMaterials(matData.data?.materials || []);

        if (isStudentLoggedIn && token) {
          try {
            const recRes = await fetch('/api/learning/materials/recommended/me', {
              cache: 'no-store',
              headers: { Authorization: `Bearer ${token}` },
            });
            const recData = await readApiResponse(recRes);
            if (recRes.ok) setRecommendedMaterials(recData.data?.materials || []);
          } catch {
            setRecommendedMaterials([]);
          }
        } else {
          setRecommendedMaterials([]);
        }
      } catch (e) {
        setError(e.message || 'Failed to load.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isStudentLoggedIn, token]);

  const selectedCategory = useMemo(
    () => categories.find((c) => slugEq(c.slug, categorySlug)) || null,
    [categories, categorySlug]
  );

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesCat = materialInCategory(m, selectedCategory, categorySlug);
      const matchesType =
        filters.materialType === 'all' ? true : m.materialType === filters.materialType;
      const matchesLevel = filters.level === 'all' ? true : m.level === filters.level;
      const q = filters.search.trim().toLowerCase();
      const matchesSearch = q
        ? [m.title, m.summary, ...(m.tags || [])].join(' ').toLowerCase().includes(q)
        : true;
      return matchesCat && matchesType && matchesLevel && matchesSearch;
    });
  }, [categorySlug, filters, materials, selectedCategory]);

  const { featuredTiles, featuredFromRecommendations } = useMemo(() => {
    const featuredSlice = filteredMaterials.slice(0, 3);
    const recFiltered =
      isStudentLoggedIn && recommendedMaterials.length
        ? recommendedMaterials
            .filter((m) => materialInCategory(m, selectedCategory, categorySlug))
            .slice(0, 3)
        : [];
    if (recFiltered.length > 0) {
      return { featuredTiles: recFiltered, featuredFromRecommendations: true };
    }
    return { featuredTiles: featuredSlice, featuredFromRecommendations: false };
  }, [categorySlug, filteredMaterials, isStudentLoggedIn, recommendedMaterials, selectedCategory]);

  const subjectImg = getSubjectImage(categorySlug);

  if (!categorySlug) {
    return <Navigate to={mode === 'dashboard' ? '/dashboard/learning' : '/learning'} replace />;
  }

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
        <Button asChild variant="default" className="mb-6">
          <Link to={hubPath} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            All subjects
          </Link>
        </Button>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-[32px] border border-white/10 bg-white/5 text-slate-300">
            <div className="flex items-center gap-3">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              Loading subject…
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        ) : !selectedCategory ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">We couldn&apos;t find this subject.</p>
            <Button asChild className="mt-4">
              <Link to={hubPath}>Back to learning hub</Link>
            </Button>
          </div>
        ) : (
          <>
            <section
              className={`relative overflow-hidden rounded-[36px] border px-6 py-10 shadow-[0_35px_100px_rgba(49,46,129,0.2)] sm:px-10 ${
                isDashboardLayout
                  ? 'border-indigo-400/30 bg-indigo-950/40'
                  : 'border-indigo-200/40'
              }`}
            >
              {subjectImg ? (
                <img
                  src={subjectImg}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
              ) : (
                <img
                  src={learningHeroIllustration}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-25"
                />
              )}
              <div
                className={`absolute inset-0 ${
                  isDashboardLayout
                    ? 'bg-[radial-gradient(circle_at_top_left,#1e1b4b_0%,#020617_95%)]'
                    : 'bg-[radial-gradient(circle_at_top_left,#4338ca_0%,#1e1b4b_55%,#020617_100%)]'
                } opacity-90`}
              />
              <div className="relative text-white">
                <p className="text-sm font-medium text-cyan-200">Subject workspace</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{selectedCategory.name}</h1>
                <p className="mt-4 max-w-2xl text-base text-slate-200">
                  {selectedCategory.description ||
                    'All published materials for this subject — search, filter, and open any topic on its own page.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                    <BookOpen className="h-4 w-4" />
                    {filteredMaterials.length} material{filteredMaterials.length === 1 ? '' : 's'} (filtered)
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                    <Layers3 className="h-4 w-4" />
                    Slug: {selectedCategory.slug}
                  </span>
                </div>
              </div>
            </section>

            {featuredTiles.length > 0 ? (
              <section className="mt-7">
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-5 w-5 ${isDashboardLayout ? 'text-indigo-300' : 'text-indigo-600'}`} />
                  <h2
                    className={`text-xl font-bold ${isDashboardLayout ? 'text-white' : 'text-slate-900'}`}
                  >
                    {featuredFromRecommendations ? 'Recommended for you' : 'Featured in this subject'}
                  </h2>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {featuredTiles.map((material) => (
                    <LearningTrackCard key={material._id} material={material} topicBasePath={topicBasePath} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-7">
              <Card
                className={
                  isDashboardLayout
                    ? 'border border-white/10 bg-white/5 shadow-none'
                    : 'border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'
                }
              >
                <CardContent className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                          isDashboardLayout ? 'bg-white/10 text-cyan-300' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        <Filter className="h-5 w-5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${isDashboardLayout ? 'text-indigo-300' : 'text-indigo-600'}`}
                        >
                          Search & filter
                        </p>
                        <h3
                          className={`mt-1 text-xl font-bold ${isDashboardLayout ? 'text-white' : 'text-slate-900'}`}
                        >
                          All materials
                        </h3>
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        isDashboardLayout ? 'bg-white/10 text-indigo-100' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {filteredMaterials.length} result{filteredMaterials.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
                    <label
                      className={`rounded-3xl border px-4 py-3 ${
                        isDashboardLayout
                          ? 'border-white/10 bg-slate-900/50'
                          : 'border-slate-200 bg-slate-50/80'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 ${isDashboardLayout ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        <Search className="h-4 w-4" />
                        <span className="text-sm font-medium">Search</span>
                      </div>
                      <input
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        placeholder="Title, summary, or tag"
                        className={`mt-2 w-full bg-transparent text-sm outline-none ${
                          isDashboardLayout ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
                        }`}
                      />
                    </label>
                    <select
                      value={filters.materialType}
                      onChange={(e) => setFilters((prev) => ({ ...prev, materialType: e.target.value }))}
                      className={`h-[58px] rounded-3xl border px-4 text-sm outline-none ${
                        isDashboardLayout
                          ? 'border-white/10 bg-slate-900/50 text-white'
                          : 'border-slate-200 bg-slate-50/80 text-slate-900'
                      }`}
                    >
                      <option value="all">All types</option>
                      <option value="article">Article</option>
                      <option value="video">Video</option>
                      <option value="pdf">PDF</option>
                      <option value="link">Link</option>
                    </select>
                    <select
                      value={filters.level}
                      onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
                      className={`h-[58px] rounded-3xl border px-4 text-sm outline-none ${
                        isDashboardLayout
                          ? 'border-white/10 bg-slate-900/50 text-white'
                          : 'border-slate-200 bg-slate-50/80 text-slate-900'
                      }`}
                    >
                      <option value="all">All levels</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="mt-6 space-y-3">
              {filteredMaterials.length ? (
                filteredMaterials.map((m) => (
                  <LatestMaterialRow key={m._id} material={m} topicBasePath={topicBasePath} />
                ))
              ) : (
                <div className="overflow-hidden rounded-3xl border border-dashed border-slate-400/30 bg-white/5">
                  <img src={learningEmptyIllustration} alt="" className="h-40 w-full object-cover opacity-50" />
                  <div className={`p-8 text-center text-sm ${isDashboardLayout ? 'text-slate-400' : 'text-slate-500'}`}>
                    No materials match your filters for this subject.
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default LearningSubjectPage;
