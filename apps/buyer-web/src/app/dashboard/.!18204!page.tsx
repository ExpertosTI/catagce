'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Plus, Package, FileText, LayoutGrid,
  Settings, Home, ShoppingCart, LogIn, Camera, Maximize2,
  ChevronRight, ExternalLink, X, Bell, LogOut, BarChart3,
  Box, ArrowRight, Zap, Globe, ArrowLeft, Lock, Mail
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop';

type Tab = 'home' | 'products' | 'catalogs' | 'orders' | 'settings';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catagce_token');
}

async function fetchWithAuth(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ── UI Components ─────────────────────────────────────────── */

function LogoMark() {
  return (
    <div className="relative w-10 h-10 bg-[#00D1FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-transform hover:rotate-12">
      <Box className="text-black w-6 h-6" />
    </div>
  );
}

function NavItem({
  icon, label, active = false, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl ${
        active ? 'text-[#00D1FF]' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-[#00D1FF]/10 shadow-[0_0_20px_rgba(0,209,255,0.1)]' : ''}`}>
        {icon}
      </div>
      <span className="font-rajdhani text-[9px] font-bold uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00D1FF] rounded-full shadow-[0_0_10px_#00D1FF]"
        />
      )}
    </button>
  );
}

