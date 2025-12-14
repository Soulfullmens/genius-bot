import random
import datetime

class AdvancedMockEngine:
    def __init__(self):
        self.today = datetime.date.today().strftime("%B %d, %Y")
        # Context stores the current state of conversation
        # Structure: {'mode': str, 'topic': str, 'step': int, 'data': dict}
        self.context = {'mode': None, 'topic': None, 'step': 0, 'data': {}}

    def reset_context(self, mode):
        self.context = {'mode': mode, 'topic': None, 'step': 0, 'data': {}}

    def generate_response(self, query, mode):
        # If mode changed, reset context
        if self.context['mode'] != mode:
            self.reset_context(mode)
        
        query_lower = query.lower()
        
        # Dispatch based on mode
        if mode == "Legal Expert":
            return self._legal_logic(query_lower)
        elif mode == "Medical Consultant":
            return self._medical_logic(query_lower)
        elif mode == "Education Tutor":
            return self._education_logic(query_lower)
        else:
            return "Mode not recognized."

    def _legal_logic(self, query):
        step = self.context['step']
        
        # Step 0: Identify Topic
        if step == 0:
            if any(w in query for w in ["sue", "lawsuit", "court", "neighbor"]):
                self.context['topic'] = 'sue'
                self.context['step'] = 1
                return "I understand you are considering legal action. To advise you specifically: **What exact damage or financial loss have you suffered?**"
            elif any(w in query for w in ["contract", "agreement"]):
                self.context['topic'] = 'contract'
                self.context['step'] = 1
                return "Reviewing a contract requires precision. **Is this a service agreement, employment contract, or lease?**"
            else:
                return "I am ready to advise. Are you asking about a **Lawsuit** or a **Contract**?"

        # Step 1: Collect Details
        elif step == 1:
            self.context['data']['detail'] = query
            self.context['step'] = 2
            return "Understood. And **what is your desired outcome** (e.g., compensation, apology, termination of contract)?"

        # Step 2: Final Report
        elif step == 2:
            detail = self.context['data'].get('detail', 'N/A')
            outcome = query
            topic = self.context['topic']
            self.context['step'] = 0 # Reset after report
            
            return f"""
### ⚖️ Final Legal Analysis: {topic.capitalize()}
**Date:** {self.today}
**Client Detail:** *{detail}*
**Target Outcome:** *{outcome}*

#### 1. Assessment based on Answers
You have identified specific damages. In *tort law*, the burden of proof lies with the plaintiff.

#### 2. Strategic Advice
*   **Documentation:** Compile evidence of "{detail}".
*   **Letter of Demand:** Based on your goal of "{outcome}", we should draft a formal demand letter first.
*   **Jurisdiction:** Ensure this is filed in the correct district court.

> **Next Step:** Consult a local solicitor to file the initial writ.
"""

    def _medical_logic(self, query):
        step = self.context['step']
        
        # Step 0: Triage
        if step == 0:
            if any(w in query for w in ["headache", "pain", "hurt", "sick", "fever"]):
                self.context['topic'] = 'general_pain'
                self.context['step'] = 1
                return "Dr. AI here. I see you are in pain. **On a scale of 1-10, how severe is it?**"
            else:
                return "I am listening. Do you have a specific **pain** or just feeling **unwell**?"

        # Step 1: Duration
        elif step == 1:
            self.context['data']['severity'] = query
            self.context['step'] = 2
            return "Noted. And **how long have these symptoms persisted** (e.g., 2 hours, 3 days)?"

        # Step 2: Final Diagnosis
        elif step == 2:
            severity = self.context['data'].get('severity', 'Unknown')
            duration = query
            self.context['step'] = 0 # Reset
            
            return f"""
### 🩺 Medical Triage Report
**Date:** {self.today}

#### Patient Vitals
*   **Reported Severity:** {severity}/10
*   **Duration:** {duration}

#### 1. Clinical Impressions
Persisting symptoms of this nature ("{duration}") typically suggest:
*   **Acute Viral Infection** (if accompanied by fatigue).
*   **Stress-Induced Migraine** (if high severity).

#### 2. Immediate Treatment Plan
1.  **Hydration:** 500ml water immediately.
2.  **Analgesics:** Paracetamol/Ibuprofen as per packet instructions.
3.  **Rest:** Dark room, no screens.

> **⚠️ Urgent:** If severity increases or you experience vision loss, go to ER immediately.
"""

    def _education_logic(self, query):
        step = self.context['step']
        
        # Step 0: Topic ID
        if step == 0:
            self.context['topic'] = 'lesson'
            self.context['step'] = 1
            return f"I'd love to teach you about that! To tailor my lesson: **Are you a Beginner, Intermediate, or Advanced learner?**"

        # Step 1: Level Check
        elif step == 1:
            self.context['data']['level'] = query
            self.context['step'] = 2
            return "Got it. And do you prefer a **Metaphor** (story) or a **Direct Definition**?"

        # Step 2: Legacy
        elif step == 2:
            level = self.context['data'].get('level', 'Beginner')
            style = query
            self.context['step'] = 0
            
            return f"""
### 🎓 Custom Lesson Plan: {level} Level
**Style:** {style}

#### 1. The Breakdown
Since you asked for a **{style}**, here is the core concept:
*   *Imagine a factory...* (Metaphor)
*   *input + Process = Output*

#### 2. Key Takeaway
For a {level} learner, focus on mastering the **Glossary Terms** first.

#### 3. Homework
*   Write down 3 examples of this concept in real life.
*   Come back and tell me what you found!
"""

# We no longer instantiate a singleton here for stateful usage
# engine = AdvancedMockEngine() 
