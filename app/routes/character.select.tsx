import { useLoaderData, redirect } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { LoaderFunctionArgs } from "@remix-run/node";
import CharacterCard from "~/components/selectCharacter/CharacterCard";
import CharacterList from "~/components/selectCharacter/CharacterList";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      request,
      response,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: myCharacter } = await supabase
    .from("characters")
    .select("id,name,model_url,postedby")
    .eq("postedby", user.id);

  const { data: favorites } = await supabase
    .from("favorites")
    .select("characters(*)")
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
              key={character.id}
              postedby={character.postedby}
            />
          );
        })}
      </CharacterList>

      <CharacterList title="お気に入りのキャラクター">
        {data?.favorites?.map((favorite) => {
          return (
            <CharacterCard
              id={favorite.characters.id}
              name={favorite.characters.name}
              model_url={favorite.characters.model_url}
              key={favorite.characters.id}
              postedby={favorite.characters.postedby}
            />
          );
        })}
      </CharacterList>
    </div>
  );
}
