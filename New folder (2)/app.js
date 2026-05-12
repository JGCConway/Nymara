// ── D&D Races ───────────────────────────────────────────────────────────────
const ALL_DND_RACES = [
  { group: "Core (PHB)", races: ["Dragonborn", "Dwarf", "Elf", "Gnome", "Half-Elf", "Half-Orc", "Halfling", "Human", "Tiefling"] },
  { group: "Multiverse & Expansions", races: ["Aasimar", "Bugbear", "Centaur", "Changeling", "Dhampir", "Fairy", "Firbolg", "Genasi (Air)", "Genasi (Earth)", "Genasi (Fire)", "Genasi (Water)", "Goblin", "Goliath", "Harengon", "Hexblood", "Hobgoblin", "Kalashtar", "Kenku", "Kobold", "Leonin", "Lizardfolk", "Loxodon", "Minotaur", "Orc", "Owlin", "Reborn", "Satyr", "Shifter", "Simic Hybrid", "Tabaxi", "Triton", "Vedalken", "Warforged", "Yuan-Ti Pureblood"] },
];
const ALL_RACE_NAMES = ALL_DND_RACES.flatMap(g => g.races);

// ── State ──────────────────────────────────────────────────────────────────
let selected = CITIES[0];
let selectedType = "city"; // "city"|"landmark"|"dungeon"
let currentTab = "Overview";
let detailItem = null; // { type, item }
let detailIdx = 0;
let currentPage = "locations";
let selectedMagicItemId = null;
let factionFilterType = "all";
let factionFilterCityId = "all";
let storeFilterType = "all";
let storeFilterCityId = "all";
let shipFilterType = "all";
let magicItemFilterType = "all";
let magicItemFilterRarity = "all";
let locationFilterType = "all";
let npcFilterProfession = "all";
let npcFilterFaction = "all";
let npcEditorState = null;

// localStorage helpers
function lsGet(key, fallback) {
  try { const v = localStorage.getItem("atlas:" + key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem("atlas:" + key, JSON.stringify(val)); } catch {}
}

// Persisted state
let customLocations = lsGet("customLocations", []);
let notes = lsGet("notes", {});           // { "cityId:itemName:idx": "text" }
let instanceNames = lsGet("names", {});   // { "cityId:itemName:idx": "custom name" }
let loreEdits = lsGet("lore", {});        // { "cityId": [...] }
let magicItems = lsGet("magicItems", []); // [{ id, name, type, rarity, description, properties, notes }]

function saveNotes() { lsSet("notes", notes); }
function saveNames() { lsSet("names", instanceNames); }
function saveLoreEdits() { lsSet("lore", loreEdits); }
function saveCustomLocations() { lsSet("customLocations", customLocations); }
function saveMagicItems() { lsSet("magicItems", magicItems); }
let factionLinks = lsGet("factionLinks", []); // [{ id, name, notes, assignments:[{ cityId, type }] }]
function saveFactionLinks() { lsSet("factionLinks", factionLinks); }
let storeLinks = lsGet("storeLinks", []); // [{ id, name, notes, assignments:[{ cityId }] }]
function saveStoreLinks() { lsSet("storeLinks", storeLinks); }
let shipLinks = lsGet("shipLinks", []); // [{ id, name, type, totalHealth, currentHealth, averageCost, passengerCapacity, cargoCapacity, speed, actions, hull, helm, sails, ballista, cannons, navalRam, additionalNotes }]
function saveShipLinks() { lsSet("shipLinks", shipLinks); }
let npcLinks = lsGet("npcLinks", []); // [{ id, name, age, totalHealth, currentHealth, race, profession, faction, store, alignment, appearance, str, dex, con, int, wis, cha, combat }]
function saveNpcLinks() { lsSet("npcLinks", npcLinks); }
let pcLinks = lsGet("pcLinks", []);
function savePcLinks() { lsSet("pcLinks", pcLinks); }
let pcEditorState = null;
let cityFavorites = lsGet("cityFavorites", {}); // { [cityId]: true }
function saveCityFavorites() { lsSet("cityFavorites", cityFavorites); }
let settingsAllowedRaces = lsGet("settingsAllowedRaces", ALL_RACE_NAMES);
function saveSettings() { lsSet("settingsAllowedRaces", settingsAllowedRaces); }

// ── Favorites ───────────────────────────────────────────────────────────────
const SVG_FAV_OFF = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;
const SVG_FAV_ON  = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="m438-400 198-198-57-56-141 141-57-57-57 57 114 113ZM200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;

function favBtnHtml(isFav, onclickStr) {
  return `<button class="fav-btn${isFav ? " fav-active" : ""}" onclick="${onclickStr}" title="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? SVG_FAV_ON : SVG_FAV_OFF}</button>`;
}
function _applyFavBtn(btn, isFav) {
  btn.classList.toggle("fav-active", isFav);
  btn.innerHTML = isFav ? SVG_FAV_ON : SVG_FAV_OFF;
  btn.title = isFav ? "Remove from favorites" : "Add to favorites";
}
function toggleFavLocation(id, btn) {
  const loc = customLocations.find(l => String(l.id) === String(id));
  if (!loc) return;
  loc.favorited = !loc.favorited; saveCustomLocations(); _applyFavBtn(btn, loc.favorited);
}
function toggleFavMagicItem(id, btn) {
  const item = magicItems.find(i => i.id === id);
  if (!item) return;
  item.favorited = !item.favorited; saveMagicItems(); _applyFavBtn(btn, item.favorited);
}
function toggleFavFaction(id, btn) {
  const f = factionLinks.find(f => f.id === id);
  if (!f) return;
  f.favorited = !f.favorited; saveFactionLinks(); _applyFavBtn(btn, f.favorited);
}
function toggleFavStore(id, btn) {
  const s = storeLinks.find(s => s.id === id);
  if (!s) return;
  s.favorited = !s.favorited; saveStoreLinks(); _applyFavBtn(btn, s.favorited);
}
function toggleFavShip(id, btn) {
  const s = shipLinks.find(s => s.id === id);
  if (!s) return;
  s.favorited = !s.favorited; saveShipLinks(); _applyFavBtn(btn, s.favorited);
}
function toggleFavNpc(id, btn) {
  const n = npcLinks.find(n => n.id === id);
  if (!n) return;
  n.favorited = !n.favorited; saveNpcLinks(); _applyFavBtn(btn, n.favorited);
}
function toggleFavPc(id, btn) {
  const p = pcLinks.find(p => p.id === id);
  if (!p) return;
  p.favorited = !p.favorited; savePcLinks(); _applyFavBtn(btn, p.favorited);
}
function toggleFavCity(id, btn) {
  const numId = typeof id === "string" ? parseInt(id) : id;
  cityFavorites[numId] = !cityFavorites[numId];
  if (!cityFavorites[numId]) delete cityFavorites[numId];
  saveCityFavorites(); _applyFavBtn(btn, !!cityFavorites[numId]);
}

// Note key helpers
function noteKey(cityId, itemName, idx) { return `${cityId}:${itemName}:${idx}`; }
function getNote(cityId, itemName, idx) { return notes[noteKey(cityId, itemName, idx)] || ""; }
function setNote(cityId, itemName, idx, val) { notes[noteKey(cityId, itemName, idx)] = val; saveNotes(); }
function hasAnyNote(cityId, itemName, count) {
  for (let i = 0; i < count; i++) if (getNote(cityId, itemName, i).trim()) return true;
  return false;
}

function nameKeyStr(cityId, itemName, idx) { return `${cityId}:${itemName}:${idx}`; }
function getInstanceName(cityId, itemName, idx, def) { return instanceNames[nameKeyStr(cityId, itemName, idx)] ?? def; }
function setInstanceName(cityId, itemName, idx, val) { instanceNames[nameKeyStr(cityId, itemName, idx)] = val; saveNames(); }

function getLore(cityId) {
  if (loreEdits[cityId]) return loreEdits[cityId];
  const city = allLocations().find(c => c.id === cityId);
  return city?.lore || [];
}
function setLore(cityId, arr) { loreEdits[cityId] = arr; saveLoreEdits(); }

function allLocations() { return [...CITIES, ...customLocations]; }

function getLocationById(cityId) {
  return allLocations().find(c => c.id === cityId);
}

function parseCityId(value) {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function getAllFactionGroups() {
  return factionLinks.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function getFactionLinkByName(name) {
  return factionLinks.find(f => f.name === name);
}

function getFactionLinkById(id) {
  return factionLinks.find(f => f.id === id);
}

function getCustomFactionAssignmentsForCity(cityId) {
  return factionLinks.map(f => {
    const assignment = f.assignments.find(a => a.cityId === cityId);
    return assignment ? { name: f.label || f.name || "Unknown Faction", baseType: f.type, type: f.type || assignment.type || "neutral" } : null;
  }).filter(Boolean);
}

function factionMatchesBaseName(faction, baseName) {
  return faction.label === baseName || faction.type === baseName || faction.name === baseName;
}

function getCityFactions(cityId) {
  const city = getLocationById(cityId);
  const base = city?.factions ? city.factions.map(f => ({ name: f.name, count: f.count, type: f.type })) : [];
  const map = new Map();
  for (const f of base) {
    const customInstances = factionLinks
      .filter(faction => factionMatchesBaseName(faction, f.name))
      .flatMap(faction => faction.assignments.filter(a => a.cityId === cityId).map(a => a.instanceIdx))
      .filter(idx => idx != null);
    const maxCustomInstance = customInstances.length > 0 ? Math.max(...customInstances) : -1;
    const count = Math.max(f.count, maxCustomInstance + 1);
    map.set(f.name, { name: f.name, count, type: f.type });
  }
  // Also add custom factions that don't overlap with any base entry
  const custom = getCustomFactionAssignmentsForCity(cityId);
  for (const f of custom) {
    if (!map.has(f.name) && !map.has(f.baseType)) {
      const customInstances = factionLinks
        .filter(faction => factionMatchesBaseName(faction, f.name) || factionMatchesBaseName(faction, f.baseType))
        .flatMap(faction => faction.assignments.filter(a => a.cityId === cityId).map(a => a.instanceIdx))
        .filter(idx => idx != null);
      const maxCustomInstance = customInstances.length > 0 ? Math.max(...customInstances) : -1;
      const count = Math.max(1, maxCustomInstance + 1);
      map.set(f.name, { name: f.name, count, type: f.type });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getKnownFactionNames() {
  const names = new Set();
  for (const city of allLocations()) {
    for (const faction of city.factions || []) {
      if (faction.name) names.add(faction.name);
    }
  }
  for (const faction of factionLinks) {
    const value = faction.type || faction.name;
    if (value) names.add(value);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

let storeEditorState = null;
let shipEditorState = null;

function getAllStoreGroups() {
  return storeLinks.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function getStoreLinkByName(name) {
  return storeLinks.find(s => s.name === name);
}

function getStoreLinkById(id) {
  return storeLinks.find(s => s.id === id);
}

function getKnownStoreNames() {
  const names = new Set();
  for (const city of allLocations()) {
    for (const shop of city.shops || []) {
      names.add(shop.name);
    }
  }
  for (const store of storeLinks) {
    names.add(store.name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function getCustomStoreAssignmentsForCity(cityId) {
  return storeLinks.map(s => {
    const assignment = s.assignments.find(a => a.cityId === cityId);
    return assignment ? { name: s.name } : null;
  }).filter(Boolean);
}

function getCityShops(cityId) {
  const city = getLocationById(cityId);
  const base = city?.shops ? city.shops.map(s => ({ name: s.name, count: s.count })) : [];
  const map = new Map();
  for (const shop of base) {
    // Find max instanceIdx for this shop type
    const customInstances = storeLinks
      .filter(s => s.type === shop.name)
      .flatMap(s => s.assignments.filter(a => a.cityId === cityId).map(a => a.instanceIdx))
      .filter(idx => idx != null);
    const maxCustomInstance = customInstances.length > 0 ? Math.max(...customInstances) : -1;
    const count = Math.max(shop.count, maxCustomInstance + 1);
    map.set(shop.name, { name: shop.name, count });
  }
  // Also surface custom store links assigned to this city with no matching base entry
  const seenTypes = new Set();
  for (const store of storeLinks) {
    if (!store.assignments.some(a => a.cityId === cityId)) continue;
    if (map.has(store.type) || seenTypes.has(store.type)) continue;
    seenTypes.add(store.type);
    const allInstances = storeLinks
      .filter(s => s.type === store.type)
      .flatMap(s => s.assignments.filter(a => a.cityId === cityId).map(a => a.instanceIdx))
      .filter(idx => idx != null);
    const maxInstance = allInstances.length > 0 ? Math.max(...allInstances) : -1;
    map.set(store.type, { name: store.type, count: maxInstance + 1 });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

let factionEditorState = null;

function openFactionEditor(name) {
  const group = getAllFactionGroups().find(g => g.name === name) || { name: "", assignments: [] };
  const existingLink = getFactionLinkByName(name);
  const type = existingLink?.type || group.type || group.assignments[0]?.type || group.name || "neutral";
  const label = existingLink?.label || existingLink?.name || group.name || type || "New Faction";
  factionEditorState = {
    id: existingLink?.id || null,
    type,
    label,
    assignments: existingLink?.assignments || group.assignments.map(a => ({ cityId: a.cityId, type: a.type || type })),
    notes: existingLink?.notes || "",
  };
  // Migrate old assignments without instanceIdx
  factionEditorState.assignments.forEach(assignment => {
    if (assignment.instanceIdx == null) {
      assignment.instanceIdx = getNextAvailableInstanceForFaction(assignment.cityId, type);
    }
  });
}

function buildFactionSaveState() {
  const state = {
    id: factionEditorState.id,
    type: factionEditorState.type?.trim() || "",
    label: factionEditorState.label?.trim() || "",
    assignments: [],
    notes: factionEditorState.notes || ""
  };
  const selectedType = document.getElementById("faction-type-select")?.value;
  const label = document.getElementById("faction-label-input")?.value.trim();
  state.type = selectedType || state.type;
  state.label = label || state.type;
  if (!state.type) return null;
  const assignmentRows = document.querySelectorAll("[data-assignment-row]");
  for (const row of assignmentRows) {
    const citySelect = row.querySelector("[data-city-select]");
    const typeSelect = row.querySelector("[data-type-select]");
    if (!citySelect || !typeSelect) continue;
    const cityId = parseCityId(citySelect.value);
    const type = typeSelect.value;
    if (!cityId) continue;
    const existing = state.assignments.find(a => a.cityId === cityId);
    if (existing) {
      existing.type = type;
    } else {
      const existingAssignment = factionEditorState.assignments.find(a => a.cityId === cityId);
      const instanceIdx = existingAssignment?.instanceIdx ?? getNextAvailableInstanceForFaction(cityId, state.type);
      state.assignments.push({ cityId, type, instanceIdx });
    }
  }
  return state.assignments.length ? state : null;
}

function saveCurrentFactionState() {
  const saved = buildFactionSaveState();
  if (!saved) return false;
  if (factionEditorState.id) {
    const idx = factionLinks.findIndex(f => f.id === factionEditorState.id);
    if (idx >= 0) {
      factionLinks[idx] = { id: factionEditorState.id, type: saved.type, label: saved.label, name: saved.label, assignments: saved.assignments, notes: saved.notes };
    } else {
      factionLinks.push({ id: factionEditorState.id, type: saved.type, label: saved.label, name: saved.label, assignments: saved.assignments, notes: saved.notes });
    }
  } else {
    factionLinks.push({ id: `faction-${Date.now()}`, type: saved.type, label: saved.label, name: saved.label, assignments: saved.assignments, notes: saved.notes });
  }
  saveFactionLinks();
  return true;
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  renderHeader();
  renderSidebar();
  renderMain();
  renderHotbar();
}

function renderHeader() {
  const header = document.getElementById("header");
  let title = "The World of Nymara";
  let subtitle = "Mountainous Rainforest Islands — Campaign Reference";
  let countText = "";
  if (currentPage === "locations") {
    countText = `${allLocations().length} locations charted`;
  } else if (currentPage === "magicItems") {
    countText = `${magicItems.length} magic items cataloged`;
  } else if (currentPage === "factions") {
    const factionCount = getAllFactionGroups().length;
    countText = `${factionCount} factions across ${allLocations().length} locations`;
  } else if (currentPage === "stores") {
    const storeCount = getAllStoreGroups().length;
    countText = `${storeCount} stores across ${allLocations().length} locations`;
  } else if (currentPage === "ships") {
    countText = `${shipLinks.length} ships cataloged`;
  } else if (currentPage === "npcs") {
    countText = `${npcLinks.length} NPC${npcLinks.length === 1 ? "" : "s"} cataloged`;
  } else if (currentPage === "pcs") {
    countText = `${pcLinks.length} player character${pcLinks.length === 1 ? "" : "s"}`;
  } else if (currentPage === "home") {
    countText = "";
  } else if (currentPage === "settings") {
    countText = "";
  } else {
    countText = "";
  }
  header.innerHTML = `
    <div>
      <h1>${title}</h1>
      ${countText ? `<span id="location-count">${countText}</span>` : ""}
    </div>
    <p class="subtitle">${subtitle}</p>
  `;
}

function renderHotbar() {
  document.querySelectorAll(".hotbar-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`hotbar-${currentPage}`);
  if (activeBtn) activeBtn.classList.add("active");
}

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (currentPage === "locations") {
    sidebar.style.display = "";
    const locTypeOptions = [
      { value: "all", label: "All locations" },
      { value: "city", label: "Cities & Towns" },
      { value: "landmark", label: "Landmarks & Ruins" },
      { value: "dungeon", label: "Dungeons" },
    ];
    sidebar.innerHTML = `
      <p class="sidebar-label">Locations</p>
      <div style="padding:0 1rem; margin-bottom:0.75rem;">
        <select id="sidebar-loc-type-filter" class="edit-input" style="width:100%">
          ${locTypeOptions.map(o => `<option value="${o.value}"${o.value === locationFilterType ? " selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </div>
      <div id="city-list"></div>
      <div id="custom-list-section" style="display:none">
        <div class="sidebar-divider"></div>
        <p class="sidebar-label">Custom</p>
        <div id="custom-list"></div>
      </div>
      <div class="sidebar-add">
        <button id="btn-add-location" class="btn-add">+ Add Location</button>
      </div>
    `;
    const locTypeFilter = document.getElementById("sidebar-loc-type-filter");
    if (locTypeFilter) locTypeFilter.onchange = () => { locationFilterType = locTypeFilter.value; render(); };

    const cityList = document.getElementById("city-list");
    cityList.innerHTML = "";
    const showBuiltIn = locationFilterType === "all" || locationFilterType === "city";
    if (showBuiltIn) {
      // Sort cities: Large > Moderate > Small, by id
      const sorted = [...CITIES].sort((a, b) => {
        const order = { "Large City": 0, "Moderate Town/Village": 1, "Small Village": 2 };
        const ao = order[a.size] ?? 3, bo = order[b.size] ?? 3;
        if (ao !== bo) return ao - bo;
        return a.id - b.id;
      });
      for (const city of sorted) {
        cityList.appendChild(makeSidebarBtn(city, "city"));
      }
    }

    const customSection = document.getElementById("custom-list-section");
    const customList = document.getElementById("custom-list");
    const filteredCustom = locationFilterType === "all"
      ? customLocations
      : customLocations.filter(loc => loc.kind === locationFilterType);
    if (filteredCustom.length > 0) {
      customSection.style.display = "";
      customList.innerHTML = "";
      for (const loc of filteredCustom) {
        customList.appendChild(makeSidebarBtn(loc, loc.kind));
      }
    } else {
      customSection.style.display = "none";
    }
  } else if (currentPage === "magicItems") {
    sidebar.style.display = "";
    const itemTypes = ["all", "Weapon", "Armor", "Wondrous Item", "Consumable", "Potion", "Ring", "Staff", "Rod"];
    const rarities = ["all", "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];
    sidebar.innerHTML = `
      <p class="sidebar-label">Magic Items</p>
      <div style="padding:0 1rem; display:grid; gap:0.75rem; margin-bottom:0.75rem;">
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Type</div>
          <select id="sidebar-magic-type-filter" class="edit-input" style="width:100%">
            ${itemTypes.map(t => `<option value="${esc(t)}"${t === magicItemFilterType ? " selected" : ""}>${t === "all" ? "All types" : esc(t)}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Rarity</div>
          <select id="sidebar-magic-rarity-filter" class="edit-input" style="width:100%">
            ${rarities.map(r => `<option value="${esc(r)}"${r === magicItemFilterRarity ? " selected" : ""}>${r === "all" ? "All rarities" : esc(r)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="sidebar-add">
        <button id="btn-add-magic-item" class="btn-add">+ Add Magic Item</button>
      </div>
    `;
    const typeFilter = document.getElementById("sidebar-magic-type-filter");
    const rarityFilter = document.getElementById("sidebar-magic-rarity-filter");
    if (typeFilter) typeFilter.onchange = () => { magicItemFilterType = typeFilter.value; render(); };
    if (rarityFilter) rarityFilter.onchange = () => { magicItemFilterRarity = rarityFilter.value; render(); };
    const addMagicBtn = document.getElementById("btn-add-magic-item");
    if (addMagicBtn) addMagicBtn.onclick = () => createMagicItem();
  } else if (currentPage === "factions") {
    sidebar.style.display = "";
    const typeOptions = ["all", ...getKnownFactionNames()];
    const cityOptions = [{ id: "all", name: "All locations" }, ...allLocations().map(loc => ({ id: loc.id, name: loc.name }))];
    sidebar.innerHTML = `
      <p class="sidebar-label">Faction filters</p>
      <div style="padding:0 1rem; display:grid; gap:0.75rem;">
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Type</div>
          <select id="sidebar-faction-type-filter" class="edit-input" style="width:100%">
            ${typeOptions.map(type => `<option value="${esc(type)}"${type === factionFilterType ? " selected" : ""}>${type === "all" ? "All types" : esc(type)}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Location</div>
          <select id="sidebar-faction-city-filter" class="edit-input" style="width:100%">
            ${cityOptions.map(loc => `<option value="${esc(loc.id)}"${String(loc.id) === String(factionFilterCityId) ? " selected" : ""}>${esc(loc.name)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    const typeFilter = document.getElementById("sidebar-faction-type-filter");
    const cityFilter = document.getElementById("sidebar-faction-city-filter");
    if (typeFilter) {
      typeFilter.onchange = () => { factionFilterType = typeFilter.value; render(); };
    }
    if (cityFilter) {
      cityFilter.onchange = () => { factionFilterCityId = cityFilter.value; render(); };
    }
  } else if (currentPage === "stores") {
    sidebar.style.display = "";
    const typeOptions = ["all", ...getKnownStoreNames()];
    const cityOptions = [{ id: "all", name: "All locations" }, ...allLocations().map(loc => ({ id: loc.id, name: loc.name }))];
    sidebar.innerHTML = `
      <p class="sidebar-label">Store filters</p>
      <div style="padding:0 1rem; display:grid; gap:0.75rem;">
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Store type</div>
          <select id="sidebar-store-type-filter" class="edit-input" style="width:100%">
            ${typeOptions.map(type => `<option value="${esc(type)}"${type === storeFilterType ? " selected" : ""}>${type === "all" ? "All store types" : esc(type)}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Location</div>
          <select id="sidebar-store-city-filter" class="edit-input" style="width:100%">
            ${cityOptions.map(loc => `<option value="${esc(loc.id)}"${String(loc.id) === String(storeFilterCityId) ? " selected" : ""}>${esc(loc.name)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    const typeFilter = document.getElementById("sidebar-store-type-filter");
    const cityFilter = document.getElementById("sidebar-store-city-filter");
    if (typeFilter) {
      typeFilter.onchange = () => { storeFilterType = typeFilter.value; render(); };
    }
    if (cityFilter) {
      cityFilter.onchange = () => { storeFilterCityId = cityFilter.value; render(); };
    }
  } else if (currentPage === "ships") {
    sidebar.style.display = "";
    const typeOptions = ["all", ...getKnownShipTypes()];
    sidebar.innerHTML = `
      <p class="sidebar-label">Ship filters</p>
      <div style="padding:0 1rem; display:grid; gap:0.75rem;">
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Ship type</div>
          <select id="sidebar-ship-type-filter" class="edit-input" style="width:100%">
            ${typeOptions.map(type => `<option value="${esc(type)}"${type === shipFilterType ? " selected" : ""}>${type === "all" ? "All ship types" : esc(type)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    const typeFilter = document.getElementById("sidebar-ship-type-filter");
    if (typeFilter) {
      typeFilter.onchange = () => { shipFilterType = typeFilter.value; render(); };
    }
  } else if (currentPage === "npcs") {
    sidebar.style.display = "";
    const professionOptions = ["all", ...new Set(npcLinks.map(n => n.profession).filter(Boolean))].sort((a, b) => a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b));
    const factionOptions = ["all", "N/A", ...factionLinks.map(f => f.label || f.name).filter(Boolean).sort()];
    sidebar.innerHTML = `
      <p class="sidebar-label">NPC Filters</p>
      <div style="padding:0 1rem; display:grid; gap:0.75rem;">
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Profession</div>
          <select id="sidebar-npc-profession-filter" class="edit-input" style="width:100%">
            ${professionOptions.map(p => `<option value="${esc(p)}"${p === npcFilterProfession ? " selected" : ""}>${p === "all" ? "All professions" : esc(p)}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="sidebar-label" style="margin-bottom:4px;">Faction</div>
          <select id="sidebar-npc-faction-filter" class="edit-input" style="width:100%">
            ${factionOptions.map(f => `<option value="${esc(f)}"${f === npcFilterFaction ? " selected" : ""}>${f === "all" ? "All factions" : esc(f)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    const profFilter = document.getElementById("sidebar-npc-profession-filter");
    const facFilter = document.getElementById("sidebar-npc-faction-filter");
    if (profFilter) profFilter.onchange = () => { npcFilterProfession = profFilter.value; render(); };
    if (facFilter) facFilter.onchange = () => { npcFilterFaction = facFilter.value; render(); };
  } else {
    sidebar.style.display = "none";
  }
  // Set the add location button onclick after setting innerHTML
  if (currentPage === "locations") {
    const addBtn = document.getElementById("btn-add-location");
    if (addBtn) addBtn.onclick = () => {
      document.getElementById("popup-overlay").classList.remove("hidden");
    };
  }
}

function makeSidebarBtn(loc, kind) {
  const btn = document.createElement("button");
  btn.className = "sidebar-btn" + (selected.id === loc.id ? " active" : "");
  const col = SIZE_COLORS[loc.size] || "#9a8060";
  if (selected.id === loc.id) btn.style.borderLeftColor = col;
  btn.innerHTML = `<div>${esc(loc.name)}</div><div class="size-label" style="color:${col}">${esc(loc.size)}</div>`;
  btn.onclick = () => { selected = loc; selectedType = kind; currentTab = "Overview"; detailItem = null; render(); };
  return btn;
}

function makeMagicItemSidebarBtn(item) {
  const btn = document.createElement("button");
  btn.className = "sidebar-btn" + (selectedMagicItemId === item.id ? " active" : "");
  btn.innerHTML = `<div>${esc(item.name)}</div><div class="size-label">${esc(item.rarity)}</div>`;
  btn.onclick = () => {
    selectedMagicItemId = item.id;
    render();
  };
  return btn;
}

function renderMain() {
  const main = document.getElementById("main-content");
  if (currentPage === "locations") {
    const isCustom = customLocations.some(l => l.id === selected.id);
    if (isCustom) {
      renderCustomEditor(main);
      return;
    }
    // Built-in city view
    if (detailItem) {
      renderDetailPage(main);
      return;
    }
    let html = "";
    // City header
    html += `<div class="city-header">
      <div class="city-header-row">
        <h2 class="city-name">${esc(selected.name)}</h2>
        <span class="size-badge" style="border:1px solid ${SIZE_COLORS[selected.size]}44;color:${SIZE_COLORS[selected.size]}">${esc(selected.size)}</span>
        ${favBtnHtml(!!cityFavorites[selected.id], `toggleFavCity(${selected.id},this)`)}
      </div>
      <div class="traits-row">${selected.traits.map(t => `<span class="trait-tag">${esc(t)}</span>`).join("")}</div>
    </div>`;
    // Tabs
    html += `<div class="tabs">${["Overview","Shops","Factions","Lore"].map(t =>
      `<button class="tab-btn${currentTab === t ? " active" : ""}" data-tab="${t}">${t}</button>`
    ).join("")}</div>`;
    // Tab content
    if (currentTab === "Overview") html += renderOverview();
    else if (currentTab === "Shops") html += renderShopsList();
    else if (currentTab === "Factions") html += renderFactionsList();
    else if (currentTab === "Lore") html += renderLoreTab();

    main.innerHTML = html;
    // Bind tab clicks
    main.querySelectorAll(".tab-btn").forEach(btn => {
      btn.onclick = () => { currentTab = btn.dataset.tab; detailItem = null; render(); };
    });
    // Bind shop clicks
    main.querySelectorAll("[data-shop]").forEach(btn => {
      btn.onclick = () => {
        const s = getCityShops(selected.id).find(s => s.name === btn.dataset.shop);
        if (s) { detailItem = { type: "shop", item: s }; detailIdx = 0; render(); }
      };
    });
    // Bind faction clicks
    main.querySelectorAll("[data-faction]").forEach(btn => {
      btn.onclick = () => {
        const f = getCityFactions(selected.id).find(f => f.name === btn.dataset.faction);
        if (f) { detailItem = { type: "faction", item: f }; detailIdx = 0; render(); }
      };
    });
    // Bind lore
    bindLoreEvents(main);
  } else if (currentPage === "magicItems") {
    renderMagicItemsPage(main);
  } else if (currentPage === "stores") {
    if (storeEditorState) renderStoreEditor(main);
    else renderStoresPage(main);
  } else if (currentPage === "factions") {
    if (factionEditorState) renderFactionEditor(main);
    else renderFactionsPage(main);
  } else if (currentPage === "ships") {
    if (shipEditorState) renderShipEditor(main);
    else renderShipsPage(main);
  } else if (currentPage === "npcs") {
    if (npcEditorState) renderNpcEditor(main);
    else renderNpcsPage(main);
  } else if (currentPage === "pcs") {
    if (pcEditorState) renderPcEditor(main);
    else renderPcsPage(main);
  } else if (currentPage === "home") {
    renderHomePage(main);
  } else if (currentPage === "settings") {
    renderSettingsPage(main);
  } else {
    main.innerHTML = `<p>Page not implemented yet.</p>`;
  }
}

// ── Overview tab ────────────────────────────────────────────────────────────
function renderOverview() {
  const s = selected;
  const totalShops = s.shops.reduce((a, x) => a + x.count, 0);
  const totalFactions = s.factions.reduce((a, x) => a + x.count, 0);
  return `
    <p class="flavor-quote">"${esc(s.flavor)}"</p>
    <div class="stat-grid">
      ${statBox("Population", s.population.toLocaleString())}
      ${statBox("Exports", s.exports.length + " goods")}
      ${statBox("Imports", s.imports.length + " goods")}
      ${statBox("Total Shops", totalShops)}
      ${statBox("Factions", totalFactions)}
    </div>
    <div class="box-grid">
      <div class="box"><p class="box-label">Exports</p>${s.exports.map(e => `<div class="list-item">↑ ${esc(e)}</div>`).join("")}</div>
      <div class="box"><p class="box-label">Imports</p>${s.imports.map(e => `<div class="list-item">↓ ${esc(e)}</div>`).join("")}</div>
    </div>`;
}

function statBox(label, value) {
  return `<div class="stat-box"><div class="stat-label">${label}</div><div class="stat-val">${value}</div></div>`;
}

// ── Shops list ──────────────────────────────────────────────────────────────
function renderShopsList() {
  const shops = getCityShops(selected.id);
  const cards = shops.map(s => {
    const hn = hasAnyNote(selected.id, s.name, s.count);
    return `<button class="card-btn${hn ? " has-note" : ""}" data-shop="${esc(s.name)}">
      <span class="card-name">${esc(s.name)}${hn ? '<span class="dot">●</span>' : ""}</span>
      <span class="card-count">${s.count}</span>
    </button>`;
  }).join("");
  const total = shops.reduce((a, s) => a + s.count, 0);
  return `<div class="card-grid">${cards}</div><p class="footer-note">Total storefronts: ${total} · Click any entry to add notes</p>`;
}

// ── Factions list ───────────────────────────────────────────────────────────
function renderFactionsList() {
  const factions = getCityFactions(selected.id);
  const cards = factions.map(f => {
    const c = FACTION_COLORS[f.type] || FACTION_COLORS.neutral;
    const hn = hasAnyNote(selected.id, f.name, f.count);
    return `<button class="card-btn faction-${f.type}${hn ? " has-note" : ""}" data-faction="${esc(f.name)}" style="background:${c.bg};border-color:${hn ? c.text + '55' : c.border}">
      <span class="card-name" style="color:${c.text}">${esc(f.name)}${hn ? '<span class="dot">●</span>' : ""}</span>
      <span class="card-count" style="color:${c.text}">${f.count}</span>
    </button>`;
  }).join("");
  const legend = Object.entries(FACTION_LEGEND).map(([k, v]) =>
    `<span style="color:${FACTION_COLORS[k].text}">■ ${v}</span>`
  ).join("");
  return `<div class="card-grid">${cards}</div><div class="faction-legend">${legend}</div><p class="footer-note">Click any entry to add notes</p>`;
}

function renderFactionsPage(main) {
  let groups = getAllFactionGroups();
  if (factionFilterType !== "all") {
    groups = groups.filter(group => (group.type || group.assignments[0]?.type) === factionFilterType);
  }
  if (factionFilterCityId !== "all") {
    groups = groups.filter(group => group.assignments.some(a => String(a.cityId) === String(factionFilterCityId)));
  }
  let html = `<div class="section-row">
      <span class="section-label">${groups.length} faction${groups.length === 1 ? "" : "s"}</span>
      <button class="btn-sm" id="btn-add-faction">+ Add Faction</button>
    </div>`;
  if (groups.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No factions configured yet. Add one to link it to cities and manage types per location.</p></div>`;
  } else {
    html += `<div class="card-grid">`;
    groups.forEach(group => {
      const firstType = group.type || group.assignments[0]?.type || "neutral";
      const cityNames = group.assignments.map(a => getLocationById(a.cityId)?.name || a.cityId).join(", ");
      html += `<div class="card-btn faction-${firstType}" role="button" tabindex="0" data-faction-name="${esc(group.name)}">
        <div style="flex:1">
          <div class="card-name">${esc(group.label || group.name)}</div>
          <div style="font-size:11px;color:#5a5040;margin-top:4px;line-height:1.4">${esc(cityNames)}</div>
        </div>
        <span class="card-count" style="margin-right:8px">${group.assignments.length}</span>
        ${favBtnHtml(!!group.favorited, `event.stopPropagation();toggleFavFaction('${group.id}',this)`)}
      </div>`;
    });
    html += `</div>`;
  }
  main.innerHTML = html;
  const addBtn = document.getElementById("btn-add-faction");
  if (addBtn) addBtn.onclick = () => {
    factionEditorState = { id: null, type: "", label: "New Faction", assignments: [{ cityId: "", type: "High Presence" }], notes: "" };
    render();
  };
  main.querySelectorAll("[data-faction-name]").forEach(btn => {
    btn.onclick = () => {
      openFactionEditor(btn.dataset.factionName);
      render();
    };
  });
}

function renderFactionEditor(main) {
  const faction = factionEditorState;
  const title = faction.label || "New Faction";
  let html = `<button class="back-btn" id="btn-faction-back">← Back to Factions</button>`;
  html += `<div class="detail-header" style="background:#11101a;border:1px solid #1e1c14;border-left:3px solid #8090c0">
      <div>
        <div class="detail-label">Faction</div>
        <div class="detail-title">${esc(title)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:right">
          <div class="detail-count-label">Locations</div>
          <div class="detail-count">${faction.assignments.length}</div>
        </div>
        ${favBtnHtml(!!faction.favorited, `toggleFavFaction('${faction.id}',this)`)}
      </div>
    </div>`;
  const knownTypes = [...new Set([...getKnownFactionNames(), faction.type].filter(Boolean))];
  html += `<div class="custom-section-label">Faction type</div>
    <select class="edit-input" id="faction-type-select">
      <option value="" disabled${!faction.type ? " selected" : ""}>Select type</option>
      ${knownTypes.map(type => `<option value="${esc(type)}"${type === faction.type ? " selected" : ""}>${esc(type)}</option>`).join("")}
    </select>
    <div class="custom-section-label">Custom label</div>
    <input class="edit-input" id="faction-label-input" value="${esc(faction.label)}" placeholder="Optional custom label for this faction">
  `;
  html += `<div class="custom-section-label">City assignments</div>
    <div id="faction-assignments">
      <div class="sf-row sf-header">
        <span class="sf-name">City</span>
        <span class="sf-count"></span>
        <span class="sf-type">Presence</span>
      </div>`;
  faction.assignments.forEach((assignment, index) => {
    const presenceOptions = [...new Set(["High Presence","Medium Presence","Low Presence","Establishing Foothold", assignment.type].filter(Boolean))];
    html += `<div class="sf-row" data-assignment-row>
      <select class="edit-input" data-city-select>
        <option value="" disabled${!assignment.cityId ? " selected" : ""}>Select City</option>
        <option value="Always Moving"${assignment.cityId === "Always Moving" ? " selected" : ""}>Always Moving</option>
        <option value="Wilderness"${assignment.cityId === "Wilderness" ? " selected" : ""}>Wilderness</option>
        ${allLocations().map(loc => `<option value="${loc.id}"${String(loc.id) === String(assignment.cityId) ? " selected" : ""}>${esc(loc.name)}</option>`).join("")}
      </select>
      <select class="edit-input" data-type-select>
        ${presenceOptions.map(type => `<option value="${esc(type)}"${assignment.type === type ? " selected" : ""}>${esc(type)}</option>`).join("")}
      </select>
      <button class="btn-delete" data-remove-assignment="${index}">✕</button>
    </div>`;
  });
  html += `</div>
    <button class="btn-sm" id="btn-add-assignment">+ Add City</button>`;
  const factionMembers = npcLinks.filter(n => n.faction === faction.label);
  html += `<div class="custom-section-label">Members</div>`;
  if (factionMembers.length === 0) {
    html += `<div style="color:#6a6050;font-size:0.85rem;padding:0.5rem 0">No NPCs assigned to this faction yet.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:0.5rem">`;
    factionMembers.forEach(npc => {
      html += `<div onclick="openNpcEditor('${esc(npc.id)}')" style="cursor:pointer;padding:0.4rem 0.6rem;background:#10100e;border:1px solid #1e1c14;border-radius:3px;color:#c8a96e;font-size:0.9rem" onmouseover="this.style.borderColor='#3a3020'" onmouseout="this.style.borderColor='#1e1c14'">${esc(npc.name)}${npc.profession ? `<span style="color:#6a6050;font-size:0.8rem;margin-left:0.5rem">${esc(npc.profession)}</span>` : ""}</div>`;
    });
    html += `</div>`;
  }
  html += `<div class="custom-section-label">Notes</div>
    <textarea class="edit-textarea" id="faction-notes" placeholder="Optional notes for this faction">${esc(faction.notes)}</textarea>
    <div class="save-row" style="gap:10px;align-items:center;">
      <button class="btn-save" id="btn-save-faction">Save Faction</button>
      ${faction.id ? `<button class="btn-delete" id="btn-delete-faction">Delete Faction</button>` : ""}
      <span class="save-status" id="faction-save-status" style="color:#3a3020">Saved</span>
    </div>`;
  main.innerHTML = html;
  bindFactionEditorEvents();
}

function bindFactionEditorEvents() {
  document.getElementById("btn-faction-back").onclick = () => {
    factionEditorState = null;
    render();
  };
  const syncFactionDom = () => {
    factionEditorState.type = document.getElementById("faction-type-select")?.value || factionEditorState.type;
    factionEditorState.label = document.getElementById("faction-label-input")?.value || factionEditorState.label;
    factionEditorState.notes = document.getElementById("faction-notes")?.value || factionEditorState.notes;
    document.querySelectorAll("[data-assignment-row]").forEach((row, i) => {
      if (factionEditorState.assignments[i]) {
        const citySelect = row.querySelector("[data-city-select]");
        const typeSelect = row.querySelector("[data-type-select]");
        if (citySelect) factionEditorState.assignments[i].cityId = citySelect.value;
        if (typeSelect) factionEditorState.assignments[i].type = typeSelect.value;
      }
    });
  };
  const addAssignment = document.getElementById("btn-add-assignment");
  if (addAssignment) {
    addAssignment.onclick = () => {
      syncFactionDom();
      factionEditorState.assignments.push({ cityId: "", type: "High Presence" });
      render();
    };
  }
  document.querySelectorAll("[data-remove-assignment]").forEach(btn => {
    btn.onclick = () => {
      syncFactionDom();
      const idx = parseInt(btn.dataset.removeAssignment, 10);
      factionEditorState.assignments.splice(idx, 1);
      if (factionEditorState.assignments.length === 0) {
        factionEditorState.assignments.push({ cityId: "", type: "High Presence" });
      }
      render();
    };
  });
  const saveBtn = document.getElementById("btn-save-faction");
  const status = document.getElementById("faction-save-status");
  const markDirty = () => { saveBtn.classList.add("dirty"); status.style.color = "#c8a96e"; status.textContent = "Unsaved changes"; };
  document.querySelectorAll("#main-content input, #main-content textarea, #main-content select").forEach(el => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });
  if (saveBtn) {
    saveBtn.onclick = () => {
      factionEditorState.type = document.getElementById("faction-type-select")?.value || "";
      factionEditorState.label = document.getElementById("faction-label-input")?.value.trim() || factionEditorState.type || "New Faction";
      factionEditorState.notes = document.getElementById("faction-notes")?.value || "";
      const built = buildFactionSaveState();
      if (!built) {
        status.style.color = "#d45f5f";
        status.textContent = "Select a faction type and add at least one city assignment.";
        return;
      }
      factionEditorState.id = factionEditorState.id || `faction-${Date.now()}`;
      factionEditorState.type = built.type;
      factionEditorState.label = built.label;
      factionEditorState.assignments = built.assignments;
      factionEditorState.notes = built.notes;
      saveCurrentFactionState();
      saveBtn.classList.remove("dirty");
      status.style.color = "#5a9060";
      status.textContent = "Saved!";
      renderSidebar();
      setTimeout(() => render(), 600);
    };
  }
  const deleteBtn = document.getElementById("btn-delete-faction");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (!confirm(`Delete faction '${factionEditorState.name}'? This will remove its custom city links.`)) return;
      factionLinks = factionLinks.filter(f => f.id !== factionEditorState.id);
      saveFactionLinks();
      factionEditorState = null;
      render();
    };
  }
}

function getAllStoreGroups() {
  return storeLinks.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function getStoreLinkByName(name) {
  return storeLinks.find(s => s.name === name);
}

function getStoreLinkById(id) {
  return storeLinks.find(s => s.id === id);
}

function getKnownStoreNames() {
  const names = new Set();
  for (const city of allLocations()) {
    for (const shop of city.shops || []) {
      names.add(shop.name);
    }
  }
  for (const store of storeLinks) {
    names.add(store.name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function getCustomStoreAssignmentsForCity(cityId) {
  return storeLinks.map(s => {
    const assignment = s.assignments.find(a => a.cityId === cityId);
    return assignment ? { name: s.name } : null;
  }).filter(Boolean);
}

function getKnownShipTypes() {
  const types = new Set();
  for (const ship of shipLinks) {
    if (ship.type) types.add(ship.type);
  }
  return Array.from(types).sort((a, b) => a.localeCompare(b));
}

function getNextAvailableInstanceForFaction(cityId, factionType) {
  const usedInstances = new Set();
  for (const faction of factionLinks) {
    if (faction.type === factionType) {
      for (const assignment of faction.assignments) {
        if (assignment.cityId === cityId && assignment.instanceIdx != null) {
          usedInstances.add(assignment.instanceIdx);
        }
      }
    }
  }
  let idx = 0;
  while (usedInstances.has(idx)) idx++;
  return idx;
}

function getNextAvailableInstanceForStore(cityId, storeType) {
  const usedInstances = new Set();
  for (const store of storeLinks) {
    if (store.type === storeType) {
      for (const assignment of store.assignments) {
        if (assignment.cityId === cityId && assignment.instanceIdx != null) {
          usedInstances.add(assignment.instanceIdx);
        }
      }
    }
  }
  let idx = 0;
  while (usedInstances.has(idx)) idx++;
  return idx;
}

function getCustomStoreForInstance(cityId, storeType, instanceIdx) {
  return storeLinks.find(s => s.type === storeType && s.assignments.some(a => a.cityId === cityId && a.instanceIdx === instanceIdx));
}

function getCustomFactionForInstance(cityId, factionName, instanceIdx) {
  return factionLinks.find(f =>
    (f.type === factionName || f.label === factionName || f.name === factionName) &&
    f.assignments.some(a => a.cityId === cityId && a.instanceIdx === instanceIdx)
  );
}

function openStoreEditor(name) {
  const group = getAllStoreGroups().find(g => g.name === name) || { name: "", assignments: [] };
  const existingLink = getStoreLinkByName(name);
  const type = existingLink?.type || group.type || group.name;
  storeEditorState = {
    id: existingLink?.id || null,
    type,
    label: existingLink?.label || existingLink?.name || group.name || type,
    assignments: existingLink?.assignments || group.assignments.map(a => ({ cityId: a.cityId })),
    notes: existingLink?.notes || "",
  };
  // Migrate old assignments without instanceIdx
  storeEditorState.assignments.forEach(assignment => {
    if (assignment.instanceIdx == null) {
      assignment.instanceIdx = getNextAvailableInstanceForStore(assignment.cityId, type);
    }
  });
}

function buildStoreSaveState() {
  const state = {
    id: storeEditorState.id,
    type: storeEditorState.type?.trim() || "",
    label: storeEditorState.label?.trim() || "",
    assignments: [],
    notes: storeEditorState.notes || ""
  };
  const selectedType = document.getElementById("store-name-select")?.value;
  const label = document.getElementById("store-name-custom")?.value.trim();
  state.type = selectedType || state.type;
  state.label = label || state.type;
  if (!state.type) return null;
  const assignmentRows = document.querySelectorAll("[data-assignment-row]");
  for (const row of assignmentRows) {
    const citySelect = row.querySelector("[data-city-select]");
    if (!citySelect) continue;
    const cityId = parseCityId(citySelect.value);
    if (!cityId) continue;
    if (!state.assignments.some(a => a.cityId === cityId)) {
      const existingAssignment = storeEditorState.assignments.find(a => a.cityId === cityId);
      const instanceIdx = existingAssignment?.instanceIdx ?? getNextAvailableInstanceForStore(cityId, state.type);
      state.assignments.push({ cityId, instanceIdx });
    }
  }
  return state.assignments.length ? state : null;
}

function saveCurrentStoreState() {
  const saved = buildStoreSaveState();
  if (!saved) return false;
  if (storeEditorState.id) {
    const idx = storeLinks.findIndex(s => s.id === storeEditorState.id);
    if (idx >= 0) {
      storeLinks[idx] = { id: storeEditorState.id, type: saved.type, label: saved.label, name: saved.type, assignments: saved.assignments, notes: saved.notes };
    } else {
      storeLinks.push({ id: storeEditorState.id, type: saved.type, label: saved.label, name: saved.type, assignments: saved.assignments, notes: saved.notes });
    }
  } else {
    storeLinks.push({ id: `store-${Date.now()}`, type: saved.type, label: saved.label, name: saved.type, assignments: saved.assignments, notes: saved.notes });
  }
  saveStoreLinks();
  return true;
}

function renderStoresPage(main) {
  let groups = getAllStoreGroups();
  if (storeFilterType !== "all") {
    groups = groups.filter(group => (group.type || group.name) === storeFilterType);
  }
  if (storeFilterCityId !== "all") {
    groups = groups.filter(group => group.assignments.some(a => String(a.cityId) === String(storeFilterCityId)));
  }
  let html = `<div class="section-row">
      <span class="section-label">${groups.length} store${groups.length === 1 ? "" : "s"}</span>
      <button class="btn-sm" id="btn-add-store">+ Add Store</button>
    </div>`;
  if (groups.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No store links configured yet. Add one to connect a store type across cities.</p></div>`;
  } else {
    html += `<div class="card-grid">`;
    groups.forEach(group => {
      const cityNames = group.assignments.map(a => getLocationById(a.cityId)?.name || a.cityId).join(", ");
      html += `<div class="card-btn" role="button" tabindex="0" data-store-name="${esc(group.name)}">
        <div style="flex:1">
          <div class="card-name">${esc(group.label || group.name)}</div>
          <div style="font-size:11px;color:#5a5040;margin-top:4px;line-height:1.4">${esc(cityNames)}</div>
        </div>
        <span class="card-count" style="margin-right:8px">${group.assignments.length}</span>
        ${favBtnHtml(!!group.favorited, `event.stopPropagation();toggleFavStore('${group.id}',this)`)}
      </div>`;
    });
    html += `</div>`;
  }
  main.innerHTML = html;
  const addBtn = document.getElementById("btn-add-store");
  if (addBtn) addBtn.onclick = () => {
    storeEditorState = { id: null, type: "New Store", label: "New Store", assignments: [{ cityId: allLocations()[0]?.id }], notes: "" };
    render();
  };
  main.querySelectorAll("[data-store-name]").forEach(btn => {
    btn.onclick = () => {
      openStoreEditor(btn.dataset.storeName);
      render();
    };
  });
}

function renderStoreEditor(main) {
  const store = storeEditorState;
  const title = store.label || "New Store";
  const knownNames = [...new Set([...getKnownStoreNames(), store.type])];
  let html = `<button class="back-btn" id="btn-store-back">← Back to Stores</button>`;
  html += `<div class="detail-header" style="background:#11101a;border:1px solid #1e1c14;border-left:3px solid #8090c0">
      <div>
        <div class="detail-label">Store</div>
        <div class="detail-title">${esc(title)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:right">
          <div class="detail-count-label">Locations</div>
          <div class="detail-count">${store.assignments.length}</div>
        </div>
        ${favBtnHtml(!!store.favorited, `toggleFavStore('${store.id}',this)`)}
      </div>
    </div>`;
  html += `<div class="custom-section-label">Store type</div>
    <select class="edit-input" id="store-name-select">
      ${knownNames.map(name => `<option value="${esc(name)}"${name === store.type ? " selected" : ""}>${esc(name)}</option>`).join("")}
    </select>
    <div class="custom-section-label">Custom label</div>
    <input class="edit-input" id="store-name-custom" value="${esc(store.label)}" placeholder="Optional custom label for this store">
`;
  html += `<div class="custom-section-label">City assignments</div>
    <div id="store-assignments">`;
  store.assignments.forEach((assignment, index) => {
    html += `<div class="sf-row" data-assignment-row>
      <select class="edit-input" data-city-select>
        ${allLocations().map(loc => `<option value="${loc.id}"${String(loc.id) === String(assignment.cityId) ? " selected" : ""}>${esc(loc.name)}</option>`).join("")}
      </select>
      <button class="btn-delete" data-remove-assignment="${index}">✕</button>
    </div>`;
  });
  html += `</div>
    <button class="btn-sm" id="btn-add-store-assignment">+ Add City</button>`;
  const storeEmployees = npcLinks.filter(n => n.store === store.label);
  html += `<div class="custom-section-label">Employees</div>`;
  if (storeEmployees.length === 0) {
    html += `<div style="color:#6a6050;font-size:0.85rem;padding:0.5rem 0">No NPCs assigned to this store yet.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:0.5rem">`;
    storeEmployees.forEach(npc => {
      html += `<div onclick="openNpcEditor('${esc(npc.id)}')" style="cursor:pointer;padding:0.4rem 0.6rem;background:#10100e;border:1px solid #1e1c14;border-radius:3px;color:#c8a96e;font-size:0.9rem" onmouseover="this.style.borderColor='#3a3020'" onmouseout="this.style.borderColor='#1e1c14'">${esc(npc.name)}${npc.profession ? `<span style="color:#6a6050;font-size:0.8rem;margin-left:0.5rem">${esc(npc.profession)}</span>` : ""}</div>`;
    });
    html += `</div>`;
  }
  html += `<div class="custom-section-label">Notes</div>
    <textarea class="edit-textarea" id="store-notes" placeholder="Optional notes for this store">${esc(store.notes)}</textarea>
    <div class="save-row" style="gap:10px;align-items:center;">
      <button class="btn-save" id="btn-save-store">Save Store</button>
      ${store.id ? `<button class="btn-delete" id="btn-delete-store">Delete Store</button>` : ""}
      <span class="save-status" id="store-save-status" style="color:#3a3020">Saved</span>
    </div>`;
  main.innerHTML = html;
  bindStoreEditorEvents();
}

function bindStoreEditorEvents() {
  document.getElementById("btn-store-back").onclick = () => {
    storeEditorState = null;
    render();
  };
  const syncStoreDom = () => {
    const nameSelect = document.getElementById("store-name-select");
    const customNameInput = document.getElementById("store-name-custom");
    storeEditorState.type = nameSelect?.value || storeEditorState.type;
    storeEditorState.label = customNameInput?.value || storeEditorState.label;
    storeEditorState.notes = document.getElementById("store-notes")?.value || storeEditorState.notes;
    document.querySelectorAll("[data-assignment-row]").forEach((row, i) => {
      if (storeEditorState.assignments[i]) {
        const citySelect = row.querySelector("[data-city-select]");
        if (citySelect) storeEditorState.assignments[i].cityId = citySelect.value;
      }
    });
  };
  const addAssignment = document.getElementById("btn-add-store-assignment");
  if (addAssignment) {
    addAssignment.onclick = () => {
      syncStoreDom();
      const nextCity = allLocations().find(loc => !storeEditorState.assignments.some(a => String(a.cityId) === String(loc.id)));
      storeEditorState.assignments.push({ cityId: nextCity ? nextCity.id : allLocations()[0]?.id });
      render();
    };
  }
  document.querySelectorAll("[data-remove-assignment]").forEach(btn => {
    btn.onclick = () => {
      syncStoreDom();
      const idx = parseInt(btn.dataset.removeAssignment, 10);
      storeEditorState.assignments.splice(idx, 1);
      if (storeEditorState.assignments.length === 0) {
        storeEditorState.assignments.push({ cityId: allLocations()[0]?.id });
      }
      render();
    };
  });
  const saveBtn = document.getElementById("btn-save-store");
  const status = document.getElementById("store-save-status");
  const markDirty = () => { saveBtn.classList.add("dirty"); status.style.color = "#c8a96e"; status.textContent = "Unsaved changes"; };
  document.querySelectorAll("#main-content input, #main-content textarea, #main-content select").forEach(el => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });
  const nameSelect = document.getElementById("store-name-select");
  const customNameInput = document.getElementById("store-name-custom");
  if (saveBtn) {
    saveBtn.onclick = () => {
      const selectedValue = nameSelect?.value;
      storeEditorState.type = (selectedValue || "").trim();
      storeEditorState.label = (customNameInput?.value || "").trim() || storeEditorState.type;
      storeEditorState.notes = document.getElementById("store-notes").value;
      const built = buildStoreSaveState();
      if (!built) {
        status.style.color = "#d45f5f";
        status.textContent = "Add at least one city and a store name.";
        return;
      }
      storeEditorState.id = storeEditorState.id || `store-${Date.now()}`;
      storeEditorState.type = built.type;
      storeEditorState.label = built.label;
      storeEditorState.assignments = built.assignments;
      storeEditorState.notes = built.notes;
      saveCurrentStoreState();
      saveBtn.classList.remove("dirty");
      status.style.color = "#5a9060";
      status.textContent = "Saved!";
      renderSidebar();
      setTimeout(() => render(), 600);
    };
  }
  const deleteBtn = document.getElementById("btn-delete-store");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (!confirm(`Delete store '${storeEditorState.name}'? This will remove its custom city links.`)) return;
      storeLinks = storeLinks.filter(s => s.id !== storeEditorState.id);
      saveStoreLinks();
      storeEditorState = null;
      render();
    };
  }
}

// ── Ships page ──────────────────────────────────────────────────────────────
function renderShipsPage(main) {
  let ships = shipLinks;
  if (shipFilterType !== "all") {
    ships = ships.filter(ship => ship.type === shipFilterType);
  }
  let html = `<div class="section-row">
      <span class="section-label">${ships.length} ship${ships.length === 1 ? "" : "s"}</span>
      <button class="btn-sm" id="btn-add-ship">+ Add Ship</button>
    </div>`;
  if (ships.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No ships configured yet. Add one to catalog your fleet.</p></div>`;
  } else {
    html += `<div class="card-grid">`;
    ships.forEach(ship => {
      html += `<div class="card-btn" role="button" tabindex="0" data-ship-id="${esc(ship.id)}">
        <div style="flex:1">
          <div class="card-name">${esc(ship.name)}</div>
          <div style="font-size:11px;color:#5a5040;margin-top:4px;line-height:1.4">${esc(ship.type || "Unknown type")}</div>
        </div>
        ${favBtnHtml(!!ship.favorited, `event.stopPropagation();toggleFavShip('${ship.id}',this)`)}
      </div>`;
    });
    html += `</div>`;
  }
  main.innerHTML = html;
  const addBtn = document.getElementById("btn-add-ship");
  if (addBtn) addBtn.onclick = () => {
    shipEditorState = { id: null, name: "New Ship", type: "", totalHealth: 0, currentHealth: 0, averageCost: "", passengerCapacity: "", cargoCapacity: "", speed: "", actions: "", hull: "", helm: "", sails: "", ballista: "", cannons: "", navalRam: "", additionalNotes: "" };
    render();
  };
  main.querySelectorAll("[data-ship-id]").forEach(btn => {
    btn.onclick = () => {
      openShipEditor(btn.dataset.shipId);
      render();
    };
  });
}

function renderShipEditor(main) {
  const ship = shipEditorState;
  const title = ship.name || "New Ship";
  const shipTypes = ["Rowboat/Raft", "Sailing Ship", "Sloop", "Cutter", "Caravel", "Schooner", "Ketch", "Brigantine", "Warship", "Galleon", "Man o' War"];
  let html = `<button class="back-btn" id="btn-ship-back">← Back to Ships</button>`;
  html += `<div class="detail-header" style="background:#11101a;border:1px solid #1e1c14;border-left:3px solid #8090c0">
      <div>
        <div class="detail-label">Ship</div>
        <div class="detail-title">${esc(title)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:right">
          <div class="detail-count-label">Health</div>
          <div class="detail-count">${ship.currentHealth || 0} of ${ship.totalHealth || 0}</div>
        </div>
        ${favBtnHtml(!!ship.favorited, `toggleFavShip('${ship.id}',this)`)}
      </div>
    </div>`;
  html += `<div class="custom-section-label">Ship Type</div>
    <select class="edit-input" id="ship-type-select">
      <option value="" disabled${!ship.type ? " selected" : ""}>Select type</option>
      ${shipTypes.map(type => `<option value="${esc(type)}"${type === ship.type ? " selected" : ""}>${esc(type)}</option>`).join("")}
    </select>
    <div class="custom-section-label">Ship Name</div>
    <input class="edit-input" id="ship-name-input" value="${esc(ship.name)}" placeholder="Enter ship name">
    <div class="custom-section-label">Total Health</div>
    <input class="edit-input" id="ship-total-health" type="number" value="${ship.totalHealth || ""}" placeholder="Total health points">
    <div class="custom-section-label">Current Health</div>
    <input class="edit-input" id="ship-current-health" type="number" value="${ship.currentHealth || ""}" placeholder="Current health points">
    <div class="custom-section-label">Average Cost</div>
    <input class="edit-input" id="ship-average-cost" value="${esc(ship.averageCost)}" placeholder="Average cost">
    <div class="custom-section-label">Passenger Capacity</div>
    <input class="edit-input" id="ship-passenger-capacity" value="${esc(ship.passengerCapacity)}" placeholder="Passenger capacity">
    <div class="custom-section-label">Cargo Capacity</div>
    <input class="edit-input" id="ship-cargo-capacity" value="${esc(ship.cargoCapacity)}" placeholder="Cargo capacity">
    <div class="custom-section-label">Speed</div>
    <input class="edit-input" id="ship-speed" value="${esc(ship.speed)}" placeholder="Speed">
    <div class="custom-section-label">Actions</div>
    <textarea class="edit-textarea" id="ship-actions" placeholder="Actions">${esc(ship.actions)}</textarea>
    <div class="custom-section-label">Hull</div>
    <textarea class="edit-textarea" id="ship-hull" placeholder="Hull details">${esc(ship.hull)}</textarea>
    <div class="custom-section-label">Helm</div>
    <textarea class="edit-textarea" id="ship-helm" placeholder="Helm details">${esc(ship.helm)}</textarea>
    <div class="custom-section-label">Sails</div>
    <textarea class="edit-textarea" id="ship-sails" placeholder="Sails details">${esc(ship.sails)}</textarea>
    <div class="custom-section-label">Ballista</div>
    <textarea class="edit-textarea" id="ship-ballista" placeholder="Ballista details">${esc(ship.ballista)}</textarea>
    <div class="custom-section-label">Cannons</div>
    <textarea class="edit-textarea" id="ship-cannons" placeholder="Cannons details">${esc(ship.cannons)}</textarea>
    <div class="custom-section-label">Naval Ram</div>
    <textarea class="edit-textarea" id="ship-naval-ram" placeholder="Naval ram details">${esc(ship.navalRam)}</textarea>
    <div class="custom-section-label">Additional Notes</div>
    <textarea class="edit-textarea" id="ship-additional-notes" placeholder="Additional notes">${esc(ship.additionalNotes)}</textarea>
    <div class="save-row" style="gap:10px;align-items:center;">
      <button class="btn-save" id="btn-save-ship">Save Ship</button>
      ${ship.id ? `<button class="btn-delete" id="btn-delete-ship">Delete Ship</button>` : ""}
      <span class="save-status" id="ship-save-status" style="color:#3a3020">Saved</span>
    </div>`;
  main.innerHTML = html;
  bindShipEditorEvents();
}

function bindShipEditorEvents() {
  document.getElementById("btn-ship-back").onclick = () => {
    shipEditorState = null;
    render();
  };
  // Update health display in real-time
  const updateHealthDisplay = () => {
    const current = parseInt(document.getElementById("ship-current-health")?.value) || 0;
    const total = parseInt(document.getElementById("ship-total-health")?.value) || 0;
    const countEl = document.querySelector(".detail-count");
    if (countEl) countEl.textContent = `${current} of ${total}`;
  };
  document.getElementById("ship-current-health")?.addEventListener("input", updateHealthDisplay);
  document.getElementById("ship-total-health")?.addEventListener("input", updateHealthDisplay);
  const saveBtn = document.getElementById("btn-save-ship");
  const status = document.getElementById("ship-save-status");
  const markDirty = () => { saveBtn.classList.add("dirty"); status.style.color = "#c8a96e"; status.textContent = "Unsaved changes"; };
  document.querySelectorAll("#main-content input, #main-content textarea, #main-content select").forEach(el => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });
  if (saveBtn) {
    saveBtn.onclick = () => {
      shipEditorState.type = document.getElementById("ship-type-select")?.value || "";
      shipEditorState.name = document.getElementById("ship-name-input")?.value.trim() || "Unnamed Ship";
      shipEditorState.totalHealth = parseInt(document.getElementById("ship-total-health")?.value) || 0;
      shipEditorState.currentHealth = parseInt(document.getElementById("ship-current-health")?.value) || 0;
      shipEditorState.averageCost = document.getElementById("ship-average-cost")?.value || "";
      shipEditorState.passengerCapacity = document.getElementById("ship-passenger-capacity")?.value || "";
      shipEditorState.cargoCapacity = document.getElementById("ship-cargo-capacity")?.value || "";
      shipEditorState.speed = document.getElementById("ship-speed")?.value || "";
      shipEditorState.actions = document.getElementById("ship-actions")?.value || "";
      shipEditorState.hull = document.getElementById("ship-hull")?.value || "";
      shipEditorState.helm = document.getElementById("ship-helm")?.value || "";
      shipEditorState.sails = document.getElementById("ship-sails")?.value || "";
      shipEditorState.ballista = document.getElementById("ship-ballista")?.value || "";
      shipEditorState.cannons = document.getElementById("ship-cannons")?.value || "";
      shipEditorState.navalRam = document.getElementById("ship-naval-ram")?.value || "";
      shipEditorState.additionalNotes = document.getElementById("ship-additional-notes")?.value || "";
      if (!shipEditorState.name.trim()) {
        status.style.color = "#d45f5f";
        status.textContent = "Ship name is required.";
        return;
      }
      shipEditorState.id = shipEditorState.id || `ship-${Date.now()}`;
      saveCurrentShipState();
      saveBtn.classList.remove("dirty");
      status.style.color = "#5a9060";
      status.textContent = "Saved!";
      renderSidebar();
      setTimeout(() => render(), 600);
    };
  }
  const deleteBtn = document.getElementById("btn-delete-ship");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (!confirm(`Delete ship '${shipEditorState.name}'?`)) return;
      shipLinks = shipLinks.filter(s => s.id !== shipEditorState.id);
      saveShipLinks();
      shipEditorState = null;
      render();
    };
  }
}

function openShipEditor(id) {
  const ship = shipLinks.find(s => s.id === id);
  if (ship) {
    shipEditorState = { ...ship };
  }
}

function saveCurrentShipState() {
  const ship = {
    id: shipEditorState.id,
    name: shipEditorState.name,
    type: shipEditorState.type,
    totalHealth: shipEditorState.totalHealth,
    currentHealth: shipEditorState.currentHealth,
    averageCost: shipEditorState.averageCost,
    passengerCapacity: shipEditorState.passengerCapacity,
    cargoCapacity: shipEditorState.cargoCapacity,
    speed: shipEditorState.speed,
    actions: shipEditorState.actions,
    hull: shipEditorState.hull,
    helm: shipEditorState.helm,
    sails: shipEditorState.sails,
    ballista: shipEditorState.ballista,
    cannons: shipEditorState.cannons,
    navalRam: shipEditorState.navalRam,
    additionalNotes: shipEditorState.additionalNotes
  };
  const idx = shipLinks.findIndex(s => s.id === ship.id);
  if (idx >= 0) {
    shipLinks[idx] = ship;
  } else {
    shipLinks.push(ship);
  }
  saveShipLinks();
}

// ── Lore tab ────────────────────────────────────────────────────────────────
function renderLoreTab() {
  const lore = getLore(selected.id);
  let html = `<div class="section-row">
    <span class="section-label">${lore.length} lore ${lore.length === 1 ? "entry" : "entries"}</span>
  </div>`;
  lore.forEach((l, i) => {
    html += `<div class="lore-card" data-lore-idx="${i}">
      <p>${esc(l)}</p>
      <div class="lore-btns">
        <button class="btn-edit" data-lore-edit="${i}">Edit</button>
        <button class="btn-delete" data-lore-del="${i}">✕</button>
      </div>
    </div>`;
  });
  html += `<button class="btn-dashed" id="btn-add-lore">+ Add Lore Entry</button>`;
  return html;
}

function bindLoreEvents(main) {
  main.querySelectorAll("[data-lore-edit]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.loreEdit);
      const lore = getLore(selected.id);
      const card = btn.closest(".lore-card");
      card.outerHTML = `<div class="lore-card-editing">
        <textarea class="edit-textarea" id="lore-edit-ta">${esc(lore[idx])}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn-sm" id="lore-edit-confirm" data-idx="${idx}">Confirm</button>
          <button class="btn-sm-ghost" id="lore-edit-cancel">Cancel</button>
        </div>
      </div>`;
      document.getElementById("lore-edit-confirm").onclick = () => {
        const val = document.getElementById("lore-edit-ta").value.trim();
        if (val) { const l = getLore(selected.id); l[idx] = val; setLore(selected.id, l); }
        renderMain();
      };
      document.getElementById("lore-edit-cancel").onclick = () => renderMain();
    };
  });
  main.querySelectorAll("[data-lore-del]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.loreDel);
      const l = getLore(selected.id).filter((_, i) => i !== idx);
      setLore(selected.id, l);
      renderMain();
    };
  });
  const addBtn = document.getElementById("btn-add-lore");
  if (addBtn) {
    addBtn.onclick = () => {
      addBtn.outerHTML = `<div class="lore-card-editing">
        <textarea class="edit-textarea" id="lore-new-ta" placeholder="Write a new lore entry..."></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn-sm" id="lore-new-confirm">Add Entry</button>
          <button class="btn-sm-ghost" id="lore-new-cancel">Cancel</button>
        </div>
      </div>`;
      document.getElementById("lore-new-confirm").onclick = () => {
        const val = document.getElementById("lore-new-ta").value.trim();
        if (val) { const l = getLore(selected.id); l.push(val); setLore(selected.id, l); }
        renderMain();
      };
      document.getElementById("lore-new-cancel").onclick = () => renderMain();
    };
  }
}

// ── Detail page (shop/faction with per-instance notes) ─────────────────────
function renderDetailPage(main) {
  const { type, item } = detailItem;
  const c = type === "faction" ? (FACTION_COLORS[item.type] || FACTION_COLORS.neutral) : null;
  const accentColor = c ? c.text : "#c8a96e";
  const accentBg = c ? c.bg : "#10100e";
  const accentBorder = c ? c.border : "#2a2518";

  const defaultLabel = (i) => type === "shop" ? `${item.name} #${i + 1}` : i === 0 ? `${item.name} (primary)` : `${item.name} (cell ${i + 1})`;
  const instanceLabel = (i) => {
    const custom = type === "shop" ? getCustomStoreForInstance(selected.id, item.name, i) : getCustomFactionForInstance(selected.id, item.name, i);
    return custom ? custom.label : getInstanceName(selected.id, item.name, i, defaultLabel(i));
  };
  const curLabel = instanceLabel(detailIdx);
  const curNote = (() => {
    const custom = type === "shop" ? getCustomStoreForInstance(selected.id, item.name, detailIdx) : getCustomFactionForInstance(selected.id, item.name, detailIdx);
    return custom ? custom.notes : getNote(selected.id, item.name, detailIdx);
  })();

  let html = `<button class="back-btn" id="btn-back">← Back to ${type === "shop" ? "Shops" : "Factions"}</button>`;
  // Header card
  html += `<div class="detail-header" style="background:${accentBg};border:1px solid ${accentBorder};border-left:3px solid ${accentColor}">
    <div>
      <div class="detail-label" style="color:${accentColor}">${esc(selected.name)} · ${type === "shop" ? "Shop" : "Faction"}</div>
      <div class="detail-title" style="color:${accentColor}">${esc(item.name)}</div>
    </div>
    <div style="text-align:right">
      <div class="detail-count-label" style="color:${accentColor}">${type === "shop" ? "locations" : "groups"}</div>
      <div class="detail-count" style="color:${accentColor}">${item.count}</div>
    </div>
  </div>`;

  // Instance buttons
  if (item.count > 1) {
    html += `<div class="section-row"><span class="section-label">${type === "shop" ? "Locations in " : "Groups in "}${esc(selected.name)}</span>
      <span class="section-label" style="font-style:italic">double-click to rename</span></div>`;
    html += `<div class="instance-row">`;
    for (let i = 0; i < item.count; i++) {
      const hn = getNote(selected.id, item.name, i).trim().length > 0;
      const isCustomName = instanceNames[nameKeyStr(selected.id, item.name, i)] != null;
      const active = i === detailIdx;
      html += `<button class="instance-btn${active ? " active" : ""}${hn && !active ? " has-note" : ""}" data-instance="${i}" style="${active ? `border-color:${accentColor};color:${accentColor}` : ""}">
        ${esc(instanceLabel(i))}
        ${isCustomName ? '<span class="pencil">✎</span>' : ""}
        ${hn && !active ? '<span class="dot">●</span>' : ""}
      </button>`;
    }
    html += `</div>`;
  } else {
    // Single instance rename button
    const isCustomName = instanceNames[nameKeyStr(selected.id, item.name, 0)] != null;
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:1.5rem">
      <span style="font-size:14px;color:#7a6e50">${esc(instanceLabel(0))}${isCustomName ? '<span style="font-size:11px;color:#4a4030;margin-left:6px">✎</span>' : ""}</span>
      <button class="btn-rename" data-rename-single="0">Rename</button>
    </div>`;
  }

  // Notes area
  html += `<div>
    <div class="section-row">
      <span class="section-label">Notes — ${esc(curLabel)}</span>
      <span class="save-status" id="detail-save-status" style="color:#3a3020">Saved</span>
    </div>
    <textarea class="note-textarea" id="detail-note" placeholder="${type === "shop"
      ? `Notes for ${esc(curLabel)} in ${esc(selected.name)}. Who runs it? What's notable? Any quest hooks?`
      : `Notes for ${esc(curLabel)} in ${esc(selected.name)}. Who leads them? What do they want? Any known members?`
    }">${esc(curNote)}</textarea>
    <div class="save-row">
      <button class="btn-save" id="btn-save-detail">Save Notes</button>
    </div>
  </div>`;

  main.innerHTML = html;

  // Bind events
  document.getElementById("btn-back").onclick = () => { detailItem = null; renderMain(); };

  // Instance clicks
  main.querySelectorAll("[data-instance]").forEach(btn => {
    btn.onclick = () => {
      if (btn.clickTimeout) clearTimeout(btn.clickTimeout);
      btn.clickTimeout = setTimeout(() => {
        saveCurrentDetailNote();
        detailIdx = parseInt(btn.dataset.instance);
        renderMain();
      }, 300);
    };
    btn.ondblclick = (e) => {
      e.stopPropagation();
      if (btn.clickTimeout) clearTimeout(btn.clickTimeout);
      const idx = parseInt(btn.dataset.instance);
      const curName = instanceLabel(idx);
      const wrap = document.createElement("div");
      wrap.className = "instance-rename-wrap";
      const inp = document.createElement("input");
      inp.className = "instance-rename-input";
      inp.id = `rename-input-${idx}`;
      inp.value = esc(curName);
      inp.dataset.ridx = idx;
      wrap.appendChild(inp);
      btn.parentNode.replaceChild(wrap, btn);
      inp.focus(); inp.select();
      let editing = false;
      setTimeout(() => {
        editing = true;
        inp.onblur = () => {
          if (!editing) return;
          editing = false;
          const val = inp.value.trim();
          if (val) setInstanceName(selected.id, item.name, parseInt(inp.dataset.ridx), val);
          renderMain();
        };
        inp.onkeydown = (e) => {
          if (e.key === "Enter") {
            editing = false;
            const val = inp.value.trim();
            if (val) setInstanceName(selected.id, item.name, parseInt(inp.dataset.ridx), val);
            renderMain();
          }
          if (e.key === "Escape") {
            editing = false;
            renderMain();
          }
        };
      }, 10);
    };
  });

  // Single rename button
  const singleRename = main.querySelector("[data-rename-single]");
  if (singleRename) {
    singleRename.onclick = () => {
      const curName = instanceLabel(0);
      singleRename.parentElement.innerHTML = `<div class="instance-rename-wrap">
        <input class="instance-rename-input" id="rename-input" value="${esc(curName)}" style="font-size:14px;width:200px">
      </div>`;
      const inp = document.getElementById("rename-input");
      inp.focus(); inp.select();
      const finish = () => { const val = inp.value.trim(); if (val) setInstanceName(selected.id, item.name, 0, val); renderMain(); };
      inp.onkeydown = (e) => { if (e.key === "Enter") finish(); if (e.key === "Escape") renderMain(); };
      inp.onblur = finish;
    };
  }

  // Note saving
  const ta = document.getElementById("detail-note");
  const saveBtn = document.getElementById("btn-save-detail");
  const status = document.getElementById("detail-save-status");
  let dirty = false;
  ta.oninput = () => { dirty = true; saveBtn.classList.add("dirty"); status.style.color = "#c8a96e"; status.textContent = "Unsaved changes"; };
  saveBtn.onclick = () => {
    if (!dirty) return;
    setNote(selected.id, item.name, detailIdx, ta.value);
    dirty = false; saveBtn.classList.remove("dirty");
    status.style.color = "#5a9060"; status.textContent = "Saved!";
    setTimeout(() => { status.style.color = "#3a3020"; status.textContent = "Saved"; }, 600);
  };
}

function saveCurrentDetailNote() {
  const ta = document.getElementById("detail-note");
  if (ta && detailItem) setNote(selected.id, detailItem.item.name, detailIdx, ta.value);
}

// ── Custom Location Editor ─────────────────────────────────────────────────
function renderCustomEditor(main) {
  const loc = selected;
  const accentColor = loc.kind === "dungeon" ? "#7a6090" : loc.kind === "landmark" ? "#b07a9e" : "#c8a96e";

  let html = `<div class="custom-header">
    <div style="flex:1;min-width:200px">
      <input class="city-name-input" id="custom-name" value="${esc(loc.name)}">
      <div style="display:flex;gap:6px;align-items:center">
        <span class="size-badge" style="border:1px solid ${accentColor}44;color:${accentColor}">${esc(loc.size)}</span>
        <span class="save-status" id="custom-save-status" style="color:#3a3020">Saved</span>
      </div>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${favBtnHtml(!!loc.favorited, `toggleFavLocation('${loc.id}',this)`)}
      <button class="btn-delete" id="btn-delete-custom">Delete</button>
      <button class="btn-save-loc" id="btn-save-custom">Save Location</button>
    </div>
  </div>`;

  if (loc.kind === "city") html += renderCustomCity(loc);
  else if (loc.kind === "landmark") html += renderCustomLandmark(loc);
  else if (loc.kind === "dungeon") html += renderCustomDungeon(loc);

  main.innerHTML = html;
  bindCustomEditorEvents(loc);
}

function renderCustomCity(loc) {
  let html = `<div class="custom-section-label">Size / Type</div>
    <select class="edit-input" id="ce-size">
      ${["Large City","Moderate Town/Village","Small Village","Custom City"].map(s =>
        `<option value="${s}"${loc.size === s ? " selected" : ""}>${s}</option>`).join("")}
    </select>`;
  html += `<div class="custom-section-label">Traits</div><div id="ce-traits">${renderTagEditor("traits", loc.traits, "e.g. Coastal, Inland...")}</div>`;
  html += `<div class="custom-section-label">Population</div>
    <input type="number" class="edit-input" id="ce-pop" value="${loc.population}" style="width:160px">`;
  html += `<div class="custom-section-label">Flavor Text</div>
    <textarea class="edit-textarea" id="ce-flavor" placeholder="A short evocative description...">${esc(loc.flavor)}</textarea>`;
  html += `<div class="custom-section-label">Exports</div><div id="ce-exports">${renderTagEditor("exports", loc.exports, "e.g. Salted Fish, Timber...")}</div>`;
  html += `<div class="custom-section-label">Imports</div><div id="ce-imports">${renderTagEditor("imports", loc.imports, "e.g. Iron Tools, Grain...")}</div>`;
  html += `<div class="custom-section-label">Shops & Vendors</div><div id="ce-shops">${renderSfEditor("shops", loc.shops, "shop")}</div>`;
  html += `<div class="custom-section-label">Factions & Organizations</div><div id="ce-factions">${renderSfEditor("factions", loc.factions, "faction")}</div>`;
  html += `<div class="custom-section-label">Lore Entries</div><div id="ce-lore">`;
  loc.lore.forEach((l, i) => {
    html += `<div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-start">
      <textarea class="edit-textarea ce-lore-ta" data-lore-idx="${i}">${esc(l)}</textarea>
      <button class="btn-delete ce-lore-del" data-lore-del="${i}">✕</button>
    </div>`;
  });
  html += `<button class="btn-dashed" id="ce-add-lore">+ Add Lore Entry</button></div>`;
  return html;
}

function renderCustomLandmark(loc) {
  return `
    <div class="custom-section-label">Description</div>
    <textarea class="edit-textarea" id="ce-description" placeholder="What does this place look like?">${esc(loc.description)}</textarea>
    <div class="custom-section-label">History</div>
    <textarea class="edit-textarea" id="ce-history" placeholder="Who built it? What happened here?">${esc(loc.history)}</textarea>
    <div class="custom-section-label">Current State / Dangers</div>
    <textarea class="edit-textarea" id="ce-dangers" placeholder="Is it inhabited? Cursed?">${esc(loc.dangers)}</textarea>
    <div class="custom-section-label">Rewards / Points of Interest</div>
    <textarea class="edit-textarea" id="ce-rewards" placeholder="What can players find here?">${esc(loc.rewards)}</textarea>
    <div class="custom-section-label">Campaign Notes</div>
    <textarea class="edit-textarea" id="ce-notes" placeholder="DM notes, quest hooks..." style="min-height:140px">${esc(loc.notes)}</textarea>`;
}

function renderCustomDungeon(loc) {
  return `
    <div class="custom-section-label">Description</div>
    <textarea class="edit-textarea" id="ce-description" placeholder="What kind of dungeon is this?">${esc(loc.description)}</textarea>
    <div class="custom-section-label">Levels & Layout</div>
    <textarea class="edit-textarea" id="ce-levels" placeholder="How many floors or sections?">${esc(loc.levels)}</textarea>
    <div class="custom-section-label">Bosses & Major Enemies</div>
    <textarea class="edit-textarea" id="ce-bosses" placeholder="Who or what guards this place?">${esc(loc.bosses)}</textarea>
    <div class="custom-section-label">Traps & Hazards</div>
    <textarea class="edit-textarea" id="ce-traps" placeholder="Environmental dangers, trap types...">${esc(loc.traps)}</textarea>
    <div class="custom-section-label">Rewards & Loot</div>
    <textarea class="edit-textarea" id="ce-rewards" placeholder="What treasure or items can be found?">${esc(loc.rewards)}</textarea>
    <div class="custom-section-label">Campaign Notes</div>
    <textarea class="edit-textarea" id="ce-notes" placeholder="DM notes, connections to quests..." style="min-height:140px">${esc(loc.notes)}</textarea>`;
}

function bindCustomEditorEvents(loc) {
  const saveBtn = document.getElementById("btn-save-custom");
  const status = document.getElementById("custom-save-status");

  const markDirty = () => { saveBtn.classList.add("dirty"); status.style.color = "#c8a96e"; status.textContent = "Unsaved changes"; };
  // Track changes on all inputs/textareas
  document.querySelectorAll("#main-content input, #main-content textarea, #main-content select").forEach(el => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });

  saveBtn.onclick = () => {
    // Gather data from the form
    loc.name = document.getElementById("custom-name").value.trim() || loc.name;
    if (loc.kind === "city") {
      loc.size = document.getElementById("ce-size").value;
      loc.population = parseInt(document.getElementById("ce-pop").value) || 0;
      loc.flavor = document.getElementById("ce-flavor").value;
      // Lore
      const loreTas = document.querySelectorAll(".ce-lore-ta");
      loc.lore = Array.from(loreTas).map(ta => ta.value).filter(v => v.trim());
    } else if (loc.kind === "landmark") {
      loc.description = document.getElementById("ce-description").value;
      loc.history = document.getElementById("ce-history").value;
      loc.dangers = document.getElementById("ce-dangers").value;
      loc.rewards = document.getElementById("ce-rewards").value;
      loc.notes = document.getElementById("ce-notes").value;
    } else if (loc.kind === "dungeon") {
      loc.description = document.getElementById("ce-description").value;
      loc.levels = document.getElementById("ce-levels").value;
      loc.bosses = document.getElementById("ce-bosses").value;
      loc.traps = document.getElementById("ce-traps").value;
      loc.rewards = document.getElementById("ce-rewards").value;
      loc.notes = document.getElementById("ce-notes").value;
    }
    // Update in customLocations
    const idx = customLocations.findIndex(l => l.id === loc.id);
    if (idx >= 0) customLocations[idx] = loc;
    selected = loc;
    saveCustomLocations();

    saveBtn.classList.remove("dirty");
    status.style.color = "#5a9060"; status.textContent = "Saved!";
    setTimeout(() => { status.style.color = "#3a3020"; status.textContent = "Saved"; renderSidebar(); }, 600);
  };

  const deleteBtn = document.getElementById("btn-delete-custom");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (!confirm(`Delete '${loc.name}'? This will remove the custom location permanently.`)) return;
      customLocations = customLocations.filter(l => l.id !== loc.id);
      saveCustomLocations();
      if (customLocations.length > 0) {
        selected = customLocations[0];
        selectedType = selected.kind;
      } else {
        selected = CITIES[0];
        selectedType = "city";
      }
      currentTab = "Overview";
      detailItem = null;
      render();
    };
  }

  // Lore delete buttons
  document.querySelectorAll(".ce-lore-del").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.loreDel);
      loc.lore = loc.lore.filter((_, i) => i !== idx);
      renderCustomEditor(document.getElementById("main-content"));
    };
  });
  // Add lore button
  const addLore = document.getElementById("ce-add-lore");
  if (addLore) addLore.onclick = () => {
    loc.lore = loc.lore || [];
    loc.lore.push("");
    renderCustomEditor(document.getElementById("main-content"));
  };

  // Tag editor bindings
  bindAllTagEditors(loc);
  bindAllSfEditors(loc);
}

// ── Tag editor ─────────────────────────────────────────────────────────────
function renderTagEditor(field, tags, placeholder) {
  let html = `<div class="tag-list" data-tag-field="${field}">`;
  tags.forEach((t, i) => {
    html += `<span class="tag">${esc(t)}<button class="btn-x" data-tag-remove="${field}:${i}">✕</button></span>`;
  });
  html += `</div><div class="tag-input-row">
    <input class="tag-input" id="tag-input-${field}" placeholder="${placeholder}">
    <button class="btn-sm" data-tag-add="${field}">Add</button>
  </div>`;
  return html;
}

function bindAllTagEditors(loc) {
  document.querySelectorAll("[data-tag-add]").forEach(btn => {
    const field = btn.dataset.tagAdd;
    const input = document.getElementById("tag-input-" + field);
    const add = () => {
      const val = input.value.trim();
      if (val && !loc[field].includes(val)) {
        loc[field].push(val);
        document.getElementById("ce-" + field).innerHTML = renderTagEditor(field, loc[field],
          field === "traits" ? "e.g. Coastal, Inland..." : field === "exports" ? "e.g. Salted Fish..." : "e.g. Iron Tools...");
        bindAllTagEditors(loc);
        document.getElementById("btn-save-custom").classList.add("dirty");
      }
    };
    btn.onclick = add;
    if (input) input.onkeydown = (e) => { if (e.key === "Enter") add(); };
  });
  document.querySelectorAll("[data-tag-remove]").forEach(btn => {
    btn.onclick = () => {
      const [field, idx] = btn.dataset.tagRemove.split(":");
      loc[field].splice(parseInt(idx), 1);
      document.getElementById("ce-" + field).innerHTML = renderTagEditor(field, loc[field],
        field === "traits" ? "e.g. Coastal, Inland..." : field === "exports" ? "e.g. Salted Fish..." : "e.g. Iron Tools...");
      bindAllTagEditors(loc);
      document.getElementById("btn-save-custom").classList.add("dirty");
    };
  });
}

// ── Shop/Faction editor ────────────────────────────────────────────────────
function renderSfEditor(field, items, type) {
  let html = "";
  items.forEach((item, i) => {
    html += `<div class="sf-row">
      <span class="sf-name">${esc(item.name)}</span>
      <span class="sf-count">${item.count}</span>
      ${type === "faction" ? `<span class="sf-type">${item.type}</span>` : ""}
      <button class="btn-delete" data-sf-remove="${field}:${i}">✕</button>
    </div>`;
  });
  html += `<div class="sf-add-row">
    <input class="sf-input" id="sf-name-${field}" placeholder="${type === "shop" ? "Shop name..." : "Faction name..."}" style="flex:2;min-width:120px">
    <input type="number" class="sf-input" id="sf-count-${field}" value="1" min="1" max="20" style="width:52px">
    ${type === "faction" ? `<select class="sf-select" id="sf-type-${field}">
      ${["High Presence","Medium Presence","Low Presence","Establishing Foothold"].map(t => `<option value="${t}">${t}</option>`).join("")}
    </select>` : ""}
    <button class="btn-sm" data-sf-add="${field}" data-sf-type="${type}">Add</button>
  </div>`;
  return html;
}

function bindAllSfEditors(loc) {
  document.querySelectorAll("[data-sf-add]").forEach(btn => {
    const field = btn.dataset.sfAdd;
    const type = btn.dataset.sfType;
    btn.onclick = () => {
      const name = document.getElementById("sf-name-" + field).value.trim();
      const count = parseInt(document.getElementById("sf-count-" + field).value) || 1;
      if (!name) return;
      const entry = type === "shop" ? { name, count } : { name, count, type: document.getElementById("sf-type-" + field).value };
      loc[field].push(entry);
      document.getElementById("ce-" + field).innerHTML = renderSfEditor(field, loc[field], type);
      bindAllSfEditors(loc);
      document.getElementById("btn-save-custom").classList.add("dirty");
    };
  });
  document.querySelectorAll("[data-sf-remove]").forEach(btn => {
    btn.onclick = () => {
      const [field, idx] = btn.dataset.sfRemove.split(":");
      const type = field === "shops" ? "shop" : "faction";
      loc[field].splice(parseInt(idx), 1);
      document.getElementById("ce-" + field).innerHTML = renderSfEditor(field, loc[field], type);
      bindAllSfEditors(loc);
      document.getElementById("btn-save-custom").classList.add("dirty");
    };
  });
}

// ── Popup ──────────────────────────────────────────────────────────────────
function closePopup() { document.getElementById("popup-overlay").classList.add("hidden"); }

function addCustomLocation(kind) {
  const newId = "custom-" + Date.now();
  let loc;
  if (kind === "city") {
    loc = { id: newId, kind, name: "New City", size: "Custom City", traits: [], population: 0, flavor: "", exports: [], imports: [], shops: [], factions: [], lore: [] };
  } else if (kind === "landmark") {
    loc = { id: newId, kind, name: "New Landmark", size: "Landmark / Ruin", description: "", history: "", dangers: "", rewards: "", notes: "" };
  } else {
    loc = { id: newId, kind, name: "New Dungeon", size: "Dungeon", description: "", levels: "", bosses: "", traps: "", rewards: "", notes: "" };
  }
  customLocations.push(loc);
  saveCustomLocations();
  selected = loc;
  selectedType = kind;
  currentTab = "Overview";
  detailItem = null;
  closePopup();
  render();
}

// ── Magic Items ────────────────────────────────────────────────────────────
function renderMagicItemsPage(main) {
  if (selectedMagicItemId) {
    const item = getMagicItem(selectedMagicItemId);
    if (!item) {
      selectedMagicItemId = null;
      render();
      return;
    }
    renderMagicItemEditor(main, item);
    return;
  }

  let visibleCount = magicItems.filter(i =>
    (magicItemFilterType === "all" || i.type === magicItemFilterType) &&
    (magicItemFilterRarity === "all" || i.rarity === magicItemFilterRarity)
  ).length;
  let countLabel = magicItemFilterType === "all" && magicItemFilterRarity === "all"
    ? `${magicItems.length} magic ${magicItems.length === 1 ? "item" : "items"}`
    : `${visibleCount} of ${magicItems.length} magic ${magicItems.length === 1 ? "item" : "items"}`;
  let html = `<div class="section-row">
      <span class="section-label">${countLabel}</span>
      <button class="btn-sm" id="btn-add-magic-main">+ Add Magic Item</button>
    </div>`;

  let visibleItems = magicItems;
  if (magicItemFilterType !== "all") visibleItems = visibleItems.filter(i => i.type === magicItemFilterType);
  if (magicItemFilterRarity !== "all") visibleItems = visibleItems.filter(i => i.rarity === magicItemFilterRarity);

  if (magicItems.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No magic items yet. Use the sidebar or add button to create one.</p></div>`;
  } else if (visibleItems.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No items match the current filters.</p></div>`;
  } else {
    html += `<div class="card-grid">`;
    visibleItems.forEach(item => {
      html += `<div class="card-btn" role="button" tabindex="0" onclick="editMagicItem('${item.id}')">
        <span class="card-name" style="flex:1">${esc(item.name)}</span>
        <span class="card-count" style="margin-right:8px">${esc(item.rarity)}</span>
        ${favBtnHtml(!!item.favorited, `event.stopPropagation();toggleFavMagicItem('${item.id}',this)`)}
      </div>`;
    });
    html += `</div>`;
  }

  main.innerHTML = html;

  const addMagicMain = document.getElementById("btn-add-magic-main");
  if (addMagicMain) addMagicMain.onclick = () => createMagicItem();
}

function renderMagicItemEditor(main, item) {
  let html = `<button class="back-btn" id="btn-magitem-back">← Back to Magic Items</button>`;
  html += `<div class="detail-header" style="background:#11101a;border:1px solid #1e1932;border-left:3px solid #a07ed8">
      <div>
        <div class="detail-label">Magic Item</div>
        <div class="detail-title">${esc(item.name)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:right">
          <div class="detail-count-label">Rarity</div>
          <div class="detail-count">${esc(item.rarity)}</div>
        </div>
        ${favBtnHtml(!!item.favorited, `toggleFavMagicItem('${item.id}',this)`)}
      </div>
    </div>`;

  html += `<div class="section-row"><span class="section-label">Item details</span></div>`;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>
        <div class="custom-section-label">Name</div>
        <input class="edit-input" id="mi-name" value="${esc(item.name)}">
      </div>
      <div>
        <div class="custom-section-label">Type</div>
        <select class="edit-input" id="mi-type">
          ${["Weapon","Armor","Wondrous Item","Consumable","Potion","Ring","Staff","Rod"].map(type =>
            `<option value="${type}"${item.type === type ? " selected" : ""}>${type}</option>`).join("")}
        </select>
      </div>
      <div>
        <div class="custom-section-label">Rarity</div>
        <select class="edit-input" id="mi-rarity">
          ${["Common","Uncommon","Rare","Very Rare","Legendary","Artifact"].map(rarity =>
            `<option value="${rarity}"${item.rarity === rarity ? " selected" : ""}>${rarity}</option>`).join("")}
        </select>
      </div>
    </div>`;

  html += `<div class="custom-section-label">Description</div>
    <textarea class="edit-textarea" id="mi-description" placeholder="What does the item look like or feel like?">${esc(item.description)}</textarea>`;
  html += `<div class="custom-section-label">Properties</div>
    <textarea class="edit-textarea" id="mi-properties" placeholder="Write abilities, charges, attunement, required actions, and special effects...">${esc(item.properties)}</textarea>`;
  html += `<div class="custom-section-label">DM Notes</div>
    <textarea class="edit-textarea" id="mi-notes" placeholder="Campaign notes, hooks, quest ties, or rarity lore...">${esc(item.notes)}</textarea>`;
  html += `<div class="save-row" style="margin-top:1rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <button class="btn-save" id="btn-save-magic-item">Save Item</button>
      <button class="btn-delete" id="btn-delete-magic-item">Delete Item</button>
      <span class="save-status" id="magicitem-save-status" style="color:#3a3020">Saved</span>
    </div>`;

  main.innerHTML = html;
  bindMagicItemEditorEvents(item);
}

function bindMagicItemEditorEvents(item) {
  const backBtn = document.getElementById("btn-magitem-back");
  const saveBtn = document.getElementById("btn-save-magic-item");
  const deleteBtn = document.getElementById("btn-delete-magic-item");
  const status = document.getElementById("magicitem-save-status");
  let dirty = false;

  backBtn.onclick = () => {
    selectedMagicItemId = null;
    render();
  };

  const markDirty = () => {
    dirty = true;
    saveBtn.classList.add("dirty");
    status.style.color = "#c8a96e";
    status.textContent = "Unsaved changes";
  };

  document.querySelectorAll("#main-content input, #main-content textarea, #main-content select").forEach(el => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });

  saveBtn.onclick = () => {
    item.name = document.getElementById("mi-name").value.trim() || item.name;
    item.type = document.getElementById("mi-type").value;
    item.rarity = document.getElementById("mi-rarity").value;
    item.description = document.getElementById("mi-description").value;
    item.properties = document.getElementById("mi-properties").value;
    item.notes = document.getElementById("mi-notes").value;
    saveMagicItems();
    dirty = false;
    saveBtn.classList.remove("dirty");
    status.style.color = "#5a9060";
    status.textContent = "Saved!";
    renderSidebar();
    setTimeout(() => render(), 600);
  };

  deleteBtn.onclick = () => {
    if (!confirm(`Delete magic item '${item.name}'? This cannot be undone.`)) return;
    magicItems = magicItems.filter(m => m.id !== item.id);
    saveMagicItems();
    selectedMagicItemId = null;
    render();
  };
}

function getMagicItem(id) {
  return magicItems.find(item => item.id === id);
}

function editMagicItem(id) {
  selectedMagicItemId = id;
  render();
}

function createMagicItem() {
  const newId = `magic-${Date.now()}`;
  const item = {
    id: newId,
    name: "New Magic Item",
    type: "Wondrous Item",
    rarity: "Uncommon",
    description: "",
    properties: "",
    notes: "",
  };
  magicItems.unshift(item);
  saveMagicItems();
  selectedMagicItemId = newId;
  render();
}

// ── NPCs ───────────────────────────────────────────────────────────────────
function renderNpcsPage(main) {
  let npcs = npcLinks;
  if (npcFilterProfession !== "all") npcs = npcs.filter(n => n.profession === npcFilterProfession);
  if (npcFilterFaction !== "all") npcs = npcs.filter(n => n.faction === npcFilterFaction);

  const countLabel = npcFilterProfession === "all" && npcFilterFaction === "all"
    ? `${npcLinks.length} NPC${npcLinks.length === 1 ? "" : "s"}`
    : `${npcs.length} of ${npcLinks.length} NPC${npcLinks.length === 1 ? "" : "s"}`;

  let html = `<div class="section-row">
    <span class="section-label">${countLabel}</span>
    <button class="btn-sm" id="btn-add-npc">+ Add NPC</button>
  </div>`;

  if (npcLinks.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No NPCs yet. Click + Add NPC to create one.</p></div>`;
  } else if (npcs.length === 0) {
    html += `<div class="box"><p style="margin:0;color:#9a8e6e">No NPCs match the current filters.</p></div>`;
  } else {
    html += `<div class="card-grid">`;
    npcs.forEach(npc => {
      html += `<div class="card-btn" role="button" tabindex="0" onclick="openNpcEditor('${npc.id}')">
        <span class="card-name" style="flex:1">${esc(npc.name)}</span>
        <span style="font-size:11px;color:#7a6e50;text-align:right;margin-right:8px">${esc(npc.profession || "—")}</span>
        ${favBtnHtml(!!npc.favorited, `event.stopPropagation();toggleFavNpc('${npc.id}',this)`)}
      </div>`;
    });
    html += `</div>`;
  }

  main.innerHTML = html;
  const addBtn = document.getElementById("btn-add-npc");
  if (addBtn) addBtn.onclick = () => createNpc();
}

function renderNpcEditor(main) {
  const npc = npcEditorState;
  const alignments = ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"];
  const factionOptions = ["N/A", ...factionLinks.map(f => f.label || f.name).filter(Boolean).sort()];
  const storeOptions = ["N/A", ...storeLinks.map(s => s.label || s.name).filter(Boolean).sort()];

  function statMod(val) {
    const mod = Math.floor(((val || 10) - 10) / 2);
    return (mod >= 0 ? "+" : "") + mod;
  }

  let html = `<button class="back-btn" id="btn-npc-back">← Back to NPCs</button>`;
  html += `<div class="detail-header" style="background:#0e1214;border:1px solid #1a2a1a;border-left:3px solid #5db87a">
    <div>
      <div class="detail-label">NPC</div>
      <div class="detail-title">${esc(npc.name)}</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <div style="text-align:right">
        <div class="detail-count-label">Health</div>
        <div class="detail-count" id="npc-health-display">${npc.currentHealth || 0} of ${npc.totalHealth || 0}</div>
      </div>
      ${favBtnHtml(!!npc.favorited, `toggleFavNpc('${npc.id}',this)`)}
    </div>
  </div>`;

  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1rem;">
    <div>
      <div class="custom-section-label">Name</div>
      <input class="edit-input" id="npc-name" value="${esc(npc.name)}" style="width:100%">
    </div>
    <div>
      <div class="custom-section-label">Age</div>
      <input class="edit-input" id="npc-age" value="${esc(npc.age)}" placeholder="Age" style="width:100%">
    </div>
    <div>
      <div class="custom-section-label">Current Health</div>
      <input class="edit-input" id="npc-current-health" type="number" value="${npc.currentHealth || ""}" placeholder="Current HP" style="width:100%">
    </div>
    <div>
      <div class="custom-section-label">Total Health</div>
      <input class="edit-input" id="npc-total-health" type="number" value="${npc.totalHealth || ""}" placeholder="Max HP" style="width:100%">
    </div>
    <div>
      <div class="custom-section-label">Race / Species</div>
      <select class="edit-input" id="npc-race" style="width:100%">
        ${(() => {
          const options = settingsAllowedRaces.length ? [...settingsAllowedRaces] : [...ALL_RACE_NAMES];
          if (npc.race && !options.includes(npc.race)) options.unshift(npc.race);
          const placeholder = `<option value="" ${!npc.race ? "selected" : ""} disabled>Select Race</option>`;
          return placeholder + options.map(r => `<option value="${esc(r)}"${r === npc.race ? " selected" : ""}>${esc(r)}</option>`).join("");
        })()}
      </select>
    </div>
    <div>
      <div class="custom-section-label">Profession</div>
      <input class="edit-input" id="npc-profession" value="${esc(npc.profession)}" placeholder="Occupation or role" style="width:100%">
    </div>
    <div>
      <div class="custom-section-label">Faction</div>
      <select class="edit-input" id="npc-faction" style="width:100%">
        ${factionOptions.map(f => `<option value="${esc(f)}"${f === npc.faction ? " selected" : ""}>${esc(f)}</option>`).join("")}
      </select>
    </div>
    <div>
      <div class="custom-section-label">Store</div>
      <select class="edit-input" id="npc-store" style="width:100%">
        ${storeOptions.map(s => `<option value="${esc(s)}"${s === npc.store ? " selected" : ""}>${esc(s)}</option>`).join("")}
      </select>
    </div>
    <div style="grid-column:1/-1">
      <div class="custom-section-label">Alignment</div>
      <select class="edit-input" id="npc-alignment" style="width:100%">
        ${alignments.map(a => `<option value="${esc(a)}"${a === npc.alignment ? " selected" : ""}>${esc(a)}</option>`).join("")}
      </select>
    </div>
  </div>`;

  html += `<div class="custom-section-label">General Appearance</div>
    <textarea class="edit-textarea" id="npc-appearance" placeholder="Physical description, distinctive features, clothing...">${esc(npc.appearance)}</textarea>`;

  const statDefs = [
    { id: "npc-str", label: "STR", key: "str" },
    { id: "npc-dex", label: "DEX", key: "dex" },
    { id: "npc-con", label: "CON", key: "con" },
    { id: "npc-int", label: "INT", key: "int" },
    { id: "npc-wis", label: "WIS", key: "wis" },
    { id: "npc-cha", label: "CHA", key: "cha" },
  ];
  function initMod(key) {
    const stored = npc[key + 'Mod'];
    return stored !== undefined ? String(stored) : statMod(npc[key]);
  }

  html += `<div class="custom-section-label" style="margin-top:1rem">Stats</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:1rem">`;
  for (const s of statDefs) {
    html += `<div style="background:#10100e;border:1px solid #1e1c14;border-radius:3px;padding:0.6rem 0.5rem;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div class="stat-label" style="text-align:center">${s.label}</div>
      <input id="${s.id}" type="text" value="${npc[s.key] || 10}"
        style="width:38px;text-align:center;font-size:20px;color:#c8a96e;background:#0a0a08;border:1px solid #2a2518;border-radius:2px;padding:1px 0;font-family:inherit;outline:none">
      <input id="${s.id}-mod" type="text" value="${initMod(s.key)}"
        style="width:38px;text-align:center;font-size:12px;color:#9a8e6e;background:#0a0a08;border:1px solid #2a2518;border-radius:2px;padding:1px 0;font-family:inherit;outline:none">
    </div>`;
  }
  html += `</div>`;

  html += `<div class="custom-section-label">Combat Information</div>
    <textarea class="edit-textarea" id="npc-combat" placeholder="AC, initiative, attacks, special abilities, CR...">${esc(npc.combat)}</textarea>`;

  html += `<div class="save-row" style="margin-top:1rem;gap:10px;align-items:center;">
    <button class="btn-save" id="btn-save-npc">Save NPC</button>
    ${npc.id ? `<button class="btn-delete" id="btn-delete-npc">Delete NPC</button>` : ""}
    <span class="save-status" id="npc-save-status" style="color:#3a3020">Saved</span>
  </div>`;

  main.innerHTML = html;
  bindNpcEditorEvents();
}

function bindNpcEditorEvents() {
  document.getElementById("btn-npc-back").onclick = () => { npcEditorState = null; render(); };

  const updateHealthDisplay = () => {
    const current = parseInt(document.getElementById("npc-current-health")?.value) || 0;
    const total = parseInt(document.getElementById("npc-total-health")?.value) || 0;
    const el = document.getElementById("npc-health-display");
    if (el) el.textContent = `${current} of ${total}`;
  };
  document.getElementById("npc-current-health")?.addEventListener("input", updateHealthDisplay);
  document.getElementById("npc-total-health")?.addEventListener("input", updateHealthDisplay);

  ["str", "dex", "con", "int", "wis", "cha"].forEach(key => {
    const input = document.getElementById(`npc-${key}`);
    const modInput = document.getElementById(`npc-${key}-mod`);
    if (input && modInput) {
      input.addEventListener("input", () => {
        const val = parseInt(input.value) || 10;
        const mod = Math.floor((val - 10) / 2);
        modInput.value = (mod >= 0 ? "+" : "") + mod;
      });
    }
  });

  const saveBtn = document.getElementById("btn-save-npc");
  const status = document.getElementById("npc-save-status");
  const markDirty = () => { saveBtn.classList.add("dirty"); status.style.color = "#c8a96e"; status.textContent = "Unsaved changes"; };
  document.querySelectorAll("#main-content input, #main-content textarea, #main-content select").forEach(el => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });
  if (saveBtn) {
    saveBtn.onclick = () => {
      npcEditorState.name = document.getElementById("npc-name")?.value.trim() || "Unnamed NPC";
      npcEditorState.age = document.getElementById("npc-age")?.value.trim() || "";
      npcEditorState.currentHealth = parseInt(document.getElementById("npc-current-health")?.value) || 0;
      npcEditorState.totalHealth = parseInt(document.getElementById("npc-total-health")?.value) || 0;
      npcEditorState.race = document.getElementById("npc-race")?.value.trim() || "";
      npcEditorState.profession = document.getElementById("npc-profession")?.value.trim() || "";
      npcEditorState.faction = document.getElementById("npc-faction")?.value || "N/A";
      npcEditorState.store = document.getElementById("npc-store")?.value || "N/A";
      npcEditorState.alignment = document.getElementById("npc-alignment")?.value || "True Neutral";
      npcEditorState.appearance = document.getElementById("npc-appearance")?.value || "";
      ["str", "dex", "con", "int", "wis", "cha"].forEach(key => {
        npcEditorState[key] = parseInt(document.getElementById(`npc-${key}`)?.value) || 10;
        npcEditorState[key + 'Mod'] = document.getElementById(`npc-${key}-mod`)?.value || "+0";
      });
      npcEditorState.combat = document.getElementById("npc-combat")?.value || "";
      npcEditorState.id = npcEditorState.id || `npc-${Date.now()}`;
      saveCurrentNpcState();
      saveBtn.classList.remove("dirty");
      status.style.color = "#5a9060";
      status.textContent = "Saved!";
      renderSidebar();
      setTimeout(() => render(), 600);
    };
  }

  const deleteBtn = document.getElementById("btn-delete-npc");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (!confirm(`Delete NPC '${npcEditorState.name}'?`)) return;
      npcLinks = npcLinks.filter(n => n.id !== npcEditorState.id);
      saveNpcLinks();
      npcEditorState = null;
      render();
    };
  }
}

function saveCurrentNpcState() {
  const npc = { ...npcEditorState };
  const idx = npcLinks.findIndex(n => n.id === npc.id);
  if (idx >= 0) { npcLinks[idx] = npc; } else { npcLinks.push(npc); }
  saveNpcLinks();
}

function openNpcEditor(id) {
  const npc = npcLinks.find(n => n.id === id);
  if (npc) {
    currentPage = "npcs";
    factionEditorState = null;
    storeEditorState = null;
    npcEditorState = { ...npc };
    render();
  }
}

function createNpc() {
  npcEditorState = {
    id: null, name: "New NPC", age: "", totalHealth: 0, currentHealth: 0,
    race: "", profession: "", faction: "N/A", store: "N/A",
    alignment: "True Neutral", appearance: "",
    str: 10, strMod: "+0", dex: 10, dexMod: "+0", con: 10, conMod: "+0",
    int: 10, intMod: "+0", wis: 10, wisMod: "+0", cha: 10, chaMod: "+0", combat: "",
  };
  render();
}

// ── Player Characters ─────────────────────────────────────────────────────
function renderPcsPage(main) {
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
    <div>
      <h2 style="font-size:20px;font-weight:normal;color:#e8ddb8;letter-spacing:0.08em;">Player Characters</h2>
      <p style="font-size:13px;color:#5a5040;font-style:italic;margin-top:2px;">${pcLinks.length} character${pcLinks.length === 1 ? "" : "s"} in the party</p>
    </div>
  </div>`;
  if (!pcLinks.length) {
    html += `<div style="text-align:center;padding:3rem;border:1px dashed #2a2518;border-radius:3px;">
      <div style="color:#3a3020;font-size:14px;margin-bottom:0.5rem;">No player characters yet</div>
      <div style="color:#2a2010;font-size:12px;font-style:italic;margin-bottom:1.5rem;">Add the party members to track their stats and notes.</div>
      <button onclick="createPc()" class="btn-sm">+ Add Player Character</button>
    </div>`;
  } else {
    html += `<div class="card-grid" style="margin-bottom:1rem;">`;
    pcLinks.forEach(pc => {
      const classLine = [pc.class, pc.subclass].filter(Boolean).join(" — ");
      const meta = [pc.race, classLine, pc.level ? `Lv. ${pc.level}` : ""].filter(Boolean).join(" · ");
      const hp = (pc.currentHealth != null && pc.totalHealth) ? `${pc.currentHealth}/${pc.totalHealth} HP` : "";
      html += `<div class="card-btn" role="button" tabindex="0" onclick="openPcEditor('${pc.id}')">
        <div style="flex:1">
          <div class="card-name">${esc(pc.name)}</div>
          <div style="font-size:11px;color:#5a5040;margin-top:4px;line-height:1.5">${esc(meta)}${hp ? `<span style="color:#3a3020"> — </span>${esc(hp)}` : ""}</div>
        </div>
        ${favBtnHtml(!!pc.favorited, `event.stopPropagation();toggleFavPc('${pc.id}',this)`)}
      </div>`;
    });
    html += `</div><button onclick="createPc()" class="btn-dashed">+ Add Player Character</button>`;
  }
  main.innerHTML = html;
}

function renderPcEditor(main) {
  const pc = pcEditorState;
  const isNew = !pc.id;
  const statKeys = [
    { key: "str", label: "STR" }, { key: "dex", label: "DEX" }, { key: "con", label: "CON" },
    { key: "int", label: "INT" }, { key: "wis", label: "WIS" }, { key: "cha", label: "CHA" },
  ];

  let html = `<button class="back-btn" id="btn-pc-back">← Back to Player Characters</button>`;
  const classLevel = [pc.class, pc.level ? `Lv. ${pc.level}` : ""].filter(Boolean).join(" — ");
  html += `<div class="detail-header" style="background:#16140e;border:1px solid #3a3020;margin-bottom:1.5rem;">
    <div>
      <div class="detail-label">Player Character</div>
      <div class="detail-title" style="color:#c8a96e">${esc(pc.name || "New Character")}</div>
      ${pc.player ? `<div style="font-size:12px;color:#5a5040;margin-top:4px;">Player: ${esc(pc.player)}</div>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <div style="text-align:right">
        ${classLevel ? `<div style="font-size:13px;color:#9a8e6e">${esc(classLevel)}</div>` : ""}
        ${pc.race ? `<div style="font-size:12px;color:#5a5040;margin-top:2px">${esc(pc.race)}</div>` : ""}
      </div>
      ${favBtnHtml(!!pc.favorited, `toggleFavPc('${pc.id}',this)`)}
    </div>
  </div>`;

  html += `<div class="box" style="margin-bottom:1rem;">
    <p class="box-label">Identity</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div><div class="section-label">Name</div><input class="edit-input" id="pc-name" style="width:100%" value="${esc(pc.name || "")}"></div>
      <div><div class="section-label">Player</div><input class="edit-input" id="pc-player" style="width:100%" value="${esc(pc.player || "")}"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
      <div><div class="section-label">Race</div><input class="edit-input" id="pc-race" style="width:100%" value="${esc(pc.race || "")}"></div>
      <div><div class="section-label">Class</div><input class="edit-input" id="pc-class" style="width:100%" value="${esc(pc.class || "")}"></div>
      <div><div class="section-label">Subclass</div><input class="edit-input" id="pc-subclass" style="width:100%" value="${esc(pc.subclass || "")}"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
      <div><div class="section-label">Level</div><input class="edit-input" id="pc-level" type="number" min="1" max="20" style="width:100%" value="${pc.level || ""}"></div>
      <div><div class="section-label">Background</div><input class="edit-input" id="pc-background" style="width:100%" value="${esc(pc.background || "")}"></div>
      <div><div class="section-label">Alignment</div><input class="edit-input" id="pc-alignment" style="width:100%" value="${esc(pc.alignment || "")}"></div>
      <div><div class="section-label">Age</div><input class="edit-input" id="pc-age" style="width:100%" value="${esc(pc.age || "")}"></div>
    </div>
  </div>`;

  html += `<div class="box" style="margin-bottom:1rem;">
    <p class="box-label">Combat</p>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
      <div><div class="section-label">Current HP</div><input class="edit-input" id="pc-current-health" type="number" style="width:100%" value="${pc.currentHealth ?? ""}"></div>
      <div><div class="section-label">Max HP</div><input class="edit-input" id="pc-total-health" type="number" style="width:100%" value="${pc.totalHealth ?? ""}"></div>
      <div><div class="section-label">Armor Class</div><input class="edit-input" id="pc-ac" type="number" style="width:100%" value="${pc.ac ?? ""}"></div>
      <div><div class="section-label">Speed (ft)</div><input class="edit-input" id="pc-speed" type="number" style="width:100%" value="${pc.speed ?? ""}"></div>
      <div><div class="section-label">Initiative</div><input class="edit-input" id="pc-initiative" style="width:100%" value="${esc(pc.initiative ?? "")}"></div>
      <div><div class="section-label">Prof. Bonus</div><input class="edit-input" id="pc-prof-bonus" style="width:100%" value="${esc(pc.profBonus ?? "")}"></div>
    </div>
  </div>`;

  html += `<div class="box" style="margin-bottom:1rem;">
    <p class="box-label">Ability Scores</p>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">`;
  statKeys.forEach(({ key, label }) => {
    const val = pc[key] ?? 10;
    const mod = Math.floor((val - 10) / 2);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    html += `<div style="text-align:center;">
      <div class="section-label" style="text-align:center;">${label}</div>
      <input class="edit-input" id="pc-${key}" type="number" min="1" max="30" style="width:100%;text-align:center;" value="${val}" oninput="updatePcModifier('${key}',this.value)">
      <div id="pc-${key}-mod" style="font-size:13px;color:#c8a96e;margin-top:4px;">${modStr}</div>
    </div>`;
  });
  html += `</div></div>`;

  html += `<div class="box" style="margin-bottom:1rem;">
    <p class="box-label">Passives</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      <div><div class="section-label">Passive Perception</div><input class="edit-input" id="pc-passive-perception" type="number" style="width:100%" value="${pc.passivePerception ?? ""}"></div>
      <div><div class="section-label">Passive Insight</div><input class="edit-input" id="pc-passive-insight" type="number" style="width:100%" value="${pc.passiveInsight ?? ""}"></div>
      <div><div class="section-label">Passive Investigation</div><input class="edit-input" id="pc-passive-investigation" type="number" style="width:100%" value="${pc.passiveInvestigation ?? ""}"></div>
    </div>
  </div>`;

  html += `<div class="box" style="margin-bottom:1rem;">
    <p class="box-label">Defenses</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div><div class="section-label">Damage Immunities</div><textarea class="edit-textarea" id="pc-dmg-immunities" style="min-height:64px;">${esc(pc.damageImmunities || "")}</textarea></div>
      <div><div class="section-label">Condition Immunities</div><textarea class="edit-textarea" id="pc-cond-immunities" style="min-height:64px;">${esc(pc.conditionImmunities || "")}</textarea></div>
      <div><div class="section-label">Resistances</div><textarea class="edit-textarea" id="pc-resistances" style="min-height:64px;">${esc(pc.resistances || "")}</textarea></div>
      <div><div class="section-label">Vulnerabilities</div><textarea class="edit-textarea" id="pc-vulnerabilities" style="min-height:64px;">${esc(pc.vulnerabilities || "")}</textarea></div>
    </div>
  </div>`;

  html += `<div class="box" style="margin-bottom:1rem;">
    <p class="box-label">Notes</p>
    <textarea class="note-textarea" id="pc-notes">${esc(pc.notes || "")}</textarea>
  </div>`;

  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;">
    ${!isNew ? `<button class="btn-delete" id="btn-pc-delete">Delete Character</button>` : `<div></div>`}
    <button class="btn-save dirty" id="btn-pc-save">Save Character</button>
  </div>`;

  main.innerHTML = html;
  bindPcEditorEvents();
}

function updatePcModifier(key, val) {
  const score = parseInt(val) || 10;
  const mod = Math.floor((score - 10) / 2);
  const el = document.getElementById(`pc-${key}-mod`);
  if (el) el.textContent = mod >= 0 ? `+${mod}` : `${mod}`;
}

function bindPcEditorEvents() {
  document.getElementById("btn-pc-back").onclick = () => { pcEditorState = null; render(); };
  document.getElementById("btn-pc-save").onclick = savePc;
  const deleteBtn = document.getElementById("btn-pc-delete");
  if (deleteBtn) deleteBtn.onclick = () => {
    if (!confirm(`Delete ${pcEditorState.name || "this character"}?`)) return;
    pcLinks = pcLinks.filter(p => p.id !== pcEditorState.id);
    savePcLinks();
    pcEditorState = null;
    render();
  };
}

function savePc() {
  const saved = {
    id: pcEditorState.id || ("pc-" + Date.now()),
    favorited: pcEditorState.favorited || false,
    name: document.getElementById("pc-name")?.value.trim() || "Unnamed",
    player: document.getElementById("pc-player")?.value.trim() || "",
    race: document.getElementById("pc-race")?.value.trim() || "",
    class: document.getElementById("pc-class")?.value.trim() || "",
    subclass: document.getElementById("pc-subclass")?.value.trim() || "",
    level: parseInt(document.getElementById("pc-level")?.value) || 0,
    background: document.getElementById("pc-background")?.value.trim() || "",
    alignment: document.getElementById("pc-alignment")?.value.trim() || "",
    age: document.getElementById("pc-age")?.value.trim() || "",
    currentHealth: parseInt(document.getElementById("pc-current-health")?.value) || 0,
    totalHealth: parseInt(document.getElementById("pc-total-health")?.value) || 0,
    ac: parseInt(document.getElementById("pc-ac")?.value) || 0,
    speed: parseInt(document.getElementById("pc-speed")?.value) || 0,
    initiative: document.getElementById("pc-initiative")?.value.trim() || "",
    profBonus: document.getElementById("pc-prof-bonus")?.value.trim() || "",
    str: parseInt(document.getElementById("pc-str")?.value) || 10,
    dex: parseInt(document.getElementById("pc-dex")?.value) || 10,
    con: parseInt(document.getElementById("pc-con")?.value) || 10,
    int: parseInt(document.getElementById("pc-int")?.value) || 10,
    wis: parseInt(document.getElementById("pc-wis")?.value) || 10,
    cha: parseInt(document.getElementById("pc-cha")?.value) || 10,
    passivePerception: parseInt(document.getElementById("pc-passive-perception")?.value) || 0,
    passiveInsight: parseInt(document.getElementById("pc-passive-insight")?.value) || 0,
    passiveInvestigation: parseInt(document.getElementById("pc-passive-investigation")?.value) || 0,
    damageImmunities: document.getElementById("pc-dmg-immunities")?.value.trim() || "",
    conditionImmunities: document.getElementById("pc-cond-immunities")?.value.trim() || "",
    resistances: document.getElementById("pc-resistances")?.value.trim() || "",
    vulnerabilities: document.getElementById("pc-vulnerabilities")?.value.trim() || "",
    notes: document.getElementById("pc-notes")?.value || "",
  };
  const idx = pcLinks.findIndex(p => p.id === saved.id);
  if (idx >= 0) pcLinks[idx] = saved; else pcLinks.push(saved);
  savePcLinks();
  pcEditorState = saved;
  render();
}

function createPc() {
  pcEditorState = {
    id: null, name: "New Character", player: "", race: "", class: "", subclass: "",
    level: 1, background: "", alignment: "", age: "",
    currentHealth: 0, totalHealth: 0, ac: 0, speed: 30,
    initiative: "", profBonus: "+2",
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    passivePerception: 10, passiveInsight: 10, passiveInvestigation: 10,
    damageImmunities: "", conditionImmunities: "", resistances: "", vulnerabilities: "",
    notes: "", favorited: false,
  };
  render();
}

function openPcEditor(id) {
  const pc = pcLinks.find(p => p.id === id);
  if (pc) { pcEditorState = { ...pc }; render(); }
}

// ── Settings Page ──────────────────────────────────────────────────────────
function renderSettingsPage(main) {
  let html = `<div style="max-width:700px;margin:0 auto;">`;
  html += `<h2 style="font-size:22px;font-weight:normal;color:#c8a96e;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.25rem;">Settings</h2>`;
  html += `<p style="font-size:13px;color:#5a5040;font-style:italic;margin-bottom:2rem;">Campaign configuration for The World of Nymara</p>`;

  html += `<div style="background:#0e1214;border:1px solid #1e2a1e;border-left:3px solid #5db87a;border-radius:2px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">`;
  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">`;
  html += `<div>
    <div style="font-size:14px;color:#d4c9a8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Available NPC Races</div>
    <div style="font-size:12px;color:#5a5040;font-style:italic;">Select which races appear in the NPC race dropdown</div>
  </div>`;
  html += `<div style="display:flex;gap:8px;">
    <button id="settings-race-all" style="background:none;border:1px solid #2a3a2a;border-radius:2px;color:#7a9a6a;font-family:inherit;font-size:11px;letter-spacing:0.08em;padding:4px 10px;cursor:pointer;">Select All</button>
    <button id="settings-race-none" style="background:none;border:1px solid #2a2518;border-radius:2px;color:#5a5040;font-family:inherit;font-size:11px;letter-spacing:0.08em;padding:4px 10px;cursor:pointer;">Deselect All</button>
  </div>`;
  html += `</div>`;

  for (const group of ALL_DND_RACES) {
    html += `<div style="margin-bottom:1rem;">`;
    html += `<div style="font-size:10px;letter-spacing:0.15em;color:#3a3020;text-transform:uppercase;margin-bottom:0.5rem;">${esc(group.group)}</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;">`;
    for (const race of group.races) {
      const checked = settingsAllowedRaces.includes(race);
      html += `<label style="display:flex;align-items:center;gap:6px;background:${checked ? "#131c13" : "#0d0f14"};border:1px solid ${checked ? "#2a4a2a" : "#1e1c14"};border-radius:2px;padding:5px 10px;cursor:pointer;font-size:13px;color:${checked ? "#a8c8a0" : "#5a5040"};transition:all 0.15s;" data-race="${esc(race)}">
        <input type="checkbox" data-race-check="${esc(race)}" style="accent-color:#5db87a;cursor:pointer;"${checked ? " checked" : ""}> ${esc(race)}
      </label>`;
    }
    html += `</div></div>`;
  }

  html += `</div></div>`;
  main.innerHTML = html;

  // Checkbox change handler
  main.querySelectorAll("input[data-race-check]").forEach(cb => {
    cb.onchange = () => {
      const race = cb.dataset.raceCheck;
      if (cb.checked) {
        if (!settingsAllowedRaces.includes(race)) settingsAllowedRaces = [...settingsAllowedRaces, race];
      } else {
        settingsAllowedRaces = settingsAllowedRaces.filter(r => r !== race);
      }
      saveSettings();
      // Re-render to update label styles
      renderSettingsPage(main);
    };
  });

  document.getElementById("settings-race-all").onclick = () => {
    settingsAllowedRaces = [...ALL_RACE_NAMES];
    saveSettings();
    renderSettingsPage(main);
  };
  document.getElementById("settings-race-none").onclick = () => {
    settingsAllowedRaces = [];
    saveSettings();
    renderSettingsPage(main);
  };
}

// ── Home Page ──────────────────────────────────────────────────────────────
function renderHomePage(main) {
  const favLocations = [
    ...CITIES.filter(c => cityFavorites[c.id]),
    ...customLocations.filter(l => l.favorited),
  ];
  const favMagicItems = magicItems.filter(i => i.favorited);
  const favFactions = factionLinks.filter(f => f.favorited);
  const favStores = storeLinks.filter(s => s.favorited);
  const favShips = shipLinks.filter(s => s.favorited);
  const favNpcs = npcLinks.filter(n => n.favorited);
  const favPcs = pcLinks.filter(p => p.favorited);

  function makeRow(label, meta, onclickStr, favBtn) {
    return `<div role="button" tabindex="0" onclick="${onclickStr}" style="padding:7px 12px;border-bottom:1px solid #131210;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:6px" onmouseover="this.style.background='#161410'" onmouseout="this.style.background=''">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:#a09070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
        ${meta ? `<div style="font-size:11px;color:#5a5040;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${meta}</div>` : ""}
      </div>
      ${favBtn}
    </div>`;
  }

  function makePanel(title, color, rows) {
    const body = rows.length
      ? rows.join("")
      : `<div style="padding:18px 12px;text-align:center;color:#252010;font-size:12px;font-style:italic;">None bookmarked</div>`;
    return `<div style="background:#0b0d11;border:1px solid #1e1c14;border-radius:3px;overflow:hidden;display:flex;flex-direction:column">
      <div style="padding:8px 12px;border-bottom:1px solid #1e1c14;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <span style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:${color}">${title}</span>
        ${rows.length ? `<span style="font-size:11px;color:#3a3020">${rows.length}</span>` : ""}
      </div>
      <div>${body}</div>
    </div>`;
  }

  const locationRows = favLocations.map(loc => {
    const isBuiltin = CITIES.some(c => c.id === loc.id);
    const kindLabel = isBuiltin ? loc.size : (loc.kind === "city" ? "City / Town" : loc.kind === "landmark" ? "Landmark / Ruin" : loc.kind === "dungeon" ? "Dungeon" : "");
    const toggleFn = isBuiltin
      ? `event.stopPropagation();toggleFavCity(${loc.id},this)`
      : `event.stopPropagation();toggleFavLocation('${loc.id}',this)`;
    return makeRow(esc(loc.name), esc(kindLabel), `navToFavLocation('${loc.id}')`, favBtnHtml(true, toggleFn));
  });

  const magicRows = favMagicItems.map(item => {
    const meta = [item.type, item.rarity].filter(Boolean).join(" · ");
    return makeRow(esc(item.name), esc(meta), `navToFavMagicItem('${item.id}')`, favBtnHtml(true, `event.stopPropagation();toggleFavMagicItem('${item.id}',this)`));
  });

  const factionRows = favFactions.map(faction => {
    const cityNames = faction.assignments.map(a => getLocationById(a.cityId)?.name || "").filter(Boolean).join(", ");
    return makeRow(esc(faction.label || faction.name), esc(cityNames), `navToFavFaction('${faction.id}')`, favBtnHtml(true, `event.stopPropagation();toggleFavFaction('${faction.id}',this)`));
  });

  const storeRows = favStores.map(store => {
    const cityNames = store.assignments.map(a => getLocationById(a.cityId)?.name || "").filter(Boolean).join(", ");
    return makeRow(esc(store.label || store.name), esc(cityNames), `navToFavStore('${store.id}')`, favBtnHtml(true, `event.stopPropagation();toggleFavStore('${store.id}',this)`));
  });

  const shipRows = favShips.map(ship => {
    return makeRow(esc(ship.name), esc(ship.type || ""), `navToFavShip('${ship.id}')`, favBtnHtml(true, `event.stopPropagation();toggleFavShip('${ship.id}',this)`));
  });

  const npcRows = favNpcs.map(npc => {
    const meta = [npc.race, npc.profession].filter(Boolean).join(" · ");
    return makeRow(esc(npc.name), esc(meta), `navToFavNpc('${npc.id}')`, favBtnHtml(true, `event.stopPropagation();toggleFavNpc('${npc.id}',this)`));
  });

  const pcRows = favPcs.map(pc => {
    const meta = [pc.race, pc.class, pc.level ? `Lv. ${pc.level}` : ""].filter(Boolean).join(" · ");
    return makeRow(esc(pc.name), esc(meta), `navToFavPc('${pc.id}')`, favBtnHtml(true, `event.stopPropagation();toggleFavPc('${pc.id}',this)`));
  });

  let html = `<div style="max-width:1200px;margin:0 auto;">`;
  html += `<h2 style="font-size:22px;font-weight:normal;color:#c8a96e;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.25rem;">Favorites</h2>`;
  html += `<p style="font-size:13px;color:#5a5040;font-style:italic;margin-bottom:1.5rem;">Your bookmarked locations, items, and characters</p>`;
  html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">`;
  html += makePanel("Locations", "#c8a96e", locationRows);
  html += makePanel("Magic Items", "#b07a9e", magicRows);
  html += makePanel("Factions", "#8090c0", factionRows);
  html += makePanel("Stores", "#a09070", storeRows);
  html += `</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">`;
  html += makePanel("Ships", "#60a0c0", shipRows);
  html += makePanel("NPCs", "#9a8e6e", npcRows);
  html += makePanel("Player Characters", "#88c0a0", pcRows);
  html += `</div></div>`;

  main.innerHTML = html;
}

function navToFavLocation(id) {
  const loc = allLocations().find(l => String(l.id) === String(id));
  if (!loc) return;
  currentPage = "locations";
  selected = loc;
  selectedType = loc.kind || "city";
  currentTab = "Overview";
  detailItem = null;
  factionEditorState = null;
  storeEditorState = null;
  shipEditorState = null;
  npcEditorState = null;
  selectedMagicItemId = null;
  render();
}

function navToFavMagicItem(id) {
  currentPage = "magicItems";
  selectedMagicItemId = id;
  factionEditorState = null;
  storeEditorState = null;
  shipEditorState = null;
  npcEditorState = null;
  render();
}

function navToFavFaction(id) {
  const f = factionLinks.find(f => f.id === id);
  if (!f) return;
  currentPage = "factions";
  selectedMagicItemId = null;
  storeEditorState = null;
  shipEditorState = null;
  npcEditorState = null;
  openFactionEditor(f.name);
  render();
}

function navToFavStore(id) {
  const s = storeLinks.find(s => s.id === id);
  if (!s) return;
  currentPage = "stores";
  factionEditorState = null;
  selectedMagicItemId = null;
  shipEditorState = null;
  npcEditorState = null;
  openStoreEditor(s.name);
  render();
}

function navToFavShip(id) {
  const ship = shipLinks.find(s => s.id === id);
  if (!ship) return;
  currentPage = "ships";
  factionEditorState = null;
  selectedMagicItemId = null;
  storeEditorState = null;
  npcEditorState = null;
  shipEditorState = { ...ship };
  render();
}

function navToFavNpc(id) {
  const npc = npcLinks.find(n => n.id === id);
  if (!npc) return;
  currentPage = "npcs";
  factionEditorState = null;
  selectedMagicItemId = null;
  storeEditorState = null;
  shipEditorState = null;
  npcEditorState = { ...npc };
  render();
}

function navToFavPc(id) {
  const pc = pcLinks.find(p => p.id === id);
  if (!pc) return;
  currentPage = "pcs";
  factionEditorState = null;
  selectedMagicItemId = null;
  storeEditorState = null;
  shipEditorState = null;
  npcEditorState = null;
  pcEditorState = { ...pc };
  render();
}

// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById("btn-add-location").onclick = () => {
  document.getElementById("popup-overlay").classList.remove("hidden");
};
document.getElementById("popup-overlay").onclick = closePopup;

// Hotbar events
document.querySelectorAll(".hotbar-btn").forEach(btn => {
  btn.onclick = () => {
    currentPage = btn.dataset.page;
    selected = CITIES[0]; // Reset selection
    selectedMagicItemId = null;
    factionEditorState = null;
    storeEditorState = null;
    shipEditorState = null;
    npcEditorState = null;
    pcEditorState = null;
    currentTab = "Overview";
    detailItem = null;
    render();
  };
});

render();

// Escape HTML
function esc(s) {
  if (typeof s !== "string") return s;
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
