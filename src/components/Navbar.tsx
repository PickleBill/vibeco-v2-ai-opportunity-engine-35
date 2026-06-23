import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, User, History, FolderKanban } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDiscoveryAudit } from "./discovery/DiscoveryAuditProvider";

const navLinks = [
  { label: "How it works", href: "#model" },
  { label: "Proofs", href: "#proofs" },
  { label: "Scan", href: "#scan" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openDiscovery } = useDiscoveryAudit();

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

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate("/" + href);
    } else {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </button>
          ))}

          {/* Auth */}
          {user ? (
            <>
              <a
                href="/portfolio"
                onClick={(e) => { e.preventDefault(); navigate("/portfolio"); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <FolderKanban size={12} />
                Portfolio
              </a>
              <a
                href="/my-simulations"
                onClick={(e) => { e.preventDefault(); navigate("/my-simulations"); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <History size={12} />
                Dashboard
              </a>
              <button
                onClick={handleSignOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <User size={12} />
                Sign Out
              </button>
            </>
          ) : (
            <a
              href="/auth"
              onClick={(e) => { e.preventDefault(); navigate("/auth"); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <User size={12} />
              Sign In
            </a>
          )}

          {/* Primary CTA */}
          <button
            onClick={openDiscovery}
            className="font-display text-sm font-semibold px-5 py-2.5 rounded-full bg-violet text-violet-foreground hover:brightness-110 transition-all duration-300 flex items-center gap-2"
          >
            Book a discovery audit
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
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block py-3 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                {link.label}
              </button>
            ))}
            {user ? (
              <>
                <a
                  href="/portfolio"
                  onClick={(e) => { e.preventDefault(); setMobileOpen(false); navigate("/portfolio"); }}
                  className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  <FolderKanban size={13} />
                  Portfolio
                </a>
                <a
                  href="/my-simulations"
                  onClick={(e) => { e.preventDefault(); setMobileOpen(false); navigate("/my-simulations"); }}
                  className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  <History size={13} />
                  Dashboard
                </a>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="block py-3 text-sm text-muted-foreground hover:text-foreground w-full text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <a
                href="/auth"
                onClick={(e) => { e.preventDefault(); setMobileOpen(false); navigate("/auth"); }}
                className="flex items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                <User size={13} />
                Sign In
              </a>
            )}
            <button
              onClick={() => { setMobileOpen(false); openDiscovery(); }}
              className="flex items-center justify-center gap-2 mt-3 font-display font-semibold text-sm bg-violet text-violet-foreground px-4 py-2.5 rounded-full text-center w-full"
            >
              Book a discovery audit
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
