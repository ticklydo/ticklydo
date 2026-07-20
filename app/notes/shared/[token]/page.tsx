import SharedNoteView from "./SharedNoteView";

export default async function SharedNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedNoteView token={token} />;
}