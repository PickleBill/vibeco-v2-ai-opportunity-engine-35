import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pin,
  PinOff,
  X,
  Sparkles,
  Layers,
  Lightbulb,
  Users,
  Crosshair,
  StickyNote,
  GripVertical,
  ChevronRight,
  Wand2,
  Save,
  Loader2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StackItem, StackKind } from "@/hooks/useVibeStack";

const kindMeta: Record<StackKind, { label: string; icon: typeof Sparkles; tone: string }> = {
  highlight: { label: "Highlight", icon: Sparkles, tone: "text-primary" },
  deep_dive: { label: "Deep Dive", icon: Layers, tone: "text-blue-400" },
  expansion: { label: "Expansion", icon: Lightbulb, tone: "text-amber-400" },
  persona: { label: "Persona", icon: Users, tone: "text-purple-400" },
  distill: { label: "Distill", icon: Crosshair, tone: "text-emerald-400" },
  note: { label: "Note", icon: StickyNote, tone: "text-muted-foreground" },
};

interface Props {
  items: StackItem[];
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onSharpen?: () => void;
  onSnapshot?: () => void;
  isSharpening?: boolean;
  isSnapshotting?: boolean;
  hasPrompt?: boolean;
  /** Controlled open state — lets parent open the drawer on demand
   *  (e.g. after pinning a chit from a deep-dive footer). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Briefly outline a chit by id when the drawer opens — wakes up the eye. */
  highlightId?: string | null;
}

const ChitBody = ({ item, dragging }: { item: StackItem; dragging?: boolean }) => {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className={`${meta.tone} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {meta.label}
          </span>
          {item.round != null && (
            <span className="text-[9px] px-1.5 py-px rounded-full bg-primary/15 text-primary tabular-nums">
              R{item.round}
            </span>
          )}
          {item.source && (
            <span className="text-[9px] px-1.5 py-px rounded-full bg-muted/40 text-muted-foreground/60 truncate max-w-[140px]">
              {item.source}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground/90 leading-snug mt-0.5 line-clamp-2">
          {item.label}
        </p>
      </div>
    </div>
  );
};

const SortableChit = ({
  item,
  onTogglePin,
  onRemove,
  flash,
}: {
  item: StackItem;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  flash?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/chit relative rounded-md border p-2.5 transition-colors ${
        item.pinned
          ? "border-primary/40 bg-primary/5"
          : "border-border/40 bg-card/60"
      } hover:border-primary/30 ${flash ? "ring-2 ring-primary/60 ring-offset-1 ring-offset-background" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder (use arrow keys; Esc cancels)"
          title="Drag to reorder · Esc cancels"
        >
          <GripVertical size={12} />
        </button>
        <div className="flex-1 min-w-0">
          <ChitBody item={item} />
        </div>
        <div className="flex items-center gap-0.5 opacity-60 group-hover/chit:opacity-100 transition-opacity">
          <button
            onClick={() => onTogglePin(item.id)}
            className={`p-1 rounded hover:bg-muted/60 transition-colors ${
              item.pinned ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label={item.pinned ? "Unpin" : "Pin"}
            title={item.pinned ? "Unpin (still suggested)" : "Pin (always include)"}
          >
            {item.pinned ? <Pin size={11} className="fill-primary" /> : <PinOff size={11} />}
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove from stack"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

const VibeStack = ({
  items,
  onTogglePin,
  onRemove,
  onReorder,
  onSharpen,
  onSnapshot,
  isSharpening,
  isSnapshotting,
  hasPrompt,
  open: controlledOpen,
  onOpenChange,
  highlightId,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? !!controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [activeId, setActiveId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the parent passes a highlightId AND opens the drawer, briefly flash that chit.
  useEffect(() => {
    if (open && highlightId) {
      setFlashId(highlightId);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashId(null), 1800);
    }
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [open, highlightId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pinnedCount = items.filter((i) => i.pinned).length;
  const count = items.length;
  const activeItem = items.find((i) => i.id === activeId) || null;

  const handleDragStart = (event: any) => setActiveId(event.active?.id || null);
  const handleDragCancel = () => setActiveId(null);
  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const next = arrayMove(items, oldIndex, newIndex);
      onReorder(next.map((i) => i.id));
    }
  };

  return (
    <>
      {/* Floating launcher — always visible */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90 transition-all ${
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.5)" }}
        aria-label="Open Vibe Stack"
      >
        <Sparkles size={14} />
        <span className="text-xs font-bold">Vibe Stack</span>
        {count > 0 && (
          <span className="text-[10px] font-bold tabular-nums px-1.5 py-px rounded-full bg-primary-foreground/20">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] bg-background border-l border-border/40 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={14} className="text-primary fill-primary shrink-0" />
                  <h3 className="font-display text-sm font-bold text-foreground">Vibe Stack</h3>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {count} · {pinnedCount} pinned
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Action row */}
              {(onSharpen || onSnapshot) && (
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-border/40 bg-muted/10">
                  {onSharpen && (
                    <button
                      onClick={onSharpen}
                      disabled={isSharpening || count === 0}
                      className="flex items-center justify-center gap-1.5 text-[11px] font-semibold px-2.5 py-2 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      title={count === 0 ? "Add at least one chit first" : hasPrompt ? "Rebuild the prompt from this stack" : "Generate a prompt from this stack"}
                    >
                      {isSharpening ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Wand2 size={11} />
                      )}
                      {hasPrompt ? "Sharpen prompt" : "Generate prompt"}
                    </button>
                  )}
                  {onSnapshot && (
                    <button
                      onClick={onSnapshot}
                      disabled={isSnapshotting || count === 0}
                      className="flex items-center justify-center gap-1.5 text-[11px] font-semibold px-2.5 py-2 rounded-sm border border-border text-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSnapshotting ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Save size={11} />
                      )}
                      Save snapshot
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-3">
                {count === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={14} className="text-primary" />
                    </div>
                    <p className="text-xs text-foreground/80 font-semibold mb-3">
                      Your stack is empty
                    </p>
                    <ol className="text-left text-[11px] text-muted-foreground leading-relaxed space-y-2 mb-4 max-w-[260px] mx-auto">
                      <li>
                        <span className="text-primary font-bold">1.</span>{" "}
                        Tap <span className="text-primary font-semibold">+ stack</span> on
                        anything that resonates — highlights, deep-dives, expansions, persona challenges.
                      </li>
                      <li>
                        <span className="text-primary font-bold">2.</span>{" "}
                        Pin the must-haves so they're always folded into your prompt.
                      </li>
                      <li>
                        <span className="text-primary font-bold">3.</span>{" "}
                        Tap <span className="text-primary font-semibold">Sharpen</span> to
                        regenerate the prompt around the curated stack.
                      </li>
                    </ol>
                    <p className="text-[10px] text-muted-foreground/60 italic">
                      Round badges (R1 · R2 · R3) show when each insight was captured.
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragCancel={handleDragCancel}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={items.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {items.map((item) => (
                          <SortableChit
                            key={item.id}
                            item={item}
                            onTogglePin={onTogglePin}
                            onRemove={onRemove}
                            flash={flashId === item.id}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                      {activeItem ? (
                        <div className="rounded-md border border-primary/60 bg-card p-2.5 shadow-2xl shadow-primary/30">
                          <ChitBody item={activeItem} dragging />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2.5 border-t border-border/30 bg-card/30">
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                  <span className="text-primary">Pinned</span> chits are required
                  context. Drag to reorder priority · <kbd className="px-1 rounded bg-muted/60 text-[9px]">Esc</kbd> cancels a drag.
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default VibeStack;

/* ─── Reusable +stack button for any insight surface ─── */
interface AddToStackButtonProps {
  onAdd: () => void;
  added: boolean;
  size?: "xs" | "sm";
  label?: string;
}

export const AddToStackButton = ({ onAdd, added, size = "xs", label = "+ stack" }: AddToStackButtonProps) => {
  const sizing =
    size === "xs"
      ? "text-[10px] px-2 py-0.5"
      : "text-[11px] px-2.5 py-1";
  return (
    <button
      onClick={onAdd}
      disabled={added}
      className={`inline-flex items-center gap-1 rounded-full border transition-all ${sizing} ${
        added
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 cursor-default"
          : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
      title={added ? "Already in your Vibe Stack" : "Add to Vibe Stack"}
    >
      <Sparkles size={9} className={added ? "fill-emerald-400" : ""} />
      {added ? "in stack" : label}
    </button>
  );
};
