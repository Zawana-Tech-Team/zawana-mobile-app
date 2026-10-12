import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type BrandLogoProps = { size?: number; style?: StyleProp<ViewStyle> };

export function BrandLogo({ size = 140, style }: BrandLogoProps) {
  return (
    <View pointerEvents="none" style={[styles.frame, { width: size, height: size }, style]}>
      <Image
        source={require('../../../../assets/zawana logo png.png')}
        contentFit="contain"
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityLabel="The ZAWANA, established 2022"
      />
    </View>
  );
}

const styles = StyleSheet.create({ frame: { alignSelf: 'center', backgroundColor: 'transparent' } });
