import type {ReactNode} from 'react';
export function Keycap({children}:{children:ReactNode}){return <kbd className="input-key">{children}</kbd>;}
export function MouseGlyph({button='left'}:{button?:'left'|'right'|'wheel'}){
 return <svg className="mouse-glyph" width="22" height="28" viewBox="0 0 22 28" fill="none" aria-hidden="true"><rect x="3" y="2" width="16" height="24" rx="8" stroke="currentColor" strokeWidth="1.5"/>{button==='left'?<path d="M4 10a7 7 0 0 1 6-7v10H4z" fill="currentColor"/>:button==='right'?<path d="M12 3a7 7 0 0 1 6 7v3h-6z" fill="currentColor"/>:<rect x="9" y="6" width="4" height="6" rx="2" fill="currentColor"/>}<path d="M11 3v10M4 14h14" stroke="currentColor" strokeWidth="1.2"/></svg>;
}
