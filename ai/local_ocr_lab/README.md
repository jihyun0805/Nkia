## Local OCR Lab

This directory is for local-only OCR experiments.

### Structure

- `samples/`: put business card images here.
- `labels/`: add a JSON file with the same stem as each image for evaluation.
- `paddleoutputs/`: PaddleOCR-like OCR results are written here.
- `pytorch_outputs/`: PyTorch model checkpoints and metadata are written here.
- `run_business_card_ocr.py`: runs the existing OCR service against one image file.
- `evaluate_business_card_ocr.py`: compares OCR results against labels and builds an accuracy report.

### Usage

From `ai/`:

```powershell
uv run python local_ocr_lab/run_business_card_ocr.py --input local_ocr_lab/samples/sample.png
uv run python local_ocr_lab/run_business_card_ocr.py --input local_ocr_lab/samples/sample.png --pretty
uv run python local_ocr_lab/evaluate_business_card_ocr.py --input local_ocr_lab/samples/sample.png
uv run python local_ocr_lab/train_field_classifier.py --generate-missing-outputs
```

OCR results are saved as JSON under `local_ocr_lab/paddleoutputs/`.

### Label format

If you have `samples/card_01.png`, create `labels/card_01.json`.
Use `labels/_template.json` as the starting format.
For detailed labeling rules for model training, see [DATASET_FORMAT.md](C:\Users\SSAFY\nkia\S14P31S106\ai\local_ocr_lab\DATASET_FORMAT.md).

The evaluator currently scores these fields:

- `company_name`
- `contact_name`
- `position`
- `address`
- `email`
- `mobile_phone`
- `office_phone`
- `fax_phone`
- `responsibility`
- `department_name`

### Training baseline

`train_field_classifier.py` trains a PyTorch baseline that classifies each OCR line into one target field.
It uses:

- `labels/` as ground truth
- `paddleoutputs/` as OCR raw-text source
- optional `--generate-missing-outputs` to create missing OCR JSON first
