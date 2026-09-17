import { HomesList } from './list';

export const metadata = {
  title: 'Your homes | Homebuddy',
  description: 'Upload floor plans and photos for each home on your plan.',
};

export default function HomesPage() {
  return <HomesList />;
}
