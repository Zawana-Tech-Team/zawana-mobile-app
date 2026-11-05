import type { AuthApi } from '@/auth/api';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { AuthError } from '@/auth/errors';
import { useResource } from '@/booking/use-resource';
import { yangonDate } from '@/booking/private-course';
import { shiftMonth } from '@/attendance/domain';
import { useFormTask } from '@/hooks/use-form-task';
import { useSavedRequest } from '@/coach/use-saved-request';
import { brand } from '@/design/tokens';
import type { MemberMatch, StaffCourseInput } from '@/staff/domain';
import { a, Fact } from '../attendance/ui';
import { Button, Confirm, Notice, money } from '../member/ui';
import { MonthCalendar } from '../shared/month-calendar';
import { StepProgress, useStepBack } from '../booking/flow-ui';
import { TimePicker } from '../booking/time-picker';
import { StaffPage, w } from './ui';
type Input=Omit<StaffCourseInput,'requestKey'>;
const steps=['Member','Session','Payment','Review'];
function useAvailability(api:AuthApi,courseId:string,coachId:string,courtId:string,date:string,duration:number,owner:string){
 const load=useCallback((signal:AbortSignal)=>api.getPrivateCourseAvailability({courseId,coachId,courtId,date,durationMinutes:duration},{signal}),[api,courseId,coachId,courtId,date,duration]);
 return useResource(load,`${owner}:${courseId}:${coachId}:${courtId}:${date}:${duration}`,!!courseId&&!!coachId&&!!courtId);
}
export function StaffCreateCourseScreen(){
 const{api,user}=useAuth();const coachMode=user?.role==='coach';const task=useFormTask(),saved=useSavedRequest<Input>(user?.id??'','course-booking');
 const[step,setStep]=useState(0),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[member,setMember]=useState<MemberMatch|null>(null),[courseId,setCourseId]=useState(''),[coachId,setCoachId]=useState(''),[courtId,setCourtId]=useState(''),[date,setDate]=useState(yangonDate),[month,setMonth]=useState(()=>yangonDate().slice(0,7)),[time,setTime]=useState(''),[source,setSource]=useState<StaffCourseInput['paymentSource']>('UNPAID'),[amount,setAmount]=useState(''),[reference,setReference]=useState(''),[notes,setNotes]=useState(''),[confirm,setConfirm]=useState(false);
 const catalog=useResource(useCallback((signal:AbortSignal)=>api.getStaffCatalog({signal}),[api]),user?.id??'',!!user);
 const matches=useResource(useCallback((signal:AbortSignal)=>api.searchStaffMembers(search,{signal}),[api,search]),`${user?.id}:${search}`,search.length>=2);
 const course=catalog.data?.courses.find(c=>c.id===courseId),duration=course?.duration??0;
 const effectiveCoachId=coachMode?course?.coaches[0]?.id??'':coachId;
 const availability=useAvailability(api,courseId,effectiveCoachId,courtId,date,duration,user?.id??'');
 const slot=availability.data?.slots.find(s=>s.time===time&&s.available),cash=source==='COACH'||source==='BADMINTON_FO';
 const validPayment=!cash||(/^\d+$/.test(amount)&&Number(amount)===availability.data?.price);
 const ready=step===0?!!member&&!!course&&!!effectiveCoachId:step===1?!!slot:step===2?validPayment:!!slot&&!!member&&validPayment;
 const locked=task.loading||!!saved.pending;
 const back=useCallback(()=>{if(step>0)setStep(s=>s-1);else if(router.canGoBack())router.back();else router.replace('/(staff)/overview')},[step]);useStepBack(step,back);
 const submit=()=>void task.run(async()=>{
  if(!saved.pending&&(!member||!slot||!availability.data||!validPayment))throw new AuthError('invalidInput','Review the member, availability and payment first.');
  const draft=saved.pending??await saved.prepare({memberId:member!.id,courseId,coachId:effectiveCoachId,courtId,date,time,expectedPrice:availability.data!.price,paymentSource:source,reference:reference.trim(),notes:notes.trim()});
  try{saved.assertCurrent();const result=await api.createStaffCourse({...draft.input,requestKey:draft.requestKey});saved.assertCurrent();await saved.clear();setConfirm(false);router.replace({pathname:'/(staff)/sessions/[id]',params:{id:result.id}})}catch(e){if(e instanceof AuthError&&['invalidInput','forbidden','notFound','bookingConflict'].includes(e.code)){await saved.clear();setConfirm(false);availability.retry()}throw e;}
 });
 return <StaffPage title="Book a session." subtitle={coachMode?'Your eligible courses. Your coaching identity.':'Book a private course for an existing member.'} active="bookings" back footer={<><Notice error={task.error}/>{step>0?<Button secondary label="Previous step" disabled={locked} onPress={()=>setStep(s=>s-1)}/>:null}<Button testID="staff-create-next" label={step===3?'Review & create booking':`Continue to ${steps[step+1].toLowerCase()}`} disabled={!ready||locked||saved.restoring||!!saved.error} onPress={()=>{task.setError(null);if(step===3)setConfirm(true);else setStep(s=>s+1)}}/></>}>
 <StepProgress steps={steps} current={step}/><Notice loading={catalog.loading||saved.restoring} error={catalog.error??saved.error} onRetry={catalog.retry}/>
 {saved.pending?<View style={a.card}><Text style={a.title}>A saved booking needs checking.</Text><Text style={a.muted}>Retry the original request. ZAWANA returns the original booking if it already committed.</Text><Button label="Retry saved booking" busy={task.loading} onPress={submit}/></View>:null}
 {step===0?<><Text style={a.title}>Find the member</Text><TextInput accessibilityLabel="Member name, email or phone" placeholder="Name, email or phone" placeholderTextColor={brand.muted} value={query} onChangeText={setQuery} maxLength={100} editable={!locked} autoCorrect={false} style={w.search}/><Button secondary label="Search members" disabled={query.trim().length<2||locked} onPress={()=>{setSearch(query.trim());setMember(null);matches.retry()}}/><Notice loading={matches.loading} error={matches.error} onRetry={matches.retry}/>{matches.data?.map(m=><Button key={m.id} label={`${m.name} · ${m.email}`} secondary={member?.id!==m.id} disabled={locked} onPress={()=>setMember(m)}/>)}{matches.data&&!matches.data.length?<Text style={a.muted}>No matching active members. An administrator can help with account creation.</Text>:null}<Text style={a.title}>Choose a course</Text>{catalog.data?.courses.map(c=><Button key={c.id} label={`${c.title} · ${c.duration} min · ${money(c.price)}`} secondary={courseId!==c.id} disabled={locked} onPress={()=>{setCourseId(c.id);setCoachId('');setTime('')}}/>)}{coachMode&&course?<View style={a.card}><Text style={a.kicker}>COACH · LOCKED TO YOUR ACCOUNT</Text><Text style={a.title}>{course.coaches[0]?.name??'No eligible coach profile'}</Text></View>:course?.coaches.map(c=><Button key={c.id} label={c.name} secondary={coachId!==c.id} disabled={locked} onPress={()=>{setCoachId(c.id);setTime('')}}/>)}{catalog.data&&!catalog.data.courses.length?<Text style={a.muted}>No active badminton courses are assigned to your profile.</Text>:null}</>:null}
 {step===1?<><MonthCalendar month={month} selected={[date]} label="Staff booking dates" onPrevious={()=>setMonth(shiftMonth(month,-1))} onNext={()=>setMonth(shiftMonth(month,1))} previousDisabled={month<=yangonDate().slice(0,7)} disabled={d=>locked||d<yangonDate()} onSelect={d=>{setDate(d);setTime('')}}/><Text style={a.title}>Choose a court</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{catalog.data?.courts.map(c=><Button key={c.id} label={c.name} secondary={courtId!==c.id} disabled={locked} onPress={()=>{setCourtId(c.id);setTime('')}}/>)}</View><Notice loading={availability.loading} error={availability.error} onRetry={availability.retry}/>{courtId?<TimePicker options={(availability.data?.slots??[]).map(s=>({...s,detail:s.available?'Available':'Unavailable'}))} selected={time?[time]:[]} testPrefix="staff-time" onSelect={v=>{if(!locked)setTime(v)}}/>:<Text style={a.muted}>Select a court to check your coach’s available times.</Text>}</>:null}
 {step===2?<><Text style={a.title}>Payment flow</Text>{([['UNPAID','Unpaid / pending'],[coachMode?'COACH':'BADMINTON_FO',coachMode?'Cash collected by me':'Cash collected at front desk'],['ONLINE','Online payment later']] as const).map(([v,label])=><Button key={v} label={label} secondary={source!==v} disabled={locked} onPress={()=>setSource(v)}/>)}{cash?<View style={a.card}><Fact label="Actual amount received" value={money(availability.data?.price??0)}/><Text style={a.muted}>Record only cash you personally received. A paid cash booking confirms immediately after server verification.</Text><TextInput accessibilityLabel="Booking cash amount received" placeholder="Actual amount · MMK" placeholderTextColor={brand.muted} keyboardType="number-pad" value={amount} onChangeText={setAmount} editable={!locked} style={w.search}/></View>:<Text style={a.muted}>{source==='ONLINE'?'Selecting online does not verify or collect a payment. The member follows the existing coach acceptance and payment flow.':'This request waits for coach acceptance and payment.'}</Text>}<TextInput accessibilityLabel="Booking payment reference" placeholder="Reference (optional)" placeholderTextColor={brand.muted} value={reference} onChangeText={setReference} maxLength={200} editable={!locked} style={w.search}/><TextInput accessibilityLabel="Booking notes" placeholder="Notes (optional)" placeholderTextColor={brand.muted} value={notes} onChangeText={setNotes} maxLength={2000} multiline editable={!locked} style={w.search}/></>:null}
 {step===3?<View style={a.card}><Text style={a.kicker}>REVIEW YOUR SESSION</Text><Fact label="Member" value={member?.name??''}/><Fact label="Course" value={course?.title??''}/><Fact label="Coach" value={course?.coaches.find(c=>c.id===effectiveCoachId)?.name??''}/><Fact label="Court" value={catalog.data?.courts.find(c=>c.id===courtId)?.name??''}/><Fact label="Date" value={date}/><Fact label="Time" value={time}/><Fact label="Total" value={money(availability.data?.price??0)}/><Fact label="Payment" value={source==='COACH'?'Coach cash':source==='BADMINTON_FO'?'Front desk cash':source==='ONLINE'?'Online payment later':'Unpaid'}/><Text style={a.muted}>Availability, coach identity and price are validated by ZAWANA before the booking is saved.</Text></View>:null}
 <Confirm visible={confirm} title="Create this booking?" body={`${member?.name??''} · ${date} · ${time} · ${money(availability.data?.price??0)}. ${cash?'Confirm only after personally receiving the cash.':'Payment is not verified by creating this request.'}`} label="Create booking" busy={task.loading} error={task.error} onClose={()=>setConfirm(false)} onConfirm={submit}/>
 </StaffPage>;
}
