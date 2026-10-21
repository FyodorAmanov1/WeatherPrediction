# Atmos · WeatherPrediction

**Explore the weather now, then investigate how a small mathematical model explains a daily temperature curve.**

Atmos brings a global weather dashboard and an interactive numerical-methods laboratory into one browser application. It connects the original weather-modeling notebook to a visual interface where forecasts, model assumptions and evaluation results can be explored directly.

[Launch Atmos](https://fyodoramanov1.github.io/WeatherPrediction/) · [Original notebook](ProjectNumMeth1.ipynb) · [Temperature model](docs/model.mjs)

## Explore the dashboard

- Search for cities worldwide or request your current location with the location button.
- Inspect current temperature, apparent temperature, humidity, wind, precipitation and UV.
- Follow the next 24 hours through temperature, rain and wind charts.
- Browse seven-day forecast cards and a sunrise-to-sunset solar arc.
- Switch between Celsius and Fahrenheit.
- Explore the explicitly dated Oxford snapshot when using the saved-data mode.

Live forecasts and city search use Open-Meteo. They are provider forecasts, separate from the project's own experimental temperature model.

## Inside the model laboratory

The model treats temperature as a balance between relaxation toward a daily target, previous-day memory and a daylight-dependent solar contribution:

```text
dT/dt = α (T_target(t) − T) + m (T_previous(t) − T) + β solar(t)
```

A fourth-order Runge–Kutta solver integrates this equation in five-minute steps, using hours and degrees Celsius consistently. The daily target has a cosine shape with a local-afternoon peak; the solar term is active only between sunrise and sunset.

Sliders expose the model parameters so that a change in an assumption produces a visible change in the trajectory. The notebook preserves the earlier Python work with weather data and solar geometry; [docs/model.mjs](docs/model.mjs) implements the browser solver.

## How the model is evaluated

An earlier day-to-day transition supplies the fitting window, and a later day is held out for evaluation. The laboratory compares the resulting temperature curve with a prior-day persistence baseline using MAE, RMSE and skill relative to persistence.

The reference series comes from Open-Meteo's modeled weather data rather than an independent station-validation campaign. Adjusting sliders after looking at the held-out curve is exploratory analysis. The small ODE is a learning and interpretation tool, not a replacement for a numerical weather prediction system.

## Run locally

The application uses native browser modules, HTML, CSS and SVG. No JavaScript build step is needed.

```bash
git clone https://github.com/FyodorAmanov1/WeatherPrediction.git
cd WeatherPrediction
python -m http.server 8000 --directory docs
```

Open <http://localhost:8000>. Serve the site over HTTP rather than opening `index.html` directly, so its modules and data requests work correctly. Live mode needs internet access.

## Repository guide

| File | Purpose |
|---|---|
| [docs/index.html](docs/index.html) | Weather dashboard and laboratory interface |
| [docs/app.js](docs/app.js) | Data fetching, interaction and visualization |
| [docs/model.mjs](docs/model.mjs) | ODE, RK4 integration and evaluation helpers |
| [docs/data/oxford.json](docs/data/oxford.json) | Dated saved weather example |
| [ProjectNumMeth1.ipynb](ProjectNumMeth1.ipynb) | Original numerical-methods study |

## Data and license

Weather data: [Open-Meteo](https://open-meteo.com/). Location data: GeoNames through Open-Meteo geocoding. Preserve the providers' CC BY 4.0 attribution when reusing their data. Application code is available under the [MIT license](LICENSE).
