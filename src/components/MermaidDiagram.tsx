import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = useRef(id || `mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current) {
        try {
          const { svg } = await mermaid.render(diagramId.current, chart);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid render error:', error);
          containerRef.current.innerHTML = `<pre class="text-red-500">Error: ${error}</pre>`;
        }
      }
    };
    renderDiagram();
  }, [chart]);

  return <div ref={containerRef} className="mermaid-container overflow-x-auto" />;
}

export default MermaidDiagram;
