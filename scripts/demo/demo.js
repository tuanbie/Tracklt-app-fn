// Records a tutorial walkthrough of TrackIt (web build) in a phone viewport.
// Every step drives the real UI, so this doubles as an end-to-end test.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:8081';
const VIDEO_DIR = path.join(__dirname, 'video');
const SIZE = { width: 412, height: 892 };

const OVERLAY = `
  window.__caption = (step, text) => {
    let el = document.getElementById('__cap');
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.style.cssText = 'position:fixed;left:12px;right:12px;top:58px;z-index:99999;padding:12px 14px;border-radius:14px;' +
        'background:rgba(17,24,39,.88);color:#fff;font:600 15px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);' +
        'transition:opacity .25s;pointer-events:none';
      document.body.appendChild(el);
    }
    el.innerHTML = step ? '<div style="font-size:11px;letter-spacing:.06em;opacity:.7;margin-bottom:2px">BƯỚC ' + step + '</div>' + text : text;
    el.style.opacity = text ? '1' : '0';
  };
  document.addEventListener('pointerdown', (e) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:99998;width:36px;height:36px;border-radius:50%;pointer-events:none;' +
      'background:rgba(61,214,179,.45);border:2px solid #0E7C66;transform:translate(-50%,-50%) scale(.6);transition:all .45s ease-out;' +
      'left:' + e.clientX + 'px;top:' + e.clientY + 'px';
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'translate(-50%,-50%) scale(1.4)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 500);
  }, true);
`;

(async () => {
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: SIZE,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    locale: 'vi-VN',
    recordVideo: { dir: VIDEO_DIR, size: SIZE },
  });
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  globalThis.__page = page; // for failure diagnostics
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const caption = async (text, ms = 1800) => {
    n += 1;
    await page.evaluate(([s, t]) => window.__caption(s, t), [n, text]);
    await wait(ms);
  };
  const note = (text) => page.evaluate((t) => window.__caption(null, t), text);
  // Stacked web screens stay in the DOM, so always target a visible match (last = top-most screen).
  const visible = (locator, first) => {
    const v = locator.filter({ visible: true });
    return first ? v.first() : v.last();
  };
  const tap = async (locator, first = false) => {
    const el = visible(locator, first);
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await el.click();
    await wait(650);
  };
  const type = async (locator, text) => {
    await tap(locator);
    await visible(locator).pressSequentially(text, { delay: 70 });
    await wait(400);
  };
  // Accessible names carry a leading icon glyph, so match on the label suffix.
  const button = (name) => page.getByRole('button', { name: new RegExp(`(^|\\s)${name}$`) });
  const chip = (name) => page.getByRole('radio', { name: new RegExp(name) });
  const tab = (name) => page.getByRole("tab", { name: new RegExp(`${name}$`) });
  const amount = () => page.getByLabel('Số tiền (VND)', { exact: true });

  async function addTxn({ kind, value, category, wallet, toWallet, noteText }) {
    await tap(button('Thêm giao dịch'));
    if (kind !== 'Chi') await tap(page.getByRole('tab', { name: kind, exact: true }));
    await type(amount(), value);
    if (category) await tap(chip(category));
    if (wallet) await tap(chip(wallet), true);
    if (toWallet) await tap(chip(toWallet));
    if (noteText) await type(page.getByPlaceholder('VD: Cà phê với team'), noteText);
    await tap(button('Lưu giao dịch'));
  }

  // ---------------------------------------------------------------------------
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(800);
  await note('👋 Chào mừng đến với <b>TrackIt</b> — quản lý ví, tiết kiệm & thống kê chi tiêu');
  await wait(2600);

  // Wallets
  await caption('Mở tab <b>Ví</b> để tạo tài khoản ngân hàng');
  await tap(tab('Ví'));
  await tap(button('Thêm ví'));
  await type(page.getByPlaceholder('VD: Vietcombank, MoMo'), 'Vietcombank');
  await tap(chip('Ngân hàng'));
  await caption('Nhập số dư ban đầu — số tiền tự định dạng khi gõ', 600);
  await type(amount(), '15000000');
  await tap(button('Lưu ví'));
  await caption('Ví mới xuất hiện cùng ví <b>Tiền mặt</b> mặc định', 2000);

  // Transactions
  await caption('Về <b>Tổng quan</b> và nhấn <b>+</b> để ghi khoản thu');
  await tap(tab('Tổng quan'));
  await addTxn({ kind: 'Thu', value: '25000000', category: 'Lương', wallet: 'Vietcombank', noteText: 'Lương tháng 10' });
  await caption('<b>Chuyển tiền</b> giữa các ví — không bị tính là chi tiêu', 900);
  await addTxn({ kind: 'Chuyển', value: '3000000', wallet: 'Vietcombank', toWallet: 'Tiền mặt', noteText: 'Rút ATM' });
  await caption('Ghi lại các khoản chi theo danh mục', 900);
  await addTxn({ kind: 'Chi', value: '85000', category: 'Ăn uống', wallet: 'Tiền mặt', noteText: 'Cà phê với team' });
  await addTxn({ kind: 'Chi', value: '650000', category: 'Mua sắm', wallet: 'Vietcombank', noteText: 'Giày chạy bộ' });
  await addTxn({ kind: 'Chi', value: '1200000', category: 'Hóa đơn', wallet: 'Vietcombank', noteText: 'Điện nước' });
  await caption('Số dư, thu nhập và chi tiêu cập nhật ngay lập tức', 2400);
  await page.screenshot({ path: path.join(__dirname, 'cp_home.png') });

  // Savings
  await caption('Tab <b>Tiết kiệm</b>: đặt mục tiêu và nạp tiền dần');
  await tap(tab('Tiết kiệm'));
  await tap(button('Thêm mục tiêu'));
  await type(page.getByPlaceholder('VD: Quỹ khẩn cấp 6 tháng'), 'Mua MacBook');
  await type(amount(), '35000000');
  await tap(chip('12 tháng'));
  await tap(chip('Công nghệ'));
  await tap(button('Lưu mục tiêu'));
  await caption('App tính sẵn số tiền cần để dành mỗi tháng', 1800);
  await tap(page.getByRole('button', { name: /Mua MacBook/ }));
  await tap(button('Nạp tiền'));
  await type(amount(), '5000000');
  await tap(chip('Vietcombank'));
  await tap(button('Nạp tiền'));
  await caption('Tiền được chuyển từ ví sang mục tiêu — tiến độ hiển thị trực quan', 2400);
  await page.screenshot({ path: path.join(__dirname, 'cp_goal.png') });
  await page.goBack();
  await wait(600);

  // Stats & budget
  await caption('Tab <b>Thống kê</b>: phân tích chi tiêu theo danh mục');
  await tap(tab('Thống kê'));
  await wait(1200);
  await page.mouse.wheel(0, 500);
  await wait(1200);
  await caption('Đặt <b>ngân sách</b> hàng tháng để kiểm soát chi tiêu', 800);
  await tap(button('Đặt ngân sách'));
  await tap(chip('Mua sắm'));
  await type(amount(), '700000');
  await tap(button('Lưu ngân sách'));
  await page.mouse.wheel(0, 900);
  await caption('Thanh tiến độ chuyển màu khi sắp vượt hạn mức', 2200);
  await page.mouse.wheel(0, -2000);
  await wait(500);
  await page.getByRole('tab', { name: 'Thu nhập', exact: true }).click();
  await wait(1600);

  // Dashboard + privacy
  await tap(tab('Tổng quan'));
  await caption('Tổng quan hiển thị cảnh báo ngân sách và dự báo chi tiêu', 2400);
  await caption('Nhấn biểu tượng 👁 để ẩn số dư khi ở nơi công cộng', 600);
  await tap(page.getByLabel('Ẩn/hiện số dư'));
  await wait(1200);
  await tap(page.getByLabel('Ẩn/hiện số dư'));

  // Settings: Drive + dark mode
  await caption('Vào <b>Cài đặt</b> để kết nối Google Drive', 800);
  await tap(page.getByLabel('Cài đặt'));
  await caption('Dữ liệu đồng bộ vào file <b>TrackIt/trackit-data.json</b> trên Drive của bạn (bản Android/iOS)', 3000);
  await caption('Hỗ trợ giao diện tối', 600);
  await tap(page.getByRole('tab', { name: 'Tối', exact: true }));
  await wait(1200);
  await page.goBack();
  await wait(800);
  await tap(tab('Ví'));
  await wait(1000);
  await tap(tab('Tiết kiệm'));
  await wait(1000);
  await tap(tab('Tổng quan'));
  await note('✅ Xong! TrackIt — ví, tiết kiệm, thống kê & sao lưu Google Drive');
  await wait(3000);

  await ctx.close();
  await browser.close();
  const file = fs.readdirSync(VIDEO_DIR).find((f) => f.endsWith('.webm'));
  fs.renameSync(path.join(VIDEO_DIR, file), path.join(VIDEO_DIR, 'TrackIt-demo.webm'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS');
  console.log('VIDEO', path.join(VIDEO_DIR, 'TrackIt-demo.webm'));
})().catch(async (e) => {
  console.error('DEMO_FAILED', e.message);
  const page = globalThis.__page;
  if (page) {
    await page.screenshot({ path: path.join(__dirname, 'fail.png') }).catch(() => {});
    console.error(await page.locator('body').ariaSnapshot().catch(() => ''));
  }
  process.exit(1);
});
