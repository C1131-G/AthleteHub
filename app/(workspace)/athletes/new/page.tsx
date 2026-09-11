import { PageTitle } from "@/components/page-title";
import { AthleteForm } from "@/features/athlete/components/athlete-form";

const NewAthletePage = () => (
  <>
    <PageTitle marker="new-athlete-title" title="Add athlete" />
    <AthleteForm />
  </>
);

export const metadata = {
  description: "Create an athlete profile in SSAIT Athlete360.",
  title: "Add athlete",
};

export default NewAthletePage;
