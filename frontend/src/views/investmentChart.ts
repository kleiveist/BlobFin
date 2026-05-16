import type { AssetProjection, AssetProjectionPoint } from "../types";

const chartColors = {
  background: "#17191c",
  muted: "#9ca3af",
  grid: "#2a2d31",
  grey: "#777b82",
  green: "#43b20a",
  purple: "#9b94ff",
  red: "#ff5b63"
};

interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ChartScale {
  slotWidth: number;
  barWidth: number;
}

interface BarSegment {
  height: number;
  color: string;
  overlay?: boolean;
}

interface BarHitArea {
  point: AssetProjectionPoint;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface ChartInteraction {
  areas: BarHitArea[];
  onSelect?: InvestmentChartSelectHandler;
}

export interface InvestmentChartSelection {
  point: AssetProjectionPoint;
  clientX: number;
  clientY: number;
}

export type InvestmentChartSelectHandler = (selection: InvestmentChartSelection) => void;

const chartInteractions = new WeakMap<HTMLCanvasElement, ChartInteraction>();
const interactiveCanvases = new WeakSet<HTMLCanvasElement>();

export function drawInvestmentChart(
  canvas: HTMLCanvasElement | null,
  projection: AssetProjection,
  onSelect?: InvestmentChartSelectHandler
): void {
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || canvas.clientWidth || 320);
  const height = Math.max(360, rect.height || canvas.clientHeight || 480);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = chartColors.background;
  context.fillRect(0, 0, width, height);

  const padding = { top: 34, right: 30, bottom: 56, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const baseY = padding.top + chartHeight;
  const maxValue = Math.max(
    1,
    ...projection.points.map((point) => Math.max(point.netBalance, point.realNetBalance, point.grossBalance))
  );

  drawGrid(context, padding, chartWidth, chartHeight);
  const areas = drawBars(context, projection.points, padding, chartWidth, chartHeight, baseY, maxValue);
  drawDashedLine(context, projection.points, padding, chartWidth, chartHeight, maxValue);
  drawAxisLabels(context, projection, padding, chartWidth, chartHeight, baseY);
  chartInteractions.set(canvas, { areas, onSelect });
  ensureChartInteraction(canvas);
}

function makeChartScale(pointsLength: number, chartWidth: number): ChartScale {
  const slotWidth = chartWidth / Math.max(1, pointsLength);
  return {
    slotWidth,
    barWidth: Math.max(3, Math.min(16, slotWidth * 0.72))
  };
}

function xForIndex(index: number, padding: ChartPadding, scale: ChartScale): number {
  return padding.left + scale.slotWidth * (index + 0.5);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  padding: ChartPadding,
  chartWidth: number,
  chartHeight: number
): void {
  context.save();
  context.strokeStyle = chartColors.grid;
  context.lineWidth = 1;
  context.globalAlpha = 0.45;

  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (chartHeight / 4) * index;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + chartWidth, y);
    context.stroke();
  }

  context.restore();
}

function drawBars(
  context: CanvasRenderingContext2D,
  points: AssetProjectionPoint[],
  padding: ChartPadding,
  chartWidth: number,
  chartHeight: number,
  baseY: number,
  maxValue: number
): BarHitArea[] {
  const scale = makeChartScale(points.length, chartWidth);
  const areas: BarHitArea[] = [];

  points.forEach((point, index) => {
    const x = xForIndex(index, padding, scale);
    const barX = x - scale.barWidth / 2;
    const barHeight = valueToHeight(point.netBalance, padding, chartHeight, maxValue, baseY);
    if (barHeight > 0) {
      areas.push({
        point,
        left: barX - 5,
        right: barX + scale.barWidth + 5,
        top: baseY - barHeight,
        bottom: baseY
      });
    }
    if (point.phase === "saving") {
      drawSavingBar(context, point, barX, scale.barWidth, padding, chartHeight, baseY, maxValue);
      return;
    }

    drawPayoutBar(context, point, barX, scale.barWidth, padding, chartHeight, baseY, maxValue);
  });

  return areas;
}

function ensureChartInteraction(canvas: HTMLCanvasElement): void {
  if (interactiveCanvases.has(canvas)) return;
  interactiveCanvases.add(canvas);
  canvas.addEventListener("click", handleChartClick);
  canvas.addEventListener("pointermove", handleChartPointerMove);
  canvas.addEventListener("pointerleave", () => {
    canvas.style.cursor = "";
  });
}

function handleChartClick(event: MouseEvent): void {
  const canvas = event.currentTarget;
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const interaction = chartInteractions.get(canvas);
  if (!interaction?.onSelect) return;
  const point = pointFromPointerEvent(canvas, event, interaction.areas);
  if (!point) return;
  interaction.onSelect({ point, clientX: event.clientX, clientY: event.clientY });
}

function handleChartPointerMove(event: PointerEvent): void {
  const canvas = event.currentTarget;
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const interaction = chartInteractions.get(canvas);
  canvas.style.cursor = interaction && pointFromPointerEvent(canvas, event, interaction.areas) ? "pointer" : "";
}

function pointFromPointerEvent(
  canvas: HTMLCanvasElement,
  event: MouseEvent | PointerEvent,
  areas: BarHitArea[]
): AssetProjectionPoint | null {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = areas.find((area) => x >= area.left && x <= area.right && y >= area.top && y <= area.bottom);
  return hit?.point ?? null;
}

function drawSavingBar(
  context: CanvasRenderingContext2D,
  point: AssetProjectionPoint,
  x: number,
  width: number,
  padding: ChartPadding,
  chartHeight: number,
  baseY: number,
  maxValue: number
): void {
  drawBalanceCompositionBar(context, point, x, width, padding, chartHeight, baseY, maxValue);
}

function drawPayoutBar(
  context: CanvasRenderingContext2D,
  point: AssetProjectionPoint,
  x: number,
  width: number,
  padding: ChartPadding,
  chartHeight: number,
  baseY: number,
  maxValue: number
): void {
  drawBalanceCompositionBar(context, point, x, width, padding, chartHeight, baseY, maxValue, true);
}

function drawBalanceCompositionBar(
  context: CanvasRenderingContext2D,
  point: AssetProjectionPoint,
  x: number,
  width: number,
  padding: ChartPadding,
  chartHeight: number,
  baseY: number,
  maxValue: number,
  showPayoutBalance = false
): void {
  const radius = Math.min(6, width / 2);
  const netBalance = Math.max(0, point.netBalance);
  const costBasis = Math.min(netBalance, Math.max(0, point.costBasis));
  const growth = Math.max(0, netBalance - costBasis);
  const tax = Math.min(growth, Math.max(0, point.periodTax));
  const netGrowth = Math.max(0, growth - tax);
  const segments: BarSegment[] = showPayoutBalance
    ? [
        { height: valueToHeight(costBasis, padding, chartHeight, maxValue, baseY), color: chartColors.purple },
        { height: valueToHeight(costBasis, padding, chartHeight, maxValue, baseY), color: chartColors.grey, overlay: true },
        { height: valueToHeight(netGrowth, padding, chartHeight, maxValue, baseY), color: chartColors.green },
        { height: valueToHeight(tax, padding, chartHeight, maxValue, baseY), color: chartColors.red }
      ].filter((segment) => segment.height > 0)
    : [
        { height: valueToHeight(costBasis, padding, chartHeight, maxValue, baseY), color: chartColors.grey },
        { height: valueToHeight(netGrowth, padding, chartHeight, maxValue, baseY), color: chartColors.green },
        { height: valueToHeight(tax, padding, chartHeight, maxValue, baseY), color: chartColors.red }
      ].filter((segment) => segment.height > 0);

  if (!segments.length) return;

  let stackedHeight = 0;
  segments.forEach((segment, index) => {
    if (segment.overlay) {
      drawOverlaySegment(context, x, baseY - segment.height, width, segment.height, segment.color);
      return;
    }
    stackedHeight += segment.height;
    const y = baseY - stackedHeight;
    const isTopSegment = index === segments.length - 1;
    if (isTopSegment) {
      roundedTopBar(context, x, y, width, segment.height, radius, segment.color);
      return;
    }
    filledBarSegment(context, x, y, width, segment.height, segment.color);
  });
}

function drawOverlaySegment(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  if (height <= 0) return;

  context.save();
  context.fillStyle = color;
  context.globalAlpha = 0.55;
  context.fillRect(x + width * 0.18, y, width * 0.64, height);
  context.restore();
}

function valueToHeight(
  value: number,
  padding: ChartPadding,
  chartHeight: number,
  maxValue: number,
  baseY: number
): number {
  if (value <= 0) return 0;
  return baseY - valueToY(value, padding, chartHeight, maxValue);
}

function drawDashedLine(
  context: CanvasRenderingContext2D,
  points: AssetProjectionPoint[],
  padding: ChartPadding,
  chartWidth: number,
  chartHeight: number,
  maxValue: number
): void {
  const scale = makeChartScale(points.length, chartWidth);

  context.save();
  context.strokeStyle = chartColors.red;
  context.lineWidth = 2;
  context.setLineDash([8, 8]);
  context.beginPath();

  points.forEach((point, index) => {
    const x = xForIndex(index, padding, scale);
    const y = valueToY(point.normalDepot, padding, chartHeight, maxValue);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();
  context.setLineDash([]);
  context.restore();
}

function drawAxisLabels(
  context: CanvasRenderingContext2D,
  projection: AssetProjection,
  padding: ChartPadding,
  chartWidth: number,
  chartHeight: number,
  baseY: number
): void {
  const points = projection.points;
  const scale = makeChartScale(points.length, chartWidth);
  const startAge = points[0]?.age ?? projection.ageToday;
  const endAge = points[points.length - 1]?.age ?? projection.endAge;
  const retirementIndex = points.findIndex((point) => point.age === projection.retirementAge);
  const retirementX = xForIndex(Math.max(0, retirementIndex), padding, scale);
  const startX = xForIndex(0, padding, scale);
  const endX = xForIndex(Math.max(0, points.length - 1), padding, scale);

  context.save();
  context.fillStyle = chartColors.muted;
  context.font = "16px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(String(startAge), startX, baseY + 28);
  context.fillText(String(endAge), endX, baseY + 28);
  context.textAlign = "center";
  context.font = "18px system-ui, sans-serif";
  context.fillText("Alter", padding.left + chartWidth / 2, baseY + 52);

  if (retirementIndex >= 0) {
    context.strokeStyle = "#0c0d0e";
    context.lineWidth = 2;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(retirementX, padding.top);
    context.lineTo(retirementX, padding.top + chartHeight);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = chartColors.purple;
    context.font = "20px system-ui, sans-serif";
    context.fillText(`${projection.retirementAge} (Rente)`, retirementX + 10, baseY + 28);
  }

  context.restore();
}

function filledBarSegment(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  if (height <= 0) return;

  context.save();
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
  context.restore();
}

function roundedTopBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
): void {
  if (height <= 0) return;

  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  context.restore();
}

function valueToY(value: number, padding: ChartPadding, chartHeight: number, maxValue: number): number {
  return padding.top + chartHeight - (value / maxValue) * chartHeight * 0.94;
}
