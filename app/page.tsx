import { redirect } from "next/navigation";

export const metadata = { title: "SSAIT Athlete360" };

/**
 * Authentication happens on the local login screen in the Electron shell, so
 * the app itself has no login route. The root sends direct hits into the
 * workspace.
 */
const Page = () => {
  redirect("/dashboard");
};

export default Page;
