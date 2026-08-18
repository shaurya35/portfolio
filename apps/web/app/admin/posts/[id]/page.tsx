import { EditPostView } from "./edit-post-view";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;

  return <EditPostView id={id} />;
}
