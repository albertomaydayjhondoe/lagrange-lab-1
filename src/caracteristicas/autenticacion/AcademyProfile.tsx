import { useOutletContext } from 'react-router-dom';
import Profile from './Profile';

interface AcademyContext {
  academyId: string;
}

export default function AcademyProfile() {
  const { academyId } = useOutletContext<AcademyContext>();
  return <Profile academyId={academyId} />;
}
