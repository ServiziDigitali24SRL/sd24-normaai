"use client";

import { useState, useEffect } from "react";
import { getTaxonomy, TaxonomyRole, ProfVariant, TaxonomyMacro } from "@/lib/taxonomy";
import Icon from "./Icon";

const DS_STORAGE_PREFIX = 'norma.dualsidebar.';

interface DualSidebarProps {
  role: TaxonomyRole;
  variant?: ProfVariant;
  user?: { name?: string; subtitle?: string; initials?: string } | null;
  locked?: boolean;
  active?: { macro: string; item: string | null } | null;
  onNav?: (payload: string | { macro: { key: string; label: string }; item: string | null }) => void;
  onLock?: () => void;
}

interface SidebarState {
  removedMacros?: string[];
  removedItems?: Record<string, string[]>;
}

export default function DualSidebar({ role, variant, user, locked = false, active, onNav, onLock }: DualSidebarProps) {
  const storageKey = DS_STORAGE_PREFIX + role + (variant ? '-' + variant : '');
  const baseTax = getTaxonomy(role, variant);

  const [state, setState] = useState<SidebarState>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }, [state, storageKey]);

  const removedMacros = state.removedMacros || [];
  const removedItems = state.removedItems || {};
  const macros = baseTax.filter(m => !removedMacros.includes(m.key));

  const [selected, setSelected] = useState(macros[0]?.key);
  const [col1, setCol1] = useState(true);
  const [col2, setCol2] = useState(true);
  const [showAddMacro, setShowAddMacro] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    if (!macros.find(m => m.key === selected)) setSelected(macros[0]?.key);
  }, [macros.length]); // eslint-disable-line

  const current = macros.find(m => m.key === selected);
  const items = current
    ? current.items.filter(it => !(removedItems[current.key] || []).includes(it))
    : [];
  const availableToAdd = baseTax.filter(m => removedMacros.includes(m.key));
  const removedInCurrent = current ? (removedItems[current.key] || []) : [];

  const removeMacro = (key: string) =>
    setState(s => ({ ...s, removedMacros: [...(s.removedMacros || []), key] }));
  const addMacro = (key: string) => {
    setState(s => ({ ...s, removedMacros: (s.removedMacros || []).filter(k => k !== key) }));
    setShowAddMacro(false);
  };
  const removeItem = (macroKey: string, item: string) =>
    setState(s => ({ ...s, removedItems: { ...(s.removedItems || {}), [macroKey]: [...((s.removedItems || {})[macroKey] || []), item] } }));
  const addItem = (macroKey: string, item: string) => {
    setState(s => ({ ...s, removedItems: { ...(s.removedItems || {}), [macroKey]: ((s.removedItems || {})[macroKey] || []).filter(i => i !== item) } }));
    setShowAddItem(false);
  };

  const handleItemClick = (item: string) => {
    if (locked) { onLock?.(); return; }
    if (!current) return;
    onNav?.({ macro: { key: current.key, label: current.label }, item });
  };

  const avatarInitials = user?.initials || (role === 'impresa' ? 'AC' : role === 'prof' ? 'AG' : 'MR');
  const avatarName = user?.name || (role === 'impresa' ? 'Acme SRL' : role === 'prof' ? 'Avv. Giulia' : 'Marco Rossi');
  const avatarTag = user?.subtitle || (role === 'impresa' ? 'IMPRESA' : role === 'prof' ? 'PROFESSIONISTA' : 'CITTADINO');

  return (
    <>
      {/* COLUMN 1 — Macro categories */}
      <aside style={{
        width: col1 ? 232 : 52, flexShrink: 0,
        background: 'var(--paper-tint)', borderRight: '1px solid var(--paper-line)',
        display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}>
        <div style={{
          padding: col1 ? '16px 14px 12px' : '16px 10px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: col1 ? 'space-between' : 'center',
          borderBottom: '1px solid var(--paper-line)',
        }}>
          {col1 && (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, letterSpacing: '-0.5px', color: 'var(--ink)' }}>
              Norma<span style={{ color: 'var(--vermiglio)' }}>AI</span>
            </div>
          )}
          <button onClick={() => setCol1(c => !c)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', borderRadius: 4, flexShrink: 0,
          }}>
            <Icon name="menu" size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px 8px' }}>
          {/* Dashboard home link */}
          <div style={{ marginBottom: 6 }}>
            <button
              onClick={() => {
                if (locked) { onLock?.(); return; }
                setSelected('__dashboard__');
                onNav?.({ macro: { key: '__dashboard__', label: 'Dashboard' }, item: null });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: col1 ? '9px 10px' : '10px 0',
                justifyContent: col1 ? 'flex-start' : 'center',
                background: selected === '__dashboard__' ? 'var(--vermiglio)' : 'transparent',
                color: selected === '__dashboard__' ? 'white' : 'var(--ink-2)',
                border: selected === '__dashboard__' ? 'none' : '1px solid var(--paper-line)',
                borderRadius: 6, cursor: 'pointer',
                fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 500,
              }}
              title={!col1 ? 'Dashboard' : undefined}
            >
              <Icon name="dashboard" size={14} />
              {col1 && <span>Dashboard</span>}
            </button>
          </div>

          {macros.map((m: TaxonomyMacro) => {
            const isActive = selected === m.key;
            return (
              <div key={m.key} style={{ position: 'relative', marginBottom: 2 }}>
                <button
                  onClick={() => setSelected(m.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: col1 ? '8px 10px' : '10px 0',
                    justifyContent: col1 ? 'flex-start' : 'center',
                    background: isActive ? 'var(--ink)' : 'transparent',
                    color: isActive ? 'var(--paper)' : 'var(--ink-2)',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontSize: 13, fontFamily: 'var(--sans)', fontWeight: isActive ? 500 : 400,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  title={!col1 ? m.label : undefined}
                >
                  <Icon name={m.icon} size={14} />
                  {col1 && (
                    <>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                      {m.badge && (
                        <span style={{
                          background: isActive ? 'var(--vermiglio)' : 'var(--vermiglio-soft)',
                          color: isActive ? 'white' : 'var(--vermiglio-ink)',
                          fontSize: 9.5, fontFamily: 'var(--mono)', padding: '2px 5px', borderRadius: 8, fontWeight: 600,
                        }}>{m.badge}</span>
                      )}
                    </>
                  )}
                </button>
                {col1 && (
                  <button
                    onClick={e => { e.stopPropagation(); removeMacro(m.key); }}
                    title="Rimuovi"
                    style={{
                      position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      width: 18, height: 18, border: 'none', borderRadius: 3,
                      background: 'transparent', color: 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, lineHeight: 1,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'transparent'; }}
                  >−</button>
                )}
              </div>
            );
          })}
        </div>

        {col1 && availableToAdd.length > 0 && (
          <div style={{ padding: '6px 8px 8px', position: 'relative' }}>
            <button onClick={() => setShowAddMacro(s => !s)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '8px 10px', border: '1px dashed var(--paper-line)', borderRadius: 6,
              background: 'transparent', fontFamily: 'var(--sans)', fontSize: 12,
              color: 'var(--ink-3)', cursor: 'pointer',
            }}>
              <Icon name="plus" size={12} /> Aggiungi categoria
            </button>
            {showAddMacro && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4,
                background: 'white', border: '1px solid var(--paper-line)', borderRadius: 8,
                boxShadow: 'var(--shadow-3)', padding: 4, maxHeight: 280, overflow: 'auto', zIndex: 20,
              }}>
                {availableToAdd.map(m => (
                  <button key={m.key} onClick={() => addMacro(m.key)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', border: 'none', borderRadius: 4, background: 'transparent',
                    fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer', textAlign: 'left',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--paper-tint)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <Icon name={m.icon} size={13} /> {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {col1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--paper-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
              {avatarInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--sans)' }}>{avatarName}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>{avatarTag}</div>
            </div>
          </div>
        )}
      </aside>

      {/* COLUMN 2 — Sub-items */}
      <aside style={{
        width: col2 ? 240 : 44, flexShrink: 0,
        background: 'white', borderRight: '1px solid var(--paper-line)',
        display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}>
        <div style={{
          padding: col2 ? '16px 14px 12px' : '16px 8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: col2 ? 'space-between' : 'center',
          borderBottom: '1px solid var(--paper-line)',
          minHeight: 54,
        }}>
          {col2 && current && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Categoria</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, fontFamily: 'var(--sans)' }}>{current.label}</div>
            </div>
          )}
          <button onClick={() => setCol2(c => !c)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', borderRadius: 4, flexShrink: 0,
          }}>
            <Icon name="menu" size={14} />
          </button>
        </div>

        {col2 && (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
            {items.map((it, i) => {
              const isActive = active?.item === it && active?.macro === selected;
              const isNote = it.startsWith('—');
              return (
                <div key={it + i} style={{ position: 'relative', marginBottom: 1 }}>
                  <button
                    onClick={() => !isNote && handleItemClick(it)}
                    disabled={isNote}
                    style={{
                      display: 'block', width: '100%', padding: '7px 32px 7px 10px',
                      background: isActive ? 'var(--paper-tint)' : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '2px solid var(--vermiglio)' : '2px solid transparent',
                      borderRadius: 4, cursor: isNote ? 'default' : 'pointer',
                      fontSize: 12.5, fontFamily: isNote ? 'var(--serif)' : 'var(--sans)',
                      fontStyle: isNote ? 'italic' : 'normal',
                      color: isNote ? 'var(--ink-4)' : locked ? 'var(--ink-3)' : 'var(--ink-2)',
                      textAlign: 'left', lineHeight: 1.4,
                      opacity: locked && !isNote ? 0.7 : 1,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive && !isNote) (e.currentTarget as HTMLElement).style.background = 'var(--paper-tint)'; }}
                    onMouseLeave={e => { if (!isActive && !isNote) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {locked && !isNote && <span style={{ marginRight: 6, opacity: 0.5, fontSize: 10 }}>🔒</span>}
                    {it}
                  </button>
                  {!isNote && !locked && (
                    <button
                      onClick={() => removeItem(selected, it)}
                      title="Rimuovi"
                      style={{
                        position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                        width: 18, height: 18, border: 'none', borderRadius: 3,
                        background: 'transparent', color: 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, lineHeight: 1,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'transparent'; }}
                    >−</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {col2 && current && removedInCurrent.length > 0 && !locked && (
          <div style={{ padding: '6px 8px 8px', position: 'relative' }}>
            <button onClick={() => setShowAddItem(s => !s)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '7px 10px', border: '1px dashed var(--paper-line)', borderRadius: 6,
              background: 'transparent', fontFamily: 'var(--sans)', fontSize: 11.5,
              color: 'var(--ink-3)', cursor: 'pointer',
            }}>
              <Icon name="plus" size={11} /> Aggiungi voce
            </button>
            {showAddItem && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4,
                background: 'white', border: '1px solid var(--paper-line)', borderRadius: 8,
                boxShadow: 'var(--shadow-3)', padding: 4, maxHeight: 240, overflow: 'auto', zIndex: 20,
              }}>
                {removedInCurrent.map(it => (
                  <button key={it} onClick={() => addItem(selected, it)} style={{
                    width: '100%', padding: '6px 10px', border: 'none', borderRadius: 4, background: 'transparent',
                    fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer', textAlign: 'left',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--paper-tint)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    {it}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
