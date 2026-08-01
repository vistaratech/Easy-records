import { type LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  cat: {
    id: string;
    icon: string;
    name: string;
    color?: string;
  };
  icon: LucideIcon;
  count: number;
  onClick: () => void;
}

export function CategoryCard({ cat, icon: Icon, count, onClick }: CategoryCardProps) {
  const badgeColor = cat.color || '#3B82F6';

  return (
    <div 
      className="category-card" 
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 28px ${badgeColor}25`;
        e.currentTarget.style.borderColor = badgeColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Top Subtle Color Accent Pill Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${badgeColor}, ${badgeColor}dd)`
      }} />

      {/* Vibrant Icon Box with Gradient & Shadow */}
      <div 
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${badgeColor} 0%, ${badgeColor}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          marginBottom: '16px',
          boxShadow: `0 8px 20px ${badgeColor}40`,
          transition: 'transform 0.25s ease'
        }}
      >
        <Icon size={26} strokeWidth={2.2} />
      </div>

      <div style={{
        fontSize: '15px',
        fontWeight: 800,
        color: 'var(--navy)',
        marginBottom: '6px',
        lineHeight: 1.3
      }}>
        {cat.name}
      </div>

      <div style={{
        fontSize: '12.5px',
        fontWeight: 600,
        color: badgeColor,
        background: `${badgeColor}12`,
        padding: '3px 10px',
        borderRadius: '20px',
        marginTop: 'auto'
      }}>
        {cat.id === 'blank' ? 'Create Custom' : `${count} ${count === 1 ? 'template' : 'templates'}`}
      </div>
    </div>
  );
}
