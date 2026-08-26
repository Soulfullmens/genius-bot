import React from 'react';

const PERSONAS = [
  {
    id: 'Legal Expert',
    icon: '⚖️',
    name: 'Legal Expert',
    desc: 'Professional legal analysis',
  },
  {
    id: 'Medical Consultant',
    icon: '🩺',
    name: 'Medical Consultant',
    desc: 'Health guidance & triage',
  },
  {
    id: 'Education Tutor',
    icon: '🎓',
    name: 'Education Tutor',
    desc: 'Interactive learning',
  },
];

/**
 * Renders persona selection cards in the sidebar.
 *
 * Props:
 *   - active: string — currently selected persona
 *   - onChange: (persona: string) => void
 */
function PersonaSelector({ active, onChange }) {
  return (
    <div className="persona-selector">
      <div className="persona-selector__title">Persona</div>
      {PERSONAS.map((p) => (
        <div
          key={p.id}
          className={`persona-card ${active === p.id ? 'persona-card--active' : ''}`}
          onClick={() => onChange(p.id)}
          role="button"
          tabIndex={0}
          aria-label={`Select ${p.name} persona`}
          onKeyDown={(e) => e.key === 'Enter' && onChange(p.id)}
        >
          <div className="persona-card__icon">{p.icon}</div>
          <div>
            <div className="persona-card__name">{p.name}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { PERSONAS };
export default PersonaSelector;
