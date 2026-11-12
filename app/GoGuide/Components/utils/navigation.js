/**
 * Back that never dead-ends: pages opened from a link or after a browser refresh have no
 * navigation history, so router.back() would do nothing. Fall back to a sensible screen.
 */
export function goBack(router, fallback = "/(tabs)/mytrip") {
  if (router?.canGoBack?.()) router.back();
  else router?.replace?.(fallback);
}

export default goBack;
