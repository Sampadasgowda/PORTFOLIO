const fab = document.getElementById('chat-fab');
const panel = document.getElementById('chat-panel');
const log = document.getElementById('chat-log');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const history = [];

function add(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

async function send(text) {
  text = text.trim();
  if (!text) return;
  add('user', text);
  input.value = '';
  const pending = add('bot', '…');
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history }),
    });
    const { reply } = await r.json();
    pending.textContent = reply;
    history.push({ role: 'user', text }, { role: 'bot', text: reply });
  } catch (e) {
    pending.textContent = 'Network error. Please try again.';
  }
}

fab.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  if (!panel.hidden && !log.children.length) {
    add('bot', "Hi! I'm Sampada's AI assistant. Ask me about her experience, projects or skills.");
  }
  if (!panel.hidden) input.focus();
});
document.getElementById('chat-close').addEventListener('click', () => (panel.hidden = true));
form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
document.querySelectorAll('.chips-q button').forEach((b) =>
  b.addEventListener('click', () => send(b.textContent))
);
