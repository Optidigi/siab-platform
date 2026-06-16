import { eyebrowMatcher } from "./eyebrow"
import type { ThemedMatcher } from "../types"

/**
 * Themed-node matchers specific to the ami-care site shape.
 * Add new ami-care-specific matchers to this array.
 */
export const MATCHERS: ThemedMatcher[] = [eyebrowMatcher]
