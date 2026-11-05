/** Runs only against an isolated QA backend; no production accounts or records. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const manifestPath = process.env.MOBILE_QA_MANIFEST || path.join(os.tmpdir(), 'zawana-mobile-qa-manifest.json');
const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(m.databaseUrl.startsWith('file:/') && m.databaseUrl.includes('/zawana-mobile-workspace-'));
const origin = process.env.MOBILE_QA_WEB || 'http://localhost:8087';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const api = process.env.MOBILE_QA_API || 'http://127.0.0.1:8130/api';
assert(['localhost', '127.0.0.1'].includes(new URL(api).hostname));
const out = path.resolve(process.env.MOBILE_QA_ARTIFACTS || 'artifacts/badminton-minimal'); fs.mkdirSync(out, { recursive: true });
const checks = [], errors = [];
let browser;
async function login(role,email=role+'@mobile.test') {
 const context = await browser.newContext({ viewport:{ width:390,height:844 }, reducedMotion:'reduce' });
 const p=await context.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/sign-in',{waitUntil:'domcontentloaded',timeout:60000});
 await p.getByTestId('session-restoring').waitFor({state:'hidden',timeout:30000});
 await p.getByRole('button',{name:'Use your existing email account'}).click();
 await p.getByTestId('email-input').fill(email);await p.getByTestId('identifier-submit').click();
 await p.getByTestId('sign-in-password').fill(m.password);
 const response=p.waitForResponse(r=>r.url().endsWith('/api/auth/mobile/email-login')&&r.request().method()==='POST');
 await p.getByTestId('password-submit').click();const session=await (await response).json();assert.equal(session.user.role,role);
 await p.getByRole('tab',{name:role==='member'?'Performance':role==='coach'?'Calendar':'Overview',exact:true}).waitFor();
 checks.push({check:'UI password sign-in',role});return {context,p,session};
}
const tab=(p,name)=>p.getByRole('tab',{name,exact:true}).filter({visible:true}).click();
const button=(p,name)=>p.getByRole('button',{name,exact:true}).filter({visible:true}).click();
const visible=(p,id)=>p.getByTestId(id).filter({visible:true});
async function shot(p,name){await p.screenshot({path:path.join(out,name+'.png')});checks.push({screenshot:name+'.png'});console.log(name)}
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
 const coach=await login('coach'),p=coach.p,requests=[];p.on('request',r=>requests.push(r.url()));
 assert.equal(new URL(p.url()).pathname,'/calendar');
 assert.deepEqual(await p.getByRole('tab').filter({visible:true}).allTextContents(),['Upcoming','Week','Month','Calendar','Attendance','Coaching','Finance','More']);
 await visible(p,'staff-session-'+m.pendingId).waitFor();await shot(p,'coach-upcoming-390');
 await tab(p,'Month');await visible(p,'calendar-day-'+m.tomorrow).click();await visible(p,'staff-session-'+m.pendingId).waitFor();await shot(p,'coach-month-390');
 await tab(p,'Attendance');await visible(p,'attendance-row-course-'+m.attendanceId).waitFor();await shot(p,'coach-attendance-390');await visible(p,'attendance-row-course-'+m.extraAttendanceId).click();await shot(p,'coach-attendance-actions');await button(p,'Done with Student attendance');
 await tab(p,'Coaching');await shot(p,'coach-private-coaching-390');
 await tab(p,'Finance');await p.getByText('CASH TO HAND OVER',{exact:true}).filter({visible:true}).waitFor();await shot(p,'coach-finance-390');await tab(p,'Handovers');await shot(p,'coach-cash-handovers-390');
 await tab(p,'More');assert.equal(await p.getByRole('button',{name:/Gym/}).filter({visible:true}).count(),0);await p.getByRole('button',{name:/^Notifications/}).filter({visible:true}).click();await shot(p,'coach-notifications-390');
 await tab(p,'History');await visible(p,'notification-'+m.noticeId).click();await shot(p,'coach-notification-detail');await button(p,'Done with Session update');
 await tab(p,'Calendar');await p.setViewportSize({width:320,height:740});await shot(p,'coach-upcoming-320');
 assert.equal(requests.some(url=>url.includes('/private-training')||url.includes('/gym/')),false);checks.push({check:'Coach default calendar, five badminton tabs, tap disclosures and no Gym API requests'});
 const member=await login('member'),mp=member.p;await tab(mp,'Performance');await visible(mp,'calendar-day-'+m.today).waitFor();await shot(mp,'member-attendance-390');
 await visible(mp,'attendance-row-course-'+m.attendanceId).click();await shot(mp,'member-attendance-detail');await mp.getByRole('button',{name:'Done with Session details',exact:true}).filter({visible:true}).click();await button(mp,'Summary');await shot(mp,'member-attendance-summary');await button(mp,'Done with Monthly summary');
 await mp.getByRole('button',{name:'My packages',exact:true}).filter({visible:true}).click();await mp.getByRole('tab',{name:'My packages',exact:true}).filter({visible:true}).waitFor();const pass=mp.getByTestId(/^package-pass-/).filter({visible:true}).first();await pass.waitFor();await shot(mp,'member-packages-390');await pass.click();await shot(mp,'member-package-detail');await button(mp,'Done with Package details');
 await tab(mp,'Explore');await shot(mp,'member-package-explore');await mp.getByRole('button',{name:/^Foundation/i}).filter({visible:true}).first().click();await shot(mp,'member-explore-detail');await button(mp,'Done with Explore package');
 await tab(mp,'My packages');await mp.setViewportSize({width:320,height:740});await shot(mp,'member-packages-320');await mp.getByRole('button',{name:'Go back',exact:true}).filter({visible:true}).click();await shot(mp,'member-attendance-320');checks.push({check:'Member calendar, summaries, package balances and detail disclosures at 390 and 320px'});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment:'Isolated backend; actual business APIs',checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,pageErrors:errors.length}));await browser.close();
})().catch(async e=>{console.error(e.stack);if(browser){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});await browser.close()}process.exitCode=1});
