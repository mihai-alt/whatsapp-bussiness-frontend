import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';

const PAGE_SIZE = 5;

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'member',
  is_active: true,
};

function formatCreatedAt(value) {
  if (!value) return { date: '—', time: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: String(value).slice(0, 10), time: '' };
  return {
    date: format(d, 'yyyy-MM-dd'),
    time: format(d, 'hh:mm a'),
  };
}

function LetterAvatar({ user }) {
  const letter = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  const src = mediaUrl(user?.avatar_url);
  if (src) {
    return <img src={src} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dcfce7] text-sm font-bold text-[#15803d]">
      {letter}
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex rounded-full bg-[#dbeafe] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#475569]">
      Member
    </span>
  );
}

function StatusBadge({ active }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#15803d]">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#fee2e2] px-2.5 py-1 text-xs font-semibold text-[#b91c1c]">
      Inactive
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: me, setUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    const { data } = await api.get('/api/auth/users');
    setUsers(data.data || []);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers().catch((err) => setError(getErrorMessage(err)));
  }, [isAdmin, loadUsers]);

  useWorkspaceRealtime(
    ['users'],
    () => loadUsers().catch((err) => setError(getErrorMessage(err))),
    { enabled: isAdmin }
  );

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (!q) return true;
      return (
        String(u.name || '')
          .toLowerCase()
          .includes(q) ||
        String(u.email || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  if (!isAdmin) return <Navigate to="/settings" replace />;

  function flash(ok, text) {
    setError(ok ? '' : text);
    setMessage(ok ? text : '');
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModal('add');
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'member',
      is_active: !!user.is_active,
    });
    setModal('edit');
  }

  const editingPrimaryAdmin =
    modal === 'edit' &&
    editing &&
    (editing.is_primary_admin || Number(editing.id) === Number(users[0]?.id));
  const meIsPrimary =
    Boolean(me?.is_primary_admin) ||
    Number(me?.id) === Number(users.find((u) => u.is_primary_admin)?.id) ||
    (users.length > 0 && Number(me?.id) === Number(users[0]?.id));
  const lockRoleStatus =
    editingPrimaryAdmin ||
    (modal === 'edit' && editing?.role === 'admin' && !meIsPrimary);
  const lockAdminPassword =
    modal === 'edit' &&
    editing?.role === 'admin' &&
    !meIsPrimary &&
    Number(editing?.id) !== Number(me?.id);

  function closeModal() {
    setModal(null);
    setEditing(null);
    setForm(emptyForm);
  }

  function applyUserUpdate(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    if (me && Number(updated.id) === Number(me.id)) {
      setUser({ ...me, ...updated });
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true);
    flash(true, '');
    try {
      if (modal === 'add') {
        const { data } = await api.post('/api/auth/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          is_active: form.is_active,
        });
        setUsers((prev) => [...prev, data.data.user].sort((a, b) => a.id - b.id));
        flash(true, 'User created successfully');
      } else if (editing) {
        const payload = {
          name: form.name.trim(),
        };
        if (!lockRoleStatus) {
          payload.role = form.role;
          payload.is_active = form.is_active;
        }
        if (form.password && !lockAdminPassword) payload.password = form.password;
        const { data } = await api.patch(`/api/auth/users/${editing.id}`, payload);
        applyUserUpdate(data.data.user);
        flash(true, 'User updated successfully');
      }
      closeModal();
    } catch (err) {
      flash(false, getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    'h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--wa)] focus:ring-2 focus:ring-[var(--wa)]/15';
  const selectClass = `${fieldClass} appearance-none pr-8`;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-400">
            <span>Home</span>
            <span className="mx-1.5">›</span>
            <span className="text-slate-600">Users</span>
          </div>
        </div>
        <button type="button" className="btn btn-primary shrink-0" onClick={openAdd}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {error ? (
        <div className="shrink-0 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="shrink-0 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</div>
      ) : null}

      {/* Filters — same style as Transactions */}
      <div className="card shrink-0 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input input-with-icon !py-2.5"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input !py-2.5"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <select
            className="input !py-2.5"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table fills remaining viewport — empty state centered */}
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[var(--line)] px-5 py-2.5 font-extrabold">
          Users {filtered.length ? `(${filtered.length})` : ''}
        </div>

        {!pageRows.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
              <UserRound size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
            </div>
            <div className="text-base font-extrabold text-slate-900">No users found.</div>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Try adjusting search or filters, or add a new team member.
            </p>            
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[var(--panel-2)] text-left text-slate-400">
                  <tr>
                    {['User', 'Email', 'Role', 'Status', 'Created At', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 font-bold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => {
                    const created = formatCreatedAt(u.created_at);
                    const isSelf = Number(u.id) === Number(me?.id);
                    return (
                      <tr key={u.id} className="border-t border-[var(--line)] hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <LetterAvatar user={u} />
                            <div className="min-w-0 font-bold text-slate-900">
                              {u.name}
                              {isSelf ? (
                                <span className="ml-1.5 text-xs font-semibold text-slate-400">(You)</span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 align-middle text-slate-600">
                          {u.email}
                        </td>
                        <td className="px-5 py-3.5 align-middle">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-5 py-3.5 align-middle">
                          <StatusBadge active={!!u.is_active} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 align-middle">
                          <div className="text-sm font-medium text-slate-700">{created.date}</div>
                          {created.time ? (
                            <div className="text-xs text-slate-400">{created.time}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-3.5 align-middle">
                          <button
                            type="button"
                            title="Edit user"
                            onClick={() => openEdit(u)}
                            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--line)] text-slate-500 transition hover:bg-slate-50 hover:text-[var(--wa-deep)]"
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--line)] px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing {from} to {to} of {filtered.length} users
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="grid h-8 w-8 place-items-center rounded-md border border-[var(--line)] text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm font-bold transition ${
                      n === safePage
                        ? 'bg-[var(--wa)] text-white'
                        : 'border border-[var(--line)] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="grid h-8 w-8 place-items-center rounded-md border border-[var(--line)] text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal ? (
        <Modal
          title={modal === 'add' ? 'Add User' : 'Edit User'}
          subtitle={modal === 'add' ? 'Create a new team account.' : 'Update profile, role, and status.'}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                form="user-form"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : modal === 'add' ? 'Create User' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={submitForm} className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full Name</label>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input
                className={`${fieldClass} ${modal === 'edit' ? 'bg-slate-50 text-slate-500' : ''}`}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={modal === 'edit'}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {modal === 'add' ? 'Password' : 'New Password (optional)'}
              </label>
              <input
                className={`${fieldClass} ${lockAdminPassword ? 'bg-slate-50 text-slate-500' : ''}`}
                type="password"
                value={lockAdminPassword ? '' : form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={modal === 'add'}
                disabled={lockAdminPassword}
                minLength={modal === 'add' || form.password ? 8 : undefined}
                placeholder={
                  lockAdminPassword
                    ? 'Only the first administrator can set this password'
                    : modal === 'edit'
                      ? 'Leave blank to keep current'
                      : ''
                }
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
                <div className="relative">
                  <select
                    className={`${selectClass} ${lockRoleStatus ? 'bg-slate-50 text-slate-500' : ''}`}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    disabled={lockRoleStatus}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                <div className="relative">
                  <select
                    className={`${selectClass} ${lockRoleStatus ? 'bg-slate-50 text-slate-500' : ''}`}
                    value={form.is_active ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}
                    disabled={lockRoleStatus}
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            {editingPrimaryAdmin && meIsPrimary ? (
              <p className="text-xs text-slate-500">
                The first administrator&apos;s role and status cannot be changed.
              </p>
            ) : lockRoleStatus || lockAdminPassword ? (
              <p className="text-xs text-slate-500">
                Only the first administrator can change another administrator&apos;s role, status, or
                password.
              </p>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
