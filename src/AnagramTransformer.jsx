import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Play, Info } from "lucide-react";

/**
 * Container-aware AnagramTransformer (final, fixed)
 * - Auto-fits font size to the embedding container
 * - Robust stage sizing on first paint (explicit pixels + double RAF init)
 * - No NaN top/height; no double padding
 * - Start button wired via helper + explicit call
 */
const AnagramTransformer = () => {
  // Refs to layout pieces
  const wrapperRef = useRef(null);
  const headerRef = useRef(null);
  const controlsRef = useRef(null);
  const stageRef = useRef(null); // drawable stage
  const measureCanvasRef = useRef(null); // precise monospace metrics

  // Playback / UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("text1");
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stage size (derived from wrapper minus chrome)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // URL options
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const hideChrome = urlParams.get("chrome") === "0"; // default shows chrome
  const padX = Math.max(0, Math.min(0.2, Number(urlParams.get("padx")) || 0.04));
  const padY = Math.max(0, Math.min(0.2, Number(urlParams.get("pady")) || 0.06));

  // Dynamic content loaded from JSON
  const [content, setContent] = useState({
    title: "Sonetos, anagramas y palíndromos",
    language: "es",
    subtitles: ["Introducción", "Primer Soneto", "Segundo Soneto"],
    texts: [],
  });

  // Animation timing (in seconds)
  const TIMINGS = {
    initialDisplay: 2.0,
    normalization: 0.45,
    movement: 8,
    transition: 0.5,
    denormalization: 1.25,
    finalDisplay: 1.75,
  };
  const totalDuration = Object.values(TIMINGS).reduce((s, t) => s + t, 0);

  // Accented map
  const accentedMap = {
    Á: "a", É: "e", Í: "i", Ó: "o", Ú: "u",
    á: "a", é: "e", í: "i", ó: "o", ú: "u",
    Ü: "u", ü: "u", Ñ: "n", ñ: "n",
  };

  // -------------------- Load JSON --------------------
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const textSet = urlParams.get("texts") || "sonetos-palindromicos";
        const basePath = import.meta.env.BASE_URL || "/";
        const response = await fetch(`${basePath}texts/${textSet}.json`);
        if (!response.ok) throw new Error(`Failed to load text set: ${textSet}`);
        const data = await response.json();
        setContent(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading content:", err);
        setError(err.message);
        setIsLoading(false);
        // Minimal fallback so the app renders
        setContent((prev) => ({ ...prev, texts: ["demo", "demo"] }));
      }
    };
    loadContent();
  }, [urlParams]);

  // -------------------- Compute stage size (container-aware) --------------------
  const updateStageSize = () => {
    const wrap = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const wrapRect = wrap.getBoundingClientRect();
    const headerH = hideChrome ? 0 : (headerRef.current?.offsetHeight || 0);
    const controlsH = hideChrome ? 0 : (controlsRef.current?.offsetHeight || 0);

    const width  = Math.max(0, Math.floor(wrapRect.width));
    const height = Math.max(0, Math.floor(wrapRect.height - headerH - controlsH));

    // Ensure stage has explicit pixels before measuring typography
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;

    setStageSize({ width, height });
  };

  useLayoutEffect(() => {
    updateStageSize();
    const ro = new ResizeObserver(updateStageSize);
    if (stageRef.current) ro.observe(stageRef.current);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    if (!hideChrome) {
      if (headerRef.current) ro.observe(headerRef.current);
      if (controlsRef.current) ro.observe(controlsRef.current);
    }
    return () => ro.disconnect();
  }, [hideChrome]);

  // -------------------- Typography calculator (precise monospace) --------------------
  const LINE_HEIGHT = 1.1; // slightly tight to reclaim vertical space
  const MAX_FONT = 160;
  const MIN_FONT = 8;

  const measureCharWidth = (fontSizePx) => {
    let canvas = measureCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      measureCanvasRef.current = canvas;
    }
    const ctx = canvas.getContext("2d");
    ctx.font = `400 ${fontSizePx}px Consolas, 'Courier New', Courier, monospace`;
    const sample = "MMMMMMMMMM"; // 10 Ms
    const w = ctx.measureText(sample).width;
    return w / sample.length;
  };

  const calculateTypography = () => {
    const { width: W, height: H } = stageSize;
    if (!W || !H || content.texts.length === 0) return null;

    // Compute maximum requirements across ALL texts (so both fit)
    let maxLineLength = 0;
    let maxLines = 0;
    content.texts.forEach((t) => {
      const lines = t.split("\n");
      maxLines = Math.max(maxLines, lines.length);
      lines.forEach((ln) => {
        maxLineLength = Math.max(maxLineLength, ln.length);
      });
    });

    const availW = Math.max(0, W * (1 - 2 * padX));
    const availH = Math.max(0, H * (1 - 2 * padY));

    const BASE = 100; // px
    const charWbase = Math.max(1, measureCharWidth(BASE));

    const sWidth = (availW * BASE) / (Math.max(1, maxLineLength) * charWbase);
    const sHeight = availH / (Math.max(1, maxLines) * LINE_HEIGHT);

    const fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, Math.floor(Math.min(sWidth, sHeight))));
    const charWidth = (charWbase * fontSize) / BASE;
    const lineHeightPx = fontSize * LINE_HEIGHT;

    const gridWidthPx = maxLineLength * charWidth;
    const gridHeightPx = maxLines * lineHeightPx;
    const startX = (W - gridWidthPx) / 2;
    const startY = (H - gridHeightPx) / 2;

    return {
      fontSize,
      lineHeight: lineHeightPx,
      charWidth,
      startX,
      startY,
      maxLines,
      containerWidth: W,
      containerHeight: H,
    };
  };

  // -------------------- Helpers for current pair of texts --------------------
  const getCurrentTexts = () => {
    if (content.texts.length === 0) return { fromText: "", toText: "", fromIndex: 0, toIndex: 0 };
    const fromIndex = currentTextIndex;
    const toIndex = content.texts.length === 2 ? (fromIndex === 0 ? 1 : 0) : (fromIndex + 1) % content.texts.length;
    return { fromText: content.texts[fromIndex], toText: content.texts[toIndex], fromIndex, toIndex };
  };

  // -------------------- Create letter elements with typography --------------------
  const createLetterElements = (text, prefix, container, typography) => {
    const letters = [];
    const lines = text.split("\n");
    const { fontSize, lineHeight, charWidth, startX, startY } = typography;

    lines.forEach((line, lineIndex) => {
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === " ") continue; // reserve spacing but don't render a node

        const normalizedChar = accentedMap[char] || char.toLowerCase();
        const isUppercase = /[A-ZÁÉÍÓÚÜÑÁÉÍÓÚÜÑ]/.test(char);
        const isPunctuation = /[^\w\sÁÉÍÓÚÜÑáéíóúüñ]/.test(char);

        const letterContainer = document.createElement("div");
        letterContainer.className = "letter-container";
        letterContainer.style.cssText = `
          position: absolute;
          left: ${startX + charIndex * charWidth}px;
          top: ${startY + lineIndex * lineHeight}px;
          transition: transform 8s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        const layerStyle = `
          position: absolute;
          left: 0; top: 0;
          font-family: 'Consolas', 'Courier New', Courier, monospace;
          font-size: ${fontSize}px;
          font-weight: 400;
          color: #222;
          user-select: none;
          line-height: 1;
          transition: opacity 0.5s ease;
        `;

        const originalLayer = document.createElement("div");
        originalLayer.className = "letter original-layer";
        originalLayer.style.cssText = layerStyle;
        originalLayer.textContent = char;

        const normalizedLayer = document.createElement("div");
        normalizedLayer.className = "letter normalized-layer";
        normalizedLayer.style.cssText = layerStyle;
        normalizedLayer.textContent = isPunctuation ? "" : normalizedChar;

        if (prefix === "text1") {
          originalLayer.style.opacity = "1";
          normalizedLayer.style.opacity = "0";
          letterContainer.appendChild(originalLayer);
          letterContainer.appendChild(normalizedLayer);
          container.appendChild(letterContainer);
        } else {
          letterContainer.style.visibility = isPunctuation ? "visible" : "hidden";
          letterContainer.style.pointerEvents = "none";
          originalLayer.style.opacity = "0";
          normalizedLayer.style.opacity = "0";
          letterContainer.appendChild(originalLayer);
          letterContainer.appendChild(normalizedLayer);
          container.appendChild(letterContainer);
        }

        letters.push({
          container: letterContainer,
          originalLayer,
          normalizedLayer,
          char,
          normalizedChar,
          x: startX + charIndex * charWidth,
          y: startY + lineIndex * lineHeight,
          lineIndex,
          charIndex,
          isUppercase,
          isPunctuation,
        });
      }
    });
    return letters;
  };

  // -------------------- Mapping & animation --------------------
  const generateMovementMapping = (letters1, letters2) => {
    const mapping = [];
    const available2 = [...letters2];

    letters1.forEach((l1) => {
      if (l1.isPunctuation) return;
      let best = null;
      let bestDist = Infinity;
      let bestIdx = -1;
      available2.forEach((l2, idx) => {
        if (!l2.isPunctuation && l2.normalizedChar === l1.normalizedChar) {
          const dx = l1.x - l2.x;
          const dy = l1.y - l2.y;
          const d = Math.hypot(dx, dy);
          if (d < bestDist) { bestDist = d; best = l2; bestIdx = idx; }
        }
      });
      if (best) {
        mapping.push({ from: l1, to: best, distance: bestDist });
        available2.splice(bestIdx, 1);
      }
    });
    return mapping;
  };

  const animateLetterMinimalArc = (letter, endX, endY, duration) => {
    const startX = letter.x;
    const startY = letter.y;
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dx, dy);
    const arc = Math.min(dist * 0.1, 30);
    const frames = [
      { transform: `translate(0px, 0px)` },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - arc}px)` },
      { transform: `translate(${dx}px, ${dy}px)` },
    ];
    letter.container.animate(frames, { duration: duration * 1000, easing: "linear", fill: "forwards" });
  };

  const runCSSAnimation = async () => {
    if (!stageRef.current || content.texts.length === 0) return;

    const { fromText, toText } = getCurrentTexts();
    const typography = calculateTypography();
    if (!typography) return;

    // Clear stage
    stageRef.current.innerHTML = "";

    // Build layers for both texts
    const letters1 = createLetterElements(fromText, "text1", stageRef.current, typography);
    const letters2 = createLetterElements(toText, "text2", stageRef.current, typography);

    // Map movements and animate
    const mapping = generateMovementMapping(letters1, letters2);
    setCurrentPhase("transforming");

    try {
      let elapsed = 0;
      const tick = () => { if (isPlaying) { elapsed += 0.1; setProgress((elapsed / totalDuration) * 100); } };
      const timer = setInterval(tick, 100);

      await new Promise((r) => setTimeout(r, TIMINGS.initialDisplay * 1000));

      // Normalize: show normalized layer for uppercase; hide punctuation originals
      letters1.forEach((L) => {
        if (L.isUppercase) { L.originalLayer.style.opacity = "0"; L.normalizedLayer.style.opacity = "1"; }
        else if (L.isPunctuation) { L.originalLayer.style.opacity = "0"; }
      });
      await new Promise((r) => setTimeout(r, TIMINGS.normalization * 1000));

      mapping.forEach(({ from, to }) => animateLetterMinimalArc(from, to.x, to.y, TIMINGS.movement));
      await new Promise((r) => setTimeout(r, TIMINGS.movement * 1000));

      // Swap content
      mapping.forEach(({ from, to }) => {
        if (!to.isPunctuation) {
          from.normalizedLayer.textContent = to.normalizedChar;
          if (to.isUppercase) from.originalLayer.textContent = to.char;
        }
      });
      await new Promise((r) => setTimeout(r, TIMINGS.transition * 1000));

      // Denormalize: reveal punctuation and revert case where needed
      letters2.forEach((L) => { if (L.isPunctuation) L.originalLayer.style.opacity = "0"; });
      mapping.forEach(({ from, to }) => {
        if (to.isUppercase) { from.normalizedLayer.style.opacity = "0"; from.originalLayer.style.opacity = "1"; }
      });
      letters2.forEach((L) => { if (L.isPunctuation) L.originalLayer.style.opacity = "1"; });

      await new Promise((r) => setTimeout(r, TIMINGS.denormalization * 1000));

      clearInterval(timer); setProgress(100);

      setTimeout(() => {
        setCurrentPhase("waiting");
        setIsPlaying(false);
        setCurrentTextIndex((prev) => (content.texts.length === 2 ? (prev === 0 ? 1 : 0) : (prev + 1) % content.texts.length));
        setProgress(0);
      }, TIMINGS.finalDisplay * 1000);
    } catch (e) {
      console.error("Animation error:", e);
      setIsPlaying(false); setProgress(0);
    }
  };

  // -------------------- Initialize or update when content/size changes --------------------
  useEffect(() => {
    if (!stageRef.current || content.texts.length === 0) return;

    // Ensure the stage has explicit pixels now
    updateStageSize();

    // Wait two RAFs so header/controls report correct heights, then render letters
    let id1 = 0, id2 = 0;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        stageRef.current.innerHTML = "";
        const typography = calculateTypography();
        if (!typography) return; // keeps Play disabled if container is 0x0
        const { fromText } = getCurrentTexts();
        createLetterElements(fromText, "text1", stageRef.current, typography);
        setIsInitialized(true); // enables Play
      });
    });

    return () => {
      if (id1) cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [currentTextIndex, content.texts, stageSize.width, stageSize.height]);

  // -------------------- Start helper --------------------
  function startAnimation() {
    if (!isInitialized || isPlaying) return;
    setIsPlaying(true);
    runCSSAnimation();
  }

  // -------------------- Localization --------------------
  const getMessages = () => {
    const isEnglish = content.language === "en";
    return {
      loading: isEnglish ? "Loading texts..." : "Cargando textos...",
      errorTitle: isEnglish ? "Error loading texts" : "Error al cargar los textos",
      retry: isEnglish ? "Retry" : "Reintentar",
      play: isEnglish ? "Play" : "Reproducir",
      aboutTitle: isEnglish ? "About this animation" : "Sobre esta animación",
      aboutText: isEnglish
        ? "This animation demonstrates the anagrammatic transformation between poetic texts. Each letter moves from its original position to its new location, revealing how the same letters can form completely different texts."
        : "Esta animación demuestra la transformación anagramática entre textos poéticos. Cada letra se mueve de su posición original a su nueva ubicación, revelando cómo las mismas letras pueden formar textos completamente diferentes.",
      aboutNote: isEnglish
        ? "The texts maintain exactly the same inventory of letters, demonstrating the anagrammatic nature of the transformation."
        : "Los textos mantienen exactamente el mismo inventario de letras, demostrando la naturaleza anagramática de la transformación.",
      close: isEnglish ? "Close" : "Cerrar",
      jsRequired: isEnglish ? "JavaScript Required" : "JavaScript Requerido",
      jsMessage: isEnglish
        ? "This anagram visualizer requires JavaScript to function. Please enable JavaScript in your browser and reload the page."
        : "Este visualizador de anagramas requiere JavaScript para funcionar. Por favor, habilita JavaScript en tu navegador y recarga la página.",
    };
  };

  const getPhaseDescription = () => {
    const isEnglish = content.language === "en";
    switch (currentPhase) {
      case "transforming":
        return isEnglish ? "Anagrammatic transformation in progress" : "Transformación anagramática en proceso";
      case "waiting":
        return isEnglish ? "Ready for next transformation" : "Listo para la siguiente transformación";
      default:
        return isEnglish ? "Ready to begin" : "Listo para comenzar";
    }
  };

  // -------------------- Render --------------------
  if (isLoading) {
    const messages = getMessages();
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f9fa 100%)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: "center", color: "#666" }}>
          <div style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>{messages.loading}</div>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e5e5e5",
              borderRadius: "50%",
              borderTopColor: "#007acc",
              animation: "spin 1s ease-in-out infinite",
              margin: "0 auto",
            }}
          />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    const messages = getMessages();
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f9fa 100%)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: "center", color: "#dc3545", maxWidth: "420px", padding: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>{messages.errorTitle}</h3>
          <p style={{ marginBottom: "1rem", color: "#666" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #007acc",
              background: "#007acc",
              color: "#fff",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {messages.retry}
          </button>
        </div>
      </div>
    );
  }

  const messages = getMessages();

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%", // fill whatever the parent gives us
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f9fa 100%)",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxSizing: "border-box",
      }}
    >
      {/* Header (optional chrome) */}
      {!hideChrome && (
        <div
          ref={headerRef}
          style={{
            position: "relative",
            padding: "1rem 1.25rem",
            textAlign: "center",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{content.title}</h1>
          <p style={{ color: "#666", fontStyle: "italic", margin: 0, fontSize: "1rem" }}>
            {content.subtitles[currentTextIndex] || `Transformación ${currentTextIndex + 1}`}
          </p>
        </div>
      )}

      {/* Stage (auto-sized between header and controls) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: hideChrome ? 0 : (headerRef.current?.offsetHeight || 0),
          bottom: hideChrome ? 0 : (controlsRef.current ? controlsRef.current.offsetHeight : 0),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          ref={stageRef}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            boxShadow: "0 4px 12px rgba(0, 122, 204, 0.08)",
          }}
        />
      </div>

      {/* Controls (optional chrome) */}
      {!hideChrome && (
        <div
          ref={controlsRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid #e5e5e5",
            padding: "1rem 1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {/* Play */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => startAnimation()}
                disabled={!isInitialized || isPlaying}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.2rem",
                  borderRadius: 6,
                  fontWeight: 500,
                  fontSize: "1rem",
                  border: "none",
                  cursor: isInitialized && !isPlaying ? "pointer" : "not-allowed",
                  background: isInitialized && !isPlaying ? "#007acc" : "#ccc",
                  color: "#fff",
                  transition: "all 0.3s ease",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  if (isInitialized && !isPlaying) e.currentTarget.style.background = "#005a99";
                }}
                onMouseLeave={(e) => {
                  if (isInitialized && !isPlaying) e.currentTarget.style.background = "#007acc";
                }}
              >
                <Play size={16} />
                {messages.play}
              </button>
            </div>

            {/* Progress */}
            <div style={{ flex: 1, maxWidth: 320, margin: "0 1rem" }}>
              <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.4rem", textAlign: "center" }}>
                {getPhaseDescription()}
              </div>
              <div style={{ width: "100%", height: 4, background: "#e5e5e5", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#007acc", transition: "width 0.3s ease" }} />
              </div>
            </div>

            {/* Info */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem",
                borderRadius: 6,
                border: "1px solid #e5e5e5",
                background: showInfo ? "#f8f9fa" : "#fff",
                color: "#666",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontFamily: "inherit",
              }}
            >
              <Info size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {showInfo && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: "1.5rem",
            maxWidth: 520,
            boxShadow: "0 4px 12px rgba(0, 122, 204, 0.1)",
            zIndex: 1000,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "0.75rem", color: "#1a1a1a", fontSize: "1.25rem" }}>{messages.aboutTitle}</h3>
          <p style={{ color: "#666", lineHeight: 1.6, margin: 0 }}>{messages.aboutText}</p>
          <p style={{ color: "#666", lineHeight: 1.6, margin: "0.75rem 0 1.25rem 0", fontSize: "0.95rem", fontStyle: "italic" }}>{messages.aboutNote}</p>
          <button
            onClick={() => setShowInfo(false)}
            style={{ padding: "0.5rem 1rem", borderRadius: 6, border: "none", background: "#007acc", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            {messages.close}
          </button>
        </div>
      )}
    </div>
  );
};

export default AnagramTransformer;
