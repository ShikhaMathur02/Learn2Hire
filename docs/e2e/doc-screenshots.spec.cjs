// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.PLAYWRIGHT_API_URL || 'http://localhost:5000';
/** Must match backend/scripts/seedScreenshotDemoUsers.js */
const DOC_DEMO_PASSWORD = process.env.DOC_DEMO_PASSWORD || 'DocDemo@12345';
const ADMIN_EMAIL = 'admin1@gmail.com';
const ADMIN_PASSWORD = process.env.BUILTIN_ADMIN_PASSWORD || 'Admin@12345';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const IDS_PATH = path.join(REPO_ROOT, 'docs', 'screenshot-ids.json');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'bw_figures');

function loadIds() {
  if (!fs.existsSync(IDS_PATH)) {
    throw new Error(
      `Missing ${IDS_PATH}. Run: cd backend && npm run seed:doc-users`
    );
  }
  return JSON.parse(fs.readFileSync(IDS_PATH, 'utf8'));
}

async function snap(page, stem, { fullPage = true } = {}) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const buf = await page.screenshot({ fullPage, type: 'png', animations: 'disabled' });
  const out = path.join(OUT_DIR, `${stem}.png`);
  await fs.promises.writeFile(out, buf);
}

async function dismissLoading(page) {
  await page.getByText(/^Loading\.\.\.$/).waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function login(page, email, password) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await dismissLoading(page);
}

async function clearSession(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}

async function fetchFirstMaterialMeta(request) {
  const res = await request.get(`${API_BASE}/api/learning/materials`);
  if (!res.ok()) return { slug: null, categorySlug: null };
  const j = await res.json();
  const m = j.data?.materials?.[0];
  if (!m) return { slug: null, categorySlug: null };
  const cat = m.category;
  const categorySlug = typeof cat === 'object' && cat?.slug ? cat.slug : null;
  return { slug: m.slug || null, categorySlug };
}

test.describe('Documentation screenshots', () => {
  test('capture all figures', async ({ page, request }) => {
    const ids = loadIds();
    const emails = ids.emails;
    expect(emails?.student).toBeTruthy();

    const meta = await fetchFirstMaterialMeta(request);

    // --- Public & auth pages (no login) ---
    await page.goto('/');
    await dismissLoading(page);
    await snap(page, '01_landing');

    await page.goto('/login');
    await snap(page, '02_login');

    await page.goto('/signup');
    await snap(page, '03_signup');

    await page.goto('/forgot-password');
    await snap(page, '04_forgot_password');

    await page.goto('/learning');
    await dismissLoading(page);
    await snap(page, '11_learning_public');

    if (meta.categorySlug) {
      await page.goto(`/learning/subject/${meta.categorySlug}`);
      await dismissLoading(page);
      await snap(page, '12_learning_subject_public');
    }

    if (meta.slug) {
      await page.goto(`/learning/topic/${meta.slug}`);
      await dismissLoading(page);
      await snap(page, '13_material_detail');
    }

    // --- Student ---
    await login(page, emails.student, DOC_DEMO_PASSWORD);
    await snap(page, '05_dashboard_student');

    await page.goto('/learning/progress');
    await dismissLoading(page);
    await snap(page, '14_learning_progress');

    await page.goto('/dashboard/learning');
    await dismissLoading(page);
    await snap(page, '16_learning_dashboard');

    if (meta.slug) {
      await page.goto(`/dashboard/learning/topic/${meta.slug}`);
      await dismissLoading(page);
      await snap(page, '13_material_detail');
    }

    await page.goto('/notifications');
    await dismissLoading(page);
    await snap(page, '17_notifications');

    await page.goto('/assessments');
    await dismissLoading(page);
    await snap(page, '18_assessments_list');

    await page.goto('/jobs');
    await dismissLoading(page);
    await snap(page, '21_jobs');

    if (ids.jobId) {
      await page.goto(`/jobs/${ids.jobId}`);
      await dismissLoading(page);
      await snap(page, '22_job_detail');
    }

    if (ids.assessmentId) {
      await page.goto(`/assessments/${ids.assessmentId}`);
      await dismissLoading(page);
      await snap(page, '20_assessment_take');
    }

    await clearSession(page);

    // --- Faculty ---
    await login(page, emails.faculty, DOC_DEMO_PASSWORD);
    await snap(page, '06_dashboard_faculty');

    await page.goto('/assessments/create');
    await dismissLoading(page);
    await snap(page, '19_assessment_create');

    await page.goto('/dashboard/learning/manage');
    await dismissLoading(page);
    await snap(page, '15_learning_manage');

    if (ids.studentUserId) {
      await page.goto(`/dashboard/learners/${ids.studentUserId}`);
      await dismissLoading(page);
      await snap(page, '28_learner_summary');
    }

    await clearSession(page);

    // --- Company ---
    await login(page, emails.company, DOC_DEMO_PASSWORD);
    await snap(page, '07_dashboard_company');

    await page.goto('/company/jobs');
    await dismissLoading(page);
    await snap(page, '26_company_jobs');

    await page.goto('/company/talent');
    await dismissLoading(page);
    await snap(page, '27_company_talent');

    await clearSession(page);

    // --- College ---
    await login(page, emails.college, DOC_DEMO_PASSWORD);
    await snap(page, '08_dashboard_college');

    await clearSession(page);

    // --- Admin ---
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await snap(page, '09_dashboard_admin');

    await page.goto('/admin/jobs');
    await dismissLoading(page);
    await snap(page, '23_admin_jobs');

    if (ids.studentUserId) {
      await page.goto(`/admin/users/${ids.studentUserId}`);
      await dismissLoading(page);
      await snap(page, '24_admin_user');
    }

    if (ids.collegeUserId) {
      await page.goto(`/admin/colleges/${ids.collegeUserId}`);
      await dismissLoading(page);
      await snap(page, '25_admin_college');
    }

  });
});
