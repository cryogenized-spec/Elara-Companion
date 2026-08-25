import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { workspaceService } from '../../services/workspaceService';

export type WorkspaceControllerArgs = {
  setCurrentView: Dispatch<SetStateAction<'chat' | 'workspace'>>;
};

export function useWorkspaceController({ setCurrentView }: WorkspaceControllerArgs) {
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  const handleOpenArtifact = useCallback((artifactId: string) => {
    workspaceService.setActiveArtifact(artifactId);
    setActiveArtifactId(artifactId);
    setCurrentView('workspace');
  }, [setCurrentView]);

  const handleSelectArtifact = useCallback((artifactId: string) => {
    workspaceService.setActiveArtifact(artifactId);
    setActiveArtifactId(artifactId);
  }, []);

  const handleBackToChat = useCallback(() => {
    setCurrentView('chat');
  }, [setCurrentView]);

  return { activeArtifactId, handleOpenArtifact, handleSelectArtifact, handleBackToChat };
}
