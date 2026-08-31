'use client';

import { Accessibility } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function HeaderAccessibilityPanel() {
  const {
    openDyslexic,
    setOpenDyslexic,
    readingRuler,
    setReadingRuler,
    highContrast,
    setHighContrast,
    fontScale,
    setFontScale,
    ttsEnabled,
    setTtsEnabled,
    ttsSpeed,
    setTtsSpeed,
    ttsPitch,
    setTtsPitch,
    nudgeStyle,
    setNudgeStyle,
  } = useAccessibility();

  return (
    <div className="flex flex-col max-h-[70vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 border-b pb-3 mb-4 shrink-0">
        <Accessibility className="h-5 w-5 text-teal-600" />
        <h2 className="font-bold text-neutral-800 text-sm">Accessibility Hub</h2>
      </div>

      <div className="space-y-4">
        {/* OpenDyslexic Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="dyslexic-toggle" className="block text-sm font-semibold text-neutral-700">OpenDyslexic Font</Label>
            <span className="text-[10px] text-neutral-400 block">Enables dyslexia-friendly typeface</span>
          </div>
          <Switch id="dyslexic-toggle" checked={openDyslexic} onCheckedChange={setOpenDyslexic} />
        </div>

        {/* Reading Ruler Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="ruler-toggle" className="block text-sm font-semibold text-neutral-700">Reading Ruler</Label>
            <span className="text-[10px] text-neutral-400 block">Horizontal tracking guide follows cursor</span>
          </div>
          <Switch id="ruler-toggle" checked={readingRuler} onCheckedChange={setReadingRuler} />
        </div>

        {/* High Contrast Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="contrast-toggle" className="block text-sm font-semibold text-neutral-700">High Contrast Mode</Label>
            <span className="text-[10px] text-neutral-400 block">Stark black &amp; white layout borders</span>
          </div>
          <Switch id="contrast-toggle" checked={highContrast} onCheckedChange={setHighContrast} />
        </div>

        {/* Font Scaling Options */}
        <div className="border-t pt-3">
          <label className="block text-[11px] font-semibold text-neutral-700 mb-1.5">Text Zoom Scale</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-50 rounded-lg border border-neutral-100">
            {(['normal', 'large', 'extra-large'] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => setFontScale(scale)}
                className={`py-1 px-1.5 rounded-md text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${fontScale === scale
                  ? 'bg-white text-neutral-900 shadow-sm border border-border-color font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {scale === 'normal' && '100%'}
                {scale === 'large' && '120%'}
                {scale === 'extra-large' && '140%'}
              </button>
            ))}
          </div>
        </div>

        {/* Text-to-Speech Toggle & Sliders */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="tts-toggle" className="block text-sm font-semibold text-neutral-700">Text-to-Speech</Label>
              <span className="text-[10px] text-neutral-400 block">Reads hovered text elements</span>
            </div>
            <Switch id="tts-toggle" checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
          </div>

          {ttsEnabled && (
            <div className="space-y-2 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
              <div>
                <div className="flex justify-between text-[9px] font-bold text-neutral-500 mb-1">
                  <span>Speech Speed</span>
                  <span>{ttsSpeed}x</span>
                </div>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[ttsSpeed]}
                  onValueChange={([v]) => setTtsSpeed(v)}
                  aria-label="Speech Speed"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] font-bold text-neutral-500 mb-1">
                  <span>Speech Pitch</span>
                  <span>{ttsPitch}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[ttsPitch]}
                  onValueChange={([v]) => setTtsPitch(v)}
                  aria-label="Speech Pitch"
                />
              </div>
            </div>
          )}
        </div>

        {/* Nudge Delivery Preferences */}
        <div className="border-t pt-3">
          <Label htmlFor="nudge-style-select" className="block text-[11px] font-semibold text-neutral-700 mb-1.5">
            Nudge Delivery Style
          </Label>
          <Select value={nudgeStyle} onValueChange={(v) => setNudgeStyle(v as 'toast' | 'glow' | 'push' | 'off')}>
            <SelectTrigger id="nudge-style-select" className="w-full text-[11px] font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toast">Toast Notification</SelectItem>
              <SelectItem value="glow">Ambient Edge-Glow</SelectItem>
              <SelectItem value="push">Web Push Notification</SelectItem>
              <SelectItem value="off">Off / Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
