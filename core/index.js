const CDN = "https://cdn.jsdelivr.net/gh/bladetyphoon/leek@main";

function capitalize(str) {
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const ICONS = {
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    mute: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor"/></svg>`,
    unmute: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor"/><line x1="23" y1="9" x2="17" y2="15" stroke="#e05555"/><line x1="17" y1="9" x2="23" y2="15" stroke="#e05555"/></svg>`,
    fullscreen: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    minimize: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
};

const gameSlots = {};
let activeGame = null;

function setMuteOnIframe(iframe, muted) {
    if (!iframe) return;
    try {
        const win = iframe.contentWindow;
        if (win.__masterGain__) {
            win.__masterGain__.gain.setTargetAtTime(
                muted ? 0 : 1,
                win.__masterGain__.context.currentTime,
                0.05
            );
        }
        win.document.querySelectorAll("audio,video").forEach(el => el.muted = muted);
        win.document.querySelectorAll("iframe").forEach(child => setMuteOnIframe(child, muted));
    } catch (err) {
        console.warn("Mute failed:", err);
    }
}

function getActiveIframe() {
    if (!activeGame || !gameSlots[activeGame]) return null;
    return gameSlots[activeGame].container.querySelector("iframe");
}

function initOverlay() {
    if (document.getElementById("gameOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "gameOverlay";
    overlay.className = "overlay-screen";
    overlay.innerHTML = `
        <div class="control-tray edge-right">
            <button id="closeOverlay"  class="tray-btn" title="Close">${ICONS.close}</button>
            <button id="fullscreenBtn" class="tray-btn" title="Fullscreen">${ICONS.fullscreen}</button>
            <button id="minimizeBtn"   class="tray-btn" title="Minimize">${ICONS.minimize}</button>
            <button id="muteBtn"       class="tray-btn" title="Mute">${ICONS.mute}</button>
            <button id="downloadBtn"   class="tray-btn" title="Download game">${ICONS.download}</button>
            <button id="coverBtn"      class="tray-btn" title="Cover screen">${ICONS.eyeOff}</button>
        </div>
        <div id="overlayContent"></div>
    `;
    document.body.appendChild(overlay);
    bindOverlayEvents();
}

function getOverlay() { return document.getElementById("gameOverlay"); }
function getOverlayContent() { return document.getElementById("overlayContent"); }

function showConfirm(message, showMinimize = false) {
    return new Promise(resolve => {
        const backdrop = document.createElement("div");
        backdrop.id = "confirmBackdrop";
        backdrop.innerHTML = `
            <div id="confirmBox">
                <p>${message}</p>
                <div class="confirm-btns">
                    <button id="confirmYes">Close game</button>
                    ${showMinimize ? `<button id="confirmMinimize">Minimize</button>` : ""}
                    <button id="confirmNo">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            backdrop.classList.add("show");
        }));

        function dismiss(result) {
            backdrop.classList.remove("show");
            setTimeout(() => backdrop.remove(), 250);
            resolve(result);
        }

        document.getElementById("confirmYes").addEventListener("click", () => dismiss("close"));
        document.getElementById("confirmNo").addEventListener("click", () => dismiss(false));
        if (showMinimize) {
            document.getElementById("confirmMinimize").addEventListener("click", () => dismiss("minimize"));
        }
        backdrop.addEventListener("click", e => { if (e.target === backdrop) dismiss(false); });
    });
}

function bindOverlayEvents() {
    const overlay = getOverlay();
    const overlayContent = getOverlayContent();

    const EDGES = ["edge-right", "edge-left", "edge-top", "edge-bottom"];

    let currentEdge = "edge-right";

    function setTrayEdge(edge) {
        const tray = document.querySelector(".control-tray");
        if (!tray || edge === currentEdge) return;
        currentEdge = edge;

        tray.style.transition = "none";
        EDGES.forEach(e => tray.classList.remove(e));
        tray.classList.add(edge);
        overlay.classList.remove("outside");

        tray.offsetHeight;
        
        tray.style.transition = "";
        overlay.classList.add("outside");
    }

    function detectEdge(e) {
        const vw = window.innerWidth;
        const x = e.clientX;
        const gutterH = vw * 0.05;

        const inLeft  = x < gutterH;
        const inRight = (vw - x) < gutterH;

        if (!inLeft && !inRight) return null;
        return (vw - x) <= x ? "edge-right" : "edge-left";
    }

    overlay.addEventListener("mousemove", (e) => {
        if (!overlay.classList.contains("active")) return;
        const edge = detectEdge(e);
        if (edge) setTrayEdge(edge);
    });

    overlay.addEventListener("mouseenter", () => overlay.classList.add("outside"));
    overlayContent.addEventListener("mouseenter", () => overlay.classList.remove("outside"));
    overlayContent.addEventListener("mouseleave", () => overlay.classList.add("outside"));

    document.getElementById("closeOverlay").addEventListener("click", async (e) => {
        e.stopPropagation();
        const result = await showConfirm("Are you sure you want to close the game?<br>Your progress may be lost. Minimize instead to save.", true);
        if (!result) return;

        if (result === "minimize") {
            doMinimize();
        } else {
            hideTray();
            destroyGame(activeGame);
        }
    });

    document.getElementById("muteBtn").addEventListener("click", () => {
        if (!activeGame || !gameSlots[activeGame]) return;
        const slot = gameSlots[activeGame];
        slot.isMuted = !slot.isMuted;
        setMuteOnIframe(getActiveIframe(), slot.isMuted);
        document.getElementById("muteBtn").innerHTML = slot.isMuted ? ICONS.unmute : ICONS.mute;
    });

    document.getElementById("fullscreenBtn").addEventListener("click", () => {
        const iframe = getActiveIframe();
        const target = iframe || overlayContent;
        if (target.requestFullscreen) target.requestFullscreen();
        else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
    });

    document.getElementById("minimizeBtn").addEventListener("click", doMinimize);

    document.getElementById("downloadBtn").addEventListener("click", () => {
        if (!activeGame || !gameSlots[activeGame]) return;
        const { lastGameHtml } = gameSlots[activeGame];
        if (!lastGameHtml) return;
        const blob = new Blob([lastGameHtml], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${activeGame}.html`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    document.getElementById("coverBtn").addEventListener("click", () => {
        if (document.getElementById("coverScreen")) return;

        const slot = activeGame ? gameSlots[activeGame] : null;
        const wasMutedBeforeCover = slot ? slot.isMuted : true;
        if (slot && !slot.isMuted) {
            slot.isMuted = true;
            setMuteOnIframe(getActiveIframe(), true);
            document.getElementById("muteBtn").innerHTML = ICONS.unmute;
        }

        const cover = document.createElement("div");
        cover.id = "coverScreen";
        cover.innerHTML = `
            <iframe src="https://www.google.com/search?igu=1" allowfullscreen></iframe>
            <button id="coverClose" title="Close">${ICONS.close}</button>
        `;
        document.body.appendChild(cover);
        requestAnimationFrame(() => requestAnimationFrame(() => cover.classList.add("show")));

        document.getElementById("coverClose").addEventListener("click", () => {
            if (slot && !wasMutedBeforeCover) {
                slot.isMuted = false;
                setMuteOnIframe(getActiveIframe(), false);
                document.getElementById("muteBtn").innerHTML = ICONS.mute;
            }
            cover.classList.remove("show");
            setTimeout(() => cover.remove(), 300);
        });
    });
}

function hideTray() {
    const tray = document.querySelector(".control-tray");
    if (tray) {
        tray.style.opacity = "0";
        tray.style.pointerEvents = "none";
    }
}

function restoreTray() {
    const tray = document.querySelector(".control-tray");
    if (tray) {
        tray.style.opacity = "";
        tray.style.pointerEvents = "";
    }
}

function showOverlay() {
    const overlay = getOverlay();
    overlay.classList.remove("show");
    requestAnimationFrame(() => {
        overlay.classList.add("active");
        requestAnimationFrame(() => overlay.classList.add("show"));
    });
}

function collapseOverlay() {
    getOverlay().classList.remove("show", "active", "outside");
}

function createGameSlot(game) {
    const container = document.createElement("div");
    container.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;border-radius:20px;overflow:hidden;";
    container.dataset.game = game;
    getOverlayContent().appendChild(container);

    const slot = {
        container,
        isMuted: false,
        wasMutedBeforeMinimize: false,
        lastGameHtml: "",
        minimized: false,
    };
    gameSlots[game] = slot;
    return slot;
}

function doMinimize() {
    if (!activeGame || !gameSlots[activeGame]) return;
    const game = activeGame;
    const slot = gameSlots[game];

    slot.wasMutedBeforeMinimize = slot.isMuted;
    if (!slot.isMuted) {
        slot.isMuted = true;
        setMuteOnIframe(getActiveIframe(), true);
    }

    slot.minimized = true;
    slot.container.style.display = "none";

    activeGame = null;
    hideTray();
    collapseOverlay();
    updateGameCardBadge(game, true);
    addTaskbarTab(game);
}

function destroyGame(game) {
    if (!game) return;

    collapseOverlay();

    setTimeout(() => {
        const slot = gameSlots[game];
        if (slot) {
            slot.container.remove();
            delete gameSlots[game];
        }
        if (activeGame === game) {
            activeGame = null;
            restoreTray();
        }
        updateGameCardBadge(game, false);
        removeTaskbarTab(game);
        syncMuteButton();
    }, 300);
}

function syncMuteButton() {
    const slot = activeGame && gameSlots[activeGame];
    document.getElementById("muteBtn").innerHTML =
        (slot && slot.isMuted) ? ICONS.unmute : ICONS.mute;
}

function updateGameCardBadge(game, minimized) {
    const card = document.getElementById(`game-${game}`);
    if (card) card.classList.toggle("minimized", minimized);
}

function silentlyMinimize(game) {
    const slot = gameSlots[game];
    if (!slot || slot.minimized) return;

    slot.wasMutedBeforeMinimize = slot.isMuted;
    if (!slot.isMuted) {
        slot.isMuted = true;
        setMuteOnIframe(slot.container.querySelector("iframe"), true);
    }
    slot.minimized = true;
    slot.container.style.display = "none";

    if (activeGame === game) activeGame = null;

    updateGameCardBadge(game, true);
    addTaskbarTab(game);
}

async function openGame(game) {
    if (gameSlots[game] && gameSlots[game].minimized) {
        if (activeGame && activeGame !== game) silentlyMinimize(activeGame);

        const slot = gameSlots[game];
        slot.minimized = false;
        slot.container.style.display = "";
        slot.isMuted = slot.wasMutedBeforeMinimize;
        setMuteOnIframe(slot.container.querySelector("iframe"), slot.isMuted);

        activeGame = game;
        syncMuteButton();
        updateGameCardBadge(game, false);
        removeTaskbarTab(game);
        restoreTray();
        showOverlay();
        return;
    }

    if (activeGame === game) return;
    if (activeGame) silentlyMinimize(activeGame);

    const slot = createGameSlot(game);
    activeGame = game;

    slot.container.innerHTML = `
        <div class="loading-msg">
            <div class="loading-inner">
                <span class="loading-text">Loading...</span>
                <div class="loading-bar-track">
                    <div class="loading-bar-fill" id="loadingBarFill"></div>
                </div>
            </div>
        </div>`;
    restoreTray();
    syncMuteButton();
    showOverlay();

    await new Promise(resolve => {
        getOverlayContent().addEventListener("transitionend", resolve, { once: true });
    });

    if (activeGame !== game) return;

    function setLoadProgress(pct) {
        if (activeGame !== game) return;
        const bar = document.getElementById("loadingBarFill");
        if (bar) bar.style.width = `${Math.min(100, Math.round(pct))}%`;
    }

    async function fetchWithProgress(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentLength = res.headers.get("Content-Length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (total) setLoadProgress((received / total) * 100);
            else setLoadProgress(Math.min(90, received / 5000));
        }

        const combined = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
        return new TextDecoder().decode(combined);
    }

    try {
        let html;
    
        const cdnURL = `${CDN}/games/${game}.html`;
        const githubURL = `https://raw.githubusercontent.com/bladetyphoon/leek/main/games/${game}.html`;
    
        async function fetchWithTimeout(url, timeout = 5000) {
            return Promise.race([
                fetchWithProgress(url),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Fetch timeout")), timeout)
                )
            ]);
        }
    
        try {
            html = await fetchWithTimeout(cdnURL, 1000);
        } catch (err) {
            console.warn("CDN fetch failed or timed out, falling back to GitHub:", err);
    
            setLoadProgress(0);
            html = await fetchWithProgress(githubURL);
        }

        setLoadProgress(100);

        slot.lastGameHtml = html;

        const audioPatch = `<script>
(function() {
    var OrigAC = window.AudioContext || window.webkitAudioContext;
    if (!OrigAC) return;
    window.AudioContext = window.webkitAudioContext = function() {
        var ctx = new OrigAC(...arguments);
        if (!window.__masterGain__) {
            window.__masterGain__ = ctx.createGain();
            window.__masterGain__.connect(ctx.destination);
        }
        Object.defineProperty(ctx, 'destination', {
            get: function() { return window.__masterGain__; }
        });
        return ctx;
    };
    window.AudioContext.prototype = OrigAC.prototype;
    window.webkitAudioContext.prototype = OrigAC.prototype;
})();
<\/script>`;

        if (html.includes('<head>')) {
            html = html.replace('<head>', '<head>' + audioPatch);
        } else if (html.includes('<head ')) {
            html = html.replace(/<head[^>]*>/, m => m + audioPatch);
        } else {
            html = audioPatch + html;
        }

        const iframe = document.createElement("iframe");
        iframe.allowFullscreen = true;
        iframe.style.cssText =
            "width:100%;height:100%;border:none;display:block;border-radius:20px;";
        slot.container.innerHTML = "";
        slot.container.appendChild(iframe);
        iframe.srcdoc = html;
    } catch (e) {
        if (activeGame === game) {
            slot.container.innerHTML =
                "<p style='color:red;padding:20px'>Failed to load game</p>";
        }
    }
}

function createGameImage(game) {
    const img = document.createElement("img");
    img.classList.add("bg");

    const cdnURL = `${CDN}/assets/${game}.jpeg`;
    const githubURL = `https://raw.githubusercontent.com/bladetyphoon/leek/main/assets/${game}.jpeg`;

    let fallbackTriggered = false;

    function useFallback() {
        if (fallbackTriggered) return;
        fallbackTriggered = true;

        console.warn(`Image fallback for ${game}`);
        img.src = githubURL;
    }

    const timeout = setTimeout(useFallback, 5000);

    img.onload = () => clearTimeout(timeout);

    img.onerror = () => {
        clearTimeout(timeout);
        useFallback();
    };

    img.src = cdnURL;

    return img;
}

function getTaskbar() {
    let bar = document.getElementById("taskbar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "taskbar";
        document.body.appendChild(bar);
    }
    return bar;
}

function addTaskbarTab(game) {
    const bar = getTaskbar();
    document.getElementById(`tab-${game}`)?.remove();

    const tab = document.createElement("div");
    tab.className = "taskbar-tab";
    tab.id = `tab-${game}`;
    
    const icon = createGameImage(game);
    icon.classList.add("tab-icon");

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = game;

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = "Close";

    closeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const result = await showConfirm("Close this game?<br>Your progress may be lost.");
        if (result !== "close") return;

        tab.classList.add("slide-out");
        tab.addEventListener("animationend", () => {
            tab.remove();
            recalcTabWidths();
            const slot = gameSlots[game];
            if (slot) {
                slot.container.remove();
                delete gameSlots[game];
            }
            if (activeGame === game) {
                activeGame = null;
                collapseOverlay();
                restoreTray();
                syncMuteButton();
            }
            updateGameCardBadge(game, false);
        }, { once: true });
    });

    tab.appendChild(icon);
    tab.appendChild(label);
    tab.appendChild(closeBtn);

    tab.addEventListener("click", (e) => {
        if (e.target.closest(".tab-close")) return;
        openGame(game);
    });

    bar.appendChild(tab);
    requestAnimationFrame(() => requestAnimationFrame(() => tab.classList.add("slide-in")));
    recalcTabWidths();
}

function removeTaskbarTab(game) {
    const tab = document.getElementById(`tab-${game}`);
    if (!tab) return;
    tab.classList.add("slide-out");
    tab.addEventListener("animationend", () => {
        tab.remove();
        recalcTabWidths();
    }, { once: true });
}

function recalcTabWidths() {
    const tabs = getTaskbar().querySelectorAll(".taskbar-tab");
    if (!tabs.length) return;
    const width = Math.max(80, Math.min(200, Math.floor((window.innerWidth * 0.7) / tabs.length)));
    tabs.forEach(t => t.style.width = width + "px");
}

async function loadGames() {
    const cache = localStorage.getItem("gameCache");
    if (cache) {
        const cacheJson = JSON.parse(cache);
        if (Date.now() - cacheJson.timestamp <= 60 * 60 * 1000) {
            console.log("Cache is still good.");
            return cacheJson.gameData;
        }
    }

    const LEEK_REPO = "https://api.github.com/repos/bladetyphoon/leek/git/trees/main?recursive=1";
    const leekRes = await fetch(LEEK_REPO);
    if (!leekRes.ok) { console.error("Failed to fetch Leek Repo"); return []; }

    const leekData = await leekRes.json();
    const gameFiles = [];
    for (const file of leekData.tree) {
        if (file.path.endsWith(".html") && file.path.startsWith("games/")) {
            gameFiles.push(file.path.replace("games/", "").replace(".html", ""));
        }
    }

    localStorage.setItem("gameCache", JSON.stringify({ timestamp: Date.now(), gameData: gameFiles }));
    console.log("CACHE FETCHED");
    return gameFiles;
}

function renderGames(gameData) {
    const gameList = document.getElementById("games");
    gameList.innerHTML = "";

    if (gameData.length === 0) {
        const msg = document.createElement("p");
        msg.className = "no-results";
        msg.textContent = "No games found.";
        gameList.appendChild(msg);
        return;
    }

    for (const game of gameData) {
        const div = document.createElement("div");
        div.classList.add("game");
        div.id = `game-${game}`;

        if (gameSlots[game]?.minimized) div.classList.add("minimized");

        const img = createGameImage(game);

        const title = document.createElement("p");
        title.classList.add("overlay");
        title.textContent = game;

        div.appendChild(img);
        div.appendChild(title);
        div.addEventListener("click", () => openGame(game));
        gameList.appendChild(div);
    }
}

async function initPage() {
    initOverlay();

    const cache = localStorage.getItem("gameCache");
    let gameData = [];
    if (cache) {
        const cacheJson = JSON.parse(cache);
        if (Date.now() - cacheJson.timestamp >= 60 * 60 * 1000) {
            console.log("Cached game data 1 hour old, refetching...");
            gameData = await loadGames();
        } else {
            console.log("Using cached game data.");
            gameData = cacheJson.gameData || [];
        }
    }
    if (gameData.length === 0) {
        console.log("Cached game does not exist. Fetching...");
        gameData = await loadGames();
    }
    renderGames(gameData);

    const searchInput = document.getElementById("search");
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query
            ? gameData.filter(g => g.toLowerCase().includes(query))
            : gameData;
        renderGames(filtered);
    });

    const REFRESH_COOLDOWN = 60;
    const COOLDOWN_KEY = "refreshCooldownUntil";
    const refreshBtn = document.getElementById("refreshBtn");
    let countdownInterval = null;

    function runCooldownUI(until) {
        clearInterval(countdownInterval);
        refreshBtn.disabled = true;

        countdownInterval = setInterval(() => {
            const remaining = Math.ceil((until - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                refreshBtn.disabled = false;
                refreshBtn.title = "Refresh game list";
                refreshBtn.querySelector(".refresh-countdown")?.remove();
                refreshBtn.querySelector("svg").style.opacity = "";
            } else {
                refreshBtn.title = `Refresh available in ${remaining}s`;
                let badge = refreshBtn.querySelector(".refresh-countdown");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "refresh-countdown";
                    refreshBtn.appendChild(badge);
                    refreshBtn.querySelector("svg").style.opacity = "0.35";
                }
                badge.textContent = remaining;
            }
        }, 250);
    }

    const savedUntil = parseInt(localStorage.getItem(COOLDOWN_KEY) || "0", 10);
    if (savedUntil > Date.now()) runCooldownUI(savedUntil);

    refreshBtn.addEventListener("click", async () => {
        if (refreshBtn.disabled) return;
        refreshBtn.classList.add("spinning");
        refreshBtn.disabled = true;

        localStorage.removeItem("gameCache");
        try {
            gameData = await loadGames();
            const query = searchInput.value.trim().toLowerCase();
            renderGames(query ? gameData.filter(g => g.toLowerCase().includes(query)) : gameData);
        } catch (e) {
            console.error("Refresh failed:", e);
        }

        refreshBtn.classList.remove("spinning");
        const until = Date.now() + REFRESH_COOLDOWN * 1000;
        localStorage.setItem(COOLDOWN_KEY, until);
        runCooldownUI(until);
    });
}

initPage();
window.addEventListener("resize", recalcTabWidths);
