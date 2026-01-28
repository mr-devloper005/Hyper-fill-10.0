
// panel.js — Fresh dark UI + Excel/CSV import integrated + storage + Hard Fill + toasts + Autofill Toggle + Title/Category/Subcategory
(function () {
  const $ = (sel) => document.querySelector(sel);

  /* -------------------- TOAST -------------------- */
  let toastTimer = null;
  function toast(msg, type = "info") {
    const el = $("#toast"),
      txt = $("#toastMsg");
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.remove("success", "warn", "info");
    el.classList.add(type);
    el.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  /* -------------------- PROMPT (copy) -------------------- */
  const PROMPT_TEXT =
    `You are a data-extraction assistant. I will give you a screenshot of a RankFiller "Project Details" page (and similar panels like Common Project Details, Social Media Details, Other Details). 

🎯 Goal
Return a **single-row Excel** that exactly matches the schema below for my autofill tool. 
- Sheet name: Profile
- One header row + one data row only.
- Do NOT add any extra columns, notes, or footers.

📄 Exact column headers (use EXACT spelling & order):
Website URL,
Company Name,
First Name,
Last Name,
Full Name,
Username,
Email,
Confirm Email,
Password,
Confirm Password,
Phone,
Address,
City,
State,
Post Code,
Country,
Location,
Facebook,
Instagram,
Twitter,
LinkedIn,
YouTube,
Description

🧭 Mapping rules (how to read the screenshot):
- Website URL ← from fields like “Website URL”, “Website”, “Domain”, “Site”. Ensure it starts with https://
- Company Name ← from “Company Name / Business Name / Firm”. 
- Full Name ← If Full Name not shown, copy **Company Name** into Full Name. Else use “Full Name / Real-World Name”.
- First Name / Last Name ← If split names are visible, map them. If not visible, leave blank (do not invent); Full Name still required as per rule above.
- Username ← from “Username / User Name / Login / User ID”.
- Email ← from “Submission Email Id / Email / Primary Email”.
- Confirm Email ← must be **identical** to Email.
- Password ← from “Email Id Password / Submission Password / Password”.
- Confirm Password ← must be **identical** to Password (if password visible). If no password in screenshot, leave both blank.
- Phone ← from “Phone / Phone No. / Mobile / WhatsApp / Tel”. Only digits and "+" (no spaces or dashes).
- Address ← multiline street address as shown (preserve commas and line breaks merged with “, ”).
- City ← from “City / Town”.
- State ← from “State / State/Province / Region”.
- Post Code ← from “Post Code / Postal Code / PIN / ZIP”. Keep as **text** to preserve leading zeros.
- Country ← from “Country / Target Country”.
- Location ← from “Location / Area / Place / Nearest landmark” if present; else leave blank.
- Socials:
  - Facebook, Instagram, Twitter, LinkedIn, YouTube ← If you see a handle or partial, output a full URL:
    - facebook → https://facebook.com/<handle>
    - instagram → https://instagram.com/<handle>
    - twitter/X → https://x.com/<handle>
    - linkedin → if it doesn’t include “company/” or “in/”, use https://linkedin.com/in/<handle>, otherwise keep path
    - youtube → if you see @handle, use https://youtube.com/@<handle>; otherwise keep full channel/page URL
- Description ← from “Description / About / Notes / Competitors’ Domain”. Decode HTML entities (e.g., &rsquo; → ’).

🧹 Normalization & validation
- Trim extra spaces; decode HTML entities; keep Unicode punctuation (’ – …).
- Website & social links must be fully qualified (start with https://).
- Phone must contain at least 10 digits where possible; keep leading “+” if present.
- **Confirm Email = Email** and **Confirm Password = Password** exactly.
- Do NOT hallucinate. If a value is not visible, leave that cell blank.
- If multiple plausible values exist in the screenshot, pick the most specific one near the field label.

📦 Output format
- Preferred: attach a real .xlsx file named **hyperfill_profile.xlsx** with the columns above and exactly ONE data row.
- If you cannot attach .xlsx, then output a CSV **code block** with the same headers (comma-separated) and a single data row. No extra commentary.

✅ Final self-check before returning:
- Exactly 23 columns in the specified order.
- Email == Confirm Email; Password == Confirm Password (when password present).
- Links start with https:// and look valid.
- Post Code kept as text (leading zeros preserved).
- Only one data row, no extra columns or notes.

I will now provide the screenshot. Extract and deliver the file per the rules above.
 `.trim();

  $("#copyPrompt")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_TEXT);
      toast("Prompt copied ✔", "success");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = PROMPT_TEXT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("Prompt copied ✔", "success");
    }
  });

  /* -------------------- STORAGE HELPERS -------------------- */
  function saveProfile(profile) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["autofillEnabled"], (res) => {
          const current = typeof res?.autofillEnabled === "boolean" ? res.autofillEnabled : true;
          chrome.storage.local.set({ profile, autofillEnabled: current }, () => resolve());
        });
      } catch {
        resolve();
      }
    });
  }
  function loadProfile() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["profile"], (res) =>
          resolve(res?.profile || null)
        );
      } catch {
        resolve(null);
      }
    });
  }
  function loadEnabled() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["autofillEnabled"], (res) => {
          resolve(typeof res?.autofillEnabled === "boolean" ? res.autofillEnabled : true);
        });
      } catch {
        resolve(true);
      }
    });
  }
  function setEnabled(enabled) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ autofillEnabled: !!enabled }, () => resolve());
      } catch { resolve(); }
    });
  }
  function clearStore() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(["profile"], () => resolve());
      } catch {
        resolve();
      }
    });
  }

  /* -------------------- UI <-> PROFILE -------------------- */
  function setUI(p) {
    const x = (p && (p.profile || p)) || {};
    $("#website").value = x.website || "";
    $("#firstname").value = x.firstname || "";
    $("#lastname").value = x.lastname || "";
    $("#fullname").value = x.fullname || "";
    $("#username").value = x.username || "";
    $("#email").value = x.email || x.submissionEmail || "";
    $("#businessEmail").value = x.businessEmail || x.workEmail || "";
    $("#emailPassword").value = x.emailPassword || x.password || "";
    $("#submissionPassword").value = x.submissionPassword || "";
    const ap = x.activePassword || "emailPassword";
    const apInput = document.querySelector(
      `input[name="activePassword"][value="${ap}"]`
    );
    if (apInput) apInput.checked = true;

    // ✅ Phone
    $("#phone").value = x.phone || x.number || x.phoneNumber || "";

    $("#address").value = x.address || "";
    $("#city").value = x.city || "";
    $("#state").value = x.state || "";
    $("#postcode").value = x.postcode || x.zip || "";
    $("#country").value = x.country || "";
    $("#location").value = x.location || "";
    $("#facebook").value = x.facebook || "";
    $("#instagram").value = x.instagram || "";
    $("#twitter").value = x.twitter || x.x || "";
    $("#linkedin").value = x.linkedin || "";
    $("#youtube").value = x.youtube || "";

    // 🆕 New fields
    $("#title").value = x.title || x.resumeHeadLine || "";
    $("#category").value = x.category || "";
    $("#subcategory").value = x.subcategory || x.subCategory || "";

    $("#description").value = x.description || x.bio || "";
  }

  function getUI() {
    const activePassword =
      (document.querySelector('input[name="activePassword"]:checked') || {})
        .value || "emailPassword";
    return {
      profile: {
        website: $("#website").value.trim(),

        firstname: $("#firstname").value.trim(),
        lastname: $("#lastname").value.trim(),
        fullname: $("#fullname").value.trim(),
        username: $("#username").value.trim(),

        email: $("#email").value.trim(),
        submissionEmail: $("#email").value.trim(),
        businessEmail: $("#businessEmail").value.trim(),

        emailPassword: $("#emailPassword").value,
        submissionPassword: $("#submissionPassword").value,
        password: $("#emailPassword").value,
        activePassword,

        // ✅ Phone
        phone: $("#phone").value.trim(),

        address: $("#address").value.trim(),
        city: $("#city").value.trim(),
        state: $("#state").value.trim(),
        postcode: $("#postcode").value.trim(),
        country: $("#country").value.trim(),
        location: $("#location").value.trim(),

        facebook: $("#facebook").value.trim(),
        instagram: $("#instagram").value.trim(),
        twitter: $("#twitter").value.trim(),
        linkedin: $("#linkedin").value.trim(),
        youtube: $("#youtube").value.trim(),

        // 🆕 New fields
        title: $("#title").value.trim(),
        category: $("#category").value.trim(),
        subcategory: $("#subcategory").value.trim(),

        description: $("#description").value.trim(),
      },
    };
  }

  function clearUI() {
    document
      .querySelectorAll(".input, textarea")
      .forEach((el) => (el.value = ""));
    const defaultAP = document.querySelector(
      'input[name="activePassword"][value="emailPassword"]'
    );
    if (defaultAP) defaultAP.checked = true;
  }

  // Helper: Check if URL is restricted
  function isRestrictedURL(url) {
    if (!url) return true;
    return /^(chrome|chrome-extension|edge|about|moz-extension):\/\//i.test(url);
  }

  function hardFill(profile) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Check for query errors
        if (chrome.runtime.lastError) {
          console.warn("Hard fill query error:", chrome.runtime.lastError.message);
          return;
        }

        (tabs || []).forEach((t) => {
          if (!t?.id || isRestrictedURL(t.url)) {
            return; // Skip restricted pages
          }
          try {
            // First try direct message to content script
            chrome.tabs.sendMessage(
              t.id,
              { action: "runFill", profile, force: true },
              (response) => {
                // Always check for runtime errors
                const lastError = chrome.runtime.lastError;
                if (lastError) {
                  const errorMsg = lastError.message;
                  // If content script doesn't exist, use background script to inject
                  if (errorMsg.includes("Receiving end does not exist") || 
                      errorMsg.includes("Could not establish connection")) {
                    chrome.runtime.sendMessage(
                      {
                        action: "triggerFillOnActiveTab",
                        profile,
                        force: true,
                      },
                      (bgResponse) => {
                        if (chrome.runtime.lastError) {
                          console.warn("Hard fill failed:", chrome.runtime.lastError.message);
                        }
                      }
                    );
                  } else {
                    // Other errors (like chrome:// URL) - just log
                    console.warn("Hard fill error:", errorMsg);
                  }
                }
              }
            );
          } catch (err) {
            // Fallback: use background script
            try {
              chrome.runtime.sendMessage(
                {
                  action: "triggerFillOnActiveTab",
                  profile,
                  force: true,
                },
                () => {
                  if (chrome.runtime.lastError) {
                    console.warn("Hard fill failed:", chrome.runtime.lastError.message);
                  }
                }
              );
            } catch (fallbackErr) {
              console.warn("Hard fill error:", fallbackErr);
            }
          }
        });
      });
    } catch (err) {
      console.warn("Hard fill query error:", err);
    }
  }

  /* -------------------- EXCEL / CSV IMPORT (INTEGRATED) -------------------- */

  // 1) Header normalization + logical map
  const normalizeKey = (k) =>
    (k || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.\-_/]+/g, " ")
      .trim();

  const HEADMAP = {
    "website url": "website",
    website: "website",
    url: "website",

    "full name": "fullname",
    fullname: "fullname",
    name: "fullname",
    "first name": "firstname",
    firstname: "firstname",
    "given name": "firstname",
    fname: "firstname",
    "last name": "lastname",
    lastname: "lastname",
    surname: "lastname",
    lname: "lastname",
    username: "username",
    "user name": "username",
    login: "username",
    "user id": "username",
    userid: "username",

    email: "email",
    "e mail": "email",
    "primary email": "email",
    "confirm email": "email2",
    "email confirm": "email2",
    "email confirmation": "email2",

    "business email": "businessemail",
    businessemail: "businessemail",
    "business e mail": "businessemail",
    "work email": "workemail",
    workemail: "workemail",
    "office email": "workemail",
    officeemail: "workemail",

    password: "password",
    pass: "password",
    "confirm password": "password2",
    "password confirm": "password2",
    "retype password": "password2",

    phone: "phone",
    mobile: "phone",
    "mobile phone": "phone",
    whatsapp: "phone",
    tel: "phone",

    address: "address",
    "street address": "address",
    city: "city",
    town: "city",
    state: "state",
    province: "state",
    region: "state",
    postcode: "postcode",
    "postal code": "postcode",
    zip: "postcode",
    "zip code": "postcode",
    pin: "postcode",
    country: "country",
    location: "location",

    facebook: "facebook",
    "facebook url": "facebook",
    instagram: "instagram",
    "instagram url": "instagram",
    twitter: "twitter",
    x: "twitter",
    "twitter url": "twitter",
    linkedin: "linkedin",
    "linked in": "linkedin",
    youtube: "youtube",
    "youtube channel": "youtube",

    bio: "description",
    about: "description",
    description: "description",
    summary: "description",

    company: "company",

    // 🆕 New mappings
    title: "title",
    "resume headline": "title",
    headline: "title",
    category: "category",
    "job category": "category",
    "select category": "category",
    subcategory: "subcategory",
    "sub category": "subcategory",
    "job subcategory": "subcategory",
    "job sub category": "subcategory",
  };

  // 2) CSV fallback parser
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (!lines.length) return [];
    const headers = splitCSVLine(lines[0]).map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = splitCSVLine(line);
      const row = {};
      headers.forEach((h, idx) => (row[h] = (cols[idx] ?? "").trim()));
      rows.push(row);
    }
    return rows;
  }
  function splitCSVLine(line) {
    const out = [];
    let cur = "",
      inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  // 3) Row -> Profile mapping (company->fullname rule applied)
  function rowToProfile(rawRow) {
    const nk = {};
    Object.keys(rawRow || {}).forEach((k) => (nk[normalizeKey(k)] = rawRow[k]));

    const tmp = {};
    Object.keys(nk).forEach((k) => {
      const logical = HEADMAP[k];
      if (!logical) return;
      tmp[logical] = nk[k];
    });

    // If fullname missing, use company
    if ((!tmp.fullname || !String(tmp.fullname).trim()) && tmp.company) {
      tmp.fullname = tmp.company;
    }

    // Confirm mirror
    if (!tmp.email2 && tmp.email) tmp.email2 = tmp.email;
    if (!tmp.password2 && tmp.password) tmp.password2 = tmp.password;

    // Build final profile for fill.js
    const password = tmp.password || "";
    const prof = {
      profile: {
        website: (tmp.website || "").trim(),

        firstname: tmp.firstname || "",
        lastname: tmp.lastname || "",
        fullname: (tmp.fullname || "").trim(),
        username: tmp.username || "",

        email: (tmp.email || "").trim(),
        submissionEmail: (tmp.email || "").trim(),
        businessEmail: (tmp.businessemail || tmp.workemail || "").trim(),

        password,
        emailPassword: password,
        submissionPassword: tmp.password || "",
        activePassword: "emailPassword",

        // ✅ Phone wired from excel
        phone: tmp.phone || "",

        address: tmp.address || "",
        city: tmp.city || "",
        state: tmp.state || "",
        postcode: tmp.postcode || "",
        country: tmp.country || "",
        location: tmp.location || "",

        // 🆕
        title: (tmp.title || "").trim(),
        category: (tmp.category || "").trim(),
        subcategory: (tmp.subcategory || "").trim(),

        description: tmp.description || "",

        facebook: tmp.facebook || "",
        instagram: tmp.instagram || "",
        twitter: tmp.twitter || "",
        linkedin: tmp.linkedin || "",
        youtube: tmp.youtube || "",
      },
    };

    // Derive full name if still empty
    if (!prof.profile.fullname) {
      const fl = [prof.profile.firstname, prof.profile.lastname]
        .filter(Boolean)
        .join(" ")
        .trim();
      prof.profile.fullname = fl || prof.profile.username || "";
    }
    return prof;
  }

  // 4) File input handler (XLSX/CSV)
  $("#hfExcelFile")?.addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    toast(`Selected: ${f.name}`, "info");

    let rows = [];
    try {
      const buf = await f.arrayBuffer();

      if (typeof XLSX !== "undefined" && /\.xlsx?$/i.test(f.name)) {
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      } else if (/\.csv$/i.test(f.name)) {
        const text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
        rows = parseCSV(text);
      } else {
        toast("Upload .xlsx or .csv", "warn");
        return;
      }
    } catch (err) {
      console.error("Excel parse error:", err);
      toast("Parse failed. Check file.", "warn");
      return;
    }

    if (!rows.length) {
      toast("No rows found.", "warn");
      return;
    }

    // first meaningful row
    const first = rows.find((r) =>
      Object.values(r).some((v) => String(v || "").trim().length)
    );
    if (!first) {
      toast("All rows empty.", "warn");
      return;
    }

    const profile = rowToProfile(first);
    setUI(profile);
    await saveProfile(profile);
    hardFill(profile);
    toast("Imported & Hard Fill triggered", "success");
  });

  /* -------------------- AUTOFILL TOGGLE -------------------- */
  function renderToggleUI(enabled) {
    const btn = $("#toggleAutofill");
    if (!btn) return;
    btn.dataset.enabled = enabled ? "1" : "0";
    btn.innerHTML = enabled
      ? `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v10"/><circle cx="12" cy="12" r="9"/></svg> Autofill: ON`
      : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v10"/><circle cx="12" cy="12" r="9"/></svg> Autofill: OFF`;
    btn.style.borderColor = enabled ? "rgba(16,185,129,.6)" : "rgba(239,68,68,.5)";
  }

  $("#toggleAutofill")?.addEventListener("click", async () => {
    const current = await loadEnabled();
    const next = !current;
    await setEnabled(next);
    renderToggleUI(next);
    toast(next ? "Autofill enabled" : "Autofill disabled", next ? "success" : "warn");
  });

  /* -------------------- TAB TOGGLE (Autofill / Sites) -------------------- */
  function setActiveTab(tab) {
    const fill = document.getElementById("viewFill");
    const sites = document.getElementById("viewSites");
    const tabFill = document.getElementById("tabFill");
    const tabSites = document.getElementById("tabSites");
    if (!fill || !sites || !tabFill || !tabSites) return;

    if (tab === "sites") {
      fill.style.display = "none";
      sites.style.display = "block";
      tabFill.classList.remove("active");
      tabSites.classList.add("active");
    } else {
      fill.style.display = "block";
      sites.style.display = "none";
      tabFill.classList.add("active");
      tabSites.classList.remove("active");
    }
  }

  document.getElementById("tabFill")?.addEventListener("click", () => setActiveTab("fill"));
  document.getElementById("tabSites")?.addEventListener("click", () => setActiveTab("sites"));

  /* -------------------- SITE MAPPINGS (DATASET) -------------------- */
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

  async function refreshSiteMappingsCount() {
    const el = $("#siteMappingsCount");
    if (!el) return;
    const { sites } = await getSiteMappings();
    el.textContent = Array.isArray(sites) ? sites.length : 0;
  }

  $("#siteMappingsExport")?.addEventListener("click", async () => {
    const { sites } = await getSiteMappings();
    const json = JSON.stringify({ sites: sites || [], _profileKeys: "firstname, lastname, fullname, username, email, busEmail, email2, password, password2, phone, address, city, state, postcode, country, location, website, facebook, instagram, twitter, linkedin, youtube, title, company, category, subcategory, description" }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "site_mappings.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Exported site_mappings.json", "success");
  });

  $("#siteMappingsReset")?.addEventListener("click", async () => {
    try {
      await new Promise((r) => chrome.storage.local.remove(["siteMappings"], r));
      await refreshSiteMappingsCount();
      toast("Reset to data/site_mappings.json", "info");
    } catch (e) {
      toast("Reset failed", "warn");
    }
  });

  $("#siteMappingsImportBtn")?.addEventListener("click", async () => {
    const raw = $("#siteMappingsImport")?.value?.trim();
    if (!raw) { toast("Paste JSON first", "warn"); return; }
    let list = [];
    try {
      const o = JSON.parse(raw);
      list = Array.isArray(o) ? o : (o?.sites || []);
    } catch (e) {
      toast("Invalid JSON", "warn");
      return;
    }
    if (!Array.isArray(list)) { toast("Need sites array", "warn"); return; }
    try {
      await new Promise((r) => chrome.storage.local.set({ siteMappings: list }, r));
      await refreshSiteMappingsCount();
      $("#siteMappingsImport").value = "";
      toast(`Imported ${list.length} sites`, "success");
    } catch (e) {
      toast("Import failed", "warn");
    }
  });

  /* --- Sites Catalog (Opener) --- */

  let sitesCatalog = [];
  let sitesFiltered = [];
  const sitesSelected = new Set();

  function getSiteCatalog() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: "getSiteCatalog" }, (r) => {
          if (chrome.runtime?.lastError) resolve({ sites: [] });
          else resolve(r || { sites: [] });
        });
      } catch {
        resolve({ sites: [] });
      }
    });
  }

  function renderSitesFilters() {
    const catSel = document.getElementById("sitesCategory");
    const taskSel = document.getElementById("sitesTask");
    if (!catSel || !taskSel) return;

    const cats = new Set();
    const tasks = new Set();
    for (const s of sitesCatalog) {
      if (s.category) cats.add(s.category);
      if (Array.isArray(s.tasks)) s.tasks.forEach((t) => tasks.add(t));
    }

    const addOpts = (sel, values) => {
      const current = sel.value;
      sel.innerHTML = '<option value="">All</option>';
      [...values].sort().forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
      });
      if (current) sel.value = current;
    };

    addOpts(catSel, cats);
    addOpts(taskSel, tasks);
  }

  function applySitesFilters() {
    const q = (document.getElementById("sitesSearch")?.value || "").toLowerCase();
    const cat = document.getElementById("sitesCategory")?.value || "";
    const task = document.getElementById("sitesTask")?.value || "";
    const follow = document.getElementById("sitesFollow")?.value || "";
    const daMin = Number(document.getElementById("sitesDaMin")?.value || 0);
    const daMax = Number(document.getElementById("sitesDaMax")?.value || 100);

    sitesFiltered = sitesCatalog.filter((s) => {
      if (q && !(s.name || "").toLowerCase().includes(q) && !(s.url || "").toLowerCase().includes(q)) return false;
      if (cat && s.category !== cat) return false;
      if (task && (!Array.isArray(s.tasks) || !s.tasks.includes(task))) return false;
      if (follow && s.follow !== follow) return false;
      const da = Number(s.da || 0);
      if (da < daMin || da > daMax) return false;
      return true;
    });

    renderSitesTable();
  }

  function renderSitesTable() {
    const body = document.getElementById("sitesTableBody");
    const countEl = document.getElementById("sitesCount");
    const openBtn = document.getElementById("sitesOpenSelected");
    if (!body || !countEl || !openBtn) return;

    body.innerHTML = "";
    countEl.textContent = sitesFiltered.length;

    const maxSelect = 50;

    sitesFiltered.forEach((s) => {
      const tr = document.createElement("tr");
      const isChecked = sitesSelected.has(s.id);

      const tdCheck = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isChecked;
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (sitesSelected.size >= maxSelect) {
            cb.checked = false;
            toast(`Max ${maxSelect} sites ek baar me select kar sakte ho`, "warn");
            return;
          }
          sitesSelected.add(s.id);
        } else {
          sitesSelected.delete(s.id);
        }
        openBtn.disabled = sitesSelected.size === 0;
      });
      tdCheck.appendChild(cb);

      const tdName = document.createElement("td");
      tdName.textContent = s.name || s.url || s.id;

      const tdDa = document.createElement("td");
      tdDa.textContent = s.da != null ? String(s.da) : "-";

      const tdSpam = document.createElement("td");
      tdSpam.textContent = s.spamScore != null ? String(s.spamScore) : "-";

      const tdCat = document.createElement("td");
      tdCat.textContent = s.category || "-";

      const tdFollow = document.createElement("td");
      tdFollow.textContent = s.follow || "-";

      tr.appendChild(tdCheck);
      tr.appendChild(tdName);
      tr.appendChild(tdDa);
      tr.appendChild(tdSpam);
      tr.appendChild(tdCat);
      tr.appendChild(tdFollow);
      body.appendChild(tr);
    });

    openBtn.disabled = sitesSelected.size === 0;
  }

  async function initSitesOpener() {
    const { sites } = await getSiteCatalog();
    sitesCatalog = Array.isArray(sites) ? sites : [];
    renderSitesFilters();
    applySitesFilters();

    ["sitesSearch", "sitesCategory", "sitesTask", "sitesFollow", "sitesDaMin", "sitesDaMax"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const evt = id === "sitesSearch" ? "input" : "change";
      el.addEventListener(evt, () => applySitesFilters());
    });

    document.getElementById("sitesOpenSelected")?.addEventListener("click", () => {
      const selected = sitesFiltered.filter((s) => sitesSelected.has(s.id)).slice(0, 50);
      if (!selected.length) {
        toast("Pehle sites select karo", "warn");
        return;
      }
      selected.forEach((s) => {
        if (!s.url) return;
        try {
          chrome.tabs.create({ url: s.url });
        } catch {
          try {
            window.open(s.url, "_blank");
          } catch {}
        }
      });
      toast(`Opening ${selected.length} sites`, "success");
    });

    // Bulk URL opener
    const bulkBtn = document.getElementById("bulkUrlsOpen");
    const bulkInput = document.getElementById("bulkUrlsInput");
    bulkBtn?.addEventListener("click", () => {
      const raw = bulkInput?.value || "";
      const urls = extractUrls(raw).slice(0, 500);
      if (!urls.length) {
        toast("Koi valid URL nahi mila", "warn");
        return;
      }
      urls.forEach((u) => {
        try {
          chrome.tabs.create({ url: u });
        } catch {
          try {
            window.open(u, "_blank");
          } catch {}
        }
      });
      toast(`Opening ${urls.length} URLs`, "success");
    });
  }

  function extractUrls(text) {
    if (!text) return [];
    const out = [];
    const seen = new Set();
    const re = /\bhttps?:\/\/[^\s"'<>]+/gi;
    let m;
    while ((m = re.exec(text))) {
      let url = m[0];
      // Trim trailing punctuation common in text
      url = url.replace(/[),.;!]+$/g, "");
      if (!seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
    return out;
  }

  /* --- Generate mapping from form HTML --- */
  const ROLE_HINTS = [
    { role: "email2", rx: /confirm\s*email|email\s*confirm|re[- ]?enter\s*email/i },
    { role: "password2", rx: /confirm\s*pass|pass\s*confirm|re[- ]?type\s*pass|password\s*confirm/i },
    { role: "password", rx: /^(password|passwd|pwd|pass)$/i },
    { role: "email", rx: /email|e[- ]?mail|mail\s*address/i },
    { role: "busEmail", rx: /business\s*email|work\s*email|office\s*email/i },
    { role: "firstname", rx: /first\s*name|fname|given\s*name|firstname/i },
    { role: "lastname", rx: /last\s*name|lname|surname|lastname/i },
    { role: "fullname", rx: /full\s*name|display\s*name|fullname|your\s*name\b/i },
    { role: "username", rx: /user\s*name|username|login\s*id|user\s*id|userid|user[-_]?name|username_email|email\s*or\s*user/i },
    { role: "phone", rx: /phone|mobile|tel|whatsapp|contact\s*no/i },
    { role: "address", rx: /address|street|addr/i },
    { role: "city", rx: /city|town/i },
    { role: "state", rx: /state|province|region/i },
    { role: "postcode", rx: /post\s*code|postal|zip|pincode|pin\s*code/i },
    { role: "country", rx: /country/i },
    { role: "location", rx: /location|area|place/i },
    { role: "website", rx: /website|url|homepage|site\s*url/i },
    { role: "facebook", rx: /facebook|fb\s*url/i },
    { role: "instagram", rx: /instagram|insta/i },
    { role: "twitter", rx: /twitter|x\s*\.com/i },
    { role: "linkedin", rx: /linkedin|linked\s*in/i },
    { role: "youtube", rx: /youtube|yt\s*channel/i },
    { role: "title", rx: /title|headline|job\s*title/i },
    { role: "company", rx: /company|business|organization|org\s*name/i },
    { role: "category", rx: /category|cat\b/i },
    { role: "subcategory", rx: /sub\s*categ|subcat/i },
    { role: "description", rx: /description|about|bio|summary|intro/i },
  ];

  function inferRole(name, id, placeholder, type, aria) {
    const t = (type || "").toLowerCase();
    if (t === "password") {
      if (/confirm|retype|re[- ]?enter|password2/i.test([name, id, placeholder].join(" "))) return "password2";
      return "password";
    }
    const combined = [name, id, placeholder, aria].filter(Boolean).join(" ").toLowerCase();
    for (const { role, rx } of ROLE_HINTS) {
      if (rx.test(combined)) return role;
    }
    return null;
  }

  function buildSelector(el) {
    const tag = (el.tagName || "").toLowerCase();
    const id = (el.id || "").trim();
    const name = (el.name || "").trim();
    if (id && /^[a-zA-Z][\w-]*$/.test(id)) return "#" + id;
    if (name) {
      const escaped = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `${tag}[name="${escaped}"]`;
    }
    return null;
  }

  function generateMappingFromHtml(html, formSelector) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = formSelector ? doc.querySelector(formSelector) : doc.body;
    if (!root) return { mappings: {}, formSelector: formSelector || null, error: "formSelector not found or no body" };
    const els = root.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=file]), textarea, select");
    const mappings = {};
    const used = new Set();
    els.forEach((el) => {
      const sel = buildSelector(el);
      if (!sel) return;
      const role = inferRole(el.getAttribute("name"), el.id, el.getAttribute("placeholder"), el.getAttribute("type"), el.getAttribute("aria-label"));
      if (!role || used.has(role)) return;
      used.add(role);
      mappings[role] = sel;
    });
    return { mappings, formSelector: formSelector || null };
  }

  $("#htmlToMappingBtn")?.addEventListener("click", () => {
    const html = $("#htmlToMappingInput")?.value?.trim();
    if (!html) { toast("Form HTML paste karo", "warn"); return; }
    const formSel = $("#htmlToMappingFormSel")?.value?.trim() || null;
    const { mappings, formSelector, error } = generateMappingFromHtml(html, formSel || undefined);
    if (error) { $("#htmlToMappingOutput").value = JSON.stringify({ error }, null, 2); toast(error, "warn"); return; }
    const entry = {
      id: "my-site-id",
      name: "My Site — Login/Signup",
      urlPattern: "example.com",
      pathPattern: "",
      category: "Article Submission",
      spamScore: 5,
      mappings,
    };
    if (formSelector) entry.formSelector = formSelector;
    $("#htmlToMappingOutput").value = JSON.stringify(entry, null, 2);
    $("#htmlToMappingOutput").removeAttribute("readonly");
    toast(`Generated ${Object.keys(mappings).length} mappings`, "success");
  });

  $("#htmlToMappingCopy")?.addEventListener("click", () => {
    const v = $("#htmlToMappingOutput")?.value?.trim();
    if (!v) { toast("Pehle Generate karo", "warn"); return; }
    navigator.clipboard.writeText(v).then(() => toast("Copied", "success")).catch(() => toast("Copy failed", "warn"));
  });

  /* -------------------- BUTTONS -------------------- */
  $("#saveProfile")?.addEventListener("click", async () => {
    const profile = getUI();
    await saveProfile(profile);
    toast("Profile saved", "success");
  });

  $("#applyProfileOnTab")?.addEventListener("click", async () => {
    let p = await loadProfile();
    if (!p) p = getUI();
    await saveProfile(p);
    hardFill(p);
    toast("Hard Fill triggered", "success");
  });

  $("#clearAllNav")?.addEventListener("click", async () => {
    clearUI();
    await clearStore();
    toast("Cleared", "info");
  });

  /* -------------------- INIT -------------------- */
  (async function init() {
    const [saved, enabled] = await Promise.all([loadProfile(), loadEnabled()]);
    if (saved) setUI(saved);
    renderToggleUI(enabled);
    refreshSiteMappingsCount();
    setActiveTab("fill");
    await initSitesOpener();
  })();
})();
