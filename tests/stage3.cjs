const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(r,p,...a){return resolve.call(this,r.startsWith('@/')?path.resolve(__dirname,'../src',r.slice(2)):r,p,...a);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {classifyError}=require('../src/lib/ai/errors.ts');
const now=Date.parse('2026-10-25T12:00:00Z');
assert.equal(classifyError(429,'RESOURCE_EXHAUSTED',new Headers(),now).cooldownMs,60000);
assert.equal(classifyError(429,'rate limited',new Headers({'retry-after':'15'}),now).cooldownMs,15000);
assert.equal(classifyError(429,'rate limited',new Headers({'retry-after':'Sun, 25 Oct 2026 12:02:00 GMT'}),now).cooldownMs,120000);
assert.equal(classifyError(429,'daily quota',new Headers(),now).cooldownMs,12*3600000);
assert.equal(classifyError(401,'secret-token-detail',new Headers(),now).reason,'error');
assert.ok(!classifyError(429,'secret-token-detail',new Headers(),now).message.includes('secret'));
const {practiceAverage,validWriting}=require('../src/lib/exam-score.ts');
assert.equal(practiceAverage([100,80,null,null]),90);
assert.equal(practiceAverage([100,80,0,null]),60);
assert.equal(validWriting({score:12,band:'B2',corrected:'',comments:[],summary_uz:''}),false);
assert.equal(validWriting({score:8,band:'B2',corrected:'',comments:'invalid',summary_uz:''}),false);
assert.equal(validWriting({score:8,band:'B2',corrected:'',comments:[],summary_uz:''}),true);
const {practicePacks}=require('../src/lib/certificate.ts');
for(const p of practicePacks){assert.ok(p.reading&&p.listening&&p.writing&&p.speaking.length);for(const q of [...p.readingQuestions,...p.listeningQuestions]){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.why);}}
// Provider fallback is exercised without real keys, network, or user data.
const providersPath=require.resolve('../src/lib/ai/providers.ts');
const mock=new Module(providersPath);mock.exports={currentModel:(_,m)=>m,configuredProviders:()=>['first','second'].map(id=>({def:{id,url:'https://test.invalid/'+id},key:'fake',model:'test'}))};require.cache[providersPath]=mock;
const {callChain}=require('../src/lib/ai/gateway.ts');
const reply={reply_tr:'Merhaba!',reply_uz:'Salom!'};
let calls=[];
global.fetch=async url=>{calls.push(url);return url.endsWith('first')?new Response('Rate limit exceeded',{status:429,headers:{'retry-after':'30'}}):Response.json({choices:[{message:{content:JSON.stringify(reply)}}]});};
(async()=>{const result=await callChain('tutor',{messages:[]},{admin:null,user:null});assert.equal(result.ok,true);assert.equal(result.provider,'second');assert.equal(calls.length,2);calls=[];const second=await callChain('tutor',{messages:[]},{admin:null,user:null});assert.equal(second.ok,true);assert.equal(calls.length,1);assert.ok(calls[0].endsWith('second'));console.log('Stage 3: retry timing, safe errors, fallback, scoring and content passed.');})().catch(e=>{console.error(e);process.exitCode=1;});
