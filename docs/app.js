import {
  dayProfile,
  temperatureProfile,
  scores,
  solarGeometry,
  experimentDays,
  fitParameters,
} from "./model.mjs";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const cities = {
  oxford: {
    name: "Oxford",
    country: "United Kingdom",
    latitude: 51.752,
    longitude: -1.258,
  },
  tashkent: {
    name: "Tashkent",
    country: "Uzbekistan",
    latitude: 41.2995,
    longitude: 69.2401,
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  newyork: {
    name: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
  },
};
let data = null,
  location = cities.oxford,
  unit = "celsius",
  chart = "temperature",
  request = null,
  exportRecord = null,
  saved = false;
const temp = (v) =>
  Number.isFinite(v)
    ? Math.round(unit === "fahrenheit" ? (v * 9) / 5 + 32 : v)
    : "—";
const degree = (v) => `${temp(v)}°`,
  fixed = (v, n = 0) => (Number.isFinite(v) ? v.toFixed(n) : "—");
function weather(code, isDay = true) {
  if (!isDay && [0, 1].includes(code))
    return ["☾", code === 0 ? "Clear night" : "Mostly clear night"];
  if (!isDay && code === 2) return ["☁", "Partly cloudy night"];
  if (code === 0) return ["☀", "Clear skies"];
  if (code === 1) return ["☀", "Mostly clear"];
  if (code === 2) return ["⛅", "Partly cloudy"];
  if (code === 3) return ["☁", "Overcast"];
  if ([45, 48].includes(code)) return ["≋", "Foggy"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["☂", "Drizzle"];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["☂", "Rain"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["❄", "Snow"];
  if ([95, 96, 99].includes(code)) return ["ϟ", "Thunderstorms"];
  return ["◌", "Conditions unavailable"];
}
function showError(message) {
  $("error").classList.remove("hidden");
  $("error").querySelector("span").textContent = message;
}
function hideError() {
  $("error").classList.add("hidden");
}
function view(name) {
  document
    .querySelectorAll(".view")
    .forEach((e) => e.classList.toggle("hidden", e.id !== name));
  document
    .querySelectorAll(".nav")
    .forEach((e) => e.classList.toggle("active", e.dataset.view === name));
  if (name === "lab" && data) renderModel();
}
document
  .querySelectorAll("[data-view]")
  .forEach((b) => b.addEventListener("click", () => view(b.dataset.view)));
document.querySelectorAll("[data-unit]").forEach((b) =>
  b.addEventListener("click", () => {
    unit = b.dataset.unit;
    document
      .querySelectorAll("[data-unit]")
      .forEach((x) => x.classList.toggle("selected", x === b));
    render();
  }),
);
document.querySelectorAll("[data-chart]").forEach((b) =>
  b.addEventListener("click", () => {
    chart = b.dataset.chart;
    document
      .querySelectorAll("[data-chart]")
      .forEach((x) => x.classList.toggle("selected", x === b));
    renderHourly();
  }),
);
document
  .querySelectorAll("[data-city]")
  .forEach((b) =>
    b.addEventListener("click", () => load(cities[b.dataset.city])),
  );
async function load(place) {
  if (request) request.abort();
  request = new AbortController();
  const active = request;
  hideError();
  $("status").textContent = "Updating the forecast…";
  $("search-results").replaceChildren();
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: "auto",
    forecast_days: 7,
    past_days: 3,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly:
      "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max",
  });
  const timeout = setTimeout(() => active.abort(), 18000);
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { signal: active.signal },
    );
    if (!response.ok)
      throw Error(`Weather service returned ${response.status}`);
    const next = await response.json();
    if (!next.current || !next.hourly?.time || !next.daily?.time)
      throw Error("Weather service returned incomplete data");
    if (request !== active) return;
    data = next;
    location = place;
    saved = false;
    data._retrieved_at = new Date().toISOString();
    render();
    fitModel();
    try {
      localStorage.setItem("atmos-location", JSON.stringify(place));
    } catch {}
  } catch (error) {
    if (request !== active) return;
    $("status").textContent = data
      ? "Previous forecast retained"
      : "Live service unavailable";
    showError(
      `${error.name === "AbortError" ? "The weather request timed out." : "Could not update the weather."} Try another location or explore the saved Oxford snapshot. ${data ? "The previous location remains displayed." : ""}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
function render() {
  if (!data) return;
  const current = data.current,
    today = current.time.slice(0, 10),
    i = data.daily.time.indexOf(today),
    condition = weather(current.weather_code);
  $("city").textContent = location.name;
  $("country").textContent =
    location.country ||
    `${Number(location.latitude).toFixed(2)}°, ${Number(location.longitude).toFixed(2)}°`;
  $("current-temp").textContent = temp(current.temperature_2m);
  $("current-unit").textContent = unit === "celsius" ? "°C" : "°F";
  $("condition").textContent = condition[1];
  $("feels").textContent = `Feels like ${degree(current.apparent_temperature)}`;
  document
    .querySelector(".hero")
    .classList.toggle("night", current.is_day === 0);
  $("high").textContent = degree(data.daily.temperature_2m_max[i]);
  $("low").textContent = degree(data.daily.temperature_2m_min[i]);
  $("gust").textContent = `${fixed(current.wind_gusts_10m)} km/h`;
  $("wind").textContent = fixed(current.wind_speed_10m);
  $("humidity").textContent = fixed(current.relative_humidity_2m);
  $("rain").textContent = fixed(data.daily.precipitation_sum[i], 1);
  $("uv").textContent = fixed(data.daily.uv_index_max[i], 1);
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  $("wind-detail").textContent =
    `From the ${directions[Math.round((current.wind_direction_10m || 0) / 45) % 8]} · at 10 metres`;
  $("rain-detail").textContent =
    `${fixed(data.daily.precipitation_probability_max[i])}% maximum rain chance`;
  const uv = data.daily.uv_index_max[i];
  $("uv-detail").textContent =
    uv < 3
      ? "Low exposure"
      : uv < 6
        ? "Moderate exposure"
        : uv < 8
          ? "High exposure"
          : "Very high exposure";
  [
    ["wind", current.wind_speed_10m / 70],
    ["humidity", current.relative_humidity_2m / 100],
    ["rain", data.daily.precipitation_sum[i] / 20],
    ["uv", uv / 11],
  ].forEach(
    ([key, v]) =>
      ($(key + "-bar").style.width =
        `${Math.max(0, Math.min(100, (v || 0) * 100))}%`),
  );
  $("hero-summary").textContent =
    data.daily.precipitation_probability_max[i] >= 60
      ? "Keep an umbrella close. Rain is in the outlook."
      : current.is_day === 0
        ? "A quieter sky. A clearer view of the hours ahead."
        : current.cloud_cover < 35
          ? "A little sunshine. A little room to explore."
          : "A changing sky, and a clearer view of what’s next.";
  $("source-badge").textContent = saved
    ? "SAVED OXFORD SNAPSHOT"
    : "LIVE · OPEN-METEO";
  $("local-time").textContent = saved
    ? `Captured ${data._retrieved_at?.slice(0, 10) || today}`
    : new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: data.timezone,
      }).format(new Date());
  $("status").textContent = saved
    ? `Saved ${data._retrieved_at?.slice(0, 10) || today}`
    : `Model time ${current.time.slice(11, 16)} · ${data.timezone_abbreviation || data.timezone}`;
  const rise = data.daily.sunrise[i],
    set = data.daily.sunset[i],
    hour = (t) => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));
  if (rise && set) {
    const duration = hour(set) - hour(rise),
      phase = Math.max(
        0,
        Math.min(1, (hour(current.time) - hour(rise)) / duration),
      );
    $("sunrise").textContent = rise.slice(11, 16);
    $("sunset").textContent = set.slice(11, 16);
    $("daylight").textContent =
      `${Math.floor(duration / 60)}h ${duration % 60}m of daylight`;
    $("sun-progress").style.strokeDasharray = `${phase * 100} 100`;
    $("sun-position").setAttribute(
      "cx",
      String(150 - 125 * Math.cos(Math.PI * phase)),
    );
    $("sun-position").setAttribute(
      "cy",
      String(142 - 125 * Math.sin(Math.PI * phase)),
    );
  } else {
    $("sunrise").textContent = "Unavailable";
    $("sunset").textContent = "Unavailable";
    $("daylight").textContent = "Sunrise/sunset unavailable at this latitude";
  }
  renderHourly();
  $("week").innerHTML = data.daily.time
    .map((date, j) => ({ date, j }))
    .filter((x) => x.date >= today)
    .slice(0, 7)
    .map(
      ({ date, j }, n) =>
        `<article class="day"><span>${n === 0 ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"))}</span><div aria-label="${esc(weather(data.daily.weather_code[j])[1])}">${weather(data.daily.weather_code[j])[0]}</div><strong>${degree(data.daily.temperature_2m_max[j])}</strong><small>${degree(data.daily.temperature_2m_min[j])}</small><p>☂ ${fixed(data.daily.precipitation_probability_max[j])}%</p></article>`,
    )
    .join("");
  renderModel();
}
function plot(target, series, labels, { suffix = "", zero = false } = {}) {
  const finite = series.flatMap((s) => s.values).filter(Number.isFinite);
  if (!finite.length) {
    $(target).textContent = "No chart data";
    return;
  }
  let min = zero ? 0 : Math.floor(Math.min(...finite) - 1),
    max = Math.ceil(Math.max(...finite) + 1);
  if (max === min) max = min + 1;
  const w = 800,
    h = 220,
    left = 38,
    right = 15,
    top = 15,
    bottom = 27,
    X = (i) => left + (i * (w - left - right)) / Math.max(1, labels.length - 1),
    Y = (v) => h - bottom - ((v - min) / (max - min)) * (h - top - bottom);
  let svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="area-${target}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${series[0].color}" stop-opacity=".17"/><stop offset="1" stop-color="${series[0].color}" stop-opacity="0"/></linearGradient></defs>`;
  for (let j = 0; j <= 3; j++) {
    const v = min + ((max - min) * j) / 3,
      y = Y(v);
    svg += `<path class="grid" d="M${left} ${y}H${w - right}"/><text x="0" y="${y + 4}">${v.toFixed(0)}${esc(suffix)}</text>`;
  }
  labels.forEach((label, i) => {
    if (i % Math.max(1, Math.ceil(labels.length / 7)) === 0)
      svg += `<text x="${X(i)}" y="${h - 2}" text-anchor="middle">${esc(label)}</text>`;
  });
  series.forEach((s, j) => {
    let d = "",
      connected = false;
    for (let i = 0; i < s.values.length; i++) {
      if (!Number.isFinite(s.values[i])) {
        connected = false;
        continue;
      }
      d += `${connected ? "L" : "M"}${X(i).toFixed(2)},${Y(s.values[i]).toFixed(2)} `;
      connected = true;
    }
    if (j === 0 && s.values.every(Number.isFinite))
      svg += `<path d="${d} L${X(s.values.length - 1)} ${h - bottom} L${X(0)} ${h - bottom}Z" fill="url(#area-${target})"/>`;
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" vector-effect="non-scaling-stroke" ${s.dashed ? 'stroke-dasharray="5 5"' : ""}/>`;
    s.values.forEach((v, i) => {
      if (Number.isFinite(v))
        svg += `<circle cx="${X(i)}" cy="${Y(v)}" r="7" fill="transparent"><title>${esc(labels[i])} · ${esc(s.name)}: ${v.toFixed(2)}${esc(suffix)}</title></circle>`;
    });
  });
  $(target).innerHTML = svg + "</svg>";
}
function renderHourly() {
  if (!data) return;
  let start = data.hourly.time.findIndex((t) => t >= data.current.time);
  if (start < 0) start = 0;
  const times = data.hourly.time.slice(start, start + 24),
    convert = (v) => (unit === "fahrenheit" ? (v * 9) / 5 + 32 : v);
  const key =
      chart === "rain"
        ? "precipitation_probability"
        : chart === "wind"
          ? "wind_speed_10m"
          : "temperature_2m",
    values = data.hourly[key]
      .slice(start, start + 24)
      .map((v) =>
        Number.isFinite(v) ? (chart === "temperature" ? convert(v) : v) : null,
      );
  plot(
    "forecast-chart",
    [{ name: chart, color: chart === "rain" ? "#78a7c5" : "#509f96", values }],
    times.map((t) => t.slice(11, 16)),
    {
      suffix: chart === "temperature" ? "°" : chart === "rain" ? "%" : "",
      zero: chart !== "temperature",
    },
  );
  $("hourly").innerHTML = times
    .filter((_, i) => i % 3 === 0)
    .map((t, i) => {
      const j = start + i * 3;
      const day = data.daily.time.indexOf(t.slice(0, 10)),
        rise = data.daily.sunrise[day],
        set = data.daily.sunset[day];
      const isDay = rise && set ? t >= rise && t < set : true;
      const condition = weather(data.hourly.weather_code[j], isDay);
      return `<div class="hourly-item"><span>${i === 0 ? "Next hour" : t.slice(11, 16)}</span><span class="weather-symbol" title="${esc(condition[1])}">${condition[0]}</span><strong>${degree(data.hourly.temperature_2m[j])}</strong><span>☂ ${fixed(data.hourly.precipitation_probability[j])}%</span></div>`;
    })
    .join("");
}
function params() {
  return {
    alpha: Number($("alpha").value),
    memory: Number($("memory").value),
    solar: Number($("solar").value),
  };
}
function updateOutputs() {
  const p = params();
  $("alpha-value").textContent = p.alpha.toFixed(2) + " h⁻¹";
  $("memory-value").textContent = p.memory.toFixed(2) + " h⁻¹";
  $("solar-value").textContent = p.solar.toFixed(1) + " °C/h";
}
function renderModel() {
  updateOutputs();
  if (!data) return;
  try {
    const days = experimentDays(data),
      previous = dayProfile(data, days.fitTarget),
      reference = dayProfile(data, days.heldOut),
      geometry = solarGeometry(data, days.heldOut),
      predicted = temperatureProfile(previous, { ...params(), ...geometry }),
      metric = scores(predicted, reference),
      baseline = scores(previous, reference),
      skill = baseline.rmse > 0 ? 1 - metric.rmse / baseline.rmse : null,
      convert = (v) => (unit === "fahrenheit" ? (v * 9) / 5 + 32 : v);
    plot(
      "model-chart",
      [
        { name: "RK4", color: "#3e8f8b", values: predicted.map(convert) },
        { name: "Reference", color: "#203d56", values: reference.map(convert) },
        {
          name: "Persistence",
          color: "#d8a15b",
          values: previous.map(convert),
          dashed: true,
        },
      ],
      Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00"),
      { suffix: "°" },
    );
    const scale = unit === "fahrenheit" ? 1.8 : 1;
    $("model-date").textContent = `${days.heldOut} · held out`;
    $("model-metrics").innerHTML =
      `<div><span>Mean absolute error</span><strong>${(metric.mae * scale).toFixed(2)}°</strong><small>RK4 vs reference</small></div><div><span>Root mean square error</span><strong>${(metric.rmse * scale).toFixed(2)}°</strong><small>Persistence: ${(baseline.rmse * scale).toFixed(2)}°</small></div><div><span>Skill vs persistence</span><strong>${skill === null ? "—" : (skill * 100).toFixed(1) + "%"}</strong><small>${skill !== null && skill < 0 ? "Persistence performed better" : "On this reference day"}</small></div>`;
    $("model-note").textContent =
      `Fit input: ${days.fitInput}. Fit target: ${days.fitTarget}. Held-out reference: ${days.heldOut}. Reference values are historical weather-model data, not measured station observations.${geometry.assumed ? " Sunrise and daylight were unavailable; the lab assumes 06:00 and 12 hours." : ""} ${saved ? "This uses the saved snapshot." : ""}`;
    exportRecord = {
      location,
      source: "Open-Meteo historical weather-model values",
      retrieved_at: data._retrieved_at,
      days,
      parameters: params(),
      geometry,
      units: "Celsius",
      predicted,
      reference,
      persistence: previous,
      metrics: { model: metric, persistence: baseline, skill },
      limitations:
        "One held-out day of model-derived reference data; exploratory parameter changes invalidate a pristine hold-out claim.",
    };
  } catch (error) {
    $("model-note").textContent = error.message;
    exportRecord = null;
  }
}
function fitModel() {
  if (!data) return;
  try {
    const best = fitParameters(data);
    $("alpha").value = best.alpha;
    $("memory").value = best.memory;
    $("solar").value = best.solar;
    renderModel();
  } catch (error) {
    $("model-note").textContent = error.message;
  }
}
["alpha", "memory", "solar"].forEach((id) =>
  $(id).addEventListener("input", renderModel),
);
$("fit").addEventListener("click", fitModel);
$("export").addEventListener("click", () => {
  if (!exportRecord) {
    showError("Load a location with historical data before exporting.");
    return;
  }
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportRecord, null, 2)], {
        type: "application/json",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "atmos-numerical-experiment.json";
  a.click();
  URL.revokeObjectURL(url);
});
let searchTimer = null,
  searchRequest = null;
$("search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchRequest?.abort();
  const query = $("search").value.trim();
  if (query.length < 2) {
    $("search-results").replaceChildren();
    return;
  }
  searchTimer = setTimeout(async () => {
    searchRequest = new AbortController();
    try {
      const r = await fetch(
        "https://geocoding-api.open-meteo.com/v1/search?" +
          new URLSearchParams({
            name: query,
            count: 6,
            language: "en",
            format: "json",
          }),
        { signal: searchRequest.signal },
      );
      if (!r.ok) throw Error("Search unavailable");
      const places = (await r.json()).results || [];
      $("search-results").replaceChildren();
      if (!places.length) {
        const msg = document.createElement("button");
        msg.disabled = true;
        msg.textContent = "No matching cities. Try a larger nearby city.";
        $("search-results").append(msg);
      }
      for (const place of places) {
        const button = document.createElement("button");
        button.setAttribute("role", "option");
        button.textContent = `${place.name}, ${[place.admin1, place.country].filter(Boolean).join(", ")}`;
        button.addEventListener("click", () => {
          $("search").value = "";
          load(place);
        });
        $("search-results").append(button);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        const b = document.createElement("button");
        b.textContent = "Location search unavailable. Use a quick city above.";
        b.disabled = true;
        $("search-results").replaceChildren(b);
      }
    }
  }, 300);
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) $("search-results").replaceChildren();
});
$("search").addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("search-results").replaceChildren();
  if (e.key === "ArrowDown")
    $("search-results").querySelector("button:not(:disabled)")?.focus();
  if (e.key === "Enter")
    $("search-results").querySelector("button:not(:disabled)")?.click();
});
$("locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is unavailable. Search for your city instead.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) =>
      load({
        name: "Your location",
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
      }),
    () =>
      showError(
        "Location access was unavailable. Search for your city instead.",
      ),
    { timeout: 10000, maximumAge: 300000 },
  );
});
$("snapshot").addEventListener("click", async () => {
  try {
    request?.abort();
    const r = await fetch("data/oxford.json");
    if (!r.ok) throw Error();
    data = await r.json();
    location = cities.oxford;
    saved = true;
    hideError();
    render();
    fitModel();
  } catch {
    showError(
      "The saved snapshot could not be loaded. Try refreshing the page.",
    );
  }
});
try {
  const stored = JSON.parse(localStorage.getItem("atmos-location"));
  if (
    stored &&
    Number.isFinite(stored.latitude) &&
    Number.isFinite(stored.longitude) &&
    Math.abs(stored.latitude) <= 90 &&
    Math.abs(stored.longitude) <= 180
  )
    location = stored;
} catch {}
load(location);
