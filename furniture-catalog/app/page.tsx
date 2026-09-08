import CityExplorer from './city/explorer';

export const metadata = {
  title: 'Homebuddy | San Francisco',
  description: 'Explore San Francisco homes, preview their floor plans, and furnish your apartment with the Homebuddy 3D editor.',
};

export default function Home() {
  return <CityExplorer />;
}
