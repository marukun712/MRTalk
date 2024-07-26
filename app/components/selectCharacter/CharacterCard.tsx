import { useState, useEffect } from "react";
import { getVRMThumbnail } from "~/utils/VRM/getVRMThumbnail";
import {
    Card,
    CardContent,
    CardHeader,
} from "~/components/ui/card"

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
        <a href={`../character/${props.id}`} className="md:w-1/4 md:m-5">
            <Card key={props.id}>
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
            </Card>
        </a>
    );
}
