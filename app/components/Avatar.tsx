"use client";

import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Emoji } from "./Emoji";

// Obsah profilového obrázka: fotka z Google účtu, vlastná fotka z galérie, emotikona (Teams štýl)
// alebo pôvodná postavička (fallback). Vkladá sa dovnútra kruhu s gradientovým okrajom.
export default function AvatarContent({ fallback }: { fallback: React.ReactNode }) {
  const { avatarId, avatarPhoto, googlePhoto, theme } = useTheme();

  const photo = avatarId === "google" ? googlePhoto : avatarId === "photo" ? avatarPhoto : "";
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        draggable={false}
        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }

  if (avatarId.startsWith("emoji:")) {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: theme.card2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Emoji char={avatarId.slice(6)} size="72%" />
      </div>
    );
  }

  return <>{fallback}</>;
}