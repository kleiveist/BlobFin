import { normalizeHeader } from "./format";
import { positionFlow } from "./positionKinds";
import type { ReservePosition } from "../types";

export interface PositionIconDefinition {
  id: string;
  label: string;
  svg: string;
}

export const DEFAULT_POSITION_ICON = "tag";

export const POSITION_ICONS: PositionIconDefinition[] = [
  {
    id: "tag",
    label: "Allgemein",
    svg: '<path d="M4 11.5V5h6.5L20 14.5 14.5 20 4 11.5Z"/><path d="M7.7 8h.1"/>'
  },
  {
    id: "wallet",
    label: "Geldboerse",
    svg: '<path d="M4 7.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16V8.5A2.5 2.5 0 0 1 5.5 6H17"/><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z"/>'
  },
  {
    id: "pocket_money",
    label: "Taschengeld",
    svg: '<path d="M6 7.5V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1.5"/><rect x="4" y="7" width="16" height="13" rx="2.5"/><path d="M8 11h8"/><path d="M9 15h6"/><circle cx="12" cy="13" r="1.8"/>'
  },
  {
    id: "coins",
    label: "Einnahme",
    svg: '<ellipse cx="8" cy="7" rx="4" ry="2.3"/><path d="M4 7v4c0 1.3 1.8 2.3 4 2.3s4-1 4-2.3V7"/><path d="M12 10.5c2.3.1 4 1 4 2.3 0 1.4-1.8 2.4-4 2.4-.8 0-1.6-.1-2.2-.4"/><path d="M8 13.2v3.1c0 1.3 1.8 2.3 4 2.3s4-1 4-2.3v-3.5"/>'
  },
  {
    id: "receipt",
    label: "Ausgabe",
    svg: '<path d="M6 4h12v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 20V4Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/>'
  },
  {
    id: "shield",
    label: "Versicherung",
    svg: '<path d="M12 3 19 6v5.2c0 4.4-2.9 7.5-7 9.8-4.1-2.3-7-5.4-7-9.8V6l7-3Z"/><path d="m8.7 12 2.1 2.1 4.5-4.7"/>'
  },
  {
    id: "car",
    label: "Auto",
    svg: '<path d="M6.5 15h11l1.2-4.2A2.5 2.5 0 0 0 16.3 8H7.7a2.5 2.5 0 0 0-2.4 1.8L4 15h2.5Z"/><path d="M6 15v2.5"/><path d="M18 15v2.5"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/><path d="M7 11h10"/>'
  },
  {
    id: "home",
    label: "Wohnen",
    svg: '<path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>'
  },
  {
    id: "energy",
    label: "Energie",
    svg: '<path d="M13 2 5 13h6l-1 9 9-13h-6l0-7Z"/>'
  },
  {
    id: "phone",
    label: "Telefon",
    svg: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4"/><path d="M11.5 18h1"/>'
  },
  {
    id: "food",
    label: "Lebensmittel",
    svg: '<path d="M6 4v7"/><path d="M9 4v7"/><path d="M4.5 4v5.5A3 3 0 0 0 7.5 12v8"/><path d="M15 4c2 1.6 3 3.7 3 6.5V20"/><path d="M15 4v9h3"/>'
  },
  {
    id: "health",
    label: "Gesundheit",
    svg: '<path d="M12 20s-7-4.2-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.8-7 10-7 10Z"/><path d="M9 12h6"/><path d="M12 9v6"/>'
  },
  {
    id: "pet",
    label: "Tier",
    svg: '<circle cx="6.5" cy="9" r="1.6"/><circle cx="10" cy="6.5" r="1.6"/><circle cx="14" cy="6.5" r="1.6"/><circle cx="17.5" cy="9" r="1.6"/><path d="M8.5 15.5c0-2 1.6-4 3.5-4s3.5 2 3.5 4c0 1.5-1.1 2.5-2.4 2.1-.7-.2-1.5-.2-2.2 0-1.3.4-2.4-.6-2.4-2.1Z"/>'
  },
  {
    id: "education",
    label: "Bildung",
    svg: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11.5v4c2.8 2 7.2 2 10 0v-4"/><path d="M21 9v6"/>'
  },
  {
    id: "investment",
    label: "Investment",
    svg: '<path d="M4 19h16"/><path d="M6 16l4-5 3 3 5-8"/><path d="M16 6h2v2"/>'
  },
  {
    id: "bank",
    label: "Bank",
    svg: '<path d="m4 9 8-5 8 5H4Z"/><path d="M6 9v8"/><path d="M10 9v8"/><path d="M14 9v8"/><path d="M18 9v8"/><path d="M4 17h16"/><path d="M3 20h18"/>'
  },
  {
    id: "calendar",
    label: "Ruecklage",
    svg: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M8 14h3"/><path d="M13 14h3"/>'
  },
  {
    id: "tax",
    label: "Steuer",
    svg: '<path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v5h4"/><path d="M9 13h6"/><path d="M9 17h4"/>'
  },
  {
    id: "travel",
    label: "Reise",
    svg: '<path d="M3 13h18"/><path d="M6 17h12"/><path d="M8 13l-3-5h3l3 5"/><path d="M15 13l3-5h-3l-3 5"/>'
  },
  {
    id: "child",
    label: "Kind",
    svg: '<circle cx="12" cy="7" r="3"/><path d="M6.5 21c.6-4.1 2.4-7 5.5-7s4.9 2.9 5.5 7"/><path d="M9 11c1.8 1.2 4.2 1.2 6 0"/>'
  },
  {
    id: "gift",
    label: "Geschenk",
    svg: '<path d="M4 10h16v10H4V10Z"/><path d="M12 10v10"/><path d="M4 14h16"/><path d="M8.5 10C6 8.8 6 5 8.5 5 10.2 5 11.2 7.2 12 10"/><path d="M15.5 10C18 8.8 18 5 15.5 5 13.8 5 12.8 7.2 12 10"/>'
  },
  {
    id: "card",
    label: "Karte",
    svg: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>'
  },
  {
    id: "cashback",
    label: "Cashback",
    svg: '<path d="M7 7h9a4 4 0 1 1 0 8H9"/><path d="m9 11-4 4 4 4"/><path d="M5 15h11"/><path d="M12 7l2-3 2 3"/>'
  },
  {
    id: "interest",
    label: "Zinsen",
    svg: '<circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><path d="m18 6-12 12"/>'
  }
];

export function normalizePositionIcon(value: unknown, fallback = DEFAULT_POSITION_ICON): string {
  const icon = String(value ?? "");
  if (POSITION_ICONS.some((item) => item.id === icon)) return icon;
  const normalizedIcon = normalizeHeader(icon);
  const labelMatch = POSITION_ICONS.find((item) => normalizeHeader(item.label) === normalizedIcon);
  return labelMatch?.id ?? fallback;
}

export function positionIconLabel(iconId: string): string {
  return POSITION_ICONS.find((icon) => icon.id === iconId)?.label ?? "Allgemein";
}

export function positionIconSvg(iconId: string, className = "position-icon-svg"): string {
  const icon = POSITION_ICONS.find((item) => item.id === normalizePositionIcon(iconId)) ?? POSITION_ICONS[0];
  return `
    <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      ${icon.svg}
    </svg>
  `;
}

export function defaultPositionIconForPosition(
  position: Pick<ReservePosition, "flow" | "type" | "name">
): string {
  const name = normalizeHeader(position.name);
  if (/(auto|kfz|fahrzeug|wagen)/.test(name)) return "car";
  if (/(versicherung|schutz|haftpflicht)/.test(name)) return "shield";
  if (/(katze|hund|tier|pet)/.test(name)) return "pet";
  if (/(uni|schule|bildung|studium|kurs)/.test(name)) return "education";
  if (/(invest|depot|etf|sparrate|anlage)/.test(name)) return "investment";
  if (/(miete|wohnung|haus|wohnen|immobilie)/.test(name)) return "home";
  if (/(strom|gas|energie|heizung)/.test(name)) return "energy";
  if (/(telefon|internet|handy|mobilfunk)/.test(name)) return "phone";
  if (/(essen|lebensmittel|supermarkt|food)/.test(name)) return "food";
  if (/(arzt|gesund|medizin|apotheke)/.test(name)) return "health";
  if (/(steuer|finanzamt)/.test(name)) return "tax";
  if (/(reise|urlaub|flug|bahn)/.test(name)) return "travel";
  if (/(kind|kita|schule)/.test(name)) return "child";
  if (/(geschenk|geburtstag|weihnachten)/.test(name)) return "gift";
  if (/(karte|kredit|visa|mastercard)/.test(name)) return "card";
  if (/(bank|dispo|konto)/.test(name)) return "bank";
  if (positionFlow(position) === "income") return "wallet";
  if (position.type === "savings") return "investment";
  if (position.type === "reserve") return "calendar";
  if (position.type === "fixed") return "bank";
  return "receipt";
}
