/* BrainHome v1.2: Inbox as a disposable capture list.
   Checking an Inbox item removes only the captured item; it never marks a
   completed task and never adds it to the completion history. Undo remains. */
(() => {
  'use strict';
  const previousRender = render;
  function inboxRows() {
    const captured = data.nodes.filter(node => node.parent === 'inbox');
    if (!captured.length) return '<p class="panel muted">Deine Inbox ist leer.</p>';
    return captured.map(node => `<div class="task bh12-inbox-item">
      <input type="checkbox" data-action="bh12-inbox-discard" data-id="${esc(node.id)}"
             aria-label="${esc(node.name)} aus der Inbox entfernen" title="Aus Inbox entfernen, nicht als erledigt speichern">
      <div class="detail"><strong>${esc(node.name)}</strong>${node.notes ? `<small>${esc(node.notes)}</small>` : ''}</div>
      <button class="btn" data-action="edit" data-id="${esc(node.id)}" title="In den Baum einsortieren oder bearbeiten">✎</button>
    </div>`).join('');
  }
  render = function() {
    previousRender();
    if (data.tab !== 'inbox') return;
    const host = $('app'), list = host.querySelector('.tasks');
    if (!list) return;
    list.innerHTML = inboxRows();
    const sub = host.querySelector('.topline .muted');
    if (sub) sub.textContent = 'Einträge zuerst im Baum einsortieren. Danach hier abhaken und verwerfen.';
  };
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-action="bh12-inbox-discard"]');
    if (!control) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const node = get(control.dataset.id);
    if (!node || node.parent !== 'inbox') return;
    // Never orphan subnodes by deleting a parent without the user's knowledge.
    if (descendants(node.id).length) {
      notice('Dieser Inbox-Eintrag hat Unterpunkte. Bitte zuerst einsortieren.');
      render();
      return;
    }
    data.nodes = data.nodes.filter(n => n.id !== node.id);
    save(); // preserves one-step undo; does not produce a completed task
    render();
    notice('Aus Inbox entfernt · ↶ macht es rückgängig');
  }, true);
  render();
})();
