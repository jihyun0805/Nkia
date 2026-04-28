from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.business_card_ocr import OCRLine, analyze_business_card


class AnalyzeBusinessCardTests(unittest.TestCase):
    @patch("app.services.business_card_ocr.predict_business_card_fields")
    @patch("app.services.business_card_ocr._extract_line_candidates")
    @patch("app.services.business_card_ocr._load_image_variants")
    def test_analyze_business_card_maps_model_predictions(
        self,
        mock_load_image_variants,
        mock_extract_line_candidates,
        mock_predict_business_card_fields,
    ) -> None:
        mock_load_image_variants.return_value = ["variant"]
        mock_extract_line_candidates.return_value = [
            OCRLine(text="ACME Corp.", order=0, top=10, left=20, width=180, height=32),
            OCRLine(text="Sales Division", order=1, top=80, left=30, width=140, height=20),
            OCRLine(text="Kim Minsoo", order=2, top=55, left=35, width=110, height=28),
            OCRLine(text="mobile 010-1234-5678", order=3, top=140, left=30, width=200, height=18),
            OCRLine(text="tel 02-345-6789", order=4, top=165, left=30, width=160, height=18),
            OCRLine(text="mail minsoo.kim@acme.co.kr", order=5, top=190, left=30, width=240, height=18),
            OCRLine(text="Cloud Business", order=6, top=105, left=30, width=135, height=20),
        ]
        mock_predict_business_card_fields.return_value = {
            "company_name": "ACME Corp.",
            "contact_name": "Kim Minsoo",
            "department_name": "Sales Division",
            "responsibility": "Cloud Business",
            "mobile_phone": "mobile 010-1234-5678",
            "office_phone": "tel 02-345-6789",
            "email": "mail minsoo.kim@acme.co.kr",
        }

        response = analyze_business_card(
            "business-card.png",
            "image/png",
            b"image-bytes",
        )

        mock_predict_business_card_fields.assert_called_once_with(
            [
                "ACME Corp.",
                "Kim Minsoo",
                "Sales Division",
                "Cloud Business",
                "mobile 010-1234-5678",
                "tel 02-345-6789",
                "mail minsoo.kim@acme.co.kr",
            ]
        )
        self.assertEqual(response.company_name, "ACME Corp.")
        self.assertEqual(response.contact_name, "Kim Minsoo")
        self.assertEqual(response.department_name, "Sales Division")
        self.assertEqual(response.responsibility, "Cloud Business")
        self.assertEqual(response.mobile_phone, "010-1234-5678")
        self.assertEqual(response.office_phone, "02-345-6789")
        self.assertEqual(response.email, "minsoo.kim@acme.co.kr")
        self.assertEqual(set(response.raw_text.splitlines()), {line.text for line in mock_extract_line_candidates.return_value})

    @patch("app.services.business_card_ocr.predict_business_card_fields")
    @patch("app.services.business_card_ocr._extract_line_candidates")
    @patch("app.services.business_card_ocr._load_image_variants")
    def test_analyze_business_card_returns_raw_text_only_when_no_lines(
        self,
        mock_load_image_variants,
        mock_extract_line_candidates,
        mock_predict_business_card_fields,
    ) -> None:
        mock_load_image_variants.return_value = ["variant"]
        mock_extract_line_candidates.return_value = []

        response = analyze_business_card(
            "business-card.png",
            "image/png",
            b"image-bytes",
        )

        mock_predict_business_card_fields.assert_not_called()
        self.assertIsNone(response.company_name)
        self.assertIsNone(response.contact_name)
        self.assertIsNone(response.position)
        self.assertIsNone(response.address)
        self.assertIsNone(response.email)
        self.assertIsNone(response.mobile_phone)
        self.assertIsNone(response.office_phone)
        self.assertIsNone(response.fax_phone)
        self.assertIsNone(response.responsibility)
        self.assertIsNone(response.department_name)
        self.assertIsNone(response.raw_text)


if __name__ == "__main__":
    unittest.main()
