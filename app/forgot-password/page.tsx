import type { Metadata } from "next";

import { RecoveryForm } from "@/components/recovery-form";

export const metadata: Metadata = { title: "Forgot password" };

const ForgotPasswordPage = () => <RecoveryForm />;

export default ForgotPasswordPage;
