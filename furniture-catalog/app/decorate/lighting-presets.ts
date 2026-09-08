export type LightingMode='morning'|'day'|'golden'|'night';
export type LightingChoice='auto'|LightingMode;
export const lightingLabels:Record<LightingChoice,string>={auto:'Auto · San Francisco',morning:'Morning',day:'Daylight',golden:'Golden hour',night:'Night'};
export const lightingPresets={
 morning:{sun:'#ffe2bb',power:1.5,direction:[-.85,.65,.45],sky:'#dfeaff',fill:.65,ground:'#b9afa1',environment:.3,exposure:1.05,lamps:.12,background:'#e1e7ed',city:'#ffe9d3',cityBrightness:.75},
 day:{sun:'#fff5e6',power:1.9,direction:[-.55,1,.35],sky:'#e6efff',fill:.75,ground:'#bcb4a5',environment:.35,exposure:1,lamps:.05,background:'#e5ece9',city:'#ffffff',cityBrightness:.9},
 golden:{sun:'#ffc58d',power:1.45,direction:[.9,.35,.3],sky:'#d6e0fa',fill:.48,ground:'#baa48f',environment:.25,exposure:1.05,lamps:.5,background:'#ddd0c6',city:'#ffc796',cityBrightness:.55},
 night:{sun:'#a9c4ff',power:.12,direction:[.45,.75,-.6],sky:'#93abd8',fill:.2,ground:'#8f7d70',environment:.12,exposure:1.12,lamps:1,background:'#273341',city:'#688bc5',cityBrightness:.055},
} satisfies Record<LightingMode,{sun:string;power:number;direction:number[];sky:string;fill:number;ground:string;environment:number;exposure:number;lamps:number;background:string;city:string;cityBrightness:number}>;
const localHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',hourCycle:'h23'});
/** Deliberate preview periods, not an astronomical sun-position simulation. */
export function lightingAt(date=new Date()):LightingMode{
 const hour=Number(localHour.format(date));
 return hour>=6&&hour<10?'morning':hour>=10&&hour<17?'day':hour>=17&&hour<20?'golden':'night';
}
export function isLightingChoice(value:unknown):value is LightingChoice{
 return typeof value==='string'&&Object.hasOwn(lightingLabels,value);
}
