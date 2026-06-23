import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  MoreVertical,
  ExternalLink,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface ProjectEntry {
  id: string;
  lovable_project_id: string | null;
  name: string;
  description: string | null;
  category: string;
  status: string;
  parent_brand: string | null;
  report_id: string | null;
  notes: string | null;
  priority: number;
  last_touched: string;
  created_at: string;
}

const categoryColor: Record<string, string> = {
  partner: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  internal_dev: "bg-primary/15 text-primary border-primary/20",
  future_dev: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  fun: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  client: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  experiment: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

const statusDot: Record<string, string> = {
  active: "bg-emerald-400",
  paused: "bg-amber-400",
  shipped: "bg-primary",
  archived: "bg-muted-foreground/40",
};

const categoryLabel: Record<string, string> = {
  partner: "Partner",
  internal_dev: "Internal Dev",
  future_dev: "Future Dev",
  fun: "Fun",
  client: "Client",
  experiment: "Experiment",
};

interface Props {
  project: ProjectEntry;
  onEdit: (p: ProjectEntry) => void;
  onDelete: (id: string) => void;
}

const ProjectCard = ({ project, onEdit, onDelete }: Props) => {
  const navigate = useNavigate();

  const handleSimulate = () => {
    navigate("/simulate", {
      state: {
        prefillIdea: `[Project: ${project.name}] ${project.description || project.name}`,
      },
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative bg-card border border-border/30 rounded-lg p-5 hover:border-primary/20 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[project.status] || statusDot.active}`} />
            <h3 className="font-display font-semibold text-foreground text-sm truncate">
              {project.name}
            </h3>
          </div>
          {project.parent_brand && (
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-4">
              {project.parent_brand}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Pencil size={12} className="mr-2" /> Edit
            </DropdownMenuItem>
            {project.report_id && (
              <DropdownMenuItem onClick={() => navigate(`/report/${project.report_id}`)}>
                <FileText size={12} className="mr-2" /> View Report
              </DropdownMenuItem>
            )}
            {project.lovable_project_id && (
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `https://lovable.dev/projects/${project.lovable_project_id}`,
                    "_blank"
                  )
                }
              >
                <ExternalLink size={12} className="mr-2" /> Open in Lovable
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 size={12} className="mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={`text-[10px] border ${categoryColor[project.category] || categoryColor.experiment}`}
        >
          {categoryLabel[project.category] || project.category}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] gap-1.5 text-primary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleSimulate}
        >
          <Sparkles size={10} />
          Simulate
        </Button>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
