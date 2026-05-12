import { test, expect } from '@playwright/test';

test.describe('学生完整学习流程', () => {
  test('登录 -> 答疑 -> 查看知识图谱 -> 考试', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="email-input"]', 'user77@delta.ai');
    await page.fill('[data-testid="password-input"]', 'delta77admin');
    await page.click('[data-testid="login-btn"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    await page.click('[data-testid="chat-tab"]');
    await page.fill('[data-testid="chat-input"]', '一元二次方程求根公式');
    await page.click('[data-testid="send-btn"]');

    await page.waitForTimeout(3000);

    await page.click('[data-testid="knowledge-tab"]');

    await page.click('[data-testid="exam-tab"]');
    await page.click('[data-testid="start-practice-exam"]');
  });
});

test.describe('77号超级管理员', () => {
  test('超级管理员登录', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="email-input"]', 'user77@delta.ai');
    await page.fill('[data-testid="password-input"]', 'delta77admin');
    await page.click('[data-testid="login-btn"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    await expect(page.locator('[data-testid="dashboard-tab"]')).toBeVisible();
  });
});

test.describe('口语训练', () => {
  test('进入口语训练页面', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="email-input"]', 'user77@delta.ai');
    await page.fill('[data-testid="password-input"]', 'delta77admin');
    await page.click('[data-testid="login-btn"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    await page.click('[data-testid="speaking-tab"]');
    await expect(page.locator('[data-testid="start-speaking-session"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('考试中心', () => {
  test('进入考试中心并选择练习模式', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="email-input"]', 'user77@delta.ai');
    await page.fill('[data-testid="password-input"]', 'delta77admin');
    await page.click('[data-testid="login-btn"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    await page.click('[data-testid="exam-tab"]');
    await expect(page.locator('[data-testid="start-practice-exam"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-quiz-exam"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-simulation-exam"]')).toBeVisible();
  });
});
