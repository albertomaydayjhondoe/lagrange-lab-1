import { useOutletContext } from 'react-router-dom';
import Podcast from './Podcast';

interface AcademyContext {
  academyId: string;
}

export default function AcademyPodcast() {
  const { academyId } = useOutletContext<AcademyContext>();
  return <Podcast academyId={academyId} />;
}
