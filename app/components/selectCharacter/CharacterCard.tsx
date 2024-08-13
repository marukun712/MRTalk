import { useState, useEffect, useRef, useCallback } from "react";
import { getVRMThumbnail } from "~/utils/VRM/getVRMThumbnail";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { UserIcon } from "lucide-react";
import { useOutletContext } from "@remix-run/react";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "database.types";

type Props = {
  id: string;
  name: string;
  model_url: string;
  postedby: string;
};

export default function CharacterCard(props: Props) {
  const [thumbnail, setThumbnail] = useState<string>("");
  const [userName, SetUserName] = useState<string>("");

  const { supabase } = useOutletContext<{
    supabase: SupabaseClient<Database>;
  }>();
  const created = useRef(false);

  const setCardImage = useCallback(async () => {
    if (created.current) return;
    created.current = true;

    const fetchThumbnail = async () => {
      try {
        const thumbnailUrl = await getVRMThumbnail(props.model_url); // VRMモデルのURLからサムネイルを取得する関数
        setThumbnail(thumbnailUrl);
      } catch (error) {
        console.error("Error fetching thumbnail:", error);
      }
    };

    fetchThumbnail();
  }, [props.model_url]);

  const setCardText = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", props.postedby)
      .single();

    if (!data) return;

    SetUserName(data.full_name);
  }, [props.postedby, supabase]);

  useEffect(() => {
    setCardImage();
  }, [setCardImage]);

  useEffect(() => {
    setCardText();
  }, [setCardText]);

  return (
    <a href={`../character/details/${props.id}`}>
      <Card className="bg-background shadow-sm rounded-lg overflow-hidden">
        <CardContent className="p-0">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`${props.name} thumbnail`}
              width={400}
              height={400}
              className="w-full h-48 object-cover"
            />
          ) : (
            <p>Loading image...</p>
          )}
        </CardContent>
        <CardFooter className="p-4">
          <h3 className="text-lg font-semibold">{props.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="w-4 h-4" />
            <span>by {userName}</span>
          </div>
        </CardFooter>
      </Card>
    </a>
  );
}
