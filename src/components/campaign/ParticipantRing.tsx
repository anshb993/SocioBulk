import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../theme/colors";

type Props = { joined: number; max: number; size?: number };

export function ParticipantRing({ joined, max, size = 88 }: Props) {
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(joined / max, 1) : 0;
  const mid = size / 2;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityLabel={`${joined} of ${max} residents joined`}
    >
      <Svg width={size} height={size}>
        <Circle cx={mid} cy={mid} r={r} stroke={colors.tint} strokeWidth={stroke} fill="none" />
        <Circle
          cx={mid} cy={mid} r={r}
          stroke={colors.primary} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          rotation="-90"
          origin={`${mid}, ${mid}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        <Text className="text-xl font-bold text-ink">{joined}</Text>
        <Text className="text-xs text-muted">of {max}</Text>
      </View>
    </View>
  );
}