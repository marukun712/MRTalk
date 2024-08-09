import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Trash } from "lucide-react";
import { Button } from "../ui/button";
import { Form } from "@remix-run/react";

export default function DeleteConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger>
        <Button className="bg-red-500">
          <Trash />
          キャラクターを削除
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center my-5">
            本当にキャラクターを削除しますか?
          </DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Form method="post">
            <input type="hidden" name="action" value="delete" />

            <Button type="submit" className="bg-red-500">
              <Trash />
              キャラクターを削除
            </Button>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
