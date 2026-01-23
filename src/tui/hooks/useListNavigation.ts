/**
 * Hook for managing vertical list navigation.
 */

import { useState, useCallback, useEffect } from 'react';
import { useInput } from 'ink';

export interface UseListNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Initial selected index (default: 0) */
  initialIndex?: number;
  /** Whether to loop navigation when reaching ends (default: false) */
  loop?: boolean;
  /** Callback when an item is selected (Enter) */
  onSelect?: (index: number) => void;
  /** Callback when navigation is cancelled (Esc) */
  onCancel?: () => void;
  /** Callback when highlighted index changes */
  onHighlight?: (index: number) => void;
  /** Whether navigation is currently enabled (default: true) */
  enabled?: boolean;
  /** Controlled selected index (overrides internal state) */
  selectedIndex?: number;
}

export function useListNavigation({
  itemCount,
  initialIndex = 0,
  loop = false,
  onSelect,
  onCancel,
  onHighlight,
  enabled = true,
  selectedIndex: controlledIndex,
}: UseListNavigationOptions) {
  const [internalIndex, setInternalIndex] = useState(initialIndex);

  const isControlled = controlledIndex !== undefined;
  const selectedIndex = isControlled ? controlledIndex : internalIndex;

  const setIndex = useCallback(
    (newIndex: number) => {
      if (!isControlled) {
        setInternalIndex(newIndex);
      }
      onHighlight?.(newIndex);
    },
    [isControlled, onHighlight],
  );

  const moveUp = useCallback(() => {
    let newIndex = selectedIndex;
    if (selectedIndex > 0) {
      newIndex = selectedIndex - 1;
    } else if (loop) {
      newIndex = itemCount - 1;
    }

    if (newIndex !== selectedIndex) {
      setIndex(newIndex);
    }
  }, [selectedIndex, itemCount, loop, setIndex]);

  const moveDown = useCallback(() => {
    let newIndex = selectedIndex;
    if (selectedIndex < itemCount - 1) {
      newIndex = selectedIndex + 1;
    } else if (loop) {
      newIndex = 0;
    }

    if (newIndex !== selectedIndex) {
      setIndex(newIndex);
    }
  }, [selectedIndex, itemCount, loop, setIndex]);

  useInput(
    (input, key) => {
      if (!enabled) return;

      if (key.upArrow || input === 'k') {
        moveUp();
      } else if (key.downArrow || input === 'j') {
        moveDown();
      } else if (key.return) {
        onSelect?.(selectedIndex);
      } else if (key.escape) {
        onCancel?.();
      }
    },
    { isActive: enabled },
  );

  return {
    selectedIndex,
    setSelectedIndex: setIndex,
    moveUp,
    moveDown,
  };
}
