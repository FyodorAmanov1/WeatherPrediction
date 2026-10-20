# Atmos — a weather observatory and numerical forecasting lab

**[Open the live application](https://fyodoramanov1.github.io/WeatherPrediction/)** · [Original numerical-methods notebook](ProjectNumMeth1.ipynb)

Atmos develops the original Meteostat/Astral temperature-model notebook into a responsive application with live global weather, an interpretable numerical model, and a reproducible hindcast comparison.

## Use it

- Search cities worldwide or request your browser's location.
- Explore current conditions, the next 24 hours, a seven-day outlook, wind, rain probability, UV and daylight.
- Switch between Celsius and Fahrenheit and between temperature, wind and precipitation charts.
- Open **Forecast lab** to fit or adjust thermal relaxation, previous-day memory and solar forcing. Export the experiment as JSON.
- If the weather service is unavailable, explicitly load the dated Oxford snapshot. It is labelled as saved data, never presented as a current forecast.

## The numerical model

Time is measured in hours and temperature in Celsius:

    dT/dt = alpha (seasonal_target(t) - T)
          + memory (previous_day(t) - T)
          + beta max(0, sin(pi (t - sunrise) / daylight))

The solar term is active only during daylight. A fourth-order Runge–Kutta solver integrates at five-minute steps, correctly evaluating intermediate states and initializing the first state. A previous-day mean and amplitude provide a local climatology proxy; the target peaks at 14:00 local time. This is an interpretable prototype, not a full atmospheric model.

Three earlier days are requested. Parameters are selected by RMSE on the first-to-second day transition; the third day is held out. A 24-hour persistence baseline repeats the preceding day. The lab reports MAE, RMSE and skill relative to persistence, retaining negative skill when it occurs. User changes after viewing hold-out scores are exploratory tuning.

Historical reference values come from Open-Meteo's past weather-model data, **not independent station observations**. Scores do not establish operational forecasting accuracy. The overview displays the provider's numerical weather forecasts; it does not relabel them as predictions from the RK4 model.

## Local development

No build step or JavaScript packages are required. With Python and Node.js installed:

    python -m http.server 8765 --directory docs
    node scripts/check-model.mjs

Visit `http://localhost:8765`. Solver checks compare against analytic exponential decay, a constant equilibrium, and hand-calculated error scores. The GitHub Actions workflow validates the modules and publishes `docs/` to Pages. All asset URLs are relative, so the application works under a repository subpath.

## Original work and fixes

The original `ProjectNumMeth1.ipynb` remains intact. The app preserves its thermal-memory/solar-forcing idea while correcting uninitialized RK4 states, half-step handling, hour/minute inconsistencies and manual calendar arithmetic. It removes interactive notebook setup and the undefined region/timezone variables from the browser workflow. The original notebook is retained as project history; use the new solver for the corrected model.

## Data and attribution

Live forecast: [Open-Meteo Forecast API](https://open-meteo.com/en/docs). City search: [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api), based on GeoNames. Weather data are provided under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); provider API usage terms apply separately. This personal portfolio uses the non-commercial public endpoints and does not embed credentials. The saved Oxford response records its actual retrieval timestamp in `docs/data/oxford.json`.

Created by Fyodor Amanov. The original notebook and the new application have separate, clearly described model boundaries.
