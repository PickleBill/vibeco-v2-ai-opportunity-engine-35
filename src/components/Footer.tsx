import { useNavigate, useLocation } from "react-router-dom";
import { Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (href: string) => {
    if (location.pathname !== "/") {
      navigate("/" + href);
    } else {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
              className="font-display text-lg font-black text-foreground tracking-tight"
            >
              VibeCo
            </a>
            <p className="text-sm text-muted-foreground mt-1">
              AI operations, proven at scale.
            </p>
            <a href="https://vibeco.dev" className="text-xs text-primary/60 hover:text-primary transition-colors">
              vibeco.dev
            </a>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "How it works", href: "#model" },
              { label: "Signal", href: "/signal", route: true as const },
              { label: "Sketchpad", href: "/simulate", route: true as const },
              { label: "Proofs", href: "#proofs" },
              { label: "Contact", href: "#contact" },
            ].map((link: any) => (
              <button
                key={link.href}
                onClick={() => (link.route ? navigate(link.href) : handleNavClick(link.href))}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-border">
              <a
                href="https://twitter.com/vibeco_dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://linkedin.com/company/vibeco"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VibeCo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
