import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { ALKAMI_A_COLORS, ALKAMI_A_PIXELS } from "@/lib/alkamiMark";
import { displayName } from "@/lib/names";
import { fetchLeaderboard, placeOnBoard, recordRunnerScore, type ScoreEntry } from "@/lib/runnerScores";

// An easter egg: a 20px pixel critter idles in the library's bottom-left
// corner. Click it and the page fades behind a veil while the critter hops to
// the middle of the screen and starts running: jump the crates, grab the
// Alkami A coins. Space, up arrow, click or tap jumps; Esc leaves. Each
// member's best run is saved to Supabase, and an arcade-style high-score
// table (top 5) shows before each run and after it ends, with a compact copy
// in the corner during the run where the player's row climbs as they score.

// Sprites are character grids, one character per pixel; "." is empty.
// The critter is the MANTL mark come to life: the blue tile (B) with its
// white M (W), the light sparkle (*) up top as an antenna, two eyes (K)
// peeking over the M, and feet (D).
const CRITTER_TOP = [
  ".BBBBBBBBB*.",
  "BBBBBBBBB***",
  "BBWBBBBBBW*B",
  "BBWWKBBKWWBB",
  "BBWBWBBWBWBB",
  "BBWBBWWBBWBB",
  "BBWBBBBBBWBB",
  ".BBBBBBBBBB.",
];
const CRITTER_FRAMES = {
  stand: [...CRITTER_TOP, "...D....D...", "..DD....DD.."],
  stride: [...CRITTER_TOP, "....D..D....", "....DD.DD..."],
  jump: [...CRITTER_TOP, "..DD....DD..", "............"],
};
// C edge, c fill, x brace.
const CRATE = ["CCCCCCCC", "CccccccC", "CxccccxC", "CcxccxcC", "CccxxccC", "CcxccxcC", "CxccccxC", "CCCCCCCC"];

const CRITTER_W = 12;
const CRITTER_H = 10;
const IDLE_SCALE = 2; // 20px tall in the corner
const GAME_SCALE = 4;
const CRATE_SCALE = 4;
const COIN_SCALE = 2;
const GRAVITY = 2600;
const JUMP_VELOCITY = 880;
const START_SPEED = 340;
const INTRO_MS = 900;
const BEST_KEY = "alkami:runner:best";

// Console tokens, read from the page so the game matches the app.
function token(name: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  return value ? `hsl(${value})` : "#000";
}

function drawSprite(ctx: CanvasRenderingContext2D, rows: string[], colors: Record<string, string>, x: number, y: number, scale: number) {
  rows.forEach((row, ry) => {
    [...row].forEach((cell, rx) => {
      const fill = colors[cell];
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x + rx * scale), Math.round(y + ry * scale), scale, scale);
    });
  });
}

function readBest() {
  try { return Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest(value: number) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage unavailable */ }
}

type Obstacle = { x: number; stack: number };
type Coin = { x: number; y: number; phase: number };
type Spark = { x: number; y: number; age: number };

export function PixelRunner() {
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const startRect = useRef<DOMRect | null>(null);

  const open = () => {
    startRect.current = buttonRef.current?.getBoundingClientRect() ?? null;
    setPlaying(true);
    requestAnimationFrame(() => setVisible(true));
  };

  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => setPlaying(false), 250);
  }, []);

  return (
    <>
      {playing ? null : (
        <button ref={buttonRef} type="button" onClick={open} className="pixel-critter-idle fixed bottom-4 left-4 z-40 rounded-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2" aria-label="A small pixel creature. Click it to play a game." title="Psst">
          <CritterIcon />
        </button>
      )}
      {playing ? <RunnerGame visible={visible} startRect={startRect.current} onClose={close} /> : null}
    </>
  );
}

function CritterIcon() {
  const colors: Record<string, string> = { B: "hsl(var(--color-marine-6))", D: "hsl(var(--color-marine-8))", W: "#ffffff", K: "hsl(var(--color-abyss-9))", "*": "hsl(var(--color-marine-2))" };
  const rects = CRITTER_FRAMES.stand.flatMap((row, y) => [...row].flatMap((cell, x) => (colors[cell] ? [{ x, y, fill: colors[cell] }] : [])));
  return (
    <svg viewBox={`0 0 ${CRITTER_W} ${CRITTER_H}`} width={CRITTER_W * IDLE_SCALE} height={CRITTER_H * IDLE_SCALE} shapeRendering="crispEdges" aria-hidden className="block">
      {rects.map(({ x, y, fill }) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />)}
    </svg>
  );
}

function RunnerGame({ visible, startRect, onClose }: { visible: boolean; startRect: DOMRect | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jumpRef = useRef<() => void>(() => {});
  const { user, profile } = useAuth();
  const userId = user?.id;
  const myName = displayName(profile?.name ?? user?.email ?? "You");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const palette = {
      critter: { B: token("marine-6"), D: token("marine-8"), W: "#ffffff", K: token("abyss-9"), "*": token("marine-2") } as Record<string, string>,
      crate: { C: token("carbon-7"), c: token("carbon-2"), x: token("carbon-5") } as Record<string, string>,
      ground: token("carbon-4"),
      groundDash: token("carbon-3"),
      ink: token("marine-8"),
      muted: token("carbon-8"),
      spark: ALKAMI_A_COLORS.h,
    };

    let width = 0;
    let height = 0;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener("resize", resize);

    const critterW = CRITTER_W * GAME_SCALE;
    const critterH = CRITTER_H * GAME_SCALE;
    const crateSize = CRATE.length * CRATE_SCALE;
    const coinSize = ALKAMI_A_PIXELS.length * COIN_SCALE;
    const groundY = () => Math.round(height * 0.62);
    const critterX = () => Math.round(width / 2 - critterW / 2);

    // intro: hopping in. ready: waiting on the high-score table for the first
    // jump. playing, then over: the table again, with this run on it.
    let state: "intro" | "ready" | "playing" | "over" = "intro";
    let started = performance.now();
    let y = 0; // critter's feet, as a distance above the ground
    let vy = 0;
    let speed = START_SPEED;
    let distance = 0;
    let score = 0;
    let best = readBest();
    // The high-score table: Supabase's top 5, with this player's best on it.
    // Until it loads (or without Supabase) it holds just this browser's best.
    const me = userId ?? "you";
    const mineOnBoard = (rows: ScoreEntry[]) => (best > 0 ? placeOnBoard(rows, { id: me, name: myName, score: best }) : rows);
    let board: ScoreEntry[] = mineOnBoard([]);
    let newHigh = false;
    let active = true;
    void fetchLeaderboard().then((rows) => {
      if (!active || !rows) return;
      const remoteBest = rows.find((row) => row.id === me)?.score ?? 0;
      if (remoteBest > best) { best = remoteBest; saveBest(best); }
      board = mineOnBoard(rows);
    });
    let obstacles: Obstacle[] = [];
    let coins: Coin[] = [];
    let sparks: Spark[] = [];
    let nextObstacle = 600;
    let nextCoin = 260;
    let playTime = 0;

    const reset = () => {
      state = "playing";
      y = 0; vy = 0; speed = START_SPEED; distance = 0; score = 0; playTime = 0;
      obstacles = []; coins = []; sparks = [];
      nextObstacle = 600; nextCoin = 260; newHigh = false;
      announce();
    };

    jumpRef.current = () => {
      if (state === "over" || state === "ready") { reset(); return; }
      if (state === "playing" && y === 0) vy = JUMP_VELOCITY;
    };

    const random = (min: number, max: number) => min + Math.random() * (max - min);
    // Keeps the canvas's accessible label in step with the score.
    const announce = () => canvas.setAttribute("aria-label", `Pixel runner. ${state === "over" ? "Game over. " : ""}Score ${score}, best ${best}.`);

    const update = (dt: number) => {
      if (state !== "playing") return;
      playTime += dt;
      speed += 9 * dt;
      const dx = speed * dt;
      distance += dx;

      vy -= GRAVITY * dt;
      y = Math.max(0, y + vy * dt);
      if (y === 0) vy = 0;

      nextObstacle -= dx;
      if (nextObstacle <= 0) {
        obstacles.push({ x: width + 20, stack: score >= 6 && Math.random() < 0.35 ? 2 : 1 });
        nextObstacle = random(380, 760) + speed * 0.45;
      }
      nextCoin -= dx;
      if (nextCoin <= 0) {
        coins.push({ x: width + 20, y: random(50, 140), phase: Math.random() * Math.PI * 2 });
        nextCoin = random(260, 560);
      }
      obstacles.forEach((item) => { item.x -= dx; });
      coins.forEach((item) => { item.x -= dx; item.phase += dt * 5; });
      sparks.forEach((item) => { item.age += dt; });
      obstacles = obstacles.filter((item) => item.x > -crateSize - 20);
      coins = coins.filter((item) => item.x > -coinSize - 20);
      sparks = sparks.filter((item) => item.age < 0.4);

      // Hit boxes are a little smaller than the sprites, so near misses feel fair.
      const left = critterX() + 6;
      const right = critterX() + critterW - 6;
      const bottom = y;
      const top = y + critterH - 6;
      for (const item of obstacles) {
        const crateTop = crateSize * item.stack - 4;
        if (right > item.x + 4 && left < item.x + crateSize - 4 && bottom < crateTop) {
          state = "over";
          if (score > best) { best = score; saveBest(best); }
          if (score > 0) {
            void recordRunnerScore(score);
            newHigh = score > (board[0]?.score ?? 0);
            board = placeOnBoard(board, { id: me, name: myName, score });
          }
          announce();
          return;
        }
      }
      coins = coins.filter((item) => {
        const coinBottom = item.y + Math.sin(item.phase) * 6;
        const hit = right > item.x + 4 && left < item.x + coinSize - 4 && top > coinBottom + 4 && bottom < coinBottom + coinSize - 4;
        if (hit) { score += 1; sparks.push({ x: item.x + coinSize / 2, y: coinBottom + coinSize / 2, age: 0 }); announce(); }
        return !hit;
      });
    };

    const text = (value: string, x: number, yPos: number, size: number, color: string, align: CanvasTextAlign = "center") => {
      ctx.font = `${size}px Silkscreen, "Fira Mono", monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(value, x, yPos);
    };

    // During the run: a compact table in the top-left corner, with this run
    // placed live so the player can see who they are about to pass.
    const drawMiniBoard = () => {
      const rows = score > 0 ? placeOnBoard(board, { id: me, name: myName, score }) : board;
      const rowH = 18;
      const panelW = 220;
      const panelH = 34 + Math.max(rows.length, 1) * rowH + 6;
      const left = 20;
      const topY = 20;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(left - 3, topY - 3, panelW + 6, panelH + 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(left, topY, panelW, panelH);
      text("High scores", left + panelW / 2, topY + 20, 12, palette.ink);
      if (!rows.length) text("Be the first!", left + panelW / 2, topY + 44, 10, palette.muted);
      rows.forEach((row, index) => {
        const color = row.id === me ? ALKAMI_A_COLORS.k : palette.ink;
        const name = displayName(row.name);
        const rowY = topY + 42 + index * rowH;
        text(String(index + 1), left + 12, rowY, 10, color, "left");
        text(name.length > 14 ? `${name.slice(0, 13)}…` : name, left + 32, rowY, 10, color, "left");
        text(String(row.id === me ? Math.max(row.score, score) : row.score), left + panelW - 12, rowY, 10, color, "right");
      });
    };

    // The arcade high-score table, drawn as a white pixel panel whose bottom
    // sits just above the critter's head.
    const ranks = ["1st", "2nd", "3rd", "4th", "5th"];
    const drawBoard = (ground: number) => {
      const rowH = 24;
      const titled = state === "over";
      const lines = Math.max(board.length, 1);
      const panelW = Math.min(380, width - 32);
      const panelH = 48 + (titled && newHigh ? 24 : 0) + lines * rowH + 12;
      const left = Math.round(width / 2 - panelW / 2);
      const topY = ground - critterH - 24 - panelH;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(left - 4, topY - 4, panelW + 8, panelH + 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(left, topY, panelW, panelH);
      text(titled ? "Game over" : "High scores", width / 2, topY + 30, 18, palette.ink);
      let rowY = topY + 60;
      if (titled && newHigh) { text("New high score!", width / 2, rowY - 4, 12, ALKAMI_A_COLORS.k); rowY += 24; }
      if (!board.length) text("No scores yet. Be the first!", width / 2, rowY, 12, palette.muted);
      board.forEach((row, index) => {
        const color = row.id === me ? ALKAMI_A_COLORS.k : palette.ink;
        const name = displayName(row.name);
        text(ranks[index] ?? "", left + 20, rowY + index * rowH, 14, color, "left");
        text(name.length > 16 ? `${name.slice(0, 15)}…` : name, left + 76, rowY + index * rowH, 14, color, "left");
        text(String(row.score), left + panelW - 20, rowY + index * rowH, 14, color, "right");
      });
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const ground = groundY();

      // Ground: a solid line with dashes that scroll by at running speed.
      ctx.fillStyle = palette.ground;
      ctx.fillRect(0, ground, width, 4);
      ctx.fillStyle = palette.groundDash;
      const offset = distance % 32;
      for (let x = -offset; x < width; x += 32) ctx.fillRect(Math.round(x), ground + 12, 12, 4);

      coins.forEach((item) => drawSprite(ctx, ALKAMI_A_PIXELS, ALKAMI_A_COLORS, item.x, ground - item.y - coinSize - Math.sin(item.phase) * 6, COIN_SCALE));
      sparks.forEach((item) => {
        const spread = 8 + item.age * 60;
        ctx.fillStyle = palette.spark;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => ctx.fillRect(Math.round(item.x + sx * spread), Math.round(ground - item.y + sy * spread), 4, 4));
      });
      obstacles.forEach((item) => {
        for (let level = 0; level < item.stack; level += 1) drawSprite(ctx, CRATE, palette.crate, item.x, ground - crateSize * (level + 1), CRATE_SCALE);
      });

      // The critter: hops in from its corner during the intro, then runs.
      if (state === "intro") {
        const t = Math.min(1, (now - started) / INTRO_MS);
        const ease = 1 - (1 - t) * (1 - t);
        const fromX = startRect?.left ?? 16;
        const fromY = (startRect?.bottom ?? height - 16);
        const toX = critterX();
        const toY = ground;
        const scale = IDLE_SCALE + (GAME_SCALE - IDLE_SCALE) * ease;
        const x = fromX + (toX - fromX) * ease;
        const feet = fromY + (toY - fromY) * ease - Math.sin(t * Math.PI) * 120;
        drawSprite(ctx, CRITTER_FRAMES.jump, palette.critter, x, feet - CRITTER_H * scale, Math.max(1, Math.round(scale)));
        if (t >= 1) { state = "ready"; }
      } else {
        const frame = state === "over" ? CRITTER_FRAMES.stand : y > 0 ? CRITTER_FRAMES.jump : Math.floor(distance / 40) % 2 ? CRITTER_FRAMES.stride : CRITTER_FRAMES.stand;
        drawSprite(ctx, frame, palette.critter, critterX(), ground - y - critterH, GAME_SCALE);
      }

      // The arcade top bar: this run's score (with the A coin) and the high
      // score to beat.
      const barY = ground - 300;
      const highScore = Math.max(board[0]?.score ?? 0, score);
      text("Score", width / 2 - 140, barY - 30, 12, palette.muted);
      drawSprite(ctx, ALKAMI_A_PIXELS, ALKAMI_A_COLORS, width / 2 - 140 - 44, barY - 22, COIN_SCALE);
      text(String(score), width / 2 - 140 + 16, barY + 2, 24, palette.ink);
      text("High score", width / 2 + 140, barY - 30, 12, palette.muted);
      text(String(highScore), width / 2 + 140, barY + 2, 24, palette.ink);

      if (state === "ready" || state === "over") drawBoard(ground);
      if (state === "playing") drawMiniBoard();
      if (state === "ready") text("Space or tap to start", width / 2, ground + 56, 14, palette.muted);
      if (state === "playing" && playTime < 2.5) text("Space or tap to jump", width / 2, ground + 56, 14, palette.muted);
      if (state === "over") text("Space or tap to try again · Esc to leave", width / 2, ground + 56, 14, palette.muted);
    };

    let frameId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw(now);
      frameId = requestAnimationFrame(loop);
    };
    started = performance.now();
    frameId = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [startRect, userId, myName]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key === " " || event.key === "ArrowUp" || event.key === "w") {
        event.preventDefault();
        jumpRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-[60] bg-abyss-0/90 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} role="dialog" aria-modal="true" aria-label="Pixel runner game">
      <canvas ref={canvasRef} className="block h-full w-full cursor-pointer touch-none" role="img" aria-label="Pixel runner. Score 0." onPointerDown={(event) => { event.preventDefault(); jumpRef.current(); }} />
      <button type="button" onClick={onClose} className="pixel-notch absolute right-4 top-4 flex h-10 w-10 items-center justify-center bg-carbon-1 text-abyss-9 hover:bg-carbon-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2" aria-label="Leave the game"><X className="h-5 w-5" /></button>
    </div>
  );
}
