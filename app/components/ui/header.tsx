import { SearchIcon, LogInIcon, LogOutIcon } from 'lucide-react'
import { Button } from "~/components/ui/button"
import { Input } from '~/components/ui/input'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from 'database.types'

type Props = {
    signin: boolean
    supabase: SupabaseClient<Database>
}

export default function Header(props: Props) {
    const handleLogout = async () => {
        await props.supabase.auth.signOut()

        location.reload();
    }

    return (
        <header className="bg-background shadow-sm sticky top-0 z-50">
            <div className="container max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                <a href="/" className="flex items-center gap-2 text-lg font-semibold" >
                    <span>TalkWithVRM</span>
                </a>
                <form className="relative w-full max-w-md">
                    <Input
                        type="search"
                        placeholder="キャラクターを検索..."
                        className="pr-10 rounded-md bg-muted text-muted-foreground"
                    />
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2">
                        <SearchIcon className="h-5 w-5" />
                    </Button>
                </form>

                <div className="flex items-center gap-4">
                    {props.signin ?
                        <Button onClick={handleLogout}>
                            <LogOutIcon className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                        :
                        <a href='/login'>
                            <Button variant="secondary">
                                <LogInIcon className="w-4 h-4 mr-2" />
                                Login
                            </Button>
                        </a>
                    }
                </div>
            </div>
        </header>
    )
}