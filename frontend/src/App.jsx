import { useEffect, useState, lazy, Suspense } from "react";
import {
  Route,
  BookOpen,
  Compass,
  ArrowUpRight,
  ArrowRight,
  Download,
  Printer,
  ShieldCheck,
  Truck,
  Clock3,
  MapPin,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle,
  Check,
  Menu,
  X,
} from "lucide-react";
const RouteMap = lazy(() => import("./RouteMap"));
import TripForm, { defaults } from "./TripForm";
import Itinerary from "./Itinerary";
import LogSheet, { DutyGraph } from "./LogSheet";
import { duration, number, dateLabel, shortPlace } from "./utils";

function Assumptions() {
  return (
    <details className="assumptions card">
      <summary>
        <Info size={16} /> How this plan is calculated{" "}
        <ChevronRight size={15} />
      </summary>
      <div>
        <p>
          11 hours of driving per shift, within a 14-hour window. At least 30
          minutes without driving after 8 cumulative driving hours; qualifying
          pickup, delivery and fuel time can satisfy this break. Daily rests
          last 10 hours.
        </p>
        <p>
          The trip begins after a qualifying rest and with a full tank. Fuel
          stops take 30 minutes. With no previous daily logs supplied, cycle
          hours do not roll off: the planner uses a conservative 34-hour restart
          when necessary. This may add rest compared with a complete 8-day
          recap.
        </p>
        <p>
          Travel time uses the slower of OSRM’s estimate and a 55 mph average.
          Route and stop coordinates are estimates. OSRM does not check truck
          height, weight, hazmat restrictions, parking, traffic or facility
          availability. Verify a suitable facility before using a planned stop.
        </p>
        <p>
          All logs use the selected fixed home-terminal clock, including when
          crossing time zones. Split and replan trips across a daylight-saving
          clock change. Logs are planning drafts; actual duty records,
          city/state remarks and a driver signature still need verification.
        </p>
        <a
          href="https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations"
          target="_blank"
          rel="noreferrer"
        >
          Read the FMCSA hours-of-service summary <ArrowUpRight size={13} />
        </a>
      </div>
    </details>
  );
}

export default function App() {
  const [form, setForm] = useState(defaults),
    [plan, setPlan] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("overview"),
    [day, setDay] = useState(0),
    [mobileNav, setMobileNav] = useState(false);
  const stale =
    plan && Object.keys(form).some((k) => form[k] !== plan.input[k]);
  async function generate(values, sample = false) {
    setBusy(true);
    setError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 140000);
    try {
      const csrfResponse = await fetch("/api/csrf/", {
        signal: controller.signal,
      });
      if (!csrfResponse.ok)
        throw new Error(
          "The planner is unavailable. Check that the Django server is running.",
        );
      const { token } = await csrfResponse.json();
      const response = await fetch("/api/plan/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": token },
        body: JSON.stringify({ ...values, sample }),
        signal: controller.signal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server could not complete this plan. Please try again.",
        );
      }
      if (!response.ok)
        throw new Error(data.error || "Unable to plan this trip.");
      setPlan(data);
      setDay(0);
    } catch (e) {
      setError(
        e.name === "AbortError"
          ? "The map service took too long. Please retry or load the saved example."
          : e.message,
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  useEffect(() => {
    generate(defaults(), true);
  }, []);
  const example = () => {
    const values = defaults();
    setForm(values);
    generate(values, true);
  };
  const navigate = (value) => {
    setTab(value);
    setMobileNav(false);
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `haulplan-${plan.base_date}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const print = () => {
    setTab("logs");
    setTimeout(() => window.print(), 100);
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "nav-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-icon">
            <Route size={24} />
          </span>
          haulplan<span className="brand-period">.</span>
        </a>
        <button
          className="nav-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        >
          <X />
        </button>
        <div className="workspace-label">DRIVER WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            ["overview", "Trip planner", Route],
            ["logs", "Daily logs", BookOpen],
            ["directions", "Route directions", Compass],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Icon size={19} />
              {label}
              {key === "logs" && plan && (
                <span className="nav-count">{plan.days.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={23} />
            <strong>A clearer road ahead.</strong>
            <p>
              Plan your drive.
              <br />
              Make time for the rest.
            </p>
          </div>
          <div className="workspace-user">
            <span className="user-avatar">
              <Truck size={18} />
            </span>
            <div>
              <strong>Property carrier</strong>
              <span>70-hour / 8-day cycle</span>
            </div>
            <span className="live-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} />{" "}
              <strong>
                {tab === "overview"
                  ? "Trip planner"
                  : tab === "logs"
                    ? "Daily logs"
                    : "Route directions"}
              </strong>
            </span>
          </div>
          <span className="topbar-note">
            <span className="live-dot" /> Built for the long haul
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">PLAN WITH CONFIDENCE</span>
              <h1>
                {tab === "overview"
                  ? "A good day starts with a clear route."
                  : tab === "logs"
                    ? "Every hour, accounted for."
                    : "Know your next turn."}
              </h1>
              <p>
                {tab === "overview"
                  ? "Your route, rest stops and daily logs. All in one place."
                  : tab === "logs"
                    ? "A complete daily view of your planned duty status."
                    : "Road directions for both legs of your trip."}
              </p>
            </div>
            <button
              className="button secondary export-button"
              onClick={download}
              disabled={!plan || busy}
            >
              <Download size={16} /> Export trip
            </button>
          </div>
          <div className="workspace-grid">
            <TripForm
              form={form}
              setForm={setForm}
              busy={busy}
              onSubmit={(e) => {
                e.preventDefault();
                generate(form);
              }}
              onExample={example}
            />
            <div className="results" aria-busy={busy}>
              {error && (
                <div className="error-message" role="alert">
                  <AlertCircle size={19} />
                  <div>
                    <strong>We couldn’t generate this trip.</strong>
                    <p>{error}</p>
                    {plan && <p>Your previous plan remains below.</p>}
                  </div>
                </div>
              )}
              {stale && (
                <div className="stale-message" role="status">
                  <Info size={16} /> Trip details changed. Generate again to
                  update the plan.
                </div>
              )}
              {busy && (
                <div className="loading-message" role="status">
                  <span className="spinner" />{" "}
                  {plan
                    ? "Updating your route and duty schedule…"
                    : "Preparing your route and duty schedule…"}
                </div>
              )}
              {!plan && !busy ? (
                <section className="empty-state card">
                  <Route size={42} />
                  <h2>Your next trip starts here.</h2>
                  <p>
                    Enter your three locations and available cycle to create a
                    route and daily log sheets.
                  </p>
                  <button className="button primary" onClick={example}>
                    Explore an example <ArrowRight size={16} />
                  </button>
                </section>
              ) : null}
              {plan && (
                <>
                  <div className="result-heading">
                    <span className="eyebrow">
                      {plan.input.sample ? "EXAMPLE TRIP" : "YOUR TRIP PLAN"}
                    </span>
                    <span className="ready-badge">
                      <Check size={13} /> Schedule generated
                    </span>
                  </div>
                  <section className="stats" aria-label="Trip summary">
                    {[
                      [
                        Route,
                        "Total distance",
                        number(plan.summary.miles),
                        "mi",
                      ],
                      [
                        Clock3,
                        "Driving time",
                        duration(plan.summary.driving_minutes),
                        "",
                      ],
                      [
                        Coffee,
                        "Breaks & rest",
                        duration(plan.summary.rest_minutes),
                        "",
                      ],
                      [BookOpen, "Daily log sheets", plan.days.length, "days"],
                    ].map(([Icon, label, value, unit]) => (
                      <div className="stat" key={label}>
                        <span className="stat-label">
                          <Icon size={15} />
                          {label}
                        </span>
                        <strong>
                          {value} <small>{unit}</small>
                        </strong>
                      </div>
                    ))}
                  </section>
                  <div
                    className="result-tabs"
                    role="tablist"
                    aria-label="Plan view"
                  >
                    {[
                      ["overview", "Route overview"],
                      ["logs", "Daily logs"],
                      ["directions", "Directions"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                      >
                        {label}
                        {key === "logs" && <span>{plan.days.length}</span>}
                      </button>
                    ))}
                  </div>
                  {tab === "overview" && (
                    <>
                      <section className="route-card card">
                        <div className="section-heading">
                          <div>
                            <h2>The route at a glance</h2>
                            <p>Two legs. One complete plan.</p>
                          </div>
                          <span className="map-legend">
                            <i /> Planned route
                          </span>
                        </div>
                        <Suspense
                          fallback={
                            <div className="map loading-message">
                              Loading regional map�
                            </div>
                          }
                        >
                          <RouteMap plan={plan} />
                        </Suspense>
                        <div className="arrival-strip">
                          <div>
                            <span className="arrival-icon">
                              <FlagIcon />
                            </span>
                            <div>
                              <span className="stat-label">
                                ESTIMATED DELIVERY COMPLETE
                              </span>
                              <strong>
                                {dateLabel(plan.arrival)} at{" "}
                                {plan.arrival.slice(11, 16)}{" "}
                                <small>
                                  {plan.input.clock.split(" · ")[0]}
                                </small>
                              </strong>
                            </div>
                          </div>
                          <div>
                            <span className="stat-label">TOTAL TRIP TIME</span>
                            <strong>
                              {duration(plan.summary.elapsed_minutes)}
                            </strong>
                          </div>
                        </div>
                      </section>
                      <div className="route-caution">
                        <Info size={14} />
                        <span>
                          Road route with estimated stop points. Verify truck
                          access and stopping facilities.
                        </span>
                      </div>
                      <Itinerary plan={plan} />
                      <section className="log-preview card">
                        <div className="section-heading">
                          <div>
                            <h2>Your first day, on paper</h2>
                            <p>
                              {dateLabel(plan.days[0].date)} ·{" "}
                              {plan.input.clock}
                            </p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => setTab("logs")}
                          >
                            View all logs <ArrowRight size={15} />
                          </button>
                        </div>
                        <DutyGraph day={plan.days[0]} />
                      </section>
                    </>
                  )}
                  {tab === "logs" && (
                    <section className="logs-view">
                      <div className="log-toolbar">
                        <div className="day-pager">
                          <button
                            className="icon-button"
                            aria-label="Previous day"
                            disabled={day === 0}
                            onClick={() => setDay(day - 1)}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <select
                            aria-label="Log day"
                            value={day}
                            onChange={(e) => setDay(Number(e.target.value))}
                          >
                            {plan.days.map((d, i) => (
                              <option key={d.date} value={i}>
                                Day {i + 1} · {dateLabel(d.date)}
                              </option>
                            ))}
                          </select>
                          <button
                            className="icon-button"
                            aria-label="Next day"
                            disabled={day === plan.days.length - 1}
                            onClick={() => setDay(day + 1)}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <button className="button secondary" onClick={print}>
                          <Printer size={15} /> Print all logs / PDF
                        </button>
                      </div>
                      {plan.days.map((d, i) => (
                        <div
                          key={d.date}
                          className={`daily-page ${i === day ? "selected-day" : ""}`}
                        >
                          <LogSheet day={d} index={i} plan={plan} />
                        </div>
                      ))}
                    </section>
                  )}
                  {tab === "directions" && (
                    <section className="directions card">
                      <div className="section-heading">
                        <div>
                          <h2>Turn-by-turn directions</h2>
                          <p>
                            OSRM road directions · confirm truck restrictions
                          </p>
                        </div>
                        <Compass size={20} />
                      </div>
                      {[0, 1].map((leg) => (
                        <div className="direction-leg" key={leg}>
                          <h3>
                            <span>{leg + 1}</span>{" "}
                            {shortPlace(plan.places[leg].name)}{" "}
                            <ArrowRight size={14} />{" "}
                            {shortPlace(plan.places[leg + 1].name)}
                          </h3>
                          <ol>
                            {plan.route.directions
                              .filter((d) => d.leg === leg)
                              .map((d, i) => (
                                <li key={i}>
                                  <span>{d.instruction}</span>
                                  <b>
                                    {d.miles < 0.1
                                      ? "< 0.1"
                                      : d.miles.toFixed(1)}{" "}
                                    mi
                                  </b>
                                </li>
                              ))}
                          </ol>
                        </div>
                      ))}
                    </section>
                  )}
                  <Assumptions />
                </>
              )}
            </div>
          </div>
          <footer className="app-footer">
            <span>
              HAULPLAN <span>·</span> A little planning. A better journey.
            </span>
            <span>Powered by OpenStreetMap & OSRM</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function FlagIcon() {
  return <MapPin size={20} />;
}
