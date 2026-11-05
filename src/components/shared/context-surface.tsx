import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand, ui } from '@/design/tokens';
/** RN Modal supplies the web focus trap/Escape handling. One surface handles safe areas and keyboards. */
export function ContextSurface({ title, visible, onClose, busy = false, children, closeLabel, footer }: { title: string; visible: boolean; onClose: () => void; busy?: boolean; children: ReactNode; closeLabel?: string; footer?: ReactNode }) {
 const inset = useSafeAreaInsets(), reduced = useReducedMotion(), { width } = useWindowDimensions(), desktop = width >= 768;
 return <Modal visible={visible} transparent animationType={reduced ? 'none' : desktop ? 'fade' : 'slide'} onRequestClose={() => { if (!busy) onClose(); }}>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.scrim, desktop && { justifyContent: 'center', padding: 24 }]}>
   <Pressable style={StyleSheet.absoluteFill} disabled={busy} onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title}`} />
   <View accessibilityViewIsModal accessibilityLabel={title} onAccessibilityEscape={() => { if (!busy) onClose(); }} style={[styles.surface, { maxHeight: '90%', paddingBottom: Math.max(20, inset.bottom), marginTop: inset.top + 16 }, desktop && { borderRadius: ui.radius.dialog, maxWidth: 520, marginTop: 0 }]}>
    {!desktop ? <View style={styles.handle} /> : null}
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{title}</Text>{!footer ? <Pressable disabled={busy} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel ?? `Done with ${title}`} style={styles.close}><Text style={styles.closeText}>Done</Text></Pressable> : null}</View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
    {footer ? <View style={styles.footer}>{footer}</View> : null}
   </View>
  </KeyboardAvoidingView>
 </Modal>;
}
const styles = StyleSheet.create({ scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#080D2A66' }, surface: { width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: brand.page, borderTopLeftRadius: ui.radius.sheet, borderTopRightRadius: ui.radius.sheet, paddingTop: 12 }, handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: brand.border }, heading: { paddingHorizontal: ui.spacing.lg, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { color: brand.navy, fontSize: ui.type.title, lineHeight: 30, fontWeight: '700', letterSpacing: -.5, flex: 1 }, close: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, closeText: { color: brand.navy, fontWeight: '600', fontSize: 13 }, body: { padding: ui.spacing.lg, paddingTop: ui.spacing.md, gap: 16 }, footer: { paddingHorizontal: ui.spacing.lg, gap: 10 } });
