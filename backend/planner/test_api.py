import json
from unittest.mock import patch
from django.test import SimpleTestCase, Client
from .providers import ProviderError


class ApiTests(SimpleTestCase):
    data = {"current": "Chicago, IL", "pickup": "Indianapolis, IN", "dropoff": "Dallas, TX", "cycle_used": 24, "start": "2026-10-05T06:00", "sample": True}

    def test_saved_route_plan(self):
        response = self.client.post("/api/plan/", self.data, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertGreater(body["summary"]["miles"], 1000)
        self.assertGreater(len(body["days"]), 1)
        self.assertGreater(len(body["route"]["geometry"]), 50)
        self.assertTrue(all("coordinate" in e for e in body["events"]))

    def test_bad_inputs(self):
        for patch_data in ({"cycle_used": "nan"}, {"cycle_used": True}, {"cycle_used": -1}, {"cycle_used": 71}, {"current": ""}, {"start": None}, {"start": "invalid"}, {"sample": "false"}):
            response = self.client.post("/api/plan/", {**self.data, **patch_data}, content_type="application/json")
            self.assertEqual(response.status_code, 400)
        for data in ([], None, "not an object"):
            response = self.client.post("/api/plan/", json.dumps(data), content_type="application/json")
            self.assertEqual(response.status_code, 400)

    def test_method_and_content_type(self):
        self.assertEqual(self.client.get("/api/plan/").status_code, 405)
        self.assertEqual(self.client.post("/api/plan/", "hello", content_type="text/plain").status_code, 415)
        self.assertEqual(self.client.post("/api/plan/", "{", content_type="application/json").status_code, 400)

    def test_csrf_protection(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post("/api/plan/", self.data, content_type="application/json").status_code, 403)
        token = client.get("/api/csrf/").json()["token"]
        self.assertEqual(client.post("/api/plan/", self.data, content_type="application/json", HTTP_X_CSRFTOKEN=token).status_code, 200)

    @patch("planner.views.geocode", side_effect=ProviderError("Map unavailable"))
    def test_upstream_failure_is_explicit(self, mock):
        response = self.client.post("/api/plan/", {**self.data, "sample": False}, content_type="application/json")
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["error"], "Map unavailable")
