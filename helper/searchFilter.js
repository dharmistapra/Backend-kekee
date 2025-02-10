function createSearchFilter(search, filter = []) {
    if (!search) return undefined;

    const baseFilter = Array.isArray(filter) ? filter : [filter];

    return {
        OR: [
            ...baseFilter,
            ...(search.toLowerCase() === "true" || search.toLowerCase() === "false"
                ? [{ isActive: search.toLowerCase() === "true" }]
                : []
            )
        ]
    };
}

export default createSearchFilter