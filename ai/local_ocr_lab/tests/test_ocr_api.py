from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import UnidentifiedImageError

from app.api.ocr import MAX_IMAGE_BYTES, router
from app.schemas.ocr import BusinessCardOcrLine, BusinessCardOcrResponse, BusinessCardPaddleOutput


class OcrApiTests(unittest.TestCase):
    def setUp(self) -> None:
        app = FastAPI()
        app.include_router(router)
        self.client = TestClient(app)

    def test_business_card_endpoint_rejects_non_image_file(self) -> None:
        response = self.client.post(
            "/ocr/business-card",
            files={"file": ("note.txt", b"not-an-image", "text/plain")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "image file only"})

    def test_business_card_endpoint_rejects_empty_image(self) -> None:
        response = self.client.post(
            "/ocr/business-card",
            files={"file": ("empty.png", b"", "image/png")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "empty file"})

    def test_business_card_endpoint_rejects_oversized_image(self) -> None:
        response = self.client.post(
            "/ocr/business-card",
            files={"file": ("large.png", b"0" * (MAX_IMAGE_BYTES + 1), "image/png")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "file too large"})

    @patch("app.api.ocr.analyze_business_card")
    def test_business_card_endpoint_returns_ocr_result(self, mock_analyze_business_card) -> None:
        mock_analyze_business_card.return_value = BusinessCardOcrResponse(
            company_name="ACME Corp.",
            contact_name="Kim Minsoo",
            position="Director",
            address="Seoul Seocho-gu Teheran-ro 123",
            email="minsoo.kim@acme.co.kr",
            mobile_phone="010-1234-5678",
            office_phone="02-345-6789",
            fax_phone="02-345-6790",
            raw_text="raw text",
        )

        response = self.client.post(
            "/ocr/business-card",
            files={"file": ("card.png", b"image-bytes", "image/png")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["company_name"], "ACME Corp.")
        self.assertEqual(response.json()["contact_name"], "Kim Minsoo")
        self.assertEqual(response.json()["position"], "Director")
        self.assertEqual(response.json()["address"], "Seoul Seocho-gu Teheran-ro 123")
        self.assertEqual(response.json()["email"], "minsoo.kim@acme.co.kr")
        self.assertEqual(response.json()["mobile_phone"], "010-1234-5678")
        self.assertEqual(response.json()["office_phone"], "02-345-6789")
        self.assertEqual(response.json()["fax_phone"], "02-345-6790")
        self.assertEqual(response.json()["raw_text"], "raw text")
        mock_analyze_business_card.assert_called_once_with(
            "card.png",
            "image/png",
            b"image-bytes",
        )

    @patch("app.api.ocr.analyze_business_card")
    def test_business_card_endpoint_translates_runtime_error(self, mock_analyze_business_card) -> None:
        mock_analyze_business_card.side_effect = RuntimeError("ocr failed")

        response = self.client.post(
            "/ocr/business-card",
            files={"file": ("card.png", b"image-bytes", "image/png")},
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "ocr failed"})

    @patch("app.api.ocr.analyze_business_card")
    def test_business_card_endpoint_rejects_invalid_image_payload(self, mock_analyze_business_card) -> None:
        mock_analyze_business_card.side_effect = UnidentifiedImageError("cannot identify image file")

        response = self.client.post(
            "/ocr/business-card",
            files={"file": ("card.png", b"image-bytes", "image/png")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "invalid image file"})

    @patch("app.api.ocr.extract_business_card_paddle_output")
    def test_business_card_paddle_output_endpoint_returns_raw_lines(self, mock_extract_paddle_output) -> None:
        mock_extract_paddle_output.return_value = BusinessCardPaddleOutput(
            raw_text="ACME Corp.\nKim Minsoo",
            lines=[
                BusinessCardOcrLine(text="ACME Corp.", line_index=0, top=10, left=20, width=120, height=30),
                BusinessCardOcrLine(text="Kim Minsoo", line_index=1, top=60, left=20, width=110, height=24),
            ],
        )

        response = self.client.post(
            "/ocr/business-card/paddle-output",
            files={"file": ("card.png", b"image-bytes", "image/png")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["raw_text"], "ACME Corp.\nKim Minsoo")
        self.assertEqual(response.json()["lines"][0]["text"], "ACME Corp.")
        self.assertEqual(response.json()["lines"][0]["line_index"], 0)
        mock_extract_paddle_output.assert_called_once_with(
            "card.png",
            "image/png",
            b"image-bytes",
        )


if __name__ == "__main__":
    unittest.main()
