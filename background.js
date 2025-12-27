'use strict'; const _0x1 = { U: "https://api.groq.com/openai/v1/chat/completions", M: "openai/gpt-oss-20b" }; const _0x2 = m => new Promise(r => setTimeout(r, m)); const _0x3 = `You are answering hcaptcha text challange. your a precise riddle/question/problem/puzzle solver.
# Rules for Answer:
 * Provide ONLY the final answer.
 * The answer must be a single word, a number, or a short phrase.
 * Do NOT Use Spaces Between Answer, Do NOT Over Do. Only Answer As Directed.
 * Do NOT explain. even your reasoning.
 * Treat the input as a "trick" or "logic" question. They just write question in way to look tricky/complex but answer is always easy. Just Have To Answer Like A Normal Person Would.
 
* SPECIFIC LOGIC RULES:
 # SEQUENCE / CHARACTERS / DIGITS:
   * Treat input strictly as text string manipulation unless clearly arithmetic.
   * 'Leading' / 'Beginning' / 'Interval' / 'First' / '1st' / 'One' = First N characters.
   * 'Second' / '2nd' / 'Two' = Second N characters.
   * 'Preultime' / 'Second Last' / 'Second-to-last' = Second Last N characters.
   * 'Ultimate' / 'Last' / 'Terminated' = Last N characters.
   * They Could Write In Words Or Numbers Sometime to confuse. inside question. (first, one, 1st, second, two, 2nd, third, three, 3rd, fourth, four, 4th etc.)
   * Ignore Random Characters Which Seperate Numbers/Sets/Collection/Group (* / \\ ! @ # + - ^ etc.) they are meant to confuse. dont calculate, math. just do as directed. (usall answer in 3-6 numbers max)
   * Example: "Tell the initial four characters 9281 * 1205 / 9110 + 8219" -> "9281"
   * Example: "What are the last two characters of 4028 * 8171 / 8221 @ 6120?" -> "20"
   * Example: "From the sequence 38626^0b01100, what are the leading 2 characters?" -> "38"
   * Example: "Extract the second set of numbers within the given sequence: 7033 - 4673 \\ 6722 / 1028" -> "4673"
   * etc.
 # CHARACTER POSITIONS:
   - If asked for "positions" (plural), return ALL 1-based indices separated by commas (e.g., "1,3,4).
   * Count strictly from left to right.
   * Example: "At what positions can e be found in phenylenediamine?" -> "3,7,9,16"
  * Example: "In monopolization, at which positions does the letter o appear?" -> "2,4,6,13"
* Example: "List the positions where l occurs in lignocellulose." -> "1,8,9,11"
* Example: "Show me the positions where e exists in perceptiveness." -> "2,5,10,12"
   * etc.
 # REVERSE / INVERTED / BACKWARD / FLIP:
   * Spell the word/sentence backwards letter-by-letter.
   * Example: "Write the word immediately backwards" -> "yletaidemmi"
   * Example: "Flip the characters of 'submarine'" -> "enirambus"
   * Example: "Invert the sequence phenylenediamine" -> "enimaidenelynehp"
   * etc.
 # FAMILY LOGIC:
   * Count siblings from the perspective of the subject.
   * If the observer/speaker is IN the group being counted -> Answer is (Total - 1).
   * If the observer/speaker is NOT IN the group -> Answer is Total.
   * Example: "Mason's siblings consist of 8 sisters and 5 brothers. How many sisters does a sister of Mason have?" -> "7"
   * Example: "The total number of children in Violet's (she/her) family is 2 sisters and 2 brothers. Count the brothers of Violet's sister." -> "2"
   * etc.
 # GENERAL / BASIC QUESTIONS:
   * Answer straightforwardly for basic knowledge.
   * Example: "Does new born babies smile?" -> "yes"
   * Example: "What do we use to squeeze toothpaste?" -> "fingers"
   * etc.
 # SPATIAL & SEATING (Circle/Line):
 * Visualize the specific order (A is right of B, etc.).
 * In a circle: If X is on Y's right, Y is on X's left.
 * Return only the name of the person.
 * Example: "Envision a circle with Elizabeth, Henry and Ella. At Henry's immediate right is Elizabeth. Who is on the immediate left of Elizabeth?" -> "Henry"
 * Example: "Name the person located to the right of Jasmine if Santiago is on Grayson's right and Jasmine is on Grayson's left." -> "Grayson"
 * etc.

# '{QUESTION}' Answer This Question Precisely.`; async function _0x4(q, r = 0) { const { groq_api_key: k } = await chrome.storage.local.get(['groq_api_key']); if (!k) throw 0; const _0x5 = { model: _0x1.M, messages: [{ role: "user", content: _0x3.replace('{QUESTION}', q) }], temperature: 0.0, max_tokens: 1600 }; try { const f = await fetch(_0x1.U, { method: "POST", headers: { "Authorization": `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify(_0x5) }); if (!f.ok) { if (r < 2) return await _0x2(2000), _0x4(q, r + 1); throw f.status } const d = await f.json(), a = d?.choices?.[0]?.message?.content?.trim().toLowerCase(); return { success: !0, answer: a?.replace(/[^a-z0-9,]/g, '') } } catch (e) { throw e } } chrome.runtime.onMessage.addListener((q, s, r) => { if (q.action === "solve") { _0x4(q.question).then(a => r(a)).catch(e => r({ success: !1 })); return !0 } q.action === "ping" && r({ success: !0 }) });
