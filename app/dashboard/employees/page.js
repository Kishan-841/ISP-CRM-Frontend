'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useUserStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '@/lib/useModal';
import { formatDate } from '@/lib/formatters';

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { users, isLoading, fetchUsers, createUser, updateUser, deleteUser } = useUserStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'ISR',
    isActive: true,
    teamLeaderId: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, userName: '' });
  const [isFormDirty, setIsFormDirty] = useState(false);

  useUnsavedChanges(isFormDirty);

  const isTL = user?.role === 'BDM_TEAM_LEADER';

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'SALES_DIRECTOR' && user?.role !== 'BDM_TEAM_LEADER' && user?.role !== 'MASTER') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, router, fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      mobile: '',
      password: '',
      role: isTL ? 'BDM' : 'ISR',
      isActive: true,
      teamLeaderId: '',
    });
    setFormError('');
    setIsFormDirty(false);
    setShowModal(true);
  };

  const openEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      mobile: userToEdit.mobile || '',
      password: '',
      role: userToEdit.role,
      isActive: userToEdit.isActive,
      teamLeaderId: userToEdit.teamLeaderId || '',
    });
    setFormError('');
    setIsFormDirty(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormError('');
    setIsFormDirty(false);
  };

  useModal(showModal, () => !submitting && closeModal());

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setIsFormDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const data = { ...formData };
    if (editingUser && !data.password) {
      delete data.password;
    }
    // Only send teamLeaderId for BDM role
    if (data.role !== 'BDM') {
      delete data.teamLeaderId;
    } else if (!data.teamLeaderId) {
      data.teamLeaderId = null;
    }

    let result;
    if (editingUser) {
      result = await updateUser(editingUser.id, data);
    } else {
      if (!data.password) {
        setFormError('Password is required for new users.');
        setSubmitting(false);
        return;
      }
      result = await createUser(data);
    }

    if (result.success) {
      toast.success(editingUser ? 'Employee updated successfully' : 'Employee created successfully');
      setIsFormDirty(false);
      closeModal();
    } else {
      setFormError(result.error);
      toast.error(result.error || 'Operation failed');
    }

    setSubmitting(false);
  };

  const openDeleteConfirm = (userToDelete) => {
    setConfirmDialog({ open: true, userId: userToDelete.id, userName: userToDelete.name });
  };

  const handleDeleteConfirmed = async () => {
    const result = await deleteUser(confirmDialog.userId);
    if (result.success) {
      toast.success('Employee deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete employee');
    }
    setConfirmDialog({ open: false, userId: null, userName: '' });
  };

  const filteredUsers = users.filter(u => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!u.name?.toLowerCase().includes(term) && !u.email?.toLowerCase().includes(term)) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'SALES_DIRECTOR' && user?.role !== 'BDM_TEAM_LEADER' && user?.role !== 'MASTER') {
    return null;
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{isTL ? 'My BDMs' : 'Employees'}</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mt-1 ml-[18px]">{isTL ? 'Manage BDM users in your team' : 'Manage your team members and their roles'}</p>
      </div>

      {/* Main Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isTL ? 'Team BDMs' : 'All Employees'} ({filteredUsers.length}{(searchTerm || roleFilter) && filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
          </CardTitle>
          <Button
            onClick={openCreateModal}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isTL ? 'Add BDM' : 'Add Employee'}
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background border-slate-200 dark:border-slate-700"
              />
            </div>
            {!isTL && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="AREA_HEAD">Area Head</option>
                <option value="BDM">BDM</option>
                <option value="BDM_TEAM_LEADER">BDM Team Leader</option>
                <option value="ISR">ISR</option>
                <option value="SAM">SAM</option>
                <option value="SAM_HEAD">SAM Head</option>
                <option value="SAM_EXECUTIVE">SAM Executive</option>
                <option value="FEASIBILITY_TEAM">Feasibility</option>
                <option value="DOCS_TEAM">Docs Team</option>
                <option value="OPS_TEAM">OPS Team</option>
                <option value="ACCOUNTS_TEAM">Accounts</option>
                <option value="DELIVERY_TEAM">Delivery</option>
                <option value="NOC">NOC</option>
                <option value="NOC_HEAD">NOC Head</option>
                <option value="STORE_MANAGER">Store Manager</option>
                <option value="SALES_DIRECTOR">Sales Director</option>
                <option value="BDM_CP">BDM (Channel Partner)</option>
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {searchTerm || roleFilter ? 'No matching employees' : 'No employees found'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || roleFilter ? 'Try adjusting your search or filter.' : 'Create your first employee to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Name</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Email</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Role</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Status</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Created</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="py-4 px-6 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-300 font-semibold text-sm">
                            {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{u.email}</td>
                      <td className="py-4 px-6 border-r border-slate-200 dark:border-slate-700">
                        <Badge
                          variant="outline"
                          className={
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                              : u.role === 'ADMIN'
                              ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                              : u.role === 'AREA_HEAD'
                              ? 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800'
                              : u.role === 'BDM'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : u.role === 'BDM_TEAM_LEADER'
                              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : u.role === 'SAM'
                              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : u.role === 'SAM_HEAD'
                              ? 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
                              : u.role === 'SAM_EXECUTIVE'
                              ? 'bg-lime-100 dark:bg-lime-900 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800'
                              : u.role === 'FEASIBILITY_TEAM'
                              ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : u.role === 'OPS_TEAM'
                              ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                              : u.role === 'DOCS_TEAM'
                              ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                              : u.role === 'ACCOUNTS_TEAM'
                              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : u.role === 'DELIVERY_TEAM'
                              ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                              : u.role === 'STORE_MANAGER'
                              ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : u.role === 'NOC'
                              ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                              : u.role === 'BDM_CP'
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }
                        >
                          {u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.role === 'ADMIN' ? 'Admin' : u.role === 'AREA_HEAD' ? 'Area Head' : u.role === 'BDM' ? 'BDM' : u.role === 'BDM_TEAM_LEADER' ? 'BDM Team Leader' : u.role === 'SAM' ? 'SAM' : u.role === 'SAM_HEAD' ? 'SAM Head' : u.role === 'SAM_EXECUTIVE' ? 'SAM Executive' : u.role === 'FEASIBILITY_TEAM' ? 'Feasibility Team' : u.role === 'OPS_TEAM' ? 'OPS Team' : u.role === 'DOCS_TEAM' ? 'Docs Team' : u.role === 'ACCOUNTS_TEAM' ? 'Accounts Team' : u.role === 'DELIVERY_TEAM' ? 'Delivery Team' : u.role === 'STORE_MANAGER' ? 'Store Manager' : u.role === 'NOC' ? 'NOC' : u.role === 'NOC_HEAD' ? 'NOC Head' : u.role === 'SALES_DIRECTOR' ? 'Sales Director' : u.role === 'BDM_CP' ? 'BDM (CP)' : 'ISR'}
                        </Badge>
                        {u.teamLeader && (
                          <span className="block text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                            {u.role === 'NOC' ? 'Head' : u.role === 'SAM_EXECUTIVE' ? 'Head' : 'TL'}: {u.teamLeader.name}
                          </span>
                        )}
                        {/* Show team members count for leaders */}
                        {(() => {
                          const memberCount = users.filter(m => m.teamLeaderId === u.id).length;
                          if (memberCount === 0) return null;
                          return <span className="block text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{memberCount} team member{memberCount > 1 ? 's' : ''}</span>;
                        })()}
                      </td>
                      <td className="py-4 px-6 border-r border-slate-200 dark:border-slate-700">
                        <Badge
                          variant="outline"
                          className={u.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                          }
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-sm border-r border-slate-200 dark:border-slate-700">{formatDate(u.createdAt)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(u)}
                            className="text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          {u.id !== user.id && !isTL && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(u)}
                              className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title="Delete User"
        description={`Are you sure you want to delete "${confirmDialog.userName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirmed}
      />

      {/* Modal */}
      {showModal && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {editingUser ? (isTL ? 'Edit BDM' : 'Edit Employee') : (isTL ? 'Add New BDM' : 'Add New Employee')}
              </h2>
            </div>

            <div className="p-6">
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-orange-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-orange-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    Mobile Number <span className="text-slate-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="Enter mobile number"
                    className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-orange-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    Password {editingUser ? <span className="text-slate-500 font-normal">(leave empty to keep current)</span> : <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                    className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-orange-600"
                    required={!editingUser}
                  />
                </div>

                {isTL ? (
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Role</Label>
                    <div className="h-11 px-3 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                      BDM (Business Development Manager)
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Role <span className="text-red-500">*</span></Label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="AREA_HEAD">Area Head</option>
                        <option value="ISR">ISR (Inside Sales Representative)</option>
                        <option value="BDM">BDM (Business Development Manager)</option>
                        <option value="BDM_TEAM_LEADER">BDM Team Leader</option>
                        <option value="SAM">SAM (Sales Account Manager)</option>
                        <option value="SAM_HEAD">SAM Head</option>
                        <option value="SAM_EXECUTIVE">SAM Executive</option>
                        <option value="FEASIBILITY_TEAM">Feasibility Team</option>
                        <option value="OPS_TEAM">OPS Team</option>
                        <option value="DOCS_TEAM">Docs Verification Team</option>
                        <option value="ACCOUNTS_TEAM">Accounts Team</option>
                        <option value="DELIVERY_TEAM">Delivery Team</option>
                        <option value="STORE_MANAGER">Store Manager</option>
                        <option value="NOC">NOC</option>
                        <option value="NOC_HEAD">NOC Head</option>
                        <option value="SALES_DIRECTOR">Sales Director</option>
                        <option value="BDM_CP">BDM (Channel Partner)</option>
                      </select>
                    </div>

                    {/* Reports To — show for roles that have a hierarchy leader */}
                    {(() => {
                      const leaderConfig = {
                        'BDM': { label: 'BDM Team Leader', filterRole: 'BDM_TEAM_LEADER' },
                        'BDM_CP': { label: 'BDM Team Leader', filterRole: 'BDM_TEAM_LEADER' },
                        'ISR': { label: 'BDM Team Leader', filterRole: 'BDM_TEAM_LEADER' },
                        'NOC': { label: 'NOC Head', filterRole: 'NOC_HEAD' },
                        'SAM_EXECUTIVE': { label: 'SAM Head', filterRole: 'SAM_HEAD' },
                      };
                      const config = leaderConfig[formData.role];
                      if (!config) return null;
                      return (
                        <div className="space-y-2">
                          <Label htmlFor="teamLeaderId" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Reports To ({config.label})</Label>
                          <select
                            id="teamLeaderId"
                            name="teamLeaderId"
                            value={formData.teamLeaderId}
                            onChange={handleChange}
                            className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                          >
                            <option value="">None</option>
                            {users.filter(u => u.role === config.filterRole && u.isActive).map(tl => (
                              <option key={tl.id} value={tl.id}>{tl.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 border-slate-300 dark:border-slate-700 rounded focus:ring-orange-600"
                  />
                  <Label htmlFor="isActive" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Active Account
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-600"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : editingUser ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
