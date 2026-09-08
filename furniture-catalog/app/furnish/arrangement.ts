import type {HomeDefinition} from '../decorate/home-definitions';
import type {PlacementResult} from './selection';
import savedAstra from './saved-astra-layout.json';

export function homeWithSavedSuggestions(home:HomeDefinition):HomeDefinition {
 return {...home,plan:{...home.plan,layouts:[...(home.plan.layouts??[]),{id:savedAstra.id,name:savedAstra.name,furniture:savedAstra.furniture}]}};
}

/** Keep the generated arrangement and the original presets in one editor. */
export function homeWithArrangement(home:HomeDefinition,result:PlacementResult):HomeDefinition {
 return {...home,plan:{...home.plan,
  furniture:result.placements,
  layouts:[{id:'astra',name:'Astra arrangement',furniture:result.placements},...(home.plan.layouts??[])],
  design:{name:'Astra arrangement',description:result.summary},
 }};
}
