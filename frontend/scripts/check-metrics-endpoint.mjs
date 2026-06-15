const skipCheck = ['1', 'true', 'yes'].includes(
  String(process.env.SKIP_METRICS_SMOKE_CHECK || '').toLowerCase(),
);

if (skipCheck) {
  console.log('[metrics-smoke] Skipped via SKIP_METRICS_SMOKE_CHECK.');
  process.exit(0);
}

const rawBaseUrl = process.env.VITE_API_BASE_URL?.trim();

if (!rawBaseUrl) {
  if (process.env.CI === 'true') {
    console.error('[metrics-smoke] VITE_API_BASE_URL is required in CI.');
    process.exit(1);
  }
  console.log('[metrics-smoke] VITE_API_BASE_URL not set, skipping local smoke check.');
  process.exit(0);
}

const metricsUrl = `${rawBaseUrl.replace(/\/+$/, '')}/transactions/metrics`;

async function run() {
  try {
    const response = await fetch(metricsUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const requiredFields = [
      'timestamp',
      'dataset_size',
      'precision',
      'recall',
      'f1_score',
      'roc_auc',
    ];

    const missing = requiredFields.filter((field) => !(field in data));
    if (missing.length > 0) {
      throw new Error(`Missing fields: ${missing.join(', ')}`);
    }

    console.log(`[metrics-smoke] OK: ${metricsUrl}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[metrics-smoke] Failed for ${metricsUrl} -> ${message}`);
    process.exit(1);
  }
}

run();
