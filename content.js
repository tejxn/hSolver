'use strict';
(async () => {
    // Only run on specific sitekey
    const ALLOWED_SITEKEY = 'b2b02ab5-7dae-4d6f-830e-7b55634c888b';
    const url = window.location.href;
    if (!url.includes(ALLOWED_SITEKEY)) return;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    const isVisible = e => { if (!e) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.offsetWidth > 0 };
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const sel = {
        checkbox: () => $('#checkbox') || $('#anchor'),
        input: () => $('input[name="captcha"]') || $('input.input-field'),
        submit: () => $('.button-submit'),
        menu: () => $('#menu-info'),
        textChallenge: () => $('#text_challenge'),
        visualChallenge: () => $('#visual_challenge'),
        checkmark: () => {
            const cb = $('#checkbox[aria-checked="true"]');
            if (cb) return cb;
            const chk = $('div.check');
            if (chk) {
                const s = chk.getAttribute('style') || '';
                if (s.includes('animation') && s.includes('pop')) return chk;
            }
            return null;
        },
        refresh: () => $('.refresh.button') || $('[aria-label="Refresh"]') || $('.refresh-btn'),
        label: () => $('#a11y-label') || $('.label-text') || $('[id*="label"]'),
        isVerifyButton: () => {
            const btn = $('.button-submit');
            if (!btn) return false;
            const text = btn.querySelector('.text');
            return text && text.textContent.trim().toLowerCase() === 'verify';
        }
    };

    function setValue(i, t) { if (!i) return; i.value = t; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }
    function click(e) { if (!e) return; const r = e.getBoundingClientRect();['mousedown', 'mouseup', 'click'].forEach(t => e.dispatchEvent(new MouseEvent(t, { view: window, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }))); }

    function getQuestion() {
        const c = $('#prompt-text');
        if (c) {
            const spans = c.querySelectorAll('span');
            for (const x of spans) {
                const t = x.innerText?.trim();
                if (!t || t.length < 10) continue;
                if (t.includes("Please answer") || t.includes("single word") || t.includes("following question with")) continue;
                return t;
            }
        }
        const spans = [...$$('span')].filter(s => {
            const st = s.getAttribute('style') || '', cm = getComputedStyle(s);
            return (st.includes('font-weight: 500') || cm.fontWeight === '500') && s.innerText?.trim().length > 10;
        }).filter(s => {
            const t = s.innerText?.trim();
            return !t.includes("Please answer") && !t.includes("single word");
        });
        return spans.length > 0 ? spans[spans.length - 1].innerText.trim() : null;
    }

    function setLabel() { const l = sel.label(); if (l && !l.dataset.hs) { l.textContent = 'hSolver Silent'; l.dataset.hs = '1'; } }

    let manualMode = false;
    let lastQ = '';
    let solving = false;
    let retryCount = 0;
    let solved = false;
    let answeredQuestions = new Set();
    let verifyClicked = false; // Track if we clicked Verify and waiting for result

    const loadSettings = async () => { try { const d = await chrome.storage.local.get(['manual_mode']); manualMode = d.manual_mode === true; } catch (e) { } };
    await loadSettings();
    chrome.storage.onChanged.addListener(loadSettings);

    async function solve(q, input) {
        if (q.includes("Please click") || q.includes("containing") || q.includes("select images") || q.includes("Please answer")) return;
        // Skip if we already answered this question
        if (answeredQuestions.has(q)) return;
        // Skip if we're waiting for Verify result
        if (verifyClicked) return;

        try {
            const r = await chrome.runtime.sendMessage({ action: 'solve', question: q });
            if (r?.success && r.answer) {
                answeredQuestions.add(q); // Mark as answered
                setValue(input, r.answer);
                await delay(100);

                // Check if this is Verify button (final question)
                if (sel.isVerifyButton()) {
                    verifyClicked = true;
                }
                click(sel.submit());
            }
        } catch (e) { }
    }

    function doRefresh() {
        const r = sel.refresh();
        if (r) { click(r); return true; }
        const m = sel.menu();
        if (m) { click(m); return true; }
        return false;
    }

    while (true) {
        await delay(100);
        if (!chrome.runtime?.id) break;

        try {
            setLabel();

            const checkmark = sel.checkmark();
            if (checkmark && !solved) {
                solved = true;
                try {
                    const d = await chrome.storage.local.get(['solved_count']);
                    await chrome.storage.local.set({ solved_count: (d.solved_count || 0) + 1 });
                } catch (e) { }
                await delay(500);
                break;
            }

            // After clicking Verify, only wait for success or new question
            if (verifyClicked) {
                const q = getQuestion();
                // New question appeared = failed, reset and continue
                if (q && !answeredQuestions.has(q)) {
                    verifyClicked = false;
                    answeredQuestions.clear();
                    lastQ = '';
                }
                continue; // Wait, don't do anything else
            }

            if (manualMode) continue;

            const cb = sel.checkbox();
            if (cb && !solved) {
                const checked = cb.getAttribute('aria-checked');
                if (checked !== 'true' && isVisible(cb)) {
                    click(cb);
                    retryCount = 0;
                    await delay(100);
                    continue;
                }
            }

            const input = sel.input();
            const q = getQuestion();
            const hasChallenge = isVisible(input) && q;

            if (hasChallenge) {
                retryCount = 0;
                if (input.value === '') lastQ = '';

                if (!solving && q !== lastQ) {
                    solving = true;
                    lastQ = q;
                    await solve(q, input);
                    solving = false;
                    await delay(300);
                    continue;
                }
            } else {
                retryCount++;
                if (retryCount > 10) {
                    retryCount = 0;
                    doRefresh();
                    await delay(2000);
                    continue;
                }
                if (isVisible(sel.textChallenge())) click(sel.textChallenge());
                else if (isVisible(sel.visualChallenge())) click(sel.visualChallenge());
                else if (isVisible(sel.menu())) click(sel.menu());
            }
        } catch (e) { }
    }
})();
