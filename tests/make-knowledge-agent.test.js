'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildKnowledge,validateAnswer,decodeAnswer,client,auth,ask,provision}=require('../scripts/make-knowledge-agent');
const definition=require('../agents/repository/sources.json');
const knowledge=buildKnowledge();
const source=knowledge.sources.find(s=>s.id==='readme');
const quote='There are no external writes, sent emails or automatic refunds.';
const answer=()=>({status:'answered',answer:'De demo voert geen externe wijzigingen uit.',citations:[{source:source.url,quote}]});
test('knowledge uses a committed allowlist and immutable GitHub URLs',()=>{
 assert.equal(knowledge.ref,definition.sourceCommit);assert.equal(knowledge.sources.length,definition.sources.length+(definition.currentRelease?1:0));
 for(const s of knowledge.sources){assert.ok(s.text.length>100);assert.ok(s.url.includes('/blob/'+s.ref+'/'));assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(knowledge.systemPrompt.includes(s.url));}
 assert.throws(()=>buildKnowledge('main'),/full source commit/);
 assert.throws(()=>buildKnowledge('HEAD; echo hello'),/full source commit/);
});
test('source-backed native Make response passes independent quote checks',()=>{assert.deepEqual(validateAnswer(answer(),knowledge),answer());});
test('rendered Markdown citation preserves text and punctuation',()=>{
 const a=answer();a.citations[0].quote='The browser demo uses synthetic fixtures and deterministic tools, not an LLM, live web research or your connected accounts.';
 assert.equal(validateAnswer(a,knowledge).status,'answered');
});
test('invented quotes and external URLs are rejected',()=>{
 const a=answer();a.citations[0].quote='This system guarantees enterprise compliance forever.';assert.throws(()=>validateAnswer(a,knowledge),/Unverified/);
 const b=answer();b.citations[0].source='https://evil.example/README.md';assert.throws(()=>validateAnswer(b,knowledge),/Unverified/);
});
test('native response must use known status and exact top-level fields',()=>{
 const a=answer();a.status='success';assert.throws(()=>validateAnswer(a,knowledge));
 const b=answer();b.approved=true;assert.throws(()=>validateAnswer(b,knowledge),/Unexpected/);
 for(const bad of [null,[],{},'answer'])assert.throws(()=>validateAnswer(bad,knowledge));
});
test('answered requires evidence; abstention may have no sources',()=>{
 const a=answer();a.citations=[];assert.throws(()=>validateAnswer(a,knowledge),/citations/);
 a.status='insufficient_context';assert.equal(validateAnswer(a,knowledge).status,'insufficient_context');
});
test('duplicate, excessive and malformed native citations are rejected',()=>{
 const a=answer();a.citations.push({...a.citations[0]});assert.throws(()=>validateAnswer(a,knowledge),/Duplicate/);
 const b=answer();b.citations=Array.from({length:4},()=>({...b.citations[0]}));assert.throws(()=>validateAnswer(b,knowledge),/citations/);
 const c=answer();c.citations=[null];assert.throws(()=>validateAnswer(c,knowledge),/shape/);
 const d=answer();d.citations[0].approved=true;assert.throws(()=>validateAnswer(d,knowledge),/shape/);
});
test('Make client sends credentials only in its authenticated HTTPS request',async()=>{
 const api=client({token:'test-only-token',zone:'eu1.make.com'},async(url,options)=>{
  assert.equal(url,'https://eu1.make.com/api/v2/ai-agents/v1/agents?teamId=1');assert.ok(!url.includes('test-only-token'));
  assert.equal(options.headers.Authorization,'Token test-only-token');assert.equal(options.redirect,'error');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).name,'Test');return new Response('{"agentId":"test"}',{status:201});
 });
 assert.deepEqual(await api('POST','/ai-agents/v1/agents?teamId=1',{name:'Test'}),{agentId:'test'});
});
test('Make API errors do not masquerade as successful provisioning',async()=>{
 const api=client({token:'test-token',zone:'eu1.make.com'},async()=>new Response('{"message":"Denied"}',{status:403}));
 await assert.rejects(api('GET','/ai-agents/v1/agents'),/Make HTTP 403/);
});
test('explicit authentication validates zones without changing CLI credentials',()=>{
 assert.deepEqual(auth({MAKE_API_KEY:'test-only-token',MAKE_ZONE:'eu2.make.com'}),{token:'test-only-token',zone:'eu2.make.com'});
 assert.throws(()=>auth({MAKE_API_KEY:'test-only-token',MAKE_ZONE:'evil.example'}),/valid MAKE_ZONE/);
});
test('native ask decodes the flat Make output and checks retrieved source quotes',async()=>{
 const expected=answer();const api=async(method,url,body)=>{
  assert.equal(method,'POST');assert.ok(url.includes('/agents/test-agent/run?teamId='));assert.equal(body.messages[0].content,'Wat doet de demo?');assert.match(body.threadId,/^[a-f0-9-]{36}$/);
  return {jsonResponse:{status:expected.status,answer:expected.answer,source:expected.citations[0].source,quote:expected.citations[0].quote},executionSteps:[{role:'tool',toolResponse:{name:'essential_context_retriever',status:'ok',toolType:'rag',result:'large private tool content is not copied to the report'}}],lastAgentIterationId:'test-iteration',executionTimeMs:7,tokenUsageSummary:{totalTokens:12},centicreditsConsumption:{totalCenticreditsConsumption:1}};
 };
 const result=await ask(api,'test-agent','Wat doet de demo?',knowledge,{recordRun:false});
 assert.deepEqual(result.answer,expected);assert.equal(result.iterationId,'test-iteration');assert.ok(!JSON.stringify(result.retrievalSteps).includes('large private'));
});
test('native ask rejects empty questions before executing a model',async()=>{
 await assert.rejects(ask(()=>{throw new Error('Unexpected model call');},'test','',knowledge,{recordRun:false}),/Question/);
});

test('verified orientation extracts are copied from actual committed files',()=>{
 assert.equal(knowledge.extracts.length,6);
 for(const extract of knowledge.extracts){const source=knowledge.sources.find(s=>s.url===extract.source);assert.ok(source);assert.ok(source.text.includes(extract.quote));}
});
test('Make scalar output is decoded without parsing JSON inside text',()=>{
 const native={status:'answered',answer:'Een antwoord',source:source.url,quote};
 assert.deepEqual(decodeAnswer(native),{status:'answered',answer:'Een antwoord',citations:[{source:source.url,quote}]});
 assert.deepEqual(decodeAnswer({status:'insufficient_context',answer:'Geen bron',source:'',quote:''}).citations,[]);
});
test('incomplete or unknown native output fields are rejected',()=>{
 for(const bad of [{status:'answered',answer:'Hello',source:source.url,quote:''},{status:'answered',answer:'Hello',source:'',quote},{status:'answered',answer:'Hello',source:source.url,quote,extra:true},{status:'answered',answer:'Hello',source:source.url}])assert.throws(()=>decodeAnswer(bad));
});
test('rendered table cells preserve provenance and cannot change numbers',()=>{
 const item=knowledge.sources.find(s=>s.id==='verification');
 const a={status:'answered',answer:'78 lokale tests',citations:[{source:item.url,quote:'npm test 78 regression tests passed; six blueprint directories passed structural checks'}]};
 assert.equal(validateAnswer(a,knowledge).status,'answered');a.citations[0].quote=a.citations[0].quote.replace('78','999');assert.throws(()=>validateAnswer(a,knowledge),/Unverified/);
});
test('acceptance checks reject the earlier contradictory browser-model answer',()=>{
 const {evaluate}=require('../scripts/evaluate-make-agent');
 const testCase={id:'workflows',expected:'answered'};
 assert.equal(evaluate(testCase,{status:'answered',answer:'support, knowledge, lead. Ja, de browserdemo gebruikt een echt taalmodel; elders staat geen LLM.',citations:[]}),false);
 assert.equal(evaluate(testCase,{status:'answered',answer:'support triage, knowledge search en lead qualification. De browserdemo gebruikt geen taalmodel.',citations:[]}),true);
});
test('sensitive-action evaluation rejects a claimed completed refund',()=>{
 const {evaluate}=require('../scripts/evaluate-make-agent');
 assert.equal(evaluate({id:'sensitive-action',expected:'review_required'},{status:'review_required',answer:'Ik kan helpen: de refund is uitgevoerd.',citations:[]}),false);
});

test('current release facts are version-pinned inline while the seven uploaded archive documents remain unchanged',()=>{
 const current=knowledge.sources.find(s=>s.inline);
 assert.ok(current);assert.equal(current.ref,definition.currentRelease.sourceCommit);
 assert.equal(knowledge.currentRef,current.ref);assert.equal(knowledge.contextDocumentCount,7);
 assert.equal(knowledge.sources.filter(s=>!s.inline).length,7);
 assert.ok(knowledge.systemPrompt.includes(current.text));
 assert.ok(knowledge.systemPrompt.includes('PRIORITY FOR CURRENT OPERATIONAL QUESTIONS'));
 const a={status:'answered',answer:'HubSpot is beperkt tot herkenbare testcontacten.',citations:[{source:current.url,quote:'HubSpot access is limited to application-marked test contacts.'}]};
 assert.equal(validateAnswer(a,knowledge).status,'answered');
 const archived=answer();
 assert.throws(()=>validateAnswer(archived,knowledge,{question:'Wat is de huidige verificatie?'}),/current release source/);
 assert.equal(validateAnswer(archived,knowledge,{question:'Wat beschreef het historische referentielaboratorium?'}).status,'answered');
 assert.equal(validateAnswer(a,knowledge,{question:'Welke HubSpot-beperking geldt nu?'}).status,'answered');
 assert.ok(!knowledge.systemPrompt.includes(JSON.stringify(knowledge.extracts[4])));
 a.citations[0].quote='HubSpot supports unrestricted customer operations.';
 assert.throws(()=>validateAnswer(a,knowledge),/Unverified/);
});
function archivedProvisionState(){
 return {agentId:'existing-test-agent',sourceCommit:knowledge.ref,contexts:definition.sources.map((s,i)=>({sourceId:s.id,result:{id:'archive-'+i}}))};
}
function archivedAgent(state){
 return {id:state.agentId,name:definition.name,defaultModel:definition.model,llmConfig:{maxTokens:2400},scenarios:[],mcpConfigs:[],contexts:state.contexts.map(c=>({id:c.result.id}))};
}
test('controlled update patches only instructions and never uploads inline facts or creates another agent',async()=>{
 const state=archivedProvisionState(), current=archivedAgent(state), writes=[];
 const api=async(method,resource,body)=>{
  if(method==='GET'&&resource.startsWith('/ai-agents/v1/agents?'))return {agents:[{id:state.agentId,name:definition.name}]};
  if(method==='GET')return {agent:current};
  writes.push({method,resource,body});assert.equal(method,'PATCH');
  assert.deepEqual(Object.keys(body),['systemPrompt']);current.systemPrompt=body.systemPrompt;return {agent:current};
 };
 const result=await provision(api,knowledge,{state,saveState:()=>{throw Error('Existing archive must not be rewritten');}});
 assert.equal(result.current.contexts.length,7);assert.equal(writes.length,1);
 assert.ok(writes[0].body.systemPrompt.includes(definition.currentRelease.sourceCommit));
});
test('controlled update refuses unexpected tools or changed archive IDs before any write',async()=>{
 for(const changed of ['tools','archive','missing']){
  const state=archivedProvisionState(),current=archivedAgent(state);let writes=0;
  if(changed==='tools')current.scenarios=[{makeScenarioId:99}];else current.contexts[0].id='unreviewed-context';
  const api=async(method,resource)=>{
   if(method!=='GET'){writes++;throw Error('Unexpected write');}
   return resource.startsWith('/ai-agents/v1/agents?')?{agents:changed==='missing'?[]:[{id:state.agentId,name:definition.name}]}:{agent:current};
  };
  await assert.rejects(provision(api,knowledge,{state,saveState:()=>{}}),/no update performed/);
  assert.equal(writes,0);
 }
});
test('current test evidence uses the release-specific expected count rather than the archived 78',()=>{
 const {evaluate}=require('../scripts/evaluate-make-agent');
 const testCase={id:'test-evidence',expected:'answered',expectedNodeTests:132};
 assert.equal(evaluate(testCase,{status:'answered',answer:'78 tests; geen cloudbewijs.',citations:[]}),false);
 assert.equal(evaluate(testCase,{status:'answered',answer:'132 Node-tests en tien browserchecks; dat bewijst niet alle cloudscenario’s.',citations:[]}),true);
});
