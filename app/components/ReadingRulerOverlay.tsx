'use client';

import { useAccessibility} from'../context/AccessibilityContext';

export default function ReadingRulerOverlay() {
 const { readingRuler, readingRulerY} = useAccessibility();

 if (!readingRuler) return null;

 return (
 <div
 id="reading-ruler"
 style={{ top: `${readingRulerY}px`}}
 aria-hidden="true"
 />
 );
}
