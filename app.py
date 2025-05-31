from autogen import ConversableAgent, GroupChat, GroupChatManager
from flask import Flask, request, jsonify, send_file
import io
import sys
import os
import logging
from flask import render_template
import re # Import regex module

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# LLM Configuration for Mistral
llm_config = {
    "config_list": [
        {
            "model": "mistral-large-latest",
            # Use environment variable for API key
            "api_key": os.getenv("MISTRAL_API_KEY"),
            "api_type": "mistral",
        }
    ]
}

# Step 1: Create AI Agents with Concise Responses
patient_agent = ConversableAgent(
    name="patient",
    system_message="You describe symptoms and ask for medical help.",
    llm_config=llm_config
)

diagnosis_agent = ConversableAgent(
    name="diagnosis",
    # Emphasized bolding with a clear example for diagnostic terms
    system_message="Provide a concise diagnosis (1-2 sentences) based on symptoms. Start your response with 'Diagnosis:' and if symptoms are clearly provided then list 1-2 possible conditions as bullet points with a leading '-'. **Bold the specific medical conditions or diseases using markdown, e.g., - **Flu** or - **Common cold**.** Avoid repetition and focus on key insights.",
    llm_config=llm_config
)

pharmacy_agent = ConversableAgent(
    name="pharmacy",
    # Emphasized bolding with a clear example for medications
    system_message="Suggest medications in a concise manner (1-2 sentences). Start with 'Pharmacy:' and if the symptoms are clearly provided then list 1-2 medications or remedies as bullet points with a leading '-'. **Bold the specific medication names or active ingredients using markdown, e.g., - Take **Ibuprofen** or - Use **Saline Nasal Spray**.** Avoid repetition and focus on essentials.",
    llm_config=llm_config
)

consultation_agent = ConversableAgent(
    name="consultation",
    system_message="Provide a concise recommendation (1-2 sentences). Start with 'Consultation:' and list 1-2 next steps as bullet points with a leading '-'. End with 'CONSULTATION_COMPLETE'. Avoid repetition and focus on actionable advice.",
    llm_config=llm_config,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("CONSULTATION_COMPLETE")
)

# Step 2: Create GroupChat
groupchat = GroupChat(
    agents=[diagnosis_agent, pharmacy_agent, consultation_agent],
    messages=[],
    max_round=4, # You can adjust max_round as needed
    speaker_selection_method="round_robin"
)

# Step 3: Create GroupChatManager
manager = GroupChatManager(name="manager", groupchat=groupchat, llm_config=llm_config)

# Step 4: Function to Run Consultation and Capture Output
def run_consultation(symptoms):
    old_stdout = sys.stdout
    redirected_output = io.StringIO()
    sys.stdout = redirected_output

    try:
        logger.debug(f"Initiating consultation with symptoms: {symptoms}")
        patient_agent.initiate_chat(
            manager,
            message=f"I am feeling {symptoms}. Can you help?",
        )
        conversation_raw = redirected_output.getvalue()
        logger.debug(f"Raw conversation output: {conversation_raw}")

        final_conversation_parts = []
        lines = conversation_raw.split('\n')
        
        # Track which agent is currently speaking
        current_agent = None
        agent_content_lines = [] # Changed to store lines, not concatenated content
        
        for line in lines:
            stripped_line = line.strip()
            
            # Skip empty lines and separators
            if (not stripped_line or
                stripped_line == "--------------------------------------------------------------------------------" or
                stripped_line.startswith("Next speaker:") or
                stripped_line.startswith(">>>>>>>>") or
                stripped_line.startswith("patient (to manager):") or
                stripped_line.startswith("manager (to ")):
                continue
                
            # Check if this is a new agent speaking
            if stripped_line.startswith("diagnosis (to manager):"):
                if current_agent and agent_content_lines:
                    final_conversation_parts.append(f"{current_agent}:\n{'\n'.join(agent_content_lines)}")
                    agent_content_lines = []
                current_agent = "Diagnosis"
                # If there's content on the same line as the agent header, capture it
                content_after_header = stripped_line[len("diagnosis (to manager):"):].strip()
                if content_after_header:
                    agent_content_lines.append(content_after_header)
                continue
            elif stripped_line.startswith("pharmacy (to manager):"):
                if current_agent and agent_content_lines:
                    final_conversation_parts.append(f"{current_agent}:\n{'\n'.join(agent_content_lines)}")
                    agent_content_lines = []
                current_agent = "Pharmacy"
                content_after_header = stripped_line[len("pharmacy (to manager):"):].strip()
                if content_after_header:
                    agent_content_lines.append(content_after_header)
                continue
            elif stripped_line.startswith("consultation (to manager):"):
                if current_agent and agent_content_lines:
                    final_conversation_parts.append(f"{current_agent}:\n{'\n'.join(agent_content_lines)}")
                    agent_content_lines = []
                current_agent = "Consultation"
                content_after_header = stripped_line[len("consultation (to manager):"):].strip()
                if content_after_header:
                    agent_content_lines.append(content_after_header)
                continue
                
            # If we have an agent and content, collect it as a new line
            if current_agent and stripped_line:
                agent_content_lines.append(stripped_line)
        
        # Add any remaining content from the last agent
        if current_agent and agent_content_lines:
            final_conversation_parts.append(f"{current_agent}:\n{'\n'.join(agent_content_lines)}")
        
        # Join parts with a double newline for better separation in the frontend
        cleaned_response = "\n\n".join(final_conversation_parts).strip()
        
        # Ensure CONSULTATION_COMPLETE is present for termination
        if not cleaned_response.endswith("CONSULTATION_COMPLETE"):
            cleaned_response += "\nCONSULTATION_COMPLETE"
        
        logger.debug(f"Cleaned conversation output for frontend: \n{cleaned_response}")
        return cleaned_response

    except Exception as e:
        logger.error(f"Error during consultation: {str(e)}", exc_info=True)
        return f"An internal server error occurred: {str(e)}"
    finally:
        sys.stdout = old_stdout
        redirected_output.close()

@app.route('/consult', methods=['POST'])
def consult():
    data = request.json
    symptoms = data.get('symptoms', '')
    if not symptoms:
        return jsonify({"error": "No symptoms provided"}), 400
    try:
        conversation = run_consultation(symptoms)
        return jsonify({"conversation": conversation})
    except Exception as e:
        logger.error(f"Error in /consult endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An unexpected server error occurred. Please try again."}), 500

@app.route('/')
def serve_frontend():
    return render_template('index.html')

if __name__ == "__main__":
    # This block is for local development only
    # Set debug=False for production or remove this block when using Gunicorn
    app.run(debug=False, port=5000)