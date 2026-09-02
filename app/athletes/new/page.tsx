import { AthleteForm } from "@/features/athlete/components/athlete-form";
import { AthletePageTitle } from "@/features/athlete/components/athlete-page-title";

const NewAthletePage = () => (
  <>
    <AthletePageTitle marker="new-athlete-title" title="Add athlete" />
    <AthleteForm />
  </>
);

export const metadata = {
  description: "Create an athlete profile in AthleteHub.",
  title: "Add athlete | AthleteHub",
};

export default NewAthletePage;
