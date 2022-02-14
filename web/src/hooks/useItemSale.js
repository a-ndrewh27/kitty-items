import {useReducer, useState} from "react"
import useTransactionsContext from "src/components/Transactions/useTransactionsContext"
import {createListing} from "src/flow/tx.create-listing"
import {DECLINE_RESPONSE, IDLE, paths, SUCCESS} from "src/global/constants"
import {
  ERROR,
  initialState,
  requestReducer,
  START,
} from "src/reducers/requestReducer"
import {
  EVENT_LISTING_AVAILABLE,
  getStorefrontEventByType,
} from "src/util/events"
import {useSWRConfig} from "swr"
import useIsMounted from "./useIsMounted"

export function extractApiListingFromEvents(events, item) {
  const event = getStorefrontEventByType(events, EVENT_LISTING_AVAILABLE)
  if (!event) return undefined

  return {
    item_id: event.data.nftID,
    listing_resource_id: event.data.listingResourceID,
    item_kind: item.kind,
    item_rarity: item.rarity,
    owner: item.owner,
    name: item.name,
    image: item.image,
    price: event.data.price,
    transaction_id: event.transactionId,
  }
}

export default function useItemSale() {
  const {mutate} = useSWRConfig()
  const {addTransaction} = useTransactionsContext()
  const isMounted = useIsMounted()

  const [state, dispatch] = useReducer(requestReducer, initialState)
  const [txStatus, setTxStatus] = useState(null)

  const sell = (item, price) => {
    createListing(
      {itemID: item.itemID, price},
      {
        onStart() {
          dispatch({type: START})
        },
        onSubmission(txId) {
          addTransaction({
            id: txId,
            url: paths.profileItem(item.owner, item.itemID),
            title: `List ${item.name} #${item.itemID}`,
          })
        },
        onUpdate(t) {
          if (!isMounted()) return
          setTxStatus(t.status)
        },
        onSuccess(data) {
          if (!isMounted()) return
          const newListing = extractApiListingFromEvents(data.events, item)
          if (!newListing) throw new Error("Missing listing")
          dispatch({type: SUCCESS})
          setTxStatus(null)
          mutate(paths.apiListing(item.itemID), [newListing], false)
        },
        onError(e) {
          if (!isMounted()) return
          if (e === DECLINE_RESPONSE) {
            dispatch({type: IDLE})
          } else {
            console.error(e)
            dispatch({type: ERROR})
          }
          setTxStatus(null)
        },
      }
    )
  }

  return [state, sell, txStatus]
}
