'use strict';
// Tests the published app bundle through its real routes and event handlers.
// This is a functional document harness, not a replacement for browser review.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const C = require('../src/campaign-core.js');
const W = require('../src/workspace-core.js');
const root = path.resolve(__dirname, '..');

function appHarness(site) {
  const listeners = {}, errors = [], saved = {};
  const nodes = {app: {innerHTML: ''}, toast: {textContent: '', style: {}}};
  if (site) saved[W.schema] = JSON.stringify(site);
  let hash = '#/campaign-finder';
  class FormDataMock {
    constructor(form) { this.values = Object.entries(form.values || {}); }
    [Symbol.iterator]() { return this.values[Symbol.iterator](); }
    get(key) { return this.values.find(([name]) => name === key)?.[1] ?? null; }
  }
  const document = {
    activeElement: null,
    querySelector: selector => nodes[selector.replace('#', '')] || null,
    querySelectorAll: () => [],
    getElementById: id => nodes[id] || null,
    addEventListener(name, fn) { (listeners['document:' + name] ??= []).push(fn); },
    createElement() { return {click() {}, remove() {}}; },
    body: {append() {}}
  };
  const sandbox = {
    document,
    location: {get hash() { return hash; }, set hash(value) { hash = value.startsWith('#') ? value : '#' + value; }},
    localStorage: {getItem: key => saved[key] ?? null, setItem: (key, value) => saved[key] = value, removeItem: key => delete saved[key]},
    console: {log() {}, error(error) { errors.push(error); }},
    Blob, Response, DecompressionStream, Uint8Array, atob, URL, URLSearchParams,
    FormData: FormDataMock, Set, Map, TextDecoder, TextEncoder, clearTimeout, setTimeout,
    confirm: () => true
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (name, fn) => (listeners[name] ??= []).push(fn);
  sandbox.scrollTo = () => {};
  vm.createContext(sandbox);
  const fire = async (name, event) => { for (const fn of listeners[name] || []) await fn(event); };
  return {
    saved, errors, nodes,
    get html() { return nodes.app.innerHTML; },
    get hash() { return hash; },
    async boot() {
      for (const file of ['dist/data.js', 'src/core.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox);
      await vm.runInContext(fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8'), sandbox);
      assert.deepEqual(errors, [], 'Application should start without errors');
    },
    async go(route) { hash = route.startsWith('#/') ? route : '#/' + route; await fire('hashchange'); },
    async submit(id, values) {
      const form = {id, values, getAttribute: name => name === 'id' ? id : null};
      // Browser forms expose named controls as properties, including names that
      // shadow standard properties. Keep the route guard subject to that behavior.
      if (Object.hasOwn(values, 'id')) form.id = {name: 'id', value: values.id, tagName: 'INPUT'};
      await fire('document:submit', {target: form, preventDefault() {}});
    },
    async click(namespace, action, data = {}) {
      await fire('document:click', {
        target: {closest(selector) { return selector === '[data-' + namespace + ']' ? {dataset: {[namespace]: action, ...data}} : null; }},
        preventDefault() {}
      });
    },
    async flush() { await fire('pagehide'); },
    get campaigns() { return JSON.parse(saved['lifetogether-campaign-workspace-v1'] || '{"campaigns":[]}').campaigns; }
  };
}

const decodeHTML = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const previewLinks = html => [...html.matchAll(/href="(#\/campaign-finder\/[^\"]+)"/g)].map(match => decodeHTML(match[1]));
const previewID = route => decodeURIComponent(route.split('?')[0].split('/').at(-1));
const options = (html, name) => {
  const select = html.match(new RegExp('<select[^>]*name="' + name + '"[^>]*>([\\s\\S]*?)<\\/select>'))?.[1] || '';
  return [...select.matchAll(/<option[^>]*value="([^\"]*)"/g)].map(match => decodeHTML(match[1]));
};

(async () => {
  // The full source catalog is large; use a separate process for the fresh-device
  // case instead of retaining two complete browser contexts in one Node heap.
  if (process.argv.includes('--empty-library')) {
    const fresh = appHarness(W.empty());
    await fresh.boot();
    await fresh.go('campaign-finder?layer=pastor');
    assert.equal(previewLinks(fresh.html).length, 0);
    assert.ok(fresh.html.includes('#/sermons'), 'Empty personal library should offer a path to importing teaching');
    assert.deepEqual(fresh.errors, []);
    return;
  }
  let checks = 0;
  const pass = name => { checks++; console.log('PASS ' + name); };
  const emptyCase = spawnSync(process.execPath, [__filename, '--empty-library'], {encoding: 'utf8'});
  assert.equal(emptyCase.status, 0, emptyCase.stderr || 'Fresh-device harness failed');
  pass('Fresh devices receive an actionable personal-library empty state');
  const site = W.empty();
  site.church = {church: 'Finder Test Church', pastor: 'Test pastor', goal: 'community', duration: 40, translation: 'ESV'};
  const original = C.source({id: 'finder-owned-sermon', title: 'Finder sentinel <img src=x onerror=alert(1)>', subtitle: 'Original <svg onload=alert(1)> subtitle', notes: 'Source teaching stays independent.', bigIdea: 'Welcome our neighbors.', scripture: 'Romans 12:9–13', permission: 'owned'});
  site.sermons = [original, {...C.source({id: 'finder-archived-sermon', title: 'Archived finder sentinel', permission: 'owned'}), archived: true}, C.source({id: 'finder-restricted-sermon', title: 'Restricted finder sentinel', permission: 'restricted'})];
  const app = appHarness(site);
  await app.boot();
  assert.ok(app.html.includes('Campaign finder'), 'Finder needs its own route and page identity');
  assert.ok(!app.html.includes('This page was not found'));
  assert.ok(app.html.includes('id="cf-form"'), 'Finder should expose its filter form');
  for (const field of ['q', 'goal', 'layer', 'duration', 'audience', 'type', 'sort']) assert.ok(app.html.includes('name="' + field + '"'), 'Missing finder field ' + field);
  pass('Finder route, navigation identity, and complete search form render in the built app');

  await app.submit('cf-form', {q: 'Rooted', goal: '', layer: 'lifetogether', duration: '', audience: '', type: '', sort: 'relevance'});
  assert.ok(app.hash.startsWith('#/campaign-finder?'));
  assert.equal(new URLSearchParams(app.hash.split('?')[1]).get('q'), 'Rooted');
  await app.go(app.hash);
  assert.ok(app.html.includes('Rooted'));
  const sourceRoute = previewLinks(app.html)[0];
  assert.ok(sourceRoute, 'A real catalog campaign should be previewable');
  assert.equal(new URLSearchParams(sourceRoute.split('?')[1]).get('q'), 'Rooted', 'Preview link should retain the discovery context');
  pass('Filter submission updates a reusable URL and result links retain search context');

  await app.go('campaign-finder?q=zzzz_no_campaign_can_match_this_18474');
  assert.equal(previewLinks(app.html).length, 0);
  assert.ok(app.html.includes('class="cf-empty"') && app.html.includes('0 starting points'), 'No-result searches need a clear empty state and count');
  const badQuery = '<img src=x onerror=alert(1)>';
  await app.go('campaign-finder?q=' + encodeURIComponent(badQuery));
  assert.ok(app.html.includes('&lt;img'), 'Query should render as escaped text');
  assert.ok(!app.html.includes(badQuery), 'Query cannot inject raw HTML');
  await app.go('campaign-finder/' + encodeURIComponent('catalog:not-a-real-record'));
  assert.ok(!app.html.includes('id="cf-start-form"'), 'An invalid candidate cannot be started');
  assert.ok(!app.html.includes('Library could not open'));
  pass('Empty results, malicious query text, and invalid preview IDs are handled safely');

  await app.go(sourceRoute);
  const candidate = previewID(sourceRoute);
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
  const master = data.sections[1].rows.map((row, index) => ({...Object.fromEntries(data.sections[1].columns.map((key, i) => [key, row[i] || ''])), _section: 1, _row: index}));
  const record = [...master, ...data.extraRecords].find(row => row['Master ID'] === candidate.slice('catalog:'.length));
  assert.ok(record, 'Preview should preserve a known immutable record ID');
  assert.ok(app.html.includes('id="cf-start-form"'));
  const startForm = app.html.match(/<form\b[^>]*id="cf-start-form"[\s\S]*?<\/form>/)?.[0];
  assert.ok(startForm, 'Candidate start form should be rendered');
  assert.ok(!/<(?:input|select|textarea|button)\b[^>]*name="id"/i.test(startForm), 'A named id control would shadow the native form.id used by the submit handler');
  assert.ok(startForm.includes('name="candidateId"'), 'Candidate identity needs an unambiguous form field name');
  const audience = options(app.html, 'audience').find(value => value && value !== 'all');
  assert.ok(audience, 'Start form needs a valid audience choice');
  const finderRoute = app.hash;
  await app.submit('ws-save-search', {name: 'Rooted finder shortlist'});
  const savedSite = W.validate(JSON.parse(app.saved[W.schema]), C);
  assert.ok(savedSite.searches.some(search => search.route === finderRoute), 'Saved finder destinations must survive workspace validation');
  assert.equal(W.route(finderRoute), finderRoute);
  await app.submit('cf-start-form', {candidateId: candidate, goal: 'mission', duration: '21', audience});
  await app.go(app.hash);
  const built = app.campaigns[0];
  assert.ok(built, 'Finder start should create a real persisted campaign');
  assert.equal(built.title, record['Campaign Title']);
  assert.equal(built.subtitle, record.Subtitle || '');
  assert.equal(built.profile.goal, 'mission');
  assert.equal(built.profile.duration, 21);
  assert.equal(built.profile.audience, audience);
  assert.equal(built.profile.church, site.church.church);
  assert.equal(built.profile.translation, 'ESV');
  assert.equal(built.sources[0].recordId, record['Master ID']);
  assert.equal(built.sources[0].permission, 'reference');
  assert.equal(built.sources[0].notes, '', 'Title-only catalog sources must not acquire invented teaching notes');
  assert.ok(app.hash.startsWith('#/campaigns/' + built.id));
  pass('Catalog preview starts a persisted campaign with original wording, source identity, selections, and church context');
  pass('Finder saved destinations retain their route and filters through workspace validation');

  await app.go('campaign-finder?layer=church');
  const churchRoute = previewLinks(app.html)[0];
  assert.ok(churchRoute, 'The wider church index should be discoverable');
  await app.go(churchRoute);
  assert.ok(!app.html.includes('id="cf-start-form"'), 'Held church references are read-only');
  const countBeforeDenied = app.campaigns.length;
  await app.submit('cf-start-form', {candidateId: previewID(churchRoute), goal: 'mission', duration: '21', audience});
  assert.equal(app.campaigns.length, countBeforeDenied, 'A crafted submit cannot bypass source holds');
  pass('Church references can be inspected while source holds block a crafted build request');

  await app.go('campaign-finder?layer=pastor&q=Finder%20sentinel');
  assert.ok(app.html.includes('Finder sentinel &lt;img'));
  assert.ok(app.html.includes('Original &lt;svg'));
  assert.ok(!app.html.includes(original.title));
  const sermonRoute = previewLinks(app.html).find(route => previewID(route) === 'sermon:' + original.id);
  assert.ok(sermonRoute, 'Personal library source should appear in the finder');
  await app.go(sermonRoute);
  await app.submit('cf-start-form', {candidateId: 'sermon:' + original.id, goal: 'community', duration: '40', audience});
  await app.go(app.hash);
  const sermonCampaign = app.campaigns[0];
  assert.equal(sermonCampaign.title, original.title);
  assert.equal(sermonCampaign.subtitle, original.subtitle);
  assert.equal(sermonCampaign.sources[0].notes, original.notes);
  assert.equal(sermonCampaign.sources[0].bigIdea, original.bigIdea);
  assert.equal(sermonCampaign.sources[0].permission, 'owned');
  assert.notEqual(sermonCampaign.sources[0].id, original.id);
  assert.equal(sermonCampaign.sources[0].kind, 'personal-library:' + original.id);
  assert.equal(JSON.parse(app.saved[W.schema]).sermons.find(sermon => sermon.id === original.id).notes, original.notes);
  pass('Personal sermon previews escape source text and build an independent source-preserving campaign copy');

  for (const id of ['finder-archived-sermon', 'finder-restricted-sermon']) {
    await app.go('campaign-finder/' + encodeURIComponent('sermon:' + id));
    assert.ok(!app.html.includes('id="cf-start-form"'));
    const before = app.campaigns.length;
    await app.submit('cf-start-form', {candidateId: 'sermon:' + id, goal: 'community', duration: '40', audience});
    assert.equal(app.campaigns.length, before);
  }
  pass('Archived and restricted personal sermons cannot be turned into campaigns through the finder');

  assert.deepEqual(app.errors, []);
  await app.flush();
  console.log(JSON.stringify({passed: true, checks}));
})().catch(error => { console.error(error); process.exitCode = 1; });
