const luluKey = 'lifetogether-lulu-studio-v1';
const luluDefaultFormat = '0600X0900.BW.STD.PB.060UW444.MXX';
function luluPod(value) {
  const s=String(value||'').trim().toUpperCase(), legacy=s.match(/^(\d{4}X\d{4})([A-Z]{2})([A-Z]{3})([A-Z]{2})([A-Z0-9]{8})([A-Z0-9]{3})$/);
  return legacy?legacy.slice(1).join('.'):s;
}
const luluValidPod = value => /^\d{4}X\d{4}\.[A-Z]{2}\.[A-Z]{3}\.[A-Z]{2}\.[A-Z0-9]+\.[A-Z0-9]{3}$/.test(luluPod(value));
let luluState = {schema:luluKey, editions:[], jobs:[]};
let luluHealth = null, luluBusy = '', luluMessage = '', luluError = false;
let luluValidation = {};
let luluComparison = [], luluCompareStamp = '';
let luluQuote = null, luluShipping = [], luluActiveEdition = '', luluDelivery = {}, luluDrafts = {};
try {
  const saved = JSON.parse(localStorage.getItem(luluKey) || 'null');
  if (saved?.schema === luluKey && Array.isArray(saved.editions) && Array.isArray(saved.jobs))
    luluState = {...luluState, editions:saved.editions.slice(0,100).map(e=>({...e,pod_package_id:luluPod(e.pod_package_id)})), jobs:saved.jobs.slice(0,50)};
} catch {}
function luluPersist() { localStorage.setItem(luluKey, JSON.stringify(luluState)); }
function luluMoney(value, currency='USD') {
  if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) return '—';
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(value)); } catch { return '—'; }
}
const luluStatusLabel = value => ({draft:'Draft',files:'Files prepared',proof:'Physical proof approved',live:'Ready to fulfill'}[value] || 'Draft');
function luluPublicURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
function luluChecks(edition) {
  return [
    ['Title added', Boolean(edition.title?.trim())],
    ['Book format and page count set', luluValidPod(edition.pod_package_id) && Number(edition.page_count) > 0],
    ['Interior PDF link added', Boolean(luluPublicURL(edition.interior_url))],
    ['Cover PDF link added', Boolean(luluPublicURL(edition.cover_url))],
    ['Physical proof approved', ['proof','live'].includes(edition.status)]
  ];
}
function luluFormatLabel(edition) { return edition.pod_package_id === luluDefaultFormat ? '6 × 9 in · Paperback · Black & white' : 'Custom Lulu format'; }
async function luluRequest(action, options={}) {
  const query = new URLSearchParams({action});
  Object.entries(options.params || {}).forEach(([k,v]) => query.set(k,v));
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const result = await fetch('/.netlify/functions/lulu?' + query, {method:options.body?'POST':'GET', headers:options.body?{'content-type':'application/json'}:{}, body:options.body?JSON.stringify(options.body):undefined, signal:controller.signal});
    const data = await result.json().catch(() => ({error:'The print service could not be reached. Check the connection and try again.'}));
    if (!result.ok) throw Error(data.error || 'The print service could not complete this request. Try again.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Error('Lulu took too long to respond. For an order, check your Lulu dashboard before trying again to avoid ordering twice.');
    throw error;
  } finally { clearTimeout(timeout); }
}
function luluNotice() { return `<div id="lulu-notice" class="pod-feedback ${luluError?'is-error':''}" role="${luluError?'alert':'status'}" aria-live="polite" ${luluMessage?'':'hidden'}>${E(luluMessage)}</div>`; }
function luluNotify(message, error=false) {
  luluMessage = message; luluError = error;
  const box = $('#lulu-notice');
  if (box) { box.textContent = message; box.hidden = !message; box.classList.toggle('is-error',error); box.setAttribute('role',error?'alert':'status'); if(error) box.scrollIntoView({block:'nearest',behavior:'smooth'}); }
}
function luluSetBusy(value) {
  luluBusy = value;
  document.querySelectorAll('[data-lulu], #lulu-edition button, #lulu-quote button').forEach(el => {
    if (value) { el.dataset.wasDisabled = String(el.disabled); el.disabled = true; }
    else { el.disabled = el.dataset.wasDisabled === 'true'; delete el.dataset.wasDisabled; }
  });
  const region = $('#lulu-workspace'); if (region) region.setAttribute('aria-busy', String(Boolean(value)));
}
async function luluConnect() {
  if (luluBusy) return;
  luluSetBusy('connect');
  try { luluHealth = await luluRequest('health'); if(luluHealth.configured){const result=await luluRequest('connection',{body:{}});luluHealth.authenticated=result.authenticated;luluNotify(result.environment==='sandbox'?'Connected to Lulu sandbox. You can test delivery options and estimates. Test orders never print or ship.':'Connected to Lulu production. Estimates use the production service.');}else luluNotify('Your studio is ready. Add the sandbox client key and secret in Netlify, redeploy, then check the connection.'); }
  catch (err) { luluHealth = {...(luluHealth||{}),authenticated:false,connection_failed:true}; luluNotify(err.message,true); }
  finally { luluSetBusy(''); if (currentRoute()[0] === 'print-studio') render(); }
}
function luluField(name,label,value='',options={}) {
  const id = 'lulu-' + name;
  const attrs = `id="${id}" name="${name}" ${({name:'name',organization:'organization',street1:'address-line1',street2:'address-line2',city:'address-level2',state_code:'address-level1',postcode:'postal-code',country_code:'country',phone_number:'tel',email:'email'})[name]?`autocomplete="${({name:'name',organization:'organization',street1:'address-line1',street2:'address-line2',city:'address-level2',state_code:'address-level1',postcode:'postal-code',country_code:'country',phone_number:'tel',email:'email'})[name]}"`:""} ${options.required?'required ':''}${options.min!=null?`min="${options.min}" `:''}${options.max!=null?`max="${options.max}" `:''}${options.step?`step="${options.step}" `:''}${options.maxlength?`maxlength="${options.maxlength}" `:''}${options.help?`aria-describedby="${id}-help"`:''}`;
  const input = options.options ? `<select ${attrs}>${options.options.map(([v,l])=>`<option value="${E(v)}" ${String(v)===String(value)?'selected':''}>${E(l)}</option>`).join('')}</select>` : options.area ? `<textarea ${attrs} rows="${options.rows||3}">${E(value)}</textarea>` : `<input ${attrs} type="${options.type||'text'}" value="${E(value)}" ${options.placeholder?`placeholder="${E(options.placeholder)}"`:''}>`;
  return `<label class="field ${options.full?'full':''}"><span>${E(label)}</span>${input}${options.help?`<small id="${id}-help">${E(options.help)}</small>`:''}</label>`;
}
function luluSetup() {
  return `<details class="pod-panel pod-setup" id="lulu-setup"><summary>Connect Lulu · simple setup guide</summary><p>Your key and secret are this website’s private login to Lulu. Add them in Netlify, then return here to test the connection.</p><ol><li>Open <a href="https://developers.sandbox.lulu.com/" target="_blank" rel="noopener noreferrer">Lulu sandbox</a>, sign in, and open <strong>Client Keys &amp; Secret</strong>. Copy the client key and client secret separately.</li><li>Open <a href="https://app.netlify.com/projects/lifetogethermasterlibary/configuration/env" target="_blank" rel="noopener noreferrer">this website’s Netlify environment variables</a>. Select <strong>Add a variable → Add a single variable</strong> for each setting below.<ul><li><code>LULU_CLIENT_KEY</code> — your sandbox client key.</li><li><code>LULU_CLIENT_SECRET</code> — your sandbox client secret. Select <strong>Contains secret values</strong>.</li><li><code>LULU_API_ENVIRONMENT</code> — enter <code>sandbox</code>.</li><li><code>LULU_CONTACT_EMAIL</code> — your email for order updates.</li><li><code>LULU_ENABLE_ORDERS</code> — start with <code>false</code>.</li></ul></li><li>Include the <strong>Functions</strong> scope and the <strong>Production</strong> deploy context. “Production” here means this published website; Lulu stays in sandbox.</li><li>Open <a href="https://app.netlify.com/projects/lifetogethermasterlibary/deploys" target="_blank" rel="noopener noreferrer">Netlify Deploys</a>, choose <strong>Trigger deploy → Deploy site</strong>, and wait for <strong>Published</strong>.</li><li>Return here and select <strong>Check connection</strong>. This tests the key and secret with Lulu without creating an order. Then prepare a book and request a print estimate.</li><li>After the estimate works, change <code>LULU_ENABLE_ORDERS</code> to <code>true</code> and redeploy to enable <strong>Create test order</strong>. Keep <code>LULU_API_ENVIRONMENT=sandbox</code>.</li></ol><p><strong>Sandbox orders never print or ship real books.</strong> Production printing uses separate credentials and billing. Review a physical proof before customer fulfillment.</p><div class="toolbar"><a class="btn" href="https://developers.sandbox.lulu.com/" target="_blank" rel="noopener noreferrer">Open Lulu sandbox ↗</a><a class="btn" href="https://app.netlify.com/projects/lifetogethermasterlibary/configuration/env" target="_blank" rel="noopener noreferrer">Open Netlify settings ↗</a><button class="btn" data-lulu="connect">Check connection</button><button class="btn flat" data-lulu="download-setup">Download setup checklist</button></div><p class="small">Keep both credentials in Netlify. Never paste secrets into a chat, a public file, or a book field.</p></details>`;
}
function luluConnectionCard() {
  const h = luluHealth;
  return `<section class="pod-connection ${h?.authenticated?'ready':'needs-setup'}"><span class="pod-dot ${h?'':'waiting'}"></span><div><strong>${!h?'Checking print service…':h.connection_failed?'Lulu connection needs attention':h.authenticated?(h.environment==='production'?'Connected to Lulu production':'Connected to Lulu sandbox'):h.configured?'Lulu settings found':'Prepare now. Connect Lulu when you’re ready.'}</strong><p>${!h?'Your editions will appear below.':h.connection_failed?'Open setup and check the saved credentials, then try again.':h.authenticated?(h.orders_enabled?(h.environment==='sandbox'?'Test estimates and test orders are enabled.':'Production estimates and order submission are enabled.'):'Estimates are available. Order submission is turned off.'):h.configured?'Check the connection to verify these credentials.':'Save book details and print files below. Live estimates and orders need your Lulu account.'}</p></div><button class="btn small" data-lulu="${h?.configured?'connect':'setup'}">${h?.configured?'Check connection':'Set up Lulu'}</button></section>`;
}
function luluEditionCard(edition) {
  const checks = luluChecks(edition), ready = checks.filter(x=>x[1]).length;
  return `<article class="pod-edition"><div class="pod-book" aria-hidden="true"><small>LIFETOGETHER EDITION</small><strong>${E(edition.title)}</strong><span>${E(edition.subtitle||'')}</span></div><div><span class="eyebrow">${E(luluStatusLabel(edition.status))}</span><h2>${E(edition.title)}</h2><p>${E(luluFormatLabel(edition))} · ${E(edition.page_count)} pages</p><div class="pod-meter" aria-hidden="true"><i style="width:${ready*20}%"></i></div><p class="small">${ready} of 5 preparation steps complete · Saved on this device</p><div class="toolbar"><a class="btn primary" href="#/print-studio?fulfill=${q(edition.id)}">Get a print estimate</a><a class="btn" href="#/print-studio?edit=${q(edition.id)}">Edit book</a><button class="btn flat" data-lulu="export-edition" data-id="${E(edition.id)}">Download details</button><button class="btn flat" data-lulu="remove-edition" data-id="${E(edition.id)}" aria-label="Remove ${E(edition.title)}">Remove</button></div></div></article>`;
}
function luluEditionForm(edition) {
  const draftKey = edition.id || 'new', d = {...edition,...luluDrafts[draftKey]};
  return `${luluWizard(0)}<section class="pod-panel"><div class="ws-section-title"><div><span class="eyebrow">YOUR PRINT EDITION</span><h2>${edition.id?'Edit your book':'Let’s prepare your book.'}</h2><p>Save a draft at any time. You can add the PDFs later.</p></div><a class="btn flat" href="#/print-studio">Back to my books</a></div><form id="lulu-edition" data-draft="${E(draftKey)}"><input type="hidden" name="edition_id" value="${E(edition.id||'')}"><fieldset class="pod-step"><legend><b>1</b> Name your book</legend><div class="formgrid">${luluField('title','Book title',d.title||'',{required:true,maxlength:200,full:true,placeholder:'e.g. Doing Life Together'})}${luluField('subtitle','Subtitle (optional)',d.subtitle||'',{maxlength:300,full:true})}</div></fieldset><fieldset class="pod-step"><legend><b>2</b> Choose the print format</legend><div class="formgrid">${luluField('format','Book format',d.format || (d.pod_package_id && d.pod_package_id!==luluDefaultFormat?'custom':'paperback'),{options:[['paperback','6 × 9 in paperback · Black & white · Matte cover'],['custom','Use another Lulu format']],full:true,help:'The paperback preset uses standard black-and-white printing on white paper.'})}<div id="lulu-custom-format" class="full" ${(d.format==='custom'||d.pod_package_id&&d.pod_package_id!==luluDefaultFormat)?'':'hidden'}>${luluField('pod_package_id','Lulu format code',d.pod_package_id||luluDefaultFormat,{maxlength:40,help:'For a different trim, binding, or paper, use the package ID supplied by Lulu.'})}<a href="https://developers.lulu.com/" target="_blank" rel="noopener noreferrer">Find format specifications at Lulu ↗</a></div>${luluField('page_count','Total interior pages',d.page_count??120,{required:true,type:'number',min:1,max:3000,help:'Include title pages and blank pages. Must match your final interior PDF.'})}${luluField('retail_price','Your selling price per copy',d.retail_price??'',{required:true,type:'number',min:0,step:'0.01',help:'Used to estimate your margin; it does not collect payment.'})}${luluField('currency','Currency',d.currency||'USD',{options:[['USD','US dollar (USD)'],['CAD','Canadian dollar (CAD)'],['GBP','British pound (GBP)'],['EUR','Euro (EUR)'],['AUD','Australian dollar (AUD)']]})}</div></fieldset><fieldset class="pod-step"><legend><b>3</b> Add your print files</legend><p>Upload and inspect your PDFs in the shared proof studio, then bring their printer links here. Existing HTTPS file links also work. <a href="https://lifetogether-doing-church-together.netlify.app/workspace/#/production">Upload PDFs & review pages →</a></p><div class="formgrid">${luluField('interior_url','Interior PDF link (optional for drafts)',d.interior_url||'',{type:'url',maxlength:2000,full:true,placeholder:'https://…/interior.pdf',help:'One PDF containing all the inside pages in reading order.'})}${luluField('cover_url','Cover PDF link (optional for drafts)',d.cover_url||'',{type:'url',maxlength:2000,full:true,placeholder:'https://…/cover.pdf',help:'One PDF spread: back cover, spine, and front cover. Use Lulu’s dimensions for this page count.'})}</div><div class="toolbar"><button type="button" class="btn" data-lulu="check-files">Open PDF links</button><button type="button" class="btn" data-lulu="validate-files">Validate files with Lulu</button><button type="button" class="btn" data-lulu="validation-status">Refresh file validation</button><button type="button" class="btn" data-lulu="cover-dimensions">Get exact cover dimensions</button><a class="btn flat" href="https://www.lulu.com/publishing-toolkit" target="_blank" rel="noopener noreferrer">Get Lulu’s file preparation guide ↗</a></div><div id="lulu-file-feedback" role="status"></div></fieldset><details class="pod-advanced"><summary>Production status, source record & notes</summary><div class="formgrid">${luluField('status','Production status',d.status||'draft',{options:[['draft','Draft — still preparing'],['files','Files prepared — proof still needed'],['proof','Physical proof reviewed and approved'],['live','Ready for customer fulfillment']]})}${luluField('record_id','Master-library record (optional)',d.record_id||'',{maxlength:100,placeholder:'M-00001'})}${luluField('notes','Production notes',d.notes||'',{area:true,full:true,maxlength:2000})}</div><p class="small">Status is your team’s record, not an automatic Lulu validation. Sandbox orders never produce a physical book.</p></details><div class="formactions pod-save"><span>Book details are saved on this device.</span><button class="btn primary" type="submit">Save my book</button></div></form></section>`;
}
const luluCountries = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ').map(code=>[code,new Intl.DisplayNames(['en'],{type:'region'}).of(code)]).sort((a,b)=>a[1].localeCompare(b[1]));
const luluRegions = {
 US:'AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming',
 CA:'AB:Alberta|BC:British Columbia|MB:Manitoba|NB:New Brunswick|NL:Newfoundland and Labrador|NS:Nova Scotia|NT:Northwest Territories|NU:Nunavut|ON:Ontario|PE:Prince Edward Island|QC:Quebec|SK:Saskatchewan|YT:Yukon',
 AU:'ACT:Australian Capital Territory|NSW:New South Wales|NT:Northern Territory|QLD:Queensland|SA:South Australia|TAS:Tasmania|VIC:Victoria|WA:Western Australia'
};
function luluRegionField(country,value='') {return luluField('state_code','State / province',value,luluRegions[country]?{required:true,options:[['','Choose a state / province'],...luluRegions[country].split('|').map(x=>x.split(':'))]}:{maxlength:30});}
function luluAddressFields() {
 const v=luluDelivery,c=luluCountries.some(x=>x[0]===v.country_code)?v.country_code:'US';
 return `${luluField('country_code','Country',c,{required:true,options:luluCountries,help:'Shipping availability is checked with Lulu for your destination.'})}${luluField('name','Recipient name',v.name||'',{required:true,maxlength:120})}${luluField('organization','Church or organization (optional)',v.organization||'',{maxlength:120})}${luluField('street1','Street address',v.street1||'',{required:true,maxlength:160,full:true})}${luluField('street2','Apartment, suite, etc. (optional)',v.street2||'',{maxlength:160,full:true})}${luluField('city','City',v.city||'',{required:true,maxlength:100})}<div id="lulu-region">${luluRegionField(c,v.state_code||'')}</div>${luluField('postcode','Postal code',v.postcode||'',{required:true,maxlength:24})}${luluField('phone_number','Delivery phone number',v.phone_number||'',{required:true,type:'tel',maxlength:24,help:'Used by the delivery carrier.'})}${luluField('email','Recipient email (optional)',v.email||'',{type:'email',maxlength:254})}`;
}
function luluWizard(active){return `<ol class="pod-wizard" aria-label="Print progress">${['Book & files','Copies & address','Shipping & price','Review order'].map((x,i)=>`<li ${i===active?'aria-current="step"':''}><span>${i+1}</span>${x}</li>`).join('')}</ol>`;}
function luluCompareView(){return luluComparison.length?`<section class="pod-panel" id="lulu-comparison"><span class="eyebrow">PLAN YOUR PRINT RUN</span><h2>Compare delivered costs</h2><p>Each row is a separate Lulu quote using its least expensive available shipping method. Prices may change.</p><div class="pod-table-scroll"><table><thead><tr><th>Copies</th><th>Printing</th><th>Shipping</th><th>Fees</th><th>Tax</th><th>Total</th><th>Per copy</th><th>Delivery</th><th></th></tr></thead><tbody>${luluComparison.map(r=>r.error?`<tr><th>${r.quantity}</th><td colspan="8">${E(r.error)}</td></tr>`:`<tr><th>${r.quantity}</th><td>${luluMoney(r.print,r.currency)}</td><td>${luluMoney(r.shipping,r.currency)}</td><td>${luluMoney(r.fees,r.currency)}</td><td>${luluMoney(r.tax,r.currency)}</td><td><strong>${luluMoney(r.total,r.currency)}</strong></td><td>${luluMoney(r.total/r.quantity,r.currency)}</td><td>${E(luluShippingLabel(r.level))}</td><td><button type="button" class="btn small" data-lulu="use-quantity" data-quantity="${r.quantity}">Use ${r.quantity}</button></td></tr>`).join('')}</tbody></table></div></section>`:'';}
async function luluCompare(form,edition){
 const base=luluFormPayload(form,edition), stamp=luluDestinationStamp(base);luluComparison=[];luluCompareStamp=stamp;
 for(const quantity of [25,50,100,250]){
  luluNotify(`Comparing ${quantity} copies…`);
  try {const body={...base,line_item:{...base.line_item,quantity}}, options=await luluRequest('shipping-options',{body}),available=(Array.isArray(options)?options:options.results||options.shipping_options||[]).filter(x=>x.is_active!==false&&(x.level||x.shipping_level)).sort((a,b)=>Number(a.cost_excl_tax)-Number(b.cost_excl_tax));
   if(!available.length)throw Error('No delivery method available.');body.shipping_option=available[0].level||available[0].shipping_level;const quote=await luluRequest('quote',{body}),total=quote.total_cost_incl_tax;
   if(total==null||!Number.isFinite(Number(total)))throw Error('Lulu did not return a total including tax.');
   luluComparison.push({quantity,currency:quote.currency||base.currency,total:Number(total),print:(quote.line_item_costs||[]).reduce((n,x)=>n+Number(x.total_cost_excl_tax||0),0),shipping:quote.shipping_cost?.total_cost_excl_tax,fees:quote.fulfillment_cost?.total_cost_excl_tax,tax:quote.total_tax,level:body.shipping_option});
  }catch(e){luluComparison.push({quantity,error:e.message})}
  if(params().get('fulfill')!==edition.id||stamp!==luluDestinationStamp(luluFormPayload(form,edition))){luluComparison=[];throw Error('Your destination or quantity changed. Compare again.');}
 }
 const target=$('#lulu-compare-result');if(target){target.innerHTML=luluCompareView();target.scrollIntoView({behavior:'smooth',block:'start'});}luluNotify('Quantity comparison complete. Selecting a quantity will request a fresh estimate before ordering.');
}
const luluShippingLabel = level => ({MAIL:'Standard mail',PRIORITY_MAIL:'Priority mail',GROUND:'Ground',GROUND_HD:'Ground · residential',GROUND_BUS:'Ground · business',EXPEDITED:'Expedited',EXPRESS:'Express'}[level] || level);
function luluSummary(edition) { return luluQuote?luluQuoteView(edition):`<span class="eyebrow">YOUR ESTIMATE</span><h2>Know the cost before you order.</h2><p>Enter a destination to see Lulu’s print, shipping, and tax estimate.</p><ul class="pod-checks">${luluChecks(edition).map(([label,ok])=>`<li class="${ok?'done':''}"><span aria-hidden="true">${ok?'✓':'○'}</span> ${E(label)}</li>`).join('')}</ul><a href="#/print-studio?edit=${q(edition.id)}">Review book details →</a><p class="small">You can estimate costs before your files or proof are ready. A quote does not place an order.</p>`; }
function luluFulfillment(edition) {
  const options = luluShipping.length ? luluShipping.map(x=>[x.level,luluShippingOptionLabel(x)]) : [['','Find options for this address']];
  return `${luluWizard(luluQuote?2:1)}<a class="back" href="#/print-studio">← My print books</a><div class="pod-fulfill-head"><div><span class="eyebrow">PRINT & DELIVERY</span><h1>${E(edition.title)}</h1><p>${E(luluFormatLabel(edition))} · ${E(edition.page_count)} pages</p></div><a class="btn" href="#/print-studio?edit=${q(edition.id)}">Edit book</a></div><div class="pod-columns"><form id="lulu-quote" class="pod-panel"><input type="hidden" name="edition_id" value="${E(edition.id)}"><h2>Choose your copies and destination</h2><p>Your delivery details stay only in this open session and are sent to Lulu when you request a quote or order.</p><div class="formgrid">${luluField('quantity','Number of copies',luluDelivery.quantity||1,{required:true,type:'number',min:1,max:10000})}${luluField('shipping_option','Delivery method',luluDelivery.shipping_option||'',{options})}${luluAddressFields()}</div><div class="formactions"><button type="button" class="btn" data-lulu="shipping-options">Find delivery options</button><button class="btn primary" type="submit">Show shipping & total price</button><button type="button" class="btn" data-lulu="compare">Compare 25 / 50 / 100 / 250</button></div><p class="small">Delivery options depend on destination and book format. No payment is collected here.</p></form><aside id="lulu-summary" class="pod-panel pod-summary" aria-live="polite">${luluSummary(edition)}</aside></div><div id="lulu-compare-result">${luluCompareView()}</div>`;
}
function luluShippingOptionLabel(option) {
  return luluShippingLabel(option.level)+(Number.isFinite(Number(option.cost_excl_tax))?' · '+luluMoney(option.cost_excl_tax,option.currency||'USD')+' shipping before tax':'');
}
function luluClearShipping() {
  luluShipping=[]; luluDelivery.shipping_option='';
  const select=$('#lulu-shipping_option');
  if(select) select.innerHTML='<option value="">Find options for this address</option>';
}
function luluDestinationStamp(payload) {
  const {shipping_option,...destination}=payload; return JSON.stringify(destination);
}
async function luluLoadShipping(form,edition) {
  const payload=luluFormPayload(form,edition), stamp=luluDestinationStamp(payload), old=payload.shipping_option;
  luluInvalidateQuote();
  try {
    const result=await luluRequest('shipping-options',{body:{shipping_address:payload.shipping_address,currency:payload.currency,line_item:payload.line_item}});
    if(params().get('fulfill')!==edition.id||stamp!==luluDestinationStamp(luluFormPayload(form,edition))) throw Error('Delivery details changed while loading options. Please try again.');
    luluShipping=(Array.isArray(result)?result:result.results||result.shipping_options||[])
      .map(x=>({...x,level:x.level||x.shipping_level}))
      .filter(x=>x.level&&x.is_active!==false)
      .sort((a,b)=>(Number(a.cost_excl_tax)||0)-(Number(b.cost_excl_tax)||0));
    luluShipping=luluShipping.filter((x,i,all)=>all.findIndex(y=>y.level===x.level)===i);
    if(!luluShipping.length) throw Error('No delivery methods are available for this book and address. Check the address, number of copies, and book format, then try again.');
    const select=$('#lulu-shipping_option');
    select.innerHTML=luluShipping.map(x=>`<option value="${E(x.level)}">${E(luluShippingOptionLabel(x))}</option>`).join('');
    if(luluShipping.some(x=>x.level===old)) select.value=old;
    luluDelivery.shipping_option=select.value;
  } catch(error) { luluClearShipping(); throw error; }
}
function luluOrderBlock(edition) {
  if (!luluHealth?.configured) return 'Connect your Lulu account to place an order.';
  if (!luluHealth.orders_enabled) return 'Your administrator needs to enable order submission in Lulu setup.';
  if (!luluPublicURL(edition.interior_url) || !luluPublicURL(edition.cover_url)) return 'Add both print-ready PDF links to this book before ordering.';
  return '';
}
function luluQuoteView(edition) {
  const x = luluQuote, currency = x.currency || edition.currency, total = x.total_cost_incl_tax ?? x.total_cost_excl_tax;
  const margin = total == null?null:Number(edition.retail_price)*Number(x._payload.line_item.quantity)-Number(total);
  const address = x._payload.shipping_address, block = luluOrderBlock(edition);
  return `<span class="eyebrow">LIVE LULU ESTIMATE</span><h2>${luluMoney(total,currency)}</h2><p>${E(x._payload.line_item.quantity)} ${x._payload.line_item.quantity===1?'copy':'copies'} · ${E(luluShippingLabel(x._payload.shipping_option))}<br>Deliver to ${E(address.name)}, ${E(address.city)}, ${E(address.postcode)}</p><dl class="pod-costs"><div><dt>Print before tax</dt><dd>${luluMoney((x.line_item_costs||[]).reduce((n,i)=>n+Number(i.total_cost_excl_tax||0),0),currency)}</dd></div><div><dt>Shipping before tax</dt><dd>${luluMoney(x.shipping_cost?.total_cost_excl_tax,currency)}</dd></div><div><dt>Fulfillment fee before tax</dt><dd>${luluMoney(x.fulfillment_cost?.total_cost_excl_tax,currency)}</dd></div><div><dt>Total tax</dt><dd>${luluMoney(x.total_tax,currency)}</dd></div><div><dt>Estimated margin*</dt><dd>${luluMoney(margin,currency)}</dd></div></dl><p class="small">*Selling price less Lulu’s quoted total. Excludes checkout fees and other business expenses. Estimates can change.</p>${x.warnings?.length?`<div class="notice"><strong>Address review</strong><p>${E(x.warnings.map(w=>w.message||String(w)).join(' '))}</p></div>`:''}<button class="btn" data-lulu="download-quote">Download estimate</button><hr><h3>${luluHealth?.environment==='sandbox'?'Test your order':'Ready to print?'}</h3>${block?`<p>${E(block)}</p><button class="btn" data-lulu="${!luluHealth?.configured||!luluHealth?.orders_enabled?'setup':'edit-current'}">${!luluHealth?.configured||!luluHealth?.orders_enabled?'View connection setup':'Add print files'}</button>`:`<div class="formgrid">${luluField('contact_email','Order contact email',luluDelivery.contact_email||'',{type:'email',required:!luluHealth.contact_email_configured,maxlength:254,help:luluHealth.contact_email_configured?'Leave blank to use the account contact.':'Lulu sends order updates to this address.',full:true})}${luluField('external_id','Your order reference',luluDelivery.external_id||x._reference,{maxlength:100,full:true})}</div><button class="btn primary" data-lulu="create-order">${luluHealth?.environment==='sandbox'?'Create test order':'Review & place print order'}</button>`}<p class="small">${luluHealth?.environment==='sandbox'?'Test orders do not print, ship, or charge a production account.':'Production orders can charge your Lulu account. Collect customer payment separately. You may order one copy as a physical proof.'}</p>`;
}
function luluJobs() {
  return `<section class="pod-panel"><div class="ws-section-title"><div><span class="eyebrow">ORDER TRACKING</span><h2>Your print orders</h2></div><a href="${luluHealth?.environment==='production'?'https://api.lulu.com/':'https://api.sandbox.lulu.com/'}" target="_blank" rel="noopener noreferrer">Open Lulu dashboard ↗</a></div>${luluState.jobs.length?luluState.jobs.map(job=>`<div class="pod-job"><div><strong>${E(job.title)}</strong><p>Order ${E(job.id)} · ${E(job.status||'Submitted')} ${job.environment?`· ${E(job.environment)}`:''}</p>${(job.tracking||[]).filter(luluPublicURL).map((url,i)=>`<a href="${E(luluPublicURL(url))}" target="_blank" rel="noopener noreferrer">Track shipment ${i+1} ↗</a>`).join(' ')}${job.updated_at?`<small>Last checked ${E(new Date(job.updated_at).toLocaleString())}</small>`:''}</div><button class="btn small" data-lulu="refresh-job" data-id="${E(job.id)}">Refresh status</button></div>`).join(''):'<p>Orders you place here will appear with production status and shipment links. Existing orders in your Lulu account are available in the Lulu dashboard.</p>'}</section>`;
}
function luluPage() {
  const p = params(), record = byId.get(p.get('record')), edit = luluState.editions.find(x=>x.id===p.get('edit')), fulfill = luluState.editions.find(x=>x.id===p.get('fulfill'));
  const active = fulfill?.id || '';
  if (active !== luluActiveEdition) { luluActiveEdition = active; luluQuote = null; luluShipping = []; luluDelivery = {}; luluComparison=[]; }
  if (!luluHealth && !luluBusy) setTimeout(luluConnect,0);
  let imported={};try{const value=JSON.parse(p.get('draft')||'{}');if(value&&typeof value==='object')imported=Object.fromEntries(['title','subtitle','page_count','interior_url','cover_url','retail_price'].filter(k=>typeof value[k]==='string'||typeof value[k]==='number').map(k=>[k,value[k]]));}catch{}
  const seed = edit || {...imported,record_id:record?.['Master ID']||'', title:record?.['Campaign Title']||imported.title||'', subtitle:record?.Subtitle||imported.subtitle||''};
  let body = '';
  if (fulfill) body = luluFulfillment(fulfill);
  else if (p.has('edit') || record) body = luluEditionForm(seed);
  else body = `<section class="pod-intro"><div><span class="eyebrow">FROM YOUR LIBRARY. INTO THEIR HANDS.</span><h1>Make it<br>something<br><em>they can hold.</em></h1><p>Prepare a beautiful book, see the delivery cost, and send it to the people you serve.</p><a class="btn primary" href="#/print-studio?edit=new">Prepare my first book →</a></div><div class="pod-journey"><span class="pod-hero-number">01 — 03</span><ol><li><strong>Prepare your book</strong><span>Add a title, format, and print-ready PDFs.</span></li><li><strong>Get your estimate</strong><span>Choose copies and a delivery address.</span></li><li><strong>Order & follow along</strong><span>Submit to Lulu and track its progress.</span></li></ol><p>Start with a draft. Add the finishing touches when you’re ready.</p></div></section><div class="ws-section-title pod-library-title"><div><span class="eyebrow">YOUR PRINT SHELF</span><h2>${luluState.editions.length?'My books':'Your next chapter starts here.'}</h2></div><a class="btn" href="#/print-studio?edit=new">+ New book</a></div>${luluState.editions.length?`<div class="pod-editions">${luluState.editions.map(luluEditionCard).join('')}</div>`:`<div class="empty"><h3>No print editions yet.</h3><p>Create a book here, or choose “Prepare a print edition” on a library record.</p><div class="toolbar"><a class="btn primary" href="#/print-studio?edit=new">Create a book</a><a class="btn" href="#/catalog">Explore the library</a></div></div>`}`;
  shell(`<div id="lulu-workspace">${luluConnectionCard()}${luluNotice()}${body}${!p.has('edit')&&!record?luluJobs():''}${luluSetup()}</div>`,'print-studio','Print on demand');
}
function luluFormPayload(form,edition) {
  const f = Object.fromEntries(new FormData(form));
  return {currency:edition.currency,line_item:{title:edition.title,pod_package_id:luluPod(edition.pod_package_id),page_count:Number(edition.page_count),quantity:Number(f.quantity),cover_url:edition.cover_url,interior_url:edition.interior_url,external_id:edition.id},shipping_address:{name:f.name,organization:f.organization,street1:f.street1,street2:f.street2,city:f.city,state_code:f.state_code,postcode:f.postcode,country_code:f.country_code?.toUpperCase(),phone_number:f.phone_number,email:f.email,is_business:false},shipping_option:f.shipping_option};
}
function luluInvalidateQuote() {
  if (!luluQuote) return;
  luluQuote = null;
  const edition = luluState.editions.find(x=>x.id===luluActiveEdition), summary = $('#lulu-summary');
  if (edition && summary) summary.innerHTML = luluSummary(edition);
  luluNotify('Delivery details changed. Calculate a new estimate before ordering.');
}
function luluInput(e) {
  const el = e.target, form = el.closest?.('form');
  if (form?.id==='lulu-edition') { luluDrafts[form.dataset.draft] = Object.fromEntries(new FormData(form)); return true; }
  if (form?.id==='lulu-quote') {
    luluComparison=[]; const comparison=$('#lulu-compare-result');if(comparison)comparison.innerHTML='';
    luluDelivery = {...luluDelivery,...Object.fromEntries(new FormData(form))};
    if(el.name!=='shipping_option') luluClearShipping();
    luluInvalidateQuote(); return true;
  }
  if (['lulu-contact_email','lulu-external_id'].includes(el.id)) { luluDelivery[el.name] = el.value; return true; }
  return false;
}
function luluChange(e) {
  if(e.target.id==='lulu-country_code'){luluDelivery.country_code=e.target.value;luluDelivery.state_code='';$('#lulu-region').innerHTML=luluRegionField(e.target.value);}
  if (e.target.id === 'lulu-format') {
    $('#lulu-custom-format').hidden = e.target.value !== 'custom';
    if(e.target.value==='paperback') $('#lulu-pod_package_id').value=luluDefaultFormat;
  }
  return luluInput(e);
}
function luluSubmit(e) {
  const form = e.target;
  if (!['lulu-edition','lulu-quote'].includes(form?.id)) return false;
  e.preventDefault(); if (luluBusy || !form.reportValidity()) return true;
  (async()=>{
    luluSetBusy(form.id); luluNotify(form.id==='lulu-quote'?'Calculating your delivered cost…':'Saving your book…');
    try {
      const f = Object.fromEntries(new FormData(form));
      if (form.id==='lulu-edition') {
        const current = luluState.editions.find(x=>x.id===f.edition_id);
        const edition = {id:current?.id||CB.id(),record_id:(f.record_id||'').trim(),title:(f.title||'').trim(),subtitle:(f.subtitle||'').trim(),pod_package_id:f.format==='paperback'?luluDefaultFormat:luluPod(f.pod_package_id),page_count:Number(f.page_count),retail_price:Number(f.retail_price).toFixed(2),currency:f.currency,status:f.status,interior_url:(f.interior_url||'').trim(),cover_url:(f.cover_url||'').trim(),notes:(f.notes||'').trim(),updated_at:new Date().toISOString()};
        if (!edition.title) throw Error('Add a title for your book.');
        if (!luluValidPod(edition.pod_package_id)) throw Error('Check the Lulu format code, or choose the 6 × 9 paperback preset.');
        for (const [key,label] of [['interior_url','Interior PDF'],['cover_url','Cover PDF']]) if(edition[key]&&!luluPublicURL(edition[key])) throw Error(`${label} needs an HTTPS download link without a username or password.`);
        const before = [...luluState.editions];
        if(current) luluState.editions[luluState.editions.indexOf(current)]=edition; else luluState.editions.unshift(edition);
        try { luluPersist(); } catch { luluState.editions=before; throw Error('This browser could not save the book. Allow site storage or free some space, then try again. Your form is still here.'); }
        delete luluDrafts[form.dataset.draft]; luluQuote=null; luluNotify('Your book is saved on this device. You can now get a print estimate.'); nav('print-studio');
      } else {
        if(!luluHealth?.configured) throw Error('Connect Lulu to calculate a live estimate. Open “Set up Lulu” above for the account steps.');
        const edition=luluState.editions.find(x=>x.id===f.edition_id);
        if(!edition) throw Error('Choose a saved book first.');
        luluDelivery={...luluDelivery,...f};
        await luluLoadShipping(form,edition);
        const payload=luluFormPayload(form,edition), stamp=JSON.stringify(payload);
        const result=await luluRequest('quote',{body:payload});
        if(currentRoute()[0]!=='print-studio'||params().get('fulfill')!==edition.id) return;
        if(stamp!==JSON.stringify(luluFormPayload(form,edition))) throw Error('Your delivery details changed while calculating. Please calculate again.');
        luluQuote={...result,_payload:payload,_reference:`LT-${CB.id()}`};
        $('#lulu-summary').innerHTML=luluQuoteView(edition); $('#lulu-summary').setAttribute('tabindex','-1'); $('#lulu-summary').focus({preventScroll:true}); $('#lulu-summary').scrollIntoView({behavior:'smooth',block:'start'}); luluNotify(`Your live estimate is ready using ${luluShippingLabel(payload.shipping_option)}. You can choose another available delivery method and calculate again. No order has been placed.`);
      }
    } catch(err) { luluNotify(err.message,true); }
    finally { luluSetBusy(''); }
  })();
  return true;
}
function luluClick(e) {
  const el=e.target.closest?.('[data-lulu]'); if(!el?.dataset?.lulu) return false;
  e.preventDefault(); if(luluBusy) return true;
  const action=el.dataset.lulu;
  if(action==='connect') { luluConnect(); return true; }
  if(action==='setup') { const setup=$('#lulu-setup'); setup.open=true; setup.scrollIntoView({behavior:'smooth',block:'start'}); setup.querySelector('summary').focus(); return true; }
  (async()=>{
    luluSetBusy(action);
    try {
      const edition=luluState.editions.find(x=>x.id===(el.dataset.id||luluActiveEdition));
      if(action==='cover-dimensions'){const f=Object.fromEntries(new FormData($('#lulu-edition'))),result=await luluRequest('cover-dimensions',{body:{pod_package_id:f.format==='paperback'?luluDefaultFormat:f.pod_package_id,page_count:Number(f.page_count)}});$('#lulu-file-feedback').innerHTML='<h3>Your complete cover size</h3><p class="pod-cover-size"><strong>'+E(result.width)+' × '+E(result.height)+' inches</strong></p><p>Width × height, including the back cover, spine, front cover and bleed. This size is for '+E(f.page_count)+' interior pages in your selected format. Recalculate if the page count or paper changes.</p>';return;}
      if(action==='validate-files'||action==='validation-status'){const f=Object.fromEntries(new FormData($('#lulu-edition'))),format=f.format==='paperback'?luluDefaultFormat:f.pod_package_id,lines=[];for(const kind of ['interior','cover']){const key=kind+'|'+f[kind+'_url']+'|'+format+'|'+f.page_count;let result;if(action==='validate-files'){if(!luluPublicURL(f[kind+'_url']))throw Error('Add both PDF links before validation.');result=await luluRequest('validate-file',{body:{kind,source_url:f[kind+'_url'],pod_package_id:format,page_count:Number(f.page_count)}});luluValidation[key]=result.id;}else{if(!luluValidation[key])throw Error('Start validation for the current files first.');result=await luluRequest('validation-status',{params:{kind,id:luluValidation[key]}});}const labels={VALIDATING:'Lulu is checking your pages…',VALIDATED:'Interior file check complete',NORMALIZING:'Lulu is preparing your cover…',NORMALIZED:'Cover file check complete',ERROR:'This file needs attention'},errors=Array.isArray(result.errors)?result.errors:[];lines.push('<section><h3>'+E(kind==='interior'?'Interior pages':'Cover spread')+'</h3><p><strong>'+E(labels[result.status]||'File check in progress')+'</strong></p>'+(result.page_count?'<p>'+E(result.page_count)+' pages detected.</p>':'')+(errors.length?'<ul>'+errors.map(error=>'<li>'+E(error)+'</li>').join('')+'</ul>':'')+'</section>');}$('#lulu-file-feedback').innerHTML=lines.join('')+'<p>Refresh until Lulu reports completion. A valid digital file still needs a physical proof review.</p>';luluNotify('File validation updated. Review Lulu’s status and any errors below the file links.');return;}
      if(action==='compare'){const form=$('#lulu-quote');if(form?.reportValidity())await luluCompare(form,edition);return;}
      if(action==='use-quantity'){const form=$('#lulu-quote');$('#lulu-quantity').value=el.dataset.quantity;luluDelivery.quantity=el.dataset.quantity;luluClearShipping();luluInvalidateQuote();luluSetBusy('');form.requestSubmit();return;}
      if(action==='edit-current') { nav('print-studio',{edit:luluActiveEdition}); return; }
      if(action==='download-setup') { download('LifeTogether-Lulu-setup.txt','LULU CONNECTION CHECKLIST\n\n1. Open https://developers.sandbox.lulu.com/ and copy your sandbox client key and client secret separately.\n2. Open https://app.netlify.com/projects/lifetogethermasterlibary/configuration/env and choose Add a variable. Include Functions scope and the Production deploy context (the website still uses Lulu sandbox). Add LULU_CLIENT_KEY, LULU_CLIENT_SECRET, LULU_API_ENVIRONMENT=sandbox, LULU_CONTACT_EMAIL, LULU_ENABLE_ORDERS=false.\n3. Open Netlify Deploys, choose Trigger deploy > Deploy site, and wait for Published. In Print on demand, Check connection now verifies the credentials with Lulu. Then test delivery options and quotes.\n4. Enable sandbox orders for testing. Sandbox jobs do not print or ship.\n5. Before production: approve a physical proof, configure Lulu billing, checkout, and staff access. Then enable production deliberately.\n','text/plain'); luluNotify('Setup checklist downloaded.'); return; }
      if(action==='export-edition') { download('LifeTogether-print-edition.json',JSON.stringify({schema:'lifetogether-print-edition-v1',edition,preparation:luluChecks(edition)},null,2),'application/json'); luluNotify('Book details downloaded.'); return; }
      if(action==='download-quote') {
        if(!luluQuote) throw Error('Calculate an estimate first.');
        const {_payload,...quote}=luluQuote;
        download('LifeTogether-print-estimate.json',JSON.stringify({title:edition.title,quantity:_payload.line_item.quantity,shipping:_payload.shipping_option,currency:edition.currency,estimate:quote,note:'Estimate only. No order placed. Delivery address omitted.'},null,2),'application/json'); luluNotify('Estimate downloaded without your delivery address.'); return;
      }
      if(action==='check-files') {
        const form=$('#lulu-edition'), f=Object.fromEntries(new FormData(form));
        const urls=[['Interior PDF',f.interior_url],['Cover PDF',f.cover_url]];
        $('#lulu-file-feedback').innerHTML=urls.map(([label,url])=>luluPublicURL(url)?`<p>✓ ${E(label)} uses HTTPS. <a href="${E(luluPublicURL(url))}" target="_blank" rel="noopener noreferrer">Open ${E(label.toLowerCase())} ↗</a></p>`:`<p>${E(label)}: add a complete HTTPS download link.</p>`).join('')+'<p class="small">Open each link to check the file. This checks link format only; Lulu still needs to validate the PDF and print specifications.</p>';
        luluNotify('File-link checks are shown below the PDF fields.'); return;
      }
      if(action==='remove-edition') {
        if(!confirm(`Remove “${edition.title}” from this device? This will not cancel Lulu orders.`)) return;
        luluState.editions=luluState.editions.filter(x=>x.id!==edition.id); luluPersist(); luluNotify('Book removed from this device.'); render(); return;
      }
      if(action==='shipping-options') {
        const form=$('#lulu-quote'), f=Object.fromEntries(new FormData(form));
        luluDelivery={...luluDelivery,...f};
        if(!luluHealth?.configured) throw Error('Connect Lulu to load delivery options. Open “Set up Lulu” above for the account steps.');
        if(!form.reportValidity()) return;
        luluNotify('Finding delivery options for your book…');
        await luluLoadShipping(form,edition);
        luluNotify(`${luluShipping.length} delivery options found. Choose a method, then calculate your estimate.`); return;
      }
      if(action==='create-order') {
        if(!luluQuote?._payload) throw Error('Calculate a fresh estimate before ordering.');
        const block=luluOrderBlock(edition); if(block) throw Error(block);
        const form=$('#lulu-quote'); if(!form.reportValidity()) return;
        if(JSON.stringify(luluQuote._payload)!==JSON.stringify(luluFormPayload(form,edition))) { luluInvalidateQuote(); throw Error('Delivery details changed. Calculate a new estimate before ordering.'); }
        const email=$('#lulu-contact_email'), reference=$('#lulu-external_id');
        if(email&&!email.reportValidity()) return;
        const payload=JSON.parse(JSON.stringify(luluQuote._payload));
        payload.contact_email=email?.value||''; payload.external_id=reference?.value||luluQuote._reference;
        if(!/^[A-Za-z0-9._-]{1,100}$/.test(payload.external_id)) throw Error('Use letters, numbers, dots, underscores, or hyphens in the order reference.');
        const total=luluMoney(luluQuote.total_cost_incl_tax??luluQuote.total_cost_excl_tax,luluQuote.currency||edition.currency);
        if(!confirm(`${luluHealth.environment==='production'?'Place a production print order? Lulu may charge your account.':'Create a test order? It will not print or ship.'}\n\n${edition.title}\n${payload.line_item.quantity} copies · ${total} estimated\n${payload.shipping_address.name}, ${payload.shipping_address.city}\n\nContinue?`)) return;
        luluNotify('Submitting your print order. Please keep this page open…');
        // Consume the quote before submission so an ambiguous timeout cannot be retried by double-clicking.
        luluQuote=null;
        const job=await luluRequest('create-order',{body:payload}), id=String(job.id||job.print_job_id||'');
        if(!id) throw Error('Check your Lulu dashboard: the response did not include an order ID. Do not submit again until you confirm its status.');
        luluState.jobs.unshift({id,title:edition.title,status:job.status?.name||job.status||'Submitted',environment:luluHealth.environment,created_at:new Date().toISOString()}); luluState.jobs=luluState.jobs.slice(0,50);
        try { luluPersist(); } catch { luluNotify(`Order ${id} was created, but this browser could not save its history. Keep the order ID and check your Lulu dashboard.`,true); nav('print-studio'); return; }
        luluNotify(`Order ${id} created. Follow its progress in Your print orders.`); nav('print-studio'); return;
      }
      if(action==='refresh-job') {
        const job=luluState.jobs.find(x=>x.id===el.dataset.id);
        if(job?.environment&&job.environment!==luluHealth?.environment) throw Error(`This is a ${job.environment} order. Use the matching Lulu environment to check its status.`);
        luluNotify('Checking the latest order status…');
        const data=await luluRequest('status',{params:{id:el.dataset.id}});
        if(job) { job.status=data.status?.name||data.status||'Updated'; job.tracking=(data.line_items||[]).flatMap(x=>x.tracking_urls||[]).filter(luluPublicURL).slice(0,5); job.updated_at=new Date().toISOString(); luluPersist(); }
        luluNotify(`Order ${el.dataset.id}: ${job?.status||'status updated'}.`); render(); return;
      }
    } catch(err) { luluNotify(err.message,true); if(action==='create-order'&&!luluQuote&&$('#lulu-summary')) $('#lulu-summary').innerHTML=luluSummary(luluState.editions.find(x=>x.id===luluActiveEdition)); }
    finally { luluSetBusy(''); }
  })(); return true;
}
function luluDecorate() {
  const r=currentRoute(),brief=document.querySelector('[data-record-brief]');
  if(r[0]==='record'&&brief&&!brief.disabled&&!document.querySelector('.pod-record-link')) { const a=document.createElement('a');a.className='btn pod-record-link';a.href='#/print-studio?record='+encodeURIComponent(r[1]||'');a.textContent='Prepare a print edition';brief.after(a); }
  if(r[0]==='ecosystem'&&params().get('spoke')==='doingchurch') { const panel=document.querySelector('.spoke-detail');if(panel&&!panel.querySelector('.pod-spoke-link')) { const a=document.createElement('a');a.className='btn pod-spoke-link';a.href='#/print-studio';a.textContent='Open print-on-demand studio';panel.append(a); } }
}
