import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Activity,
  ArrowUpRight,
  History,
  Info,
  PanelsTopLeft,
  Repeat2,
  ScanEye,
  ScanLine,
  Bell,
  BrainCircuit,
  CalendarDays,
  CandlestickChart,
  ChartNoAxesCombined,
  CircleHelp,
  List,
  LockKeyhole,
  Maximize2,
  MousePointer2,
  Network,
  Orbit,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SkipBack,
  SkipForward,
  TriangleAlert,
  X,
  ZoomIn,
  ZoomOut,
  createIcons,
} from "lucide";
import "./styles.css";
import "./observatory.css";
import { publicationStatus } from "./publication_status.js";

const APP_ICONS = {
  Activity,
  ArrowUpRight,
  History,
  Info,
  PanelsTopLeft,
  Repeat2,
  ScanEye,
  ScanLine,
  Bell,
  BrainCircuit,
  CalendarDays,
  CandlestickChart,
  ChartNoAxesCombined,
  CircleHelp,
  List,
  LockKeyhole,
  Maximize2,
  MousePointer2,
  Network,
  Orbit,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SkipBack,
  SkipForward,
  TriangleAlert,
  X,
  ZoomIn,
  ZoomOut,
};

const SNAPSHOT_VERSION = "APEXVIEW-SNAPSHOT-v1.0";
const UNIVERSE_VERSION = "APEXVIEW-UNIVERSE-v1.0";
const MARKET_CHART_VERSION = "APEXVIEW-MARKET-CHART-v1.0";
const TIMELINE_VERSION = "APEXVIEW-EVIDENCE-TIMELINE-v1.0";
const TRADE_TIMEFRAME_VERSION = "APEX-TRADE-TIMEFRAME-v1.0";
const TRADE_PLAN_VERSION = "APEX-TRADE-PLAN-v1.1";
const TRADE_EYE_VERSION = "APEX-TRADE-EYE-v1.0";
const TRADE_EYE_EVENT_TYPES = new Set([
  "trade_tag_appeared",
  "trade_tag_disappeared",
  "trade_tag_score_changed",
  "trade_signal_changed",
  "execution_gate_changed",
  "action_changed",
]);
const DEFAULT_TICKER = "RKLB";
const MAX_RENDER_TAGS = 12;
const MAX_VISIBLE_TRADE_TAGS = 6;
const SNAPSHOT_REFRESH_INTERVAL_MS = 60_000;
const PAPER_STATUS_RETRY_MAX_MS = 15_000;
const PAPER_SNAPSHOT_RETRY_MAX = 5;
const PAPER_CYCLE_POLL_INTERVAL_MS = 1_000;
const PAPER_CYCLE_POLL_MAX_ATTEMPTS = 120;
const PAPER_CYCLE_STORAGE_KEY = "apexview.paper-cycle.v1";

const DEFAULT_MANIFEST = {
  contract_version: UNIVERSE_VERSION,
  read_only: true,
  generated_at: 0,
  source: { kind: "short_horizon_ranking", mode: "current", limit: 20 },
  stocks: [],
  counts: { selected: 0, exported: 0, failed: 0 },
  failures: [],
  test_fixtures: {
    RKLB: {
      snapshot_url: "/data/snapshots/RKLB.json",
      reason: "Phase 2 runtime proof only; not a Short Horizon candidate",
    },
  },
};

const state = {
  manifest: DEFAULT_MANIFEST,
  manifestLoaded: false,
  snapshotRequest: 0,
  motionPaused: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  visualTime: 0,
  workspaceView: "galaxy",
  snapshot: null,
  ticker: DEFAULT_TICKER,
  selectedId: "",
  nodeObjects: new Map(),
  backgroundObjects: [],
  edgeObjects: [],
  criticalEffects: [],
  animationObjects: [],
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  pointerDown: null,
  clock: new THREE.Clock(),
  frame: 0,
  lastLabelLayoutAt: 0,
  cameraReady: false,
  chartRange: "3M",
  chartHoverIndex: -1,
  timelineEvents: [],
  timelineIndex: -1,
  timelineTimer: null,
  timelinePlaying: false,
  snapshotRefreshTimer: null,
  marketControlAvailable: null,
  lastMarketRefresh: null,
  paperStatus: null,
  paperTransportSession: null,
  paperCycle: { status: "BLOCKED", reason: "กำลังตรวจ private Paper runtime" },
  paperCyclePolling: false,
  paperConfirmationPollingTimer: null,
  paperStatusRetryTimer: null,
  paperStatusRetryAttempt: 0,
  paperTransportRetryTimer: null,
  paperTransportRetryAttempt: 0,
  paperCycleResumeTimer: null,
  paperSnapshotRetryTimer: null,
  paperSnapshotRetryAttempt: 0,
};

const $ = (selector) => document.querySelector(selector);

const dom = {
  galaxy: $("#galaxy-canvas"),
  stage: $("#galaxy-stage"),
  loading: $("#loading-state"),
  loadingText: $("#loading-text"),
  tradeEyeEmpty: $("#trade-eye-empty"),
  error: $("#error-state"),
  errorText: $("#error-text"),
  tickerSelect: $("#ticker-select"),
  fixtureBadge: $("#fixture-badge"),
  ticker: $("#stock-ticker"),
  stockName: $("#stock-name"),
  price: $("#stock-price"),
  action: $("#stock-action"),
  marketMode: $("#market-mode"),
  snapshotTime: $("#snapshot-time"),
  marketTime: $("#market-time"),
  logicVersion: $("#logic-version"),
  marketTransportStatus: $("#market-transport-status"),
  marketChartStatus: $("#market-chart-status"),
  marketResearchStatus: $("#market-research-status"),
  marketPublicationStatus: $("#market-publication-status"),
  sourceContract: $("#source-contract"),
  activeCount: $("#active-count"),
  positiveCount: $("#positive-count"),
  negativeCount: $("#negative-count"),
  cautionCount: $("#caution-count"),
  neutralCount: $("#neutral-count"),
  criticalCount: $("#critical-count"),
  tradeCount: $("#trade-count"),
  eventCount: $("#event-count"),
  eventList: $("#event-list"),
  timelineStatus: $("#timeline-status"),
  detailEmpty: $("#detail-empty"),
  detailContent: $("#detail-content"),
  detailMoodDot: $("#detail-mood-dot"),
  detailGroup: $("#detail-group"),
  detailCritical: $("#detail-critical"),
  detailLabel: $("#detail-label"),
  detailScore: $("#detail-score"),
  detailReason: $("#detail-reason"),
  detailComponents: $("#detail-components"),
  detailChain: $("#detail-chain"),
  detailFacts: $("#detail-facts"),
  clock: $("#runtime-clock"),
  workspace: $("#workspace"),
  tradeDeskSource: $("#trade-desk-source"),
  tradeDeskCount: $("#trade-desk-count"),
  tradeCandidateList: $("#trade-candidate-list"),
  tradeDeskEmpty: $("#trade-desk-empty"),
  marketChart: $("#market-chart"),
  chartWrap: $("#chart-wrap"),
  chartTooltip: $("#chart-tooltip"),
  chartEmpty: $("#chart-empty"),
  chartInterval: $("#chart-interval"),
  chartSource: $("#chart-source"),
  chartLast: $("#chart-last"),
  chartChange: $("#chart-change"),
  chartRangeStat: $("#chart-range-stat"),
  tradeStatus: $("#trade-status"),
  tradeBalance: $("#trade-balance"),
  tradeCoverage: $("#trade-coverage"),
  tradeTagList: $("#trade-tag-list"),
  tradeTimeframe: $("#trade-timeframe"),
  tradeTimeframeList: $("#trade-timeframe-list"),
  tradePlan: $("#trade-plan"),
  tradePlanStatus: $("#trade-plan-status"),
  tradeEntryZone: $("#trade-entry-zone"),
  tradeInvalidation: $("#trade-invalidation"),
  tradeTarget: $("#trade-target"),
  tradeTimeStop: $("#trade-time-stop"),
  tradeRiskReward: $("#trade-risk-reward"),
  tradeEv: $("#trade-ev"),
  tradePlanNote: $("#trade-plan-note"),
  tradeGateNote: $("#trade-gate-note"),
  tagExplanation: $("#tag-explanation"),
  tagExplanationGroup: $("#tag-explanation-group"),
  tagExplanationLabel: $("#tag-explanation-label"),
  tagExplanationScore: $("#tag-explanation-score"),
  tagExplanationReason: $("#tag-explanation-reason"),
  tagExplanationComponentsBlock: $("#tag-explanation-components-block"),
  tagExplanationComponents: $("#tag-explanation-components"),
  closeTagExplanation: $("#close-tag-explanation"),
  closeTagExplanationFooter: $("#tag-explanation-close-footer"),
  timelinePlay: $("#timeline-play"),
  paperModeNote: $("#operating-mode-note"),
  paperCycleStatus: $("#paper-cycle-status"),
  paperCycleReason: $("#paper-cycle-reason"),
  paperCycleLaunch: $("#paper-cycle-launch"),
  paperConfirmationStatus: $("#paper-confirmation-status"),
  paperConfirmationLineage: $("#paper-confirmation-lineage"),
  paperLifecycleReadout: $("#paper-lifecycle-readout"),
  startPaperCycle: $("#start-paper-cycle"),
};

let scene;
let camera;
let renderer;
let labelRenderer;
let controls;
let galaxyRoot;
let tagLayer;
let edgeLayer;
let backgroundLayer;
let coreGroup;
let selectedRing;
let coreLabel;
let tagExplanationReturnFocus;

const polarityColors = {
  positive: 0x61e6b1,
  negative: 0xff8d7e,
  caution: 0xf4ca7a,
  neutral: 0xaebed0,
};

const polarityClasses = {
  positive: "positive",
  negative: "negative",
  caution: "caution",
  neutral: "neutral",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatScore(value) {
  const score = numberOrNull(value);
  if (score === null) return "SCORE UNKNOWN";
  return `${score > 0 ? "+" : ""}${score.toFixed(score % 1 === 0 ? 0 : 1)}`;
}

function formatPrice(value) {
  const price = numberOrNull(value);
  return price === null ? "--" : price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatPlanPercent(value) {
  const number = numberOrNull(value);
  return number === null ? "--" : `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatPlanMultiple(value) {
  const number = numberOrNull(value);
  return number === null ? "--" : `${number.toFixed(2)}x`;
}

function formatDate(timestamp) {
  const value = numberOrNull(timestamp);
  if (!value) return "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value * 1000));
}

function formatShortDate(timestamp) {
  const value = numberOrNull(timestamp);
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value * 1000));
}

function formatCompactNumber(value, maximumFractionDigits = 1) {
  const number = numberOrNull(value);
  if (number === null) return "--";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(number) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits,
  }).format(number);
}

function chartRangePoints(chart, rangeKey) {
  const points = Array.isArray(chart?.points) ? chart.points : [];
  const range = (chart?.ranges || []).find((item) => item?.key === rangeKey);
  const bars = Math.max(1, Number(range?.bars || points.length || 1));
  return points.slice(-bars);
}

function chartLevelData(snapshot) {
  const short = snapshot?.short_horizon || {};
  return [
    { key: "ENTRY", value: numberOrNull(short.entry_price), color: "#f4ca7a" },
    { key: "TARGET", value: numberOrNull(short.target_price), color: "#61e6b1" },
    { key: "STOP", value: numberOrNull(short.invalidation_price), color: "#ff8d7e" },
  ].filter((item) => item.value !== null && item.value > 0);
}

function selectedChartPoints() {
  return chartRangePoints(state.snapshot?.market_chart, state.chartRange);
}

function chartCoordinates(points, width, height, levels) {
  const padding = { left: 14, right: 58, top: 10, bottom: 24 };
  const volumeHeight = Math.max(24, height * 0.19);
  const plotBottom = height - padding.bottom - volumeHeight - 9;
  const plotHeight = Math.max(38, plotBottom - padding.top);
  const values = points.flatMap((point) => [point.low, point.high, point.close].map(numberOrNull).filter((value) => value !== null));
  values.push(...levels.map((level) => level.value));
  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
  const span = Math.max(maximum - minimum, Math.abs(maximum) * 0.01, 0.01);
  minimum -= span * 0.08;
  maximum += span * 0.08;
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const x = (index) => padding.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (value) => padding.top + ((maximum - value) / (maximum - minimum)) * plotHeight;
  return { padding, volumeHeight, plotBottom, plotHeight, minimum, maximum, innerWidth, x, y };
}

function drawChartGrid(context, coordinates, width, height) {
  context.save();
  context.strokeStyle = "rgba(180, 211, 228, 0.075)";
  context.fillStyle = "rgba(117, 136, 150, 0.82)";
  context.lineWidth = 1;
  context.font = '9px "Noto Sans Thai", Inter, sans-serif';
  context.textAlign = "left";
  context.textBaseline = "middle";
  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const y = coordinates.padding.top + coordinates.plotHeight * ratio;
    context.beginPath();
    context.moveTo(coordinates.padding.left, Math.round(y) + 0.5);
    context.lineTo(width - coordinates.padding.right, Math.round(y) + 0.5);
    context.stroke();
    const price = coordinates.maximum - (coordinates.maximum - coordinates.minimum) * ratio;
    context.fillText(formatCompactNumber(price, 2), width - coordinates.padding.right + 7, y);
  }
  context.beginPath();
  context.moveTo(coordinates.padding.left, coordinates.plotBottom + 9.5);
  context.lineTo(width - coordinates.padding.right, coordinates.plotBottom + 9.5);
  context.stroke();
  context.restore();
}

function drawChartLevels(context, coordinates, width, levels) {
  context.save();
  context.font = '8px "Noto Sans Thai", Inter, sans-serif';
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.setLineDash([4, 5]);
  for (const level of levels) {
    const y = coordinates.y(level.value);
    context.strokeStyle = `${level.color}88`;
    context.fillStyle = level.color;
    context.beginPath();
    context.moveTo(coordinates.padding.left, Math.round(y) + 0.5);
    context.lineTo(width - coordinates.padding.right, Math.round(y) + 0.5);
    context.stroke();
    context.fillText(`${level.key} ${formatCompactNumber(level.value, 2)}`, width - coordinates.padding.right - 4, y - 2);
  }
  context.restore();
}

function drawMarketChart() {
  const canvas = dom.marketChart;
  const wrap = dom.chartWrap;
  if (!canvas || !wrap || !state.snapshot) return;
  const chart = state.snapshot.market_chart || {};
  const points = selectedChartPoints();
  const cssWidth = Math.floor(wrap.clientWidth);
  const cssHeight = Math.floor(wrap.clientHeight);
  if (cssWidth < 40 || cssHeight < 40) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(cssWidth * ratio));
  canvas.height = Math.max(1, Math.floor(cssHeight * ratio));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  dom.chartEmpty.hidden = points.length > 0;
  if (!points.length) return;

  const levels = chartLevelData(state.snapshot);
  const coordinates = chartCoordinates(points, cssWidth, cssHeight, levels);
  if (!coordinates) return;
  drawChartGrid(context, coordinates, cssWidth, cssHeight);
  drawChartLevels(context, coordinates, cssWidth, levels);
  const xStep = points.length > 1 ? coordinates.innerWidth / (points.length - 1) : coordinates.innerWidth;
  const candleCoverage = Number(chart.coverage?.complete_candle_pct || 0);
  const drawCandles = candleCoverage >= 75 && xStep >= 2.4;
  const maxVolume = Math.max(1, ...points.map((point) => numberOrNull(point.volume) || 0));
  const volumeTop = coordinates.plotBottom + 13;
  const volumeBottom = cssHeight - coordinates.padding.bottom;

  context.save();
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const x = coordinates.x(index);
    const volume = numberOrNull(point.volume);
    if (volume !== null) {
      const height = (volume / maxVolume) * Math.max(1, volumeBottom - volumeTop);
      const previousClose = numberOrNull(points[Math.max(0, index - 1)]?.close) || point.close;
      context.fillStyle = point.close >= previousClose ? "rgba(97, 230, 177, 0.22)" : "rgba(255, 141, 126, 0.20)";
      context.fillRect(x - Math.max(0.5, xStep * 0.27), volumeBottom - height, Math.max(1, xStep * 0.54), height);
    }
  }
  context.restore();

  if (drawCandles) {
    const bodyWidth = Math.max(1.2, Math.min(8, xStep * 0.58));
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const open = numberOrNull(point.open);
      const high = numberOrNull(point.high);
      const low = numberOrNull(point.low);
      const close = numberOrNull(point.close);
      if ([open, high, low, close].some((value) => value === null)) continue;
      const rising = close >= open;
      const color = rising ? "#61e6b1" : "#ff8d7e";
      const x = coordinates.x(index);
      const openY = coordinates.y(open);
      const closeY = coordinates.y(close);
      context.strokeStyle = color;
      context.fillStyle = rising ? "rgba(97, 230, 177, 0.74)" : "rgba(255, 141, 126, 0.74)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, coordinates.y(high));
      context.lineTo(x, coordinates.y(low));
      context.stroke();
      context.fillRect(x - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.max(1, Math.abs(closeY - openY)));
    }
  } else {
    context.save();
    context.strokeStyle = "#61e6b1";
    context.lineWidth = 1.35;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    points.forEach((point, index) => {
      const x = coordinates.x(index);
      const y = coordinates.y(point.close);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();
  }

  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  context.save();
  context.fillStyle = "rgba(117, 136, 150, 0.82)";
  context.font = '8px "Noto Sans Thai", Inter, sans-serif';
  context.textBaseline = "bottom";
  for (const index of labelIndexes) {
    const point = points[index];
    const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(point.ts * 1000));
    context.textAlign = index === 0 ? "left" : index === points.length - 1 ? "right" : "center";
    context.fillText(date, coordinates.x(index), cssHeight - 2);
  }
  context.restore();

  const hoverIndex = Math.max(-1, Math.min(points.length - 1, state.chartHoverIndex));
  if (hoverIndex >= 0) {
    const point = points[hoverIndex];
    const x = coordinates.x(hoverIndex);
    const y = coordinates.y(point.close);
    context.save();
    context.strokeStyle = "rgba(217, 229, 237, 0.25)";
    context.setLineDash([3, 4]);
    context.beginPath();
    context.moveTo(x, coordinates.padding.top);
    context.lineTo(x, volumeBottom);
    context.moveTo(coordinates.padding.left, y);
    context.lineTo(cssWidth - coordinates.padding.right, y);
    context.stroke();
    context.fillStyle = "#effff8";
    context.beginPath();
    context.arc(x, y, 2.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function renderMarketChart(snapshot) {
  const chart = snapshot?.market_chart || {};
  const availableRanges = new Set((chart.ranges || []).filter((item) => item?.available).map((item) => item.key));
  if (!availableRanges.has(state.chartRange)) state.chartRange = availableRanges.has(chart.default_range) ? chart.default_range : "ALL";
  document.querySelectorAll("[data-chart-range]").forEach((button) => {
    button.disabled = !availableRanges.has(button.dataset.chartRange);
    button.classList.toggle("is-active", button.dataset.chartRange === state.chartRange);
  });
  const source = chart.source || {};
  const observation = snapshot?.market_observation || {};
  const capabilities = observation.capabilities || source.capabilities || {};
  dom.chartInterval.textContent = `${String(chart.interval || "1D").toUpperCase()} · ${chart.coverage?.points || 0} BARS`;
  const freshness = observation.status || source.freshness || "unknown";
  const admission = String(observation.admission_status || source.admission_status || "").toUpperCase();
  const rights = observation.publication_status || source.publication_status || "";
  dom.chartSource.textContent = [
    source.name || "ไม่มีแหล่งข้อมูล",
    source.market_as_of ? `as of ${formatShortDate(source.market_as_of)}` : "",
    String(freshness).toUpperCase(),
    capabilities.transport ? `TRANSPORT ${String(capabilities.transport).toUpperCase()}` : "",
    capabilities.chart ? `CHART ${String(capabilities.chart).toUpperCase()}` : "",
    admission === "BLOCKED_PROVENANCE" ? "PROVENANCE BLOCKED" : admission === "PASS" ? "PROVENANCE PASS" : "",
    rights === "BLOCKED_NON_DISPLAY" ? "PRIVATE DISPLAY" : "",
  ].filter(Boolean).join(" · ");
  const points = selectedChartPoints();
  const first = points[0];
  const last = points.at(-1);
  const change = first && last && first.close ? ((last.close / first.close) - 1) * 100 : null;
  const lows = points.map((point) => numberOrNull(point.low) ?? numberOrNull(point.close)).filter((value) => value !== null);
  const highs = points.map((point) => numberOrNull(point.high) ?? numberOrNull(point.close)).filter((value) => value !== null);
  dom.chartLast.textContent = last ? formatPrice(last.close) : "--";
  dom.chartChange.textContent = change === null ? "--" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  dom.chartChange.className = change === null ? "" : change >= 0 ? "is-positive" : "is-negative";
  dom.chartRangeStat.textContent = lows.length && highs.length ? `${formatCompactNumber(Math.min(...lows), 2)}–${formatCompactNumber(Math.max(...highs), 2)}` : "--";
  state.chartHoverIndex = -1;
  dom.chartTooltip.hidden = true;
  drawMarketChart();
}

function labelForGroup(group) {
  const labels = {
    core: "Core",
    catalyst: "Catalyst",
    safety: "Safety",
    valuation: "Valuation",
    critical: "Critical",
    momentum: "Momentum",
    risk: "Risk",
    entry: "Entry",
    product: "Product",
    event: "Event",
    trade: "Trade",
    unknown: "Unclassified",
  };
  return labels[String(group || "unknown").toLowerCase()] || String(group || "Unclassified");
}

function normalizePolarity(value) {
  const polarity = String(value || "neutral").toLowerCase();
  return Object.prototype.hasOwnProperty.call(polarityColors, polarity) ? polarity : "neutral";
}

function seedFromString(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function setLoading(visible, text = "Loading snapshot") {
  dom.loading.hidden = !visible;
  dom.loadingText.textContent = text;
}

function setError(message = "ApexView could not read this snapshot.") {
  dom.error.hidden = false;
  dom.errorText.textContent = message;
  setLoading(false);
}

function clearError() {
  dom.error.hidden = true;
}

function validateSnapshot(payload, ticker) {
  if (!payload || typeof payload !== "object") throw new Error("Snapshot is not an object");
  if (payload.contract_version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot contract: ${payload.contract_version || "missing"}`);
  }
  const snapshotTicker = String(payload.stock?.ticker || "").toUpperCase();
  if (!snapshotTicker || snapshotTicker !== ticker) throw new Error("Snapshot ticker does not match selector");
  if (payload.read_only !== true) throw new Error("Snapshot is not marked read-only");
  if (payload.market_chart && (payload.market_chart.version !== MARKET_CHART_VERSION || payload.market_chart.read_only !== true)) {
    throw new Error("Unsupported market-chart contract");
  }
  if (payload.evidence_timeline && (payload.evidence_timeline.version !== TIMELINE_VERSION || payload.evidence_timeline.read_only !== true)) {
    throw new Error("Unsupported evidence-timeline contract");
  }
  const tradeEye = payload.trade_eye;
  const timeframe = payload.trade?.timeframe;
  if (timeframe && timeframe.version !== TRADE_TIMEFRAME_VERSION) {
    throw new Error("Unsupported trade-timeframe contract");
  }
  const plan = payload.trade?.plan;
  if (plan && (
    plan.version !== TRADE_PLAN_VERSION
    || plan.read_only !== true
    || plan.execution_enabled !== false
    || plan.can_submit_broker !== false
    || plan.live_execution_enabled !== false
    || plan.broker_order !== null
  )) {
    throw new Error("Trade plan violates paper-only boundary");
  }
  if (payload.trade?.execution_authority === true || payload.trade?.weight_impact_pct) {
    throw new Error("Trade projection violates read-only boundary");
  }
  const tradeEyePlan = tradeEye?.plan;
  if (tradeEyePlan && (
    tradeEyePlan.version !== TRADE_PLAN_VERSION
    || tradeEyePlan.read_only !== true
    || tradeEyePlan.execution_enabled !== false
    || tradeEyePlan.can_submit_broker !== false
    || tradeEyePlan.live_execution_enabled !== false
    || tradeEyePlan.broker_order !== null
  )) {
    throw new Error("Trade Eye plan violates paper-only boundary");
  }
  if (tradeEye && (
    typeof tradeEye !== "object"
    || tradeEye.version !== TRADE_EYE_VERSION
    || tradeEye.read_only !== true
    || tradeEye.mode !== "trade_only"
    || tradeEye.execution_authority !== false
    || tradeEye.broker_order !== null
    || tradeEye.weight_impact_pct
    || !Array.isArray(tradeEye.visible_tags)
    || !Array.isArray(tradeEye.diagnostic_tags)
    || !tradeEye.movement
    || tradeEye.movement.animation_is_display_only !== true
    || !Array.isArray(tradeEye.movement.events)
  )) {
    throw new Error("Trade Eye violates its read-only contract");
  }
  if ([...(tradeEye?.visible_tags || []), ...(tradeEye?.diagnostic_tags || [])].some((tag) => tag?.group !== "trade")) {
    throw new Error("Trade Eye contains a non-trade TAG");
  }
  if (tradeEye?.movement?.events?.some((event) => !TRADE_EYE_EVENT_TYPES.has(String(event?.event_type || "")))) {
    throw new Error("Trade Eye contains an undeclared movement event");
  }
  return payload;
}

function assetUrl(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const base = new URL(import.meta.env.BASE_URL || "/", window.location.origin);
  return new URL(raw.replace(/^\/+/, ""), base).toString();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchPaperJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.reason || payload?.error?.message || `${response.status} ${response.statusText}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function getManifestOptions(manifest) {
  const options = [];
  for (const item of manifest.stocks || []) {
    const ticker = String(item?.ticker || "").toUpperCase();
    if (!ticker) continue;
    options.push({ ...item, ticker, kind: item.kind || "short_horizon_candidate" });
  }
  for (const [ticker, item] of Object.entries(manifest.test_fixtures || {})) {
    if (options.some((option) => option.ticker === ticker)) continue;
    options.push({ ...(item || {}), ticker, kind: "test_fixture" });
  }
  return options;
}

function selectedManifestItem(ticker) {
  return getManifestOptions(state.manifest).find((item) => item.ticker === ticker);
}

function populateTickerSelect() {
  const options = getManifestOptions(state.manifest);
  dom.tickerSelect.replaceChildren();
  for (const item of options) {
    const option = document.createElement("option");
    option.value = item.ticker;
    option.textContent = item.kind === "test_fixture"
      ? `${item.ticker} · fixture`
      : `#${item.rank || "-"} ${item.ticker}`;
    dom.tickerSelect.append(option);
  }
  if (!options.length) {
    const option = document.createElement("option");
    option.value = DEFAULT_TICKER;
    option.textContent = DEFAULT_TICKER;
    dom.tickerSelect.append(option);
  }
  dom.tickerSelect.value = state.ticker;
}

function snapshotUrlFor(ticker) {
  const item = selectedManifestItem(ticker);
  return assetUrl(item?.snapshot_url || `/data/snapshots/${encodeURIComponent(ticker)}.json`);
}

async function loadManifest(preferredTicker = "") {
  try {
    const manifest = await fetchJson(assetUrl("/data/manifest.json"));
    if (manifest?.contract_version !== UNIVERSE_VERSION || manifest.read_only !== true || !Array.isArray(manifest.stocks)) {
      throw new Error("Unsupported universe manifest");
    }
    state.manifest = manifest;
    state.manifestLoaded = true;
  } catch {
    state.manifest = DEFAULT_MANIFEST;
    state.manifestLoaded = false;
  }
  const queryTicker = new URLSearchParams(window.location.search).get("ticker");
  const available = getManifestOptions(state.manifest).map((item) => item.ticker);
  const preferred = String(preferredTicker || queryTicker || "").toUpperCase();
  state.ticker = available.includes(preferred)
    ? preferred
    : available[0] || DEFAULT_TICKER;
  populateTickerSelect();
  renderTradeDesk();
  renderPublicationStatus();
}

function renderPublicationStatus() {
  const publication = publicationStatus(state.manifest, state.manifestLoaded);
  $("#overview-candidates").textContent = publication.count === null ? "—" : publication.count;
  $("#nav-candidate-count").textContent = publication.count === null ? "—" : publication.count;
  $("#overview-candidate-unit").textContent = publication.kind === "partial" ? "published · partial" : "candidates";
  $("#overview-candidate-note").textContent = publication.title;
  $("#candidate-empty-title").textContent = publication.title;
  $("#candidate-empty-note").textContent = publication.note;
  const timestamp = numberOrNull(state.manifest.generated_at);
  $("#publication-date").textContent = state.manifestLoaded && timestamp
    ? `Published ${formatShortDate(timestamp)} · stored snapshot`
    : "ไม่ทราบเวลาที่เผยแพร่ · ตรวจสอบแหล่งข้อมูล";
  const notice = $("#publication-notice");
  notice.hidden = !["unavailable", "partial"].includes(publication.kind);
  notice.querySelector("span").textContent = publication.note;
}

function persistPaperCycle(cycle) {
  const launchId = String(cycle?.launch_id || "").trim();
  if (!launchId) return;
  const safe = {};
  for (const key of [
    "contract_version", "launch_id", "request_id", "cycle_id", "status",
    "status_source", "status_reason", "source_identity", "counts",
    "last_durable_event", "next_action",
  ]) {
    if (cycle[key] !== undefined) safe[key] = cycle[key];
  }
  try { window.localStorage.setItem(PAPER_CYCLE_STORAGE_KEY, JSON.stringify(safe)); } catch { /* private browser storage may be disabled */ }
}

function restorePaperCycle() {
  try {
    const raw = window.localStorage.getItem(PAPER_CYCLE_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object" && String(saved.launch_id || "").trim()) {
      state.paperCycle = saved;
    }
  } catch { /* a bad local recovery record must never block the page */ }
}

function syncPaperCycleFromStatus(payload) {
  if (state.paperCyclePolling) return;
  const launch = payload?.paper_launch;
  if (launch?.launch_id) {
    state.paperCycle = launch;
    persistPaperCycle(launch);
    return;
  }
  const confirmation = (payload?.paper_delivery?.confirmations || [])[0] || {};
  const lineage = confirmation.lineage || {};
  if (!lineage.launch_id) return;
  const display = String(confirmation.confirmation_display_status || "").toUpperCase();
  const status = display === "WAITING_CONFIRMATION" ? "WAITING_CONFIRMATION" : "PAPER_RESULT";
  const recovered = {
    status,
    status_reason: String(confirmation.confirmation_reason || "Paper launch recovered from journal").trim(),
    request_id: lineage.request_id || "",
    launch_id: lineage.launch_id,
    cycle_id: lineage.cycle_id || "",
    snapshot_id: lineage.snapshot_id || "",
  };
  state.paperCycle = recovered;
  persistPaperCycle(recovered);
}

function schedulePaperStatusRetry() {
  if (state.paperStatusRetryTimer) return;
  const attempt = state.paperStatusRetryAttempt;
  const delay = Math.min(PAPER_STATUS_RETRY_MAX_MS, 1_000 * (2 ** Math.min(attempt, 4)));
  state.paperStatusRetryAttempt += 1;
  state.paperStatusRetryTimer = window.setTimeout(() => {
    state.paperStatusRetryTimer = null;
    if (document.hidden) { schedulePaperStatusRetry(); return; }
    loadPaperStatus();
  }, delay);
}

function schedulePaperTransportRetry() {
  if (state.paperTransportRetryTimer || state.paperTransportRetryAttempt >= PAPER_SNAPSHOT_RETRY_MAX) return;
  const attempt = state.paperTransportRetryAttempt;
  const delay = Math.min(PAPER_STATUS_RETRY_MAX_MS, 1_000 * (2 ** Math.min(attempt, 4)));
  state.paperTransportRetryAttempt += 1;
  state.paperTransportRetryTimer = window.setTimeout(() => {
    state.paperTransportRetryTimer = null;
    if (document.hidden) { schedulePaperTransportRetry(); return; }
    loadPaperTransportSession();
  }, delay);
}

function schedulePaperCycleResume(launchId) {
  if (!launchId || state.paperCycleResumeTimer) return;
  state.paperCycleResumeTimer = window.setTimeout(async () => {
    state.paperCycleResumeTimer = null;
    if (document.hidden || state.paperCyclePolling || !state.paperTransportSession) return;
    state.paperCyclePolling = true;
    try { await pollPaperCycle(launchId); }
    finally {
      state.paperCyclePolling = false;
      await loadPaperStatus();
      renderPaperCycle();
    }
  }, PAPER_CYCLE_POLL_INTERVAL_MS);
}

function renderPaperStatus(payload) {
  syncPaperCycleFromStatus(payload);
  const status = String(payload?.status || "NOT_CONNECTED").toUpperCase();
  const delivery = payload?.paper_delivery || {};
  const counts = delivery.counts || {};
  const delivered = Number(counts.delivered || 0);
  const attention = Number(delivery.retry_required || 0) + Number(counts.sending || 0);
  const internalAccount = delivery.internal_paper_account || {};
  const hasInternalAccount = internalAccount.status && String(internalAccount.status).toUpperCase() !== "UNKNOWN";
  const account = hasInternalAccount ? internalAccount : (delivery.paper_account || {});
  const accountStatus = String(account.status || "UNKNOWN").toUpperCase();
  const accountAuthority = hasInternalAccount ? "internal" : "provider";
  const confirmation = (delivery.confirmations || [])[0] || {};
  const confirmationStatus = String(confirmation.confirmation_display_status || "NO PROPOSAL").toUpperCase();
  const lifecycle = payload?.paper_lifecycle || {};
  const lifecycleAccount = lifecycle.account || {};
  const lifecycleSummary = lifecycle.lifecycle || {};
  const velocity = lifecycle.capital_velocity || {};
  if (dom.paperConfirmationStatus) {
    dom.paperConfirmationStatus.textContent = confirmationStatus;
    dom.paperConfirmationStatus.dataset.state = confirmationStatus;
  }
  if (dom.paperConfirmationLineage) {
    const lineage = confirmation.lineage || {};
    const compact = (value) => {
      const text = String(value || "").trim();
      return text ? (text.length > 14 ? `${text.slice(0, 6)}…${text.slice(-5)}` : text) : "—";
    };
    const confirmationId = compact(confirmation.confirmation_id);
    const line = confirmationId === "—"
      ? "ยังไม่มี proposal จาก Paper journal"
      : `confirmation ${confirmationId} · request ${compact(lineage.request_id)} · launch ${compact(lineage.launch_id)} · cycle ${compact(lineage.cycle_id)} · snapshot ${compact(lineage.snapshot_id)}`;
    dom.paperConfirmationLineage.textContent = line;
  }
  if (dom.paperLifecycleReadout) {
    const lifecycleStatus = String(lifecycle.status || "UNKNOWN").toUpperCase();
    const closed = Number(lifecycleSummary.closed_positions || 0);
    const net = numberOrNull(lifecycleAccount.realized_pnl);
    const cost = numberOrNull(lifecycleAccount.realized_cost);
    const cycles = numberOrNull(velocity.position_recycling_velocity_cycles_per_day);
    if (lifecycleStatus === "MEASURED") {
      dom.paperLifecycleReadout.textContent = `ปิดจริง ${closed} รายการ · net ${net === null ? "--" : `${net >= 0 ? "+" : ""}${net.toFixed(2)} USD`} · cost ${cost === null ? "--" : `${cost.toFixed(2)} USD`} · velocity ${cycles === null ? "--" : `${cycles.toFixed(3)} cycles/day`}`;
    } else if (lifecycleStatus === "NO_LIFECYCLE") {
      dom.paperLifecycleReadout.textContent = "ยังไม่มี order lifecycle ใน Paper journal · ไม่ตีความเป็นกำไรศูนย์";
    } else if (lifecycleStatus === "NOT_MEASURED_NO_CLOSED_POSITION") {
      dom.paperLifecycleReadout.textContent = "มีสถานะ Paper แต่ยังไม่มีการปิดจริง · velocity ยังไม่วัด";
    } else {
      dom.paperLifecycleReadout.textContent = String(lifecycle.reason || "ผลลัพธ์ Paper ยังอ่านไม่ได้").slice(0, 180);
    }
  }
  if (!dom.paperModeNote) return;
  if (status === "READY") {
    const accountLabel = accountAuthority === "internal" && accountStatus === "ADMITTED"
      ? "บัญชี Paper ภายในจำลองยืนยันแล้ว"
      : accountAuthority === "provider" && accountStatus === "ATTESTED"
        ? "บัญชี Paper จาก provider ยืนยันแล้ว"
      : accountStatus === "MIXED"
        ? "บัญชี Paper หลายชุด · ต้องตรวจ"
        : "บัญชี Paper ยังไม่ยืนยัน";
    dom.paperModeNote.textContent = attention
      ? `Paper ledger พร้อม · ${accountLabel} · ACK ${delivered} · ต้องตรวจ ${attention} รายการ`
      : `Paper ledger พร้อม · ${accountLabel} · ACK ${delivered} รายการ · ไม่มีคำสั่ง broker`;
  } else if (status === "BLOCKED") {
    dom.paperModeNote.textContent = "Paper ledger อ่านไม่ได้ · fail-closed · ไม่มีคำสั่ง broker";
  } else {
    dom.paperModeNote.textContent = "Paper ledger ยังไม่เชื่อม · หน้านี้ไม่ส่งคำสั่ง broker";
  }
  const waiting = confirmationStatus === "WAITING_CONFIRMATION";
  if (waiting) {
    if (!state.paperConfirmationPollingTimer) {
      state.paperConfirmationPollingTimer = window.setInterval(() => {
        if (!document.hidden) loadPaperStatus();
      }, 3000);
    }
  } else if (state.paperConfirmationPollingTimer) {
    window.clearInterval(state.paperConfirmationPollingTimer);
    state.paperConfirmationPollingTimer = null;
  }
}

async function loadPaperStatus() {
  try {
    state.paperStatus = await fetchJson("/api/paper/status");
    state.paperStatusRetryAttempt = 0;
    if (state.paperStatusRetryTimer) {
      window.clearTimeout(state.paperStatusRetryTimer);
      state.paperStatusRetryTimer = null;
    }
  } catch {
    // Preserve the last known good projection during a transient fetch error;
    // replacing it with NOT_CONNECTED made the UI contradict a healthy ledger
    // and stopped confirmation polling permanently.
    if (!state.paperStatus) state.paperStatus = { status: "NOT_CONNECTED" };
    schedulePaperStatusRetry();
  }
  renderPaperStatus(state.paperStatus);
  renderPaperCycle();
}

function paperCycleUiStatus(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACCEPTED":
    case "RUNNING":
      return "RUNNING";
    case "NO_ADMISSIBLE_EDGE":
      return "NO_CANDIDATE";
    case "WAITING_CONFIRMATION":
      return "WAITING_CONFIRMATION";
    case "PAPER_RESULT":
      return "COMPLETED";
    case "BLOCKED_DATA":
    case "FAILED_RECOVERABLE":
    case "RISK_REJECTED":
      return "BLOCKED";
    default:
      return "BLOCKED";
  }
}

function paperCycleReason(payload) {
  const reason = String(payload?.status_reason || payload?.reason || "").trim();
  const nextAction = String(payload?.next_action || "").trim();
  const profiles = payload?.source_identity?.candidate_source_profiles || [];
  const isFixture = Array.isArray(profiles) && profiles.some((profile) => {
    const sourceClass = String(profile?.source_class || "").toUpperCase();
    const role = String(profile?.role || "").toLowerCase();
    return sourceClass === "INTERNAL_SIMULATION" || role.includes("fixture") || profile?.market_evidence === false;
  });
  const sourceNote = isFixture ? "transport fixture · ไม่ใช่ market evidence" : "";
  const parts = [reason, nextAction, sourceNote].filter(Boolean);
  return parts.join(" · ") || "ยังไม่มีเหตุผลจาก Paper runtime";
}

function renderPaperCycle() {
  if (!dom.paperCycleStatus || !dom.startPaperCycle) return;
  const rawStatus = String(state.paperCycle?.status || "BLOCKED").toUpperCase();
  const uiStatus = paperCycleUiStatus(rawStatus);
  const configured = state.paperTransportSession?.status === "READY";
  const reason = configured
    ? paperCycleReason(state.paperCycle)
    : String(state.paperCycle?.reason || "Paper cycle ยังไม่ถูกผูกกับ private launcher");
  dom.paperCycleStatus.textContent = uiStatus;
  dom.paperCycleStatus.dataset.state = uiStatus;
  dom.paperCycleReason.textContent = reason;
  const launchId = String(state.paperCycle?.launch_id || "").trim();
  dom.paperCycleLaunch.textContent = launchId ? `launch ${launchId}` : "";
  dom.startPaperCycle.disabled = !configured || state.paperCyclePolling || uiStatus === "RUNNING";
  dom.startPaperCycle.setAttribute("aria-busy", state.paperCyclePolling ? "true" : "false");
}

async function loadPaperTransportSession() {
  try {
    state.paperTransportSession = await fetchPaperJson("/api/paper/transport-session");
    if (state.paperTransportSession?.status !== "READY") {
      throw new Error("paper browser session is not ready");
    }
    state.paperTransportRetryAttempt = 0;
    if (state.paperTransportRetryTimer) {
      window.clearTimeout(state.paperTransportRetryTimer);
      state.paperTransportRetryTimer = null;
    }
    if (!state.paperCycle?.launch_id) {
      state.paperCycle = { status: "BLOCKED", reason: "พร้อมเริ่มรอบ Paper · กดปุ่มเพื่อเริ่ม" };
    }
  } catch (error) {
    const payload = error?.payload || {};
    state.paperTransportSession = null;
    if (!state.paperCycle?.launch_id) {
      state.paperCycle = {
        status: "BLOCKED",
        reason: String(payload.reason || "Paper cycle ยังไม่พร้อม · private launcher ยังไม่ได้ตั้งค่า").trim(),
      };
    }
    schedulePaperTransportRetry();
  }
  renderPaperCycle();
  if (
    state.paperTransportSession?.status === "READY"
    && state.paperCycle?.launch_id
    && paperCycleUiStatus(state.paperCycle.status) === "RUNNING"
    && !state.paperCyclePolling
  ) {
    state.paperCyclePolling = true;
    try { await pollPaperCycle(state.paperCycle.launch_id); }
    catch (error) {
      state.paperCycle = {
        ...state.paperCycle,
        status: "BLOCKED",
        status_reason: String(error?.message || "Paper status recovery failed").trim(),
      };
    } finally {
      state.paperCyclePolling = false;
      await loadPaperStatus();
      renderPaperCycle();
    }
  }
}

function paperRequestId() {
  if (window.crypto?.randomUUID) return `apexview-${window.crypto.randomUUID()}`;
  return `apexview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function paperTransportHeaders({ includeCsrf = false, requestId = "" } = {}) {
  const session = state.paperTransportSession || {};
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${session.bearer_token || ""}`,
  };
  if (includeCsrf) {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = session.csrf_token || "";
    headers["Idempotency-Key"] = requestId;
  }
  return headers;
}

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function pollPaperCycle(launchId) {
  const encoded = encodeURIComponent(String(launchId || ""));
  for (let attempt = 0; attempt < PAPER_CYCLE_POLL_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(PAPER_CYCLE_POLL_INTERVAL_MS);
    try {
      const payload = await fetchPaperJson(`/v1/private/paper/launch/${encoded}`, {
        headers: paperTransportHeaders(),
      });
      state.paperCycle = payload;
      persistPaperCycle(payload);
      renderPaperCycle();
      await loadPaperStatus();
      if (paperCycleUiStatus(payload.status) !== "RUNNING") return;
    } catch (error) {
      if ([401, 403, 404].includes(Number(error?.status))) throw error;
      state.paperCycle = {
        ...state.paperCycle,
        status: "RUNNING",
        status_reason: "กำลังเชื่อมต่อ Paper runtime ใหม่ · จะติดตามต่ออัตโนมัติ",
      };
      renderPaperCycle();
    }
  }
  state.paperCycle = {
    ...state.paperCycle,
    status: "RUNNING",
    status_reason: "รอบ Paper ยังทำงานอยู่ · จะไม่เริ่มซ้ำจนกว่าจะมีผลจาก ledger",
  };
  persistPaperCycle(state.paperCycle);
  renderPaperCycle();
  schedulePaperCycleResume(launchId);
}

async function startPaperCycle() {
  if (state.paperCyclePolling || state.paperTransportSession?.status !== "READY") return;
  const requestId = paperRequestId();
  state.paperCyclePolling = true;
  state.paperCycle = {
    status: "RUNNING",
    status_reason: "รับคำขอแล้ว · กำลังรอผลจาก Paper orchestrator",
    request_id: requestId,
  };
  renderPaperCycle();
  try {
    const payload = await fetchPaperJson("/v1/private/paper/launch", {
      method: "POST",
      headers: paperTransportHeaders({ includeCsrf: true, requestId }),
      body: JSON.stringify({
        contract_version: "APEX-PAPER-LAUNCH-REQUEST-v1",
        request_id: requestId,
        operation: "start_paper_cycle",
        mode: "paper",
        max_candidates: 1,
        confirmation_policy: "telegram_explicit",
      }),
    });
    state.paperCycle = payload;
    persistPaperCycle(payload);
    renderPaperCycle();
    if (payload.launch_id) await pollPaperCycle(payload.launch_id);
  } catch (error) {
    const payload = error?.payload || {};
    state.paperCycle = {
      status: "BLOCKED",
      status_reason: String(payload.error?.code || payload.reason || "Paper launch failed closed").trim(),
      request_id: requestId,
    };
  } finally {
    state.paperCyclePolling = false;
    await loadPaperStatus();
    renderPaperCycle();
  }
}

function setWorkspaceView(view) {
  const views = {
    galaxy: ["Overview", "Your edge, <em>in view.</em>", "มองเห็นความสัมพันธ์ เข้าใจการใช้ทุน และตัดสินใจจากหลักฐาน"],
    chart: ["Market chart", "Price, <em>with context.</em>", "ย้อนดูข้อมูลราคาที่จัดเก็บ โดยคงความละเอียดจากแหล่งข้อมูลเดิม"],
    "trade-desk": ["Opportunities", "Follow <em>the evidence.</em>", "ทุก candidate มีที่มา ลำดับ และสถานะจากระบบวิเคราะห์"],
    timeline: ["Evidence journal", "A record of <em>every change.</em>", "ติดตามเหตุการณ์ที่ระบบประกาศ พร้อมย้อนกลับไปดูหลักฐาน"],
    capital: ["Capital velocity", "Capital, <em>with purpose.</em>", "มองความเร็วการหมุนเงิน ควบคู่กับผลตอบแทนและเวลาที่ใช้ทุน"],
  };
  if (!views[view]) return;
  state.workspaceView = view;
  dom.workspace.dataset.workspaceView = view;
  $("#app").dataset.mobileView = view;
  $("#app").dataset.view = view;
  $("#view-name").textContent = views[view][0];
  $("#page-title").innerHTML = views[view][1];
  $("#page-subtitle").textContent = views[view][2];
  document.querySelectorAll(".nav-button[data-workspace-view]").forEach((button) => {
    const active = button.dataset.workspaceView === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  stopTimelinePlayback();
  window.scrollTo({ top: 0, behavior: "instant" });
  requestAnimationFrame(() => { resizeScene(); drawMarketChart(); });
}

function updateMotionControl() {
  const button = $("#motion-toggle");
  button.setAttribute("aria-pressed", String(state.motionPaused));
  button.setAttribute("aria-label", state.motionPaused ? "เล่นภาพเคลื่อนไหว" : "หยุดการเคลื่อนไหว");
  button.innerHTML = state.motionPaused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
  if (controls) controls.autoRotate = !state.motionPaused;
  createIcons({ icons: APP_ICONS });
}

function updateQueryTicker(ticker) {
  const url = new URL(window.location.href);
  url.searchParams.set("ticker", ticker);
  window.history.replaceState({}, "", url);
}

function renderTradeDesk() {
  if (!dom.tradeCandidateList) return;
  const source = state.manifest?.source || {};
  const publication = publicationStatus(state.manifest, state.manifestLoaded);
  const candidates = publication.candidates
    .map((item) => ({ ...item, ticker: String(item.ticker).toUpperCase() }));
  const logicVersion = String(source.logic_version || "").trim();
  dom.tradeDeskSource.textContent = logicVersion
    ? `SHORT HORIZON · ${logicVersion}`
    : "SHORT HORIZON RANKING";
  dom.tradeDeskCount.textContent = publication.count === null ? "DATA UNAVAILABLE" : `${candidates.length} PUBLISHED${publication.kind === "partial" ? " · PARTIAL" : ""}`;
  dom.tradeCandidateList.replaceChildren();
  if (dom.tradeDeskEmpty) dom.tradeDeskEmpty.hidden = candidates.length > 0;
  for (const item of candidates) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `trade-candidate-row ${item.execution_actionable ? "is-actionable" : "is-review"}`;
    const rank = Number(item.rank);
    const rankText = Number.isFinite(rank) && rank > 0 ? `#${rank}` : "#--";
    const status = item.status_name || item.execution_status || "UPSTREAM REVIEW";
    const execution = item.execution_actionable
      ? "EXECUTION DECLARED · RISK GATE"
      : "REVIEW · NO TRADE INTENT";
    row.innerHTML = `
      <span class="trade-candidate-rank">${escapeHtml(rankText)}</span>
      <span class="trade-candidate-main">
        <strong>${escapeHtml(item.ticker)}</strong>
        <small>${escapeHtml(status)} · ${escapeHtml(item.clarity_tier || "clarity not declared")}</small>
      </span>
      <span class="trade-candidate-state">${escapeHtml(execution)}</span>
      <span class="trade-candidate-date">${escapeHtml(item.as_of_ts ? formatDate(item.as_of_ts) : "--")}</span>
      <span class="trade-candidate-open">OPEN EYE →</span>
    `;
    row.addEventListener("click", () => {
      setWorkspaceView("galaxy");
      loadTicker(item.ticker);
    });
    dom.tradeCandidateList.append(row);
  }
}

function disposeObject(object) {
  object.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    }
  });
  object.removeFromParent();
}

function clearSceneLayers() {
  for (const object of [...state.nodeObjects.values(), ...state.edgeObjects, ...state.backgroundObjects]) disposeObject(object);
  state.nodeObjects.clear();
  state.edgeObjects = [];
  state.backgroundObjects = [];
  state.criticalEffects = [];
  state.animationObjects = [];
  state.frame = 0;
  state.lastLabelLayoutAt = 0;
  tagLayer?.clear();
  edgeLayer?.clear();
  backgroundLayer?.clear();
  if (coreGroup) disposeObject(coreGroup);
  coreGroup = null;
  coreLabel = null;
  selectedRing = null;
}

function addParticleField({ random, count, radius, size, opacity, colorMode = "white", depth = 0 }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const distance = radius * (0.55 + random() * 0.45);
    const positionIndex = index * 3;
    positions[positionIndex] = Math.sin(phi) * Math.cos(theta) * distance;
    positions[positionIndex + 1] = Math.cos(phi) * distance;
    positions[positionIndex + 2] = Math.sin(phi) * Math.sin(theta) * distance;
    if (colorMode === "dust") {
      const palette = [0x4ee6b0, 0x7bb9ff, 0xb892ff, 0xd47f80, 0xe7ad72];
      color.setHex(palette[Math.floor(random() * palette.length)]);
    } else if (colorMode === "cool") {
      color.setRGB(0.65 + random() * 0.35, 0.78 + random() * 0.22, 0.9 + random() * 0.1);
    } else {
      const brightness = 0.55 + random() * 0.45;
      color.setRGB(brightness, brightness, brightness);
    }
    colors[positionIndex] = color.r;
    colors[positionIndex + 1] = color.g;
    colors[positionIndex + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    opacity,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.userData.depth = depth;
  backgroundLayer.add(points);
  state.backgroundObjects.push(points);
  state.animationObjects.push({ object: points, drift: depth ? 0.00008 + depth * 0.00005 : 0 });
  return points;
}

function smoothStep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function buildBackground(ticker) {
  const random = createRandom(seedFromString(`${ticker}:background`));
  // Background points are atmosphere only.  Trade meaning is carried by the
  // bounded Trade Eye TAG nodes, never by a nebula, distance, or drift.
  addParticleField({ random, count: 250, radius: 26, size: 0.028, opacity: 0.42, colorMode: "cool", depth: 0.15 });
  addParticleField({ random, count: 72, radius: 17, size: 0.038, opacity: 0.28, colorMode: "white", depth: 0.45 });
  addParticleField({ random, count: 28, radius: 12, size: 0.045, opacity: 0.16, colorMode: "dust", depth: 0.85 });
}

function signalActiveForNode(node) {
  return Boolean(
    node?.group === "trade"
    && (
      node?.display?.signal_active === true
      || node?.visual_state?.signal_active === true
      || node?.status === "passed"
      || node?.hard_blocker === true
    )
  );
}

function makeLabel(node, color) {
  const label = document.createElement("div");
  label.className = `tag-label ${node.critical ? "is-critical" : ""} ${signalActiveForNode(node) ? "is-signal-active" : ""}`;
  label.dataset.viewId = node.view_id;
  label.innerHTML = `
    <span class="tag-label-top"><span class="tag-label-dot" style="background:${color}"></span><span class="tag-label-name">${escapeHtml(node.label)}</span></span>
    <span class="tag-label-score">${escapeHtml(formatScore(node.score))}</span>
    <span class="tag-label-group">${escapeHtml(labelForGroup(node.group))}</span>
  `;
  return label;
}

function nodeRadius(node, maxAbsScore) {
  const score = numberOrNull(node.score);
  if (score === null) return 0.07;
  const ratio = Math.min(1, Math.abs(score) / Math.max(1, maxAbsScore));
  const scoreRadius = 0.045 + Math.pow(ratio, 0.62) * 0.17;
  return scoreRadius * (node.critical ? 1.14 : signalActiveForNode(node) ? 1.06 : 1);
}

function tagPosition(random, index, total) {
  // Keep a protected quiet zone around the ticker while preserving a 3D layout.
  const slots = [
    [-7.2, 4.25], [-4.55, 4.55], [-1.7, 4.75], [1.35, 4.65], [4.55, 4.45], [7.45, 3.7],
    [-7.8, 1.65], [-4.9, 2.05], [5.0, 2.05], [7.95, 1.45],
    [-8.05, -1.7], [-4.85, -2.15], [4.8, -2.1], [8.05, -1.75],
    [-7.25, -4.15], [-4.25, -4.55], [-1.35, -4.7], [1.8, -4.7], [4.55, -4.45], [7.5, -3.85],
  ];
  const slot = slots[index % slots.length];
  const extraRing = Math.floor(index / slots.length);
  const angle = index * 2.39996 + random() * 0.24;
  const radius = 4.9 + extraRing * 0.8;
  const depth = (random() - 0.5) * 3.8;
  const jitter = extraRing ? radius * 0.14 : 0.26;
  const x = slot[0] + Math.cos(angle) * jitter;
  const y = slot[1] + Math.sin(angle) * jitter;
  return new THREE.Vector3(
    x,
    y,
    depth,
  );
}

function createCriticalEffect(node, radius, random) {
  const effect = new THREE.Group();
  effect.name = `critical-pulse:${node.view_id}`;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.72, radius * 1.79, 48),
    new THREE.MeshBasicMaterial({
      color: 0xc8a0ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const ringMaterial = ring.material;
  ringMaterial.userData.baseOpacity = 0.44;
  ring.visible = false;
  effect.add(ring);

  const dust = [];
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0xc8a0ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  dustMaterial.userData.baseOpacity = 0.16;
  for (let index = 0; index < 16; index += 1) {
    const particleRadius = radius * (0.035 + random() * 0.045);
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(particleRadius, 6, 6),
      dustMaterial,
    );
    const angle = random() * Math.PI * 2;
    const distance = radius * (0.72 + random() * 1.25);
    particle.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      (random() - 0.5) * radius * 1.4,
    );
    effect.add(particle);
    dust.push(particle);
  }
  effect.userData = {
    ring,
    dust,
    phase: random() * 8.5,
  };
  return effect;
}

function createTagObject(node, position, maxAbsScore, random) {
  const polarity = normalizePolarity(node.polarity);
  const color = new THREE.Color(polarityColors[polarity]);
  const radius = nodeRadius(node, maxAbsScore);
  const change = String(node.lifecycle?.change || "unknown").toLowerCase();
  const transitionMode = change === "appeared" || change === "disappeared" ? change : "persisted";
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData = {
    viewId: node.view_id,
    node,
    signalActive: signalActiveForNode(node),
    phase: random() * Math.PI * 2,
    speed: 0.5 + random() * 0.7,
    baseRadius: radius,
    selected: false,
    transition: {
      mode: transitionMode,
      startedAt: state.clock.getElapsedTime(),
      duration: transitionMode === "disappeared" ? 1.8 : 1.25,
    },
  };

  const glowMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: node.critical ? 0.16 : signalActiveForNode(node) ? 0.1 : 0.026, blending: THREE.AdditiveBlending, depthWrite: false });
  const haloMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: node.critical ? 0.23 : signalActiveForNode(node) ? 0.15 : 0.052, blending: THREE.AdditiveBlending, depthWrite: false });
  const bodyMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xf2fff9, transparent: true, opacity: 0.9 });
  glowMaterial.userData.baseOpacity = glowMaterial.opacity;
  haloMaterial.userData.baseOpacity = haloMaterial.opacity;
  bodyMaterial.userData.baseOpacity = bodyMaterial.opacity;
  coreMaterial.userData.baseOpacity = coreMaterial.opacity;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 2.25, 12, 12),
    glowMaterial,
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.45, 12, 12),
    haloMaterial,
  );
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 14, 14),
    bodyMaterial,
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.42, 10, 10),
    coreMaterial,
  );
  group.add(glow, halo, body, core);

  const direction = position.clone().normalize();
  const label = new CSS2DObject(makeLabel(node, `#${color.getHexString()}`));
  label.position.copy(position).add(direction.multiplyScalar(0.56 + radius * 0.5));
  label.position.y += 0.08;
  // Keep labels in a stable screen-space anchor while the visual star pulses.
  tagLayer.add(label);
  const criticalEffect = node.critical ? createCriticalEffect(node, radius, random) : null;
  if (criticalEffect) group.add(criticalEffect);
  group.userData.parts = { glow, halo, body, core, label, criticalEffect };
  group.userData.pickable = body;
  body.userData.parentNode = group;
  if (transitionMode === "appeared") {
    group.scale.setScalar(0.12);
    label.element.style.opacity = "0";
  } else if (transitionMode === "disappeared") {
    group.scale.setScalar(0.88);
  }
  return group;
}

function renderNodes(snapshot) {
  const nodes = [];
  const seen = new Set();
  for (const raw of tradeEyeTags(snapshot)) {
    const node = raw && typeof raw === "object" ? { ...raw } : null;
    const viewId = String(node?.view_id || "");
    if (!node || node.group !== "trade" || !viewId || seen.has(viewId)) continue;
    seen.add(viewId);
    node.critical = Boolean(node.critical);
    node.lifecycle = node.lifecycle || { state: "active", change: "unknown" };
    node.hidden = node.hidden || { state: "normal" };
    nodes.push(node);
  }
  return nodes;
}

function buildTags(snapshot) {
  const nodes = renderNodes(snapshot)
    .filter((node) => node?.lifecycle?.state !== "inactive" || node?.lifecycle?.change === "disappeared")
    .slice(0, MAX_RENDER_TAGS);
  if (dom.tradeEyeEmpty) {
    const available = snapshot.trade_eye?.available === true;
    dom.tradeEyeEmpty.hidden = nodes.length > 0;
    dom.tradeEyeEmpty.classList.toggle("is-unavailable", !available);
    const title = dom.tradeEyeEmpty.querySelector("strong");
    const message = dom.tradeEyeEmpty.querySelector(".eye-empty-message");
    if (title) title.textContent = available ? "Awaiting factors." : "Awaiting context.";
    if (message) message.textContent = available
      ? "ยังไม่มี execution factor ที่พร้อมแสดงเป็นดาว"
      : "ยังไม่มี execution context ที่เผยแพร่\nพร้อมแสดงเมื่อระบบส่งหลักฐานมา";
  }
  $("#orbital-guide").hidden = nodes.length > 0;
  const maxAbsScore = Math.max(1, ...nodes.map((node) => Math.abs(numberOrNull(node.score) || 0)));
  const random = createRandom(seedFromString(`${snapshot.stock.ticker}:tags`));
  const positions = new Map();
  nodes.forEach((node, index) => positions.set(node.view_id, tagPosition(random, index, nodes.length)));
  for (const [index, node] of nodes.entries()) {
    const object = createTagObject(node, positions.get(node.view_id), maxAbsScore, random);
    object.userData.index = index;
    tagLayer.add(object);
    state.nodeObjects.set(node.view_id, object);
    state.animationObjects.push(object);
  }
  return positions;
}

function buildEdges(snapshot, positions) {
  // The Eye never falls back to generic VI lineage edges.
  for (const edge of snapshot.trade_eye?.edges || []) {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) continue;
    const geometry = new THREE.BufferGeometry().setFromPoints([source, target]);
    const material = new THREE.LineDashedMaterial({
      color: 0xb992ff,
      transparent: true,
      opacity: 0.24,
      dashSize: 0.22,
      gapSize: 0.32,
      linewidth: 1,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.userData = {
      edge,
      phase: createRandom(seedFromString(`${snapshot.stock.ticker}:edge:${edge.source}:${edge.target}`))(),
      baseOpacity: material.opacity,
    };
    edgeLayer.add(line);
    state.edgeObjects.push(line);
  }
}

function buildCore(snapshot) {
  const stock = snapshot.stock || {};
  coreGroup = new THREE.Group();
  const coreColor = new THREE.Color(0xeffff8);
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0x61e6b1, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const mid = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0x61e6b1, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshBasicMaterial({ color: coreColor }));
  const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  coreGroup.add(outer, mid, core, highlight);
  coreGroup.userData = { outer, mid, core, highlight, phase: 0.4 };
  galaxyRoot.add(coreGroup);

  const labelElement = document.createElement("div");
  labelElement.className = "core-label";
  labelElement.innerHTML = `
    <span class="core-label-ticker">${escapeHtml(stock.ticker || "--")}</span>
    <span class="core-label-name">${escapeHtml(stock.name || "Short Horizon Trade Eye")}</span>
    <span class="core-label-state">${escapeHtml(snapshot.trade_eye?.available === true ? "SHORT HORIZON" : "NO TRADE CONTEXT")}</span>
  `;
  coreLabel = new CSS2DObject(labelElement);
  coreLabel.position.set(0, -0.54, 0);
  const hasTradeTags = tradeEyeTags(snapshot).length > 0;
  coreLabel.visible = hasTradeTags;
  labelElement.style.display = hasTradeTags ? "" : "none";
  coreGroup.add(coreLabel);
}

function createSelectedRing() {
  selectedRing = new THREE.Mesh(
    new THREE.RingGeometry(0.27, 0.31, 40),
    new THREE.MeshBasicMaterial({ color: 0xd1a5ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
  );
  selectedRing.visible = false;
  galaxyRoot.add(selectedRing);
}

function renderGalaxy(snapshot) {
  clearSceneLayers();
  state.snapshot = snapshot;
  buildBackground(snapshot.stock.ticker);
  const positions = buildTags(snapshot);
  buildEdges(snapshot, positions);
  buildCore(snapshot);
  createSelectedRing();
  state.selectedId = "";
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.reset();
  }
}

function updateCoreAnimation(time) {
  if (!coreGroup) return;
  const pulse = 1 + Math.sin(time * 0.75 + coreGroup.userData.phase) * 0.055;
  coreGroup.userData.outer.scale.setScalar(pulse);
  coreGroup.userData.mid.scale.setScalar(1 + Math.sin(time * 0.95) * 0.045);
  coreGroup.userData.highlight.scale.setScalar(1 + Math.sin(time * 1.1) * 0.08);
}

function updateNodeAnimation(time) {
  for (const object of state.nodeObjects.values()) {
    const { glow, halo, body, core, label, criticalEffect } = object.userData.parts;
    const transition = object.userData.transition || {};
    const progress = transition.duration
      ? Math.max(0, Math.min(1, (time - transition.startedAt) / transition.duration))
      : 1;
    let visibility = 1;
    let transitionScale = 1;
    if (transition.mode === "appeared") {
      const eased = smoothStep(progress);
      visibility = eased;
      transitionScale = 0.12 + eased * 0.88;
    } else if (transition.mode === "disappeared") {
      const eased = smoothStep(progress);
      visibility = 1 - eased;
      transitionScale = 0.88 + (1 - eased) * 0.12;
      if (progress >= 1) {
        object.visible = false;
        label.element.style.opacity = "0";
        continue;
      }
    }
    object.visible = true;
    const activeSignal = object.userData.signalActive === true;
    const oscillation = Math.sin(time * object.userData.speed + object.userData.phase);
    const pulse = 1 + oscillation * (activeSignal ? 0.22 : 0.025);
    const glowVisibility = activeSignal
      ? 0.62 + (Math.sin(time * object.userData.speed * 1.65 + object.userData.phase) + 1) * 0.19
      : 1;
    glow.scale.setScalar(pulse);
    halo.scale.setScalar(1 + (pulse - 1) * 0.62);
    object.rotation.y += 0.0008;
    object.scale.setScalar((object.userData.selected ? 1.16 : 1) * transitionScale);
    label.element.style.opacity = String(visibility);
    for (const mesh of [glow, halo, body, core]) {
      const baseOpacity = mesh.material?.userData?.baseOpacity;
      if (typeof baseOpacity === "number") mesh.material.opacity = baseOpacity * visibility * glowVisibility;
    }
    if (criticalEffect) {
      const cycle = ((time + criticalEffect.userData.phase) % 8.5) / 8.5;
      const active = cycle < 0.24;
      const pulseProgress = active ? cycle / 0.24 : 0;
      const easedPulse = smoothStep(pulseProgress);
      const ring = criticalEffect.userData.ring;
      ring.visible = active && visibility > 0;
      ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(1 + easedPulse * 0.72);
      ring.material.opacity = active
        ? ring.material.userData.baseOpacity * (1 - easedPulse) * visibility
        : 0;
      for (const particle of criticalEffect.userData.dust) {
        const baseOpacity = particle.material?.userData?.baseOpacity;
        if (typeof baseOpacity === "number") {
          particle.material.opacity = baseOpacity * visibility * (0.7 + Math.sin(time * 0.45 + particle.position.x) * 0.2);
        }
      }
      criticalEffect.rotation.z += 0.0006;
    }
  }
  if (selectedRing?.visible) {
    selectedRing.quaternion.copy(camera.quaternion);
    const pulse = 1 + Math.sin(time * 2.2) * 0.08;
    selectedRing.scale.setScalar(pulse);
    selectedRing.material.opacity = 0.58 + Math.sin(time * 2.2) * 0.2;
  }
}

function updateEdgeAnimation(time) {
  for (const line of state.edgeObjects) {
    line.material.dashOffset = -(time * 0.035 + line.userData.phase);
    line.material.opacity = line.userData.baseOpacity * (0.82 + Math.sin(time * 0.45 + line.userData.phase) * 0.18);
  }
}

function rectanglesOverlap(left, right, padding = 4) {
  return !(
    left.right + padding <= right.left
    || left.left - padding >= right.right
    || left.bottom + padding <= right.top
    || left.top - padding >= right.bottom
  );
}

function resolveMobileLabelPacking(stageRect, labels) {
  // Keep enough spare slots to avoid the central ticker without turning the
  // mobile view into a pile of overlapping labels.
  const columns = 4;
  const rows = Math.max(6, Math.ceil((labels.length + 1) / columns));
  const columnGap = 10;
  const rowGap = 6;
  const horizontalInset = 6;
  const verticalInsetTop = 51;
  const verticalInsetBottom = 54;
  const slotWidth = (stageRect.width - horizontalInset * 2 - columnGap * (columns - 1)) / columns;
  const slotHeight = (stageRect.height - verticalInsetTop - verticalInsetBottom - rowGap * (rows - 1)) / rows;
  const slots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slots.push({
        left: stageRect.left + horizontalInset + column * (slotWidth + columnGap),
        top: stageRect.top + verticalInsetTop + row * (slotHeight + rowGap),
        width: slotWidth,
        height: slotHeight,
      });
    }
  }
  const coreRect = coreLabel?.element?.getBoundingClientRect?.();
  const protectedCore = coreRect && {
    left: coreRect.left - 4,
    right: coreRect.right + 4,
    top: coreRect.top - 4,
    bottom: coreRect.bottom + 4,
  };
  const available = slots.filter((slot) => {
    if (!protectedCore) return true;
    return !rectanglesOverlap(
      { left: slot.left, right: slot.left + slot.width, top: slot.top, bottom: slot.top + slot.height },
      protectedCore,
      0,
    );
  });
  const fallbackSlots = available.length >= labels.length ? available : slots;
  const used = new Set();
  for (const item of labels) {
    const current = item.element.getBoundingClientRect();
    const currentCenter = { x: current.left + current.width / 2, y: current.top + current.height / 2 };
    const candidates = fallbackSlots
      .map((slot, index) => ({ slot, index }))
      .filter(({ index }) => !used.has(index))
      .sort((left, right) => {
        const leftCenter = { x: left.slot.left + left.slot.width / 2, y: left.slot.top + left.slot.height / 2 };
        const rightCenter = { x: right.slot.left + right.slot.width / 2, y: right.slot.top + right.slot.height / 2 };
        const leftDistance = Math.hypot(leftCenter.x - currentCenter.x, leftCenter.y - currentCenter.y);
        const rightDistance = Math.hypot(rightCenter.x - currentCenter.x, rightCenter.y - currentCenter.y);
        return leftDistance - rightDistance;
      });
    const choice = candidates[0];
    if (!choice) continue;
    used.add(choice.index);
    const desiredLeft = choice.slot.left + Math.max(0, (choice.slot.width - current.width) / 2);
    const desiredTop = choice.slot.top + Math.max(0, (choice.slot.height - current.height) / 2);
    const currentMarginLeft = Number.parseFloat(item.element.style.marginLeft) || 0;
    const currentMarginTop = Number.parseFloat(item.element.style.marginTop) || 0;
    item.element.style.marginLeft = `${currentMarginLeft + desiredLeft - current.left}px`;
    item.element.style.marginTop = `${currentMarginTop + desiredTop - current.top}px`;
  }
}

function resolveLabelOverlaps() {
  if (!labelRenderer) return;
  const stageRect = dom.galaxy.getBoundingClientRect();
  const occupied = [];
  if (coreLabel?.element && coreLabel.element.getBoundingClientRect().width > 0) {
    const rect = coreLabel.element.getBoundingClientRect();
    occupied.push({ left: rect.left - 14, right: rect.right + 14, top: rect.top - 14, bottom: rect.bottom + 14 });
  }
  const labels = [...state.nodeObjects.values()]
    .filter((object) => object.visible && object.userData.parts?.label?.element?.style.opacity !== "0")
    .map((object) => ({
      object,
      element: object.userData.parts.label.element,
      node: object.userData.node,
    }))
    .sort((left, right) => {
      const leftCritical = left.node.critical ? 1 : 0;
      const rightCritical = right.node.critical ? 1 : 0;
      if (leftCritical !== rightCritical) return rightCritical - leftCritical;
      const leftScore = Math.abs(numberOrNull(left.node.score) || 0);
      const rightScore = Math.abs(numberOrNull(right.node.score) || 0);
      return rightScore - leftScore;
    });
  if (stageRect.width < 760) {
    resolveMobileLabelPacking(stageRect, labels);
    return;
  }
  const offsets = [];
  const maxOffset = stageRect.width < 760 ? 216 : 144;
  for (let radius = 0; radius <= maxOffset; radius += 18) {
    if (radius === 0) {
      offsets.push([0, 0]);
      continue;
    }
    for (let y = -radius; y <= radius; y += 18) {
      for (let x = -radius; x <= radius; x += 18) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
        offsets.push([x, y]);
      }
    }
  }
  for (const item of labels) {
    item.element.style.marginLeft = "0px";
    item.element.style.marginTop = "0px";
    let chosen = item.element.getBoundingClientRect();
    let chosenOffset = [0, 0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const [x, y] of offsets) {
      item.element.style.marginLeft = `${x}px`;
      item.element.style.marginTop = `${y}px`;
      const candidate = item.element.getBoundingClientRect();
      let clampedX = x;
      let clampedY = y;
      if (candidate.left < stageRect.left + 6) clampedX += stageRect.left + 6 - candidate.left;
      if (candidate.right > stageRect.right - 6) clampedX -= candidate.right - (stageRect.right - 6);
      if (candidate.top < stageRect.top + 6) clampedY += stageRect.top + 6 - candidate.top;
      if (candidate.bottom > stageRect.bottom - 6) clampedY -= candidate.bottom - (stageRect.bottom - 6);
      item.element.style.marginLeft = `${clampedX}px`;
      item.element.style.marginTop = `${clampedY}px`;
      const clampedCandidate = item.element.getBoundingClientRect();
      const overlap = occupied.reduce((total, rect) => total + (rectanglesOverlap(clampedCandidate, rect) ? 1 : 0), 0);
      const outOfBounds = [
        clampedCandidate.left < stageRect.left + 6,
        clampedCandidate.right > stageRect.right - 6,
        clampedCandidate.top < stageRect.top + 6,
        clampedCandidate.bottom > stageRect.bottom - 6,
      ].filter(Boolean).length;
      const score = overlap * 10000 + outOfBounds * 1000 + Math.abs(clampedX) + Math.abs(clampedY) * 0.8;
      if (score < bestScore) {
        bestScore = score;
        chosen = clampedCandidate;
        chosenOffset = [clampedX, clampedY];
      }
      if (overlap === 0 && outOfBounds === 0) break;
    }
    item.element.style.marginLeft = `${chosenOffset[0]}px`;
    item.element.style.marginTop = `${chosenOffset[1]}px`;
    chosen = item.element.getBoundingClientRect();
    occupied.push(chosen);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = state.clock.getDelta();
  if (document.hidden || state.workspaceView !== "galaxy") return;
  state.frame += 1;
  if (!state.motionPaused) state.visualTime += delta;
  const time = state.visualTime;
  for (const item of state.animationObjects) {
    if (!state.motionPaused && item?.object && item.drift) {
      item.object.rotation.y += item.drift;
      item.object.rotation.x += item.drift * 0.37;
    }
  }
  updateCoreAnimation(time);
  updateNodeAnimation(time);
  updateEdgeAnimation(time);
  controls?.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (state.frame % 4 === 0) {
    resolveLabelOverlaps();
    state.lastLabelLayoutAt = time;
  }
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c181b);
  scene.fog = new THREE.FogExp2(0x0c181b, 0.008);
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.8, 20);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-label", "Interactive 3D ApexView Galaxy");
  renderer.domElement.setAttribute("role", "img");
  dom.galaxy.append(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "label-layer";
  dom.galaxy.append(labelRenderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.045;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 34;
  controls.autoRotate = !state.motionPaused;
  controls.autoRotateSpeed = 0.08;
  galaxyRoot = new THREE.Group();
  backgroundLayer = new THREE.Group();
  edgeLayer = new THREE.Group();
  tagLayer = new THREE.Group();
  galaxyRoot.add(backgroundLayer, edgeLayer, tagLayer);
  scene.add(galaxyRoot);
  resizeScene();
  new ResizeObserver(resizeScene).observe(dom.galaxy);
  window.addEventListener("resize", resizeScene);
  dom.galaxy.addEventListener("pointermove", onPointerMove);
  dom.galaxy.addEventListener("pointerdown", onPointerDown);
  dom.galaxy.addEventListener("pointerup", onPointerUp);
  dom.galaxy.addEventListener("pointerleave", () => { dom.galaxy.classList.remove("is-hovering"); });
  animate();
}

function resizeScene() {
  if (!renderer || !camera) return;
  const width = dom.galaxy.clientWidth || 1;
  const height = dom.galaxy.clientHeight || 1;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (galaxyRoot) {
    const portraitScale = Math.min(1, Math.max(0.58, width / 620));
    galaxyRoot.scale.setScalar(width < 760 ? portraitScale : 1);
  }
  if (controls) controls.autoRotateSpeed = width < 760 ? 0.025 : 0.08;
  renderer.setSize(width, height, false);
  labelRenderer.setSize(width, height);
}

function pickNode(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, camera);
  const pickables = [...state.nodeObjects.values()].map((object) => object.userData.pickable);
  const intersections = state.raycaster.intersectObjects(pickables, false);
  return intersections[0]?.object?.userData?.parentNode || null;
}

function onPointerMove(event) {
  const node = pickNode(event);
  dom.galaxy.classList.toggle("is-hovering", Boolean(node));
}

function onPointerDown(event) {
  state.pointerDown = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!state.pointerDown) return;
  const distance = Math.hypot(event.clientX - state.pointerDown.x, event.clientY - state.pointerDown.y);
  state.pointerDown = null;
  if (distance > 6) return;
  const node = pickNode(event);
  if (node) selectNode(node.userData.viewId);
}

function selectNode(viewId) {
  const nodeObject = state.nodeObjects.get(viewId);
  const node = nodeObject?.userData?.node;
  if (!node) return;
  state.selectedId = viewId;
  if (selectedRing) {
    selectedRing.visible = true;
    selectedRing.position.copy(nodeObject.position);
    selectedRing.material.color.setHex(polarityColors[normalizePolarity(node.polarity)]);
  }
  renderDetail(node);
  for (const object of state.nodeObjects.values()) {
    const active = object.userData.viewId === viewId;
    object.userData.selected = active;
    object.userData.parts.label.element?.classList.toggle("is-selected", active);
  }
}

function clearSelection() {
  state.selectedId = "";
  if (selectedRing) selectedRing.visible = false;
  dom.detailEmpty.hidden = false;
  dom.detailContent.hidden = true;
  for (const object of state.nodeObjects.values()) {
    object.userData.selected = false;
    object.userData.parts.label.element?.classList.remove("is-selected");
  }
}

function renderDetail(node) {
  const polarity = normalizePolarity(node.polarity);
  dom.detailEmpty.hidden = true;
  dom.detailContent.hidden = false;
  dom.detailMoodDot.className = `mood-dot ${polarityClasses[polarity]}`;
  dom.detailGroup.textContent = labelForGroup(node.group);
  dom.detailCritical.hidden = !node.critical;
  dom.detailLabel.textContent = node.label || "Unnamed TAG";
  dom.detailScore.textContent = formatScore(node.score);
  dom.detailScore.className = `detail-score ${polarityClasses[polarity]}`;
  dom.detailReason.textContent = node.reason || "ไม่มีคำอธิบายจาก snapshot";
  dom.detailComponents.replaceChildren();
  const components = Array.isArray(node.components) ? node.components : [];
  if (!components.length) {
    const empty = document.createElement("span");
    empty.className = "component-empty";
    empty.textContent = "ไม่มี component ที่ประกาศไว้";
    dom.detailComponents.append(empty);
  } else {
    for (const component of components) {
      const chip = document.createElement("span");
      chip.className = "component-chip";
      chip.textContent = component;
      dom.detailComponents.append(chip);
    }
  }
  const provenance = node.provenance || {};
  const validation = node.validation || {};
  dom.detailChain.innerHTML = `
    <span class="chain-step"><b>${escapeHtml(provenance.source || "ApexThinker")}</b><small>ต้นทาง</small></span>
    <span class="chain-arrow">→</span>
    <span class="chain-step"><b>${escapeHtml(node.label || "TAG")}</b><small>snapshot node</small></span>
    <span class="chain-arrow">→</span>
    <span class="chain-step"><b>${escapeHtml(validation.status || "ไม่ได้แนบผลตรวจ")}</b><small>validation</small></span>
  `;
  const lifecycle = node.lifecycle || {};
  const hidden = node.hidden || {};
  dom.detailFacts.innerHTML = `
    <div><span>POLARITY</span><strong>${escapeHtml(polarity)}</strong></div>
    <div><span>TRADE STATUS</span><strong>${escapeHtml(node.status || "not declared")}</strong></div>
    <div><span>TIMEFRAME WEIGHT</span><strong>${escapeHtml(numberOrNull(node.timeframe_weight_pct) === null ? "--" : `${numberOrNull(node.timeframe_weight_pct).toFixed(0)}%`)}</strong></div>
    <div><span>LIFECYCLE</span><strong>${escapeHtml(lifecycle.state || "unknown")}</strong></div>
    <div><span>CHANGE</span><strong>${escapeHtml(lifecycle.change || "unknown")}</strong></div>
    <div><span>HIDDEN STATE</span><strong>${escapeHtml(hidden.state || "normal")}</strong></div>
    <div><span>SIZE SOURCE</span><strong>${escapeHtml(node.display?.size_source || "unknown")}</strong></div>
  `;
}

function renderSummary(snapshot) {
  const stock = snapshot.stock || {};
  const eyeTags = tradeEyeTags(snapshot);
  const eye = snapshot.trade_eye || {};
  const diagnosticCount = Number(eye.counts?.diagnostic || Math.max(0, (snapshot.trade?.tags?.length || 0) - eyeTags.length));
  const eyeCounts = eyeTags.reduce((result, tag) => {
    const status = String(tag?.status || "watch").toLowerCase();
    const polarity = normalizePolarity(tag?.polarity);
    if (status === "passed") result.passed += 1;
    else if (status === "blocked" || tag?.hard_blocker) result.blocked += 1;
    else result.watch += 1;
    if (polarity === "neutral") result.neutral += 1;
    if (tag?.hard_blocker) result.hard += 1;
    return result;
  }, { passed: 0, blocked: 0, watch: 0, neutral: 0, hard: 0 });
  const tradeCount = eyeTags.length;
  dom.ticker.textContent = stock.ticker || "--";
  dom.stockName.textContent = stock.name || `${stock.ticker || "Stock"} · Short Horizon trade eye`;
  dom.price.textContent = formatPrice(stock.price);
  dom.action.textContent = stock.action || "READ-ONLY";
  dom.action.className = `action-label ${String(stock.action || "").toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  dom.marketMode.textContent = stock.market_mode || "ไม่ระบุ";
  dom.snapshotTime.textContent = formatDate(snapshot.as_of?.snapshot_ts || snapshot.generated_at);
  dom.marketTime.textContent = formatDate(snapshot.as_of?.market_ts);
  dom.logicVersion.textContent = snapshot.logic_version || "ไม่ระบุ";
  const observation = snapshot.market_observation || {};
  const source = snapshot.market_chart?.source || {};
  const capabilities = observation.capabilities || source.capabilities || {};
  if (dom.marketTransportStatus) dom.marketTransportStatus.textContent = capabilities.transport || observation.transport_status || "UNKNOWN";
  if (dom.marketChartStatus) dom.marketChartStatus.textContent = capabilities.chart || (observation.chart_renderable ? "READY" : "UNAVAILABLE");
  if (dom.marketResearchStatus) dom.marketResearchStatus.textContent = capabilities.research || observation.research_admission_status || observation.admission_status || "UNKNOWN";
  if (dom.marketPublicationStatus) dom.marketPublicationStatus.textContent = capabilities.publication || observation.publication_rights_status || observation.publication_status || "UNKNOWN";
  dom.sourceContract.textContent = snapshot.contract_version || SNAPSHOT_VERSION;
  dom.activeCount.textContent = `${tradeCount} VISIBLE${diagnosticCount ? ` · ${diagnosticCount} DIAGNOSTIC` : ""}`;
  dom.positiveCount.textContent = eyeCounts.passed;
  dom.negativeCount.textContent = eyeCounts.blocked;
  dom.cautionCount.textContent = eyeCounts.watch;
  dom.neutralCount.textContent = eyeCounts.neutral;
  dom.criticalCount.textContent = eyeCounts.hard;
  dom.tradeCount.textContent = tradeCount;
  dom.fixtureBadge.hidden = selectedManifestItem(stock.ticker)?.kind !== "test_fixture";
  const isFixture = selectedManifestItem(stock.ticker)?.kind === "test_fixture";
  $("#stage-data-kind").textContent = isFixture ? `${stock.ticker} · TEST FIXTURE` : `${stock.ticker || "—"} · SNAPSHOT`;
  $("#stage-data-kind").classList.toggle("is-published", !isFixture);
  $("#snapshot-context-note").textContent = isFixture
    ? "ข้อมูลตัวอย่างสำหรับตรวจการแสดงผล · ไม่ใช่ candidate หรือราคาสด"
    : "ราคาจาก snapshot ที่จัดเก็บ · ตรวจเวลาตลาดก่อนใช้อ้างอิง";
  if (dom.timelineStatus) {
    const movement = snapshot.trade_eye?.movement || {};
    const eventCount = Array.isArray(movement.events) ? movement.events.length : 0;
    dom.timelineStatus.textContent = movement.supported
      ? `TRADE · ${eventCount} EVENTS`
      : "TRADE · BASELINE ONLY";
  }
}

function tradeEyeTags(snapshot) {
  const eye = snapshot?.trade_eye;
  if (eye && Array.isArray(eye.visible_tags)) return eye.visible_tags;
  const tradeTags = snapshot?.trade?.tags;
  return Array.isArray(tradeTags) ? tradeTags.slice(0, MAX_VISIBLE_TRADE_TAGS) : [];
}

function tradeEyeMovementEvents(snapshot) {
  const movement = snapshot?.trade_eye?.movement;
  if (movement && Array.isArray(movement.events)) return movement.events;
  const allowed = new Set(["trade_tag_appeared", "trade_tag_disappeared", "trade_tag_score_changed", "trade_signal_changed", "execution_gate_changed", "action_changed"]);
  const timeline = snapshot?.evidence_timeline || {};
  return Array.isArray(timeline.events) ? timeline.events.filter((event) => allowed.has(String(event?.event_type || ""))) : [];
}

function scheduleSnapshotRetry() {
  if (state.paperSnapshotRetryTimer || state.paperSnapshotRetryAttempt >= PAPER_SNAPSHOT_RETRY_MAX) return;
  const attempt = state.paperSnapshotRetryAttempt;
  const delay = Math.min(PAPER_STATUS_RETRY_MAX_MS, 1_000 * (2 ** Math.min(attempt, 4)));
  state.paperSnapshotRetryAttempt += 1;
  state.paperSnapshotRetryTimer = window.setTimeout(async () => {
    state.paperSnapshotRetryTimer = null;
    if (document.hidden) { scheduleSnapshotRetry(); return; }
    await refreshCurrentView({ showLoading: false });
  }, delay);
}

function renderTradePlan(trade, snapshot) {
  const rawTimeframe = trade?.timeframe;
  const timeframe = rawTimeframe && typeof rawTimeframe === "object"
    ? rawTimeframe
    : snapshot?.short_horizon?.timeframe_contract || {};
  const selected = String(timeframe.selected || snapshot?.short_horizon?.active_timeframe || "1D").toUpperCase();
  const fallbackProfiles = [
    { timeframe: "1D", label: "Daily", role_label: "บริบท + สัญญาณ", data_available: false },
    { timeframe: "1H", label: "1 Hour", role_label: "สร้าง setup", data_available: false },
    { timeframe: "15M", label: "15 Minute", role_label: "ยืนยัน trigger", data_available: false },
    { timeframe: "5M", label: "5 Minute", role_label: "เก็บจังหวะ execution", data_available: false },
  ];
  const profiles = Array.isArray(timeframe.profiles) && timeframe.profiles.length
    ? timeframe.profiles
    : fallbackProfiles;
  const activeProfile = timeframe.active_profile || profiles.find((item) => String(item?.timeframe || "").toUpperCase() === selected) || profiles[0];
  dom.tradeTimeframe.textContent = `${selected} · ${String(activeProfile?.label || selected).toUpperCase()}`;
  dom.tradeTimeframeList.replaceChildren();
  for (const profile of profiles) {
    const key = String(profile?.timeframe || "").toUpperCase();
    if (!key) continue;
    const available = profile.data_available === true;
    const pill = document.createElement("span");
    pill.className = `timeframe-pill ${key === selected ? "is-active" : ""} ${available ? "is-available" : "is-pending"}`;
    pill.title = available
      ? `${profile.role_label || profile.role || "available"} · data available`
      : `${profile.role_label || profile.role || "pending"} · verified timeframe contract required`;
    pill.innerHTML = `<b>${escapeHtml(key)}</b><small>${escapeHtml(available ? "READY" : "PENDING")}</small>`;
    dom.tradeTimeframeList.append(pill);
  }

  const plan = trade?.plan && typeof trade.plan === "object"
    ? trade.plan
    : snapshot?.short_horizon?.trade_plan || {};
  const status = String(plan.status || "unavailable").toLowerCase();
  const statusLabels = {
    risk_gate_review: "PAPER · RISK GATE",
    exit_review: "PAPER · EXIT REVIEW",
    blocked: "BLOCKED · EXECUTION",
    blocked_geometry: "BLOCKED · GEOMETRY",
    unavailable: "NO MAP",
  };
  dom.tradePlanStatus.textContent = statusLabels[status] || String(plan.status_label || status).toUpperCase();
  dom.tradePlan.className = `trade-plan ${status === "risk_gate_review" || status === "exit_review" ? "is-ready" : status === "blocked" || status === "blocked_geometry" ? "is-blocked" : "is-unavailable"}`;

  const levels = plan.levels || {};
  const entryZone = plan.entry_zone || {};
  const entryLower = numberOrNull(entryZone.lower);
  const entryUpper = numberOrNull(entryZone.upper);
  dom.tradeEntryZone.textContent = entryLower !== null && entryUpper !== null
    ? `${formatPrice(entryLower)}–${formatPrice(entryUpper)}`
    : "--";
  dom.tradeInvalidation.textContent = formatPrice(levels.invalidation?.price);
  dom.tradeTarget.textContent = formatPrice(levels.target?.price);
  const horizon = numberOrNull(plan.time_rule?.horizon_days);
  const remaining = numberOrNull(plan.time_rule?.remaining_days);
  dom.tradeTimeStop.textContent = horizon === null
    ? "--"
    : `${horizon.toFixed(0)}D${remaining === null ? "" : ` · ${remaining.toFixed(0)}D left`}`;
  dom.tradeRiskReward.textContent = formatPlanMultiple(plan.risk?.reward_risk);
  dom.tradeEv.textContent = formatPlanPercent(plan.risk?.ev_net_pct);
  dom.tradePlanNote.textContent = plan.note
    || (status === "unavailable"
      ? "ยังไม่มีระดับ entry/target/invalidation ที่ประกาศจาก Short Horizon"
      : "Trade Map เป็นภาพอธิบายเท่านั้น และยังต้องผ่าน Risk Gate");
}


function openTagExplanation(tag, trigger = null) {
  if (!dom.tagExplanation || !tag || typeof tag !== "object") return;
  tagExplanationReturnFocus = trigger || document.activeElement;
  const polarity = normalizePolarity(tag.polarity);
  const score = numberOrNull(tag.score);
  const weight = numberOrNull(tag.timeframe_weight_pct);
  dom.tagExplanationGroup.textContent = labelForGroup(tag.group || "trade");
  dom.tagExplanationLabel.textContent = tag.label || tag.code || "Trade factor";
  dom.tagExplanationScore.className = `tag-explanation-score ${polarityClasses[polarity]}`;
  dom.tagExplanationScore.textContent = [
    score === null ? "คะแนนไม่ระบุ" : formatScore(score),
    weight === null ? null : `น้ำหนัก ${weight.toFixed(0)}%`,
  ].filter(Boolean).join(" · ");
  dom.tagExplanationReason.textContent = String(tag.reason || "ไม่มีคำอธิบายจาก snapshot").trim() || "ไม่มีคำอธิบายจาก snapshot";
  const components = Array.isArray(tag.components) ? tag.components.filter((component) => String(component || "").trim()) : [];
  dom.tagExplanationComponents.replaceChildren();
  dom.tagExplanationComponentsBlock.hidden = components.length === 0;
  for (const component of components) {
    const chip = document.createElement("span");
    chip.textContent = component;
    dom.tagExplanationComponents.append(chip);
  }
  dom.tagExplanation.hidden = false;
  dom.closeTagExplanation?.focus({ preventScroll: true });
}

function closeTagExplanation() {
  if (!dom.tagExplanation || dom.tagExplanation.hidden) return;
  dom.tagExplanation.hidden = true;
  const returnFocus = tagExplanationReturnFocus;
  tagExplanationReturnFocus = null;
  if (returnFocus?.isConnected && typeof returnFocus.focus === "function") returnFocus.focus({ preventScroll: true });
}

function renderTrade(snapshot) {
  const trade = snapshot.trade || {};
  const tags = tradeEyeTags(snapshot);
  const eye = snapshot.trade_eye || {};
  const diagnosticCount = Number(eye.counts?.diagnostic || Math.max(0, (trade.tags?.length || 0) - tags.length));
  const available = trade.available === true;
  const balance = numberOrNull(trade.weighted_balance);
  dom.tradeCount.textContent = tags.length;
  dom.tradeStatus.textContent = available ? trade.status_label || trade.status || "REVIEW" : "UNAVAILABLE";
  dom.tradeStatus.className = `trade-status ${trade.status === "ready_for_external_risk_gate" ? "is-ready" : trade.status === "blocked" ? "is-blocked" : ""}`;
  dom.tradeBalance.textContent = balance === null ? "--" : `${balance > 0 ? "+" : ""}${balance.toFixed(2)}`;
  dom.tradeCoverage.textContent = available ? `${Number(trade.coverage?.pct || 0).toFixed(0)}%` : "--";
  dom.tradeTagList.replaceChildren();
  if (!tags.length) {
    const empty = document.createElement("span");
    empty.className = "trade-tag-empty";
    empty.textContent = "ยังไม่มี execution factors ที่ผ่าน contract";
    dom.tradeTagList.append(empty);
  } else {
    for (const tag of tags) {
      const polarity = normalizePolarity(tag.polarity);
      const row = document.createElement("button");
      row.type = "button";
      row.className = `trade-tag ${tag.hard_blocker ? "is-blocker" : ""}`;
      row.title = tag.reason || "เปิดคำอธิบายปัจจัย";
      row.setAttribute("aria-label", `อธิบาย ${tag.label || tag.code || "Trade factor"}`);
      const tagWeight = numberOrNull(tag.timeframe_weight_pct);
      const weightText = tagWeight === null ? "W--" : `W${tagWeight.toFixed(0)}%`;
      row.innerHTML = `
        <span class="trade-tag-dot ${escapeHtml(polarity)}"></span>
        <span>${escapeHtml(tag.label || tag.code || "Trade factor")}</span>
        <strong>${escapeHtml(formatScore(tag.score))} · ${escapeHtml(weightText)}</strong>
      `;
      row.addEventListener("click", () => openTagExplanation(tag, row));
      dom.tradeTagList.append(row);
    }
    if (diagnosticCount) {
      const note = document.createElement("span");
      note.className = "trade-tag-diagnostic-note";
      note.textContent = `+${diagnosticCount} diagnostic factor${diagnosticCount === 1 ? "" : "s"} stay outside the Eye`;
      dom.tradeTagList.append(note);
    }
  }
  const risk = trade.external_risk_gate || {};
  const missing = Array.isArray(trade.missing_inputs) ? trade.missing_inputs.length : 0;
  dom.tradeGateNote.querySelector("span").textContent = available
    ? `${risk.status === "not_evaluated" ? "ยังไม่ประเมินข้อมูลบัญชี/พอร์ต" : risk.status}${missing ? ` · ขาด ${missing} field` : ""}`
    : "ApexView แสดงผลเท่านั้น และยังไม่มี execution context สำหรับ Risk Gate";
  renderTradePlan(trade, snapshot);
}

function stopTimelinePlayback() {
  if (state.timelineTimer) window.clearInterval(state.timelineTimer);
  state.timelineTimer = null;
  state.timelinePlaying = false;
  dom.timelinePlay?.classList.remove("is-playing");
  if (dom.timelinePlay) {
    dom.timelinePlay.innerHTML = '<i data-lucide="play"></i>';
    dom.timelinePlay.setAttribute("aria-label", "Play timeline");
    dom.timelinePlay.dataset.tooltip = "Play";
    createIcons({ icons: APP_ICONS });
  }
  updateTimelineControls();
}

function updateTimelineControls() {
  const total = state.timelineEvents.length;
  const previous = $("#timeline-previous");
  const next = $("#timeline-next");
  const play = dom.timelinePlay;
  if (previous) {
    previous.disabled = total === 0 || state.timelineIndex <= 0;
    previous.setAttribute("aria-disabled", String(previous.disabled));
  }
  if (next) {
    next.disabled = total === 0 || state.timelineIndex >= total - 1;
    next.setAttribute("aria-disabled", String(next.disabled));
  }
  if (play) {
    play.disabled = total === 0;
    play.setAttribute("aria-disabled", String(play.disabled));
  }
}

function setTimelineIndex(index, { inspect = true } = {}) {
  if (!state.timelineEvents.length) {
    state.timelineIndex = -1;
    updateTimelineControls();
    return;
  }
  state.timelineIndex = Math.max(0, Math.min(state.timelineEvents.length - 1, index));
  const event = state.timelineEvents[state.timelineIndex];
  dom.eventList.querySelectorAll(".event-item").forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === state.timelineIndex);
  });
  const active = dom.eventList.children[state.timelineIndex];
  active?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
  const nodeId = Array.isArray(event?.node_ids) ? event.node_ids.find((value) => state.nodeObjects.has(value)) : "";
  updateTimelineControls();
  if (inspect && nodeId) selectNode(nodeId);
}

function toggleTimelinePlayback() {
  if (!state.timelineEvents.length) return;
  if (state.timelinePlaying) {
    stopTimelinePlayback();
    return;
  }
  state.timelinePlaying = true;
  dom.timelinePlay.classList.add("is-playing");
  dom.timelinePlay.innerHTML = '<i data-lucide="pause"></i>';
  dom.timelinePlay.setAttribute("aria-label", "Pause timeline");
  dom.timelinePlay.dataset.tooltip = "Pause";
  createIcons({ icons: APP_ICONS });
  if (state.timelineIndex >= state.timelineEvents.length - 1) setTimelineIndex(0);
  state.timelineTimer = window.setInterval(() => {
    if (state.timelineIndex >= state.timelineEvents.length - 1) {
      stopTimelinePlayback();
      return;
    }
    setTimelineIndex(state.timelineIndex + 1);
  }, 2200);
}

function eventPolarity(event) {
  const declared = normalizePolarity(event?.polarity);
  if (declared !== "neutral") return declared;
  const eventType = String(event?.event_type || "");
  if (eventType.includes("disappeared") || eventType.includes("dissolved")) return "negative";
  if (eventType.includes("appeared") || eventType.includes("formed")) return "positive";
  return "neutral";
}

function renderEvents(snapshot) {
  stopTimelinePlayback();
  const events = tradeEyeMovementEvents(snapshot);
  state.timelineEvents = events.slice(-120);
  state.timelineIndex = state.timelineEvents.length ? state.timelineEvents.length - 1 : -1;
  dom.eventCount.textContent = `${state.timelineEvents.length} EVENTS`;
  dom.eventList.replaceChildren();
  if (!state.timelineEvents.length) {
    const empty = document.createElement("span");
    empty.className = "event-empty";
    empty.textContent = "TIMELINE ACCUMULATING · รอ snapshot/event จริงจาก backend";
    dom.eventList.append(empty);
    updateTimelineControls();
    return;
  }
  for (const [index, event] of state.timelineEvents.entries()) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `event-item ${index === state.timelineIndex ? "is-active" : ""}`;
    item.dataset.eventId = event.event_id || String(index);
    item.innerHTML = `
      <span class="event-marker ${escapeHtml(eventPolarity(event))}"></span>
      <time>${escapeHtml(formatShortDate(event.observed_at))}</time>
      <span class="event-summary">${escapeHtml(event.summary || event.event_type || "Evidence event")}</span>
      <span class="event-source">${escapeHtml(event.source || "snapshot")}</span>
    `;
    item.addEventListener("click", () => {
      stopTimelinePlayback();
      setTimelineIndex(index);
    });
    dom.eventList.append(item);
  }
  updateTimelineControls();
}

async function loadTicker(ticker, { showLoading = true } = {}) {
  const requestId = ++state.snapshotRequest;
  const normalized = String(ticker || DEFAULT_TICKER).toUpperCase();
  if (state.manifestLoaded && getManifestOptions(state.manifest).length === 0) {
    throw new Error("No published market snapshot is available");
  }
  state.ticker = normalized;
  dom.tickerSelect.value = normalized;
  updateQueryTicker(normalized);
  clearError();
  closeTagExplanation();
  clearSelection();
  if (showLoading) setLoading(true, `Loading ${normalized} snapshot`);
  try {
    const snapshot = validateSnapshot(await fetchJson(snapshotUrlFor(normalized)), normalized);
    if (requestId !== state.snapshotRequest) return;
    renderSummary(snapshot);
    state.snapshot = snapshot;
    renderMarketChart(snapshot);
    renderTrade(snapshot);
    renderEvents(snapshot);
    renderGalaxy(snapshot);
    state.paperSnapshotRetryAttempt = 0;
    if (state.paperSnapshotRetryTimer) {
      window.clearTimeout(state.paperSnapshotRetryTimer);
      state.paperSnapshotRetryTimer = null;
    }
    setLoading(false);
  } catch (error) {
    if (requestId !== state.snapshotRequest) return;
    state.snapshot = null;
    clearSceneLayers();
    renderSummary({ stock: { ticker: normalized, action: "DATA UNAVAILABLE" } });
    renderMarketChart(null);
    renderTrade({});
    renderEvents({});
    dom.tradeEyeEmpty.hidden = true;
    setError(error instanceof Error ? error.message : "Snapshot unavailable");
    scheduleSnapshotRetry();
  }
}

function isWebullObservation(snapshot) {
  const observation = snapshot?.market_observation || {};
  const source = snapshot?.market_chart?.source || {};
  return observation.source === "webull_market_data"
    || source.name === "Webull OpenAPI"
    || source.name === "webull_openapi";
}

function isWebullManifest(manifest = state.manifest) {
  return String(manifest?.source?.kind || "").toLowerCase() === "webull_market_data"
    || String(manifest?.source?.provider || "").toLowerCase() === "webull_openapi";
}

async function requestLocalMarketRefresh(ticker) {
  if (!isWebullManifest() || state.marketControlAvailable === false) return false;
  let response;
  try {
    response = await fetch("/api/market/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ ticker: String(ticker || state.ticker || "").toUpperCase() }),
    });
  } catch {
    // Static/public ApexView has no private control route. Keep its normal
    // snapshot refresh behavior without turning a missing route into an error.
    state.marketControlAvailable = null;
    return false;
  }
  if (response.status === 404 || response.status === 405) {
    state.marketControlAvailable = false;
    return false;
  }
  if (response.status === 429) {
    state.marketControlAvailable = true;
    state.lastMarketRefresh = await response.json().catch(() => ({ status: "rate_limited" }));
    return false;
  }
  if (!response.ok) {
    state.marketControlAvailable = true;
    throw new Error(`Market refresh failed (${response.status})`);
  }
  state.marketControlAvailable = true;
  state.lastMarketRefresh = await response.json();
  return state.lastMarketRefresh?.status === "ready";
}

async function refreshCurrentView({ showLoading = true } = {}) {
  const current = state.ticker;
  try {
    await loadManifest(current);
    await loadPaperStatus();
    await requestLocalMarketRefresh(current);
    if (state.marketControlAvailable === true) await loadManifest(current);
    await loadTicker(state.ticker, { showLoading });
  } catch (error) {
    setError(error instanceof Error ? error.message : "Snapshot refresh failed");
  }
}

function adjustZoom(delta) {
  if (!camera || !controls) return;
  const direction = camera.position.clone().sub(controls.target).normalize();
  camera.position.addScaledVector(direction, delta);
  const distance = camera.position.distanceTo(controls.target);
  if (distance < controls.minDistance || distance > controls.maxDistance) camera.position.sub(direction.multiplyScalar(delta));
}

function bindUi() {
  dom.tickerSelect.addEventListener("change", () => loadTicker(dom.tickerSelect.value));
  dom.startPaperCycle?.addEventListener("click", () => { startPaperCycle(); });
  $("#refresh-button").addEventListener("click", async () => {
    const button = $("#refresh-button");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try { await refreshCurrentView({ showLoading: true }); }
    finally { button.disabled = false; button.removeAttribute("aria-busy"); }
  });
  $("#retry-button").addEventListener("click", () => loadTicker(state.ticker));
  $("#clear-selection").addEventListener("click", clearSelection);
  dom.closeTagExplanation?.addEventListener("click", closeTagExplanation);
  dom.closeTagExplanationFooter?.addEventListener("click", closeTagExplanation);
  dom.tagExplanation?.querySelector("[data-close-tag-explanation]")?.addEventListener("click", closeTagExplanation);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTagExplanation();
  });
  $("#reset-camera").addEventListener("click", () => controls?.reset());
  $("#zoom-in").addEventListener("click", () => adjustZoom(-1.5));
  $("#zoom-out").addEventListener("click", () => adjustZoom(1.5));
  $("#timeline-previous").addEventListener("click", () => {
    stopTimelinePlayback();
    setTimelineIndex(state.timelineIndex - 1);
  });
  $("#timeline-next").addEventListener("click", () => {
    stopTimelinePlayback();
    setTimelineIndex(state.timelineIndex + 1);
  });
  dom.timelinePlay.addEventListener("click", toggleTimelinePlayback);
  document.querySelectorAll("[data-chart-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartRange = button.dataset.chartRange;
      renderMarketChart(state.snapshot);
    });
  });
  document.querySelectorAll("button[data-workspace-view]").forEach((button) => {
    button.addEventListener("click", () => setWorkspaceView(button.dataset.workspaceView));
  });
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => setWorkspaceView(button.dataset.openView));
  });
  $("#help-button").addEventListener("click", () => $("#workspace-help").showModal());
  $("#motion-toggle").addEventListener("click", () => {
    state.motionPaused = !state.motionPaused;
    updateMotionControl();
  });
  updateMotionControl();
  dom.marketChart.addEventListener("pointermove", (event) => {
    const points = selectedChartPoints();
    if (!points.length) return;
    const rect = dom.marketChart.getBoundingClientRect();
    const left = 14;
    const right = 58;
    const usable = Math.max(1, rect.width - left - right);
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - left) / usable));
    state.chartHoverIndex = Math.round(ratio * (points.length - 1));
    const point = points[state.chartHoverIndex];
    dom.chartTooltip.hidden = false;
    dom.chartTooltip.innerHTML = `
      <strong>${escapeHtml(formatShortDate(point.ts))}</strong><br>
      O ${escapeHtml(formatPrice(point.open))} · H ${escapeHtml(formatPrice(point.high))}<br>
      L ${escapeHtml(formatPrice(point.low))} · C ${escapeHtml(formatPrice(point.close))}<br>
      VOL ${escapeHtml(formatCompactNumber(point.volume, 1))}
    `;
    const tooltipWidth = 148;
    const leftPosition = Math.max(6, Math.min(rect.width - tooltipWidth - 6, event.clientX - rect.left + 12));
    const topPosition = Math.max(6, Math.min(rect.height - 76, event.clientY - rect.top - 34));
    dom.chartTooltip.style.left = `${leftPosition}px`;
    dom.chartTooltip.style.top = `${topPosition}px`;
    drawMarketChart();
  });
  dom.marketChart.addEventListener("pointerleave", () => {
    state.chartHoverIndex = -1;
    dom.chartTooltip.hidden = true;
    drawMarketChart();
  });
  $("#fullscreen-button").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        setWorkspaceView("galaxy");
        await dom.stage.requestFullscreen?.();
      } else await document.exitFullscreen?.();
    } catch { /* Browser policy can decline fullscreen; the workspace remains usable. */ }
  });
  setInterval(() => {
    dom.clock.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
  }, 1000);
  state.snapshotRefreshTimer = window.setInterval(() => {
    if (document.hidden || !isWebullObservation(state.snapshot)) return;
    refreshCurrentView({ showLoading: false });
  }, SNAPSHOT_REFRESH_INTERVAL_MS);
  const chartObserver = new ResizeObserver(() => drawMarketChart());
  chartObserver.observe(dom.chartWrap);
}

async function boot() {
  createIcons({ icons: APP_ICONS });
  initScene();
  bindUi();
  restorePaperCycle();
  await loadManifest();
  await loadPaperStatus();
  await loadPaperTransportSession();
  await loadTicker(state.ticker);
}

boot().catch((error) => setError(error instanceof Error ? error.message : "ApexView failed to start"));
