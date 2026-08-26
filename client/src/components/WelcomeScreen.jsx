import React from 'react';

const EXAMPLE_PROMPTS = {
  'Legal Expert': [
    { icon: '📜', text: 'Can I sue my neighbor for property damage?' },
    { icon: '📋', text: 'Review the key clauses in a service contract' },
    { icon: '⚖️', text: 'What are my rights as a tenant?' },
  ],
  'Medical Consultant': [
    { icon: '🤒', text: 'I have a persistent headache for 3 days' },
    { icon: '💊', text: 'What are common side effects of ibuprofen?' },
    { icon: '🩺', text: 'When should I see a doctor about back pain?' },
  ],
  'Education Tutor': [
    { icon: '🧮', text: 'Explain how recursion works in programming' },
    { icon: '🔬', text: 'Teach me about photosynthesis simply' },
    { icon: '📐', text: 'Help me understand the Pythagorean theorem' },
  ],
};

/**
 * Welcome screen shown when no conversation is active.
 * Displays the current persona's icon, description, and example prompts.
 *
 * Props:
 *   - persona: string
 *   - onPromptClick: (text: string) => void
 */
function WelcomeScreen({ persona, onPromptClick }) {
  const prompts = EXAMPLE_PROMPTS[persona] || EXAMPLE_PROMPTS['Education Tutor'];

  const icons = {
    'Legal Expert': '⚖️',
    'Medical Consultant': '🩺',
    'Education Tutor': '🎓',
  };

  return (
    <div className="welcome">
      <div className="welcome__icon">{icons[persona] || '🤖'}</div>
      <h1 className="welcome__title">GeniusBot</h1>
      <p className="welcome__subtitle">
        Your AI-powered {persona}. Ask me anything — I'll provide structured,
        expert-level analysis tailored to your needs.
      </p>
      <div className="welcome__prompts">
        {prompts.map((p, i) => (
          <button
            key={i}
            className="welcome__prompt"
            onClick={() => onPromptClick(p.text)}
          >
            <span className="welcome__prompt-icon">{p.icon}</span>
            {p.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default WelcomeScreen;
