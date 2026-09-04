import { PageTitle } from "@/components/page-title";
import { AthleteForm } from "@/features/athlete/components/athlete-form";

const NewAthletePage = () => (
  <>
    <PageTitle marker="new-athlete-title" title="Add athlete" />
    <AthleteForm />
  </>
);

export const metadata = {
  description: "Create an athlete profile in AthleteHub.",
  title: "Add athlete",
};

export default NewAthletePage;
