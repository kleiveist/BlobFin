import type { AssetProjection, AssetProjectionPoint } from "../types";

const chartColors = {
  background: "#17191c",
  muted: "#9ca3af",
  grid: "#2a2d31",
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

export function drawInvestmentChart(canvas: HTMLCanvasElement | null, projection: AssetProjection): void {
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
  drawBars(context, projection.points, padding, chartWidth, chartHeight, baseY, maxValue);
  drawDashedLine(context, projection.points, padding, chartWidth, chartHeight, maxValue);
  drawAxisLabels(context, projection, padding, chartWidth, chartHeight, baseY);
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
): void {
  const scale = makeChartScale(points.length, chartWidth);

  points.forEach((point, index) => {
    const x = xForIndex(index, padding, scale);
    const y = valueToY(point.netBalance, padding, chartHeight, maxValue);
    const height = baseY - y;
    const radius = Math.min(6, scale.barWidth / 2);
    const color = point.phase === "saving" ? chartColors.green : chartColors.purple;
    roundedBar(context, x - scale.barWidth / 2, baseY - height, scale.barWidth, height, radius, color);
  });
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

function roundedBar(
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
