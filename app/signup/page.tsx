import type { Metadata } from "next";

import { AuthPlaceholder } from "@/components/auth-placeholder";

export const metadata: Metadata = { title: "Sign up | AthleteHub" };

const SignupPage = () => <AuthPlaceholder title="Create your account" />;

export default SignupPage;
