"""
Automated unit and integration test suite for ComfyUI client, status, and diagnostic runner.
Uses standard library unittest so it runs without extra test runner dependencies.
"""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.services.ai.comfyui_client import ComfyUIClient, get_comfyui_url

client = TestClient(app)


class TestComfyUIIntegration(unittest.TestCase):
    def test_comfyui_url_configuration(self):
        """Verify default and secret-configured ComfyUI URLs."""
        url = get_comfyui_url()
        self.assertTrue(url.startswith("http"))
        self.assertFalse(url.endswith("/"))

    def test_build_prompt_workflow(self):
        """Verify standard 7-node ComfyUI API graph generation."""
        c = ComfyUIClient(base_url="http://127.0.0.1:8188")
        wf = c.build_prompt_workflow(
            prompt="A moody cinematic shot of a detective in rain",
            negative_prompt="blurry",
            width=1024,
            height=576,
            steps=25,
            cfg=7.5,
            seed=424242,
        )

        self.assertIn("3", wf)
        self.assertEqual(wf["3"]["class_type"], "KSampler")
        self.assertEqual(wf["3"]["inputs"]["seed"], 424242)
        self.assertEqual(wf["3"]["inputs"]["steps"], 25)
        self.assertEqual(wf["3"]["inputs"]["cfg"], 7.5)

        self.assertIn("5", wf)
        self.assertEqual(wf["5"]["class_type"], "EmptyLatentImage")
        self.assertEqual(wf["5"]["inputs"]["width"], 1024)
        self.assertEqual(wf["5"]["inputs"]["height"], 576)

        self.assertEqual(wf["6"]["inputs"]["text"], "A moody cinematic shot of a detective in rain")
        self.assertEqual(wf["7"]["inputs"]["text"], "blurry")
        self.assertEqual(wf["9"]["class_type"], "SaveImage")

    def test_api_comfyui_status_endpoint(self):
        """Verify GET /api/storyboard/comfyui/status returns valid status structure."""
        res = client.get("/api/storyboard/comfyui/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("reachable", data)
        self.assertIn("url", data)
        self.assertIn("latency_ms", data)

    def test_api_comfyui_test_suite_endpoint(self):
        """Verify POST /api/settings/comfyui/test executes the diagnostic test runner."""
        res = client.post("/api/settings/comfyui/test", json={"url": "http://127.0.0.1:8188"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("overall_pass", data)
        self.assertIn("tests", data)
        self.assertGreater(len(data["tests"]), 0)
        self.assertIn("1. HTTP Ping & Server Reachability", data["tests"][0]["name"])


if __name__ == "__main__":
    unittest.main()
