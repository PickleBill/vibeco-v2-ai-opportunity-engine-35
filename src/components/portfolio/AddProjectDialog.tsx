import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ProjectEntry } from "./ProjectCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<ProjectEntry, "id" | "created_at" | "priority" | "last_touched" | "report_id">) => void;
  initial?: ProjectEntry | null;
}

const AddProjectDialog = ({ open, onOpenChange, onSave, initial }: Props) => {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "experiment");
  const [status, setStatus] = useState(initial?.status || "active");
  const [parentBrand, setParentBrand] = useState(initial?.parent_brand || "");
  const [lovableId, setLovableId] = useState(initial?.lovable_project_id || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      category,
      status,
      parent_brand: parentBrand.trim() || null,
      lovable_project_id: lovableId.trim() || null,
      notes: notes.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initial ? "Edit Project" : "Register Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Project Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Courtana Pulse"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pickle-as-a-Service data platform..."
              className="mt-1 text-xs min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="internal_dev">Internal Dev</SelectItem>
                  <SelectItem value="future_dev">Future Dev</SelectItem>
                  <SelectItem value="fun">Fun</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="experiment">Experiment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Brand</Label>
              <Input
                value={parentBrand}
                onChange={(e) => setParentBrand(e.target.value)}
                placeholder="Courtana"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                Lovable ID
                <span className="text-[8px] uppercase tracking-wider px-1 py-px rounded-sm bg-warning/15 text-warning border border-warning/25 font-semibold">
                  Beta
                </span>
              </Label>
              <Input
                value={lovableId}
                onChange={(e) => setLovableId(e.target.value)}
                placeholder="optional"
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">
              Project Context <span className="text-muted-foreground/60 font-normal">(optional, but powerful)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste your .impeccable.md or brand doc here. The simulator will use this to ground every analysis in your real audience, voice, and anti-patterns."
              className="mt-1 text-xs min-h-[100px] font-mono leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1 leading-snug">
              The more context you paste, the sharper the simulation. Audience, brand voice, anti-patterns all help.
            </p>
          </div>
          <Button type="submit" className="w-full text-sm">
            {initial ? "Update Project" : "Add Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;
