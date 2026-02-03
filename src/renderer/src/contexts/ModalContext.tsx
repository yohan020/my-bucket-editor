// [전역 모달 Context] useModal() 훅으로 어디서든 커스텀 모달 호출
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ModalType = 'success' | 'error' | 'warning' | 'info'

interface AlertOptions {
    message: string
    type?: ModalType
    title?: string
}

interface ConfirmOptions {
    message: string
    title?: string
    confirmText?: string
    cancelText?: string
}

interface ModalState {
    isOpen: boolean
    mode: 'alert' | 'confirm'
    message: string
    title?: string
    type: ModalType
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void
    onCancel?: () => void
}

interface ModalContextType {
    modalState: ModalState
    showAlert: (options: AlertOptions | string) => void
    showConfirm: (options: ConfirmOptions | string) => Promise<boolean>
    closeModal: () => void
}

const initialState: ModalState = {
    isOpen: false,
    mode: 'alert',
    message: '',
    type: 'info'
}

const ModalContext = createContext<ModalContextType | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<ModalState>(initialState)
    const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

    const showAlert = useCallback((options: AlertOptions | string) => {
        const opts = typeof options === 'string' ? { message: options } : options
        setModalState({
            isOpen: true,
            mode: 'alert',
            message: opts.message,
            title: opts.title,
            type: opts.type || 'info'
        })
    }, [])

    const showConfirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
        const opts = typeof options === 'string' ? { message: options } : options

        return new Promise((resolve) => {
            setResolvePromise(() => resolve)
            setModalState({
                isOpen: true,
                mode: 'confirm',
                message: opts.message,
                title: opts.title,
                type: 'warning',
                confirmText: opts.confirmText,
                cancelText: opts.cancelText
            })
        })
    }, [])

    const closeModal = useCallback(() => {
        setModalState(initialState)
    }, [])

    const handleConfirm = useCallback(() => {
        if (resolvePromise) {
            resolvePromise(true)
            setResolvePromise(null)
        }
        closeModal()
    }, [resolvePromise, closeModal])

    const handleCancel = useCallback(() => {
        if (resolvePromise) {
            resolvePromise(false)
            setResolvePromise(null)
        }
        closeModal()
    }, [resolvePromise, closeModal])

    return (
        <ModalContext.Provider value={{
            modalState: { ...modalState, onConfirm: handleConfirm, onCancel: handleCancel },
            showAlert,
            showConfirm,
            closeModal
        }}>
            {children}
        </ModalContext.Provider>
    )
}

export function useModal() {
    const context = useContext(ModalContext)
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider')
    }
    return context
}
