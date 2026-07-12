import { useOutletContext } from 'react-router-dom';
import Lab from './Lab';

interface AcademyContext {
  academyId: string;
}

export default function AcademyLab() {
  const { academyId } = useOutletContext<AcademyContext>();
  return <Lab academyId={academyId} />;
}
