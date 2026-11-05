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
const out = path.resolve(process.env.MOBILE_QA_ARTIFACTS || 'artifacts/coach-portal'); fs.mkdirSync(out, { recursive: true });
const checks = [], errors = [];
let browser;
const shortDate = d => new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Yangon'});
const screenshot = async (p, name) => { console.log('Screenshot',name); await p.screenshot({ path: path.join(out,name+'.png') }); checks.push({ screenshot: name+'.png' }); };
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
async function apiRequest(session, endpoint, body, method=body?'POST':'GET') {
 const res=await fetch(api+endpoint,{method,headers:{Authorization:'Bearer '+session.accessToken,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};
}

const visible = (p,id) => p.getByTestId(id).filter({visible:true});
async function shot(p,name) { await screenshot(p,name); }
async function open(p,route) {
 const tab=async name=>p.getByRole('tab',{name,exact:true}).filter({visible:true}).click();
 if(route==='/book') { await tab('Services');await visible(p,'service-badminton').click(); return visible(p,'badminton-court-rental').click(); }
 if(route==='/bookings') return tab('My Bookings');
 if(route.startsWith('/bookings/')) { await tab('My Bookings');return visible(p,'booking-row-'+route.split('/').pop()).getByRole('button',{name:'Manage booking',exact:true}).click(); }
 if(route==='/private-course'){await tab('Services');await visible(p,'service-badminton').click();return visible(p,'badminton-private-course').click();}
 if(route==='/membership'){await tab('Services');await visible(p,'service-badminton').click();return visible(p,'badminton-packages').click();}
 if(route==='/attendance')return tab('Performance');
 throw Error('Unknown route '+route);
}
async function rental(p,date,time=480,court) {
 await visible(p,'rental-time-'+time).click();
 if(process.env.BRAND_QA==='1'){assert.equal(await visible(p,'rental-time-'+time).evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 23, 71)');await shot(p,'navy-selected-time');}
 await visible(p,'rental-next').click();
 await visible(p,'calendar-day-'+date).click(); await visible(p,'rental-next').click();
 await visible(p,'floor-2').click(); await shot(p,'rental-floor'); await visible(p,'rental-next').click();
 await visible(p,'court-'+court).click(); await shot(p,'rental-court'); await visible(p,'rental-next').click();
}

const tab=async(p,name)=>p.getByRole('tab',{name,exact:true}).filter({visible:true}).click();
const button=async(p,name)=>p.getByRole('button',{name,exact:true}).filter({visible:true}).click();
async function more(p,name){await tab(p,'More');await p.getByRole('button',{name:new RegExp('^'+name)}).filter({visible:true}).click()}
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
 const coach=await login('coach'),p=coach.p;await shot(p,'coach-home');
 await tab(p,'Calendar');await tab(p,'Month');await visible(p,'calendar-day-'+m.tomorrow).click();await visible(p,'staff-session-'+m.pendingId).waitFor();await shot(p,'coach-month-calendar');checks.push({check:'Coach month calendar contains assigned booking and selects day'});
 await tab(p,'Attendance');await visible(p,'attendance-row-course-'+m.extraAttendanceId).click();await button(p,'Late');await p.getByLabel('Attendance notes',{exact:true}).filter({visible:true}).fill('QA: arrival confirmed by coach');await button(p,'Confirm attendance');await visible(p,'attendance-row-course-'+m.extraAttendanceId).getByText('Late',{exact:true}).waitFor();await shot(p,'coach-attendance-notes');
 const attendance=await apiRequest(coach.session,'/attendance?month='+m.today.slice(0,7));const note=attendance.data.records.find(r=>r.id===m.extraAttendanceId);assert.equal(note.notes,'QA: arrival confirmed by coach');assert(note.checkedInAt);const arrival=note.checkedInAt;const again=await apiRequest(coach.session,'/attendance?month='+m.today.slice(0,7));assert.equal(again.data.records.find(r=>r.id===m.extraAttendanceId).checkedInAt,arrival);checks.push({check:'Coach attendance and notes persisted with preserved arrival timestamp'});
 await more(p,'Notifications');await visible(p,'notification-'+m.noticeId).click();await shot(p,'coach-session-notification');await button(p,'Mark as read');await visible(p,'notification-'+m.noticeId).waitFor({state:'hidden'});await tab(p,'History');await visible(p,'notification-'+m.noticeId).waitFor();await shot(p,'coach-notifications');
 await more(p,'My students');await p.getByLabel('Search assigned customers').fill('QA member');await button(p,'View customer sessions');await shot(p,'coach-customers');
 await tab(p,'Coaching');await button(p,'Book a session');await p.getByLabel('Member name, email or phone').fill('QA');await button(p,'Search members');await button(p,'QA member · member@mobile.test');
 const catalog=(await apiRequest(coach.session,'/staff/private-courses/catalog')).data;const course=catalog.courses.find(c=>c.id===m.courseId);assert.equal(course.coaches.length,1);await p.getByRole('button',{name:new RegExp('^Individual footwork ·')}).filter({visible:true}).click();await p.getByText('COACH · LOCKED TO YOUR ACCOUNT',{exact:true}).waitFor();await visible(p,'staff-create-next').click();
 await visible(p,'calendar-day-'+m.tomorrow).click();await button(p,'Court 4');await visible(p,'staff-time-period-1').click();await visible(p,'staff-time-840').click();await visible(p,'staff-create-next').click();await button(p,'Cash collected by me');await p.getByLabel('Booking cash amount received').fill(String(course.price));await p.getByLabel('Booking payment reference').fill('QA-COACH-CASH');await visible(p,'staff-create-next').click();await shot(p,'coach-booking-review');
 await visible(p,'staff-create-next').click();const createdResponse=p.waitForResponse(r=>r.url().endsWith('/api/staff/private-courses/bookings')&&r.request().method()==='POST');await button(p,'Create booking');const createdRes=await createdResponse;assert.equal(createdRes.status(),201);const payload=createdRes.request().postDataJSON(),created=await createdRes.json();assert.equal(payload.paymentSource,'COACH');assert.equal(created.status,'CONFIRMED');assert.equal(created.paymentStatus,'paid');
 const replay=await apiRequest(coach.session,'/staff/private-courses/bookings',payload);assert.equal(replay.data.id,created.id);checks.push({check:'Coach-locked cash booking confirmed, receipt persisted and duplicate request replay safe'});
 await tab(p,'Finance');await tab(p,'Handovers');const finance=(await apiRequest(coach.session,'/staff/private-courses/finance')).data;const own=finance.rows.find(r=>r.id===m.pendingId);assert(own.payment);await p.getByRole('button',{name:own.user.name+', '+own.code,exact:true}).filter({visible:true}).click();await visible(p,'handover-amount-'+own.payment.id).fill('12000');await p.getByLabel('Handover notes').fill('QA: actual partial cash handover');await button(p,'Review handover');await shot(p,'coach-handover-review');let committedHandover, handoverPayload;
 await p.route('**/api/staff/private-courses/settlements',async route=>{handoverPayload=route.request().postDataJSON();const committed=await route.fetch();assert.equal(committed.status(),201);committedHandover=await committed.json();await route.abort('failed');});
 await button(p,'Submit handover');await p.getByText('Could not connect to ZAWANA. Check your internet connection and try again.',{exact:true}).filter({visible:true}).last().waitFor();
 await p.getByRole('button',{name:'Go back',exact:true}).filter({visible:true}).last().click();await p.unroute('**/api/staff/private-courses/settlements');
 await p.goto(origin+'/sign-in',{waitUntil:'domcontentloaded'});await p.getByTestId('session-restoring').waitFor({state:'hidden'});await button(p,'Use your existing email account');await p.getByTestId('email-input').fill('coach@mobile.test');await visible(p,'identifier-submit').click();await visible(p,'sign-in-password').fill(m.password);const relogin=p.waitForResponse(r=>r.url().endsWith('/api/auth/mobile/email-login')&&r.request().method()==='POST');await visible(p,'password-submit').click();coach.session=await(await relogin).json();await tab(p,'Finance');await tab(p,'Handovers');await button(p,'Retry saved handover');await visible(p,'handover-'+committedHandover.id).waitFor();
 const handover=committedHandover;assert.equal(handover.amount,12000);assert.equal(handover.status,'SUBMITTED');await shot(p,'coach-handover-submitted');checks.push({check:'Lost handover response survived page reload/re-login and recovered the same committed request without duplication'});
 const duplicate=await apiRequest(coach.session,'/staff/private-courses/settlements',handoverPayload);assert.equal(duplicate.data.id,handover.id);
 const tooMuch=await apiRequest(coach.session,'/staff/private-courses/settlements',{requestKey:'qa-too-much-00000001',items:[{paymentId:own.payment.id,amount:50000}]});assert.equal(tooMuch.status,409);
 const foPayment=finance.rows.find(r=>r.source==='BADMINTON_FO'&&r.payment);assert(foPayment);assert.equal((await apiRequest(coach.session,'/staff/private-courses/settlements',{requestKey:'qa-wrong-source-000001',items:[{paymentId:foPayment.payment.id,amount:1}]})).status,403);
 assert.equal((await apiRequest(coach.session,'/staff/private-courses/settlements/'+handover.id+'/receive',{})).status,403);
 const fo=await login('badminton_fo');await tab(fo.p,'Payments');await button(fo.p,'Cash handovers & finance');await tab(fo.p,'Handovers');await visible(fo.p,'handover-'+handover.id).getByRole('button').first().click();await button(fo.p,'Confirm cash received');await button(fo.p,'Receive handover');await fo.p.getByText('Cash receipt confirmed.',{exact:true}).filter({visible:true}).waitFor();await shot(fo.p,'fo-handover-received');assert.equal((await apiRequest(fo.session,'/notifications/'+m.noticeId+'/read',{},'PATCH')).status,403);checks.push({check:'Partial coach handover, duplicate protection, over-allocation/FO-source/self-receipt denials, authorized FO receipt'});

 await tab(p,'Coaching');await tab(p,'History');await visible(p,'staff-session-'+m.completeCourseId).click();await button(p,'Mark session complete');await button(p,'Confirm');await p.getByText('Session completed.',{exact:true}).filter({visible:true}).waitFor();
 const newRequest=await apiRequest(fo.session,'/staff/private-courses/bookings',{memberId:m.users.find(u=>u.role==='member').id,courseId:m.courseId,coachId:payload.coachId,courtId:m.courts[3],date:m.tomorrow,time:'4:00 PM — 5:00 PM',expectedPrice:course.price,paymentSource:'UNPAID',requestKey:'qa-decline-request-00001'});assert.equal(newRequest.status,201);
 await tab(p,'Coaching');await visible(p,'staff-session-'+newRequest.data.id).click();await button(p,'Decline request');await button(p,'Confirm');await p.getByText('Request declined.',{exact:true}).filter({visible:true}).waitFor();assert.equal((await apiRequest(coach.session,'/staff/private-courses/bookings/'+newRequest.data.id)).data.status,'COACH_DECLINED');checks.push({check:'Eligible confirmed private session completed and a new owned request declined through server-confirmed UI'});
 const db=new DatabaseSync(m.databaseUrl.slice(5));assert.equal(db.prepare('SELECT status FROM PrivateCourseSettlement WHERE id=?').get(handover.id).status,'RECEIVED');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM PrivateCourseSettlementItem WHERE settlementId=?').get(handover.id).n,1);db.close();checks.push({check:'Actual handover receipt and single allocation persisted'});
 await p.setViewportSize({width:320,height:740});await more(p,'Profile & settings');await shot(p,'coach-profile-320');await button(p,'Sign out');await p.getByRole('button',{name:'Sign out',exact:true}).filter({visible:true}).last().click();await visible(p,'continue-phone').waitFor();checks.push({check:'Coach navigation, small screen profile and logout'});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,pageErrors:errors.length}));await browser.close();
})().catch(async e=>{console.error(e.stack);if(browser){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});await browser.close()}process.exitCode=1});
