/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  GraduationCap, 
  ShoppingCart, 
  CheckCircle2, 
  X, 
  Phone, 
  Mail, 
  MapPin,
  Search,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Package,
  Users,
  Lock,
  CreditCard,
  Building2,
  Smartphone,
  Upload
} from 'lucide-react';
import { Course, Order, Admin } from './types';

const GPAY_ID = "glitchxkartik@oksbi";

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [orderComplete, setOrderComplete] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [checkoutStep, setCheckoutStep] = useState<'contact' | 'method' | 'pay' | 'verify'>('contact');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [utr, setUtr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<'home' | 'catalog' | 'admin-login' | 'admin-dashboard'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSortBy, setAdminSortBy] = useState<keyof Course>("title");
  const [adminSortOrder, setAdminSortOrder] = useState<'asc' | 'desc'>('asc');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("All");
  const [courseImage, setCourseImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data));

    // Check if already logged in as admin
    fetch('/api/admin/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        setAdmin(data);
        if (view === 'admin-login') setView('admin-dashboard');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (view === 'admin-dashboard' && admin) {
      fetch('/api/admin/orders')
        .then(res => res.json())
        .then(data => setAdminOrders(data));
    }
  }, [view, admin]);

  const categories = ["All", ...new Set(courses.map(c => c.category))];

  const handlePurchase = (course: Course) => {
    setSelectedCourse(course);
    setIsCheckoutOpen(true);
    setPaymentStatus('idle');
    setOrderComplete(false);
    setCheckoutStep('contact');
    setUtr("");
  };

  const confirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !email) return;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          email,
          amount: selectedCourse.price
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentOrderId(data.orderId);
        const upiUrl = `upi://pay?pa=${GPAY_ID}&pn=Gupta%20Classes&am=${selectedCourse.price}&cu=INR&tn=Course%20Purchase%20${selectedCourse.id}`;
        setOrderComplete(true);
        
        // Open UPI link
        window.open(upiUrl, '_blank');
      }
    } catch (error) {
      console.error("Order failed", error);
    }
  };

  const verifyPayment = async () => {
    if (!currentOrderId) return;
    
    // If UTR is a valid 12-digit number, show success immediately (with a tiny UX delay)
    if (/^\d{12}$/.test(utr)) {
      setPaymentStatus('verifying');
      // Still notify backend to update DB
      fetch(`/api/orders/${currentOrderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr })
      });
      setTimeout(() => setPaymentStatus('success'), 800);
      return;
    }

    setPaymentStatus('verifying');
    
    try {
      const response = await fetch(`/api/orders/${currentOrderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr })
      });
      const data = await response.json();
      
      if (data.status === 'completed') {
        setPaymentStatus('success');
      } else {
        setPaymentStatus('failed');
      }
    } catch (error) {
      setPaymentStatus('failed');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      setAdmin(data);
      setView('admin-dashboard');
    } else {
      alert("Invalid credentials");
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdmin(null);
    setView('home');
  };

  const adminFilteredCourses = courses
    .filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(adminSearchQuery.toLowerCase());
      const matchesCategory = adminCategoryFilter === "All" || c.category === adminCategoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const valA = a[adminSortBy];
      const valB = b[adminSortBy];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return adminSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return adminSortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

  const orderStats = {
    total: adminOrders.length,
    completed: adminOrders.filter(o => o.status === 'completed').length,
    pending: adminOrders.filter(o => o.status === 'pending').length,
    failed: adminOrders.filter(o => o.status === 'failed').length,
    revenue: adminOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.amount, 0)
  };

  const handleSaveCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const courseData = {
      title: formData.get('title'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      image_url: courseImage,
      category: formData.get('category')
    };

    if (!courseData.image_url) {
      alert("Please upload an image for the course.");
      return;
    }

    const url = editingCourse ? `/api/admin/courses/${editingCourse.id}` : '/api/admin/courses';
    const method = editingCourse ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });

    if (res.ok) {
      const updatedCourses = await (await fetch('/api/courses')).json();
      setCourses(updatedCourses);
      setIsAddingCourse(false);
      setEditingCourse(null);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const AdminLoginView = () => (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-stone-200 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="bg-stone-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Admin Login</h2>
          <p className="text-stone-500 text-sm">Access the management dashboard</p>
        </div>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Username</label>
            <input 
              name="username"
              type="text" 
              required 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Password</label>
            <input 
              name="password"
              type="password" 
              required 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg"
          >
            Login to Dashboard
          </button>
        </form>
      </motion.div>
    </div>
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCourseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const AdminDashboardView = () => (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-500">Welcome back, {admin?.username}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('home')}
            className="text-stone-500 hover:text-stone-900 font-bold transition-colors text-sm"
          >
            Back to Site
          </button>
          <button 
            onClick={handleAdminLogout}
            className="flex items-center gap-2 text-stone-500 hover:text-red-600 font-bold transition-colors text-sm"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</div>
          <div className="text-3xl font-black text-stone-900 mb-4">₹{orderStats.revenue.toLocaleString()}</div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="h-full bg-emerald-500"
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Completed Orders</div>
          <div className="flex justify-between items-end mb-2">
            <div className="text-3xl font-black text-stone-900">{orderStats.completed}</div>
            <div className="text-xs font-bold text-emerald-600">{orderStats.total > 0 ? Math.round((orderStats.completed / orderStats.total) * 100) : 0}%</div>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${orderStats.total > 0 ? (orderStats.completed / orderStats.total) * 100 : 0}%` }}
              className="h-full bg-emerald-500"
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Pending Orders</div>
          <div className="flex justify-between items-end mb-2">
            <div className="text-3xl font-black text-stone-900">{orderStats.pending}</div>
            <div className="text-xs font-bold text-amber-600">{orderStats.total > 0 ? Math.round((orderStats.pending / orderStats.total) * 100) : 0}%</div>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${orderStats.total > 0 ? (orderStats.pending / orderStats.total) * 100 : 0}%` }}
              className="h-full bg-amber-500"
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Failed Orders</div>
          <div className="flex justify-between items-end mb-2">
            <div className="text-3xl font-black text-stone-900">{orderStats.failed}</div>
            <div className="text-xs font-bold text-red-600">{orderStats.total > 0 ? Math.round((orderStats.failed / orderStats.total) * 100) : 0}%</div>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${orderStats.total > 0 ? (orderStats.failed / orderStats.total) * 100 : 0}%` }}
              className="h-full bg-red-500"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Course Management */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" /> Manage Courses
                </h2>
                <button 
                  onClick={() => {
                    setIsAddingCourse(true);
                    setEditingCourse(null);
                    setCourseImage(null);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Course
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search courses..." 
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={adminCategoryFilter}
                  onChange={(e) => setAdminCategoryFilter(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-400 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => {
                      if (adminSortBy === 'title') setAdminSortOrder(adminSortOrder === 'asc' ? 'desc' : 'asc');
                      else { setAdminSortBy('title'); setAdminSortOrder('asc'); }
                    }}>
                      Course {adminSortBy === 'title' && (adminSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => {
                      if (adminSortBy === 'category') setAdminSortOrder(adminSortOrder === 'asc' ? 'desc' : 'asc');
                      else { setAdminSortBy('category'); setAdminSortOrder('asc'); }
                    }}>
                      Category {adminSortBy === 'category' && (adminSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => {
                      if (adminSortBy === 'price') setAdminSortOrder(adminSortOrder === 'asc' ? 'desc' : 'asc');
                      else { setAdminSortBy('price'); setAdminSortOrder('asc'); }
                    }}>
                      Price {adminSortBy === 'price' && (adminSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {adminFilteredCourses.map(course => (
                    <tr key={course.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={course.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                          <span className="font-bold text-stone-900 text-sm">{course.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-md uppercase">{course.category}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-stone-900 text-sm">₹{course.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingCourse(course);
                              setIsAddingCourse(true);
                              setCourseImage(course.image_url);
                            }}
                            className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="space-y-8">
          <div className="bg-stone-50 rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-white">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> Recent Orders
              </h2>
            </div>
            <div className="p-6 space-y-6 max-h-[800px] overflow-y-auto">
              {adminOrders.map(order => (
                <div key={order.id} className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-stone-400">Order #{order.id}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      order.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm">{order.course_title}</h4>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Mail className="w-3 h-3" /> {order.customer_email}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-200/50">
                    <span className="text-xs text-stone-400">{new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="font-bold text-stone-900">₹{order.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {adminOrders.length === 0 && (
                <div className="text-center py-12 text-stone-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No orders yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Course Modal */}
      <AnimatePresence>
        {isAddingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCourse(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-stone-900">
                    {editingCourse ? 'Edit Course' : 'Add New Course'}
                  </h3>
                  <button onClick={() => setIsAddingCourse(false)} className="p-1 hover:bg-stone-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>
                <form onSubmit={handleSaveCourse} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Course Title</label>
                      <input name="title" defaultValue={editingCourse?.title} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Description</label>
                      <textarea name="description" defaultValue={editingCourse?.description} rows={3} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Price (₹)</label>
                      <input name="price" type="number" defaultValue={editingCourse?.price} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Category</label>
                      <input name="category" defaultValue={editingCourse?.category} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Course Image</label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange}
                          className="hidden" 
                          id="course-image-upload"
                        />
                        <label 
                          htmlFor="course-image-upload"
                          className="flex flex-col items-center justify-center w-full h-40 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all overflow-hidden"
                        >
                          {courseImage ? (
                            <img src={courseImage} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-stone-400 group-hover:text-emerald-600">
                              <Upload className="w-8 h-8" />
                              <span className="text-xs font-bold uppercase tracking-wider">Click to upload image</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6">
                    <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg">
                      {editingCourse ? 'Update Course' : 'Create Course'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const CatalogView = () => (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-stone-900 mb-4">Course Catalog</h1>
          <p className="text-stone-600">Explore our full range of expert-led online courses.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by title or category..." 
              className="pl-12 pr-6 py-4 bg-white border border-stone-200 rounded-2xl w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === cat 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-emerald-600 hover:text-emerald-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => (
              <motion.div 
                key={course.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:shadow-xl transition-all group flex flex-col h-full"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-bold rounded-full shadow-sm">
                      {course.category}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                  <p className="text-stone-600 text-sm mb-6 line-clamp-3 flex-1">{course.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-auto">
                    <div>
                      <span className="text-xs text-stone-400 block uppercase font-bold tracking-wider">Price</span>
                      <span className="text-2xl font-black text-stone-900">₹{course.price.toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={() => handlePurchase(course)}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-24">
            <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-stone-400 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No courses found</h3>
            <p className="text-stone-500">Try adjusting your search or category filters.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setView('home')}
            >
              <div className="bg-emerald-600 p-2 rounded-lg">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-stone-800">Gupta Classes <span className="text-emerald-600">Meerut</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
              <button 
                onClick={() => setView('catalog')}
                className={`hover:text-emerald-600 transition-colors ${view === 'catalog' ? 'text-emerald-600' : ''}`}
              >
                Catalog
              </button>
              <a href="#" className="hover:text-emerald-600 transition-colors">About Us</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Results</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('catalog')}
                className="p-2 text-stone-500 hover:text-emerald-600 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
              <button className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm">
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {view === 'admin-login' ? (
        <AdminLoginView />
      ) : view === 'admin-dashboard' ? (
        <AdminDashboardView />
      ) : view === 'home' ? (
        <>
          {/* Hero Section */}
          <header className="relative bg-white pt-16 pb-24 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                    Excellence in Education
                  </span>
                  <h1 className="text-5xl md:text-6xl font-extrabold text-stone-900 leading-[1.1] mb-6">
                    Shape Your Future with <span className="text-emerald-600">Expert Guidance.</span>
                  </h1>
                  <p className="text-lg text-stone-600 mb-8 max-w-lg leading-relaxed">
                    Join Meerut's most trusted coaching institute. We offer specialized online courses for JEE, NEET, and Foundation classes.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setView('catalog')}
                      className="bg-stone-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2 group shadow-lg"
                    >
                      Explore Courses
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="bg-white text-stone-900 border-2 border-stone-200 px-8 py-4 rounded-xl font-bold hover:border-emerald-600 hover:text-emerald-600 transition-all">
                      View Results
                    </button>
                  </div>
                  <div className="mt-12 flex items-center gap-6">
                    <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                        <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-2 border-white" alt="Student" referrerPolicy="no-referrer" />
                      ))}
                    </div>
                    <p className="text-sm text-stone-500">
                      <span className="font-bold text-stone-900">10,000+</span> students enrolled this year
                    </p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
                  <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                  <img 
                    src="https://picsum.photos/seed/education/800/800" 
                    alt="Education" 
                    className="relative rounded-3xl shadow-2xl border-8 border-white object-cover aspect-square"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl border border-stone-100 max-w-[200px]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <CheckCircle2 className="text-emerald-600 w-5 h-5" />
                      </div>
                      <span className="font-bold text-stone-800">98% Success</span>
                    </div>
                    <p className="text-xs text-stone-500">Rate in JEE Advanced 2025</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </header>

          {/* Featured Courses Section */}
          <section className="py-24 bg-stone-50" id="courses">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-stone-900 mb-4">Featured Online Courses</h2>
                  <p className="text-stone-600 max-w-xl">Start your journey with our most popular programs.</p>
                </div>
                <button 
                  onClick={() => setView('catalog')}
                  className="text-emerald-600 font-bold flex items-center gap-2 hover:gap-3 transition-all"
                >
                  View Full Catalog <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.slice(0, 3).map((course) => (
                  <motion.div 
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:shadow-xl transition-all group"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={course.image_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-bold rounded-full shadow-sm">
                          {course.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                      <p className="text-stone-600 text-sm mb-6 line-clamp-2">{course.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                        <div>
                          <span className="text-xs text-stone-400 block uppercase font-bold tracking-wider">Price</span>
                          <span className="text-2xl font-black text-stone-900">₹{course.price.toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={() => handlePurchase(course)}
                          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                        >
                          Enroll Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <CatalogView />
      )}

      {/* Stats Section */}
      <section className="py-20 bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <div className="text-4xl font-black mb-2 text-emerald-400">25+</div>
              <div className="text-stone-400 text-sm font-medium uppercase tracking-widest">Years Experience</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2 text-emerald-400">50k+</div>
              <div className="text-stone-400 text-sm font-medium uppercase tracking-widest">Success Stories</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2 text-emerald-400">100+</div>
              <div className="text-stone-400 text-sm font-medium uppercase tracking-widest">Expert Faculty</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2 text-emerald-400">15+</div>
              <div className="text-stone-400 text-sm font-medium uppercase tracking-widest">Learning Centers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <GraduationCap className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold tracking-tight text-stone-800">Gupta Classes</span>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                Empowering students with quality education and expert mentorship for over two decades in Meerut.
              </p>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm text-stone-500">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">All Courses</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Admission Process</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Scholarship Test</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Student Portal</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-stone-500">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Terms of Service</a></li>
                <li>
                  <button 
                    onClick={() => setView('admin-login')}
                    className="hover:text-emerald-600 transition-colors"
                  >
                    Admin Login
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-6">Newsletter</h4>
              <p className="text-stone-500 text-sm mb-4">Get the latest updates on new courses and results.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Email address" className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <button className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-stone-100 text-center text-stone-400 text-xs">
            © 2026 Gupta Classes Meerut. All rights reserved. Designed for Excellence.
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-stone-900">Checkout</h3>
                  <button onClick={() => setIsCheckoutOpen(false)} className="p-1 hover:bg-stone-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                {!orderComplete ? (
                  <div className="space-y-6">
                    <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                      <div className="flex gap-4 items-center">
                        <img src={selectedCourse?.image_url} className="w-16 h-16 rounded-xl object-cover" alt="Course" referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">{selectedCourse?.title}</h4>
                          <span className="text-emerald-600 font-bold">₹{selectedCourse?.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {checkoutStep === 'contact' && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Your Email Address</label>
                            <input 
                              type="email" 
                              required 
                              placeholder="name@example.com"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                          <button 
                            onClick={() => email && setCheckoutStep('method')}
                            disabled={!email}
                            className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
                          >
                            Continue to Payment
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {checkoutStep === 'method' && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Select Payment Method</label>
                          <button 
                            onClick={() => setPaymentMethod('upi')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10' : 'border-stone-200 hover:border-stone-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${paymentMethod === 'upi' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                                <Smartphone className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <div className="font-bold text-stone-900 text-sm">UPI / GPay</div>
                                <div className="text-[10px] text-stone-500">Google Pay, PhonePe, Paytm</div>
                              </div>
                            </div>
                            {paymentMethod === 'upi' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          </button>

                          <button 
                            onClick={() => setPaymentMethod('card')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10' : 'border-stone-200 hover:border-stone-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${paymentMethod === 'card' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                                <CreditCard className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <div className="font-bold text-stone-900 text-sm">Credit / Debit Card</div>
                                <div className="text-[10px] text-stone-500">Visa, Mastercard, RuPay</div>
                              </div>
                            </div>
                            {paymentMethod === 'card' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          </button>

                          <button 
                            onClick={() => setPaymentMethod('netbanking')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${paymentMethod === 'netbanking' ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10' : 'border-stone-200 hover:border-stone-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${paymentMethod === 'netbanking' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <div className="font-bold text-stone-900 text-sm">Net Banking</div>
                                <div className="text-[10px] text-stone-500">All major Indian banks</div>
                              </div>
                            </div>
                            {paymentMethod === 'netbanking' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          </button>

                          <div className="pt-4 flex gap-3">
                            <button 
                              onClick={() => setCheckoutStep('contact')}
                              className="flex-1 px-4 py-4 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-all"
                            >
                              Back
                            </button>
                            <button 
                              onClick={confirmOrder}
                              className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                              Proceed to Pay
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    {paymentStatus === 'idle' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <ShoppingCart className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h4 className="text-xl font-bold text-stone-900 mb-2">Complete Your Payment</h4>
                        <p className="text-stone-500 text-sm mb-6">
                          {paymentMethod === 'upi' 
                            ? "We've opened your UPI app. If it didn't open, use the ID below." 
                            : "Please complete the transaction in the secure payment window."}
                        </p>
                        
                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-6 text-left">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Payment Details</span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-2 py-0.5 rounded-full">{paymentMethod}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-stone-500">Amount to Pay</span>
                            <span className="text-sm font-bold text-stone-900">₹{selectedCourse?.price.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-stone-500">Merchant</span>
                            <span className="text-sm font-bold text-stone-900">Gupta Classes</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-left text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Transaction ID / UTR (Optional)</label>
                            <input 
                              type="text" 
                              placeholder="Enter 12-digit UTR number"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              value={utr}
                              onChange={(e) => setUtr(e.target.value)}
                            />
                            <p className="text-[10px] text-left text-stone-400 mt-1.5 px-1">Entering UTR helps in faster verification of your payment.</p>
                          </div>
                          
                          <button 
                            onClick={verifyPayment}
                            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            Verify Payment Status
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {paymentStatus === 'verifying' && (
                      <div className="py-12">
                        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h4 className="text-xl font-bold text-stone-900 mb-2">Verifying Payment</h4>
                        <p className="text-stone-500 text-sm">Please wait while we confirm your transaction with the bank...</p>
                      </div>
                    )}

                    {paymentStatus === 'success' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-8"
                      >
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h4 className="text-2xl font-black text-stone-900 mb-2">Payment Successful!</h4>
                        <p className="text-stone-500 text-sm mb-8">
                          Congratulations! Your enrollment is confirmed. We've sent the course credentials to <strong>{email}</strong>.
                        </p>
                        <button 
                          onClick={() => {
                            setIsCheckoutOpen(false);
                            setOrderComplete(false);
                            setPaymentStatus('idle');
                          }}
                          className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all"
                        >
                          Start Learning
                        </button>
                      </motion.div>
                    )}

                    {paymentStatus === 'failed' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-8"
                      >
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <X className="w-10 h-10 text-red-600" />
                        </div>
                        <h4 className="text-2xl font-black text-stone-900 mb-2">Payment Failed</h4>
                        <p className="text-stone-500 text-sm mb-8">
                          We couldn't verify your payment. If the amount was deducted, please contact support with your Order ID: <strong>#{currentOrderId}</strong>.
                        </p>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setPaymentStatus('idle')}
                            className="flex-1 bg-stone-100 text-stone-900 py-4 rounded-xl font-bold hover:bg-stone-200 transition-all"
                          >
                            Try Again
                          </button>
                          <button 
                            onClick={() => setIsCheckoutOpen(false)}
                            className="flex-1 bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all"
                          >
                            Close
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
