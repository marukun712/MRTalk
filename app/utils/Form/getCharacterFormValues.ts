export const getCharacterFormValues = (form: FormData) => {
  const name = form.get("name") as string;
  const model = form.get("model") as File;
  const is_public = form.get("is_public") as string;
  const firstperson = form.get("firstperson") as string || null;
  const ending = form.get("ending") as string || null;
  const details = form.get("details") as string || null;
  const speaker_id = Number(form.get("speakerID"));

  return { name, model, is_public, firstperson, ending, details, speaker_id };
};
