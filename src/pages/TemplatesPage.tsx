import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { listBusinesses, createBusiness, createRegister, type RegisterSummary, listSavedTemplates, deleteSavedTemplate } from '../lib/api';
import { CATEGORIES, TEMPLATES, type Template, DEFAULT_BLANK_COLUMNS } from '../lib/templates';
import toast from 'react-hot-toast';
import {
  ArrowLeft, FileText, Hash, Calendar, ChevronDown, FlaskConical, Type,
  Building, GraduationCap, Store, Bus, Warehouse, Package, CalendarIcon, HeartPulse,
  Utensils, Dumbbell, Building2, User, ShieldCheck, Leaf, Plane,
  Phone, Mail, Globe, Star, CheckSquare, Image, Plus, Bookmark, Trash2,
  Wallet, Calculator, DollarSign, Receipt, ShoppingBag, BookOpen
} from 'lucide-react';

import { CategoryCard } from '../components/templates/CategoryCard';
import { TemplateModal } from '../components/templates/TemplateModal';

const ICON_MAP: Record<string, any> = {
  'building': Building, 'graduation-cap': GraduationCap, 'store': Store, 'bus': Bus,
  'warehouse': Warehouse, 'package': Package, 'calendar': CalendarIcon, 'heart-pulse': HeartPulse,
  'utensils': Utensils, 'dumbbell': Dumbbell, 'building-2': Building2, 'user': User,
  'shield-check': ShieldCheck, 'leaf': Leaf, 'plane': Plane, 'plus': Plus,
  'wallet': Wallet, 'calculator': Calculator, 'dollar-sign': DollarSign,
  'receipt': Receipt, 'shopping-bag': ShoppingBag, 'book-open': BookOpen
};

function getColTypeIcon(type: string) {
  switch (type) {
    case 'number':   return <Hash size={10} />;
    case 'date':     return <Calendar size={10} />;
    case 'dropdown': return <ChevronDown size={10} />;
    case 'formula':  return <FlaskConical size={10} />;
    case 'phone':    return <Phone size={10} />;
    case 'email':    return <Mail size={10} />;
    case 'url':      return <Globe size={10} />;
    case 'rating':   return <Star size={10} />;
    case 'checkbox': return <CheckSquare size={10} />;
    case 'image':    return <Image size={10} />;
    default:         return <Type size={10} />;
  }
}

interface SavedTemplate {
  id: string;
  name: string;
  columns: Array<{ name: string; type: string; dropdownOptions?: string[]; formula?: string }>;
  createdAt: string;
}

export default function TemplatesPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryId || null);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

  const { data: businesses } = useQuery({ queryKey: ['businesses'], queryFn: listBusinesses });
  const businessId = businesses?.[0]?.id;

  const { data: savedTemplates = [] } = useQuery({
    queryKey: ['savedTemplates', businessId],
    queryFn: () => listSavedTemplates(businessId!),
    enabled: !!businessId,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteSavedTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedTemplates', businessId] });
      toast.success('Template deleted!');
    },
    onError: (err: any) => {
      toast.error(`Failed to delete template: ${err.message}`);
    }
  });

  useEffect(() => {
    if (businesses && businesses.length === 0) {
      createBusiness('My Business').then(() => queryClient.invalidateQueries({ queryKey: ['businesses'] }));
    }
  }, [businesses, queryClient]);

  const createMutation = useMutation({
    mutationFn: (tpl: { name: string; columns: any[]; icon: string; iconColor?: string; category?: string }) => {
      return createRegister({
        businessId: businessId!,
        name: tpl.name,
        icon: tpl.icon,
        iconColor: tpl.iconColor || '#10B981',
        category: tpl.category || 'general',
        template: tpl.name,
        columns: tpl.columns.map((c) => ({
          name: c.name,
          type: c.type,
          dropdownOptions: c.dropdownOptions,
          formula: c.formula
        })),
      });
    },
    onSuccess: (newReg) => {
      const bId = newReg.businessId || businessId;
      if (bId) {
        queryClient.setQueryData(['registers', bId], (old: RegisterSummary[] | undefined) => {
          const safeOld = old || [];
          if (safeOld.find((r) => r.id === newReg.id)) return safeOld;
          return [...safeOld, newReg];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['registers'] });
      if (bId) {
        queryClient.invalidateQueries({ queryKey: ['registers', bId] });
      }
      navigate(`/register/${newReg.id}`);
    },
    onError: (err: any) => {
      alert(err.message || 'Error creating register');
      setCreatingTemplate(null);
    },
  });

  const categoryData = selectedCategory ? CATEGORIES.find((c) => c.id === selectedCategory) : null;
  const subTemplates = selectedCategory ? TEMPLATES[selectedCategory] || [] : [];

  return (
    <div className="templates-page-root content-area templates-page-scroll">
      {/* Header with Modern Styled Back Button */}
      <div className="register-header" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
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
        <h1 className="register-header-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Choose a Register Template</h1>
      </div>

      {/* Category Grid */}
      <div className="templates-page-body" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 className="templates-heading" style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800 }}>Select a Business Template</h2>
          <p className="templates-subheading" style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
            Choose a ready-to-use business template or start with a blank custom register.
          </p>
        </div>

        <div className="categories-grid categories-grid--no-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Blank Register */}
          <CategoryCard 
            key="blank"
            cat={{ id: 'blank', icon: 'plus', name: 'Blank Register' }} 
            icon={Plus} 
            count={0} 
            onClick={() => {
              if (!businessId || creatingTemplate) return;
              setCreatingTemplate('Blank Register');
              createMutation.mutate({
                name: 'Blank Register',
                columns: DEFAULT_BLANK_COLUMNS,
                icon: 'file',
                iconColor: '#10B981',
                category: 'general'
              });
            }} 
          />

          {/* User-saved Custom Templates */}
          {savedTemplates.map((tpl) => (
            <div 
              key={tpl.id} 
              className="category-card" 
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => {
                if (!businessId || creatingTemplate) return;
                setCreatingTemplate(tpl.name);
                createMutation.mutate({
                  name: tpl.name,
                  columns: tpl.columns,
                  icon: 'file',
                  iconColor: '#6366F1',
                  category: 'custom_template'
                });
              }}
            >
              <button 
                className="delete-template-btn" 
                title="Delete template"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete the template "${tpl.name}"?`)) {
                    deleteTemplateMutation.mutate(tpl.id);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
              >
                <Trash2 size={16} />
              </button>

              <div className="category-icon" style={{ backgroundColor: '#6366F1' }}>
                <Bookmark size={24} color="#FFF" />
              </div>
              <div className="category-name">{tpl.name}</div>
              <div className="category-count">{tpl.columns.length} columns</div>
            </div>
          ))}

          {/* All Pre-built Business Template Categories */}
          {CATEGORIES.filter((c) => c.id !== 'blank').map((cat) => {
            const IconComp = ICON_MAP[cat.icon] || FileText;
            const count = (TEMPLATES[cat.id] || []).length;
            return (
              <CategoryCard
                key={cat.id}
                cat={cat}
                icon={IconComp}
                count={count}
                onClick={() => setSelectedCategory(cat.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Template selection modal (kept for compatibility, though not normally reachable now) */}
      <TemplateModal 
        selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
        categoryData={categoryData} subTemplates={subTemplates}
        creatingTemplate={creatingTemplate}
        handleCreate={(tpl) => { 
          if (!businessId) return; // Prevent creation if businessId isn't loaded yet
          setCreatingTemplate(tpl.name); 
          createMutation.mutate(tpl); 
        }}
        getColTypeIcon={getColTypeIcon} ICON_MAP={ICON_MAP}
      />
    </div>
  );
}
