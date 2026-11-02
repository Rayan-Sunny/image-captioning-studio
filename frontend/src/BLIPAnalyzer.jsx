import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SAMPLE_IMAGES = [
  {
    id: "dog",
    title: "Golden Dog",
    category: "Wildlife",
    url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "city",
    title: "City Sunset",
    category: "Urban",
    url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "coffee",
    title: "Cozy Coffee",
    category: "Still Life",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "nature",
    title: "Alpine Ridge",
    category: "Landscape",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  },
];

const PRESET_PREFIXES = [
  { label: "📸 A photo of", value: "a photo of" },
  { label: "🌅 A scene of", value: "a scene of" },
  { label: "🔍 There is", value: "there is" },
  { label: "🎨 A close-up shot of", value: "a close-up shot of" },
  { label: "✨ Detailed description of", value: "a detailed photo showing" },
];

function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed("");
    setIsDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setIsDone(true);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span>
      {displayed}
      {!isDone && (
        <span
          style={{
            display: "inline-block",
            width: "3px",
            height: "1em",
            backgroundColor: "#818cf8",
            marginLeft: "4px",
            verticalAlign: "text-bottom",
            animation: "cursorBlink 0.7s step-end infinite",
          }}
        />
      )}
    </span>
  );
}

export default function BLIPAnalyzer() {
  const [image, setImage] = useState(null);
  const [promptMode, setPromptMode] = useState("unconditional"); // 'unconditional' | 'guided'
  const [customPrompt, setCustomPrompt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showArch, setShowArch] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [latency, setLatency] = useState(null);
  const fileInputRef = useRef();

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage({ file, url: URL.createObjectURL(file), name: file.name });
    setResult(null);
    setError(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const loadSample = async (sample) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], `${sample.id}.jpg`, { type: "image/jpeg" });
      setImage({ file, url: URL.createObjectURL(file), name: sample.title });
      setResult(null);
    } catch (err) {
      setError("Unable to load sample image. Please upload a file manually.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result?.caption) return;
    navigator.clipboard.writeText(result.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const speakCaption = () => {
    if (!result?.caption || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.caption);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const downloadReport = () => {
    if (!result) return;
    const data = {
      imageName: image?.name,
      caption: result.caption,
      mode: result.mode,
      model: result.model,
      encoder: result.encoder,
      decoder: result.decoder,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caption-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCaption = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = performance.now();

    const fd = new FormData();
    fd.append("image", image.file);
    const promptToSend = promptMode === "guided" ? customPrompt : "";
    fd.append("prompt", promptToSend);

    try {
      const res = await fetch(`${API_BASE_URL}/caption`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        throw new Error(`Inference API error: HTTP ${res.status}`);
      }

      const data = await res.json();
      const elapsed = Math.round(performance.now() - t0);
      setLatency(elapsed);
      setResult(data);
      setHistory((prev) => [
        { ...data, imageUrl: image.url, imageName: image.name, latency: elapsed, date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ...prev.slice(0, 5),
      ]);
    } catch (err) {
      if (err.message.includes("fetch") || err.name === "TypeError") {
        setError(`Unable to connect to backend at ${API_BASE_URL}. Ensure your server is active.`);
      } else {
        setError(err.message || "Failed to generate caption.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Top Navigation Bar ── */}
      <nav
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(11, 15, 25, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Logo & Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm)",
                background: "var(--primary-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                  VisionCaption Studio
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "var(--primary-light)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  BLIP v2
                </span>
              </div>
            </div>
          </div>

          {/* Model Status Pill & Telemetry */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.25)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 8px #4ade80",
                }}
              />
              <span style={{ fontSize: 12, color: "#86efac", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                ViT-B/16 + BERT Decoder Active
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Workspace ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 1.5rem 4rem", flex: 1, width: "100%" }}>
        
        {/* Workspace Intro Hero Banner */}
        <div style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Multimodal Vision-Language <span style={{ background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Workspace</span>
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 640, lineHeight: 1.6 }}>
              Extract deep visual embeddings from any image via Vision Transformer patches and decode natural language descriptions autoregressively.
            </p>
          </div>

          <button
            onClick={() => setShowArch(!showArch)}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              background: showArch ? "var(--bg-surface-3)" : "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              color: showArch ? "var(--primary-light)" : "var(--text-muted)",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <span>{showArch ? "Hide Architecture Flow" : "View Architecture Flow"}</span>
            <span>{showArch ? "▴" : "▾"}</span>
          </button>
        </div>

        {/* ── Architecture Pipeline Drawer (Expandable) ── */}
        {showArch && (
          <div
            className="studio-card"
            style={{
              padding: "20px 24px",
              marginBottom: "2rem",
              background: "rgba(15, 20, 32, 0.9)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              animation: "fadeInUp 0.3s ease",
            }}
          >
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary-light)", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 600 }}>
              DEEP LEARNING INFERENCE PIPELINE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {[
                {
                  step: "01",
                  title: "Spatial Patch Projection",
                  desc: "Input image is resized to 384×384 and divided into 16×16 non-overlapping visual patches.",
                  tech: "ViT-B/16 Encoder",
                },
                {
                  step: "02",
                  title: "Cross-Attention Fusion",
                  desc: "Visual sequence tokens act as Keys and Values in multimodal decoder cross-attention layers.",
                  tech: "Multi-Head Attention",
                },
                {
                  step: "03",
                  title: "Beam Search Decoding",
                  desc: "BERT-initialized text decoder auto-regressively predicts next token probabilities with 5 active beams.",
                  tech: "Length-Normalized Beam Search",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    padding: "14px 16px",
                    background: "var(--bg-surface-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary-light)", fontWeight: 700 }}>
                      STAGE {item.step}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.tech}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Studio Split Deck ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, alignItems: "stretch", marginBottom: "2.5rem" }}>
          
          {/* ═════════════════════════════════════════ */}
          {/* LEFT COLUMN: Visual Input Deck          */}
          {/* ═════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Visual Dropzone Card */}
            <div className="studio-card" style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2.2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Visual Input Deck
                </span>
                {image && (
                  <span style={{ fontSize: 11, color: "var(--text-subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {image.name}
                  </span>
                )}
              </div>

              {/* Drop / Preview Canvas */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                style={{
                  minHeight: 310,
                  flex: 1,
                  borderRadius: "var(--radius-md)",
                  border: `2px dashed ${dragging ? "var(--primary)" : image ? "transparent" : "rgba(255, 255, 255, 0.12)"}`,
                  background: dragging ? "rgba(99, 102, 241, 0.08)" : "var(--bg-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {image ? (
                  <div style={{ position: "relative", width: "100%", height: 310 }}>
                    <img
                      src={image.url}
                      alt="Uploaded visual"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(8, 11, 17, 0.7)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Click or drag to replace image
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 20px" }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>
                      Drop visual asset here, or browse
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                      PNG, JPG, JPEG, WEBP · Auto-scaled to 384px ViT patches
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Quick-Test Gallery Shelves */}
            <div className="studio-card" style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-subtle)", marginBottom: 10, letterSpacing: "0.06em" }}>
                1-CLICK SAMPLE ASSETS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {SAMPLE_IMAGES.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => loadSample(sample)}
                    style={{
                      cursor: loading ? "not-allowed" : "pointer",
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      border: "1px solid var(--border-subtle)",
                      position: "relative",
                      aspectRatio: "1",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.03)";
                      e.currentTarget.style.borderColor = "var(--primary-light)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                    }}
                  >
                    <img
                      src={sample.url}
                      alt={sample.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        insetInline: 0,
                        padding: "4px 6px",
                        background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {sample.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Large Generate Action Button */}
            <button
              className="studio-btn-primary"
              onClick={generateCaption}
              disabled={!image || loading}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.65s linear infinite",
                    }}
                  />
                  <span>Computing Cross-Attention & Tokens...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Execute BLIP Inference</span>
                </>
              )}
            </button>
          </div>

          {/* ═════════════════════════════════════════ */}
          {/* RIGHT COLUMN: Inference & Output Deck    */}
          {/* ═════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Inference Conditioning Controls */}
            <div className="studio-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
                  Decoding Strategy & Conditioning
                </span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary-light)" }}>
                  BERT-LM Decoder
                </span>
              </div>

              {/* Mode Switcher Tabs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  background: "var(--bg-surface-2)",
                  padding: 4,
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 14,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  onClick={() => {
                    setPromptMode("unconditional");
                    setResult(null);
                  }}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "var(--radius-xs)",
                    border: "none",
                    background: promptMode === "unconditional" ? "var(--bg-surface-3)" : "transparent",
                    color: promptMode === "unconditional" ? "var(--text-main)" : "var(--text-subtle)",
                    fontWeight: promptMode === "unconditional" ? 600 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Unconditional (Free Description)
                </button>
                <button
                  onClick={() => {
                    setPromptMode("guided");
                    setResult(null);
                  }}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "var(--radius-xs)",
                    border: "none",
                    background: promptMode === "guided" ? "var(--bg-surface-3)" : "transparent",
                    color: promptMode === "guided" ? "var(--text-main)" : "var(--text-subtle)",
                    fontWeight: promptMode === "guided" ? 600 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Guided Conditioning (Prefix)
                </button>
              </div>

              {/* Conditional Input Box */}
              {promptMode === "guided" && (
                <div style={{ animation: "fadeInUp 0.25s ease" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {PRESET_PREFIXES.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCustomPrompt(p.value);
                          setResult(null);
                        }}
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full)",
                          background: customPrompt === p.value ? "rgba(99, 102, 241, 0.2)" : "var(--bg-surface-2)",
                          border: `1px solid ${customPrompt === p.value ? "var(--border-glow)" : "var(--border-subtle)"}`,
                          color: customPrompt === p.value ? "var(--primary-light)" : "var(--text-muted)",
                          cursor: "pointer",
                          transition: "all 0.14s ease",
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <input
                    value={customPrompt}
                    onChange={(e) => {
                      setCustomPrompt(e.target.value);
                      setResult(null);
                    }}
                    placeholder='Type custom prefix prompt (e.g., "a close-up photograph of")...'
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-main)",
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                  />
                </div>
              )}
            </div>

            {/* Generated Output Showcase Card */}
            <div
              className="studio-card"
              style={{
                padding: 20,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                border: result ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-subtle)",
                boxShadow: result ? "var(--shadow-glow)" : "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.08em",
                    color: result ? "var(--primary-light)" : "var(--text-subtle)",
                    fontWeight: 600,
                  }}
                >
                  {result ? `DECODED OUTPUT · ${result.mode.toUpperCase()}` : "DECODED INFERENCE OUTPUT"}
                </span>

                {result && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Copy Button */}
                    <button
                      onClick={copyToClipboard}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius-xs)",
                        background: "var(--bg-surface-3)",
                        border: "1px solid var(--border-subtle)",
                        color: copied ? "#4ade80" : "var(--text-muted)",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>

                    {/* Speech TTS Button */}
                    <button
                      onClick={speakCaption}
                      title="Listen to generated description"
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius-xs)",
                        background: "var(--bg-surface-3)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                      Listen
                    </button>

                    {/* Download JSON Report */}
                    <button
                      onClick={downloadReport}
                      title="Export inference payload"
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius-xs)",
                        background: "var(--bg-surface-3)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Caption Display Zone */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 180,
                  padding: "16px 20px",
                  background: "var(--bg-surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: 16,
                }}
              >
                {loading ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "3px solid rgba(99, 102, 241, 0.2)",
                        borderTopColor: "var(--primary)",
                        animation: "spin 0.7s linear infinite",
                        margin: "0 auto 12px",
                      }}
                    />
                    <div style={{ fontSize: 13, color: "var(--primary-light)", fontFamily: "'JetBrains Mono', monospace" }}>
                      Generating tokens using Beam Search (k=5)...
                    </div>
                  </div>
                ) : result ? (
                  <div>
                    <div
                      style={{
                        fontSize: "clamp(1.25rem, 2.5vw, 1.6rem)",
                        fontWeight: 600,
                        color: "var(--text-main)",
                        lineHeight: 1.45,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      "<TypewriterText text={result.caption} />"
                    </div>

                    {result.prompt && (
                      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
                          PREFIX CONDITION:
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(99, 102, 241, 0.15)",
                            color: "var(--primary-light)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          "{result.prompt}"
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-subtle)" }}>
                    <div style={{ marginBottom: 8, opacity: 0.5 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Awaiting inference execution</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>Select or drop an image and click Execute BLIP Inference</div>
                  </div>
                )}
              </div>

              {/* Error banner */}
              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              {/* Telemetry Footer Info */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-subtle)",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span>Encoder: ViT-B/16 (12 heads)</span>
                <span>{latency ? `Latency: ${latency}ms` : "Beams: 5 · Max: 50 tokens"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Generations Showcase Reel ── */}
        {history.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                Session History & Cache
              </span>
              <button
                onClick={() => setHistory([])}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-subtle)",
                  cursor: "pointer",
                }}
              >
                Clear Cache
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="studio-card"
                  style={{
                    padding: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setResult(item);
                    setImage({ url: item.imageUrl, name: item.imageName });
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt="history thumb"
                    style={{ width: 56, height: 56, borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-main)",
                        lineHeight: 1.4,
                        marginBottom: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      "{item.caption}"
                    </div>
                    <div style={{ display: "flex", gap: 6, fontSize: 10, color: "var(--text-subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>{item.latency}ms</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Studio Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(11, 15, 25, 0.6)",
          padding: "20px 24px",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: "var(--text-subtle)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <div>Salesforce BLIP Foundation Model · PyTorch & Transformers</div>
          <div>FastAPI Backend · React 18 Production Architecture</div>
        </div>
      </footer>
    </div>
  );
}
