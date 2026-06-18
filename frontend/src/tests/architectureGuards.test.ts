/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { APP_STATE_PERSISTENCE_REGISTRY } from "../lib/storage/appStatePersistenceRegistry";
import { normalizeLegacyState, normalizeState } from "../lib/storage/normalizeState";

const sourceModules = import.meta.glob("../**/*.ts", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;
const tsxSourceModules = import.meta.glob("../**/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;
const cssSourceModules = import.meta.glob("../**/*.css", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;
const guardedSourceModules = {
  ...sourceModules,
  ...tsxSourceModules,
  ...cssSourceModules
};
const TYPESCRIPT_WARNING_FILE_LINES = 1200;
const SOURCE_ERROR_FILE_LINES = 1600;
const reviewedDomainCalculatorLineLimitExceptions: Record<string, string> = {};

const mainSource = sourceAt("../main.ts");
const appControllerSource = sourceAt("../app/appController.ts");
const controllerRuntimeSource = sourceAt("../app/controllerRuntime.ts");
const typesSource = sourceAt("../types.ts");

const featureSources = Object.fromEntries(
  Object.entries(sourceModules).filter(([path]) => path.startsWith("../features/"))
);
const extractedFeatureSources = Object.fromEntries(
  Object.entries(featureSources).filter(([path]) => !path.startsWith("../features/runtime-host/"))
);

const runtimeHostHelperNames = [
  "activeInvestmentDepot",
  "activePlanningPositions",
  "activePlanningSettings",
  "depotInvestmentSettings",
  "persistCurrentState",
  "selectedInvestmentPlanningAccount",
  "setDetailLineHidden",
  "setInputValue",
  "setRangeLabel",
  "setSectionHidden",
  "setText",
  "syncStoreState"
] as const;

describe("architecture guards", () => {
  it("fails normal source files above the hard line count", () => {
    const offenders = Object.entries(guardedSourceModules)
      .map(([path, source]) => ({ path, lines: lineCount(source) }))
      .filter(({ path, lines }) => lines > SOURCE_ERROR_FILE_LINES && !isLineLimitException(path))
      .map(({ path, lines }) => `${path}: ${lines} lines`);

    expect(offenders).toEqual([]);
  });

  it("keeps controller and runtime TypeScript files below the soft line count", () => {
    const offenders = Object.entries({ ...sourceModules, ...tsxSourceModules })
      .map(([path, source]) => ({ path, lines: lineCount(source) }))
      .filter(({ path, lines }) => {
        return lines > TYPESCRIPT_WARNING_FILE_LINES && !isLineLimitException(path) && isControllerOrRuntimeFile(path);
      })
      .map(({ path, lines }) => `${path}: ${lines} lines`);

    expect(offenders).toEqual([]);
  });

  it("reports TypeScript source files above the soft line count for review", () => {
    const warnings = Object.entries({ ...sourceModules, ...tsxSourceModules })
      .map(([path, source]) => ({ path, lines: lineCount(source) }))
      .filter(({ path, lines }) => {
        return lines > TYPESCRIPT_WARNING_FILE_LINES && lines <= SOURCE_ERROR_FILE_LINES && !isLineLimitException(path);
      })
      .map(({ path, lines }) => `${path}: ${lines} lines`);

    if (warnings.length) {
      console.warn(`Files above ${TYPESCRIPT_WARNING_FILE_LINES} lines require review:\n${warnings.join("\n")}`);
    }
    expect(warnings.every((item) => /: \d+ lines$/.test(item))).toBe(true);
  });

  it("keeps app entrypoints as thin facades", () => {
    expect(lineCount(mainSource)).toBeLessThanOrEqual(50);
    expect(lineCount(appControllerSource)).toBeLessThanOrEqual(30);
    expect(lineCount(controllerRuntimeSource)).toBeLessThanOrEqual(800);

    for (const [label, source] of [
      ["main.ts", mainSource],
      ["appController.ts", appControllerSource],
      ["controllerRuntime.ts", controllerRuntimeSource]
    ] as const) {
      expect(source, label).not.toContain("function bindEvents");
      expect(source, label).not.toContain("function renderAll");
      expect(source, label).not.toContain("data-action");
      expect(source, label).not.toContain('action === "business-canvas-');
      expect(source, label).not.toContain('action === "income-planning-');
      expect(source, label).not.toContain('action === "self-employment-');
      expect(source, label).not.toMatch(/\bfunction\s+render(?:Positions|Investment|RealEstate|Combined)/);
    }
  });

  it("does not reintroduce legacy adapter files", () => {
    const legacyPaths = Object.keys(sourceModules).filter((path) =>
      /(^|\/)legacy(\/|$)|legacyApp\.ts$/i.test(path)
    );

    expect(legacyPaths).toEqual([]);
  });

  it("keeps extracted features from importing app facades or the runtime host", () => {
    const offenders = Object.entries(extractedFeatureSources).flatMap(([path, source]) => {
      const imports = importsFrom(source);
      return imports
        .filter((importPath) =>
          /(?:^|\/)(?:appController|controllerRuntime)$/.test(importPath) ||
          importPath.includes("runtime-host")
        )
        .map((importPath) => `${path} imports ${importPath}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps extracted features from calling runtime-host helpers as globals", () => {
    const offenders = Object.entries(extractedFeatureSources).flatMap(([path, source]) => {
      return runtimeHostHelperNames.flatMap((helperName) => {
        if (declaresFunction(source, helperName)) return [];
        return bareFunctionCallLines(source, helperName).map((line) => `${path}:${line} ${helperName}()`);
      });
    });

    expect(offenders).toEqual([]);
  });

  it("prevents DOM host variables from shadowing feature hosts", () => {
    const offenders = Object.entries(extractedFeatureSources).flatMap(([path, source]) => {
      return functionsInSource(source)
        .filter(({ body }) => /\b(?:const|let)\s+host\s*=\s*document\.querySelector/.test(body))
        .filter(({ body }) => /\bhost\.getState\s*\(/.test(body))
        .map(({ name, line }) => `${path}:${line} ${name}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps feature barrel re-exports pointed at real bindings", () => {
    const offenders = Object.entries(featureSources).flatMap(([path, source]) => {
      if (!path.endsWith("/index.ts")) return [];
      return reExportsFrom(source).flatMap(({ names, target }) => {
        const targetPath = resolveRelativeTsPath(path, target);
        const targetSource = sourceModules[targetPath];
        if (!targetSource) return [`${path} re-exports from missing ${target}`];
        const exportedNames = exportedBindings(targetSource);
        return names
          .filter((name) => !exportedNames.has(name))
          .map((name) => `${path} re-exports missing ${name} from ${target}`);
      });
    });

    expect(offenders).toEqual([]);
  });

  it("keeps AppState top-level modules registered across defaults, normalization, and vault persistence", () => {
    const appStateKeys = interfaceKeys(typesSource, "AppState");
    const defaultState = defaultAppState();
    const normalizedState = normalizeState(defaultState);
    const legacyState = normalizeLegacyState(defaultState);
    const registryKeys = Object.keys(APP_STATE_PERSISTENCE_REGISTRY).sort();

    expect(Object.keys(defaultState).sort()).toEqual(appStateKeys);
    expect(Object.keys(normalizedState).sort()).toEqual(appStateKeys);
    expect(Object.keys(legacyState).sort()).toEqual(appStateKeys);
    expect(registryKeys).toEqual(appStateKeys);
    expect(APP_STATE_PERSISTENCE_REGISTRY.selfEmployment).toMatchObject({
      vaultFiles: ["selfEmploymentState"],
      sidecars: [
        {
          field: "projects[].businessIdeaCanvasFile",
          basePath: "planning/projects/",
          extension: ".canvas"
        }
      ]
    });
  });
});

function lineCount(source: string): number {
  return source.split("\n").length;
}

function sourceAt(path: string): string {
  const source = sourceModules[path];
  if (!source) throw new Error(`Missing source module: ${path}`);
  return source;
}

function interfaceKeys(source: string, name: string): string[] {
  const match = new RegExp(`export\\s+interface\\s+${escapeRegExp(name)}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(source);
  if (!match) throw new Error(`Missing interface ${name}`);
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z_$][\w$]*\??:/.test(line))
    .map((line) => line.replace(/\??:.*/, ""))
    .sort();
}

function isLineLimitException(path: string): boolean {
  return (
    path.endsWith("/types.ts") ||
    path.endsWith(".config.ts") ||
    /(?:^|\/)(?:generated|__generated__)(?:\/|$)/.test(path) ||
    /\.generated\.(?:ts|tsx|css)$/.test(path) ||
    path in reviewedDomainCalculatorLineLimitExceptions
  );
}

function isControllerOrRuntimeFile(path: string): boolean {
  const fileName = path.split("/").at(-1) ?? path;
  return /controller\.tsx?$/i.test(fileName) || /runtime.*\.tsx?$/i.test(fileName);
}

function importsFrom(source: string): string[] {
  return Array.from(source.matchAll(/\bimport\s+(?:type\s+)?(?:[^"']+\s+from\s+)?["']([^"']+)["']/g)).map(
    (match) => match[1]
  );
}

function reExportsFrom(source: string): Array<{ names: string[]; target: string }> {
  return Array.from(source.matchAll(/\bexport\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)).map((match) => ({
    names: match[1]
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && !item.startsWith("type "))
      .map((item) => item.split(/\s+as\s+/)[0].trim()),
    target: match[2]
  }));
}

function resolveRelativeTsPath(fromPath: string, target: string): string {
  if (!target.startsWith(".")) return target;
  const baseParts = fromPath.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      baseParts.pop();
      continue;
    }
    baseParts.push(part);
  }
  const resolved = baseParts.join("/");
  return resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
}

function exportedBindings(source: string): Set<string> {
  const names = new Set<string>();
  for (const pattern of [
    /\bexport\s+(?:async\s+)?function\s+(\w+)/g,
    /\bexport\s+const\s+(\w+)/g,
    /\bexport\s+let\s+(\w+)/g,
    /\bexport\s+class\s+(\w+)/g,
    /\bexport\s+interface\s+(\w+)/g,
    /\bexport\s+type\s+(\w+)/g
  ]) {
    for (const match of source.matchAll(pattern)) names.add(match[1]);
  }
  for (const match of source.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const item of match[1].split(",")) {
      const name = item.trim();
      if (name && !name.startsWith("type ")) names.add(name.split(/\s+as\s+/)[0].trim());
    }
  }
  return names;
}

function declaresFunction(source: string, name: string): boolean {
  return new RegExp(`(?:^|\\n)\\s*function\\s+${escapeRegExp(name)}\\s*\\(`).test(source);
}

function bareFunctionCallLines(source: string, name: string): number[] {
  const lines = source.split("\n");
  const callPattern = new RegExp(`(^|[^.\\w])${escapeRegExp(name)}\\s*\\(`);
  const declarationPattern = new RegExp(`\\b(function|const|let|var)\\s+${escapeRegExp(name)}\\b`);
  const methodSignaturePattern = new RegExp(`\\b${escapeRegExp(name)}\\s*\\([^)]*\\)\\s*:`);
  return lines.flatMap((line, index) => {
    if (!callPattern.test(line)) return [];
    if (declarationPattern.test(line)) return [];
    if (methodSignaturePattern.test(line)) return [];
    if (new RegExp(`\\b${escapeRegExp(name)}\\s*\\(.*\\)\\s*=>`).test(line)) return [];
    return [index + 1];
  });
}

function functionsInSource(source: string): Array<{ name: string; line: number; body: string }> {
  const functions: Array<{ name: string; line: number; body: string }> = [];
  const pattern = /\bfunction\s+(\w+)[^{]*\{/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const start = match.index;
    const bodyEnd = matchingBraceEnd(source, pattern.lastIndex - 1);
    if (bodyEnd === -1) continue;
    functions.push({
      name: match[1],
      line: lineCount(source.slice(0, start)),
      body: source.slice(start, bodyEnd)
    });
    pattern.lastIndex = bodyEnd;
  }
  return functions;
}

function matchingBraceEnd(source: string, openBraceIndex: number): number {
  let depth = 0;
  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
