module.exports = {
  preset: "@react-native/jest-preset",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@react-navigation|react-native-safe-area-context)/)",
  ],
};
