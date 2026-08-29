import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileText } from "lucide-react";
import NavigationHeader from "./NavigationHeader";
import { authHeaders, investmentStorageKey } from "./auth";
import { normalizeInvestmentType } from "./tabRules";

type Type = "vista" | "plazo" | "etf";
type Institution = { id: string; name: string; products?: Product[] };
type Product = { id: string; name?: string; calculationMethod?: string };
type Investment = {
  id?: number;
  type: Type;
  institutionId: string;
  productId: string;
  balance: number;
  investmentName?: string;
  withdrawn?: number;
  startDate: string;
  endDate?: string;
  termDays?: number;
  annualRate?: number;
  monthlyYield?: number;
  updatedBalance?: number;
  totalAccumulated?: number;
  etfName?: string;
  etfTitles?: number;
  etfPurchasePrice?: number;
  etfCurrentValue?: number;
};
type Filter = "all" | Type;
const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});
const date = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
const today = () => new Date().toISOString().slice(0, 10);
const value = (amount: number | undefined) => Number(amount) || 0;
const bancoPlataInterest = (
  principal: number,
  annualRate: number,
  days: number,
) => principal * (annualRate / 100) * (days / 360);
const simpleInterest = (principal: number, annualRate: number, days: number) =>
  principal * (annualRate / 100) * (days / 365);
const compactMoney = (amount: number) => {
  const absolute = Math.abs(amount);
  const formatted =
    absolute >= 1000000
      ? `$${(absolute / 1000000).toFixed(1)}M`
      : absolute >= 1000
        ? `$${(absolute / 1000).toFixed(1)}k`
        : money.format(absolute).replace(" ", "");
  return amount < 0 ? `-${formatted}` : formatted;
};
const capital = (item: Investment) =>
  item.type === "etf"
    ? value(item.etfTitles) * value(item.etfPurchasePrice)
    : value(item.balance);
const current = (item: Investment, institutions: Institution[] = []) => {
  if (item.type === "etf") return value(item.etfCurrentValue ?? item.balance);
  const product = institutions
    .find((institution) => institution.id === item.institutionId)
    ?.products?.find((entry) => entry.id === item.productId);
  const isBancoPlataFixed =
    item.institutionId === "banco-plata" && item.productId === "ahorro-fijo";
  const isCetes =
    item.institutionId === "cetesdirecto" &&
    item.productId === "cetesdirecto-cetes";
  if (
    item.type === "plazo" &&
    (product?.calculationMethod === "simple" ||
      product?.calculationMethod === "simple360" ||
      isBancoPlataFixed ||
      isCetes)
  ) {
    const days =
      item.termDays ??
      (item.endDate && item.startDate
        ? Math.max(
            0,
            (new Date(`${item.endDate}T00:00:00`).getTime() -
              new Date(`${item.startDate}T00:00:00`).getTime()) /
              86400000,
          )
        : 0);
    const interest =
      product?.calculationMethod === "simple360" || isBancoPlataFixed
        ? bancoPlataInterest(value(item.balance), value(item.annualRate), days)
        : simpleInterest(value(item.balance), value(item.annualRate), days);
    return value(item.balance) + interest;
  }
  return value(item.updatedBalance ?? item.balance);
};
const profit = (item: Investment, institutions: Institution[] = []) =>
  item.type === "etf"
    ? current(item, institutions) - capital(item)
    : value(item.totalAccumulated);
const label = (item: Investment, institutions: Institution[]) =>
  institutions.find((entry) => entry.id === item.institutionId)?.name ??
  item.etfName ??
  item.productId;
const investmentName = (item: Investment, institutions: Institution[]) =>
  item.investmentName ??
  (item.type === "etf"
    ? (item.etfName ?? item.productId)
    : (institutions
        .find((entry) => entry.id === item.institutionId)
        ?.products?.find((product) => product.id === item.productId)?.name ??
      item.productId));
const periodLabel = (period: string) => {
  const end = new Date();
  const start = new Date(end);
  if (period === "Últimos 30 días") start.setDate(start.getDate() - 30);
  if (period === "Últimos 6 meses") start.setMonth(start.getMonth() - 6);
  if (period === "Último año") start.setFullYear(start.getFullYear() - 1);
  return period === "Desde el inicio"
    ? "Desde el primer registro disponible hasta hoy"
    : `${date.format(start)} - ${date.format(end)}`;
};
const periodMatches = (item: Investment, period: string) => {
  if (period === "Hoy") return (item.startDate || today()) === today();
  if (period === "Desde el inicio") return true;
  const end = new Date();
  const start = new Date(end);
  if (period === "Últimos 30 días") start.setDate(start.getDate() - 30);
  if (period === "Últimos 6 meses") start.setMonth(start.getMonth() - 6);
  if (period === "Último año") start.setFullYear(start.getFullYear() - 1);
  const itemDate = new Date(`${item.startDate || today()}T00:00:00`);
  return itemDate >= start && itemDate <= end;
};

const buildTrendSeries = (items: Investment[], period: string) => {
  const periods =
    period === "Hoy"
      ? 1
      : period === "Últimos 30 días"
        ? 4
        : period === "Últimos 6 meses"
          ? 6
          : period === "Último año"
            ? 12
            : 12;
  const buckets = Array.from({ length: periods }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (periods - index - 1));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("es-MX", { month: "short" }),
      capital: 0,
      current: 0,
      interest: 0,
    };
  });

  for (const item of items) {
    const dateValue = item.startDate
      ? new Date(`${item.startDate}T00:00:00`)
      : new Date();
    const monthIndex =
      (new Date().getFullYear() - dateValue.getFullYear()) * 12 +
      (new Date().getMonth() - dateValue.getMonth());
    const normalizedIndex = Math.max(
      0,
      Math.min(buckets.length - 1, buckets.length - 1 - monthIndex),
    );
    const bucket = buckets[normalizedIndex];
    if (!bucket) continue;
    bucket.capital += capital(item);
    bucket.current += current(item);
    bucket.interest += profit(item);
  }

  return buckets;
};

function TrendChart({ data }: { data: ReturnType<typeof buildTrendSeries> }) {
  if (!data.length)
    return <p className="reports-empty">No hay datos para mostrar.</p>;

  const width = 720;
  const height = 220;
  const padding = 26;
  const maxValue = Math.max(
    1,
    ...data.flatMap((entry) => [entry.capital, entry.current]),
  );

  const points = (key: "capital" | "current" | "interest") =>
    data.map((entry, index) => {
      const x =
        padding +
        (index * (width - padding * 2)) / Math.max(1, data.length - 1);
      const ratio = entry[key] / maxValue;
      const y = height - padding - ratio * (height - padding * 2);
      return { x, y };
    });

  const capitalPoints = points("capital");
  const currentPoints = points("current");
  const interestPoints = points("interest");
  const capitalPath = capitalPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const currentPath = currentPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const interestPath = interestPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPath = [
    ...currentPoints.map(
      (point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`,
    ),
    `L ${currentPoints[currentPoints.length - 1]?.x ?? width - padding},${height - padding}`,
    `L ${currentPoints[0]?.x ?? padding},${height - padding}`,
    "Z",
  ].join(" ");

  return (
    <div className="reports-trend">
      <div className="reports-chart-legend">
        <span>
          <i className="legend-capital" /> Capital
        </span>
        <span>
          <i className="legend-current" /> Valor actual
        </span>
        <span>
          <i className="legend-profit" /> Intereses a recibir
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="trend-svg"
        role="img"
        aria-label="Evolución del valor actual y capital"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((level) => {
          const y = height - padding - level * (height - padding * 2);
          return (
            <line
              key={level}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              className="trend-grid"
            />
          );
        })}
        <path d={areaPath} className="trend-area" />
        <polyline
          points={capitalPath}
          className="trend-line trend-line-capital"
          fill="none"
        />
        <polyline
          points={currentPath}
          className="trend-line trend-line-current"
          fill="none"
        />
        <polyline
          points={interestPath}
          className="trend-line trend-line-interest"
          fill="none"
        />
        {currentPoints.map((point, index) => (
          <g key={data[index]?.label ?? index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={3.5}
              className="trend-point trend-point-current"
            />
            <text
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="trend-label"
            >
              {data[index]?.label ?? ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TypeChart({
  investments,
  institutions,
  type,
}: {
  investments: Investment[];
  institutions: Institution[];
  type: Type;
}) {
  const rows = investments.slice(0, 10);
  const metricFor = (item: Investment) => {
    if (type === "etf") {
      const invested = capital(item);
      return [
        { key: "capital", label: "Capital invertido", amount: invested },
        {
          key: "current",
          label: "Valor actual",
          amount: current(item, institutions),
        },
        {
          key: "profit",
          label: "Ganancia",
          amount: profit(item, institutions),
        },
      ];
    }
    if (type === "plazo") {
      const start = new Date(`${item.startDate}T00:00:00`).getTime();
      const end = new Date(
        `${item.endDate ?? item.startDate}T00:00:00`,
      ).getTime();
      const elapsed = Math.max(
        0,
        Math.min(
          100,
          ((new Date(`${today()}T00:00:00`).getTime() - start) /
            Math.max(1, end - start)) *
            100,
        ),
      );
      return [
        { key: "capital", label: "Capital", amount: capital(item) },
        {
          key: "current",
          label: "Saldo al vencimiento",
          amount: current(item, institutions),
        },
        {
          key: "progress",
          label: "Avance del plazo",
          amount: elapsed,
          display: `${Math.round(elapsed)}%`,
        },
      ];
    }
    if (item.institutionId === "kubo") {
      return [
        { key: "capital", label: "Monto invertido", amount: capital(item) },
        {
          key: "current",
          label: "Monto a recibir",
          amount: current(item, institutions),
        },
        {
          key: "profit",
          label: "Intereses a recibir",
          amount: profit(item, institutions),
        },
      ];
    }
    return [
      { key: "current", label: "Saldo actual", amount: current(item) },
        {
          key: "monthlyYield",
          label: "Rend. mensual",
          amount: value(item.monthlyYield),
        },
      {
          key: "withdrawn",
          label: "Total retirado",
          amount: value(item.withdrawn),
      },
    ];
  };
  const max = Math.max(
    1,
    ...rows.flatMap((item) => metricFor(item).map((metric) => metric.amount)),
  );
  const title =
    type === "etf"
      ? "Valor y rendimiento de cada ETF"
      : type === "plazo"
        ? "Capital y avance hasta vencimiento"
        : rows.some((item) => item.institutionId === "kubo")
          ? "Montos e intereses de Kubo Financiero"
          : "Saldo, rendimiento mensual y retiros";
  return (
    <div className="reports-type-chart" aria-label={title}>
      <div className="reports-chart-legend">
        <span>{title}</span>
      </div>
      {rows.length ? (
        <div className="reports-type-chart-list">
          {rows.map((item) => (
            <article
              className="reports-type-row"
              key={
                item.id ??
                `${item.institutionId}-${item.productId}-${item.startDate}`
              }
            >
              <div className="reports-type-row-heading">
                <strong>{investmentName(item, institutions)}</strong>
                <span>
                  {type === "etf"
                    ? "ETF"
                    : `${label(item, institutions)} · ${type === "plazo" ? (item.endDate && item.endDate <= today() ? "Finalizada" : `Vence ${item.endDate ?? "sin fecha"}`) : `${value(item.annualRate).toFixed(2)}% anual`}`}
                </span>
              </div>
              <div className="reports-type-metrics">
                {metricFor(item).map((metric) => (
                  <div className="reports-type-metric" key={metric.key}>
                    <div
                      className={`reports-type-bar ${metric.key}`}
                      style={{
                        width: `${Math.max(3, Math.min(100, (metric.amount / max) * 100))}%`,
                      }}
                    />
                    <span>{metric.label}</span>
                    <strong>
                      {metric.display ?? compactMoney(metric.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="reports-empty">No hay datos para mostrar.</p>
      )}
    </div>
  );
}

function Chart({
  investments,
  institutions,
}: {
  investments: Investment[];
  institutions: Institution[];
}) {
  return (
    <TypeChart
      investments={investments}
      institutions={institutions}
      type={investments[0]?.type ?? "vista"}
    />
  );
}

export default function ReportsPage({
  institutions,
}: {
  institutions: Institution[];
}) {
  const [filter, setFilter] = useState<Filter>("vista");
  const [institutionId, setInstitutionId] = useState("");
  const [period, setPeriod] = useState("Desde el inicio");
  const [investments, setInvestments] = useState<Investment[]>([]);
  useEffect(() => {
    const loadInvestments = () => {
      const validInstitutionIds = new Set(institutions.map((institution) => institution.id));
      const normalizeLoadedInvestment = (item: Investment) => {
        const type = normalizeInvestmentType(item.institutionId, item.type);
        return { ...item, type };
      };
      fetch("/api/investments", { headers: authHeaders() })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) =>
          setInvestments(
            data
              .map((item: Investment) => normalizeLoadedInvestment(item))
              .filter((item: Investment) => validInstitutionIds.has(item.institutionId)),
          ),
        )
        .catch(() =>
          setInvestments(
            JSON.parse(localStorage.getItem(investmentStorageKey()) ?? "[]")
              .map((item: Investment) => normalizeLoadedInvestment(item))
              .filter((item: Investment) => validInstitutionIds.has(item.institutionId)),
          ),
        );
    };
    window.addEventListener("finanzia-investment-saved", loadInvestments);
    window.addEventListener("finanzia-institution-deleted", loadInvestments);
    window.addEventListener("storage", loadInvestments);
    loadInvestments();
    return () => {
      window.removeEventListener("finanzia-investment-saved", loadInvestments);
      window.removeEventListener("finanzia-institution-deleted", loadInvestments);
      window.removeEventListener("storage", loadInvestments);
    };
  }, [institutions]);
  const filterOptions = useMemo(() => {
    const options = investments
      .map((item) => {
        const normalizedType = normalizeInvestmentType(item.institutionId, item.type);
        if (normalizedType !== filter) return null;
        return {
          value:
            filter === "etf"
              ? (item.etfName ?? item.productId)
              : item.institutionId,
          label:
            filter === "etf"
              ? (item.etfName ?? item.productId)
              : (institutions.find(
                  (institution) => institution.id === item.institutionId,
                )?.name ?? item.institutionId),
        };
      })
      .filter((option): option is { value: string; label: string } => Boolean(option && option.value && option.label));
    return Array.from(
      new Map(options.map((option) => [option.value, option])).values(),
    ).sort((first, second) => first.label.localeCompare(second.label, "es"));
  }, [filter, institutions, investments]);
  useEffect(() => {
    const controls = document.querySelector<HTMLElement>(".reports-controls");
    const selects = controls?.querySelectorAll("select");
    const typeSelect = selects?.[0];
    const sourceSelect = selects?.[1];
    if (!typeSelect || !sourceSelect) return;

    typeSelect.querySelector('option[value="all"]')?.remove();
    sourceSelect.replaceChildren(new Option("Todas las opciones", ""));
    filterOptions.forEach((option) =>
      sourceSelect.add(new Option(option.label, option.value)),
    );
    sourceSelect.value = institutionId;
  }, [filter, filterOptions, institutionId]);
  const filtered = useMemo(
    () =>
      investments.filter((item) => {
        const normalizedType = normalizeInvestmentType(item.institutionId, item.type);
        return (
          normalizedType === filter &&
          (!institutionId ||
            ((filter === "etf"
              ? (item.etfName ?? item.productId) === institutionId
              : item.institutionId === institutionId) &&
              periodMatches(item, period)))
        );
      }),
    [filter, institutionId, investments, period],
  );
  const summary = useMemo(
    () =>
      filtered.reduce(
        (result, item) => ({
          capital: result.capital + capital(item),
          current: result.current + current(item),
          profit: result.profit + profit(item),
          withdrawn: result.withdrawn + value(item.withdrawn),
        }),
        { capital: 0, current: 0, profit: 0, withdrawn: 0 },
      ),
    [filtered],
  );
  const trendData = useMemo(
    () => buildTrendSeries(filtered, period),
    [filtered, period],
  );
  const insightCards = [
    { label: "Patrimonio total", value: summary.current, tone: "positive" },
    {
      label: "Rendimiento neto",
      value: summary.profit,
      tone: summary.profit >= 0 ? "positive" : "negative",
    },
    { label: "Capital invertido", value: summary.capital, tone: "neutral" },
  ];
  const downloadReport = () => {
    const reportWindow = window.open("", "_blank", "width=800,height=900");
    if (!reportWindow) return;
    reportWindow.document.write(
      `<html><head><title>Finanzia - Reporte</title><style>body{font-family:Arial,sans-serif;padding:42px;color:#171918}h1{margin:0 0 6px}p{color:#555}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:15px 0}.note{margin-top:28px;font-size:12px;color:#777}</style></head><body><h1>Finanzia - Reporte de inversiones</h1><p>Periodo: ${periodLabel(period)}</p><p>Selección: ${filter === "all" ? "Todas las inversiones" : filter === "vista" ? "A la vista" : filter === "plazo" ? "A plazo" : "ETF"}${institutionId ? ` / ${institutions.find((item) => item.id === institutionId)?.name ?? institutionId}` : ""}</p><div class="row"><strong>Capital invertido</strong><span>${money.format(summary.capital)}</span></div><div class="row"><strong>Ganancia</strong><span>${money.format(summary.profit)}</span></div><div class="row"><strong>Dinero retirado</strong><span>${money.format(summary.withdrawn)}</span></div><div class="row"><strong>Valor actual</strong><span>${money.format(summary.current)}</span></div><p class="note">Los importes corresponden al estado actual disponible en Finanzia. No se atribuyen ganancias históricas no almacenadas.</p></body></html>`,
    );
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };
  return (
    <div className="investment-page reports-page">
      <NavigationHeader pageLabel="Reportes" />
      <main className="investment-content">
        <div className="investment-intro">
          <div>
            <span className="eyebrow orange">Resumen patrimonial</span>
            <h1>Reportes</h1>
            <p>Analiza tus inversiones y descarga un resumen.</p>
          </div>
          <BarChart3 size={30} className="configuration-icon" />
        </div>
        <section className="reports-controls">
          <label>
            Tipo de inversión
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as Filter);
                setInstitutionId("");
              }}
            >
              <option value="all">Todas</option>
              <option value="vista">A la vista</option>
              <option value="plazo">A plazo</option>
              <option value="etf">ETF</option>
            </select>
          </label>
          <label>
            Institución
            <select
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
            >
              <option value="">Todas las instituciones</option>
              {institutions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Periodo
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option>Hoy</option>
              <option>Últimos 30 días</option>
              <option>Últimos 6 meses</option>
              <option>Último año</option>
              <option>Desde el inicio</option>
            </select>
          </label>
          <button
            className="primary-button"
            type="button"
            onClick={downloadReport}
          >
            <Download size={16} /> Descargar reporte PDF
          </button>
        </section>
        <section className="reports-summary">
          <div>
            <span>Invertido</span>
            <strong>{money.format(summary.capital)}</strong>
          </div>
          <div>
            <span>Ganancia</span>
            <strong
              className={
                summary.profit < 0 ? "report-negative" : "report-positive"
              }
            >
              {money.format(summary.profit)}
            </strong>
          </div>
          <div>
            <span>Valor actual</span>
            <strong>{money.format(summary.current)}</strong>
          </div>
          <div>
            <span>Retirado</span>
            <strong>{money.format(summary.withdrawn)}</strong>
          </div>
        </section>
        <section className="reports-section">
          <div className="reports-heading">
            <div>
              <span className="eyebrow">Comparativa</span>
              <h2>Capital, ganancia y valor actual</h2>
            </div>
            <FileText size={22} />
          </div>
          <TrendChart data={trendData} />
          <div
            className="reports-insights"
            aria-label="Indicadores clave del periodo"
          >
            {insightCards.map(({ label, value, tone }) => (
              <div key={label} className={`reports-insight ${tone}`}>
                <span>{label}</span>
                <strong>{money.format(value)}</strong>
              </div>
            ))}
          </div>
          <Chart investments={filtered} institutions={institutions} />
        </section>
        {filter === "plazo" && (
          <section className="reports-section">
            <div className="reports-heading">
              <div>
                <span className="eyebrow">Detalle</span>
                <h2>Inversiones a plazo</h2>
              </div>
            </div>
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Nombre de la inversión</th>
                    <th>Institución</th>
                    <th>Invertido</th>
                    <th>Inicio</th>
                    <th>Término</th>
                    <th>Ganancia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id ?? `${item.institutionId}-${item.startDate}`}
                    >
                      <td>{investmentName(item, institutions)}</td>
                      <td>{label(item, institutions)}</td>
                      <td>{money.format(capital(item))}</td>
                      <td>{item.startDate}</td>
                      <td>{item.endDate ?? "-"}</td>
                      <td>{money.format(profit(item))}</td>
                      <td>
                        {item.endDate && item.endDate <= today()
                          ? "Finalizada"
                          : "En curso"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
