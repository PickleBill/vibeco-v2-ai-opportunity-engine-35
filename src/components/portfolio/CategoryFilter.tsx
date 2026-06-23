import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "partner", label: "Partner" },
  { value: "internal_dev", label: "Internal Dev" },
  { value: "future_dev", label: "Future Dev" },
  { value: "fun", label: "Fun" },
  { value: "client", label: "Client" },
  { value: "experiment", label: "Experiment" },
] as const;

const STATUSES = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "shipped", label: "Shipped" },
  { value: "archived", label: "Archived" },
] as const;

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  brandFilter: string;
  onBrandFilterChange: (v: string) => void;
  brands: string[];
}

const CategoryFilter = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  brandFilter,
  onBrandFilterChange,
  brands,
}: Props) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search projects..."
        className="pl-9 bg-secondary/50 border-border/30 text-xs"
      />
    </div>

    <Select value={category} onValueChange={onCategoryChange}>
      <SelectTrigger className="w-[140px] bg-secondary/50 border-border/30 text-xs">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c.value} value={c.value} className="text-xs">
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger className="w-[120px] bg-secondary/50 border-border/30 text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value} className="text-xs">
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {brands.length > 0 && (
      <Select value={brandFilter} onValueChange={onBrandFilterChange}>
        <SelectTrigger className="w-[140px] bg-secondary/50 border-border/30 text-xs">
          <SelectValue placeholder="Brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Brands</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b} value={b} className="text-xs">
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>
);

export default CategoryFilter;
