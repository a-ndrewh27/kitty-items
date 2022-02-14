import {useEffect, useReducer, useRef, useState} from "react"
import useTransactionsContext from "src/components/Transactions/useTransactionsContext"
import {removeListing} from "src/flow/tx.remove-listing"
import {DECLINE_RESPONSE, IDLE, paths, SUCCESS} from "src/global/constants"
import {
  ERROR,
  initialState,
  requestReducer,
  START,
} from "src/reducers/requestReducer"
import {useSWRConfig} from "swr"
import useIsMounted from "./useIsMounted"

export default function useItemRemoval() {
  const {mutate} = useSWRConfig()

  const [state, dispatch] = useReducer(requestReducer, initialState)
  const {addTransaction} = useTransactionsContext()
  const successTimeoutRef = useRef()
  const [txStatus, setTxStatus] = useState(null)
  const isMounted = useIsMounted()

  const remove = ({listingResourceID, itemID, owner, name}) => {
    if (!listingResourceID) throw new Error("Missing listingResourceID")

    removeListing(
      {listingResourceID},
      {
        onStart() {
          dispatch({type: START})
        },
        onSubmission(txId) {
          addTransaction({
            id: txId,
            url: paths.profileItem(owner, itemID),
            title: `Remove ${name} #${itemID}`,
          })
        },
        onUpdate(t) {
          if (!isMounted()) return
          setTxStatus(t.status)
        },
        onSuccess() {
          if (!isMounted()) return
          // TODO: Poll for removed API listing instead of setTimeout
          successTimeoutRef.current = setTimeout(() => {
            mutate(paths.apiListing(itemID))
            dispatch({type: SUCCESS})
          }, 1000)
        },
        onError(e) {
          if (!isMounted()) return
          if (e === DECLINE_RESPONSE) {
            dispatch({type: IDLE})
          } else {
            dispatch({type: ERROR})
          }
        },
        onComplete() {
          if (!isMounted()) return
          setTxStatus(null)
        },
      }
    )
  }

  useEffect(() => {
    return () => {
      clearTimeout(successTimeoutRef.current)
    }
  }, [])

  return [state, remove, txStatus]
}
