interface Props {
  message: string | null;
}

export function ErrorBanner({ message }: Props) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}
