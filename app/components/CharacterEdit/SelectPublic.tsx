import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export default function SelectPublic() {
  return (
    <Select name="is_public" required>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="公開設定" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="FALSE">非公開</SelectItem>
        <SelectItem value="TRUE">公開</SelectItem>
      </SelectContent>
    </Select>
  );
}
