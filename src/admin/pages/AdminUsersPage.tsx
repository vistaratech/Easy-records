import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  firebaseGetUsers, firebaseCreateUser, firebaseDeleteUser,
  firebaseUpdateUserStatus
} from '../../lib/firebaseAuth';
import { extendUserTrial, listBusinesses, listRegisters } from '../../lib/api';
import {
  UserPlus, Trash2, UserCheck, UserX, Search, RefreshCw,
  Shield, Lock, Clock, Sparkles, X,
  Database, Users, ShieldCheck, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ServerUser {
  id: string; name: string; email: string; role: string; status: string;
  createdAt: string; loginHistory?: { type: string; timestamp: string }[];
  lastLogin?: string;
  trialEndsAt?: string | null;
  permissions?: any;
}

function getUserOnlineStatus(user: ServerUser, currentUserId?: string) {
  if (user.status === 'inactive') {
    return {
      status: 'disabled',
      label: 'Disabled',
      badgeBg: '#fef2f2',
      badgeColor: '#991b1b',
      borderColor: '#fecaca',
      dotColor: '#ef4444',
      pulse: false,
      subtext: 'Account inactive'
    };
  }

  const isSelf = currentUserId && String(user.id) === String(currentUserId);
  if (isSelf) {
    return {
      status: 'online',
      label: 'Online',
      badgeBg: '#ecfdf5',
      badgeColor: '#047857',
      borderColor: '#a7f3d0',
      dotColor: '#10b981',
      pulse: true,
      subtext: 'Active now'
    };
  }

  let latestTs: number | null = null;
  if (user.lastLogin) {
    const t = new Date(user.lastLogin).getTime();
    if (!isNaN(t)) latestTs = t;
  }

  if (!latestTs) {
    return {
      status: 'offline',
      label: 'Offline',
      badgeBg: '#f8fafc',
      badgeColor: '#64748b',
      borderColor: '#e2e8f0',
      dotColor: '#94a3b8',
      pulse: false,
      subtext: 'No recent activity'
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - latestTs);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 15) {
    return {
      status: 'online',
      label: 'Online',
      badgeBg: '#ecfdf5',
      badgeColor: '#047857',
      borderColor: '#a7f3d0',
      dotColor: '#10b981',
      pulse: true,
      subtext: diffMins <= 1 ? 'Just now' : `${diffMins}m ago`
    };
  }

  if (diffHours < 4) {
    return {
      status: 'away',
      label: 'Away',
      badgeBg: '#fffbebf',
      badgeColor: '#b45309',
      borderColor: '#fde68a',
      dotColor: '#f59e0b',
      pulse: false,
      subtext: `${diffHours}h ago`
    };
  }

  return {
    status: 'offline',
    label: 'Offline',
    badgeBg: '#f8fafc',
    badgeColor: '#64748b',
    borderColor: '#e2e8f0',
    dotColor: '#94a3b8',
    pulse: false,
    subtext: diffDays > 0 ? `${diffDays}d ago` : `${diffHours}h ago`
  };
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'away' | 'offline'>('all');

  // Total Data Metrics
  const [totalRegistersCount, setTotalRegistersCount] = useState<number>(0);
  const [totalEntriesCount, setTotalEntriesCount] = useState<number>(0);

  // Extend Trial Modal State
  const [extendingUser, setExtendingUser] = useState<ServerUser | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDate, setCustomDate] = useState<string>('');
  const [submittingExtension, setSubmittingExtension] = useState(false);

  // Form states for creating new user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'sheet_admin' | 'user'>('sheet_admin');
  const [creating, setCreating] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const [userData, busList] = await Promise.all([
        firebaseGetUsers(),
        listBusinesses(true).catch(() => [])
      ]);
      setUsers(userData.users || []);

      if (busList && busList.length > 0) {
        let regCount = 0;
        let entryCount = 0;
        for (const b of busList) {
          const regs = await listRegisters(b.id).catch(() => []);
          regCount += regs.length;
          for (const r of regs) {
            entryCount += (r.entryCount || 0);
          }
        }
        setTotalRegistersCount(regCount);
        setTotalEntriesCount(entryCount);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  const userStatusMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getUserOnlineStatus>>();
    users.forEach(u => {
      map.set(u.id, getUserOnlineStatus(u, user?.id !== undefined ? String(user.id) : undefined));
    });
    return map;
  }, [users, user?.id]);

  const counts = useMemo(() => {
    let online = 0, away = 0, offline = 0;
    users.forEach(u => {
      const st = userStatusMap.get(u.id)?.status;
      if (st === 'online') online++;
      else if (st === 'away') away++;
      else offline++;
    });
    return { total: users.length, online, away, offline };
  }, [users, userStatusMap]);

  const activeTrialCount = useMemo(() => {
    return users.filter(u => {
      if (!u.trialEndsAt) return true;
      return new Date(u.trialEndsAt).getTime() > Date.now();
    }).length;
  }, [users]);

  const expiredTrialCount = useMemo(() => {
    return users.filter(u => {
      if (!u.trialEndsAt) return false;
      return new Date(u.trialEndsAt).getTime() <= Date.now();
    }).length;
  }, [users]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;
    setCreating(true);
    try {
      await firebaseCreateUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        phone: newPhone
      });
      toast.success('User created successfully');
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewPassword(''); setNewRole('sheet_admin');
      setShowCreate(false);
      fetch_();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await firebaseUpdateUserStatus(id, newStatus);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      await firebaseDeleteUser(id);
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user');
    }
  };

  const handleExtendTrialSubmit = async () => {
    if (!extendingUser) return;
    setSubmittingExtension(true);
    try {
      let targetIso: string | undefined = undefined;
      if (customDate) {
        targetIso = new Date(customDate).toISOString();
      }
      const updatedUser = await extendUserTrial(extendingUser.id, targetIso, customDate ? undefined : selectedDays);
      toast.success(`Trial extended for ${extendingUser.name || 'User'}!`);
      setUsers(prev => prev.map(u => u.id === extendingUser.id ? { ...u, trialEndsAt: updatedUser.trialEndsAt } : u));
      setExtendingUser(null);
      setCustomDate('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extend trial');
    } finally {
      setSubmittingExtension(false);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const st = userStatusMap.get(u.id)?.status;
    return st === statusFilter;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── Top Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '28px',
        color: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.1)', padding: '4px 14px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '12px', color: '#38bdf8' }}>
            <ShieldCheck size={14} /> Developer Admin Console
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            App User &amp; Data Monitoring
          </h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px', maxWidth: '600px', lineHeight: 1.4 }}>
            Monitor active platform users, track cloud database consumption, and grant subscription trial extensions.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(-2px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <ArrowLeft size={16} /> Exit Admin
          </button>

          <button
            onClick={fetch_}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} /> Refresh Data
          </button>

          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <UserPlus size={16} /> Add User Account
          </button>
        </div>
      </div>

      {/* ── 4 Metric Overview Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Card 1: Total Users */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          transition: 'transform 0.2s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Registered Users
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(26, 115, 232, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.5px' }}>
            {counts.total} <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--muted)' }}>Users</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="online-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {counts.online} Active Online · {counts.away} Away
          </div>
        </div>

        {/* Card 2: Subscription & Trials */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          transition: 'transform 0.2s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Subscriptions &amp; Trials
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.5px' }}>
            {activeTrialCount} <span style={{ fontSize: '16px', fontWeight: 600, color: '#059669' }}>Active</span>
          </div>
          <div style={{ fontSize: '12.5px', color: expiredTrialCount > 0 ? '#b91c1c' : 'var(--muted)', fontWeight: 600, marginTop: '8px' }}>
            {expiredTrialCount > 0 ? `⚠️ ${expiredTrialCount} Trials Expired` : '100% active trial coverage'}
          </div>
        </div>

        {/* Card 3: Total Data Consumed */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          transition: 'transform 0.2s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Data Consumed
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.5px' }}>
            {totalEntriesCount.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--muted)' }}>Entries</span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600, marginTop: '8px' }}>
            Across {totalRegistersCount} Registers in PostgreSQL DB
          </div>
        </div>

        {/* Card 4: Extend Trial Control */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          transition: 'transform 0.2s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trial Extension Control
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.5px' }}>
            1-Click Extend
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600, marginTop: '8px' }}>
            Grant custom trial days anytime per user
          </div>
        </div>

      </div>

      {/* ── Create User Form Modal/Panel ── */}
      {showCreate && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid var(--border)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          marginBottom: '28px'
        }} className="admin-animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPlus size={20} color="var(--accent)" /> Add New User Account
            </h3>
            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
          </div>

          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Full Name *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Full Name" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Email Address *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="user@example.com" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Phone Number</label>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Password *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Initial password" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Account Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }}>
                <option value="sheet_admin">App User (Workspace Owner)</option>
                <option value="admin">System Admin (Full Console Access)</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>{creating ? 'Creating...' : 'Create Account'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search & Filter Controls Bar ── */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1px solid var(--border)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-secondary)',
          borderRadius: '10px',
          padding: '8px 14px',
          border: '1px solid var(--border)',
          width: '320px',
          maxWidth: '100%'
        }}>
          <Search size={16} color="var(--muted)" />
          <input
            placeholder="Search by user name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13.5px',
              color: 'var(--foreground)',
              width: '100%'
            }}
          />
        </div>

        {/* Live Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Users', count: counts.total, color: 'var(--navy)' },
            { id: 'online', label: 'Online', count: counts.online, color: '#059669', dot: '#10b981' },
            { id: 'away', label: 'Away', count: counts.away, color: '#d97706', dot: '#f59e0b' },
            { id: 'offline', label: 'Offline', count: counts.offline, color: '#64748b', dot: '#94a3b8' },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id as any)}
              style={{
                background: statusFilter === chip.id ? 'var(--navy)' : 'var(--bg-secondary)',
                color: statusFilter === chip.id ? '#ffffff' : 'var(--foreground)',
                border: statusFilter === chip.id ? '1px solid var(--navy)' : '1px solid var(--border)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              {chip.dot && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: chip.dot }} />}
              {chip.label}
              <span style={{
                fontSize: '11px',
                opacity: 0.9,
                background: statusFilter === chip.id ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Ultra-Clean User Monitoring Table ── */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
            Loading platform monitoring data...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>User Details</th>
                  <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Account Role</th>
                  <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Subscription &amp; Trial Expiry</th>
                  <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Active Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, index) => {
                  const isSuperAdmin = u.role === 'superadmin';
                  const activeInfo = userStatusMap.get(u.id) || getUserOnlineStatus(u, user?.id !== undefined ? String(user.id) : undefined);

                  // Calculate Subscription & Expiry Time Left
                  let trialBadgeBg = '#f8fafc';
                  let trialBadgeColor = '#64748b';
                  let trialText = '1-Month Free Trial';
                  let trialSubtext = 'Active';

                  if (u.trialEndsAt) {
                    const diffDays = Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                      trialBadgeBg = '#ecfdf5';
                      trialBadgeColor = '#047857';
                      trialText = `${diffDays} Days Left`;
                      trialSubtext = `Expires ${new Date(u.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    } else {
                      trialBadgeBg = '#fef2f2';
                      trialBadgeColor = '#991b1b';
                      trialText = 'Trial Expired';
                      trialSubtext = `Ended ${new Date(u.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    }
                  }

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: index === filtered.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* User Column */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: isSuperAdmin ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 800,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor: activeInfo.dotColor,
                              border: '2px solid #ffffff'
                            }} />
                          </div>

                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {u.name}
                              {isSuperAdmin && (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                  Developer
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Role */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: isSuperAdmin ? '#f5f3ff' : u.role === 'admin' ? '#fef2f2' : '#f0fdf4',
                          color: isSuperAdmin ? '#6d28d9' : u.role === 'admin' ? '#b91c1c' : '#15803d',
                          border: `1px solid ${isSuperAdmin ? '#ddd6fe' : u.role === 'admin' ? '#fecaca' : '#bbf7d0'}`,
                          display: 'inline-block'
                        }}>
                          {isSuperAdmin ? 'Developer' : u.role === 'admin' ? 'Admin' : 'Workspace Owner'}
                        </span>
                      </td>

                      {/* Subscription & Expiry Time Left */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: trialBadgeColor,
                            background: trialBadgeBg,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            width: 'fit-content'
                          }}>
                            <Clock size={12} /> {trialText}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 500 }}>
                            {trialSubtext}
                          </span>
                        </div>
                      </td>

                      {/* Active Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: activeInfo.badgeColor,
                          background: activeInfo.badgeBg,
                          border: `1px solid ${activeInfo.borderColor}`,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span className={activeInfo.pulse ? 'online-pulse-dot' : ''} style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: activeInfo.dotColor
                          }} />
                          {activeInfo.label}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {isSuperAdmin ? (
                          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, fontStyle: 'italic' }}>
                            Protected Account
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => setExtendingUser(u)}
                              title="Extend Subscription Trial"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Sparkles size={13} /> Extend Trial
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u.id, u.status || 'active')}
                              title={u.status === 'active' ? 'Deactivate User' : 'Activate User'}
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: u.status === 'active' ? '#d97706' : '#059669',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {u.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>

                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={u.email === user?.email}
                              title="Delete Account"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: u.email === user?.email ? '#cbd5e1' : '#dc2626',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: u.email === user?.email ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                      No matching user accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Extend Trial Modal ── */}
      {extendingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setExtendingUser(null)}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            padding: '32px',
            width: '440px',
            maxWidth: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#10b981" /> Extend User Subscription
              </h3>
              <button onClick={() => setExtendingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.4 }}>
              Select a trial extension period for <strong style={{ color: 'var(--navy)' }}>{extendingUser.name}</strong> ({extendingUser.email}).
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: '+15 Days', days: 15 },
                  { label: '+30 Days', days: 30 },
                  { label: '+60 Days', days: 60 },
                  { label: '+90 Days', days: 90 },
                  { label: '+6 Months', days: 180 },
                  { label: '+1 Year', days: 365 },
                ].map(opt => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => { setSelectedDays(opt.days); setCustomDate(''); }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: selectedDays === opt.days && !customDate ? '2px solid #10b981' : '1px solid var(--border)',
                      background: selectedDays === opt.days && !customDate ? '#ecfdf5' : 'var(--bg-secondary)',
                      color: selectedDays === opt.days && !customDate ? '#047857' : 'var(--foreground)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Or Set Custom Expiry Date
              </label>
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '13.5px',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setExtendingUser(null)} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleExtendTrialSubmit}
                disabled={submittingExtension}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                {submittingExtension ? 'Saving...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes activePulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        }
        .online-pulse-dot {
          animation: activePulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
