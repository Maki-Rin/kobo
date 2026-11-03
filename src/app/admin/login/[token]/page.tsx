import LoginLinkPanel from '../../_components/LoginLinkPanel';

export default async function LoginLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <LoginLinkPanel token={token} />;
}
