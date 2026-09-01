import type { Metadata } from "next";

import { AuthPlaceholder } from "@/components/auth-placeholder";

export const metadata: Metadata = { title: "Forgot password | AthleteHub" };

const ForgotPasswordPage = () => <AuthPlaceholder title="Forgot password" />;

export default ForgotPasswordPage;
