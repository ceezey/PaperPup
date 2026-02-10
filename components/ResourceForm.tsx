import React, { useState, useEffect } from 'react';
import { Resource, User } from '../types';

interface Category {
  id: number;
  name: string;
}

type ResourceFormProps = {
  initialData?: Resource | null;
  currentUser: User | null;
  onSave: (data: { title: string; description: string; url: string; category_id: number }) => void;
  onCancel: () => void;
};

const ResourceForm: React.FC<ResourceFormProps> = ({ initialData, currentUser, onSave, onCancel }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    url: initialData?.url || '',
    description: initialData?.description || '',
    category_id: initialData?.category_id || 0, // Will be set after fetching categories
    isPublic: initialData?.isPublic ?? true,
  });

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost/paperpup/Api.php?action=getCategories');
        const data: Category[] = await res.json();
        setCategories(data);

        // If initialData exists, match its category_id to API categories
        if (initialData && data.find(c => c.id === initialData.category_id)) {
          setFormData(fd => ({ ...fd, category_id: initialData.category_id }));
        } else if (!initialData && data.length > 0) {
          // Default to first category if none selected
          setFormData(fd => ({ ...fd, category_id: data[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    fetchCategories();
  }, [initialData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const action = initialData?.id ? 'updateResource' : 'createResource';

      const payload = {
        ...formData,
        user_id: currentUser?.id,
      };

      // For update, use resource_id; for create, no id needed
      if (initialData?.id) {
        payload['resource_id'] = initialData.id;
      }

      const res = await fetch(`http://localhost/paperpup/Api.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save resource');
      }

      onSave(formData);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-xl mx-auto border border-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {initialData ? 'Edit Resource' : 'Add Resource'}
          </h2>
          <p className="text-slate-500 mt-1">Fill in the details for your resource.</p>
        </div>
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Resource Title</label>
          <input
            required
            type="text"
            className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50/50"
            placeholder="e.g., Quantum Physics 101 Notes"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Resource URL</label>
          <input
            required
            type="url"
            className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50/50"
            placeholder="https://google.drive/..."
            value={formData.url}
            onChange={e => setFormData({ ...formData, url: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
            <select
              className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none bg-slate-50/50 appearance-none"
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Visibility</label>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: true })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.isPublic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: false })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!formData.isPublic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Private
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
          <textarea
            rows={3}
            className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none bg-slate-50/50"
            placeholder="Help classmates understand what this is..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all text-lg"
          >
            {initialData ? 'Update' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResourceForm;