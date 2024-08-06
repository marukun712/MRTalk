export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="text-9xl font-bold text-primary">404</div>
        <h1 className="mt-4 font-bold tracking-tight text-foreground">
          ページが見つかりませんでした
        </h1>
        <p className="mt-4 text-muted-foreground">
          指定したページは、削除されたか非公開になっている可能性があります。
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
