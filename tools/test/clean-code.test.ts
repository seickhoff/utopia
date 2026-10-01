import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The repo follows /clean-code strictly. Where a rule can be checked by a machine it is checked
 * here, over every package's production source, so no limit can be relaxed by accident.
 */
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PACKAGES = ["engine", "ai", "protocol", "server", "client", "tools"];
const MAX_FUNCTION_LINES = 20;
const MAX_PARAMETERS = 2;
const MAX_FILE_LINES = 300;
const SWITCH_HOME = /-factory\.ts$/;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
}

describe("clean code", () => {
  const findings = sourceFiles().flatMap(findingsIn);

  it("keeps every function at 20 lines or fewer", () => {
    expect(violations(findings, "long function")).toEqual([]);
  });

  it("gives no function more than two parameters", () => {
    expect(violations(findings, "too many parameters")).toEqual([]);
  });

  it("takes no flag arguments", () => {
    expect(violations(findings, "flag argument")).toEqual([]);
  });

  it("never mentions null", () => {
    expect(violations(findings, "null")).toEqual([]);
  });

  it("never gives up on types with any", () => {
    expect(violations(findings, "any")).toEqual([]);
  });

  it("uses named exports only", () => {
    expect(violations(findings, "default export")).toEqual([]);
  });

  it("keeps files at 300 lines or fewer", () => {
    expect(violations(findings, "long file")).toEqual([]);
  });

  it("buries switch statements in factories", () => {
    expect(violations(findings, "switch outside a factory")).toEqual([]);
  });
});

function violations(findings: readonly Finding[], rule: string): string[] {
  return findings.filter((finding) => finding.rule === rule).map(locationOf);
}

function locationOf(finding: Finding): string {
  return `${finding.file}:${finding.line}`;
}

function sourceFiles(): string[] {
  return PACKAGES.flatMap((name) => filesUnder(join(REPO_ROOT, name, "src"))).filter((path) =>
    /\.tsx?$/.test(path),
  );
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function findingsIn(path: string): Finding[] {
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true);
  const file = relative(REPO_ROOT, path);
  const findings: Finding[] = [];
  const report = (node: ts.Node, rule: string) =>
    findings.push({ file, line: lineOf(source, node), rule });
  if (source.getLineAndCharacterOfPosition(text.length).line + 1 > MAX_FILE_LINES) {
    findings.push({ file, line: MAX_FILE_LINES + 1, rule: "long file" });
  }
  visit(source, (node) => inspect(node, { source, file, report }));
  return findings;
}

interface Inspection {
  readonly source: ts.SourceFile;
  readonly file: string;
  readonly report: (node: ts.Node, rule: string) => void;
}

function visit(node: ts.Node, act: (node: ts.Node) => void): void {
  act(node);
  node.forEachChild((child) => visit(child, act));
}

function inspect(node: ts.Node, inspection: Inspection): void {
  if (ts.isFunctionLike(node)) inspectFunction(node, inspection);
  if (node.kind === ts.SyntaxKind.NullKeyword) inspection.report(node, "null");
  if (node.kind === ts.SyntaxKind.AnyKeyword) inspection.report(node, "any");
  if (isDefaultExport(node)) inspection.report(node, "default export");
  if (ts.isSwitchStatement(node) && !SWITCH_HOME.test(inspection.file)) {
    inspection.report(node, "switch outside a factory");
  }
}

function inspectFunction(node: ts.SignatureDeclaration, inspection: Inspection): void {
  const parameters = node.parameters.filter((parameter) => parameter.name.getText() !== "this");
  if (parameters.length > MAX_PARAMETERS) inspection.report(node, "too many parameters");
  parameters.filter(isFlag).forEach((flag) => inspection.report(flag, "flag argument"));
  if (bodyLines(node, inspection.source) > MAX_FUNCTION_LINES) {
    inspection.report(node, "long function");
  }
}

function isFlag(parameter: ts.ParameterDeclaration): boolean {
  const type = parameter.type;
  const typedBoolean = type !== undefined && mentionsBoolean(type);
  const defaultsToBoolean =
    parameter.initializer?.kind === ts.SyntaxKind.TrueKeyword ||
    parameter.initializer?.kind === ts.SyntaxKind.FalseKeyword;
  return typedBoolean || defaultsToBoolean;
}

function mentionsBoolean(type: ts.TypeNode): boolean {
  if (type.kind === ts.SyntaxKind.BooleanKeyword) return true;
  return ts.isUnionTypeNode(type) && type.types.some(mentionsBoolean);
}

function bodyLines(node: ts.SignatureDeclaration, source: ts.SourceFile): number {
  const body = "body" in node ? (node.body as ts.Node | undefined) : undefined;
  if (body === undefined) return 0;
  const first = source.getLineAndCharacterOfPosition(body.getStart(source)).line;
  const last = source.getLineAndCharacterOfPosition(body.getEnd()).line;
  return ts.isBlock(body) ? last - first - 1 : last - first + 1;
}

function isDefaultExport(node: ts.Node): boolean {
  if (ts.isExportAssignment(node) && !node.isExportEquals) return true;
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some(
    (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
  );
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}
