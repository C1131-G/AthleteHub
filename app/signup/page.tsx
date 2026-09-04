import type { Metadata } from "next";

import { SetupForm } from "@/components/setup-form";

export const metadata: Metadata = { title: "Sign up" };

const SignupPage = () => <SetupForm />;

export default SignupPage;
