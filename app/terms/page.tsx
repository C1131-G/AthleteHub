import type { Metadata } from "next";

import { AuthPlaceholder } from "@/components/auth-placeholder";

export const metadata: Metadata = { title: "Terms of Service | AthleteHub" };

const TermsPage = () => <AuthPlaceholder title="Terms of Service" />;

export default TermsPage;
