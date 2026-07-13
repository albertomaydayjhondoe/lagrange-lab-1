import { useOutletContext } from 'react-router-dom';
import Map from './Map';

interface AcademyContext {
  academy: {
    id: string;
    slug: string;
    name: string;
    [key: string]: unknown;
  };
  academyId: string;
}

export default function AcademyMap() {
  const { academyId } = useOutletContext<AcademyContext>();
  
  // Pass academyId to the original Map component
  return <Map academyId={academyId} />;
}
