export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <h1 className="text-3xl font-semibold text-neutral-800 dark:text-neutral-100">
          Welcome to Nochuay
        </h1>
        <p className="text-base text-neutral-500 dark:text-neutral-400">
          Select a page from the sidebar or create a new one to get started.
        </p>
      </div>
    </div>
  );
}
