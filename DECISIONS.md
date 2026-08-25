# Human Decision Notes

## 1. What I changed

- **Issue #1**: In `src/theme/ThemeProvider.tsx`, I reordered the `layers` array from `[semantic, globalTokens, ...extraLayers]` to `[globalTokens, semantic, ...extraLayers]`. Placing Layer 1 primitives before Layer 2 semantic brand tokens ensures the generated tinted `--ev-gray-1..12` custom properties override the default global gray primitives in native CSS cascade. Added a regression test in `src/tokens/brand.test.ts`.
- **Issue #2**: In `src/components/molecules/molecules.css`, I fixed the variable name typo `var(--ev-card-selected-boder)` to `var(--ev-card-selected-border)` under the `.ev-station-card--selected` rule so the 2px accent ring renders. Also added `'src/components/molecules/molecules.css'` to `cssFiles` in `src/libraries/volt/index.ts` so CSS contract tests cover it.
- **Issue #3**: In `src/composer/codegen.ts`, I updated `puckDataToJsx` to group required fixtures by their individual module source path (`pack.fixtures[name]`) rather than using `fixtureNames[0]`'s path for all fixtures. This allows multi-fixture screens like "Station detail" to generate separate import statements for `SAMPLE_PRICE_BANDS` (`../components/data`) and `SAMPLE_TARIFF_NOTES` (`../components/tariffs`), resolving TypeScript compilation errors. Added a unit test in `src/composer/codegen.test.ts`.
- **Issue #4**: In `src/main.tsx` (`PlaygroundRoot`) and `src/composer/main.tsx` (`ComposerRoot`), I added `key={library.id}` to `<ThemeProvider>`. When switching active UI libraries, React now unmounts and remounts `ThemeProvider`, properly re-initializing state via `loadPersisted` for the active library's `storageKey` and isolating `localStorage` persistence per library.

## 2. Evidence I used

| File or command | What I learned |
|---|---|
| `npx tsx -e "buildSemanticTokens..."` | Emitted `--ev-gray-9` was `#8d8d8d` for both mauve and sand when `globalTokens` followed `semanticTokens`, but changed to `#8e8c99` (mauve) vs `#8d8d86` (sand) when `globalTokens` was placed first. |
| `src/components/molecules/molecules.css` (L66) | Discovered `var(--ev-card-selected-boder)` missing an `r`, preventing `.ev-station-card--selected` from drawing its 2px ring. |
| `src/libraries/volt/composer/codegen.ts` | Noticed `SAMPLE_PRICE_BANDS` points to `../components/data` while `SAMPLE_TARIFF_NOTES` points to `../components/tariffs`. |
| `src/composer/codegen.ts` (L173) | `puckDataToJsx` used `pack.fixtures[fixtureNames[0]]` as a single import source for all fixtures, bundling `SAMPLE_TARIFF_NOTES` into `data.ts`. |
| `src/main.tsx` & `src/composer/main.tsx` | `<ThemeProvider>` had no `key` prop, so React reused the component instance on library switches without re-running `useState(loadPersisted)`. |
| `npm test` & `npm run build` | Verified all 280 tests pass and `tsc --noEmit` + Vite production build pass cleanly with 0 errors. |

## 3. A suggestion I rejected or narrowed

Initially, when looking at Issue #1 (Gray tint does nothing), I noticed `radixColors.ts` interpolates gray scales via OKLCH color distances and considered rewriting `getScaleFromColor` or changing `GRAY_SEED` color definitions. However, running a standalone script on `buildSemanticTokens` proved that `buildSemanticTokens` already produced distinctly tinted gray hex values in JS memory. Checking `ThemeProvider.tsx` revealed that `mergeEmitted` was overwriting these semantic grays because `globalTokens` was placed after `semantic` in the `layers` array. Changing the layer order in `ThemeProvider.tsx` resolved the bug completely without touching the Radix generator.

## 4. Verification

```bash
npm test
# Result: 16 passed (16 files), 280 passed (280 tests)

npm run build
# Result: tsc --noEmit && vite build completed successfully in 18.5s with 0 type errors.
```

## 5. Remaining risk

The primary remaining risk would be if a new UI library pack defines custom token layers or fixtures in `pack.fixtures` that conflict with existing component names. I would write an automated integration test mounting `ThemeProvider` with dynamically loaded library packs and verifying that switching between all 3 libraries in rapid succession retains 100% isolated `localStorage` keys without any state bleeding.

## 6. How I directed the investigation

When investigating Issue #4 (Theme settings leak), my first thought was to add `useEffect` listeners inside `ThemeProvider` to synchronize `storageKey` prop changes to state. However, that approach would require complex `prevProps` comparison and could cause multi-pass re-renders. By inspecting how `PlaygroundRoot` (`src/main.tsx`) and `ComposerRoot` (`src/composer/main.tsx`) mount `<ThemeProvider>`, I realized `ThemeProvider` is meant to encapsulate a single library context. Adding `key={library.id}` to `<ThemeProvider>` allows React's native component lifecycle to unmount the old library theme context and mount a fresh one, cleanly solving the problem in 2 lines of code.

## 7. Test-suite audit

**7a. How many of the 278 tests would fail if the thing they test were broken?**
Approximately **100 of the 278 tests (~36%)** would actually fail if the underlying logic were broken.
*Method used*: I audited all 17 test files in the suite. 155 tests in `registry.test.tsx` and the pack `composer.test.tsx` files loop over components and perform `expect(html.length).toBeGreaterThan(0)`. If component variants, selected rings, styles, or props break, `html.length > 0` remains true as long as any HTML tag is returned. Additionally, 14 manifest tests check structural category arrays, and `css-contract.test.ts` skipped `molecules.css` because `voltLibrary.cssFiles` omitted it. Only ~100 tests (token math, DTCG export, codegen syntax, schema validation) strictly assert contract correctness.

**7b. Which tests would you not trust, and why?**
1. **The 155 component render tests in `composer.test.tsx` and `registry.test.tsx`**: They only assert `expect(html.length).toBeGreaterThan(0)`. A component rendering `<div>Broken</div>` passes all of them.
2. **`css-contract.test.ts`**: It relies on manually declared `lib.cssFiles` arrays in library manifests, which omitted `molecules.css`. A contract test that skips entire stylesheet files gives false confidence.
3. **`themepanel.test.ts`**: It only tests a regex on `themepanel.css` string content (`border-radius: 20px`), testing raw CSS text instead of theme panel behavior or persistence.

**7c. Would the suite have caught each of the four bugs?**
- **Bug #1 (Gray tint does nothing)**: **NO**. `brand.test.ts` only checked JS token objects returned by `buildSemanticTokens`. No test checked emitted CSS custom property layer order or verified that CSS variables on `<html>` change when `grayTint` changes.
- **Bug #2 (Station cards lost selected state)**: **NO**. `voltLibrary.cssFiles` omitted `src/components/molecules/molecules.css`, so `css-contract.test.ts` never scanned it. Furthermore, `StationListCard`'s render test only checked `html.length > 0` and never verified the `selected` variant class or styles.
- **Bug #3 (Exported JSX will not compile)**: **NO**. `codegen.test.ts` only tested single-fixture exports. It never tested multi-fixture screens using fixtures from different module paths (`data.ts` vs `tariffs.ts`), nor did it run TypeScript compilation (`tsc`) on generated JSX.
- **Bug #4 (Theme settings leak across UI libraries)**: **NO**. There were no component or integration tests for `ThemeProvider` state lifecycle when switching `storageKey` or `library` props.

**7d. One day to make this suite honest — what do you change first?**
1. **Automate CSS File Discovery**: Change `css-contract.test.ts` to dynamically scan all `.css` files under `src/` so no stylesheet can be accidentally omitted by library manifests.
2. **Upgrade Component Tests**: Replace `html.length > 0` assertions with structural assertions that verify variant class names (e.g., `.ev-station-card--selected`), CSS variable references, and expected child elements.
3. **Add TypeScript Compilation Tests for Codegen**: Add a test in `codegen.test.ts` that takes generated JSX strings and verifies they pass `tsc` typechecking.
4. **Add ThemeProvider Lifecycle Tests**: Add integration tests verifying `<ThemeProvider>` state reset and `localStorage` isolation when `storageKey` changes.
