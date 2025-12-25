import { useState, useEffect } from 'react';
import { LimaInstance } from '../types/LimaInstance';

export function useSelectedInstance(instances: LimaInstance[]) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Auto-select first instance if none selected, or if selected instance no longer exists
  useEffect(() => {
    if (instances.length === 0) {
      // No instances, clear selection if any
      if (selectedName !== null) {
        setSelectedName(null);
      }
      return;
    }
    
    if (!selectedName) {
      // No selection, auto-select first
      setSelectedName(instances[0].name);
    } else {
      // Check if selected instance still exists (could be deleted externally via limactl)
      const stillExists = instances.some(i => i.name === selectedName);
      if (!stillExists) {
        // Selected instance was deleted externally, auto-select first available
        setSelectedName(instances[0].name);
      }
    }
  }, [instances, selectedName]);

  const selectedInstance = instances.find(i => i.name === selectedName);

  return {
    selectedName,
    setSelectedName,
    selectedInstance
  };
}
