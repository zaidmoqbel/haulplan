import {
  ArrowRight,
  MapPin,
  Flag,
  Package,
  RotateCcw,
  SlidersHorizontal,
  Truck,
  Clock3,
} from "lucide-react";
export const defaults = () => ({
  current: "Chicago, IL",
  pickup: "Indianapolis, IN",
  dropoff: "Dallas, TX",
  cycle_used: 24,
  start: `${new Date().toLocaleDateString("en-CA")}T06:00`,
  clock: "Central · UTC−05:00",
  driver: "",
  carrier: "",
  office: "",
  vehicle: "",
  shipping: "",
});

export default function TripForm({ form, setForm, onSubmit, onExample, busy }) {
  const update = (e) =>
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "cycle_used"
          ? e.target.value === ""
            ? ""
            : Number(e.target.value)
          : e.target.value,
    });
  return (
    <aside className="trip-panel">
      <div className="panel-heading">
        <div className="heading-icon">
          <Truck size={18} />
        </div>
        <div>
          <h2>Trip details</h2>
          <p>Every good trip starts with a plan.</p>
        </div>
      </div>
      <form onSubmit={onSubmit}>
        <div className="location-fields">
          {[
            ["current", "Current location", MapPin, "A"],
            ["pickup", "Pickup location", Package, "P"],
            ["dropoff", "Drop-off location", Flag, "B"],
          ].map(([name, label, Icon, marker]) => (
            <label className="location-field" key={name}>
              <span className={`field-marker marker-${name}`}>{marker}</span>
              <span className="field-body">
                <span className="field-label">{label}</span>
                <span className="input-wrap">
                  <input
                    name={name}
                    value={form[name]}
                    onChange={update}
                    required
                    minLength={2}
                    maxLength={250}
                    placeholder="City, state or street address"
                    autoComplete="off"
                    disabled={busy}
                  />
                  <Icon size={16} />
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="form-divider" />
        <label className="standard-label">
          Current cycle used{" "}
          <span className="input-wrap cycle-input">
            <input
              type="number"
              name="cycle_used"
              required
              min="0"
              max="70"
              step="0.1"
              value={form.cycle_used}
              onChange={update}
              disabled={busy}
            />
            <span>of 70 hrs</span>
          </span>
        </label>
        <div className="cycle-track">
          <span
            style={{
              width: `${Math.min(100, Math.max(0, (Number(form.cycle_used) / 70) * 100))}%`,
            }}
          />
        </div>
        <p className="helper">
          <Clock3 size={13} />{" "}
          {Math.max(0, 70 - Number(form.cycle_used)).toFixed(1)} hours available
          in your cycle
        </p>
        <label className="standard-label departure">
          Departure{" "}
          <input
            type="datetime-local"
            name="start"
            required
            min="2020-01-01T00:00"
            max="2100-12-31T23:59"
            value={form.start}
            onChange={update}
            disabled={busy}
          />
        </label>
        <details className="form-options">
          <summary>
            <SlidersHorizontal size={15} /> Log & clock details
          </summary>
          <label className="standard-label">
            Home-terminal clock
            <select name="clock" value={form.clock} onChange={update}>
              <option>Eastern · UTC−04:00</option>
              <option>Central · UTC−05:00</option>
              <option>Mountain · UTC−06:00</option>
              <option>Pacific · UTC−07:00</option>
              <option>Eastern · UTC−05:00</option>
              <option>Central · UTC−06:00</option>
              <option>Mountain · UTC−07:00</option>
              <option>Pacific · UTC−08:00</option>
              <option>UTC · UTC+00:00</option>
            </select>
          </label>
          <p className="helper">
            Use one fixed home-terminal clock for the whole trip. Select the
            offset in effect at departure.
          </p>
          {[
            ["driver", "Driver name"],
            ["carrier", "Carrier name"],
            ["office", "Office / home terminal"],
            ["vehicle", "Truck / trailer numbers"],
            ["shipping", "Shipping document / commodity"],
          ].map(([name, label]) => (
            <label key={name} className="standard-label">
              {label}
              <input
                name={name}
                value={form[name]}
                onChange={update}
                maxLength={200}
                placeholder="Optional"
              />
            </label>
          ))}
        </details>
        <button
          type="submit"
          className="button primary generate"
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="spinner" /> Planning your trip…
            </>
          ) : (
            <>
              Generate trip <ArrowRight size={17} />
            </>
          )}
        </button>
        <button
          type="button"
          className="example-button"
          onClick={onExample}
          disabled={busy}
        >
          <RotateCcw size={14} /> Load example trip
        </button>
      </form>
      <div className="rules-card">
        <span className="eyebrow">YOUR OPERATING RULES</span>
        <p>
          <span>Property carrying</span>
          <strong>70 hrs / 8 days</strong>
        </p>
        <p>
          <span>Pickup & delivery</span>
          <strong>1 hour each</strong>
        </p>
        <p>
          <span>Fuel interval</span>
          <strong>≤ 1,000 miles</strong>
        </p>
        <div>
          Fresh shift after 10 hours off duty.
          <br />
          No adverse driving conditions.
        </div>
      </div>
    </aside>
  );
}
