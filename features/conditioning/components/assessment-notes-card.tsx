import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AssessmentNotesCard = ({
  title,
  text,
}: {
  text: string;
  title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="whitespace-pre-wrap">{text || "None recorded."}</p>
    </CardContent>
  </Card>
);
