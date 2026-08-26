import { HomeScreen } from '@/components/redesign/home';

/** Home — Zero / Onboarding (no scheduled meetings). */
export default function HomeEmptyPreviewPage() {
  return <HomeScreen state="empty" schedule={[]} />;
}
