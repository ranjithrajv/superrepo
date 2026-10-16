import { version } from "./api.js";
import { customToService } from "./catalog.js";
import { OPTIONAL_ORIGINS, grantedHosts, removeHost, requestHost } from "./host-access.js";
import { PICKABLE, glyphMarkup } from "./icons.js";
import {
  loadSettings,
  saveSettings,
  resetSettings,
  normalizeCustom,
  sortByOrder,
} from "./settings.js";

const $ = (id) => document.getElementById(id);

let settings = await loadSettings();

$("version").textContent = version;
$("reset").addEventListener("click", onReset);
$("customForm").addEventListener("submit", onAddCustom);

// The icon picker for user-defined services, with a live preview.
for (const name of PICKABLE) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  $("customIcon").append(option);
}

function syncIconPreview() {
  const preview = $("customIconPreview");
  preview.style.setProperty("--c", $("customColor").value);
  preview.innerHTML = glyphMarkup($("customIcon").value);
}

$("customIcon").addEventListener("change", syncIconPreview);
$("customColor").addEventListener("input", syncIconPreview);
syncIconPreview();

// ------------------------------------------------------- optional host access

/**
 * One row per optional host. This has to be a button rather than a checkbox:
 * `permissions.request` is only permitted inside a real user gesture, and a
 * button click is the one we can guarantee.
 */
async function renderHosts() {
  const list = $("hostList");
  if (!list) return;
  const granted = new Set(await grantedHosts());
  list.replaceChildren();

  for (const origin of OPTIONAL_ORIGINS) {
    const host = origin.replace(/^https?:\/\//, "");
    const on = granted.has(origin);

    const text = document.createElement("span");
    text.className = "item-text";
    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = host;
    const blurb = document.createElement("span");
    blurb.className = "item-blurb";
    blurb.textContent = on
      ? "Buttons and the panel appear here."
      : "No access — SuperRepo cannot read this site.";
    text.append(name, blurb);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = on ? "Remove access" : "Enable";
    button.setAttribute("aria-label", on ? `Stop showing buttons on ${host}` : `Show buttons on ${host}`);
    button.addEventListener("click", () => on ? onRemoveHost(origin) : onRequestHost(origin));

    const li = document.createElement("li");
    li.className = "item";
    li.append(text, button);
    list.append(li);
  }
}

async function onRequestHost(origin) {
  const ok = await requestHost(origin);
  await renderHosts();
  setStatus(ok ? `${origin} enabled` : "Access was not granted");
}

async function onRemoveHost(origin) {
  const ok = await removeHost(origin);
  await renderHosts();
  setStatus(ok ? `Access to ${origin} removed` : "Access could not be removed");
}

renderHosts();

render();

// ------------------------------------------------------------------- settings

async function save(patch, message = "Saved") {
  settings = await saveSettings(patch);
  render();
  setStatus(message);
}

async function onReset() {
  settings = await resetSettings();

  $("customForm").reset();
  $("customColor").value = "#5b6cff";
  render();
  setStatus("Defaults restored");
}

async function onAddCustom(event) {
  event.preventDefault();
  const entry = normalizeCustom({
    name: $("customName").value,
    template: $("customTemplate").value,
    blurb: $("customBlurb").value,
    icon: $("customIcon").value,
    color: $("customColor").value,
  });
  if (!entry) {
    setStatus("A name and an http(s) URL template are required");
    return;
  }
  const form = $("customForm");
  form.reset();
  $("customColor").value = "#5b6cff";
  syncIconPreview();
  await save({ custom: [...settings.custom, entry] }, `${entry.name} added`);
}

async function onRemoveCustom(id) {
  await save(
    {
      custom: settings.custom.filter((c) => c.id !== id),
      order: settings.order.filter((serviceId) => serviceId !== `custom:${id}` && serviceId !== id),
    },
    "Removed",
  );
}

// ---------------------------------------------------------------------- render

function render() {
  // Pinning, the service list and their ordering all live in the in-page panel
  // now. What is left here is your own services, other hosts, and reset.
  renderCustom();
}


function renderCustom() {
  const list = $("customList");
  list.replaceChildren();
  if (!settings.custom.length) {
    list.append(
      hintItem("Nothing yet. Paste a URL template above — anything that takes {owner}/{repo}."),
    );
    return;
  }
  for (const def of settings.custom) {
    list.append(customItem(def));
  }
}

/** One glyph element, tinted with the service colour. */
function glyphEl(icon, color) {
  const span = document.createElement("span");
  span.className = "glyph";
  span.style.setProperty("--c", color || "#64748b");
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = glyphMarkup(icon); // static markup from src/icons.js
  return span;
}

function customItem(def) {
  const service = customToService(def);
  const li = document.createElement("li");
  li.className = "item";

  const mark = glyphEl(service.icon, service.color);

  const text = document.createElement("span");
  text.className = "item-text";

  const name = document.createElement("span");
  name.className = "item-name";
  name.textContent = def.name;

  const template = document.createElement("span");
  template.className = "item-blurb";
  template.textContent = def.template;
  template.style.fontFamily = "var(--mono)";

  text.append(name, template);

  const actions = document.createElement("span");
  actions.className = "item-actions";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => onRemoveCustom(def.id));
  actions.append(remove);

  li.append(mark, text, actions);
  return li;
}

function small(text) {
  const el = document.createElement("span");
  el.className = "badge";
  el.textContent = text;
  return el;
}

function hintItem(text) {
  const li = document.createElement("li");
  li.className = "item";
  const span = document.createElement("span");
  span.className = "item-blurb";
  span.textContent = text;
  li.append(span);
  return li;
}

let statusTimer = null;
function setStatus(message) {
  const el = $("status");
  el.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    el.textContent = "";
  }, 1800);
}
