export interface ModuleTopBarAction {
  label: string;
  action: string;
  className?: string;
}

export function moduleTopBar(title: string, subtitle: string, actions: ModuleTopBarAction[] = []): string {
  return `
    <div class="module-topbar">
      <div>
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      <div class="module-topbar-actions">
        ${actions.map(moduleTopBarActionButton).join("")}
        <button class="button secondary" type="button" data-action="open-section-home">Startseite</button>
      </div>
    </div>
  `;
}

function moduleTopBarActionButton(action: ModuleTopBarAction): string {
  const className = ["button", action.className].filter(Boolean).join(" ");
  return `<button class="${className}" type="button" data-action="${action.action}">${action.label}</button>`;
}
