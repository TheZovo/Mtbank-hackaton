import Svg, { Polygon } from "react-native-svg";
import { colors } from "../theme/colors";

interface StarIconProps {
  size?: number;
  filled?: boolean;
  color?: string;
}

export function StarIcon({ color = colors.primary, filled = true, size = 18 }: StarIconProps) {
  const fill = filled ? color : "transparent";

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Polygon
        fill={fill}
        points="12,2 15,8.8 22,9.3 16.8,14 18.4,21 12,17.2 5.6,21 7.2,14 2,9.3 9,8.8"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}
