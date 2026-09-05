import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

const TermsPage = () => (
  <main className="flex min-h-svh items-center justify-center p-6">
    <section className="flex w-full max-w-md flex-col gap-4 text-center">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground">
        AthleteHub is provided as-is for personal training records. Your data
        lives in the local database and its rolling backups only.
      </p>
    </section>
  </main>
);

export default TermsPage;
