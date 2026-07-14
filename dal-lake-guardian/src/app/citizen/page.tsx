"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import SideNav from "@/components/SideNav";
import {
  Map, ClipboardList, Droplets, User,
  Camera, MapPin, Tag, CheckCircle, AlertTriangle,
  XCircle, Zap, ShieldCheck, Crosshair, Video, RefreshCw,
  TrendingUp, Activity, Star, Award,
} from "lucide-react";
import { CATEGORIES, getTrustTier, isWithinDalBounds } from "@/lib/constants";

const DalLakeMap = dynamic(() => import("@/components/DalLakeMap"), { ssr: false });

// ─── Nav ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "report",   label: "Report Pollution",  Icon: Camera },
  { id: "map",      label: "Lake Heatmap",       Icon: Map },
  { id: "tracker",  label: "My Reports",         Icon: ClipboardList },
  { id: "health",   label: "Water Quality",      Icon: Droplets },
  { id: "profile",  label: "My Impact",          Icon: User },
];

// ─── Seed data ────────────────────────────────────────────────────────────

const MY_REPORTS = [
  { id: "DLG-1034", cat: "Plastic Waste",    status: "resolved",    date: "Jul 12", area: "Boulevard",   pts: 15, healthDelta: "+11",  geo: true },
  { id: "DLG-1021", cat: "Oil Spill",        status: "in_progress", date: "Jul 11", area: "Hazratbal",    pts: 10, healthDelta: null,    geo: true },
  { id: "DLG-1008", cat: "Dead Fish",        status: "assigned",    date: "Jul 10", area: "Lokut Dal",  pts: 10, healthDelta: null,    geo: true },
  { id: "DLG-0981", cat: "Encroachment",     status: "rejected",    date: "Jul 08", area: "Gagribal",     pts: -10, healthDelta: null,   geo: false, rejectReason: "Photo did not match Dal Lake environment" },
];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Pending Review",  cls: "badge-warning" },
  ai_review:   { label: "AI Validating",   cls: "badge-purple" },
  validated:   { label: "Validated",       cls: "badge-teal" },
  assigned:    { label: "Assigned",        cls: "badge-info" },
  in_progress: { label: "In Progress",     cls: "badge-info" },
  resolved:    { label: "Resolved ✓",      cls: "badge-healthy" },
  rejected:    { label: "Rejected",        cls: "badge-critical" },
};

// Water quality static data (simulated sensors)
const WQ_METRICS = [
  { label: "Dissolved Oxygen", val: "4.1 mg/L",  status: "Low",    bar: 52,  threshold: "Safe: >6.0 mg/L",   color: "#F59E0B" },
  { label: "Turbidity",        val: "68 NTU",     status: "Poor",   bar: 32,  threshold: "Good: <25 NTU",     color: "#EF4444" },
  { label: "pH Level",         val: "7.2",        status: "Good",   bar: 80,  threshold: "Safe: 6.5–8.5",     color: "#10B981" },
  { label: "Chlorophyll-a",    val: "42 μg/L",    status: "High",   bar: 42,  threshold: "Good: <15 μg/L",    color: "#F59E0B" },
  { label: "Water Quality Idx",val: "38/100",     status: "Poor",   bar: 38,  threshold: "Good: >70",          color: "#EF4444" },
];

// ─── Validation UI state type ─────────────────────────────────────────────

type ValidationState = "idle" | "checking" | "valid" | "invalid" | "partial";

interface ValidationResult {
  state:     ValidationState;
  message:   string;
  details?:  string;
  confidence?: number;
  features?: string[];
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CitizenPortal() {
  const [section, setSection]   = useState("report");

  // Report form
  const [category,    setCategory]    = useState("");
  const [description, setDescription] = useState("");
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoPreview,setPhotoPreview]= useState<string | null>(null);
  const [gpsCoords,   setGpsCoords]   = useState<{ lat: number; lon: number } | null>(null);
  const [location,    setLocation]    = useState<{ lat: number; lon: number } | null>(null);
  const [locationErr, setLocationErr] = useState<string>("");
  const [validation,  setValidation]  = useState<ValidationResult>({ state: "idle", message: "" });
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  // Camera state
  const [cameraOpen,   setCameraOpen]   = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraErr,    setCameraErr]    = useState<string>("");
  const [capturing,    setCapturing]    = useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Trust score for this citizen
  const trustScore = 72;
  const tier = getTrustTier(trustScore);
  const ecoPoints = 385;

  // Stop camera stream when component unmounts or camera closes
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach((t) => t.stop()); };
  }, [cameraStream]);

  // ── Open camera + grab GPS simultaneously ─────────────────────────────
  const openCamera = useCallback(async () => {
    setCameraErr("");
    setCameraOpen(true);

    // Grab GPS at the same time as we open the camera
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setGpsCoords(c);
          setLocation(c);
          if (!isWithinDalBounds(c.lat, c.lon)) {
            setValidation({
              state:   "invalid",
              message: "Location outside Dal Lake boundary",
              details: `GPS: ${c.lat.toFixed(4)}°N, ${c.lon.toFixed(4)}°E — outside monitored zone`,
            });
          } else {
            setValidation({
              state:   "partial",
              message: "GPS confirmed within Dal Lake",
              details: `${c.lat.toFixed(5)}°N, ${c.lon.toFixed(5)}°E · Photo validation runs on submit`,
            });
          }
        },
        () => setLocationErr("GPS unavailable — please enable location access"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraErr(
        err?.name === "NotAllowedError"
          ? "Camera access denied. Allow camera in browser settings."
          : "Camera unavailable on this device."
      );
      setCameraOpen(false);
    }
  }, []);

  // ── Capture frame + stamp GPS ─────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    setCapturing(true);

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stamp GPS coordinates onto the image
    if (gpsCoords) {
      const stamp = `📍 ${gpsCoords.lat.toFixed(5)}°N  ${gpsCoords.lon.toFixed(5)}°E`;
      ctx.font        = `bold ${Math.round(canvas.width * 0.018)}px monospace`;
      ctx.fillStyle   = "rgba(0,0,0,0.55)";
      ctx.fillRect(8, canvas.height - 36, ctx.measureText(stamp).width + 20, 30);
      ctx.fillStyle   = "#10B981";
      ctx.fillText(stamp, 18, canvas.height - 16);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `dal-report-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPhotoFile(file);
      setPhotoPreview(canvas.toDataURL("image/jpeg", 0.92));
      // Stop camera stream
      cameraStream?.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setCameraOpen(false);
      setCapturing(false);
    }, "image/jpeg", 0.92);
  }, [gpsCoords, cameraStream]);

  const retakePhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    openCamera();
  }, [openCamera]);

  // (GPS + camera combined above — legacy helpers removed)

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!category || !photoFile || !location) return;
    setSubmitting(true);

    // Simulate Gemini validation + backend submission
    await new Promise((r) => setTimeout(r, 1400));

    // Simulate ML validation result
    const geoValid = isWithinDalBounds(location.lat, location.lon);
    if (geoValid) {
      setValidation({
        state:      "valid",
        message:    "✓ Geo-validation passed — AI confirmed Dal Lake environment",
        details:    "Detected: Water surface, Kashmiri shoreline vegetation",
        confidence: 0.91,
        features:   ["Water body", "Mountain backdrop", "Dal Lake shoreline"],
      });
    }

    const newId = `DLG-${Math.floor(4000 + Math.random() * 999)}`;
    setSubmittedId(newId);
    setSubmitting(false);
    setSubmitted(true);
  }, [category, photoFile, location]);

  const resetForm = () => {
    setCategory(""); setDescription(""); setPhotoFile(null);
    setPhotoPreview(null); setLocation(null); setGpsCoords(null);
    setValidation({ state: "idle", message: "" });
    setSubmitted(false); setSubmittedId(""); setLocationErr("");
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null); setCameraOpen(false);
  };

  const canSubmit = category && photoFile && location && validation.state !== "invalid" && !submitting;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <SideNav role="citizen" items={NAV_ITEMS} activeSection={section} onSectionChange={setSection} />

      <main style={{ paddingLeft: 248, paddingTop: 60 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 28px 60px" }}>

          {/* ══ REPORT POLLUTION ══════════════════════════════════════════════ */}
          {section === "report" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700 }}>Report Pollution</h1>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Geo-validated photo required · AI detects waste type and assigns priority
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: 10, padding: "8px 14px" }}>
                  <Zap size={13} color="#F59E0B" />
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>Trust Score:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: trustScore >= 80 ? "#10B981" : "#F59E0B" }}>{trustScore}</span>
                  <span className={`badge ${tier.class}`} style={{ fontSize: "0.55rem" }}>{tier.badge}</span>
                </div>
              </div>

              {/* Success state */}
              {submitted ? (
                <div
                  className="glass-panel"
                  style={{ padding: 40, textAlign: "center", borderTop: "3px solid #10B981" }}
                >
                  <CheckCircle size={48} color="#10B981" style={{ margin: "0 auto 16px" }} />
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report Submitted Successfully</h2>
                  <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
                    Ticket <span style={{ fontFamily: "var(--font-mono)", color: "#0EA5E9", fontWeight: 700 }}>{submittedId}</span> created and routed to the nearest station.
                  </p>

                  {/* Validation result */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "6px 12px" }}>
                      <ShieldCheck size={13} color="#10B981" />
                      <span style={{ color: "#10B981" }}>Geo-validation passed · 91% confidence</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 8, padding: "6px 12px" }}>
                      <Zap size={13} color="#0EA5E9" />
                      <span style={{ color: "#0EA5E9" }}>+10 Eco Points earned</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button className="btn-primary" onClick={() => { resetForm(); setSection("tracker"); }}>View My Reports</button>
                    <button className="btn-secondary" onClick={resetForm}>Submit Another</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* STEP 1: Category */}
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0EA5E9", flexShrink: 0 }}>1</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Select Pollution Type</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          style={{
                            padding: "8px 10px",
                            fontSize: 11,
                            fontWeight: 500,
                            borderRadius: 8,
                            border: `1px solid ${category === cat ? "#0EA5E9" : "var(--border-dim)"}`,
                            background: category === cat ? "rgba(14,165,233,0.10)" : "var(--bg-void)",
                            color: category === cat ? "#0EA5E9" : "var(--text-muted)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            textAlign: "left",
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STEP 2: Geo-Camera — camera + GPS in one shot */}
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0EA5E9", flexShrink: 0 }}>2</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Capture Photo + GPS</div>
                      <div className="ai-badge" style={{ marginLeft: "auto" }}>📍 GPS stamped · 🤖 AI validated</div>
                    </div>

                    {/* Hidden canvas for frame capture */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    {/* Camera viewfinder */}
                    {cameraOpen && (
                      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", marginBottom: 12 }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }}
                        />
                        {/* GPS overlay on viewfinder */}
                        <div style={{
                          position: "absolute", bottom: 10, left: 10,
                          background: "rgba(0,0,0,.6)", borderRadius: 6, padding: "4px 10px",
                          fontSize: 10, fontFamily: "monospace", color: gpsCoords ? "#10B981" : "#F59E0B",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <Crosshair size={10} />
                          {gpsCoords
                            ? `${gpsCoords.lat.toFixed(5)}°N  ${gpsCoords.lon.toFixed(5)}°E`
                            : "Acquiring GPS…"}
                        </div>
                        {/* Capture button */}
                        <div style={{ position: "absolute", bottom: 10, right: 10 }}>
                          <button
                            onClick={capturePhoto}
                            disabled={capturing}
                            style={{
                              width: 54, height: 54, borderRadius: "50%",
                              background: capturing ? "rgba(14,165,233,.5)" : "rgba(14,165,233,.9)",
                              border: "3px solid #fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", boxShadow: "0 0 20px rgba(14,165,233,.5)",
                              transition: "all .15s",
                            }}
                          >
                            <Camera size={22} color="#fff" />
                          </button>
                        </div>
                        {/* Corner guides */}
                        {["top:0;left:0","top:0;right:0","bottom:0;left:0","bottom:0;right:0"].map((pos, i) => (
                          <div key={i} style={{
                            position: "absolute", ...Object.fromEntries(pos.split(";").map(p => p.split(":"))),
                            width: 24, height: 24,
                            borderTop: i < 2 ? "2px solid rgba(14,165,233,.7)" : undefined,
                            borderBottom: i >= 2 ? "2px solid rgba(14,165,233,.7)" : undefined,
                            borderLeft: i % 2 === 0 ? "2px solid rgba(14,165,233,.7)" : undefined,
                            borderRight: i % 2 === 1 ? "2px solid rgba(14,165,233,.7)" : undefined,
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Photo preview with GPS stamp */}
                    {photoPreview && (
                      <div style={{ position: "relative", marginBottom: 12 }}>
                        <img
                          src={photoPreview}
                          alt="Captured evidence"
                          style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border-dim)", display: "block" }}
                        />
                        {/* GPS badge on preview */}
                        {gpsCoords && (
                          <div style={{
                            position: "absolute", bottom: 10, left: 10,
                            background: "rgba(0,0,0,.65)", borderRadius: 6,
                            padding: "4px 10px", fontSize: 10, fontFamily: "monospace",
                            color: "#10B981", display: "flex", alignItems: "center", gap: 5,
                          }}>
                            <MapPin size={9} /> {gpsCoords.lat.toFixed(5)}°N · {gpsCoords.lon.toFixed(5)}°E
                          </div>
                        )}
                        {/* Validation badge */}
                        <div style={{ position: "absolute", top: 10, left: 10 }}>
                          {validation.state === "partial" && (
                            <div style={{ background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.4)", borderRadius: 6, padding: "3px 9px", fontSize: 10, color: "#10B981", fontWeight: 700 }}>
                              ● GPS Verified · Dal Lake
                            </div>
                          )}
                          {validation.state === "invalid" && (
                            <div style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.4)", borderRadius: 6, padding: "3px 9px", fontSize: 10, color: "#EF4444", fontWeight: 700 }}>
                              ✕ Outside Dal Lake boundary
                            </div>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                          <button
                            onClick={retakePhoto}
                            style={{ background: "rgba(0,0,0,.7)", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}
                          >
                            <RefreshCw size={12} /> Retake
                          </button>
                          <button
                            onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                            style={{ background: "rgba(0,0,0,.7)", border: "none", borderRadius: 6, padding: 6, cursor: "pointer", color: "#fff" }}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Open camera CTA (when nothing captured yet) */}
                    {!cameraOpen && !photoPreview && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
                        <button
                          onClick={openCamera}
                          className="btn-primary"
                          style={{ gap: 8, padding: "12px 28px", fontSize: 14 }}
                        >
                          <Video size={16} /> Open Camera
                        </button>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", maxWidth: 320 }}>
                          Opens your device's back camera · GPS coordinates are captured simultaneously and stamped on the photo
                        </div>
                        {cameraErr && (
                          <div style={{ fontSize: 12, color: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}>
                            <AlertTriangle size={12} /> {cameraErr}
                          </div>
                        )}
                        {locationErr && (
                          <div style={{ fontSize: 11, color: "#F59E0B", display: "flex", alignItems: "center", gap: 5 }}>
                            <MapPin size={11} /> {locationErr}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* end geo-camera step */}

                  {/* STEP 3: Description */}

                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0EA5E9", flexShrink: 0 }}>3</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Additional Details <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></div>
                    </div>
                    <textarea
                      className="form-textarea"
                      placeholder="Describe what you see — size, smell, estimated area affected, nearby landmarks..."
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Submit */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {!category && "← Select a pollution type"}{" "}
                      {!photoFile && category && "← Open camera to capture photo with GPS"}{" "}
                      {photoFile && !location && "← GPS not captured yet"}
                    </div>
                    <button
                      className="btn-primary"
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      style={{ gap: 8, minWidth: 180 }}
                    >
                      {submitting ? (
                        <><span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} /> Validating & Submitting...</>
                      ) : (
                        <><ShieldCheck size={14} /> Submit Geo-Validated Report</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ LAKE HEATMAP ══════════════════════════════════════════════════ */}
          {section === "map" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dal Lake Pollution Heatmap</h1>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Real-time view of reported incidents and sector health scores
                </p>
              </div>
              <DalLakeMap showHeatmap showComplaints showStations height="440px" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Active Reports",  val: "23",  color: "#EF4444" },
                  { label: "Resolved Today",  val: "18",  color: "#10B981" },
                  { label: "Critical Zones",  val: "2",   color: "#EF4444" },
                  { label: "Overall Health",  val: "58",  color: "#F59E0B" },
                ].map((m) => (
                  <div key={m.label} className="glass-panel" style={{ padding: 14, textAlign: "center" }}>
                    <div className="metric-label">{m.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: m.color }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ MY REPORTS ════════════════════════════════════════════════════ */}
          {section === "tracker" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Reports</h1>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Track the status of your submitted reports and their impact</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {MY_REPORTS.map((r) => {
                  const cfg = STATUS_CFG[r.status] ?? { label: r.status, cls: "badge-muted" };
                  return (
                    <div
                      key={r.id}
                      className="glass-panel"
                      style={{ padding: 18, display: "flex", alignItems: "center", gap: 16, borderLeft: `3px solid ${r.status === "resolved" ? "#10B981" : r.status === "rejected" ? "#EF4444" : "#0EA5E9"}` }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{r.id}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{r.cat}</span>
                          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                          {r.geo && <span className="badge badge-teal" style={{ fontSize: "0.55rem" }}>🛡️ Geo-Verified</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {r.area} · {r.date}
                          {r.rejectReason && (
                            <span style={{ color: "#EF4444", marginLeft: 8 }}>— {r.rejectReason}</span>
                          )}
                        </div>
                        {r.healthDelta && r.status === "resolved" && (
                          <div style={{ fontSize: 11, color: "#10B981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <TrendingUp size={11} />
                            Sector health improved by {r.healthDelta} points after cleanup
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 2 }}>Eco Points</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: r.pts >= 0 ? "#F59E0B" : "#EF4444" }}>
                          {r.pts >= 0 ? "+" : ""}{r.pts}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ WATER QUALITY ═════════════════════════════════════════════════ */}
          {section === "health" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>Water Quality Dashboard</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Predicted by Random Forest model · simulated sensors</p>
                  <div className="sim-label">📊 SIMULATED SENSOR DATA</div>
                </div>
              </div>

              {/* Central WQI */}
              <div className="glass-panel" style={{ padding: 24, display: "flex", alignItems: "center", gap: 24, borderTop: "3px solid #EF4444" }}>
                <div style={{ textAlign: "center", minWidth: 100 }}>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 4 }}>
                    WATER QUALITY INDEX
                  </div>
                  <div style={{ fontSize: 56, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#EF4444", lineHeight: 1 }}>38</div>
                  <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, marginTop: 4 }}>Very Poor</div>
                </div>
                <div style={{ width: 1, height: 64, background: "var(--border-dim)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#EF4444", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                    🚨 DANGER ZONE ALERT: Water contamination levels exceed safe thresholds. Swimmers & local consumers DO NOT enter or drink water from Hazratbal or Central Dal zones!
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    Dal Lake's overall water quality is <strong style={{ color: "#EF4444" }}>Very Poor</strong>.
                    High turbidity (68 NTU) and low dissolved oxygen (4.1 mg/L) are the primary drivers.
                    Algae bloom in Central Dal and West Shore sectors is the main contributing factor.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="ai-badge" style={{ display: "inline-flex" }}>🤖 RF Model Prediction · Updated hourly</div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {WQ_METRICS.map((m) => (
                  <div key={m.label} className="glass-panel" style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ minWidth: 160, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{m.label}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: m.color, minWidth: 90 }}>{m.val}</div>
                      <div style={{ flex: 1 }}>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${m.bar}%`, background: m.color }} />
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
                          padding: "3px 10px", borderRadius: 99, minWidth: 60, textAlign: "center",
                          background: m.status === "Good" ? "rgba(16,185,129,0.1)" : m.status === "Low" || m.status === "High" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                          color: m.status === "Good" ? "#10B981" : m.status === "Low" || m.status === "High" ? "#F59E0B" : "#EF4444",
                          border: `1px solid ${m.status === "Good" ? "rgba(16,185,129,0.2)" : m.status === "Low" || m.status === "High" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
                        }}
                      >
                        {m.status}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 120, textAlign: "right" }}>{m.threshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ LEADERBOARD & CITIZEN PORTAL ═══════════════════════════════════ */}
          {section === "profile" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700 }}>Eco-Guardian Leaderboard</h1>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Top contributors protecting Dal Lake. Earn points to rise in ranks!</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: 10, padding: "8px 14px" }}>
                  <Award size={13} color="#F59E0B" />
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>Your Rank:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#F59E0B" }}>#5</span>
                </div>
              </div>

              {/* Personal stats card */}
              <div className="glass-panel" style={{ padding: 24, borderTop: "3px solid #10B981", display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", minWidth: 100 }}>
                  <div className="metric-label">Trust Score</div>
                  <div style={{ fontSize: 44, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#10B981", lineHeight: 1 }}>{trustScore}</div>
                  <span className={`badge ${tier.class}`} style={{ marginTop: 6, display: "inline-flex" }}>{tier.badge}</span>
                </div>
                <div style={{ width: 1, height: 60, background: "var(--border-dim)" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px", flex: 1 }}>
                  {[
                    { label: "Reports Submitted",   val: "4",   icon: <ClipboardList size={13} color="#0EA5E9" /> },
                    { label: "Verified Reports",     val: "3",   icon: <ShieldCheck size={13} color="#10B981" /> },
                    { label: "Eco Points Balance",   val: ecoPoints.toLocaleString(), icon: <Zap size={13} color="#F59E0B" /> },
                    { label: "Ranks Claimed",        val: "Wetland Protector", icon: <Award size={13} color="#8B5CF6" /> },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {m.icon}
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{m.val}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catchy Leaderboard */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Award size={16} color="#F59E0B" /> Community Standings
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { rank: 1, name: "Zahid Mir (LAWDA Rep)", points: 980, title: "Eco-Warrior 👑", color: "#EF4444", isYou: false },
                    { rank: 2, name: "Ayesha Malik",          points: 850, title: "Dal Guardian 🛡️", color: "#8B5CF6", isYou: false },
                    { rank: 3, name: "Firdaus Bhat",          points: 720, title: "Lake Custodian ⚓", color: "#0EA5E9", isYou: false },
                    { rank: 4, name: "Tariq Wani",            points: 610, title: "Nigeen Savior 🌊", color: "#14B8A6", isYou: false },
                    { rank: 5, name: "You (Your Profile)",    points: 385, title: "Wetland Protector 🌱", color: "#F59E0B", isYou: true }
                  ].map((leader) => (
                    <div
                      key={leader.rank}
                      style={{
                        display: "flex", alignItems: "center", justifyItems: "space-between",
                        padding: "12px 16px", borderRadius: 8,
                        background: leader.isYou ? "rgba(245,158,11,0.08)" : "var(--bg-void)",
                        border: `1px solid ${leader.isYou ? "rgba(245,158,11,0.25)" : "var(--border-dim)"}`
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: leader.rank === 1 ? "rgba(239,68,68,0.15)" : "var(--border-soft)",
                          color: leader.rank === 1 ? "#EF4444" : "var(--text-secondary)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)"
                        }}>
                          {leader.rank}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: leader.isYou ? "#F59E0B" : "var(--text-primary)" }}>
                            {leader.name}
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Title: <strong>{leader.title}</strong></span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          {leader.points} pts
                        </div>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Eco telemeters</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust system explainer */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={16} color="#F59E0B" /> Citizen Trust System
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { tier: "🥇 Gold Tier",   range: "80–100", perks: "Instant acceptance, priority queue", color: "#10B981" },
                    { tier: "🥈 Silver Tier", range: "50–79",  perks: "Standard AI validation",      color: "#0EA5E9" },
                    { tier: "🥉 Bronze Tier", range: "20–49",  perks: "Additional validation",        color: "#F59E0B" },
                    { tier: "⚪ Copper Tier", range: "0–19",   perks: "Manual verification",          color: "#EF4444" },
                  ].map((t) => (
                    <div
                      key={t.tier}
                      style={{
                        padding: 14, borderRadius: 10,
                        background: trustScore >= parseInt(t.range.split("–")[0]) && trustScore <= parseInt(t.range.split("–")[1]) ? `${t.color}10` : "var(--bg-void)",
                        border: `1px solid ${trustScore >= parseInt(t.range.split("–")[0]) && trustScore <= parseInt(t.range.split("–")[1]) ? `${t.color}40` : "var(--border-dim)"}`,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: t.color, marginBottom: 4 }}>{t.tier}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Score: {t.range}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{t.perks}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, padding: 12, background: "var(--bg-void)", borderRadius: 10, border: "1px solid var(--border-dim)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
                  <strong style={{ color: "var(--text-secondary)" }}>How scores change:</strong>&nbsp;
                  +5 → Report AI-confirmed valid · +10 → Report leads to resolved cleanup ·
                  –10 → False report (geo-check failed) · –15 → Duplicate spam report
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
