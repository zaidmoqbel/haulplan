import importlib.util
import os
from pathlib import Path
from unittest.mock import patch
from django.test import SimpleTestCase


class DeploymentSettingsTests(SimpleTestCase):
    def settings_for(self, env):
        spec = importlib.util.spec_from_file_location("deployment_settings", Path(__file__).parents[1] / "settings.py")
        module = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, env, clear=True):
            spec.loader.exec_module(module)
        return module

    def test_render_hostname_and_secure_cookies(self):
        settings = self.settings_for({"RENDER": "true", "RENDER_EXTERNAL_HOSTNAME": "haulplan-example.onrender.com", "DJANGO_SECRET_KEY": "test-only-random-secret"})
        self.assertIn("haulplan-example.onrender.com", settings.ALLOWED_HOSTS)
        self.assertIn("https://haulplan-example.onrender.com", settings.CSRF_TRUSTED_ORIGINS)
        self.assertTrue(settings.CSRF_COOKIE_SECURE)

    def test_production_requires_secret(self):
        with self.assertRaises(RuntimeError):
            self.settings_for({"RENDER": "true"})
