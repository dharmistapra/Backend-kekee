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



function createSearchFilterOder(search, filter = []) {
    if (!search) return [];

    const baseFilter = Array.isArray(filter) ? filter : [filter];

    return [
        ...baseFilter,
        ...(search.toLowerCase() === "true" || search.toLowerCase() === "false"
            ? [{ isActive: search.toLowerCase() === "true" }]
            : []
        ),
        {
            orderId: {
                contains: search,
                mode: "insensitive",
            },
        },
        {
            user: {
                name: {
                    contains: search,
                    mode: "insensitive",
                },
            },
        },
        {
            user: {
                email: {
                    contains: search,
                    mode: "insensitive",
                },
            },
        },
    ];
}

export default createSearchFilter;
export { createSearchFilterOder };
