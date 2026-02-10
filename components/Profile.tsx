import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User, Resource } from '../types';
import ResourceCard from './ResourceCard';

type ProfileProps = {
  user: User;
  currentUserId: string;
  resources: Resource[];
  onUpdate?: (data: Partial<User>) => void;
  onBack?: () => void;
  onToggleUpvote?: (id: string) => void;
  onAddComment?: (id: string, text: string) => void;
  onDeleteComment?: (id: string) => void;
  onEdit?: (resource: Resource) => void;
  onDelete?: (id: string) => void;
  onViewContributor?: (id: string) => void;
};

const Profile: React.FC<ProfileProps> = ({
  user,
  currentUserId,
  resources = [],
  onBack,
  onUpdate,
  onToggleUpvote,
  onAddComment,
  onDeleteComment,
  onEdit,
  onDelete,
  onViewContributor,
  expandedResourceId,
  onToggleExpand
}) => {
  if (!user) {
    return <div className="p-10 text-center text-slate-400">Loading profile…</div>;
  }

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [major, setMajor] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // const isUnchanged = name === user.name && major === user.major;
  const isCurrentUser = String(user.id) === currentUserId;

  const userResources = resources.filter(r => {
    const userId = String(user.id);
    // Show all resources if viewing own profile, only public if viewing others
    if (isCurrentUser) {
      return r.authorId === userId;
    }
    return r.authorId === userId && r.isPublic;
  });
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setMajor(user.major ?? '');
  }, [user]);


  const handleSave = async () => {
    if (!user) return;

    // Validate passwords match if provided
    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const updateData: any = {
        id: user.id,
        name,
        major
      };

      // Add password if provided
      if (newPassword) {
        updateData.password = newPassword;
      }

      const res = await fetch(`http://localhost/paperpup/Api.php?action=updateUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) throw new Error('Failed to update user');

      const updatedUser = { ...user, name, major };
      setEditMode(false);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      if (onUpdate) onUpdate(updatedUser);

      // Show appropriate toast notification
      if (newPassword) {
        toast.success('Profile and password updated! 🔐');
      } else {
        toast.success('Profile updated! ✨');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile');
      toast.error('Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setName(user.name ?? '');
    setMajor(user.major ?? '');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  // Fetch user info
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="h-32 bg-indigo-600 relative">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-6 left-6 flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-xs border border-white/20 hover:bg-white/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </button>
          )}
        </div>
        <div className="px-10 pb-10">
          <div className="relative -mt-16 mb-8 flex justify-between items-end">
            <div className="w-32 h-32 bg-white rounded-3xl p-2 shadow-lg">
              <div className="w-full h-full bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-4xl font-black">
                {user.name?.charAt(0) || '?'}
              </div>
            </div>
            {isCurrentUser && (
              <div className="mb-4">
                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest">
                  My Account
                </span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              {!editMode ? (
                <>
                  <h2 className="text-3xl font-black text-slate-900">{user.name}</h2>
                  <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs mt-1">
                    {user.major || user.course_code}
                  </p>
                  {isCurrentUser && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="mt-4 text-sm font-bold text-indigo-600"
                    >
                      Edit Profile
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    placeholder="Name"
                  />
                  <input
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    placeholder="Major"
                  />
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">Security Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">New Password (optional)</label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep current"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-slate-900">{userResources.length}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Public Resources</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-slate-900">{user.email?.split('@')[1]}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Campus Domain</p>
              </div>
            </div>


            <div className="pt-6 border-t border-slate-100 space-y-4 text-slate-500">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Academic Bio</h4>
              <p className="text-sm leading-relaxed">
                {isCurrentUser
                  ? "This is your public academic profile. Other students can see your name, major, and any resources you mark as public."
                  : `${user.name} is a ${user.major} student sharing study materials with the community.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-xl font-black text-slate-900 mb-6">Shared Resources</h3>
        {userResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {userResources.map(r => (
              <ResourceCard
                key={r.id}
                resource={r}
                currentUserId={currentUserId}
                onToggleUpvote={onToggleUpvote}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewContributor={onViewContributor}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 text-center text-slate-400 font-medium">
            {isCurrentUser ? 'You haven\'t shared any resources yet.' : 'No public resources shared by this user.'}
          </div>
        )}
      </section>

    </div>
  );
};

export default Profile;
