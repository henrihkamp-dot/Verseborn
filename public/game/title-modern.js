(() => {
  // Modern title-screen presentation layer.
  // Keeps the existing save / game-mode logic, but replaces the old framed popup UI.
  const originalDrawTitleMenu = drawTitleMenu;
  const originalTitleMenuPointerTarget = titleMenuPointerTarget;
  const originalTitleMenuEntriesForState = titleMenuEntriesForState;
  const originalActivateTitleSelection = activateTitleSelection;
  const originalCloseTitleSubmenu = closeTitleSubmenu;
  const originalMoveTitleSelection = moveTitleSelection;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const splashState = "splash";
  const titleEffectsStartedAt = performance.now();

  const shootingStars = [
    { x: 165, y: 130, dx: 165, dy: 72, period: 8.6, phase: 0.04, width: 1.5 },
    { x: 935, y: 102, dx: 118, dy: 54, period: 11.2, phase: 0.48, width: 1.2 },
    { x: 520, y: 210, dx: 92, dy: 42, period: 13.7, phase: 0.77, width: 1.0 }
  ];

  const cityFlickers = [
    { x: 205, y: 432, r: 18, phase: 0.2 },
    { x: 303, y: 470, r: 15, phase: 1.4 },
    { x: 395, y: 510, r: 13, phase: 2.6 },
    { x: 525, y: 535, r: 12, phase: 3.8 },
    { x: 1005, y: 515, r: 14, phase: 4.3 },
    { x: 1192, y: 470, r: 16, phase: 5.5 },
    { x: 1288, y: 535, r: 22, phase: 0.9 }
  ];

  function sourceHelpers(layout) {
    return {
      sx: value => Math.round(layout.x + value * layout.scale),
      sy: value => Math.round(layout.y + value * layout.scale),
      ss: value => Math.max(1, value * layout.scale)
    };
  }

  function drawDiamond(x, y, size, fill, stroke = null) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawTrackedText(text, x, y, fontSize, color, tracking, weight = 600, family = 'Georgia, "Times New Roman", serif') {
    const chars = String(text).split("");
    ctx.font = `${weight} ${fontSize}px ${family}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = color;
    const widths = chars.map(char => ctx.measureText(char).width);
    const total = widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, chars.length - 1);
    let cursor = x - total / 2;
    chars.forEach((char, index) => {
      ctx.fillText(char, cursor, y);
      cursor += widths[index] + tracking;
    });
  }

  function drawAmbientTitleEffects(layout, now) {
    if (!layout) return;
    const { sx, sy, ss } = sourceHelpers(layout);
    const seconds = (now - titleEffectsStartedAt) / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // A handful of warm points gently pulse rather than making the entire city flash.
    cityFlickers.forEach(light => {
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 1.65 + light.phase);
      const alpha = 0.025 + pulse * 0.075;
      const x = sx(light.x);
      const y = sy(light.y);
      const radius = ss(light.r * (0.82 + pulse * 0.22));
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(255,220,130,${alpha})`);
      glow.addColorStop(0.35, `rgba(255,167,72,${alpha * 0.65})`);
      glow.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });

    if (!reduceMotion) {
      shootingStars.forEach(star => {
        const progress = (seconds / star.period + star.phase) % 1;
        // Visible only for a short part of the cycle so the sky stays calm.
        if (progress > 0.14) return;
        const local = progress / 0.14;
        const x = sx(star.x + star.dx * local);
        const y = sy(star.y + star.dy * local);
        const tail = ss(65 + 45 * (1 - local));
        const alpha = Math.sin(local * Math.PI) * 0.72;
        const angle = Math.atan2(star.dy, star.dx);
        const tx = Math.cos(angle) * tail;
        const ty = Math.sin(angle) * tail;
        const gradient = ctx.createLinearGradient(x - tx, y - ty, x, y);
        gradient.addColorStop(0, "rgba(189,153,255,0)");
        gradient.addColorStop(0.72, `rgba(207,184,255,${alpha * 0.38})`);
        gradient.addColorStop(1, `rgba(255,248,224,${alpha})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = ss(star.width);
        ctx.beginPath();
        ctx.moveTo(x - tx, y - ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      });

      // Slow glint across the title every few seconds. Kept intentionally restrained.
      const shimmer = (seconds % 7.5) / 7.5;
      if (shimmer < 0.22) {
        const p = shimmer / 0.22;
        const x = sx(330 + p * 800);
        const top = sy(75);
        const bottom = sy(315);
        const beam = ctx.createLinearGradient(x - ss(26), 0, x + ss(26), 0);
        beam.addColorStop(0, "rgba(255,255,255,0)");
        beam.addColorStop(0.5, `rgba(255,246,203,${0.07 * Math.sin(p * Math.PI)})`);
        beam.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = beam;
        ctx.fillRect(x - ss(28), top, ss(56), bottom - top);
      }
    }

    ctx.restore();
  }

  function drawSoftMenuField(layout, strength = 1) {
    const { sx, sy, ss } = sourceHelpers(layout);
    const centerX = sx(724);
    const centerY = sy(642);
    const radiusX = ss(390);
    const radiusY = ss(190);

    ctx.save();
    // Broad soft vignette: deliberately no rectangular panel.
    const radial = ctx.createRadialGradient(centerX, centerY, ss(30), centerX, centerY, radiusX);
    radial.addColorStop(0, `rgba(7,5,25,${0.56 * strength})`);
    radial.addColorStop(0.58, `rgba(8,5,27,${0.36 * strength})`);
    radial.addColorStop(1, "rgba(8,5,27,0)");
    ctx.fillStyle = radial;
    ctx.fillRect(sx(300), sy(420), ss(850), radiusY * 2.15);

    // This soft band masks the old baked-in PRESS START text when menus are open.
    const band = ctx.createLinearGradient(sx(420), 0, sx(1028), 0);
    band.addColorStop(0, "rgba(5,4,19,0)");
    band.addColorStop(0.2, `rgba(5,4,19,${0.64 * strength})`);
    band.addColorStop(0.5, `rgba(5,4,19,${0.80 * strength})`);
    band.addColorStop(0.8, `rgba(5,4,19,${0.64 * strength})`);
    band.addColorStop(1, "rgba(5,4,19,0)");
    ctx.fillStyle = band;
    ctx.fillRect(sx(420), sy(620), ss(608), ss(118));
    ctx.restore();
  }

  function drawSelectionRibbon(layout, y, width = 410) {
    const { sx, sy, ss } = sourceHelpers(layout);
    const left = sx(724 - width / 2);
    const right = sx(724 + width / 2);
    const lineY = sy(y + 21);
    const glow = ctx.createLinearGradient(left, 0, right, 0);
    glow.addColorStop(0, "rgba(154,105,230,0)");
    glow.addColorStop(0.20, "rgba(154,105,230,0.16)");
    glow.addColorStop(0.50, "rgba(255,220,142,0.28)");
    glow.addColorStop(0.80, "rgba(154,105,230,0.16)");
    glow.addColorStop(1, "rgba(154,105,230,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(left, sy(y - 20), right - left, ss(48));

    const line = ctx.createLinearGradient(left, 0, right, 0);
    line.addColorStop(0, "rgba(221,184,255,0)");
    line.addColorStop(0.18, "rgba(190,139,238,0.46)");
    line.addColorStop(0.5, "rgba(255,224,151,0.92)");
    line.addColorStop(0.82, "rgba(190,139,238,0.46)");
    line.addColorStop(1, "rgba(221,184,255,0)");
    ctx.fillStyle = line;
    ctx.fillRect(left, lineY, right - left, Math.max(1, ss(1.2)));
    drawDiamond(sx(724), lineY, ss(4.2), "#d99bff", "rgba(255,232,170,0.9)");
  }

  function drawSplash(layout, now) {
    const { sx, sy, ss } = sourceHelpers(layout);
    // A light veil cleans up the old baked prompt without making a box.
    drawSoftMenuField(layout, 0.66);
    const pulse = reduceMotion ? 1 : 0.82 + 0.18 * Math.sin(now / 650);
    ctx.save();
    ctx.shadowColor = `rgba(194,131,255,${0.34 * pulse})`;
    ctx.shadowBlur = ss(12);
    drawTrackedText("PRESS START", sx(724), sy(675), ss(24), `rgba(255,240,202,${pulse})`, ss(5.5), 600);
    ctx.restore();
    ctx.fillStyle = "rgba(226,205,244,0.72)";
    ctx.font = `${ss(12)}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ENTER  ·  CLICK  ·  CONFIRM", sx(724), sy(710));
  }

  function drawMainMenu(layout) {
    const { sx, sy, ss } = sourceHelpers(layout);
    drawSoftMenuField(layout, 1);
    const ys = [612, 673];
    titleMenuEntries.forEach((entry, index) => {
      const selected = index === titleMenuIndex;
      if (selected) drawSelectionRibbon(layout, ys[index], 430);
      ctx.save();
      if (selected) {
        ctx.shadowColor = "rgba(196,130,255,0.62)";
        ctx.shadowBlur = ss(14);
      }
      drawTrackedText(entry.toUpperCase(), sx(724), sy(ys[index]), ss(selected ? 25 : 22), selected ? "#fff0c9" : "rgba(234,222,239,0.68)", ss(3.2), selected ? 700 : 500);
      ctx.restore();
    });
    ctx.fillStyle = "rgba(217,196,235,0.56)";
    ctx.font = `${ss(11)}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("↑ ↓  SELECT     ENTER  CONFIRM     ESC  BACK", sx(724), sy(728));
  }

  function drawSlotMenu(layout) {
    const { sx, sy, ss } = sourceHelpers(layout);
    drawSoftMenuField(layout, 1);
    const hall = titleMenuIndex === 1;
    drawTrackedText(hall ? "EMBER HALL RUNS" : "CONTINUE STORY", sx(724), sy(492), ss(17), "rgba(238,218,250,0.78)", ss(3.2), 600);

    [0, 1].forEach(index => {
      const slot = index + 1;
      const y = 560 + index * 78;
      const selected = titleSubmenuIndex === index;
      const summary = saveSlotSummary(titleMenuIndex, slot);
      if (selected) drawSelectionRibbon(layout, y + 4, 540);

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `${selected ? 700 : 600} ${ss(18)}px Georgia, "Times New Roman", serif`;
      ctx.fillStyle = selected ? "#fff0c9" : "rgba(239,228,240,0.72)";
      ctx.fillText(`SAVE ${slot === 1 ? "I" : "II"}`, sx(520), sy(y));

      const detail = summary?.detail || (summary?.exists ? "EXISTING SAVE" : "EMPTY SLOT");
      const cleanDetail = String(detail).replace(/\s+/g, " ").slice(0, 48).toUpperCase();
      ctx.font = `${ss(12.5)}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = summary?.exists ? "rgba(225,203,244,0.78)" : "rgba(188,181,198,0.48)";
      ctx.textAlign = "right";
      ctx.fillText(cleanDetail, sx(928), sy(y + 2));
      ctx.restore();
    });

    const backY = 716;
    if (titleSubmenuIndex === 2) drawSelectionRibbon(layout, backY, 250);
    drawTrackedText("BACK", sx(724), sy(backY), ss(titleSubmenuIndex === 2 ? 19 : 17), titleSubmenuIndex === 2 ? "#fff0c9" : "rgba(231,220,236,0.62)", ss(3), titleSubmenuIndex === 2 ? 700 : 500);
  }

  function drawActionMenu(layout) {
    const { sx, sy, ss } = sourceHelpers(layout);
    drawSoftMenuField(layout, 1);
    const slotLabel = activeSaveSlot === 1 ? "SAVE I" : "SAVE II";
    const modeLabel = titleMenuIndex === 1 ? "EMBER HALL" : "STORY MODE";
    drawTrackedText(`${slotLabel}  ·  ${modeLabel}`, sx(724), sy(508), ss(15), "rgba(224,205,242,0.68)", ss(2.1), 600, '"Segoe UI", Arial, sans-serif');

    const entries = originalTitleMenuEntriesForState();
    const ys = [574, 636, 698];
    entries.forEach((entry, index) => {
      const selected = titleSubmenuIndex === index;
      const unavailableContinue = index === 1 && !savedGameExists(titleSaveKey());
      if (selected && !unavailableContinue) drawSelectionRibbon(layout, ys[index], 390);
      const color = unavailableContinue
        ? "rgba(145,139,151,0.42)"
        : selected ? "#fff0c9" : "rgba(234,222,239,0.66)";
      drawTrackedText(entry.toUpperCase(), sx(724), sy(ys[index]), ss(selected ? 22 : 20), color, ss(3.1), selected ? 700 : 500);
    });
  }

  drawTitleMenu = function modernDrawTitleMenu(layout) {
    const now = performance.now();
    drawAmbientTitleEffects(layout, now);
    if (titleMenuState === splashState) return drawSplash(layout, now);
    if (titleMenuState === "main") return drawMainMenu(layout);
    if (titleMenuState === "story" || titleMenuState === "hall") return drawSlotMenu(layout);
    if (titleMenuState === "storyActions" || titleMenuState === "hallActions") return drawActionMenu(layout);
    // Fallback for any future title state not known by this presentation layer.
    originalDrawTitleMenu(layout);
  };

  titleMenuEntriesForState = function modernTitleMenuEntriesForState() {
    if (titleMenuState === splashState) return [];
    return originalTitleMenuEntriesForState();
  };

  activateTitleSelection = function modernActivateTitleSelection() {
    if (!runtimeAssetsReady) return;
    if (titleMenuState === splashState) {
      titleMenuState = "main";
      titleMenuIndex = 0;
      titleSubmenuIndex = 0;
      playSfx("menu");
      return;
    }
    return originalActivateTitleSelection();
  };

  closeTitleSubmenu = function modernCloseTitleSubmenu() {
    if (titleMenuState === splashState) return;
    if (titleMenuState === "main") {
      titleMenuState = splashState;
      titleMenuIndex = 0;
      titleSubmenuIndex = 0;
      playSfx("menu");
      return;
    }
    return originalCloseTitleSubmenu();
  };

  moveTitleSelection = function modernMoveTitleSelection(direction) {
    if (titleMenuState === splashState) return;
    return originalMoveTitleSelection(direction);
  };

  function pointerSourcePosition(event) {
    if (!titleImage) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left) * canvas.width / rect.width;
    const canvasY = (event.clientY - rect.top) * canvas.height / rect.height;
    const layout = titleImageLayout();
    return {
      x: (canvasX - layout.x) / layout.scale,
      y: (canvasY - layout.y) / layout.scale
    };
  }

  titleMenuPointerTarget = function modernTitleMenuPointerTarget(event) {
    const point = pointerSourcePosition(event);
    if (!point) return null;
    if (titleMenuState === splashState) return { kind: "confirm" };

    if (titleMenuState === "main") {
      const ys = [612, 673];
      for (let index = 0; index < ys.length; index++) {
        if (point.x >= 500 && point.x <= 950 && point.y >= ys[index] - 25 && point.y <= ys[index] + 28) {
          return { kind: "mode", index };
        }
      }
      return null;
    }

    if (titleMenuState === "story" || titleMenuState === "hall") {
      const ys = [560, 638, 716];
      for (let index = 0; index < ys.length; index++) {
        const halfHeight = index < 2 ? 34 : 25;
        if (point.x >= 455 && point.x <= 990 && point.y >= ys[index] - halfHeight && point.y <= ys[index] + halfHeight) {
          return { kind: "action", index };
        }
      }
      return null;
    }

    if (titleMenuState === "storyActions" || titleMenuState === "hallActions") {
      const ys = [574, 636, 698];
      for (let index = 0; index < ys.length; index++) {
        if (point.x >= 500 && point.x <= 950 && point.y >= ys[index] - 25 && point.y <= ys[index] + 28) {
          return { kind: "action", index };
        }
      }
      return null;
    }

    return originalTitleMenuPointerTarget(event);
  };

  canvas.addEventListener("pointermove", event => {
    if (mode !== "title") return;
    const target = titleMenuPointerTarget(event);
    canvas.style.cursor = target ? "pointer" : "default";
    if (!target) return;
    if (target.kind === "mode" && titleMenuIndex !== target.index) {
      titleMenuIndex = target.index;
      titleSubmenuIndex = 0;
    } else if (target.kind === "action" && titleSubmenuIndex !== target.index) {
      titleSubmenuIndex = target.index;
    }
  });

  canvas.addEventListener("pointerleave", () => {
    if (mode === "title") canvas.style.cursor = "default";
  });

  // Start on a clean cinematic splash. Enter/click/confirm reveals the menu.
  titleMenuState = splashState;
  titleMenuIndex = 0;
  titleSubmenuIndex = 0;
})();
