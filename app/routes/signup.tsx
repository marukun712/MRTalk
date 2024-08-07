import { Button } from "~/components/ui/button";
import { useOutletContext } from "@remix-run/react";
import { SupabaseClient } from "@supabase/auth-helpers-remix";
import { Database } from "database.types";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

export default function SignUp() {
  const { supabase } = useOutletContext<{
    supabase: SupabaseClient<Database>;
  }>();

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
  };

  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <h1 className="text-4xl font-bold text-center py-10">
        TalkWithVRMにサインアップ
      </h1>

      <Button onClick={handleGitHubLogin} className="my-6">
        <GitHubLogoIcon className="mx-2" />
        GitHub Login
      </Button>
    </div>
  );
}
