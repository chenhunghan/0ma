import { TerminalSession } from './TerminalSession';
import { LimaConfig } from './LimaConfig';

export interface InstanceUIState {
    activeTab: 'lima' | 'k8s' | 'config';
    panelHeight: number;
    k8s: {
        showNodePanel: boolean;
        showPodsPanel: boolean;
        showServicesPanel: boolean;
        sessions: TerminalSession[];
        activeSessionId?: string;
    };
    lima: {
        showPanel: boolean;
        sessions: TerminalSession[];
        activeSessionId?: string;
    };
    config: {
        showPanel: boolean;
        showScripts: boolean;
        showProbes: boolean;
        draftConfig?: LimaConfig;
        draftYaml?: string;
    };
}