import {
  epic,
  feature as allureFeature,
  story,
  severity,
  description as allureDescription,
  type SeverityValues,
} from 'allure-js-commons';

export { step, attachment, ContentType, Severity } from 'allure-js-commons';
export type { SeverityValues } from 'allure-js-commons';

/**
 * Sets the four standard Allure labels that every test in this suite needs.
 * The epic is always 'Saucedemo E2E'; callers supply the feature, story,
 * severity, and an optional description.
 */
export async function annotate(
  featureName: string,
  storyName: string,
  level: SeverityValues,
  desc?: string,
): Promise<void> {
  await epic('Saucedemo E2E');
  await allureFeature(featureName);
  await story(storyName);
  await severity(level);
  if (desc !== undefined) await allureDescription(desc);
}
