import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "database.types";

export const getFileURL = async (
  path: string,
  supabase: SupabaseClient<Database>,
) => {
  const { data } = await supabase
    .storage
    .from("models")
    .getPublicUrl(path);

  return data.publicUrl;
};
