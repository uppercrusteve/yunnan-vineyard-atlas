import { describe, expect, it } from "vitest";
import { L } from "./helpers.js";

describe("lapse-rate illustration", () => {
  it("returns the 20 °C base at 2200 m", () => {
    expect(L.temperatureAtElevation(2200)).toBeCloseTo(20, 8);
  });

  it("drops 0.65 °C per 100 m above the base", () => {
    expect(L.temperatureAtElevation(2300)).toBeCloseTo(19.35, 8);
    expect(L.temperatureAtElevation(2800)).toBeCloseTo(16.1, 8);
    expect(L.temperatureAtElevation(3100)).toBeCloseTo(14.15, 8);
  });

  it("is strictly monotonic across the whole 1600–3100 m slider domain", () => {
    let previous = L.temperatureAtElevation(1600);
    for (let elevation = 1610; elevation <= 3100; elevation += 10) {
      const current = L.temperatureAtElevation(elevation);
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });

  it("clamps elevations outside the domain instead of extrapolating", () => {
    expect(L.temperatureAtElevation(1200)).toBeCloseTo(L.temperatureAtElevation(1600), 8);
    expect(L.temperatureAtElevation(4000)).toBeCloseTo(L.temperatureAtElevation(3100), 8);
  });

  it("is monotonic for any positive lapse rate and reverses for a negative one", () => {
    expect(L.temperatureAtElevation(2600, 20, 2200, 6.5)).toBeLessThan(
      L.temperatureAtElevation(2400, 20, 2200, 6.5)
    );
    expect(L.temperatureAtElevation(2600, 20, 2200, -6.5)).toBeGreaterThan(
      L.temperatureAtElevation(2400, 20, 2200, -6.5)
    );
  });
});

describe("maturity bands", () => {
  it("maps the boundary elevations to the intended bands", () => {
    expect(L.maturityBand(1700).key).toBe("early");
    expect(L.maturityBand(1999).key).toBe("early");
    expect(L.maturityBand(2000).key).toBe("mid");
    expect(L.maturityBand(2500).key).toBe("mid");
    expect(L.maturityBand(2510).key).toBe("late");
    expect(L.maturityBand(3000).key).toBe("late");
  });

  it("formats the readout to one decimal place", () => {
    expect(L.formatTemperature(20)).toBe("20.0");
    expect(L.formatTemperature(16.125)).toBe("16.1");
  });
});

describe("area normalisation", () => {
  it("converts 万亩 to 亩 and leaves 亩 unchanged", () => {
    expect(L.normalizeAreaToMu(1.38, "万亩")).toBe(13800);
    expect(L.normalizeAreaToMu(6867, "亩")).toBe(6867);
  });

  it("rejects an unknown unit and a non-numeric value", () => {
    expect(() => L.normalizeAreaToMu(1, "公顷")).toThrow(/unit/i);
    expect(() => L.normalizeAreaToMu("近7000", "亩")).toThrow(/numeric/i);
  });
});
