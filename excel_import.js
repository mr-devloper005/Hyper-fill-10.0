// popup/excel_import.js
(() => {
  const fileInput = document.querySelector("[data-hf-excel], #hfExcelFile");
  if (!fileInput) return;

  const normalizeKey = (k) =>
    (k || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.\-_/]+/g, " ")
      .trim();

  // RankFiller synonyms + general headers
  const HEADMAP = {
    // names
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
    // username
    username: "username",
    "user name": "username",
    "user id": "username",
    userid: "username",
    login: "username",
    // emails (Submission Email Id → email)
    email: "email",
    "e mail": "email",
    "primary email": "email",
    "submission email id": "email",
    "submission email": "email",
    "confirm email": "email2",
    "email confirm": "email2",
    "email confirmation": "email2",
    // password (Email Id Password → password)
    password: "password",
    pass: "password",
    "email id password": "password",
    "email password": "password",
    "confirm password": "password2",
    "password confirm": "password2",
    "retype password": "password2",
    // phone
    phone: "phone",
    mobile: "phone",
    "mobile phone": "phone",
    whatsapp: "phone",
    tel: "phone",
    // web
    "website url": "website",
    website: "website",
    url: "website",
    homepage: "website",
    portfolio: "website",
    // address
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
    area: "location",
    // socials
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
    // misc
    bio: "description",
    about: "description",
    description: "description",
    summary: "description",
    // company → fullname (we'll copy below if fullname empty)
    "company name": "company",
    company: "company",
  };

  function parseCSV(text) {
    const rows = [];
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (!lines.length) return rows;
    const headers = splitCSVLine(lines[0]).map((h) => h.trim());
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
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function rowToProfile(rawRow) {
    const nk = {};
    Object.keys(rawRow || {}).forEach((k) => (nk[normalizeKey(k)] = rawRow[k]));

    const tmp = {};
    Object.keys(nk).forEach((k) => {
      const logical = HEADMAP[k];
      if (logical) tmp[logical] = nk[k];
    });

    // Company → Fullname (if fullname empty)
    if ((!tmp.fullname || !String(tmp.fullname).trim()) && tmp.company) {
      tmp.fullname = tmp.company;
    }

    const password = tmp.password || "";
    const prof = {
      profile: {
        firstname: tmp.firstname || "",
        lastname: tmp.lastname || "",
        fullname: (tmp.fullname || "").trim(),
        username: tmp.username || "",
        email: (tmp.email || "").trim(),
        submissionEmail: (tmp.email || "").trim(),
        // both password buckets for compatibility
        password,
        emailPassword: password,
        submissionPassword: password,
        activePassword: "emailPassword",

        phone: tmp.phone || "",
        website: tmp.website || "",
        address: tmp.address || "",
        city: tmp.city || "",
        state: tmp.state || "",
        postcode: tmp.postcode || "",
        country: tmp.country || "",
        location: tmp.location || "",
        description: tmp.description || "",

        facebook: tmp.facebook || "",
        instagram: tmp.instagram || "",
        twitter: tmp.twitter || "",
        linkedin: tmp.linkedin || "",
        youtube: tmp.youtube || "",
      },
    };

    if (!prof.profile.fullname) {
      const fl = [prof.profile.firstname, prof.profile.lastname]
        .filter(Boolean)
        .join(" ")
        .trim();
      prof.profile.fullname = fl || prof.profile.username || "";
    }
    return prof;
  }

  // Helper: Check if URL is restricted
  function isRestrictedURL(url) {
    if (!url) return true;
    return /^(chrome|chrome-extension|edge|about|moz-extension):\/\//i.test(url);
  }

  async function saveAndFill(profile) {
    await new Promise((resolve) => {
      try {
        chrome.storage.local.set({ profile, autofillEnabled: true }, () =>
          resolve()
        );
      } catch {
        resolve();
      }
    });
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Check for query errors
        if (chrome.runtime.lastError) {
          console.warn("Excel import fill query error:", chrome.runtime.lastError.message);
          return;
        }

        (tabs || []).forEach((t) => {
          if (!t?.id || isRestrictedURL(t.url)) {
            return; // Skip restricted pages
          }
          try {
            chrome.tabs.sendMessage(
              t.id,
              { action: "runFill", profile, force: true },
              (response) => {
                // Check for runtime errors
                if (chrome.runtime.lastError) {
                  const errorMsg = chrome.runtime.lastError.message;
                  // If content script doesn't exist, use background script to inject
                  if (errorMsg.includes("Receiving end does not exist") || 
                      errorMsg.includes("Could not establish connection")) {
                    chrome.runtime.sendMessage(
                      {
                        action: "triggerFillOnActiveTab",
                        profile,
                        force: true,
                      },
                      () => {
                        if (chrome.runtime.lastError) {
                          console.warn("Excel import fill failed:", chrome.runtime.lastError.message);
                        }
                      }
                    );
                  } else {
                    console.warn("Excel import fill error:", errorMsg);
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
                    console.warn("Excel import fill failed:", chrome.runtime.lastError.message);
                  }
                }
              );
            } catch (fallbackErr) {
              console.warn("Excel import fill error:", fallbackErr);
            }
          }
        });
      });
    } catch (err) {
      console.warn("Excel import fill query error:", err);
    }
  }

  fileInput.addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const buf = await f.arrayBuffer().catch(() => null);
    if (!buf) return;

    let rows = [];
    try {
      if (typeof XLSX !== "undefined" && /\.xlsx?$/i.test(f.name)) {
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      } else if (/\.csv$/i.test(f.name)) {
        const text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
        rows = parseCSV(text);
      } else {
        alert("Please upload .xlsx (with xlsx.full.min.js) or .csv file.");
        return;
      }
    } catch (err) {
      console.error("Excel parse error:", err);
      alert("Failed to parse the file. Please check the format.");
      return;
    }

    if (!rows.length) {
      alert("No rows found in the first sheet.");
      return;
    }
    const first = rows.find((r) =>
      Object.values(r).some((v) => String(v || "").trim().length)
    );
    if (!first) {
      alert("All rows are empty.");
      return;
    }

    const profile = rowToProfile(first);
    await saveAndFill(profile);
    console.log("[HF] Imported profile from Excel and triggered fill.");
  });
})();
