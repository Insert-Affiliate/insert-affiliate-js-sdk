// src/referrals/referAFriendModal.ts
// The drop-in "Refer a friend" modal: plain DOM, a scoped <style>, no
// dependencies. Every server or user value goes in through textContent or
// an input's value, never innerHTML.
import type {
  AffiliateEnrolmentResult,
  MyAffiliateDetails,
  ReferAFriendHandle,
  ReferAFriendOptions,
  ReferralProgramConfig,
  ReferrerAffiliate,
} from './referralTypes';
import { buildReferralShareText, copyText, MyDetailsFetch, normalizeVerificationCode, shareText } from './referralApi';

/** What the modal needs from the SDK. Passed in so the modal holds no SDK state. */
export interface ReferAFriendDeps {
  hasToken(): Promise<boolean>;
  loadConfig(): Promise<ReferralProgramConfig | null>;
  loadDetails(): Promise<MyDetailsFetch>;
  enrol(email: string, name: string): Promise<AffiliateEnrolmentResult>;
  verify(email: string, code: string, name: string): Promise<AffiliateEnrolmentResult>;
  /** Saves the referrer's own accounts for an already connected user. */
  saveAccount(): Promise<boolean>;
}

const DEFAULT_COLOR = '#6A0DAD';
const DEFAULT_HEADLINE = 'Refer a friend';
const DEFAULT_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const ERROR_MESSAGES: Record<string, string> = {
  PROGRAM_DISABLED: 'Referrals are not available in this app right now.',
  AFFILIATE_LIMIT_REACHED: 'The referral program is full right now. Please try again later.',
  INVALID_CODE: 'That code is wrong or has expired. Check it or send a new code.',
  TOO_MANY_CODES: 'Too many codes have been sent. Please wait a while and try again.',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  NETWORK_ERROR: 'Could not connect. Check your connection and try again.',
};
const GENERIC_ERROR = 'Something went wrong. Please try again.';

const messageFor = (code?: string): string => (code && ERROR_MESSAGES[code]) || GENERIC_ERROR;

const STYLE = `
.ia-raf-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.ia-raf-dialog{position:relative;width:100%;max-width:420px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#1a1a1a;border-radius:var(--ia-raf-radius);box-shadow:0 12px 40px rgba(0,0,0,.25);padding:24px;box-sizing:border-box;font-family:var(--ia-raf-font);font-size:15px;line-height:1.45;text-align:left}
.ia-raf-dialog *{box-sizing:border-box}
.ia-raf-title{margin:0 36px 8px 0;font-size:20px;font-weight:700;line-height:1.3}
.ia-raf-reward{margin:0 0 16px;color:#444}
.ia-raf-close{position:absolute;margin:0;top:19px;right:14px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;padding:0 0 2px;border:0;border-radius:50%;background:transparent;color:#555;font-size:26px;line-height:1;cursor:pointer}
.ia-raf-close:hover{background:#f0f0f3}
.ia-raf-label{display:block;margin:0 0 4px;font-size:13px;font-weight:600}
.ia-raf-input{display:block;width:100%;margin:0 0 12px;padding:10px 12px;border:1px solid #c8c8cc;border-radius:calc(var(--ia-raf-radius) * .66);background:#fff;color:#1a1a1a;font:inherit}
.ia-raf-dialog :focus-visible{outline:2px solid var(--ia-raf-primary);outline-offset:2px}
.ia-raf-btn{display:block;width:100%;margin:8px 0 0;padding:12px;border:1px solid var(--ia-raf-primary);border-radius:calc(var(--ia-raf-radius) * .66);background:var(--ia-raf-primary);color:#fff;font:inherit;font-weight:600;cursor:pointer}
.ia-raf-btn[disabled]{opacity:.6;cursor:default}
.ia-raf-btn-secondary{background:transparent;color:var(--ia-raf-primary)}
.ia-raf-textbtn{display:inline-block;margin:8px 16px 0 0;padding:4px 0;border:0;background:none;color:var(--ia-raf-primary);font:inherit;font-size:14px;text-decoration:underline;cursor:pointer}
.ia-raf-error{margin:0 0 12px;padding:8px 12px;border-radius:calc(var(--ia-raf-radius) * .5);background:#fdecee;color:#b00020;font-size:14px}
.ia-raf-error:empty{display:none}
.ia-raf-muted{margin:0 0 12px;color:#555;font-size:14px}
.ia-raf-row{display:flex;align-items:center;gap:8px;margin:0 0 8px;padding:10px 12px;border:1px dashed var(--ia-raf-primary);border-radius:calc(var(--ia-raf-radius) * .66)}
.ia-raf-code{flex:1;min-width:0;font-size:20px;font-weight:700;letter-spacing:1px;word-break:break-all}
.ia-raf-url{flex:1;min-width:0;font-size:13px;color:#444;word-break:break-all}
.ia-raf-copy{flex:none;margin:0;padding:6px 10px;border:1px solid var(--ia-raf-primary);border-radius:calc(var(--ia-raf-radius) * .5);background:transparent;color:var(--ia-raf-primary);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.ia-raf-stats{display:flex;gap:12px;margin:16px 0 8px}
.ia-raf-stat{flex:1;padding:12px;border-radius:calc(var(--ia-raf-radius) * .66);background:#f4f4f7;text-align:center}
.ia-raf-stat-value{display:block;font-size:20px;font-weight:700}
.ia-raf-stat-label{display:block;color:#666;font-size:12px}
.ia-raf-premium{margin:8px 0;padding:10px 12px;border-radius:calc(var(--ia-raf-radius) * .66);background:#eef7ef;color:#1b5e20;font-size:14px;font-weight:600;text-align:center}
.ia-raf-rewards-title{margin:16px 0 8px;font-size:15px;font-weight:700}
.ia-raf-rewards{margin:0;padding:0;list-style:none}
.ia-raf-reward-code{flex:1;min-width:0;font-size:15px;font-weight:600;letter-spacing:.5px;word-break:break-all}
.ia-raf-status{min-height:20px;margin:8px 0 0;color:#2e7d32;font-size:13px;text-align:center}
`;

let instanceCount = 0;

// The open modal, if any. Only one is shown at a time.
let openModal: { handle: ReferAFriendHandle; focus(): void } | null = null;

type Child = Node | string | null | undefined | false;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string; attrs?: Record<string, string> } = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.attrs) {
    Object.keys(props.attrs).forEach((name) => node.setAttribute(name, props.attrs![name]));
  }
  children.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', { className, text, attrs: { type: 'button' } });
  node.addEventListener('click', onClick);
  return node;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const isHttpsUrl = (value: string): boolean => /^https:\/\//i.test(value);

/** The localised date when `iso` is in the future, otherwise null. */
export function futureDateLabel(iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now) return null;
  try {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return date.toDateString();
  }
}

/**
 * Presents the modal. Only valid in a browser. While a modal is open, another
 * call focuses it and returns its handle; the new options are not applied.
 */
export function presentReferAFriend(options: ReferAFriendOptions, deps: ReferAFriendDeps): ReferAFriendHandle {
  if (openModal) {
    openModal.focus();
    return openModal.handle;
  }
  instanceCount += 1;
  const titleId = `ia-raf-title-${instanceCount}`;

  let closed = false;
  let email = (options.email || '').trim();
  let name = (options.name || '').trim();
  let companyName = '';
  let busy = false;
  let accountSaved = false;

  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;

  const style = el('style', { text: STYLE });
  const title = el('h2', { className: 'ia-raf-title', text: options.headline || DEFAULT_HEADLINE, attrs: { id: titleId } });
  const reward = el('p', { className: 'ia-raf-reward', text: options.rewardText || '' });
  reward.hidden = !options.rewardText;
  const body = el('div');
  const closeButton = button('×', 'ia-raf-close', () => close());
  closeButton.setAttribute('aria-label', 'Close');

  const dialog = el('div', {
    className: 'ia-raf-dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
  }, [closeButton, title, reward, body]);
  dialog.style.setProperty('--ia-raf-font', options.fontFamily || DEFAULT_FONT);
  dialog.style.setProperty('--ia-raf-radius', `${typeof options.cornerRadius === 'number' ? Math.max(0, options.cornerRadius) : 12}px`);
  setColor(options.primaryColor || DEFAULT_COLOR);

  const overlay = el('div', { className: 'ia-raf-overlay' }, [dialog]);
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', onKeyDown, true);
  document.head.appendChild(style);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function setColor(color: string): void {
    dialog.style.setProperty('--ia-raf-primary', color);
  }

  function close(): void {
    if (closed) return;
    closed = true;
    if (openModal && openModal.handle === handle) openModal = null;
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    style.remove();
    document.body.style.overflow = previousOverflow;
    if (previousFocus && typeof previousFocus.focus === 'function') {
      try {
        previousFocus.focus();
      } catch {
        // The element may have left the page.
      }
    }
    if (options.onClose) options.onClose();
  }

  function focusables(): HTMLElement[] {
    const selector = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(dialog.querySelectorAll(selector)) as HTMLElement[];
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Replaces the body and moves focus to the first field or button in it.
  function render(children: Child[], focusTarget?: HTMLElement): void {
    if (closed) return;
    body.textContent = '';
    children.forEach((child) => {
      if (child) body.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    const target = focusTarget || (body.querySelector('input, button') as HTMLElement | null) || closeButton;
    target.focus();
  }

  function renderLoading(): void {
    render([el('p', { className: 'ia-raf-muted', text: 'Loading...', attrs: { role: 'status' } })], closeButton);
  }

  function renderMessage(message: string, retry?: () => void): void {
    render([
      el('p', { className: 'ia-raf-error', text: message, attrs: { role: 'alert' } }),
      retry ? button('Try again', 'ia-raf-btn', retry) : null,
    ]);
  }

  function errorBox(): HTMLParagraphElement {
    return el('p', { className: 'ia-raf-error', attrs: { role: 'alert' } });
  }

  function field(label: string, input: HTMLInputElement): HTMLElement[] {
    input.className = 'ia-raf-input';
    input.id = `${titleId}-${input.name}`;
    return [el('label', { className: 'ia-raf-label', text: label, attrs: { for: input.id } }), input];
  }

  async function runBusy(submit: HTMLButtonElement, busyText: string, task: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    const idleText = submit.textContent || '';
    submit.disabled = true;
    submit.textContent = busyText;
    try {
      await task();
    } finally {
      busy = false;
      if (!closed && submit.isConnected) {
        submit.disabled = false;
        submit.textContent = idleText;
      }
    }
  }

  function renderEnrolForm(): void {
    const error = errorBox();
    const emailInput = el('input', {
      attrs: { type: 'email', name: 'email', autocomplete: 'email', required: 'true' },
    });
    emailInput.value = email;
    const nameInput = el('input', { attrs: { type: 'text', name: 'name', autocomplete: 'name' } });
    nameInput.value = name;
    const submit = el('button', { className: 'ia-raf-btn', text: 'Get my link', attrs: { type: 'submit' } });

    const form = el('form', { attrs: { novalidate: 'true' } }, [
      error,
      ...field('Email', emailInput),
      ...field('Name', nameInput),
      submit,
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      email = emailInput.value.trim();
      name = nameInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        error.textContent = messageFor('INVALID_EMAIL');
        emailInput.focus();
        return;
      }
      error.textContent = '';
      void runBusy(submit, 'Please wait...', async () => {
        const result = await deps.enrol(email, name);
        if (!closed) await handleEnrolment(result, error);
      });
    });

    render([form], email ? submit : emailInput);
  }

  function renderCodeStep(notice?: string): void {
    const error = errorBox();
    const status = el('p', { className: 'ia-raf-status', attrs: { role: 'status', 'aria-live': 'polite' } });
    const codeInput = el('input', {
      attrs: {
        type: 'text',
        name: 'code',
        inputmode: 'numeric',
        autocomplete: 'one-time-code',
      },
    });
    const submit = el('button', { className: 'ia-raf-btn', text: 'Verify', attrs: { type: 'submit' } });
    // Verify is enabled only while the field holds exactly 6 digits (after
    // normalizing) and no verify request is in flight.
    let verifying = false;
    const syncSubmit = (): void => {
      if (!verifying) submit.disabled = normalizeVerificationCode(codeInput.value).length !== 6;
    };
    codeInput.addEventListener('input', syncSubmit);
    syncSubmit();

    const resend = button('Send a new code', 'ia-raf-textbtn', () => {
      if (busy) return;
      error.textContent = '';
      status.textContent = 'Sending...';
      busy = true;
      void deps.enrol(email, name).then((result) => {
        busy = false;
        if (closed) return;
        status.textContent = '';
        if (result.status === 'verificationRequired') {
          status.textContent = 'We sent a new code.';
        } else {
          void handleEnrolment(result, error);
        }
      });
    });
    const changeEmail = button('Use a different email', 'ia-raf-textbtn', () => {
      if (!busy) renderEnrolForm();
    });

    const form = el('form', { attrs: { novalidate: 'true' } }, [
      el('p', { className: 'ia-raf-muted', text: `We sent a 6-digit code to ${email}. Enter it below to connect this device.` }),
      error,
      ...field('Code', codeInput),
      submit,
      el('div', {}, [resend, changeEmail]),
      status,
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const code = normalizeVerificationCode(codeInput.value);
      if (code.length !== 6) {
        error.textContent = 'Enter the 6-digit code from the email.';
        codeInput.focus();
        return;
      }
      error.textContent = '';
      verifying = true;
      void runBusy(submit, 'Verifying...', async () => {
        const result = await deps.verify(email, code, name);
        if (!closed) await handleEnrolment(result, error);
      }).then(() => {
        verifying = false;
        if (!closed && submit.isConnected) syncSubmit();
      });
    });

    render([form], codeInput);
    if (notice) status.textContent = notice;
  }

  async function handleEnrolment(result: AffiliateEnrolmentResult, error: HTMLElement): Promise<void> {
    if (result.status === 'verificationRequired') {
      renderCodeStep();
      return;
    }
    if (result.status === 'error') {
      error.textContent = messageFor(result.errorCode);
      return;
    }
    renderLoading();
    const loaded = await deps.loadDetails();
    if (loaded.kind === 'ok') {
      renderEnrolled(loaded.details, loaded.details);
    } else if (result.affiliate) {
      renderEnrolled(result.affiliate, null);
    } else {
      renderMessage(messageFor('NETWORK_ERROR'), () => void start());
    }
  }

  function renderEnrolled(affiliate: ReferrerAffiliate, stats: MyAffiliateDetails | null): void {
    const status = el('p', { className: 'ia-raf-status', attrs: { role: 'status', 'aria-live': 'polite' } });
    const hasLink = /^http/i.test(affiliate.deeplinkurl);
    const text = buildReferralShareText(affiliate, companyName, options.shareMessage);

    const copyButton = (label: string, value: string): HTMLButtonElement => {
      const node = button(label, 'ia-raf-copy', () => {
        void copyText(value).then((ok) => {
          if (closed) return;
          status.textContent = ok ? 'Copied' : 'Could not copy. Select the text to copy it.';
        });
      });
      node.setAttribute('aria-label', `${label}: ${value}`);
      return node;
    };

    const children: Child[] = [];
    if (affiliate.affiliateShortCode) {
      children.push(el('div', { className: 'ia-raf-row' }, [
        el('span', { className: 'ia-raf-code', text: affiliate.affiliateShortCode }),
        copyButton('Copy code', affiliate.affiliateShortCode),
      ]));
    }
    if (hasLink) {
      children.push(el('div', { className: 'ia-raf-row' }, [
        el('span', { className: 'ia-raf-url', text: affiliate.deeplinkurl }),
        copyButton('Copy link', affiliate.deeplinkurl),
      ]));
    }

    if (text) {
      children.push(button('Share', 'ia-raf-btn', () => {
        void shareText(text).then((outcome) => {
          if (closed) return;
          if (outcome === 'copied') status.textContent = 'Copied';
          else if (outcome === 'failed') status.textContent = 'Could not share. Copy your code instead.';
          else status.textContent = '';
        });
      }));
    }

    if (stats) {
      children.push(el('div', { className: 'ia-raf-stats' }, [
        el('div', { className: 'ia-raf-stat' }, [
          el('span', { className: 'ia-raf-stat-value', text: String(stats.referralCount) }),
          el('span', { className: 'ia-raf-stat-label', text: 'Referrals' }),
        ]),
        el('div', { className: 'ia-raf-stat' }, [
          el('span', { className: 'ia-raf-stat-value', text: formatMoney(stats.totalEarned, stats.currency) }),
          el('span', { className: 'ia-raf-stat-label', text: 'Earned' }),
        ]),
      ]));
      const premiumUntil = futureDateLabel(stats.premiumUntil);
      if (premiumUntil) {
        children.push(el('p', { className: 'ia-raf-premium', text: `Free premium until ${premiumUntil}` }));
      }
      // App Store and Google Play codes. Both show on the web: the referrer may be on either phone.
      if (stats.rewardCodes.length) {
        const rewardsTitleId = `${titleId}-rewards`;
        children.push(
          el('h3', { className: 'ia-raf-rewards-title', text: 'Your rewards', attrs: { id: rewardsTitleId } }),
          el('ul', { className: 'ia-raf-rewards', attrs: { 'aria-labelledby': rewardsTitleId } }, stats.rewardCodes.map((reward) => {
            const redeemUrl = reward.redeemUrl;
            let redeem: HTMLButtonElement | null = null;
            if (isHttpsUrl(redeemUrl)) {
              redeem = button('Redeem', 'ia-raf-copy', () => {
                window.open(redeemUrl, '_blank', 'noopener,noreferrer');
              });
              redeem.setAttribute('aria-label', `Redeem ${reward.code}`);
            }
            return el('li', { className: 'ia-raf-row' }, [
              el('span', { className: 'ia-raf-reward-code', text: reward.code }),
              redeem,
            ]);
          }))
        );
      }
      if (isHttpsUrl(stats.dashboardUrl)) {
        const dashboardUrl = stats.dashboardUrl;
        children.push(button('Open my dashboard', 'ia-raf-btn ia-raf-btn-secondary', () => {
          window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
        }));
      }
    }

    children.push(status);
    render(children);
  }

  async function start(): Promise<void> {
    renderLoading();
    const [config, loaded] = await Promise.all([
      deps.loadConfig(),
      deps.hasToken().then((has) => (has ? deps.loadDetails() : { kind: 'signedOut' } as MyDetailsFetch)),
    ]);
    if (closed) return;

    if (config) {
      companyName = config.companyName;
      if (!options.primaryColor && config.primaryColor) setColor(config.primaryColor);
      if (!options.headline && config.headline) title.textContent = config.headline;
      if (!options.rewardText && config.rewardText) {
        reward.textContent = config.rewardText;
        reward.hidden = false;
      }
    }

    if (loaded.kind === 'ok') {
      if (!accountSaved && (options.appUserId || options.playPurchaseToken)) {
        accountSaved = true;
        void deps.saveAccount();
      }
      renderEnrolled(loaded.details, loaded.details);
    } else if (loaded.kind === 'failed') {
      renderMessage(messageFor('NETWORK_ERROR'), () => void start());
    } else if (config && !config.enabled) {
      renderMessage(messageFor('PROGRAM_DISABLED'));
    } else {
      renderEnrolForm();
    }
  }

  const handle: ReferAFriendHandle = { close };
  openModal = {
    handle,
    focus: () => {
      if (!dialog.contains(document.activeElement)) (focusables()[0] || closeButton).focus();
    },
  };

  void start();

  return handle;
}
