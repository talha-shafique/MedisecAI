const chatContainer = document.getElementById('chat-container');
        const chatMessages = document.getElementById('chat-messages');
        const symptomsInput = document.getElementById('symptoms-input');
        const sendButton = document.getElementById('send-button');
        const inputSection = document.getElementById('input-section');
        const newConsultationSection = document.getElementById('new-consultation-section');
        const newConsultationButton = document.getElementById('new-consultation-button');
        const searchBarWrapper = document.getElementById('search-bar-wrapper');

        // Helper function to force scroll to the very bottom
        function scrollToBottom() {
            requestAnimationFrame(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
                // A small timeout helps ensure the scroll completes, especially during rapid updates
                setTimeout(() => {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    // Fallback to scrollIntoView for specific element if needed, though direct scrollTop is often better here
                    if (chatMessages.lastElementChild) {
                        chatMessages.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                }, 150); // Increased timeout for better rendering sync
            });
        }

        // Function to add a centered error message
        function addErrorCenteredMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'error-message-centered message-wrapper';

            const errorBox = document.createElement('div');
            errorBox.className = 'error-message-box';

            const errorIcon = document.createElement('img');
            errorIcon.src = 'https://img.icons8.com/3d-fluency/100/cancel.png';
            errorIcon.className = 'w-6 h-6 shrink-0';
            errorIcon.alt = 'Error';

            const errorText = document.createElement('span');
            errorText.textContent = message;

            errorBox.appendChild(errorIcon);
            errorBox.appendChild(errorText);
            messageDiv.appendChild(errorBox);

            chatMessages.appendChild(messageDiv);
            scrollToBottom();
        }

        // Function to add a centered disclaimer message
        function addDisclaimerMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'disclaimer-message-centered message-wrapper';

            const disclaimerBox = document.createElement('div');
            disclaimerBox.className = 'disclaimer-message-box';

            const infoIcon = document.createElement('img');
            infoIcon.src = 'https://img.icons8.com/fluency/48/box-important--v1.png';
            infoIcon.className = 'w-7 h-7 shrink-0'; // Increased icon size
            infoIcon.alt = 'Info';

            const disclaimerText = document.createElement('span');
            disclaimerText.className = 'disclaimer-text-content'; // Apply new class for text content
            disclaimerText.textContent = message;

            disclaimerBox.appendChild(infoIcon);
            disclaimerBox.appendChild(disclaimerText);
            messageDiv.appendChild(disclaimerBox);

            chatMessages.appendChild(messageDiv);
            scrollToBottom();
        }

        // Function to parse and format the response into HTML
        function formatResponse(message) {
            // Remove CONSULTATION_COMPLETE and any residual _COMPLETE from the message for display purposes
            message = message.replace('CONSULTATION_COMPLETE', '').trim();
            message = message.replace('_COMPLETE', '').trim();

            // Split into lines and filter out empty lines and lines that contain only a single period
            const lines = message.split('\n').filter(line => {
                const trimmedLine = line.trim();
                return trimmedLine !== '' && trimmedLine !== '.';
            });

            let htmlContent = '';
            let currentList = null;
            let inSection = false;
            let currentSection = null;

            const processedSections = new Set();

            lines.forEach(line => {
                line = line.trim();
                if (!line) return;

                let headerMatch = line.match(/^(Diagnosis|Pharmacy|Consultation)(\s*:)?\s*(.*)$/i);

                if (headerMatch) {
                    const sectionType = headerMatch[1].toLowerCase();

                    if (processedSections.has(sectionType)) {
                        const remainingText = headerMatch[3].trim();
                        if (remainingText) {
                            let formattedRemainingText = remainingText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                            htmlContent += `<p class="response-text">${formattedRemainingText}</p>`;
                        }
                        return;
                    }

                    processedSections.add(sectionType);
                    currentSection = sectionType;

                    if (currentList) {
                        htmlContent += '</ul>';
                        currentList = null;
                    }

                    if (inSection) {
                        htmlContent += '</div>';
                    }

                    const headerText = headerMatch[1];
                    let remainingText = headerMatch[3].trim();

                    if (sectionType === 'consultation') {
                        if (remainingText.endsWith('.')) {
                            remainingText = remainingText.slice(0, -1).trim();
                        }
                    }

                    let iconUrl = '';
                    if (sectionType === 'diagnosis') {
                        iconUrl = 'https://img.icons8.com/3d-fluency/100/stethoscope.png';
                    } else if (sectionType === 'pharmacy') {
                        iconUrl = 'https://img.icons8.com/3d-fluency/100/pill.png';
                    } else if (sectionType === 'consultation') {
                        iconUrl = 'https://img.icons8.com/3d-fluency/100/medical-doctor--v2.png';
                    }

                    htmlContent += `<div class="mt-4">`;
                    inSection = true;

                    htmlContent += `<h3 class="section-header flex items-center">
                                        <img src="${iconUrl}" class="inline w-10 h-10 mr-2" alt="${sectionType} icon">
                                        <strong>${headerText}:</strong>
                                    </h3>`;

                    if (remainingText) {
                        let formattedRemainingText = remainingText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                        htmlContent += `<p class="response-text">${formattedRemainingText}</p>`;
                    }
                    return;
                }

                if (/^(\d+\.|-|\*)\s/.test(line)) {
                    if (!currentList) {
                        currentList = true;
                        htmlContent += `<ul class="response-list">`;
                    }

                    let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em>$1</em>');

                    if (formattedLine.includes(' - ')) {
                        const parts = formattedLine.split(' - ');

                        let firstPart = parts[0].replace(/^(\d+\.|-|\*)\s/, '');
                        htmlContent += `<li class="response-text">${firstPart}</li>`;

                        for (let i = 1; i < parts.length; i++) {
                            if (parts[i].trim()) {
                                htmlContent += `<li class="response-text">${parts[i].trim()}</li>`;
                            }
                        }
                    } else {
                        formattedLine = formattedLine.replace(/^(\d+\.|-|\*)\s/, '');
                        htmlContent += `<li class="response-text">${formattedLine}</li>`;
                    }
                } else {
                    if (currentList) {
                        htmlContent += '</ul>';
                        currentList = null;
                    }
                    let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em>$1</em>');

                    htmlContent += `<p class="response-text">${formattedLine}</p>`;
                }
            });

            if (currentList) {
                htmlContent += '</ul>';
            }

            if (inSection) {
                htmlContent += '</div>';
            }

            return htmlContent;
        }

        // Recursively types out elements and their content
        async function typeElement(element, parent, delay) {
            const clone = element.cloneNode(false);

            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                clone.setAttribute(attr.name, attr.value);
            }

            parent.appendChild(clone);
            scrollToBottom(); // Scroll after appending new element

            for (let i = 0; i < element.childNodes.length; i++) {
                const childNode = element.childNodes[i];

                if (childNode.nodeType === Node.TEXT_NODE) {
                    const textContentNode = document.createTextNode('');
                    clone.appendChild(textContentNode);

                    for (let j = 0; j < childNode.textContent.length; j++) {
                        textContentNode.nodeValue += childNode.textContent.charAt(j);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        scrollToBottom(); // Scroll after typing each character
                    }
                } else if (childNode.nodeType === Node.ELEMENT_NODE) {
                    if (childNode.tagName === 'IMG') {
                        const imgClone = childNode.cloneNode(true);
                        clone.appendChild(imgClone);
                        scrollToBottom(); // Scroll after adding image
                    } else {
                        await typeElement(childNode, clone, delay);
                    }
                }
            }
        }

        // Orchestrates the typing effect for an entire message
        async function typeMessage(htmlContent, targetDiv, delay = 25) {
            targetDiv.innerHTML = '';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            const children = Array.from(tempDiv.children);
            for (let i = 0; i < children.length; i++) {
                const childElement = children[i];
                await typeElement(childElement, targetDiv, delay);

                if (i < children.length - 1 && childElement.tagName === 'DIV' && childElement.classList.contains('mt-4')) {
                    await new Promise(resolve => setTimeout(resolve, delay * 10));
                } else {
                    await new Promise(resolve => setTimeout(resolve, delay * 2));
                }
                scrollToBottom(); // Scroll after each major element is fully typed
            }

            scrollToBottom();
        }

        // Function to add the new loader to a target div
        function addLoader(targetDiv) {
            targetDiv.innerHTML = `
                <div class="loader">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                </div>
            `;
            scrollToBottom();
        }

        // Adds a message box to the chat, optionally as a user message
        function addMessage(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `flex items-start gap-x-4 ${isUser ? 'justify-end' : 'justify-start'} message-wrapper`;

            const avatar = document.createElement('img');
            avatar.className = 'w-14 h-14 rounded-full shrink-0';
            avatar.src = isUser ? 'https://img.icons8.com/3d-fluency/100/guest-male--v1.png' : 'https://img.icons8.com/3d-fluency/100/bot.png';
            avatar.alt = isUser ? 'User avatar' : 'AI avatar';

            const textDiv = document.createElement('div');
            if (isUser) {
                textDiv.className = `message-box-user`;
                textDiv.textContent = content;
                messageDiv.appendChild(textDiv);
                messageDiv.appendChild(avatar);
            } else {
                messageDiv.appendChild(avatar);
                textDiv.className = `ai-message-content`;
                messageDiv.appendChild(textDiv);
            }

            chatMessages.appendChild(messageDiv);
            scrollToBottom();

            return { messageDiv, textDiv };
        }

        // Handles sending symptoms and receiving/displaying AI consultation
        async function sendSymptoms() {
            const symptoms = symptomsInput.value.trim();
            if (!symptoms) {
                addErrorCenteredMessage("Please enter some symptoms to get a consultation.");
                return;
            }
            addMessage(symptoms, true);
            symptomsInput.value = '';

            // Hide input and send button
            inputSection.classList.add('hidden');
            sendButton.disabled = true; // Also disable for good measure
            symptomsInput.disabled = true; // Also disable for good measure

            // Hide the entire fixed search bar wrapper when input section is hidden
            searchBarWrapper.classList.add('hidden');
            // Reduce padding on chat container when input bar is hidden
            chatContainer.style.paddingBottom = '2rem'; // Adjust this value as needed, e.g., '1rem', '0rem'


            const { textDiv: aiTextDiv } = addMessage('', false);
            addLoader(aiTextDiv);

            try {
                const response = await fetch('/consult', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symptoms })
                });

                aiTextDiv.innerHTML = '';

                let errorToDisplay = null;
                let data = null;

                if (!response.ok) {
                    try {
                        const errorData = await response.json();
                        if (errorData.message) {
                            errorToDisplay = `API Error: ${errorData.message}`;
                        } else if (errorData.error) {
                            errorToDisplay = `API Error: ${errorData.error}`;
                        } else {
                            errorToDisplay = `API Error: Status ${response.status} - ${response.statusText}`;
                        }
                    } catch (jsonError) {
                        const rawText = await response.text();
                        if (rawText.includes("Requests rate limit exceeded") || response.status === 429) {
                            errorToDisplay = "Requests rate limit exceeded. Please try again later.";
                        } else if (rawText.includes("An internal server error occurred")) {
                            errorToDisplay = "An internal server error occurred. Please try again later.";
                        } else {
                            errorToDisplay = `API Error: Status ${response.status} - ${response.statusText}. Response: ${rawText.substring(0, 100)}...`;
                        }
                    }
                } else {
                    data = await response.json();
                    if (data && typeof data.conversation === 'string') {
                        const lowerCaseConversation = data.conversation.toLowerCase();
                        if (lowerCaseConversation.includes("requests rate limit exceeded")) {
                            errorToDisplay = "Requests rate limit exceeded. Please try again later.";
                        } else if (lowerCaseConversation.includes("internal server error") || lowerCaseConversation.includes("api error occurred")) {
                            errorToDisplay = "An internal server error occurred. Please try again later.";
                        } else if (data.error) {
                            errorToDisplay = `API Error: ${data.error}`;
                        }
                    } else if (data && data.error) {
                        errorToDisplay = `API Error: ${data.error}`;
                    }
                }

                if (errorToDisplay) {
                    addErrorCenteredMessage(errorToDisplay);
                    // If error, bring back input and search bar for user to retry
                    inputSection.classList.remove('hidden');
                    sendButton.disabled = false;
                    symptomsInput.disabled = false;
                    searchBarWrapper.classList.remove('hidden'); // Show the bar again
                    chatContainer.style.paddingBottom = '8rem'; // Restore padding if error
                } else if (data && data.conversation) {
                    const isConsultationComplete = data.conversation.includes('CONSULTATION_COMPLETE');
                    const formattedHtml = formatResponse(data.conversation);
                    await typeMessage(formattedHtml, aiTextDiv);

                    if (isConsultationComplete) {
                        addDisclaimerMessage("This AI provides experimental insights and may not be accurate. Always consult a medical expert.");
                        // Show new consultation button here, after the disclaimer
                        newConsultationSection.classList.remove('hidden');
                        scrollToBottom(); // Ensure it scrolls down to show the button
                    }
                } else {
                    addErrorCenteredMessage("Received an empty or unexpected response from the AI.");
                    inputSection.classList.remove('hidden');
                    sendButton.disabled = false;
                    symptomsInput.disabled = false;
                    searchBarWrapper.classList.remove('hidden'); // Show the bar again
                    chatContainer.style.paddingBottom = '8rem'; // Restore padding
                }

            } catch (error) {
                aiTextDiv.innerHTML = '';
                addErrorCenteredMessage(`Network error or unexpected response: ${error.message}. Please check your connection and try again.`);
                console.error("Fetch error:", error);
                inputSection.classList.remove('hidden');
                sendButton.disabled = false;
                symptomsInput.disabled = false;
                searchBarWrapper.classList.remove('hidden'); // Show the bar again
                chatContainer.style.paddingBottom = '8rem'; // Restore padding
            }
        }

        // Update your startNewConsultation function
        function startNewConsultation() {
            // Hide the new consultation button (which is now in the scrollable area)
            newConsultationSection.classList.add('hidden');
            // Clear previous messages
            chatMessages.innerHTML = '';
            // Show the fixed search bar wrapper again
            searchBarWrapper.classList.remove('hidden');
            // Restore original padding for the input bar
            chatContainer.style.paddingBottom = '8rem';
            // Show the input and send button
            inputSection.classList.remove('hidden');
            sendButton.disabled = false;
            symptomsInput.disabled = false;
            symptomsInput.value = ''; // Clear the input field for new entry
            symptomsInput.focus();
            scrollToBottom();
        }

        // Event listeners for sending messages
        sendButton.addEventListener('click', sendSymptoms);
        symptomsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendSymptoms();
            }
        });

        // Event listener for the new consultation button
        newConsultationButton.addEventListener('click', startNewConsultation);

        // Initial setup on page load
        document.addEventListener('DOMContentLoaded', () => {
            symptomsInput.focus();
            scrollToBottom();
        });