/* ========== WORKSPACE LAYOUT (presets + custom pins) ========== */
const LAYOUT_WIDGETS = ["modalClock", "modalMusic", "modalPomo"];
const LAYOUT_SLOTS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];

const LAYOUT_PRESETS = {
  minimal: {
    pins: {}
  },
  focus: {
    pins: {
      modalClock: { slot: "top-left", size: "sm" },
      modalPomo: { slot: "top-right", size: "sm" },
      modalMusic: { slot: "bottom-left", size: "md" }
    }
  },
  chill: {
    pins: {
      modalClock: { slot: "top-center", size: "md" },
      modalMusic: { slot: "bottom-center", size: "sm" }
    }
  },
  studio: {
    pins: {
      modalClock: { slot: "top-right", size: "sm" },
      modalMusic: { slot: "bottom-center", size: "lg" },
      modalPomo: { slot: "bottom-left", size: "sm" }
    }
  }
};

const DEFAULT_LAYOUT = {
  preset: "minimal",
  custom: {
    modalClock: null,
    modalMusic: null,
    modalPomo: null
  }
};

function normalizeLayoutPin(pin) {
  if (!pin || !pin.slot || !LAYOUT_SLOTS.includes(pin.slot)) return null;
  const size = pin.size === "sm" || pin.size === "md" || pin.size === "lg" ? pin.size : "sm";
  return { slot: pin.slot, size };
}

function isLayoutFeatureEnabled() {
  return typeof isMobileViewport !== "function" || !isMobileViewport();
}

function getLayoutPins() {
  if (!isLayoutFeatureEnabled()) return {};

  const layout = state.layout || DEFAULT_LAYOUT;
  if (layout.preset === "custom") {
    const pins = {};
    LAYOUT_WIDGETS.forEach((id) => {
      const pin = normalizeLayoutPin(layout.custom?.[id]);
      if (pin) pins[id] = pin;
    });
    return pins;
  }
  const preset = LAYOUT_PRESETS[layout.preset] || LAYOUT_PRESETS.minimal;
  return { ...preset.pins };
}

function hasLayoutPins() {
  return Object.keys(getLayoutPins()).length > 0;
}

function applyLayout() {
  const layout = state.layout || DEFAULT_LAYOUT;
  const pins = getLayoutPins();
  const workspace = Object.keys(pins).length > 0;

  document.body.dataset.layout = layout.preset || "minimal";
  document.body.classList.toggle("layout-workspace", workspace);

  document.querySelectorAll(".widget-modal").forEach((modal) => {
    modal.classList.remove(
      "layout-pinned",
      "layout-expanded",
      "layout-size-sm",
      "layout-size-md",
      "layout-size-lg"
    );
    LAYOUT_SLOTS.forEach((slot) => modal.classList.remove(`layout-slot-${slot}`));

    const pin = pins[modal.id];
    if (pin) {
      modal.classList.add("layout-pinned", `layout-slot-${pin.slot}`, `layout-size-${pin.size}`);
      modal.removeAttribute("hidden");
      modal.classList.remove("open");
    } else if (modal.id !== activeWidgetModal) {
      modal.classList.remove("open");
      if (!modal.classList.contains("open")) modal.setAttribute("hidden", "");
    }
  });

  document.body.classList.remove("layout-mobile-stack");
  LAYOUT_WIDGETS.forEach((id) => {
    document.getElementById(id)?.removeAttribute("data-mobile-stack");
  });

  if (!isLayoutFeatureEnabled()) {
    const layoutModal = document.getElementById("modalLayout");
    layoutModal?.classList.remove("open");
    layoutModal?.setAttribute("hidden", "");
    document.querySelector('.dock-btn[data-modal="modalLayout"]')?.classList.remove("active");
  }

  renderLayoutPicker();
}

function setLayoutPreset(presetId) {
  if (!isLayoutFeatureEnabled()) return;
  if (!LAYOUT_PRESETS[presetId]) return;
  state.layout.preset = presetId;
  if (presetId !== "custom") {
    state.layout.custom = {
      modalClock: null,
      modalMusic: null,
      modalPomo: null
    };
  }
  saveStorage();
  closeWidgetModals();
  applyLayout();
  toastKey("toast.layoutApplied", { name: t(`layout.preset.${presetId}`) }, "success");
}

function setCustomLayoutPin(widgetId, enabled, slot, size) {
  if (!isLayoutFeatureEnabled()) return;
  if (!LAYOUT_WIDGETS.includes(widgetId)) return;
  state.layout.preset = "custom";
  state.layout.custom[widgetId] = enabled
    ? normalizeLayoutPin({ slot, size: size || "sm" })
    : null;
  saveStorage();
  applyLayout();
}

function renderLayoutPicker() {
  if (!isLayoutFeatureEnabled()) return;

  const grid = document.getElementById("layoutPresetGrid");
  const customPanel = document.getElementById("layoutCustomPanel");
  if (!grid) return;

  const current = state.layout?.preset || "minimal";

  grid.innerHTML = Object.keys(LAYOUT_PRESETS)
    .map(
      (id) => `
    <button type="button" class="layout-preset-card${current === id ? " is-active" : ""}" data-preset="${id}">
      <span class="layout-preset-preview layout-preset-preview--${id}" aria-hidden="true"></span>
      <span class="layout-preset-name">${t(`layout.preset.${id}`)}</span>
      <span class="layout-preset-desc">${t(`layout.presetDesc.${id}`)}</span>
    </button>
  `
    )
    .concat(
      `<button type="button" class="layout-preset-card layout-preset-card--custom${
        current === "custom" ? " is-active" : ""
      }" data-preset="custom">
      <span class="layout-preset-preview layout-preset-preview--custom" aria-hidden="true"></span>
      <span class="layout-preset-name">${t("layout.preset.custom")}</span>
      <span class="layout-preset-desc">${t("layout.presetDesc.custom")}</span>
    </button>`
    )
    .join("");

  grid.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.preset;
      if (id === "custom") {
        state.layout.preset = "custom";
        saveStorage();
        renderLayoutPicker();
        return;
      }
      setLayoutPreset(id);
    });
  });

  if (customPanel) {
    customPanel.classList.toggle("is-open", current === "custom");
    renderLayoutCustomForm();
  }
}

function renderLayoutCustomForm() {
  const form = document.getElementById("layoutCustomForm");
  if (!form) return;

  const labels = {
    modalClock: "layout.widget.clock",
    modalMusic: "layout.widget.music",
    modalPomo: "layout.widget.pomo"
  };

  form.innerHTML = LAYOUT_WIDGETS.map((widgetId) => {
    const pin = state.layout?.custom?.[widgetId];
    const enabled = !!pin;
    const slot = pin?.slot || "top-left";
    const size = pin?.size || "sm";
    const slotOptions = LAYOUT_SLOTS.map(
      (s) => `<option value="${s}"${s === slot ? " selected" : ""}>${t(`layout.slot.${s}`)}</option>`
    ).join("");
    const sizeOptions = ["sm", "md", "lg"]
      .map(
        (sz) =>
          `<option value="${sz}"${sz === size ? " selected" : ""}>${t(`layout.size.${sz}`)}</option>`
      )
      .join("");

    return `
      <div class="layout-custom-row" data-widget="${widgetId}">
        <label class="layout-custom-toggle">
          <input type="checkbox" class="layout-custom-check" data-widget="${widgetId}" ${
      enabled ? "checked" : ""
    } />
          <span>${t(labels[widgetId])}</span>
        </label>
        <select class="layout-custom-slot" data-widget="${widgetId}" ${enabled ? "" : "disabled"}>${slotOptions}</select>
        <select class="layout-custom-size" data-widget="${widgetId}" ${enabled ? "" : "disabled"}>${sizeOptions}</select>
      </div>
    `;
  }).join("");

  form.querySelectorAll(".layout-custom-check").forEach((input) => {
    input.addEventListener("change", () => {
      const widgetId = input.dataset.widget;
      const row = form.querySelector(`.layout-custom-row[data-widget="${widgetId}"]`);
      const slotEl = row?.querySelector(".layout-custom-slot");
      const sizeEl = row?.querySelector(".layout-custom-size");
      if (slotEl) slotEl.disabled = !input.checked;
      if (sizeEl) sizeEl.disabled = !input.checked;
      if (!input.checked) {
        setCustomLayoutPin(widgetId, false);
        return;
      }
      setCustomLayoutPin(widgetId, true, slotEl?.value, sizeEl?.value);
    });
  });

  form.querySelectorAll(".layout-custom-slot, .layout-custom-size").forEach((select) => {
    select.addEventListener("change", () => {
      const widgetId = select.dataset.widget;
      const row = form.querySelector(`.layout-custom-row[data-widget="${widgetId}"]`);
      const check = row?.querySelector(".layout-custom-check");
      if (!check?.checked) return;
      const slotEl = row.querySelector(".layout-custom-slot");
      const sizeEl = row.querySelector(".layout-custom-size");
      setCustomLayoutPin(widgetId, true, slotEl.value, sizeEl.value);
    });
  });
}

function bindLayoutApplyCustom() {
  document.getElementById("layoutApplyCustom")?.addEventListener("click", () => {
    toastKey("toast.layoutCustomSaved", null, "success");
    closeWidgetModals();
  });
}

function initLayoutFromStorage() {
  if (!state.layout) state.layout = structuredClone(DEFAULT_LAYOUT);
  applyLayout();
}

function loadLayoutFromStorage(data) {
  if (!data?.layout || typeof data.layout !== "object") {
    state.layout = structuredClone(DEFAULT_LAYOUT);
    return;
  }
  const preset = data.layout.preset;
  const validPreset = preset && (LAYOUT_PRESETS[preset] || preset === "custom") ? preset : "minimal";
  state.layout = {
    preset: validPreset,
    custom: { ...DEFAULT_LAYOUT.custom }
  };
  if (preset === "custom" && data.layout.custom) {
    LAYOUT_WIDGETS.forEach((id) => {
      state.layout.custom[id] = normalizeLayoutPin(data.layout.custom[id]);
    });
  }
}

function layoutStoragePayload() {
  return {
    preset: state.layout?.preset || "minimal",
    custom: state.layout?.custom || DEFAULT_LAYOUT.custom
  };
}

function isLayoutPinnedModal(modalId) {
  const modal = document.getElementById(modalId);
  return modal?.classList.contains("layout-pinned");
}

function collapseLayoutExpanded() {
  document.querySelectorAll(".widget-modal.layout-expanded").forEach((m) => {
    m.classList.remove("layout-expanded", "open");
    if (m.classList.contains("layout-pinned")) {
      m.classList.remove("open");
    } else {
      m.setAttribute("hidden", "");
    }
  });
  modalBackdrop?.classList.remove("open");
  modalBackdrop?.setAttribute("aria-hidden", "true");
  setMobileModalLock?.(false);
  activeWidgetModal = null;
  document.querySelectorAll(".dock-btn[data-modal]").forEach((b) => b.classList.remove("active"));
}
