type NavigationHeaderProps = {
  pageLabel: string;
};

export default function NavigationHeader({ pageLabel }: NavigationHeaderProps) {
  const currentPath = window.location.pathname;
  const links = [
    ["/instituciones", "Instituciones"],
    ["/inversiones", "Nueva inversión"],
    ["/dashboard", "Dashboard"],
    ["/reportes", "Reportes"],
    ["/configuracion", "Configuración"],
    ["/proteccion", "Protección"],
  ];
  return (
    <header className="investment-topbar">
      <a className="brand investment-brand" href="/instituciones" aria-label="Finanzia, ir a Instituciones">
        <span className="brand-mark">F</span>
        <span>FINANZIA</span>
      </a>
      <nav className="investment-nav">
        {links.map(([href, label]) => (
          <a
            href={href}
            key={href}
            className={currentPath === href ? "active" : undefined}
            aria-current={currentPath === href ? "page" : undefined}
          >
            {label}
          </a>
        ))}
        <button onClick={() => { localStorage.removeItem("finanzia-auth-token"); window.location.href = "/login"; }}>Cerrar sesión</button>
        <span className="page-kicker">Finanzia / {pageLabel}</span>
      </nav>
    </header>
  );
}
