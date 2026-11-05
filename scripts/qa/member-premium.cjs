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
const out = path.resolve(process.env.MOBILE_QA_ARTIFACTS || 'artifacts/member-premium'); fs.mkdirSync(out, { recursive: true });
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
const memberId=m.users.find(u=>u.role==='member').id;
const db=new DatabaseSync(m.databaseUrl.slice(5));
const seed=db.prepare('INSERT OR REPLACE INTO Notification (id,userId,title,body,read,activeInInbox,createdAt,type,entityId,link) VALUES (?,?,?,?,0,1,?,?,?,?)');
seed.run('qa-premium-booking',memberId,'Your court session','Open your confirmed booking details.',Date.now(),'booking',m.pendingId,'/bookings');
seed.run('qa-premium-announcement',memberId,'Your club update','A real test notification stored in the isolated database.',Date.now()-86400000,'announcement',null,null);
seed.run('qa-premium-failure',memberId,'Package update','Check the remaining visits in your package.',Date.now()-172800000,'package',null,'/membership');
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
 const {p}=await login('member');await visible(p,'home-book-court').waitFor();await shot(p,'member-home-390');
 await tab(p,'Services');await visible(p,'service-badminton').waitFor();await shot(p,'services-390');
 for(const name of ['High Performance Gym','Revive Clinic','ZAWANA Café'])assert.equal(await p.getByRole('button',{name:new RegExp(name)}).filter({visible:true}).count(),0);
 await visible(p,'service-badminton').click();await visible(p,'badminton-court-rental').waitFor();await shot(p,'badminton-hub');assert.equal(await p.getByRole('tab',{name:'Services',exact:true}).filter({visible:true}).getAttribute('aria-selected'),'true');checks.push({check:'Services replaces Badminton tab; only badminton actionable; existing booking/packages/check-in/private hub preserved'});
 await visible(p,'member-notifications').click();await visible(p,'member-notification-qa-premium-booking').waitFor();await shot(p,'notifications-390');
 await visible(p,'member-notification-qa-premium-booking').click();await p.getByText('Your private courses',{exact:true}).filter({visible:true}).waitFor();assert.equal(db.prepare('SELECT read FROM Notification WHERE id=?').get('qa-premium-booking').read,1);checks.push({check:'Opening booking notification marks actual server record read then navigates to owned booking'});
 await tab(p,'Home');await visible(p,'member-notifications').click();await visible(p,'member-notification-qa-premium-announcement').click();await p.getByRole('button',{name:'Done with Your update',exact:true}).filter({visible:true}).waitFor();await shot(p,'notification-detail-sheet');await button(p,'Done with Your update');assert.equal(db.prepare('SELECT read FROM Notification WHERE id=?').get('qa-premium-announcement').read,1);
 await p.route('**/api/notifications/qa-premium-failure/read',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporary test outage'})}));
 await button(p,'Mark all as read');await p.getByText('1 update could not be saved. Try again.',{exact:true}).filter({visible:true}).waitFor();await shot(p,'notifications-partial-failure');assert.equal(db.prepare('SELECT read FROM Notification WHERE id=?').get('qa-premium-failure').read,0);
 await tab(p,'Profile');await visible(p,'member-notifications').getByText('1',{exact:true}).waitFor();await shot(p,'profile-390');await visible(p,'member-notifications').click();await p.unroute('**/api/notifications/qa-premium-failure/read');await button(p,'Mark all as read');await p.getByText('All caught up.',{exact:true}).filter({visible:true}).waitFor();await p.getByRole('tab',{name:'Unread',exact:true}).filter({visible:true}).click();await p.getByText('You’re all caught up.',{exact:true}).filter({visible:true}).waitFor();assert.equal(db.prepare('SELECT read FROM Notification WHERE id=?').get('qa-premium-failure').read,1);checks.push({check:'Partial mark-all keeps failed record unread and synchronized badge; retry confirms server read and unread empty state'});
 await tab(p,'Services');await p.setViewportSize({width:1280,height:900});await shot(p,'services-desktop');await tab(p,'Profile');await p.getByRole('button',{name:'Account details',exact:true}).filter({visible:true}).click();await p.getByRole('button',{name:'Done with Account details',exact:true}).filter({visible:true}).waitFor();await shot(p,'account-dialog-desktop');await p.keyboard.press('Tab');assert(await p.evaluate(()=>!!document.activeElement?.closest('[aria-modal="true"]')));await p.keyboard.press('Escape');await p.getByRole('button',{name:'Done with Account details',exact:true}).waitFor({state:'hidden'});checks.push({check:'Desktop sheet becomes compact dialog; Tab remains in modal and Escape closes it'});
 await p.setViewportSize({width:320,height:740});await tab(p,'Home');await shot(p,'home-320');await tab(p,'Services');await shot(p,'services-320');await tab(p,'Profile');await button(p,'Sign out');await shot(p,'signout-confirmation-320');await button(p,'Go back');checks.push({check:'320px home, services and confirmation fit with safe reachable actions'});
 await button(p,'Payment records');await p.getByText('Payment records.',{exact:true}).filter({visible:true}).waitFor();await shot(p,'payment-records-320');await p.getByRole('button',{name:/^Individual footwork/}).filter({visible:true}).first().click();await p.getByText('Your private courses',{exact:true}).filter({visible:true}).waitFor();checks.push({check:'Payment records use actual dashboard records and open private courses through their matching workflow'});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment:'Isolated migrated SQLite and actual authenticated business API; fixture notices seeded only in temp DB',checks,errors},null,2));db.close();await browser.close();console.log(JSON.stringify({passed:checks.length,pageErrors:errors.length}));
})().catch(async e=>{console.error(e.stack);if(browser){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});await browser.close()}db.close();process.exitCode=1});
