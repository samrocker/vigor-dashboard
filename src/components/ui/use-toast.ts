import * as React from "react"
import { ToastActionProps, ToastProps as ToastComponentProps } from "./toast"
import { ToastProps as RadixToastProps } from "@radix-ui/react-toast"
import { VariantProps } from "class-variance-authority"
import { toastVariants } from "./toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastComponentProps & RadixToastProps & VariantProps<typeof toastVariants> & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement<ToastActionProps>
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action = 
  | { type: ActionType["ADD_TOAST"], toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"], toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"], toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"], toastId?: ToasterToast["id"] }

interface State {
  toasts: ToasterToast[]
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST:
      const { toastId } = action

      // Certain toasts persist for a bit longer by using the `duration` prop with null
      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t, open: false } : t
          ),
        }
      } else {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({ ...t, open: false })),
        }
      }

    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default: return state
  }
}

const listeners: ((state: State) => void)[] = []

let memoryState: State = { toasts: [] }

const dispatch = (action: Action) => {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToasterToast, "id">

const genId = () => Math.random().toString(36).substring(2, 9)

const toast = ({ ...props }: Toast) => {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true } })

  return { id: id, dismiss, update }
}

const useToast = () => {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return { ...state, toast, dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }) }
}

export { useToast, toast } 