'use client';
import { useState } from 'react';
import { USER_ROLES } from '@/lib/onboarding-constants';

interface StepRoleProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
}

export function StepRole({ data, updateData, onNext }: StepRoleProps) {
  const [selectedRole, setSelectedRole] = useState(data.role);

  const roles = [
    {
      id: USER_ROLES.CITTADINO,
      title: 'Cittadino',
      description: 'Cerco informazioni per le mie esigenze personali e familiari',
      icon: '🏠',
      features: [
        'Ricerche su diritti e doveri personali',
        'Guide pratiche per situazioni quotidiane',
        'Consulenza per problemi familiari',
        'Ricerche illimitate — sempre gratis',
      ],
    },
    {
      id: USER_ROLES.PROFESSIONISTA,
      title: 'Professionista',
      description: 'Sono un professionista legale che serve clienti',
      icon: '⚖️',
      features: [
        'Ricerche avanzate e approfondite',
        'Alert automatici su novità normative',
        'Accesso al marketplace per nuovi clienti',
        'Strumenti professionali specializzati',
      ],
    },
    {
      id: USER_ROLES.IMPRESA,
      title: 'Impresa',
      description: 'Gestisco compliance normativa per la mia azienda',
      icon: '🏢',
      features: [
        'Monitoraggio compliance aziendale',
        'Gestione rischi normativi',
        'Accesso a consulenti specializzati',
        'Dashboard per team legale',
      ],
    },
  ];

  const handleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    updateData({ role: roleId });
  };

  return (
    <div>
      <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-1">Come utilizzerai NormaAI?</h2>
      <p className="text-[13px] text-[#6B6763] mb-6">Seleziona il profilo più adatto a te</p>

      <div className="grid grid-cols-1 gap-3 mb-8">
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => handleSelect(role.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-accent bg-accent/5'
                  : 'border-[#E5E1D8] hover:border-[#C8C2BA] bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-[24px] shrink-0">{role.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#1a1a1a]">{role.title}</span>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-accent fill-none stroke-[2.5]">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6B6763] mt-0.5">{role.description}</p>
                  {isSelected && (
                    <ul className="mt-2 space-y-1">
                      {role.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11.5px] text-[#6B6763]">
                          <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0 stroke-accent fill-none stroke-[2.5]">
                            <polyline points="20,6 9,17 4,12" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selectedRole}
        className="w-full py-3 bg-accent text-white rounded-xl font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-40"
      >
        Continua →
      </button>
    </div>
  );
}
