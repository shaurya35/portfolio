import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const WEB_DIR = path.join(REPO_ROOT, "apps/web");
const ROLES = ["link", "button", "heading", "textbox", "searchbox", "status", "alert", "navigation"] as const;

type RoleName = (typeof ROLES)[number];
type Format = "text" | "json";
type ReadWhat = "theme" | "url" | "title";

type RunState = {
  runId: string;
  siteUrl: string;
  mockUrl: string;
  sitePort: number;
  mockPort: number;
  sitePid: number;
  mockPid: number;
  hostPid: number;
  socketPath: string;
  runDir: string;
  evidenceDir: string;
  headed: boolean;
  marker: string;
  startedAt: string;
};

type Target = {
  role: RoleName;
  name: string;
  exact: boolean;
  nth?: number;
};

type HostRequest =
  | { op: "ping" }
  | { op: "open"; path: string }
  | ({ op: "click" | "hover" } & Target)
  | ({ op: "fill"; value: string } & Target)
  | { op: "press"; key: string }
  | ({ op: "text"; contains?: string } & Partial<Target>)
  | ({ op: "count"; expect?: number } & Target)
  | ({ op: "attr"; attr: string; expect?: string } & Target)
  | { op: "snapshot"; file: string }
  | { op: "screenshot"; file: string; fullPage: boolean }
  | { op: "read"; what: ReadWhat; expect?: string };

type HostOk = { ok: true; data: Record<string, unknown> };
type HostFail = { ok: false; error: string };
type HostResponse = HostOk | HostFail;

type Flags = {
  format: Format;
  headed: boolean;
  fullPage: boolean;
  exact: boolean;
  positionals: string[];
  role?: string;
  name?: string;
  value?: string;
  key?: string;
  path?: string;
  contains?: string;
  expect?: string;
  attr?: string;
  nth?: number;
};

class UsageError extends Error {}
class CommandError extends Error {}

function fail(message: string, code: number): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function runIdFromEnv(): string {
  const id = process.env.PORTFOLIO_RUN_ID ?? "default";
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) {
    throw new UsageError("PORTFOLIO_RUN_ID must match [a-z0-9][a-z0-9-]{0,40}");
  }
  return id;
}

function pathsFor(runId: string): { runDir: string; evidenceDir: string } {
  const runDir = path.resolve(process.env.PORTFOLIO_RUN_DIR ?? path.join(os.tmpdir(), `portfolio-verify-${runId}`));
  const evidenceDir = path.resolve(
    process.env.PORTFOLIO_EVIDENCE_DIR ?? path.join(os.tmpdir(), "portfolio-verify-evidence", runId),
  );
  assertOutsideRepo(runDir, "run dir");
  assertOutsideRepo(evidenceDir, "evidence dir");
  if (evidenceDir === runDir || evidenceDir.startsWith(runDir + path.sep) || runDir.startsWith(evidenceDir + path.sep)) {
    throw new UsageError("evidence dir and run dir must not contain each other");
  }
  return { runDir, evidenceDir };
}

function assertOutsideRepo(dir: string, label: string) {
  const abs = path.resolve(dir);
  const repo = path.resolve(REPO_ROOT);
  if (abs === repo || abs.startsWith(repo + path.sep) || repo.startsWith(abs + path.sep)) {
    throw new UsageError(`refusing ${label} inside the repo (${abs})`);
  }
}

function statePath(runDir: string): string {
  return path.join(runDir, "state.json");
}

function readState(runDir: string): RunState | null {
  const file = statePath(runDir);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as RunState;
  if (!parsed || parsed.runDir !== runDir || typeof parsed.marker !== "string") {
    throw new CommandError(`refusing unexpected state file ${file}`);
  }
  return parsed;
}

function writeState(state: RunState) {
  fs.mkdirSync(state.runDir, { recursive: true });
  const file = statePath(state.runDir);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

function markerFor(runId: string): string {
  return `portfolio-verify:${runId}`;
}

function alive(pid: number): boolean {
  if (pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function hasMarker(pid: number, marker: string): boolean {
  try {
    return fs.readFileSync(`/proc/${pid}/environ`).includes(marker);
  } catch {
    return false;
  }
}

function parentPid(pid: number): number | null {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    const ppid = Number(rest[1]);
    return Number.isFinite(ppid) ? ppid : null;
  } catch {
    return null;
  }
}

function descendantPids(root: number): number[] {
  const children = new Map<number, number[]>();
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    const ppid = parentPid(pid);
    if (ppid == null) continue;
    const list = children.get(ppid) ?? [];
    list.push(pid);
    children.set(ppid, list);
  }
  const out: number[] = [];
  const stack = [root];
  const seen = new Set<number>();
  while (stack.length) {
    const pid = stack.pop();
    if (pid == null || seen.has(pid)) continue;
    seen.add(pid);
    out.push(pid);
    stack.push(...(children.get(pid) ?? []));
  }
  return out;
}

function listenInodes(port: number): string[] {
  const hex = port.toString(16).toUpperCase().padStart(4, "0");
  const inodes: string[] = [];
  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 10) continue;
      const localPort = cols[1]?.split(":")[1];
      if (localPort !== hex || cols[3] !== "0A") continue;
      inodes.push(cols[9]);
    }
  }
  return inodes;
}

function pidOwnsPort(pid: number, port: number): boolean {
  const inodes = new Set(listenInodes(port));
  if (inodes.size === 0) return false;
  for (const candidate of descendantPids(pid)) {
    let fds: string[] = [];
    try {
      fds = fs.readdirSync(`/proc/${candidate}/fd`);
    } catch {
      continue;
    }
    for (const fd of fds) {
      try {
        const link = fs.readlinkSync(`/proc/${candidate}/fd/${fd}`);
        const match = link.match(/^socket:\[(\d+)\]$/);
        if (match && inodes.has(match[1])) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

function bunBin(): string {
  if (process.execPath.toLowerCase().includes("bun")) return process.execPath;
  const local = path.join(os.homedir(), ".bun/bin/bun");
  if (fs.existsSync(local)) return local;
  return "bun";
}

function loadChromium(): {
  launch: (options: Record<string, unknown>) => Promise<{
    newContext: (options: Record<string, unknown>) => Promise<BrowserContext>;
    close: () => Promise<void>;
  }>;
} {
  const require = createRequire(path.join(WEB_DIR, "package.json"));
  const testPkg = require.resolve("@playwright/test/package.json");
  const playwright = createRequire(testPkg).resolve("playwright");
  const corePath = createRequire(playwright).resolve("playwright-core");
  const loaded = createRequire(corePath)(corePath) as { chromium?: ReturnType<typeof loadChromium> };
  if (!loaded.chromium) throw new CommandError("playwright-core did not export chromium");
  return loaded.chromium;
}

type Locator = {
  count: () => Promise<number>;
  nth: (index: number) => Locator;
  click: (options?: { timeout?: number }) => Promise<void>;
  hover: (options?: { timeout?: number }) => Promise<void>;
  fill: (value: string, options?: { timeout?: number }) => Promise<void>;
  innerText: (options?: { timeout?: number }) => Promise<string>;
  getAttribute: (name: string, options?: { timeout?: number }) => Promise<string | null>;
  evaluate: (fn: (el: Element) => string) => Promise<string>;
  first: () => Locator;
  waitFor: (options: { state: "attached"; timeout: number }) => Promise<void>;
};

type BrowserPage = {
  goto: (url: string, options: { waitUntil: "domcontentloaded"; timeout: number }) => Promise<unknown>;
  waitForLoadState: (state: "networkidle", options: { timeout: number }) => Promise<unknown>;
  getByRole: (role: RoleName, options: { name: string | RegExp; exact?: boolean }) => Locator;
  locator: (selector: string) => {
    ariaSnapshot: () => Promise<string>;
    first: () => { waitFor: (options: { state: "visible"; timeout: number }) => Promise<void> };
  };
  url: () => string;
  title: () => Promise<string>;
  bringToFront: () => Promise<void>;
  screenshot: (options: { path: string; fullPage: boolean }) => Promise<unknown>;
  keyboard: { press: (key: string) => Promise<void> };
  evaluate: (fn: () => string | null) => Promise<string | null>;
  waitForFunction: (fn: (expected: string) => boolean, expected: string, options: { timeout: number }) => Promise<unknown>;
};

type BrowserContext = {
  newPage: () => Promise<BrowserPage>;
  pages: () => BrowserPage[];
};

function spawnOwned(command: string, args: string[], options: { cwd?: string; env: NodeJS.ProcessEnv; logPath: string }): number {
  fs.mkdirSync(path.dirname(options.logPath), { recursive: true });
  const logFd = fs.openSync(options.logPath, "a");
  const child: ChildProcess = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  if (!child.pid) throw new CommandError(`failed to start ${command}`);
  return child.pid;
}

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function chosenPort(envName: string): Promise<number> {
  const raw = process.env[envName];
  if (!raw) return freePort();
  if (!/^\d+$/.test(raw)) throw new UsageError(`${envName} must be an integer`);
  return Number(raw);
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const response = await fetch(url, { redirect: "follow" });
  return { status: response.status, body: await response.text() };
}

function homeReady(status: number, body: string): boolean {
  return status === 200 && body.includes("Shaurya Jha") && body.includes("A Rich Post");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(label: string, timeoutMs: number, fn: () => Promise<string | null>) {
  const start = Date.now();
  let last = "not ready";
  while (Date.now() - start < timeoutMs) {
    try {
      const reason = await fn();
      if (reason == null) return;
      last = reason;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await sleep(400);
  }
  throw new CommandError(`${label} was not ready after ${timeoutMs}ms (${last})`);
}

function tail(file: string): string {
  try {
    return fs.readFileSync(file, "utf8").split("\n").slice(-30).join("\n").trim();
  } catch {
    return "";
  }
}

function killOwned(pid: number, marker: string) {
  if (!alive(pid)) return;
  if (!hasMarker(pid, marker)) {
    throw new CommandError(`refusing to kill pid ${pid}; it is not marked ${marker}`);
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

async function stopPids(state: RunState) {
  for (const pid of [state.hostPid, state.sitePid, state.mockPid]) {
    killOwned(pid, state.marker);
  }
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (![state.hostPid, state.sitePid, state.mockPid].some((pid) => alive(pid))) return;
    await sleep(200);
  }
  for (const pid of [state.hostPid, state.sitePid, state.mockPid]) {
    if (!alive(pid) || !hasMarker(pid, state.marker)) continue;
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        continue;
      }
    }
  }
}

function tsconfigPath(): string {
  return path.join(WEB_DIR, "tsconfig.json");
}

function tsconfigBackup(runDir: string): string {
  return path.join(runDir, "tsconfig.before");
}

function preserveTsconfig(runDir: string) {
  const backup = tsconfigBackup(runDir);
  if (!fs.existsSync(backup) && fs.existsSync(tsconfigPath())) {
    fs.copyFileSync(tsconfigPath(), backup);
  }
}

function restoreTsconfig(runDir: string) {
  const backup = tsconfigBackup(runDir);
  if (!fs.existsSync(backup)) return;
  const current = fs.existsSync(tsconfigPath()) ? fs.readFileSync(tsconfigPath()) : Buffer.alloc(0);
  const original = fs.readFileSync(backup);
  if (!current.equals(original)) fs.writeFileSync(tsconfigPath(), original);
}

function removeScratch(state: Pick<RunState, "runId" | "runDir">) {
  restoreTsconfig(state.runDir);
  fs.rmSync(state.runDir, { recursive: true, force: true });
  fs.rmSync(path.join(WEB_DIR, `.next-verify-${state.runId}`), { recursive: true, force: true });
}

async function cleanupRun(state: RunState) {
  await stopPids(state);
  removeScratch(state);
}

function hostCall(socketPath: string, request: HostRequest, timeoutMs = 30000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new CommandError("browser host timed out"));
    }, timeoutMs);
    let buf = "";
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on("connect", () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const nl = buf.indexOf("\n");
      if (nl < 0) return;
      clearTimeout(timer);
      socket.end();
      let message: HostResponse;
      try {
        message = JSON.parse(buf.slice(0, nl)) as HostResponse;
      } catch {
        reject(new CommandError(`bad host response ${buf.slice(0, 200)}`));
        return;
      }
      if (!message.ok) reject(new CommandError(message.error));
      else resolve(message.data);
    });
  });
}

async function healthy(state: RunState): Promise<string | null> {
  for (const [label, pid] of [
    ["mock", state.mockPid],
    ["site", state.sitePid],
    ["browser", state.hostPid],
  ] as const) {
    if (!alive(pid)) return `${label} pid ${pid} is not running`;
    if (!hasMarker(pid, state.marker)) return `${label} pid ${pid} lost its run marker`;
  }
  if (!pidOwnsPort(state.sitePid, state.sitePort)) return `site port ${state.sitePort} is not owned by pid ${state.sitePid}`;
  if (!pidOwnsPort(state.mockPid, state.mockPort)) return `mock port ${state.mockPort} is not owned by pid ${state.mockPid}`;
  try {
    const health = await fetchText(`${state.mockUrl}/health`);
    if (health.status !== 200 || !health.body.includes('"ok"')) return `mock health returned ${health.status}`;
  } catch (error) {
    return `mock health failed (${error instanceof Error ? error.message : String(error)})`;
  }
  try {
    const home = await fetchText(state.siteUrl);
    if (!homeReady(home.status, home.body)) return `home is status ${home.status} without the seeded post`;
  } catch (error) {
    return `home failed (${error instanceof Error ? error.message : String(error)})`;
  }
  try {
    await hostCall(state.socketPath, { op: "ping" }, 5000);
  } catch (error) {
    return `browser host failed (${error instanceof Error ? error.message : String(error)})`;
  }
  return null;
}

function emit(format: Format, data: Record<string, unknown>, text: string) {
  if (format === "json") process.stdout.write(`${JSON.stringify(data)}\n`);
  else process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

function summary(state: RunState, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: state.siteUrl,
    mock: state.mockUrl,
    runId: state.runId,
    runDir: state.runDir,
    evidenceDir: state.evidenceDir,
    headed: state.headed,
    sitePid: state.sitePid,
    mockPid: state.mockPid,
    hostPid: state.hostPid,
    ...extra,
  };
}

function summaryText(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

async function launch(flags: Flags) {
  const runId = runIdFromEnv();
  const { runDir, evidenceDir } = pathsFor(runId);
  const existing = readState(runDir);
  if (existing) {
    const reason = await healthy(existing);
    if (reason == null && existing.headed === flags.headed) {
      emit(flags.format, { status: "ok", alreadyRunning: true, ...summary(existing) }, summaryText({ status: "ok", alreadyRunning: true, ...summary(existing) }));
      return;
    }
    await cleanupRun(existing);
  }
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
  const sitePort = await chosenPort("PORTFOLIO_SITE_PORT");
  const mockPort = await chosenPort("PORTFOLIO_MOCK_PORT");
  const siteUrl = `http://127.0.0.1:${sitePort}`;
  const mockUrl = `http://127.0.0.1:${mockPort}`;
  const marker = markerFor(runId);
  const state: RunState = {
    runId,
    siteUrl,
    mockUrl,
    sitePort,
    mockPort,
    sitePid: 0,
    mockPid: 0,
    hostPid: 0,
    socketPath: path.join(runDir, "browser.sock"),
    runDir,
    evidenceDir,
    headed: flags.headed,
    marker,
    startedAt: new Date().toISOString(),
  };
  writeState(state);
  const childEnv = { ...process.env, PORTFOLIO_CHILD: marker };
  try {
    state.mockPid = spawnOwned(bunBin(), ["e2e/mock-backend.ts"], {
      cwd: WEB_DIR,
      env: { ...childEnv, MOCK_BACKEND_PORT: String(mockPort), MOCK_BACKEND_ORIGIN: siteUrl },
      logPath: path.join(runDir, "mock.log"),
    });
    writeState(state);
    await waitUntil("mock", 20000, async () => {
      const health = await fetchText(`${mockUrl}/health`);
      return health.status === 200 ? null : `status ${health.status}`;
    });
    const nextBin = path.join(WEB_DIR, "node_modules/next/dist/bin/next");
    preserveTsconfig(runDir);
    state.sitePid = spawnOwned("node", [nextBin, "dev", "-H", "127.0.0.1", "-p", String(sitePort)], {
      cwd: WEB_DIR,
      env: {
        ...childEnv,
        RUST_API_URL: mockUrl,
        NEXT_PUBLIC_RUST_API_URL: mockUrl,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_DIST_DIR: `.next-verify-${runId}`,
      },
      logPath: path.join(runDir, "site.log"),
    });
    writeState(state);
    await waitUntil("site", Number(process.env.PORTFOLIO_READY_TIMEOUT_MS ?? 180000), async () => {
      const home = await fetchText(siteUrl);
      return homeReady(home.status, home.body) ? null : `status ${home.status}`;
    });
    restoreTsconfig(runDir);
    state.hostPid = spawnOwned(bunBin(), [path.join(SCRIPT_DIR, "control-portfolio.ts"), "__host"], {
      cwd: REPO_ROOT,
      env: { ...childEnv, PORTFOLIO_RUN_DIR: runDir, PORTFOLIO_RUN_ID: runId, DISPLAY: process.env.DISPLAY ?? "" },
      logPath: path.join(runDir, "host.log"),
    });
    writeState(state);
    await waitUntil("browser", 30000, async () => {
      await hostCall(state.socketPath, { op: "ping" }, 2000);
      return null;
    });
  } catch (error) {
    const siteLog = tail(path.join(runDir, "site.log"));
    const hostLog = tail(path.join(runDir, "host.log"));
    await cleanupRun(state).catch(() => undefined);
    const detail = [error instanceof Error ? error.message : String(error), siteLog && `site.log:\n${siteLog}`, hostLog && `host.log:\n${hostLog}`]
      .filter(Boolean)
      .join("\n");
    throw new CommandError(detail);
  }
  emit(flags.format, { status: "ok", ...summary(state) }, summaryText({ status: "ok", ...summary(state) }));
}

async function doctor(flags: Flags) {
  const runId = runIdFromEnv();
  const { runDir } = pathsFor(runId);
  const state = readState(runDir);
  if (!state) fail(`no run state in ${runDir}. Run control-portfolio launch first.`, 3);
  const reason = await healthy(state);
  const data = {
    status: reason ? "fail" : "ok",
    ...(reason ? { reason } : { home: "Shaurya Jha, A Rich Post" }),
    ...summary(state),
  };
  emit(flags.format, data, summaryText(data));
  if (reason) process.exit(3);
}

async function cleanup(flags: Flags) {
  const runId = runIdFromEnv();
  const { runDir, evidenceDir } = pathsFor(runId);
  const state = readState(runDir);
  if (!state) {
    removeScratch({ runId, runDir });
    emit(flags.format, { status: "already clean", runId, evidenceDir }, summaryText({ status: "already clean", runId, evidenceDir }));
    return;
  }
  await cleanupRun(state);
  emit(
    flags.format,
    { status: "stopped", runId, evidenceDir: state.evidenceDir },
    summaryText({ status: "stopped", runId, evidenceDir: state.evidenceDir }),
  );
}

function listEvidence(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function evidence(flags: Flags) {
  const runId = runIdFromEnv();
  const { evidenceDir } = pathsFor(runId);
  const files = listEvidence(evidenceDir);
  emit(flags.format, { evidenceDir, files }, [`evidenceDir: ${evidenceDir}`, ...files].join("\n"));
}

function requireState(): RunState {
  const runId = runIdFromEnv();
  const { runDir } = pathsFor(runId);
  const state = readState(runDir);
  if (!state) throw new CommandError(`no run state in ${runDir}. Run control-portfolio launch first.`);
  return state;
}

function targetFrom(flags: Flags): Target {
  if (!flags.role || !ROLES.includes(flags.role as RoleName)) {
    throw new UsageError(`--role must be one of ${ROLES.join(", ")}`);
  }
  if (!flags.name) throw new UsageError("--name is required");
  return { role: flags.role as RoleName, name: flags.name, exact: flags.exact, nth: flags.nth };
}

function proofFile(state: RunState, file: string | undefined): string {
  if (!file) throw new UsageError("--path is required");
  const abs = path.resolve(file);
  const root = path.resolve(state.evidenceDir);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new CommandError(`write proof under ${root}`);
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}

async function browser(flags: Flags) {
  const [action, positional] = flags.positionals;
  if (!action) throw new UsageError("browser needs a subcommand");
  const state = requireState();
  let request: HostRequest;
  if (action === "open") {
    if (!positional) throw new UsageError("browser open needs a path");
    request = { op: "open", path: positional };
  } else if (action === "click" || action === "hover") {
    request = { op: action, ...targetFrom(flags) };
  } else if (action === "fill") {
    if (flags.value == null) throw new UsageError("browser fill needs --value");
    request = { op: "fill", value: flags.value, ...targetFrom(flags) };
  } else if (action === "press") {
    if (!flags.key) throw new UsageError("browser press needs --key");
    request = { op: "press", key: flags.key };
  } else if (action === "text") {
    const partial = flags.role || flags.name ? targetFrom(flags) : {};
    request = { op: "text", contains: flags.contains, ...partial };
  } else if (action === "count") {
    const expect = flags.expect == null ? undefined : Number(flags.expect);
    if (flags.expect != null && !/^\d+$/.test(flags.expect)) throw new UsageError("--expect must be an integer for count");
    request = { op: "count", expect, ...targetFrom(flags) };
  } else if (action === "attr") {
    if (!flags.attr) throw new UsageError("browser attr needs --attr");
    request = { op: "attr", attr: flags.attr, expect: flags.expect, ...targetFrom(flags) };
  } else if (action === "snapshot") {
    request = { op: "snapshot", file: proofFile(state, flags.path) };
  } else if (action === "screenshot") {
    request = { op: "screenshot", file: proofFile(state, flags.path), fullPage: flags.fullPage };
  } else if (action === "read") {
    const what = positional;
    if (what !== "theme" && what !== "url" && what !== "title") {
      throw new UsageError("browser read needs theme, url, or title");
    }
    request = { op: "read", what, expect: flags.expect };
  } else {
    throw new UsageError(`unknown browser command ${action}`);
  }
  const data = await hostCall(state.socketPath, request);
  const text =
    action === "snapshot" || action === "screenshot"
      ? `${action}: ${String(data.file)}`
      : action === "count"
        ? String(data.count)
        : action === "read" || action === "attr"
          ? String(data.value)
          : action === "text"
            ? String(data.text)
            : summaryText(data);
  emit(flags.format, data, text);
}

function usage() {
  return `control-portfolio launch [--headed]
control-portfolio doctor
control-portfolio cleanup
control-portfolio evidence
control-portfolio browser open <path>
control-portfolio browser click|hover|fill|count|attr --role <role> --name <name> [--exact] [--nth N]
control-portfolio browser fill --value <text>
control-portfolio browser press --key <key>
control-portfolio browser text [--role <role> --name <name>] [--contains <text>]
control-portfolio browser snapshot --aria --path <file>
control-portfolio browser screenshot [--full-page] --path <file>
control-portfolio browser read theme|url|title [--expect <value>]
control-portfolio browser count|attr --expect <value>

--format text|json   print a line-oriented record or one JSON object
PORTFOLIO_RUN_ID     isolate a second instance (default: default)`;
}

function parseArgv(argv: string[]): Flags {
  const flags: Flags = { format: "text", headed: false, fullPage: false, exact: false, positionals: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const valueOf = () => {
      if (token.includes("=")) return token.slice(token.indexOf("=") + 1);
      const value = argv[++i];
      if (value == null || value.startsWith("--")) throw new UsageError(`missing value for ${token}`);
      return value;
    };
    if (token === "--headed") flags.headed = true;
    else if (token === "--full-page") flags.fullPage = true;
    else if (token === "--exact") flags.exact = true;
    else if (token === "--aria") continue;
    else if (token === "--format" || token.startsWith("--format=")) {
      const value = valueOf();
      if (value !== "text" && value !== "json") throw new UsageError("--format must be text or json");
      flags.format = value;
    } else if (token === "--role" || token.startsWith("--role=")) flags.role = valueOf();
    else if (token === "--name" || token.startsWith("--name=")) flags.name = valueOf();
    else if (token === "--value" || token.startsWith("--value=")) flags.value = valueOf();
    else if (token === "--key" || token.startsWith("--key=")) flags.key = valueOf();
    else if (token === "--path" || token.startsWith("--path=")) flags.path = valueOf();
    else if (token === "--contains" || token.startsWith("--contains=")) flags.contains = valueOf();
    else if (token === "--expect" || token.startsWith("--expect=")) flags.expect = valueOf();
    else if (token === "--attr" || token.startsWith("--attr=")) flags.attr = valueOf();
    else if (token === "--nth" || token.startsWith("--nth=")) {
      const value = valueOf();
      if (!/^\d+$/.test(value)) throw new UsageError("--nth must be a non-negative integer");
      flags.nth = Number(value);
    } else if (token.startsWith("--")) throw new UsageError(`unknown flag ${token}`);
    else flags.positionals.push(token);
  }
  return flags;
}

function isRole(value: unknown): value is RoleName {
  return typeof value === "string" && ROLES.includes(value as RoleName);
}

function parseTarget(raw: Record<string, unknown>): Target {
  if (!isRole(raw.role)) throw new Error(`unsupported role ${String(raw.role)}`);
  if (typeof raw.name !== "string" || raw.name.length === 0) throw new Error("name is required");
  if (typeof raw.exact !== "boolean") throw new Error("exact is required");
  if (raw.nth != null && (typeof raw.nth !== "number" || raw.nth < 0)) throw new Error("nth must be a non-negative number");
  return { role: raw.role, name: raw.name, exact: raw.exact, nth: typeof raw.nth === "number" ? raw.nth : undefined };
}

function parseRequest(raw: unknown): HostRequest {
  if (!raw || typeof raw !== "object") throw new Error("request must be an object");
  const body = raw as Record<string, unknown>;
  if (body.op === "ping") return { op: "ping" };
  if (body.op === "open" && typeof body.path === "string") return { op: "open", path: body.path };
  if (body.op === "press" && typeof body.key === "string") return { op: "press", key: body.key };
  if ((body.op === "click" || body.op === "hover") && body.role) return { op: body.op, ...parseTarget(body) };
  if (body.op === "fill" && typeof body.value === "string") return { op: "fill", value: body.value, ...parseTarget(body) };
  if (body.op === "text") {
    const target = body.role ? parseTarget(body) : {};
    return { op: "text", contains: typeof body.contains === "string" ? body.contains : undefined, ...target };
  }
  if (body.op === "count") {
    return { op: "count", expect: typeof body.expect === "number" ? body.expect : undefined, ...parseTarget(body) };
  }
  if (body.op === "attr" && typeof body.attr === "string") {
    return { op: "attr", attr: body.attr, expect: typeof body.expect === "string" ? body.expect : undefined, ...parseTarget(body) };
  }
  if (body.op === "snapshot" && typeof body.file === "string") return { op: "snapshot", file: body.file };
  if (body.op === "screenshot" && typeof body.file === "string" && typeof body.fullPage === "boolean") {
    return { op: "screenshot", file: body.file, fullPage: body.fullPage };
  }
  if (body.op === "read" && (body.what === "theme" || body.what === "url" || body.what === "title")) {
    return { op: "read", what: body.what, expect: typeof body.expect === "string" ? body.expect : undefined };
  }
  throw new Error(`unsupported request ${String(body.op)}`);
}

function sameOrigin(siteUrl: string, input: string): string {
  if (input.startsWith("//")) throw new Error("refusing a protocol-relative URL");
  const url = new URL(input, siteUrl);
  if (url.origin !== new URL(siteUrl).origin) throw new Error(`refusing off-site URL ${url.origin}`);
  return url.toString();
}

async function describe(locator: Locator, limit = 5): Promise<string[]> {
  const count = await locator.count();
  const names: string[] = [];
  for (let i = 0; i < Math.min(count, limit); i++) {
    names.push(
      await locator.nth(i).evaluate((el) => {
        const label = el.getAttribute("aria-label");
        return (label || el.textContent || "").replace(/\s+/g, " ").trim();
      }),
    );
  }
  return names;
}

async function pick(page: BrowserPage, target: Target): Promise<Locator> {
  const all = page.getByRole(target.role, { name: target.name, exact: target.exact });
  const count = await all.count();
  if (target.nth != null) {
    if (target.nth >= count) {
      const names = await describe(all);
      throw new Error(`nth ${target.nth} is outside ${count} ${target.role} matches for ${JSON.stringify(target.name)} (${names.join(" | ")})`);
    }
    return all.nth(target.nth);
  }
  if (count !== 1) {
    const names = await describe(all);
    throw new Error(
      count === 0
        ? `no ${target.role} named ${JSON.stringify(target.name)}`
        : `${count} ${target.role} matches for ${JSON.stringify(target.name)}; pass --nth. Matches: ${names.join(" | ")}`,
    );
  }
  return all;
}

function assertProofPath(state: RunState, file: string) {
  const abs = path.resolve(file);
  const root = path.resolve(state.evidenceDir);
  if (!abs.startsWith(root + path.sep)) throw new Error(`write proof under ${root}`);
}

async function settled(page: BrowserPage) {
  let last = "";
  let stable = 0;
  const start = Date.now();
  while (Date.now() - start < 3000) {
    const now = `${page.url()}|${await page.title()}`;
    if (now === last) {
      stable += 1;
      if (stable >= 2) return;
    } else {
      last = now;
      stable = 0;
    }
    await sleep(150);
  }
}

async function perform(page: BrowserPage, state: RunState, request: HostRequest): Promise<Record<string, unknown>> {
  await page.bringToFront().catch(() => undefined);
  if (request.op === "ping") return { pong: true };
  if (request.op === "open") {
    const url = sameOrigin(state.siteUrl, request.path);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 15000 });
    await settled(page);
    return { url: page.url(), title: await page.title() };
  }
  if (request.op === "click" || request.op === "hover" || request.op === "fill") {
    const locator = await pick(page, request);
    const href = request.op === "click" && request.role === "link" ? await locator.getAttribute("href") : null;
    const beforeUrl = page.url();
    if (request.op === "click") await locator.click({ timeout: 10000 });
    if (request.op === "hover") await locator.hover({ timeout: 10000 });
    if (request.op === "fill") await locator.fill(request.value, { timeout: 10000 });
    if (href && href.startsWith("/") && !href.startsWith("//")) {
      const target = new URL(href, state.siteUrl);
      const current = new URL(beforeUrl);
      const leaves = target.pathname !== current.pathname || target.search !== current.search;
      const start = Date.now();
      while (leaves && page.url() === beforeUrl && Date.now() - start < 4000) await sleep(100);
    }
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
    await settled(page);
    return { action: request.op, role: request.role, name: request.name, url: page.url(), title: await page.title() };
  }
  if (request.op === "press") {
    await page.keyboard.press(request.key);
    await settled(page);
    return { action: "press", key: request.key, url: page.url(), title: await page.title() };
  }
  if (request.op === "text") {
    const text = request.role
      ? await (await pick(page, request as Target)).innerText({ timeout: 10000 })
      : await page.evaluate(() => document.body?.innerText ?? "");
    if (request.contains != null && !text.includes(request.contains)) {
      throw new Error(`text does not contain ${JSON.stringify(request.contains)}`);
    }
    return { text };
  }
  if (request.op === "count") {
    const all = page.getByRole(request.role, { name: request.name, exact: request.exact });
    if (request.expect != null && request.expect > 0) {
      await all.first().waitFor({ state: "attached", timeout: 10000 }).catch(() => undefined);
    }
    const count = await all.count();
    if (request.expect != null && count !== request.expect) {
      throw new Error(`${request.role} ${JSON.stringify(request.name)} count is ${count}, expected ${request.expect}`);
    }
    return { count };
  }
  if (request.op === "attr") {
    const value = await (await pick(page, request)).getAttribute(request.attr, { timeout: 10000 });
    if (request.expect != null && value !== request.expect) {
      throw new Error(`${request.attr} is ${JSON.stringify(value)}, expected ${JSON.stringify(request.expect)}`);
    }
    return { value };
  }
  if (request.op === "snapshot" || request.op === "screenshot") assertProofPath(state, request.file);
  if (request.op === "snapshot") {
    const aria = await page.locator("body").ariaSnapshot();
    const title = await page.title();
    fs.writeFileSync(request.file, `url: ${page.url()}\ntitle: ${title}\n\n${aria}`);
    return { file: request.file, url: page.url(), title };
  }
  if (request.op === "screenshot") {
    await page.screenshot({ path: request.file, fullPage: request.fullPage });
    return { file: request.file, url: page.url(), title: await page.title() };
  }
  if (request.op === "read") {
    let value = "";
    if (request.what === "theme") {
      value = (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) ?? "";
    } else if (request.what === "url") {
      value = page.url();
    } else if (request.expect) {
      await page.waitForFunction((expected) => document.title === expected, request.expect, { timeout: 5000 }).catch(() => undefined);
      value = await page.title();
    } else {
      value = await page.title();
    }
    if (request.expect != null && value !== request.expect) {
      throw new Error(`${request.what} is ${JSON.stringify(value)}, expected ${JSON.stringify(request.expect)}`);
    }
    return { value };
  }
  throw new Error("unhandled request");
}

async function serveHost() {
  const runDir = process.env.PORTFOLIO_RUN_DIR;
  if (!runDir) throw new CommandError("PORTFOLIO_RUN_DIR is required");
  const state = readState(runDir);
  if (!state) throw new CommandError(`no state in ${runDir}`);
  const chromium = loadChromium();
  const browser = await chromium.launch({
    headless: !state.headed,
    args: state.headed ? ["--window-position=820,24", "--window-size=1060,1120"] : [],
  });
  const shutdown = () => {
    void browser.close().finally(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light" });
  const page = await context.newPage();
  if (fs.existsSync(state.socketPath)) fs.unlinkSync(state.socketPath);
  let queue = Promise.resolve();
  const server = net.createServer((socket) => {
    let buf = "";
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
        queue = queue.then(async () => {
          let response: HostResponse;
          try {
            const data = await perform(page, state, parseRequest(JSON.parse(line)));
            response = { ok: true, data };
          } catch (error) {
            response = { ok: false, error: error instanceof Error ? error.message : String(error) };
          }
          if (!socket.destroyed) socket.write(`${JSON.stringify(response)}\n`);
        });
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(state.socketPath, () => resolve());
  });
  await new Promise(() => undefined);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "__host") {
    await serveHost();
    return;
  }
  const flags = parseArgv(argv);
  const command = flags.positionals[0];
  if (!command || command === "help") {
    process.stdout.write(`${usage()}\n`);
    if (!command) process.exit(2);
    return;
  }
  flags.positionals = flags.positionals.slice(1);
  if (command === "launch") await launch(flags);
  else if (command === "doctor") await doctor(flags);
  else if (command === "cleanup") await cleanup(flags);
  else if (command === "evidence") evidence(flags);
  else if (command === "browser") await browser(flags);
  else throw new UsageError(`unknown command ${command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof UsageError ? 2 : 1;
  process.stderr.write(`${message}\n`);
  process.exit(code);
});
