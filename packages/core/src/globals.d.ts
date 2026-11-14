/**
 * Web-standard globals that every runtime of this package provides (browsers,
 * Node.js, React Native with react-native-url-polyfill). Declared here because
 * packages/core compiles without DOM or Node type libraries; only core's own
 * typecheck sees this file, the apps use their full definitions.
 */
declare class URL {
  constructor(url: string, base?: string);
  readonly origin: string;
  readonly protocol: string;
}
