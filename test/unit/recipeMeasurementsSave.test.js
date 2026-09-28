const assert = require('node:assert/strict');
const proxyquire = require('proxyquire').noCallThru();
function model(row) {
 return proxyquire('../../model/createRecipe', { '../dbConnection.js': { from: () => ({ select(){return this;},in:async()=>({data:[row],error:null}) }) } });
}
describe('Saving recipe measurements',()=>{
 it('preserves cups and source notes without treating cups as grams',async()=>{
  const r=await model({id:1,calories:100}).createRecipe(960,[1],[0.25],'Soup',1,2,20,'Cook',1,[],{unit:['cups'],notes:[''],source_measure:['1/4 cup']});
  assert.deepEqual(r.ingredients.unit,['cups']);assert.equal(r.ingredients.quantity[0],0.25);
  assert.equal(r.ingredients.source_measure[0],'1/4 cup');assert.equal(r.calories,null);
 });
 it('retains unspecified amounts and does not invent zero nutrition',async()=>{
  const r=await model({id:1,calories:100}).createRecipe(960,[1],[null],'Soup',1,2,20,'Cook',1,[],{unit:[''],notes:['To taste'],source_measure:['To taste']});
  assert.equal(r.ingredients.quantity[0],null);assert.equal(r.calories,null);
 });
 it('calculates known mass quantities and leaves missing nutrient data unknown',async()=>{
  const r=await model({id:1,calories:100,protein:null}).createRecipe(960,[1],[0.5],'Soup',1,2,20,'Cook',1,[],{unit:['kg']});
  assert.equal(r.calories,500);assert.equal(r.protein,null);
 });
 it('preserves the numeric gram contract for existing clients',async()=>{
  const r=await model({id:1,calories:100}).createRecipe(960,[1],[250],'Soup',1,2,20,'Cook',1);
  assert.equal(r.calories,250);assert.equal(r.ingredients.unit,undefined);
 });
});
