import { useState, useEffect, useMemo } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { AnimatePresence } from "framer-motion";
import { Plus, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import CategoryFilter from "@/components/portfolio/CategoryFilter";
import ProjectCard, { type ProjectEntry } from "@/components/portfolio/ProjectCard";
import AddProjectDialog from "@/components/portfolio/AddProjectDialog";

const Portfolio = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectEntry | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      if (!data.session?.user) {
        navigate("/auth");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
      if (!session?.user) navigate("/auth");
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("project_registry")
      .select("*")
      .order("priority", { ascending: true })
      .order("last_touched", { ascending: false });
    if (error) {
      toast.error("Failed to load projects");
    } else {
      setProjects((data as ProjectEntry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.parent_brand && set.add(p.parent_brand));
    return Array.from(set).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && p.category !== category) return false;
      if (status !== "all" && p.status !== status) return false;
      if (brandFilter !== "all" && p.parent_brand !== brandFilter) return false;
      return true;
    });
  }, [projects, search, category, status, brandFilter]);

  const handleSave = async (data: any) => {
    if (!user) return;
    if (editing) {
      const { error } = await supabase
        .from("project_registry")
        .update({ ...data, last_touched: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) {
        toast.error("Failed to update project");
      } else {
        toast.success("Project updated");
        fetchProjects();
      }
    } else {
      const { error } = await supabase
        .from("project_registry")
        .insert({ ...data, user_id: user.id });
      if (error) {
        toast.error("Failed to add project");
      } else {
        toast.success("Project registered");
        fetchProjects();
      }
    }
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("project_registry").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove project");
    } else {
      toast.success("Project removed");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleEdit = (p: ProjectEntry) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Portfolio Command Center | VibeCo</title>
        <meta name="description" content="Organize and manage all your Lovable projects in one strategic dashboard." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FolderKanban size={20} className="text-primary" />
              <h1 className="font-display font-black text-2xl text-foreground">
                Portfolio Command Center
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="text-xs gap-2"
          >
            <Plus size={14} />
            Register Project
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <CategoryFilter
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            status={status}
            onStatusChange={setStatus}
            brandFilter={brandFilter}
            onBrandFilterChange={setBrandFilter}
            brands={brands}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-card animate-pulse border border-border/20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderKanban size={40} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {projects.length === 0
                ? "No projects registered yet"
                : "No projects match your filters"}
            </p>
            {projects.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Register your first project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <AddProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        initial={editing}
      />
    </HelmetProvider>
  );
};

export default Portfolio;
