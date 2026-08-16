type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="page-shell app-page-shell">
      <section
        className="dashboard-card placeholder-card"
        aria-labelledby="page-title"
      >
        <p className="eyebrow">UPBloc workspace</p>
        <h1 id="page-title">{title}</h1>
        <p className="muted">{description}</p>
        <p className="placeholder-note">
          This section is ready for the next feature build.
        </p>
      </section>
    </main>
  )
}
