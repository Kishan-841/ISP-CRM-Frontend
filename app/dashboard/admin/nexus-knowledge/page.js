'use client';

import { useEffect, useState } from 'react';
import { useNexusKnowledgeStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Sparkles, Search } from 'lucide-react';
import KnowledgeForm from './KnowledgeForm';
import toast from 'react-hot-toast';

const AUDIENCE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Both', value: 'BOTH' },
];

export default function NexusKnowledgePage() {
  const {
    items,
    pagination,
    loading,
    fetchKnowledge,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
  } = useNexusKnowledgeStore();

  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => fetchKnowledge({ page, limit: 20, search, audience: audienceFilter });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, audienceFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleCreate = async (payload) => {
    setSubmitting(true);
    const res = await createKnowledge(payload);
    setSubmitting(false);
    if (res.success) {
      toast.success('Knowledge entry created');
      setOpenCreate(false);
      load();
    } else {
      toast.error(res.error);
    }
  };

  const handleUpdate = async (payload) => {
    if (!editing) return;
    setSubmitting(true);
    const res = await updateKnowledge(editing.id, payload);
    setSubmitting(false);
    if (res.success) {
      toast.success('Updated');
      setEditing(null);
      load();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    const res = await deleteKnowledge(entry.id);
    if (res.success) {
      toast.success('Deleted');
      load();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold">VECTRA Knowledge Base</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the content VECTRA uses to answer user questions. Role filters control who can see each entry.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Knowledge Entry</DialogTitle>
            </DialogHeader>
            <KnowledgeForm onSubmit={handleCreate} onCancel={() => setOpenCreate(false)} submitting={submitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or content..."
            className="pl-9"
          />
        </form>
        <div className="flex gap-1">
          {AUDIENCE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setAudienceFilter(f.value);
                setPage(1);
              }}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                audienceFilter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No knowledge entries yet. Click <strong>New Entry</strong> to get started.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{entry.title}</h3>
                    {!entry.isActive && <Badge variant="outline">Inactive</Badge>}
                    <Badge variant="secondary">{entry.audience}</Badge>
                    {entry.roles?.length > 0 &&
                      entry.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">
                          {r}
                        </Badge>
                      ))}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.content}</p>
                  {entry.tags?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {entry.tags.map((t) => (
                        <span key={t} className="text-[10px] text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Knowledge Entry</DialogTitle>
          </DialogHeader>
          {editing && (
            <KnowledgeForm
              initial={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              submitting={submitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
