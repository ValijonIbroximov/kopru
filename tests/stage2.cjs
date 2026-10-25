// Run: node tests/regression.cjs (uses the existing TypeScript dev dependency).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Module = require('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) {
  if(request.startsWith('@/')) request = path.resolve(__dirname, '../src', request.slice(2));
  return originalResolve.call(this, request, parent, ...args);
};
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);

const {gamePool,eligibleWords,orderedLessons,lessonIsOpen}=require('../src/lib/game-policy.ts');
const {vocabularyRows}=require('../src/lib/vocabulary.ts');
const seed=require('../src/content/seed.json');
const base=seed.words[0];
const words=[{...base,id:1,tr:'merhaba'},{...base,id:2,tr:'iyi geceler'},{...base,id:3,tr:'su'},{...base,id:4,tr:'MERHABA'},{...base,id:5,tr:'şeker'},{...base,id:6,tr:'öğrenci'}];
const states=words.slice(0,4).map(w=>({word_id:w.id,state:'learning',reps:10,lapses:1,stability:3,difficulty:5,due:'2026-10-20',last_review:'2026-10-19'}));
assert.deepEqual(eligibleWords('anagram',words).map(w=>w.id),[1,5,6]);
assert.deepEqual(eligibleWords('bridge',words).map(w=>w.id),[1,5,6]);
assert.equal(gamePool('anagram',words,[],[],states,3,'known').enough,false);
assert.equal(gamePool('anagram',words,[],[],states,3,'known').words.length,1);
const extended=gamePool('anagram',words,[],[],states,3,'extended');
assert.equal(extended.enough,true);assert.deepEqual(extended.words.map(w=>w.id),[1,5,6]);
const lessons=[{id:1,unit_id:100,order_index:2},{id:2,unit_id:100,order_index:1},{id:3,unit_id:1,order_index:1}];
const ordered=orderedLessons(lessons,[{id:100,order_index:1},{id:1,order_index:2}]);
assert.deepEqual(ordered.map(l=>l.id),[2,1,3]);
assert.equal(lessonIsOpen(2,ordered,[]),true);assert.equal(lessonIsOpen(3,ordered,[]),false);
assert.equal(lessonIsOpen(1,ordered,[{lesson_id:2,status:'completed'}]),true);
assert.equal(lessonIsOpen(2,ordered,[{lesson_id:2,status:'completed'}]),true);
assert.equal(lessonIsOpen(999,ordered,[]),false);
assert.equal(vocabularyRows(words,[...states,{word_id:6,state:'new',reps:0}]).length,4);
// Personal games cannot silently switch to data.allWords after eligibility checks.
for(const name of ['anagram','bridge','bingo','memory','rain','tower']) {
 const source=fs.readFileSync(path.join(__dirname,`../src/app/(app)/play/${name}/page.tsx`),'utf8');
 assert.ok(!/\?\s*data\.words\s*:\s*data\.allWords/.test(source),name);
}
const dataPath=require.resolve('../src/lib/data.ts');
let resolveLoad;let failLoad=false;let loading=new Promise(resolve=>{resolveLoad=resolve;});
const persisted=[];
const mock=new Module(dataPath);mock.exports={fetchUserWords:()=>failLoad?Promise.reject(Error('offline')):loading,recordReview:async(id,grade,correct,card)=>{persisted.push({id,reps:card.reps});}};
require.cache[dataPath]=mock;
const {SrsSession,flushGameReviews}=require('../src/lib/srs-client.ts');
(async()=>{
 const session=new SrsSession('regression');
 session.load();session.grade(1,true,1000,'choice');session.grade(1,true,1000,'choice');
 await Promise.resolve();assert.equal(persisted.length,0,'Do not grade against empty state before history loads');
 resolveLoad(states);
 assert.equal(await flushGameReviews('regression'),0);
 assert.deepEqual(persisted.map(r=>r.reps),[11,12],'Preserve previous history and serialize repeated grades');
 failLoad=true;const failed=new SrsSession('retry');failed.grade(1,false,1000,'choice');
 assert.equal(await flushGameReviews('retry'),1);
 failLoad=false;loading=Promise.resolve(states);
 assert.equal(await flushGameReviews('retry',true),0);
 assert.equal(persisted.at(-1).reps,11);
 console.log('PASS stage 2: eligible vocabulary, expansion, unit ordering, lesson access, dictionary, arcade boundaries, SRS loading race and retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
