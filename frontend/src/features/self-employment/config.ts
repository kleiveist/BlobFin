import type { SelfEmploymentRoadmapAreaId } from "./model";

export const SELF_EMPLOYMENT_LABEL_OPTIONS = [
  "Online-Shop",
  "Beratung",
  "Dienstleistung",
  "Content",
  "App",
  "Immobiliennah",
  "Sonstiges",
  "Prioritaet"
];

export const SELF_EMPLOYMENT_ROADMAP_AREAS: Array<{
  id: SelfEmploymentRoadmapAreaId;
  title: string;
  icon: string;
}> = [
  { id: "idea", title: "Projektidee", icon: "pen" },
  { id: "planning", title: "Projektplanung", icon: "calendar" },
  { id: "tasks", title: "Aufgaben", icon: "stamp" },
  { id: "time", title: "Zeitmanagement & Habits", icon: "book" }
];
