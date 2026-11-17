/* global AtlasLib, CSV, ATLAS_DATA */
(function () {
  "use strict";

  const L = window.AtlasLib;
  const DATA = window.ATLAS_DATA;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const esc = L.escapeHTML;

  const SOURCE_COLORS = {
    S1: "#cf5b72",
    S2: "#d9b36c",
    S3: "#93a98d",
    S4: "#86a2b3",
    S5: "#b8a48a",
    S6: "#c27c52",
    S7: "#c98b9b",
  };

  const state = {
    varietyQuery: "",
    varietyColor: "all",
    varietyRole: "all",
    sortKey: "role",
    sortDirection: "asc",
    openVillage: null,
    markerElevation: 2200,
  };

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value !== null && value !== undefined) node.setAttribute(key, String(value));
      });
    }
    return node;
  }

  function source(id) {
    return DATA.sources.find((row) => row.id === id);
  }

  function sourceButton(id, label) {
    const row = source(id);
    if (!row) return '<span class="src-badge">' + esc(id) + "</span>";
    return (
      '<button type="button" class="source-link src-badge" data-source="' +
      esc(id) +
      '" aria-label="查看来源 ' +
      esc(id) +
      '：' +
      esc(row.title) +
      '">' +
      esc(label || id) +
      "</button>"
    );
  }

  function cite(year, sourceId) {
    return (
      '<span class="cite">' +
      esc(year) +
      " · " +
      sourceButton(sourceId) +
      "</span>"
    );
  }

  function sourceStrip(ids) {
    const unique = Array.from(new Set(ids)).filter(Boolean);
    return (
      "来源：" +
      unique
        .map((id) => {
          const row = source(id);
          return row
            ? sourceButton(id) +
                " " +
                esc(row.publisher) +
                "（" +
                esc(row.date) +
                "）"
            : esc(id);
        })
        .join("　·　") +
      "　·　访问日期 2026-11-17。"
    );
  }

  /* ------------------------------------------------------------------------
     Contour texture
     ------------------------------------------------------------------------ */

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function contourPath(cx, cy, radius, wobble, phase, random) {
    const points = [];
    const steps = 56;
    for (let i = 0; i < steps; i += 1) {
      const angle = (Math.PI * 2 * i) / steps;
      const r =
        radius *
        (1 +
          wobble * Math.sin(3 * angle + phase) +
          wobble * 0.55 * Math.sin(7 * angle + phase * 2.1) +
          (random() - 0.5) * 0.03);
      points.push([cx + Math.cos(angle) * r * 1.42, cy + Math.sin(angle) * r]);
    }
    return (
      points
        .map((point, index) => (index === 0 ? "M" : "L") + point[0].toFixed(1) + " " + point[1].toFixed(1))
        .join(" ") + " Z"
    );
  }

  function drawContours() {
    const mount = $("#contour");
    if (!mount) return;
    const svg = svgEl("svg", { viewBox: "0 0 1440 900", preserveAspectRatio: "xMidYMid slice" });
    const random = mulberry32(8028);
    const centers = [
      { x: 330, y: 320, levels: 11, base: 44, step: 30 },
      { x: 1060, y: 260, levels: 9, base: 54, step: 34 },
      { x: 790, y: 700, levels: 8, base: 38, step: 28 },
    ];
    centers.forEach((center, centerIndex) => {
      for (let level = 0; level < center.levels; level += 1) {
        const radius = center.base + level * center.step;
        const path = svgEl("path", {
          d: contourPath(center.x, center.y, radius, 0.07 + centerIndex * 0.015, centerIndex * 1.7, random),
          fill: "none",
          stroke: level % 4 === 0 ? "rgba(217,179,108,.42)" : "rgba(241,232,219,.17)",
          "stroke-width": level % 4 === 0 ? 1.1 : 0.7,
        });
        svg.appendChild(path);
        if (level === Math.floor(center.levels * 0.55)) {
          const label = svgEl("text", {
            x: center.x + radius * 1.35,
            y: center.y + 4,
            fill: "rgba(217,179,108,.55)",
            "font-family": "monospace",
            "font-size": "10",
            "letter-spacing": "0.08em",
          });
          label.textContent = String(1800 + centerIndex * 500 + level * 40);
          svg.appendChild(label);
        }
      }
    });
    for (let i = 0; i < 9; i += 1) {
      const y = 80 + i * 96;
      svg.appendChild(
        svgEl("line", {
          x1: 0,
          x2: 1440,
          y1: y,
          y2: y,
          stroke: "rgba(166,58,80,.08)",
          "stroke-width": 1,
        })
      );
    }
    mount.appendChild(svg);
  }

  /* ------------------------------------------------------------------------
     Hero
     ------------------------------------------------------------------------ */

  function renderHero() {
    const deqinArea = L.areaRowsForDeqin(DATA.area);
    const area2024 = deqinArea.find((row) => row.year === "2024");
    const altitude = DATA.climate.filter((row) => row.metric === "elevation" && row.year === "2025")[0];
    const stats = [
      {
        value: L.formatNumber(area2024.value),
        unit: "亩",
        label: "2024 面积口径之一",
        year: area2024.year,
        source: area2024.source_id,
      },
      {
        value: altitude.value_min + "–" + altitude.value_max,
        unit: "m",
        label: "园地海拔报道范围",
        year: altitude.year,
        source: altitude.source_id,
      },
      {
        value: String(DATA.varieties.length),
        unit: "个",
        label: "公开报道所列品种",
        year: "2024",
        source: "S3",
      },
    ];
    $("#hero-stats").innerHTML =
      stats
        .map(
          (stat) =>
            '<div class="hero-stat"><strong>' +
            esc(stat.value) +
            " <small>" +
            esc(stat.unit) +
            "</small></strong><span>" +
            esc(stat.label) +
            "<br>" +
            cite(stat.year, stat.source) +
            "</span></div>"
        )
        .join("") +
      '<p class="hero-stat-note">同年另一来源记 6867 亩；四种口径见第 04 节。</p>';
  }

  /* ------------------------------------------------------------------------
     Elevation profile
     ------------------------------------------------------------------------ */

  function renderProfile() {
    const svg = $("#profile-svg");
    svg.innerHTML = "";
    const width = 920;
    const height = 520;
    const left = 66;
    const right = 24;
    const top = 34;
    const bottom = 62;
    const y = L.scaleLinear(1600, 3100, height - bottom, top);
    const x = L.scaleLinear(1, DATA.villages.length, left + 34, width - right - 48);

    const defs = svgEl("defs");
    const gradient = svgEl("linearGradient", { id: "terrainFill", x1: "0", y1: "0", x2: "0", y2: "1" });
    gradient.appendChild(svgEl("stop", { offset: "0", "stop-color": "#3b2922" }));
    gradient.appendChild(svgEl("stop", { offset: "1", "stop-color": "#1a1210" }));
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const bands = [
      { key: "early", from: 1600, to: 2000, label: "早熟带 · <2000 m" },
      { key: "mid", from: 2000, to: 2500, label: "中熟带 · 2000–2500 m" },
      { key: "late", from: 2500, to: 3100, label: "晚熟带 · >2500 m" },
    ];
    bands.forEach((band) => {
      svg.appendChild(
        svgEl("rect", {
          class: "band-" + band.key,
          x: left,
          y: y(band.to),
          width: width - left - right,
          height: Math.abs(y(band.from) - y(band.to)),
        })
      );
      const label = svgEl("text", {
        class: "band-label",
        x: width - right - 2,
        y: y(band.to) + 15,
        "text-anchor": "end",
      });
      label.textContent = band.label;
      svg.appendChild(label);
    });

    for (let elevation = 1600; elevation <= 3100; elevation += 300) {
      svg.appendChild(
        svgEl("line", {
          class: "profile-grid",
          x1: left,
          x2: width - right,
          y1: y(elevation),
          y2: y(elevation),
        })
      );
      const tick = svgEl("text", { x: left - 12, y: y(elevation) + 4, "text-anchor": "end" });
      tick.textContent = elevation + " m";
      svg.appendChild(tick);
    }
    const axis = svgEl("line", { class: "profile-axis", x1: left, x2: left, y1: top, y2: height - bottom });
    svg.appendChild(axis);

    const points = DATA.villages.map((village) => ({
      village,
      px: x(Number(village.order)),
      py: y(Number(village.elevation_representative)),
    }));

    const terrainPoints = [[left, height - bottom]];
    points.forEach((point) => terrainPoints.push([point.px, point.py]));
    terrainPoints.push([width - right, height - bottom]);
    let terrain = "M" + terrainPoints[0][0] + " " + terrainPoints[0][1];
    for (let i = 1; i < terrainPoints.length; i += 1) {
      const prev = terrainPoints[i - 1];
      const current = terrainPoints[i];
      const controlX = (prev[0] + current[0]) / 2;
      terrain += " Q" + controlX + " " + prev[1] + " " + controlX + " " + ((prev[1] + current[1]) / 2);
      terrain += " Q" + controlX + " " + current[1] + " " + current[0] + " " + current[1];
    }
    terrain += " L" + (width - right) + " " + (height - bottom) + " Z";
    svg.appendChild(svgEl("path", { class: "terrain", d: terrain }));
    svg.appendChild(svgEl("path", { class: "terrain-line", d: terrain.replace(/ Z$/, "") }));

    points.forEach((point, index) => {
      const { village } = point;
      const labelOnRight = index % 2 === 0;
      const labelX = point.px + (labelOnRight ? 14 : -14);
      svg.appendChild(
        svgEl("line", {
          class: "village-stem",
          x1: point.px,
          x2: labelX,
          y1: point.py - 6,
          y2: point.py - 22,
        })
      );
      svg.appendChild(svgEl("circle", { class: "village-dot", cx: point.px, cy: point.py, r: 4.5 }));
      const name = svgEl("text", {
        class: "profile-village-label",
        x: labelX,
        y: point.py - 28,
        "text-anchor": labelOnRight ? "start" : "end",
      });
      name.textContent = village.name;
      svg.appendChild(name);
      const elevation = svgEl("text", {
        class: "profile-village-elev",
        x: labelX,
        y: point.py - 15,
        "text-anchor": labelOnRight ? "start" : "end",
      });
      elevation.textContent = village.elevation_representative + " m · S6";
      svg.appendChild(elevation);
    });

    const belts = [
      { label: "早熟白/红品种带（示意）", elevation: 1860 },
      { label: "赤霞珠主栽带（示意）", elevation: 2260 },
      { label: "晚熟品种试验带（示意）", elevation: 2720 },
    ];
    belts.forEach((belt) => {
      const text = svgEl("text", {
        class: "belt-label",
        x: left + 12,
        y: y(belt.elevation),
      });
      text.textContent = belt.label;
      svg.appendChild(text);
    });

    const markerX = 846;
    const marker = svgEl("g", { id: "profile-marker" });
    marker.appendChild(
      svgEl("line", { class: "slider-marker", x1: markerX, x2: markerX, y1: top, y2: height - bottom })
    );
    marker.appendChild(svgEl("circle", { class: "slider-dot", cx: markerX, cy: top + 22, r: 5 }));
    const box = svgEl("rect", { class: "slider-readout-box", x: markerX - 52, y: top - 2, width: 44, height: 20 });
    marker.appendChild(box);
    const markerText = svgEl("text", {
      class: "slider-readout-text",
      x: markerX - 43,
      y: top + 12,
    });
    marker.appendChild(markerText);
    svg.appendChild(marker);

    const caption = svgEl("text", {
      class: "profile-label",
      x: left,
      y: height - 20,
    });
    caption.textContent = "北 ← 河谷相对次序（示意）→ 南";
    svg.appendChild(caption);
    const captionRight = svgEl("text", {
      class: "profile-label",
      x: width - right,
      y: height - 20,
      "text-anchor": "end",
    });
    captionRight.textContent = "纵轴：海拔 m · 村庄海拔 S6 / 2026";
    svg.appendChild(captionRight);

    state.profile = { y, marker, markerText, markerX, top, bottom };
    updateProfileMarker(state.markerElevation);
    $("#profile-sources").innerHTML = sourceStrip(["S6", "S4"]);
  }

  function updateProfileMarker(elevation) {
    if (!state.profile) return;
    const { y, marker, markerText, top } = state.profile;
    const py = y(elevation);
    const line = marker.querySelector("line");
    const dot = marker.querySelector("circle");
    line.setAttribute("y1", top);
    line.setAttribute("y2", y(3100) - (y(3100) - py));
    dot.setAttribute("cy", py);
    markerText.textContent = elevation + " m";
    const box = marker.querySelector("rect");
    const boxY = Math.max(0, Math.min(py - 10, 500));
    box.setAttribute("y", boxY);
    markerText.setAttribute("y", boxY + 14);
  }

  function updateTemperature(elevation) {
    const temperature = L.temperatureAtElevation(elevation);
    const delta = temperature - L.BASE_TEMPERATURE_C;
    const band = L.maturityBand(elevation);
    $("#temp-value").textContent = L.formatTemperature(temperature);
    $("#temp-delta").textContent = "相对基准 2200 m：" + delta.toFixed(1) + " °C";
    const chip = $("#band-chip");
    chip.textContent = band.label;
    chip.dataset.band = band.key;
    $("#band-note").textContent = band.note;
    $("#elevation-output").textContent = elevation + " m";
    const slider = $("#elevation-slider");
    slider.setAttribute(
      "aria-valuetext",
      elevation + " 米，示意换算 " + temperature.toFixed(1) + " 摄氏度，" + band.label
    );
    state.markerElevation = elevation;
    updateProfileMarker(elevation);
  }

  function wireSlider() {
    const slider = $("#elevation-slider");
    slider.value = String(state.markerElevation);
    updateTemperature(state.markerElevation);
    slider.addEventListener("input", () => updateTemperature(Number(slider.value)));
  }

  /* ------------------------------------------------------------------------
     Map
     ------------------------------------------------------------------------ */

  function renderMap() {
    const svg = $("#map-svg");
    svg.innerHTML = "";
    const random = mulberry32(4211);

    for (let i = 0; i < 16; i += 1) {
      const cx = 90 + random() * 760;
      const cy = 60 + random() * 500;
      const radius = 34 + random() * 55;
      svg.appendChild(
        svgEl("path", {
          class: "map-contour",
          d: contourPath(cx, cy, radius, 0.1, random() * 6, random),
        })
      );
    }

    const westRidge = "M 100 0 C 150 90 110 170 150 250 C 190 330 145 430 190 530 C 215 585 200 610 195 620";
    const eastRidge = "M 640 0 C 610 100 655 180 620 270 C 590 350 640 430 615 520 C 600 575 620 600 625 620";
    [westRidge, eastRidge].forEach((path) => {
      svg.appendChild(svgEl("path", { class: "map-ridge", d: path }));
    });

    const lancang = "M 352 10 C 300 105 392 175 344 260 C 300 340 372 410 330 500 C 312 545 330 590 326 620";
    const jinsha = "M 792 0 C 740 100 812 190 764 280 C 720 365 792 460 746 560 C 736 590 744 606 748 620";

    [lancang, jinsha].forEach((path) => {
      svg.appendChild(svgEl("path", { class: "map-river", d: path }));
      svg.appendChild(svgEl("path", { class: "map-river-core", d: path }));
    });

    const lancangLabel = svgEl("text", { class: "river-label", x: 300, y: 300 });
    lancangLabel.textContent = "澜沧江";
    svg.appendChild(lancangLabel);
    const jinshaLabel = svgEl("text", { class: "river-label", x: 798, y: 300 });
    jinshaLabel.textContent = "金沙江";
    svg.appendChild(jinshaLabel);

    const smallLabel = svgEl("text", { class: "river-label-small", x: 352, y: 40 });
    smallLabel.textContent = "北 → 南 · 示意";
    svg.appendChild(smallLabel);

    const jinshaMark = svgEl("g", { class: "map-east" });
    jinshaMark.appendChild(svgEl("circle", { class: "map-east-mark", cx: 742, cy: 340, r: 5 }));
    const eastLabel1 = svgEl("text", { class: "map-east-label", x: 754, y: 336 });
    eastLabel1.textContent = "金沙江干热河谷";
    jinshaMark.appendChild(eastLabel1);
    const eastLabel2 = svgEl("text", { class: "map-east-label", x: 754, y: 350 });
    eastLabel2.textContent = "园地较少（示意）· S4";
    jinshaMark.appendChild(eastLabel2);
    svg.appendChild(jinshaMark);

    DATA.villages.forEach((village) => {
      const order = Number(village.order);
      const riverY = 68 + (order - 1) * 80;
      const isLeft = village.bank === "左岸";
      const px = 330 + (isLeft ? -1 : 1) * (58 + (order % 3) * 16);
      const py = riverY;
      const labelX = px + (isLeft ? -64 : 64);
      const anchor = isLeft ? "end" : "start";

      const group = svgEl("g", {
        class: "map-village",
        tabindex: "0",
        role: "button",
        "data-village": village.id,
        "aria-label":
          village.name + "，" + village.bank + "，海拔约 " + village.elevation_representative + " 米，查看详情",
      });
      group.appendChild(
        svgEl("line", {
          class: "leader",
          x1: px,
          x2: labelX,
          y1: py,
          y2: py - 9,
        })
      );
      group.appendChild(svgEl("circle", { class: "halo", cx: px, cy: py, r: 13 }));
      group.appendChild(svgEl("circle", { class: "core", cx: px, cy: py, r: 4.5 }));
      const label = svgEl("text", {
        class: "label",
        x: labelX,
        y: py - 4,
        "text-anchor": anchor,
      });
      label.textContent = village.name;
      group.appendChild(label);
      const meta = svgEl("text", {
        class: "meta",
        x: labelX,
        y: py + 12,
        "text-anchor": anchor,
      });
      meta.textContent = village.bank + " · " + village.elevation_representative + " m · S6";
      group.appendChild(meta);
      svg.appendChild(group);
    });

    $$(".map-village", svg).forEach((group) => {
      const village = DATA.villages.find((row) => row.id === group.dataset.village);
      group.addEventListener("click", () => openVillage(village, group));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openVillage(village, group);
        }
      });
      group.addEventListener("focus", () => openVillage(village, group));
      group.addEventListener("mouseenter", () => openVillage(village, group));
    });

    $("#map-sources").innerHTML = sourceStrip(["S6", "S4"]);
  }

  function openVillage(village, group) {
    const card = $("#map-card");
    const frame = $("#map-frame");
    if (!card || !frame || !village) return;
    $$(".map-village.is-active").forEach((node) => node.classList.remove("is-active"));
    group.classList.add("is-active");
    const sourceRow = source(village.source_id);
    card.innerHTML =
      '<button type="button" class="map-card-close" aria-label="关闭村庄卡片">×</button>' +
      "<h3>" +
      esc(village.name) +
      " <small>" +
      esc(village.name_en) +
      "</small></h3>" +
      '<p class="map-card-meta">' +
      esc(village.bank) +
      " · 海拔 " +
      esc(village.elevation_min) +
      "–" +
      esc(village.elevation_max) +
      " m · " +
      cite("2026", village.source_id) +
      "</p>" +
      "<p>提及品种：" +
      esc(village.varieties) +
      "。" +
      esc(village.note) +
      "。位置为河谷相对关系示意。</p>" +
      '<p><a href="#" data-source="' +
      esc(sourceRow.id) +
      '">查看来源 ' +
      esc(sourceRow.id) +
      "</a></p>";
    card.hidden = false;

    const rect = group.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const relativeX = rect.left - frameRect.left + rect.width / 2;
    const relativeY = rect.top - frameRect.top;
    const cardWidth = Math.min(304, frameRect.width - 32);
    const left = Math.max(16, Math.min(relativeX + 18, frameRect.width - cardWidth - 16));
    const top = Math.max(12, Math.min(relativeY - 20, frameRect.height - 180));
    card.style.left = left + "px";
    card.style.top = top + "px";
    card.querySelector(".map-card-close").addEventListener("click", closeVillage);
    state.openVillage = village.id;
  }

  function closeVillage() {
    const card = $("#map-card");
    if (card) card.hidden = true;
    $$(".map-village.is-active").forEach((node) => node.classList.remove("is-active"));
    state.openVillage = null;
  }

  /* ------------------------------------------------------------------------
     Area & yield charts
     ------------------------------------------------------------------------ */

  const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

  function chartFrame(svg, width, height, margins, yMax, yStep) {
    svg.innerHTML = "";
    const x = L.scaleLinear(2021, 2026, margins.left, width - margins.right);
    const y = L.scaleLinear(0, yMax, height - margins.bottom, margins.top);
    for (let value = 0; value <= yMax; value += yStep) {
      const gy = y(value);
      svg.appendChild(
        svgEl("line", { class: "chart-grid", x1: margins.left, x2: width - margins.right, y1: gy, y2: gy })
      );
      const tick = svgEl("text", {
        class: "chart-axis",
        x: margins.left - 12,
        y: gy + 4,
        "text-anchor": "end",
      });
      tick.textContent = L.formatNumber(value);
      svg.appendChild(tick);
    }
    YEARS.forEach((year) => {
      const tick = svgEl("text", {
        class: "chart-axis",
        x: x(year),
        y: height - margins.bottom + 22,
        "text-anchor": "middle",
      });
      tick.textContent = year;
      svg.appendChild(tick);
    });
    return { x, y };
  }

  function renderAreaCards() {
    const rows = L.areaRowsForDeqin(DATA.area).slice().sort((a, b) => {
      return Number(a.year) - Number(b.year) || Number(b.value) - Number(a.value);
    });
    $("#area-cards").innerHTML = rows
      .map((row, index) => {
        const converted = row.unit === "万亩" ? L.normalizeAreaToMu(row.value, row.unit) : null;
        const outlier = row.unit === "万亩" ? " is-outlier" : "";
        return (
          '<article class="conflict-card' +
          outlier +
          '" style="--source-color:' +
          SOURCE_COLORS[row.source_id] +
          '">' +
          '<p class="panel-label">口径 ' +
          String(index + 1).padStart(2, "0") +
          " · " +
          esc(row.place) +
          "</p>" +
          '<p class="conflict-value">' +
          esc(row.unit === "万亩" ? row.value : L.formatNumber(row.value)) +
          " <small>" +
          esc(row.unit) +
          "</small></p>" +
          (converted
            ? '<p class="conflict-converted">= ' + L.formatNumber(converted) + " 亩（换算）</p>"
            : "") +
          "<p>" +
          esc(row.note) +
          "</p>" +
          '<p class="conflict-meta">' +
          cite(row.year, row.source_id) +
          " · " +
          esc(source(row.source_id).publisher) +
          "</p></article>"
        );
      })
      .join("");
  }

  function renderAreaChart() {
    const svg = $("#area-chart");
    const width = 900;
    const height = 430;
    const margins = { left: 66, right: 28, top: 32, bottom: 58 };
    const yMax = 15000;
    const { x, y } = chartFrame(svg, width, height, margins, yMax, 3000);

    const rows = L.areaRowsForDeqin(DATA.area);
    const byYear = new Map();
    rows.forEach((row) => {
      const year = Number(row.year);
      const normalized = L.normalizeAreaToMu(row.value, row.unit);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(normalized);
    });
    byYear.forEach((values, year) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const bandWidth = 14;
      svg.appendChild(
        svgEl("rect", {
          class: "chart-band",
          x: x(year) - bandWidth / 2,
          y: y(max),
          width: bandWidth,
          height: Math.max(2, y(min) - y(max)),
        })
      );
    });

    const grouped = new Map();
    rows.forEach((row) => {
      const year = Number(row.year);
      grouped.set(year, (grouped.get(year) || 0) + 1);
    });
    const offsets = new Map();
    rows.forEach((row) => {
      const year = Number(row.year);
      const count = grouped.get(year);
      const index = offsets.get(year) || 0;
      offsets.set(year, index + 1);
      const normalized = L.normalizeAreaToMu(row.value, row.unit);
      const jitter = count > 1 ? (index - (count - 1) / 2) * 0.16 : 0;
      const px = x(year + jitter);
      const py = y(normalized);
      const color = SOURCE_COLORS[row.source_id];
      const point = svgEl("circle", {
        class: "chart-point",
        cx: px,
        cy: py,
        r: 7,
        fill: color,
        "data-source": row.source_id,
        tabindex: "0",
        role: "button",
        "aria-label": row.year + " 年 " + row.place + " " + row.value + " " + row.unit + "，来源 " + row.source_id,
      });
      svg.appendChild(point);
      const label = svgEl("text", {
        class: "chart-point-label",
        x: px,
        y: py - 16,
        "text-anchor": "middle",
      });
      label.textContent = L.formatNumber(normalized);
      svg.appendChild(label);
      const yearLabel = svgEl("text", {
        class: "chart-point-year",
        x: px,
        y: py + 23,
        "text-anchor": "middle",
      });
      yearLabel.textContent = row.year + " · " + row.source_id;
      svg.appendChild(yearLabel);
    });

    const stateRow = DATA.area.find((row) => row.place === "迪庆州");
    if (stateRow) {
      const px = x(2024.38);
      const py = y(Number(stateRow.value));
      svg.appendChild(svgEl("circle", { class: "chart-state-point", cx: px, cy: py, r: 7, stroke: "#86a2b3" }));
      const label = svgEl("text", { class: "chart-state-label", x: px + 12, y: py + 4 });
      label.textContent = "全州 " + L.formatNumber(stateRow.value) + " · S3";
      svg.appendChild(label);
    }

    const title = svgEl("text", { class: "chart-axis-title", x: margins.left, y: 18 });
    title.textContent = "亩 · 德钦县 · 2022–2025（柱带示同年极差）";
    svg.appendChild(title);

    $("#area-legend").innerHTML = L.uniqueBy(
      DATA.area.filter((row) => row.place === "德钦县"),
      "source_id"
    )
      .map(
        (row) =>
          '<button type="button" data-source="' +
          row.source_id +
          '"><i style="background:' +
          SOURCE_COLORS[row.source_id] +
          '"></i>' +
          row.source_id +
          " · " +
          esc(source(row.source_id).publisher) +
          "</button>"
      )
      .join("");
  }

  function renderYieldChart() {
    const svg = $("#yield-chart");
    const width = 900;
    const height = 300;
    const margins = { left: 66, right: 28, top: 32, bottom: 52 };
    const { x, y } = chartFrame(svg, width, height, margins, 6000, 1500);

    DATA.yield.forEach((row) => {
      const px = x(Number(row.year));
      const py = y(Number(row.value));
      const color = SOURCE_COLORS[row.source_id];
      svg.appendChild(
        svgEl("circle", {
          class: "chart-point",
          cx: px,
          cy: py,
          r: 7,
          fill: color,
          "data-source": row.source_id,
          tabindex: "0",
          role: "button",
          "aria-label": row.year + " 年产量 " + row.value + " 吨，来源 " + row.source_id,
        })
      );
      const label = svgEl("text", { class: "chart-point-label", x: px, y: py - 16, "text-anchor": "middle" });
      label.textContent = L.formatNumber(row.value) + " t";
      svg.appendChild(label);
      const yearLabel = svgEl("text", { class: "chart-point-year", x: px, y: py + 23, "text-anchor": "middle" });
      yearLabel.textContent = row.year + " · " + row.source_id;
      svg.appendChild(yearLabel);
    });
    const title = svgEl("text", { class: "chart-axis-title", x: margins.left, y: 18 });
    title.textContent = "吨 · 德钦县 · 三点，三种来源";
    svg.appendChild(title);

    $("#yield-legend").innerHTML = DATA.yield
      .map(
        (row) =>
          '<button type="button" data-source="' +
          row.source_id +
          '"><i style="background:' +
          SOURCE_COLORS[row.source_id] +
          '"></i>' +
          row.year +
          " · " +
          row.source_id +
          "</button>"
      )
      .join("");
  }

  /* ------------------------------------------------------------------------
     Varieties
     ------------------------------------------------------------------------ */

  function renderVarieties() {
    const filtered = L.sortVarieties(
      L.filterVarieties(DATA.varieties, {
        query: state.varietyQuery,
        color: state.varietyColor,
        role: state.varietyRole,
      }),
      state.sortKey,
      state.sortDirection
    );
    const body = $("#variety-body");
    body.innerHTML = filtered
      .map(
        (row) =>
          "<tr>" +
          '<td class="variety-name">' +
          esc(row.name) +
          "</td>" +
          '<td class="variety-en">' +
          esc(row.name_en) +
          "</td>" +
          '<td><span class="color-tag" data-color="' +
          esc(row.color) +
          '">' +
          esc(row.color) +
          "</span></td>" +
          '<td><span class="role-tag" data-role="' +
          esc(row.role) +
          '">' +
          esc(row.role) +
          "</span></td>" +
          '<td class="variety-note">' +
          esc(row.note) +
          "</td>" +
          "<td>" +
          sourceButton(row.source_id) +
          "</td>" +
          "</tr>"
      )
      .join("");
    $("#variety-count").textContent = "显示 " + filtered.length + " / " + DATA.varieties.length + " 个品种";
    $("#variety-empty").hidden = filtered.length !== 0;
    $("#variety-table").hidden = filtered.length === 0;
  }

  function wireVarieties() {
    $("#variety-search").addEventListener("input", (event) => {
      state.varietyQuery = event.target.value;
      renderVarieties();
    });
    $$(".segmented [data-color]").forEach((button) => {
      button.addEventListener("click", () => {
        state.varietyColor = button.dataset.color;
        $$(".segmented [data-color]").forEach((node) => node.classList.toggle("is-active", node === button));
        renderVarieties();
      });
    });
    $$(".segmented [data-role]").forEach((button) => {
      button.addEventListener("click", () => {
        state.varietyRole = button.dataset.role;
        $$(".segmented [data-role]").forEach((node) => node.classList.toggle("is-active", node === button));
        renderVarieties();
      });
    });
    $$("[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.sort;
        if (state.sortKey === key) {
          state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDirection = "asc";
        }
        renderVarieties();
      });
    });
    $("#variety-sources").innerHTML = sourceStrip(["S4", "S6", "S3"]);
  }

  /* ------------------------------------------------------------------------
     Climate, soils, timeline, sources
     ------------------------------------------------------------------------ */

  const METRIC_META = {
    precipitation: { index: "01", label: "年降水量 / PRECIPITATION" },
    sunshine: { index: "02", label: "年日照 / SUNSHINE" },
    growing_season: { index: "03", label: "生育期 / GROWING SEASON" },
    elevation: { index: "04", label: "园地海拔 / ELEVATION" },
  };

  function renderClimate() {
    const groups = ["precipitation", "sunshine", "growing_season", "elevation"];
    $("#climate-cards").innerHTML = groups
      .map((metric) => {
        const rows = DATA.climate.filter((row) => row.metric === metric);
        const meta = METRIC_META[metric];
        return (
          '<article class="climate-card" data-index="' +
          meta.index +
          '">' +
          '<p class="climate-metric">' +
          esc(meta.label) +
          "</p>" +
          '<div class="climate-readings">' +
          rows
            .map(
              (row) =>
                '<div class="climate-reading"><span class="climate-value">' +
                esc(L.formatNumber(row.value_min)) +
                "–" +
                esc(L.formatNumber(row.value_max)) +
                " <small>" +
                esc(row.unit) +
                "</small></span>" +
                '<span class="climate-src">' +
                cite(row.year, row.source_id) +
                " · " +
                esc(source(row.source_id).publisher) +
                "</span>" +
                '<span class="fineprint">' +
                esc(row.note) +
                "</span></div>"
            )
            .join("") +
          "</div></article>"
        );
      })
      .join("");

    $("#soil-list").innerHTML = DATA.soils
      .map(
        (row) =>
          '<div class="soil-item"><strong>' +
          esc(row.type_zh) +
          "</strong><span>" +
          esc(row.description) +
          " · " +
          sourceButton(row.source_id) +
          "</span></div>"
      )
      .join("");
    $("#climate-sources").innerHTML = sourceStrip(["S4", "S6", "S7"]);
  }

  function renderTimeline() {
    $("#timeline-list").innerHTML = DATA.timeline
      .map(
        (row) =>
          '<li class="timeline-item"><span class="timeline-year">' +
          esc(row.year) +
          '</span><div class="timeline-body"><h3>' +
          esc(row.title) +
          "</h3><p>" +
          esc(row.description) +
          "</p><p class=\"timeline-meta\">" +
          cite(row.year, row.source_id) +
          " · " +
          esc(row.note) +
          "</p></div></li>"
      )
      .join("");
    $("#timeline-sources").innerHTML = sourceStrip(["S2", "S7", "S6", "S5"]);
  }

  function renderSources() {
    $("#source-body").innerHTML = DATA.sources
      .map(
        (row) =>
          '<tr id="source-' +
          esc(row.id) +
          '"><td>' +
          esc(row.id) +
          '</td><td><a href="' +
          esc(row.url) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(row.title) +
          '</a></td><td>' +
          esc(row.publisher) +
          '</td><td class="src-date">' +
          esc(row.date) +
          '</td><td>' +
          esc(row.note) +
          '</td><td><a class="source-open" href="' +
          esc(row.url) +
          '" target="_blank" rel="noopener noreferrer" aria-label="打开来源 ' +
          esc(row.id) +
          ' 原文">打开原文 ↗</a></td></tr>'
      )
      .join("");
  }

  /* ------------------------------------------------------------------------
     Source popover
     ------------------------------------------------------------------------ */

  let popoverTrigger = null;

  function openPopover(id, trigger) {
    const row = source(id);
    if (!row) return;
    const popover = $("#source-popover");
    popoverTrigger = trigger || null;
    popover.innerHTML =
      '<button type="button" class="pop-close" aria-label="关闭来源卡片">×</button>' +
      "<h3>" +
      esc(row.title) +
      "</h3>" +
      '<p class="pop-meta">' +
      esc(row.id) +
      " · " +
      esc(row.publisher) +
      " · " +
      esc(row.date) +
      "</p><p>" +
      esc(row.note) +
      "</p>" +
      '<a class="src-url" href="' +
      esc(row.url) +
      '" target="_blank" rel="noopener noreferrer">' +
      esc(row.url) +
      "</a>";
    popover.hidden = false;

    const rect = trigger.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    let left = Math.min(rect.left, window.innerWidth - popRect.width - 16);
    left = Math.max(16, left);
    let top = rect.bottom + 10;
    if (top + popRect.height > window.innerHeight - 16) top = Math.max(16, rect.top - popRect.height - 10);
    popover.style.left = left + "px";
    popover.style.top = top + "px";
    popover.querySelector(".pop-close").addEventListener("click", closePopover);

    const rowNode = document.getElementById("source-" + id);
    if (rowNode) {
      rowNode.classList.add("is-flash");
      window.setTimeout(() => rowNode.classList.remove("is-flash"), 1600);
    }
  }

  function closePopover() {
    const popover = $("#source-popover");
    if (popover) popover.hidden = true;
    popoverTrigger = null;
  }

  function wirePopover() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-source]");
      if (trigger) {
        event.preventDefault();
        if (!trigger.classList.contains("src-badge") && !trigger.classList.contains("source-link")) {
          openPopover(trigger.dataset.source, trigger);
        } else {
          openPopover(trigger.dataset.source, trigger);
        }
      } else if (!event.target.closest("#source-popover")) {
        closePopover();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePopover();
        closeVillage();
        if (popoverTrigger) popoverTrigger.focus();
      }
    });
    window.addEventListener("scroll", closePopover, { passive: true });
    window.addEventListener("resize", () => {
      closePopover();
      if (state.openVillage) closeVillage();
    });
  }

  /* ------------------------------------------------------------------------
     Reveal & nav
     ------------------------------------------------------------------------ */

  function wireReveal() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach((node) => node.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    $$(".section-head, .panel, .conflict-card, .climate-card, .timeline-item, .note-panel").forEach((node) => {
      node.classList.add("reveal");
      observer.observe(node);
    });
  }

  function renderAll() {
    renderHero();
    renderProfile();
    renderMap();
    renderAreaCards();
    renderAreaChart();
    renderYieldChart();
    renderVarieties();
    renderClimate();
    renderTimeline();
    renderSources();
  }

  /* ------------------------------------------------------------------------
     Optional CSV refresh (HTTP only; bundle remains the offline fallback)
     ------------------------------------------------------------------------ */

  async function refreshFromCSV() {
    if (!/^https?:$/.test(window.location.protocol)) return;
    const names = ["sources", "area", "yield", "villages", "varieties", "climate", "soils", "timeline"];
    try {
      const responses = await Promise.all(names.map((name) => fetch("data/" + name + ".csv", { cache: "no-store" })));
      if (responses.some((response) => !response.ok)) throw new Error("CSV fetch failed");
      const texts = await Promise.all(responses.map((response) => response.text()));
      names.forEach((name, index) => {
        DATA[name] = CSV.parse(texts[index]).rows;
      });
      renderAll();
    } catch (error) {
      // Bundle already rendered; offline/file:// path stays intact.
    }
  }

  function init() {
    drawContours();
    renderAll();
    wireSlider();
    wireVarieties();
    wirePopover();
    wireReveal();
    refreshFromCSV();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
