import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  description: "Log in to your AthleteHub account.",
  title: "Log in",
};

const Page = () => (
  <main className="bg-muted flex h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
    <div className="w-full max-w-sm md:max-w-4xl">
      <LoginForm />
    </div>
  </main>
);

export default Page;
