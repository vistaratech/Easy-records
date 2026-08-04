import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Calendar, Clock, Sparkles, User, Mail, Phone, Award, CheckCircle2, ArrowLeft, Zap } from 'lucide-react';
import { PaymentModal } from '../components/payment/PaymentModal';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const getRoleLabel = (role?: string) => {
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'admin') return 'System Admin';
    return 'Full Workspace Admin';
  };

  const displayName = user?.name || user?.email || 'User';

  // Calculate Subscription & Expiry details
  let expiryTime = (user as any)?.trialEndsAt ? new Date((user as any).trialEndsAt).getTime() : null;
  if (!expiryTime || isNaN(expiryTime)) {
    const created = (user as any)?.createdAt ? new Date((user as any).createdAt).getTime() : Date.now();
    expiryTime = created + 30 * 24 * 60 * 60 * 1000;
  }

  const now = Date.now();
  const diffMs = expiryTime - now;
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const daysUsed = Math.min(30, 30 - daysLeft);
  const percentUsed = Math.min(100, Math.max(5, (daysUsed / 30) * 100));

  const formattedExpiryDate = new Date(expiryTime).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedCreatedDate = (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : 'Recently';

  return (
    <div style={{ padding: '24px 24px 32px', maxWidth: '850px', margin: '0 auto', width: '100%', height: '100%', overflowY: 'auto' }}>
      {/* Header with Modern Styled Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-secondary) 100%)',
            color: 'var(--navy)',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-2px)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--navy)';
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Workspace</span>
        </button>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--navy)', margin: '0 0 6px' }}>Account & Subscription Profile</h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>View your active plan, subscription validity, and user details.</p>
      </div>
      
      {/* ── 1. Subscription & Plan Expiry Status Card ── */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
          borderRadius: '20px', 
          padding: '28px', 
          color: '#ffffff',
          marginBottom: '28px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Active Plan</div>
              <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>1-Month Free Business Trial</h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13.5px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              <Zap size={16} fill="white" />
              <span>Upgrade Plan (0% Fee UPI)</span>
            </button>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '30px',
              background: daysLeft <= 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${daysLeft <= 5 ? '#EF4444' : '#10B981'}`,
              color: daysLeft <= 5 ? '#FCA5A5' : '#6EE7B7',
              fontWeight: 700,
              fontSize: '13.5px'
            }}>
              <Clock size={16} />
              <span>{daysLeft > 0 ? `${daysLeft} Days Remaining` : 'Trial Expired'}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            <span>Trial Consumption</span>
            <span>{daysLeft} days left until {formattedExpiryDate}</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${percentUsed}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10B981 0%, #3B82F6 100%)',
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} color="#94A3B8" />
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>ACCOUNT CREATED</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8FAFC' }}>{formattedCreatedDate}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#94A3B8" />
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>PLAN EXPIRY DATE</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: daysLeft <= 5 ? '#FCA5A5' : '#6EE7B7' }}>{formattedExpiryDate}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#10B981" />
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>FEATURE ACCESS</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8FAFC' }}>Full Unlimited Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Account Details Card ── */}
      <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px' }}>
          <div style={{ width: '70px', height: '70px', background: 'linear-gradient(135deg, var(--accent) 0%, #1D4ED8 100%)', color: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, boxShadow: '0 8px 20px rgba(26, 115, 232, 0.25)' }}>
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--navy)' }}>{displayName}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> {user?.email || 'Google Authenticated User'}
            </p>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: 'var(--navy)' }}>User Account Credentials</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
              <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} /> Full Name
              </div>
              <div style={{ padding: '11px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>
                {user?.name || 'N/A'}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
              <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} /> Email Address
              </div>
              <div style={{ padding: '11px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>
                {user?.email || 'N/A'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
              <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} /> Phone Number
              </div>
              <div style={{ padding: '11px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>
                {user?.phone || 'Not provided'}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
              <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} /> Workspace Role
              </div>
              <div style={{ padding: '8px 14px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 700, fontSize: '13px', display: 'inline-flex', width: 'fit-content' }}>
                <ShieldCheck size={16} style={{ marginRight: '6px' }} />
                {getRoleLabel(user?.role)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free UPI Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        userEmail={user?.email}
        userName={user?.name || user?.email}
      />
    </div>
  );
}
