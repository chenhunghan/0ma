import { useState, useCallback, useEffect } from 'react';
import { parse, stringify } from 'yaml';
import { LimaConfig } from '../types/LimaConfig';

export const useLimaConfig = (initialConfig: LimaConfig) => {
    // Source of truth is the structured config object
    const [config, setConfig] = useState<LimaConfig>(initialConfig);
    // Editor text state
    const [yamlString, setYamlString] = useState(stringify(initialConfig));

    useEffect(() => {
        setConfig(initialConfig);
        setYamlString(stringify(initialConfig));
    }, [initialConfig]);

    // Update from Editor (string)
    const setConfigFromYaml = useCallback((yaml: string) => {
        setYamlString(yaml);
        try {
            const parsed = parse(yaml);
            if (parsed && typeof parsed === 'object') {
                setConfig(parsed as LimaConfig);
            }
        } catch (e) {
            // Ignore parse errors, just update string so user can keep typing
        }
    }, []);

    const updateConfigField = useCallback((field: string, value: any) => {
        setConfig((prev) => {
            const newConfig = { ...prev, [field]: value };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);

    const updateProvisionScript = useCallback((index: number, key: 'mode' | 'script', value: string) => {
        setConfig((prev) => {
            const newProvision = [...(prev.provision || [])];
            if (!newProvision[index]) return prev;
            newProvision[index] = { ...newProvision[index], [key]: value };
            const newConfig = { ...prev, provision: newProvision };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);
    
    const addProvisionScript = useCallback(() => {
        setConfig((prev) => {
            const newScript = { mode: 'system', script: '# New Script\n' };
            const newProvision = [...(prev.provision || []), newScript];
            const newConfig = { ...prev, provision: newProvision };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);
    
    const removeProvisionScript = useCallback((index: number) => {
        setConfig((prev) => {
            const newProvision = [...(prev.provision || [])];
            newProvision.splice(index, 1);
            const newConfig = { ...prev, provision: newProvision };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);
    
    const updateProbeScript = useCallback((
        index: number,
        key: 'description' | 'script' | 'hint' | 'mode',
        value: string
      ) => {
        setConfig((prev) => {
            const newProbes = [...(prev.probes || [])];
            if (!newProbes[index]) return prev;
            // @ts-ignore - dynamic key assignment
            newProbes[index] = { ...newProbes[index], [key]: value };
            const newConfig = { ...prev, probes: newProbes };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);
    
    const addProbeScript = useCallback(() => {
        setConfig((prev) => {
            const newProbe = {
                description: 'New Probe',
                script: '#!/bin/bash\nexit 0\n',
                hint: 'Check something',
            };
            const newProbes = [...(prev.probes || []), newProbe];
            const newConfig = { ...prev, probes: newProbes };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);
    
    const removeProbeScript = useCallback((index: number) => {
        setConfig((prev) => {
            const newProbes = [...(prev.probes || [])];
            newProbes.splice(index, 1);
            const newConfig = { ...prev, probes: newProbes };
            setYamlString(stringify(newConfig));
            return newConfig;
        });
    }, []);

    return {
        config,
        yamlString,
        setConfigFromYaml,
        updateConfigField,
        updateProvisionScript,
        addProvisionScript,
        removeProvisionScript,
        updateProbeScript,
        addProbeScript,
        removeProbeScript
    };
};