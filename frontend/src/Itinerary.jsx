import {
  Coffee,
  Fuel,
  Moon,
  Package,
  Flag,
  Truck,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { duration, stamp, number } from "./utils";
const icons = {
  drive: Truck,
  break: Coffee,
  fuel: Fuel,
  rest: Moon,
  restart: RotateCcw,
  pickup: Package,
  dropoff: Flag,
};
export default function Itinerary({ plan }) {
  return (
    <section className="itinerary card">
      <div className="section-heading">
        <div>
          <h2>Your road ahead</h2>
          <p>Driving, stops and rest, in one timeline.</p>
        </div>
        <span className="neutral-badge">
          {plan.events.filter((e) => e.status !== "driving").length} stops
        </span>
      </div>
      <div className="timeline">
        {plan.events.map((e, i) => {
          const Icon = icons[e.kind] || Truck;
          return (
            <div className={`timeline-item event-${e.kind}`} key={i}>
              <span className="timeline-icon">
                <Icon size={16} />
              </span>
              <div className="timeline-body">
                <div className="timeline-title">
                  <h3>{e.label}</h3>
                  <span>{duration(e.end - e.start)}</span>
                </div>
                <p>{e.location}</p>
                <div className="timeline-meta">
                  <span>{stamp(e.start, plan.base_date)}</span>
                  <ChevronRight size={12} />
                  <span>{stamp(e.end, plan.base_date)}</span>
                  {e.status === "driving" && <b>{number(e.miles)} mi</b>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
