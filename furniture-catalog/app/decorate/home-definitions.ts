import speraPlan from './plan.json';
import speraListing from './listing.json';
import bushPlan from './homes/bush-4101/plan.json';
import bushListing from './homes/bush-4101/listing.json';
import type {ArchitecturePlan} from './architecture';
export type FurniturePlacement={id:string;x:number;z:number;r:number};
export type HomePlan=ArchitecturePlan&{name:string;design?:{name:string;description:string};footprint:number[][];floors:number[][];floorFinishes?:string[];furniture:FurniturePlacement[];layouts?:{id:string;name:string;furniture:FurniturePlacement[]}[];spawn?:number[];yaw?:number};
export type Listing={source:string;photos:{src:string;alt:string;original:string}[];note?:string;finishes:Record<string,{src:string;crop:number[]}>};
export type HomeDefinition={id:string;title:string;subtitle:string;beds:number;sqft:number;plan:HomePlan;listing:Listing;floorPlan:string;download:string};
export const homeDefinitions:Record<string,HomeDefinition>={
 '13':{id:'13',title:'Spera',subtitle:'Plan E',beds:1,sqft:503,plan:speraPlan as HomePlan,listing:speraListing,floorPlan:'/plans/spera-plan-e.jpg',download:'/plans/spera-furnished.blend'},
 '15':{id:'15',title:'333 Bush Street',subtitle:'#4101',beds:2,sqft:1250,plan:bushPlan as HomePlan,listing:bushListing,floorPlan:'/city-plans/333-bush-street-unit-4101-1.jpg',download:'/plans/bush-4101-gather.blend'},
};
