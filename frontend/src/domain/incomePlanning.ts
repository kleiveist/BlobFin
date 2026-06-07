import type {
  IncomePlanningAssumptions,
  IncomePlanningCategory,
  IncomePlanningLevel,
  IncomePlanningPhase,
  IncomePlanningSource,
  IncomePlanningSourceStatus,
  IncomePlanningState
} from "../types";

export const INCOME_PLANNING_WEEK_HOURS = 168;
export const INCOME_PLANNING_CATEGORY_IDS: IncomePlanningCategory[] = [
  "main_job",
  "part_time_job",
  "minijob",
  "self_employment",
  "small_business",
  "online_sales",
  "rental",
  "capital_income",
  "trainer_volunteer",
  "board_advisory",
  "project_work",
  "other"
];

export interface IncomePlanningCategoryConfig {
  id: IncomePlanningCategory;
  label: string;
  defaultName: string;
  defaultHoursPerWeek: number;
  defaultMonthlyIncome: number;
  defaultPhase: IncomePlanningPhase;
  defaultStatus: IncomePlanningSourceStatus;
  risk: IncomePlanningLevel;
  stability: IncomePlanningLevel;
  scalability: IncomePlanningLevel;
  goal: string;
  steps: string[];
  requirements: string[];
  risks: string[];
}

export interface IncomePlanningScenario {
  sourceId: string;
  title: string;
  goal: string;
  hoursPerWeek: number;
  monthlyIncome: number;
  steps: string[];
  requirements: string[];
  risks: string[];
  loadNote: string;
}

export interface IncomePlanningModel {
  activeSources: IncomePlanningSource[];
  totalWorkHours: number;
  totalMonthlyIncome: number;
  sleepHoursPerWeek: number;
  freeTimeHoursPerWeek: number;
  privateCommitmentsHoursPerWeek: number;
  weeklyBufferHours: number;
  fixedNeedHours: number;
  usedHours: number;
  remainingFlexibleHours: number;
  status: "realistic" | "high" | "unrealistic";
  warnings: string[];
  scenarios: IncomePlanningScenario[];
}

export const INCOME_PLANNING_CATEGORY_CONFIGS: IncomePlanningCategoryConfig[] = [
  {
    id: "main_job",
    label: "Hauptjob / Gehalt",
    defaultName: "Hauptjob",
    defaultHoursPerWeek: 40,
    defaultMonthlyIncome: 3200,
    defaultPhase: "established",
    defaultStatus: "active",
    risk: "low",
    stability: "high",
    scalability: "low",
    goal: "Bestehendes Haupteinkommen als Zeitbasis beruecksichtigen.",
    steps: ["Arbeitszeit realistisch eintragen", "Pendeln und Nebenaufgaben pruefen", "Restzeit fuer Zusatzquellen begrenzen"],
    requirements: ["Vertragliche Wochenarbeitszeit", "Belastbare Freizeitplanung"],
    risks: ["Ueberplanung durch unterschaetzte Arbeitslast"]
  },
  {
    id: "part_time_job",
    label: "Teilzeitjob",
    defaultName: "Teilzeitjob",
    defaultHoursPerWeek: 25,
    defaultMonthlyIncome: 1600,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Planbare Zusatz- oder Haupteinnahme mit reduzierter Wochenarbeitszeit aufbauen.",
    steps: ["Stundenmodell festlegen", "Arbeitgeber oder Branche auswaehlen", "Starttermin und Probephase planen"],
    requirements: ["Zeitfenster im Wochenplan", "Vertragliche Rahmenbedingungen"],
    risks: ["Geringe Flexibilitaet bei parallelen Projekten"]
  },
  {
    id: "minijob",
    label: "Minijob",
    defaultName: "Minijob",
    defaultHoursPerWeek: 8,
    defaultMonthlyIncome: 538,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Begrenztes Zusatzeinkommen mit klarer Stundenobergrenze planen.",
    steps: ["Geeignete Stelle finden", "Monatliche Grenze pruefen", "Arbeitszeiten mit Hauptjob abgleichen"],
    requirements: ["Regelmaessige freie Zeitfenster", "Abstimmung mit bestehender Arbeit"],
    risks: ["Dauerhafte Wochenend- oder Abendbelastung"]
  },
  {
    id: "self_employment",
    label: "Selbststaendigkeit",
    defaultName: "Nebenberufliche Selbststaendigkeit",
    defaultHoursPerWeek: 8,
    defaultMonthlyIncome: 600,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "high",
    stability: "low",
    scalability: "high",
    goal: "Nebenberufliche Selbststaendigkeit starten und langfristig etablieren.",
    steps: ["Geschaeftsidee definieren", "Zeitbudget festlegen", "Einnahmen und Kosten planen", "Erste Kunden gewinnen", "Steuerliche und rechtliche Rahmenbedingungen pruefen"],
    requirements: ["Klare Leistung oder Produktidee", "Zeit fuer Akquise", "Grundkenntnisse zu Abrechnung und Steuern"],
    risks: ["Unklare Nachfrage", "Unterschaetzter Akquiseaufwand", "Schwankende Einnahmen"]
  },
  {
    id: "small_business",
    label: "Kleingewerbe",
    defaultName: "Kleingewerbe",
    defaultHoursPerWeek: 6,
    defaultMonthlyIncome: 350,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "medium",
    goal: "Kleines Gewerbe mit ueberschaubarem Aufwand testen.",
    steps: ["Angebot festlegen", "Kosten und Preise pruefen", "Verkaufsweg einrichten", "Monatliche Entwicklung tracken"],
    requirements: ["Einfache Buchhaltung", "Verkaufs- oder Kundenkanal"],
    risks: ["Verwaltungsaufwand", "Unregelmaessige Nachfrage"]
  },
  {
    id: "online_sales",
    label: "Onlineverkaeufe",
    defaultName: "Onlineverkaeufe",
    defaultHoursPerWeek: 3,
    defaultMonthlyIncome: 150,
    defaultPhase: "setup",
    defaultStatus: "active",
    risk: "low",
    stability: "low",
    scalability: "medium",
    goal: "Kleine Zusatzverkaeufe mit geringem Wochenaufwand realistisch planen.",
    steps: ["Verkaufsplattform auswaehlen", "Artikel und Preise festlegen", "Versandprozess standardisieren", "Zeitaufwand je Verkauf messen"],
    requirements: ["Verkaufbare Artikel", "Klare Versand- und Zahlungsabwicklung"],
    risks: ["Zeitverlust durch Einzelabwicklung", "Unregelmaessige Nachfrage"]
  },
  {
    id: "rental",
    label: "Vermietung",
    defaultName: "Vermietung",
    defaultHoursPerWeek: 2,
    defaultMonthlyIncome: 400,
    defaultPhase: "established",
    defaultStatus: "planned",
    risk: "medium",
    stability: "high",
    scalability: "medium",
    goal: "Vermietung als relativ stabile Einkommensquelle einplanen.",
    steps: ["Objekt oder Flaeche pruefen", "Miete und Nebenkosten kalkulieren", "Verwaltung und Instandhaltung einplanen"],
    requirements: ["Vermietbares Objekt", "Ruecklagen fuer Instandhaltung"],
    risks: ["Leerstand", "Reparaturen", "Verwaltungsaufwand"]
  },
  {
    id: "capital_income",
    label: "Dividenden / Kapitalertraege",
    defaultName: "Kapitalertraege",
    defaultHoursPerWeek: 1,
    defaultMonthlyIncome: 100,
    defaultPhase: "growth",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "high",
    goal: "Kapitalertraege als zeitarmes Zusatzeinkommen aufbauen.",
    steps: ["Investitionsstrategie definieren", "Risikoprofil festlegen", "Regelmaessige Ueberpruefung planen"],
    requirements: ["Investierbares Kapital", "Risikobewusstsein"],
    risks: ["Kursschwankungen", "Keine garantierten Ausschuettungen"]
  },
  {
    id: "trainer_volunteer",
    label: "Uebungsleiter / Ehrenamt",
    defaultName: "Uebungsleiter / Ehrenamt",
    defaultHoursPerWeek: 4,
    defaultMonthlyIncome: 250,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Verguetete Taetigkeit mit sozialem oder fachlichem Bezug planen.",
    steps: ["Passende Organisation finden", "Zeitfenster festlegen", "Pauschalen und Nachweise pruefen"],
    requirements: ["Qualifikation oder Erfahrung", "Regelmaessige freie Zeit"],
    risks: ["Feste Termine", "Begrenzte Skalierbarkeit"]
  },
  {
    id: "board_advisory",
    label: "Aufsichtsrat / Beirat",
    defaultName: "Aufsichtsrat / Beirat",
    defaultHoursPerWeek: 3,
    defaultMonthlyIncome: 500,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "high",
    stability: "medium",
    scalability: "medium",
    goal: "Langfristig eine verguetete Position in Aufsichtsrat oder Beirat erreichen.",
    steps: ["Fachliches Profil schaerfen", "Berufserfahrung dokumentieren", "Netzwerk aufbauen", "Sichtbarkeit erhoehen", "Passende Branchen identifizieren"],
    requirements: ["Nachweisbares Profil", "Relevantes Netzwerk", "Strategische Positionierung"],
    risks: ["Langer Aufbauzeitraum", "Abhaengigkeit von Empfehlungen", "Hohe Verantwortung"]
  },
  {
    id: "project_work",
    label: "Projektarbeit",
    defaultName: "Projektarbeit",
    defaultHoursPerWeek: 6,
    defaultMonthlyIncome: 450,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "medium",
    stability: "low",
    scalability: "medium",
    goal: "Zeitlich begrenzte Projekte als Zusatzquelle planen.",
    steps: ["Projektart definieren", "Aufwand und Honorar schaetzen", "Akquiseweg festlegen", "Kapazitaet blocken"],
    requirements: ["Projektfaehige Kompetenzen", "Klare Verfuegbarkeit"],
    risks: ["Projektspitzen", "Leerlauf zwischen Projekten"]
  },
  {
    id: "other",
    label: "Sonstiges Einkommen",
    defaultName: "Sonstiges Einkommen",
    defaultHoursPerWeek: 4,
    defaultMonthlyIncome: 200,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "medium",
    goal: "Weitere Einkommensidee strukturiert pruefen.",
    steps: ["Idee beschreiben", "Zeitbudget setzen", "Erwartbares Einkommen schaetzen", "Risiken pruefen"],
    requirements: ["Konkrete Einkommensidee", "Realistische Testphase"],
    risks: ["Unklare Annahmen", "Unterschaetzter Aufwand"]
  }
];

export function incomePlanningCategoryConfig(category: IncomePlanningCategory): IncomePlanningCategoryConfig {
  return (
    INCOME_PLANNING_CATEGORY_CONFIGS.find((config) => config.id === category) ??
    INCOME_PLANNING_CATEGORY_CONFIGS[INCOME_PLANNING_CATEGORY_CONFIGS.length - 1]
  );
}

export function buildIncomePlanningSource(
  category: IncomePlanningCategory,
  id: string,
  startYear: number,
  overrides: Partial<IncomePlanningSource> = {}
): IncomePlanningSource {
  const config = incomePlanningCategoryConfig(category);
  return {
    id,
    active: true,
    category,
    name: config.defaultName,
    hoursPerWeek: config.defaultHoursPerWeek,
    expectedMonthlyIncome: config.defaultMonthlyIncome,
    startMonth: 1,
    startYear,
    phase: config.defaultPhase,
    status: config.defaultStatus,
    risk: config.risk,
    stability: config.stability,
    scalability: config.scalability,
    ...overrides
  };
}

export function buildIncomePlanningModel(state: IncomePlanningState): IncomePlanningModel {
  const activeSources = state.sources.filter((source) => source.active);
  const totalWorkHours = roundHours(activeSources.reduce((sum, source) => sum + positiveNumber(source.hoursPerWeek), 0));
  const totalMonthlyIncome = activeSources.reduce(
    (sum, source) => sum + positiveNumber(source.expectedMonthlyIncome),
    0
  );
  const sleepHoursPerWeek = roundHours(positiveNumber(state.assumptions.sleepHoursPerDay) * 7);
  const freeTimeHoursPerWeek = roundHours(positiveNumber(state.assumptions.freeTimeHoursPerDay) * 7);
  const privateCommitmentsHoursPerWeek = roundHours(positiveNumber(state.assumptions.privateCommitmentsHoursPerWeek));
  const weeklyBufferHours = roundHours(positiveNumber(state.assumptions.weeklyBufferHours));
  const fixedNeedHours = roundHours(
    sleepHoursPerWeek + freeTimeHoursPerWeek + privateCommitmentsHoursPerWeek + weeklyBufferHours
  );
  const usedHours = roundHours(totalWorkHours + fixedNeedHours);
  const remainingFlexibleHours = roundHours(INCOME_PLANNING_WEEK_HOURS - usedHours);
  const status =
    remainingFlexibleHours < 0 || totalWorkHours > 65
      ? "unrealistic"
      : remainingFlexibleHours < 10 || totalWorkHours > 55
        ? "high"
        : "realistic";

  return {
    activeSources,
    totalWorkHours,
    totalMonthlyIncome,
    sleepHoursPerWeek,
    freeTimeHoursPerWeek,
    privateCommitmentsHoursPerWeek,
    weeklyBufferHours,
    fixedNeedHours,
    usedHours,
    remainingFlexibleHours,
    status,
    warnings: incomePlanningWarnings(state, status, totalWorkHours, remainingFlexibleHours),
    scenarios: activeSources.map((source) => incomePlanningScenario(source, status))
  };
}

function incomePlanningScenario(source: IncomePlanningSource, status: IncomePlanningModel["status"]): IncomePlanningScenario {
  const config = incomePlanningCategoryConfig(source.category);
  const loadNote =
    status === "unrealistic"
      ? "Diese Quelle sollte erst nach Entlastung oder Reduktion anderer Quellen eingeplant werden."
      : status === "high"
        ? "Diese Quelle ist moeglich, erhoeht aber die Wochenbelastung deutlich."
        : "Diese Quelle passt in die aktuelle Zeitplanung.";
  return {
    sourceId: source.id,
    title: `Szenario: ${source.name || config.label}`,
    goal: config.goal,
    hoursPerWeek: positiveNumber(source.hoursPerWeek),
    monthlyIncome: positiveNumber(source.expectedMonthlyIncome),
    steps: config.steps,
    requirements: config.requirements,
    risks: config.risks,
    loadNote
  };
}

function incomePlanningWarnings(
  state: IncomePlanningState,
  status: IncomePlanningModel["status"],
  totalWorkHours: number,
  remainingFlexibleHours: number
): string[] {
  const warnings: string[] = [];
  if (positiveNumber(state.assumptions.sleepHoursPerDay) < 7) {
    warnings.push("Die Schlafannahme liegt unter 7 Stunden pro Tag.");
  }
  if (positiveNumber(state.assumptions.freeTimeHoursPerDay) < 2) {
    warnings.push("Die freie Zeit liegt unter 2 Stunden pro Tag.");
  }
  if (positiveNumber(state.assumptions.weeklyBufferHours) < 5) {
    warnings.push("Der Wochenpuffer liegt unter 5 Stunden.");
  }
  if (status === "unrealistic") {
    warnings.push(
      "Die geplante Kombination wirkt zeitlich unrealistisch. Es bleibt zu wenig Freizeit oder Erholungszeit uebrig."
    );
  } else if (status === "high") {
    warnings.push(
      "Deine Wochenbelastung ist sehr hoch. Pruefe, ob diese Einkommensquellen dauerhaft parallel machbar sind."
    );
  }
  if (totalWorkHours > 55 && remainingFlexibleHours >= 0) {
    warnings.push("Die reine Arbeitszeit liegt ueber 55 Stunden pro Woche.");
  }
  return warnings;
}

function positiveNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundHours(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
