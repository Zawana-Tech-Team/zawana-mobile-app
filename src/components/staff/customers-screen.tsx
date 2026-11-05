import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useResource } from '@/booking/use-resource';
import { a } from '../attendance/ui';
import { Button, Notice } from '../member/ui';
import { Empty, StaffPage, w } from './ui';
export function CoachCustomersScreen(){const{api,user}=useAuth();const[query,setQuery]=useState(''),[selected,setSelected]=useState('');const resource=useResource(useCallback((signal:AbortSignal)=>api.getStaffBookings({signal}),[api]),user?.id??'',user?.role==='coach');const people=[...new Map((resource.data??[]).map(b=>[b.user.id,b.user])).values()].filter(p=>`${p.name} ${p.email??''}`.toLowerCase().includes(query.toLowerCase()));return <StaffPage title="My students." subtitle="Your badminton coaching members." active="more" back><TextInput accessibilityLabel="Search assigned customers" placeholder="Search name or email" value={query} onChangeText={setQuery} style={w.search}/><Notice loading={resource.loading} error={resource.error} onRetry={resource.retry}/>{people.map(p=><View key={p.id} style={a.card}><Text style={a.title}>{p.name}</Text>{'email'in p&&typeof p.email==='string'?<Text style={a.muted}>{p.email}</Text>:null}<Button secondary label={selected===p.id?'Hide sessions':'View customer sessions'} onPress={()=>setSelected(selected===p.id?'':p.id)}/>{selected===p.id?<>{resource.data?.filter(b=>b.user.id===p.id).map(b=><Button key={b.id} secondary label={`${b.title} · ${b.date} · ${b.time}`} onPress={()=>router.push({pathname:'/(staff)/sessions/[id]',params:{id:b.id}})}/>)}</>:null}</View>)}{resource.data&&!people.length?<Empty title="No assigned customers in this view."/>:null}</StaffPage>}
