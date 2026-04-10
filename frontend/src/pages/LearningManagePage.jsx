import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BookOpenCheck, ExternalLink, Home, LayoutDashboard, LoaderCircle } from "lucide-react";

import { Button } from "../components/ui/button";
import { NavDropdown } from "../components/ui/nav-dropdown";
import { Card, CardContent } from "../components/ui/card";
import { readApiResponse } from "../lib/api";

const EDITOR_ROLES = new Set(["faculty", "admin", "college"]);

function LearningManagePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [editorUser, setEditorUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [categories, setCategories] = useState([]);
  const [manageMaterials, setManageMaterials] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("beginner");
  const [materialType, setMaterialType] = useState("article");
  const [tags, setTags] = useState("");
  const [estimatedReadMinutes, setEstimatedReadMinutes] = useState(10);
  const [isPublished, setIsPublished] = useState(true);
  const [audience, setAudience] = useState("global");
  const [targetCourse, setTargetCourse] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [targetYear, setTargetYear] = useState("");

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);

  const loadEditorCatalog = useCallback(async () => {
    const [catRes, matRes] = await Promise.all([
      fetch("/api/learning/manage/categories", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/learning/manage/materials", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    const catData = await readApiResponse(catRes);
    const matData = await readApiResponse(matRes);
    if (catRes.status === 401 || matRes.status === 401) {
      navigate("/login");
      return;
    }
    if (!catRes.ok) {
      throw new Error(catData.message || "Failed to load categories.");
    }
    if (!matRes.ok) {
      throw new Error(matData.message || "Failed to load published materials.");
    }
    const list = catData.data?.categories || [];
    setCategories(list);
    setCategoryId((prev) => {
      if (prev && list.some((c) => c._id === prev)) return prev;
      return list[0]?._id ?? "";
    });
    setManageMaterials(matData.data?.materials || []);
  }, [navigate, token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await readApiResponse(meRes);
        if (cancelled) return;
        if (meRes.status === 401) {
          navigate("/login");
          return;
        }
        if (meRes.ok && meData.data?.user) {
          const u = meData.data.user;
          const next = {
            id: u.id,
            _id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          };
          localStorage.setItem("user", JSON.stringify(next));
          setEditorUser(next);
        } else {
          const raw = localStorage.getItem("user");
          try {
            setEditorUser(raw ? JSON.parse(raw) : null);
          } catch {
            setEditorUser(null);
          }
        }
      } catch {
        const raw = localStorage.getItem("user");
        try {
          setEditorUser(raw ? JSON.parse(raw) : null);
        } catch {
          setEditorUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  const role = editorUser?.role ? String(editorUser.role).toLowerCase() : "";
  const canEdit = Boolean(editorUser && EDITOR_ROLES.has(role));

  useEffect(() => {
    if (!bootstrapped || !token) return;
    if (!canEdit) {
      setLoadingMeta(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      setError("");
      try {
        await loadEditorCatalog();
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load learning data.");
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, canEdit, loadEditorCatalog, navigate, token]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <LoaderCircle className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!editorUser) {
    return <Navigate to="/login" replace />;
  }

  if (!canEdit) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreateSubject = async (event) => {
    event.preventDefault();
    const name = newSubjectName.trim();
    if (!name) {
      setError("Enter a subject name.");
      return;
    }
    setCreatingSubject(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/learning/manage/categories", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: newSubjectDescription.trim(),
          icon: newSubjectIcon.trim(),
          isPublished: true,
        }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Could not create subject.");
      }
      setNewSubjectName("");
      setNewSubjectDescription("");
      setNewSubjectIcon("");
      setSuccess(
        "Subject created. It appears in “Subjects to Start With” on the learning hub once you add at least one published material."
      );
      await loadEditorCatalog();
      const created = data.data?.category;
      if (created?._id) {
        setCategoryId(created._id);
      }
    } catch (err) {
      setError(err.message || "Could not create subject.");
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const tagList = tags
        .split(/[,]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const body = {
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        categoryId,
        level,
        materialType,
        tags: tagList,
        estimatedReadMinutes: Number(estimatedReadMinutes) || 5,
        isPublished,
        audience,
        targetCourse: audience === "cohort" ? targetCourse.trim() : "",
        targetBranch: audience === "cohort" ? targetBranch.trim() : "",
        targetYear: audience === "cohort" ? targetYear.trim() : "",
      };

      if (!body.title || !body.categoryId) {
        throw new Error("Title and subject category are required.");
      }

      const needsResource = ["pdf", "video", "link"].includes(materialType);
      const urlTrim = resourceUrl.trim();
      if (needsResource && !urlTrim) {
        throw new Error("Add a resource URL for PDF, video, or link materials.");
      }

      const res = await fetch("/api/learning/manage/materials", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...body,
          resourceUrl: urlTrim,
        }),
      });

      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Failed to create material.");
      }

      const slug = data.data?.material?.slug;
      setSuccess(
        slug
          ? `Material published. Students can open it from the learning hub (topic: ${slug}).`
          : "Material created successfully."
      );
      setTitle("");
      setSummary("");
      setContent("");
      setResourceUrl("");
      setTags("");

      try {
        const listRes = await fetch("/api/learning/manage/materials", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const listData = await readApiResponse(listRes);
        if (listRes.ok) {
          setManageMaterials(listData.data?.materials || []);
        }
      } catch {
        /* list refresh is optional */
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-0 z-40 -mx-4 mb-8 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl sm:-mx-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-cyan-300">Faculty · Learning</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Add study material
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Publish to the whole catalog, or restrict to a cohort by matching each student&apos;s course,
                branch, and year on their profile.
              </p>
            </div>
            <NavDropdown
              theme="dark"
              align="right"
              icon={BookOpenCheck}
              label="Navigate"
              items={[
                { label: "Dashboard home", to: "/dashboard", icon: LayoutDashboard },
                {
                  label: "Student learning hub",
                  to: "/dashboard/learning#learning-explore-content",
                  icon: BookOpenCheck,
                },
                { separator: true },
                {
                  label: "Public learning (home)",
                  to: "/learning",
                  icon: Home,
                },
              ]}
            />
          </div>
        </div>

        <Card className="mb-8 border border-emerald-500/20 bg-emerald-500/5 shadow-none">
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Create a new subject</h2>
            <p className="mt-1 text-sm text-slate-400">
              Adds a card under <span className="text-slate-200">Subjects to Start With</span> on{" "}
              <Link to="/dashboard/learning#learning-explore-content" className="text-cyan-400 underline">
                /dashboard/learning
              </Link>
              . Publish at least one material in this subject so it shows for students (unpublished-only
              categories still appear once they have content).
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleCreateSubject}>
              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="ns-name">
                  Subject name
                </label>
                <input
                  id="ns-name"
                  className={inputClass}
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Cloud Computing"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="ns-desc">
                  Short description
                </label>
                <input
                  id="ns-desc"
                  className={inputClass}
                  value={newSubjectDescription}
                  onChange={(e) => setNewSubjectDescription(e.target.value)}
                  placeholder="One line for the subject card"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="ns-icon">
                  Cover image URL (optional)
                </label>
                <input
                  id="ns-icon"
                  type="url"
                  className={inputClass}
                  value={newSubjectIcon}
                  onChange={(e) => setNewSubjectIcon(e.target.value)}
                  placeholder="https://… (shown on the subject card)"
                />
              </div>
              <Button type="submit" variant="success" disabled={creatingSubject}>
                {creatingSubject ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Add subject to catalog"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loadingMeta ? null : manageMaterials.length > 0 ? (
          <Card className="mb-8 border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-white">Your study materials</h2>
              <p className="mt-1 text-sm text-slate-400">
                Recently published items. Open a topic to preview how students see it.
              </p>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Audience</th>
                      <th className="px-4 py-3 font-medium text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manageMaterials.map((m) => (
                      <tr key={m._id} className="border-b border-white/5 last:border-0">
                        <td className="max-w-[220px] px-4 py-3 font-medium text-white">
                          {m.title}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {m.category?.name || "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-400">{m.materialType}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {m.audience === "cohort" ? "Class" : "Global"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/dashboard/learning/topic/${m.slug}`}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="mb-6 text-sm text-slate-500">
            No materials in the library yet — publish your first one below.
          </p>
        )}

        <Card className="border border-white/10 bg-white/5 shadow-none">
          <CardContent className="p-6 sm:p-8">
            {loadingMeta ? (
              <div className="flex items-center gap-3 text-slate-400">
                <LoaderCircle className="h-6 w-6 animate-spin" />
                Loading subjects…
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-400">
                No learning categories found. Seed the database or create a category first.
              </p>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="lm-title">
                    Title
                  </label>
                  <input
                    id="lm-title"
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Week 3 — DBMS revision notes"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="lm-cat">
                    Subject category
                  </label>
                  <select
                    id="lm-cat"
                    className={inputClass}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-300" htmlFor="lm-level">
                      Level
                    </label>
                    <select
                      id="lm-level"
                      className={inputClass}
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300" htmlFor="lm-type">
                      Type
                    </label>
                    <select
                      id="lm-type"
                      className={inputClass}
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                    >
                      <option value="article">Article</option>
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="link">Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="lm-summary">
                    Summary
                  </label>
                  <textarea
                    id="lm-summary"
                    className={`${inputClass} min-h-[88px]`}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Short preview shown in lists"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="lm-content">
                    Full content
                  </label>
                  <textarea
                    id="lm-content"
                    className={`${inputClass} min-h-[200px] font-mono text-xs`}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Main article body (Markdown-style headings supported in UI)"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="lm-resource">
                    Resource URL
                  </label>
                  <input
                    id="lm-resource"
                    type="url"
                    className={inputClass}
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    placeholder="https://… (YouTube, PDF, or external article)"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Required for PDF, video, and link types. Optional for pure articles.
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
                    <div>
                      <p className="text-sm font-semibold text-white">Who can see this?</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Cohort materials match{" "}
                        <span className="text-slate-200">course, branch, and year</span> on each
                        student&apos;s profile (normalized the same way for teachers and students).
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                          <input
                            type="radio"
                            name="audience"
                            checked={audience === "global"}
                            onChange={() => setAudience("global")}
                          />
                          Whole catalog (all students)
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                          <input
                            type="radio"
                            name="audience"
                            checked={audience === "cohort"}
                            onChange={() => setAudience("cohort")}
                          />
                          Specific course, branch & year
                        </label>
                      </div>
                    </div>
                  </div>

                  {audience === "cohort" ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium text-slate-400" htmlFor="lm-course">
                          Course
                        </label>
                        <input
                          id="lm-course"
                          className={inputClass}
                          value={targetCourse}
                          onChange={(e) => setTargetCourse(e.target.value)}
                          placeholder="e.g. B.Tech"
                          required={audience === "cohort"}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-400" htmlFor="lm-branch">
                          Branch
                        </label>
                        <input
                          id="lm-branch"
                          className={inputClass}
                          value={targetBranch}
                          onChange={(e) => setTargetBranch(e.target.value)}
                          placeholder="e.g. CSE"
                          required={audience === "cohort"}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-400" htmlFor="lm-year">
                          Year
                        </label>
                        <input
                          id="lm-year"
                          className={inputClass}
                          value={targetYear}
                          onChange={(e) => setTargetYear(e.target.value)}
                          placeholder="e.g. 2 or 2024-28"
                          required={audience === "cohort"}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-300" htmlFor="lm-tags">
                      Tags (comma-separated)
                    </label>
                    <input
                      id="lm-tags"
                      className={inputClass}
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="dbms, revision"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300" htmlFor="lm-min">
                      Est. read (minutes)
                    </label>
                    <input
                      id="lm-min"
                      type="number"
                      min={1}
                      className={inputClass}
                      value={estimatedReadMinutes}
                      onChange={(e) => setEstimatedReadMinutes(e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  Published
                </label>

                {error ? <p className="text-sm text-rose-400">{error}</p> : null}
                {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

                <Button
                  type="submit"
                  size="xl"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    "Publish material"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LearningManagePage;
