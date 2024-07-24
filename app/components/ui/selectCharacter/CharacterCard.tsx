import { useState, useEffect } from "react";
import { getVRMThumbnail } from "~/utils/VRM/getVRMThumbnail";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "~/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select"
import { Form } from "@remix-run/react"
import { Button } from "~/components/ui/button"

type Props = {
    id: string
    name: string
    model_url: string
}

export default function CharacterCard(props: Props) {
    const [thumbnail, setThumbnail] = useState<string>("");

    useEffect(() => {
        const fetchThumbnail = async () => {
            try {
                const thumbnailUrl = await getVRMThumbnail(props.model_url); // VRMモデルのURLからサムネイルを取得する関数
                setThumbnail(thumbnailUrl);
            } catch (error) {
                console.error('Error fetching thumbnail:', error);
            }
        };

        fetchThumbnail();
    }, [props.model_url]);

    return (
        <Card key={props.id} className="md:w-1/4 md:m-5">
            <CardHeader>
                {thumbnail ? (
                    <img src={thumbnail} alt={`${props.name} thumbnail`} className="w-1/2 h-1/2 m-auto" />
                ) : (
                    <p>Loading image...</p>
                )}
            </CardHeader>
            <CardContent>
                <h1 className="text-3xl text-center">{props.name}</h1>
            </CardContent>
            <CardFooter>
                <Form method="post" className="m-auto">
                    <Select name="character" defaultValue={props.id}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Character" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={props.id}>{props.name}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit">このキャラクターを使用</Button>
                </Form>
            </CardFooter>
        </Card>
    );
}
