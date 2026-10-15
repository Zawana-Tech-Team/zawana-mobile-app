import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
type Props=Omit<PressableProps,'style'> & {style?:StyleProp<ViewStyle>;selected?:boolean;selectedColor?:string;restColor?:string};
/** Selection color is authoritative React state; press motion runs on the UI thread. */
export function SelectionPressable({selected=false,selectedColor='#101747',restColor='#FFFFFF',style,onPressIn,onPressOut,...props}:Props){
 const scale=useSharedValue(1);
 const animated=useAnimatedStyle(()=>({transform:[{scale:scale.get()}]}));
 return <AnimatedPressable {...props} style={[style,{backgroundColor:selected?selectedColor:restColor},animated]} onPressIn={event=>{scale.set(withTiming(.98,{duration:70,reduceMotion:ReduceMotion.System}));onPressIn?.(event);}} onPressOut={event=>{scale.set(withTiming(1,{duration:110,reduceMotion:ReduceMotion.System}));onPressOut?.(event);}}/>;
}
