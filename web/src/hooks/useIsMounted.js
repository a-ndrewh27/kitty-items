import {useCallback, useEffect, useRef} from "react"

/*
  Used to stop state changes after a component is unmounted. We could use
  cancelable promises instead, but it may not be much better. Another option
  is lifting state up to the AppContext for long running hooks.
  https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html
  https://github.com/facebook/react/issues/5465
  https://github.com/reactjs/reactjs.org/pull/2562
*/

export default function useIsMounted() {
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const isMounted = useCallback(() => isMountedRef.current, [])

  return isMounted
}
