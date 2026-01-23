import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

export function useTerminalDimensions(): [number, number] {
  const { stdout } = useStdout();

  const [dimensions, setDimensions] = useState<[number, number]>([
    stdout?.columns ?? 80,
    stdout?.rows ?? 24,
  ]);

  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      setDimensions([stdout.columns, stdout.rows]);
    };

    stdout.on('resize', handleResize);
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return dimensions;
}
