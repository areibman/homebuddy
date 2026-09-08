// Enable a home only after its interior, movement, and interactions are implemented.
export const playableHomes: Record<string, {path:string; latitude:number; longitude:number; address:string}> = {
 '15': {path:'/furnish?home=15', latitude:37.7905749, longitude:-122.4030716, address:'333 Bush St'},
 '13': {path:'/decorate?home=13', latitude:37.7871778, longitude:-122.3963593, address:'39 Tehama St'},
};
export const isPlayable = (home:{id:string}) => Object.hasOwn(playableHomes, home.id);
