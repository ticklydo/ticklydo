"use client";

import React from "react";

// Emotikony v štýle Microsoft Teams (Fluent Emoji 3D) — rovnaký vzhľad na každom zariadení.
// Obrázky sa načítavajú z CDN; ak sa nenačítajú, zobrazí sa bežná systémová emotikona.
const BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/";

const MAP: Record<string, string> = {
  "👋": "Waving hand/Default/3D/waving_hand_3d_default.png",
  "🚀": "Rocket/3D/rocket_3d.png",
  "🎯": "Bullseye/3D/bullseye_3d.png",
  "📁": "File folder/3D/file_folder_3d.png",
  "✅": "Check mark button/3D/check_mark_button_3d.png",
  "🤖": "Robot/3D/robot_3d.png",
  "👥": "Busts in silhouette/3D/busts_in_silhouette_3d.png",
  "📋": "Clipboard/3D/clipboard_3d.png",
  "🔍": "Magnifying glass tilted left/3D/magnifying_glass_tilted_left_3d.png",
  "✨": "Sparkles/3D/sparkles_3d.png",
  "📧": "E-mail/3D/e-mail_3d.png",
  "🏷": "Label/3D/label_3d.png",
  "📝": "Memo/3D/memo_3d.png",
  "✏": "Pencil/3D/pencil_3d.png",
  "🎨": "Artist palette/3D/artist_palette_3d.png",
  "🛠": "Hammer and wrench/3D/hammer_and_wrench_3d.png",
  "⚠": "Warning/3D/warning_3d.png",
};

const KEYS = Object.keys(MAP).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const SPLIT = new RegExp(`(${KEYS.join("|")})️?`, "gu");

export function Emoji({ char, size }: { char: string; size?: number | string }) {
  const key = char.replace(/️/g, "");
  const path = MAP[key];
  if (!path) return <>{char}</>;
  const dim = size ?? "1.25em";
  return (
    <img
      src={BASE + encodeURI(path)}
      alt={char}
      draggable={false}
      loading="lazy"
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(char)); }}
      style={{ width: dim, height: dim, verticalAlign: "-0.28em", display: "inline-block", objectFit: "contain" }}
    />
  );
}

// Nahradí emotikony v texte obrázkami: <EmojiText>🚀 Vytvoriť projekt</EmojiText>
export function EmojiText({ children, size }: { children: React.ReactNode; size?: number | string }) {
  const parts = React.Children.toArray(children).flatMap((child, ci) => {
    if (typeof child !== "string") return [child];
    return child.split(SPLIT).map((p, i) =>
      MAP[p] ? <Emoji key={`${ci}-${i}`} char={p} size={size} /> : p
    );
  });
  return <>{parts}</>;
}

export default EmojiText;