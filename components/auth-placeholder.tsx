import Link from "next/link";

interface AuthPlaceholderProps {
  title: string;
}

const AuthPlaceholder = ({ title }: AuthPlaceholderProps) => (
  <main className="flex min-h-svh items-center justify-center p-6">
    <section className="flex w-full max-w-md flex-col gap-4 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">
        This AthleteHub page is ready for the next authentication step.
      </p>
      <Link href="/login" className="underline underline-offset-4">
        Return to log in
      </Link>
    </section>
  </main>
);

export { AuthPlaceholder };
