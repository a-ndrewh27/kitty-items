import {useRouter} from "next/dist/client/router"
import {useReducer, useState} from "react"
import useTransactionsContext from "src/components/Transactions/useTransactionsContext"
import {purchaseListing} from "src/flow/tx.purchase-listing"
import {DECLINE_RESPONSE, IDLE, paths} from "src/global/constants"
import {
  ERROR,
  initialState,
  requestReducer,
  START,
  SUCCESS,
} from "src/reducers/requestReducer"
import {
  EVENT_KITTY_ITEM_DEPOSIT,
  getKittyItemsEventByType,
} from "src/util/events"
import {useSWRConfig} from "swr"
import {compFLOWBalanceKey} from "./useFLOWBalance"
import useIsMounted from "./useIsMounted"

const getNewlySignedInUserAddress = txData => {
  const depositEvent = getKittyItemsEventByType(
    txData.events,
    EVENT_KITTY_ITEM_DEPOSIT
  )
  if (!depositEvent?.data?.to)
    throw new Error("Missing KittyItem deposit address")
  return depositEvent.data.to
}

export default function useItemPurchase() {
  const router = useRouter()
  const {addTransaction} = useTransactionsContext()
  const [state, dispatch] = useReducer(requestReducer, initialState)
  const {mutate, cache} = useSWRConfig()
  const [txStatus, setTxStatus] = useState(null)
  const isMounted = useIsMounted()

  const purchase = (listingResourceID, itemID, itemName, ownerAddress) => {
    if (!listingResourceID) throw new Error("Missing listingResourceID")
    if (!ownerAddress) throw new Error("Missing ownerAddress")

    purchaseListing(
      {itemID: listingResourceID, ownerAddress},
      {
        onStart() {
          dispatch({type: START})
        },
        onSubmission(txId) {
          addTransaction({
            id: txId,
            title: `Purchase ${itemName} #${itemID}`,
          })
        },
        onUpdate(t) {
          if (!isMounted()) return
          setTxStatus(t.status)
        },
        onSuccess(txData) {
          if (!isMounted()) return
          const currentUserAddress = getNewlySignedInUserAddress(txData)
          mutate(compFLOWBalanceKey(currentUserAddress))
          cache.delete(paths.apiListing(itemID))

          dispatch({type: SUCCESS})

          router.push(paths.profileItem(currentUserAddress, itemID))
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

  return [state, purchase, txStatus]
}
