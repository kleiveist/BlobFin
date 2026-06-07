export interface IncomeYearLabelOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const INCOME_YEAR_LABEL_OPTIONS: IncomeYearLabelOption[] = [
  { id: "salary", label: "Gehalt", icon: "coins", description: "Regelmaessiges Arbeitsentgelt" },
  { id: "training_allowance", label: "Ausbildungsverguetung", icon: "education", description: "Verguetung waehrend Ausbildung oder dualem Studium" },
  { id: "minijob", label: "Minijob", icon: "job_badge", description: "Geringfuegige Beschaeftigung oder kleiner Nebenjob" },
  { id: "pocket_money", label: "Taschengeld", icon: "pocket_money", description: "Regelmaessiges oder einmaliges Taschengeld" },
  { id: "self_employed", label: "Selbststaendigkeit", icon: "briefcase", description: "Einkommen aus eigener Taetigkeit" },
  { id: "freelance", label: "Freiberuflich", icon: "pen", description: "Freiberufliche oder projektbezogene Einkuenfte" },
  { id: "side_income", label: "Nebeneinkuenfte", icon: "income_plus", description: "Weitere laufende Einkommensquellen" },
  { id: "online_sales", label: "Online-Verkaeufe", icon: "online_sales", description: "Einnahmen aus privaten oder gewerblichen Online-Verkaeufen" },
  { id: "garage_parking_rental", label: "Garage / Stellplatz", icon: "parking", description: "Einnahmen aus Garage oder Stellplatz" },
  { id: "fees", label: "Gagen", icon: "stage", description: "Gagen, Honorare oder Auftrittserloese" },
  { id: "dividends", label: "Dividenden", icon: "dividend", description: "Ausschuettungen aus Aktien oder Fonds" },
  { id: "asset_income", label: "Einnahme aus Vermoegen", icon: "safe", description: "Einnahmen aus Vermoegen, Kapital oder Besitz" },
  { id: "insurance_payouts", label: "Versicherungsauszahlungen", icon: "insurance_payouts", description: "Auszahlungen oder Erstattungen aus Versicherungen" },
  { id: "bonus", label: "Sonderzahlung", icon: "gift", description: "Bonus, Praemie oder Einmalzahlung" },
  { id: "severance_payment", label: "Abfindung", icon: "shield", description: "Abfindung oder Ausgleichszahlung" },
  { id: "volunteer_allowance", label: "Ehrenamtspauschale", icon: "volunteer_hand", description: "Ehrenamtliche Verguetung bis zum konfigurierten Freibetrag" },
  { id: "trainer_allowance", label: "Übungsleiterpauschale", icon: "whistle", description: "Eigenes Label fuer Verguetung im Uebungsleiterfreibetrag" },
  { id: "child_youth_jobs", label: "Kinder- und Jugendjobs", icon: "newspaper_route", description: "Zum Beispiel Zeitung austragen; nicht als lohnsteuerpflichtiger Arbeitslohn gefuehrt" },
  { id: "board", label: "Vorstand", icon: "boardroom", description: "Vorstandsverguetung" },
  { id: "office_holder", label: "Amtstraeger", icon: "stamp", description: "Verguetung fuer Amt oder Mandat" },
  { id: "supervisory_board", label: "Aufsichtsrat", icon: "oversight", description: "Aufsichtsratsverguetung" },
  { id: "other", label: "Sonstiges", icon: "tag", description: "Andere Einkommensart" }
];
