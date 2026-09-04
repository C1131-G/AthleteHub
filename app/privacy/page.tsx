import type { Metadata } from "next";

import { AuthPlaceholder } from "@/components/auth-placeholder";

export const metadata: Metadata = { title: "Privacy Policy" };

const PrivacyPage = () => <AuthPlaceholder title="Privacy Policy" />;

export default PrivacyPage;
