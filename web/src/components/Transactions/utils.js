import * as fcl from "@onflow/fcl"

export function isSealed(data) {
  return typeof data !== "undefined" && fcl.tx.isSealed(data)
}

export function isErrored(data) {
  return isSealed(data) && !!data?.errorMessage
}
