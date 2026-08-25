type SeedStatusBadgeProps = {
  active: boolean;
};

export function SeedStatusBadge({
  active,
}: SeedStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}