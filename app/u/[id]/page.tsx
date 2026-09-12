import { PhoneView } from "@/components/usher/PhoneView";

export default async function UsherPage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  return <PhoneView usherId={id} />;
}
