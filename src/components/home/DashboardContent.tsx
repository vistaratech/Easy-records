import { Plus, Upload, FileText, FolderOpen, Search, X, Sun, SunMedium, Moon, Sparkles } from 'lucide-react';
import { startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegisterSummary } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface DashboardContentProps {
  filtered?: RegisterSummary[];
  excelMutation: any; // Type accurately if possible, or use any
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFolder?: () => void;
  search?: string;
  setSearch?: (val: string) => void;
}

export function DashboardContent({ filtered, excelMutation, handleFileUpload, onInputFolder, search, setSearch }: DashboardContentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = (user as any)?.permissions?.canCreateSheets || (user as any)?.permissions?.isAdmin || (user as any)?.role === 'admin' || (user as any)?.role === 'superadmin' || (user as any)?.role === 'sheet_admin';

  if (!filtered || filtered.length === 0) {
    if (search) {
      return (
        <div className="content-area">
          <div className="registers-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="registers-heading" style={{ margin: 0 }}>Your Registers</h2>
                <p className="registers-subheading" style={{ margin: '4px 0 0 0' }}>
                  0 registers found
                </p>
              </div>
              {setSearch && (
                <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search all registers..."
                    style={{
                      width: '100%',
                      padding: '9px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      background: 'white',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                  />
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: '#e2e8f0',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      padding: 0
                    }}
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0' }}>No registers found matching "{search}"</p>
              <button
                onClick={() => setSearch && setSearch('')}
                style={{
                  padding: '8px 16px',
                  background: 'var(--navy)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px'
                }}
              >
                Clear Search Filter
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="content-area">
        <div className="empty-state">
          <img src="/customer-logo.png" alt="Easy Records" className="empty-logo" />
          <h2 className="empty-title">Welcome to Easy Records</h2>
          <p className="empty-sub">Create your first register by selecting a template, starting from scratch, or uploading Excel data.</p>
          <div className="empty-actions">
            <button className="empty-btn" onClick={() => navigate('/templates')}>
              <Plus size={16} />Add New Register
            </button>
            <label htmlFor="excel-upload-empty" className="empty-btn empty-btn-secondary" style={{ marginLeft: 8 }}>
              <Upload size={16} />{excelMutation.isPending ? 'Importing...' : 'Import Excel'}
            </label>
            <input id="excel-upload-empty" type="file" accept=".xlsx, .xls, .csv" className="hidden-input" title="Upload Excel File" aria-label="Upload Excel File" onChange={handleFileUpload} />
            <div className="empty-btn empty-btn-secondary" style={{ marginLeft: 8, cursor: 'pointer' }} onClick={onInputFolder}>
              <FolderOpen size={16} />Import Folder
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic time of day greeting with vector Lucide Icons
  const renderGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Sun size={15} color="#f59e0b" /> Good Morning
        </span>
      );
    }
    if (hour < 17) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <SunMedium size={15} color="#fbbf24" /> Good Afternoon
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Moon size={15} color="#a78bfa" /> Good Evening
      </span>
    );
  };

  return (
    <div className="content-area alive-fade-up">
      <div className="registers-content">
        {/* Sleek Compact Alive Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #002d5d 0%, #0a3d73 60%, #1e5ba8 100%)',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '16px',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(0, 45, 93, 0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{renderGreeting()}</span>
              <span className="alive-pulse-dot" style={{ width: '7px', height: '7px' }} title="Workspace connected & active" />
            </div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Welcome back, {user?.name || 'Workspace Admin'}!</span>
              <Sparkles size={16} color="#fbbf24" />
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 2 }}>
            <button
              onClick={() => navigate('/templates')}
              style={{
                padding: '7px 13px',
                borderRadius: '8px',
                border: 'none',
                background: '#ffffff',
                color: '#002d5d',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                transition: 'all 0.2s ease'
              }}
              className="interactive-btn"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Register</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="registers-heading" style={{ margin: 0 }}>Your Registers</h2>
            <p className="registers-subheading" style={{ margin: '4px 0 0 0' }}>
              {filtered.length} register{filtered.length !== 1 ? 's' : ''} &bull; Click to open
            </p>
          </div>
          {setSearch && (
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search || ''}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all registers..."
                style={{
                  width: '100%',
                  padding: '9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  background: 'white',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: '#e2e8f0',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    padding: 0
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="categories-grid categories-grid--no-pad">
          {filtered.map((reg) => (
            <div key={reg.id} className="category-card alive-card" onClick={() => startTransition(() => navigate(`/register/${reg.id}`))}>
              <div className="category-icon" {...{ style: { '--dyn-bg': reg.iconColor || 'var(--navy)' } as React.CSSProperties }}>
                <FileText size={24} />
              </div>
              <div className="category-name">{reg.name}</div>
              <div className="category-count">{reg.entryCount} entries &bull; {new Date(reg.updatedAt).toLocaleDateString()}{reg.lastActivity ? ` | ${reg.lastActivity}` : ''}</div>
            </div>
          ))}
          {canCreate && (
          <div className="category-card category-card--dashed alive-card" onClick={() => navigate('/templates')}>
            <div className="category-icon category-icon--muted">
              <Plus size={24} />
            </div>
            <div className="category-name">Add New</div>
            <div className="category-count">Create from template</div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
