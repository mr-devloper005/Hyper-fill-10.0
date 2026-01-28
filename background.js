// 

// Default: Chrome khud icon click par panel khole
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn("Panel behavior setup failed:", err));

  chrome.contextMenus.create({
    id: "open_hyperfill_panel",
    title: "Open HyperFill Panel",
    contexts: ["all"],
  });
});

// Context menu → panel
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open_hyperfill_panel" && tab?.id) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "panel.html",
        enabled: true,
      });
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {
      console.warn("ContextMenu panel open failed:", err);
    }
  }
});

// Backup: icon click par manual open bhi try kar lo (restricted pages skip)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab || !tab.id || /^chrome:\/\//i.test(tab.url || "")) {
      console.warn("Cannot open side panel on restricted page:", tab?.url);
      return;
    }
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "panel.html",
      enabled: true,
    });
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (e) {
    console.warn("SidePanel manual open failed:", e);
  }
});

// Helper: Check if URL is restricted
function isRestrictedURL(url) {
  if (!url) return true;
  return /^(chrome|chrome-extension|edge|about|moz-extension):\/\//i.test(url);
}

// ---------- Site Mappings (dataset): JSON + storage override ----------
// getSiteMappings: pehle data/site_mappings.json se default, agar storage.siteMappings hai to wo use
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "getSiteMappings") {
    fetch(chrome.runtime.getURL("data/site_mappings.json"))
      .then((r) => r.json())
      .then((data) => {
        let sites = data?.sites || [];
        chrome.storage.local.get(["siteMappings"], (r) => {
          if (Array.isArray(r?.siteMappings) && r.siteMappings.length) sites = r.siteMappings;
          sendResponse({ sites });
        });
      })
      .catch(() => sendResponse({ sites: [] }));
    return true;
  }

  // ---------- Sites Catalog (opener) ----------
  // getSiteCatalog: data/sites_catalog.json se sites list
  if (msg?.action === "getSiteCatalog") {
    fetch(chrome.runtime.getURL("data/sites_catalog.json"))
      .then((r) => r.json())
      .then((data) => {
        const sites = Array.isArray(data?.sites) ? data.sites : [];
        sendResponse({ sites });
      })
      .catch(() => sendResponse({ sites: [] }));
    return true;
  }

  if (msg?.action === "triggerFillOnActiveTab") {
    const { force, profile } = msg;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Check for query errors
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      const tab = tabs?.[0];
      if (!tab?.id || isRestrictedURL(tab.url)) {
        sendResponse({ ok: false, error: "Blocked URL (cannot inject)" });
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { action: "autofill", profile, force },
        (resp) => {
          // Check for sendMessage errors
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            // If content script doesn't exist, inject it
            if (errorMsg.includes("Receiving end does not exist") || 
                errorMsg.includes("Could not establish connection")) {
              chrome.scripting.executeScript(
                {
                  target: { tabId: tab.id, allFrames: true },
                  files: ["content/fill.js"],
                },
                () => {
                  // Check for injection errors
                  if (chrome.runtime.lastError) {
                    sendResponse({ 
                      ok: false, 
                      error: `Injection failed: ${chrome.runtime.lastError.message}` 
                    });
                    return;
                  }
                  // Retry after injection
                  setTimeout(() => {
                    chrome.tabs.sendMessage(
                      tab.id,
                      { action: "autofill", profile, force },
                      (retryResp) => {
                        if (chrome.runtime.lastError) {
                          sendResponse({ 
                            ok: false, 
                            error: chrome.runtime.lastError.message 
                          });
                        } else {
                          sendResponse(retryResp || { ok: false, filled: 0 });
                        }
                      }
                    );
                  }, 300);
                }
              );
            } else {
              sendResponse({ ok: false, error: errorMsg });
            }
          } else if (resp) {
            sendResponse(resp);
          } else {
            sendResponse({ ok: false, filled: 0 });
          }
        }
      );
    });

    return true; // async
  }
});