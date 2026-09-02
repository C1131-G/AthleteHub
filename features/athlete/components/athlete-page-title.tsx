/**
 * The shell owns the back control, so pages own only their title. Keeping it
 * in one component is what stops a page and its form from both rendering one.
 */
export const AthletePageTitle = ({
  marker,
  title,
}: {
  marker: string;
  title: string;
}) => (
  <h1
    data-testid={marker}
    className="mb-6 text-3xl font-semibold tracking-tight text-balance"
  >
    {title}
  </h1>
);
