// app/page.js
'use client';

import Link from 'next/link';
import { Store, ShoppingCart, Users, ArrowRight, Zap, Shield, Star } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#0a0a0a', minHeight: '100vh', color: '#f0ece4', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .page { font-family: 'DM Sans', sans-serif; background: #080808; min-height: 100vh; color: #f0ece4; }

        /* NAV */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.2rem 4rem;
          background: rgba(8,8,8,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nav-logo { display: flex; align-items: center; gap: 0.6rem; }
        .nav-logo-icon { width: 32px; height: 32px; background: #c8a96e; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .nav-logo-text { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; color: #f0ece4; }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-link { color: rgba(240,236,228,0.6); text-decoration: none; font-size: 0.875rem; font-weight: 400; letter-spacing: 0.02em; transition: color 0.2s; }
        .nav-link:hover { color: #f0ece4; }
        .nav-cta {
          background: #c8a96e; color: #080808; padding: 0.55rem 1.4rem;
          border-radius: 4px; text-decoration: none; font-size: 0.875rem;
          font-weight: 500; letter-spacing: 0.01em; transition: all 0.2s;
        }
        .nav-cta:hover { background: #d4b87a; transform: translateY(-1px); }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column; justify-content: center;
          padding: 8rem 4rem 4rem;
          position: relative;
        }
        .hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 60% 50% at 70% 40%, rgba(200,169,110,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 20% 80%, rgba(200,169,110,0.06) 0%, transparent 50%);
        }
        .hero-grid {
          position: absolute; inset: 0; z-index: 0; opacity: 0.03;
          background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .hero-content { position: relative; z-index: 1; max-width: 760px; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(200,169,110,0.1); border: 1px solid rgba(200,169,110,0.25);
          color: #c8a96e; padding: 0.35rem 0.9rem; border-radius: 100px;
          font-size: 0.78rem; font-weight: 500; letter-spacing: 0.08em;
          text-transform: uppercase; margin-bottom: 2rem;
          animation: fadeUp 0.6s ease both;
        }
        .hero-dot { width: 6px; height: 6px; background: #c8a96e; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(3rem, 6vw, 5.5rem);
          font-weight: 900; line-height: 1.05;
          letter-spacing: -0.03em; margin-bottom: 1.5rem;
          animation: fadeUp 0.7s 0.1s ease both;
        }
        .hero-title-gold { color: #c8a96e; }
        .hero-subtitle {
          font-size: 1.125rem; color: rgba(240,236,228,0.55);
          line-height: 1.7; max-width: 520px; margin-bottom: 3rem;
          font-weight: 300; animation: fadeUp 0.7s 0.2s ease both;
        }
        .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; animation: fadeUp 0.7s 0.3s ease both; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: #c8a96e; color: #080808;
          padding: 0.85rem 2rem; border-radius: 4px;
          text-decoration: none; font-weight: 500; font-size: 0.95rem;
          transition: all 0.2s; letter-spacing: 0.01em;
        }
        .btn-primary:hover { background: #d4b87a; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(200,169,110,0.25); }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: transparent; color: #f0ece4;
          border: 1px solid rgba(240,236,228,0.2);
          padding: 0.85rem 2rem; border-radius: 4px;
          text-decoration: none; font-weight: 400; font-size: 0.95rem;
          transition: all 0.2s;
        }
        .btn-secondary:hover { border-color: rgba(240,236,228,0.5); background: rgba(240,236,228,0.05); transform: translateY(-2px); }

        /* STATS */
        .stats-bar {
          position: relative; z-index: 1;
          display: flex; gap: 3rem; margin-top: 5rem;
          padding-top: 3rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          animation: fadeUp 0.7s 0.4s ease both;
        }
        .stat-item {}
        .stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: #c8a96e; }
        .stat-label { font-size: 0.8rem; color: rgba(240,236,228,0.4); letter-spacing: 0.05em; text-transform: uppercase; margin-top: 0.2rem; }

        /* FEATURES */
        .section { padding: 7rem 4rem; position: relative; }
        .section-label {
          font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase;
          color: #c8a96e; margin-bottom: 1rem; font-weight: 500;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem); font-weight: 700;
          letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 4rem;
          max-width: 480px;
        }

        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.07); }
        .feature-card {
          background: #0d0d0d; padding: 2.5rem;
          transition: background 0.3s;
        }
        .feature-card:hover { background: #111; }
        .feature-icon {
          width: 44px; height: 44px; border-radius: 8px;
          background: rgba(200,169,110,0.1); border: 1px solid rgba(200,169,110,0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.5rem; color: #c8a96e;
        }
        .feature-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem; }
        .feature-text { font-size: 0.875rem; color: rgba(240,236,228,0.5); line-height: 1.7; font-weight: 300; }

        /* HOW IT WORKS */
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; margin-top: 4rem; }
        .step { position: relative; }
        .step-num {
          font-family: 'Playfair Display', serif; font-size: 3.5rem; font-weight: 900;
          color: rgba(200,169,110,0.12); line-height: 1; margin-bottom: 1rem;
        }
        .step-title { font-weight: 500; margin-bottom: 0.5rem; font-size: 0.95rem; }
        .step-text { font-size: 0.825rem; color: rgba(240,236,228,0.45); line-height: 1.6; font-weight: 300; }
        .step-line {
          position: absolute; top: 1.75rem; left: calc(100% + 1rem);
          width: calc(100% - 2rem); height: 1px;
          background: linear-gradient(90deg, rgba(200,169,110,0.3), transparent);
        }
        .step:last-child .step-line { display: none; }

        /* CTA SECTION */
        .cta-section {
          margin: 0 4rem 7rem;
          background: linear-gradient(135deg, rgba(200,169,110,0.08) 0%, rgba(200,169,110,0.03) 100%);
          border: 1px solid rgba(200,169,110,0.15);
          border-radius: 8px; padding: 4rem;
          display: flex; justify-content: space-between; align-items: center;
          gap: 2rem;
        }
        .cta-text { max-width: 480px; }
        .cta-title { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; }
        .cta-sub { font-size: 0.9rem; color: rgba(240,236,228,0.5); line-height: 1.6; font-weight: 300; }
        .cta-actions { display: flex; gap: 1rem; flex-shrink: 0; }

        /* FOOTER */
        .footer {
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 2.5rem 4rem;
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-brand { font-family: 'Playfair Display', serif; font-size: 0.95rem; color: rgba(240,236,228,0.4); }
        .footer-links { display: flex; gap: 2rem; }
        .footer-link { color: rgba(240,236,228,0.35); text-decoration: none; font-size: 0.8rem; transition: color 0.2s; }
        .footer-link:hover { color: rgba(240,236,228,0.7); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .nav { padding: 1rem 1.5rem; }
          .hero { padding: 7rem 1.5rem 3rem; }
          .stats-bar { gap: 1.5rem; flex-wrap: wrap; }
          .features-grid { grid-template-columns: 1fr; }
          .steps { grid-template-columns: 1fr 1fr; }
          .step-line { display: none; }
          .section { padding: 4rem 1.5rem; }
          .cta-section { margin: 0 1.5rem 4rem; flex-direction: column; padding: 2.5rem; }
          .footer { flex-direction: column; gap: 1.5rem; padding: 2rem 1.5rem; text-align: center; }
        }
      `}</style>

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">
              <Store size={18} color="#080808" />
            </div>
            <span className="nav-logo-text">Teqbot</span>
          </div>
          <div className="nav-links">
            <Link href="/admin/login" className="nav-link">Admin</Link>
            <Link href="/vendor/login" className="nav-link">Vendor Login</Link>
            <Link href="/vendor/register" className="nav-cta">Become a Vendor</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-grid" />
          <div className="hero-content">
            <div className="hero-badge">
              <div className="hero-dot" />
              Ethiopia's Marketplace Platform
            </div>
            <h1 className="hero-title">
              Where Vendors<br />
              Meet <span className="hero-title-gold">Customers</span>
            </h1>
            <p className="hero-subtitle">
              A complete multi-vendor marketplace built for Ethiopia.
              Vendors manage their business online, customers order seamlessly
              through Telegram — all in one connected platform.
            </p>
            <div className="hero-actions">
              <Link href="/vendor/register" className="btn-primary">
                Start Selling <ArrowRight size={16} />
              </Link>
              <a href="https://t.me/Teq2Bot" target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Order via Telegram
              </a>
            </div>
            <div className="stats-bar">
              <div className="stat-item">
                <div className="stat-num">3+</div>
                <div className="stat-label">Vendor Categories</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">24/7</div>
                <div className="stat-label">Bot Availability</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">100%</div>
                <div className="stat-label">Free to Register</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" style={{ paddingTop: '2rem' }}>
          <div className="section-label">What We Offer</div>
          <div className="section-title">Everything you need to run a marketplace</div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Store size={20} /></div>
              <div className="feature-title">Vendor Dashboard</div>
              <p className="feature-text">Full business management — products, orders, quotes, payments, and customer communication in one place.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><ShoppingCart size={20} /></div>
              <div className="feature-title">Telegram Ordering</div>
              <p className="feature-text">Customers place orders through a smart Telegram bot. No app to download, no account to create — just chat and order.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Shield size={20} /></div>
              <div className="feature-title">Admin Control</div>
              <p className="feature-text">Full admin panel to approve vendors, monitor orders, manage users, and oversee the entire marketplace.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Zap size={20} /></div>
              <div className="feature-title">Real-Time Updates</div>
              <p className="feature-text">Instant notifications when orders come in, quotes are accepted, or customers send messages.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Users size={20} /></div>
              <div className="feature-title">Multi-Category</div>
              <p className="feature-text">Supports retail, food, construction, manufacturing, and general vendors — each with tailored order flows.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Star size={20} /></div>
              <div className="feature-title">Bilingual Support</div>
              <p className="feature-text">Full English and Amharic support throughout the platform and Telegram bot for local customers.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" style={{ paddingTop: '2rem' }}>
          <div className="section-label">Process</div>
          <div className="section-title">How it works</div>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-title">Vendor Registers</div>
              <p className="step-text">Business signs up, submits details, and gets approved by admin within 24 hours.</p>
              <div className="step-line" />
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-title">List Products</div>
              <p className="step-text">Vendors add products, set prices, and configure their storefront from the dashboard.</p>
              <div className="step-line" />
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-title">Customer Orders</div>
              <p className="step-text">Buyers find the vendor's Telegram link and place orders directly through the bot.</p>
              <div className="step-line" />
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-title">Vendor Fulfills</div>
              <p className="step-text">Order is confirmed, payment received, and the product is delivered to the customer.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="cta-section">
          <div className="cta-text">
            <div className="cta-title">Ready to grow your business?</div>
            <p className="cta-sub">Join the platform and start reaching customers across Ethiopia through Telegram today. Registration is completely free.</p>
          </div>
          <div className="cta-actions">
            <Link href="/vendor/register" className="btn-primary">
              Register as Vendor <ArrowRight size={16} />
            </Link>
            <Link href="/admin/login" className="btn-secondary">
              Admin Login
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-brand">© 2024 Teqbot. All rights reserved.</div>
          <div className="footer-links">
            <a href="mailto:support@platform.com" className="footer-link">support@platform.com</a>
            <a href="https://t.me/Teq2Bot" className="footer-link">Telegram Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
}