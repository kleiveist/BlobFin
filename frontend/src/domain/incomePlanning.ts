import { INCOME_YEAR_LABEL_OPTIONS } from "./incomeLabels";
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
export const INCOME_PLANNING_CATEGORY_IDS: IncomePlanningCategory[] = INCOME_YEAR_LABEL_OPTIONS.map(
  (option) => option.id as IncomePlanningCategory
);

export interface IncomePlanningCategoryConfig {
  id: IncomePlanningCategory;
  label: string;
  icon: string;
  description: string;
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

type IncomePlanningCategoryOverride = Partial<
  Omit<IncomePlanningCategoryConfig, "id" | "label" | "icon" | "description">
>;

const DEFAULT_CATEGORY_CONFIG: IncomePlanningCategoryOverride = {
  defaultHoursPerWeek: 4,
  defaultMonthlyIncome: 200,
  defaultPhase: "idea",
  defaultStatus: "planned",
  risk: "medium",
  stability: "medium",
  scalability: "medium",
  steps: ["Idee beschreiben", "Zeitbudget setzen", "Erwartbares Einkommen schaetzen", "Risiken pruefen"],
  requirements: ["Konkrete Einkommensidee", "Realistische Testphase"],
  risks: ["Unklare Annahmen", "Unterschaetzter Aufwand"]
};

const INCOME_PLANNING_CATEGORY_OVERRIDES: Partial<Record<IncomePlanningCategory, IncomePlanningCategoryOverride>> = {
  salary: {
    defaultName: "Gehalt",
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
  training_allowance: {
    defaultHoursPerWeek: 35,
    defaultMonthlyIncome: 900,
    defaultPhase: "established",
    defaultStatus: "active",
    risk: "low",
    stability: "medium",
    scalability: "medium",
    goal: "Ausbildung oder duales Studium mit realistischem Zeitbudget einplanen.",
    steps: ["Wochenarbeitszeit und Schule/Studium addieren", "Lernzeiten einplanen", "Freie Zeit regelmaessig pruefen"],
    requirements: ["Ausbildungs- oder Studienplan", "Zeit fuer Lernen und Erholung"],
    risks: ["Doppelbelastung aus Arbeit und Lernphasen"]
  },
  minijob: {
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
  pocket_money: {
    defaultHoursPerWeek: 0.5,
    defaultMonthlyIncome: 50,
    defaultPhase: "established",
    defaultStatus: "active",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Kleine regelmaessige Einnahme ohne relevante Arbeitslast beruecksichtigen.",
    steps: ["Betrag festhalten", "Regelmaessigkeit pruefen", "Nicht als Arbeitszeit ueberplanen"],
    requirements: ["Verlaessliche Zahlung"],
    risks: ["Kann kurzfristig wegfallen"]
  },
  self_employed: {
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
  freelance: {
    defaultHoursPerWeek: 6,
    defaultMonthlyIncome: 500,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "medium",
    stability: "low",
    scalability: "medium",
    goal: "Freiberufliche oder projektbezogene Einkuenfte planbar aufbauen.",
    steps: ["Angebot definieren", "Honorar und Aufwand schaetzen", "Akquiseweg festlegen", "Kapazitaet blocken"],
    requirements: ["Projektfaehige Kompetenzen", "Klare Verfuegbarkeit"],
    risks: ["Projektspitzen", "Leerlauf zwischen Projekten"]
  },
  side_income: {
    defaultHoursPerWeek: 4,
    defaultMonthlyIncome: 250,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "medium",
    goal: "Weitere laufende Nebeneinkuenfte mit begrenzter Zusatzlast pruefen.",
    steps: ["Quelle konkretisieren", "Regelmaessige Wochenstunden setzen", "Einnahmen monatlich plausibilisieren"],
    requirements: ["Freie Zeitfenster", "Klare Einkommensannahme"],
    risks: ["Unterschaetzter Zusatzaufwand"]
  },
  online_sales: {
    defaultName: "Online-Verkaeufe",
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
  garage_parking_rental: {
    defaultHoursPerWeek: 1,
    defaultMonthlyIncome: 120,
    defaultPhase: "established",
    defaultStatus: "planned",
    risk: "low",
    stability: "high",
    scalability: "low",
    goal: "Garage oder Stellplatz als zeitarmes Zusatzeinkommen einplanen.",
    steps: ["Vermietbarkeit pruefen", "Preis und Nebenkosten klaeren", "Verwaltungsaufwand eintragen"],
    requirements: ["Vermietbarer Stellplatz", "Klare Nutzungsbedingungen"],
    risks: ["Leerstand", "Kleiner Verwaltungsaufwand"]
  },
  fees: {
    defaultHoursPerWeek: 4,
    defaultMonthlyIncome: 300,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "medium",
    stability: "low",
    scalability: "medium",
    goal: "Gagen oder Honorare mit schwankender Auslastung planen.",
    steps: ["Angebot oder Auftrittsformat festlegen", "Termine und Vorbereitung schaetzen", "Mindesthonorar definieren"],
    requirements: ["Buchbare Leistung", "Zeit fuer Vorbereitung"],
    risks: ["Unregelmaessige Termine", "Vorbereitungsaufwand"]
  },
  dividends: {
    defaultHoursPerWeek: 0.5,
    defaultMonthlyIncome: 100,
    defaultPhase: "growth",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "high",
    goal: "Dividenden als zeitarmes Zusatzeinkommen aufbauen.",
    steps: ["Investitionsstrategie definieren", "Risikoprofil festlegen", "Regelmaessige Ueberpruefung planen"],
    requirements: ["Investierbares Kapital", "Risikobewusstsein"],
    risks: ["Kursschwankungen", "Keine garantierten Ausschuettungen"]
  },
  asset_income: {
    defaultHoursPerWeek: 1,
    defaultMonthlyIncome: 150,
    defaultPhase: "growth",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "high",
    goal: "Einnahmen aus Vermoegen mit geringem Wochenaufwand bewerten.",
    steps: ["Vermoegensquelle bestimmen", "Erwartbaren Cashflow schaetzen", "Risiko und Liquiditaet pruefen"],
    requirements: ["Bestehendes oder geplantes Vermoegen", "Risikoprofil"],
    risks: ["Schwankende Ertraege", "Kapitalbindung"]
  },
  insurance_payouts: {
    defaultHoursPerWeek: 0.5,
    defaultMonthlyIncome: 200,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "low",
    stability: "low",
    scalability: "low",
    goal: "Versicherungsauszahlungen als moegliche, nicht dauerhaft skalierbare Einnahme beruecksichtigen.",
    steps: ["Anspruch und Zeitpunkt klaeren", "Einmaligkeit dokumentieren", "Keine dauerhafte Arbeitszeit verplanen"],
    requirements: ["Konkreter Auszahlungsanspruch"],
    risks: ["Einmalige Zahlung", "Unsicherer Zeitpunkt"]
  },
  bonus: {
    defaultHoursPerWeek: 0,
    defaultMonthlyIncome: 300,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "medium",
    stability: "low",
    scalability: "low",
    goal: "Sonderzahlungen konservativ in die Einkommensplanung aufnehmen.",
    steps: ["Bedingungen pruefen", "Wahrscheinlichkeit einschaetzen", "Nicht als dauerhafte Arbeitszeit planen"],
    requirements: ["Konkrete Zusage oder Zielregel"],
    risks: ["Nicht garantierte Zahlung"]
  },
  severance_payment: {
    defaultHoursPerWeek: 0,
    defaultMonthlyIncome: 0,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "medium",
    stability: "low",
    scalability: "low",
    goal: "Abfindung oder Ausgleichszahlung als einmaliges Szenario pruefen.",
    steps: ["Anspruch und Zeitpunkt klaeren", "Steuerliche Wirkung separat pruefen", "Einmaligen Charakter beruecksichtigen"],
    requirements: ["Konkreter Auszahlungsgrund", "Dokumentierte Annahme"],
    risks: ["Unsicherer Betrag", "Einmalige Zahlung"]
  },
  volunteer_allowance: {
    defaultHoursPerWeek: 3,
    defaultMonthlyIncome: 200,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Ehrenamtliche Verguetung mit festen Terminen realistisch planen.",
    steps: ["Passende Organisation finden", "Zeitfenster festlegen", "Pauschalen und Nachweise pruefen"],
    requirements: ["Regelmaessige freie Zeit", "Organisation oder Verein"],
    risks: ["Feste Termine", "Begrenzte Skalierbarkeit"]
  },
  trainer_allowance: {
    defaultHoursPerWeek: 4,
    defaultMonthlyIncome: 250,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Uebungsleiter-Taetigkeit mit sozialem oder fachlichem Bezug planen.",
    steps: ["Passende Organisation finden", "Zeitfenster festlegen", "Pauschalen und Nachweise pruefen"],
    requirements: ["Qualifikation oder Erfahrung", "Regelmaessige freie Zeit"],
    risks: ["Feste Termine", "Begrenzte Skalierbarkeit"]
  },
  child_youth_jobs: {
    defaultHoursPerWeek: 4,
    defaultMonthlyIncome: 200,
    defaultPhase: "setup",
    defaultStatus: "planned",
    risk: "low",
    stability: "medium",
    scalability: "low",
    goal: "Kinder- oder Jugendjob mit begrenztem Wochenaufwand planen.",
    steps: ["Erlaubte Taetigkeit klaeren", "Schule und Freizeit schuetzen", "Arbeitszeiten begrenzen"],
    requirements: ["Altersgerechte Taetigkeit", "Freie Zeitfenster"],
    risks: ["Belastung neben Schule oder Ausbildung"]
  },
  board: {
    defaultHoursPerWeek: 3,
    defaultMonthlyIncome: 500,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "high",
    stability: "medium",
    scalability: "medium",
    goal: "Langfristig eine verguetete Vorstandsrolle erreichen.",
    steps: ["Fachliches Profil schaerfen", "Berufserfahrung dokumentieren", "Netzwerk aufbauen", "Sichtbarkeit erhoehen", "Passende Organisationen identifizieren"],
    requirements: ["Nachweisbares Profil", "Relevantes Netzwerk", "Strategische Positionierung"],
    risks: ["Langer Aufbauzeitraum", "Hohe Verantwortung"]
  },
  office_holder: {
    defaultHoursPerWeek: 3,
    defaultMonthlyIncome: 300,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "medium",
    stability: "medium",
    scalability: "low",
    goal: "Verguetetes Amt oder Mandat mit realistischem Zeitbudget pruefen.",
    steps: ["Passendes Amt identifizieren", "Voraussetzungen klaeren", "Regeltermine einplanen"],
    requirements: ["Eignung oder Wahl/Benennung", "Zeit fuer Termine"],
    risks: ["Feste Verpflichtungen", "Begrenzte Skalierbarkeit"]
  },
  supervisory_board: {
    defaultName: "Aufsichtsrat",
    defaultHoursPerWeek: 3,
    defaultMonthlyIncome: 500,
    defaultPhase: "idea",
    defaultStatus: "planned",
    risk: "high",
    stability: "medium",
    scalability: "medium",
    goal: "Langfristig eine verguetete Position in einem Aufsichtsrat erreichen.",
    steps: ["Fachliches Profil schaerfen", "Berufserfahrung dokumentieren", "Netzwerk aufbauen", "Sichtbarkeit erhoehen", "Passende Branchen identifizieren"],
    requirements: ["Nachweisbares Profil", "Relevantes Netzwerk", "Strategische Positionierung"],
    risks: ["Langer Aufbauzeitraum", "Abhaengigkeit von Empfehlungen", "Hohe Verantwortung"]
  },
  other: {
    defaultName: "Sonstiges Einkommen",
    goal: "Weitere Einkommensidee strukturiert pruefen."
  }
};

export const INCOME_PLANNING_CATEGORY_CONFIGS: IncomePlanningCategoryConfig[] = INCOME_YEAR_LABEL_OPTIONS.map(
  (option) => {
    const overrides = INCOME_PLANNING_CATEGORY_OVERRIDES[option.id as IncomePlanningCategory] ?? {};
    return {
      id: option.id as IncomePlanningCategory,
      label: option.label,
      icon: option.icon,
      description: option.description,
      defaultName: overrides.defaultName ?? option.label,
      defaultHoursPerWeek: overrides.defaultHoursPerWeek ?? DEFAULT_CATEGORY_CONFIG.defaultHoursPerWeek ?? 4,
      defaultMonthlyIncome: overrides.defaultMonthlyIncome ?? DEFAULT_CATEGORY_CONFIG.defaultMonthlyIncome ?? 200,
      defaultPhase: overrides.defaultPhase ?? DEFAULT_CATEGORY_CONFIG.defaultPhase ?? "idea",
      defaultStatus: overrides.defaultStatus ?? DEFAULT_CATEGORY_CONFIG.defaultStatus ?? "planned",
      risk: overrides.risk ?? DEFAULT_CATEGORY_CONFIG.risk ?? "medium",
      stability: overrides.stability ?? DEFAULT_CATEGORY_CONFIG.stability ?? "medium",
      scalability: overrides.scalability ?? DEFAULT_CATEGORY_CONFIG.scalability ?? "medium",
      goal: overrides.goal ?? `${option.label} als Einkommensquelle realistisch pruefen.`,
      steps: overrides.steps ?? DEFAULT_CATEGORY_CONFIG.steps ?? [],
      requirements: overrides.requirements ?? DEFAULT_CATEGORY_CONFIG.requirements ?? [],
      risks: overrides.risks ?? DEFAULT_CATEGORY_CONFIG.risks ?? []
    };
  }
);

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
