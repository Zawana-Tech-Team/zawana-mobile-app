import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
type Props=Omit<PressableProps,'style'> & {style?:StyleProp<ViewStyle>;selected?:boolean;selectedColor?:string;restColor?:string};
/** Selection color is authoritative React state; press motion runs on the UI thread. */
export function SelectionPressable({selected=false,selectedColor='#101747',restColor='#FFFFFF',style,onPressIn,onPressOut,onFocus,onBlur,onHoverIn,onHoverOut,...props}:Props){
 const scale=useSharedValue(1);
 const [focused,setFocused]=useState(false),[hovered,setHovered]=useState(false);
 const animated=useAnimatedStyle(()=>({transform:[{scale:scale.get()}]}));
 return <AnimatedPressable {...props} onHoverIn={event=>{setHovered(true);onHoverIn?.(event);}} onHoverOut={event=>{setHovered(false);onHoverOut?.(event);}} onFocus={event=>{setFocused(true);onFocus?.(event);}} onBlur={event=>{setFocused(false);onBlur?.(event);}} style={[style,hovered&&!props.disabled&&{opacity:.94},focused&&{outlineWidth:2,outlineColor:"#A76D10",outlineStyle:"solid",outlineOffset:3},{backgroundColor:selected?selectedColor:restColor},animated]} onPressIn={event=>{scale.set(withTiming(.98,{duration:70,reduceMotion:ReduceMotion.System}));onPressIn?.(event);}} onPressOut={event=>{scale.set(withTiming(1,{duration:110,reduceMotion:ReduceMotion.System}));onPressOut?.(event);}}/>;
}
