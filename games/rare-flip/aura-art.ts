// Shared pixel halo for the shop and the playable Friend. The center stays clear.
export function drawRoyalAura(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, pixel: number, time = 0, reducedMotion = false) {
  ctx.save();
  const pulse = reducedMotion ? 0 : Math.sin(time / 1300) * .025;
  const outerX = rx * (1 + pulse), outerY = ry * (1 + pulse);
  const ring = (extra: number, thickness: number, color: string, alpha = 1) => {
    const ax = outerX + extra, ay = outerY + extra;
    ctx.fillStyle = color; ctx.globalAlpha = alpha;
    for (let py = -Math.ceil(ay / pixel) * pixel; py <= ay; py += pixel) {
      for (let px = -Math.ceil(ax / pixel) * pixel; px <= ax; px += pixel) {
        const nx = (px + pixel / 2) / ax, ny = (py + pixel / 2) / ay;
        const distance = Math.sqrt(nx * nx + ny * ny);
        if (distance <= 1 && distance >= 1 - thickness / Math.min(ax, ay)) {
          ctx.fillRect(Math.round(x + px), Math.round(y + py), pixel, pixel);
        }
      }
    }
  };
  ring(pixel * 3, pixel * 3, "#dd8aff", .10);
  ring(pixel * 1.5, pixel * 2.5, "#ffcd73", .20);
  ring(0, pixel * 1.6, "#c38445");
  ring(-pixel * .55, pixel * .85, "#ffe7a2");
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 3 + (reducedMotion ? 0 : time / 5500);
    const sx = Math.round((x + Math.cos(angle) * (outerX + pixel * 3)) / pixel) * pixel;
    const sy = Math.round((y + Math.sin(angle) * (outerY + pixel * 3)) / pixel) * pixel;
    ctx.fillStyle = "#d69355";
    ctx.fillRect(sx - pixel, sy - pixel * 2, pixel * 3, pixel * 5);
    ctx.fillRect(sx - pixel * 2, sy - pixel, pixel * 5, pixel * 3);
    ctx.fillStyle = "#fff0bb";
    ctx.fillRect(sx, sy - pixel * 2, pixel, pixel * 5);
    ctx.fillRect(sx - pixel * 2, sy, pixel * 5, pixel);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(sx, sy, pixel, pixel);
  }
  ctx.restore();
}
