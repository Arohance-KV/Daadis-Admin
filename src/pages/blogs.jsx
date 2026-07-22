import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchAllBlogs,
  createBlogAsync,
  updateBlogAsync,
  deleteBlogAsync,
} from '../redux/slices/blogsSlice';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import EmailEditor from 'react-email-editor';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { cn } from '../lib/utils';
import { Card, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const blogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  featuredImage: z.string().optional(),
  featuredImageFile: z.any().optional(),
  blogContent: z.object({
    design: z.any(),
    markup: z.string(),
  }),
});

export default function Blogs() {
  const dispatch = useDispatch();
  const { blogs, loading, error } = useSelector((state) => state.blogs);

  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [search, setSearch] = useState('');

  const form = useForm({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      title: '',
      featuredImage: '',
      featuredImageFile: null,
      blogContent: { design: {}, markup: '' },
    },
  });

  const emailEditorRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAllBlogs());
  }, [dispatch]);

  // Load existing blog into form for editing
  const startEditBlog = (blog) => {
    setEditingBlog(blog);
    form.reset({
      title: blog.title,
      featuredImage: blog.blogImgUrl?.url || '',
      featuredImageFile: null,
      blogContent: blog.blogContent || { design: {}, markup: '' },
    });
    setImagePreview(blog.blogImgUrl?.url || '');
    setFileToUpload(null);
    setShowModal(true);

    // Load design JSON in editor after a slight delay to ensure editor is ready
    setTimeout(() => {
      if (emailEditorRef.current && blog.blogContent?.design) {
        emailEditorRef.current.editor.loadDesign(blog.blogContent.design);
      }
    }, 500);
  };

  const onSubmit = async (values) => {
    try {
      const exportData = await new Promise((resolve, reject) => {
        if (!emailEditorRef.current) {
          reject(new Error('Email editor not ready'));
          return;
        }
        emailEditorRef.current.editor.exportHtml((data) => resolve(data));
      });

      const { design, html } = exportData;

      const formData = new FormData();
      formData.append('blogName', values.title);
      formData.append('title', values.title);
      formData.append('designData', JSON.stringify(design));
      formData.append('markup', html);

      if (fileToUpload) {
        formData.append('blogImage', fileToUpload);
      } else if (imagePreview && !editingBlog) {
        throw new Error('Please upload a banner image');
      }
      // For edit: no new file but a preview means keep the existing image

      if (editingBlog) {
        await dispatch(updateBlogAsync({ id: editingBlog._id || editingBlog.id, updates: formData })).unwrap();
        await dispatch(fetchAllBlogs());
        toast.success('Blog updated successfully');
      } else {
        await dispatch(createBlogAsync({ formData })).unwrap();
        toast.success('Blog created successfully');
      }

      form.reset();
      setImagePreview('');
      setFileToUpload(null);
      setEditingBlog(null);
      setShowModal(false);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to save blog');
    }
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      form.setValue('featuredImage', previewUrl);
      form.setValue('featuredImageFile', file);
    }
  };

  const resetModal = () => {
    setEditingBlog(null);
    form.reset({
      title: '',
      featuredImage: '',
      featuredImageFile: null,
      blogContent: { design: {}, markup: '' },
    });
    setImagePreview('');
    setFileToUpload(null);
    if (emailEditorRef.current) {
      emailEditorRef.current.editor.loadDesign({});
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const filtered = (blogs || []).filter((b) =>
    (b.title || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Blogs</h1>
          <p className="mt-0.5 text-sm text-muted">Write and manage articles for the store</p>
        </div>
        <button
          onClick={() => { resetModal(); setShowModal(true); }}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5" />
          New Blog
        </button>
      </div>

      {error && (
        <div className="rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {String(error)}
        </div>
      )}

      {/* List */}
      <Card>
        <CardContent>
          <div className="relative mb-4 w-full sm:max-w-xs">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search blogs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {loading && (blogs || []).length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search ? 'No blogs match' : 'No blogs yet'}
              message={search ? 'Try a different search term.' : 'Write your first article to get started.'}
              icon={DocumentTextIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4">Blog</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((blog) => (
                    <tr key={blog._id || blog.id} className="hover:bg-surface/60">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-3">
                          {blog.blogImgUrl?.url ? (
                            <img
                              src={blog.blogImgUrl.url}
                              alt=""
                              className="h-10 w-14 shrink-0 rounded-[8px] border border-border object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-10 w-14 shrink-0 place-items-center rounded-[8px] bg-surface-raised">
                              <PhotoIcon className="h-5 w-5 text-muted" />
                            </div>
                          )}
                          <span className="max-w-md truncate font-medium text-ink">{blog.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-muted">{formatDate(blog.createdAt)}</td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEditBlog(blog)}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Edit blog"
                            aria-label={`Edit ${blog.title}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this blog?')) {
                                dispatch(deleteBlogAsync(blog._id || blog.id));
                              }
                            }}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                            title="Delete blog"
                            aria-label={`Delete ${blog.title}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-right text-xs text-muted">{filtered.length} blog{filtered.length === 1 ? '' : 's'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogTrigger hidden />
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? 'Edit Blog' : 'Create Blog'}</DialogTitle>
            <DialogDescription>
              {editingBlog ? 'Update your blog details below' : 'Enter blog details below'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" {...field} placeholder="Enter blog title" />
                  {fieldState.error && (
                    <p className="mt-1 text-sm text-danger">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            <div>
              <Label htmlFor="featuredImage">Banner Image {!editingBlog && '*'}</Label>
              <input
                id="featuredImage"
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-[8px] file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Banner preview"
                  className={cn('mt-2 h-32 w-48 rounded-[10px] border border-border object-cover')}
                />
              )}
            </div>

            <div>
              <Label>Content *</Label>
              <div className="overflow-hidden rounded-[10px] border border-border">
                <EmailEditor
                  ref={emailEditorRef}
                  onLoad={() => {
                    if (editingBlog?.blogContent?.design) {
                      setTimeout(() => {
                        emailEditorRef.current?.editor.loadDesign(editingBlog.blogContent.design);
                      }, 100);
                    }
                  }}
                  minHeight={400}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetModal(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : editingBlog ? 'Update Blog' : 'Create Blog'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
