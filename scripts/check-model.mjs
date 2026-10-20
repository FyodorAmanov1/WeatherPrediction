import assert from 'node:assert/strict';
import {rk4,temperatureProfile,scores} from '../docs/model.mjs';
const trajectory=rk4((t,y)=>-y,1,0,2);
assert.ok(Math.abs(trajectory.at(-1).value-Math.exp(-2))<2e-6,'RK4 must agree with the analytic decay solution');
const profile=temperatureProfile(Array(24).fill(12),{alpha:.3,memory:.2,solar:0});
assert.ok(profile.every(t=>Math.abs(t-12)<1e-10),'Constant temperature must be an equilibrium');
assert.deepEqual(scores([1,3],[2,2]),{mae:1,rmse:1});
assert.throws(()=>rk4(t=>t,0,0,1,0));
console.log('Analytic RK4, equilibrium, error scores and invalid-domain checks passed.');
