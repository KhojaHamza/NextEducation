export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-ink/20 px-6 py-10 text-center">
      {Icon && (
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-sun/50">
          <Icon className="size-7" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-xl font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}