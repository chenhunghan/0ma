import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== "undefined") {
            return window.matchMedia(query).matches
        }
        return false
    })

    useEffect(() => {
        const media = window.matchMedia(query)

        if (media.matches !== matches) {
            setMatches(media.matches)
        }

        const listener = (event: MediaQueryListEvent) => setMatches(event.matches)

        media.addEventListener("change", listener)
        return () => media.removeEventListener("change", listener)
    }, [query, matches])

    return matches
}

export function useIsMobile() {
    return useMediaQuery("(max-width: 767px)")
}
