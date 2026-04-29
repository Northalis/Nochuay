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
      <div className="flex justify-center">
        <img
          src="/nochuay-high-resolution-logo-grayscale-transparent%20(1).png"
          alt="Nochuay logo"
          className="h-30 w-auto"
          loading="lazy"
        />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {title}
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
