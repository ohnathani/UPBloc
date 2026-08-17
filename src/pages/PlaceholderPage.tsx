type PlaceholderPageProps = {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className="page-shell app-page-shell">
      <section
        className="dashboard-card placeholder-card"
        aria-labelledby="page-title"
      >
        <h1 id="page-title">{title}</h1>
        <p className="placeholder-note">
          This section is ready for the next feature build.
        </p>
      </section>
    </main>
  )
}
