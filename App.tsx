
import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import ResourceCard from './components/ResourceCard';
import ResourceForm from './components/ResourceForm';
import Profile from './components/Profile';
import { Resource, View, User, Category, Comment } from './types';

const API = 'http://localhost/paperpup/Api.php';

const CATEGORIES: (Category | 'All')[] = ['All', 'Mathematics', 'Science', 'History', 'Literature', 'Coding', 'Art', 'Other'];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [previousView, setPreviousView] = useState<View>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedContributorId, setSelectedContributorId] = useState<string | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Undo feature states
  const [lastDeletedComment, setLastDeletedComment] = useState<Comment | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  // API
  const api = async (action: string, body?: any) => {
    const res = await fetch(`${API}?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      console.error("API returned non-JSON:", text);
      throw new Error("Invalid API response");
    }
  };

  // Load categories from API
  const loadCategories = async () => {
    const res = await api('getCategories');
    setCategories(res);
  };

  // Fetch Data

  // Load resources from API
  const loadResources = async () => {
    setResourcesLoading(true);

    try {
      const userId = currentUser?.id ? Number(currentUser.id) : null;
      const res = await api('getResources', { userId });

      if (!Array.isArray(res)) {
        console.error('getResources did not return an array', res);
        setResources([]);
        return;
      }

      const mapped: Resource[] = res.map((r: any) => ({
        id: String(r.id),
        title: r.title ?? '',
        description: r.description ?? '',
        url: r.url ?? '',
        category: r.category ?? 'Other',
        category_id: Number(r.category_id) || 0,
        dateAdded: r.dateAdded,
        authorId: String(r.authorId),
        authorName: r.authorName || 'Unknown',
        upvotes: Array.isArray(r.upvotes) ? r.upvotes.map(String) : [],
        isPublic: Boolean(r.is_public),
        course_code: r.course_code ?? '',
      }));

      setResources(mapped);
    } catch (err) {
      console.error('Failed to load resources', err);
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };


  // Load comments for a resource
  const loadComments = async (resourceId: string) => {
    const res = await api('getComments', { resource_id: Number(resourceId) });
    setComments(
      res.map((c: any) => ({
        id: String(c.id),
        resourceId: String(c.resource_id),
        userId: String(c.user_id),
        userName: c.user_name,
        text: c.content,
        date: c.created_at,
      }))
    );
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadResources();
  }, [currentUser?.id]);

  const navigateTo = (view: View) => {
    setPreviousView(currentView);
    setCurrentView(view);
  };

  // Authentication handler
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const action = authMode === 'signin' ? 'login' : 'register';

    const payload =
      authMode === 'signin'
        ? {
          email: fd.get('email'),
          password: fd.get('password'),
        }
        : {
          name: fd.get('name'),
          email: fd.get('email'),
          password: fd.get('password'),
          course_code: fd.get('major'),
        };

    try {
      const res = await api(action, payload);

      if (res.user) {
        setCurrentUser(res.user);
        loadResources();
        if (authMode === 'signin') {
          toast.success('Welcome back! 👋');
        } else {
          toast.success('Account created successfully! 🎉');
        }
        return;
      }

      toast.error(res.error || 'Authentication failed');
    } catch (err) {
      console.error(err);
      toast.error('Authentication failed due to network or server error');
    }
  };

  // Resource Save/Update/Delete handlers
  const handleSaveResource = async () => {
    setIsFormOpen(false);
    setEditingResource(null);
    await loadResources();
    if (editingResource) {
      toast.success('Resource updated successfully! ✨');
    } else {
      toast.success('Resource created successfully! 🎉');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (window.confirm('Remove this resource?')) {
      await api('deleteResource', { resource_id: id });
      setResources(prev => prev.filter(r => r.id !== id));
      setComments(prev => prev.filter(c => c.resourceId !== id));
      loadResources();
      toast.success('Resource deleted! 🗑️');
    }
  };

  // Upvote handler
  const handleToggleUpvote = async (resourceId: string) => {
    if (!currentUser) return;

    try {
      const response = await api('toggleLike', { resource_id: Number(resourceId), user_id: Number(currentUser.id) });

      if (response && response.id) {
        // Handle both string and array formats
        let upvotesArray = [];

        if (typeof response.upvotes === 'string' && response.upvotes) {
          upvotesArray = response.upvotes.split(',').map(id => id.trim());
        } else if (Array.isArray(response.upvotes)) {
          upvotesArray = response.upvotes.map(String);
        }

        setResources(prev =>
          prev.map(r => r.id === resourceId ? { ...r, upvotes: upvotesArray } : r)
        );
      }
    } catch (err) {
      console.error('Failed to toggle upvote', err);
    }
  };

  // Comment handlers
  const handleAddComment = async (resourceId: string, text: string) => {
    if (!currentUser) return;
    try {
      await api('addComment', { resource_id: Number(resourceId), user_id: Number(currentUser.id), content: text });
      // Reload comments for this resource
      await loadComments(resourceId);
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const commentToDelete = comments.find(c => c.id === commentId);
    if (commentToDelete) {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setLastDeletedComment(commentToDelete);
      setComments(prev => prev.filter(c => c.id !== commentId));
      undoTimeoutRef.current = window.setTimeout(() => setLastDeletedComment(null), 5000);
      await api('deleteComment', { comment_id: commentId });
    }
  };

  const handleUndoDeleteComment = () => {
    if (lastDeletedComment) {
      setComments(prev => [lastDeletedComment, ...prev]);
      setLastDeletedComment(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  // View Contributor Profile
  const handleViewContributor = (id: string) => {
    if (currentUser && id === String(currentUser.id)) {
      navigateTo('Profile');
    } else {
      setSelectedContributorId(id);
      navigateTo(id === String(currentUser?.id) ? 'Profile' : 'ContributorProfile');
    }
  };



  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-gradient-to-tr from-indigo-100 to-white">
        <Toaster position="top-center" />
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">PaperPup</h1>
            <p className="text-slate-500 font-medium">Classroom Resource Hub</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button onClick={() => setAuthMode('signin')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${authMode === 'signin' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Sign In</button>
            <button onClick={() => setAuthMode('signup')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${authMode === 'signup' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Sign Up</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <input required name="name" placeholder="Full Name" className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10" />
                <input required name="major" placeholder="Major (e.g. CS)" className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10" />
              </>
            )}
            <input required name="email" type="email" placeholder="Edu Email" className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10" />
            <input required name="password" type="password" placeholder="Password" className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10" />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all">
              {authMode === 'signin' ? 'Enter Hub' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filters
  const currentUserId = String(currentUser.id);
  const dashboardResources = resources
    .filter(r => r.isPublic)
    .slice(0, 4);
  const myResources = resources.filter(r => r.authorId === currentUserId);
  const filteredLibrary = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    return matchesSearch && matchesCategory && r.isPublic;
  });

  const renderResourceList = (items: Resource[], canManage: boolean = false) => {
    if (resourcesLoading || resources.length === 0) {
      return (
        <div className="text-center py-20 text-slate-400 font-medium">
          Loading resources...
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
          <p className="text-slate-400 font-medium">No resources available.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {items.map(r => (
          <ResourceCard
            key={r.id}
            resource={r}
            currentUserId={currentUserId}
            canManage={canManage}
            onToggleUpvote={handleToggleUpvote}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onEdit={(res) => {
              setEditingResource(res);
              setIsFormOpen(true);
            }}
            onDelete={handleDeleteResource}
            onViewContributor={handleViewContributor}
          />
        ))}
      </div>
    );
  };

  const contributor: User | undefined = selectedContributorId
    ? (() => {
      const res = resources.find(r => r.authorId === selectedContributorId);
      return res
        ? { id: res.authorId, name: res.authorName, email: '', major: '', course_code: res.course_code }
        : undefined;
    })()
    : undefined;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-inter relative">
      <Toaster position="top-center" />
      <Sidebar
        currentView={currentView}
        setCurrentView={navigateTo}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={() => setCurrentUser(null)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-30">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden text-slate-500 mr-4 hover:bg-slate-50 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {currentView === 'MyResources' ? 'My Resources' : currentView === 'Library' ? 'Library' : currentView === 'ContributorProfile' ? 'Student Profile' : currentView}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-1">{currentUser.major}</p>
            </div>
            <button onClick={() => navigateTo('Profile')} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold hover:scale-105 transition-transform">
              {currentUser.name.charAt(0)}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-8">
            {currentView === 'Dashboard' && (
              <>
                <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black mb-2">Paper Hub</h3>
                    <p className="opacity-80 text-lg mb-8 max-w-sm">Manage your class resources and discover shared notes from the class.</p>
                    <div className="flex space-x-4">
                      <button onClick={() => navigateTo('Library')} className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold shadow-lg">Browse Library</button>
                      <button onClick={() => setIsFormOpen(true)} className="bg-indigo-500/30 backdrop-blur-md text-white px-6 py-2.5 rounded-xl font-bold border border-white/20">Upload Notes</button>
                    </div>
                  </div>
                </div>
                <section>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                    <span className="mr-2">🔥</span> Trending Resources
                  </h4>
                  {renderResourceList(dashboardResources.slice().sort((a, b) => b.upvotes.length - a.upvotes.length).slice(0, 4))}
                </section>
              </>
            )}

            {currentView === 'Library' && (
              <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <div className="relative">
                    <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      type="text"
                      placeholder="Search shared resources..."
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {renderResourceList(filteredLibrary)}
                {filteredLibrary.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
                    <p className="text-slate-400 font-medium">No resources found in the library.</p>
                  </div>
                )}
              </div>
            )}

            {currentView === 'MyResources' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-slate-500 font-medium">You have shared {myResources.length} items</p>
                  <button onClick={() => setIsFormOpen(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-600 transition-colors">New Upload</button>
                </div>
                {renderResourceList(myResources, true)}
              </div>
            )}

            {currentView === 'Profile' && currentUser && (
              <Profile
                user={currentUser}
                currentUserId={String(currentUser.id)}
                resources={resources}
                onUpdate={(d: any) => setCurrentUser({ ...currentUser, ...d })}
                onToggleUpvote={handleToggleUpvote}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                onEdit={(res) => {
                  setEditingResource(res);
                  setIsFormOpen(true);
                }}
                onDelete={handleDeleteResource}
                onViewContributor={handleViewContributor}
              />
            )}

            {currentView === 'ContributorProfile' && contributor && currentUser && (
              <Profile
                user={contributor}
                currentUserId={String(currentUser.id)}
                onBack={() => setCurrentView(previousView)}
                resources={resources}
                onToggleUpvote={handleToggleUpvote}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                onEdit={(res) => {
                  setEditingResource(res);
                  setIsFormOpen(true);
                }}
                onDelete={handleDeleteResource}
                onViewContributor={handleViewContributor}
              />
            )}
          </div>
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <ResourceForm initialData={editingResource} currentUser={currentUser} onSave={handleSaveResource} onCancel={() => { setIsFormOpen(false); setEditingResource(null); }} />
          </div>
        )}
      </main>

      {/* Undo Notification Toast */}
      {lastDeletedComment && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-700 backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Comment deleted</span>
            </div>
            <button
              onClick={handleUndoDeleteComment}
              className="text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest text-[10px] bg-white/5 px-3 py-1.5 rounded-lg transition-colors border border-white/5"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
