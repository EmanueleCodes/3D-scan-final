import {
    addPropertyControls,
    ControlType,
    useIsOnFramerCanvas,
    // @ts-ignore
    useQueryData,
} from "framer"
import { useState, useEffect, ComponentType } from "react"
import {
    findQueryInProps,
    updateQueryInProps,
    useResourceCollectionListStore,
} from "https://framer.com/m/Utils-1fqp.js"
import { useInfiniteScroll } from "https://framer.com/m/Utils-1fqp.js@WCW8B3bCzTF346i8bzJV"

const LIMIT = 20

export function withCollectionList(Component): ComponentType {
    return (props: any) => {
        const [store, setStore] = useResourceCollectionListStore()
        useInfiniteScroll(store, setStore)
        const isOnFramerCanvas = useIsOnFramerCanvas()
        const query = findQueryInProps(props)

        const where = query?.where
        const queryWithoutLimitAndOffset = {
            ...query,
            limit: null,
            offset: null,
        }
        const queryData = query
            ? useQueryData(queryWithoutLimitAndOffset)
            : null
        const totalItems =
            queryData && Array.isArray(queryData) ? queryData.length : 0
        const [newProps, setNewProps] = useState(
            updateQueryInProps(props, {
                ...query,
                where: updateWhere(where, store),
                limit: { type: "LiteralValue", value: store.limit || LIMIT },
                // limit: { type: "LiteralValue", value: LIMIT },
                // limit: store.limit
                //     ? { type: "LiteralValue", value: store.limit }
                //     : null,
            })
        )

        useEffect(() => {
            if (store.limit === null || store.initialLimit === null) {
                setStore({ limit: LIMIT, initialLimit: LIMIT })
            }
        }, [])
        useEffect(() => setStore({ totalItems }), [totalItems])

        useEffect(() => {
            if (!isOnFramerCanvas && store.totalItems !== null) {
                setNewProps(
                    updateQueryInProps(props, {
                        ...query,
                        where: updateWhere(where, store),
                        limit: store.limit
                            ? { type: "LiteralValue", value: store.limit }
                            : null,
                    })
                )
            }
        }, [isOnFramerCanvas, store])

        return <Component {...(isOnFramerCanvas ? props : newProps)} />
    }
}

const updateWhere = (where = {}, store, queryIndex = 0) => {
    // Create a deep clone of the input object
    const clonedWhere: any = { ...where }
    let newQueryIndex = queryIndex

    if (clonedWhere.right) {
        if (
            clonedWhere.right?.functionName &&
            clonedWhere.right.functionName === "CONTAINS"
        ) {
            const filterName = clonedWhere.right.arguments[0].name
            const filterKey = filterId[filterName]

            if (filterKey && store.hasOwnProperty(filterKey)) {
                if (filterKey === "query") {
                    const splitArray = store[filterKey].split(" ")
                    clonedWhere.right.arguments[1].value =
                        splitArray[newQueryIndex] || ""
                    newQueryIndex++
                } else {
                    clonedWhere.right.arguments[1].value = store[filterKey]
                }
            }
        } else {
            updateWhere(clonedWhere.right, store, newQueryIndex)
        }
    }

    if (clonedWhere.left) {
        updateWhere(clonedWhere.left, store, newQueryIndex)
    }

    if (
        !clonedWhere.hasOwnProperty("left") &&
        !clonedWhere.hasOwnProperty("right")
    ) {
        if (clonedWhere.type === "Case") {
            const newConditions = []
            clonedWhere.conditions.forEach(({ then, when }) => {
                if (
                    !store.filterAnimation &&
                    !store.filterEffect &&
                    !store.filterComponent &&
                    !store.filterInteraction &&
                    !store.filterWebsite
                ) {
                    then.value = true
                } else {
                    const filterKey = filterId[when.value]
                    if (filterKey && store.hasOwnProperty(filterKey)) {
                        then.value = store[filterKey]
                    }
                }
            })
            clonedWhere.conditions = newConditions
        }
    }
    return clonedWhere
}

const filterId = {
    mSLxTtGVP: "filterButton",
    TQjf9zJ1J: "filterSite",
    KzPFvtOPK: "filter3D",
    njsBWWc28: "filterScroll",
    lGgdDC1cZ: "filterCode",
    GPZj6jbZ3: "filterCopy",
    lnrhDjTBf: "filterInteg",
    rgHof1Ey2: "filterTuto",
    // Categories
    AhJFvNwbn: "filterAnimation",
    Z9kNNjQx3: "filterEffect",
    tOolmDslz: "filterComponent",
    XWRnDAKJy: "filterInteraction",
    FZfCEGweL: "filterWebsite",
    // Search
    jnGmCij9e: "query",
}
