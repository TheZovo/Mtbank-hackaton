import type { PlanetProgressResponse } from "@mtb/contracts";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { getPlanetMeta } from "../planet-config";
import { colors } from "../../../shared/theme/colors";

interface ConstellationCanvasProps {
  progress: PlanetProgressResponse;
}

const SMALL_STAR_OFFSETS = [
  { x: -6, y: -10 },
  { x: 8, y: -8 },
  { x: 12, y: 2 },
  { x: 4, y: 12 },
  { x: -9, y: 8 },
];

export function ConstellationCanvas({ progress }: ConstellationCanvasProps) {
  const meta = getPlanetMeta(progress.planet_id);
  const width = 300;
  const height = 220;
  const bigStarsFilled = progress.constellation.big_stars.filter(Boolean).length;

  return (
    <View style={styles.container}>
      <Svg height={height} viewBox="0 0 100 100" width={width}>
        {meta.constellation.links.map(([from, to]) => (
          <Line
            key={`${from}-${to}`}
            stroke={colors.borderStrong}
            strokeOpacity={0.7}
            strokeWidth="1.6"
            x1={meta.constellation.points[from]?.x ?? 0}
            x2={meta.constellation.points[to]?.x ?? 0}
            y1={meta.constellation.points[from]?.y ?? 0}
            y2={meta.constellation.points[to]?.y ?? 0}
          />
        ))}
        {meta.constellation.points.map((point, index) => {
          const filled = Boolean(progress.constellation.big_stars[index]);
          const smallStarsForSegment = progress.constellation.segment_small_stars[index] ?? 0;
          return (
            <CircleGroup
              filled={filled}
              key={`${point.x}-${point.y}`}
              point={point}
              segmentIndex={index}
              smallStarsForSegment={smallStarsForSegment}
              totalSmallStars={progress.constellation.small_stars_per_segment}
            />
          );
        })}
        <Circle cx="50" cy="50" fill={meta.accent} fillOpacity={0.08} r={Math.max(18, bigStarsFilled * 6)} />
      </Svg>
    </View>
  );
}

interface CircleGroupProps {
  filled: boolean;
  point: { x: number; y: number };
  segmentIndex: number;
  smallStarsForSegment: number;
  totalSmallStars: number;
}

function CircleGroup({ filled, point, segmentIndex, smallStarsForSegment, totalSmallStars }: CircleGroupProps) {
  return (
    <>
      {Array.from({ length: totalSmallStars }, (_, offsetIndex) => {
        const offset = SMALL_STAR_OFFSETS[offsetIndex] ?? SMALL_STAR_OFFSETS[0];
        const isFilled = offsetIndex < smallStarsForSegment;
        return (
          <Circle
            cx={point.x + offset.x}
            cy={point.y + offset.y}
            fill={isFilled ? colors.warning : colors.surfaceElevated}
            key={`${segmentIndex}-${offsetIndex}`}
            r="1.6"
            stroke={isFilled ? "rgba(248, 214, 109, 0.4)" : colors.border}
            strokeWidth="0.5"
          />
        );
      })}
      <Circle
        cx={point.x}
        cy={point.y}
        fill={filled ? colors.warning : colors.surfaceElevated}
        r="4.8"
        stroke={filled ? "rgba(248, 214, 109, 0.55)" : colors.borderStrong}
        strokeWidth="1.4"
      />
      <Circle cx={point.x} cy={point.y} fill={filled ? colors.white : colors.primarySoft} r="2.3" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
