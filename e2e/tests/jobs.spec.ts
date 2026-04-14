import { expect, test } from "@playwright/test";

// Each test creates a job with a unique name and tracks its ID for cleanup.
// Cleanup runs via the API through the nginx proxy so tests stay independent.

let createdJobId: number | null = null;
let extraJobId: number | null = null;

test.afterEach(async ({ request, baseURL }) => {
  if (createdJobId !== null) {
    await request.delete(`${baseURL}/api/jobs/${createdJobId}/`);
    createdJobId = null;
  }
  if (extraJobId !== null) {
    await request.delete(`${baseURL}/api/jobs/${extraJobId}/`);
    extraJobId = null;
  }
});

test("create a new job and verify it appears with PENDING status", async ({
  page,
  request,
  baseURL,
}) => {
  const jobName = `Test Job ${Date.now()}`;

  await page.goto("/");

  // Submit the create form
  await page.getByTestId("job-name-input").fill(jobName);
  await page.getByTestId("create-job-submit").click();

  // Wait for the row to appear in the list
  const row = page.locator('[data-testid="job-row"]', { hasText: jobName });
  await expect(row).toBeVisible();

  // Status badge should read PENDING
  await expect(row.getByTestId("status-badge")).toHaveText("PENDING");

  // Record the job ID for cleanup by fetching the job list
  const res = await request.get(`${baseURL}/api/jobs/`);
  const data = (await res.json()) as {
    results: Array<{ id: number; name: string }>;
  };
  const created = data.results.find((j) => j.name === jobName);
  if (created) createdJobId = created.id;
});

test("update a job's status and verify the change is reflected", async ({
  page,
  request,
  baseURL,
}) => {
  const jobName = `Test Job ${Date.now()}`;

  // Create the job via API to keep setup fast, then reload
  const res = await request.post(`${baseURL}/api/jobs/`, {
    data: { name: jobName },
  });
  const job = (await res.json()) as { id: number };
  createdJobId = job.id;

  await page.goto("/");

  // Locate the row
  const row = page.locator('[data-testid="job-row"]', { hasText: jobName });
  await expect(row).toBeVisible();

  // Click the pencil icon to open the inline status editor
  await row.getByTestId("status-edit-button").click();

  // Select RUNNING from the inline dropdown
  await row.getByTestId("status-select").selectOption("RUNNING");

  // Badge should update to RUNNING
  await expect(row.getByTestId("status-badge")).toHaveText("RUNNING");
});

test("delete a job and verify it is removed from the list", async ({
  page,
  request,
  baseURL,
}) => {
  const jobName = `Test Job ${Date.now()}`;

  // Create via API
  const res = await request.post(`${baseURL}/api/jobs/`, {
    data: { name: jobName },
  });
  const job = (await res.json()) as { id: number };
  createdJobId = job.id;

  await page.goto("/");

  const row = page.locator('[data-testid="job-row"]', { hasText: jobName });
  await expect(row).toBeVisible();

  // Open the kebab menu and click Delete
  await row.getByTestId("job-menu-button").click();
  await row.getByTestId("delete-job-button").click();

  // Row should disappear from the list
  await expect(row).not.toBeVisible();

  // Job was deleted — no need for afterEach cleanup
  createdJobId = null;
});

test("filter by status shows only matching jobs", async ({
  page,
  request,
  baseURL,
}) => {
  const ts = Date.now();
  const pendingName = `Filter-Pending-${ts}`;
  const runningName = `Filter-Running-${ts}`;

  // Create a PENDING job
  const resA = await request.post(`${baseURL}/api/jobs/`, {
    data: { name: pendingName },
  });
  createdJobId = ((await resA.json()) as { id: number }).id;

  // Create a job and advance it to RUNNING
  const resB = await request.post(`${baseURL}/api/jobs/`, {
    data: { name: runningName },
  });
  const jobB = (await resB.json()) as { id: number };
  extraJobId = jobB.id;
  await request.patch(`${baseURL}/api/jobs/${jobB.id}/`, {
    data: { status: "RUNNING" },
  });

  await page.goto("/");

  // Apply PENDING filter
  await page.getByTestId("status-filter").selectOption("PENDING");

  const pendingRow = page.locator('[data-testid="job-row"]', { hasText: pendingName });
  const runningRow = page.locator('[data-testid="job-row"]', { hasText: runningName });

  await expect(pendingRow).toBeVisible();
  await expect(runningRow).not.toBeVisible();

  // Switch to RUNNING filter — results should invert
  await page.getByTestId("status-filter").selectOption("RUNNING");
  await expect(runningRow).toBeVisible();
  await expect(pendingRow).not.toBeVisible();
});

test("sort by name orders jobs alphabetically", async ({
  page,
  request,
  baseURL,
}) => {
  const ts = Date.now();
  const nameA = `Aaa-Sort-${ts}`;
  const nameZ = `Zzz-Sort-${ts}`;

  // Create both jobs (both start PENDING)
  const resA = await request.post(`${baseURL}/api/jobs/`, { data: { name: nameA } });
  createdJobId = ((await resA.json()) as { id: number }).id;

  const resZ = await request.post(`${baseURL}/api/jobs/`, { data: { name: nameZ } });
  extraJobId = ((await resZ.json()) as { id: number }).id;

  await page.goto("/");

  // Filter to PENDING so only our two test jobs are reliably visible together
  await page.getByTestId("status-filter").selectOption("PENDING");

  // Sort A–Z: Aaa should appear before Zzz in the DOM
  await page.getByTestId("ordering-select").selectOption("name");
  const rows = page.locator('[data-testid="job-row"]');
  const indexA_asc = await rows.filter({ hasText: nameA }).evaluate((el) =>
    Array.from(el.closest("tbody")!.querySelectorAll('[data-testid="job-row"]')).indexOf(el)
  );
  const indexZ_asc = await rows.filter({ hasText: nameZ }).evaluate((el) =>
    Array.from(el.closest("tbody")!.querySelectorAll('[data-testid="job-row"]')).indexOf(el)
  );
  expect(indexA_asc).toBeLessThan(indexZ_asc);

  // Sort Z–A: Zzz should now appear before Aaa
  await page.getByTestId("ordering-select").selectOption("-name");
  const indexA_desc = await rows.filter({ hasText: nameA }).evaluate((el) =>
    Array.from(el.closest("tbody")!.querySelectorAll('[data-testid="job-row"]')).indexOf(el)
  );
  const indexZ_desc = await rows.filter({ hasText: nameZ }).evaluate((el) =>
    Array.from(el.closest("tbody")!.querySelectorAll('[data-testid="job-row"]')).indexOf(el)
  );
  expect(indexZ_desc).toBeLessThan(indexA_desc);
});
