import { describe, expect, it } from "vitest";

import { renderAccountYearTableOverview } from "../views/accountYearTables";
import { money } from "../lib/format";
import type { PlanningAccount, PlanningSettings, ReservePosition } from "../types";

const settings: PlanningSettings = {
  year: 2026,
  monthlyNetIncome: 0,
  interestRatePercent: 0,
  cashbackRatePercent: 0,
  emergencyFund: 0
};

describe("account year tables", () => {
  it("renders one read-only year table card for each account", () => {
    const html = renderAccountYearTableOverview({
      accounts: [account("konto-a", "Konto A", [income("income-a", 100)]), account("konto-b", "Konto B", [income("income-b", 50)])],
      settings,
      activeAccountId: "konto-a",
      showMaxNeeded: false
    });

    expect(count(html, "account-year-table-card")).toBe(2);
    expect(html).toContain("Konto A");
    expect(html).toContain("Konto B");
    expect(html).toContain("Aktives Konto fuer Grafik, Export und Bearbeitung");
    expect(html).toContain('data-action="select-planning-account-konto-b"');
  });

  it("keeps account summaries separated instead of merging all positions", () => {
    const html = renderAccountYearTableOverview({
      accounts: [
        account("konto-a", "Konto A", [income("income-a", 100), expense("expense-a", 25)]),
        account("konto-b", "Konto B", [income("income-b", 10), expense("expense-b", 5)])
      ],
      settings,
      activeAccountId: "konto-a",
      showMaxNeeded: false
    });

    expect(html).toContain(money(900));
    expect(html).toContain(money(60));
    expect(html).not.toContain(money(960));
  });

  it("uses the max-needed column toggle for every account table", () => {
    const accounts = [account("konto-a", "Konto A", [expense("expense-a", 25)]), account("konto-b", "Konto B", [expense("expense-b", 5)])];
    const withoutMaxNeeded = renderAccountYearTableOverview({
      accounts,
      settings,
      activeAccountId: "konto-a",
      showMaxNeeded: false
    });
    const withMaxNeeded = renderAccountYearTableOverview({
      accounts,
      settings,
      activeAccountId: "konto-a",
      showMaxNeeded: true
    });

    expect(withoutMaxNeeded).not.toContain("Max. Bedarf");
    expect(count(withMaxNeeded, "Max. Bedarf")).toBe(2);
  });
});

function account(id: string, name: string, yearlyRows: ReservePosition[]): PlanningAccount {
  return {
    id,
    name,
    type: "annual_table",
    yearlyRows
  };
}

function income(id: string, amount: number): ReservePosition {
  return position({
    id,
    name: id,
    flow: "income",
    type: "incomeMonthly",
    amount,
    payoutType: "monthly"
  });
}

function expense(id: string, amount: number): ReservePosition {
  return position({
    id,
    name: id,
    flow: "expense",
    type: "temporary",
    amount,
    payoutType: "monthly"
  });
}

function position(overrides: Partial<ReservePosition> & Pick<ReservePosition, "id" | "flow" | "type">): ReservePosition {
  return {
    active: true,
    visible: true,
    name: overrides.id,
    amount: 0,
    startMonth: 1,
    endMonth: 12,
    payoutYear: settings.year,
    payoutMonth: 12,
    payoutDay: 31,
    interestBearing: false,
    cashback: false,
    payoutType: "monthly",
    ...overrides
  };
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
