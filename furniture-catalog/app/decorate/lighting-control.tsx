'use client';
import {Sun,Sunrise,Sunset,Moon,Clock3} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {lightingLabels,isLightingChoice,type LightingChoice} from './lighting-presets';
const icons={auto:Clock3,morning:Sunrise,day:Sun,golden:Sunset,night:Moon};
export function LightingControl({value,disabled,onChange,onOpenChange}:{value:LightingChoice;disabled:boolean;onChange:(value:LightingChoice)=>void;onOpenChange:(open:boolean)=>void}){
 const Icon=icons[value];
 return <div className="lighting-control">
  <Select value={value} onValueChange={next=>{if(isLightingChoice(next))onChange(next);}} onOpenChange={onOpenChange} disabled={disabled}>
   <SelectTrigger className="lighting-trigger" aria-label="Time of day"><Icon size={16}/><SelectValue>{lightingLabels[value]}</SelectValue></SelectTrigger>
   <SelectContent className="lighting-menu" align="start" alignItemWithTrigger={false}>
    {(Object.keys(lightingLabels) as LightingChoice[]).map(key=>{const OptionIcon=icons[key];return <SelectItem key={key} value={key}><OptionIcon size={16}/>{lightingLabels[key]}</SelectItem>;})}
   </SelectContent>
  </Select>
 </div>;
}
