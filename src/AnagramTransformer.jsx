import React, { useState, useEffect, useRef } from "react";
import { Play, Info } from "lucide-react";

const AnagramTransformer = () => {
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("text1");
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Dynamic content loaded from JSON
  const [content, setContent] = useState({
    title: "Sonetos, anagramas y palíndromos",
    language: "es",
    subtitles: ["Introducción", "Primer Soneto", "Segundo Soneto"],
    texts: []
  });

  // Animation timing (in seconds)
  const TIMINGS = {
    initialDisplay: 2.5,
    normalization: 0.5,
    movement: 8,
    transition: 0.5,
    denormalization: 1.5,
    finalDisplay: 2.0,
  };

  const totalDuration = Object.values(TIMINGS).reduce((sum, time) => sum + time, 0);

  // Mapping for accented characters
  const accentedMap = {
    Á: "a", É: "e", Í: "i", Ó: "o", Ú: "u",
    á: "a", é: "e", í: "i", ó: "o", ú: "u",
  };

  // ResizeObserver to track container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Load content from JSON file
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get text set from URL parameter, default to 'sonetos-palindromicos'
        const urlParams = new URLSearchParams(window.location.search);
        const textSet = urlParams.get('texts') || 'sonetos-palindromicos';
        
        // Use absolute path that works with GitHub Pages base path
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}texts/${textSet}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load text set: ${textSet}`);
        }
        
        const data = await response.json();
        setContent(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading content:', err);
        setError(err.message);
        setIsLoading(false);
        
        // Fallback to default content
        setContent({
          title: "Sonetos, anagramas y palíndromos",
          language: "es",
          subtitles: ["Introducción", "Primer Soneto", "Segundo Soneto"],
          texts: [
            "¡Vaya, tío, parece imposible!\nArmar dos sonetos palindrómicos con\nel mismo número de instancias de\ncada letra es tarea rococó, reto raro.\nAcalorado, agotado, no enojado,\nuno sólo otea, lee, relee, y\nno ve cómo amarrarse a tal amor\narduo, este arte barroco de agregar,\navalar, acertar, errar sin anonadarse.\nPero el azar traza maravillas\ncomo nadie. Mola granjearse, a llama\naérea y magno rayo, este doloroso\nlogro: la dualidad.",
            "Sé verla osarte lodo loco, loco.\nTarima de mi ser, billar en ego,\nrigor de parte con laúd. ¿Ya toco\nser tara, porte, moda? ¿Luz anego?\n\nTarea roma de sal a ese decano.\nRima ramera y sana mesa dona.\nNo roca, raro. Oírla. Saja, vano.\n¿O navaja, sal, rio? Orará corona.\n\nNo da semanas. Ya remara, miro.\nNace, desea la sed, amor a Erato,\ngen azulado, metro para tres.\n\n¿O cota y dual? No cetra, Pedro, giro\ngeneral, libre, sí, me da mi rato.\nColoco, lodo, letras, o al revés.",
            "«Amargan al azul». Y Adonis ora.\nReveló saco es lar rocoso, pero\nno, no me trae donosa musa a mora,\nmar de arte total, errata cero.\n\nNo nota del resiego lo sajado.\nReverbérale goce, rasar cima.\nY a mina di, letrada, cipo, lado.\nO dalo. Pica darte. Lid anima\n\ny a mí, crasa, recoge, la re-breve\nrodaja. Sólo géiser le da tono.\nNo recatar. Relato te trae drama.\n\nRoma a suma sonó de arte mono.\nNo reposo corral. Sé ocaso leve,\nraro, sin oda. Y luz al anagrama."
          ]
        });
      }
    };

    loadContent();
  }, []);

  // Get current texts for transformation
  const getCurrentTexts = () => {
    if (content.texts.length === 0) return { fromText: "", toText: "", fromIndex: 0, toIndex: 0 };
    
    const fromIndex = currentTextIndex;
    let toIndex;
    
    if (content.texts.length === 2) {
      // For 2 texts: alternate between them (0↔1)
      toIndex = fromIndex === 0 ? 1 : 0;
    } else {
      // For 3+ texts: cycle through them (0→1→2→0...)
      toIndex = (currentTextIndex + 1) % content.texts.length;
    }
    
    return {
      fromText: content.texts[fromIndex],
      toText: content.texts[toIndex],
      fromIndex,
      toIndex,
    };
  };

  // Calculate consistent typography for all texts with mobile optimization
  const calculateTypography = () => {
    if (!containerRef.current || content.texts.length === 0 || !containerDimensions.width) return null;

    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;

    // Mobile detection
    const isMobile = containerWidth < 768;
    
    // Find the maximum requirements across ALL texts
    let maxLineLength = 0;
    let maxLines = 0;

    content.texts.forEach((text) => {
      const lines = text.split("\n");
      maxLines = Math.max(maxLines, lines.length);
      lines.forEach((line) => {
        maxLineLength = Math.max(maxLineLength, line.length);
      });
    });

    // Mobile-optimized calculations
    const padding = isMobile ? 16 : 32;
    const availableWidth = containerWidth - (padding * 2);
    const availableHeight = containerHeight - (padding * 2);
    
    // More conservative sizing for mobile
    const widthBasedSize = availableWidth / (maxLineLength * (isMobile ? 0.55 : 0.6));
    const heightBasedSize = availableHeight / (maxLines * (isMobile ? 1.3 : 1.2));
    
    // Lower maximum font size on mobile
    const maxFontSize = isMobile ? 24 : 48;
    const minFontSize = isMobile ? 8 : 12;
    
    const fontSize = Math.max(
      minFontSize,
      Math.min(widthBasedSize, heightBasedSize, maxFontSize)
    );

    const lineHeight = fontSize * (isMobile ? 1.3 : 1.2);
    const charWidth = fontSize * (isMobile ? 0.55 : 0.6);
    
    // Center the text block
    const textBlockWidth = maxLineLength * charWidth;
    const textBlockHeight = maxLines * lineHeight;
    const startX = (containerWidth - textBlockWidth) / 2;
    const startY = (containerHeight - textBlockHeight) / 2;

    return {
      fontSize,
      lineHeight,
      charWidth,
      startX: Math.max(padding, startX),
      startY: Math.max(padding, startY),
      maxLines,
      containerWidth,
      containerHeight,
      isMobile,
    };
  };

  // Create letter elements with consistent typography
  const createLetterElements = (text, prefix, container, typography) => {
    const letters = [];
    const lines = text.split("\n");

    const {
      fontSize,
      lineHeight,
      charWidth,
      startX,
      startY,
      isMobile,
    } = typography;

    lines.forEach((line, lineIndex) => {
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === " ") continue;

        const normalizedChar = accentedMap[char] || char.toLowerCase();
        const isUppercase = /[A-ZÁÉÍÓÚáéíóú]/.test(char);
        const isPunctuation = /[^\w\sÁÉÍÓÚáéíóúÜü]/.test(char);

        const letterContainer = document.createElement("div");
        letterContainer.className = "letter-container";
        letterContainer.style.cssText = `
          position: absolute;
          left: ${startX + charIndex * charWidth}px;
          top: ${startY + lineIndex * lineHeight}px;
          transition: all 8s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        `;

        const originalLayer = document.createElement("div");
        originalLayer.className = "letter original-layer";
        originalLayer.textContent = char;

        const normalizedLayer = document.createElement("div");
        normalizedLayer.className = "letter normalized-layer";
        normalizedLayer.textContent = isPunctuation ? "" : normalizedChar;

        const layerStyle = `
          position: absolute;
          left: 0;
          top: 0;
          font-family: 'Consolas', 'Courier New', 'Courier', monospace;
          font-size: ${fontSize}px;
          font-weight: 400;
          color: #333;
          cursor: default;
          user-select: none;
          line-height: 1;
          transition: opacity 0.5s ease;
          ${isMobile ? 'transform: translateZ(0);' : ''}
        `;

        originalLayer.style.cssText = layerStyle;
        normalizedLayer.style.cssText = layerStyle;

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
          originalLayer: originalLayer,
          normalizedLayer: normalizedLayer,
          char: char,
          normalizedChar: normalizedChar,
          x: startX + charIndex * charWidth,
          y: startY + lineIndex * lineHeight,
          lineIndex,
          charIndex,
          isUppercase: isUppercase,
          isPunctuation: isPunctuation,
        });
      }
    });

    return letters;
  };

  // Generate movement mapping between texts
  const generateMovementMapping = (letters1, letters2) => {
    const mapping = [];
    const available2 = [...letters2];

    letters1.forEach((letter1) => {
      if (letter1.isPunctuation) return;

      const normalizedChar1 = letter1.normalizedChar;
      let bestMatch = null;
      let bestDistance = Infinity;
      let bestIndex = -1;

      available2.forEach((letter2, index) => {
        if (!letter2.isPunctuation && letter2.normalizedChar === normalizedChar1) {
          const distance = Math.sqrt(
            Math.pow(letter1.x - letter2.x, 2) + Math.pow(letter1.y - letter2.y, 2)
          );
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = letter2;
            bestIndex = index;
          }
        }
      });

      if (bestMatch) {
        mapping.push({
          from: letter1,
          to: bestMatch,
          distance: bestDistance,
        });
        available2.splice(bestIndex, 1);
      }
    });

    return mapping;
  };

  // Minimal arc movement - subtle curves that maintain precise timing
  const animateLetterMinimalArc = (letter, endX, endY, duration) => {
    const startX = letter.x;
    const startY = letter.y;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Calculate a subtle arc height based on distance (max 30px)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const arcHeight = Math.min(distance * 0.1, 30);
    
    // Create minimal arc using CSS keyframe animation
    const keyframes = [
      { transform: `translate(0px, 0px)` },
      { transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.5 - arcHeight}px)` },
      { transform: `translate(${deltaX}px, ${deltaY}px)` }
    ];
    
    // Use linear timing for precise control
    letter.container.animate(keyframes, {
      duration: duration * 1000,
      easing: 'linear',
      fill: 'forwards'
    });
  };

  // Enhanced CSS-based animation with minimal arc movement
  const runCSSAnimation = async () => {
    if (!containerRef.current || content.texts.length === 0) return;

    const { fromText, toText } = getCurrentTexts();
    const typography = calculateTypography();
    if (!typography) return;

    // Clear container
    containerRef.current.innerHTML = "";

    // Create letter elements with consistent typography
    const letters1 = createLetterElements(fromText, "text1", containerRef.current, typography);
    const letters2 = createLetterElements(toText, "text2", containerRef.current, typography);

    // Generate mapping
    const mapping = generateMovementMapping(letters1, letters2);

    setCurrentPhase("transforming");

    try {
      let elapsed = 0;
      
      // Phase 1: Initial display
      const updateProgress = () => {
        if (isPlaying) {
          elapsed += 0.1;
          setProgress((elapsed / totalDuration) * 100);
        }
      };
      
      const progressInterval = setInterval(updateProgress, 100);

      await new Promise((resolve) => setTimeout(resolve, TIMINGS.initialDisplay * 1000));

      // Phase 2: Normalization
      letters1.forEach((letter) => {
        if (letter.isUppercase) {
          letter.originalLayer.style.opacity = "0";
          letter.normalizedLayer.style.opacity = "1";
        } else if (letter.isPunctuation) {
          letter.originalLayer.style.opacity = "0";
        }
      });
      await new Promise((resolve) => setTimeout(resolve, TIMINGS.normalization * 1000));

      // Phase 3: Minimal Arc Movement
      mapping.forEach(({ from, to }) => {
        animateLetterMinimalArc(from, to.x, to.y, TIMINGS.movement);
      });
      await new Promise((resolve) => setTimeout(resolve, TIMINGS.movement * 1000));

      // Phase 4: Content transition
      mapping.forEach(({ from, to }) => {
        if (!to.isPunctuation) {
          from.normalizedLayer.textContent = to.normalizedChar;
          if (to.isUppercase) {
            from.originalLayer.textContent = to.char;
          }
        }
      });
      await new Promise((resolve) => setTimeout(resolve, TIMINGS.transition * 1000));

      // Phase 5: Denormalization
      letters2.forEach((letter) => {
        if (letter.isPunctuation) {
          letter.originalLayer.style.opacity = "0";
        }
      });

      mapping.forEach(({ from, to }) => {
        if (to.isUppercase) {
          from.normalizedLayer.style.opacity = "0";
          from.originalLayer.style.opacity = "1";
        }
      });

      letters2.forEach((letter) => {
        if (letter.isPunctuation) {
          letter.originalLayer.style.opacity = "1";
        }
      });

      await new Promise((resolve) => setTimeout(resolve, TIMINGS.denormalization * 1000));

      clearInterval(progressInterval);
      setProgress(100);

      // Animation complete
      setTimeout(() => {
        setCurrentPhase("waiting");
        setIsPlaying(false);
        
        // Handle text cycling based on number of texts
        if (content.texts.length === 2) {
          // For 2 texts: alternate between them
          setCurrentTextIndex((prev) => prev === 0 ? 1 : 0);
        } else {
          // For 3+ texts: cycle through them
          setCurrentTextIndex((prev) => (prev + 1) % content.texts.length);
        }
        
        setProgress(0);
      }, TIMINGS.finalDisplay * 1000);

    } catch (error) {
      console.error("Animation error:", error);
      setIsPlaying(false);
      setProgress(0);
    }
  };

  // Initialize with proper timing
  useEffect(() => {
    if (!containerRef.current || content.texts.length === 0 || !containerDimensions.width) return;

    // Add a small delay to ensure container is fully rendered
    const initTimeout = setTimeout(() => {
      const { fromText } = getCurrentTexts();

      try {
        containerRef.current.innerHTML = "";
        const typography = calculateTypography();
        if (!typography) return;

        const letters1 = createLetterElements(fromText, "text1", containerRef.current, typography);
        setIsInitialized(true);
      } catch (error) {
        console.error("Error in initialization:", error);
      }
    }, 100);

    return () => clearTimeout(initTimeout);
  }, [currentTextIndex, content.texts, containerDimensions]);

  // Handle play button
  const startAnimation = () => {
    if (!isInitialized || isPlaying) return;
    
    setIsPlaying(true);
    runCSSAnimation();
  };

  // Get localized messages based on content language
  const getMessages = () => {
    const isEnglish = content.language === 'en';
    
    return {
      loading: isEnglish ? 'Loading texts...' : 'Cargando textos...',
      errorTitle: isEnglish ? 'Error loading texts' : 'Error al cargar los textos',
      retry: isEnglish ? 'Retry' : 'Reintentar',
      play: isEnglish ? 'Play' : 'Reproducir',
      aboutTitle: isEnglish ? 'About this animation' : 'Sobre esta animación',
      aboutText: isEnglish 
        ? 'This animation demonstrates the anagrammatic transformation between poetic texts. Each letter moves from its original position to its new location, revealing how the same letters can form completely different texts.'
        : 'Esta animación demuestra la transformación anagramática entre textos poéticos. Cada letra se mueve de su posición original a su nueva ubicación, revelando cómo las mismas letras pueden formar textos completamente diferentes.',
      aboutNote: isEnglish
        ? 'The texts maintain exactly the same inventory of letters, demonstrating the anagrammatic nature of the transformation.'
        : 'Los textos mantienen exactamente el mismo inventario de letras, demostrando la naturaleza anagramática de la transformación.',
      close: isEnglish ? 'Close' : 'Cerrar',
      jsRequired: isEnglish ? 'JavaScript Required' : 'JavaScript Requerido',
      jsMessage: isEnglish 
        ? 'This anagram visualizer requires JavaScript to function. Please enable JavaScript in your browser and reload the page.'
        : 'Este visualizador de anagramas requiere JavaScript para funcionar. Por favor, habilita JavaScript en tu navegador y recarga la página.'
    };
  };

  const getPhaseDescription = () => {
    const isEnglish = content.language === 'en';
    
    switch (currentPhase) {
      case "transforming":
        return isEnglish ? "Anagrammatic transformation in progress" : "Transformación anagramática en proceso";
      case "waiting":
        return isEnglish ? "Ready for next transformation" : "Listo para la siguiente transformación";
      default:
        return isEnglish ? "Ready to begin" : "Listo para comenzar";
    }
  };

  // Loading state
  if (isLoading) {
    const messages = getMessages();
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f9fa 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ 
            marginBottom: '1rem', 
            fontSize: '1.2rem' 
          }}>
            {messages.loading}
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e5e5',
            borderRadius: '50%',
            borderTopColor: '#007acc',
            animation: 'spin 1s ease-in-out infinite',
            margin: '0 auto'
          }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const messages = getMessages();
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f9fa 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#dc3545',
          maxWidth: '400px',
          padding: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>{messages.errorTitle}</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #007acc',
              background: '#007acc',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer'
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
    <div style={{
      width: "100%",
      height: "100vh",
      background: "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f9fa 100%)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Main Animation Container */}
      <div style={{
        position: "absolute",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 20px 100px", // Responsive padding that accounts for header/footer
      }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "1200px",
            position: "relative",
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e5e5e5",
            boxShadow: "0 4px 12px rgba(0, 122, 204, 0.1)",
            minHeight: "300px",
          }}
        />
      </div>

      {/* Header */}
      <div style={{
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        padding: "1.5rem",
        textAlign: "center",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e5e5e5",
      }}>
        <h1 style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: "600",
          color: "#1a1a1a",
          margin: "0 0 0.5rem 0",
        }}>
          {content.title}
        </h1>
        <p style={{
          color: "#666",
          fontStyle: "italic",
          margin: "0",
          fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
        }}>
          {content.subtitles[currentTextIndex] || `Transformación ${currentTextIndex + 1}`}
        </p>
      </div>

      {/* Controls Panel */}
      <div style={{
        position: "absolute",
        bottom: "0",
        left: "0",
        right: "0",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid #e5e5e5",
        padding: "1rem",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "900px",
          margin: "0 auto",
          flexWrap: "wrap",
          gap: "1rem",
        }}>
          {/* Left: Play Control */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={startAnimation}
              disabled={!isInitialized || isPlaying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                fontWeight: "500",
                fontSize: "1rem",
                border: "none",
                cursor: (isInitialized && !isPlaying) ? "pointer" : "not-allowed",
                background: (isInitialized && !isPlaying) ? "#007acc" : "#ccc",
                color: "#fff",
                transition: "all 0.3s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (isInitialized && !isPlaying) e.target.style.background = "#005a99";
              }}
              onMouseLeave={(e) => {
                if (isInitialized && !isPlaying) e.target.style.background = "#007acc";
              }}
            >
              <Play size={16} />
              {messages.play}
            </button>
          </div>

          {/* Center: Progress */}
          <div style={{ 
            flex: "1", 
            maxWidth: "300px", 
            margin: "0 1rem",
            minWidth: "200px"
          }}>
            <div style={{
              fontSize: "0.9rem",
              color: "#666",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}>
              {getPhaseDescription()}
            </div>
            <div style={{
              width: "100%",
              height: "4px",
              background: "#e5e5e5",
              borderRadius: "2px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${progress}%`,
                height: "100%",
                background: "#007acc",
                transition: "width 0.3s ease",
                borderRadius: "2px",
              }} />
            </div>
          </div>

          {/* Right: Info */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              borderRadius: "6px",
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

      {/* Info Panel */}
      {showInfo && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: "8px",
          padding: "2rem",
          maxWidth: "90vw",
          width: "500px",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 12px rgba(0, 122, 204, 0.1)",
          zIndex: 1000,
        }}>
          <h3 style={{
            marginTop: "0",
            marginBottom: "1rem",
            color: "#1a1a1a",
            fontSize: "1.4rem",
          }}>
            {messages.aboutTitle}
          </h3>
          <p style={{
            color: "#666",
            lineHeight: "1.6",
            margin: "0 0 1rem 0",
          }}>
            {messages.aboutText}
          </p>
          <p style={{
            color: "#666",
            lineHeight: "1.6",
            margin: "0 0 1.5rem 0",
            fontSize: "0.9rem",
            fontStyle: "italic",
          }}>
            {messages.aboutNote}
          </p>
          <button
            onClick={() => setShowInfo(false)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: "#007acc",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {messages.close}
          </button>
        </div>
      )}

      {/* CSS for loading spinner */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnagramTransformer;