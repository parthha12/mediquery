import { redirect } from 'next/navigation';

export default async function PatientDocumentsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/patients/${id}`);
}
