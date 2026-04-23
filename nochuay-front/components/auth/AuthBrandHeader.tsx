interface AuthBrandHeaderProps {
  title: string;
  description: string;
}

export default function AuthBrandHeader({
  title,
  description,
}: AuthBrandHeaderProps) {
  return (
    <div className="mb-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">
        Nochuay
      </p>
      <p className="mt-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        Temporary mark for v1.3.0
      </p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {title}
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
