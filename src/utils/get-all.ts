/**
 * Get all entities specified by a list of unique identifiers
 * @param ids List of IDs of the type that the getter function accepts
 * @param getter Function that takes an ID and returns a promise resolved by some value
 */
export const getAll = <T, U>(ids: T[], getter: (id: T) => Promise<U>) => Promise.all(ids.map((id) => getter(id)));
