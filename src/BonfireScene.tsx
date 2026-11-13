import { useEffect, useRef } from 'react';
import './bonfire.css';

/** Animated light and flames share the artwork's coordinates, including when cropped. */
export function BonfireScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current!;
    const context = node.getContext('2d');
    if (!context) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, animation = 0, lastFrame = 0;
    const start = performance.now();
    const noise = (seed: number) => (Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1;
    const random = (seed: number) => Math.abs(noise(seed));

    function draw(milliseconds: number) {
      if (!context || !width || !height) return;
      const time = reducedMotion.matches ? 5 : (milliseconds - start) / 1000;
      const arrival = reducedMotion.matches ? 1 : Math.min(1, Math.max(0, (time - 0.35) / 2));
      context.clearRect(0, 0, width, height);
      const scale = Math.max(width / 1024, height / 1536);
      const offsetX = (width - 1024 * scale) / 2;
      const offsetY = (height - 1536 * scale) / 2;
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);
      const x = 430, y = 924;
      const flicker = 0.8 + 0.11 * Math.sin(time * 7.3) + 0.06 * Math.sin(time * 17.7);
      context.globalCompositeOperation = 'screen';
      function glow(cx: number, cy: number, radius: number, color: string) {
        const light = context!.createRadialGradient(cx, cy, 0, cx, cy, radius);
        light.addColorStop(0, color);
        light.addColorStop(1, 'rgba(255,100,15,0)');
        context!.fillStyle = light;
        context!.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }
      context.globalAlpha = arrival * flicker;
      glow(x, y - 30, 235, 'rgba(255,104,15,0.28)');
      glow(690, 760, 235, 'rgba(255,137,42,0.09)');
      glow(x, y + 35, 150, 'rgba(255,145,20,0.25)');

      // Curved, individually phased tongues keep a hot core and a restless edge.
      for (let index = 0; index < 18; index++) {
        const phase = index * 2.399;
        const root = x + (random(index + 2) - 0.5) * 140;
        const flameHeight = (65 + random(index + 80) * 145) * (0.84 + 0.16 * Math.sin(time * 5 + phase));
        const breadth = 13 + random(index + 50) * 24;
        const sway = Math.sin(time * (2.2 + random(index)) + phase) * 27;
        const top = y - flameHeight * arrival;
        const color = context.createLinearGradient(root, y + 12, root, top);
        color.addColorStop(0, 'rgba(255,241,158,0.9)');
        color.addColorStop(0.25, 'rgba(255,182,34,0.75)');
        color.addColorStop(0.65, 'rgba(237,72,7,0.4)');
        color.addColorStop(1, 'rgba(199,35,3,0)');
        context.fillStyle = color;
        context.globalAlpha = arrival * (0.45 + random(index + 30) * 0.3);
        context.beginPath();
        context.moveTo(root - breadth, y + 8);
        context.bezierCurveTo(root - breadth * 1.3, y - flameHeight * 0.36, root + sway - breadth, top + 35, root + sway, top);
        context.bezierCurveTo(root + sway + breadth * 0.15, top + 45, root + breadth * 0.8, y - flameHeight * 0.25, root + breadth, y + 8);
        context.closePath();
        context.fill();
      }
      context.globalAlpha = arrival * flicker;
      glow(x, y - 15, 65, 'rgba(255,219,106,0.5)');
      for (let index = 0; index < 52; index++) {
        const age = (time * (0.1 + random(index + 90) * 0.16) + random(index + 10)) % 1;
        const drift = (random(index + 20) - 0.5) * 170 + Math.sin(time * 1.3 + index) * age * 35;
        const px = x + drift + age * 60;
        const py = y - age * (200 + random(index + 70) * 400);
        context.globalAlpha = arrival * Math.sin(age * Math.PI) * (0.3 + random(index) * 0.65);
        context.fillStyle = index % 4 === 0 ? '#ffe6a2' : '#fb8c32';
        context.beginPath();
        context.ellipse(px, py, 0.8 + random(index + 100) * 1.5, 1.5 + random(index + 120) * 2, -0.3, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
    function tick(time: number) {
      if (!document.hidden && time - lastFrame >= 32) { draw(time); lastFrame = time; }
      animation = requestAnimationFrame(tick);
    }
    const observer = new ResizeObserver(() => {
      width = node.clientWidth; height = node.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      node.width = Math.round(width * ratio); node.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    });
    const animate = () => {
      cancelAnimationFrame(animation);
      draw(performance.now());
      if (!reducedMotion.matches) animation = requestAnimationFrame(tick);
    };
    observer.observe(node);
    reducedMotion.addEventListener('change', animate);
    animate();
    return () => { cancelAnimationFrame(animation); observer.disconnect(); reducedMotion.removeEventListener('change', animate); };
  }, []);

  return <div className="bonfire-visual" aria-hidden="true">
    <img className="bonfire-landscape" src={`${import.meta.env.BASE_URL}images/bonfire/sanctuary.webp`} alt="" />
    <canvas ref={canvas} className="bonfire-fire" />
    <div className="bonfire-vignette" />
  </div>;
}
