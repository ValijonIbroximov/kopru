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
const {learnedWords,buildPool} = require('../src/lib/wordpool.ts');
const {coachWords} = require('../src/lib/coach.ts');
const {buildLessonSession} = require('../src/lib/exercises.ts');
const {cacheKey} = require('../src/lib/ai/gateway.ts');
const {validTutor} = require('../src/lib/ai/validation.ts');
const {contentCache,clearContentCache} = require('../src/lib/content-cache.ts');
const seed = require('../src/content/seed.json');
const words = seed.words.slice(0,8);
const progress = [{lesson_id:words[0].lesson_id,status:'in_progress'},{lesson_id:words[4].lesson_id,status:'completed'}];
const states = words.slice(0,4).map((w,i)=>({word_id:w.id,state:'learning',reps:2,lapses:i===2?1:0,due:i===1?'2020-01-01':'2099-01-01',last_review:'2026-01-01'}));
assert.deepEqual(learnedWords(words,progress,[]), [], 'Opening/completing a lesson must not mark every word seen');
assert.equal(learnedWords(words,progress,states).length,4);
assert.equal(buildPool(words,[],progress,states,6,'known').enough,false);
assert.equal(buildPool(words,[],progress,states,6,'known').words.length,4);
assert.equal(buildPool(words,[],progress,states,6,'extended').enough,true);
assert.equal(coachWords(words,states)[0].id,words[1].id,'Due word must lead');
assert.equal(coachWords(words,states)[1].id,words[2].id,'High error rate follows');
const q = buildLessonSession({newWords:words,pool:[],grammar:[],reviewWords:[]});
const seen = new Set();
for (const e of q) {
 if (e.type==='intro') seen.add(e.wordId);
 else if(e.wordId) assert.ok(seen.has(e.wordId),'No quiz before introduction');
 if(e.type==='choice' || e.type==='listen') {
   const allowed = words.filter(w=>seen.has(w.id)).flatMap(w=>[w.tr,w.uz]);
   for(const option of e.options ?? []) assert.ok(allowed.includes(option),'No unseen distractor');
 }
}
assert.notEqual(cacheKey('story',{words:[{tr:'ev',uz:'uy'}]}),cacheKey('story',{words:[{tr:'su',uz:'suv'}]}));
assert.equal(cacheKey('explain',{a:1,b:{c:2,d:3}}),cacheKey('explain',{b:{d:3,c:2},a:1}));
assert.equal(validTutor({reply_tr:'Merhaba',reply_uz:'Salom',new_words:[{tr:'ev',uz:'uy'}]}),true);
assert.equal(validTutor({reply_tr:123,reply_uz:'Salom'}),false);
assert.equal(validTutor({reply_tr:'ev',reply_uz:'uy',corrections:{wrong:'x'}}),false);
assert.equal(validTutor({reply_tr:'ev',reply_uz:'uy',new_words:[null]}),false);
(async()=>{
 const {createReviewQueue}=require('../src/lib/review-queue.ts');
 const writes=createReviewQueue();const order=[];let offline=true;
 writes.add(async()=>{if(offline) throw Error('offline'); order.push(1);});
 writes.add(async()=>{order.push(2);});
 assert.equal(await writes.flush(),2);assert.deepEqual(order,[]);
 offline=false;assert.equal(await writes.flush(true),0);assert.deepEqual(order,[1,2]);
 const ast=ts.createSourceFile('runner.tsx',fs.readFileSync(path.join(__dirname,'../src/components/exercises/ExerciseRunner.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let matchGuard=false;
 function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(ast).includes("current.type === 'match' && meta?.pairResults")) {assert.ok(ts.isBlock(node.thenStatement));assert.ok(node.elseStatement);matchGuard=true;}ts.forEachChild(node,visit);}visit(ast);assert.ok(matchGuard);
 let calls=0; const load=async()=>{calls++; return ['a'];};
 const values=await Promise.all([contentCache('test',load),contentCache('test',load)]);
 assert.equal(calls,1);assert.deepEqual(values,[['a'],['a']]);
 clearContentCache();await contentCache('test',load);assert.equal(calls,2);
 await assert.rejects(contentCache('error',async()=>{throw Error('network');}));
 assert.equal(await contentCache('error',async()=>42),42);
 // Browser audio mocks exercise interrupted request / wrong-language fallback.
 const store=new Map();global.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 let spoken=0;
 global.window={speechSynthesis:{getVoices:()=>[{lang:'en-US',name:'English'}],cancel(){},speak(){spoken++;}}};
 global.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 class AudioMock { constructor(url){this.url=url;AudioMock.instances.push(this);} play(){return Promise.resolve();} pause(){} removeAttribute(){} load(){} }
 AudioMock.instances=[];global.Audio=AudioMock;
 const speech=require('../src/lib/speech.ts');
 const first=speech.speak('Merhaba');const second=speech.speak('Günaydın');
 AudioMock.instances.at(-1).onended();
 assert.equal(await first,false);assert.equal(await second,true);
 assert.equal(spoken,0);
 speech.setVoicePref('browser'); assert.equal(await speech.speak('Türkçe'),false,'English fallback forbidden');
 assert.equal(spoken,0);
 console.log('PASS: vocabulary boundaries, teach-before-test, coach priority, nested AI cache, tutor schema, content cache and speech cancellation/language.');
})().catch(e=>{console.error(e);process.exitCode=1;});
