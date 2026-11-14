export function Footer() {
  const groups = {
    Product: ["Invoicing", "Expenses", "Payroll", "Reports", "Integrations", "Pricing"],
    Company: ["About", "Careers", "Blog", "Press", "Contact"],
    Resources: ["Docs", "API", "Changelog", "Status", "Help center", "Community"],
    Legal: ["Privacy", "Terms", "Security", "DPA", "Cookies"],
  };
  return (
    <footer className="bg-ink text-muted border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-5 gap-8">
        <div><span className="text-text font-semibold">Ledgerly</span><p>Accounting for small teams.</p></div>
        {Object.entries(groups).map(([title, links]) => (
          <div key={title}><h4 className="text-text">{title}</h4>
            <ul>{links.map((l) => <li key={l}><a href="#">{l}</a></li>)}</ul></div>
        ))}
      </div>
      <p className="text-center text-xs py-4">© 2026 Ledgerly Inc.</p>
    </footer>
  );
}
