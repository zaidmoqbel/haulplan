import unittest
from .engine import plan_trip


def make(legs=(120, 900), cycle=0, start="2026-10-05T06:00"):
    return plan_trip([{"miles": m, "minutes": round(m / 50 * 60)} for m in legs], cycle, start)


class EngineTests(unittest.TestCase):
    def assert_valid(self, result, initial=0):
        drive = since_break = cycle = 0
        cycle = initial * 60
        shift = None
        fuel_miles = 0
        previous = None
        for e in result["events"]:
            if previous is not None:
                self.assertEqual(previous, e["start"])
            previous = e["end"]
            n = e["end"] - e["start"]
            self.assertGreater(n, 0)
            if e["status"] in ("driving", "on_duty"):
                if shift is None:
                    shift = e["start"]
                if e["status"] == "driving":
                    drive += n
                    since_break += n
                    self.assertLessEqual(drive, 660)
                    self.assertLessEqual(since_break, 480)
                    self.assertLessEqual(e["end"] - shift, 840)
                    self.assertLessEqual(cycle + n, 4200)
                    fuel_miles += e["miles"]
                    self.assertLessEqual(fuel_miles, 1000.00001)
                cycle += n
            if e["status"] != "driving" and n >= 30:
                since_break = 0
            if e["kind"] == "fuel":
                fuel_miles = 0
            if e["status"] == "off_duty" and n >= 600:
                drive = since_break = 0
                shift = None
            if e["status"] == "off_duty" and n >= 2040:
                cycle = 0
        for day in result["days"]:
            self.assertEqual(sum(day["totals"].values()), 1440)
            self.assertEqual(day["segments"][0]["start"], 0)
            self.assertEqual(day["segments"][-1]["end"], 1440)

    def test_short_trip(self):
        r = make((50, 50))
        self.assertEqual(r["summary"]["driving_minutes"], 120)
        self.assertEqual(r["summary"]["on_duty_minutes"], 120)
        self.assertEqual(r["summary"]["elapsed_minutes"], 240)
        self.assert_valid(r)

    def test_pickup_counts_as_driving_break(self):
        r = make((350, 100))
        self.assertFalse(any(e["kind"] == "break" for e in r["events"]))
        self.assert_valid(r)

    def test_break_and_overnight(self):
        r = make((0, 1200))
        self.assertTrue(any(e["kind"] == "break" for e in r["events"]))
        self.assertTrue(any(e["kind"] == "rest" for e in r["events"]))
        self.assert_valid(r)

    def test_cycle_exhaustion(self):
        for cycle in (69, 69.9, 70):
            r = make(cycle=cycle)
            self.assertTrue(any(e["kind"] == "restart" for e in r["events"]))
            self.assert_valid(r, cycle)

    def test_midnight_split(self):
        r = make((100, 100), start="2026-10-05T23:30")
        self.assertEqual(len(r["days"]), 2)
        self.assertAlmostEqual(sum(d["miles"] for d in r["days"]), 200)
        self.assert_valid(r)

    def test_fuel_and_long_trip_invariants(self):
        for miles in (1, 550, 999, 1000, 1001, 2500, 6000):
            for cycle in (0, 35, 69.5):
                r = make((50, miles), cycle)
                self.assertAlmostEqual(sum(e["miles"] for e in r["events"]), miles + 50)
                self.assert_valid(r, cycle)

    def test_zero_distance_still_loads(self):
        r = make((0, 0))
        self.assertEqual(r["summary"]["elapsed_minutes"], 120)
        self.assert_valid(r)

    def test_invalid_inputs(self):
        for cycle in (-1, 71, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                make(cycle=cycle)


if __name__ == "__main__":
    unittest.main()
