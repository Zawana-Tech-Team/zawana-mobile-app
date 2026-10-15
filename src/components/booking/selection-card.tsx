import { Pressable, StyleSheet, Text, View } from "react-native";
import { dateLabel, money } from "@/booking/domain";
import type { Slot } from "@/booking/types";
import { AuthIcon } from "@/components/auth/ui/auth-icon";
import { colors, ui } from "./ui";
export function SelectionCard({
  slot,
  index,
  onRemove,
  price = false,
}: {
  slot: Slot;
  index: number;
  onRemove?: () => void;
  price?: boolean;
}) {
  return (
    <View style={[ui.card, ui.row]}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>
      <View style={ui.copy}>
        <Text style={styles.date}>{dateLabel(slot.date)}</Text>
        <Text style={ui.body}>{slot.courtName}</Text>
        <Text style={ui.body}>{slot.time}</Text>
        {price ? <Text style={styles.price}>{money(slot.price)}</Text> : null}
      </View>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${slot.courtName}, ${slot.time}, ${slot.date}`}
          style={styles.remove}
          testID={`remove-slot-${index}`}
        >
          <AuthIcon name="trash" size={23} />
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  number: {
    height: 42,
    width: 42,
    borderRadius: 13,
    backgroundColor: colors.soft,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: { fontSize: 22, fontWeight: "700", color: colors.navy },
  date: { fontSize: 16, fontWeight: "700", color: colors.navy },
  price: { fontSize: 16, fontWeight: "700", color: colors.navy },
  remove: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { fontSize: 28, color: colors.navy },
});
