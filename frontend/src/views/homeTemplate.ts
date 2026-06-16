import { dateField, numberField } from "./formControlsTemplate";

type OverviewIconName =
  | "income"
  | "income_plan"
  | "portfolio"
  | "table"
  | "investment"
  | "property"
  | "combine"
  | "account"
  | "pension"
  | "self_employment";

interface OverviewCardConfig {
  sectionId: string;
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  icon: OverviewIconName;
  badge?: string;
  subcards?: OverviewSubCardConfig[];
}

interface OverviewSubCardConfig {
  sectionId: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  icon: OverviewIconName;
}

export function renderHomeTemplate(): string {
  return `
    <section class="landing-page" data-module-section="home" aria-labelledby="landingTitle">
      ${LandingHero()}
      ${ModuleOverviewGrid(
        [
          {
            sectionId: "income",
            title: "Jahresnettoeinkommen",
            subtitle: "Tracker, Aussagen, Status und Grafiken",
            description:
              "Jahreswerte pflegen, Steuer- und Abgabenpositionen auswerten und Einkommensentwicklung transparent sehen.",
            actionLabel: "Einkommen oeffnen",
            icon: "income",
            badge: "Einkommen"
          },
          {
            sectionId: "statutory_pension",
            title: "Gesetzliche Rente",
            subtitle: "Rentenpunkte und Szenarien",
            description:
              "RV-Beitraege aus dem Jahresnettoeinkommen auswerten und Rentenszenarien vergleichen.",
            actionLabel: "Rente oeffnen",
            icon: "pension",
            badge: "Rente"
          },
          {
            sectionId: "planning_scenarios",
            title: "Planungen und Szenarien",
            subtitle: "Positionen, Jahrestabelle und Investmentplanung",
            description:
              "Konten strukturieren, Jahreswerte analysieren, Depotvarianten und Entnahmeannahmen planen.",
            actionLabel: "Planungen oeffnen",
            icon: "portfolio",
            badge: "Planung"
          },
          {
            sectionId: "real_estate_financing",
            title: "Immobilien",
            subtitle: "Kredit, Tilgung und Wertentwicklung",
            description:
              "Finanzierung, Tilgungsquellen, Restschuld und Immobilienwertentwicklung verbinden.",
            actionLabel: "Immobilien oeffnen",
            icon: "property",
            badge: "Immobilien"
          },
          {
            sectionId: "combined_wealth",
            title: "Vermoegen",
            subtitle: "Module zusammenfuehren und Szenarien vergleichen",
            description:
              "Konten, Depotentwicklung, Entnahmen und Immobilien in einem Vermoegenspfad vergleichen.",
            actionLabel: "Vermoegen oeffnen",
            icon: "combine",
            badge: "Vermoegen"
          }
        ],
        "module",
        "landing-main-grid"
      )}
      <div class="landing-personal-modules" aria-label="Persoenliche und organisatorische Planung">
        ${ModuleOverviewGrid(
          [
            {
              sectionId: "income_planning",
              title: "Zeitbudget & Habits",
              subtitle: "Wochenplaner, Arbeit und Gewohnheiten",
              description:
                "Arbeitszeit, Nebentaetigkeiten, private Bloecke und Habits als Wochenplan koordinieren.",
              actionLabel: "Zeitbudget planen",
              icon: "income_plan",
              badge: "Persoenlich"
            },
            {
              sectionId: "self_employment_dashboard",
              title: "Selbststaendigkeits-Dashboard",
              subtitle: "Projekte, Zeit, Budget und Gewinnpotenzial",
              description:
                "Selbststaendigkeitsprojekte planen, pruefen und mit Zeit, Budget, Aufgaben und Gewinnpotenzial verbinden.",
              actionLabel: "Dashboard oeffnen",
              icon: "self_employment",
              badge: "Projekt"
            }
          ],
          "section",
          "landing-personal-grid"
        )}
      </div>
    </section>
  `;
}

function LandingHero(): string {
  return `
    <div class="landing-hero">
      <div class="landing-hero-actions">
        <button class="button secondary landing-base-data-button" type="button" data-action="open-base-data-popup">
          Grunddaten
        </button>
      </div>
      <div id="baseDataPopup" class="settings-popover base-data-popup" role="dialog" aria-label="Grunddaten" hidden>
        <div class="settings-popover-head">
          <strong>Grunddaten</strong>
          <button class="chart-popup-close" type="button" data-action="close-base-data-popup" aria-label="Grunddaten schliessen">x</button>
        </div>
        <div class="field-grid settings-field-grid">
          ${numberField("baseDataYear", "Jahr", "setting", "year", { min: 2000, max: 2100, step: 1 })}
          ${numberField("baseDataInterestRatePercent", "Jahreszins Konto in %", "setting", "interestRatePercent", { min: 0, step: 0.01 })}
          ${numberField("baseDataCashbackRatePercent", "Cashback in %", "setting", "cashbackRatePercent", { min: 0, step: 0.01 })}
          ${dateField("baseDataEndDate", "Enddatum", "endDate")}
        </div>
      </div>
      <div class="landing-hero-graphic" aria-hidden="true">
        <div class="landing-dashboard">
          <span class="landing-dashboard-line wide"></span>
          <span class="landing-dashboard-line"></span>
          <div class="landing-bars">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="landing-mini-grid">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div class="landing-property-mark">
          <span></span>
        </div>
      </div>
      <div class="landing-hero-copy">
        <p class="eyebrow">Gefuehrter Einstieg</p>
        <h2 id="landingTitle">BlobFin</h2>
        <p>
          Starte mit dem passenden Arbeitsbereich: Einkommen auswerten oder Investments,
          Konten, Ruecklagen und Immobilien gemeinsam planen.
        </p>
      </div>
    </div>
  `;
}

function ModuleOverviewGrid(cards: OverviewCardConfig[], variant: "module" | "section", className = ""): string {
  const cardHtml = cards.map((card) => (variant === "module" ? ModuleCard(card) : SectionCard(card))).join("");
  return `<div class="module-overview-grid ${className}">${cardHtml}</div>`;
}

function ModuleCard(card: OverviewCardConfig): string {
  return overviewCard(card, "module-overview-card");
}

function SectionCard(card: OverviewCardConfig): string {
  return overviewCard(card, "section-overview-card");
}

function overviewCard(card: OverviewCardConfig, className: string): string {
  if (card.subcards?.length) {
    return `
      <article class="overview-card ${className} overview-card-group">
        <button
          class="overview-card-primary"
          type="button"
          data-action="open-section-${card.sectionId}"
          data-section-id="${card.sectionId}"
          aria-pressed="false"
        >
          <span class="overview-card-top">
            ${overviewIcon(card.icon)}
            ${card.badge ? `<span class="overview-card-badge">${card.badge}</span>` : ""}
          </span>
          <span class="overview-card-copy">
            <strong>${card.title}</strong>
            <span>${card.subtitle}</span>
            <small>${card.description}</small>
          </span>
          <span class="overview-card-action">${card.actionLabel}</span>
        </button>
        <div class="overview-subcard-list">
          ${card.subcards.map(overviewSubCard).join("")}
        </div>
      </article>
    `;
  }
  return `
    <button
      class="overview-card ${className}"
      type="button"
      data-action="open-section-${card.sectionId}"
      data-section-id="${card.sectionId}"
      aria-pressed="false"
    >
      <span class="overview-card-top">
        ${overviewIcon(card.icon)}
        ${card.badge ? `<span class="overview-card-badge">${card.badge}</span>` : ""}
      </span>
      <span class="overview-card-copy">
        <strong>${card.title}</strong>
        <span>${card.subtitle}</span>
        <small>${card.description}</small>
      </span>
      <span class="overview-card-action">${card.actionLabel}</span>
    </button>
  `;
}

function overviewSubCard(card: OverviewSubCardConfig): string {
  return `
    <button
      class="overview-subcard"
      type="button"
      data-action="open-section-${card.sectionId}"
      data-section-id="${card.sectionId}"
      aria-pressed="false"
    >
      ${overviewIcon(card.icon)}
      <span class="overview-subcard-copy">
        <strong>${card.title}</strong>
        <small>${card.subtitle}</small>
      </span>
      <span class="overview-subcard-action">${card.actionLabel}</span>
    </button>
  `;
}

function overviewIcon(icon: OverviewIconName): string {
  const paths: Record<OverviewIconName, string> = {
    income:
      '<path d="M5 19V5" /><path d="M5 19h14" /><path d="M8 15h2" /><path d="M12 11h2" /><path d="M16 7h2" /><path d="M8 11l3-3 3 2 4-5" />',
    income_plan:
      '<path d="M4 19V5" /><path d="M4 19h16" /><path d="M7 15h3" /><path d="M12 11h3" /><path d="M17 8h2" /><path d="M7 8h5" /><path d="m14 16 2 2 4-5" />',
    portfolio:
      '<rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 7V5h6v2" /><path d="M4 12h16" /><path d="M10 12v2h4v-2" />',
    table:
      '<rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16" /><path d="M9 5v14" /><path d="M15 5v14" /><path d="M4 15h16" />',
    investment:
      '<path d="M4 18h16" /><path d="M7 15V9" /><path d="M12 15V6" /><path d="M17 15v-4" /><path d="m5 10 5-4 4 3 5-5" />',
    property:
      '<path d="M4 11 12 5l8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /><path d="M8 13h1" /><path d="M15 13h1" />',
    combine:
      '<path d="M7 7h5a5 5 0 0 1 5 5v5" /><path d="m14 14 3 3 3-3" /><path d="M17 7h-5a5 5 0 0 0-5 5v5" /><path d="m4 14 3 3 3-3" />',
    account:
      '<rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M8 17h7" />',
    pension:
      '<path d="M6 19V7" /><path d="M18 19V7" /><path d="M4 19h16" /><path d="M4 7h16" /><path d="M8 7a4 4 0 0 1 8 0" /><path d="M9 12h6" /><path d="M9 15h4" />',
    self_employment:
      '<path d="M4 19V8" /><path d="M20 19V8" /><path d="M4 19h16" /><path d="M7 8V5h10v3" /><path d="M4 12h16" /><path d="M8 16h3" /><path d="M14 16h2" />'
  };
  return `
    <span class="overview-card-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        ${paths[icon]}
      </svg>
    </span>
  `;
}
