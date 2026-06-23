import { createContext, useContext, useState, ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const engagementOptions = [
  { value: "Revenue Share", label: "Revenue Share" },
  { value: "Advisory Equity", label: "Advisory Equity" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Paid Build", label: "Paid Build" },
];

const leadSchema = z.object({
  name: z.string().trim().min(1, { message: "Please enter your name" }).max(120),
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  bottleneck: z.string().trim().max(280).optional().or(z.literal("")),
  engagement_preference: z.string().max(60),
});

type DiscoveryAuditContextValue = {
  open: () => void;
};

const DiscoveryAuditContext = createContext<DiscoveryAuditContextValue | null>(null);

export const useDiscoveryAudit = () => {
  const ctx = useContext(DiscoveryAuditContext);
  if (!ctx) throw new Error("useDiscoveryAudit must be used within DiscoveryAuditProvider");
  return ctx;
};

const emptyForm = {
  name: "",
  email: "",
  company: "",
  bottleneck: "",
  engagement_preference: "Revenue Share",
};

export const DiscoveryAuditProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const open = () => {
    setSubmitted(false);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const update = (field: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "Please check the form and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from as any)("discovery_leads").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        company: parsed.data.company || null,
        bottleneck: parsed.data.bottleneck || null,
        engagement_preference: parsed.data.engagement_preference,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Request received — we'll be in touch within 24 hours.");
    } catch (err) {
      console.error("Discovery lead error:", err);
      toast.error("Couldn't send your request. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors";

  return (
    <DiscoveryAuditContext.Provider value={{ open }}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="text-primary" size={24} />
              </div>
              <DialogTitle className="font-display text-xl font-bold text-foreground mb-2">
                Request received.
              </DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed mb-7 max-w-xs mx-auto">
                We'll review where AI can take work off your plate and reach out within 24 hours.
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="font-display text-sm font-semibold bg-violet text-violet-foreground px-6 py-2.5 rounded-full hover:brightness-110 transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold text-foreground">
                  Book a discovery audit
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  A few quick details and we'll map your first AI win. Most get a reply within 24 hours.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={inputClass}
                    aria-label="Name"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={inputClass}
                    aria-label="Email"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Company"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  className={inputClass}
                  aria-label="Company"
                />

                <input
                  type="text"
                  placeholder="Your biggest operational bottleneck (one line)"
                  value={form.bottleneck}
                  onChange={(e) => update("bottleneck", e.target.value)}
                  className={inputClass}
                  aria-label="Biggest operational bottleneck"
                />

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    If we move forward, what fits best?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {engagementOptions.map((opt) => {
                      const active = form.engagement_preference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update("engagement_preference", opt.value)}
                          className={`text-xs px-2.5 py-2 rounded-lg border transition-all duration-200 text-center ${
                            active
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-display font-semibold text-sm bg-violet text-violet-foreground px-6 py-3 rounded-full hover:brightness-110 transition-all duration-300 disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                    isSubmitting ? "animate-pulse" : ""
                  }`}
                >
                  {isSubmitting ? "Sending..." : "Book my discovery audit"}
                  {!isSubmitting && <ArrowRight size={15} />}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DiscoveryAuditContext.Provider>
  );
};
