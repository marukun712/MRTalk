import { ReactNode } from "react";
import { Card } from "~/components/ui/card";

type Props = {
  step: string;
  title: string;
  icon: ReactNode;
};

export default function FeatureCard(props: Props) {
  return (
    <Card className="flex flex-col items-center p-6 space-y-4">
      {props.icon}
      <h2 className="text-xl font-semibold">Step {props.step}</h2>
      <p className="text-center">{props.title}</p>
    </Card>
  );
}
