import { ProjectDetailScreen } from '@/components/redesign/project-detail/ProjectDetailScreen';

/**
 * Project Detail — "Product launch" (Figma 450:25161).
 * Renders within the (redesign) shell; the layout auto-activates the Library
 * rail item because the route path contains "/project".
 */
export default function ProjectDetailPage() {
  return <ProjectDetailScreen />;
}
