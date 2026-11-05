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
const out = path.resolve(process.env.MOBILE_QA_ARTIFACTS || 'artifacts/mobile-verification/journeys'); fs.mkdirSync(out, { recursive: true });
const checks = [], errors = [];
let browser;
const shortDate = d => new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Yangon'});
const screenshot = async (p, name) => { console.log('Screenshot',name); await p.screenshot({ path: path.join(out,name+'.png') }); checks.push({ screenshot: name+'.png' }); };
async function login(role) {
 const context = await browser.newContext({ viewport:{ width:390,height:844 }, reducedMotion:'reduce' });
 const p=await context.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/sign-in',{waitUntil:'domcontentloaded',timeout:60000});
 await p.getByTestId('session-restoring').waitFor({state:'hidden',timeout:30000});
 await p.getByRole('button',{name:'Use your existing email account'}).click();
 await p.getByTestId('email-input').fill(role+'@mobile.test');await p.getByTestId('identifier-submit').click();
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
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
 const member=await login('member'),p=member.p;
 await p.getByRole('tab',{name:'Services',exact:true}).filter({visible:true}).click();await visible(p,'service-badminton').click();await shot(p,'badminton-hub');
 await visible(p,'badminton-check-in').click();await p.getByLabel('Front desk QR link').filter({visible:true}).waitFor();
 assert.equal(await p.getByRole('tab',{name:'Services',exact:true}).filter({visible:true}).getAttribute('aria-selected'),'true');checks.push({check:'Badminton hub opens check-in with active Badminton navigation'});
 await p.getByRole('tab',{name:'Services',exact:true}).filter({visible:true}).click();await visible(p,'service-badminton').click();await p.setViewportSize({width:320,height:740});await shot(p,'badminton-hub-320');await p.setViewportSize({width:390,height:844});

 const later=new Date(m.tomorrow+'T12:00:00Z');later.setUTCDate(later.getUTCDate()+1);const laterDate=later.toISOString().slice(0,10);const rentalDate=laterDate.slice(0,7)===m.tomorrow.slice(0,7)?laterDate:m.tomorrow;
 const av=await apiRequest(member.session,'/court-booking/availability?date='+m.tomorrow);assert.equal(av.status,200);
 const court=av.data.courts.find(c=>c.surface==='2nd Floor' && av.data.slots.some(s=>s.courtId===c.id && s.startMinute===480 && s.available && s.status==='available')) || av.data.courts[0];
 
 await open(p,'/book');await visible(p,'rental-time-480').waitFor(); await shot(p,'rental-time');
 if(process.env.TIME_PICKER_VISUAL==='1') {
   await visible(p,'rental-time-period-1').click();await p.waitForTimeout(250);await shot(p,'rental-afternoon');
   await visible(p,'rental-time-period-2').click();await p.waitForTimeout(250);await shot(p,'rental-evening');
   await visible(p,'rental-time-period-0').click();await visible(p,'rental-time-480').click();await p.waitForTimeout(250);
   await visible(p,'rental-time-480').scrollIntoViewIfNeeded();await shot(p,'rental-selected');
   await p.setViewportSize({width:320,height:740});await visible(p,'rental-time-480').scrollIntoViewIfNeeded();await shot(p,'rental-selected-320');
   await p.setViewportSize({width:390,height:844});await visible(p,'rental-time-480').click();
 }

 await rental(p,rentalDate,480,court.id);await p.getByTestId('booking-review').filter({visible:true}).waitFor();await shot(p,'rental-review');
 await p.getByRole('button',{name:'Edit session 1',exact:true}).filter({visible:true}).click();
 await visible(p,'rental-time-540').click();await visible(p,'rental-next').click();
 // The original date remains selected while editing.
 await visible(p,'rental-next').click();await visible(p,'floor-2').click();await visible(p,'rental-next').click();await visible(p,'court-'+court.id).click();await visible(p,'rental-next').click();
 await p.getByRole('button',{name:'Edit session 1',exact:true}).filter({visible:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Edit session 2',exact:true}).filter({visible:true}).count(),0);
 const createResponse=p.waitForResponse(r=>r.url().endsWith('/api/bookings')&&r.request().method()==='POST');
 await visible(p,'booking-primary').click();const created=await (await createResponse).json();assert(created.booking?.id);const id=created.booking.id;
 checks.push({check:'Time-date-floor-court booking and atomic edit submitted to real backend',id});
 await p.getByRole('button',{name:'View My Bookings',exact:true}).filter({visible:true}).click();
 await open(p,'/bookings/'+id);await visible(p,'booking-reschedule').waitFor();await shot(p,'court-booking-detail');
 const changes=await apiRequest(member.session,'/court-booking/bookings/'+id+'/changes');
 if(changes.data.eligibility.eligible){
 const replacement=await apiRequest(member.session,'/court-booking/availability?date='+rentalDate);
 const destination=replacement.data.slots.find(s=>s.courtId===court.id&&s.startMinute>=600&&s.startMinute<720&&s.available&&s.status==='available') || replacement.data.slots.find(s=>s.courtId===court.id&&s.startMinute<720&&s.startMinute!==540&&s.available&&s.status==='available');assert(destination);
 await visible(p,'booking-reschedule').click();await rental(p,rentalDate,destination.startMinute,court.id);
 await p.getByLabel('Reschedule reason').filter({visible:true}).fill('QA: move the session to a later morning hour');await shot(p,'reschedule-review');
 const saved=p.waitForResponse(r=>r.url().endsWith('/reschedule')&&r.request().method()==='POST');await visible(p,'confirm-reschedule').click();assert.equal((await saved).status(),200);
 const current=await apiRequest(member.session,'/court-booking/bookings/'+id+'/changes');assert.equal(current.data.booking.time,destination.time);assert.equal(current.data.history.length,1);checks.push({check:'Reschedule quote and confirmed change persisted with audit history'});
 } else checks.push({check:'Server correctly disabled changes within 24 hours',message:changes.data.eligibility.message});
 await open(p,'/private-course');await visible(p,'private-package-'+m.courseId).click();await visible(p,'private-next').click();await shot(p,'private-coach');
 if(process.env.COACH_PROFILE_QA==='1') {
  await p.getByTestId(/^coach-profile-/).filter({visible:true}).first().click();await p.getByText('Meet your coach.',{exact:true}).filter({visible:true}).waitFor();await shot(p,'coach-profile');
  await visible(p,'choose-profile-coach').click();await visible(p,'calendar-day-'+m.tomorrow).waitFor();checks.push({check:'Coach profile shows eligible courses and returns selected coach to date step'});
 } else { await p.getByTestId(/^private-coach-/).filter({visible:true}).first().click();await visible(p,'private-next').click(); }
 await visible(p,'calendar-day-'+m.tomorrow).click();await visible(p,'private-next').click();
 await p.getByTestId(/^private-time-\d+$/).filter({visible:true}).and(p.locator(':not([aria-disabled=true])')).first().click();await visible(p,'private-next').click();
 await visible(p,'floor-2').click();await visible(p,'private-next').click();
 await p.getByTestId(/^court-/).filter({visible:true}).and(p.locator(':not([aria-disabled=true])')).first().click();await visible(p,'private-next').click();await shot(p,'private-review');
 const request=p.waitForResponse(r=>r.url().endsWith('/api/member/private-courses')&&r.request().method()==='POST');await visible(p,'private-next').click();assert.equal((await request).status(),201);checks.push({check:'Package-coach-date-time-floor-court private request persisted'});
 await open(p,'/bookings');await p.getByRole('tab',{name:'Coaching',exact:true}).filter({visible:true}).click();await shot(p,'booking-history');
 await open(p,'/membership');await p.getByRole('tab',{name:'Explore',exact:true}).filter({visible:true}).click();await p.getByRole('button',{name:/^FOUNDATION|^SOCIAL/i}).filter({visible:true}).first().waitFor();await shot(p,'packages-explore');
 await p.getByRole('tab',{name:'History',exact:true}).filter({visible:true}).click();await shot(p,'packages-history');
 await open(p,'/attendance');await visible(p,'calendar-day-'+m.tomorrow).click();await shot(p,'attendance-calendar');
 await p.setViewportSize({width:320,height:740});await shot(p,'attendance-calendar-320');
 
 if(process.env.MULTI_COURT_QA==='1') {
  await open(p,'/book');await p.setViewportSize({width:390,height:844});
  await visible(p,'rental-time-480').click();await visible(p,'rental-time-540').click();await visible(p,'rental-next').click();
  await visible(p,'calendar-day-'+rentalDate).click();await visible(p,'rental-next').click();await visible(p,'floor-2').click();await visible(p,'rental-next').click();
  const avail=await apiRequest(member.session,'/court-booking/availability?date='+rentalDate);assert.equal(avail.status,200);
  const free=avail.data.courts.filter(c=>[480,540].every(min=>avail.data.slots.some(s=>s.courtId===c.id&&s.startMinute===min&&s.available&&s.status==='available')));
  const downstairs=free.filter(c=>c.surface==='2nd Floor').slice(0,2),upstairs=free.find(c=>c.surface==='6th Floor');assert.equal(downstairs.length,2);assert(upstairs);
  for(const c of downstairs)await visible(p,'court-'+c.id).click();
  await visible(p,'court-'+downstairs[1].id).click();assert.equal(await visible(p,'court-'+downstairs[1].id).getAttribute('aria-selected'),'false');await visible(p,'court-'+downstairs[1].id).click();
  await shot(p,'multiple-courts');await visible(p,'rental-another-floor').click();await visible(p,'floor-6').click();await visible(p,'rental-next').click();await visible(p,'court-'+upstairs.id).click();await shot(p,'multiple-floors');await visible(p,'rental-next').click();
  await p.getByRole('button',{name:'Edit session 6',exact:true}).filter({visible:true}).waitFor();await shot(p,'multiple-courts-review');
  const pickedIds=[...downstairs.map(c=>c.id),upstairs.id];const expected=avail.data.slots.filter(s=>pickedIds.includes(s.courtId)&&[480,540].includes(s.startMinute)).reduce((sum,s)=>sum+s.price,0);
  const response=p.waitForResponse(r=>r.url().endsWith('/api/bookings')&&r.request().method()==='POST');await visible(p,'booking-primary').click();const res=await response;assert.equal(res.status(),201);const result=await res.json();assert.equal(result.bookings.length,6);assert.equal(new Set(result.bookings.map(b=>b.courtId)).size,3);assert(result.bookings.every(b=>b.status==='CONFIRMED'));assert.equal(result.totalPrice,expected);checks.push({check:'Three courts across both floors, two hours each, atomically confirmed by backend',bookingCount:6});
 }

 if(process.env.STAFF_COURT_QA==='1') {
  // Explicit isolated fixture: a paid court record exercises cancellation approval without a payment provider.
  // This is not a real receipt or revenue assertion and never touches the user's local database.
  const fixtureDb=new DatabaseSync(m.databaseUrl.slice(5));fixtureDb.prepare("UPDATE Booking SET paymentStatus='paid' WHERE id=?").run(id);fixtureDb.close();
  const cancellation=await apiRequest(member.session,'/court-booking/bookings/'+id+'/cancellation-requests',{reason:'QA paid cancellation request'});assert.equal(cancellation.status,201);assert.equal(cancellation.data.status,'requested');
  assert.equal((await apiRequest(member.session,'/court-booking/bookings')).status,403);
  const denied=await apiRequest(member.session,'/court-booking/bookings/'+id+'/cancellation-requests/'+cancellation.data.id+'/review',{approve:true,reason:'Member cannot approve'});assert.equal(denied.status,403);
  const staff=await login('badminton_fo'),sp=staff.p;
  await sp.getByRole('tab',{name:'Bookings',exact:true}).filter({visible:true}).click();await sp.getByRole('button',{name:'Court rentals',exact:true}).filter({visible:true}).click();await shot(sp,'fo-court-reservations');
  await visible(sp,'staff-court-'+id).getByRole('button',{name:'Manage court reservation',exact:true}).click();await sp.getByLabel('Court cancellation review reason').filter({visible:true}).fill('QA: approved at member request, refund needs separate review');await shot(sp,'fo-cancellation-review');
  await visible(sp,'court-cancellation-'+cancellation.data.id).getByRole('button',{name:'Approve cancellation',exact:true}).click();
  const review=sp.waitForResponse(r=>r.url().endsWith('/cancellation-requests/'+cancellation.data.id+'/review')&&r.request().method()==='POST');
  await sp.getByRole('button',{name:'Approve cancellation',exact:true}).filter({visible:true}).last().click();const approved=await review;assert.equal(approved.status(),200);const result=await approved.json();assert.equal(result.status,'completed');assert.notEqual(result.refundStatus,'refunded');
  await sp.getByText('Cancellation completed. Refund status: '+(result.refundStatus.charAt(0).toUpperCase()+result.refundStatus.slice(1).replaceAll('_',' '))+'.',{exact:true}).filter({visible:true}).waitFor();await shot(sp,'fo-cancellation-approved');
  const audit=await apiRequest(member.session,'/court-booking/bookings/'+id+'/changes');assert.equal(audit.data.booking.status,'cancelled');assert.equal(audit.data.booking.paymentStatus,'paid');assert(audit.data.history.some(h=>h.action==='cancellation_approved'));checks.push({check:'FO cancellation approval persisted with audit, unchanged payment and independent refund; member review denied'});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,pageErrors:errors.length}));await browser.close();
})().catch(async e=>{console.error(e.stack);if(browser){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});await browser.close();}process.exitCode=1;});
