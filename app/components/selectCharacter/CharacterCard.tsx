import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { UserIcon } from "lucide-react";

type Props = {
  id: string;
  name: string;
  model_url: string;
  thumbnail_url: string;
  postedby: string;
};

export default function CharacterCard(props: Props) {
  return (
    <a href={`../character/details/${props.id}`}>
      <Card className="bg-background shadow-sm rounded-lg overflow-hidden">
        <CardContent className="p-0">
          <img
            src={props.thumbnail_url}
            alt={`${props.name} thumbnail`}
            width={400}
            height={400}
            className="w-full h-48 object-cover"
          />
        </CardContent>
        <CardFooter className="p-4">
          <h3 className="text-lg font-semibold">{props.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="w-4 h-4" />
            <span>by {props.postedby}</span>
          </div>
        </CardFooter>
      </Card>
    </a>
  );
}
