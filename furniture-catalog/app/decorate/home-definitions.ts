import speraPlan from './plan.json';
import speraListing from './listing.json';
import bushPlan from './homes/bush-4101/plan.json';
import bushListing from './homes/bush-4101/listing.json';
import flowhousePlan from './homes/flowhouse-wb1/plan.json';
import flowhouseListing from './homes/flowhouse-wb1/listing.json';
import type {ArchitecturePlan} from './architecture';
export type FurniturePlacement={id:string;x:number;z:number;r:number};
export type HomePlan=ArchitecturePlan&{name:string;design?:{name:string;description:string};footprint:number[][];interiorFootprint?:number[][];floors:number[][];floorFinishes?:string[];furniture:FurniturePlacement[];layouts?:{id:string;name:string;furniture:FurniturePlacement[]}[];spawn?:number[];yaw?:number};
export type Listing={source:string;photos:{src:string;alt:string;original:string}[];note?:string;finishes:Record<string,{src:string;crop:number[]}>};
export type HomeDefinition={id:string;title:string;subtitle:string;beds:number;sqft:number;plan:HomePlan;listing:Listing;floorPlan:string;download:string;layoutDownloads?:Record<string,string>;location?:string;panorama?:string|null};
export const homeDefinitions:Record<string,HomeDefinition>={
 'flowhouse-wb1':{id:'flowhouse-wb1',title:'Flow House',subtitle:'WB1 · Balcony',beds:2,sqft:970,plan:flowhousePlan as HomePlan,listing:flowhouseListing,floorPlan:'/listings/flowhouse-wb1/floor-plan.png',download:'/plans/flowhouse-wb1-gather.blend',layoutDownloads:{gather:'/plans/flowhouse-wb1-gather.blend',retreat:'/plans/flowhouse-wb1-retreat.blend'},location:'Imported floor plan',panorama:null},
 '13':{id:'13',title:'Spera',subtitle:'Plan E',beds:1,sqft:503,plan:speraPlan as HomePlan,listing:speraListing,floorPlan:'/plans/spera-plan-e.jpg',download:'/plans/spera-furnished.blend'},
 '15':{id:'15',title:'333 Bush Street',subtitle:'#4101',beds:2,sqft:1250,plan:bushPlan as HomePlan,listing:bushListing,floorPlan:'/city-plans/333-bush-street-unit-4101-1.jpg',download:'/plans/bush-4101-gather.blend'},
};
