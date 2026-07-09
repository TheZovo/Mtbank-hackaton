import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function ProgressRing({
  color = colors.primary,
  label,
  size = 118,
  strokeWidth = 10,
  value,
}: ProgressRingProps) {
  const clampedValue = Math.max(0, Math.min(value, 100));
  const center = size / 2;
  const radius = size / 2 - strokeWidth / 2;
  const progressEndAngle = 180 - (180 * clampedValue) / 100;
  const trackPath = describeArc(center, center, radius, 180, 0);
  const progressPath = describeArc(center, center, radius, 180, progressEndAngle);
  const height = center + strokeWidth;

  return (
    <View style={[styles.wrapper, { width: size, height }]}>
      <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>
        <Path d={trackPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeLinecap="round" strokeWidth={strokeWidth} />
        <Path d={progressPath} fill="none" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      </Svg>
      <View style={styles.labelWrap}>
        <Text style={styles.value}>{clampedValue}%</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  labelWrap: {
    alignItems: "center",
    bottom: 0,
    position: "absolute",
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
