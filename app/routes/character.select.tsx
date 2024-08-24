import { useLoaderData, redirect } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/node";
import CharacterCard from "~/components/selectCharacter/CharacterCard";
import CharacterList from "~/components/selectCharacter/CharacterList";
import { serverClient } from "~/utils/Supabase/ServerClient";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();

  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: myCharacter } = await supabase
    .from("characters")
    .select("*,postedby(*)")
    .eq("postedby", user.id);

  const { data: favorites } = await supabase
    .from("favorites")
    .select("characters(*, postedby(*))")
    .eq("user_id", user.id);

  return { myCharacter, favorites };
}

export default function SelectCharacter() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <CharacterList title="あなたのキャラクター">
        {data?.myCharacter?.map((character) => {
          return (
            <CharacterCard
              id={character.id}
              name={character.name}
              model_url={character.model_url}
              thumbnail_url={character.thumbnail_url}
              key={character.id}
              postedby={character.postedby.full_name}
            />
          );
        })}
      </CharacterList>

      <CharacterList title="お気に入りのキャラクター">
        {data?.favorites?.map((favorite: any) => {
          return (
            <CharacterCard
              id={favorite.characters.id}
              name={favorite.characters.name}
              model_url={favorite.characters.model_url}
              thumbnail_url={favorite.characters.thumbnail_url}
              key={favorite.characters.id}
              postedby={favorite.characters.postedby.full_name}
            />
          );
        })}
      </CharacterList>
    </div>
  );
}
