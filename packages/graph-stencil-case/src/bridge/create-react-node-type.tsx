import React, { useRef, useEffect } from 'react';
import { render as litRender, type TemplateResult } from 'lit-html';

export type StencilRenderFn = (data: Record<string, unknown>) => TemplateResult;

export function createReactNodeType(
  renderFn: StencilRenderFn,
): React.FC<{ data: Record<string, unknown> }> {
  return function LitNodeWrapper({ data }: { data: Record<string, unknown> }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (containerRef.current) {
        litRender(renderFn(data), containerRef.current);
      }
    }, [data]);

    return <div ref={containerRef} />;
  };
}
