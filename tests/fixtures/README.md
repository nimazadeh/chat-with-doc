# Synthetic PDF fixtures

`pdf.ts` creates small, two-page educational PDFs using pdf-lib. Its blank variant exercises the no-selectable-text path (no OCR).

`encrypted.pdf` is synthetic, generated from a one-page pdf-lib document containing "Private fixture material" and encrypted with pypdf using the test-only password `fixture-only-password`. It contains no personal material. Python/pypdf is not needed to run the tests; this tiny PDF is checked in so CI can exercise a real encrypted document.
