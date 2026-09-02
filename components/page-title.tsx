/**
 * The one page heading per route. Pages own their title so a feature component
 * never renders a second one.
 */
export const PageTitle = ({
  marker,
  title,
}: {
  marker?: string;
  title: string;
}) => (
  <h1
    data-testid={marker}
    className="mb-6 text-3xl font-semibold tracking-tight text-balance"
  >
    {title}
  </h1>
);
