import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, User, History, FolderKanban, Radar, Sparkles, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Trimmed top nav: Signal + Sketchpad only. Portfolio/Dashboard/Sign-out
// live in the avatar popover on the right.
const navLinks: { label: string; href: string; route: string; icon: typeof Radar }[] = [
  { label: "Signal", href: "/signal", route: "/signal", icon: Radar },
  { label: "Sketchpad", href: "/simulate", route: "/simulate", icon: Sparkles },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
  };

  const go = (route: string) => {
    setMobileOpen(false);
    setMenuOpen(false);
    navigate(route);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-sm border-b border-border" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate("/"); }}
          className="font-display text-lg font-black text-foreground tracking-tight"
        >
          VibeCo
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.route);
            const Icon = link.icon;
            return (
              <button
                key={link.href}
                onClick={() => go(link.route)}
                className={`text-sm transition-colors duration-200 flex items-center gap-1.5 ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={12} />
                {link.label}
              </button>
            );
          })}

          {/* Auth/menu */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                aria-label="Account menu"
              >
                <User size={14} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-border bg-popover shadow-xl py-1.5"
                  >
                    <button onClick={() => go("/portfolio")} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-secondary transition-colors text-left">
                      <FolderKanban size={14} /> Portfolio
                    </button>
                    <button onClick={() => go("/my-simulations")} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-secondary transition-colors text-left">
                      <History size={14} /> Dashboard
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left">
                      <LogOut size={14} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => go("/auth")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <User size={12} />
              Sign In
            </button>
          )}

          {/* Primary CTA — Signal is the product. */}
          <button
            onClick={() => navigate("/signal")}
            className="font-display text-sm font-semibold px-5 py-2.5 rounded-full bg-violet text-violet-foreground hover:brightness-110 transition-all duration-300 flex items-center gap-2"
          >
            <Radar size={14} />
            Open Signal
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-background border-b border-border px-6 pb-6"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => go(link.route)}
                  className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <Icon size={13} />
                  {link.label}
                </button>
              );
            })}
            {user ? (
              <>
                <button onClick={() => go("/portfolio")} className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground w-full text-left">
                  <FolderKanban size={13} /> Portfolio
                </button>
                <button onClick={() => go("/my-simulations")} className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground w-full text-left">
                  <History size={13} /> Dashboard
                </button>
                <button onClick={handleSignOut} className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground w-full text-left">
                  <LogOut size={13} /> Sign out
                </button>
              </>
            ) : (
              <button onClick={() => go("/auth")} className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground w-full text-left">
                <User size={13} /> Sign in
              </button>
            )}
            <button
              onClick={() => go("/signal")}
              className="flex items-center justify-center gap-2 mt-3 font-display font-semibold text-sm bg-violet text-violet-foreground px-4 py-2.5 rounded-full text-center w-full"
            >
              <Radar size={14} />
              Open Signal
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
