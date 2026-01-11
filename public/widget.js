(function() {
  /**
   * NORA CHAT WIDGET
   * Version: 1.2
   * 
   * Inkludera scriptet så här:
   * <script src="https://din-doman.se/widget.js" data-nora-id="DITT_COMPANY_ID"></script>
   */

  // 1. Konfiguration & Setup
  // Vi letar i första hand efter data-company-id (det som dashboarden genererar)
  const currentScript = document.currentScript || document.querySelector('script[data-company-id]') || document.querySelector('script[data-nora-id]');
  
  const COMPANY_ID = currentScript ? (currentScript.getAttribute('data-company-id') || currentScript.getAttribute('data-nora-id')) : null;
  
  // Bestäm Base URL baserat på var scriptet laddas ifrån
  let BASE_URL = '';
  if (currentScript && currentScript.src) {
    try {
      const url = new URL(currentScript.src);
      BASE_URL = url.origin;
    } catch (e) {
      console.error("NORA: Kunde inte avgöra Base URL", e);
    }
  }

  if (!COMPANY_ID) {
    console.error("NORA Widget Error: Attributet 'data-company-id' (eller 'data-nora-id') saknas på script-taggen.");
    return;
  }

  // 1.5 Hämta konfiguration från Server
  let CONFIG = {
    branding_color: '#7c3aed',
    bot_name: 'NORA',
    welcome_message: 'Hej! 👋<br/>Jag är din AI-assistent. Ställ din fråga så hjälper jag dig direkt.'
  };

  async function fetchConfig() {
    try {
      const res = await fetch(`${BASE_URL}/api/widget-config/${COMPANY_ID}`);
      if (res.ok) {
        const data = await res.json();
        CONFIG = { ...CONFIG, ...data };
        // Uppdatera CSS variabler dynamiskt
        updateStyles();
        // Uppdatera text i UI
        updateText();
      }
    } catch (e) {
      console.warn("NORA: Kunde inte ladda config, använder defaults.", e);
    }
  }

  // 2. Skapa Host-element (Container)
  const host = document.createElement('div');
  host.id = 'nora-widget-host';
  Object.assign(host.style, {
    position: 'fixed',
    bottom: '0',
    right: '0',
    zIndex: '2147483647', // Max z-index för att ligga överst
    width: '0',
    height: '0',
    overflow: 'visible' // Viktigt för att innehållet ska synas utanför 0x0 boxen
  });
  document.body.appendChild(host);

  // Skapa Shadow Root (Open mode för enkel debugging)
  // Detta isolerar vår CSS från webbplatsens CSS
  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Ikoner (SVG)
  const ICONS = {
    CHAT: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    CLOSE: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    SEND: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
    BOT: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="m5.13 5.4 3.4 1.95"/><path d="M7 11.23v2.85"/><path d="M1.37 12.83 5 15.17"/><path d="m11.5 15-.5 3"/><path d="m12.5 15 .5 3"/><path d="M18.87 5.4 15.47 7.35"/><path d="M17 11.23v2.85"/><path d="m22.63 12.83-3.63 2.34"/><rect width="14" height="10" x="5" y="10" rx="4"/></svg>'
  };

  // 4. CSS (Scoped till Shadow DOM)
  const styles = `
    :host {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      --primary-color: ${CONFIG.branding_color}; /* Initial value, updated by JS */
      --primary-hover: #6d28d9; /* TODO: Calculate darker shade or use generic opacity */
      --bg-color: #ffffff;
      --text-color: #0f172a;
      --light-gray: #f1f5f9;
    }
    
    * { box-sizing: border-box; }

    /* Launcher Button */
    .nora-launcher {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: var(--primary-color);
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      color: white;
      pointer-events: auto;
      z-index: 1000;
    }
    .nora-launcher:hover {
      transform: scale(1.05);
      background: var(--primary-hover);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
    }
    
    /* Chat Window */
    .nora-window {
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
      transform-origin: bottom right;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      
      position: absolute;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 600px;
      max-height: 80vh;
      background: var(--bg-color);
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .nora-window.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    /* Header */
    .nora-header {
      background: #0f172a; 
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
      border-bottom: 1px solid #1e293b;
    }
    .nora-header-title { display: flex; flex-direction: column; }
    .nora-header-title h3 { margin: 0; font-size: 16px; font-weight: 600; }
    .nora-header-subtitle { font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .nora-online-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 4px #22c55e; }
    .nora-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 4px; transition: color 0.1s; display: flex; }
    .nora-close:hover { color: white; }

    /* Messages Area */
    .nora-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    }
    .nora-messages::-webkit-scrollbar { width: 6px; }
    .nora-messages::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }

    .nora-message { display: flex; gap: 12px; max-width: 85%; font-size: 14px; line-height: 1.5; animation: nora-fade-in 0.3s ease; }
    @keyframes nora-fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    
    .nora-message.bot { align-self: flex-start; }
    .nora-message.user { align-self: flex-end; flex-direction: row-reverse; }
    
    .nora-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .nora-message.bot .nora-avatar { background: #ede9fe; color: var(--primary-color); border: 1px solid #ddd6fe; }
    .nora-message.user .nora-avatar { background: #e2e8f0; color: #64748b; }

    .nora-bubble { padding: 12px 16px; border-radius: 12px; position: relative; word-wrap: break-word; }
    .nora-message.bot .nora-bubble { background: white; border: 1px solid #e2e8f0; border-top-left-radius: 2px; color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .nora-message.user .nora-bubble { background: var(--primary-color); color: white; border-top-right-radius: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

    .nora-bubble p { margin: 0 0 8px 0; }
    .nora-bubble p:last-child { margin: 0; }
    .nora-bubble a { color: inherit; text-decoration: underline; }
    .nora-message.bot .nora-bubble a { color: var(--primary-color); }

    /* Input Area */
    .nora-input-container { padding: 16px; background: white; border-top: 1px solid #e2e8f0; }
    .nora-form { display: flex; gap: 10px; align-items: flex-end; }
    .nora-input { 
      flex: 1; 
      padding: 12px 14px; 
      border: 1px solid #cbd5e1; 
      border-radius: 8px; 
      font-size: 14px; 
      outline: none; 
      transition: border-color 0.2s;
      background: #f8fafc;
      font-family: inherit;
    }
    .nora-input::placeholder { color: #94a3b8; }
    .nora-input:focus { border-color: var(--primary-color); background: white; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
    
    .nora-send-btn { 
      background: var(--primary-color); 
      color: white; 
      border: none; 
      border-radius: 8px; 
      width: 44px; 
      height: 44px;
      display: flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
      transition: background 0.2s; 
    }
    .nora-send-btn:hover { background: var(--primary-hover); }
    .nora-send-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

    /* Footer */
    .nora-footer { text-align: center; font-size: 11px; color: #94a3b8; padding-bottom: 8px; background: white; padding-top: 4px; }
    .nora-footer a { color: #94a3b8; text-decoration: none; font-weight: 500; }
    .nora-footer a:hover { color: var(--primary-color); }

    /* Typing Indicator */
    .nora-typing { display: flex; gap: 4px; padding: 4px; align-items: center; height: 100%; }
    .nora-dot { width: 5px; height: 5px; background: #94a3b8; border-radius: 50%; animation: nora-bounce 1.4s infinite ease-in-out both; }
    .nora-dot:nth-child(1) { animation-delay: -0.32s; }
    .nora-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes nora-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Responsive */
    @media (max-width: 480px) {
      .nora-window { bottom: 0; right: 0; width: 100vw; height: 100%; max-height: 100%; border-radius: 0; position: fixed; z-index: 2000; }
      .nora-launcher { bottom: 20px; right: 20px; }
    }
  `;

  // 5. Bygg UI Struktur
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  shadow.appendChild(styleSheet);

  const container = document.createElement('div');
  container.className = 'nora-wrapper';
  container.innerHTML = `
    <div class="nora-window" id="nora-window" aria-hidden="true">
      <div class="nora-header">
        <div class="nora-header-title">
          <h3 id="nora-header-name">${CONFIG.bot_name}</h3>
          <div class="nora-header-subtitle"><div class="nora-online-dot"></div> Alltid tillgänglig</div>
        </div>
        <button class="nora-close" id="nora-btn-close" aria-label="Stäng chatt">${ICONS.CLOSE}</button>
      </div>
      
      <div class="nora-messages" id="nora-messages" aria-live="polite">
        <div class="nora-message bot">
          <div class="nora-avatar">${ICONS.BOT}</div>
          <div class="nora-bubble" id="nora-welcome-msg"><p>${CONFIG.welcome_message}</p></div>
        </div>
      </div>
      
      <div class="nora-input-container">
        <form class="nora-form" id="nora-form">
          <input type="text" class="nora-input" placeholder="Skriv din fråga här..." id="nora-input" autocomplete="off" />
          <button type="submit" class="nora-send-btn" id="nora-send-btn" aria-label="Skicka">${ICONS.SEND}</button>
        </form>
      </div>
      <div class="nora-footer">Powered by <a href="https://nora-ai.se" target="_blank">NORA AI</a></div>
    </div>

    <div class="nora-launcher" id="nora-launcher" role="button" aria-label="Öppna chatt">
      ${ICONS.CHAT}
    </div>
  `;
  shadow.appendChild(container);

  // 6. Logik & Event Listeners
  const launcher = shadow.getElementById('nora-launcher');
  const windowEl = shadow.getElementById('nora-window');
  const closeBtn = shadow.getElementById('nora-btn-close');
  const form = shadow.getElementById('nora-form');
  const input = shadow.getElementById('nora-input');
  const messagesContainer = shadow.getElementById('nora-messages');
  const sendBtn = shadow.getElementById('nora-send-btn');
  // New elements references
  const headerNameEl = shadow.getElementById('nora-header-name');
  const welcomeMsgEl = shadow.getElementById('nora-welcome-msg');

  function updateStyles() {
    // Uppdatera CSS variabler direkt på host elementet eller via styleSheet
    styleSheet.textContent = styles.replace(/--primary-color: .*?;/, `--primary-color: ${CONFIG.branding_color};`);
  }

  function updateText() {
    if(headerNameEl) headerNameEl.textContent = CONFIG.bot_name;
    // Hantera welcome message (kan vara HTML pga nuvarande impl)
    if(welcomeMsgEl) welcomeMsgEl.innerHTML = `<p>${CONFIG.welcome_message.replace(/\n/g, '<br/>')}</p>`;
  }
  
  // Starta config fetch direkt
  fetchConfig();

  let isOpen = false;
  let messageHistory = [];

  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      windowEl.classList.add('open');
      windowEl.setAttribute('aria-hidden', 'false');
      launcher.innerHTML = ICONS.CLOSE;
      setTimeout(() => input.focus(), 100);
    } else {
      windowEl.classList.remove('open');
      windowEl.setAttribute('aria-hidden', 'true');
      launcher.innerHTML = ICONS.CHAT;
    }
  }

  // Öppna/Stäng events
  launcher.addEventListener('click', toggleWidget);
  closeBtn.addEventListener('click', toggleWidget);

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Text utilities
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  function parseMarkdown(text) {
    // Enkel markdown parser
    let html = escapeHtml(text)
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return html;
  }

  // Meddelandehantering
  function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'nora-message user';
    msgDiv.innerHTML = `
      <div class="nora-avatar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
      <div class="nora-bubble"><p>${escapeHtml(text)}</p></div>
    `;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
  }

  function createBotMessageContainer() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'nora-message bot';
    msgDiv.innerHTML = `
      <div class="nora-avatar">${ICONS.BOT}</div>
      <div class="nora-bubble">
        <div class="nora-typing"><div class="nora-dot"></div><div class="nora-dot"></div><div class="nora-dot"></div></div>
      </div>
    `;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv.querySelector('.nora-bubble');
  }

  // Skicka meddelande
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Reset input
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    
    // Visa user message direkt
    appendUserMessage(text);
    messageHistory.push({ role: 'user', content: text });

    // Visa bot typing...
    const bubbleContent = createBotMessageContainer();
    let accumulatedText = "";

    try {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messageHistory, companyId: COMPANY_ID })
      });

      if (!response.ok) throw new Error("Server error");
      
      // Clear typing indicator
      bubbleContent.innerHTML = "";

      // Hantera stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        accumulatedText += chunkValue;
        
        // Uppdatera UI löpande
        bubbleContent.innerHTML = parseMarkdown(accumulatedText);
        scrollToBottom();
      }
      
      // Spara till historik
      messageHistory.push({ role: 'assistant', content: accumulatedText });

    } catch (error) {
      console.error("NORA Chat Error:", error);
      bubbleContent.innerHTML = "<p style='color:#ef4444;'>Ett fel uppstod. Försök igen senare.</p>";
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });

})();
