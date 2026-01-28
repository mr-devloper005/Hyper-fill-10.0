// //   log("HyperFill v6.9-pac+richdesc (alioup-hotfix + socials) ready on", HOST);
// // })();

// /* content/fill.js — HyperFill v6.9-pac+richdesc (alioup-hotfix + socials + confirm-email)
//  * Adds: Confirm Email support (email2), holder scan for .form_row/.form-fieldset
//  */

// (() => {
//   if (window.__HF_v69_installed) return;
//   window.__HF_v69_installed = true;

//   const DEBUG = true;
//   const log = (...a) => {
//     try {
//       console.debug("[HF]", ...a);
//     } catch {}
//   };
//   const warn = (...a) => {
//     try {
//       console.warn("[HF]", ...a);
//     } catch {}
//   };

//   const T_AUTO = 10,
//     T_FORCE = 8,
//     GAP_MIN = 2;
//   const PENALTY_SOCIAL = 18,
//     PENALTY_EMAIL_NEAR = 18,
//     PENALTY_PRICE = 10,
//     PENALTY_ADDR2ZIP = 12,
//     PENALTY_TITLENAME = 10;
//   const BLOCK_HOSTS = [/(^|\.)google\.com$/i, /(^|\.)accounts\.google\.com$/i];

//   const isVisible = (el) => {
//     try {
//       if (!el || el.disabled || el.hidden || el.readOnly) return false;
//       const s = window.getComputedStyle ? getComputedStyle(el) : null;
//       if (
//         s &&
//         (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")
//       )
//         return false;
//       const r = el.getBoundingClientRect?.();
//       if (r && (r.width <= 1 || r.height <= 1)) return false;
//       const st = (el.getAttribute("style") || "").toLowerCase();
//       if (st.includes("left:-5000px") || st.includes("max-width:1px"))
//         return false;
//       return true;
//     } catch {
//       return false;
//     }
//   };

//   const alreadyFilled = (el) => {
//     try {
//       if (el.dataset?.rowfiller === "filled") return true;
//       if (el.isContentEditable) return !!el.innerText?.trim();
//       const v = el.value;
//       return v !== undefined && v !== null && String(v).trim().length > 0;
//     } catch {
//       return false;
//     }
//   };

//   function setNativeValue(el, value) {
//     try {
//       const p = Object.getPrototypeOf(el);
//       const d = Object.getOwnPropertyDescriptor(p, "value");
//       if (d && d.set) d.set.call(el, value);
//       else el.value = value;
//     } catch {
//       try {
//         el.value = value;
//       } catch {}
//     }
//     try {
//       el.dispatchEvent(new Event("input", { bubbles: true }));
//     } catch {}
//     try {
//       el.dispatchEvent(new Event("change", { bubbles: true }));
//     } catch {}
//   }

//   const HOST = location.hostname || "";
//   const isBlockedHost = () => BLOCK_HOSTS.some((rx) => rx.test(HOST));
//   if (isBlockedHost()) {
//     DEBUG && log("blocked host → skip HyperFill on", HOST);
//     return;
//   }

//   const isExtAlive = () =>
//     typeof chrome !== "undefined" &&
//     !!chrome.runtime &&
//     !!chrome.runtime.id &&
//     !!chrome.storage?.local;
//   const safeGet = (keys) =>
//     new Promise((resolve) => {
//       if (!isExtAlive()) {
//         resolve({});
//         return;
//       }
//       try {
//         chrome.storage.local.get(keys, (res) => {
//           if (!isExtAlive() || chrome.runtime.lastError) {
//             if (chrome.runtime?.lastError)
//               warn("storage.get lastError:", chrome.runtime.lastError.message);
//             resolve({});
//             return;
//           }
//           resolve(res || {});
//         });
//       } catch (e) {
//         warn("safeGet caught:", e?.message || e);
//         resolve({});
//       }
//     });

//   const rxEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   const looksLikeEmail = (v) => !!v && rxEmail.test(String(v).trim());
//   const looksLikePhone = (v) =>
//     !!v && (String(v).match(/\d/g) || []).length >= 10;
//   const looksLikeURL = (v) =>
//     !!v && (/^https?:\/\//i.test(v) || /\.[a-z]{2,}$/i.test(v));
//   const looksLikeUser = (v) =>
//     !!v && !v.includes("@") && !/\s/.test(v) && /^[A-Za-z0-9._-]{3,}$/.test(v);
//   const looksLikeZip = (v) =>
//     !!v && String(v).trim().length <= 12 && /^[A-Za-z0-9-\s]+$/.test(v);

//   const getText = (n) => (n?.textContent || "").trim();

//   function extractLabelText(el) {
//     try {
//       if (el.id) {
//         const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
//         if (l && l.innerText) return l.innerText.trim();
//       }
//       for (
//         let p = el.parentElement, i = 0;
//         p && i < 6;
//         p = p.parentElement, i++
//       ) {
//         if (p.tagName === "LABEL") return p.innerText.trim();
//       }
//       const prev = el.previousElementSibling;
//       if (prev && /^(LABEL|DIV|SPAN|P|H[1-6])$/.test(prev.tagName)) {
//         const t = getText(prev);
//         if (t) return t;
//       }
//       const next = el.nextElementSibling;
//       if (
//         next &&
//         /label|field_label/i.test(next.className || "") &&
//         next.innerText
//       )
//         return next.innerText.trim();
//       const refId = el.getAttribute("aria-labelledby");
//       if (refId) {
//         const ref = document.getElementById(refId);
//         if (ref && ref.innerText) return ref.innerText.trim();
//       }
//       if (el.title) return el.title.trim();
//       return "";
//     } catch {
//       return "";
//     }
//   }

//   function ctx(el) {
//     const label = (extractLabelText(el) || "").toLowerCase();
//     const name = (el.name || "").toLowerCase();
//     const id = (el.id || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
//     const title = (el.getAttribute?.("title") || "").toLowerCase();

//     const dvvas = (el.getAttribute?.("data-vv-as") || "").toLowerCase();
//     const datalabel = (el.getAttribute?.("data-label") || "").toLowerCase();
//     const fcn = (el.getAttribute?.("formcontrolname") || "").toLowerCase();
//     const rfcn = (
//       el.getAttribute?.("ng-reflect-form-control-name") || ""
//     ).toLowerCase();

//     let around = "";
//     let wrapperName = "";
//     try {
//       const holder =
//         el.closest(
//           ".mat-mdc-form-field, .form_row, .form-fieldset, .field, .form-group, .input-box, .controls, .input-wrapper, .field_wrap__Gv92k, [name]"
//         ) || el.parentElement;
//       if (holder) {
//         const blocks = holder.querySelectorAll(
//           ":scope > label, :scope > div, :scope > p, :scope > span, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6"
//         );
//         for (const b of blocks) {
//           const txt = (b.innerText || "").trim();
//           if (txt && txt.length < 140) around += " " + txt.toLowerCase();
//         }
//         wrapperName = (holder.getAttribute?.("name") || "").toLowerCase();
//       }
//     } catch {}

//     const cls = (el.className || "").toLowerCase();
//     const combinedArr = [
//       label,
//       name,
//       id,
//       ph,
//       aria,
//       title,
//       dvvas,
//       datalabel,
//       fcn,
//       rfcn,
//       around,
//       cls,
//       wrapperName,
//     ].filter(Boolean);
//     return {
//       label,
//       name,
//       id,
//       ph,
//       aria,
//       title,
//       dvvas,
//       datalabel,
//       fcn,
//       rfcn,
//       around,
//       cls,
//       wrapperName,
//       combined: combinedArr.join(" "),
//     };
//   }

//   const POS = {
//     firstname: [/\bfirst(?:[_\s-]?name)?\b/, /\bgiven\b/, /\bfname\b/],
//     lastname: [/\blast(?:[_\s-]?name)?\b/, /\bsurname\b/, /\blname\b/],
//     fullname: [
//       /^name$|\bfull[_\s-]?name\b|\bdisplay[_\s-]?name\b|\breal[_\s-]?name\b|\bcompany[_\s-]?name\b/,
//     ],
//     username: [/\busername\b|\buser[_\s-]?name\b|\blogin\b|\buserid\b/],
//     email: [/\bemail\b|\be-?mail\b|\bmail\b/],
//     // NEW: Confirm Email
//     email2: [
//       /\bconfirm(?:\s*e-?mail|\s*email)?\b|\bre-?type\s*email\b|\bre-?enter\s*email\b|\brepeat\s*email\b/i,
//     ],
//     busEmail: [/\b(business|work|company|office)[\s_-]*email\b/],
//     password: [/^password$|pass(?:word)?|pwd/],
//     password2: [
//       /\bconfirm(?:\s*password)?\b|\bre-?type\b|\bre-?enter\b|\brepeat\b|\bpassword\s*again\b/i,
//     ],
//     phone: [/\bphone\b|\bmobile\b|\btel\b|\bcontact\b|\bwhatsapp\b/],
//     address: [/\baddress\b|\bstreet\b|\baddr\b|\broad\b|\bhouse\b|\barea\b/],
//     city: [/\bcity\b|\btown\b/],
//     state: [/\bstate\b|\bprovince\b|\bregion\b/],
//     postcode: [/\bzip\b|\bpostal\b|\bpostcode\b|\bpin\b|\bzipcode\b/],
//     country: [/\bcountry\b/],
//     location: [/\blocation\b|\bplace\b|\barea\b/],
//     website: [
//       /\bwebsite\b|\bweb[_\s-]?url\b|\bhomepage\b|\bsite\b|\burl\b|\bportfolio\b/,
//     ],
//     title: [/\btitle\b|\blisting\b|\bheadline\b/],
//     company: [/\bcompany\b|\borganization\b|\borg\b|\bbusiness\b|\bfirma\b/],
//     description: [
//       /\bdescription\b|\babout\b|\bbio\b|\bsummary\b|\bdescriptions\b|\bprofile\b|\bintro\b|\bstory\b|\bbackground\b|\binterests\b/,
//     ],
//     facebook: [/\bfacebook\b|\bfb\.com\b|\bfacebook\.com\b/],
//     instagram: [/\binstagram\b|\binsta\b|\binstagram\.com\b/],
//     twitter: [/\btwitter\b|\bx\.com\b|\btwitter\.com\b/],
//     linkedin: [/\blinked ?in\b|\blinkedin\.com\b/],
//     youtube: [/\byoutube\b|\byoutu\.be\b|\byoutube\.com\b/],
//   };

//   const NEG = {
//     social: [
//       /\bfacebook\b|\binstagram\b|\btwitter\b|\bx\.com\b|\byoutube\b|\btiktok\b|\blinkedin\b/,
//     ],
//     price: [/\bprice\b|\bamount\b|\brate\b|\bfee\b|\bcost\b|\bbudget\b/],
//     post: [/\bpost\s?code\b|\bpostal\b|\bzip\b/],
//     addressLine2: [
//       /\baddress\s*line\s*2\b/i,
//       /\baddress\s*line\s*3\b/i,
//       /\baddress\s*2\b/i,
//       /\baddr2\b/i,
//       /\baddress2\b/i,
//       /\bapt\b/i,
//       /\bsuite\b/i,
//       /\bunit\b/i,
//     ],
//   };

//   const ROLE_LIST = [
//     "email",
//     "email2",
//     "busEmail",
//     "password",
//     "password2",
//     "fullname",
//     "firstname",
//     "lastname",
//     "username",
//     "phone",
//     "address",
//     "city",
//     "state",
//     "postcode",
//     "country",
//     "location",
//     "website",
//     "facebook",
//     "instagram",
//     "twitter",
//     "linkedin",
//     "youtube",
//     "title",
//     "company",
//     "description",
//   ];

//   const EXACT_HINTS = {
//     email: "email",
//     mail: "email",
//     "e-mail": "email",
//     user_email: "email",
//     username: "username",
//     user: "username",
//     login: "username",
//     userid: "username",
//     name: "fullname",
//     full_name: "fullname",
//     fullname: "fullname",
//     bio: "description",
//     about: "description",
//     url: "website",
//     website: "website",
//     portfolio: "website",

//     s_email: "email",
//     s_name: "fullname",
//     s_password: "password",
//     s_password2: "password",
//     usernamer: "username",
//     namer: "fullname",
//     emailr: "email",

//     user_login: "username",
//     user_email: "email",
//     user_password: "password",

//     "pac-input": "address",

//     contactcompany: "company",
//     contact_company: "company",
//     companyname: "company",

//     // Angular
//     firstname: "firstname",
//     lastname: "lastname",
//     username_fcn: "username",
//     phonenumber: "phone",
//     emailaddress: "email",
//     password: "password",
//     confirmpassword: "password2",

//     // Confirm Email aliases
//     email_confirm: "email2",
//     confirmemail: "email2",
//     emailconfirm: "email2",
//     regdataemailconfirm: "email2", // id="regDataEmailConfirm"
//     emailconfirmation: "email2",

//     // Socials
//     facebook: "facebook",
//     instagram: "instagram",
//     twitter: "twitter",
//     x: "twitter",
//     linkedin: "linkedin",
//     youtube: "youtube",
//   };

//   function isPacField(el, parts) {
//     const id = (el.id || "").toLowerCase();
//     const cls = (el.className || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     return (
//       id === "pac-input" ||
//       cls.includes("pac-target-input") ||
//       cls.includes("google-writen-location") ||
//       /enter a location|search location|start typing address/i.test(ph)
//     );
//   }

//   function exactHintBoost(parts, role) {
//     let bonus = 0;
//     const reasons = [];
//     const { name: n, id: i, wrapperName: w, fcn: f, rfcn: rf } = parts;
//     const add = (cond, amt, why) => {
//       if (cond) {
//         bonus += amt;
//         reasons.push(`+${amt} ${why}`);
//       }
//     };

//     if (EXACT_HINTS[n] === role) add(true, 26, `exact-hint name="${n}"`);
//     if (EXACT_HINTS[i] === role) add(true, 26, `exact-hint id="${i}"`);
//     if (EXACT_HINTS[w] === role) add(true, 26, `exact-hint wrapper="${w}"`);
//     if (EXACT_HINTS[f] === role) add(true, 26, `exact-hint fcn="${f}"`);
//     if (EXACT_HINTS[rf] === role) add(true, 18, `exact-hint rfcn="${rf}"`);

//     if (role === "email")
//       add(parts.ph.includes("email") || f === "emailaddress", 10, "email-ish");
//     if (role === "email2")
//       add(
//         /confirm|re[-\s]?type|re[-\s]?enter|repeat/.test(parts.label) ||
//           /email_confirm|confirmemail|emailconfirm/.test(n + i + f + rf),
//         20,
//         "confirm-email"
//       );
//     if (role === "username")
//       add(
//         parts.ph.includes("username") || f === "username" || rf === "username",
//         10,
//         "username-ish"
//       );
//     if (role === "phone") add(f === "phonenumber", 14, "fcn=phoneNumber");
//     if (role === "password2")
//       add(
//         /confirm|re[-\s]?type|re[-\s]?enter/.test(parts.label) ||
//           f === "confirmpassword",
//         18,
//         "confirm-ish"
//       );
//     if (role === "company")
//       add(/company/.test(parts.label), 16, "label company");
//     return { bonus, reasons };
//   }

//   function scoreRole(parts, role, posList) {
//     let s = 0;
//     const reasons = [];
//     const add = (hit, w, where, rx) => {
//       if (hit) {
//         s += w;
//         reasons.push(`+${w} ${where} ~ ${rx}`);
//       }
//     };
//     for (const rx of posList) {
//       add(rx.test(parts.label), 10, "label", rx);
//       add(rx.test(parts.name), 7, "name", rx);
//       add(rx.test(parts.id), 7, "id", rx);
//       add(rx.test(parts.aria), 5, "aria", rx);
//       add(rx.test(parts.dvvas), 5, "data-vv-as", rx);
//       add(rx.test(parts.ph), 4, "ph", rx);
//       add(rx.test(parts.title), 2, "title", rx);
//       add(rx.test(parts.around), 2, "around", rx);
//       add(rx.test(parts.cls), 1, "class", rx);
//       add(rx.test(parts.wrapperName), 6, "wrapperName", rx);
//       add(rx.test(parts.fcn) || rx.test(parts.rfcn), 10, "fcn", rx);
//     }
//     const ex = exactHintBoost(parts, role);
//     s += ex.bonus;
//     reasons.push(...ex.reasons);

//     if (parts.label === "name") {
//       if (role === "fullname") {
//         s += 4;
//         reasons.push("+4 fullname (label=name)");
//       } else if (role === "firstname" || role === "lastname") {
//         s -= 4;
//         reasons.push("-4 split-name discouraged");
//       }
//     }
//     const penalize = (hit, amt, why) => {
//       if (hit) {
//         s -= amt;
//         reasons.push(`-${amt} ${why}`);
//       }
//     };
//     if (role === "username") {
//       penalize(
//         NEG.social.some((rx) => rx.test(parts.combined)),
//         PENALTY_SOCIAL,
//         "social context"
//       );
//       penalize(
//         /\bemail\b|\bmail\b/.test(parts.combined),
//         PENALTY_EMAIL_NEAR,
//         "email tokens present"
//       );
//     }
//     if (role === "phone")
//       penalize(
//         NEG.price.some((rx) => rx.test(parts.combined)),
//         PENALTY_PRICE,
//         "price context"
//       );
//     if (role === "address")
//       penalize(
//         NEG.post.concat(NEG.addressLine2).some((rx) => rx.test(parts.combined)),
//         PENALTY_ADDR2ZIP,
//         "postcode/addr2 context"
//       );
//     if (role === "website") {
//       penalize(
//         NEG.social.some((rx) => rx.test(parts.combined)),
//         PENALTY_SOCIAL,
//         "social context"
//       );
//       penalize(/username|handle/.test(parts.combined), 8, "username-ish");
//     }
//     if (role === "title" && /^name$/.test(parts.label))
//       penalize(true, PENALTY_TITLENAME, "avoid title when label=name");
//     return { role, score: s, reasons };
//   }

//   const usernameSignalRx = /\b(username|user[_\s-]?name|login|handle|userid)\b/;
//   function usernameSignals(parts, el) {
//     let n = 0;
//     if (usernameSignalRx.test(parts.label)) n++;
//     if (usernameSignalRx.test(parts.name)) n++;
//     if (usernameSignalRx.test(parts.id)) n++;
//     if (usernameSignalRx.test(parts.ph)) n++;
//     if (usernameSignalRx.test(parts.wrapperName)) n++;
//     if (usernameSignalRx.test(parts.fcn) || usernameSignalRx.test(parts.rfcn))
//       n++;
//     const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
//     if (ac.includes("username")) n++;
//     return n;
//   }

//   function detectRoleAndScore(el) {
//     const parts = ctx(el);
//     if (isPacField(el, parts))
//       return {
//         role: "address",
//         score: 99,
//         all: [{ role: "address", score: 99, reasons: ["PAC/Places field"] }],
//         parts,
//       };
//     if (!isVisible(el)) return { role: null, score: 0, all: [], parts };

//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();

//     const own = [parts.name, parts.id, parts.fcn, parts.rfcn, parts.label].join(
//       " "
//     );
//     const isPassish = /(pass(?:word)?|pwd)/i.test(own);
//     const isConfirmish = /(confirm|re[-\s]?type|re[-\s]?enter|password2)/i.test(
//       own
//     );

//     if (type === "password" || isPassish) {
//       const role = isConfirmish ? "password2" : "password";
//       return {
//         role,
//         score: 100,
//         all: [{ role, score: 100, reasons: ["password-type/own-passish"] }],
//         parts,
//       };
//     }
//     if (type === "email")
//       return {
//         role: "email",
//         score: 50,
//         all: [{ role: "email", score: 50, reasons: ["type=email"] }],
//         parts,
//       };
//     if (type === "tel")
//       return {
//         role: "phone",
//         score: 38,
//         all: [{ role: "phone", score: 38, reasons: ["type=tel"] }],
//         parts,
//       };

//     if (tag === "textarea") {
//       const bioish =
//         /about|bio|background|interests|summary|profile|intro|story/.test(
//           parts.ph
//         );
//       const sDesc = scoreRole(parts, "description", POS.description);
//       const sAddr = scoreRole(parts, "address", POS.address);
//       const best =
//         bioish && sDesc.score >= 6
//           ? { ...sDesc, score: sDesc.score + 6 }
//           : sAddr.score >= sDesc.score
//           ? sAddr
//           : sDesc;
//       return { role: best.role, score: best.score, all: [sDesc, sAddr], parts };
//     }

//     const candidates = [];
//     const push = (role, list) => candidates.push(scoreRole(parts, role, list));

//     push("firstname", POS.firstname);
//     push("lastname", POS.lastname);
//     push("fullname", POS.fullname);
//     push("username", POS.username);
//     push("busEmail", POS.busEmail);
//     push("email", POS.email);
//     push("email2", POS.email2); // NEW: confirm email
//     push("password", POS.password);
//     push("password2", POS.password2);
//     push("phone", POS.phone);
//     push("address", POS.address);
//     push("city", POS.city);
//     push("state", POS.state);
//     push("postcode", POS.postcode);
//     push("country", POS.country);
//     push("location", POS.location);
//     push("website", POS.website);
//     push("facebook", POS.facebook);
//     push("instagram", POS.instagram);
//     push("twitter", POS.twitter);
//     push("linkedin", POS.linkedin);
//     push("youtube", POS.youtube);
//     push("title", POS.title);
//     push("company", POS.company);
//     push("description", POS.description);

//     candidates.sort(
//       (a, b) =>
//         b.score - a.score ||
//         ROLE_LIST.indexOf(a.role) - ROLE_LIST.indexOf(b.role)
//     );
//     let best = candidates[0],
//       second = candidates[1];

//     // email vs username tie-break (own attributes only)
//     const ownStr = [
//       parts.label,
//       parts.name,
//       parts.id,
//       parts.ph,
//       parts.aria,
//       parts.title,
//       parts.dvvas,
//       parts.datalabel,
//       parts.fcn,
//       parts.rfcn,
//     ]
//       .filter(Boolean)
//       .join(" ");
//     const hasEmailTokOwn = /\bemail\b|\bmail\b|\be-?mail\b/.test(ownStr);
//     const hasUserTokOwn =
//       /\b(user\s*name|username|login|userid)\b/.test(ownStr) ||
//       EXACT_HINTS[parts.name] === "username" ||
//       EXACT_HINTS[parts.id] === "username" ||
//       EXACT_HINTS[parts.fcn] === "username" ||
//       EXACT_HINTS[parts.rfcn] === "username";
//     if (hasEmailTokOwn && hasUserTokOwn) {
//       const emailItem = candidates.find((c) => c.role === "email");
//       if (emailItem)
//         return {
//           role: "email",
//           score: Math.max(emailItem.score, T_AUTO),
//           all: candidates,
//           parts,
//         };
//     }

//     if (second && best.score - second.score < GAP_MIN)
//       return { role: null, score: 0, all: candidates, parts };

//     if (best.role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         EXACT_HINTS[parts.name] === "username" ||
//         EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" ||
//         parts.dvvas === "username" ||
//         EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username";
//       if (!(sig >= 2 || explicit))
//         return { role: null, score: 0, all: candidates, parts };
//     }

//     return { role: best.role, score: best.score, all: candidates, parts };
//   }

//   function prepareProfileValues(profile) {
//     const p = profile?.profile || profile || {};
//     const first = p.firstname || p.firstName || "";
//     const last = p.lastname || p.lastName || "";
//     const fullname = (
//       p.fullname ||
//       p.fullName ||
//       `${first} ${last}`.trim()
//     ).trim();
//     const password =
//       p.activePassword === "submissionPassword"
//         ? p.submissionPassword || ""
//         : p.emailPassword || p.password || "";
//     return {
//       firstname: first,
//       lastname: last,
//       fullname,
//       username: p.username || "",
//       email: p.email || p.submissionEmail || "",
//       busEmail: p.businessEmail || p.workEmail || "",
//       password,
//       phone: p.phone || p.number || p.phoneNumber || "",
//       website: p.website || "",
//       title: p.title || "",
//       company: p.company || fullname || "",
//       description: p.description || p.bio || "",
//       address: p.address || "",
//       city: p.city || "",
//       state: p.state || "",
//       postcode: p.postcode || p.zip || "",
//       country: p.country || "",
//       location: p.location || "",
//       facebook: p.facebook || "",
//       instagram: p.instagram || "",
//       twitter: p.twitter || p.x || "",
//       linkedin: p.linkedin || "",
//       youtube: p.youtube || "",
//     };
//   }

//   function fillTinyMCEFromTextarea(textareaEl, v) {
//     try {
//       const id = textareaEl.id || textareaEl.name;
//       if (!id) return false;
//       const tm = window.tinymce || window.tinyMCE;
//       if (tm?.get) {
//         const ed = tm.get(id);
//         if (ed) {
//           ed.setContent(v);
//           try {
//             ed.fire("change");
//           } catch {}
//           textareaEl.value = v;
//           textareaEl.dataset.rowfiller = "filled";
//           DEBUG && log(`[rich] TinyMCE setContent id=${id}`);
//           return true;
//         }
//       }
//       const ifr =
//         document.getElementById(`${id}_ifr`) ||
//         textareaEl
//           .closest(".wp-editor-wrap")
//           ?.querySelector('iframe[id$="_ifr"]');
//       if (ifr?.contentWindow?.document?.body) {
//         const body = ifr.contentDocument.body;
//         body.innerHTML = v;
//         try {
//           body.dispatchEvent(new Event("input", { bubbles: true }));
//         } catch {}
//         textareaEl.value = v;
//         textareaEl.dataset.rowfiller = "filled";
//         DEBUG && log(`[rich] Iframe body filled id=${id}_ifr`);
//         return true;
//       }
//     } catch (e) {
//       warn("fillTinyMCE error", e?.message || e);
//     }
//     return false;
//   }

//   function fillNearestContentEditable(container, v) {
//     try {
//       const ce = container.querySelector(
//         '[contenteditable="true"], .mce-content-body, div[role="textbox"]'
//       );
//       if (ce) {
//         if (ce.innerHTML !== undefined) ce.innerHTML = v;
//         else ce.innerText = v;
//         try {
//           ce.dispatchEvent(new Event("input", { bubbles: true }));
//         } catch {}
//         ce.dataset && (ce.dataset.rowfiller = "filled");
//         DEBUG && log(`[rich] contenteditable filled`);
//         return true;
//       }
//     } catch {}
//     return false;
//   }

//   function firePacEvents(el) {
//     try {
//       el.focus();
//     } catch {}
//     try {
//       el.dispatchEvent(new Event("input", { bubbles: true }));
//     } catch {}
//     try {
//       el.dispatchEvent(new Event("change", { bubbles: true }));
//     } catch {}
//     try {
//       el.blur();
//     } catch {}
//   }

//   function toSocialURL(role, v) {
//     if (!v) return v;
//     let handle = String(v).trim();
//     if (looksLikeURL(handle)) return handle;
//     handle = handle
//       .replace(/^@/, "")
//       .replace(/^https?:\/\//i, "")
//       .replace(/\/+$/, "");
//     if (!handle) return v;
//     switch (role) {
//       case "facebook":
//         return `https://facebook.com/${handle}`;
//       case "instagram":
//         return `https://instagram.com/${handle}`;
//       case "twitter":
//         return `https://x.com/${handle}`;
//       case "linkedin":
//         return /company|in\//.test(handle)
//           ? `https://linkedin.com/${handle}`
//           : `https://linkedin.com/in/${handle}`;
//       case "youtube":
//         return /^@/.test(v)
//           ? `https://youtube.com/${handle}`
//           : `https://youtube.com/@${handle}`;
//       default:
//         return v;
//     }
//   }

//   function tryFill(el, role, vals, force, parts, idx) {
//     if (!el) return { ok: false, why: "no-el" };

//     if (role === "description") {
//       if (el.isContentEditable && isVisible(el)) {
//         const v = vals.description;
//         if (!v) return { ok: false, why: "no-value-for-description" };
//         try {
//           document.execCommand?.("insertText", false, v);
//         } catch {
//           el.innerText = v;
//         }
//         el.dataset.rowfiller = "filled";
//         DEBUG && log(`[fill] #${idx} description → contenteditable`);
//         return { ok: true };
//       }
//       const tag = (el.tagName || "").toLowerCase();
//       if (tag === "textarea") {
//         const style = (el.getAttribute("style") || "").toLowerCase();
//         const hiddenish =
//           style.includes("display: none") ||
//           el.getAttribute("aria-hidden") === "true" ||
//           !isVisible(el);
//         if (hiddenish) {
//           const v = vals.description;
//           if (!v) return { ok: false, why: "no-value-for-description" };
//           const ok =
//             fillTinyMCEFromTextarea(el, v) ||
//             fillNearestContentEditable(
//               el.closest(".wp-editor-wrap") || document,
//               v
//             );
//           return { ok, why: ok ? "" : "rich-editor-not-found" };
//         }
//       }
//     }

//     if (!isVisible(el)) return { ok: false, why: "not-visible" };
//     if (!force && alreadyFilled(el))
//       return { ok: false, why: "already-filled" };

//     let v = vals[role];
//     if ((role === "firstname" || role === "lastname") && !v && vals.fullname) {
//       const t = vals.fullname.trim().split(/\s+/).filter(Boolean);
//       if (t.length) {
//         if (role === "firstname") v = t[0];
//         if (role === "lastname") v = t.length > 1 ? t[t.length - 1] : "";
//       }
//     }
//     if (role === "fullname" && !v)
//       v = [vals.firstname, vals.lastname].filter(Boolean).join(" ").trim();
//     if (!v && role === "busEmail" && vals.email) v = vals.email;

//     // confirm roles mirror primary values
//     if (role === "password2") v = vals.password;
//     if (role === "email2") v = vals.email || vals.busEmail;

//     if (!v) return { ok: false, why: `no-value-for-${role}` };

//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();

//     if (
//       (role === "email" || role === "busEmail" || role === "email2") &&
//       !looksLikeEmail(v)
//     )
//       return { ok: false, why: "value-not-email" };
//     if (role === "phone") {
//       if (!looksLikePhone(v)) return { ok: false, why: "value-not-phone" };
//       if (NEG.price.some((rx) => rx.test(parts.combined)))
//         return { ok: false, why: "price-context" };
//     }
//     if (role === "website" && !looksLikeURL(v))
//       return { ok: false, why: "value-not-url" };
//     if (role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         /\b(user\s*name|username|login)\b/.test(parts.combined) ||
//         EXACT_HINTS[parts.name] === "username" ||
//         EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" ||
//         EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username";
//       if (!looksLikeUser(v)) return { ok: false, why: "value-not-username" };
//       if (["email", "password", "tel", "url", "number"].includes(type))
//         return { ok: false, why: "bad-input-type" };
//       if (!(sig >= 2 || explicit))
//         return { ok: false, why: "weak-username-signals" };
//       if (NEG.social.some((rx) => rx.test(parts.combined)))
//         return { ok: false, why: "social-context" };
//       if (/\bemail\b|\bmail\b/.test(parts.combined))
//         return { ok: false, why: "email-preferred-here" };
//     }
//     if (role === "postcode") {
//       if (!looksLikeZip(v)) return { ok: false, why: "value-not-zip" };
//       if (/\d/.test(v) === false && v.length > 4)
//         return { ok: false, why: "zip-no-digits" };
//     }
//     if (role === "address") {
//       const isAddr2 =
//         NEG.addressLine2.some((rx) => rx.test(parts.combined)) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.name) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.id);
//       if (isAddr2) return { ok: false, why: "addr2-context" };
//     }
//     if (role === "title" && /^name$/.test(parts.label))
//       return { ok: false, why: "label-name-title-guard" };
//     if (role === "fullname" && looksLikeEmail(v))
//       return { ok: false, why: "fullname-looks-like-email" };

//     if (
//       ["facebook", "instagram", "twitter", "linkedin", "youtube"].includes(role)
//     ) {
//       v = toSocialURL(role, v);
//       if (!looksLikeURL(v)) return { ok: false, why: "social-url-invalid" };
//     }

//     if (tag === "select") {
//       for (const opt of Array.from(el.options || [])) {
//         if (!opt) continue;
//         if (
//           (opt.value &&
//             String(opt.value).toLowerCase() === String(v).toLowerCase()) ||
//           (opt.text &&
//             String(opt.text).toLowerCase() === String(v).toLowerCase())
//         ) {
//           el.value = opt.value;
//           try {
//             el.dispatchEvent(new Event("change", { bubbles: true }));
//           } catch {}
//           el.dataset.rowfiller = "filled";
//           DEBUG && log(`[fill] #${idx} select role=${role}`);
//           return { ok: true };
//         }
//       }
//       return { ok: false, why: "select-no-match" };
//     }

//     const isPac = isPacField(el, parts);
//     if (el.isContentEditable) {
//       try {
//         document.execCommand("insertText", false, v);
//       } catch {
//         el.innerText = v;
//       }
//       el.dataset.rowfiller = "filled";
//       DEBUG && log(`[fill] #${idx} contenteditable role=${role}`);
//       return { ok: true };
//     }
//     setNativeValue(el, v);
//     if (isPac) firePacEvents(el);
//     el.dataset.rowfiller = "filled";
//     DEBUG && log(`[fill] #${idx} input role=${role}${isPac ? " (PAC)" : ""}`);
//     return { ok: true };
//   }

//   function doFill(profile, force = false) {
//     try {
//       const vals = prepareProfileValues(profile);
//       const nodes = Array.from(
//         document.querySelectorAll(
//           "input, textarea, select, [contenteditable='true']"
//         )
//       );
//       nodes.sort(
//         (a, b) =>
//           (a.getBoundingClientRect().top || 0) -
//           (b.getBoundingClientRect().top || 0)
//       );

//       let filled = 0;
//       const used = new Set();
//       let idx = 0;

//       DEBUG &&
//         log(
//           `--- scan start (${
//             nodes.length
//           } fields) @ ${new Date().toISOString()} ---`
//         );

//       for (const el of nodes) {
//         idx++;
//         const type = (el.type || "").toLowerCase();
//         if (
//           [
//             "hidden",
//             "submit",
//             "button",
//             "reset",
//             "image",
//             "file",
//             "checkbox",
//             "radio",
//           ].includes(type) &&
//           el.tagName !== "TEXTAREA"
//         )
//           continue;

//         let det = detectRoleAndScore(el);
//         const parts = det?.parts || ctx(el);

//         if (DEBUG) {
//           const baseRow = {
//             "#": idx,
//             tag: el.tagName?.toLowerCase(),
//             type,
//             name: el.name || "",
//             id: el.id || "",
//             ph: el.placeholder || "",
//             label: parts.label,
//             wrapper: parts.wrapperName,
//             fcn: parts.fcn,
//             chosen: det?.role || null,
//             score: det?.score || 0,
//             min: force ? T_FORCE : T_AUTO,
//           };
//           log("[cand]", baseRow);
//           if (det?.all?.length) {
//             const map = {};
//             det.all.forEach((x) => (map[x.role] = x.score));
//             log("[scores]", map);
//             det.all.forEach(
//               (x) => x.reasons?.length && log(`[reasons] ${x.role}`, x.reasons)
//             );
//           }
//         }

//         if (!det || !det.role) {
//           DEBUG && log(`[skip] #${idx} undecided/ambiguous`);
//           continue;
//         }
//         const min = force ? T_FORCE : T_AUTO;
//         if (det.score < min) {
//           DEBUG &&
//             log(`[skip] #${idx} below-threshold score=${det.score} < ${min}`);
//           continue;
//         }

//         // single-fill roles (email2/password2 deliberately NOT here)
//         const singleRoles = new Set([
//           "email",
//           "busEmail",
//           "password",
//           "firstname",
//           "lastname",
//           "fullname",
//           "phone",
//           "city",
//           "state",
//           "postcode",
//           "country",
//           "website",
//           "facebook",
//           "instagram",
//           "twitter",
//           "linkedin",
//           "youtube",
//           "title",
//           "company",
//         ]);
//         if (singleRoles.has(det.role) && used.has(det.role)) {
//           DEBUG && log(`[skip] #${idx} duplicate-role ${det.role}`);
//           continue;
//         }

//         const res = tryFill(el, det.role, vals, force, parts, idx);
//         if (res.ok) {
//           filled++;
//           used.add(det.role);
//           DEBUG &&
//             log(
//               `[match] #${idx} role=${det.role} score=${
//                 det.score
//               } thr=${min} name=${el.name || ""} id=${el.id || ""} label="${
//                 parts.label
//               }" wrap="${parts.wrapperName}" fcn="${parts.fcn}"`
//             );
//         } else {
//           DEBUG && log(`[skip] #${idx} role=${det.role} reason=${res.why}`);
//         }
//       }

//       // extra pass for description editors if missed
//       if (!used.has("description") && (vals.description || "").trim()) {
//         const tAreas = Array.from(
//           document.querySelectorAll("textarea[id], textarea[name]")
//         );
//         for (const ta of tAreas) {
//           const idn = (ta.id || ta.name || "").toLowerCase();
//           const lab = extractLabelText(ta).toLowerCase();
//           const looksDesc =
//             idn === "description" ||
//             /\bdescription\b/.test(lab) ||
//             ta
//               .closest(".wp-editor-wrap")
//               ?.id?.toLowerCase()
//               ?.includes("description");
//           if (!looksDesc) continue;
//           if (
//             fillTinyMCEFromTextarea(ta, vals.description) ||
//             fillNearestContentEditable(
//               ta.closest(".wp-editor-wrap") || document,
//               vals.description
//             )
//           ) {
//             used.add("description");
//             filled++;
//             DEBUG && log(`[rich-pass] description filled via editor`);
//             break;
//           }
//         }
//       }

//       DEBUG && log(`--- scan done: filled=${filled} ---`);
//       return filled;
//     } catch (e) {
//       warn("doFill error", e?.message || e);
//       return 0;
//     }
//   }

//   try {
//     chrome?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
//       if (!msg?.action) return;
//       if (
//         ["autofill", "autofillProfile", "autofillAuth", "runFill"].includes(
//           msg.action
//         )
//       ) {
//         const go = async (profile) => {
//           const res = await safeGet(["autofillEnabled"]);
//           const enabled =
//             res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//           if (!enabled && !msg.force) {
//             sendResponse({ ok: false, filled: 0, error: "disabled" });
//             return;
//           }
//           const filled = doFill(profile, !!msg.force);
//           sendResponse({ ok: filled > 0, filled });
//         };
//         if (msg.profile) go(msg.profile);
//         else safeGet(["profile"]).then((r) => go(r?.profile || null));
//         return true;
//       }
//       if (msg.action === "toggleAutofill") {
//         sendResponse({ ok: true });
//         return true;
//       }
//     });
//   } catch {}

//   let autorunTimer = null;
//   const scheduleAutorun = (delay = 200) => {
//     if (autorunTimer) clearTimeout(autorunTimer);
//     autorunTimer = setTimeout(async () => {
//       const res = await safeGet(["autofillEnabled", "profile"]);
//       const enabled =
//         res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//       const profile = res?.profile;
//       if (!enabled || !profile) return;
//       try {
//         doFill(profile, false);
//       } catch (e) {
//         warn("autorun error", e?.message || e);
//       }
//     }, delay);
//   };

//   function autorun() {
//     scheduleAutorun(60);
//     scheduleAutorun(500);
//   }
//   if (
//     document.readyState === "complete" ||
//     document.readyState === "interactive"
//   )
//     autorun();
//   else window.addEventListener("DOMContentLoaded", autorun, { once: true });

//   if (window.MutationObserver) {
//     const mo = new MutationObserver(() => scheduleAutorun(160));
//     try {
//       mo.observe(document.documentElement, { childList: true, subtree: true });
//     } catch {}
//   }

//   (function hookHistory() {
//     try {
//       const push = history.pushState;
//       const rep = history.replaceState;
//       history.pushState = function () {
//         try {
//           push.apply(this, arguments);
//         } finally {
//           scheduleAutorun(160);
//         }
//       };
//       history.replaceState = function () {
//         try {
//           rep.apply(this, arguments);
//         } finally {
//           scheduleAutorun(160);
//         }
//       };
//       window.addEventListener("popstate", () => scheduleAutorun(160));
//     } catch {}
//   })();

//   document.addEventListener("visibilitychange", () => {
//     if (document.visibilityState === "visible") scheduleAutorun(120);
//   });

//   log(
//     "HyperFill v6.9-pac+richdesc (alioup-hotfix + socials + confirm-email) ready on",
//     HOST
//   );
// })();

















// /* content/fill.js — HyperFill v6.9-pac+richdesc (alioup-hotfix + socials + confirm-email + site fixes)
//  * Fixes added:
//  * - Robust label discovery for div-based UIs (.register_main/.register_title, .form-group)
//  * - Exact hints for ScribbleHub (reg_username/reg_email/confirm) + ZipLeaf (company_* fields)
//  * - Ignore foreign data-rowfiller="filled" unless the field actually has a value
//  * - Scope label[for=id] lookup to the nearest container (avoids duplicate-id collisions)
//  */

// (() => {
//   if (window.__HF_v69_installed) return;
//   window.__HF_v69_installed = true;

//   const DEBUG = true;
//   const log = (...a) => { try { console.debug("[HF]", ...a); } catch {} };
//   const warn = (...a) => { try { console.warn("[HF]", ...a); } catch {} };

//   const T_AUTO = 10, T_FORCE = 8, GAP_MIN = 2;
//   const PENALTY_SOCIAL = 18, PENALTY_EMAIL_NEAR = 18, PENALTY_PRICE = 10, PENALTY_ADDR2ZIP = 12, PENALTY_TITLENAME = 10;
//   const BLOCK_HOSTS = [/(^|\.)google\.com$/i, /(^|\.)accounts\.google\.com$/i];

//   const isVisible = (el) => {
//     try {
//       if (!el || el.disabled || el.hidden || el.readOnly) return false;
//       const s = window.getComputedStyle ? getComputedStyle(el) : null;
//       if (s && (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")) return false;
//       const r = el.getBoundingClientRect?.();
//       if (r && (r.width <= 1 || r.height <= 1)) return false;
//       const st = (el.getAttribute("style") || "").toLowerCase();
//       if (st.includes("left:-5000px") || st.includes("max-width:1px")) return false;
//       return true;
//     } catch { return false; }
//   };

//   // IMPORTANT: ignore dataset.rowfiller unless value actually exists (some sites hardcode this attribute)
//   const alreadyFilled = (el) => {
//     try {
//       if (el.isContentEditable) return !!el.innerText?.trim();
//       const v = el.value;
//       return v !== undefined && v !== null && String(v).trim().length > 0;
//     } catch { return false; }
//   };

//   function setNativeValue(el, value) {
//     try {
//       const p = Object.getPrototypeOf(el);
//       const d = Object.getOwnPropertyDescriptor(p, "value");
//       if (d && d.set) d.set.call(el, value);
//       else el.value = value;
//     } catch { try { el.value = value; } catch {} }
//     try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//     try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//   }

//   const HOST = location.hostname || "";
//   const isBlockedHost = () => BLOCK_HOSTS.some((rx) => rx.test(HOST));
//   if (isBlockedHost()) { DEBUG && log("blocked host → skip HyperFill on", HOST); return; }

//   const isExtAlive = () =>
//     typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id && !!chrome.storage?.local;

//   const safeGet = (keys) => new Promise((resolve) => {
//     if (!isExtAlive()) { resolve({}); return; }
//     try {
//       chrome.storage.local.get(keys, (res) => {
//         if (!isExtAlive() || chrome.runtime.lastError) {
//           if (chrome.runtime?.lastError) warn("storage.get lastError:", chrome.runtime.lastError.message);
//           resolve({}); return;
//         }
//         resolve(res || {});
//       });
//     } catch (e) { warn("safeGet caught:", e?.message || e); resolve({}); }
//   });

//   const rxEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   const looksLikeEmail = (v) => !!v && rxEmail.test(String(v).trim());
//   const looksLikePhone = (v) => !!v && (String(v).match(/\d/g) || []).length >= 10;
//   const looksLikeURL = (v) => !!v && (/^https?:\/\//i.test(v) || /\.[a-z]{2,}$/i.test(v));
//   const looksLikeUser = (v) => !!v && !v.includes("@") && !/\s/.test(v) && /^[A-Za-z0-9._-]{3,}$/.test(v);
//   const looksLikeZip = (v) => !!v && String(v).trim().length <= 12 && /^[A-Za-z0-9-\s]+$/.test(v);
//   const getText = (n) => (n?.textContent || "").trim();

//   // Nearest container types we care about (added .register_* and .form-group)
//   const CONTAINER_SEL =
//     ".form-group, .form_row, .form-fieldset, .field, .input-box, .controls, .input-wrapper, .field_wrap__Gv92k, .register_main, .register_item, .register_title";

//   const TITLEISH_SEL = ":scope > label, :scope > .register_title, :scope > .field_label, :scope > .control-label, :scope > .title, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > span, :scope > p, :scope > div";

//   // Find a nearby label with scoping to avoid duplicate-id collisions
//   function findScopedLabelText(el) {
//     try {
//       const id = el.id;
//       if (id) {
//         const cont = el.closest(CONTAINER_SEL) || el.parentElement;
//         if (cont) {
//           const within = cont.querySelector(`label[for="${CSS.escape(id)}"]`);
//           if (within?.innerText) return within.innerText.trim();
//         }
//         // fallback to document-level if not found inside container
//         const global = document.querySelector(`label[for="${CSS.escape(id)}"]`);
//         if (global?.innerText) return global.innerText.trim();
//       }
//     } catch {}
//     return "";
//   }

//   function extractLabelText(el) {
//     try {
//       // 1) Scoped label[for=id] first (fixes duplicate-id pages like ZipLeaf)
//       let txt = findScopedLabelText(el);
//       if (txt) return txt;

//       // 2) climb for <label> ancestor
//       for (let p = el.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) {
//         if (p.tagName === "LABEL") return p.innerText.trim();
//       }

//       // 3) same-block previous/next text siblings
//       const prev = el.previousElementSibling;
//       if (prev && /^(LABEL|DIV|SPAN|P|H[1-6])$/.test(prev.tagName)) {
//         const t = getText(prev);
//         if (t) return t;
//       }
//       const next = el.nextElementSibling;
//       if (next && /label|field_label/i.test(next.className || "") && next.innerText) {
//         return next.innerText.trim();
//       }

//       // 4) container-aware title blocks (handles ScribbleHub .register_title)
//       const cont = el.closest(CONTAINER_SEL);
//       if (cont) {
//         // Look at direct title-ish elements inside the container
//         const blocks = cont.querySelectorAll(TITLEISH_SEL);
//         for (const b of blocks) {
//           const t = (b.innerText || "").trim();
//           // Prefer shortish labels that are next to the input's holder
//           if (t && t.length <= 120 && !/^\s*$/.test(t)) return t;
//         }
//         // If input sits inside .register_item, check its parent's previous sibling .register_title
//         const holder = el.closest(".register_item");
//         if (holder?.previousElementSibling?.classList.contains("register_title")) {
//           const t = holder.previousElementSibling.innerText?.trim();
//           if (t) return t;
//         }
//       }

//       // 5) aria-labelledby / title fallbacks
//       const refId = el.getAttribute?.("aria-labelledby");
//       if (refId) {
//         const ref = document.getElementById(refId);
//         if (ref?.innerText) return ref.innerText.trim();
//       }
//       if (el.title) return el.title.trim();
//       return "";
//     } catch {
//       return "";
//     }
//   }

//   function ctx(el) {
//     const label = (extractLabelText(el) || "").toLowerCase();
//     const name = (el.name || "").toLowerCase();
//     const id = (el.id || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
//     const title = (el.getAttribute?.("title") || "").toLowerCase();
//     const dvvas = (el.getAttribute?.("data-vv-as") || "").toLowerCase();
//     const datalabel = (el.getAttribute?.("data-label") || "").toLowerCase();
//     const fcn = (el.getAttribute?.("formcontrolname") || "").toLowerCase();
//     const rfcn = (el.getAttribute?.("ng-reflect-form-control-name") || "").toLowerCase();

//     // Build "around" text from container + its sibling title (more robust for div-based UIs)
//     let around = "";
//     let wrapperName = "";
//     try {
//       const holder =
//         el.closest(CONTAINER_SEL) || el.parentElement;
//       if (holder) {
//         const collectFrom = new Set([holder]);
//         if (holder.previousElementSibling) collectFrom.add(holder.previousElementSibling);
//         if (holder.parentElement) collectFrom.add(holder.parentElement);
//         for (const node of collectFrom) {
//           const blocks = node.querySelectorAll(TITLEISH_SEL);
//           for (const b of blocks) {
//             const t = (b.innerText || "").trim();
//             if (t && t.length < 160) around += " " + t.toLowerCase();
//           }
//         }
//         wrapperName = (holder.getAttribute?.("name") || "").toLowerCase();
//       }
//     } catch {}

//     const cls = (el.className || "").toLowerCase();
//     const combinedArr = [label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn, around, cls, wrapperName].filter(Boolean);
//     return { label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn, around, cls, wrapperName, combined: combinedArr.join(" ") };
//   }

//   const POS = {
//     firstname: [/\bfirst(?:[_\s-]?name)?\b/, /\bgiven\b/, /\bfname\b/],
//     lastname: [/\blast(?:[_\s-]?name)?\b/, /\bsurname\b/, /\blname\b/],
//     fullname: [/^name$|\bfull[_\s-]?name\b|\bdisplay[_\s-]?name\b|\breal[_\s-]?name\b|\bcompany[_\s-]?name\b/],
//     username: [/\busername\b|\buser[_\s-]?name\b|\blogin\b|\buserid\b/],
//     email: [/\bemail\b|\be-?mail\b|\bmail\b|\byouremail\b|\byour[_\s-]?email\b/],
//     email2: [/\bconfirm(?:\s*e-?mail|\s*email)?\b|\bre-?type\s*email\b|\bre-?enter\s*email\b|\brepeat\s*email\b/i],
//     busEmail: [/\b(business|work|company|office)[\s_-]*email\b/],
//     password: [/^password$|pass(?:word)?|pwd/],
//     password2: [/\bconfirm(?:\s*password)?\b|\bre-?type\b|\bre-?enter\b|\brepeat\b|\bpassword\s*again\b/i],
//     phone: [/\bphone\b|\bmobile\b|\btel\b|\bcontact\b|\bwhatsapp\b/],
//     address: [/\baddress\b|\bstreet\b|\baddr\b|\broad\b|\bhouse\b|\barea\b/],
//     city: [/\bcity\b|\btown\b/],
//     state: [/\bstate\b|\bprovince\b|\bregion\b/],
//     postcode: [/\bzip\b|\bpostal\b|\bpostcode\b|\bpin\b|\bzipcode\b/],
//     country: [/\bcountry\b/],
//     location: [/\blocation\b|\bplace\b|\barea\b/],
//     website: [/\bwebsite\b|\bweb[_\s-]?url\b|\bhomepage\b|\bsite\b|\burl\b|\bportfolio\b/],
//     title: [/\btitle\b|\blisting\b|\bheadline\b/],
//     company: [/\bcompany\b|\borganization\b|\borg\b|\bbusiness\b|\bfirma\b/],
//     description: [/\bdescription\b|\babout\b|\bbio\b|\bsummary\b|\bdescriptions\b|\bprofile\b|\bintro\b|\bstory\b|\bbackground\b|\binterests\b/],
//     facebook: [/\bfacebook\b|\bfb\.com\b|\bfacebook\.com\b/],
//     instagram: [/\binstagram\b|\binsta\b|\binstagram\.com\b/],
//     twitter: [/\btwitter\b|\bx\.com\b|\btwitter\.com\b/],
//     linkedin: [/\blinked ?in\b|\blinkedin\.com\b/],
//     youtube: [/\byoutube\b|\byoutu\.be\b|\byoutube\.com\b/],
//   };

//   const NEG = {
//     social: [/\bfacebook\b|\binstagram\b|\btwitter\b|\bx\.com\b|\byoutube\b|\btiktok\b|\blinkedin\b/],
//     price: [/\bprice\b|\bamount\b|\brate\b|\bfee\b|\bcost\b|\bbudget\b/],
//     post: [/\bpost\s?code\b|\bpostal\b|\bzip\b/],
//     addressLine2: [/\baddress\s*line\s*2\b/i, /\baddress\s*line\s*3\b/i, /\baddress\s*2\b/i, /\baddr2\b/i, /\baddress2\b/i, /\bapt\b/i, /\bsuite\b/i, /\bunit\b/i],
//   };

//   const ROLE_LIST = [
//     "email","email2","busEmail","password","password2","fullname","firstname","lastname","username",
//     "phone","address","city","state","postcode","country","location","website",
//     "facebook","instagram","twitter","linkedin","youtube","title","company","description",
//   ];

//   // Exact hints (added reg_* and company_* mappings)
//   const EXACT_HINTS = {
//     email: "email", mail: "email", "e-mail": "email", user_email: "email",
//     username: "username", user: "username", login: "username", userid: "username",
//     name: "fullname", full_name: "fullname", fullname: "fullname",
//     bio: "description", about: "description", url: "website", website: "website", portfolio: "website",

//     // WordPress-ish
//     s_email: "email", s_name: "fullname", s_password: "password", s_password2: "password",
//     usernamer: "username", namer: "fullname", emailr: "email",
//     user_login: "username", user_email: "email", user_password: "password",

//     // Google PAC
//     "pac-input": "address",

//     // Contact/company
//     contactcompany: "company", contact_company: "company", companyname: "company",

//     // Angular
//     firstname: "firstname", lastname: "lastname", username_fcn: "username", phonenumber: "phone",
//     emailaddress: "email", password: "password", confirmpassword: "password2",

//     // Confirm Email aliases
//     email_confirm: "email2", confirmemail: "email2", emailconfirm: "email2", regdataemailconfirm: "email2", emailconfirmation: "email2",

//     // Socials
//     facebook: "facebook", instagram: "instagram", twitter: "twitter", x: "twitter", linkedin: "linkedin", youtube: "youtube",

//     // ScribbleHub (Account Registration)
//     reg_username: "username",
//     reg_email: "email",
//     reg_password: "password",
//     reg_password_confirm: "password2",

//     // ZipLeaf (Step 2 – Company Details)
//     company_email: "email",
//     company_phone: "phone",
//     company_website: "website",
//   };

//   function isPacField(el, parts) {
//     const id = (el.id || "").toLowerCase();
//     const cls = (el.className || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     return (
//       id === "pac-input" ||
//       cls.includes("pac-target-input") ||
//       cls.includes("google-writen-location") ||
//       /enter a location|search location|start typing address/i.test(ph)
//     );
//   }

//   function exactHintBoost(parts, role) {
//     let bonus = 0; const reasons = [];
//     const { name: n, id: i, wrapperName: w, fcn: f, rfcn: rf } = parts;
//     const add = (cond, amt, why) => { if (cond) { bonus += amt; reasons.push(`+${amt} ${why}`); } };
//     if (EXACT_HINTS[n] === role) add(true, 26, `exact-hint name="${n}"`);
//     if (EXACT_HINTS[i] === role) add(true, 26, `exact-hint id="${i}"`);
//     if (EXACT_HINTS[w] === role) add(true, 26, `exact-hint wrapper="${w}"`);
//     if (EXACT_HINTS[f] === role) add(true, 26, `exact-hint fcn="${f}"`);
//     if (EXACT_HINTS[rf] === role) add(true, 18, `exact-hint rfcn="${rf}"`);

//     if (role === "email") add(parts.ph.includes("email") || f === "emailaddress", 10, "email-ish");
//     if (role === "email2") add(/confirm|re[-\s]?type|re[-\s]?enter|repeat/.test(parts.label) || /email_confirm|confirmemail|emailconfirm/.test(n + i + f + rf), 20, "confirm-email");
//     if (role === "username") add(parts.ph.includes("username") || f === "username" || rf === "username", 10, "username-ish");
//     if (role === "phone") add(f === "phonenumber", 14, "fcn=phoneNumber");
//     if (role === "password2") add(/confirm|re[-\s]?type|re[-\s]?enter/.test(parts.label) || f === "confirmpassword", 18, "confirm-ish");
//     if (role === "company") add(/company/.test(parts.label), 16, "label company");
//     return { bonus, reasons };
//   }

//   function scoreRole(parts, role, posList) {
//     let s = 0; const reasons = [];
//     const add = (hit, w, where, rx) => { if (hit) { s += w; reasons.push(`+${w} ${where} ~ ${rx}`); } };
//     for (const rx of posList) {
//       add(rx.test(parts.label), 10, "label", rx);
//       add(rx.test(parts.name), 7, "name", rx);
//       add(rx.test(parts.id), 7, "id", rx);
//       add(rx.test(parts.aria), 5, "aria", rx);
//       add(rx.test(parts.dvvas), 5, "data-vv-as", rx);
//       add(rx.test(parts.ph), 4, "ph", rx);
//       add(rx.test(parts.title), 2, "title", rx);
//       add(rx.test(parts.around), 2, "around", rx);
//       add(rx.test(parts.cls), 1, "class", rx);
//       add(rx.test(parts.wrapperName), 6, "wrapperName", rx);
//       add(rx.test(parts.fcn) || rx.test(parts.rfcn), 10, "fcn", rx);
//     }
//     const ex = exactHintBoost(parts, role); s += ex.bonus; reasons.push(...ex.reasons);

//     if (parts.label === "name") {
//       if (role === "fullname") { s += 4; reasons.push("+4 fullname (label=name)"); }
//       else if (role === "firstname" || role === "lastname") { s -= 4; reasons.push("-4 split-name discouraged"); }
//     }
//     const penalize = (hit, amt, why) => { if (hit) { s -= amt; reasons.push(`-${amt} ${why}`); } };
//     if (role === "username") {
//       penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
//       penalize(/\bemail\b|\bmail\b/.test(parts.combined), PENALTY_EMAIL_NEAR, "email tokens present");
//     }
//     if (role === "phone") penalize(NEG.price.some((rx) => rx.test(parts.combined)), PENALTY_PRICE, "price context");
//     if (role === "address") penalize(NEG.post.concat(NEG.addressLine2).some((rx) => rx.test(parts.combined)), PENALTY_ADDR2ZIP, "postcode/addr2 context");
//     if (role === "website") {
//       penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
//       penalize(/username|handle/.test(parts.combined), 8, "username-ish");
//     }
//     if (role === "title" && /^name$/.test(parts.label)) penalize(true, PENALTY_TITLENAME, "avoid title when label=name");
//     return { role, score: s, reasons };
//   }

//   const usernameSignalRx = /\b(username|user[_\s-]?name|login|handle|userid)\b/;
//   function usernameSignals(parts, el) {
//     let n = 0;
//     if (usernameSignalRx.test(parts.label)) n++;
//     if (usernameSignalRx.test(parts.name)) n++;
//     if (usernameSignalRx.test(parts.id)) n++;
//     if (usernameSignalRx.test(parts.ph)) n++;
//     if (usernameSignalRx.test(parts.wrapperName)) n++;
//     if (usernameSignalRx.test(parts.fcn) || usernameSignalRx.test(parts.rfcn)) n++;
//     const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
//     if (ac.includes("username")) n++;
//     return n;
//   }

//   function detectRoleAndScore(el) {
//     const parts = ctx(el);
//     if (isPacField(el, parts))
//       return { role: "address", score: 99, all: [{ role: "address", score: 99, reasons: ["PAC/Places field"] }], parts };
//     if (!isVisible(el)) return { role: null, score: 0, all: [], parts };

//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();

//     const own = [parts.name, parts.id, parts.fcn, parts.rfcn, parts.label].join(" ");
//     const isPassish = /(pass(?:word)?|pwd)/i.test(own);
//     const isConfirmish = /(confirm|re[-\s]?type|re[-\s]?enter|password2)/i.test(own);

//     if (type === "password" || isPassish) {
//       const role = isConfirmish ? "password2" : "password";
//       return { role, score: 100, all: [{ role, score: 100, reasons: ["password-type/own-passish"] }], parts };
//     }
//     if (type === "email")
//       return { role: "email", score: 50, all: [{ role: "email", score: 50, reasons: ["type=email"] }], parts };
//     if (type === "tel")
//       return { role: "phone", score: 38, all: [{ role: "phone", score: 38, reasons: ["type=tel"] }], parts };

//     if (tag === "textarea") {
//       const bioish = /about|bio|background|interests|summary|profile|intro|story/.test(parts.ph);
//       const sDesc = scoreRole(parts, "description", POS.description);
//       const sAddr = scoreRole(parts, "address", POS.address);
//       const best = bioish && sDesc.score >= 6 ? { ...sDesc, score: sDesc.score + 6 } : (sAddr.score >= sDesc.score ? sAddr : sDesc);
//       return { role: best.role, score: best.score, all: [sDesc, sAddr], parts };
//     }

//     const candidates = [];
//     const push = (role, list) => candidates.push(scoreRole(parts, role, list));

//     push("firstname", POS.firstname);
//     push("lastname", POS.lastname);
//     push("fullname", POS.fullname);
//     push("username", POS.username);
//     push("busEmail", POS.busEmail);
//     push("email", POS.email);
//     push("email2", POS.email2);
//     push("password", POS.password);
//     push("password2", POS.password2);
//     push("phone", POS.phone);
//     push("address", POS.address);
//     push("city", POS.city);
//     push("state", POS.state);
//     push("postcode", POS.postcode);
//     push("country", POS.country);
//     push("location", POS.location);
//     push("website", POS.website);
//     push("facebook", POS.facebook);
//     push("instagram", POS.instagram);
//     push("twitter", POS.twitter);
//     push("linkedin", POS.linkedin);
//     push("youtube", POS.youtube);
//     push("title", POS.title);
//     push("company", POS.company);
//     push("description", POS.description);

//     candidates.sort((a, b) => b.score - a.score || ROLE_LIST.indexOf(a.role) - ROLE_LIST.indexOf(b.role));
//     let best = candidates[0], second = candidates[1];

//     // email vs username own-attribute tie-break
//     const ownStr = [parts.label, parts.name, parts.id, parts.ph, parts.aria, parts.title, parts.dvvas, parts.datalabel, parts.fcn, parts.rfcn]
//       .filter(Boolean).join(" ");
//     const hasEmailTokOwn = /\bemail\b|\bmail\b|\be-?mail\b/.test(ownStr);
//     const hasUserTokOwn =
//       /\b(user\s*name|username|login|userid)\b/.test(ownStr) ||
//       EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
//       EXACT_HINTS[parts.fcn] === "username" || EXACT_HINTS[parts.rfcn] === "username";
//     if (hasEmailTokOwn && hasUserTokOwn) {
//       const emailItem = candidates.find((c) => c.role === "email");
//       if (emailItem) return { role: "email", score: Math.max(emailItem.score, T_AUTO), all: candidates, parts };
//     }

//     if (second && best.score - second.score < GAP_MIN) return { role: null, score: 0, all: candidates, parts };

//     if (best.role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         EXACT_HINTS[parts.name] === "username" ||
//         EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" ||
//         parts.dvvas === "username" ||
//         EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username";
//       if (!(sig >= 2 || explicit)) return { role: null, score: 0, all: candidates, parts };
//     }

//     return { role: best.role, score: best.score, all: candidates, parts };
//   }

//   function prepareProfileValues(profile) {
//     const p = profile?.profile || profile || {};
//     const first = p.firstname || p.firstName || "";
//     const last = p.lastname || p.lastName || "";
//     const fullname = (p.fullname || p.fullName || `${first} ${last}`.trim()).trim();
//     const password = p.activePassword === "submissionPassword" ? (p.submissionPassword || "") : (p.emailPassword || p.password || "");
//     return {
//       firstname: first,
//       lastname: last,
//       fullname,
//       username: p.username || "",
//       email: p.email || p.submissionEmail || "",
//       busEmail: p.businessEmail || p.workEmail || "",
//       password,
//       phone: p.phone || p.number || p.phoneNumber || "",
//       website: p.website || "",
//       title: p.title || "",
//       company: p.company || fullname || "",
//       description: p.description || p.bio || "",
//       address: p.address || "",
//       city: p.city || "",
//       state: p.state || "",
//       postcode: p.postcode || p.zip || "",
//       country: p.country || "",
//       location: p.location || "",
//       facebook: p.facebook || "",
//       instagram: p.instagram || "",
//       twitter: p.twitter || p.x || "",
//       linkedin: p.linkedin || "",
//       youtube: p.youtube || "",
//     };
//   }

//   function fillTinyMCEFromTextarea(textareaEl, v) {
//     try {
//       const id = textareaEl.id || textareaEl.name;
//       if (!id) return false;
//       const tm = window.tinymce || window.tinyMCE;
//       if (tm?.get) {
//         const ed = tm.get(id);
//         if (ed) {
//           ed.setContent(v);
//           try { ed.fire("change"); } catch {}
//           textareaEl.value = v;
//           textareaEl.dataset.rowfiller = "filled";
//           DEBUG && log(`[rich] TinyMCE setContent id=${id}`);
//           return true;
//         }
//       }
//       const ifr =
//         document.getElementById(`${id}_ifr`) ||
//         textareaEl.closest(".wp-editor-wrap")?.querySelector('iframe[id$="_ifr"]');
//       if (ifr?.contentWindow?.document?.body) {
//         const body = ifr.contentDocument.body;
//         body.innerHTML = v;
//         try { body.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         textareaEl.value = v;
//         textareaEl.dataset.rowfiller = "filled";
//         DEBUG && log(`[rich] Iframe body filled id=${id}_ifr`);
//         return true;
//       }
//     } catch (e) { warn("fillTinyMCE error", e?.message || e); }
//     return false;
//   }

//   function fillNearestContentEditable(container, v) {
//     try {
//       const ce = container.querySelector('[contenteditable="true"], .mce-content-body, div[role="textbox"]');
//       if (ce) {
//         if (ce.innerHTML !== undefined) ce.innerHTML = v; else ce.innerText = v;
//         try { ce.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         ce.dataset && (ce.dataset.rowfiller = "filled");
//         DEBUG && log(`[rich] contenteditable filled`);
//         return true;
//       }
//     } catch {}
//     return false;
//   }

//   function firePacEvents(el) {
//     try { el.focus(); } catch {}
//     try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//     try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//     try { el.blur(); } catch {}
//   }

//   function toSocialURL(role, v) {
//     if (!v) return v;
//     let handle = String(v).trim();
//     if (looksLikeURL(handle)) return handle;
//     handle = handle.replace(/^@/, "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
//     if (!handle) return v;
//     switch (role) {
//       case "facebook": return `https://facebook.com/${handle}`;
//       case "instagram": return `https://instagram.com/${handle}`;
//       case "twitter": return `https://x.com/${handle}`;
//       case "linkedin": return /company|in\//.test(handle) ? `https://linkedin.com/${handle}` : `https://linkedin.com/in/${handle}`;
//       case "youtube": return /^@/.test(v) ? `https://youtube.com/${handle}` : `https://youtube.com/@${handle}`;
//       default: return v;
//     }
//   }

//   function tryFill(el, role, vals, force, parts, idx) {
//     if (!el) return { ok: false, why: "no-el" };

//     if (role === "description") {
//       if (el.isContentEditable && isVisible(el)) {
//         const v = vals.description; if (!v) return { ok: false, why: "no-value-for-description" };
//         try { document.execCommand?.("insertText", false, v); } catch { el.innerText = v; }
//         el.dataset.rowfiller = "filled";
//         DEBUG && log(`[fill] #${idx} description → contenteditable`);
//         return { ok: true };
//       }
//       const tag = (el.tagName || "").toLowerCase();
//       if (tag === "textarea") {
//         const style = (el.getAttribute("style") || "").toLowerCase();
//         const hiddenish = style.includes("display: none") || el.getAttribute("aria-hidden") === "true" || !isVisible(el);
//         if (hiddenish) {
//           const v = vals.description; if (!v) return { ok: false, why: "no-value-for-description" };
//           const ok = fillTinyMCEFromTextarea(el, v) || fillNearestContentEditable(el.closest(".wp-editor-wrap") || document, v);
//           return { ok, why: ok ? "" : "rich-editor-not-found" };
//         }
//       }
//     }

//     if (!isVisible(el)) return { ok: false, why: "not-visible" };
//     if (!force && alreadyFilled(el)) return { ok: false, why: "already-filled" };

//     let v = vals[role];
//     if ((role === "firstname" || role === "lastname") && !v && vals.fullname) {
//       const t = vals.fullname.trim().split(/\s+/).filter(Boolean);
//       if (t.length) {
//         if (role === "firstname") v = t[0];
//         if (role === "lastname") v = t.length > 1 ? t[t.length - 1] : "";
//       }
//     }
//     if (role === "fullname" && !v) v = [vals.firstname, vals.lastname].filter(Boolean).join(" ").trim();
//     if (!v && role === "busEmail" && vals.email) v = vals.email;

//     // mirror confirm roles
//     if (role === "password2") v = vals.password;
//     if (role === "email2") v = vals.email || vals.busEmail;

//     if (!v) return { ok: false, why: `no-value-for-${role}` };

//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();

//     if ((role === "email" || role === "busEmail" || role === "email2") && !looksLikeEmail(v)) return { ok: false, why: "value-not-email" };
//     if (role === "phone") {
//       if (!looksLikePhone(v)) return { ok: false, why: "value-not-phone" };
//       if (NEG.price.some((rx) => rx.test(parts.combined))) return { ok: false, why: "price-context" };
//     }
//     if (role === "website" && !looksLikeURL(v)) return { ok: false, why: "value-not-url" };
//     if (role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         /\b(user\s*name|username|login)\b/.test(parts.combined) ||
//         EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" || EXACT_HINTS[parts.fcn] === "username" || EXACT_HINTS[parts.rfcn] === "username";
//       if (!looksLikeUser(v)) return { ok: false, why: "value-not-username" };
//       if (["email", "password", "tel", "url", "number"].includes(type)) return { ok: false, why: "bad-input-type" };
//       if (!(sig >= 2 || explicit)) return { ok: false, why: "weak-username-signals" };
//       if (NEG.social.some((rx) => rx.test(parts.combined))) return { ok: false, why: "social-context" };
//       if (/\bemail\b|\bmail\b/.test(parts.combined)) return { ok: false, why: "email-preferred-here" };
//     }
//     if (role === "postcode") {
//       if (!looksLikeZip(v)) return { ok: false, why: "value-not-zip" };
//       if (/\d/.test(v) === false && v.length > 4) return { ok: false, why: "zip-no-digits" };
//     }
//     if (role === "address") {
//       const isAddr2 =
//         NEG.addressLine2.some((rx) => rx.test(parts.combined)) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.name) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.id);
//       if (isAddr2) return { ok: false, why: "addr2-context" };
//     }
//     if (role === "title" && /^name$/.test(parts.label)) return { ok: false, why: "label-name-title-guard" };
//     if (role === "fullname" && looksLikeEmail(v)) return { ok: false, why: "fullname-looks-like-email" };

//     if (["facebook","instagram","twitter","linkedin","youtube"].includes(role)) {
//       v = toSocialURL(role, v);
//       if (!looksLikeURL(v)) return { ok: false, why: "social-url-invalid" };
//     }

//     if (tag === "select") {
//       for (const opt of Array.from(el.options || [])) {
//         if (!opt) continue;
//         if (
//           (opt.value && String(opt.value).toLowerCase() === String(v).toLowerCase()) ||
//           (opt.text && String(opt.text).toLowerCase() === String(v).toLowerCase())
//         ) {
//           el.value = opt.value;
//           try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//           el.dataset.rowfiller = "filled";
//           DEBUG && log(`[fill] #${idx} select role=${role}`);
//           return { ok: true };
//         }
//       }
//       return { ok: false, why: "select-no-match" };
//     }

//     const isPac = isPacField(el, parts);
//     if (el.isContentEditable) {
//       try { document.execCommand("insertText", false, v); } catch { el.innerText = v; }
//       el.dataset.rowfiller = "filled";
//       DEBUG && log(`[fill] #${idx} contenteditable role=${role}`);
//       return { ok: true };
//     }
//     setNativeValue(el, v);
//     if (isPac) firePacEvents(el);
//     el.dataset.rowfiller = "filled";
//     DEBUG && log(`[fill] #${idx} input role=${role}${isPac ? " (PAC)" : ""}`);
//     return { ok: true };
//   }

//   function doFill(profile, force = false) {
//     try {
//       const vals = prepareProfileValues(profile);
//       const nodes = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"));
//       nodes.sort((a, b) => (a.getBoundingClientRect().top || 0) - (b.getBoundingClientRect().top || 0));

//       let filled = 0; const used = new Set(); let idx = 0;

//       DEBUG && log(`--- scan start (${nodes.length} fields) @ ${new Date().toISOString()} ---`);

//       for (const el of nodes) {
//         idx++;
//         const type = (el.type || "").toLowerCase();
//         if (["hidden","submit","button","reset","image","file","checkbox","radio"].includes(type) && el.tagName !== "TEXTAREA") continue;

//         let det = detectRoleAndScore(el);
//         const parts = det?.parts || ctx(el);

//         if (DEBUG) {
//           const baseRow = {
//             "#": idx, tag: el.tagName?.toLowerCase(), type, name: el.name || "", id: el.id || "",
//             ph: el.placeholder || "", label: parts.label, wrapper: parts.wrapperName, fcn: parts.fcn,
//             chosen: det?.role || null, score: det?.score || 0, min: force ? T_FORCE : T_AUTO,
//           };
//           log("[cand]", baseRow);
//           if (det?.all?.length) {
//             const map = {}; det.all.forEach((x) => (map[x.role] = x.score));
//             log("[scores]", map);
//             det.all.forEach((x) => x.reasons?.length && log(`[reasons] ${x.role}`, x.reasons));
//           }
//         }

//         if (!det || !det.role) { DEBUG && log(`[skip] #${idx} undecided/ambiguous`); continue; }
//         const min = force ? T_FORCE : T_AUTO;
//         if (det.score < min) { DEBUG && log(`[skip] #${idx} below-threshold score=${det.score} < ${min}`); continue; }

//         // single-fill roles (confirm fields not included)
//         const singleRoles = new Set([
//           "email","busEmail","password","firstname","lastname","fullname","phone","city","state","postcode","country",
//           "website","facebook","instagram","twitter","linkedin","youtube","title","company",
//         ]);
//         if (singleRoles.has(det.role) && used.has(det.role)) { DEBUG && log(`[skip] #${idx} duplicate-role ${det.role}`); continue; }

//         const res = tryFill(el, det.role, vals, force, parts, idx);
//         if (res.ok) {
//           filled++; used.add(det.role);
//           DEBUG && log(`[match] #${idx} role=${det.role} score=${det.score} thr=${min} name=${el.name || ""} id=${el.id || ""} label="${parts.label}" wrap="${parts.wrapperName}" fcn="${parts.fcn}"`);
//         } else {
//           DEBUG && log(`[skip] #${idx} role=${det.role} reason=${res.why}`);
//         }
//       }

//       // extra pass for description editors if missed
//       if (!used.has("description") && (vals.description || "").trim()) {
//         const tAreas = Array.from(document.querySelectorAll("textarea[id], textarea[name]"));
//         for (const ta of tAreas) {
//           const idn = (ta.id || ta.name || "").toLowerCase();
//           const lab = extractLabelText(ta).toLowerCase();
//           const looksDesc =
//             idn === "description" || /\bdescription\b/.test(lab) ||
//             ta.closest(".wp-editor-wrap")?.id?.toLowerCase()?.includes("description");
//           if (!looksDesc) continue;
//           if (fillTinyMCEFromTextarea(ta, vals.description) || fillNearestContentEditable(ta.closest(".wp-editor-wrap") || document, vals.description)) {
//             used.add("description"); filled++; DEBUG && log(`[rich-pass] description filled via editor`); break;
//           }
//         }
//       }

//       DEBUG && log(`--- scan done: filled=${filled} ---`);
//       return filled;
//     } catch (e) { warn("doFill error", e?.message || e); return 0; }
//   }

//   try {
//     chrome?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
//       if (!msg?.action) return;
//       if (["autofill","autofillProfile","autofillAuth","runFill"].includes(msg.action)) {
//         const go = async (profile) => {
//           const res = await safeGet(["autofillEnabled"]);
//           const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//           if (!enabled && !msg.force) { sendResponse({ ok: false, filled: 0, error: "disabled" }); return; }
//           const filled = doFill(profile, !!msg.force);
//           sendResponse({ ok: filled > 0, filled });
//         };
//         if (msg.profile) go(msg.profile);
//         else safeGet(["profile"]).then((r) => go(r?.profile || null));
//         return true;
//       }
//       if (msg.action === "toggleAutofill") { sendResponse({ ok: true }); return true; }
//     });
//   } catch {}

//   let autorunTimer = null;
//   const scheduleAutorun = (delay = 200) => {
//     if (autorunTimer) clearTimeout(autorunTimer);
//     autorunTimer = setTimeout(async () => {
//       const res = await safeGet(["autofillEnabled", "profile"]);
//       const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//       const profile = res?.profile;
//       if (!enabled || !profile) return;
//       try { doFill(profile, false); } catch (e) { warn("autorun error", e?.message || e); }
//     }, delay);
//   };

//   function autorun() { scheduleAutorun(60); scheduleAutorun(500); }
//   if (document.readyState === "complete" || document.readyState === "interactive") autorun();
//   else window.addEventListener("DOMContentLoaded", autorun, { once: true });

//   if (window.MutationObserver) {
//     const mo = new MutationObserver(() => scheduleAutorun(160));
//     try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
//   }

//   (function hookHistory() {
//     try {
//       const push = history.pushState; const rep = history.replaceState;
//       history.pushState = function () { try { push.apply(this, arguments); } finally { scheduleAutorun(160); } };
//       history.replaceState = function () { try { rep.apply(this, arguments); } finally { scheduleAutorun(160); } };
//       window.addEventListener("popstate", () => scheduleAutorun(160));
//     } catch {}
//   })();

//   document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleAutorun(120); });

//   log("HyperFill v6.9-pac+richdesc (alioup-hotfix + socials + confirm-email + site fixes) ready on", HOST);
// })();




















// /* content/fill.js — HyperFill v7.1 "otp+busEmail+quill" (premium fixes)
//  * Fixes:
//  * 1) W&B Create Account → Full name (data-test="name-input") now fills reliably.
//  * 2) Work/Business email → prefers businessEmail on "work/company/office" email fields
//  *    (e.g., GitBook data-testid=login.emailInput).
//  * 3) Notion → Verification code/OTP is NOT treated as password (no password autofill).
//  * 4) TidyCal → Booking page description (Quill) fills editor + hidden input.
//  * Plus: stronger label discovery for Tailwind wrappers & generic React blocks.
//  */

// (() => {
//   if (window.__HF_v71_installed) return;
//   window.__HF_v71_installed = true;

//   const DEBUG = true;
//   const log = (...a) => { try { console.debug("[HF]", ...a); } catch {} };
//   const warn = (...a) => { try { console.warn("[HF]", ...a); } catch {} };

//   const T_AUTO = 10, T_FORCE = 8, GAP_MIN = 2;
//   const PENALTY_SOCIAL = 18, PENALTY_EMAIL_NEAR = 18, PENALTY_PRICE = 10, PENALTY_ADDR2ZIP = 12, PENALTY_TITLENAME = 10;
//   const BLOCK_HOSTS = [/(^|\.)google\.com$/i, /(^|\.)accounts\.google\.com$/i];

//   const isVisible = (el) => {
//     try {
//       if (!el || el.disabled || el.hidden || el.readOnly) return false; // disabled/readonly treated as not-fillable
//       const s = window.getComputedStyle ? getComputedStyle(el) : null;
//       if (s && (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")) return false;
//       const r = el.getBoundingClientRect?.();
//       if (r && (r.width <= 1 || r.height <= 1)) return false;
//       const st = (el.getAttribute("style") || "").toLowerCase();
//       if (st.includes("left:-5000px") || st.includes("max-width:1px")) return false;
//       return true;
//     } catch { return false; }
//   };

//   const alreadyFilled = (el) => {
//     try {
//       if (el.isContentEditable) return !!el.innerText?.trim();
//       const v = el.value;
//       return v !== undefined && v !== null && String(v).trim().length > 0;
//     } catch { return false; }
//   };

//   function setNativeValue(el, value) {
//     try {
//       const p = Object.getPrototypeOf(el);
//       const d = Object.getOwnPropertyDescriptor(p, "value");
//       if (d && d.set) d.set.call(el, value);
//       else el.value = value;
//     } catch { try { el.value = value; } catch {} }
//     try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//     try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//   }

//   const HOST = location.hostname || "";
//   const isBlockedHost = () => BLOCK_HOSTS.some((rx) => rx.test(HOST));
//   if (isBlockedHost()) { DEBUG && log("blocked host → skip HyperFill on", HOST); return; }

//   const isExtAlive = () =>
//     typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id && !!chrome.storage?.local;

//   const safeGet = (keys) => new Promise((resolve) => {
//     if (!isExtAlive()) { resolve({}); return; }
//     try {
//       chrome.storage.local.get(keys, (res) => {
//         if (!isExtAlive() || chrome.runtime.lastError) {
//           if (chrome.runtime?.lastError) warn("storage.get lastError:", chrome.runtime.lastError.message);
//           resolve({}); return;
//         }
//         resolve(res || {});
//       });
//     } catch (e) { warn("safeGet caught:", e?.message || e); resolve({}); }
//   });

//   const rxEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   const looksLikeEmail = (v) => !!v && rxEmail.test(String(v).trim());
//   const looksLikePhone = (v) => !!v && (String(v).match(/\d/g) || []).length >= 10;
//   const looksLikeURL = (v) => !!v && (/^https?:\/\//i.test(v) || /\.[a-z]{2,}$/i.test(v));
//   const looksLikeUser = (v) => !!v && !v.includes("@") && !/\s/.test(v) && /^[A-Za-z0-9._-]{3,}$/.test(v);
//   const getText = (n) => (n?.textContent || "").trim();

//   // Broadened container detection (Tailwind/React scaffolds)
//   const CONTAINER_SEL =
//     [
//       ".form-group", ".form_row", ".form-fieldset", ".field", ".input-box", ".controls", ".input-wrapper",
//       ".field_wrap__Gv92k", ".register_main", ".register_item", ".register_title",
//       ".tw-style", "[data-testid='tailwind-wrapper']", ".sc-bYHUQc"
//     ].join(", ");

//   const TITLEISH_SEL =
//     ":scope > label, :scope > .register_title, :scope > .field_label, :scope > .control-label, :scope > .title, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > span, :scope > p, :scope > div";

//   function findScopedLabelText(el) {
//     try {
//       const id = el.id;
//       if (id) {
//         const cont = el.closest(CONTAINER_SEL) || el.parentElement;
//         if (cont) {
//           const within = cont.querySelector(`label[for="${CSS.escape(id)}"]`);
//           if (within?.innerText) return within.innerText.trim();
//         }
//         const global = document.querySelector(`label[for="${CSS.escape(id)}"]`);
//         if (global?.innerText) return global.innerText.trim();
//       }
//     } catch {}
//     return "";
//   }

//   function extractLabelText(el) {
//     try {
//       let txt = findScopedLabelText(el);
//       if (txt) return txt;

//       for (let p = el.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) {
//         if (p.tagName === "LABEL") return p.innerText.trim();
//       }

//       const prev = el.previousElementSibling;
//       if (prev && /^(LABEL|DIV|SPAN|P|H[1-6])$/.test(prev.tagName)) {
//         const t = getText(prev);
//         if (t) return t;
//       }
//       const next = el.nextElementSibling;
//       if (next && /label|field_label/i.test(next.className || "") && next.innerText) {
//         return next.innerText.trim();
//       }

//       const cont = el.closest(CONTAINER_SEL);
//       if (cont) {
//         const blocks = cont.querySelectorAll(TITLEISH_SEL);
//         for (const b of blocks) {
//           const t = (b.innerText || "").trim();
//           if (t && t.length <= 160 && !/^\s*$/.test(t)) return t;
//         }
//         const holder = el.closest(".register_item");
//         if (holder?.previousElementSibling?.classList.contains("register_title")) {
//           const t = holder.previousElementSibling.innerText?.trim();
//           if (t) return t;
//         }
//       }

//       const refId = el.getAttribute?.("aria-labelledby");
//       if (refId) {
//         const ref = document.getElementById(refId);
//         if (ref?.innerText) return ref.innerText.trim();
//       }
//       if (el.title) return el.title.trim();
//       return "";
//     } catch {
//       return "";
//     }
//   }

//   function ctx(el) {
//     const label = (extractLabelText(el) || "").toLowerCase();
//     const name = (el.name || "").toLowerCase();
//     const id = (el.id || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
//     const title = (el.getAttribute?.("title") || "").toLowerCase();
//     const dvvas = (el.getAttribute?.("data-vv-as") || "").toLowerCase();
//     const datalabel = (el.getAttribute?.("data-label") || "").toLowerCase();
//     const fcn = (el.getAttribute?.("formcontrolname") || "").toLowerCase();
//     const rfcn = (el.getAttribute?.("ng-reflect-form-control-name") || "").toLowerCase();

//     // NEW: dataset signals (React/Tailwind/Testing)
//     const datatest = (el.getAttribute?.("data-test") || "").toLowerCase();
//     const datatestid = (el.getAttribute?.("data-testid") || "").toLowerCase();
//     const dataname = (el.getAttribute?.("data-name") || "").toLowerCase();

//     // autocomplete / inputmode hints (OTP etc.)
//     const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
//     const im = (el.getAttribute?.("inputmode") || "").toLowerCase();

//     let around = "";
//     let wrapperName = "";
//     try {
//       const holder = el.closest(CONTAINER_SEL) || el.parentElement;
//       if (holder) {
//         const collectFrom = new Set([holder]);
//         if (holder.previousElementSibling) collectFrom.add(holder.previousElementSibling);
//         if (holder.parentElement) collectFrom.add(holder.parentElement);
//         for (const node of collectFrom) {
//           const blocks = node.querySelectorAll(TITLEISH_SEL);
//           for (const b of blocks) {
//             const t = (b.innerText || "").trim();
//             if (t && t.length < 160) around += " " + t.toLowerCase();
//           }
//         }
//         wrapperName = (holder.getAttribute?.("name") || "").toLowerCase();
//       }
//     } catch {}

//     const cls = (el.className || "").toLowerCase();
//     const combinedArr = [label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn, datatest, datatestid, dataname, ac, im, around, cls, wrapperName].filter(Boolean);
//     return {
//       label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn,
//       datatest, datatestid, dataname, ac, im,
//       around, cls, wrapperName, combined: combinedArr.join(" ")
//     };
//   }

//   const POS = {
//     firstname: [/\bfirst(?:[_\s-]?name)?\b/, /\bgiven\b/, /\bfname\b/],
//     lastname: [/\blast(?:[_\s-]?name)?\b/, /\bsurname\b/, /\blname\b/],
//     fullname: [/^name$|\bfull[_\s-]?name\b|\bdisplay[_\s-]?name\b|\breal[_\s-]?name\b|\bcompany[_\s-]?name\b/],
//     username: [/\busername\b|\buser[_\s-]?name\b|\blogin\b|\buserid\b/],
//     email: [/\bemail\b|\be-?mail\b|\bmail\b|\byouremail\b|\byour[_\s-]?email\b/],
//     email2: [/\bconfirm(?:\s*e-?mail|\s*email)?\b|\bre-?type\s*email\b|\bre-?enter\s*email\b|\brepeat\s*email\b/i],
//     busEmail: [/\b(?:business|work|company|office)[\s_-]*email\b/],
//     password: [/^password$|pass(?:word)?|pwd/],
//     password2: [/\bconfirm(?:\s*password)?\b|\bre-?type\b|\bre-?enter\b|\brepeat\b|\bpassword\s*again\b/i],
//     otp: [/\bverification\s*code\b|\bverify\s*code\b|\bone[-\s]?time\b|\b2fa\b|\bmfa\b|\botp\b/],
//     phone: [/\bphone\b|\bmobile\b|\btel\b|\bcontact\b|\bwhatsapp\b/],
//     address: [/\baddress\b|\bstreet\b|\baddr\b|\broad\b|\bhouse\b|\barea\b/],
//     city: [/\bcity\b|\btown\b/],
//     state: [/\bstate\b|\bprovince\b|\bregion\b/],
//     postcode: [/\bzip\b|\bpostal\b|\bpostcode\b|\bpin\b|\bzipcode\b|\bpost[_\s-]?code\b/],
//     country: [/\bcountry\b/],
//     location: [/\blocation\b|\bplace\b|\barea\b/],
//     website: [/\bwebsite\b|\bweb[_\s-]?url\b|\bhomepage\b|\bsite\b|\burl\b|\bportfolio\b/],
//     title: [/\btitle\b|\blisting\b|\bheadline\b/],
//     company: [/\bcompany\b|\borganization\b|\borg\b|\bbusiness\b|\bfirma\b/],
//     description: [/\bdescription\b|\babout\b|\bbio\b|\bsummary\b|\bdescriptions\b|\bprofile\b|\bintro\b|\bstory\b|\bbackground\b|\binterests\b/],
//     facebook: [/\bfacebook\b|\bfb\.com\b|\bfacebook\.com\b/],
//     instagram: [/\binstagram\b|\binsta\b|\binstagram\.com\b/],
//     twitter: [/\btwitter\b|\bx\.com\b|\btwitter\.com\b/],
//     linkedin: [/\blinked ?in\b|\blinkedin\.com\b/],
//     youtube: [/\byoutube\b|\byoutu\.be\b|\byoutube\.com\b/],
//   };

//   const NEG = {
//     social: [/\bfacebook\b|\binstagram\b|\btwitter\b|\bx\.com\b|\byoutube\b|\btiktok\b|\blinkedin\b/],
//     price: [/\bprice\b|\bamount\b|\brate\b|\bfee\b|\bcost\b|\bbudget\b/],
//     post: [/\bpost\s?code\b|\bpostal\b|\bzip\b/],
//     addressLine2: [/\baddress\s*line\s*2\b/i, /\baddress\s*line\s*3\b/i, /\baddress\s*2\b/i, /\baddr2\b/i, /\baddress2\b/i, /\bapt\b/i, /\bsuite\b/i, /\bunit\b/i],
//   };

//   const ROLE_LIST = [
//     "email","email2","busEmail","password","password2","otp","fullname","firstname","lastname","username",
//     "phone","address","city","state","postcode","country","location","website",
//     "facebook","instagram","twitter","linkedin","youtube","title","company","description",
//   ];

//   const EXACT_HINTS = {
//     email: "email", mail: "email", "e-mail": "email", user_email: "email",
//     username: "username", user: "username", login: "username", userid: "username",
//     name: "fullname", full_name: "fullname", fullname: "fullname",
//     bio: "description", about: "description", url: "website", website: "website", portfolio: "website",

//     // WordPress-ish
//     s_email: "email", s_name: "fullname", s_password: "password", s_password2: "password",
//     usernamer: "username", namer: "fullname", emailr: "email",
//     user_login: "username", user_email: "email", user_password: "password",

//     // Google PAC
//     "pac-input": "address",

//     // Contact/company
//     contactcompany: "company", contact_company: "company", companyname: "company",

//     // Angular
//     firstname: "firstname", lastname: "lastname", username_fcn: "username", phonenumber: "phone",
//     emailaddress: "email", password: "password", confirmpassword: "password2",

//     // Confirm Email aliases
//     email_confirm: "email2", confirmemail: "email2", emailconfirm: "email2", regdataemailconfirm: "email2", emailconfirmation: "email2",

//     // Socials
//     facebook: "facebook", instagram: "instagram", twitter: "twitter", x: "twitter", linkedin: "linkedin", youtube: "youtube",

//     // ScribbleHub
//     reg_username: "username",
//     reg_email: "email",
//     reg_password: "password",
//     reg_password_confirm: "password2",

//     // ZipLeaf
//     company_email: "busEmail",   // prefer business email for "company email"
//     company_phone: "phone",
//     company_website: "website",

//     // W&B Create Account
//     "name-input": "fullname",            // data-test
//     "website-input": "website",          // data-test
//     "username-input": "username",        // data-test

//     // GitBook login
//     "login.emailinput": "busEmail",      // data-testid (lowercased)
//   };

//   function isPacField(el) {
//     const id = (el.id || "").toLowerCase();
//     const cls = (el.className || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     return (
//       id === "pac-input" ||
//       cls.includes("pac-target-input") ||
//       cls.includes("google-writen-location") ||
//       /enter a location|search location|start typing address/i.test(ph)
//     );
//   }

//   function exactHintBoost(parts, role) {
//     let bonus = 0; const reasons = [];
//     const { name: n, id: i, wrapperName: w, fcn: f, rfcn: rf, datatest: dt, datatestid: dti, dataname: dn } = parts;
//     const add = (cond, amt, why) => { if (cond) { bonus += amt; reasons.push(`+${amt} ${why}`); } };
//     const anyEqual = (x) => EXACT_HINTS[x] === role;

//     if (anyEqual(n)) add(true, 26, `exact-hint name="${n}"`);
//     if (anyEqual(i)) add(true, 26, `exact-hint id="${i}"`);
//     if (anyEqual(w)) add(true, 26, `exact-hint wrapper="${w}"`);
//     if (anyEqual(f)) add(true, 26, `exact-hint fcn="${f}"`);
//     if (anyEqual(rf)) add(true, 18, `exact-hint rfcn="${rf}"`);
//     if (anyEqual(dt)) add(true, 28, `exact-hint data-test="${dt}"`);
//     if (anyEqual(dti)) add(true, 28, `exact-hint data-testid="${dti}"`);
//     if (anyEqual(dn)) add(true, 20, `exact-hint data-name="${dn}"`);

//     // Heuristics
//     if (role === "email") add(parts.ph.includes("email") || f === "emailaddress", 10, "email-ish");
//     if (role === "email2") add(/confirm|re[-\s]?type|re[-\s]?enter|repeat/.test(parts.label) || /email_confirm|confirmemail|emailconfirm/.test(n + i + f + rf), 20, "confirm-email");
//     if (role === "username") add(parts.ph.includes("username") || f === "username" || rf === "username", 10, "username-ish");
//     if (role === "phone") add(f === "phonenumber", 14, "fcn=phoneNumber");
//     if (role === "password2") add(/confirm|re[-\s]?type|re[-\s]?enter/.test(parts.label) || f === "confirmpassword", 18, "confirm-ish");
//     if (role === "company") add(/company/.test(parts.label), 16, "label company");

//     // NEW: Strong preference for Work/Business/Company email
//     if (role === "busEmail") {
//       const b = /(work|business|company|office)\s*email/;
//       const has = b.test(parts.label) || b.test(parts.ph) || b.test(parts.around) || b.test(parts.datatestid) || b.test(parts.datatest);
//       if (has) add(true, 30, "work/business/company email");
//       // if generic "email" tokens exist but also "work|business" nearby, tip scale
//       if (/\bemail\b/.test(parts.ph + " " + parts.label + " " + parts.around)) add(true, 8, "email token nearby");
//     }

//     // NEW: OTP / verification code hints
//     if (role === "otp") {
//       const otpish = parts.ac.includes("one-time-code") || POS.otp.some(rx => rx.test(parts.label + " " + parts.ph + " " + parts.around + " " + parts.name + " " + parts.id));
//       if (otpish) add(true, 40, "otp-ish");
//     }

//     return { bonus, reasons };
//   }

//   function scoreRole(parts, role, posList) {
//     let s = 0; const reasons = [];
//     const add = (hit, w, where, rx) => { if (hit) { s += w; reasons.push(`+${w} ${where} ~ ${rx}`); } };
//     for (const rx of posList) {
//       add(rx.test(parts.label), 10, "label", rx);
//       add(rx.test(parts.name), 7, "name", rx);
//       add(rx.test(parts.id), 7, "id", rx);
//       add(rx.test(parts.aria), 5, "aria", rx);
//       add(rx.test(parts.dvvas), 5, "data-vv-as", rx);
//       add(rx.test(parts.ph), 4, "ph", rx);
//       add(rx.test(parts.title), 2, "title", rx);
//       add(rx.test(parts.around), 2, "around", rx);
//       add(rx.test(parts.cls), 1, "class", rx);
//       add(rx.test(parts.wrapperName), 6, "wrapperName", rx);
//       add(rx.test(parts.fcn) || rx.test(parts.rfcn), 10, "fcn", rx);
//       // NEW: dataset aids
//       add(rx.test(parts.datatest), 9, "data-test", rx);
//       add(rx.test(parts.datatestid), 9, "data-testid", rx);
//       add(rx.test(parts.dataname), 6, "data-name", rx);
//     }
//     const ex = exactHintBoost(parts, role); s += ex.bonus; reasons.push(...ex.reasons);

//     if (parts.label === "name") {
//       if (role === "fullname") { s += 4; reasons.push("+4 fullname (label=name)"); }
//       else if (role === "firstname" || role === "lastname") { s -= 4; reasons.push("-4 split-name discouraged"); }
//     }
//     const penalize = (hit, amt, why) => { if (hit) { s -= amt; reasons.push(`-${amt} ${why}`); } };
//     if (role === "username") {
//       penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
//       penalize(/\bemail\b|\bmail\b/.test(parts.combined), PENALTY_EMAIL_NEAR, "email tokens present");
//     }
//     if (role === "phone") penalize(NEG.price.some((rx) => rx.test(parts.combined)), PENALTY_PRICE, "price context");
//     if (role === "address") penalize(NEG.post.concat(NEG.addressLine2).some((rx) => rx.test(parts.combined)), PENALTY_ADDR2ZIP, "postcode/addr2 context");
//     if (role === "website") {
//       penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
//       penalize(/username|handle/.test(parts.combined), 8, "username-ish");
//     }
//     if (role === "title" && /^name$/.test(parts.label)) penalize(true, PENALTY_TITLENAME, "avoid title when label=name");
//     return { role, score: s, reasons };
//   }

//   const usernameSignalRx = /\b(username|user[_\s-]?name|login|handle|userid)\b/;
//   function usernameSignals(parts, el) {
//     let n = 0;
//     if (usernameSignalRx.test(parts.label)) n++;
//     if (usernameSignalRx.test(parts.name)) n++;
//     if (usernameSignalRx.test(parts.id)) n++;
//     if (usernameSignalRx.test(parts.ph)) n++;
//     if (usernameSignalRx.test(parts.wrapperName)) n++;
//     if (usernameSignalRx.test(parts.fcn) || usernameSignalRx.test(parts.rfcn)) n++;
//     const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
//     if (ac.includes("username")) n++;
//     return n;
//   }

//   function detectRoleAndScore(el) {
//     const parts = ctx(el);
//     if (isPacField(el))
//       return { role: "address", score: 99, all: [{ role: "address", score: 99, reasons: ["PAC/Places field"] }], parts };
//     if (!isVisible(el)) return { role: null, score: 0, all: [], parts };

//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();

//     const own = [parts.name, parts.id, parts.fcn, parts.rfcn, parts.label, parts.datatest, parts.datatestid].join(" ");
//     const isPassish = /(pass(?:word)?|pwd)/i.test(own);
//     const isConfirmish = /(confirm|re[-\s]?type|re[-\s]?enter|password2)/i.test(own);

//     // OTP / Verification (avoid password misfire e.g., Notion "Verification code")
//     const otpTokens = POS.otp.some(rx => rx.test(parts.label + " " + parts.ph + " " + parts.around + " " + parts.name + " " + parts.id))
//       || parts.ac.includes("one-time-code");
//     if (otpTokens) {
//       const s = 80 + (parts.ac.includes("one-time-code") ? 20 : 0);
//       return { role: "otp", score: s, all: [{ role: "otp", score: s, reasons: ["otp/verification detected"] }], parts };
//     }

//     // Password: only if type=password OR clearly passwordish without OTP hints
//     if (type === "password" || (isPassish && !otpTokens)) {
//       const role = isConfirmish ? "password2" : "password";
//       return { role, score: 100, all: [{ role, score: 100, reasons: ["password-type/own-passish"] }], parts };
//     }

//     if (type === "email") {
//       // don't force 'email' early; allow busEmail to compete via scoring
//       // We'll seed a moderate prior for email
//     }

//     if (type === "tel")
//       return { role: "phone", score: 38, all: [{ role: "phone", score: 38, reasons: ["type=tel"] }], parts };

//     if (tag === "textarea") {
//       const bioish = /about|bio|background|interests|summary|profile|intro|story/.test(parts.ph);
//       const sDesc = scoreRole(parts, "description", POS.description);
//       const sAddr = scoreRole(parts, "address", POS.address);
//       const best = bioish && sDesc.score >= 6 ? { ...sDesc, score: sDesc.score + 6 } : (sAddr.score >= sDesc.score ? sAddr : sDesc);
//       return { role: best.role, score: best.score, all: [sDesc, sAddr], parts };
//     }

//     const candidates = [];
//     const push = (role, list) => candidates.push(scoreRole(parts, role, list));

//     push("firstname", POS.firstname);
//     push("lastname", POS.lastname);
//     push("fullname", POS.fullname);
//     push("username", POS.username);
//     push("busEmail", POS.busEmail);
//     push("email", POS.email);
//     push("email2", POS.email2);
//     push("password", POS.password);
//     push("password2", POS.password2);
//     push("otp", POS.otp);
//     push("phone", POS.phone);
//     push("address", POS.address);
//     push("city", POS.city);
//     push("state", POS.state);
//     push("postcode", POS.postcode);
//     push("country", POS.country);
//     push("location", POS.location);
//     push("website", POS.website);
//     push("facebook", POS.facebook);
//     push("instagram", POS.instagram);
//     push("twitter", POS.twitter);
//     push("linkedin", POS.linkedin);
//     push("youtube", POS.youtube);
//     push("title", POS.title);
//     push("company", POS.company);
//     push("description", POS.description);

//     // Seed generic priors
//     if (type === "email") {
//       const e = candidates.find(c => c.role === "email");
//       if (e) e.score += 16; // moderate prior (allows busEmail to beat it with work/business hints)
//     }

//     candidates.sort((a, b) => b.score - a.score || ROLE_LIST.indexOf(a.role) - ROLE_LIST.indexOf(b.role));
//     let best = candidates[0], second = candidates[1];

//     // email vs username tie-break
//     const ownStr = [parts.label, parts.name, parts.id, parts.ph, parts.aria, parts.title, parts.dvvas, parts.datalabel, parts.fcn, parts.rfcn, parts.datatest, parts.datatestid]
//       .filter(Boolean).join(" ");
//     const hasEmailTokOwn = /\bemail\b|\bmail\b|\be-?mail\b/.test(ownStr);
//     const hasUserTokOwn =
//       /\b(user\s*name|username|login|userid)\b/.test(ownStr) ||
//       EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
//       EXACT_HINTS[parts.fcn] === "username" || EXACT_HINTS[parts.rfcn] === "username" ||
//       EXACT_HINTS[parts.datatest] === "username" || EXACT_HINTS[parts.datatestid] === "username";
//     if (hasEmailTokOwn && hasUserTokOwn) {
//       const emailItem = candidates.find((c) => c.role === "email");
//       if (emailItem) return { role: "email", score: Math.max(emailItem.score, T_AUTO), all: candidates, parts };
//     }

//     if (second && best.score - second.score < GAP_MIN) return { role: null, score: 0, all: candidates, parts };

//     if (best.role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         EXACT_HINTS[parts.name] === "username" ||
//         EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" ||
//         parts.dvvas === "username" ||
//         EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username" ||
//         EXACT_HINTS[parts.datatest] === "username" ||
//         EXACT_HINTS[parts.datatestid] === "username";
//       if (!(sig >= 1 || explicit)) return { role: null, score: 0, all: candidates, parts };
//     }

//     return { role: best.role, score: best.score, all: candidates, parts };
//   }

//   function prepareProfileValues(profile) {
//     const p = profile?.profile || profile || {};
//     const first = p.firstname || p.firstName || "";
//     const last = p.lastname || p.lastName || "";
//     const fullname = (p.fullname || p.fullName || `${first} ${last}`.trim()).trim();
//     const password = p.activePassword === "submissionPassword" ? (p.submissionPassword || "") : (p.emailPassword || p.password || "");
//     return {
//       firstname: first,
//       lastname: last,
//       fullname,
//       username: p.username || "",
//       email: p.email || p.submissionEmail || "",
//       busEmail: p.businessEmail || p.workEmail || "",
//       password,
//       phone: p.phone || p.number || p.phoneNumber || "",
//       website: p.website || "",
//       title: p.title || "",
//       company: p.company || fullname || "",
//       description: p.description || p.bio || "",
//       address: p.address || "",
//       city: p.city || "",
//       state: p.state || "",
//       postcode: p.postcode || p.zip || "",
//       country: p.country || "",
//       location: p.location || "",
//       facebook: p.facebook || "",
//       instagram: p.instagram || "",
//       twitter: p.twitter || p.x || "",
//       linkedin: p.linkedin || "",
//       youtube: p.youtube || "",
//     };
//   }

//   function fillTinyMCEFromTextarea(textareaEl, v) {
//     try {
//       const id = textareaEl.id || textareaEl.name;
//       if (!id) return false;
//       const tm = window.tinymce || window.tinyMCE;
//       if (tm?.get) {
//         const ed = tm.get(id);
//         if (ed) {
//           ed.setContent(v);
//           try { ed.fire("change"); } catch {}
//           textareaEl.value = v;
//           textareaEl.dataset.rowfiller = "filled";
//           DEBUG && log(`[rich] TinyMCE setContent id=${id}`);
//           return true;
//         }
//       }
//       const ifr =
//         document.getElementById(`${id}_ifr`) ||
//         textareaEl.closest(".wp-editor-wrap")?.querySelector('iframe[id$="_ifr"]');
//       if (ifr?.contentWindow?.document?.body) {
//         const body = ifr.contentDocument.body;
//         body.innerHTML = v;
//         try { body.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         textareaEl.value = v;
//         textareaEl.dataset.rowfiller = "filled";
//         DEBUG && log(`[rich] Iframe body filled id=${id}_ifr`);
//         return true;
//       }
//     } catch (e) { warn("fillTinyMCE error", e?.message || e); }
//     return false;
//   }

//   function fillNearestContentEditable(container, v) {
//     try {
//       const ce = container.querySelector('[contenteditable="true"], .mce-content-body, div[role="textbox"], .ql-editor[contenteditable="true"]');
//       if (ce) {
//         if (ce.innerHTML !== undefined) ce.innerHTML = v; else ce.innerText = v;
//         try { ce.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         ce.dataset && (ce.dataset.rowfiller = "filled");
//         DEBUG && log(`[rich] contenteditable filled`);
//         return true;
//       }
//     } catch {}
//     return false;
//   }

//   function fillQuillByHidden(hiddenIdOrEl, v) {
//     try {
//       const hidden = typeof hiddenIdOrEl === "string" ? document.getElementById(hiddenIdOrEl) : hiddenIdOrEl;
//       if (!hidden) return false;
//       // common adjacent editor container
//       let editor = document.querySelector(`#quill_${hidden.id} .ql-editor, .ql-container .ql-editor`);
//       if (!editor) editor = hidden.closest(".ql-container")?.querySelector(".ql-editor");
//       if (!editor) {
//         // try sibling search
//         const wrap = hidden.parentElement?.querySelector(".ql-editor");
//         if (wrap) editor = wrap;
//       }
//       if (!editor) return false;
//       editor.innerHTML = v;
//       try { editor.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//       // persist also to hidden input if the site reads it on submit
//       hidden.value = v;
//       try { hidden.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//       try { hidden.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//       DEBUG && log(`[rich] Quill editor + hidden "${hidden.id}" filled`);
//       return true;
//     } catch (e) { warn("fillQuillByHidden error", e?.message || e); return false; }
//   }

//   function firePacEvents(el) {
//     try { el.focus(); } catch {}
//     try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//     try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//     try { el.blur(); } catch {}
//   }

//   function toSocialURL(role, v) {
//     if (!v) return v;
//     let handle = String(v).trim();
//     if (looksLikeURL(handle)) return handle;
//     handle = handle.replace(/^@/, "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
//     if (!handle) return v;
//     switch (role) {
//       case "facebook": return `https://facebook.com/${handle}`;
//       case "instagram": return `https://instagram.com/${handle}`;
//       case "twitter": return `https://x.com/${handle}`;
//       case "linkedin": return /company|in\//.test(handle) ? `https://linkedin.com/${handle}` : `https://linkedin.com/in/${handle}`;
//       case "youtube": return /^@/.test(v) ? `https://youtube.com/${handle}` : `https://youtube.com/@${handle}`;
//       default: return v;
//     }
//   }

//   function tryFill(el, role, vals, force, parts, idx) {
//     if (!el) return { ok: false, why: "no-el" };

//     // Rich editors first (description)
//     if (role === "description") {
//       if (el.isContentEditable && isVisible(el)) {
//         const v = vals.description; if (!v) return { ok: false, why: "no-value-for-description" };
//         try { document.execCommand?.("insertText", false, v); } catch { el.innerText = v; }
//         el.dataset.rowfiller = "filled";
//         DEBUG && log(`[fill] #${idx} description → contenteditable`);
//         return { ok: true };
//       }
//       const tag = (el.tagName || "").toLowerCase();
//       if (tag === "textarea") {
//         const style = (el.getAttribute("style") || "").toLowerCase();
//         const hiddenish = style.includes("display: none") || el.getAttribute("aria-hidden") === "true" || !isVisible(el);
//         if (hiddenish) {
//           const v = vals.description; if (!v) return { ok: false, why: "no-value-for-description" };
//           const ok = fillTinyMCEFromTextarea(el, v) || fillNearestContentEditable(el.closest(".wp-editor-wrap") || document, v);
//           return { ok, why: ok ? "" : "rich-editor-not-found" };
//         }
//       }
//     }

//     if (!isVisible(el)) return { ok: false, why: "not-visible" };
//     if (!force && alreadyFilled(el)) return { ok: false, why: "already-filled" };

//     // Skip OTP — we don't have codes
//     if (role === "otp") return { ok: false, why: "otp-skip" };

//     let v = vals[role];
//     if ((role === "firstname" || role === "lastname") && !v && vals.fullname) {
//       const t = vals.fullname.trim().split(/\s+/).filter(Boolean);
//       if (t.length) {
//         if (role === "firstname") v = t[0];
//         if (role === "lastname") v = t.length > 1 ? t[t.length - 1] : "";
//       }
//     }
//     if (role === "fullname" && !v) v = [vals.firstname, vals.lastname].filter(Boolean).join(" ").trim();
//     if (!v && role === "busEmail" && vals.email) v = vals.email;

//     // mirror confirm roles
//     if (role === "password2") v = vals.password;
//     if (role === "email2") v = vals.email || vals.busEmail;

//     if (!v) return { ok: false, why: `no-value-for-${role}` };

//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();

//     if ((role === "email" || role === "busEmail" || role === "email2") && !looksLikeEmail(v)) return { ok: false, why: "value-not-email" };
//     if (role === "phone") {
//       if (!looksLikePhone(v)) return { ok: false, why: "value-not-phone" };
//       if (NEG.price.some((rx) => rx.test(parts.combined))) return { ok: false, why: "price-context" };
//     }
//     if (role === "website" && !looksLikeURL(v)) return { ok: false, why: "value-not-url" };
//     if (role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         /\b(user\s*name|username|login)\b/.test(parts.combined) ||
//         EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" || EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username" || EXACT_HINTS[parts.datatest] === "username" || EXACT_HINTS[parts.datatestid] === "username";
//       if (!looksLikeUser(v)) return { ok: false, why: "value-not-username" };
//       if (["email", "password", "tel", "url", "number"].includes(type)) return { ok: false, why: "bad-input-type" };
//       if (!(sig >= 2 || explicit)) return { ok: false, why: "weak-username-signals" };
//       if (NEG.social.some((rx) => rx.test(parts.combined))) return { ok: false, why: "social-context" };
//       if (/\bemail\b|\bmail\b/.test(parts.combined)) return { ok: false, why: "email-preferred-here" };
//     }
//     if (role === "postcode") {
//       if (!looksLikeZip(v)) return { ok: false, why: "value-not-zip" };
//       if (/\d/.test(v) === false && v.length > 4) return { ok: false, why: "zip-no-digits" };
//     }
//     if (role === "address") {
//       const isAddr2 =
//         NEG.addressLine2.some((rx) => rx.test(parts.combined)) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.name) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.id);
//       if (isAddr2) return { ok: false, why: "addr2-context" };
//     }
//     if (role === "title" && /^name$/.test(parts.label)) return { ok: false, why: "label-name-title-guard" };
//     if (role === "fullname" && looksLikeEmail(v)) return { ok: false, why: "fullname-looks-like-email" };

//     if (["facebook","instagram","twitter","linkedin","youtube"].includes(role)) {
//       v = toSocialURL(role, v);
//       if (!looksLikeURL(v)) return { ok: false, why: "social-url-invalid" };
//     }

//     if (tag === "select") {
//       for (const opt of Array.from(el.options || [])) {
//         if (!opt) continue;
//         if (
//           (opt.value && String(opt.value).toLowerCase() === String(v).toLowerCase()) ||
//           (opt.text && String(opt.text).toLowerCase() === String(v).toLowerCase())
//         ) {
//           el.value = opt.value;
//           try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//           el.dataset.rowfiller = "filled";
//           DEBUG && log(`[fill] #${idx} select role=${role}`);
//           return { ok: true };
//         }
//       }
//       return { ok: false, why: "select-no-match" };
//     }

//     const isPac = isPacField(el);
//     if (el.isContentEditable) {
//       try { document.execCommand("insertText", false, v); } catch { el.innerText = v; }
//       el.dataset.rowfiller = "filled";
//       DEBUG && log(`[fill] #${idx} contenteditable role=${role}`);
//       return { ok: true };
//     }
//     setNativeValue(el, v);
//     if (isPac) firePacEvents(el);
//     el.dataset.rowfiller = "filled";
//     DEBUG && log(`[fill] #${idx} input role=${role}${isPac ? " (PAC)" : ""}`);
//     return { ok: true };
//   }

//   function doFill(profile, force = false) {
//     try {
//       const vals = prepareProfileValues(profile);
//       const nodes = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"));
//       nodes.sort((a, b) => (a.getBoundingClientRect().top || 0) - (b.getBoundingClientRect().top || 0));

//       let filled = 0; const used = new Set(); let idx = 0;

//       DEBUG && log(`--- scan start (${nodes.length} fields) @ ${new Date().toISOString()} ---`);

//       for (const el of nodes) {
//         idx++;
//         const type = (el.type || "").toLowerCase();
//         if (["hidden","submit","button","reset","image","file","checkbox","radio"].includes(type) && el.tagName !== "TEXTAREA") continue;

//         let det = detectRoleAndScore(el);
//         const parts = det?.parts || ctx(el);

//         if (DEBUG) {
//           const baseRow = {
//             "#": idx, tag: el.tagName?.toLowerCase(), type, name: el.name || "", id: el.id || "",
//             ph: el.placeholder || "", label: parts.label, wrapper: parts.wrapperName, fcn: parts.fcn,
//             dtest: parts.datatest, dtestid: parts.datatestid,
//             chosen: det?.role || null, score: det?.score || 0, min: force ? T_FORCE : T_AUTO,
//           };
//           log("[cand]", baseRow);
//           if (det?.all?.length) {
//             const map = {}; det.all.forEach((x) => (map[x.role] = x.score));
//             log("[scores]", map);
//             det.all.forEach((x) => x.reasons?.length && log(`[reasons] ${x.role}`, x.reasons));
//           }
//         }

//         if (!det || !det.role) { DEBUG && log(`[skip] #${idx} undecided/ambiguous`); continue; }
//         const min = force ? T_FORCE : T_AUTO;
//         if (det.score < min) { DEBUG && log(`[skip] #${idx} below-threshold score=${det.score} < ${min}`); continue; }

//         // single-fill roles (confirm fields not included; otp intentionally excluded)
//         const singleRoles = new Set([
//           "email","busEmail","password","firstname","lastname","fullname","phone","city","state","postcode","country",
//           "website","facebook","instagram","twitter","linkedin","youtube","title","company",
//         ]);
//         if (singleRoles.has(det.role) && used.has(det.role)) { DEBUG && log(`[skip] #${idx} duplicate-role ${det.role}`); continue; }

//         const res = tryFill(el, det.role, vals, force, parts, idx);
//         if (res.ok) {
//           filled++; used.add(det.role);
//           DEBUG && log(`[match] #${idx} role=${det.role} score=${det.score} thr=${min} name=${el.name || ""} id=${el.id || ""} label="${parts.label}" wrap="${parts.wrapperName}" fcn="${parts.fcn}" dtest="${parts.datatest}" dtestid="${parts.datatestid}"`);
//         } else {
//           DEBUG && log(`[skip] #${idx} role=${det.role} reason=${res.why}`);
//         }
//       }

//       // EXTRA PASS: Quill/TidyCal booking page description (hidden input + editor)
//       if ((vals.description || "").trim()) {
//         const hidden = document.getElementById("page_presentation");
//         const editor = document.querySelector("#quill_page_presentation .ql-editor, .ql-container .ql-editor");
//         if (hidden || editor) {
//           const ok = fillQuillByHidden(hidden || "page_presentation", vals.description);
//           if (ok) filled++, DEBUG && log("[rich-pass] Quill page_presentation filled");
//         }
//       }

//       // EXTRA PASS: description editors missed via textarea
//       if ((vals.description || "").trim()) {
//         const tAreas = Array.from(document.querySelectorAll("textarea[id], textarea[name]"));
//         for (const ta of tAreas) {
//           const idn = (ta.id || ta.name || "").toLowerCase();
//           const lab = extractLabelText(ta).toLowerCase();
//           const looksDesc =
//             idn === "description" || /\bdescription\b/.test(lab) ||
//             ta.closest(".wp-editor-wrap")?.id?.toLowerCase()?.includes("description");
//           if (!looksDesc) continue;
//           if (fillTinyMCEFromTextarea(ta, vals.description) || fillNearestContentEditable(ta.closest(".wp-editor-wrap") || document, vals.description)) {
//             filled++; DEBUG && log(`[rich-pass] description filled via editor (textarea link)`); break;
//           }
//         }
//       }

//       DEBUG && log(`--- scan done: filled=${filled} ---`);
//       return filled;
//     } catch (e) { warn("doFill error", e?.message || e); return 0; }
//   }

//   try {
//     chrome?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
//       if (!msg?.action) return;
//       if (["autofill","autofillProfile","autofillAuth","runFill"].includes(msg.action)) {
//         const go = async (profile) => {
//           const res = await safeGet(["autofillEnabled"]);
//           const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//           if (!enabled && !msg.force) { sendResponse({ ok: false, filled: 0, error: "disabled" }); return; }
//           const filled = doFill(profile, !!msg.force);
//           sendResponse({ ok: filled > 0, filled });
//         };
//         if (msg.profile) go(msg.profile);
//         else safeGet(["profile"]).then((r) => go(r?.profile || null));
//         return true;
//       }
//       if (msg.action === "toggleAutofill") { sendResponse({ ok: true }); return true; }
//     });
//   } catch {}

//   let autorunTimer = null;
//   const scheduleAutorun = (delay = 200) => {
//     if (autorunTimer) clearTimeout(autorunTimer);
//     autorunTimer = setTimeout(async () => {
//       const res = await safeGet(["autofillEnabled", "profile"]);
//       const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//       const profile = res?.profile;
//       if (!enabled || !profile) return;
//       try { doFill(profile, false); } catch (e) { warn("autorun error", e?.message || e); }
//     }, delay);
//   };

//   function autorun() { scheduleAutorun(60); scheduleAutorun(500); }
//   if (document.readyState === "complete" || document.readyState === "interactive") autorun();
//   else window.addEventListener("DOMContentLoaded", autorun, { once: true });

//   if (window.MutationObserver) {
//     const mo = new MutationObserver(() => scheduleAutorun(160));
//     try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
//   }

//   (function hookHistory() {
//     try {
//       const push = history.pushState; const rep = history.replaceState;
//       history.pushState = function () { try { push.apply(this, arguments); } finally { scheduleAutorun(160); } };
//       history.replaceState = function () { try { rep.apply(this, arguments); } finally { scheduleAutorun(160); } };
//       window.addEventListener("popstate", () => scheduleAutorun(160));
//     } catch {}
//   })();

//   document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleAutorun(120); });

//   log("HyperFill v7.1 (otp+busEmail+quill) ready on", HOST);
// })();










// /* content/fill.js — HyperFill v7.1.1 "richfix+uname" (site-agnostic patched)
//  * Patch summary:
//  * + Modern rich editors (Ricos, TipTap, ProseMirror, Froala, Quill, etc.) now detected & filled.
//  * + Username detection fully generalized: "username", "user_login", "login", etc. always work.
//  * + Exact hints and role signals improved; container/label logic made more flexible.
//  * + This fixes ALL your provided site cases and should handle similar sites too.
//  */

// (() => {
//   if (window.__HF_v71_installed) return;
//   window.__HF_v71_installed = true;

//   const DEBUG = true;
//   const log = (...a) => { try { console.debug("[HF]", ...a); } catch {} };
//   const warn = (...a) => { try { console.warn("[HF]", ...a); } catch {} };

//   const T_AUTO = 10, T_FORCE = 8, GAP_MIN = 2;
//   const PENALTY_SOCIAL = 18, PENALTY_EMAIL_NEAR = 18, PENALTY_PRICE = 10, PENALTY_ADDR2ZIP = 12, PENALTY_TITLENAME = 10;
//   const BLOCK_HOSTS = [/(^|\.)google\.com$/i, /(^|\.)accounts\.google\.com$/i];

//   const isVisible = (el) => {
//     try {
//       if (!el || el.disabled || el.hidden || el.readOnly) return false;
//       const s = window.getComputedStyle ? getComputedStyle(el) : null;
//       if (s && (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")) return false;
//       const r = el.getBoundingClientRect?.();
//       if (r && (r.width <= 1 || r.height <= 1)) return false;
//       const st = (el.getAttribute("style") || "").toLowerCase();
//       if (st.includes("left:-5000px") || st.includes("max-width:1px")) return false;
//       return true;
//     } catch { return false; }
//   };

//   const alreadyFilled = (el) => {
//     try {
//       if (el.isContentEditable) return !!el.innerText?.trim();
//       const v = el.value;
//       return v !== undefined && v !== null && String(v).trim().length > 0;
//     } catch { return false; }
//   };

//   function setNativeValue(el, value) {
//     try {
//       const p = Object.getPrototypeOf(el);
//       const d = Object.getOwnPropertyDescriptor(p, "value");
//       if (d && d.set) d.set.call(el, value);
//       else el.value = value;
//     } catch { try { el.value = value; } catch {} }
//     try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//     try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//   }

//   const HOST = location.hostname || "";
//   const isBlockedHost = () => BLOCK_HOSTS.some((rx) => rx.test(HOST));
//   if (isBlockedHost()) { DEBUG && log("blocked host → skip HyperFill on", HOST); return; }

//   const isExtAlive = () =>
//     typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id && !!chrome.storage?.local;

//   const safeGet = (keys) => new Promise((resolve) => {
//     if (!isExtAlive()) { resolve({}); return; }
//     try {
//       chrome.storage.local.get(keys, (res) => {
//         if (!isExtAlive() || chrome.runtime.lastError) {
//           if (chrome.runtime?.lastError) warn("storage.get lastError:", chrome.runtime.lastError.message);
//           resolve({}); return;
//         }
//         resolve(res || {});
//       });
//     } catch (e) { warn("safeGet caught:", e?.message || e); resolve({}); }
//   });

//   const rxEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   const looksLikeEmail = (v) => !!v && rxEmail.test(String(v).trim());
//   const looksLikePhone = (v) => !!v && (String(v).match(/\d/g) || []).length >= 10;
//   const looksLikeURL = (v) => !!v && (/^https?:\/\//i.test(v) || /\.[a-z]{2,}$/i.test(v));
//   const looksLikeUser = (v) => !!v && !v.includes("@") && !/\s/.test(v) && /^[A-Za-z0-9._-]{3,}$/.test(v);
//   const looksLikeZip = (v) => !!v && /^[A-Za-z0-9 \-]{3,10}$/.test(v);
//   const getText = (n) => (n?.textContent || "").trim();

//   const CONTAINER_SEL =
//     [
//       ".form-group", ".form_row", ".form-fieldset", ".field", ".input-box", ".controls", ".input-wrapper",
//       ".field_wrap__Gv92k", ".register_main", ".register_item", ".register_title",
//       ".tw-style", "[data-testid='tailwind-wrapper']", ".sc-bYHUQc"
//     ].join(", ");

//   const TITLEISH_SEL =
//     ":scope > label, :scope > .register_title, :scope > .field_label, :scope > .control-label, :scope > .title, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > span, :scope > p, :scope > div";

//   function findScopedLabelText(el) {
//     try {
//       const id = el.id;
//       if (id) {
//         const cont = el.closest(CONTAINER_SEL) || el.parentElement;
//         if (cont) {
//           const within = cont.querySelector(`label[for="${CSS.escape(id)}"]`);
//           if (within?.innerText) return within.innerText.trim();
//         }
//         const global = document.querySelector(`label[for="${CSS.escape(id)}"]`);
//         if (global?.innerText) return global.innerText.trim();
//       }
//     } catch {}
//     return "";
//   }

//   function extractLabelText(el) {
//     try {
//       let txt = findScopedLabelText(el);
//       if (txt) return txt;

//       for (let p = el.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) {
//         if (p.tagName === "LABEL") return p.innerText.trim();
//       }

//       const prev = el.previousElementSibling;
//       if (prev && /^(LABEL|DIV|SPAN|P|H[1-6])$/.test(prev.tagName)) {
//         const t = getText(prev);
//         if (t) return t;
//       }
//       const next = el.nextElementSibling;
//       if (next && /label|field_label/i.test(next.className || "") && next.innerText) {
//         return next.innerText.trim();
//       }

//       const cont = el.closest(CONTAINER_SEL);
//       if (cont) {
//         const blocks = cont.querySelectorAll(TITLEISH_SEL);
//         for (const b of blocks) {
//           const t = (b.innerText || "").trim();
//           if (t && t.length <= 160 && !/^\s*$/.test(t)) return t;
//         }
//         const holder = el.closest(".register_item");
//         if (holder?.previousElementSibling?.classList.contains("register_title")) {
//           const t = holder.previousElementSibling.innerText?.trim();
//           if (t) return t;
//         }
//       }

//       const refId = el.getAttribute?.("aria-labelledby");
//       if (refId) {
//         const ref = document.getElementById(refId);
//         if (ref?.innerText) return ref.innerText.trim();
//       }
//       if (el.title) return el.title.trim();
//       return "";
//     } catch {
//       return "";
//     }
//   }

//   function ctx(el) {
//     const label = (extractLabelText(el) || "").toLowerCase();
//     const name = (el.name || "").toLowerCase();
//     const id = (el.id || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
//     const title = (el.getAttribute?.("title") || "").toLowerCase();
//     const dvvas = (el.getAttribute?.("data-vv-as") || "").toLowerCase();
//     const datalabel = (el.getAttribute?.("data-label") || "").toLowerCase();
//     const fcn = (el.getAttribute?.("formcontrolname") || "").toLowerCase();
//     const rfcn = (el.getAttribute?.("ng-reflect-form-control-name") || "").toLowerCase();
//     const datatest = (el.getAttribute?.("data-test") || "").toLowerCase();
//     const datatestid = (el.getAttribute?.("data-testid") || "").toLowerCase();
//     const dataname = (el.getAttribute?.("data-name") || "").toLowerCase();
//     const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
//     const im = (el.getAttribute?.("inputmode") || "").toLowerCase();
//     let around = "";
//     let wrapperName = "";
//     try {
//       const holder = el.closest(CONTAINER_SEL) || el.parentElement;
//       if (holder) {
//         const collectFrom = new Set([holder]);
//         if (holder.previousElementSibling) collectFrom.add(holder.previousElementSibling);
//         if (holder.parentElement) collectFrom.add(holder.parentElement);
//         for (const node of collectFrom) {
//           const blocks = node.querySelectorAll(TITLEISH_SEL);
//           for (const b of blocks) {
//             const t = (b.innerText || "").trim();
//             if (t && t.length < 160) around += " " + t.toLowerCase();
//           }
//         }
//         wrapperName = (holder.getAttribute?.("name") || "").toLowerCase();
//       }
//     } catch {}
//     const cls = (el.className || "").toLowerCase();
//     const combinedArr = [label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn, datatest, datatestid, dataname, ac, im, around, cls, wrapperName].filter(Boolean);
//     return {
//       label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn,
//       datatest, datatestid, dataname, ac, im,
//       around, cls, wrapperName, combined: combinedArr.join(" ")
//     };
//   }

//   const POS = {
//     firstname: [/\bfirst(?:[_\s-]?name)?\b/, /\bgiven\b/, /\bfname\b/],
//     lastname: [/\blast(?:[_\s-]?name)?\b/, /\bsurname\b/, /\blname\b/],
//     fullname: [/^name$|\bfull[_\s-]?name\b|\bdisplay[_\s-]?name\b|\breal[_\s-]?name\b|\bcompany[_\s-]?name\b/],
//     username: [/\busername\b|\buser[_\s-]?name\b|\blogin\b|\buserid\b|\buser_login\b|\buname\b/],
//     email: [/\bemail\b|\be-?mail\b|\bmail\b|\byouremail\b|\byour[_\s-]?email\b/],
//     email2: [/\bconfirm(?:\s*e-?mail|\s*email)?\b|\bre-?type\s*email\b|\bre-?enter\s*email\b|\brepeat\s*email\b/i],
//     busEmail: [/\b(?:business|work|company|office)[\s_-]*email\b/],
//     password: [/^password$|pass(?:word)?|pwd/],
//     password2: [/\bconfirm(?:\s*password)?\b|\bre-?type\b|\bre-?enter\b|\brepeat\b|\bpassword\s*again\b/i],
//     otp: [/\bverification\s*code\b|\bverify\s*code\b|\bone[-\s]?time\b|\b2fa\b|\bmfa\b|\botp\b/],
//     phone: [/\bphone\b|\bmobile\b|\btel\b|\bcontact\b|\bwhatsapp\b/],
//     address: [/\baddress\b|\bstreet\b|\baddr\b|\broad\b|\bhouse\b|\barea\b/],
//     city: [/\bcity\b|\btown\b/],
//     state: [/\bstate\b|\bprovince\b|\bregion\b/],
//     postcode: [/\bzip\b|\bpostal\b|\bpostcode\b|\bpin\b|\bzipcode\b|\bpost[_\s-]?code\b/],
//     country: [/\bcountry\b/],
//     location: [/\blocation\b|\bplace\b|\barea\b/],
//     website: [/\bwebsite\b|\bweb[_\s-]?url\b|\bhomepage\b|\bsite\b|\burl\b|\bportfolio\b/],
//     title: [/\btitle\b|\blisting\b|\bheadline\b/],
//     company: [/\bcompany\b|\borganization\b|\borg\b|\bbusiness\b|\bfirma\b/],
//     description: [/\bdescription\b|\babout\b|\bbio\b|\bsummary\b|\bdescriptions\b|\bprofile\b|\bintro\b|\bstory\b|\bbackground\b|\binterests\b/],
//     facebook: [/\bfacebook\b|\bfb\.com\b|\bfacebook\.com\b/],
//     instagram: [/\binstagram\b|\binsta\b|\binstagram\.com\b/],
//     twitter: [/\btwitter\b|\bx\.com\b|\btwitter\.com\b/],
//     linkedin: [/\blinked ?in\b|\blinkedin\.com\b/],
//     youtube: [/\byoutube\b|\byoutu\.be\b|\byoutube\.com\b/],
//   };

//   const NEG = {
//     social: [/\bfacebook\b|\binstagram\b|\btwitter\b|\bx\.com\b|\byoutube\b|\btiktok\b|\blinkedin\b/],
//     price: [/\bprice\b|\bamount\b|\brate\b|\bfee\b|\bcost\b|\bbudget\b/],
//     post: [/\bpost\s?code\b|\bpostal\b|\bzip\b/],
//     addressLine2: [/\baddress\s*line\s*2\b/i, /\baddress\s*line\s*3\b/i, /\baddress\s*2\b/i, /\baddr2\b/i, /\baddress2\b/i, /\bapt\b/i, /\bsuite\b/i, /\bunit\b/i],
//   };

//   const ROLE_LIST = [
//     "email","email2","busEmail","password","password2","otp","fullname","firstname","lastname","username",
//     "phone","address","city","state","postcode","country","location","website",
//     "facebook","instagram","twitter","linkedin","youtube","title","company","description",
//   ];

//   // --- PATCHED V7.1.1: Exact hints updated for username etc.
//   const EXACT_HINTS = {
//     email: "email", mail: "email", "e-mail": "email", user_email: "email",
//     username: "username", user: "username", login: "username", userid: "username",
//     name: "fullname", full_name: "fullname", fullname: "fullname",
//     bio: "description", about: "description", url: "website", website: "website", portfolio: "website",
//     s_email: "email", s_name: "fullname", s_password: "password", s_password2: "password",
//     usernamer: "username", namer: "fullname", emailr: "email",
//     user_login: "username", uname: "username", user_name: "username",
//     contactcompany: "company", contact_company: "company", companyname: "company",
//     firstname: "firstname", lastname: "lastname", username_fcn: "username", phonenumber: "phone",
//     emailaddress: "email", password: "password", confirmpassword: "password2",
//     email_confirm: "email2", confirmemail: "email2", emailconfirm: "email2", regdataemailconfirm: "email2", emailconfirmation: "email2",
//     facebook: "facebook", instagram: "instagram", twitter: "twitter", x: "twitter", linkedin: "linkedin", youtube: "youtube",
//     reg_username: "username", reg_email: "email", reg_password: "password", reg_password_confirm: "password2",
//     company_email: "busEmail", company_phone: "phone", company_website: "website",
//     "name-input": "fullname", "website-input": "website", "username-input": "username",
//     "login.emailinput": "busEmail"
//   };

//   function isPacField(el) {
//     const id = (el.id || "").toLowerCase();
//     const cls = (el.className || "").toLowerCase();
//     const ph = (el.placeholder || "").toLowerCase();
//     return (
//       id === "pac-input" ||
//       cls.includes("pac-target-input") ||
//       cls.includes("google-writen-location") ||
//       /enter a location|search location|start typing address/i.test(ph)
//     );
//   }

//   function exactHintBoost(parts, role) {
//     let bonus = 0; const reasons = [];
//     const { name: n, id: i, wrapperName: w, fcn: f, rfcn: rf, datatest: dt, datatestid: dti, dataname: dn } = parts;
//     const add = (cond, amt, why) => { if (cond) { bonus += amt; reasons.push(`+${amt} ${why}`); } };
//     const anyEqual = (x) => EXACT_HINTS[x] === role;

//     if (anyEqual(n)) add(true, 26, `exact-hint name="${n}"`);
//     if (anyEqual(i)) add(true, 26, `exact-hint id="${i}"`);
//     if (anyEqual(w)) add(true, 26, `exact-hint wrapper="${w}"`);
//     if (anyEqual(f)) add(true, 26, `exact-hint fcn="${f}"`);
//     if (anyEqual(rf)) add(true, 18, `exact-hint rfcn="${rf}"`);
//     if (anyEqual(dt)) add(true, 28, `exact-hint data-test="${dt}"`);
//     if (anyEqual(dti)) add(true, 28, `exact-hint data-testid="${dti}"`);
//     if (anyEqual(dn)) add(true, 20, `exact-hint data-name="${dn}"`);
//     if (role === "email") add(parts.ph.includes("email") || f === "emailaddress", 10, "email-ish");
//     if (role === "email2") add(/confirm|re[-\s]?type|re[-\s]?enter|repeat/.test(parts.label) || /email_confirm|confirmemail|emailconfirm/.test(n + i + f + rf), 20, "confirm-email");
//     if (role === "username") add(parts.ph.includes("username") || f === "username" || rf === "username", 10, "username-ish");
//     if (role === "phone") add(f === "phonenumber", 14, "fcn=phoneNumber");
//     if (role === "password2") add(/confirm|re[-\s]?type|re[-\s]?enter/.test(parts.label) || f === "confirmpassword", 18, "confirm-ish");
//     if (role === "company") add(/company/.test(parts.label), 16, "label company");
//     if (role === "busEmail") {
//       const b = /(work|business|company|office)\s*email/;
//       const has = b.test(parts.label) || b.test(parts.ph) || b.test(parts.around) || b.test(parts.datatestid) || b.test(parts.datatest);
//       if (has) add(true, 30, "work/business/company email");
//       if (/\bemail\b/.test(parts.ph + " " + parts.label + " " + parts.around)) add(true, 8, "email token nearby");
//     }
//     if (role === "otp") {
//       const otpish = parts.ac.includes("one-time-code") || POS.otp.some(rx => rx.test(parts.label + " " + parts.ph + " " + parts.around + " " + parts.name + " " + parts.id));
//       if (otpish) add(true, 40, "otp-ish");
//     }
//     return { bonus, reasons };
//   }

//   function scoreRole(parts, role, posList) {
//     let s = 0; const reasons = [];
//     const add = (hit, w, where, rx) => { if (hit) { s += w; reasons.push(`+${w} ${where} ~ ${rx}`); } };
//     for (const rx of posList) {
//       add(rx.test(parts.label), 10, "label", rx);
//       add(rx.test(parts.name), 7, "name", rx);
//       add(rx.test(parts.id), 7, "id", rx);
//       add(rx.test(parts.aria), 5, "aria", rx);
//       add(rx.test(parts.dvvas), 5, "data-vv-as", rx);
//       add(rx.test(parts.ph), 4, "ph", rx);
//       add(rx.test(parts.title), 2, "title", rx);
//       add(rx.test(parts.around), 2, "around", rx);
//       add(rx.test(parts.cls), 1, "class", rx);
//       add(rx.test(parts.wrapperName), 6, "wrapperName", rx);
//       add(rx.test(parts.fcn) || rx.test(parts.rfcn), 10, "fcn", rx);
//       add(rx.test(parts.datatest), 9, "data-test", rx);
//       add(rx.test(parts.datatestid), 9, "data-testid", rx);
//       add(rx.test(parts.dataname), 6, "data-name", rx);
//     }
//     const ex = exactHintBoost(parts, role); s += ex.bonus; reasons.push(...ex.reasons);

//     if (parts.label === "name") {
//       if (role === "fullname") { s += 4; reasons.push("+4 fullname (label=name)"); }
//       else if (role === "firstname" || role === "lastname") { s -= 4; reasons.push("-4 split-name discouraged"); }
//     }
//     const penalize = (hit, amt, why) => { if (hit) { s -= amt; reasons.push(`-${amt} ${why}`); } };
//     if (role === "username") {
//       penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
//       penalize(/\bemail\b|\bmail\b/.test(parts.combined), PENALTY_EMAIL_NEAR, "email tokens present");
//     }
//     if (role === "phone") penalize(NEG.price.some((rx) => rx.test(parts.combined)), PENALTY_PRICE, "price context");
//     if (role === "address") penalize(NEG.post.concat(NEG.addressLine2).some((rx) => rx.test(parts.combined)), PENALTY_ADDR2ZIP, "postcode/addr2 context");
//     if (role === "website") {
//       penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
//       penalize(/username|handle/.test(parts.combined), 8, "username-ish");
//     }
//     if (role === "title" && /^name$/.test(parts.label)) penalize(true, PENALTY_TITLENAME, "avoid title when label=name");
//     return { role, score: s, reasons };
//   }

//   // --- PATCHED V7.1.1: Username signals (much looser and more universal)
//   function usernameSignals(parts, el) {
//     let n = 0;
//     if (/\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.label)) n++;
//     if (/\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.name)) n++;
//     if (/\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.id)) n++;
//     if (/\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.ph)) n++;
//     if (/\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.wrapperName)) n++;
//     if (/\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.fcn) || /\b(username|user[_\s-]?name|login|userid|uname|user_login)\b/.test(parts.rfcn)) n++;
//     const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
//     if (ac.includes("username")) n++;
//     return n;
//   }

//   function detectRoleAndScore(el) {
//     const parts = ctx(el);
//     if (isPacField(el))
//       return { role: "address", score: 99, all: [{ role: "address", score: 99, reasons: ["PAC/Places field"] }], parts };
//     if (!isVisible(el)) return { role: null, score: 0, all: [], parts };
//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();
//     const own = [parts.name, parts.id, parts.fcn, parts.rfcn, parts.label, parts.datatest, parts.datatestid].join(" ");
//     const isPassish = /(pass(?:word)?|pwd)/i.test(own);
//     const isConfirmish = /(confirm|re[-\s]?type|re[-\s]?enter|password2)/i.test(own);
//     const otpTokens = POS.otp.some(rx => rx.test(parts.label + " " + parts.ph + " " + parts.around + " " + parts.name + " " + parts.id))
//       || parts.ac.includes("one-time-code");
//     if (otpTokens) {
//       const s = 80 + (parts.ac.includes("one-time-code") ? 20 : 0);
//       return { role: "otp", score: s, all: [{ role: "otp", score: s, reasons: ["otp/verification detected"] }], parts };
//     }
//     if (type === "password" || (isPassish && !otpTokens)) {
//       const role = isConfirmish ? "password2" : "password";
//       return { role, score: 100, all: [{ role, score: 100, reasons: ["password-type/own-passish"] }], parts };
//     }
//     const candidates = [];
//     const push = (role, list) => candidates.push(scoreRole(parts, role, list));
//     push("firstname", POS.firstname);
//     push("lastname", POS.lastname);
//     push("fullname", POS.fullname);
//     push("username", POS.username);
//     push("busEmail", POS.busEmail);
//     push("email", POS.email);
//     push("email2", POS.email2);
//     push("password", POS.password);
//     push("password2", POS.password2);
//     push("otp", POS.otp);
//     push("phone", POS.phone);
//     push("address", POS.address);
//     push("city", POS.city);
//     push("state", POS.state);
//     push("postcode", POS.postcode);
//     push("country", POS.country);
//     push("location", POS.location);
//     push("website", POS.website);
//     push("facebook", POS.facebook);
//     push("instagram", POS.instagram);
//     push("twitter", POS.twitter);
//     push("linkedin", POS.linkedin);
//     push("youtube", POS.youtube);
//     push("title", POS.title);
//     push("company", POS.company);
//     push("description", POS.description);
//     if (type === "email") {
//       const e = candidates.find(c => c.role === "email");
//       if (e) e.score += 16;
//     }
//     candidates.sort((a, b) => b.score - a.score || ROLE_LIST.indexOf(a.role) - ROLE_LIST.indexOf(b.role));
//     let best = candidates[0], second = candidates[1];
//     const ownStr = [parts.label, parts.name, parts.id, parts.ph, parts.aria, parts.title, parts.dvvas, parts.datalabel, parts.fcn, parts.rfcn, parts.datatest, parts.datatestid]
//       .filter(Boolean).join(" ");
//     const hasEmailTokOwn = /\bemail\b|\bmail\b|\be-?mail\b/.test(ownStr);
//     const hasUserTokOwn =
//       /\b(user\s*name|username|login|userid|user_login|uname)\b/.test(ownStr) ||
//       EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
//       EXACT_HINTS[parts.fcn] === "username" || EXACT_HINTS[parts.rfcn] === "username" ||
//       EXACT_HINTS[parts.datatest] === "username" || EXACT_HINTS[parts.datatestid] === "username";
//     if (hasEmailTokOwn && hasUserTokOwn) {
//       const emailItem = candidates.find((c) => c.role === "email");
//       if (emailItem) return { role: "email", score: Math.max(emailItem.score, T_AUTO), all: candidates, parts };
//     }
//     if (second && best.score - second.score < GAP_MIN) return { role: null, score: 0, all: candidates, parts };
//     if (best.role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         EXACT_HINTS[parts.name] === "username" ||
//         EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" ||
//         parts.dvvas === "username" ||
//         EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username" ||
//         EXACT_HINTS[parts.datatest] === "username" ||
//         EXACT_HINTS[parts.datatestid] === "username";
//       if (!(sig >= 1 || explicit)) return { role: null, score: 0, all: candidates, parts };
//     }
//     return { role: best.role, score: best.score, all: candidates, parts };
//   }

//   function prepareProfileValues(profile) {
//     const p = profile?.profile || profile || {};
//     const first = p.firstname || p.firstName || "";
//     const last = p.lastname || p.lastName || "";
//     const fullname = (p.fullname || p.fullName || `${first} ${last}`.trim()).trim();
//     const password = p.activePassword === "submissionPassword" ? (p.submissionPassword || "") : (p.emailPassword || p.password || "");
//     return {
//       firstname: first,
//       lastname: last,
//       fullname,
//       username: p.username || "",
//       email: p.email || p.submissionEmail || "",
//       busEmail: p.businessEmail || p.workEmail || "",
//       password,
//       phone: p.phone || p.number || p.phoneNumber || "",
//       website: p.website || "",
//       title: p.title || "",
//       company: p.company || fullname || "",
//       description: p.description || p.bio || "",
//       address: p.address || "",
//       city: p.city || "",
//       state: p.state || "",
//       postcode: p.postcode || p.zip || "",
//       country: p.country || "",
//       location: p.location || "",
//       facebook: p.facebook || "",
//       instagram: p.instagram || "",
//       twitter: p.twitter || p.x || "",
//       linkedin: p.linkedin || "",
//       youtube: p.youtube || "",
//     };
//   }

//   function fillTinyMCEFromTextarea(textareaEl, v) {
//     try {
//       const id = textareaEl.id || textareaEl.name;
//       if (!id) return false;
//       const tm = window.tinymce || window.tinyMCE;
//       if (tm?.get) {
//         const ed = tm.get(id);
//         if (ed) {
//           ed.setContent(v);
//           try { ed.fire("change"); } catch {}
//           textareaEl.value = v;
//           textareaEl.dataset.rowfiller = "filled";
//           DEBUG && log(`[rich] TinyMCE setContent id=${id}`);
//           return true;
//         }
//       }
//       const ifr =
//         document.getElementById(`${id}_ifr`) ||
//         textareaEl.closest(".wp-editor-wrap")?.querySelector('iframe[id$="_ifr"]');
//       if (ifr?.contentWindow?.document?.body) {
//         const body = ifr.contentDocument.body;
//         body.innerHTML = v;
//         try { body.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         textareaEl.value = v;
//         textareaEl.dataset.rowfiller = "filled";
//         DEBUG && log(`[rich] Iframe body filled id=${id}_ifr`);
//         return true;
//       }
//     } catch (e) { warn("fillTinyMCE error", e?.message || e); }
//     return false;
//   }

//   // --- PATCHED V7.1.1: Robust rich editor selectors
//   const RICH_EDITOR_SEL =
//     [
//       '[contenteditable="true"][role="textbox"]',
//       '.ql-editor[contenteditable="true"]',
//       '.quill .ql-editor',
//       '.tiptap.ProseMirror[contenteditable="true"]',
//       '.ProseMirror[contenteditable="true"]',
//       '.ricos-tiptap-editor [contenteditable="true"]',
//       '.ricos-editor [contenteditable="true"]',
//       '.fr-view[contenteditable="true"]',
//       '.fr-element[contenteditable="true"]',
//       '[data-hook*="editor"] [contenteditable="true"]'
//     ].join(', ');

//   function fillRichEditor(root, v) {
//     try {
//       const base = root || document;
//       let ce = Array.from(base.querySelectorAll(RICH_EDITOR_SEL)).find(isVisible);
//       if (!ce && base !== document) {
//         ce = Array.from(document.querySelectorAll(RICH_EDITOR_SEL)).find(isVisible);
//       }
//       if (ce) {
//         if (ce.innerHTML !== undefined) ce.innerHTML = v;
//         else ce.innerText = v;
//         try { ce.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         ce.dataset && (ce.dataset.rowfiller = "filled");
//         DEBUG && log(`[rich] contenteditable filled`);
//         return true;
//       }
//     } catch {}
//     return false;
//   }

//   function fillNearestContentEditable(container, v) {
//     try {
//       const ce = container.querySelector('[contenteditable="true"], .mce-content-body, div[role="textbox"], .ql-editor[contenteditable="true"]');
//       if (ce) {
//         if (ce.innerHTML !== undefined) ce.innerHTML = v; else ce.innerText = v;
//         try { ce.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//         ce.dataset && (ce.dataset.rowfiller = "filled");
//         DEBUG && log(`[rich] contenteditable filled`);
//         return true;
//       }
//     } catch {}
//     return false;
//   }

//   function fillQuillByHidden(hiddenIdOrEl, v) {
//     try {
//       const hidden = typeof hiddenIdOrEl === "string" ? document.getElementById(hiddenIdOrEl) : hiddenIdOrEl;
//       if (!hidden) return false;
//       let editor = document.querySelector(`#quill_${hidden.id} .ql-editor, .ql-container .ql-editor`);
//       if (!editor) editor = hidden.closest(".ql-container")?.querySelector(".ql-editor");
//       if (!editor) {
//         const wrap = hidden.parentElement?.querySelector(".ql-editor");
//         if (wrap) editor = wrap;
//       }
//       if (!editor) return false;
//       editor.innerHTML = v;
//       try { editor.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//       hidden.value = v;
//       try { hidden.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//       try { hidden.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//       DEBUG && log(`[rich] Quill editor + hidden "${hidden.id}" filled`);
//       return true;
//     } catch (e) { warn("fillQuillByHidden error", e?.message || e); return false; }
//   }

//   function firePacEvents(el) {
//     try { el.focus(); } catch {}
//     try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
//     try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//     try { el.blur(); } catch {}
//   }

//   function toSocialURL(role, v) {
//     if (!v) return v;
//     let handle = String(v).trim();
//     if (looksLikeURL(handle)) return handle;
//     handle = handle.replace(/^@/, "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
//     if (!handle) return v;
//     switch (role) {
//       case "facebook": return `https://facebook.com/${handle}`;
//       case "instagram": return `https://instagram.com/${handle}`;
//       case "twitter": return `https://x.com/${handle}`;
//       case "linkedin": return /company|in\//.test(handle) ? `https://linkedin.com/${handle}` : `https://linkedin.com/in/${handle}`;
//       case "youtube": return /^@/.test(v) ? `https://youtube.com/${handle}` : `https://youtube.com/@${handle}`;
//       default: return v;
//     }
//   }

//   // --- PATCHED V7.1.1: Rich editors + username patch in tryFill
//   function tryFill(el, role, vals, force, parts, idx) {
//     if (!el) return { ok: false, why: "no-el" };
//     // Rich editors for description/about/bio/story
//     if (role === "description" || role === "bio" || role === "about") {
//       const v = vals.description; if (!v) return { ok: false, why: "no-value-for-description" };
//       if (el.isContentEditable && isVisible(el)) {
//         try { document.execCommand?.("insertText", false, v); } catch { el.innerText = v; }
//         el.dataset.rowfiller = "filled";
//         DEBUG && log(`[fill] #${idx} description → contenteditable`);
//         return { ok: true };
//       }
//       if (fillRichEditor(el.parentElement || document, v)) {
//         return { ok: true };
//       }
//       const tag = (el.tagName || "").toLowerCase();
//       if (tag === "textarea") {
//         const style = (el.getAttribute("style") || "").toLowerCase();
//         const hiddenish = style.includes("display: none") || el.getAttribute("aria-hidden") === "true" || !isVisible(el);
//         if (hiddenish) {
//           const ok = fillTinyMCEFromTextarea(el, v) || fillRichEditor(document, v);
//           return { ok, why: ok ? "" : "rich-editor-not-found" };
//         }
//       }
//     }
//     if (!isVisible(el)) return { ok: false, why: "not-visible" };
//     if (!force && alreadyFilled(el)) return { ok: false, why: "already-filled" };
//     if (role === "otp") return { ok: false, why: "otp-skip" };
//     let v = vals[role];
//     if ((role === "firstname" || role === "lastname") && !v && vals.fullname) {
//       const t = vals.fullname.trim().split(/\s+/).filter(Boolean);
//       if (t.length) {
//         if (role === "firstname") v = t[0];
//         if (role === "lastname") v = t.length > 1 ? t[t.length - 1] : "";
//       }
//     }
//     if (role === "fullname" && !v) v = [vals.firstname, vals.lastname].filter(Boolean).join(" ").trim();
//     if (!v && role === "busEmail" && vals.email) v = vals.email;
//     if (role === "password2") v = vals.password;
//     if (role === "email2") v = vals.email || vals.busEmail;
//     if (!v) return { ok: false, why: `no-value-for-${role}` };
//     const tag = (el.tagName || "").toLowerCase();
//     const type = (el.type || "").toLowerCase();
//     if ((role === "email" || role === "busEmail" || role === "email2") && !looksLikeEmail(v)) return { ok: false, why: "value-not-email" };
//     if (role === "phone") {
//       if (!looksLikePhone(v)) return { ok: false, why: "value-not-phone" };
//       if (NEG.price.some((rx) => rx.test(parts.combined))) return { ok: false, why: "price-context" };
//     }
//     if (role === "website" && !looksLikeURL(v)) return { ok: false, why: "value-not-url" };
//     if (role === "username") {
//       const sig = usernameSignals(parts, el);
//       const explicit =
//         /\b(user\s*name|username|login|userid|user_login|uname)\b/.test(parts.combined) ||
//         EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
//         EXACT_HINTS[parts.wrapperName] === "username" || EXACT_HINTS[parts.fcn] === "username" ||
//         EXACT_HINTS[parts.rfcn] === "username" || EXACT_HINTS[parts.datatest] === "username" || EXACT_HINTS[parts.datatestid] === "username";
//       if (!looksLikeUser(v)) return { ok: false, why: "value-not-username" };
//       if (["email", "password", "tel", "url", "number"].includes(type)) return { ok: false, why: "bad-input-type" };
//       if (!(sig >= 1 || explicit)) return { ok: false, why: "weak-username-signals" };
//       if (NEG.social.some((rx) => rx.test(parts.combined))) return { ok: false, why: "social-context" };
//       if (/\bemail\b|\bmail\b/.test(parts.combined)) return { ok: false, why: "email-preferred-here" };
//     }
//     if (role === "postcode") {
//       if (!looksLikeZip(v)) return { ok: false, why: "value-not-zip" };
//       if (/\d/.test(v) === false && v.length > 4) return { ok: false, why: "zip-no-digits" };
//     }
//     if (role === "address") {
//       const isAddr2 =
//         NEG.addressLine2.some((rx) => rx.test(parts.combined)) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.name) ||
//         /(^|[^a-z])address2([^a-z]|$)/i.test(parts.id);
//       if (isAddr2) return { ok: false, why: "addr2-context" };
//     }
//     if (role === "title" && /^name$/.test(parts.label)) return { ok: false, why: "label-name-title-guard" };
//     if (role === "fullname" && looksLikeEmail(v)) return { ok: false, why: "fullname-looks-like-email" };
//     if (["facebook","instagram","twitter","linkedin","youtube"].includes(role)) {
//       v = toSocialURL(role, v);
//       if (!looksLikeURL(v)) return { ok: false, why: "social-url-invalid" };
//     }
//     if (tag === "select") {
//       for (const opt of Array.from(el.options || [])) {
//         if (!opt) continue;
//         if (
//           (opt.value && String(opt.value).toLowerCase() === String(v).toLowerCase()) ||
//           (opt.text && String(opt.text).toLowerCase() === String(v).toLowerCase())
//         ) {
//           el.value = opt.value;
//           try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
//           el.dataset.rowfiller = "filled";
//           DEBUG && log(`[fill] #${idx} select role=${role}`);
//           return { ok: true };
//         }
//       }
//       return { ok: false, why: "select-no-match" };
//     }
//     const isPac = isPacField(el);
//     if (el.isContentEditable) {
//       try { document.execCommand("insertText", false, v); } catch { el.innerText = v; }
//       el.dataset.rowfiller = "filled";
//       DEBUG && log(`[fill] #${idx} contenteditable role=${role}`);
//       return { ok: true };
//     }
//     setNativeValue(el, v);
//     if (isPac) firePacEvents(el);
//     el.dataset.rowfiller = "filled";
//     DEBUG && log(`[fill] #${idx} input role=${role}${isPac ? " (PAC)" : ""}`);
//     return { ok: true };
//   }

//   // --- PATCHED V7.1.1: Fallback to global rich editor for description
//   function doFill(profile, force = false) {
//     try {
//       const vals = prepareProfileValues(profile);
//       const nodes = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"));
//       nodes.sort((a, b) => (a.getBoundingClientRect().top || 0) - (b.getBoundingClientRect().top || 0));
//       let filled = 0; const used = new Set(); let idx = 0;
//       DEBUG && log(`--- scan start (${nodes.length} fields) @ ${new Date().toISOString()} ---`);
//       for (const el of nodes) {
//         idx++;
//         const type = (el.type || "").toLowerCase();
//         if (["hidden","submit","button","reset","image","file","checkbox","radio"].includes(type) && el.tagName !== "TEXTAREA") continue;
//         let det = detectRoleAndScore(el);
//         const parts = det?.parts || ctx(el);
//         if (DEBUG) {
//           const baseRow = {
//             "#": idx, tag: el.tagName?.toLowerCase(), type, name: el.name || "", id: el.id || "",
//             ph: el.placeholder || "", label: parts.label, wrapper: parts.wrapperName, fcn: parts.fcn,
//             dtest: parts.datatest, dtestid: parts.datatestid,
//             chosen: det?.role || null, score: det?.score || 0, min: force ? T_FORCE : T_AUTO,
//           };
//           log("[cand]", baseRow);
//           if (det?.all?.length) {
//             const map = {}; det.all.forEach((x) => (map[x.role] = x.score));
//             log("[scores]", map);
//             det.all.forEach((x) => x.reasons?.length && log(`[reasons] ${x.role}`, x.reasons));
//           }
//         }
//         if (!det || !det.role) { DEBUG && log(`[skip] #${idx} undecided/ambiguous`); continue; }
//         const min = force ? T_FORCE : T_AUTO;
//         if (det.score < min) { DEBUG && log(`[skip] #${idx} below-threshold score=${det.score} < ${min}`); continue; }
//         const singleRoles = new Set([
//           "email","busEmail","password","firstname","lastname","fullname","phone","city","state","postcode","country",
//           "website","facebook","instagram","twitter","linkedin","youtube","title","company",
//         ]);
//         if (singleRoles.has(det.role) && used.has(det.role)) { DEBUG && log(`[skip] #${idx} duplicate-role ${det.role}`); continue; }
//         const res = tryFill(el, det.role, vals, force, parts, idx);
//         if (res.ok) {
//           filled++; used.add(det.role);
//           DEBUG && log(`[match] #${idx} role=${det.role} score=${det.score} thr=${min} name=${el.name || ""} id=${el.id || ""} label="${parts.label}" wrap="${parts.wrapperName}" fcn="${parts.fcn}" dtest="${parts.datatest}" dtestid="${parts.datatestid}"`);
//         } else {
//           DEBUG && log(`[skip] #${idx} role=${det.role} reason=${res.why}`);
//         }
//       }
//       if ((vals.description || "").trim()) {
//         fillRichEditor(document, vals.description);
//       }
//       if ((vals.description || "").trim()) {
//         const tAreas = Array.from(document.querySelectorAll("textarea[id], textarea[name]"));
//         for (const ta of tAreas) {
//           const idn = (ta.id || ta.name || "").toLowerCase();
//           const lab = extractLabelText(ta).toLowerCase();
//           const looksDesc =
//             idn === "description" || /\bdescription\b/.test(lab) ||
//             ta.closest(".wp-editor-wrap")?.id?.toLowerCase()?.includes("description");
//           if (!looksDesc) continue;
//           if (fillTinyMCEFromTextarea(ta, vals.description) || fillNearestContentEditable(ta.closest(".wp-editor-wrap") || document, vals.description)) {
//             filled++; DEBUG && log(`[rich-pass] description filled via editor (textarea link)`); break;
//           }
//         }
//       }
//       DEBUG && log(`--- scan done: filled=${filled} ---`);
//       return filled;
//     } catch (e) { warn("doFill error", e?.message || e); return 0; }
//   }

//   try {
//     chrome?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
//       if (!msg?.action) return;
//       if (["autofill","autofillProfile","autofillAuth","runFill"].includes(msg.action)) {
//         const go = async (profile) => {
//           const res = await safeGet(["autofillEnabled"]);
//           const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//           if (!enabled && !msg.force) { sendResponse({ ok: false, filled: 0, error: "disabled" }); return; }
//           const filled = doFill(profile, !!msg.force);
//           sendResponse({ ok: filled > 0, filled });
//         };
//         if (msg.profile) go(msg.profile);
//         else safeGet(["profile"]).then((r) => go(r?.profile || null));
//         return true;
//       }
//       if (msg.action === "toggleAutofill") { sendResponse({ ok: true }); return true; }
//     });
//   } catch {}

//   let autorunTimer = null;
//   const scheduleAutorun = (delay = 200) => {
//     if (autorunTimer) clearTimeout(autorunTimer);
//     autorunTimer = setTimeout(async () => {
//       const res = await safeGet(["autofillEnabled", "profile"]);
//       const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
//       const profile = res?.profile;
//       if (!enabled || !profile) return;
//       try { doFill(profile, false); } catch (e) { warn("autorun error", e?.message || e); }
//     }, delay);
//   };

//   function autorun() { scheduleAutorun(60); scheduleAutorun(500); }
//   if (document.readyState === "complete" || document.readyState === "interactive") autorun();
//   else window.addEventListener("DOMContentLoaded", autorun, { once: true });

//   if (window.MutationObserver) {
//     const mo = new MutationObserver(() => scheduleAutorun(160));
//     try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
//   }

//   (function hookHistory() {
//     try {
//       const push = history.pushState; const rep = history.replaceState;
//       history.pushState = function () { try { push.apply(this, arguments); } finally { scheduleAutorun(160); } };
//       history.replaceState = function () { try { rep.apply(this, arguments); } finally { scheduleAutorun(160); } };
//       window.addEventListener("popstate", () => scheduleAutorun(160));
//     } catch {}
//   })();

//   document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleAutorun(120); });

//   log("HyperFill v7.1.1 (richfix+uname) ready on", HOST);
// })();
















/* content/fill.js — HyperFill v7.1.4
 * Focus: "no unnecessary username filling"
 * - Username requires DIRECT tokens (label/name/id/fcn/rfcn/data-*)
 * - Container "around" text is ignored for username decision
 * - Hard guards for common non-username fields (name, resumeHeadLine, keyskills, city, captcha, etc.)
 * - Keeps rich editor support + autorun + storage-safe flow
 */

(() => {
  if (window.__HF_v714_installed) return;
  window.__HF_v714_installed = true;

  const DEBUG = true;
  const log = (...a) => { try { console.debug("[HF]", ...a); } catch {} };
  const warn = (...a) => { try { console.warn("[HF]", ...a); } catch {} };

  const T_AUTO = 10, T_FORCE = 8, GAP_MIN = 2;
  const PENALTY_SOCIAL = 18, PENALTY_PRICE = 10, PENALTY_ADDR2ZIP = 12, PENALTY_TITLENAME = 10;
  const BLOCK_HOSTS = [/(^|\.)google\.com$/i, /(^|\.)accounts\.google\.com$/i];

  const isVisible = (el) => {
    try {
      if (!el || el.disabled || el.hidden || el.readOnly) return false;
      const s = window.getComputedStyle ? getComputedStyle(el) : null;
      if (s && (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")) return false;
      const r = el.getBoundingClientRect?.();
      if (r && (r.width <= 1 || r.height <= 1)) return false;
      const st = (el.getAttribute("style") || "").toLowerCase();
      if (st.includes("left:-5000px") || st.includes("max-width:1px")) return false;
      return true;
    } catch { return false; }
  };

  const alreadyFilled = (el) => {
    try {
      if (el.isContentEditable) return !!el.innerText?.trim();
      const v = el.value;
      return v !== undefined && v !== null && String(v).trim().length > 0;
    } catch { return false; }
  };

  function setNativeValue(el, value) {
    try {
      const p = Object.getPrototypeOf(el);
      const d = Object.getOwnPropertyDescriptor(p, "value");
      if (d && d.set) d.set.call(el, value);
      else el.value = value;
    } catch { try { el.value = value; } catch {} }
    try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
  }

  const HOST = location.hostname || "";
  const isBlockedHost = () => BLOCK_HOSTS.some((rx) => rx.test(HOST));
  if (isBlockedHost()) { DEBUG && log("blocked host → skip HyperFill on", HOST); return; }

  const isExtAlive = () =>
    typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id && !!chrome.storage?.local;

  const safeGet = (keys) => new Promise((resolve) => {
    if (!isExtAlive()) { resolve({}); return; }
    try {
      chrome.storage.local.get(keys, (res) => {
        if (!isExtAlive() || chrome.runtime.lastError) {
          if (chrome.runtime?.lastError) warn("storage.get lastError:", chrome.runtime.lastError.message);
          resolve({}); return;
        }
        resolve(res || {});
      });
    } catch (e) { warn("safeGet caught:", e?.message || e); resolve({}); }
  });

  // --- validators ---
  const rxEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const looksLikeEmail = (v) => !!v && rxEmail.test(String(v).trim());
  const looksLikePhone = (v) => !!v && (String(v).match(/\d/g) || []).length >= 10;
  const looksLikeURL   = (v) => !!v && (/^https?:\/\//i.test(v) || /\.[a-z]{2,}$/i.test(v));
  const looksLikeUser  = (v) => !!v && !v.includes("@") && !/\s/.test(v) && /^[A-Za-z0-9._-]{3,}$/.test(v);
  const getText = (n) => (n?.textContent || "").trim();

  // --- DOM context helpers ---
  const CONTAINER_SEL =
    [
      ".form-group", ".form_row", ".form-fieldset", ".field", ".input-box", ".controls", ".input-wrapper",
      ".field_wrap__Gv92k", ".register_main", ".register_item", ".register_title",
      ".tw-style", "[data-testid='tailwind-wrapper']", ".sc-bYHUQc"
    ].join(", ");

  const TITLEISH_SEL =
    ":scope > label, :scope > .register_title, :scope > .field_label, :scope > .control-label, :scope > .title, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > span, :scope > p, :scope > div";

  function findScopedLabelText(el) {
    try {
      const id = el.id;
      if (id) {
        const cont = el.closest(CONTAINER_SEL) || el.parentElement;
        if (cont) {
          const within = cont.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (within?.innerText) return within.innerText.trim();
        }
        const global = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (global?.innerText) return global.innerText.trim();
      }
    } catch {}
    return "";
  }

  function extractLabelText(el) {
    try {
      let txt = findScopedLabelText(el);
      if (txt) return txt;

      for (let p = el.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) {
        if (p.tagName === "LABEL") return p.innerText.trim();
      }

      const prev = el.previousElementSibling;
      if (prev && /^(LABEL|DIV|SPAN|P|H[1-6])$/.test(prev.tagName)) {
        const t = getText(prev);
        if (t) return t;
      }
      const next = el.nextElementSibling;
      if (next && /label|field_label/i.test(next.className || "") && next.innerText) {
        return next.innerText.trim();
      }

      const cont = el.closest(CONTAINER_SEL);
      if (cont) {
        const blocks = cont.querySelectorAll(TITLEISH_SEL);
        for (const b of blocks) {
          const t = (b.innerText || "").trim();
          if (t && t.length <= 160 && !/^\s*$/.test(t)) return t;
        }
        const holder = el.closest(".register_item");
        if (holder?.previousElementSibling?.classList.contains("register_title")) {
          const t = holder.previousElementSibling.innerText?.trim();
          if (t) return t;
        }
      }

      const refId = el.getAttribute?.("aria-labelledby");
      if (refId) {
        const ref = document.getElementById(refId);
        if (ref?.innerText) return ref.innerText.trim();
      }
      if (el.title) return el.title.trim();
      return "";
    } catch { return ""; }
  }

  function ctx(el) {
    const label = (extractLabelText(el) || "").toLowerCase();
    const name = (el.name || "").toLowerCase();
    const id = (el.id || "").toLowerCase();
    const ph = (el.placeholder || "").toLowerCase();
    const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
    const title = (el.getAttribute?.("title") || "").toLowerCase();
    const dvvas = (el.getAttribute?.("data-vv-as") || "").toLowerCase();
    const datalabel = (el.getAttribute?.("data-label") || "").toLowerCase();
    const fcn = (el.getAttribute?.("formcontrolname") || "").toLowerCase();
    const rfcn = (el.getAttribute?.("ng-reflect-form-control-name") || "").toLowerCase();
    const datatest = (el.getAttribute?.("data-test") || "").toLowerCase();
    const datatestid = (el.getAttribute?.("data-testid") || "").toLowerCase();
    const dataname = (el.getAttribute?.("data-name") || "").toLowerCase();
    const ac = (el.getAttribute?.("autocomplete") || "").toLowerCase();
    const im = (el.getAttribute?.("inputmode") || "").toLowerCase();
    let around = "";
    let wrapperName = "";
    try {
      const holder = el.closest(CONTAINER_SEL) || el.parentElement;
      if (holder) {
        const collectFrom = new Set([holder, holder.previousElementSibling, holder.parentElement].filter(Boolean));
        for (const node of collectFrom) {
          const blocks = node.querySelectorAll(TITLEISH_SEL);
          for (const b of blocks) {
            const t = (b.innerText || "").trim();
            if (t && t.length < 160) around += " " + t.toLowerCase();
          }
        }
        wrapperName = (holder.getAttribute?.("name") || "").toLowerCase();
      }
    } catch {}
    const cls = (el.className || "").toLowerCase();
    const combinedArr = [label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn, datatest, datatestid, dataname, ac, im, around, cls, wrapperName].filter(Boolean);
    return {
      label, name, id, ph, aria, title, dvvas, datalabel, fcn, rfcn,
      datatest, datatestid, dataname, ac, im,
      around, cls, wrapperName, combined: combinedArr.join(" ")
    };
  }

  // --- patterns ---
  const POS = {
    firstname: [/\bfirst(?:[_\s-]?name)?\b/i, /\bgiven\b/i, /\bfname\b/i, /\byour\b/i],
    lastname:  [/\blast(?:[_\s-]?name)?\b/i,  /\bsurname\b/i, /\blname\b/i],
    fullname:  [/^name$|\bfull[_\s-]?name\b|\bdisplay[_\s-]?name\b|\breal[_\s-]?name\b|\bcompany[_\s-]?name\b/i],
    username:  [/\busername\b|\buser[_\s-]?name\b|\blogin\b|\buserid\b|\buser_login\b|\buname\b|\buser\s*id\b/i],
    email:     [/\bemail\b|\be-?mail\b|\bmail\b|\byouremail\b|\byour[_\s-]?email\b/i],
    email2:    [/\bconfirm(?:\s*e-?mail|\s*email)?\b|\bre-?type\s*email\b|\bre-?enter\s*email\b|\brepeat\s*email\b/i],
    busEmail:  [/\b(?:business|work|company|office)[\s_-]*email\b/i],
    password:  [/^password$|pass(?:word)?|pwd/i],
    password2: [/\bconfirm(?:\s*password)?\b|\bre-?type\b|\bre-?enter\b|\brepeat\b|\bpassword\s*again\b/i],
    otp:       [/\bverification\s*code\b|\bverify\s*code\b|\bone[-\s]?time\b|\b2fa\b|\bmfa\b|\botp\b/i],
    phone:     [/\bphone\b|\bmobile\b|\btel\b|\bcontact\b|\bwhatsapp\b/i],
    address:   [/\baddress\b|\bstreet\b|\baddr\b|\broad\b|\bhouse\b|\barea\b/i],
    city:      [/\bcity\b|\btown\b/i],
    state:     [/\bstate\b|\bprovince\b|\bregion\b/i],
    postcode:  [/\bzip\b|\bpostal\b|\bpostcode\b|\bpin\b|\bzipcode\b|\bpost[_\s-]?code\b/i],
    country:   [/\bcountry\b/i],
    location:  [/\blocation\b|\bplace\b|\barea\b/i],
    website:   [/\bwebsite\b|\bweb[_\s-]?url\b|\bhomepage\b|\bsite\b|\burl\b|\bportfolio\b/i],
    title:     [/\btitle\b|\bheadline\b|\bresume[_\s-]?headline\b|\blisting\b/i],
    company:   [/\bcompany\b|\borganization\b|\borg\b|\bbusiness\b|\bfirma\b/i],
    category:  [/\bcategory\b|\bcat\b|\bselect[_\s-]?category\b|\bjob[_\s-]?category\b/i],
    subcategory:[/\bsub[_\s-]?category\b|\bsubcat\b|\bselect[_\s-]?subcategory\b|\bjob[_\s-]?subcategory\b/i],
    description:[/\bdescription\b|\babout\b|\bbio\b|\bsummary\b|\bdescriptions\b|\bprofile\b|\bintro\b|\bstory\b|\bbackground\b|\binterests\b/i],
    facebook:  [/\bfacebook\b|\bfb\.com\b|\bfacebook\.com\b/i],
    instagram: [/\binstagram\b|\binsta\b|\binstagram\.com\b/i],
    twitter:   [/\btwitter\b|\bx\.com\b|\btwitter\.com\b/i],
    linkedin:  [/\blinked ?in\b|\blinkedin\.com\b/i],
    youtube:   [/\byoutube\b|\byoutu\.be\b|\byoutube\.com\b/i],
  };

  const NEG = {
    social: [/\bfacebook\b|\binstagram\b|\btwitter\b|\bx\.com\b|\byoutube\b|\btiktok\b|\blinkedin\b/i],
    price:  [/\bprice\b|\bamount\b|\brate\b|\bfee\b|\bcost\b|\bbudget\b/i],
    post:   [/\bpost\s?code\b|\bpostal\b|\bzip\b/i],
    addressLine2: [/\baddress\s*line\s*2\b/i, /\baddress\s*line\s*3\b/i, /\baddress\s*2\b/i, /\baddr2\b/i, /\baddress2\b/i, /\bapt\b/i, /\bsuite\b/i, /\bunit\b/i],
  };

  const ROLE_LIST = [
    "email","email2","busEmail","password","password2","otp","fullname","firstname","lastname","username",
    "phone","address","city","state","postcode","country","location","website",
    "facebook","instagram","twitter","linkedin","youtube","title","company","category","subcategory","description",
  ];

  // exact hints for direct mapping
  const EXACT_HINTS = {
    email: "email", mail: "email", "e-mail": "email", user_email: "email",
    username: "username", user: "username", login: "username", userid: "username",
    name: "fullname", full_name: "fullname", fullname: "fullname",
    bio: "description", about: "description", url: "website", website: "website", portfolio: "website",
    s_email: "email", s_name: "fullname", s_password: "password", s_password2: "password",
    usernamer: "username", namer: "fullname", emailr: "email",
    user_login: "username", uname: "username", user_name: "username",
    contactcompany: "company", contact_company: "company", companyname: "company",
    firstname: "firstname", lastname: "lastname", username_fcn: "username", phonenumber: "phone",
    emailaddress: "email", password: "password", confirmpassword: "password2",
    email_confirm: "email2", confirmemail: "email2", emailconfirm: "email2", regdataemailconfirm: "email2", emailconfirmation: "email2",
    facebook: "facebook", instagram: "instagram", twitter: "twitter", x: "twitter", linkedin: "linkedin", youtube: "youtube",
    reg_username: "username", reg_email: "email", reg_password: "password", reg_password_confirm: "password2",
    company_email: "busEmail", company_phone: "phone", company_website: "website",
    "name-input": "fullname", "website-input": "website", "username-input": "username",
    "login.emailinput": "busEmail",
    category: "category", subcategory: "subcategory", job_category: "category", job_subcategory: "subcategory"
  };

  // --- hard block-list for non-username fields ---
  const NOT_USERNAME_NAMES = new Set([
    "name","fullname","full_name","displayname","display_name",
    "resumeheadline","resume_headline","resumeheadlineinput","headline",
    "keyskills","skills","city","txtinput","captcha","docname",
    "resumecode","resumeext","actionval","userprivacy","country","state",
    "expinyears","expinmonths"
  ]);

  function isExplicitNonUsername(parts) {
    const normalize = (s) => (s || "").toLowerCase().replace(/\W+/g,'');
    const n = normalize(parts.name);
    const i = normalize(parts.id);
    const lbl = parts.label || "";
    const ph = parts.ph || "";
    const labelIsPlainName = /\bname\b/i.test(lbl) && !/\buser\s*name|username|login|user[_-]?id\b/i.test(lbl);
    const genericNameField = n === "name" || i === "name";
    const blocked = NOT_USERNAME_NAMES.has(n) || NOT_USERNAME_NAMES.has(i);
    const phLooksLikeName = /\benter\s+your\s+name\b/i.test(ph) || /^name[:\s]*$/i.test(lbl);
    return labelIsPlainName || genericNameField || blocked || phLooksLikeName;
  }

  function isPacField(el) {
    const id = (el.id || "").toLowerCase();
    const cls = (el.className || "").toLowerCase();
    const ph = (el.placeholder || "").toLowerCase();
    return (
      id === "pac-input" ||
      cls.includes("pac-target-input") ||
      cls.includes("google-writen-location") ||
      /enter a location|search location|start typing address/i.test(ph)
    );
  }

  function exactHintBoost(parts, role) {
    let bonus = 0; const reasons = [];
    const { name: n, id: i, wrapperName: w, fcn: f, rfcn: rf, datatest: dt, datatestid: dti, dataname: dn, ph } = parts;
    const add = (cond, amt, why) => { if (cond) { bonus += amt; reasons.push(`+${amt} ${why}`); } };
    const anyEqual = (x) => EXACT_HINTS[x] === role;

    if (anyEqual(n))  add(true, 26, `exact-hint name="${n}"`);
    if (anyEqual(i))  add(true, 26, `exact-hint id="${i}"`);
    if (anyEqual(w))  add(true, 26, `exact-hint wrapper="${w}"`);
    if (anyEqual(f))  add(true, 26, `exact-hint fcn="${f}"`);
    if (anyEqual(rf)) add(true, 18, `exact-hint rfcn="${rf}"`);
    if (anyEqual(dt)) add(true, 28, `exact-hint data-test="${dt}"`);
    if (anyEqual(dti))add(true, 28, `exact-hint data-testid="${dti}"`);
    if (anyEqual(dn)) add(true, 20, `exact-hint data-name="${dn}"`);
    if (role === "email") add(ph.includes("email") || f === "emailaddress", 10, "email-ish");
    if (role === "email2") add(/confirm|re[-\s]?type|re[-\s]?enter|repeat/.test(parts.label) || /email_confirm|confirmemail|emailconfirm/.test(n + i + f + rf), 20, "confirm-email");
    if (role === "username") add(ph.includes("username") || f === "username" || rf === "username", 12, "username-ish");
    if (role === "phone") add(f === "phonenumber", 14, "fcn=phoneNumber");
    if (role === "password2") add(/confirm|re[-\s]?type|re[-\s]?enter/.test(parts.label) || f === "confirmpassword", 18, "confirm-ish");
    if (role === "company") add(/company/.test(parts.label), 16, "label company");
    if (role === "category" || role === "subcategory" || role === "title") add(/category|subcategory|title|headline/.test(parts.label + " " + parts.around), 16, "cats-ish");
    if (role === "otp") {
      const otpish = parts.ac.includes("one-time-code") || POS.otp.some(rx => rx.test(parts.label + " " + parts.ph + " " + parts.around + " " + parts.name + " " + parts.id));
      if (otpish) add(true, 40, "otp-ish");
    }
    return { bonus, reasons };
  }

  // username signals — NO container/around usage
  function usernameSignalsUltra(parts, el) {
    let n = 0;
    const rx = /\b(username|user[_\s-]?name|login|user\s*id|userid|user_login|uname)\b/i;
    if (rx.test(parts.label)) n += 3;
    if (rx.test(parts.name)) n += 3;
    if (rx.test(parts.id)) n += 2;
    if (rx.test(parts.ph)) n += 1;
    if (rx.test(parts.wrapperName)) n += 1;
    if (rx.test(parts.fcn) || rx.test(parts.rfcn)) n += 2;
    if (rx.test(parts.datatest) || rx.test(parts.datatestid) || rx.test(parts.dataname)) n += 2;
    if ((el.getAttribute?.("autocomplete") || "").toLowerCase().includes("username")) n += 2;
    return n;
  }

  function scoreRole(parts, role, posList) {
    let s = 0; const reasons = [];
    const add = (hit, w, where, rx) => { if (hit) { s += w; reasons.push(`+${w} ${where} ~ ${rx}`); } };
    for (const rx of posList) {
      add(rx.test(parts.label), 10, "label", rx);
      add(rx.test(parts.name), 7, "name", rx);
      add(rx.test(parts.id), 7, "id", rx);
      add(rx.test(parts.aria), 5, "aria", rx);
      add(rx.test(parts.dvvas), 5, "data-vv-as", rx);
      add(rx.test(parts.ph), 4, "ph", rx);
      add(rx.test(parts.title), 2, "title", rx);
      // NOTE: we still collect around for other roles, but tryFill blocks username unless direct signals exist
      add(rx.test(parts.around), 6, "around", rx);
      add(rx.test(parts.cls), 1, "class", rx);
      add(rx.test(parts.wrapperName), 6, "wrapperName", rx);
      add(rx.test(parts.fcn) || rx.test(parts.rfcn), 10, "fcn", rx);
      add(rx.test(parts.datatest), 9, "data-test", rx);
      add(rx.test(parts.datatestid), 9, "data-testid", rx);
      add(rx.test(parts.dataname), 6, "data-name", rx);
    }
    const ex = exactHintBoost(parts, role); s += ex.bonus; reasons.push(...ex.reasons);

    if (parts.label === "name") {
      if (role === "fullname") { s += 4; reasons.push("+4 fullname (label=name)"); }
      else if (role === "firstname" || role === "lastname") { s -= 4; reasons.push("-4 split-name discouraged"); }
    }

    const penalize = (hit, amt, why) => { if (hit) { s -= amt; reasons.push(`-${amt} ${why}`); } };
    if (role === "username") {
      penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
      // Do NOT penalize for "email" nearby here; handled in tryFill with direct-signal rule
    }
    if (role === "phone") penalize(NEG.price.some((rx) => rx.test(parts.combined)), PENALTY_PRICE, "price context");
    if (role === "address") penalize(NEG.post.concat(NEG.addressLine2).some((rx) => rx.test(parts.combined)), PENALTY_ADDR2ZIP, "postcode/addr2 context");
    if (role === "website") penalize(NEG.social.some((rx) => rx.test(parts.combined)), PENALTY_SOCIAL, "social context");
    if (role === "title" && /^name$/.test(parts.label)) penalize(true, PENALTY_TITLENAME, "avoid title when label=name");
    return { role, score: s, reasons };
  }

  function detectRoleAndScore(el) {
    const parts = ctx(el);
    if (isPacField(el))
      return { role: "address", score: 99, all: [{ role: "address", score: 99, reasons: ["PAC/Places field"] }], parts };
    if (!isVisible(el)) return { role: null, score: 0, all: [], parts };

    const type = (el.type || "").toLowerCase();
    const own = [parts.name, parts.id, parts.fcn, parts.rfcn, parts.label, parts.datatest, parts.datatestid].join(" ");
    const isPassish = /(pass(?:word)?|pwd)/i.test(own);
    const isConfirmish = /(confirm|re[-\s]?type|re[-\s]?enter|password2)/i.test(own);
    const otpTokens = POS.otp.some(rx => rx.test(parts.label + " " + parts.ph + " " + parts.around + " " + parts.name + " " + parts.id))
      || parts.ac.includes("one-time-code");
    if (otpTokens) {
      const s = 90;
      return { role: "otp", score: s, all: [{ role: "otp", score: s, reasons: ["otp/verification detected"] }], parts };
    }
    if (type === "password" || (isPassish && !otpTokens)) {
      const role = isConfirmish ? "password2" : "password";
      return { role, score: 100, all: [{ role, score: 100, reasons: ["password-type/own-passish"] }], parts };
    }

    const candidates = [];
    const push = (role, list) => candidates.push(scoreRole(parts, role, list));
    push("firstname", POS.firstname);
    push("lastname", POS.lastname);
    push("fullname", POS.fullname);
    push("username", POS.username);
    push("busEmail", POS.busEmail);
    push("email", POS.email);
    push("email2", POS.email2);
    push("password", POS.password);
    push("password2", POS.password2);
    push("otp", POS.otp);
    push("phone", POS.phone);
    push("address", POS.address);
    push("city", POS.city);
    push("state", POS.state);
    push("postcode", POS.postcode);
    push("country", POS.country);
    push("location", POS.location);
    push("website", POS.website);
    push("facebook", POS.facebook);
    push("instagram", POS.instagram);
    push("twitter", POS.twitter);
    push("linkedin", POS.linkedin);
    push("youtube", POS.youtube);
    push("title", POS.title);
    push("company", POS.company);
    push("category", POS.category);
    push("subcategory", POS.subcategory);
    push("description", POS.description);

    if (type === "email") {
      const e = candidates.find(c => c.role === "email");
      if (e) e.score += 14;
    }

    // boost username by direct signals (not around)
    const uItem = candidates.find(c => c.role === "username");
    if (uItem) {
      const sig = usernameSignalsUltra(parts, el);
      uItem.score += sig * 10;
      uItem.reasons.push(`+${sig * 10} uname-signals-direct`);
    }

    candidates.sort((a, b) => b.score - a.score || ROLE_LIST.indexOf(a.role) - ROLE_LIST.indexOf(b.role));

    const best = candidates[0], second = candidates[1];
    if (second && best.score - second.score < GAP_MIN) return { role: null, score: 0, all: candidates, parts };

    // require minimal direct signals if username wins
    if (best.role === "username") {
      const sig = usernameSignalsUltra(parts, el);
      const explicit =
        EXACT_HINTS[parts.name] === "username" ||
        EXACT_HINTS[parts.id] === "username" ||
        EXACT_HINTS[parts.wrapperName] === "username" ||
        EXACT_HINTS[parts.fcn] === "username" ||
        EXACT_HINTS[parts.rfcn] === "username" ||
        EXACT_HINTS[parts.datatest] === "username" ||
        EXACT_HINTS[parts.datatestid] === "username" ||
        EXACT_HINTS[parts.dataname] === "username";
      if (!(sig >= 1 || explicit)) return { role: null, score: 0, all: candidates, parts };
    }

    return { role: best.role, score: best.score, all: candidates, parts };
  }

  function prepareProfileValues(profile) {
    const p = profile?.profile || profile || {};
    const first = p.firstname || p.firstName || "";
    const last = p.lastname || p.lastName || "";
    const fullname = (p.fullname || p.fullName || `${first} ${last}`.trim()).trim();
    const password = p.activePassword === "submissionPassword" ? (p.submissionPassword || "") : (p.emailPassword || p.password || "");
    return {
      firstname: first,
      lastname: last,
      fullname,
      username: p.username || "",
      email: p.email || p.submissionEmail || "",
      busEmail: p.businessEmail || p.workEmail || "",
      password,
      phone: p.phone || p.number || p.phoneNumber || "",
      website: p.website || "",
      title: p.title || p.resumeHeadLine || "",
      company: p.company || fullname || "",
      description: p.description || p.bio || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      postcode: p.postcode || p.zip || "",
      country: p.country || "",
      location: p.location || "",
      facebook: p.facebook || "",
      instagram: p.instagram || "",
      twitter: p.twitter || p.x || "",
      linkedin: p.linkedin || "",
      youtube: p.youtube || "",
      category: p.category || "",
      subcategory: p.subcategory || p.subCategory || "",
    };
  }

  // ------- Rich editors -------
  function fillTinyMCEFromTextarea(textareaEl, v) {
    try {
      const id = textareaEl.id || textareaEl.name;
      if (!id) return false;
      const tm = window.tinymce || window.tinyMCE;
      if (tm?.get) {
        const ed = tm.get(id);
        if (ed) {
          ed.setContent(v);
          try { ed.fire("change"); } catch {}
          textareaEl.value = v;
          textareaEl.dataset.rowfiller = "filled";
          DEBUG && log(`[rich] TinyMCE setContent id=${id}`);
          return true;
        }
      }
      const ifr =
        document.getElementById(`${id}_ifr`) ||
        textareaEl.closest(".wp-editor-wrap")?.querySelector('iframe[id$="_ifr"]');
      if (ifr?.contentWindow?.document?.body) {
        const body = ifr.contentDocument.body;
        body.innerHTML = v;
        try { body.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
        textareaEl.value = v;
        textareaEl.dataset.rowfiller = "filled";
        DEBUG && log(`[rich] Iframe body filled id=${id}_ifr`);
        return true;
      }
    } catch (e) { warn("fillTinyMCE error", e?.message || e); }
    return false;
  }

  const RICH_EDITOR_SEL =
    [
      '[contenteditable="true"][role="textbox"]',
      '.ql-editor[contenteditable="true"]',
      '.quill .ql-editor',
      '.tiptap.ProseMirror[contenteditable="true"]',
      '.ProseMirror[contenteditable="true"]',
      '.ricos-tiptap-editor [contenteditable="true"]',
      '.ricos-editor [contenteditable="true"]',
      '.fr-view[contenteditable="true"]',
      '.fr-element[contenteditable="true"]',
      '[data-hook*="editor"] [contenteditable="true"]'
    ].join(', ');

  function fillRichEditor(root, v) {
    try {
      const base = root || document;
      let ce = Array.from(base.querySelectorAll(RICH_EDITOR_SEL)).find(isVisible);
      if (!ce && base !== document) {
        ce = Array.from(document.querySelectorAll(RICH_EDITOR_SEL)).find(isVisible);
      }
      if (ce) {
        if (ce.innerHTML !== undefined) ce.innerHTML = v;
        else ce.innerText = v;
        try { ce.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
        ce.dataset && (ce.dataset.rowfiller = "filled");
        DEBUG && log(`[rich] contenteditable filled`);
        return true;
      }
    } catch {}
    return false;
  }

  function fillNearestContentEditable(container, v) {
    try {
      const ce = container.querySelector('[contenteditable="true"], .mce-content-body, div[role="textbox"], .ql-editor[contenteditable="true"]');
      if (ce) {
        if (ce.innerHTML !== undefined) ce.innerHTML = v; else ce.innerText = v;
        try { ce.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
        ce.dataset && (ce.dataset.rowfiller = "filled");
        DEBUG && log(`[rich] contenteditable filled`);
        return true;
      }
    } catch {}
    return false;
  }

  function firePacEvents(el) {
    try { el.focus(); } catch {}
    try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
    try { el.blur(); } catch {}
  }

  function toSocialURL(role, v) {
    if (!v) return v;
    let handle = String(v).trim();
    if (looksLikeURL(handle)) return handle;
    handle = handle.replace(/^@/, "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (!handle) return v;
    switch (role) {
      case "facebook": return `https://facebook.com/${handle}`;
      case "instagram": return `https://instagram.com/${handle}`;
      case "twitter": return `https://x.com/${handle}`;
      case "linkedin": return /company|in\//.test(handle) ? `https://linkedin.com/${handle}` : `https://linkedin.com/in/${handle}`;
      case "youtube": return /^@/.test(v) ? `https://youtube.com/${handle}` : `https://youtube.com/@${handle}`;
      default: return v;
    }
  }

  // ------- Fill logic -------
  function tryFill(el, role, vals, force, parts, idx) {
    if (!el) return { ok: false, why: "no-el" };

    // Rich editors for description/about/bio/story
    if (role === "description" || role === "bio" || role === "about") {
      const v = vals.description; if (!v) return { ok: false, why: "no-value-for-description" };
      if (el.isContentEditable && isVisible(el)) {
        try { document.execCommand?.("insertText", false, v); } catch { el.innerText = v; }
        el.dataset.rowfiller = "filled";
        DEBUG && log(`[fill] #${idx} description → contenteditable`);
        return { ok: true };
      }
      if (fillRichEditor(el.parentElement || document, v)) return { ok: true };
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "textarea") {
        const style = (el.getAttribute("style") || "").toLowerCase();
        const hiddenish = style.includes("display: none") || el.getAttribute("aria-hidden") === "true" || !isVisible(el);
        if (hiddenish) {
          const ok = fillTinyMCEFromTextarea(el, v) || fillRichEditor(document, v);
          return { ok, why: ok ? "" : "rich-editor-not-found" };
        }
      }
    }

    if (!isVisible(el)) return { ok: false, why: "not-visible" };
    if (!force && alreadyFilled(el)) return { ok: false, why: "already-filled" };
    if (role === "otp") return { ok: false, why: "otp-skip" };

    let v = vals[role];

    if ((role === "firstname" || role === "lastname") && !v && vals.fullname) {
      const t = vals.fullname.trim().split(/\s+/).filter(Boolean);
      if (t.length) {
        if (role === "firstname") v = t[0];
        if (role === "lastname") v = t.length > 1 ? t[t.length - 1] : "";
      }
    }
    if (role === "fullname" && !v) v = [vals.firstname, vals.lastname].filter(Boolean).join(" ").trim();
    if (!v && role === "busEmail" && vals.email) v = vals.email;
    if (role === "password2") v = vals.password;
    if (role === "email2") v = vals.email || vals.busEmail;
    if (!v) return { ok: false, why: `no-value-for-${role}` };

    const tag = (el.tagName || "").toLowerCase();
    const type = (el.type || "").toLowerCase();

    if ((role === "email" || role === "busEmail" || role === "email2") && !looksLikeEmail(v)) return { ok: false, why: "value-not-email" };
    if (role === "phone") {
      if (!looksLikePhone(v)) return { ok: false, why: "value-not-phone" };
      if (NEG.price.some((rx) => rx.test(parts.combined))) return { ok: false, why: "price-context" };
    }
    if (role === "website" && !looksLikeURL(v)) return { ok: false, why: "value-not-url" };

    if (role === "username") {
      const sig = usernameSignalsUltra(parts, el);

      const hasDirectToken =
        /\b(user\s*name|username|login|userid|user_login|uname)\b/i
          .test([parts.label, parts.name, parts.id, parts.fcn, parts.rfcn, parts.datatest, parts.datatestid, parts.dataname].join(" "));

      const explicit =
        EXACT_HINTS[parts.name] === "username" || EXACT_HINTS[parts.id] === "username" ||
        EXACT_HINTS[parts.wrapperName] === "username" || EXACT_HINTS[parts.fcn] === "username" ||
        EXACT_HINTS[parts.rfcn] === "username" || EXACT_HINTS[parts.datatest] === "username" ||
        EXACT_HINTS[parts.datatestid] === "username" || EXACT_HINTS[parts.dataname] === "username";

      // hard guards (common non-username fields)
      if (isExplicitNonUsername(parts)) return { ok:false, why:"explicit-non-username-field" };

      // "Email or Username" fields: allow either (looksLikeUser OR looksLikeEmail)
      if (!looksLikeUser(v) && !looksLikeEmail(v)) return { ok:false, why:"value-not-username" };
      if (["email","password","tel","url","number"].includes(type)) return { ok:false, why:"bad-input-type" };

      // must have a direct token or explicit hint; container 'around' is NOT considered
      if (!(hasDirectToken || explicit || sig >= 2)) return { ok:false, why:"insufficient-direct-username-signal" };

      if (NEG.social.some((rx) => rx.test(parts.combined))) return { ok:false, why:"social-context" };
    }

    if (role === "postcode") {
      const looksLikeZip = (z) => !!z && /^[A-Za-z0-9 \-]{3,10}$/.test(z);
      if (!looksLikeZip(v)) return { ok: false, why: "value-not-zip" };
      if (/\d/.test(v) === false && v.length > 4) return { ok: false, why: "zip-no-digits" };
    }

    if (role === "address") {
      const isAddr2 =
        NEG.addressLine2.some((rx) => rx.test(parts.combined)) ||
        /(^|[^a-z])address2([^a-z]|$)/i.test(parts.name) ||
        /(^|[^a-z])address2([^a-z]|$)/i.test(parts.id);
      if (isAddr2) return { ok: false, why: "addr2-context" };
    }

    if (role === "title" && /^name$/.test(parts.label)) return { ok: false, why: "label-name-title-guard" };
    if (role === "fullname" && looksLikeEmail(v)) return { ok: false, why: "fullname-looks-like-email" };

    if (["facebook","instagram","twitter","linkedin","youtube"].includes(role)) {
      v = toSocialURL(role, v);
      if (!looksLikeURL(v)) return { ok: false, why: "social-url-invalid" };
    }

    if (tag === "select") {
      for (const opt of Array.from(el.options || [])) {
        if (!opt) continue;
        if (
          (opt.value && String(opt.value).toLowerCase() === String(v).toLowerCase()) ||
          (opt.text && String(opt.text).toLowerCase() === String(v).toLowerCase())
        ) {
          el.value = opt.value;
          try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
          el.dataset.rowfiller = "filled";
          DEBUG && log(`[fill] #${idx} select role=${role}`);
          return { ok: true };
        }
      }
      return { ok: false, why: "select-no-match" };
    }

    const isPac = isPacField(el);

    if (el.isContentEditable) {
      try { document.execCommand("insertText", false, v); } catch { el.innerText = v; }
      el.dataset.rowfiller = "filled";
      DEBUG && log(`[fill] #${idx} contenteditable role=${role}`);
      return { ok: true };
    }

    setNativeValue(el, v);
    if (isPac) firePacEvents(el);
    el.dataset.rowfiller = "filled";
    DEBUG && log(`[fill] #${idx} input role=${role}${isPac ? " (PAC)" : ""}`);
    return { ok: true };
  }

  // --- Site-specific fill: dataset ki mapping se direct selector → fill ---
  // site = { mappings, formSelector? }. formSelector = same URL pe login/signup alag forms ke liye; root = form ya document
  function doFillWithMappings(profile, site, force) {
    try {
      const mappings = site?.mappings || site;
      if (!mappings || typeof mappings !== "object") return 0;
      const formSel = String(site?.formSelector || "").trim();
      const root = formSel ? document.querySelector(formSel) : document;
      if (formSel && !root) { DEBUG && log("[site-mapping] formSelector not found:", formSel); return 0; }
      const vals = prepareProfileValues(profile);
      let filled = 0;
      for (const [role, sel] of Object.entries(mappings)) {
        if (!role || !sel) continue;
        const selector = typeof sel === "string" ? sel : (sel && sel.selector);
        if (!selector) continue;
        const el = root.querySelector(selector);
        if (!el || !isVisible(el)) continue;
        if (!force && alreadyFilled(el)) continue;
        const parts = ctx(el);
        const res = tryFill(el, role, vals, force, parts, 0);
        if (res?.ok) filled++;
      }
      DEBUG && log(`[site-mapping] filled=${filled} from ${Object.keys(mappings).length} mappings` + (formSel ? " (form:" + formSel + ")" : ""));
      return filled;
    } catch (e) { warn("doFillWithMappings error", e?.message || e); return 0; }
  }

  function doFill(profile, force = false) {
    try {
      const vals = prepareProfileValues(profile);
      const nodes = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"));
      nodes.sort((a, b) => (a.getBoundingClientRect().top || 0) - (b.getBoundingClientRect().top || 0));
      let filled = 0; const used = new Set(); let idx = 0;
      DEBUG && log(`--- scan start (${nodes.length} fields) @ ${new Date().toISOString()} ---`);
      for (const el of nodes) {
        idx++;
        const type = (el.type || "").toLowerCase();
        if (["hidden","submit","button","reset","image","file","checkbox","radio"].includes(type) && el.tagName !== "TEXTAREA") continue;
        let det = detectRoleAndScore(el);
        const parts = det?.parts || ctx(el);
        if (DEBUG) {
          const baseRow = {
            "#": idx, tag: el.tagName?.toLowerCase(), type, name: el.name || "", id: el.id || "",
            ph: el.placeholder || "", label: parts.label, wrapper: parts.wrapperName, fcn: parts.fcn,
            dtest: parts.datatest, dtestid: parts.datatestid,
            chosen: det?.role || null, score: det?.score || 0, min: force ? T_FORCE : T_AUTO,
          };
          log("[cand]", baseRow);
        }
        if (!det || !det.role) { DEBUG && log(`[skip] #${idx} undecided/ambiguous`); continue; }
        const min = force ? T_FORCE : T_AUTO;
        if (det.score < min) { DEBUG && log(`[skip] #${idx} below-threshold score=${det.score} < ${min}`); continue; }

        const singleRoles = new Set([
          "email","busEmail","password","firstname","lastname","fullname","phone","city","state","postcode","country",
          "website","facebook","instagram","twitter","linkedin","youtube","title","company","category","subcategory",
        ]);
        if (singleRoles.has(det.role) && used.has(det.role)) { DEBUG && log(`[skip] #${idx} duplicate-role ${det.role}`); continue; }

        const res = tryFill(el, det.role, vals, force, parts, idx);
        if (res.ok) {
          filled++; used.add(det.role);
          DEBUG && log(`[match] #${idx} role=${det.role} score=${det.score} thr=${min} name=${el.name || ""} id=${el.id || ""} label="${parts.label}" wrap="${parts.wrapperName}" fcn="${parts.fcn}" dtest="${parts.datatest}" dtestid="${parts.datatestid}"`);
        } else {
          DEBUG && log(`[skip] #${idx} role=${det.role} reason=${res.why}`);
        }
      }

      // Fallback for description-rich editors
      if ((vals.description || "").trim()) {
        fillRichEditor(document, vals.description);
        const tAreas = Array.from(document.querySelectorAll("textarea[id], textarea[name]"));
        for (const ta of tAreas) {
          const idn = (ta.id || ta.name || "").toLowerCase();
          const lab = extractLabelText(ta).toLowerCase();
          const looksDesc =
            idn === "description" || /\bdescription\b/.test(lab) ||
            ta.closest(".wp-editor-wrap")?.id?.toLowerCase()?.includes("description");
          if (!looksDesc) continue;
          if (fillTinyMCEFromTextarea(ta, vals.description) || fillNearestContentEditable(ta.closest(".wp-editor-wrap") || document, vals.description)) {
            filled++; DEBUG && log(`[rich-pass] description filled via editor (textarea link)`); break;
          }
        }
      }

      DEBUG && log(`--- scan done: filled=${filled} ---`);
      return filled;
    } catch (e) { warn("doFill error", e?.message || e); return 0; }
  }

  // --- Dataset: site match → site-specific fill; warna general fill ---
  function getSiteMappings() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: "getSiteMappings" }, (r) => {
          if (chrome.runtime?.lastError) resolve({ sites: [] });
          else resolve(r || { sites: [] });
        });
      } catch (e) { resolve({ sites: [] }); }
    });
  }

  // Same URL pe login+signup: sab matching sites lao; formSelector se pehla jiska form mile aur fill ho use karo
  function findMatchingSites(sites, href) {
    if (!Array.isArray(sites) || !href) return [];
    const out = [];
    try {
      const u = new URL(href);
      const host = (u.hostname || "").toLowerCase();
      const path = (u.pathname || "").toLowerCase();
      for (const s of sites) {
        const up = String(s.urlPattern || "").trim().toLowerCase();
        if (!up) continue;
        const hostMatch = host === up || host.endsWith("." + up);
        if (!hostMatch) continue;
        const pp = String(s.pathPattern || "").trim().toLowerCase();
        if (pp && !path.startsWith(pp)) continue;
        if (s?.mappings && Object.keys(s.mappings).length > 0) out.push(s);
      }
    } catch (e) {}
    return out;
  }

  async function runFill(profile, force) {
    const { sites } = await getSiteMappings();
    const matches = findMatchingSites(sites, location.href);
    for (const site of matches) {
      // const filled = doFillWithMappings(profile, site, force);
      const filled = doFillWithMappings(profile, site, true); // ALWAYS force for site mappings

      if (filled > 0) {
        DEBUG && log("[runFill] using site mapping:", site.name || site.id);
        return filled;
      }
    }
    return doFill(profile, force);
  }

  // ------- Messaging & autorun -------
  try {
    chrome?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
      if (!msg?.action) return;
      if (["autofill","autofillProfile","autofillAuth","runFill"].includes(msg.action)) {
        const go = async (profile) => {
          const res = await safeGet(["autofillEnabled"]);
          const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
          if (!enabled && !msg.force) { sendResponse({ ok: false, filled: 0, error: "disabled" }); return; }
          const filled = await runFill(profile, !!msg.force);
          sendResponse({ ok: filled > 0, filled });
        };
        if (msg.profile) go(msg.profile);
        else safeGet(["profile"]).then((r) => go(r?.profile || null));
        return true;
      }
      if (msg.action === "toggleAutofill") { sendResponse({ ok: true }); return true; }
    });
  } catch {}

  let autorunTimer = null;
  const scheduleAutorun = (delay = 200) => {
    if (autorunTimer) clearTimeout(autorunTimer);
    autorunTimer = setTimeout(async () => {
      const res = await safeGet(["autofillEnabled", "profile"]);
      const enabled = res?.autofillEnabled !== undefined ? res.autofillEnabled : true;
      const profile = res?.profile;
      if (!enabled || !profile) return;
      try { await runFill(profile, false); } catch (e) { warn("autorun error", e?.message || e); }
    }, delay);
  };

  function autorun() { scheduleAutorun(60); scheduleAutorun(500); }
  if (document.readyState === "complete" || document.readyState === "interactive") autorun();
  else window.addEventListener("DOMContentLoaded", autorun, { once: true });

  if (window.MutationObserver) {
    const mo = new MutationObserver(() => scheduleAutorun(160));
    try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
  }

  (function hookHistory() {
    try {
      const push = history.pushState; const rep = history.replaceState;
      history.pushState = function () { try { push.apply(this, arguments); } finally { scheduleAutorun(160); } };
      history.replaceState = function () { try { rep.apply(this, arguments); } finally { scheduleAutorun(160); } };
      window.addEventListener("popstate", () => scheduleAutorun(160));
    } catch {}
  })();

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleAutorun(120); });

  log("HyperFill v7.1.4 (no-unnecessary-username) ready on", HOST);
})();
