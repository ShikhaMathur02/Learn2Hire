import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, LoaderCircle, PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { readApiResponse } from '../lib/api';

const allowedRoles = ['faculty', 'admin', 'college'];

const initialCategoryForm = {
  name: '',
  description: '',
  icon: '',
  isPublished: true,
};

const initialMaterialForm = {
  title: '',
  summary: '',
  content: '',
  materialType: 'article',
  resourceUrl: '',
  level: 'beginner',
  tags: '',
  estimatedReadMinutes: 5,
  categoryId: '',
  isPublished: true,
};

function LearningManagePage() {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [materialForm, setMaterialForm] = useState(initialMaterialForm);
  const [loading, setLoading] = useState(true);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [submittingMaterial, setSubmittingMaterial] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchManageData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [categoriesResponse, materialsResponse] = await Promise.all([
        fetch('/api/learning/manage/categories', { headers }),
        fetch('/api/learning/manage/materials', { headers }),
      ]);

      const categoriesData = await readApiResponse(categoriesResponse);
      const materialsData = await readApiResponse(materialsResponse);

      const nextCategories = categoriesData.data?.categories || [];
      const nextMaterials = materialsData.data?.materials || [];

      setCategories(nextCategories);
      setMaterials(nextMaterials);
      setMaterialForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || nextCategories[0]?._id || '',
      }));
    } catch (err) {
      setError(err.message || 'Failed to load learning management data.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (token && allowedRoles.includes(user?.role)) {
      fetchManageData();
    }
  }, [fetchManageData, token, user?.role]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCategorySubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmittingCategory(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/learning/manage/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify(categoryForm),
      });

      await readApiResponse(response);

      setCategoryForm(initialCategoryForm);
      setSuccess('Category created successfully.');
      fetchManageData();
    } catch (err) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleMaterialSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmittingMaterial(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/learning/manage/materials', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...materialForm,
          tags: materialForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      await readApiResponse(response);

      setMaterialForm((prev) => ({
        ...initialMaterialForm,
        categoryId: prev.categoryId || categories[0]?._id || '',
      }));
      setSuccess('Study material created successfully.');
      fetchManageData();
    } catch (err) {
      setError(err.message || 'Failed to create material.');
    } finally {
      setSubmittingMaterial(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setWorkingId(categoryId);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/learning/manage/categories/${categoryId}`, {
        method: 'DELETE',
        headers,
      });

      await readApiResponse(response);
      setSuccess('Category deleted successfully.');
      fetchManageData();
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setWorkingId('');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    try {
      setWorkingId(materialId);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/learning/manage/materials/${materialId}`, {
        method: 'DELETE',
        headers,
      });

      await readApiResponse(response);
      setSuccess('Study material deleted successfully.');
      fetchManageData();
    } catch (err) {
      setError(err.message || 'Failed to delete material.');
    } finally {
      setWorkingId('');
    }
  };

  const handleToggleMaterial = async (material) => {
    try {
      setWorkingId(material._id);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/learning/manage/materials/${material._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          isPublished: !material.isPublished,
        }),
      });

      await readApiResponse(response);
      setSuccess('Study material updated successfully.');
      fetchManageData();
    } catch (err) {
      setError(err.message || 'Failed to update material.');
    } finally {
      setWorkingId('');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur xl:p-8">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Learning Management</p>
              <h1 className="mt-2 text-3xl font-bold">Manage categories and study materials</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Create public learning resources for anyone visiting Learn2Hire.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/learn">Open Public Learning Hub</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-300">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading learning management...
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-6">
                <Card className="border border-white/10 bg-white/5 shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <PlusCircle className="h-6 w-6 text-cyan-300" />
                      <div>
                        <h2 className="text-2xl font-bold text-white">Create Category</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Group materials into topics like JavaScript, aptitude, or interviews.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCategorySubmit} className="mt-6 space-y-4">
                      <input
                        value={categoryForm.name}
                        onChange={(event) =>
                          setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="Category name"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />
                      <textarea
                        value={categoryForm.description}
                        onChange={(event) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Short category description"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />
                      <input
                        value={categoryForm.icon}
                        onChange={(event) =>
                          setCategoryForm((prev) => ({ ...prev, icon: event.target.value }))
                        }
                        placeholder="Optional icon name"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />
                      <label className="flex items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={categoryForm.isPublished}
                          onChange={(event) =>
                            setCategoryForm((prev) => ({
                              ...prev,
                              isPublished: event.target.checked,
                            }))
                          }
                        />
                        Publish category immediately
                      </label>
                      <Button type="submit" disabled={submittingCategory}>
                        {submittingCategory ? 'Creating...' : 'Create Category'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-white/5 shadow-none">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold text-white">All Categories</h2>
                    <div className="mt-6 space-y-4">
                      {categories.length ? (
                        categories.map((category) => (
                          <div
                            key={category._id}
                            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-white">{category.name}</h3>
                                <p className="mt-1 text-sm text-slate-400">
                                  {category.description || 'No description yet.'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                                  {category.isPublished ? 'Published' : 'Draft'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(category._id)}
                                  disabled={workingId === category._id}
                                  className="text-rose-300 transition hover:text-rose-200 disabled:opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                          No categories created yet.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border border-white/10 bg-white/5 shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-6 w-6 text-cyan-300" />
                      <div>
                        <h2 className="text-2xl font-bold text-white">Create Study Material</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Add articles, links, videos, or PDFs for the public learning hub.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleMaterialSubmit} className="mt-6 space-y-4">
                      <input
                        value={materialForm.title}
                        onChange={(event) =>
                          setMaterialForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="Material title"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />
                      <textarea
                        value={materialForm.summary}
                        onChange={(event) =>
                          setMaterialForm((prev) => ({ ...prev, summary: event.target.value }))
                        }
                        rows={3}
                        placeholder="Short summary"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />
                      <textarea
                        value={materialForm.content}
                        onChange={(event) =>
                          setMaterialForm((prev) => ({ ...prev, content: event.target.value }))
                        }
                        rows={6}
                        placeholder="Main article content"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <select
                          value={materialForm.categoryId}
                          onChange={(event) =>
                            setMaterialForm((prev) => ({
                              ...prev,
                              categoryId: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-cyan-400"
                        >
                          <option value="">Select category</option>
                          {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={materialForm.materialType}
                          onChange={(event) =>
                            setMaterialForm((prev) => ({
                              ...prev,
                              materialType: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-cyan-400"
                        >
                          <option value="article">Article</option>
                          <option value="video">Video</option>
                          <option value="pdf">PDF</option>
                          <option value="link">Link</option>
                        </select>

                        <select
                          value={materialForm.level}
                          onChange={(event) =>
                            setMaterialForm((prev) => ({ ...prev, level: event.target.value }))
                          }
                          className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-cyan-400"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={materialForm.estimatedReadMinutes}
                          onChange={(event) =>
                            setMaterialForm((prev) => ({
                              ...prev,
                              estimatedReadMinutes: Number(event.target.value),
                            }))
                          }
                          placeholder="Estimated minutes"
                          className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                        />
                      </div>

                      <input
                        value={materialForm.resourceUrl}
                        onChange={(event) =>
                          setMaterialForm((prev) => ({
                            ...prev,
                            resourceUrl: event.target.value,
                          }))
                        }
                        placeholder="Optional external resource URL"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />

                      <input
                        value={materialForm.tags}
                        onChange={(event) =>
                          setMaterialForm((prev) => ({ ...prev, tags: event.target.value }))
                        }
                        placeholder="Tags separated by commas"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />

                      <label className="flex items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={materialForm.isPublished}
                          onChange={(event) =>
                            setMaterialForm((prev) => ({
                              ...prev,
                              isPublished: event.target.checked,
                            }))
                          }
                        />
                        Publish material immediately
                      </label>

                      <Button type="submit" disabled={submittingMaterial || !categories.length}>
                        {submittingMaterial ? 'Creating...' : 'Create Material'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-white/5 shadow-none">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold text-white">Existing Materials</h2>
                    <div className="mt-6 space-y-4">
                      {materials.length ? (
                        materials.map((material) => (
                          <div
                            key={material._id}
                            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase text-cyan-300">
                                    {material.materialType}
                                  </span>
                                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium capitalize text-emerald-300">
                                    {material.level}
                                  </span>
                                </div>
                                <h3 className="mt-3 font-semibold text-white">{material.title}</h3>
                                <p className="mt-1 text-sm text-slate-400">{material.summary}</p>
                                <p className="mt-3 text-xs text-slate-500">
                                  {material.category?.name || 'General'} · {material.estimatedReadMinutes} min
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMaterial(material)}
                                  disabled={workingId === material._id}
                                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                                >
                                  {material.isPublished ? 'Unpublish' : 'Publish'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMaterial(material._id)}
                                  disabled={workingId === material._id}
                                  className="rounded-full border border-rose-400/20 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                          No study materials created yet.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LearningManagePage;
