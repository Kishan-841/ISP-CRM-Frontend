import { Card, CardContent } from "@/components/ui/card";

// Color map: icon bg + icon color + left border + ring
const COLOR_MAP = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-500",
    ring: "ring-blue-500",
  },
  brand: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-l-orange-500",
    ring: "ring-orange-500",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    border: "border-l-green-500",
    ring: "ring-green-500",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-l-amber-500",
    ring: "ring-amber-500",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-l-emerald-500",
    ring: "ring-emerald-500",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-l-slate-500",
    ring: "ring-slate-500",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-l-orange-500",
    ring: "ring-orange-500",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-l-teal-500",
    ring: "ring-teal-500",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-l-red-500",
    ring: "ring-red-500",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-l-cyan-500",
    ring: "ring-cyan-500",
  },
};

export default function StatCard({
  color = "brand",
  icon: Icon,
  label,
  value,
  onClick,
  selected,
  className = "",
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.brand;

  return (
    <Card
      onClick={onClick}
      className={`
        bg-gray-50 dark:bg-card
        border border-gray-200 dark:border-t-slate-800 dark:border-r-slate-800 dark:border-b-slate-800
        rounded-2xl
        shadow-sm
        ${c.border} border-l-4
        ${onClick ? "cursor-pointer hover:shadow-md transition" : ""}
        ${selected ? `ring-2 ${c.ring}` : ""}
        ${className}
      `}
    >
      <CardContent className="p-4 relative">
  
  {/* Icon fixed top-right */}
  {Icon && (
    <div
      className={`absolute top-4 right-4 h-8 w-8 sm:h-9 sm:w-9 rounded-xl ${c.bg} flex items-center justify-center`}
    >
      <Icon className={`w-4 h-4 ${c.text}`} />
    </div>
  )}

  <p className="text-xs sm:text-sm text-muted-foreground pr-10 leading-snug">
    {label}
  </p>

  <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-2">
    {value}
  </p>

</CardContent>
    </Card>
  );
}