import { useEffect, useState } from 'react';
import { FolderOpen, Lock, Pencil, Plus, Share2, Trash2, Users, X } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { PageShell, IconAction } from '../components/PageShell';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }) {
  const active = String(status || 'ACTIVE').toUpperCase() === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        active ? 'text-emerald-700' : 'text-slate-500'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function AccessBadge({ mode }) {
  const shared = String(mode || 'PRIVATE').toUpperCase() === 'SHARED';
  return (
    <span className="inline-flex flex-col gap-0.5 text-xs font-semibold text-slate-700">
      <span className="inline-flex items-center gap-1">
        {shared ? <Users size={12} className="text-sky-600" /> : <Lock size={12} className="text-slate-500" />}
        {shared ? 'Shared' : 'Private'}
      </span>
      {shared ? (
        <span className="font-normal text-slate-400">All Members can view &amp; use</span>
      ) : null}
    </span>
  );
}

export default function GroupsPage() {
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [accessMode, setAccessMode] = useState('PRIVATE');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [accessGroup, setAccessGroup] = useState(null);
  const [accessUsers, setAccessUsers] = useState([]);
  const [shareable, setShareable] = useState([]);
  const [grantUserId, setGrantUserId] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [accessError, setAccessError] = useState('');
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await api.get('/api/contacts/groups/list');
    setGroups(data.data || []);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setGroupName('');
    setDescription('');
    setStatus('ACTIVE');
    setAccessMode('PRIVATE');
    setFormError('');
    setShowCreate(true);
  }

  function openEdit(group) {
    if (!group.can_manage) return;
    setEditing(group);
    setGroupName(group.name || '');
    setDescription(group.description || '');
    setStatus(String(group.status || 'ACTIVE').toUpperCase());
    setAccessMode(String(group.access_mode || 'PRIVATE').toUpperCase());
    setFormError('');
    setShowCreate(true);
  }

  function closeCreate() {
    if (saving) return;
    setShowCreate(false);
    setEditing(null);
    setFormError('');
  }

  async function saveGroup(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: groupName,
        description,
        status,
        accessMode,
      };
      if (editing) {
        await api.patch(`/api/contacts/groups/${editing.id}`, payload);
      } else {
        await api.post('/api/contacts/groups', payload);
      }
      setShowCreate(false);
      setEditing(null);
      setError('');
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(id) {
    if (!confirm('Delete this group? Contacts and users will not be deleted.')) return;
    try {
      await api.delete(`/api/contacts/groups/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function openAccess(group) {
    if (!group.can_manage_access) return;
    setAccessError('');
    setGrantUserId('');
    setAccessGroup(group);
    try {
      const { data } = await api.get(`/api/contacts/groups/${group.id}/access`);
      setAccessUsers(data.data.users || []);
      setShareable(data.data.shareable || []);
      setAccessGroup(data.data.group || group);
    } catch (err) {
      setError(getErrorMessage(err));
      setAccessGroup(null);
    }
  }

  function closeAccess() {
    if (accessSaving) return;
    setAccessGroup(null);
    setAccessUsers([]);
    setShareable([]);
    setAccessError('');
  }

  async function ensureSharedThenGrant() {
    if (!accessGroup) return;
    setAccessSaving(true);
    setAccessError('');
    try {
      let group = accessGroup;
      if (String(group.access_mode).toUpperCase() !== 'SHARED') {
        const { data } = await api.patch(`/api/contacts/groups/${group.id}`, {
          accessMode: 'SHARED',
        });
        group = data.data;
        setAccessGroup(group);
      }
      if (!grantUserId) {
        setAccessError('Select a member to grant access');
        return;
      }
      const { data } = await api.post(`/api/contacts/groups/${group.id}/access`, {
        userId: Number(grantUserId),
      });
      setAccessUsers(data.data.users || []);
      setGrantUserId('');
      const refreshed = await api.get(`/api/contacts/groups/${group.id}/access`);
      setShareable(refreshed.data.data.shareable || []);
      setAccessGroup(refreshed.data.data.group || group);
      await load();
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setAccessSaving(false);
    }
  }

  async function removeAccess(userId) {
    if (!accessGroup) return;
    setAccessSaving(true);
    setAccessError('');
    try {
      const { data } = await api.delete(
        `/api/contacts/groups/${accessGroup.id}/access/${userId}`
      );
      setAccessUsers(data.data.users || []);
      const refreshed = await api.get(`/api/contacts/groups/${accessGroup.id}/access`);
      setShareable(refreshed.data.data.shareable || []);
      await load();
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setAccessSaving(false);
    }
  }

  async function makePrivate() {
    if (!accessGroup) return;
    if (
      !confirm(
        'Switch to Private? Explicit member access will be removed. Contacts and campaigns are kept.'
      )
    ) {
      return;
    }
    setAccessSaving(true);
    setAccessError('');
    try {
      const { data } = await api.patch(`/api/contacts/groups/${accessGroup.id}`, {
        accessMode: 'PRIVATE',
      });
      setAccessGroup(data.data);
      setAccessUsers([]);
      const refreshed = await api.get(`/api/contacts/groups/${accessGroup.id}/access`);
      setShareable(refreshed.data.data.shareable || []);
      await load();
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setAccessSaving(false);
    }
  }

  return (
    <PageShell
      breadcrumb={[
        { label: 'Home', to: '/' },
        { label: isAdmin ? 'Contact Groups' : 'My Groups' },
      ]}
      actions={
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Create Group
        </button>
      }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Loading groups…
          </div>
        ) : !groups.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
              <FolderOpen size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
            </div>
            <div className="text-base font-extrabold text-slate-900">No contact groups yet.</div>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Create a group to organize your contacts.
            </p>
            <button type="button" className="btn btn-primary mt-5" onClick={openCreate}>
              <Plus size={16} /> Create Contact Group
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-left text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Group Name</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Contacts</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Owner</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Access</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Created On</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--line)] hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 align-middle">
                      <div className="font-bold text-slate-800">{r.name}</div>
                      {r.description ? (
                        <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">{r.description}</div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <span className="font-semibold">{Number(r.member_count) || 0}</span>
                    </td>
                    <td className="px-5 py-3.5 align-middle text-slate-600">
                      {r.owner_name || '—'}
                      {r.is_owner ? (
                        <span className="ml-1 text-xs text-slate-400">(you)</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <AccessBadge mode={r.access_mode} />
                    </td>
                    <td className="px-5 py-3.5 align-middle text-slate-600">
                      {String(r.created_at || '').slice(0, 10) || '—'}
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {r.can_manage_access ? (
                          <IconAction title="Manage Access" onClick={() => openAccess(r)}>
                            <Share2 size={14} />
                          </IconAction>
                        ) : null}
                        {r.can_manage ? (
                          <>
                            <IconAction title="Edit" onClick={() => openEdit(r)}>
                              <Pencil size={14} />
                            </IconAction>
                            <IconAction title="Delete" danger onClick={() => removeGroup(r.id)}>
                              <Trash2 size={14} />
                            </IconAction>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Shared with you</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={closeCreate}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editing ? 'Edit Group' : 'Create Contact Group'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editing
                    ? 'Update group details, status, or access mode.'
                    : 'You become the owner. Access defaults to Private.'}
                </p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeCreate}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {formError ? (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
            ) : null}

            <form onSubmit={saveGroup} className="space-y-4">
              <div>
                <label className="label">Group Name</label>
                <input
                  className="input"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. VIP Customers"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="label">Access</label>
                <div className="mt-1 space-y-2 rounded-xl border border-[var(--line)] bg-slate-50 p-3">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="accessMode"
                      className="mt-1 accent-[var(--wa)]"
                      checked={accessMode === 'PRIVATE'}
                      onChange={() => setAccessMode('PRIVATE')}
                    />
                    <span>
                      <span className="font-semibold text-slate-800">Private</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Only you and Admins can access this group.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="accessMode"
                      className="mt-1 accent-[var(--wa)]"
                      checked={accessMode === 'SHARED'}
                      onChange={() => setAccessMode('SHARED')}
                    />
                    <span>
                      <span className="font-semibold text-slate-800">Shared</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Every Member can view this group and use it (contacts, campaigns, import).
                      </span>
                    </span>
                  </label>
                </div>
                {editing &&
                String(editing.access_mode).toUpperCase() === 'SHARED' &&
                accessMode === 'PRIVATE' ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Switching to Private means only you and Admins can access this group.
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-secondary" onClick={closeCreate} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {accessGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={closeAccess}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Manage Access</h3>
                <p className="mt-1 text-sm text-slate-500">{accessGroup.name}</p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeAccess}
              >
                <X size={16} />
              </button>
            </div>

            {accessError ? (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{accessError}</div>
            ) : null}

            <div className="mb-4 space-y-2 rounded-xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Owner</span>
                <span className="font-semibold text-slate-800">{accessGroup.owner_name || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Access</span>
                <AccessBadge mode={accessGroup.access_mode} />
              </div>
            </div>

            {String(accessGroup.access_mode).toUpperCase() === 'SHARED' ? (
              <p className="mb-4 rounded-xl border border-dashed border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
                This group is Shared. Every Member can view it and use it for contacts, campaigns,
                and imports. Only you (owner) and Admins can edit or delete it.
              </p>
            ) : (
              <p className="mb-4 rounded-xl border border-dashed border-[var(--line)] bg-slate-50 px-3 py-3 text-sm text-slate-500">
                This group is Private. Only you and Admins can access it. Switch to Shared so every
                Member can view and use it.
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {String(accessGroup.access_mode).toUpperCase() === 'SHARED' ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={makePrivate}
                  disabled={accessSaving}
                >
                  {accessSaving ? 'Saving…' : 'Make Private'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={accessSaving}
                  onClick={async () => {
                    setAccessSaving(true);
                    setAccessError('');
                    try {
                      const { data } = await api.patch(`/api/contacts/groups/${accessGroup.id}`, {
                        accessMode: 'SHARED',
                      });
                      setAccessGroup(data.data);
                      await load();
                    } catch (err) {
                      setAccessError(getErrorMessage(err));
                    } finally {
                      setAccessSaving(false);
                    }
                  }}
                >
                  {accessSaving ? 'Saving…' : 'Make Shared'}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={closeAccess}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
