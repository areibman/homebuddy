import { HomeDetail } from './detail';

export const metadata = {
  title: 'Home | Homebuddy',
  description: 'Upload floor plans and photos, then arrange furniture for this home.',
};

export default async function HomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HomeDetail homeId={id} />;
}
