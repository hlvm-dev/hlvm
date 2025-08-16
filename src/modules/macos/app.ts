/**
 * App Module - Native macOS Application Control
 * 
 * CRITICAL XCODE BUILD ISSUE:
 * ===========================
 * This file demonstrates a major Xcode build limitation that affects all HLVM modules.
 * 
 * THE PROBLEM:
 * - Source files are organized: modules/apps/safari.ts, modules/apps/finder.ts, etc.
 * - Xcode's "Copy Files" build phase flattens ALL TypeScript files to Resources/
 * - Result: Resources/safari.ts, Resources/finder.ts (NOT Resources/apps/safari.ts)
 * 
 * THE CONFUSION:
 * - Developers see: modules/apps/safari.ts in source
 * - But must import: './safari.ts' (not './apps/safari.ts')
 * - Source structure doesn't match runtime structure!
 * 
 * HOW IT WORKS:
 * 1. During Xcode build, all .ts files are copied individually to Resources/
 * 2. Directory structure is lost - everything becomes flat
 * 3. At runtime, all modules exist at the same level
 * 4. Imports must use the flattened paths, not source paths
 * 
 * DEVELOPER WARNING:
 * If you create subdirectories under modules/, your imports will break!
 * The error will be: "Module not found" with no clear explanation.
 * 
 * EXAMPLE:
 * - Create: modules/utils/helper.ts
 * - Import: './utils/helper.ts' will FAIL
 * - Must use: './helper.ts' instead
 * 
 * This is extremely unintuitive and will confuse new developers.
 * Until Xcode build process is fixed, avoid subdirectories or understand this limitation.
 */

// Detect if we're in development (source) or production (Xcode build)
const isDevelopment = !Deno.execPath().includes('/HLVM.app/Contents/Resources/');

// Dynamic imports based on environment
const importPath = (name: string) => isDevelopment ? `./apps/${name}.ts` : `./${name}.ts`;

// Import all apps
const safari = await import(importPath('safari')).then(m => m.default);
const textEdit = await import(importPath('textedit')).then(m => m.default);
const finder = await import(importPath('finder')).then(m => m.default);
const terminal = await import(importPath('terminal')).then(m => m.default);
const xcode = await import(importPath('xcode')).then(m => m.default);
const systemPreferences = await import(importPath('systempreferences')).then(m => m.default);
const mail = await import(importPath('mail')).then(m => m.default);
const calendar = await import(importPath('calendar')).then(m => m.default);
const notes = await import(importPath('notes')).then(m => m.default);
const reminders = await import(importPath('reminders')).then(m => m.default);
const messages = await import(importPath('messages')).then(m => m.default);
const music = await import(importPath('music')).then(m => m.default);
const preview = await import(importPath('preview')).then(m => m.default);
const activitymonitor = await import(importPath('activitymonitor')).then(m => m.default);
const appstore = await import(importPath('appstore')).then(m => m.default);
const trash = await import(importPath('trash')).then(m => m.default);
const diskutility = await import(importPath('diskutility')).then(m => m.default);
const console = await import(importPath('console')).then(m => m.default);
const keychain = await import(importPath('keychain')).then(m => m.default);
const photos = await import(importPath('photos')).then(m => m.default);
const shortcuts = await import(importPath('shortcuts')).then(m => m.default);
const books = await import(importPath('books')).then(m => m.default);
const maps = await import(importPath('maps')).then(m => m.default);

export default {
  // System & Utilities
  systemPreferences,
  finder,
  terminal,
  console,
  activityMonitor: activitymonitor,
  diskUtility: diskutility,
  keychain,
  trash,
  
  // Productivity
  mail,
  calendar,
  notes,
  reminders,
  shortcuts,
  
  // Media & Content
  preview,
  photos,
  music,
  books,
  
  // Communication
  messages,
  
  // Internet & Navigation
  safari,
  maps,
  appStore: appstore,
  
  // Development
  xcode,
  textEdit
};