'use strict';
(async () => {
    // More Discord sitekeys - including common verification ones
    const ALLOWED_SITEKEYS = [
        '4c672d35-0701-42b2-88c3-78380b0db560',
        'b2b02ab5-7dae-4d6f-830e-7b55634c888b',
        'a9b5fb07-92ff-493f-86fe-352a2803b3df',
        'f5561ba9-8f1e-40ca-9b5b-a0b3f719ef34',
        'a5f74b19-9e45-40e0-b45d-47ff91b7a6c2',
        '13257c82-e8d2-11e7-80c1-9a214cf093ae'
    ];
    const url = window.location.href;
    if (!ALLOWED_SITEKEYS.some(k => url.includes(k))) return;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    const isVisible = e => { if (!e) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.offsetWidth > 0 };
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    const setStatus = async (status, time) => { try { await chrome.storage.local.set({ solve_status: status, solve_time: time || null }) } catch (e) { } };

    // Track success/fail for success rate
    const trackResult = async (success) => {
        try {
            const d = await chrome.storage.local.get(['total_attempts', 'successful_solves']);
            const total = (d.total_attempts || 0) + 1;
            const successful = (d.successful_solves || 0) + (success ? 1 : 0);
            await chrome.storage.local.set({ total_attempts: total, successful_solves: successful });
        } catch (e) { }
    };

    const sel = {
        checkbox: () => $('#checkbox') || $('#anchor'),
        input: () => $('input[name="captcha"]') || $('input.input-field'),
        submit: () => $('.button-submit'),
        menu: () => $('#menu-info'),
        textChallenge: () => $('#text_challenge'),
        visualChallenge: () => $('#visual_challenge'),
        langButton: () => $('[aria-label*="Select a language"]') || $('#display-language'),
        langOptions: () => $$('[role="option"]'),
        checkmark: () => {
            const cb = $('#checkbox[aria-checked="true"]');
            if (cb) return cb;
            const chk = $('div.check');
            if (chk) { const s = chk.getAttribute('style') || ''; if (s.includes('animation') && s.includes('pop')) return chk }
            return null
        },
        refresh: () => $('.refresh.button') || $('[aria-label="Refresh"]'),
        label: () => $('#a11y-label') || $('.label-text'),
        isVerifyButton: () => { const btn = $('.button-submit'); if (!btn) return false; const txt = btn.querySelector('.text'); return txt && txt.textContent.trim().toLowerCase() === 'verify' }
    };

    function setValue(i, t) { if (!i) return; i.value = t; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })) }
    function click(e) { if (!e) return; const r = e.getBoundingClientRect();['mousedown', 'mouseup', 'click'].forEach(t => e.dispatchEvent(new MouseEvent(t, { view: window, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }))) }
    function waitFor(fn, to = 3000) { return new Promise(res => { const st = Date.now(); const ch = () => { const r = fn(); if (r) return res(r); if (Date.now() - st > to) return res(null); setTimeout(ch, 50) }; ch() }) }
    function isEnglish() { const l = $('#display-language'); return l && l.innerText.trim() === 'EN' }

    async function setEnglishLanguage() {
        if (isEnglish()) return true;
        const lb = sel.langButton(); if (!lb) return false;
        click(lb); await delay(200);
        const eo = await waitFor(() => { const o = [...sel.langOptions()]; return o.find(x => x.innerText.includes('English')) });
        if (eo) { click(eo); await delay(200); return true }
        return false
    }

    function getQuestion() {
        const c = $('#prompt-text');
        if (c) { const sp = c.querySelectorAll('span'); for (const x of sp) { const t = x.innerText?.trim(); if (!t || t.length < 10) continue; if (t.includes("Please answer") || t.includes("single word") || t.includes("following question with")) continue; return t } }
        const sp = [...$$('span')].filter(s => { const st = s.getAttribute('style') || '', cm = getComputedStyle(s); return (st.includes('font-weight: 500') || cm.fontWeight === '500') && s.innerText?.trim().length > 10 }).filter(s => { const t = s.innerText?.trim(); return !t.includes("Please answer") && !t.includes("single word") });
        return sp.length > 0 ? sp[sp.length - 1].innerText.trim() : null
    }

    function setLabel() { const l = sel.label(); if (l && !l.dataset.hs) { l.textContent = 'hSolver'; l.dataset.hs = '1' } }

    let manualMode = false, lastQ = '', solving = false, retryCount = 0, solved = false;
    let answeredQuestions = new Set(), verifyClicked = false, languageSet = false, solveStartTime = 0;
    let failCount = 0; // Auto-retry counter
    const MAX_RETRIES = 3;

    const loadSettings = async () => { try { const d = await chrome.storage.local.get(['manual_mode']); manualMode = d.manual_mode === true } catch (e) { } };
    await loadSettings(); chrome.storage.onChanged.addListener(loadSettings);
    await setStatus('idle');

    async function solve(q, inp) {
        if (q.includes("Please click") || q.includes("containing") || q.includes("select images") || q.includes("Please answer")) return;
        if (answeredQuestions.has(q)) return;
        if (verifyClicked) return;
        try {
            solveStartTime = Date.now();
            await setStatus('solving');
            const r = await chrome.runtime.sendMessage({ action: 'solve', question: q });
            if (r?.success && r.answer) {
                answeredQuestions.add(q);
                setValue(inp, r.answer);
                await delay(100);
                if (sel.isVerifyButton()) verifyClicked = true;
                click(sel.submit());
            } else {
                await setStatus('failed');
            }
        } catch (e) { await setStatus('failed') }
    }

    function doRefresh() { const r = sel.refresh(); if (r) { click(r); return true } return false }

    while (true) {
        await delay(100);
        if (!chrome.runtime?.id) break;
        try {
            setLabel();
            const cm = sel.checkmark();
            if (cm && !solved) {
                solved = true;
                let solveTime = null;
                if (solveStartTime > 0) {
                    solveTime = ((Date.now() - solveStartTime) / 1000).toFixed(1);
                }
                await setStatus('success', solveTime);
                await trackResult(true); // Track success
                try { const d = await chrome.storage.local.get(['solved_count']); await chrome.storage.local.set({ solved_count: (d.solved_count || 0) + 1 }) } catch (e) { }
                await delay(500);
                break
            }

            // Handle failure with auto-retry
            if (verifyClicked) {
                const q = getQuestion();
                if (q && !answeredQuestions.has(q)) {
                    verifyClicked = false;
                    answeredQuestions.clear();
                    lastQ = '';
                    failCount++;
                    await trackResult(false); // Track fail

                    // Auto-retry up to MAX_RETRIES times
                    if (failCount < MAX_RETRIES) {
                        await setStatus('retrying');
                        await delay(500);
                        doRefresh();
                        await delay(1500);
                    } else {
                        await setStatus('failed');
                    }
                }
                continue
            }

            if (manualMode) continue;
            const cb = sel.checkbox();
            if (cb && !solved) { const ch = cb.getAttribute('aria-checked'); if (ch !== 'true' && isVisible(cb)) { click(cb); retryCount = 0; await delay(100); continue } }
            if (!languageSet && isVisible(sel.langButton())) { if (isEnglish()) { languageSet = true } else { await setEnglishLanguage(); languageSet = true; await delay(200); continue } }
            const inp = sel.input(); const q = getQuestion(); const hc = isVisible(inp) && q;
            if (hc) { retryCount = 0; if (inp.value === '') lastQ = ''; if (!solving && q !== lastQ) { solving = true; lastQ = q; await solve(q, inp); solving = false; await delay(300); continue } }
            else { retryCount++; if (retryCount > 10) { retryCount = 0; doRefresh(); await delay(2000); continue } if (isVisible(sel.textChallenge())) click(sel.textChallenge()); else if (isVisible(sel.visualChallenge())) click(sel.visualChallenge()); else if (isVisible(sel.menu())) click(sel.menu()) }
        } catch (e) { }
    }
})();
