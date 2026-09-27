import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export default function CashflowHero({ onEnter }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    const mouse = { x: null, y: null, radius: 180 };
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    const createParticles = () => {
      particles = [];
      const count = (canvas.width * canvas.height) / 9000;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          dx: Math.random() * 0.4 - 0.2,
          dy: Math.random() * 0.4 - 0.2,
          size: Math.random() * 2 + 1,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius && distance > 0) {
            const force = (mouse.radius - distance) / mouse.radius;
            p.x -= (dx / distance) * force * 5;
            p.y -= (dy / distance) * force * 5;
          }
        }

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80, 210, 255, 0.85)";
        ctx.fill();
      });

      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = dx * dx + dy * dy;
          if (distance < 18000) {
            const opacity = 1 - distance / 18000;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.strokeStyle = `rgba(80, 190, 255, ${opacity})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    const mouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const mouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseout", mouseLeave);

    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseout", mouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#030712", color: "white", overflowX: "hidden", fontFamily: "Inter, sans-serif" }}>
      {/* HERO SECTION */}
      <section style={{ position: "relative", height: "100vh", minHeight: "700px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 15%, rgba(3,7,18,0.35) 60%, rgba(3,7,18,0.95) 100%)" }} />

        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: "1000px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "99px", border: "1px solid rgba(34, 211, 238, 0.3)", background: "rgba(34, 211, 238, 0.1)", padding: "8px 16px", backdropFilter: "blur(12px)", marginBottom: "24px" }}
          >
            <Sparkles size={16} color="#67e8f9" />
            <span style={{ fontSize: "14px", color: "#cffafe", fontWeight: 500 }}>Your Personal Cashflow Agent</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
              <div style={{ width: "80px", height: "80px", color: "#22d3ee" }}>
                <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }} fill="none">
                  <path d="M18 72L30 42C34 32 42 26 54 26H78" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
                  <path d="M82 28L70 58C66 68 58 74 46 74H22" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
                  <circle cx="52" cy="48" r="7" fill="currentColor" />
                  <circle cx="34" cy="64" r="7" fill="currentColor" />
                </svg>
              </div>
              <h1 style={{ fontSize: "clamp(3rem, 7vw, 6rem)", fontWeight: 900, margin: 0, letterSpacing: "-2px", background: "linear-gradient(to right, #ffffff, #cffafe, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                EQUII
              </h1>
            </div>
            <p style={{ marginTop: "12px", fontSize: "clamp(1.2rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "3px", color: "#22d3ee" }}>
              AI CASHFLOW GUARDIAN
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: "24px", maxWidth: "650px", marginInline: "auto", fontSize: "18px", color: "#cbd5e1", lineHeight: "1.6", fontWeight: 300 }}
          >
            Know how much you can safely spend today before your money runs low.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            style={{ marginTop: "32px", display: "inline-flex", alignItems: "center", gap: "10px", borderRadius: "14px", background: "#22d3ee", padding: "16px 32px", fontSize: "16px", fontWeight: 700, color: "#030712", border: "none", cursor: "pointer", boxShadow: "0 10px 25px -5px rgba(34, 211, 238, 0.4)" }}
          >
            Get Started
            <ArrowRight size={20} />
          </motion.button>
          
          <p style={{ marginTop: "16px", fontSize: "12px", color: "#64748b", letterSpacing: "1px" }}>Demo prototype • Secure local simulation</p>
        </div>
      </section>

      {/* WHAT IT DOES SECTION */}
      <section style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 60px auto" }}>
          <p style={{ color: "#22d3ee", fontSize: "13px", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" }}>What It Does</p>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginTop: "10px", lineHeight: "1.2" }}>Your money. Your future. One clear picture.</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "28px" }}>
          <InfoCard icon={<IndianRupee size={22} />} title="Understand Your Money" text="Track salary, stipend, freelance income, and family transfers seamlessly." />
          <InfoCard icon={<TrendingUp size={22} />} title="Predict Your Cashflow" text="Look ahead across 7, 14, and 30 days to anticipate future balance changes." />
          <InfoCard icon={<ShieldCheck size={22} />} title="Protect Your Spending" text="Calculate your safe-to-spend limit and spot shortfalls before they happen." />
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section style={{ padding: "120px 24px", textAlign: "center", background: "linear-gradient(to top, rgba(8, 51, 68, 0.2), transparent)" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 900, letterSpacing: "-1px" }}>Spend with confidence.</h2>
          <p style={{ marginTop: "20px", fontSize: "18px", color: "#94a3b8" }}>Let AI understand your cashflow before your next spending decision.</p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            style={{ marginTop: "40px", display: "inline-flex", alignItems: "center", gap: "10px", borderRadius: "14px", background: "#22d3ee", padding: "18px 36px", fontSize: "16px", fontWeight: 700, color: "#030712", border: "none", cursor: "pointer", boxShadow: "0 20px 30px -10px rgba(34, 211, 238, 0.3)" }}
          >
            Enter Cashflow Guardian
            <ArrowRight size={20} />
          </motion.button>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      style={{ borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255, 255, 255, 0.02)", backdropFilter: "blur(8px)", padding: "32px", transition: "border-color 0.2s" }}
      onMouseOver={(e) => e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.4)"}
      onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"}
    >
      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(34, 211, 238, 0.1)", color: "#22d3ee", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>{title}</h3>
      <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6" }}>{text}</p>
    </motion.div>
  );
}