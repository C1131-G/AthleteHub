import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const PrivacyPage = () => (
  <main className="flex min-h-svh items-center justify-center p-6">
    <section className="flex w-full max-w-md flex-col gap-4 text-center">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground">
        SSAIT Athlete360 stores everything on this computer. No training data
        leaves it, and there are no accounts on any server.
      </p>
    </section>
  </main>
);

export default PrivacyPage;
