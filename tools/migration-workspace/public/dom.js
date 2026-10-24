export const $ = id => document.getElementById(id);

export function element(tag, { text, className, ...attributes } = {}, ...children) {
  const node = document.createElement(tag);
  if (tag === 'pre') node.tabIndex = 0;
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== false) node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.filter(Boolean));
  return node;
}

export function field(id, title, { value = '', type = 'text', options, required = false, hint, ...attributes } = {}) {
  const input = options ? element('select', { id, name: id.split('-').slice(1).join('-'), className: 'input', ...attributes })
    : element('input', { id, name: id.split('-').slice(1).join('-'), type, className: 'input', autocomplete: 'off', spellcheck: 'false', ...attributes });
  if (options) for (const [key, label] of options) input.append(element('option', { value: key, text: label }));
  input.value = value ?? '';
  input.required = required;
  if (hint) input.setAttribute('aria-describedby', `${id}-hint`);
  const wrapper = element('label', { className: 'field', for: id }, element('span', { text: title }), input,
    hint ? element('small', { id: `${id}-hint`, text: hint, className: 'subtext' }) : null);
  return { wrapper, input };
}

// Only text nodes are used for material from files, the CLI, or the model.
// Secret-bearing keys are omitted even if a malformed server response contains them.
export function displayJson(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, item) => {
    if (/password|secret|token|authorization|cookie|privatekey/i.test(key)) return '[표시하지 않음]';
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) return '[중복 참조]';
      seen.add(item);
    }
    return item;
  }, 2);
}

export function feedback(id, message, error = false) {
  const target = $(id);
  target.textContent = message;
  target.classList.toggle('text-danger', error);
  target.setAttribute('role', error ? 'alert' : 'status');
}

let noticeTimer;
export function notify(message) {
  clearTimeout(noticeTimer);
  $('notice').textContent = message;
  $('notice').hidden = false;
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5500);
}
