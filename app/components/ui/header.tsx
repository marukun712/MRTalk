import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "database.types";
import { useNavigate } from "@remix-run/react";

import {
  SearchIcon,
  LogInIcon,
  LogOut,
  UserIcon,
  Box,
  PlusIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { FormEvent } from "react";

type Props = {
  signin: boolean;
  supabase: SupabaseClient<Database>;
  user: User;
};

export default function Header(props: Props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await props.supabase.auth.signOut();

    location.reload();
  };

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    const form = new FormData(evt.target as HTMLFormElement);
    const query = form.get("query") || "";

    if (!query) return;

    navigate(`/search/${query}`);
  };

  return (
    <header className="bg-background shadow-sm sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span>MRTalk</span>
        </a>

        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
          <Input
            placeholder="キャラクターを検索..."
            className="pr-10 rounded-md bg-muted text-muted-foreground"
            name="query"
            id="query"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
        </form>

        <div className="flex items-center gap-4">
          {props.signin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar>
                  <AvatarImage src={props.user.user_metadata.avatar_url} />
                  <AvatarFallback>
                    {props.user.user_metadata.full_name}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <a href={`/profile/${props.user.id}`}>
                    <DropdownMenuItem>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>プロフィール</span>
                    </DropdownMenuItem>
                  </a>
                  <a href="/character/add">
                    <DropdownMenuItem>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      <span>キャラクターを追加する</span>
                    </DropdownMenuItem>
                  </a>
                  <a href="/character/select">
                    <DropdownMenuItem>
                      <Box className="mr-2 h-4 w-4" />
                      <span>自分のキャラクター</span>
                    </DropdownMenuItem>
                  </a>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a href="/login">
              <Button variant="secondary">
                <LogInIcon className="w-4 h-4 mr-2" />
                Login
              </Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
