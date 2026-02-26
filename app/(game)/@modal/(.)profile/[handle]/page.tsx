import ProfileModal from "@/components/Profile/ProfileModal";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfileModalRoute({ params }: PageProps) {
  const { handle } = await params;
  return <ProfileModal handle={handle} />;
}