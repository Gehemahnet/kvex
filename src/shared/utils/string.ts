export const getItemsFromString = (value: string): string[] =>
    value
        .split(/[,\n]/)
        .map((address) => address.trim())
        .filter(Boolean);
