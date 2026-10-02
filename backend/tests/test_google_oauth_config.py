import unittest
from unittest.mock import patch

from app.services import google_oauth


class TestGoogleOAuthConfig(unittest.TestCase):
    @patch.object(google_oauth.settings, "google_client_id", "your-google-client-id.apps.googleusercontent.com")
    @patch.object(google_oauth.settings, "google_client_secret", "your-google-client-secret")
    @patch.object(google_oauth.settings, "google_redirect_uri", "http://localhost:8000/api/auth/google/callback")
    def test_placeholder_credentials_raise_runtime_error(self):
        with self.assertRaises(RuntimeError):
            google_oauth.get_google_oauth_config()

    @patch.object(google_oauth.settings, "google_client_id", "real-client-id.apps.googleusercontent.com")
    @patch.object(google_oauth.settings, "google_client_secret", "real-client-secret")
    @patch.object(google_oauth.settings, "google_redirect_uri", "http://localhost:8000/api/auth/google/callback")
    def test_real_credentials_are_accepted(self):
        client_id, client_secret, redirect_uri = google_oauth.get_google_oauth_config()
        self.assertEqual(client_id, "real-client-id.apps.googleusercontent.com")
        self.assertEqual(client_secret, "real-client-secret")
        self.assertEqual(redirect_uri, "http://localhost:8000/api/auth/google/callback")


if __name__ == "__main__":
    unittest.main()
