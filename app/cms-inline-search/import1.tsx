import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"
import { useEffect, useRef, useCallback } from "react"
import { useScroll, useMotionValueEvent } from "framer-motion"

export const useResourceCollectionListStore = createStore({
    totalItems: null,
    initialLimit: null,
    limit: null,
    filterSite: "",
    filter3D: "",
    filterScroll: "",
    filterCode: "",
    filterCopy: "",
    filterInteg: "",
    filterTuto: "",
    filterButton: "",
    filterAnimation: false,
    filterEffect: false,
    filterComponent: false,
    filterInteraction: false,
    filterWebsite: false,
    query: "",
})

export const useBlogCollectionListStore = createStore({
    totalItems: null,
    initialLimit: null,
    limit: null,
    filterGuide: false,
    filterTip: false,
    filterTopList: false,
    query: "",
})

export const useLessonCollectionListStore = createStore({
    totalItems: null,
    initialLimit: null,
    limit: null,
    filterBeginner: false,
    filterIntermediate: false,
    filterAdvanced: false,
    query: "",
})

export const findQueryInProps = (obj) => {
    if (obj == null) return null

    // Check if `query` exists in the current level
    if (obj.hasOwnProperty("query")) return obj.query

    // Iterate over the properties
    for (let key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === "object") {
            let result = findQueryInProps(obj[key])
            if (result !== null) return result
        }
    }

    // If `query` is not found
    return null
}

export const updateQueryInProps = (obj, newQuery) => {
    if (obj == null) return obj

    // Check if `query` exists in the current level
    if (obj.hasOwnProperty("query")) return { ...obj, query: newQuery }

    // Iterate over the properties
    for (let key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === "object") {
            const updatedChild = updateQueryInProps(obj[key], newQuery)
            if (updatedChild !== obj[key]) {
                return {
                    ...obj,
                    [key]: updatedChild,
                }
            }
        }
    }
    return obj
}

export const useDebounceQuery = (query, store, setStore, delay = 50) => {
    const lastCallTimeRef = useRef(0)
    const timeoutIdRef = useRef(null)

    const updateStore = useCallback(() => {
        setStore({ query, limit: store.initialLimit })
        // window.scroll(0, 0)
        lastCallTimeRef.current = Date.now()
    }, [query, store.initialLimit])

    useEffect(() => {
        if (store.totalItems !== null && store.query !== query) {
            const now = Date.now()
            const timeSinceLastCall = now - lastCallTimeRef.current

            if (timeSinceLastCall >= delay) {
                updateStore()
            } else {
                if (timeoutIdRef.current) {
                    clearTimeout(timeoutIdRef.current)
                }
                timeoutIdRef.current = setTimeout(updateStore, delay)
            }
        }

        // Cleanup function
        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current)
            }
        }
    }, [query, store.initialLimit])
}

export const useInfiniteScroll = (store, setStore) => {
    const { scrollY } = useScroll()

    useMotionValueEvent(scrollY, "change", (latest) => {
        if (
            latest >=
            document.documentElement.offsetHeight - window.innerHeight * 1.2
        ) {
            setStore({ limit: store.limit + store.initialLimit })
        }
    })
}