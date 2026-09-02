import { PreviewView } from "./preview-view";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PreviewPostPage({ params }: Props) {
  const { id } = await params;

  return <PreviewView id={id} />;
}
