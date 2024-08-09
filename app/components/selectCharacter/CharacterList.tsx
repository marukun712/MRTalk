import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function CharacterList(props: Props) {
  return (
    <section className="py-6 md:py-12">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-bold">{props.title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
          {props.children}
        </div>
      </div>
    </section>
  );
}
