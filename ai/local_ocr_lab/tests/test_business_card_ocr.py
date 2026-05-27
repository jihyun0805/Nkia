from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.business_card_ocr import (
    OCRLine,
    _normalize_company_name,
    _normalize_contact_phones,
    _normalize_department,
    _normalize_model_email,
    _normalize_model_phone,
    _normalize_role,
    analyze_business_card,
)


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
            "department": "Sales Division",
            "role": "Cloud Business",
            "mobile": "mobile 010-1234-5678",
            "phone": "tel 02-345-6789",
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
        self.assertEqual(response.department, "Sales Division")
        self.assertEqual(response.role, "Cloud Business")
        self.assertEqual(response.mobile, "010-1234-5678")
        self.assertEqual(response.phone, "02-345-6789")
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
        self.assertIsNone(response.mobile)
        self.assertIsNone(response.phone)
        self.assertIsNone(response.fax)
        self.assertIsNone(response.role)
        self.assertIsNone(response.department)
        self.assertIsNone(response.raw_text)

    @patch("app.services.business_card_ocr.predict_business_card_fields")
    @patch("app.services.business_card_ocr._extract_line_candidates")
    @patch("app.services.business_card_ocr._load_image_variants")
    def test_analyze_business_card_splits_english_position_and_department(
        self,
        mock_load_image_variants,
        mock_extract_line_candidates,
        mock_predict_business_card_fields,
    ) -> None:
        mock_load_image_variants.return_value = ["variant"]
        mock_extract_line_candidates.return_value = [
            OCRLine(text="sample.user@sample-test.kr", order=0),
            OCRLine(text="010 1111 2222", order=1),
            OCRLine(text="Manager | Sample Platform Team 2", order=2),
            OCRLine(text="Sample User", order=3),
            OCRLine(text="Sample Inc.", order=4),
        ]
        mock_predict_business_card_fields.return_value = {
            "company_name": "Sample Inc.",
            "contact_name": "Sample User",
            "email": "sample.user@sample-test.kr",
            "mobile": "010 1111 2222",
        }

        response = analyze_business_card("business-card.png", "image/png", b"image-bytes")

        self.assertEqual(response.position, "Manager")
        self.assertEqual(response.department, "Sample Platform Team 2")

    def test_normalize_model_phone_handles_common_phone_patterns(self) -> None:
        mobile_parts = ("010", "1234", "5678")
        seoul_parts = ("02", "1234", "5678")
        grouped_parts = ("0000", "1111", "2222")
        cases = [
            (f"M ({mobile_parts[0]}) {mobile_parts[1]} {mobile_parts[2]}", "010-1234-5678"),
            (f"TEL {seoul_parts[0]} {seoul_parts[1]} {seoul_parts[2]}", "02-1234-5678"),
            (f"FAX +82-{seoul_parts[0][1:]}-{seoul_parts[1]}-{seoul_parts[2]}", "02-1234-5678"),
            (f"F. {grouped_parts[0]}-{grouped_parts[1]}-{grouped_parts[2]}", "0000-1111-2222"),
        ]

        for raw_value, expected in cases:
            with self.subTest(raw_value=raw_value):
                self.assertEqual(_normalize_model_phone(raw_value), expected)

    def test_normalize_model_email_removes_email_label_noise(self) -> None:
        cases = [
            ("e user.name@sample-test.kr", "user.name@sample-test.kr"),
            ("E. user.name@sample-test.kr", "user.name@sample-test.kr"),
            ("mail user.name@sample-test.kr", "user.name@sample-test.kr"),
            ("email user.name@sample-test.kr", "user.name@sample-test.kr"),
            ("user.name@sample-test.kr", "user.name@sample-test.kr"),
        ]

        for raw_value, expected in cases:
            with self.subTest(raw_value=raw_value):
                self.assertEqual(_normalize_model_email(raw_value), expected)

    def test_normalize_company_name_rejects_short_symbol_noise(self) -> None:
        self.assertIsNone(_normalize_company_name("S√"))
        self.assertIsNone(_normalize_company_name("V"))
        self.assertEqual(_normalize_company_name("Sample Inc."), "Sample Inc.")
        self.assertEqual(_normalize_company_name("Sample 주식회사"), "Sample 주식회사")

    def test_normalize_contact_phones_moves_mobile_number_from_phone(self) -> None:
        mobile, phone = _normalize_contact_phones(mobile_value=None, phone_value="+82 10 1111 2222")

        self.assertEqual(mobile, "010-1111-2222")
        self.assertIsNone(phone)

    def test_normalize_department_rejects_wrapped_address_detail(self) -> None:
        self.assertIsNone(_normalize_department("(샘플동,더미-타워센터)"))
        self.assertEqual(_normalize_department("Digital & Innovation"), "Digital & Innovation")

    def test_normalize_department_rejects_marketing_phrase(self) -> None:
        self.assertIsNone(_normalize_department("The Most Trustable Service Planners"))
        self.assertIsNone(_normalize_department("AI Service Provider"))
        self.assertEqual(_normalize_department("Customer Success Team"), "Customer Success Team")

    def test_normalize_role_rejects_marketing_phrase(self) -> None:
        self.assertIsNone(_normalize_role("AI Service Provider"))
        self.assertEqual(_normalize_role("플랫폼 개발"), "플랫폼 개발")

    def test_normalize_model_phone_rejects_values_without_phone_length_digits(self) -> None:
        cases = [
            "1" * 5,
            "1" * 8,
            "text without digits",
        ]

        for raw_value in cases:
            with self.subTest(raw_value=raw_value):
                self.assertIsNone(_normalize_model_phone(raw_value))


if __name__ == "__main__":
    unittest.main()
