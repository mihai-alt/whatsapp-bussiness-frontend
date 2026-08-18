import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Download, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { PageShell, DataTable, IconAction } from '../components/PageShell';
import { StatCard } from '../components/ui';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';

const emptyForm = { name: '', phone: '', email: '', groupIds: [] };

function GroupMultiSelect({ groups, value, onChange, emptyLabel = 'No groups available' }) {
  const selected = useMemo(() => new Set((value || []).map(Number)), [value]);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  if (!groups.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] bg-slate-50 px-3 py-3 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] bg-white p-2">
      {groups.map((g) => {
        const checked = selected.has(Number(g.id));
        return (
          <label
            key={g.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
              checked ? 'bg-[#ecfdf5] text-[var(--wa-deep)]' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--wa)]"
              checked={checked}
              onChange={() => toggle(Number(g.id))}
            />
            <span className="font-semibold">{g.name}</span>
            <span className="ml-auto text-xs text-slate-400">{g.member_count ?? 0}</span>
          </label>
        );
      })}
    </div>
  );
}

function GroupBadges({ groups }) {
  if (!groups?.length) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g) => (
        <span
          key={g.id}
          className="inline-flex rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-semibold text-[#047857]"
        >
          {g.name}
        </span>
      ))}
    </div>
  );
}

export default function ContactsPage() {
  const [data, setData] = useState({ rows: [], total: 0 });
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const filtersRef = useRef({ search: '', groupId: '' });
  filtersRef.current = { search, groupId };

  const load = useCallback(async () => {
    const { search: q, groupId: gId } = filtersRef.current;
    const params = { search: q, groupId: gId || undefined };
    const [c, g] = await Promise.all([
      api.get('/api/contacts', { params }),
      api.get('/api/contacts/groups/available'),
    ]);
    setData(c.data.data);
    setGroups(g.data.data || []);
  }, []);

  // Server returns only ACTIVE groups the user can use (owned + shared)
  const manageableGroups = useMemo(
    () => groups.filter((g) => g.can_use !== false),
    [groups]
  );

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, [groupId, load]);

  useWorkspaceRealtime(['contacts', 'groups'], () =>
    load().catch((err) => setError(getErrorMessage(err)))
  );

  function openAdd() {
    setEditing(null);
    const preferred = groupId && manageableGroups.some((g) => String(g.id) === String(groupId))
      ? [Number(groupId)]
      : [];
    setForm({
      ...emptyForm,
      groupIds: preferred,
    });
    setShowAdd(true);
    setError('');
  }

  function openEdit(contact) {
    if (!contact.can_edit && !contact.can_manage) return;
    setShowAdd(false);
    setEditing(contact);
    const manageableIds = new Set(manageableGroups.map((g) => Number(g.id)));
    setForm({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      groupIds: (contact.groups || [])
        .map((g) => Number(g.id))
        .filter((id) => manageableIds.has(id)),
    });
    setError('');
  }

  function closeForms() {
    setShowAdd(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function createContact(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/contacts', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        groupIds: form.groupIds.map(Number),
      });
      setMessage('Contact created');
      closeForms();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateContact(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/contacts/${editing.id}`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        groupIds: form.groupIds.map(Number),
      });
      setMessage('Contact updated');
      closeForms();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id) {
    if (!confirm('Delete contact?')) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (groupId) {
      const selected = groups.find((g) => String(g.id) === String(groupId));
      if (!selected?.can_use) {
        setError('You can only import into Active groups you can access');
        e.target.value = '';
        return;
      }
      fd.append('groupId', groupId);
    }
    try {
      const { data: res } = await api.post('/api/contacts/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(
        `Imported ${res.data.imported}, duplicates ${res.data.duplicates}, errors ${res.data.errors}`
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      e.target.value = '';
    }
  }

  function exportCsv() {
    api.get('/api/contacts/export/csv', { responseType: 'blob' }).then((res) => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-slate-800">{r.name}</span> },
    { key: 'phone', label: 'Phone Number' },
    {
      key: 'groups',
      label: 'Groups',
      render: (r) => <GroupBadges groups={r.groups} />,
    },
    {
      key: 'created_at',
      label: 'Added On',
      render: (r) => String(r.created_at || '').slice(0, 10) || '—',
    },
    {
      key: 'actions',
      label: 'Action',
      render: (r) => {
        const canEdit = r.can_edit ?? r.can_manage;
        const canDelete = r.can_delete ?? false;
        if (!canEdit && !canDelete) {
          return <span className="text-xs text-slate-400">View only</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            {canEdit ? (
              <IconAction title="Edit" onClick={() => openEdit(r)}>
                <Pencil size={14} />
              </IconAction>
            ) : null}
            {canDelete ? (
              <IconAction title="Delete" danger onClick={() => removeContact(r.id)}>
                <Trash2 size={14} />
              </IconAction>
            ) : null}
          </div>
        );
      },
    },
  ];

  const formCard = (title, onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-extrabold text-slate-900">{title}</div>
          <p className="text-sm text-slate-500">Assign one or more groups to this contact.</p>
        </div>
        <button type="button" className="text-slate-400 hover:text-slate-700" onClick={closeForms} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Email (optional)</label>
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="label">Groups</label>
        <GroupMultiSelect
          groups={manageableGroups}
          value={form.groupIds}
          onChange={(groupIds) => setForm({ ...form, groupIds })}
          emptyLabel="No groups you can manage"
        />
        {form.groupIds.length ? (
          <p className="mt-1.5 text-xs text-slate-500">{form.groupIds.length} group(s) selected</p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">
            Optional — you can only assign groups you created (or any group if you are an admin)
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={closeForms}>
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Contacts' }]}
      actions={
        <>
          <label className="btn btn-secondary cursor-pointer">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importFile} />
          </label>
          <button className="btn btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Contact
          </button>
        </>
      }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Contacts" value={data.total} />
        <StatCard label="Groups" value={groups.length} />
        <StatCard
          label="Selected Group"
          value={groupId ? groups.find((g) => String(g.id) === groupId)?.member_count || 0 : 'All'}
        />
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load().catch((err) => setError(getErrorMessage(err)));
        }}
      >
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input input-with-icon"
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[220px]" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.member_count})
            </option>
          ))}
        </select>
      </form>

      {showAdd ? formCard('Add Contact', createContact, 'Save Contact') : null}
      {editing ? formCard('Edit Contact', updateContact, 'Update Contact') : null}

      <div className="card overflow-hidden">
        <DataTable columns={columns} rows={data.rows} empty="No contacts found." />
      </div>
    </PageShell>
  );
}
