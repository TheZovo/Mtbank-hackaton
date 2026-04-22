import { Animated as ReactNativeAnimated } from "react-native";

function useSharedValue<T>(value: T) {
  return { value };
}

function useAnimatedStyle<T>(updater: () => T): T {
  return updater();
}

function withTiming<T>(value: T) {
  return value;
}

function withSpring<T>(value: T) {
  return value;
}

function withSequence<T>(...values: T[]) {
  return values[values.length - 1];
}

const Animated = {
  View: ReactNativeAnimated.View,
  createAnimatedComponent: ReactNativeAnimated.createAnimatedComponent,
};

export { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming };
export default Animated;
