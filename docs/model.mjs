// Temperature in Celsius; time in hours. No minute/hour conversion is implicit.
export function interpolate(profile, hour) {
  const t = ((hour % 24) + 24) % 24, i = Math.floor(t), f = t - i;
  return profile[i] * (1 - f) + profile[(i + 1) % 24] * f;
}
export function rk4(rhs, initial, start, stop, step = 1 / 12) {
  if (![initial,start,stop,step].every(Number.isFinite) || step <= 0 || stop < start) throw Error('Invalid integration domain');
  const values = [{time:start,value:initial}]; let t = start, y = initial;
  while (t < stop - 1e-10) {
    const h = Math.min(step, stop - t), k1 = rhs(t,y), k2 = rhs(t+h/2,y+h*k1/2), k3 = rhs(t+h/2,y+h*k2/2), k4 = rhs(t+h,y+h*k3);
    y += h * (k1 + 2*k2 + 2*k3 + k4) / 6; t += h;
    if (!Number.isFinite(y)) throw Error('Integration diverged');
    values.push({time:t,value:y});
  }
  return values;
}
export function temperatureProfile(previous, {alpha=.5,memory=.2,solar=.4,sunrise=6,daylight=12}={}) {
  if (previous.length !== 24 || !previous.every(Number.isFinite)) throw Error('A complete 24-hour profile is required');
  const mean = previous.reduce((a,b)=>a+b,0)/24, amplitude=(Math.max(...previous)-Math.min(...previous))/2;
  const forcing = t => daylight > 0 && t >= sunrise && t <= sunrise+daylight ? Math.sin(Math.PI*(t-sunrise)/daylight) : 0;
  const rhs=(t,T)=>alpha*(mean+amplitude*Math.cos(2*Math.PI*(t-14)/24)-T)+memory*(interpolate(previous,t)-T)+solar*forcing(t);
  const trajectory=rk4(rhs,previous[23],0,24);
  return Array.from({length:24},(_,h)=>trajectory[Math.round(h*12)].value);
}
export function scores(predicted, reference) {
  if (predicted.length!==reference.length || !reference.length) throw Error('Mismatched reference');
  const residual=predicted.map((v,i)=>v-reference[i]);
  return {mae:residual.reduce((s,v)=>s+Math.abs(v),0)/residual.length,rmse:Math.sqrt(residual.reduce((s,v)=>s+v*v,0)/residual.length)};
}
export function dayProfile(data, date) {
  const buckets=Array.from({length:24},()=>[]);
  data.hourly.time.forEach((t,i)=>{const v=data.hourly.temperature_2m[i];if(t.slice(0,10)===date && Number.isFinite(v))buckets[Number(t.slice(11,13))].push(v)});
  const profile=buckets.map(a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null);
  if(profile.filter(Number.isFinite).length<23)throw Error('Insufficient historical temperatures for this location');
  return profile.map((v,h)=>v??(profile[(h+23)%24]+profile[(h+1)%24])/2);
}
export function solarGeometry(data,date) {
  const i=data.daily.time.indexOf(date), rise=data.daily.sunrise[i], set=data.daily.sunset[i];
  if(!rise||!set)return {sunrise:6,daylight:12,assumed:true};
  const hour=t=>Number(t.slice(11,13))+Number(t.slice(14,16))/60;
  return {sunrise:hour(rise),daylight:Math.max(0,hour(set)-hour(rise)),assumed:false};
}
export function experimentDays(data) {
  const today=data.current.time.slice(0,10), earlier=data.daily.time.filter(d=>d<today);
  if(earlier.length<3)throw Error('Three past days are required for fitting and hold-out comparison');
  return {fitInput:earlier.at(-3),fitTarget:earlier.at(-2),heldOut:earlier.at(-1),today};
}
export function fitParameters(data) {
  const days=experimentDays(data), previous=dayProfile(data,days.fitInput), target=dayProfile(data,days.fitTarget), geometry=solarGeometry(data,days.fitTarget);
  let best=null;
  for(const alpha of [.05,.15,.3,.5,.8,1.2])for(const memory of [0,.1,.3,.6])for(const solar of [0,.2,.5,1]){
    const params={alpha,memory,solar,...geometry}, score=scores(temperatureProfile(previous,params),target).rmse;
    if(!best||score<best.rmse)best={...params,rmse:score};
  }
  return best;
}
