import { Button } from "~/components/ui/button";
import { Box, PersonStanding, PlusIcon } from "lucide-react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import CharacterCard from "~/components/selectCharacter/CharacterCard";
import CharacterList from "~/components/selectCharacter/CharacterList";
import { ChatBubbleIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import FeatureCard from "~/components/TopPage/FeatureCard";
import { serverClient } from "~/utils/Supabase/ServerClient";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();

  const supabase = serverClient(request, response);

  return await supabase.from("characters").select("*,postedby(*)").limit(10);
}

export default function Index() {
  const { data } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="bg-background py-12 md:py-20">
          <div className="container max-w-6xl mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold">MRTalk</h1>
              <p className="text-muted-foreground text-lg"></p>
              <div className="flex gap-8">
                <a href="/character/add">
                  <Button variant="secondary">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    キャラクターを追加
                  </Button>
                </a>
                <a href="/character/select">
                  <Button variant="secondary">
                    <Box className="w-4 h-4 mr-2" />
                    モデルを選択
                  </Button>
                </a>
              </div>
              <div className="flex gap-8">
                <a href="https://misskey-hub.net/share/?text=Meta+Quest3%E3%81%A8Web%E3%83%96%E3%83%A9%E3%82%A6%E3%82%B6%E3%81%A0%E3%81%91%E3%81%A7%E3%80%81VRM%E3%82%84MMD%E3%81%AE%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E3%81%A8%E7%8F%BE%E5%AE%9F%E4%B8%96%E7%95%8C%E3%81%A7%E9%9F%B3%E5%A3%B0%E4%BC%9A%E8%A9%B1%E3%82%92%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%82%8BWeb%E3%82%A2%E3%83%97%E3%83%AA+MRTalk&url=https:%2F%2Fmrtalk.vercel.app%2F&visibility=public&localOnly=0">
                  <Button className="bg-green-600">
                    <img
                      src="https://github.com/misskey-dev/assets/blob/main/public/icon.png?raw=true"
                      width={40}
                      height={40}
                      alt="misskey icon"
                    />
                    で共有
                  </Button>
                </a>
                <a href="https://donshare.net/share.html?text=Meta+Quest3%E3%81%A8Web%E3%83%96%E3%83%A9%E3%82%A6%E3%82%B6%E3%81%A0%E3%81%91%E3%81%A7%E3%80%81VRM%E3%82%84MMD%E3%81%AE%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E3%81%A8%E7%8F%BE%E5%AE%9F%E4%B8%96%E7%95%8C%E3%81%A7%E9%9F%B3%E5%A3%B0%E4%BC%9A%E8%A9%B1%E3%82%92%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%82%8BWeb%E3%82%A2%E3%83%97%E3%83%AA+MRTalk&url=https:%2F%2Fmrtalk.vercel.app%2F">
                  <Button className="bg-blue-500">
                    <img
                      src="https://joinmastodon.org/logos/logo-purple.svg"
                      className="mx-2"
                      width={20}
                      height={20}
                      alt="misskey icon"
                    />
                    で共有
                  </Button>
                </a>
              </div>
            </div>
            <div className="relative">
              <img
                src="img/demo.png"
                alt="three-vrm"
                width={600}
                height={600}
                className="mx-auto max-w-full rounded-lg shadow-lg"
              />
            </div>
          </div>
        </section>

        <div className="text-center text-2xl font-bold mt-8">
          3ステップで簡単に会話
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 w-full max-w-6xl mt-4 m-auto">
          <FeatureCard
            step="1"
            title="Githubアカウントでログイン"
            icon={<GitHubLogoIcon className="w-12 h-12" />}
          />
          <FeatureCard
            step="2"
            title="キャラクターを選択"
            icon={<PersonStanding className="w-12 h-12" />}
          />
          <FeatureCard
            step="3"
            title="MRでキャラクターと会話する"
            icon={<ChatBubbleIcon className="w-12 h-12" />}
          />
        </div>

        <CharacterList title="最新のキャラクター">
          {data?.map((character) => {
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
      </main>
    </div>
  );
}
