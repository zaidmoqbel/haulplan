import { clock, dateLabel, shortPlace } from "./utils";

const rows = [
  ["off_duty", "1. Off duty"],
  ["sleeper", "2. Sleeper berth"],
  ["driving", "3. Driving"],
  ["on_duty", "4. On duty"],
];
export function DutyGraph({ day }) {
  const x = (n) => 142 + (n / 1440) * 720,
    y = (status) => 51 + rows.findIndex(([s]) => s === status) * 38;
  const path = day.segments
    .map(
      (s, i) =>
        `${i ? "L" : "M"}${x(s.start)},${y(s.status)} L${x(s.end)},${y(s.status)}`,
    )
    .join(" ");
  return (
    <svg
      className="duty-graph"
      viewBox="0 0 958 213"
      role="img"
      aria-label={`Duty status graph for ${day.date}. ${clock(day.totals.driving)} driving; ${clock(day.totals.on_duty)} on duty; ${clock(day.totals.off_duty)} off duty.`}
    >
      <rect
        x="142"
        y="31"
        width="720"
        height="152"
        fill="#fff"
        stroke="#84958e"
      />
      {Array.from({ length: 25 }, (_, h) => (
        <g key={h}>
          <text
            x={142 + h * 30}
            y="20"
            textAnchor="middle"
            fontSize="10"
            fill="#485c52"
          >
            {h === 0 || h === 24 ? "Mid." : h === 12 ? "Noon" : h}
          </text>
          <line
            x1={142 + h * 30}
            x2={142 + h * 30}
            y1="31"
            y2="183"
            stroke="#bbc7c0"
            strokeWidth={h % 6 === 0 ? 1.4 : 0.8}
          />
        </g>
      ))}
      {rows.map(([status, label], i) => (
        <g key={status}>
          <text x="0" y={y(status) + 4} fontSize="12" fill="#273c32">
            {label}
          </text>
          {i === 3 && (
            <text x="0" y={y(status) + 17} fontSize="9" fill="#64776c">
              (not driving)
            </text>
          )}
          <line
            x1="142"
            x2="862"
            y1={31 + i * 38}
            y2={31 + i * 38}
            stroke="#bbc7c0"
          />
          {Array.from({ length: 96 }, (_, n) => (
            <line
              key={n}
              x1={142 + n * 7.5}
              x2={142 + n * 7.5}
              y1={31 + i * 38}
              y2={31 + i * 38 + (n % 2 === 0 ? 11 : 6)}
              stroke="#b6c1bb"
              strokeWidth=".6"
            />
          ))}
          <text
            x="910"
            y={y(status) + 4}
            textAnchor="middle"
            fontSize="12"
            fontFamily="monospace"
          >
            {clock(day.totals[status])}
          </text>
        </g>
      ))}
      <text x="910" y="20" textAnchor="middle" fontSize="10">
        HOURS
      </text>
      <path
        d={path}
        fill="none"
        stroke="#207555"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <text x="860" y="205" textAnchor="end" fontSize="10" fill="#65766c">
        24-hour total
      </text>
      <text
        x="910"
        y="205"
        textAnchor="middle"
        fontSize="12"
        fontFamily="monospace"
      >
        24:00
      </text>
    </svg>
  );
}

function Field({ label, value }) {
  return (
    <div className="paper-field">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

export default function LogSheet({ day, plan, index }) {
  const input = plan.input;
  return (
    <article className="log-sheet">
      <header className="paper-heading">
        <div>
          <span className="eyebrow">HAULPLAN / PLANNED DUTY RECORD</span>
          <h2>Driver’s daily log</h2>
          <p>
            One calendar day · 24 hours · {input.clock || "Home-terminal time"}
          </p>
        </div>
        <div className="paper-date">
          <strong>
            {dateLabel(day.date)}, {day.date.slice(0, 4)}
          </strong>
          <span>
            Sheet {index + 1} of {plan.days.length}
          </span>
        </div>
      </header>
      <div className="paper-fields">
        <Field label="DRIVER" value={input.driver} />
        <Field label="CARRIER" value={input.carrier} />
        <Field
          label="TOTAL DRIVING MILES"
          value={`${day.miles.toFixed(1)} mi`}
        />
        <Field label="VEHICLE / TRAILER" value={input.vehicle} />
        <Field label="MAIN OFFICE / HOME TERMINAL" value={input.office} />
        <Field label="SHIPPING DOCUMENT / COMMODITY" value={input.shipping} />
      </div>
      <div className="paper-route">
        <span>
          <b>From</b> {shortPlace(plan.places[0].name)}
        </span>
        <span>
          <b>To</b> {shortPlace(plan.places[2].name)}
        </span>
      </div>
      <DutyGraph day={day} />
      <div className="paper-remarks">
        <h3>Remarks & duty changes</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Activity</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {day.segments.map((s, i) => (
              <tr key={i}>
                <td>
                  {clock(s.start)}–{clock(s.end)}
                </td>
                <td>{s.label}</td>
                <td>{s.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="paper-footer">
        <span>
          On duty today (driving + other):{" "}
          <b>{clock(day.totals.driving + day.totals.on_duty)}</b>
        </span>
        <span>Driver certification: ____________________</span>
      </footer>
      <p className="paper-note">
        Planning draft. Confirm actual duty changes, city/state remarks,
        mileage, carrier information and signature before use. Intermediate stop
        locations are estimates; daily padding is assumed off duty. This is not
        a certified ELD record.
      </p>
    </article>
  );
}
