/*
 * Pure helpers shared by the page, the build script and the tests.
 * UMD wrapper: works from file:// as a classic script and from Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AtlasLib = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LAPSE_RATE_C_PER_KM = 6.5;
  const BASE_ELEVATION_M = 2200;
  const BASE_TEMPERATURE_C = 20;
  const ELEVATION_MIN_M = 1600;
  const ELEVATION_MAX_M = 3100;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Environmental lapse-rate illustration. Not a forecast.
   * T(h) = T_base - 6.5 degC/km * (h - 2200 m) / 1000
   */
  function temperatureAtElevation(
    elevationM,
    baseTemperatureC = BASE_TEMPERATURE_C,
    baseElevationM = BASE_ELEVATION_M,
    lapseRateCPerKm = LAPSE_RATE_C_PER_KM
  ) {
    const elevation = clamp(Number(elevationM), ELEVATION_MIN_M, ELEVATION_MAX_M);
    return baseTemperatureC - (lapseRateCPerKm * (elevation - baseElevationM)) / 1000;
  }

  function maturityBand(elevationM) {
    const elevation = Number(elevationM);
    if (elevation < 2000) {
      return {
        key: "early",
        label: "早熟带",
        note: "热量相对充足，成熟较早；夏季高温与干旱是主要压力。",
      };
    }
    if (elevation <= 2500) {
      return {
        key: "mid",
        label: "中熟带",
        note: "赤霞珠主栽带；成熟窗口与秋雨、早霜需要权衡。",
      };
    }
    return {
      key: "late",
      label: "晚熟带",
      note: "热量不足风险上升，晚熟品种需更长挂树期与更严的园地选择。",
    };
  }

  function normalizeAreaToMu(value, unit) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError("Area value must be numeric");
    if (unit === "万亩") return Number((numeric * 10000).toFixed(4));
    if (unit === "亩") return numeric;
    throw new TypeError("Unsupported area unit: " + unit);
  }

  function areaRowsForDeqin(rows) {
    return rows.filter((row) => row.place === "德钦县");
  }

  function filterVarieties(rows, filters) {
    const query = String((filters && filters.query) || "")
      .trim()
      .toLocaleLowerCase("zh-CN");
    const color = (filters && filters.color) || "all";
    const role = (filters && filters.role) || "all";
    return rows.filter((row) => {
      if (color !== "all" && row.color !== color) return false;
      if (role !== "all" && row.role !== role) return false;
      if (!query) return true;
      return (
        row.name.toLocaleLowerCase("zh-CN").includes(query) ||
        row.name_en.toLocaleLowerCase("en").includes(query) ||
        row.note.toLocaleLowerCase("zh-CN").includes(query)
      );
    });
  }

  function sortVarieties(rows, key, direction) {
    const factor = direction === "desc" ? -1 : 1;
    const allowed = new Set(["name", "name_en", "color", "role"]);
    if (!allowed.has(key)) return rows.slice();
    const roleRank = { 主栽: 0, 少量: 1 };
    return rows.slice().sort((a, b) => {
      if (key === "role") {
        return ((roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9)) * factor;
      }
      const av = String(a[key]);
      const bv = String(b[key]);
      return av.localeCompare(bv, "zh-CN") * factor;
    });
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    return new Intl.NumberFormat("zh-CN", {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(numeric);
  }

  function formatTemperature(value) {
    return Number(value).toFixed(1);
  }

  function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
    const span = domainMax - domainMin || 1;
    return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
  }

  function niceMax(value, step = 1000) {
    return Math.ceil(value / step) * step;
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sourceById(sources, id) {
    return sources.find((source) => source.id === id) || null;
  }

  function formatSourceShort(source) {
    if (!source) return "来源缺失";
    return source.id + " · " + source.publisher;
  }

  function uniqueBy(rows, key) {
    const seen = new Set();
    return rows.filter((row) => {
      const value = row[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  return {
    LAPSE_RATE_C_PER_KM,
    BASE_ELEVATION_M,
    BASE_TEMPERATURE_C,
    ELEVATION_MIN_M,
    ELEVATION_MAX_M,
    clamp,
    temperatureAtElevation,
    maturityBand,
    normalizeAreaToMu,
    areaRowsForDeqin,
    filterVarieties,
    sortVarieties,
    formatNumber,
    formatTemperature,
    scaleLinear,
    niceMax,
    escapeHTML,
    sourceById,
    formatSourceShort,
    uniqueBy,
  };
});
