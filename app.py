import streamlit as st
import random
import time
import advanced_mock

# --- Page Configuration ---
st.set_page_config(
    page_title="GeniusBot - Domain Expert AI",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Custom CSS for "Wonderable" UI ---
st.markdown("""
    <style>
    /* Global Styles */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .stApp {
        background-color: #f8f9fa;
    }

    /* Chat Messages */
    .stChatMessage {
        border-radius: 15px;
        padding: 10px;
        margin-bottom: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    
    /* Header Styling */
    h1 {
        color: #1a1a2a;
        font-weight: 700;
        text-align: center;
        padding-bottom: 20px;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e0e0e0;
    }

    /* Custom Gradient Text */
    .gradient-text {
        background: -webkit-linear-gradient(45deg, #11998e, #38ef7d);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: bold;
    }
    </style>
    """, unsafe_allow_html=True)

# --- Session State Management ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "mode" not in st.session_state:
    st.session_state.mode = "Legal Expert"
if "engine" not in st.session_state:
    st.session_state.engine = advanced_mock.AdvancedMockEngine()

# --- Backend Logic (Local Expert System) ---
def get_system_prompt(mode):
    prompts = {
        "Legal Expert": "You are a Senior Lawyer. Use professional legal jargon, cite precedents (e.g., 'In the case of...'), and be extremely formal and cautious.",
        "Medical Consultant": "You are a Doctor. Be empathetic, use clear medical terminology, and always advise consulting a specialist in person. Start with 'Dr. AI here...'",
        "Education Tutor": "You are a friendly and encouraging Tutor. Use analogies, bullet points, and simple language to explain complex topics. End with 'Keep up the great work!'"
    }
    return prompts.get(mode, "You are a helpful assistant.")

def generate_mock_response(prompt, mode):
    # Simulate thinking delay for realism
    with st.spinner(f"{mode} is thinking..."):
        time.sleep(1.0)
    
    # Use the Session State Engine
    return st.session_state.engine.generate_response(prompt, mode)

# --- Sidebar Configuration ---
with st.sidebar:
    st.title("🧩 Configuration")
    st.markdown("---")
    
    selected_mode = st.selectbox(
        "Choose Persona Mode:",
        ["Legal Expert", "Medical Consultant", "Education Tutor"],
        index=["Legal Expert", "Medical Consultant", "Education Tutor"].index(st.session_state.mode)
    )
    
    # Reset chat if mode changes
    if selected_mode != st.session_state.mode:
        st.session_state.mode = selected_mode
        st.session_state.messages = []
        # Clear engine context on mode switch
        st.session_state.engine.reset_context(selected_mode)
        st.rerun()

    st.markdown("---")
    st.markdown(f"**Current System Prompt:**")
    st.info(get_system_prompt(st.session_state.mode))
    
    st.markdown("### Powering Intelligence")
    st.success("✅ Local Expert System Active")
    st.caption("Detailed Analysis Mode Enabled")

# --- Main Interface ---
st.markdown(f"<h1>GeniusBot: <span class='gradient-text'>{st.session_state.mode}</span></h1>", unsafe_allow_html=True)

# Display Chat History
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat Input
if prompt := st.chat_input(f"Ask your {st.session_state.mode}..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Generate response
    with st.chat_message("assistant"):
        response = generate_mock_response(prompt, st.session_state.mode)
        st.markdown(response)
    
    # Add assistant message
    st.session_state.messages.append({"role": "assistant", "content": response})
