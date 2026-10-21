import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./ui";

/** Court booking sections belong inside Book, beneath the page header. */
export function BookingTabs({ active }: { active: "book" | "bookings" }) {
  return (
    <View
      style={styles.tabs}
      accessibilityRole="tablist"
      accessibilityLabel="Court booking sections"
    >
      {(
        [
          { id: "book", label: "Book", href: "/(member)/book" },
          {
            id: "bookings",
            label: "My bookings",
            href: "/(member)/bookings",
          },
        ] as const
      ).map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === item.id }}
          accessibilityLabel={item.label}
          testID={`court-tab-${item.id}`}
          onPress={() => {
            if (active !== item.id) router.replace(item.href);
          }}
          style={[styles.tab, active === item.id && styles.selected]}
        >
          <Text
            style={[styles.label, active === item.id && styles.selectedLabel]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.soft,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selected: { backgroundColor: colors.navy },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  selectedLabel: { color: "#FFFFFF" },
});
