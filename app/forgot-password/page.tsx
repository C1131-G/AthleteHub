import type { Metadata } from "next";

import { RecoveryForm } from "@/components/recovery-form";

export const metadata: Metadata = { title: "Forgot password | AthleteHub" };

const ForgotPasswordPage = () => <RecoveryForm />;

export default ForgotPasswordPage;
