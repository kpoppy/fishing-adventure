import { readFileSync } from "node:fs";

const html = readFileSync("./index.html", "utf-8");
const ids = [
  'data-testid="hud-wave"',
  'data-testid="hud-enemies"',
  'data-testid="hud-boss"',
  'data-testid="hud-time"',
  'data-testid="hud-best"',
  'data-testid="hud-kills"',
  'data-testid="hud-guardians"',
  'data-testid="hud-skill"',
  'data-testid="objective"'
];

ids.forEach((token) => {
  if (!html.includes(token)) {
    throw new Error(`missing token: ${token}`);
  }
});

if (!html.includes("phaser.min.js")) {
  throw new Error("Phaser CDN script tag is missing");
}

console.log("[smoke] static checks passed");
