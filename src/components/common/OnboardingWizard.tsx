import React, { useState, useEffect } from 'react';
import {
  Sparkles, Layers, FileSpreadsheet, FolderPlus, Download,
  History, CheckCircle2, ChevronRight, ChevronLeft,
  X, Table, PlusCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onStartCreateRegister?: () => void;
}

export const ONBOARDING_KEY_PREFIX = 'ag_onboarding_completed_';

export default function OnboardingWizard({
  isOpen,
  onClose,
  userName = 'User',
  onStartCreateRegister
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Welcome to Easy Records',
      title: `Hello ${userName}, welcome aboard! 👋`,
      subtitle: 'Your 1-Month Free Trial is active. Let’s take a quick 1-minute tour of your new smart digital register book.',
      icon: Sparkles,
      color: '#6366f1',
      bgGradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
      highlights: [
        { label: '🎁 1-Month Free Trial', desc: 'Enjoy full unrestricted access to all premium features.' },
        { label: '🔒 Private Workspace', desc: 'Your registers and data are 100% private and isolated to your account.' },
        { label: '⚡ Smart Auto-Save', desc: 'Every keystroke saves instantly to the database in real-time.' }
      ]
    },
    {
      badge: 'Home Dashboard',
      title: 'Create & Manage Your Registers 📊',
      subtitle: 'Easily set up new register books from scratch or pick from 25+ industry-specific templates.',
      icon: PlusCircle,
      color: 'var(--accent)',
      bgGradient: 'linear-gradient(135deg, rgba(26, 115, 232, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
      highlights: [
        { label: '➕ Create Blank Register', desc: 'Start with a clean slate and customize columns to your exact business needs.' },
        { label: '📑 Use Pre-built Templates', desc: 'Inventory, Sales, Attendance, Petty Cash, Vehicle Log, and more.' },
        { label: '🔍 Global Search', desc: 'Find any register, entry, or keyword across your entire workspace in seconds.' }
      ]
    },
    {
      badge: 'Smart Columns',
      title: '10+ Flexible Column Types 📑',
      subtitle: 'Structure your register data using powerful, intelligent column types designed for real business workflows.',
      icon: Table,
      color: '#059669',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
      highlights: [
        { label: '📝 Standard Types', desc: 'Text, Numbers, Phone, Currency, and Auto-increment serial numbers.' },
        { label: '🎨 Status & Color Badges', desc: 'Dropdowns, Status pills, Yes/No toggles, and Digital Signature capture.' },
        { label: '🧮 Automatic Formulas', desc: 'Add mathematical formulas (SUM, AVG, MULTIPLY) that compute live.' }
      ]
    },
    {
      badge: 'Instant Spreadsheet',
      title: 'Fast Typing & Real-time Auto-Save ⚡',
      subtitle: 'Experience smooth, spreadsheet-like data entry with zero lag and automatic cloud persistence.',
      icon: FileSpreadsheet,
      color: '#d97706',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
      highlights: [
        { label: '🚀 Instant Data Entry', desc: 'Type naturally without interruptions or stuck loading spinners.' },
        { label: '📅 Backdate Entries', desc: 'Select past dates when entering records to maintain accurate chronological logs.' },
        { label: '✨ Custom Formatting', desc: 'Highlight rows, customize cell text colors, and freeze priority columns.' }
      ]
    },
    {
      badge: 'Folders & Organization',
      title: 'Group Sheets into Custom Folders 📁',
      subtitle: 'Keep your workspace clean and structured by organizing related registers into dedicated folders.',
      icon: FolderPlus,
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
      highlights: [
        { label: '📁 Folder Management', desc: 'Create custom folders (e.g., "Accounts 2026", "Site Logs") to categorize sheets.' },
        { label: '✂️ Easy Drag & Move', desc: 'Move registers between folders or keep unassigned sheets on your home screen.' },
        { label: '📋 Duplicate Registers', desc: 'Copy existing register structures in one click for a new month or project.' }
      ]
    },
    {
      badge: 'Reports & Exporting',
      title: 'Download Professional PDF & Excel Reports 📥',
      subtitle: 'Export clean, formatted business reports and share digital registers with stakeholders.',
      icon: Download,
      color: '#ec4899',
      bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(219, 39, 119, 0.08) 100%)',
      highlights: [
        { label: '📄 PDF Export', desc: 'Generate branded PDF documents with your logo, filtered dates, and summaries.' },
        { label: '📊 Excel Backup', desc: 'Export full spreadsheet files (.xlsx) compatible with Microsoft Excel and Google Sheets.' },
        { label: '🔗 Share Links', desc: 'Create view-only or edit share links for team members or clients.' }
      ]
    },
    {
      badge: 'Security & Audit Logs',
      title: 'Cloud Backups & Activity History 🔒',
      subtitle: 'Never lose data with automated backups and complete audit logs of every action.',
      icon: History,
      color: '#0284c7',
      bgGradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(2, 132, 199, 0.08) 100%)',
      highlights: [
        { label: '💾 Cloud Backups', desc: 'Create manual snapshot backups or restore past register versions anytime (`/backups`).' },
        { label: '📜 Audit Trail', desc: 'Review detailed timestamped activity logs of all register edits (`/history`).' },
        { label: '♻️ Recycle Bin', desc: 'Accidentally deleted a register? Easily restore it from the Recycle Bin.' }
      ]
    },
    {
      badge: 'You’re All Set!',
      title: 'Ready to Build Your First Register? 🎉',
      subtitle: 'You have full workspace owner access. Start organizing your business records today!',
      icon: CheckCircle2,
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
      highlights: [
        { label: '✨ Step 1', desc: 'Click "Create Register" on your dashboard to start.' },
        { label: '✨ Step 2', desc: 'Add your columns and start entering records smoothly.' },
        { label: '✨ Step 3', desc: 'Need help? You can re-open this tour anytime from the sidebar menu!' }
      ]
    }
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCreateRegisterClick = () => {
    onClose();
    if (onStartCreateRegister) {
      onStartCreateRegister();
    }
  };

  const handleExploreTemplatesClick = () => {
    onClose();
    navigate('/templates');
  };

  return (
    <div className="onboarding-overlay" style={{
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
    }} onClick={onClose}>
      <div className="onboarding-card admin-animate-fade-in" style={{
        background: 'var(--surface)',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        width: '560px',
        maxWidth: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header Banner */}
        <div style={{
          background: current.bgGradient,
          padding: '28px 28px 20px',
          borderBottom: '1px solid var(--border)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{
              background: current.color,
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '20px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: `0 4px 12px ${current.color}40`
            }}>
              {current.badge}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid var(--border)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--navy)',
                  transition: 'all 0.2s'
                }}
                title="Close Tour"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: current.color,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 16px ${current.color}35`,
              flexShrink: 0
            }}>
              <StepIcon size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.25 }}>
                {current.title}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                {current.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Body Highlights */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {current.highlights.map((item, idx) => (
              <div key={idx} style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: current.color,
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px', lineHeight: 1.35 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons on final step */}
          {currentStep === steps.length - 1 && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={handleCreateRegisterClick}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(26, 115, 232, 0.35)'
                }}
              >
                <PlusCircle size={18} /> Create My First Register
              </button>
              <button
                onClick={handleExploreTemplatesClick}
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  color: 'var(--navy)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Layers size={18} /> Explore Templates
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div style={{
          padding: '16px 28px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Progress Dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                style={{
                  width: currentStep === i ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '10px',
                  background: currentStep === i ? current.color : 'var(--border)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
                title={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 12px'
              }}
            >
              Skip Tour
            </button>

            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--navy)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                background: current.color,
                border: 'none',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 4px 12px ${current.color}35`
              }}
            >
              {currentStep === steps.length - 1 ? 'Finish Tour' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
