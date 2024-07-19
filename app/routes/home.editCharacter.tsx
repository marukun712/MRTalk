import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { ActionFunctionArgs } from "@remix-run/node";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";

export async function loader({ request }: ActionFunctionArgs) {
    const response = new Response();

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
        .from('characters')
        .select('id,name,model_url,ending,details')
        .eq('postedby', user?.id);

    return { data };
}

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response();

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    });

    const formData = await request.formData();

    const editModelId = formData.get('edit');
    const deleteModelId = formData.get('delete');

    if (editModelId) {
        const name = formData.get('name');
        const model_url = formData.get('model_url');
        const ending = formData.get('ending') ? formData.get('ending') : null;
        const details = formData.get('details') ? formData.get('details') : null;

        if (typeof name !== "string" || typeof model_url !== "string" || typeof ending !== "string" || typeof details !== "string") return;

        return await supabase
            .from('characters')
            .update({ name, model_url, ending, details })
            .eq('id', editModelId);
    }

    if (deleteModelId) {
        return await supabase
            .from('characters')
            .delete()
            .eq('id', deleteModelId);
    }
}

export default function EditCharacter() {
    const { data } = useLoaderData<typeof loader>();
    const [selectedCharacter, setSelectedCharacter] = useState("");

    const [formValues, setFormValues] = useState({
        name: '',
        model_url: '',
        ending: '',
        details: '',
    });

    const handleSelectChange = (characterId: string) => {
        if (!data) return;

        const character = data.find((char) => char.id === characterId);
        setSelectedCharacter(characterId);
        setFormValues({
            name: character?.name || '',
            model_url: character?.model_url || '',
            ending: character?.ending || '',
            details: character?.details || '',
        });
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormValues((prevValues) => ({
            ...prevValues,
            [name]: value,
        }));
    };

    return (
        <div>
            <Form method="post" className="py-10">
                <Select name="edit" onValueChange={handleSelectChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Character" />
                    </SelectTrigger>
                    <SelectContent>
                        {data?.map((character) => {
                            return (
                                <SelectItem value={character.id} key={character.id}>{character.name}</SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
                <div>
                    <label htmlFor="name">キャラクター名</label>
                    <Input type="text" name="name" id="name" value={formValues.name} onChange={handleInputChange} required />
                </div>
                <div>
                    <label htmlFor="model_url">モデルURL</label>
                    <Input type="text" name="model_url" id="model_url" value={formValues.model_url} onChange={handleInputChange} pattern="https?://\S+" title="URLは、httpsで始まる絶対URLで記入してください。" required />
                </div>
                <div>
                    <label htmlFor="ending">語尾</label>
                    <Input type="text" name="ending" id="ending" value={formValues.ending} onChange={handleInputChange} />
                </div>
                <div>
                    <label htmlFor="details">詳細設定、指示</label>
                    <Input type="text" name="details" id="details" value={formValues.details} onChange={handleInputChange} />
                </div>

                <Button type="submit">Edit Character</Button>
            </Form>

            <Form method="post" className="py-10">
                <Select name="delete">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Character" />
                    </SelectTrigger>
                    <SelectContent>
                        {data?.map((character) => {
                            return (
                                <SelectItem value={character.id} key={character.id}>{character.name}</SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>

                <Button type="submit">Delete Character</Button>
            </Form>
        </div>
    );
}
