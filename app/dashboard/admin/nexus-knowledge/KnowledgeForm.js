'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'BDM',
  'ISR',
  'FEASIBILITY_TEAM',
  'DOCS_TEAM',
  'OPS_TEAM',
  'ACCOUNTS_TEAM',
  'DELIVERY_TEAM',
  'NOC_TEAM',
  'SAM_EXECUTIVE',
  'SAM_HEAD',
  'STORE_ADMIN',
  'STORE_MANAGER',
  'AREA_HEAD',
  'INSTALLATION_TEAM',
  'SUPPORT_TEAM',
  'TEST_USER',
];

const AUDIENCES = ['BOTH', 'STAFF', 'CUSTOMER'];

export default function KnowledgeForm({ initial, onSubmit, onCancel, submitting }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('BOTH');
  const [roles, setRoles] = useState([]);
  const [tagsText, setTagsText] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setContent(initial.content || '');
      setAudience(initial.audience || 'BOTH');
      setRoles(initial.roles || []);
      setTagsText((initial.tags || []).join(', '));
      setIsActive(initial.isActive ?? true);
    }
  }, [initial]);

  const toggleRole = (r) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      audience,
      roles: audience === 'CUSTOMER' ? [] : roles,
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="How to qualify a lead as an ISR"
          required
        />
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Step-by-step explanation. Markdown supported."
          className="min-h-[160px]"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">Markdown is rendered in the chat window.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Audience</Label>
          <div className="mt-1.5 flex gap-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  audience === a ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="isActive">Active (visible to users)</Label>
        </div>
      </div>

      {audience !== 'CUSTOMER' && (
        <div>
          <Label>Role restriction</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            Leave empty to make this entry visible to every staff role in the audience. Select roles to limit visibility.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STAFF_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  roles.includes(r) ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {roles.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              <span className="text-muted-foreground">Selected:</span>
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button type="button" onClick={() => toggleRole(r)} aria-label={`remove ${r}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="invoice, billing, gst"
        />
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
          {submitting ? 'Saving…' : initial ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
