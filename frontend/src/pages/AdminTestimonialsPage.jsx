import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import { workspaceRootProps } from "../lib/workspaceTheme";
import { clearStoredSessionAndNotify, getBearerHeaders } from "../lib/authFetch";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const emptyForm = {
  name: "",
  role: "",
  image: "",
  text: "",
  sortOrder: 0,
  isPublished: true,
};

function AdminTestimonialsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const authHeaders = useCallback(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return null;
    }
    try {
      const u = JSON.parse(storedUser);
      if (u.role !== "admin") {
        setError("This page is available only for admin accounts.");
        return null;
      }
    } catch {
      clearStoredSessionAndNotify();
      navigate("/login");
      return null;
    }
    return getBearerHeaders();
  }, [navigate]);

  const load = useCallback(async () => {
    setError("");
    const headers = authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    const res = await fetch("/api/admin/testimonials", { headers });
    const data = await readApiResponse(res);
    if (res.status === 401) {
      clearStoredSessionAndNotify();
      navigate("/login");
      return;
    }
    if (!res.ok || !data.success) {
      setError(data.message || "Could not load testimonials.");
      setItems([]);
      return;
    }
    setItems(Array.isArray(data.data) ? data.data : []);
  }, [authHeaders, navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const saveRow = async (row) => {
    setError("");
    setSuccess("");
    const headers = authHeaders();
    if (!headers) return;
    const tokenHeader = { ...headers, "Content-Type": "application/json" };
    const res = await fetch(`/api/admin/testimonials/${row._id}`, {
      method: "PATCH",
      headers: tokenHeader,
      body: JSON.stringify({
        name: row.name,
        role: row.role,
        image: row.image,
        text: row.text,
        sortOrder: row.sortOrder,
        isPublished: row.isPublished,
      }),
    });
    const data = await readApiResponse(res);
    if (res.status === 401) {
      clearStoredSessionAndNotify();
      navigate("/login");
      return;
    }
    if (!res.ok || !data.success) {
      setError(data.message || "Save failed.");
      return;
    }
    setSuccess("Saved.");
    await load();
  };

  const removeRow = async (id) => {
    if (!window.confirm("Remove this story from the landing page?")) return;
    setError("");
    setSuccess("");
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`/api/admin/testimonials/${id}`, {
      method: "DELETE",
      headers,
    });
    const data = await readApiResponse(res);
    if (res.status === 401) {
      clearStoredSessionAndNotify();
      navigate("/login");
      return;
    }
    if (!res.ok || !data.success) {
      setError(data.message || "Delete failed.");
      return;
    }
    setSuccess("Removed.");
    await load();
  };

  const createRow = async () => {
    setError("");
    setSuccess("");
    if (!draft.name.trim() || !draft.role.trim() || !draft.text.trim()) {
      setError("Name, role, and quote are required.");
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          role: draft.role.trim(),
          image: draft.image.trim(),
          text: draft.text.trim(),
          sortOrder: Number(draft.sortOrder) || 0,
          isPublished: draft.isPublished,
        }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        clearStoredSessionAndNotify();
        navigate("/login");
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || "Create failed.");
        return;
      }
      setSuccess("Added.");
      setDraft(emptyForm);
      await load();
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div {...workspaceRootProps("admin", "flex min-h-screen items-center justify-center text-slate-600")}>
        <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div {...workspaceRootProps("admin", "min-h-screen text-slate-900")}>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:max-w-4xl">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Landing page · Stories &amp; testimonials</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:max-w-4xl">
        <p className="text-sm text-slate-600">
          These quotes appear in the public <strong>What our users say</strong> section. Order follows
          the sort field (lower numbers first). Unpublished items stay hidden from the site.
        </p>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-base font-semibold">Add a story</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Name</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Role / title</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-600">Photo URL (optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={draft.image}
                onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                placeholder="https://…"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Quote</span>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              />
            </label>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm">
                <span className="text-slate-600">Sort order</span>
                <input
                  type="number"
                  className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={draft.sortOrder}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(e) => setDraft((d) => ({ ...d, isPublished: e.target.checked }))}
                />
                Published on landing page
              </label>
            </div>
            <Button type="button" onClick={createRow} disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              {creating ? "Adding…" : "Add story"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-base font-semibold">Existing stories</h2>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">No testimonials yet.</p>
          ) : null}
          {items.map((row) => (
            <TestimonialEditorRow
              key={row._id}
              initial={row}
              onSave={saveRow}
              onDelete={() => removeRow(row._id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TestimonialEditorRow({ initial, onSave, onDelete }) {
  const [row, setRow] = useState(() => ({ ...initial }));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRow({ ...initial });
    setDirty(false);
  }, [initial]);

  const patch = (partial) => {
    setRow((r) => ({ ...r, ...partial }));
    setDirty(true);
  };

  function patchSort(raw) {
    const n = Number(raw);
    patch({ sortOrder: Number.isFinite(n) ? n : 0 });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={row.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Role</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={row.role}
              onChange={(e) => patch({ role: e.target.value })}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600">Image URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={row.image || ""}
            onChange={(e) => patch({ image: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Quote</span>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={row.text}
            onChange={(e) => patch({ text: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm">
            <span className="text-slate-600">Sort</span>
            <input
              type="number"
              className="mt-1 w-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={row.sortOrder}
              onChange={(e) => patchSort(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(row.isPublished)}
              onChange={(e) => patch({ isPublished: e.target.checked })}
            />
            Published
          </label>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" disabled={!dirty} onClick={() => onSave(row)}>
            Save changes
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 text-rose-700" onClick={onDelete}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminTestimonialsPage;
